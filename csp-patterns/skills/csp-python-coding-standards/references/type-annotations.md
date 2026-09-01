# Type Annotations

This chapter is compiled based on the official Python **typing module documentation** (https://docs.python.org/3/library/typing.html) and related PEPs (484/526/544/586/589/591/604/612/646/673/695/698).

### 2.1 Basic Principles

1.  **MUST** Clearly understand: **the Python runtime does not check type annotations by default**; type annotations are only used by third-party static type checkers such as mypy and Pyright, as well as IDEs and linters. Adding type annotations must not be equated with "runtime type safety"; legitimacy checks for external input still require explicit runtime checks (see `security.md`).
    > Original text: *"The Python runtime does not enforce function and variable type annotations. They can be used by third party tools such as type checkers, IDEs, linters, etc."*
    > Source: docs.python.org/3/library/typing.html
    >
    > Original text (PEP 484 Non-goals): *"Python will remain a dynamically typed language, and the authors have no desire to ever make type hints mandatory, even by convention."*
    > Source: PEP 484 § Non-goals

2.  **SHOULD** New code should add type annotations to the parameters and return values of all public functions and methods; the standard library remains conservative about adopting type annotations, but application code and third-party libraries are explicitly encouraged to experiment actively (see `naming-style.md` item 62). Projects should integrate a static checker such as mypy or Pyright into CI; otherwise type annotations have only documentary value and no quality-assurance value.
    > Basis: PEP 8 § Function Annotations official encouraging clause + community practice (CI integration is an industry-standard practice, not PEP-mandated)

3.  **MUST** Do not annotate a parameter with `Any` simply because it is "faster to write" to mask the absence of a real type; `Any` makes that value completely invisible to the type checker (assignable to any type, and any type assignable to it). Abuse renders type checking virtually useless.
    > Original text: *"A static type checker will treat every type as assignable to `Any` and `Any` as assignable to every type."*
    > Source: docs.python.org/3/library/typing.html

### 2.2 Union and Optional Types

4.  **MUST** In Python 3.10+ projects, union types must use the `X | Y` shorthand syntax; `Union[X, Y]` must no longer be used. The official documentation explicitly recommends the shorthand form.
    Positive example:
    ```python
    def get_user(user_id: int) -> "User | None": ...
    ```
    Negative example:
    ```python
    from typing import Union, Optional
    def get_user(user_id: int) -> Optional["User"]: ...
    ```
    > Original text: *"To define a union, use e.g. `Union[int, str]` or the shorthand `int | str`. Using that shorthand is recommended."*
    > Source: docs.python.org/3/library/typing.html (PEP 604, Python 3.10+)

5.  **MUST** Only if the project must support Python 3.9 and below (not recommended, see SKILL.md scope) is `typing.Union`/`typing.Optional` permitted, and `from __future__ import annotations` (PEP 563) should be added at the top of the module so that annotations are lazily evaluated as strings overall, allowing `X | Y` to be used syntactically in advance.

### 2.3 Type Aliases and Generics (PEP 695, Python 3.12+)

6.  **SHOULD** In Python 3.12+ projects, when defining type aliases, use the `type` statement rather than the old-style `TypeAlias` annotation or bare assignment.
    Positive example (3.12+):
    ```python
    type Point = tuple[float, float]
    type Point[T] = tuple[T, T]          # generic type alias
    ```
    Old-style (3.9~3.11 compatibility scenarios):
    ```python
    from typing import TypeAlias
    Point: TypeAlias = tuple[float, float]
    ```
    > Original text: *"A type alias is defined using the `type` statement, which creates an instance of `TypeAliasType`... For backwards compatibility, type aliases can also be created through simple assignment... Or marked with `TypeAlias` to make it explicit."*
    > Source: docs.python.org/3/library/typing.html; PEP 695 (Python 3.12+)

7.  **SHOULD** In Python 3.12+ projects, when defining generic functions/classes, use the new type parameter syntax `def f[T](...)` / `class C[T]:` rather than the old-style `TypeVar` + `Generic[T]` combination. The new syntax has clearer scoping and does not require declaring a `TypeVar` separately at module level.
    Positive example (3.12+):
    ```python
    def first[T](l: Sequence[T]) -> T:
        return l[0]

    class Stack[T]:
        def push(self, item: T) -> None: ...
    ```
    Old-style (3.9~3.11 compatibility scenarios, still officially supported):
    ```python
    from typing import TypeVar, Generic, Sequence
    U = TypeVar('U')
    def second(l: Sequence[U]) -> U:
        return l[1]

    class Stack(Generic[U]):
        def push(self, item: U) -> None: ...
    ```
    > Original text: *"Generic functions and classes can be parameterized by using type parameter syntax... Changed in version 3.12: Syntactic support for generics is new in Python 3.12."*
    > Source: docs.python.org/3/library/typing.html; PEP 695
    >
    > Official design motivation (original text): *"While generic types and type parameters have grown in popularity, the syntax for specifying type parameters still feels 'bolted on' to Python. This is a source of confusion among Python developers."*
    > Source: PEP 695 § Motivation

8.  **MAY** PEP 695 type parameter syntax supports declaring `bound` (upper bound) and `constraints` (constraint set) directly within the brackets, replacing the previously verbose `TypeVar(..., bound=..., constraints=...)` call:
    ```python
    type IntFunc[**P] = Callable[P, int]              # ParamSpec, replaces typing.ParamSpec
    type LabeledTuple[*Ts] = tuple[str, *Ts]           # TypeVarTuple, replaces typing.TypeVarTuple
    type HashableSequence[T: Hashable] = Sequence[T]   # TypeVar with bound
    type IntOrStrSequence[T: (int, str)] = Sequence[T] # TypeVar with constraints
    ```
    > Source: docs.python.org/3/whatsnew/3.12.html § PEP 695

### 2.4 Structural Types: Protocol / TypedDict

9.  **SHOULD** When you only care whether an object has a certain set of methods/attributes ("duck typing" scenarios) and not about its inheritance relationship, define a `Protocol` subclass for structural typing rather than requiring the checked object to explicitly inherit a base class.
    > Original text: *"PEP 544 solves this problem by allowing users to write the above code without explicit base classes in the class definition, allowing `Bucket` to be implicitly considered a subtype of both `Sized` and `Iterable[int]` by static type checkers. This is known as structural subtyping (or static duck-typing)."*
    > Source: docs.python.org/3/library/typing.html (PEP 544)

10. **SHOULD** When a dictionary's set of keys and the type corresponding to each key are fixed and known (e.g., JSON configuration, API response bodies), use `TypedDict` to describe its structure rather than a bare `dict[str, Any]`.
    > Original text: *"TypedDict declares a dictionary type that expects all of its instances to have a certain set of keys, where each key is associated with a value of a consistent type. This expectation is not checked at runtime but is only enforced by type checkers."* (Audit correction: the verb is declares, not creates)
    > Source: PEP 589; docs.python.org/3/library/typing.html
    >
    > **MUST** It must be understood that `TypedDict` field constraints **take effect only at the type-checking stage, not at runtime**. For legitimacy of fields after deserializing external input (such as HTTP request bodies), you must still use a runtime validation library such as Pydantic or perform manual validation; you cannot rely solely on `TypedDict` annotations.

### 2.5 Returning an Instance of Self: the Self Type (PEP 673, Python 3.11+)

11. **SHOULD** When a method returns an instance of its own class (e.g., `__enter__`, chained-call methods, `classmethod` constructors), annotate the return value with the `Self` type rather than hand-writing the class name as a string or declaring an extra `TypeVar`. With `Self`, when a subclass calls that method the type checker can correctly infer the subclass type rather than the parent type.
    Positive example (3.11+):
    ```python
    from typing import Self

    class MyLock:
        def __enter__(self) -> Self:
            self.lock()
            return self

    class MyInt:
        @classmethod
        def fromhex(cls, s: str) -> Self:
            return cls(int(s, 16))
    ```
    > Original text: *"The new Self annotation provides a simple and intuitive way to annotate methods that return an instance of their class. This behaves the same as the TypeVar-based approach specified in PEP 484, but is more concise and easier to follow."*
    > Source: docs.python.org/3/whatsnew/3.11.html; PEP 673

### 2.6 Explicit Override Declaration: @override (PEP 698, Python 3.12+)

12. **SHOULD** When a subclass overrides a parent class method, add the `@typing.override` decorator to explicitly declare "this is an intentional override." This way, when the parent class method is renamed or its signature changes, causing the subclass "override" to silently fail (becoming a new method rather than a true override), the type checker can immediately report an error instead of letting the bug slip through unnoticed.
    Positive example (3.12+):
    ```python
    from typing import override

    class Base:
        def get_data(self) -> dict: ...

    class Derived(Base):
        @override
        def get_data(self) -> dict:
            return {**super().get_data(), "extra": 1}
    ```
    > Original text: *"This PEP proposes adding an `@override` decorator to the Python type system. This will allow type checkers to prevent a class of bugs that occur when a base class changes methods that are inherited by derived classes."*
    > Source: PEP 698

### 2.7 Other Common Type Constructs

13. **SHOULD** Use `@overload` to describe scenarios where the same function has different return types under different parameter combinations; the multiple declarations decorated with `@overload` are for use by the type checker only, and must be followed by exactly one real implementation without the decorator.
    > Original text: *"In regular modules, a series of `@overload`-decorated definitions must be followed by exactly one non-`@overload`-decorated definition (for the same function/method)."*
    > Source: typing official spec https://typing.python.org/en/latest/spec/overload.html

14. **SHOULD** Use `Final` to annotate constants that should not be reassigned, methods that should not be overridden by subclasses, and classes that should not be inherited; this constraint is for the type checker only and imposes no runtime restriction.
    > Source: PEP 591; docs.python.org/3/library/typing.html

15. **MUST** Use `ClassVar` to annotate attributes that belong only to the class and should not be set on instances, to avoid them being mistaken for instance fields.
    Positive example:
    ```python
    class Config:
        default_timeout: ClassVar[int] = 30   # class variable, should not be reassigned on instances
        name: str                              # instance variable
    ```
    > Original text: *"`ClassVar` does not change Python runtime behavior, but it can be used by static type checkers."*
    > Source: PEP 526; docs.python.org/3/library/typing.html

16. **SHOULD** When a variable can only take a limited set of fixed literal values (e.g., states of a state machine, HTTP method names), annotate it with `Literal` rather than a broad `str`.
    Positive example:
    ```python
    def request(method: Literal["GET", "POST", "PUT", "DELETE"]) -> None: ...
    ```
    > Source: PEP 586; docs.python.org/3/library/typing.html

17. **MAY** When writing decorators that need to "forward the parameter signature of another callable" (e.g., a general-purpose logging decorator or caching decorator), use `ParamSpec` and `Concatenate` to precisely express parameter dependencies, preventing the decorator's return-value type from degrading to `Any` and losing the original function's signature information.
    > Source: PEP 612

18. **MAY** When generic annotation of a variable number of elements with differing types is needed (e.g., tuple-processing functions where the first few positional types are fixed and the rest are variable), use `TypeVarTuple` to express variadic generics.
    > Source: PEP 646

### 2.8 Naming and Formatting Details

19. **MUST** Variable annotations follow PEP 526/PEP 8 formatting: no space before the colon, one space after the colon; if there is a default value, one space on each side of the equals sign (see `naming-style.md` item 63 for details).

20. **SHOULD** Type variable naming follows PEP 8 naming conventions: short `CapWords` (`T`, `AnyStr`), with `_co`/`_contra` suffixes for covariant/contravariant respectively (see `naming-style.md` item 59 for details); when using the new PEP 695 syntax (`class C[T]:`), there is no need to declare a module-level `TypeVar` separately, and the naming constraints equally apply to the type parameter names declared within the brackets.

### 2.9 Version Compatibility Quick Reference

| Feature | Minimum Version | Official Source |
|---|---|---|
| `X \| Y` union type shorthand | 3.10 | PEP 604 |
| `Self` type | 3.11 | PEP 673 |
| `TypeVarTuple` / `*Ts` | 3.11 | PEP 646 |
| PEP 695 generic syntax `def f[T]`, `type` statement | 3.12 | PEP 695 |
| `@override` | 3.12 | PEP 698 |
| PEP 649 deferred annotation evaluation (takes effect automatically, no `from __future__ import annotations` needed) | 3.14 | PEP 649/749 |

> For the complete version-feature quick reference, see `naming-version-cheatsheet.md`.
