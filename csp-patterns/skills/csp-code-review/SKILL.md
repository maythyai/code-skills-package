---
name: csp-code-review
description: Comprehensive code review specialist for correctness, reuse, simplification, and efficiency. Use when reviewing code changes, before merging PRs, or when asked to audit code quality.
layer: 3
category: patterns
phase: review
domain: quality
scope: review
tools: [Read, Grep, Glob]
anti_rationalizations:
  "This code looks fine": "Looks can deceive. Review for correctness, reuse, and efficiency."
  "It works, let's move on": "Working code can still be wasteful or hard to maintain."
---

# Code Review

A complete methodology for reviewing code changes. The goal is to catch defects
before they ship and to keep the codebase coherent — not to prove the author wrong.
Review the **diff in context**, prioritize findings, and give feedback the author
can act on.

## Review Dimensions

Work through these six dimensions in order. Correctness first — a clever, fast,
beautifully factored function that returns the wrong answer is still broken.

### 1. Correctness

Does the code do what it claims, for every input it can receive?

- [ ] Happy path produces the right result
- [ ] Edge cases: empty inputs, zero, negative, max values, single-element
- [ ] Boundary conditions: off-by-one, inclusive/exclusive ranges, fencepost
- [ ] Null/undefined/None handling at every entry point
- [ ] Error paths handled, not swallowed; failures surface with context
- [ ] Concurrency: shared state, races, deadlocks, non-atomic read-modify-write
- [ ] Resource lifecycle: files, connections, locks closed/released on all paths
- [ ] State machine transitions are complete (no illegal/unhandled states)
- [ ] No reliance on undefined behavior, implicit ordering, or coincidence

### 2. Reuse (DRY)

Is this reinventing something that already exists?

- [ ] Duplicated logic that should be extracted or shared
- [ ] An existing utility/library/pattern in this codebase already does this
- [ ] Copy-pasted blocks that will drift out of sync
- [ ] A standard-library function reimplemented by hand
- [ ] New abstraction that overlaps an existing one (consolidate instead)

### 3. Simplification

Is this the simplest thing that works?

- [ ] Over-engineering: abstraction with a single caller, speculative generality
- [ ] Dead code, unreachable branches, unused parameters/variables
- [ ] Nesting that could be flattened with early returns / guard clauses
- [ ] Clever one-liners that obscure intent — prefer readable over terse
- [ ] Comments explaining *what* (the code should) vs *why* (keep these)
- [ ] Configuration/flags that no one needs yet (YAGNI)

### 4. Efficiency

Is it wasteful in a way that matters?

- [ ] Algorithmic complexity: accidental O(n²), nested loops over the same data
- [ ] N+1 queries / requests in a loop (batch them)
- [ ] Repeated expensive work that could be hoisted or memoized
- [ ] Unnecessary allocations, copies, or full-collection scans
- [ ] Missing pagination/streaming on unbounded data
- [ ] Premature optimization that trades clarity for unmeasured gains (push back)

### 5. Security

Could an attacker or bad input abuse this?

- [ ] Input validation and sanitization at trust boundaries
- [ ] Injection: SQL, command, template, path traversal (parameterize, escape)
- [ ] AuthN/AuthZ checked on every protected operation, not just the UI
- [ ] Secrets not hard-coded, logged, or returned in responses/errors
- [ ] Sensitive data not over-exposed in API payloads or logs
- [ ] Safe defaults; deny by default; least privilege
- [ ] Dependencies free of known-vulnerable versions

### 6. Testability & Tests

Can this be tested, and is it?

- [ ] New behavior has tests; bug fixes have a regression test
- [ ] Tests assert behavior/outcomes, not implementation details
- [ ] Edge cases and error paths are covered, not just the happy path
- [ ] Dependencies are injectable so units can be isolated (time, randomness, I/O)
- [ ] Tests are deterministic (no real network, no sleeps, no shared mutable state)

## Review Order

Read in this sequence so context builds before you judge details:

1. **Read the description / PR intent** — what problem is this solving? Review
   against that goal, not the goal you imagine.
2. **Scan the shape of the diff** — files touched, size, structure. A 50-file diff
   doing one thing is a red flag for scope creep.
3. **Read the tests first** — they tell you the intended contract and reveal missing
   cases faster than the implementation.
4. **Read the implementation** against the six dimensions above.
5. **Trace the critical path** end to end for the riskiest change.
6. **Check the seams** — public API, data migrations, backward compatibility, config
   changes, anything hard to reverse once shipped.

## How to Give Feedback

Classify every comment so the author knows what blocks merge and what doesn't.

| Label | Meaning | Author action |
|-------|---------|---------------|
| **blocking** | Must fix before merge (bug, security hole, broken contract) | Required |
| **suggestion** | Would improve the code; reviewer's judgment | Discuss / optional |
| **nit** | Minor style/preference, non-blocking | Optional |
| **question** | Reviewer needs to understand intent | Answer |
| **praise** | Call out genuinely good solutions | None — do it anyway |

Principles:

- **Be specific and actionable.** "This is O(n²) because the inner `find` rescans
  the list; build a `Map` keyed by id first" beats "this is slow."
- **Critique the code, not the author.** "This function" not "you always".
- **Explain the *why*.** A reason teaches; a command just gets obeyed or resented.
- **Don't gatekeep on taste.** Reserve blocking for correctness, security, and
  contract issues. Mark preferences as nits.
- **Distinguish facts from opinions.** "This leaks a connection on the error path"
  (fact) vs "I'd name this `userRepo`" (opinion).
- **Offer a path forward**, and approve once blocking items are resolved — don't
  hold a PR hostage to an endless stream of new nits.

## Common Anti-Patterns to Watch For

- **Rubber-stamping**: "LGTM" on a diff you didn't actually read.
- **Nit-bombing**: 40 style comments that bury the one real bug.
- **Scope creep in review**: demanding unrelated refactors as a merge condition.
- **Reviewing only additions**: deletions and changed lines hide regressions too.
- **Assuming the happy path**: not asking "what if this is empty/null/huge?"
- **Trusting the description over the diff**: review what the code does, not what the
  PR says it does.
- **Bikeshedding**: long debates on naming while a logic bug sits unmentioned.

## When to Use This Skill

- Reviewing a pull request or a colleague's branch
- Self-reviewing your own diff before requesting review
- Auditing an unfamiliar module for quality and risk
- Before merging anything to a protected branch

**Remember**: the reviewer's job is to protect correctness and long-term
maintainability while keeping the author moving. Find the real problems, say them
clearly, label their severity, and let the small stuff be small.
