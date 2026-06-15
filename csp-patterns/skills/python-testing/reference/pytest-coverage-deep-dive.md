# pytest Coverage Deep Dive

> Advanced coverage configuration, targets, exclusion rules, and CI integration for Python projects.

## Centralized Configuration

Put all coverage settings in `pyproject.toml`:

```toml
[tool.coverage.run]
source = ["src"]
branch = true
omit = ["*/tests/*", "*/migrations/*", "*/conftest.py", "src/main.py"]

[tool.coverage.report]
show_missing = true
fail_under = 80
exclude_lines = [
    "pragma: no cover",
    "if TYPE_CHECKING:",
    "raise NotImplementedError",
    "if __name__ == .__main__.",
    "@abstractmethod",
]

[tool.pytest.ini_options]
addopts = "--cov --cov-report=term-missing --cov-report=html"
```

## Branch Coverage

Always enable `branch = true`. Line coverage alone gives false confidence:

```python
def clamp(value, lo, hi):
    if value < lo:    # covered True + False
        return lo     # only True branch
    if value > hi:
        return hi
    return value      # only when both False
```

A single test yields 100% line coverage but misses the branch gaps.

## Coverage Targets

| Layer | Target | Rationale |
|---|---|---|
| Core business logic | >=95% | Highest bug density |
| Service / orchestration | >=85% | Integration seams |
| Utility / helpers | >=90% | Easy to test, high reuse |
| CLI / entry points | >=70% | Smoke-tested, hard to unit-test |
| Migrations / configs | Exclude | Not meaningful to cover |

Set `fail_under` to the minimum and raise it as the project matures.

## Exclusion Rules

**Inline pragma** for intentionally-uncoverable code:

```python
case _:
    raise ValueError(f"Unknown event: {event.type}")  # pragma: no cover
```

**Pattern-based** in `exclude_lines`: `"pragma: no cover"`, `"if TYPE_CHECKING:"`, `"@abstractmethod"`, `"@overload"`.

**File-level** via `omit`: `*/tests/*`, `*/migrations/*`, `scripts/*`, `setup.py`.

## Annotated Reports

Fastest way to find gaps:

```bash
pytest --cov=src --cov-report=annotate:cov_annotate
```

Files in `cov_annotate/` mark uncovered lines with `!`. Skip files at 100%.

## Dynamic Contexts

Track which test covers which line:

```toml
[tool.coverage.run]
dynamic_context = "test_function"
```

Query the SQLite DB to find orphan tests or understand coupling.

## CI Integration

**GitHub Actions:**

```yaml
- run: pytest --cov=src --cov-report=xml --cov-report=term-missing
- uses: codecov/codecov-action@v4
  with: { file: coverage.xml, fail_ci_if_error: true }
```

**Coverage diff for PRs** -- require coverage only on changed lines:

```bash
pip install diff-cover
pytest --cov=src --cov-report=xml
diff-cover coverage.xml --compare-branch=origin/main --fail-under=90
```

This enforces high coverage on new code without penalizing legacy files.

**Parallel runs** with `pytest-xdist`: `pytest -n auto --cov=src` -- pytest-cov auto-merges worker data.

## Common Pitfalls

- Measuring test file coverage -- always omit `tests/*` from source
- Chasing 100% blindly -- exclude C extensions and OS handlers with pragma
- Ignoring branch coverage -- line-only gives false confidence
- Not reviewing coverage diffs -- total stays green while new code has gaps
- Flaky tests inflating numbers -- unreliable tests produce unreliable coverage
