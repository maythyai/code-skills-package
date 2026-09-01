---
name: csp-python-coding-standards
description: "Python coding standards (Python 3.10+) covering naming & style (PEP 8), type annotations (PEP 484+), language features, exceptions & logging, modern syntax & concurrency, security, unit testing, project structure (pyproject.toml), and toolchain (Ruff/mypy). Use when writing, reviewing, or refactoring Python code to enforce idiomatic, safe, typed, and maintainable practices — even when the user does not explicitly ask to 'check style' or 'run PEP 8'."
version: 0.1.0
layer: 3
category: patterns
phase: build
domain: patterns
metadata:
  globs: ["**/*.py", "**/*.pyi", "pyproject.toml"]
related_skills: [csp-python-testing, csp-python-patterns, csp-python-reviewer, csp-ruff-fixer, csp-django-patterns, csp-django-security]
---

# Python Coding Standards

Standards for readable, maintainable, and safe Python **3.10+** code, derived from the official Python style guides and language reference.

## Overview

This skill targets **Python 3.10+** (the latest stable release at time of writing is Python 3.14). It aims to:

- Unify Python code style and improve readability and maintainability
- Fill the gap left by PEP 8 / PEP 257, which are "style guidance" but lack "language-feature usage guidance"
- Capture the officially recommended usage of new features introduced in 3.10–3.14: type annotations, structural pattern matching, exception groups, modern packaging, etc.
- Standardize engineering concerns — exceptions, logging, security, testing, project structure — to reduce defects and security risks
- Lower the cost of code review and knowledge transfer across a team

**Methodology**: This skill follows a "zero-conjecture, fully-sourced" principle — every rule cites a verifiable official source (PEP number, `docs.python.org` section, `packaging.python.org` page). For tools/practices that are not officially mandated but have become de-facto industry standards (Ruff, Black, pytest, uv), the rule is explicitly marked "community practice" rather than "official mandate," and never conflated with PEP normative text.

## Rule Levels

Each rule is tagged with a level indicating its importance and binding force:

- **MUST** — mandatory. Violating it may cause functional defects, security vulnerabilities, or severe maintainability problems.
- **SHOULD** — recommended. Long-term adherence improves code quality, performance, and team collaboration.
- **MAY** — advisory. Directional guidance for technical selection and architectural decisions; projects may trade off as appropriate.

During code review, **MUST** rules are checked strictly; **SHOULD** rules should be followed with exceptions explained; **MAY** rules may be raised as optimization suggestions.

Each rule ends with a `> Source:` line citing the official/authoritative basis; entries tagged `> Source: community practice` come from de-facto industry-standard tooling (Ruff/Black/pytest/mypy/uv) rather than official Python mandates.

## Workflow

When writing, reviewing, or refactoring Python code, use this skill as follows:

1. **Identify the relevant domains**: Determine which of the domains below the current code/change touches (naming/style, type annotations, exceptions/logging, security, testing, concurrency, project structure, toolchain). Do not conclude after reading a single file — most real code spans several domains at once (e.g., a new function usually involves naming + type annotations + exception handling simultaneously).
2. **Locate and read the corresponding reference file**: Read only the files involved; you do not need to read all 11 files every time (see the document-structure table and progressive-disclosure design below).
3. **Apply rules and tag levels**:
   - **MUST** — any violation in code must be fixed; in review, must be called out and blocked.
   - **SHOULD** — follow where possible; if a project deviates for historical reasons, note the reason in a comment or review remark.
   - **MAY** — raise as an optimization suggestion; does not block merge.
4. **When code touches security** (user input, serialization, subprocess, cryptography, SQL concatenation): regardless of whether step 1 identified the security domain, you **must** additionally cross-check `references/security.md`. This is the one domain that must always be cross-checked even when it appears to belong to another domain.
5. **Cite concrete rule IDs in conclusions**: When giving feedback, point to the exact reference file and rule number (e.g., "violates `naming-style.md` rule 51") rather than a vague "naming is non-standard," so the author can verify against the source.

## Document Structure

Read selectively based on the need:

### Core Standards

- **[references/naming-style.md](references/naming-style.md)** — indentation, line length, blank lines, quotes, whitespace, comments, docstrings, import order, naming conventions (from PEP 8 / PEP 257 official text)
- **[references/type-annotations.md](references/type-annotations.md)** — annotation syntax, `X | Y`, generic new-syntax, `Protocol`/`TypedDict`/`Self`/`@override`, runtime boundaries of type checkers (from PEP 484/526/544/604/673/695/612/646/698 and the `typing` module docs)
- **[references/language-features.md](references/language-features.md)** — conditionals, mutable default arguments, comprehensions, generators, lambdas, decorators, properties, inheritance, string formatting

### Quality Assurance

- **[references/exceptions-logging.md](references/exceptions-logging.md)** — exception hierarchy, exception chaining, exception groups `except*`, official logging HOWTO conventions
- **[references/unit-testing.md](references/unit-testing.md)** — pytest/unittest usage, test organization, coverage requirements
- **[references/security.md](references/security.md)** — deserialization safety, command-injection prevention, cryptographic randomness, temp files, hash-algorithm selection (from stdlib official security warnings)

### Modern Features & Engineering

- **[references/modern-syntax-concurrency.md](references/modern-syntax-concurrency.md)** — `match`/`case`, walrus operator, f-string new features, `dataclass`, `pathlib`, `contextlib`, GIL vs threading/multiprocessing/asyncio selection
- **[references/project-structure-deps.md](references/project-structure-deps.md)** — `pyproject.toml`, src-layout, virtual environments, build & publish tooling (from PyPA packaging.python.org official spec)
- **[references/toolchain.md](references/toolchain.md)** — de-facto standard lint/format/type-check/pre-commit toolchain (Ruff, Black, mypy/Pyright, pre-commit)

### Appendix

- **[references/glossary.md](references/glossary.md)** — glossary of terms used in the standards (GIL, MRO, Duck Typing, Descriptor, etc.)
- **[references/naming-version-cheatsheet.md](references/naming-version-cheatsheet.md)** — naming-style quick reference + Python 3.10–3.14 new-feature version cheatsheet

> The mapping between files and scenarios is given in step 2 of the Workflow above and is not repeated here, to avoid stating the same information twice within this SKILL.md.

## Applicability & Prerequisites

- Targets **Python 3.10+**. Python 2 reached end-of-life on 2020-01-01 (PEP 373); this skill provides **no** Python 2 compatibility guidance.
- Features that require a specific version are tagged with their minimum Python version (e.g., "3.12+") and summarized in `references/naming-version-cheatsheet.md`, to prevent misuse on lower versions.
- All type-annotation rules assume the premise that "Python does not perform type checking at runtime by default; a static checker such as mypy/Pyright is required" (an explicit statement of PEP 484 and the `typing` docs). This skill does not assume a project has already adopted a type checker, but strongly recommends doing so.

## Use Scenarios

Reference this skill when:

1. **Writing code** — follow naming, formatting, typing, and exception rules when writing new Python.
2. **Reviewing code** — check quality and conformance during code review.
3. **Refactoring code** — modernize legacy (especially Python 2-era) code to current Python standards.
4. **Team standards** — define or refine a team's Python coding standard.
5. **Training** — onboarding material for new Python developers.
6. **Troubleshooting** — when diagnosing production issues, check whether code violates exception/concurrency/security best practices.
7. **Project initialization** — when starting a new Python project, consult the project-structure reference to choose an appropriate layout and packaging approach.

## Source List

This skill was written by cross-referencing the following authoritative sources:

- **PEP 8** (Style Guide for Python Code) — https://peps.python.org/pep-0008/
- **PEP 257** (Docstring Conventions) — https://peps.python.org/pep-0257/
- **PEP 484/526/544/586/589/591/604/612/646/654/673/695/698** (type system)
- **PEP 517/518/621/602** (packaging & release cycle)
- **Python official docs** docs.python.org (typing / logging / exceptions / asyncio / threading / multiprocessing / pathlib / dataclasses / contextlib / pickle / subprocess / secrets / ast / tempfile / hashlib module pages)
- **Python Packaging User Guide** packaging.python.org (PyPA official packaging authority)
- **What's New in Python 3.10 / 3.11 / 3.12 / 3.13 / 3.14** official changelogs
