# Exceptions and Logging Guidelines

This chapter is compiled based on the official Python tutorial **Errors and Exceptions** (https://docs.python.org/3/tutorial/errors.html), the **exceptions module documentation** (https://docs.python.org/3/library/exceptions.html), **PEP 654** (Exception Groups, https://peps.python.org/pep-0654/), and the official **Logging HOWTO / Logging Cookbook** (https://docs.python.org/3/howto/logging.html).

### 4.1 Exception Inheritance Hierarchy

1.  **MUST** Custom exceptions must inherit from `Exception` (or one of its subclasses); directly inheriting from `BaseException` is prohibited. `BaseException` is the root class of all exceptions, and the official documentation explicitly states that it "is not meant to be directly inherited by user-defined classes." Directly inheriting from `BaseException` makes the exception uncatchable by the conventional `except Exception:`, which is semantically equivalent to "the program should terminate" signals such as `SystemExit`/`KeyboardInterrupt`, and can easily lead to mishandling.
    Positive example:
    ```python
    class BizError(Exception):
        """业务异常基类"""

    class ParameterError(BizError):
        """参数错误"""
    ```
    > Original text (BaseException): *"The base class for all built-in exceptions. It is not meant to be directly inherited by user-defined classes (for that, use `Exception`)."*
    > Original text (Exception): *"All built-in, non-system-exiting exceptions are derived from this class. All user-defined exceptions should also be derived from this class."*
    > Source: docs.python.org/3/library/exceptions.html § Base classes

2.  **MUST** Exception class names must end with `Error` (when the semantics are indeed an error), following the class naming rules in item 50 of `naming-style.md`.

3.  **SHOULD** When designing an exception inheritance hierarchy, the structure should be designed starting from "the handling needs of the caller when catching the exception," rather than from "where in the code the exception is raised." For example, if callers frequently need to "uniformly catch all parameter-related errors," then the various parameter errors should share a common intermediate base class, rather than each independently and at the same level inheriting from the top-level business exception base class.
    > Original text: *"Design exception hierarchies based on the distinctions that code catching the exceptions is likely to need, rather than the locations where the exceptions are raised."*
    > Source: PEP 8 § Programming Recommendations

### 4.2 Raising Exceptions

4.  **MUST** Raising an exception must use the form `raise ExceptionClass('message')`, carrying a clear error message.
    Positive example: `raise ValueError('参数 user_id 不能为空')`

5.  **MUST** When you need to convert an exception type but do not want to lose the original exception context, you must use `raise NewException(...) from original_exception` to explicitly establish an exception chain, so that the original exception information is preserved in the `__cause__` attribute and displayed together when the traceback is printed.
    Positive example:
    ```python
    try:
        parse_config(path)
    except json.JSONDecodeError as exc:
        raise ConfigError(f'配置文件解析失败: {path}') from exc
    ```
    > Original text: *"To indicate that an exception is a direct consequence of another, the raise statement allows an optional `from` clause: `raise RuntimeError from exc`. This can be useful when you are transforming exceptions."*
    > Source: docs.python.org/3/tutorial/errors.html § Exception Chaining

6.  **SHOULD** When you deliberately want to hide internal implementation details and do not want the caller to see the underlying original exception (for example, uniformly converting internal storage-layer exceptions into business exceptions exposed externally), use `raise NewException(...) from None` to explicitly suppress the implicit exception context (`__suppress_context__` will be set to `True`), but you must ensure that the new exception's message contains enough information to locate the problem; you must not lose diagnosability simply because the original exception was suppressed.
    > Original text: *"Setting `__cause__` also implicitly sets the `__suppress_context__` attribute to `True`, so that using `raise new_exc from None` effectively replaces the old exception with the new one for display purposes (e.g. converting KeyError to AttributeError), while leaving the old exception available in `__context__` for introspection when debugging."* (Audit supplement: completed the latter half of the sentence, explaining that the old exception is still retained in `__context__` for debugging introspection, and is not completely discarded)
    > Source: docs.python.org/3/library/exceptions.html § Exception context

### 4.3 Catching Exceptions

7.  **MUST** `except` clauses must be ordered from specific to general; a base-class exception must never be placed before a derived-class exception, otherwise the derived-class exception can never be caught by the more specific `except` clause that follows.
    > Original text: *"A class in an except clause matches exceptions which are instances of the class itself or one of its derived classes... if the except clauses were reversed (with `except B` first)... the first matching except clause is triggered."*
    > Source: docs.python.org/3/tutorial/errors.html § Handling Exceptions

8.  **MUST** Bare `except:` is prohibited; when you genuinely need to catch all business exceptions, use `except Exception:` (for detailed rationale and examples, see item 9 of `language-features.md`).

9.  **MUST** The code wrapped in a `try` clause should be kept as minimal as possible, wrapping only the statements that may actually raise the target exception (for details, see item 10 of `language-features.md`).

10. **MAY** When you need to concurrently trigger and concurrently handle multiple unrelated exceptions (such as multiple coroutines each failing in `asyncio.gather()`, or multiple subtasks of a batch job each failing), Python 3.11+ allows you to use `ExceptionGroup`/`BaseExceptionGroup` along with the `except*` syntax to catch and handle a group of exceptions by type in one pass, instead of manually collecting exceptions into a list and checking types one by one.
    > Original text: *"This document proposes language extensions that allow programs to raise and handle multiple unrelated exceptions simultaneously: A new standard exception type, the ExceptionGroup... A new syntax except* for handling ExceptionGroups."*
    > Source: PEP 654 (Python 3.11+)
    >
    > Note: `ExceptionGroup` can only wrap `Exception` subclasses, while `BaseExceptionGroup` can wrap any `BaseException` subclass.
    > Source: PEP 654 § Specification / ExceptionGroup and BaseExceptionGroup (Audit correction: there is no chapter named "Types" in PEP 654; the previous annotation was incorrect and is hereby corrected)

### 4.4 Resource Cleanup

11. **MUST** Cleanup logic that must execute whether or not an exception occurred (releasing locks, closing connections, writing audit logs, etc.) must use a `finally` clause or a `with` statement (see item 35 of `language-features.md`); do not attempt to replace this by manually duplicating cleanup code after every branch that might raise an exception.
    > Original text: *"The finally clause runs whether or not the try statement produces an exception... the finally clause is useful for releasing external resources... regardless of whether the use of the resource was successful."*
    > Source: docs.python.org/3/tutorial/errors.html § Defining Clean-up Actions

12. **MUST** Using `return`/`break`/`continue` that jumps out of the `try...finally` inside the `finally` block of a `try...finally` is prohibited, because this would implicitly cancel any active exception currently propagating through that `try...finally`, causing the exception to be silently swallowed without notice.

### 4.5 Logging Guidelines

13. **MUST** Library/module code must not directly write log output to the root logger; it must use `logging.getLogger(__name__)` to create a module-level logger, keeping the logger name consistent with the package/module hierarchy, so that the application can precisely control log levels and output destinations at module granularity.
    Positive example:
    ```python
    import logging

    logger = logging.getLogger(__name__)

    def process(item):
        logger.info('processing item=%s', item.id)
    ```
    > Original text: *"It is strongly advised that you do not log to the root logger in your library. Instead, use a logger with a unique and easily identifiable name, such as the `__name__` for your library's top-level package or module."*
    > Source: docs.python.org/3/howto/logging.html § Configuring Logging for a Library

14. **MUST** Library code reused by other parties must not proactively add any handler other than `logging.NullHandler`; the configuration of log output destinations, formats, and levels should be left entirely to the application that ultimately uses the library.
    > Original text: *"It is strongly advised that you do not add any handlers other than NullHandler to your library's loggers. This is because the configuration of handlers is the prerogative of the application developer who uses your library."*
    > Source: docs.python.org/3/howto/logging.html § Configuring Logging for a Library

15. **MUST** `print()` is only for routine console output of command-line scripts directed at users; event recording during program execution (for status monitoring / troubleshooting) must use `logging`; using `print()` as a substitute for logging is prohibited.
    | Scenario | Approach to use |
    |---|---|
    | Routine console output of a command-line script/program | `print()` |
    | Recording events that occur during normal program operation (status monitoring / fault diagnosis) | `logger.info()` (use `logger.debug()` for diagnostic detail) |
    | Reporting an error for a runtime event | `raise` an exception |
    | Recording an error swallowed by business logic and not re-raised (e.g., an error handler in a long-running service) | `logger.error()` / `logger.exception()` / `logger.critical()` |
    > Source: docs.python.org/3/howto/logging.html § When to use logging

16. **MUST** Log levels must be used correctly per the official definitions:
    - `DEBUG`: detailed diagnostic information, typically of interest only when troubleshooting problems;
    - `INFO`: information confirming that the program is running as expected;
    - `WARNING`: an unexpected situation has occurred, or one that portends future problems (e.g., "insufficient disk space"), but the program still works as expected;
    - `ERROR`: due to a more serious problem, the program failed to complete a certain function;
    - `CRITICAL`: a serious error; the program itself may be unable to continue running.
    > Source: docs.python.org/3/howto/logging.html § When to use logging

17. **MUST** Using the deprecated `logging.warn()` (method or module-level function) is prohibited; you must use `logging.warning()`.
    > Original text: *"There is an obsolete method warn which is functionally identical to warning. As warn is deprecated, please do not use it - use warning instead."*
    > Source: docs.python.org/3/library/logging.html

18. **MUST** When carrying variable data in log messages, you must use `%s`-style deferred-formatting parameters (`logger.info('%s before you %s', a, b)`); using f-strings or string concatenation to pre-build the string before passing it to the logger is prohibited. Reason: f-string/concatenation performs string formatting **immediately** at the line calling `logger.info(...)`, incurring the formatting cost even when that log level is disabled; whereas `%s`-placeholder formatting is deferred by the logging framework until it is confirmed that the log record genuinely needs to be output, so when the log level is not satisfied the formatting cost can be skipped entirely.
    Positive example:
    ```python
    logger.warning('%s before you %s', 'Look', 'leap!')
    ```
    Negative example:
    ```python
    logger.warning(f'{a} before you {b}')   # f-string 在调用时已经立即求值，无法被logging推迟
    ```
    > Original text: *"Formatting of message arguments is deferred until it cannot be avoided."*
    > Source: docs.python.org/3/howto/logging.html § Optimization

19. **MAY** If computing the log arguments themselves is also expensive (not just the formatting cost), use `logger.isEnabledFor(logging.DEBUG)` to check whether computation is needed before the call, avoiding executing expensive argument-construction logic even when logging is disabled.
    > Source: docs.python.org/3/howto/logging.html § Optimization
