---
name: csp-ruff-fixer
description: >
  Iterative Ruff linting fixer. Runs safe then unsafe autofixes in passes,
  reviews each diff, resolves remaining findings with targeted edits or user
  decisions, and applies noqa only when justified. Use for Python lint fixes,
  Ruff rule enforcement, and code quality cleanup.
metadata:
  origin: CSP
  source: awesome-copilot/skills/ruff-recursive-fix
  globs: ["**/*.py", "**/*.pyi", "pyproject.toml"]
---

# CSP Ruff Fixer

## When to Use

- Fixing Ruff lint findings in a Python project or scoped path
- Enforcing rule categories from `pyproject.toml` or CLI overrides
- Iteratively cleaning code quality without breaking behavior
- Modernizing legacy Python syntax (UP, I, C4 rules)

## Resolve Runner

Pick one prefix, reuse throughout: `uv run ruff` > `ruff` (PATH) > `python -m ruff` > ask user.

## Iterative Fix Workflow

**Pass 1 -- Baseline.** Run `<ruff> check [target] [--select ...] [--extend-ignore ...]`. Classify findings as safe-fixable, unsafe-fixable, or manual-only.

**Pass 2 -- Safe autofix.**
```bash
<ruff> check [target] --fix && <ruff> format [target] && <ruff> check [target]
```
Review diff for semantic correctness.

**Pass 3 -- Unsafe autofix** (only if findings remain):
```bash
<ruff> check [target] --fix --unsafe-fixes && <ruff> format [target] && <ruff> check [target]
```
Scrutinize behavior-sensitive edits: type coercions, import rewrites, signature changes.

**Pass 4 -- Manual remediation.** Targeted edits, format + re-check each batch. If multiple valid fixes exist, ask the user.

**Loop** passes 2-4 until: check is clean, remaining findings need architectural decisions, or a pass makes zero progress (summarize blockers, ask user).

## noqa Decision Tree

Use suppression **only** when ALL are true:
1. Rule conflicts with required behavior, public API, framework convention, or readability
2. Refactoring is disproportionate to the rule's value
3. Suppression is narrow (single line) with explicit rule code

Format: `# noqa: <RULE>  # brief reason`. Never bare `# noqa`. When in doubt, ask the user.

## Common Rule Categories

| Code | Catches |
|------|---------|
| E / W | Style errors and warnings (indent, line length, whitespace) |
| F | Unused imports/vars, undefined names (pyflakes) |
| I | Import sorting (isort) |
| N | Naming conventions (snake_case, CamelCase) |
| UP | Modernize to newer Python syntax |
| B | Likely bugs: mutable defaults, star args, loop captures |
| A | Shadowing built-in names |
| C4 | Suboptimal comprehensions |
| SIM | Simplifiable conditionals and expressions |
| ARG | Unused function arguments |
| TCH | Type-only imports should be under `TYPE_CHECKING` |
| RUF | Ruff-specific rules |

Detailed rules with fix examples: `reference/ruff-rules-reference.md`

## Quality Gates

- `ruff check` clean for chosen scope/options
- All autofix diffs reviewed; unsafe fixes flagged to user
- No `noqa` without justification; `ruff format` in every iteration

## Output Report

Report: scope + options, iteration count, fixed/remaining findings, manual edits, suppressions with rationale, required user decisions.
