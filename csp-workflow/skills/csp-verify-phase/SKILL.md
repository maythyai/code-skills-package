---
name: csp-verify-phase
description: Verification phase specialist ensuring all acceptance criteria are met, tests pass, and quality gates are satisfied before shipping. Use when verifying implementation completeness.
layer: 2
category: workflow
phase: verify
domain: quality
scope: testing
tools: [Read, Write, Edit, Bash, Glob, Grep]
anti_rationalizations:
  "Tests passed, we're done": "Passing tests don't guarantee correctness. Verify against requirements."
  "It works on my machine": "Local success ≠ production readiness. Check environment parity."
---

# Verify Phase

Confirmation is not a formality — it's the last line of defense. Every check below must produce evidence, not assumptions.

## Verification Pipeline

Run these checks in order. A failure at any step stops the pipeline.

### Check 1: Tests

- **Run**: Full test suite (unit, integration, e2e as applicable)
- **Pass**: All tests green, zero skipped tests that relate to the changed code
- **Fail**: Any red test, or tests skipped to make the suite pass — investigate and fix

### Check 2: Linter

- **Run**: Project linter (eslint, ruff, clippy, etc.) on all changed files and their imports
- **Pass**: Zero errors, zero new warnings (pre-existing warnings are tracked, not ignored)
- **Fail**: Any error or new warning — fix or explicitly suppress with a rationale comment

### Check 3: Build

- **Run**: Full project build (compile, bundle, or package as applicable)
- **Pass**: Build completes without errors, no new build warnings
- **Fail**: Build error or new warning — this means the code doesn't ship

### Check 4: Type Check

- **Run**: Type checker (tsc, mypy, etc.) across the full project, not just changed files
- **Pass**: Zero type errors. Changed code uses proper types (no `any`, no `# type: ignore` without justification)
- **Fail**: Any type error or unjustified type suppression

### Check 5: Acceptance Criteria

- **Run**: Walk through each acceptance criterion from the spec one by one. Demonstrate the behavior manually or via a targeted test.
- **Pass**: Every criterion is demonstrably satisfied with evidence (test output, screenshot, log line)
- **Fail**: Any criterion that cannot be demonstrated — "it should work" is not evidence

### Check 6: Documentation

- **Run**: Review all docs touched by this change (README, API docs, inline comments, ADRs)
- **Pass**: Documentation accurately reflects the current behavior. No stale references to the old behavior.
- **Fail**: Docs describe behavior that no longer exists, or new behavior is undocumented

## Evidence Requirements

| Claim | Evidence Required | Insufficient Evidence |
|-------|-------------------|----------------------|
| "Tests pass" | Full test output with exit code 0 | "I ran the tests" with no output |
| "No regressions" | Diff of test results before/after change | "Nothing else changed" |
| "Acceptance criteria met" | Per-criterion demonstration with output | "It matches the spec" (no proof) |
| "Build is clean" | Build log with zero errors/warnings | "It compiled fine" |
| "Docs are updated" | List of changed doc files with diff | "I'll update docs later" |

## Regression Check

Before declaring the implementation complete, compare against the pre-change baseline:

1. **Test count** — did the total test count go up or stay the same? A decrease means tests were deleted.
2. **Coverage** — if the project tracks coverage, the changed files should not reduce it.
3. **Related functionality** — run tests for adjacent modules, not just the changed one. A change to `auth` should also exercise `session` and `permissions` tests.
4. **Performance-sensitive paths** — if the change touches hot paths, run relevant benchmarks or at minimum confirm no new N+1 queries or unnecessary allocations.

## Documentation Verification

After implementation, the spec itself may need updating:

- **Is the spec still accurate?** — if the implementation deviated, update the spec or document why
- **Are ADRs current?** — if the implementation revealed a better approach, record a new ADR
- **Are comments honest?** — stale comments are worse than no comments. Remove or update them.
- **Is the changelog updated?** — if the project maintains one, add an entry now while context is fresh

## Common Rationalizations

| What you tell yourself | What's actually happening |
|------------------------|--------------------------|
| "Tests passed, we're done" | Tests verify code behavior, not requirement satisfaction. Check the spec. |
| "It works on my machine" | Environment differences cause production failures. Verify parity. |
| "The flaky test isn't related" | Flaky tests hide real regressions. Fix or quarantine the flake before merging. |
| "I'll update docs in a follow-up" | Follow-ups have a half-life of never. Update now while context is fresh. |

## Red Flags

- **CI is green but the feature doesn't work** — tests are insufficient; add acceptance-level coverage
- **No test changes in the diff** — new behavior without new tests is untested behavior
- **You can't demonstrate an acceptance criterion** — the criterion is unmet, period
- **The build passes but with new warnings** — warnings today are errors tomorrow; fix them now

## Verification

- [ ] All six pipeline checks pass with recorded evidence
- [ ] Regression check shows no degradation vs. baseline
- [ ] Documentation matches current behavior
- [ ] No rationalizations were used to skip a check
- [ ] Verification evidence is committed or linked in the PR/task

## Related Skills

- [[csp-implementation-phase]] — the work being verified
- [[csp-explore]] — for investigating unexpected verification failures
