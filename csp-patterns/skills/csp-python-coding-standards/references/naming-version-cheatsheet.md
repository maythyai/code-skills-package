# Naming and Version Cheatsheet

## I. Naming Style Cheatsheet

| Scenario | Style | Example |
|---|---|---|
| Module / file name | All lowercase, underscores allowed | `user_service.py` |
| Package name | All lowercase, underscores discouraged | `campaign`, `odps` |
| Class name / exception class name | CapWords (UpperCamelCase) | `UserService`, `ParameterError` |
| Function name / method name | All lowercase + underscores | `get_user_info()` |
| Variable name / parameter name | All lowercase + underscores | `user_id`, `total_count` |
| Constant | All uppercase + underscores | `MAX_STOCK_COUNT` |
| First parameter of instance method | Fixed as `self` | `def method(self, ...):` |
| First parameter of class method | Fixed as `cls` | `@classmethod def create(cls, ...):` |
| Type variable (TypeVar / PEP 695 type parameter) | Short CapWords | `T`, `AnyStr`, `T_co` (covariant, append `_co`), `T_contra` (contravariant, append `_contra`) |
| Weak private (intended not to be accessed externally within the module) | Single leading underscore | `_internal_helper` |
| Avoiding keyword conflicts | Single trailing underscore | `class_`, `type_` |
| Triggering name mangling (avoiding subclass attribute conflicts) | Double leading underscore | `__internal_state` |
| Python-reserved "magic" names (creating your own is prohibited) | Double leading + double trailing underscore | `__init__`, `__file__` |
| Single-character variable prohibition list | `l` (el), `O` (oh), `I` (eye) are prohibited | Use `L` instead of `l` |

> Source: PEP 8 § Naming Conventions (see `naming-style.md` Section 12 for details)

## II. Python Version Release Cadence Cheatsheet

Per PEP 602 (https://peps.python.org/pep-0602/), Python has released one new feature version each October since 3.9; starting from 3.13, each version has 2 years of "full support" (bugfix) + 3 years of "security-fix only", for a total lifecycle of 5 years (3.9–3.12 have 1.5 years of full support + 3.5 years of security fixes, totaling 5 years as well).

| Version | Release date | Full support ends | Security fix end (EOL) |
|---|---|---|---|
| 3.10 | 2021-10-04 | 2023-04 | 2026-10 |
| 3.11 | 2022-10-24 | 2024-04 | 2027-10 |
| 3.12 | 2023-10-02 | 2025-04 | 2028-10 |
| 3.13 | 2024-10-07 | 2026-10 | 2029-10 |
| 3.14 | 2025-10-07 (as of 2026-08-04 when this document was written, this is the current latest stable version; Python 3.15 is expected to be released in 2026-10, at which point this row will need to be updated) | 2027-10 | 2030-10 |

> For recommendations on choosing `requires-python` for new projects, see `project-structure-deps.md` Section 16. EOL dates are calculated based on the official support cycle rules of PEP 602; the authoritative support status is subject to the official Python table published at https://devguide.python.org/versions/.

## III. Language Feature Version Cheatsheet (New Feature Availability Overview)

| Feature | Minimum version | PEP / official source | Related section in this standard |
|---|---|---|---|
| Walrus operator `:=` | 3.8 | PEP 572 | `07` Section 7.3 |
| `X \| Y` union type shorthand | 3.10 | PEP 604 | `02` Section 2.2 |
| `match` / `case` structural pattern matching | 3.10 | PEP 634/635/636 | `07` Section 7.1 |
| Parenthesized multi-line `with` | 3.10 | docs.python.org/3/whatsnew/3.10.html | `07` Section 7.2 |
| `dataclass(slots=True)` | 3.10 | docs.python.org/3/library/dataclasses.html | `07` Section 7.5 |
| `except*` / `ExceptionGroup` | 3.11 | PEP 654 | `04` Section 4.3 |
| `Self` type | 3.11 | PEP 673 | `02` Section 2.5 |
| `TypeVarTuple` / `*Ts` | 3.11 | PEP 646 | `02` Section 2.7 |
| `tomllib` (standard library TOML parser) | 3.11 | PEP 680 | `08` |
| PEP 695 generic syntax `def f[T]()` / `class C[T]:` | 3.12 | PEP 695 | `02` Section 2.3 |
| `type` statement (type alias) | 3.12 | PEP 695 | `02` Section 2.3 |
| `@typing.override` | 3.12 | PEP 698 | `02` Section 2.6 |
| PEP 701 f-string syntax relaxation | 3.12 | PEP 701 | `03` Section 3.14, `07` Section 7.4 |
| Free-threaded / no-GIL build (experimental) | 3.13 | PEP 703 | `07` Section 7.8 |
| Free-threaded official support | 3.14 | PEP 779 | `07` Section 7.8 |
| PEP 649 deferred annotation evaluation (takes effect automatically, no need for `from __future__ import annotations`) | 3.14 | PEP 649 / PEP 749 | `02` |
| PEP 750 template strings t-string | 3.14 | PEP 750 | Cutting-edge feature, not yet included in MUST/SHOULD rules; teams may evaluate and pilot on their own |

> This table only covers features referenced in the body of this standard; for more per-version changes, consult the official "What's New in Python" series of documents (docs.python.org/3/whatsnew/).
