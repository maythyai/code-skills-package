# Modern Syntax & Concurrency

This chapter is compiled based on the official Python **What's New in Python 3.10/3.11/3.12**, **contextlib**, **pathlib**, **dataclasses**, **asyncio**, **threading**, **multiprocessing** official documentation, and **PEP 703** (optional GIL). Rules involving specific new features are each annotated with the minimum Python version.

### 7.1 Structural Pattern Matching `match`/`case` (Python 3.10+)

1.  **SHOULD** When facing a scenario of "making multi-branch decisions based on a value's structure/type/content" (especially when you need to match both value and structure simultaneously, or destructure containers to extract values), prefer `match`/`case` structural pattern matching over a lengthy `if/elif` chain; for simple "value equality comparison" scenarios, `if/elif` remains the more direct choice and migration is not mandatory.
    Official original-text example:
    ```python
    def http_error(status):
        match status:
            case 400:
                return "Bad request"
            case 404:
                return "Not found"
            case 418:
                return "I'm a teapot"
            case _:
                return "Something's wrong with the internet"
    ```
    ```python
    match point:
        case (0, 0):
            print("Origin")
        case (0, y):
            print(f"Y={y}")
        case (x, 0):
            print(f"X={x}")
        case (x, y):
            print(f"X={x}, Y={y}")
        case _:
            raise ValueError("Not a point")
    ```
    > Original text: *"Structural pattern matching has been added in the form of a match statement and case statements of patterns with associated actions... Pattern matching enables programs to extract information from complex data types, branch on the structure of data, and apply specific actions based on different forms of data."*
    > Source: docs.python.org/3/whatsnew/3.10.html § PEP 634 (Python 3.10+)

2.  **MUST** When using `match`/`case`, you must understand: a bare lowercase name in `case` (such as `y` in `case (0, y):`) is a **variable binding**, not an equality comparison; to match by a variable's current value, you must use the dotted attribute form (e.g., `case (0, self.expected):`) or a guard such as `case _ if x == expected_value:`, otherwise you will produce a subtle bug of "always matching and accidentally rebinding the value."
    > Basis: Python official language reference rules distinguishing `case` capture patterns from value patterns https://docs.python.org/3/reference/compound_stmts.html#capture-patterns — not a What's New summary excerpt; to ensure rule accuracy, follow this authoritative page. Teams adopting `match` syntax are advised to align all members on this distinction before introduction.

### 7.2 Parenthesized Multi-line Context Managers (Python 3.10+)

3.  **SHOULD** When you need to manage multiple context managers within a single `with` statement and a single line would exceed the length limit, Python 3.10+ projects should wrap them in parentheses across multiple lines, consistent in style with multi-line `import`, rather than using backslash line continuation or nesting multiple layers of `with`.
    Positive example:
    ```python
    with (
        CtxManager1() as example1,
        CtxManager2() as example2,
        CtxManager3() as example3,
    ):
        ...
    ```
    > Source: docs.python.org/3/whatsnew/3.10.html § Parenthesized Context Managers (Python 3.10+)

### 7.3 The Walrus Operator `:=` (Python 3.8+, PEP 572)

4.  **SHOULD** In conditional expressions and comprehensions, when you need to "compute a value and immediately test/use it within the same expression," you may use the walrus operator `:=` to avoid repeated computation or an extra temporary variable declaration; use it only where readability is improved, and do not abuse it by cramming too much logic into a single-line expression.
    Positive example:
    ```python
    if (n := len(data)) > 10:
        print(f'数据量过大: {n}')
    ```
    > Basis: PEP 572 (Python 3.8+, earlier than this guide's 3.10+ baseline, so always usable within this guide's scope)

### 7.4 f-string New Features (Python 3.12+, PEP 701)

5.  **MAY** Python 3.12+ projects may use the relaxed f-string syntax from PEP 701 (nesting the same quote type, multi-line expressions, embedded comments), but should use "whether it meaningfully improves readability" as the sole criterion; do not write deeply nested f strings simply because "the syntax allows it" (e.g., the five-level nested example `f"{f"{f"{f"{f"{f"{1+1}"}"}"}"}"}"` shown in the official changelog as a syntax-capability demonstration rather than a coding-style recommendation).
    > Source: docs.python.org/3/whatsnew/3.12.html § PEP 701 (see `language-features.md` item 31 for reasonable usage examples)

### 7.5 Data Classes: `@dataclass`

6.  **SHOULD** When defining a class that "only carries data and does not need hand-written `__init__`/`__repr__`/`__eq__` and other boilerplate," use the standard-library `dataclasses.dataclass` decorator; fields are declared via PEP 526 variable annotations.
    Positive example:
    ```python
    from dataclasses import dataclass

    @dataclass
    class Point:
        x: float
        y: float
    ```
    > Original text: *"This module provides a decorator and functions for automatically adding generated special methods such as `__init__()` and `__repr__()` to user-defined classes... The member variables to use in these generated methods are defined using PEP 526 type annotations."*
    > Source: docs.python.org/3/library/dataclasses.html

7.  **SHOULD** When representing an immutable value object (value semantics, should not be modified after creation), use `@dataclass(frozen=True)`; assigning to a field raises `FrozenInstanceError` (for the `TypeError` scenario, see the official documentation's per-version notes), which effectively prevents accidental modification.
    > Original text: *"frozen: If true (the default is False), assigning to fields will generate an exception. This emulates read-only frozen instances."*
    > Source: docs.python.org/3/library/dataclasses.html

8.  **SHOULD** In Python 3.10+ projects, for data classes where the number of fields is fixed, no dynamic addition of new attributes is needed, and there are certain requirements for memory footprint and attribute-access performance, you may add `slots=True` to automatically generate `__slots__`. Note: if the class itself already defines `__slots__`, adding `slots=True` raises a `TypeError`; `slots=True` returns a new class rather than modifying the original class in place.
    > Original text: *"slots: If true (the default is False), `__slots__` attribute will be generated and new class will be returned instead of the original one... Added in version 3.10."*
    > Source: docs.python.org/3/library/dataclasses.html

### 7.6 Path Operations: `pathlib`

9.  **SHOULD** For new-code filesystem path operations, prefer the `pathlib.Path` object-oriented interface over the string-concatenation style of `os.path`; `os.path` remains appropriate for low-level path operations on plain strings.
    Positive example:
    ```python
    from pathlib import Path

    config_path = Path(base_dir) / 'config' / 'app.yaml'
    if config_path.exists():
        content = config_path.read_text(encoding='utf-8')
    ```
    > Official positioning (the module title is "pathlib — Object-oriented filesystem paths", citing PEP 428): *"This module offers classes representing filesystem paths with semantics appropriate for different operating systems."*
    > Source: docs.python.org/3/library/pathlib.html; PEP 428

### 7.7 Context Managers: `contextlib`

10. **SHOULD** When custom resource-management logic is simple (acquire resource → `yield` → release resource), prefer the `@contextlib.contextmanager` decorator on a generator function over hand-writing a full class with `__enter__`/`__exit__`.
    Positive example:
    ```python
    from contextlib import contextmanager

    @contextmanager
    def managed_resource(*args, **kwds):
        resource = acquire_resource(*args, **kwds)
        try:
            yield resource
        finally:
            release_resource(resource)
    ```
    > Original text: *"This function is a decorator that can be used to define a factory function for with statement context managers, without needing to create a class or separate `__enter__()` and `__exit__()` methods."*
    > Source: docs.python.org/3/library/contextlib.html

### 7.8 Concurrency Model Selection: threading / multiprocessing / asyncio

11. **MUST** Before choosing a concurrency model, you must first understand the constraint of the GIL (Global Interpreter Lock): the CPython interpreter uses the GIL to ensure that only one thread executes Python bytecode at a time, which simplifies CPython's object-model implementation (making built-in types like `dict` implicitly thread-safe) at the cost of sacrificing the parallelism multi-processor machines can provide. The GIL is released during I/O operations; some standard-library/third-party extensions also actively release the GIL when performing compute-intensive operations such as compression or hashing.
    > Original text: *"The mechanism used by the CPython interpreter to assure that only one thread executes Python bytecode at a time... Locking the entire interpreter makes it easier for the interpreter to be multi-threaded, at the expense of much of the parallelism afforded by multi-processor machines... the GIL is always released when doing I/O."*
    > Source: docs.python.org/3/glossary.html#term-global-interpreter-lock

12. **MUST** For I/O-intensive scenarios (network requests, file reads/writes, database/RPC calls, etc., where most time is spent waiting for external resources), choose `threading` or `asyncio` rather than `multiprocessing`; for CPU-intensive scenarios (large amounts of pure computation that cannot be masked by I/O waiting), you must choose `multiprocessing` (or `concurrent.futures.ProcessPoolExecutor`), as multithreading alone cannot bypass the GIL to obtain multi-core parallel speedup.
    > Original text (threading official docs, Introduction section): *"Threads are particularly useful when tasks are I/O bound, such as file operations or making network requests, where much of the time is spent waiting for external resources."*
    > Original text (threading official docs, CPython implementation detail section — located in a different paragraph of the documentation than the preceding sentence; cited separately here to avoid implying a continuous original text): *"In CPython, due to the Global Interpreter Lock, only one thread can execute Python code at once... If you want your application to make better use of the computational resources of multi-core machines, you are advised to use multiprocessing or concurrent.futures.ProcessPoolExecutor. However, threading is still an appropriate model if you want to run multiple I/O-bound tasks simultaneously."*
    > Source: docs.python.org/3/library/threading.html
    >
    > Original text (multiprocessing official docs): *"The multiprocessing package offers both local and remote concurrency, effectively side-stepping the Global Interpreter Lock by using subprocesses instead of threads."*
    > Source: docs.python.org/3/library/multiprocessing.html

13. **SHOULD** When you need to handle a large number of I/O-wait tasks with high concurrency within a single thread (e.g., issuing hundreds or thousands of network requests simultaneously), prefer `asyncio` (`async`/`await` syntax) over spawning a thread per task; the official documentation positions asyncio as a foundational library for "writing concurrent code" and explicitly states it is "often a perfect fit for IO-bound and high-level structured network code."
    > Original text: *"asyncio is a library to write concurrent code using the async/await syntax... asyncio is often a perfect fit for IO-bound and high-level structured network code."*
    > Source: docs.python.org/3/library/asyncio.html

14. **MUST** When using `asyncio`, you must not directly call blocking synchronous I/O interfaces inside a coroutine (e.g., synchronous `requests.get()`, `time.sleep()`, synchronous database drivers); this blocks the entire event loop and prevents all other concurrent coroutines from making progress. You must use the corresponding async library (e.g., `aiohttp`/`httpx.AsyncClient`/`asyncio.sleep()`), or dispatch the blocking call to a thread pool via `loop.run_in_executor()`.
    > Basis: community practice + the established principles of asyncio's single-threaded cooperative multitasking model (the event loop is driven by a single thread; any blocking call that does not yield control monopolizes that thread). This can be cross-verified in the asyncio official documentation's Developing with asyncio § Running Blocking Code section https://docs.python.org/3/library/asyncio-dev.html#running-blocking-code (Audit note: the official section title and body wording emphasize "Blocking (CPU-bound) code"; the "blocking synchronous I/O" discussed in this rule belongs to the same class of problem — "calls that monopolize the event loop's thread" — and the official description of `loop.run_in_executor()` is itself generalized to cover all "blocking code" scenarios, so cross-verification holds; however, strictly speaking, the official original wording's emphasis differs slightly from this rule's description and is not verbatim identical.)

15. **MAY** Python 3.13 introduced an experimental free-threaded (no-GIL) build (requires the separate `python3.13t` executable, `--disable-gil` compile option); from 3.14 this feature is upgraded from "experimental" to "officially supported" (PEP 779). Given the current maturity stage of this feature's ecosystem, the decision to switch to a free-threaded build should be based on a thorough assessment of third-party C extension compatibility and single-threaded performance overhead; it is not recommended to enable it in production environments without adequate validation.
    > Original text (3.13 stage): *"CPython now has experimental support for running in a free-threaded mode, with the global interpreter lock (GIL) disabled. This is an experimental feature and therefore is not enabled by default."*
    > Source: docs.python.org/3/whatsnew/3.13.html § Free-threaded CPython; PEP 703 (Status: Final, introduced in Python 3.13)
    >
    > Original text (3.14 stage): *"PEP 779: Free-threaded Python is officially supported"*
    > Source: docs.python.org/3/whatsnew/3.14.html

### 7.9 Modern Syntax and Concurrency Feature Version Quick Reference

| Feature | Minimum Version | Official Source |
|---|---|---|
| `match`/`case` structural pattern matching | 3.10 | PEP 634/635/636 |
| Parenthesized multi-line `with` | 3.10 | docs.python.org/3/whatsnew/3.10.html |
| `dataclass(slots=True)` | 3.10 | docs.python.org/3/library/dataclasses.html |
| `except*` / `ExceptionGroup` | 3.11 | PEP 654 |
| `tomllib` (standard-library TOML parser) | 3.11 | PEP 680 |
| PEP 701 f-string relaxed restrictions | 3.12 | PEP 701 |
| Free-threaded (experimental) | 3.13 | PEP 703 |
| Free-threaded (officially supported) | 3.14 | PEP 779 |
| PEP 649 deferred annotation evaluation (takes effect automatically) | 3.14 | PEP 649/749 |

> For the complete version quick reference (including type-system features), see `naming-version-cheatsheet.md`.
