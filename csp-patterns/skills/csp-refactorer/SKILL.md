---
name: csp-refactorer
description: >
  Surgical code refactoring agent. Plans multi-file refactors before touching code,
  reduces cognitive complexity via method extraction, eliminates code smells, and
  improves maintainability without changing behavior. Triggered by "refactor",
  "clean up this code", "reduce complexity", "extract method".
metadata:
  origin: CSP
  source: awesome-copilot/skills/refactor*
  globs: ["**/*.{ts,tsx,js,jsx,py,java,kt,go,rs,cs,cpp,rb,php}"]
---

# csp-refactorer

Surgical code refactoring: improve structure, reduce complexity, eliminate smells,
all while preserving external behavior. This is gradual evolution, not revolution.

## When to Use

- User asks to "refactor", "clean up", "reduce complexity", "extract method"
- Functions or classes are too large or do too many things
- Code smells make adding features difficult or risky
- Cognitive complexity metrics exceed acceptable thresholds
- A review identified structural problems that need fixing

Skip refactoring when: code works and will not change again, critical production
code lacks tests (add tests first), a tight deadline leaves no room, or the
motivation is "just because" without a clear purpose.

## Refactor Workflow

Follow this four-phase cycle strictly. Do not jump to editing code.

```
Plan  -->  Analyze  -->  Execute  -->  Verify
 |                          |             |
 +--- output plan, wait     |             |
     for confirmation       |             |
                            +--- small    |
                                steps     |
                                          +--- tests pass,
                                              complexity down
```

### Phase 1: Plan

1. Search the codebase. Read enough implementation, tests, and configuration to
   understand the current state before proposing changes.
2. Identify affected files, dependency boundaries, and hidden coupling.
3. Sequence changes safely: types/interfaces first, then implementations, then
   callers, then tests, then cleanup.
4. Output the plan and **stop**. Ask for confirmation before editing files.
5. If the request is too ambiguous to plan safely, ask concise clarifying
   questions instead of guessing.

For multi-file refactors, use the full plan template in
`reference/refactor-workflows.md`.

### Phase 2: Analyze

- Identify the specific code smells to address (long method, duplicated code,
  god class, primitive obsession, feature envy, magic values, dead code).
- Measure cognitive complexity of target methods. Flag nested conditionals,
  switch chains, repeated blocks, and complex boolean expressions.
- Determine extraction opportunities: validation logic, type-specific handlers,
  repeated calculations, common transformation patterns.

### Phase 3: Execute

Make changes in small, reversible steps:

1. Ensure tests exist for the code being refactored. Write them if missing.
2. Commit the current state before each logical change.
3. Make one small change, run tests, commit if green. Repeat.
4. Extract helper methods before restructuring the main flow.
5. Rename for clarity. Replace magic values with named constants.
6. Flatten nested conditionals with guard clauses and early returns.
7. One thing at a time: never mix refactoring with feature changes.

For complexity reduction techniques and extraction patterns, see
`reference/complexity-reduction.md`.

### Phase 4: Verify

- All existing tests pass with zero failures. Read the actual test output and
  confirm `failed=0`; never assume tests passed without checking.
- Cognitive complexity is at or below the target threshold.
- Compilation succeeds with no new errors or warnings.
- Performance is unchanged or improved.
- All original functionality is preserved, including error messages and
  exception types.

## Core Principles

1. **Behavior is preserved.** Refactoring changes how code is structured, never
   what it does. Input/output contracts stay identical.
2. **Small steps, constant verification.** Tiny changes, test after each,
   commit after each green state.
3. **Tests are non-negotiable.** Without tests you are not refactoring, you are
   editing. Write tests first if they do not exist.
4. **One concern per change.** Do not mix refactoring with bug fixes or feature
   work in the same commit.
5. **Names carry meaning.** Every extract, rename, or restructure should make
   the code read closer to the domain language.

## Anti-Patterns

- **Big-bang rewrite.** Changing dozens of files at once makes rollback
  impossible and hides regressions.
- **Refactoring without tests.** Any untested change is a gamble, not a
  refactor.
- **Mixing concerns.** Combining a rename with a logic change in one commit
  makes code review and bisect painful.
- **Premature abstraction.** Extracting a "generic utility" after seeing one
  example. Wait for three or more concrete uses.
- **Ignoring the blast radius.** Changing a public interface without auditing
  every caller first.
- **Gold-plating.** Refactoring code that works, is tested, and will not be
  touched again.

## Reference Files

Load on demand for detailed techniques:

| File | Contents |
|------|----------|
| `reference/refactor-workflows.md` | Full plan template, code smell catalog with fixes, design patterns, safe process steps, checklist |
| `reference/complexity-reduction.md` | Cognitive complexity scoring, extraction strategies, guard clause patterns, helper method design, validation protocol |
