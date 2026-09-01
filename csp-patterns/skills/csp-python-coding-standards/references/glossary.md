# Glossary

This table explains the technical terms that appear in this standard, to help team members from different backgrounds reach a shared understanding. **Each term is annotated with its source**: terms that have an official definition in the Python official glossary (docs.python.org/3/glossary.html) are annotated as "official glossary" with an anchor link; terms not included in the official glossary but traceable to a PEP or other official documentation are annotated with the corresponding PEP/documentation; terms that are purely general computer-science/security concepts not specifically defined by the Python official documentation but with relevant warnings or usage notes that can be cross-referenced are annotated as "general concept" with a cross-verifiable Python official documentation location.

> **Audit note**: When this file was first published, none of the 20 terms had sources annotated. After a "zero-speculation full-traceability" audit, the following supplements were made: each term was checked against the official glossary at docs.python.org/3/glossary.html; terms included in the official glossary had their official original definitions and anchor links added; terms not included had the most relevant PEP or official documentation source added; pure general concepts had an explicit "general concept" annotation added, so that readers no longer mistakenly believe them to be Python official definitions.

## I. Terms Included in the Python Official Glossary (docs.python.org/3/glossary.html)

**GIL (Global Interpreter Lock)**
The mechanism used by the CPython interpreter to ensure that only one thread executes Python bytecode at a time, making the built-in object model (e.g., `dict`) implicitly thread-safe, but limiting the ability of multi-threading to parallelize CPU-intensive tasks. The GIL is released during I/O operations; some extension modules also actively release the GIL when performing compute-intensive operations such as compression/hashing. Starting from Python 3.13, the GIL can be disabled via the `--disable-gil` build configuration (see PEP 703; see `modern-syntax-concurrency.md` for details).
> Original text: *"The mechanism used by the CPython interpreter to assure that only one thread executes Python bytecode at a time. This simplifies the CPython implementation by making the object model (including critical built-in types such as dict) implicitly safe against concurrent access. Locking the entire interpreter makes it easier for the interpreter to be multi-threaded, at the expense of much of the parallelism afforded by multi-processor machines."*
> Source: docs.python.org/3/glossary.html#term-global-interpreter-lock

**CPython**
The official reference implementation of Python ("canonical implementation"), and the "Python" used by most people (the interpreter that runs behind the `python`/`python3` commands). PyPy, Jython, and IronPython are other non-official implementations.
> Original text: *"The canonical implementation of the Python programming language, as distributed on python.org. The term 'CPython' is used when necessary to distinguish this implementation from others such as Jython or IronPython."*
> Source: docs.python.org/3/glossary.html#term-CPython (the note "written in C" is a supplementary explanation of a general technical fact, not part of the original glossary entry text)

**Duck Typing**
A type-judgment approach—only caring whether an object has the required methods/attributes, not its actual type or inheritance relationship; emphasizing interfaces over specific types can improve the polymorphic flexibility of code. `typing.Protocol` provides formal support for this idea at the static type-checking level (structural subtyping, see the next entry).
> Original text: *"A programming style which does not look at an object's type to determine if it has the right interface; instead, the method or attribute is simply called or used ('If it looks like a duck and quacks like a duck, it must be a duck.') By emphasizing interfaces rather than specific types, well-designed code improves its flexibility by allowing polymorphic substitution."*
> Source: docs.python.org/3/glossary.html#term-duck-typing

**Descriptor**
An object that implements one of the `__get__`/`__set__`/`__delete__` protocol methods. Features such as `@property`, `@staticmethod`, and `@classmethod` are all implemented based on the descriptor protocol at a low level, used to customize attribute access behavior.
> Original text: *"Any object which defines the methods `__get__()`, `__set__()`, or `__delete__()`. When a class attribute is a descriptor, its special binding behavior is triggered upon attribute lookup."*
> Source: docs.python.org/3/glossary.html#term-descriptor

**Generator**
A function defined with `yield` (generator function); when called, it returns a generator object (generator iterator) that lazily yields values on demand, rather than computing and returning the complete collection all at once, which can significantly reduce memory usage. The official glossary distinguishes "generator" into two finer concepts: "generator function" and "generator iterator"; this table merges and simplifies them for ease of team understanding.
> Original text (generator function): *"A function which returns a generator object. It looks like a normal function except that it contains yield expressions for producing a series of values usable in a for-loop or that can be retrieved one at a time with the next() function."*
> Source: docs.python.org/3/glossary.html#term-generator

**Context Manager**
An object that implements the `__enter__`/`__exit__` protocol methods (or a generator function decorated with `@contextlib.contextmanager`), which can be used with the `with` statement to ensure that resources are properly acquired and released when entering/exiting a code block.
> Original text: *"An object which implements the context management protocol and controls the environment seen in a with statement. See PEP 343."*
> Source: docs.python.org/3/glossary.html#term-context-manager

**Dunder**
An informal shorthand for "double underscore", used colloquially to refer to special methods/names with double leading and trailing underscores (e.g., `__init__` is read as "dunder init"). The official glossary limits the scope of this term to "special methods" (special method); this standard extends it in practice to also cover module-level variables that similarly have double-underscore special meaning (such as `__all__`, `__version__`), which is an extended usage of this standard rather than the original definition scope of the official glossary.
> Original text: *"An informal short-hand for 'double underscore', used when talking about a special method. For example, `__init__` is often pronounced 'dunder init'."*
> Source: docs.python.org/3/glossary.html#term-dunder

**MRO (Method Resolution Order)**
In multiple-inheritance scenarios, the order in which Python determines "which inheritance chain to search along when calling a method" (C3 linearization algorithm), which can be viewed via `ClassName.__mro__`.
> Original text: *"Method resolution order is the order in which base classes are searched for a member during lookup. See The Python 2.3 Method Resolution Order for details of the algorithm used by the Python interpreter since the 2.3 release."*
> Source: docs.python.org/3/glossary.html#term-method-resolution-order

## II. Terms Not Included in the Python Official Glossary, but with a Clear PEP / Official Documentation Source

**PEP**
Python Enhancement Proposal. All formal changes to the Python language itself and the standard library, language feature designs, and community norms are proposed and recorded through the PEP process, making it the most authoritative primary source in the Python ecosystem.
> Source: peps.python.org; PEP 1 (PEP Purpose and Guidelines) defines the PEP process itself

**Structural Subtyping**
A class does not need to explicitly inherit from a base class; as long as it has the method/attribute signatures required by that base class, it is treated as a subtype by the type checker, in contrast to traditional "nominal subtyping" (Nominal Subtyping, which relies on `class A(B):` to explicitly declare an inheritance relationship). This is a type-system concept established when PEP 544 introduced `typing.Protocol`.
> Source: PEP 544 (peps.python.org/pep-0544/); docs.python.org/3/library/typing.html § Nominal vs structural subtyping (see `type-annotations.md` Section 9 for details)

**Name Mangling**
Attribute names within a class that begin with a double underscore (and do not end with a double underscore) are automatically rewritten by the Python interpreter into the form `_ClassName__attribute`, to prevent subclasses from inadvertently overriding a parent class's "private" attribute, but this is not a strict access-control mechanism.
> Source: docs.python.org/3/tutorial/classes.html#private-variables (see `naming-style.md` Section 57 for details)

**Static Type Checker**
A tool that, without running the code, analyzes type annotations and code logic to infer whether types are consistent (e.g., mypy, Pyright). The Python official type system (PEP 484 and subsequent PEPs) itself only provides syntax and semantics specifications, not runtime enforcement; such a tool must be used alongside it (see `toolchain.md` Sections 9–11 for details).
> Source: PEP 484 (peps.python.org/pep-0484/); docs.python.org/3/library/typing.html ("The Python runtime does not enforce function and variable type annotations. They can be used by third party tools such as type checkers, IDEs, linters, etc.")

**Gradual Typing**
A type-system design philosophy: it allows part of the code to have type annotations and another part to have none, and the two can coexist and call each other (un-annotated parts are treated as `Any` by default). Python's type system adopts this design philosophy, allowing projects to introduce type annotations gradually rather than converting everything at once.
> Source: PEP 484 (peps.python.org/pep-0484/); this PEP explicitly adopts gradual typing theory in its design motivation section

**src-layout / flat-layout**
Two Python project directory layout conventions. src-layout places the importable package code under a `src/` subdirectory; flat-layout places the package code directly in the project root directory (see `project-structure-deps.md` Section 6 for details).
> Source: packaging.python.org/en/latest/discussions/src-layout-vs-flat-layout/

**Build Backend**
The concrete implementation responsible for converting project source code into distributable wheel/sdist packages (e.g., setuptools, Hatchling, Flit, PDM-backend), declared by the `[build-system]` table in `pyproject.toml`. `pip`/`build` are "frontend" tools that invoke the build backend and do not themselves bear packaging logic.
> Source: PEP 517 (peps.python.org/pep-0517/, defines the standard interface for build backends); packaging.python.org/en/latest/guides/writing-pyproject-toml/

**Wheel / sdist**
Two standard distribution formats for Python packages. Wheel (`.whl`) is a pre-built binary distribution format that requires no compilation at install time; sdist (source distribution, `.tar.gz`) is a source distribution format that requires a build step to be executed in the target environment at install time.
> Source: PEP 427 (Wheel binary format specification, peps.python.org/pep-0427/); packaging.python.org related terminology pages

**Trusted Publishing**
The officially recommended publishing method by PyPI, in which a CI/CD pipeline establishes short-lived trust credentials with PyPI via OpenID Connect to complete publishing, without the need to store an API Token long-term in the CI configuration; it is more secure than the traditional twine + fixed token approach.
> Source: docs.pypi.org/trusted-publishers/ (PyPI official documentation; see `project-structure-deps.md` Section 13 for details)

## III. General Computer-Science / Security Concepts (Not Python-Specific, but Cross-Verifiable with Relevant Warnings in Python Official Documentation)

**TOCTOU**
Time-Of-Check to Time-Of-Use, a race-condition vulnerability type between the time of check and the time of use; it is a general computer-security concept, not a Python-specific term. A typical example is `tempfile.mktemp()`: there is a time window between generating a file name (checking that the name is currently unoccupied) and actually creating the file, which can be exploited by another process that pre-creates it.
> Source: general computer-security concept; the Python standard-library tempfile module documentation explicitly marks this risk of `mktemp()` ("Use of this function may introduce a security hole in your program. By the time you get around to doing anything with the file name it returns, someone else may have beaten you to the punch."): docs.python.org/3/library/tempfile.html (see `security.md` Section 6 for details)

**Shell Injection**
A type of security vulnerability where, when a program concatenates unescaped external input into a command string passed to the system shell for execution, an attacker can craft input containing shell metacharacters (such as `;`, `` ` ``, `$()`) to execute arbitrary commands; it is a general computer-security concept, not a Python-specific term.
> Source: general computer-security concept; the Python standard-library subprocess module documentation's Security Considerations section contains the official warning about this risk: docs.python.org/3/library/subprocess.html#security-considerations (see `security.md` Section 4 for details)

**Deserialization Vulnerability**
A type of security vulnerability in which, during the process of restoring serialized data from untrusted sources (e.g., `pickle`, insecure `yaml.load`) into program objects, maliciously crafted data triggers arbitrary code execution; it is a general computer-security concept, not a Python-specific term.
> Source: general computer-security concept; the Python standard-library pickle module documentation's official security warning ("The pickle module is not secure. Only unpickle data you trust."): docs.python.org/3/library/pickle.html (see `security.md` Section 1 for details)
