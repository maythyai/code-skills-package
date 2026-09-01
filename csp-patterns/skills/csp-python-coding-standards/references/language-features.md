# Language Features

This chapter consolidates the official text of **PEP 8 § Programming Recommendations** (https://peps.python.org/pep-0008/#programming-recommendations), along with language-feature recommendations still applicable to Python 3; all Python 2-specific content has been removed in line with the Python 3.10+ reality (Python 2 officially reached end-of-life on 2020-01-01, PEP 373).

**Table of contents** (this file exceeds 300 lines; use the table below to jump to the section you need rather than reading it end-to-end every time):

- [3.1 Booleans and conditional checks](#31-booleans-and-conditional-checks) (rules 1-8)
- [3.2 General programming advice for exception handling](#32-general-programming-advice-for-exception-handling) (rules 9-10)
- [3.3 Global variables](#33-global-variables) (rules 11-12)
- [3.4 Constructors](#34-constructors) (rule 13)
- [3.5 Function return values](#35-function-return-values) (rules 14-15)
- [3.6 Inner classes and functions](#36-inner-classes-and-functions) (rule 16)
- [3.7 Comprehensions and generators](#37-comprehensions-and-generators) (rules 17-20)
- [3.8 lambda expressions](#38-lambda-expressions) (rule 21)
- [3.9 Conditional expressions (ternary expressions)](#39-conditional-expressions-ternary-expressions) (rule 22)
- [3.10 Default arguments](#310-default-arguments) (rule 23)
- [3.11 Attribute access: @property](#311-attribute-access-property) (rules 24-25)
- [3.12 Decorators](#312-decorators) (rules 26-27)
- [3.13 Inheritance](#313-inheritance) (rules 28-30)
- [3.14 String formatting](#314-string-formatting) (rules 31-34)
- [3.15 File and socket resource management](#315-file-and-socket-resource-management) (rules 35-36)
- [3.16 Main program entry](#316-main-program-entry) (rules 37-38)

## 3.1 Booleans and conditional checks

1.  **MUST** To check against `None`, always use `is` / `is not`; `==` / `!=` is forbidden.
    Positive example: `if a is None: ...`　`if b is not None: ...`
    Negative example: `if a == None: ...`
    > Original: *"Comparisons to singletons like None should always be done with `is` or `is not`, never the equality operators."*
    > Source: PEP 8 § Programming Recommendations

2.  **MUST** Beware of the semantic difference between `if x:` and `if x is not None:`: when `x` defaults to `None` but may also be assigned a container that is falsy in a boolean context (such as an empty list `[]`), `if x:` will misjudge that container as "not set". When you need to distinguish "not provided" from "provided an empty value", you must explicitly use `is not None`.
    > Original: *"Also, beware of writing `if x` when you really mean `if x is not None`– e.g. when testing whether a variable or argument that defaults to None was set to some other value. The other value might have a type (such as a container) that could be false in a boolean context!"*
    > Source: PEP 8 § Programming Recommendations

3.  **SHOULD** Use `is not` rather than `not ... is`; the former is more readable.
    Positive example: `if foo is not None:`　Negative example: `if not foo is None:`
    > Source: PEP 8 § Programming Recommendations

4.  **MUST** To test whether a sequence (string / list / tuple / dict, etc.) is empty, rely directly on the fact that its empty value is falsy in a boolean context; do not use `len()` for the check.
    Positive example: `if not seq: ...`　Negative example: `if len(seq) == 0: ...`
    > Source: PEP 8 § Programming Recommendations

5.  **MUST** Booleans must not be compared against `True`/`False` using `==` or `is`.
    Positive example: `if greeting: ...`　Negative example: `if greeting == True: ...`　Worse: `if greeting is True: ...`
    > Source: PEP 8 § Programming Recommendations

6.  **MUST** When testing whether an integer expression is 0, use `expr == 0` rather than `not expr`, to avoid conflation with "emptiness check" semantics.
    Positive example: `if i % 10 == 0: ...`　Negative example: `if not i % 10: ...`

7.  **MUST** Object type comparisons must use `isinstance()`; direct comparison of `type(obj)` is forbidden, because `isinstance` natively supports subclasses and multiple candidate types (passed as a tuple).
    Positive example: `if isinstance(obj, int): ...`　Negative example: `if type(obj) is type(1): ...`
    > Original: *"Object type comparisons should always use isinstance() instead of comparing types directly."*
    > Source: PEP 8 § Programming Recommendations

8.  **SHOULD** When implementing ordering-related rich comparison operators, either use the `functools.total_ordering()` decorator to fill in all six comparison methods (`__eq__`/`__ne__`/`__lt__`/`__le__`/`__gt__`/`__ge__`), or manually implement all of them, rather than implementing only one or two and relying on other code "happening to only call the one already implemented".
    > Original: *"When implementing ordering operations with rich comparisons, it is best to implement all six operations... To minimize the effort involved, the `functools.total_ordering()` decorator provides a tool to generate missing comparison methods."*
    > Source: PEP 8 § Programming Recommendations

## 3.2 General programming advice for exception handling

> Detailed rules on exception class design, inheritance hierarchies, exception chaining, exception groups, etc. are in `exceptions-logging.md`; this section covers only general advice related to "how to use the language feature".

9.  **MUST** A bare `except:` that catches all exceptions is forbidden. A bare `except:` is equivalent to `except BaseException:` and will catch non-business exceptions such as `SystemExit` and `KeyboardInterrupt`, making the program hard to interrupt with Ctrl-C and masking other potential problems; when you genuinely need to catch all business errors, use `except Exception:`.
    Positive example:
    ```python
    try:
        foo()
    except Exception as e:
        do_something()
    ```
    Negative example:
    ```python
    try:
        foo()
    except:
        do_something()
    ```
    > Original: *"A bare `except:` clause will catch SystemExit and KeyboardInterrupt exceptions, making it harder to interrupt a program with Control-C, and can disguise other problems. If you want to catch all exceptions that signal program errors, use `except Exception:`."*
    > Source: PEP 8 § Programming Recommendations

10. **MUST** The `try` clause should wrap only the minimal scope of code that may actually raise the target exception, preventing `except` from accidentally catching the same exception type thrown by unrelated code and masking a real bug.
    Positive example:
    ```python
    try:
        value = collection[key]
    except KeyError:
        return key_not_found(key)
    else:
        return handle_value(value)
    ```
    Negative example:
    ```python
    try:
        return handle_value(collection[key])   # a KeyError raised inside handle_value would be misjudged as a collection lookup failure
    except KeyError:
        return key_not_found(key)
    ```
    > Source: PEP 8 § Programming Recommendations

## 3.3 Global variables

11. **MUST** Module-level global variables are allowed only in the following scenarios: default options for a script; module-level constants (all-uppercase, underscore-separated). Avoid global-state assignments with side effects at import time, because `import` triggers execution of module-level code and may unexpectedly alter module behavior.
12. **MUST** Global variables (including constants) must be placed at the top of the file (after the `import` statements and after dunder variables; for exact ordering see `naming-style.md` rules 15/19).
    Positive example:
    ```python
    import os
    import sys

    PI = 3.1415926
    SHOW_SOMETHING = True
    ```

## 3.4 Constructors

13. **SHOULD** A class's `__init__` constructor should be kept as simple as possible and must not contain logic that may fail or is overly complex. A complex, exception-prone constructor has unclear semantics, does not match caller expectations, and is hard to maintain; complex logic should be split out into dedicated factory functions or ordinary methods.

## 3.5 Function return values

14. **MUST** A function must return no more than 3 values; when more than 3 are needed, they must be wrapped in a named structure such as `dataclass`/`NamedTuple`/`TypedDict`. Relying on a bare tuple and forcing callers to unpack by position and remember the order is forbidden.
    Positive example:
    ```python
    from dataclasses import dataclass

    @dataclass
    class Person:
        name: str
        gender: str
        age: int
        weight: float

    def get_person_info() -> Person:
        return Person('jjp', 'MALE', 30, 130)
    ```
    Negative example:
    ```python
    def get_person_info():
        return 'jjp', 'MALE', 30, 130   # 4 return values; callers must remember the order

    name, gender, age, weight = get_person_info()
    ```
    > Basis: Community practice (the official PEP 8 text does not directly limit the number of return values; this is a maintainability best practice. For the official usage of `dataclass` see `modern-syntax-concurrency.md`)

15. **MUST** Consistency requirement for `return` statements within a single function: either all `return` statements return an expression, or none of them do (bare `return` / implicit fall-off at the end of the function); if some branches return a value and others do not, the non-returning branches must explicitly write `return None`, and the end of the function (if reachable) should have an explicit `return`.
    Positive example:
    ```python
    def foo(x):
        if x >= 0:
            return math.sqrt(x)
        else:
            return None
    ```
    Negative example:
    ```python
    def foo(x):
        if x >= 0:
            return math.sqrt(x)
        # implicitly returns None, inconsistent with the explicit return above
    ```
    > Original: *"Be consistent in return statements. Either all return statements in a function should return an expression, or none of them should."*
    > Source: PEP 8 § Programming Recommendations

## 3.6 Inner classes and functions

16. **SHOULD** The use of inner classes (classes defined inside another class / function / method body) or inner functions (closures) is discouraged. Variables defined in an enclosing scope are read-only to nested functions; instances of nested / local classes typically cannot be pickled. When their use is genuinely warranted (e.g. implementing one-off helper logic, decorator factories), you should have a clear grasp of your team's familiarity and the use case.

## 3.7 Comprehensions and generators

17. **MUST** List comprehensions are only for simple cases; nesting two or more levels of `for` / conditional logic is forbidden. The mapping expression, the `for` clause, and the filter condition of a comprehension should each be on its own line. Complex logic should be rewritten as an ordinary `for` loop or split into multiple generator expressions.
    Positive example:
    ```python
    squares = [x * x for x in range(10)]

    result = ((x, complicated_transform(x))
              for x in long_generator_function(parameter)
              if x is not None)
    ```
    Negative example:
    ```python
    result = ((x, y, z)
              for x in range(5)
              for y in range(5)
              if x != y
              for z in range(5)
              if y != z)
    ```

18. **SHOULD** For large-scale data processing (common in data / machine-learning batch processing), prefer list comprehensions / generator expressions over a "`for` loop + `list.append()`" hand-built list. `append()` repeatedly checks list capacity and may trigger multiple memory reallocations; in the CPython implementation, list comprehensions pre-compute or follow a more efficient bytecode path to build the result, and are measured to be typically faster than the equivalent loop + `append()`. Intermediate stages of data processing (where the result is consumed only once) should prefer generator expressions over list comprehensions, using lazy evaluation to avoid the memory cost of building a full list at once.
    Positive example:
    ```python
    import itertools

    _lines = (line.strip().split(',') for line in f)
    _fields = (data[-1] for data in _lines)
    _words = (text.split() for text in _fields)
    all_words = itertools.chain.from_iterable(_words)
    result_words = [w for w in all_words if w not in STOPPED_WORDS_SET]
    ```
    > Basis: Community practice (CPython list comprehensions have dedicated optimizations at the bytecode level, and the lazy-evaluation behavior of generator expressions is part of the Python language specification itself; the exact performance multiplier here varies with data scale and hardware, so it is not cited as a verifiable "official figure", only as a directional recommendation)

19. **MUST** If a type supports default iterators / operators (`in`, `for...in`, subscript, etc.), prefer using them over first converting to `list` and then iterating, and do not use deprecated Python 2 legacy methods (e.g. `dict.has_key()`, which Python 3 has removed; use `in` / `not in` directly).
    Positive example:
    ```python
    for key in adict: ...
    for line in afile: ...
    if key not in adict: ...
    ```

20. **SHOULD** When you need to return a large or potentially infinite sequence, prefer defining a generator function with `yield` over building a complete list first and then returning it; generators produce values on demand, have lower memory footprint, and the caller side can `break` early without waiting for all data to be ready.
    Positive example:
    ```python
    def odds(n):
        for i in range(1, n + 1):
            if i % 2 == 1:
                yield i
    ```

## 3.8 lambda expressions

21. **MUST** Use lambda only for logic simple enough to fit on a single line (typically as the `key` / callback argument to `sorted()` / `map()` / `filter()`), and it must not exceed 60~80 characters; otherwise it must be defined as a named regular function.
    Positive example: `sorted(items, key=lambda x: x.age)`
    Negative example: `filter(lambda x: True if x < 0 else True if x >= 10 and x < 20 else False, alist)` (should be rewritten as a named function)

## 3.9 Conditional expressions (ternary expressions)

22. **MUST** Conditional expressions (`x = 1 if cond else 2`) are only for simple cases that fit on a single line; nesting multiple layers of conditional expressions is forbidden, and complex branching must be rewritten as a full `if/elif/else` statement.
    Positive example: `x = 1 if cond else 2`
    Negative example: `x = 'Great' if score >= 80 else 'Good' if score >= 60 and score < 80 else 'Bad'` (should be rewritten as if/elif/else)

## 3.10 Default arguments

23. **MUST** Function default arguments may only use immutable literal constants: integers, booleans, floats, strings, `None` (or other immutable objects). Using mutable objects (`list` / `dict` / `set`, etc.), function-call results, or values determinable only at runtime directly as default arguments is **forbidden**.
    Reason: a Python function's default arguments are evaluated once at **definition time** and then shared across every subsequent call; if the default is a mutable object, multiple calls share and unexpectedly pollute the same data; if the default is a function-call result (e.g. `time.time()`), it is likewise evaluated only once at definition time and will not refresh per call.
    Positive example:
    ```python
    def foo(a, b=None):
        if b is None:
            b = []
        ...
    ```
    Negative example:
    ```python
    def foo(a, b=[]):          # multiple calls share the same list object
        ...

    def foo(a, b=time.time()): # b is the time at function definition, not at call time
        ...
    ```
    > Original (Python official tutorial § Default Argument Values, "Important warning" callout): *"Important warning: The default value is evaluated only once. This makes a difference when the default is a mutable object such as a list, dictionary, or instances of most classes."*
    > Source: docs.python.org/3/tutorial/controlflow.html#default-argument-values (Audit correction: previously labeled "Basis: Community practice", which understated its authority; the official tutorial in fact documents this behavior in a dedicated "Important warning" callout, so it should be treated as a direct official-tutorial basis rather than a community-experience summary. Also corrected the number in the quotation: instances, not instance)

## 3.11 Attribute access: @property

24. **SHOULD** When you need to attach validation or computation logic to accessing / setting a data member, use the `@property` / `@x.setter` decorators and still expose ordinary attribute-access syntax externally, rather than defining `get_x()` / `set_x()` methods.
    Positive example:
    ```python
    class SampleClass:
        def __init__(self):
            self._threshold = 0

        @property
        def threshold(self):
            return self._threshold

        @threshold.setter
        def threshold(self, value):
            if not isinstance(value, (int, float)):
                raise TypeError('threshold must be of type int or float')
            if not 0 <= value <= 100:
                raise ValueError('threshold must be a value from 0 to 100')
            self._threshold = value
    ```

25. **MUST** A `@property` getter must not have observable side effects, nor contain expensive computation; callers seeing attribute-access syntax naturally expect it to be cheap and side-effect-free, and computationally heavy operations should be expressed explicitly via an ordinary method (e.g. `compute_x()`) to signal "this has a cost".

## 3.12 Decorators

26. **SHOULD** Prefer function / method decorators in the following scenarios: `@property`, `@classmethod`, `@staticmethod`, automated-testing-related decorators (e.g. pytest's `@pytest.fixture`), decorators required by third-party libraries, and custom decorators that have been assessed to deliver clear benefits without harming maintainability. Decorators can arbitrarily change a function's arguments and return value and easily produce unexpected behavior; overuse significantly reduces code maintainability, so they should be used only after careful assessment.

27. **MUST** When writing a custom decorator that needs to forward the decorated function's parameter signature (for IDE / type-checker recognition), use `functools.wraps` to preserve the original function's `__name__` / `__doc__` / `__wrapped__` and other metadata, and use `ParamSpec` (see `type-annotations.md` rule 17) to annotate the parameter-forwarding relationship.

## 3.13 Inheritance

28. **MUST** In Python 3 all classes inherit from `object` by default (new-style classes); there is no need to explicitly write `class Foo(object):`. This guideline does not require explicitly inheriting from `object` (this is a Python 2 legacy concern; classic classes no longer exist in Python 3).

29. **SHOULD** Public attribute names must not have a leading underscore; if a public attribute name conflicts with a reserved keyword, append a single trailing underscore to the name. For simple public data attributes, expose the attribute name directly; accessing them via getter / setter methods is not required (use `@property` when validation / computation logic is needed, see section 3.11).

30. **SHOULD** When a subclass has attributes you do not want accessed externally (including by sub-subclasses), you may use a double-underscore prefix to trigger name mangling; but understand that this mechanism is merely simple name concatenation (`_ClassName__attribute`) and is not strict access control, so it cannot serve as a security boundary.

## 3.14 String formatting

31. **SHOULD** Prefer f-strings for string formatting (available since Python 3.6+; PEP 701, from 3.12+, further relaxes the restrictions on expressions inside f-strings, allowing nesting of the same quote style and multi-line expressions). The `%` style and `str.format()` remain valid and are more appropriate when formatting must be deferred (e.g. logging scenarios, see `exceptions-logging.md`) or when the format string itself comes from an external variable. Using bare `+` to concatenate multiple variables is forbidden.
    Positive example (3.12+, after PEP 701 relaxation):
    ```python
    songs = ['Take me back to Eden', 'Alkaline', 'Ascensionism']
    playlist = f"This is the playlist: {", ".join(songs)}"
    ```
    Positive example (general):
    ```python
    x = f'name: {name}; score: {n}'
    ```
    Negative example:
    ```python
    x = 'name: ' + name + '; score: ' + str(n)
    ```
    > Original (PEP 701): *"Expression components inside f-strings can now be any valid Python expression, including strings reusing the same quote as the containing f-string, multi-line expressions, comments, backslashes, and unicode escape sequences."*
    > Source: docs.python.org/3/whatsnew/3.12.html § PEP 701

32. **MUST** Using `+=` to concatenate a list of strings inside a loop is forbidden; `str.join()` must be used. Because strings are immutable, every `+=` creates a new string object, and loop concatenation degrades to O(n²) time complexity.
    Positive example:
    ```python
    items = ['<table>']
    for last_name, first_name in employee_list:
        items.append(f'<tr><td>{last_name}, {first_name}</td></tr>')
    items.append('</table>')
    employee_table = ''.join(items)
    ```
    Negative example:
    ```python
    employee_table = '<table>'
    for last_name, first_name in employee_list:
        employee_table += f'<tr><td>{last_name}, {first_name}</td></tr>'
    employee_table += '</table>'
    ```

33. **MUST** Testing string prefixes / suffixes must use `str.startswith()` / `str.endswith()`; slice comparison is forbidden, as the former is clearer and less prone to off-by-one boundary errors.
    Positive example: `if foo.startswith('bar'):`　Negative example: `if foo[:3] == 'bar':`
    > Source: PEP 8 § Programming Recommendations

34. **MUST** Writing "works but non-portable" code that relies on CPython-specific implementation optimizations is forbidden—for example, assuming that `a += b` / `a = a + b` style string concatenation is efficient under all Python implementations (PyPy / Jython, etc.); when efficient string concatenation is genuinely needed, use `''.join()`.
    > Original: *"Code should be written in a way that does not disadvantage other implementations of Python... do not rely on CPython's efficient implementation of in-place string concatenation for statements in the form `a += b` or `a = a + b`... the `''.join()` form should be used instead."*
    > Source: PEP 8 § Programming Recommendations

## 3.15 File and socket resource management

35. **MUST** After using resources that require explicit release—files, sockets, network connections, locks, etc.—you must ensure they are closed; prefer the `with` statement for automatic lifecycle management, with `try...finally` as the next best option. Relying on object destruction to close resources as a fallback is forbidden, because non-CPython implementations (or in the presence of reference cycles) do not guarantee the exact timing of destruction, which can lead to resource-handle exhaustion.
    Positive example:
    ```python
    with open('fe.conf') as fe:
        for line in fe:
            print(line)
    ```
    > Original: *"When a resource is local to a particular section of code, use a `with` statement to ensure it is cleaned up promptly and reliably after use. A try/finally statement is also acceptable."*
    > Source: PEP 8 § Programming Recommendations

36. **SHOULD** When defining a custom context manager (`__enter__` / `__exit__` or `@contextlib.contextmanager`), the `with` statement itself should clearly express "what is being done here", not merely "acquire and release a resource". If the context manager also implies additional behavior such as transaction commit or lock reentrancy semantics, that should be triggered via a separately named method / function, rather than letting readers assume that `with obj:` is just simple resource release.
    Positive example:
    ```python
    with conn.begin_transaction():
        do_stuff_in_transaction(conn)
    ```
    Negative example:
    ```python
    with conn:                       # cannot tell that __enter__/__exit__ "begins a transaction" rather than just closing the connection
        do_stuff_in_transaction(conn)
    ```
    > Source: PEP 8 § Programming Recommendations

## 3.16 Main program entry

37. **MUST** All modules intended to be executable entry points must guard their main-program logic with `if __name__ == '__main__':`, to avoid accidentally triggering main-program side effects when the module is `import`ed by other modules.
    Positive example:
    ```python
    def main():
        ...

    if __name__ == '__main__':
        main()
    ```

38. **SHOULD** The first line of a script should use `#!/usr/bin/env python3` (rather than `#!/usr/bin/env python`, because on some modern systems the `python` command no longer points to Python 3 by default; specify `python3` explicitly to avoid ambiguity); the `# coding: utf-8` encoding declaration is no longer needed (see `naming-style.md` rule 12).
