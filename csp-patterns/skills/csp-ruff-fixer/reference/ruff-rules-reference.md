# Ruff Rules Quick Reference

Concise lookup for commonly encountered Ruff rules. Each entry shows the rule, what it flags, and a typical fix.

## E -- pycodestyle Errors

| Rule | Description | Fix |
|------|-------------|-----|
| E402 | Module import not at top of file | Move imports above executable statements |
| E501 | Line too long (>configured limit) | Break line or restructure expression |
| E711 | Comparison to `None` with `==` | Use `is None` / `is not None` |
| E712 | Comparison to `True`/`False` with `==` | Use `if x:` or `if not x:` |
| E721 | Type comparison with `type()` | Use `isinstance(x, T)` |
| E731 | Lambda assigned to variable | Replace with `def` |
| E741 | Ambiguous variable name (`l`, `O`, `I`) | Rename to a clear identifier |

## F -- Pyflakes

| Rule | Description | Fix |
|------|-------------|-----|
| F401 | Unused import | Remove the import, or add to `__all__` if re-exported |
| F403 | Star import (`from x import *`) | Replace with explicit named imports |
| F405 | Name possibly from star import | Add explicit import for the name |
| F541 | f-string without placeholders | Use a plain string instead |
| F632 | Identity comparison with `is` for literals | Use `==` for value comparison |
| F811 | Redefinition of unused name | Remove the duplicate or rename |
| F821 | Undefined name | Add the missing import or define the name |
| F841 | Local variable assigned but never used | Remove the variable or use it |

## I -- isort

| Rule | Description | Fix |
|------|-------------|-----|
| I001 | Import block not sorted | `ruff check --fix` reorders automatically |
| I002 | Missing required import | Add the required import at top |

## N -- pep8-naming

| Rule | Description | Fix |
|------|-------------|-----|
| N801 | Class name not CamelCase | Rename to `PascalCase` |
| N802 | Function name not snake_case | Rename to `lower_snake_case` |
| N803 | Argument name not snake_case | Rename parameter |
| N806 | Variable in function not snake_case | Rename variable |
| N812 | Lowercase imported as non-lowercase | Use `import module` or alias correctly |

## W -- pycodestyle Warnings

| Rule | Description | Fix |
|------|-------------|-----|
| W291 | Trailing whitespace | Remove trailing spaces |
| W292 | No newline at end of file | Add final newline |
| W605 | Invalid escape sequence in string | Use raw string `r"..."` or escape properly |

## UP -- pyupgrade

| Rule | Description | Fix |
|------|-------------|-----|
| UP006 | `List[X]` instead of `list[X]` (3.9+) | Replace with built-in generic |
| UP007 | `Optional[X]` / `Union[X, Y]` | Use `X \| None` / `X \| Y` (3.10+) |
| UP008 | `super(MyClass, self).method()` | Simplify to `super().method()` |
| UP015 | Redundant `open()` mode `"r"` | Remove the explicit `"r"` argument |
| UP028 | `yield from` replaces manual loop | Replace `for x in iter: yield x` with `yield from iter` |
| UP032 | f-string preferred over `.format()` | Convert `"{}".format(x)` to `f"{x}"` |
| UP035 | Deprecated import path | Use the modern import location |

## B -- flake8-bugbear

| Rule | Description | Fix |
|------|-------------|-----|
| B001 | `except:` catches everything including KeyboardInterrupt | Use `except Exception:` |
| B006 | Mutable default argument (`def f(x=[])`) | Use `None` default, initialize inside |
| B007 | Loop variable not used in body | Rename to `_` or use the variable |
| B008 | Function call in default argument | Move to `None` default, call inside |
| B009 | `getattr(obj, "attr")` with constant string | Replace with `obj.attr` |
| B010 | `setattr(obj, "attr", val)` with constant string | Replace with `obj.attr = val` |
| B017 | `assertRaises(Exception)` too broad | Catch a specific exception class |
| B023 | Lambda in loop captures loop variable | Bind with default arg: `lambda x=x: x` |
| B026 | Star-arg unpacking after keyword argument | Move positional star-arg before keywords |

## A -- flake8-builtins

| Rule | Description | Fix |
|------|-------------|-----|
| A001 | Variable shadows a Python builtin | Rename (e.g., `list` -> `items`) |
| A002 | Argument shadows a Python builtin | Rename parameter |
| A003 | Class attribute shadows a builtin | Rename attribute |

## C4 -- flake8-comprehensions

| Rule | Description | Fix |
|------|-------------|-----|
| C400 | `list(generator)` | Use `[x for x in ...]` |
| C401 | `set(generator)` | Use `{x for x in ...}` |
| C402 | `dict((k, v) for ...)` | Use `{k: v for ...}` |
| C403 | `set([x for x in ...])` | Remove outer `set()`, use set comprehension |
| C404 | `dict([(k, v) for ...])` | Use dict comprehension directly |
| C416 | `[x for x in iterable]` (unnecessary comprehension) | Use `list(iterable)` |

## SIM -- flake8-simplify

| Rule | Description | Fix |
|------|-------------|-----|
| SIM101 | Duplicate `isinstance` calls | Combine: `isinstance(x, (A, B))` |
| SIM102 | Nested `if` blocks | Merge: `if a and b:` |
| SIM103 | `if cond: return True else: return False` | `return cond` |
| SIM105 | try/except/pass then try/except/raise | Use `contextlib.suppress()` |
| SIM108 | Ternary replacement for if/else assignment | `x = a if cond else b` |
| SIM114 | Multiple `if` bodies with same result | Combine conditions with `or` |
| SIM117 | Nested `with` statements | Use single `with` with multiple contexts |
| SIM118 | `key in dict.keys()` | Use `key in dict` |
| SIM210 | `True if cond else False` | Just `bool(cond)` or `cond` |

## ARG -- flake8-unused-arguments

| Rule | Description | Fix |
|------|-------------|-----|
| ARG001 | Unused function argument | Remove if safe, prefix with `_` if required by interface |
| ARG002 | Unused method argument | Prefix with `_`; check if overriding parent signature |
| ARG004 | Unused static method argument | Remove or prefix with `_` |

## D -- pydocstyle (often excluded)

| Rule | Description | Fix |
|------|-------------|-----|
| D100 | Missing docstring in public module | Add module docstring |
| D101 | Missing docstring in public class | Add class docstring |
| D102 | Missing docstring in public method | Add method docstring |
| D103 | Missing docstring in public function | Add function docstring |
| D205 | Blank line required between summary and description | Insert blank line after first line |
| D401 | First line should be imperative | Rewrite: "Returns..." -> "Return..." |

## TCH -- flake8-type-checking

| Rule | Description | Fix |
|------|-------------|-----|
| TCH001 | First-party import only used in annotations | Move inside `if TYPE_CHECKING:` |
| TCH002 | Third-party import only used in annotations | Move inside `if TYPE_CHECKING:` |
| TCH004 | Import used at runtime inside `TYPE_CHECKING` | Move outside the guard |

## RUF -- Ruff-Specific

| Rule | Description | Fix |
|------|-------------|-----|
| RUF001 | Ambiguous unicode character in string | Replace with ASCII equivalent |
| RUF005 | Collection concatenation with `+` | Use `[*a, *b]` or `itertools.chain` |
| RUF012 | Mutable class attributes not annotated | Add `ClassVar[]` annotation |
| RUF015 | `list(iterable)[0]` instead of `next(iter(iterable))` | Use `next()` |
| RUF100 | Unused `# noqa` directive | Remove the unnecessary noqa comment |

## TD -- flake8-todos

| Rule | Description | Fix |
|------|-------------|-----|
| TD001 | Invalid TODO tag (e.g., `TODO -`) | Use `TODO(author):` format |
| TD002 | Missing author in TODO | Add author: `TODO(name):` |
| TD003 | Missing issue link in TODO | Add link or configure to ignore |

## Quick Command Cheatsheet

```bash
# Check whole project with pyproject.toml config
ruff check

# Check specific folder
ruff check src/models

# Select only specific rules
ruff check --select F,E,I,UP

# Extend ignore without replacing config
ruff check --extend-ignore D,TD

# Safe autofix
ruff check --fix

# Unsafe autofix (review diffs carefully)
ruff check --fix --unsafe-fixes

# Format after every fix pass
ruff format

# Check with output for CI
ruff check --output-format=github
```
