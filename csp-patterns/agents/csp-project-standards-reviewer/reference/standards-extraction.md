# Standards Extraction Methodology

How to derive coding standards from existing code when explicit documentation is absent or incomplete.

## Multi-File Analysis Process

When analyzing multiple files or an entire directory:

1. **Aggregate** -- Scan all files, collecting syntax patterns into a unified dataset
2. **Categorize** -- Group observations by: indentation, naming, comments, conditionals, functions, imports
3. **Count** -- For each category, tally occurrences of each variant
4. **Majority rule** -- The variant with the highest count becomes the standard
5. **Flag outliers** -- Files that deviate from majority are inconsistencies to report or fix

## Pattern Detection

### Naming Conventions
Extract and count naming styles per entity type:

| Entity | Common Styles | Detection Method |
|--------|---------------|------------------|
| Variables | `camelCase`, `snake_case`, `PascalCase` | Parse declarations, identify casing pattern |
| Functions | `camelCase()`, `snake_case()`, `PascalCase()` | Parse function/method signatures |
| Classes | `PascalCase`, `UPPER_SNAKE` | Parse class/struct definitions |
| Constants | `UPPER_SNAKE_CASE`, `PascalCase` | Identify `const`/`final`/`static` declarations |
| Files | `kebab-case`, `snake_case`, `camelCase`, `PascalCase` | Scan filenames in directory |

### Formatting Patterns
- **Indentation**: tabs vs spaces, and width (2, 4, 8)
- **Line length**: measure distribution, identify ceiling (80, 100, 120)
- **Brace style**: K&R (same line) vs Allman (new line) vs Stroustrup
- **Quote style**: single vs double for strings
- **Trailing commas**: present or absent in multiline structures
- **Semicolons**: required, optional, or absent

### Import/Module Patterns
- Ordering: alphabetical, by source (stdlib/third-party/local), grouped
- Style: named imports vs default imports, relative vs absolute paths
- Grouping: blank lines between groups, or continuous block

### Comment Patterns
- Docstrings: JSDoc, docstring, Go doc, Rustdoc format
- Inline: explain *why* vs explain *what*
- Tags: `TODO`, `FIXME`, `NOTE`, `HACK` usage
- File headers: presence, format, content

### Error Handling Patterns
- Exceptions vs return values vs Result types
- Logging: structured (JSON) vs string formatting
- Error propagation: wrapping vs re-throwing

## Inconsistency Detection

When `findInconsistencies` is active:

1. Evaluate each pattern category independently
2. Count occurrences of each variant across all scanned files
3. Identify the minority variants (anything not matching majority)
4. Store in temporary memory: `{ category, expected, actual, file, line }`
5. If `fixInconsistencies` is active: rewrite minority instances to match majority
6. Otherwise: report inconsistencies with locations

**Multi-file mode**: When more than one file or a folder is passed, disable auto-fix to prevent destructive changes across unfamiliar code. Report only.

## Language-Specific References

When building standards for a language, cross-reference established style guides:

- **C** -- CMU EE coding standard
- **C#** -- Microsoft .NET coding conventions
- **C++** -- C++ Core Guidelines (isocpp)
- **Go** -- golang-standards project-layout
- **Java** -- Google Java Style Guide
- **JavaScript** -- W3Schools conventions, Airbnb style Guide
- **Kotlin** -- Official Kotlin coding conventions
- **Python** -- PEP 8
- **Ruby** -- Ruby Style Guide (rubystyle.guide)
- **Rust** -- Official Rust style guide
- **TypeScript** -- Official Do's and Don'ts
- **Swift** -- API Design Guidelines

Use these as a baseline, then layer project-specific conventions on top.

## Standards Document Output

### Minimal Template
```
1. Introduction (purpose, scope)
2. Naming Conventions (variables, functions, classes, constants)
3. Formatting and Style (indentation, line length, braces, spacing)
4. Commenting (docstrings, inline, file headers)
5. Error Handling (general approach, logging)
6. Best Practices and Anti-Patterns
7. Examples (correct and incorrect)
8. Contribution and Enforcement
```

### Verbose Template
```
1. General Code Style (clarity, focus, DRY, dead code removal)
2. Naming Conventions (table with convention + example per entity type)
3. Formatting Rules (indentation, line length, encoding, brace style, spacing)
4. Comments & Documentation (why not what, tag conventions)
5. Error Handling (explicit handling, resource cleanup)
6. Commit & Review Practices (commit messages, PR size)
7. Tests (deterministic, readable, coverage expectations)
8. Changes to This Guide (evolution process)
```

Choose minimal for small projects or teams with strong conventions already. Choose verbose for larger teams or projects where standards are being established for the first time.

## Verification Checklist

After generating standards, verify:
- [ ] Every rule has at least one concrete example from the codebase
- [ ] No rule contradicts established codebase patterns
- [ ] File paths referenced actually exist
- [ ] Language-specific conventions align with official guides
- [ ] Rules are testable by linter or code review, not just aspirational
