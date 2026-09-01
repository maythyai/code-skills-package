# Naming & Style

This chapter is primarily based on **PEP 8 -- Style Guide for Python Code** (https://peps.python.org/pep-0008/ , Status: Active, a living document that is continuously updated) and **PEP 257 -- Docstring Conventions** (https://peps.python.org/pep-0257/). Any item whose source is not specifically annotated is taken from the official body of these two PEPs.

**Table of contents** (this file exceeds 300 lines; use the table of contents to locate the section you need rather than reading the whole file each time):

- [1.1 Indentation](#11-indentation) (rules 1-3)
- [1.2 Line length](#12-line-length) (rules 4-7)
- [1.3 Blank lines](#13-blank-lines) (rules 8-11)
- [1.4 Source file encoding](#14-source-file-encoding) (rules 12-13)
- [1.5 Import conventions](#15-import-conventions) (rules 14-19)
- [1.6 Module-level dunder variables](#16-module-level-dunder-variables) (rule 20)
- [1.7 String quotes](#17-string-quotes) (rules 21-22)
- [1.8 Whitespace in expressions and statements](#18-whitespace-in-expressions-and-statements) (rules 23-32)
- [1.9 Trailing commas](#19-trailing-commas) (rules 33-34)
- [1.10 Comments](#110-comments) (rules 35-38)
- [1.11 Docstrings](#111-docstrings) (rules 39-46)
- [1.12 Naming conventions](#112-naming-conventions) (rules 47-61)
- [1.13 Formatting rules for function annotations and variable annotations](#113-formatting-rules-for-function-annotations-and-variable-annotations) (rules 62-63)
- [1.14 Designing for inheritance and public/internal interfaces](#114-designing-for-inheritance-and-publicinternal-interfaces-audit-supplement) (rules 64-66, audit supplement)

### 1.1 Indentation

1.  **MUST** Use 4 spaces per indentation level. Tabs are prohibited, and mixing spaces and tabs is prohibited.
    > Original: *"Use 4 spaces per indentation level."* *"Spaces are the preferred indentation method."* *"Python disallows mixing tabs and spaces for indentation."*
    > Source: PEP 8 § Indentation

2.  **MUST** Continuation lines (code lines after a line break) must use one of the following two approaches to ensure readability:
    - Align vertically with the first element inside the opening bracket (parentheses/brackets/braces) (implicit line joining);
    - Use a hanging indent: the first line carries no arguments, and the remaining lines are indented one additional level relative to the first line so they can be distinguished from the subsequent logical code.

    Correct:
    ```python
    # Aligned with the opening bracket
    foo = long_function_name(var_one, var_two,
                              var_three, var_four)

    # Hanging indent: the function definition body is indented one additional level to separate parameters from the function body
    def long_function_name(
            var_one, var_two, var_three,
            var_four):
        print(var_one)

    # Hanging indent: the caller needs no extra indentation level, but still must be distinguishable from the first line
    foo = long_function_name(
        var_one, var_two,
        var_three, var_four)
    ```
    Incorrect:
    ```python
    # The first argument on the continuation line is not aligned with the opening bracket
    foo = long_function_name(var_one, var_two,
        var_three, var_four)

    # The hanging indent has the same indentation as the function body, so parameters and function body cannot be distinguished
    def long_function_name(
        var_one, var_two, var_three,
        var_four):
        print(var_one)
    ```
    > Source: PEP 8 § Indentation

3.  **SHOULD** When using a hanging indent for continuation lines, you may either align the closing bracket with the last line of content or with the first character of the defining line; just stay consistent within the team.
    > Source: PEP 8 § Indentation

### 1.2 Line length

4.  **MUST** Regular code lines are limited to **79 characters**; docstrings and comments are limited to **72 characters**. This is PEP 8's official requirement for the standard library.
    > Original: *"Limit all lines to a maximum of 79 characters."* *"For flowing long blocks of text with fewer structural restrictions (docstrings or comments), the line length should be limited to 72 characters."*
    > Source: PEP 8 § Maximum Line Length

5.  **SHOULD** Business application code may, by team consensus, be relaxed to a maximum of **99 characters** (docstrings/comments should still be kept at 72 characters); PEP 8 explicitly permits this exception. **Exceeding 99 characters is prohibited.** If the team uses a formatter such as Black/Ruff, its default is 88 characters (Black's community-practice value, not an official PEP 8 figure), which can serve as a compromise between 79 and 99; it must be explicitly declared in `pyproject.toml` — you must not leave it undeclared while arbitrarily using 100+.
    > Original: *"Some teams strongly prefer a longer line length. For code maintained exclusively or primarily by a team that can reach agreement on this issue, it is okay to increase the line length limit up to 99 characters, provided that comments and docstrings are still wrapped at 72 characters."*
    > Source: PEP 8 § Maximum Line Length (79/99 are official figures); 88 characters is the Black tool default (basis: community practice, not PEP 8 original text)

6.  **SHOULD** Prefer implicit line continuation inside parentheses over backslash `\` continuation.
    > Original: *"The preferred way of wrapping long lines is by using Python's implied line continuation inside parentheses, brackets and braces... These should be used in preference to using a backslash for line continuation."*
    > Source: PEP 8 § Maximum Line Length

7.  **SHOULD** In new code, prefer breaking before a binary operator to breaking after it (Knuth style), so the operator stays at the start of the line with its operands and operators are not scattered across different columns. Stay consistent within a given block of code.
    Correct:
    ```python
    income = (gross_wages
              + taxable_interest
              + (dividends - qualified_dividends)
              - ira_deduction
              - student_loan_interest)
    ```
    > Original: *"For new code Knuth's style is suggested."*
    > Source: PEP 8 § Should a Line Break Before or After a Binary Operator?

### 1.3 Blank lines

8.  **MUST** Surround top-level function and class definitions with **2** blank lines.
9.  **MUST** Surround method definitions inside a class with **1** blank line.
10. **SHOULD** Use blank lines inside functions, sparingly, to separate logical sections.
11. **SHOULD** A group of related single-line implementations (such as a batch of dummy implementations) may omit blank lines between them.

    > Original: *"Surround top-level function and class definitions with two blank lines."* *"Method definitions inside a class are surrounded by a single blank line."* *"Use blank lines in functions, sparingly, to indicate logical sections."*
    > Source: PEP 8 § Blank Lines

### 1.4 Source file encoding

12. **MUST** Source files must use UTF-8 encoding. Code in the core distribution should no longer add a `# -*- coding: utf-8 -*-` declaration (because UTF-8 is the default in Python 3); an explicit declaration is only needed in the extreme case where the code must be compatible with a non-UTF-8 environment.
    > Original: *"Code in the core Python distribution should always use UTF-8, and should not have an encoding declaration."*
    > Source: PEP 8 § Source File Encoding

13. **MUST** All identifiers (variable names, function names, class names, etc.) must use only ASCII characters and should use English words wherever feasible.
    > Original: *"All identifiers in the Python standard library MUST use ASCII-only identifiers, and SHOULD use English words wherever feasible."*
    > Source: PEP 8 § Source File Encoding

### 1.5 Import conventions

14. **MUST** Each `import` must be on its own line (the `from module import a, b, c` form, which introduces multiple names on a single line, is the exception).
    Correct:
    ```python
    import os
    import sys

    from subprocess import Popen, PIPE
    ```
    Incorrect:
    ```python
    import os, sys
    ```
    > Source: PEP 8 § Imports

15. **MUST** `import` statements must be placed at the top of the file, after the module comment and docstring and before module-level global variables and constants (`from __future__ import ...` is the exception; it must come before all other statements).
    > Source: PEP 8 § Imports、§ Module Level Dunder Names

16. **MUST** The import group order is: ① standard library ② third-party libraries ③ local application/library code, with a single blank line separating the groups.
    Correct:
    ```python
    import os
    import sys

    import numpy
    from bs4 import BeautifulSoup

    from app.roi.jobs import sqljob
    from app.roi.resources import odps
    ```
    > Source: PEP 8 § Imports

17. **MUST** Wildcard imports of the form `from module import *` are prohibited. **Audit note**: The PEP 8 original text uses the wording "should be avoided", and immediately gives one exception: "There is one defensible use case for a wildcard import, which is to republish an internal interface as part of a public API" (republishing an internal interface as part of a public API). This convention proactively upgrades the official "should be avoided" to an organizational "MUST prohibition" and does not adopt that exception (because scenarios that republish internal interfaces are extremely rare in the business code covered by this convention, and even when they do occur they should be implemented via an explicit `__all__` or explicit `import` rather than a wildcard). This is a stricter organizational constraint layered on top of PEP 8, not the mandatory force of PEP 8 itself.
    > Original: *"Wildcard imports (`from <module> import *`) should be avoided, as they make it unclear which names are present in the namespace, confusing both readers and many automated tools. There is one defensible use case for a wildcard import, which is to republish an internal interface as part of a public API."*
    > Source: PEP 8 § Imports

18. **SHOULD** Prefer absolute imports; only when the package layout is complex and absolute imports would become verbose should you use explicit relative imports (e.g. `from .foo import bar`), and implicit relative imports are prohibited (that issue only existed in the unmaintained Python 2; in Python 3 implicit relative imports are forbidden at the language level).
    > Original: *"Absolute imports are recommended... However, explicit relative imports are an acceptable alternative to absolute imports, especially when dealing with complex package layouts..."*
    > Source: PEP 8 § Imports

19. **SHOULD** Do not import too many names directly via `from x import` on a single line (no more than 3 is recommended); when there are more, import the module/package itself and access attributes through it, to avoid the redundancy caused by leaving unused directly-imported symbols in place and to make it easier to trace where a symbol comes from.
    Correct:
    ```python
    from campaign.resources import odps
    odps.CampaignLabelTable
    odps.CampaignEventTable
    ```
    > Source: Community practice (PEP 8 sets no limit on the number of direct imports)

### 1.6 Module-level dunder variables

20. **MUST** Module-level dunder variables (such as `__all__`, `__version__`, `__author__`) must be placed after the module docstring and before the import statements.
    Correct:
    ```python
    """This is the example module.

    This module does stuff.
    """

    from __future__ import annotations

    __all__ = ['a', 'b', 'c']
    __version__ = '0.1'
    __author__ = 'Cardinal Biggles'

    import os
    import sys
    ```
    > Source: PEP 8 § Module Level Dunder Names

### 1.7 String quotes

21. **SHOULD** PEP 8 does **not** mandate single or double quotes; it only requires consistency within a project. This convention recommends defaulting to single quotes, and using the other quote character when the string contains that quote character, to avoid escaping.
    Correct:
    ```python
    message = 'The parameter "a" is required'
    ```
    Incorrect:
    ```python
    message = 'The parameter \'a\' is required'
    ```
    > Original: *"In Python, single-quoted strings and double-quoted strings are the same. This PEP does not make a recommendation for this. Pick a rule and stick to it."*
    > Source: PEP 8 § String Quotes

22. **MUST** Triple-quoted strings (docstrings) must use three double quotes `"""`, consistent with the PEP 257 docstring convention.
    > Original: *"For triple-quoted strings, always use double quote characters to be consistent with the docstring convention in PEP 257."*
    > Source: PEP 8 § String Quotes

### 1.8 Whitespace in expressions and statements

23. **MUST** Immediately inside parentheses/brackets/braces, no spaces are allowed.
    Correct: `spam(ham[1], {eggs: 2})`　Incorrect: `spam( ham[ 1 ], { eggs: 2 } )`

24. **MUST** No space **before** a comma, semicolon, or colon; one space **after** (the colon in slices is an exception, see the next rule).
    Correct: `if x == 4: print(x, y); x, y = y, x`

25. **MUST** Treat the colon in a slice expression as a binary operator, with equal whitespace on both sides (lowest precedence); when a slice argument is omitted, the corresponding side's space must also be omitted.
    Correct:
    ```python
    ham[1:9], ham[1:9:3], ham[:9:3], ham[1::3], ham[1:9:]
    ham[lower+offset : upper+offset]
    ham[lower : upper], ham[lower : upper :], ham[lower :: step]
    ham[lower+offset : upper+offset : step]
    ```
    > Source: PEP 8 § Whitespace in Expressions and Statements

26. **MUST** When declaring a single-element tuple, no space after the comma.
    Correct: `foo = (0,)`　Incorrect: `bar = (0, )`

27. **MUST** No space before the parentheses of a function call or the brackets of an index/slice.
    Correct: `spam(1)`、`dct['key'] = lst[index]`　Incorrect: `spam (1)`、`dct ['key']`

28. **MUST** Do not use multiple spaces to align an assignment operator or other operator with another line.

29. **MUST** For keyword arguments or default values of parameters **without type annotations**, no spaces around `=`; but when a parameter **also has a type annotation**, there must be one space on each side of `=`.
    Correct:
    ```python
    def complex(real, imag=0.0):
        return magic(r=real, i=imag)

    def munge(sep: AnyStr = None): ...
    def munge(input: AnyStr, sep: AnyStr = None, limit=1000): ...
    ```
    Incorrect:
    ```python
    def complex(real, imag = 0.0):
        return magic(r = real, i = imag)
    ```
    > Source: PEP 8 § Whitespace in Expressions and Statements (this is the officially updated rule after the introduction of function annotations; earlier versions did not distinguish whether annotations were present)

30. **MUST** In function annotations, the colon follows the general rule (no space before, one space after), and the arrow `->` has one space on each side.
    Correct: `def munge(input: AnyStr): ...`　`def munge() -> PosInt: ...`

31. **MUST** One space before and after each of the following binary operators: assignment `=`, augmented assignment `+= -=` etc., comparison operators `== < > != <= >= in not in is is not`, boolean operators `and or not`.
32. **MAY** When mixing operators of different precedence, you may omit spaces around the highest-precedence operator to highlight the grouping, but stay consistent within the team.
    Correct: `x = x*2 - 1`、`hypot2 = x*x + y*y`、`c = (a+b) * (a-b)`
    > Source: PEP 8 § Whitespace in Expressions and Statements

### 1.9 Trailing commas

33. **MUST** A single-element tuple must include the comma, and parentheses are recommended to improve readability.
    Correct: `FILES = ('setup.cfg',)`

34. **SHOULD** When a multi-line list/argument/import is expected to grow over time, put each element on its own line and add a trailing comma, with the closing bracket on its own line; but when the closing bracket is on the same line as the last element, no trailing comma should be added.
    Correct:
    ```python
    FILES = [
        'setup.cfg',
        'tox.ini',
        ]
    ```
    Incorrect: `FILES = ['setup.cfg', 'tox.ini',]`
    > Source: PEP 8 § When to Use Trailing Commas

### 1.10 Comments

35. **MUST** A block comment starts with `#` plus one space and is indented to the same level as the code it describes; paragraphs within a block comment are separated by a line containing only a single `#`.
36. **MUST** An inline comment is separated from the code statement by at least two spaces and starts with `#` plus one space; inline comments should be used sparingly, and must not state the obvious (e.g. `x = x + 1  # increment x`); use them only to convey necessary information beyond the code (e.g. `x = x + 1  # compensate for boundary error`).
37. **SHOULD** Comments should be complete sentences, capitalized at the start (unless they begin with a lowercase identifier), and end with a single period (which may be omitted if very short); when modifying code, related comments must be updated in sync — a comment that contradicts the code is worse than no comment.
38. **SHOULD** For code aimed at international teams or open-source scenarios, English comments are recommended; for purely internal collaboration within a Chinese-speaking team, Chinese comments may be used, but the language should be consistent within a single file and Chinese and English should not be arbitrarily mixed within the same comment paragraph.
    > Original: *"Comments that contradict the code are worse than no comments."* *"Python coders from non-English speaking countries: please write your comments in English, unless you are 120% sure that the code will never be read by people who don't speak your language."*
    > Source: PEP 8 § Comments

### 1.11 Docstrings

39. **MUST** All public modules, functions, classes, and methods must have docstrings; non-public methods are not required to have a docstring, but a comment describing its function should be written on the line after `def`. **Audit note**: PEP 257's wording is "should normally have"; this convention proactively upgrades it to an organizational "MUST". The practice of "writing a comment on the line after `def` for non-public methods" actually comes from **PEP 8** (not PEP 257); both sources are noted here so readers do not mistakenly think this detail is also PEP 257 original text.
    > Original (PEP 257): *"All modules should normally have docstrings, and all functions and classes exported by a module should also have docstrings. Public methods (including the `__init__` constructor) should also have docstrings."*
    > Source: PEP 257 § What is a Docstring?
    >
    > Original (PEP 8, the comment requirement for non-public methods): *"Docstrings are not necessary for non-public methods, but you should have a comment that describes what the method does. This comment should appear after the `def` line."*
    > Source: PEP 8 § Documentation Strings

40. **MUST** Docstrings uniformly use triple double quotes `"""..."""`; if the string contains a backslash, use `r"""..."""`.
    > Source: PEP 257 § What is a Docstring?

41. **MUST** One-line docstrings: the opening and closing triple quotes are on the same line; no blank lines before or after the docstring; the content is an action phrase ending in a period ("Return...", "Do..."), not a descriptive phrase (do not write "Returns..."); the parameter signature should not be repeated (parameters are already available via introspection).
    Correct:
    ```python
    def kos_root():
        """Return the pathname of the KOS root directory."""
    ```
    > Source: PEP 257 § One-line Docstrings

42. **MUST** Multi-line docstrings: the first line is the summary line, followed by a blank line, then the detailed description; unless the entire docstring fits on one line, the closing `"""` should be on its own line.
    Correct:
    ```python
    def complex(real=0.0, imag=0.0):
        """Form a complex number.

        Keyword arguments:
        real -- the real part (default 0.0)
        imag -- the imaginary part (default 0.0)
        """
    ```
    > Source: PEP 257 § Multi-line Docstrings

43. **SHOULD** The class docstring should summarize its behavior and list public methods and instance variables; if the class primarily inherits from another class and the behavior is largely inherited, the differences should be described; use "override" to describe a subclass method that fully replaces the parent class method's behavior, and "extend" to describe one that calls the parent class method and then adds its own behavior. After the class docstring there should be one blank line before the first method begins.
    > Source: PEP 257 § Multi-line Docstrings (audit correction: PEP 257 has only four second-level sections — What is a Docstring? / One-line Docstrings / Multi-line Docstrings / Handling Docstring Indentation — and there is no independent "Class Docstrings" section; this content is in fact a passage about classes within the Multi-line Docstrings section. The previously annotated section name was incorrect and is corrected here.)

44. **SHOULD** Function/method docstrings should summarize their behavior and describe the parameters, return value, side effects, exceptions raised, and calling constraints; each parameter should be listed on its own line, and Emacs-style all-uppercase parameter names are prohibited.
    > Source: PEP 257 § Multi-line Docstrings (audit correction: there is no independent "Function and Method Docstrings"/"What About Argument Documentation?" section; this content is in fact a passage within the Multi-line Docstrings section. The previously annotated section name was incorrect and is corrected here.)

45. **MAY** A module docstring should list the classes/exceptions/functions the module exports along with a one-sentence summary; a package's (i.e. `__init__.py`'s) docstring should list the modules and subpackages the package exports. A script's (a standalone executable program's) docstring should be usable directly as its `--help`/usage output.
    > Source: PEP 257 § Multi-line Docstrings (audit correction: there is no independent "Module Docstrings"/"Script Docstrings" section; this content is in fact a passage within the Multi-line Docstrings section. The previously annotated section name was incorrect and is corrected here.)

46. **MAY** PEP 257 itself does not mandate a unified format for the detailed section structure (the specific layout of Args/Returns/Raises etc.); the common Google Style / NumPy Style / reStructuredText styles are all acceptable; just pick one and stay consistent within the team, and it is recommended to choose it in conjunction with a documentation generator such as Sphinx.
    > Basis: Community practice (PEP 257 only specifies the skeleton rules — summary line / blank line / closing quotes — and does not specify section layout details)

### 1.12 Naming conventions

47. **MUST** Never use the lowercase letter `l` (el), the uppercase letter `O` (oh), or the uppercase letter `I` (eye) as single-character variable names, because in some fonts they are indistinguishable from the digits 1 and 0.
    > Original: *"Never use the characters 'l' (lowercase letter el), 'O' (uppercase letter oh), or 'I' (uppercase letter eye) as single character variable names."*
    > Source: PEP 8 § Names to Avoid

48. **MUST** Module and package names use short, all-lowercase names; underscores may be used in module names to improve readability; underscores are discouraged in package names.
    > Original: *"Modules should have short, all-lowercase names. Underscores can be used in the module name if it improves readability. Python packages should also have short, all-lowercase names, although the use of underscores is discouraged."*
    > Source: PEP 8 § Package and Module Names

49. **MUST** Class names use the `CapWords` (UpperCamelCase/PascalCase) style; abbreviations are all uppercase (e.g. `HTTPServerError` is preferable to `HttpServerError`). If a class's interface is primarily documented and used as a callable, the function naming style is permitted instead.
    > Source: PEP 8 § Class Names

50. **MUST** Exception classes follow the same naming rules as classes (CapWords), and end with `Error` when the semantics are indeed an error.
    > Original: *"Because exceptions should be classes, the class naming convention applies here. However, you should use the suffix 'Error' on your exception names (if the exception actually is an error)."*
    > Source: PEP 8 § Exception Names

51. **MUST** Function and variable names use the all-lowercase, underscore-separated style (`lower_case_with_underscores`); `mixedCase` is only allowed in legacy code that already uses that style (such as the `threading` module) for backward compatibility, and should not be adopted in new code.
    > Source: PEP 8 § Function and Variable Names

52. **MUST** Constants are defined at the module level, in all uppercase with underscores (e.g. `MAX_OVERFLOW`、`TOTAL`).
    > Source: PEP 8 § Constants

53. **MUST** The first parameter of an instance method is named `self`; the first parameter of a class method (`@classmethod`) is named `cls`.
    > Original: *"Always use `self` for the first argument to instance methods."* *"Always use `cls` for the first argument to class methods."*
    > Source: PEP 8 § Function and Method Arguments

54. **MUST** If a parameter name conflicts with a reserved keyword, prefer appending a single trailing underscore (e.g. `class_`) over abbreviating or respelling (e.g. `clss`).
    > Source: PEP 8 § Function and Method Arguments

55. **SHOULD** A single leading underscore (`_single_leading_underscore`) denotes weak-private convention: `from module import *` does not import names beginning with an underscore.
56. **SHOULD** A single trailing underscore (`single_trailing_underscore_`) is used to avoid conflicts with Python keywords (e.g. `class_`).
57. **SHOULD** A double leading underscore (`__double_leading_underscore`) as a class attribute triggers name mangling: `__boo` in class `FooBar` is rewritten as `_FooBar__boo`, used to avoid accidental attribute-name collisions in subclasses.
58. **MUST** A double leading and trailing underscore (`__double_leading_and_trailing_underscore__`) is reserved for "magic" attributes defined by the Python interpreter (e.g. `__init__`, `__file__`); **inventing such names yourself is prohibited**.
    > Source: PEP 8 § Descriptive: Naming Styles

59. **SHOULD** Type variables (`TypeVar`) introduced by PEP 484 use short `CapWords` names (e.g. `T`, `AnyStr`, `Num`); type variables denoting covariance/contravariance get a `_co`/`_contra` suffix.
    Correct:
    ```python
    from typing import TypeVar
    VT_co = TypeVar('VT_co', covariant=True)
    KT_contra = TypeVar('KT_contra', contravariant=True)
    ```
    > Source: PEP 8 § Type Variable Names (see `type-annotations.md` for the PEP 695 new-syntax replacement for this scenario)

60. **SHOULD** Global variables follow essentially the same naming rules as functions; if a module is designed for use via `from module import *`, the export scope should be explicitly controlled through `__all__`, or a leading underscore should be used to prevent unwanted globals from being wildcard-imported.
    > Source: PEP 8 § Global Variable Names

61. **MUST** Method names and instance variables follow the function naming rules; use a single leading underscore to indicate a non-public method/instance variable; to avoid naming conflicts with subclasses, use two leading underscores to trigger name mangling.
    > Source: PEP 8 § Method Names and Instance Variables

### 1.13 Formatting rules for function annotations and variable annotations

62. **MUST** Since PEP 484 was officially accepted, function annotations must use PEP 484 syntax; the "annotation style experiments" encouraged by earlier PEP 8 versions are no longer encouraged. The standard library remains conservative about introducing type annotations, but third-party libraries and business code are officially encouraged to actively experiment with type annotations.
    > Original: *"With the acceptance of PEP 484, the style rules for function annotations have changed... Function annotations should use PEP 484 syntax... outside the stdlib, experiments within the rules of PEP 484 are now encouraged."*
    > Source: PEP 8 § Function Annotations

63. **MUST** Variable annotation (PEP 526) formatting rules: no space before the colon, one space after the colon; if there is an assignment, one space on each side of the equals sign.
    Correct:
    ```python
    code: int
    count: int = 0
    ```
    > Source: PEP 8 § Variable Annotations

### 1.14 Designing for inheritance and public/internal interfaces (audit supplement)

> The first edition omitted the PEP 8 § Designing for Inheritance and § Public and Internal Interfaces sections; they are supplemented below after being found during audit.

64. **SHOULD** When deciding whether an attribute/method should be public or non-public, if in doubt prefer non-public (with a single leading underscore); because making a non-public interface public later is far easier than retracting an already-public interface — once a public interface is released, callers may already depend on it, and retracting it would be a breaking change.
    > Original: *"If in doubt, choose non-public; it's easier to make it public later than to make a public attribute non-public."*
    > Source: PEP 8 § Designing for Inheritance

65. **SHOULD** Public attribute names should not carry a leading underscore; if a public attribute name happens to conflict with a reserved keyword, follow the existing rule in rule 29 (append a trailing underscore). The design of a class's public interface should consider the "contract for subclasses" perspective, making clear which attributes/methods are designed to be safely overridden or extended by subclasses.
    > Source: PEP 8 § Designing for Inheritance

66. **SHOULD** When a module is designed for use via `from module import *`, the public interface must be explicitly declared via `__all__`; names not listed in `__all__`, even without a leading underscore, should be treated as implementation details and do not constitute a stable interface promised to the outside; callers should not depend on their existence or unchanged behavior.
    > Original (consistent wording in PEP 8 § Public and Internal Interfaces and § Global Variable Names): *"Modules that are designed for use via `from M import *` should use the `__all__` mechanism to prevent exporting globals, or use the older convention of prefixing such globals with an underscore."*
    > Source: PEP 8 § Public and Internal Interfaces、§ Global Variable Names

(For the specific syntax choices of type annotations, generic notation, `Protocol`/`TypedDict` etc., see `type-annotations.md`)
