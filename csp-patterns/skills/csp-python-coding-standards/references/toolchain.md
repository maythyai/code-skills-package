# Toolchain Guidelines

This chapter covers the selection of tools such as lint, formatting, type checking, and pre-commit hooks. **The basis for all items in this chapter is "community practice,"** not mandates from official Python PEPs or stdlib documentation — Python officially has never specified in any PEP that a particular third-party lint/format/type-checking tool must be used. The tools listed in this chapter are all current de facto standards in the Python ecosystem. Each tool's positioning description is quoted from the tool's own official documentation and is not equivalent in force to the official guidelines such as PEP 8/PEP 257 mentioned earlier.

### 9.1 Code Inspection and Formatting: Ruff

1.  **SHOULD** New projects should prefer **Ruff** as the unified lint + formatting tool. Ruff officially positions itself as "an extremely fast Python linter and code formatter, written in Rust," and claims to be able to replace Flake8 (plus dozens of plugins), isort, pydocstyle, pyupgrade, autoflake, and Black's formatting capability, executing tens to hundreds of times faster than using each of these standalone tools individually.
    > Original text: *"An extremely fast Python linter and code formatter, written in Rust."* *"Ruff can be used to replace Flake8 (plus dozens of plugins), Black, isort, pydocstyle, pyupgrade, autoflake, and more, all while executing tens or hundreds of times faster than any individual tool."*
    > Source: docs.astral.sh/ruff/ (Basis: community practice)

2.  **SHOULD** If you use both Ruff's lint and formatting features, Ruff's formatter default configuration is itself aligned with Black (default line length of 88, double quotes, space indentation, honoring the "magic trailing comma"), so you get Black-consistent formatting style without additional configuration.
    > Original text (Ruff default configuration comments): `line-length = 88  # Same as Black.`、`quote-style = "double"  # Like Black, use double quotes for strings.`
    > Source: docs.astral.sh/ruff/configuration/ (Basis: community practice)

3.  **MAY** For legacy projects already using a Flake8 + isort + Black combination where migration cost is high, you may continue using that combination. Ruff's officially stated "drop-in parity" provides a lower-cost migration path, but before migrating you should run a round of new-vs-old tool comparison in CI to confirm that the rule-set differences are within an acceptable range.

4.  **SHOULD** Explicitly declare line length, target Python version, and enabled/disabled rule sets in `pyproject.toml` via `[tool.ruff]`, `[tool.ruff.lint]`, and `[tool.ruff.format]`; using tool defaults that "implicitly take effect" without being reflected in the configuration file is prohibited, as this leads to inconsistent local behavior among team members.
    Positive example:
    ```toml
    [tool.ruff]
    line-length = 88
    target-version = "py310"

    [tool.ruff.lint]
    select = ["E", "F", "I", "UP", "B"]

    [tool.ruff.format]
    quote-style = "double"
    ```
    > Source: docs.astral.sh/ruff/configuration/ (Basis: community practice)

### 9.2 Code Formatting: Black (optional, choose one of Ruff or Black)

5.  **MAY** Projects that do not adopt Ruff's formatting capability, or whose teams already have a Black usage habit, may continue to use **Black**. Black officially calls itself "The Uncompromising Code Formatter" and explicitly states that users must cede control over the minutiae of hand-formatting in exchange for speed, determinism of formatting results, and freedom from the annoyance of lint tools repeatedly warning about formatting issues.
    > Original text: *"Black is the uncompromising Python code formatter. By using it, you agree to cede control over minutiae of hand-formatting. In return, Black gives you speed, determinism, and freedom from `pycodestyle` nagging about formatting."*
    > Source: github.com/psf/black (Basis: community practice)

6.  **MUST** If a team chooses Black, ad-hoc configuration of "partial-file exceptions" for values other than the default line length (88 characters) is prohibited; a team-uniform line length should be declared in `[tool.black]` in `pyproject.toml` (the default 88, or up to the maximum of 99 officially allowed by PEP 8 § Maximum Line Length, see item 5 of `naming-style.md`).
    > Original text of Black's official explanation for the value 88: *"Black defaults to 88 characters per line, which happens to be 10% over 80. This number was found to produce significantly shorter files than sticking with 80 (the most popular), or even 79 (used by the standard library)."* (Audit correction: the previous ellipsis mistakenly deleted the qualifier "(the most popular)"; it is now restored)
    > Source: black.readthedocs.io/en/stable/the_black_code_style/current_style.html (Basis: community practice)

7.  **SHOULD** Black officially calls itself "PEP 8 compliant," but at the same time explicitly states that it "does not implement every style rule covered by PEP 8." Therefore, you must not assume that "using Black is equivalent to strictly conforming to all items of this guideline's `naming-style.md`" (for example, Black does not check naming conventions, does not check docstring content, and does not check import grouping order — the latter requires pairing with isort or Ruff's `I` rule set).
    > Original text: *"Black is a PEP 8 compliant opinionated formatter with its own style."* *"The coding style used by Black follows PEP 8 in spirit and enforces a consistent subset of its formatting recommendations. It does not implement every style rule covered by PEP 8."*
    > Source: black.readthedocs.io/en/stable/the_black_code_style/index.html (Basis: community practice)

### 9.3 Static Type Checking: mypy / Pyright

8.  **MUST** Since this guideline's `type-annotations.md`). You may choose either **mypy** or **Pyright**; standardizing on one is not mandated, but consistency should be maintained within the same project, to avoid the situation where the two checkers' rule differences cause each to "pass on its own, but contradict each other when combined."

9.  **MAY** **mypy** officially calls itself "a static type checker for Python" and explicitly ties itself to the PEP 484 type-hint system — "With mypy, add type hints (PEP 484) to your Python programs, and mypy will warn you when you use those types incorrectly." It is suitable as a team default choice; a community survey (Meta/Microsoft/JetBrains 2024 Python Typing Survey, 1083 respondents) shows that mypy is currently the type checker with the highest adoption rate (67% of respondents use it), with Pyright second (38%; 24% use both).
    > Original text: *"Mypy is a static type checker for Python."* *"With mypy, add type hints (PEP 484) to your Python programs, and mypy will warn you when you use those types incorrectly."*
    > Source: mypy.readthedocs.io/en/stable/ (Basis: community practice)
    >
    > Original text (adoption survey): *"Mypy remains the most popular type checker, with 67% of respondents using it and 38% using Pyright (24% use both)."*
    > Source: engineering.fb.com/2024/12/09/developer-tools/typed-python-2024-survey-meta/ (Basis: community practice / third-party survey, not official Python data)

10. **MAY** **Pyright** is maintained by Microsoft and calls itself "a full-featured, standards-based static type checker for Python," designed for high performance and suitable for large codebases; the official VS Code Python extension Pylance is built on top of Pyright (the two are maintained by the same group of contributors; core type-checking capability belongs to Pyright, and language-service capability belongs to Pylance). If a team uniformly uses VS Code + Pylance as its development environment, choosing Pyright as the CI checker yields an experience where local editor errors and CI errors are fully consistent.
    > Original text: *"Pyright is a full-featured, standards-based static type checker for Python. It is designed for high performance and can be used with large Python source bases."* *"In general, core type checking functionality is associated with Pyright while language service functionality is associated with Pylance, but the same contributors monitor both repos."*
    > Source: github.com/microsoft/pyright (Basis: community practice)

11. **MUST** After integrating a type checker, you should raise the checking strictness as much as possible (e.g., mypy's `strict = true`, Pyright's `"typeCheckingMode": "strict"`). Legacy code may migrate gradually by enabling strict mode incrementally on a per-directory/per-module basis; remaining long-term in the state of "a tool is integrated but configured so loosely that it almost never reports errors," rendering type checking effectively useless, is prohibited.

### 9.4 Pre-commit Hooks: pre-commit

12. **SHOULD** Use the **pre-commit** framework to uniformly manage local pre-commit checks for tools such as Ruff/Black/mypy, ensuring that code is checked and formatted at the `git commit` stage, rather than waiting until the CI stage to discover problems and going back and forth wasting build resources. pre-commit is officially positioned as "a multi-language package manager for pre-commit hooks," responsible for managing the installation and execution of hooks written in any language, and is designed not to require root access.
    > Original text: *"It is a multi-language package manager for pre-commit hooks. You specify a list of hooks you want and pre-commit manages the installation and execution of any hook written in any language before every commit. pre-commit is specifically designed to not require root access."*
    > Source: pre-commit.com/ (Basis: community practice)

13. **SHOULD** Each hook in `.pre-commit-config.yaml` should pin a specific version number (`rev` field); using mutable branch references (e.g., `main`) is prohibited, to prevent hook behavior from changing without warning as upstream updates are released.
    Positive example:
    ```yaml
    repos:
    -   repo: https://github.com/astral-sh/ruff-pre-commit
        rev: v0.8.0
        hooks:
        -   id: ruff
            args: [--fix]
        -   id: ruff-format
    -   repo: https://github.com/pre-commit/pre-commit-hooks
        rev: v5.0.0
        hooks:
        -   id: check-yaml
        -   id: end-of-file-fixer
        -   id: trailing-whitespace
    ```
    > Basis: community practice (the example structure references the minimal example format from the official pre-commit Quick Start; the specific repository/version numbers must be filled in according to actual releases, see pre-commit.com)

14. **MUST** The CI pipeline must re-run checks equivalent to the local pre-commit hooks (e.g., via `pre-commit run --all-files` or a standalone lint/typecheck job); relying solely on whether developers have installed and enabled pre-commit hooks locally as a quality gate is prohibited, because local hooks can be bypassed by developers (`git commit --no-verify`) or may not be installed.

### 9.5 Boundary Between the Toolchain and Official Guidelines

15. **MUST** You must clearly distinguish "passing tool defaults" from "conforming to this guideline" as not the same thing: the rule sets of tools such as Ruff/Black/mypy are product decisions of their own projects and may differ in detail from this guideline's items (e.g., the specific line-length value chosen, whether a certain class of naming conventions is checked). When a tool conflicts with an item in this guideline, the official PEP-traced conclusion of this guideline prevails; at the same time, you should assess whether additional rules need to be added in the tool configuration, or whether a particular tool rule should be ignored with the reason documented in writing.
