---
name: csp-scope-guard
description: >
  Detect and resist scope creep during development. Use when a feature request
  triggers unplanned work, when "while I'm here" changes pile up, or when the
  current sprint/task is at risk of expanding beyond its original boundary.
layer: 1
category: meta
phase: plan
domain: quality
scope: design
tools: [Read, Glob, Grep]
related_skills: [csp-mvp-scoping, csp-strategy, csp-brainstorming]
anti_rationalizations:
  "It's just one more small thing": "Small things compound. Ten 'small things' delay a release by a week."
  "I'm already in this file, might as well fix it": "Drive-by fixes bypass review and introduce regressions."
  "The user asked for it": "The user asked for a solution, not every possible feature."
  "It'll be harder to do later": "If it's not critical now, it might never need doing."
---

# Scope Guard

Detect scope creep early and enforce disciplined boundaries around the current task.

## When to Use

- A feature request grows from "add a button" to "rebuild the dashboard"
- You notice yourself editing files unrelated to the stated task
- A bug fix reveals a "nearby improvement" that wasn't part of the original scope
- The word "also" or "while we're at it" appears in a request
- A task estimate has doubled without a clear reason

## When NOT to Use

- The original requirement was genuinely misunderstood and needs correction
- A critical security vulnerability is discovered during implementation
- The user explicitly reprioritizes and accepts the tradeoff

## Scope Creep Detection Signals

| Signal | Severity | Action |
|--------|----------|--------|
| "While I'm here" edits | Medium | Stop. Is this in the current task? |
| New dependency added mid-task | High | Does this dependency serve the original goal? |
| Refactoring triggered by a feature | High | Separate into a follow-up task |
| "Wouldn't it be cool if..." | Critical | Park it. Write it down. Don't build it now. |
| Touching >5 files for a "simple" change | Critical | Re-evaluate scope. Something expanded. |
| New UI element not in original spec | High | Confirm with stakeholder before proceeding |

## Process

1. **Define the boundary** — Before starting, write a one-sentence scope statement: "This task does X and nothing else."
2. **Check each change against the boundary** — For every file edit, ask: "Does this directly serve the scope statement?"
3. **Capture, don't act** — When out-of-scope ideas arise, log them in a `PARKING_LOT.md` or task comment. Do not implement.
4. **Escalate scope changes explicitly** — If a change is genuinely needed, state the tradeoff: "Adding X will delay Y by Z. Proceed?"
5. **Time-box exploration** — If unsure whether something is in scope, give yourself 10 minutes to investigate, then decide.

## Key Principles

- **The scope statement is a contract** — violating it without explicit approval is a process failure, not initiative.
- **Parking is not killing** — deferred ideas are logged for future consideration, not discarded.
- **Explicit tradeoffs beat implicit assumptions** — "This adds 2 days" is better than silently absorbing work.
- **Small scope violations compound** — three "quick additions" can derail a sprint.

## Scope Creep Anti-Patterns

- **The "helpful" refactor**: Cleaning up code near your change without being asked. Creates review burden and regression risk.
- **The "user would probably want this"**: Building features based on your speculation rather than stated requirements.
- **The "sunk cost" expansion**: "I've already changed this module, so let me also update the related config..." — No. Stop.
- **The "perfectionism" trap**: Polishing beyond the acceptance criteria. Done is better than perfect.

## Verification

- [ ] Can I state the scope of this task in one sentence?
- [ ] Have I reviewed every changed file against that scope statement?
- [ ] Are all out-of-scope ideas captured in a parking lot, not in code?
- [ ] Have any scope changes been explicitly approved with tradeoffs stated?

## Related Skills

- [[csp-mvp-scoping]] — when deciding what belongs in the initial release
- [[csp-strategy]] — when aligning features with product strategy
- [[csp-hotfix]] — when an emergency must bypass scope (justified exception)
