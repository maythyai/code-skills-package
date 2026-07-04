---
name: csp-implementation-phase
description: Implementation phase specialist for executing planned work with proper patterns, error handling, and code quality. Use when writing production code from a plan.
layer: 2
category: workflow
phase: build
domain: patterns
scope: implementation
tools: [Read, Write, Edit, Bash, Glob, Grep]
anti_rationalizations:
  "I'll refactor later": "Later never comes. Implement it right the first time."
  "This pattern is overkill": "Patterns exist for a reason. Follow established conventions."
---

# Implementation Phase

Execute a spec with discipline. The goal is to produce code that matches the plan, not to discover new directions mid-flight.

## Process

### Step 1: Load the Spec

- Read the full spec/proposal before writing any code
- Identify acceptance criteria, constraints, and file-level targets
- Note any ambiguities — resolve them now, not mid-implementation
- If the spec references other docs (ADRs, API contracts), read those too

### Step 2: Set Up the Branch

- Create a branch named after the spec (e.g., `feat/<spec-slug>`)
- Confirm the branch is based on the correct parent (main, develop, or a specific tag)
- Run the test suite on a clean checkout — if tests fail before you start, stop and report

### Step 3: Implement with TDD Cycle

For each logical unit of work:

1. **Write a failing test** that describes the intended behavior
2. **Write the minimum code** to make it pass
3. **Refactor** while the test is green — clean naming, remove duplication
4. Repeat — do not batch multiple units into one cycle

### Step 4: Commit Atoms

- One commit per logical unit of change (one feature, one fix, one refactor)
- Each commit should compile and pass tests independently
- Commit messages follow project convention (conventional commits, prefix style, etc.)
- Never commit broken code with a "WIP" message — use a stash or a branch instead

### Step 5: Verify Continuously

- Run the full test suite after each commit, not just the tests you wrote
- Run the linter and type checker before considering the work done
- If CI exists, push early and watch the pipeline — don't assume local green means CI green

### Step 6: Document Decisions

- Record any deviation from the spec with a brief rationale
- If the spec was ambiguous, note how you resolved it
- Update inline comments for non-obvious implementation choices

## Implementation Discipline

- **No unplanned changes** — if you notice unrelated code that needs fixing, file a separate task
- **No "while I'm here" refactors** — scope creep disguised as cleanup is still scope creep
- **No speculative abstractions** — build what the spec asks for, not what it might need someday
- **Follow existing patterns** — match the codebase's conventions for naming, file structure, and error handling
- **One logical change per commit** — mixing feature work with refactoring makes review and rollback painful

## Common Rationalizations

| What you tell yourself | What's actually happening |
|------------------------|--------------------------|
| "I'll refactor later" | Refactoring without a plan is drift. Do it now or track it explicitly. |
| "This is just a small improvement" | Small unplanned changes accumulate into unreviewable diffs. |
| "The spec didn't cover this case" | The spec had a gap — document your decision, don't silently expand scope. |
| "It works, ship it" | Working != correct. Check error handling, edge cases, and the spec's acceptance criteria. |

## Red Flags

- **Diff is larger than expected** — you've drifted from the spec. Stop and compare.
- **You're writing code you "know" will be needed** — that's speculation. Delete it.
- **Multiple files changed for a "simple" task** — re-read the spec; you may be solving the wrong problem.
- **Tests are passing but you're not sure why** — investigate before moving on. Green tests with unknown behavior are worse than red tests.
- **You haven't committed in hours** — the unit of work is too large. Break it down.

## Verification

- [ ] Every acceptance criterion from the spec is satisfied
- [ ] Tests exist for all new behavior (not just the happy path)
- [ ] Error handling is present — no uncaught exceptions on expected failure modes
- [ ] Linter and type checker pass with zero warnings
- [ ] No unplanned file changes in the diff
- [ ] Commit history is clean — each commit is a self-contained logical unit
- [ ] Spec deviations are documented with rationale

## Related Skills

- [[csp-verify-phase]] — for post-implementation verification
- [[csp-explore]] — for pre-implementation codebase investigation
