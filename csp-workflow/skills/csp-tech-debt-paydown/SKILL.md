---
name: csp-tech-debt-paydown
description: >
  Structured approach to identifying, prioritizing, and paying down technical debt.
  Use when the codebase has accumulated cruft, when velocity is declining, or when
  planning a refactoring sprint. Helps solo developers decide what to fix now vs later.
version: 0.1.0
layer: 2
category: workflow
---

# Technical Debt Paydown

A pragmatic framework for managing technical debt as a solo developer — because you don't have a team to absorb the pain.

## When to Use

- Velocity is declining and you suspect accumulated shortcuts are the cause
- You're planning a refactoring effort and need to prioritize what to fix
- A specific area of the codebase is a recurring source of bugs
- You need to decide whether to refactor, rewrite, or live with a known issue
- After shipping an MVP and before scaling features

## When NOT to Use

- The product hasn't launched yet (ship first, refactor later)
- The debt is cosmetic (naming, style) — fix it opportunistically, not as a project
- You're in the middle of a critical feature sprint (pay debt between sprints, not during)
- The code is "not elegant enough" but works fine (that's not debt, that's taste)

## Process

### Step 1: Inventory the Debt

Categorize every known piece of tech debt:

| Type | Examples | Impact |
|------|----------|--------|
| **Reckless/Deliberate** | "We'll fix this later" hacks, TODO comments | High — known risk, deferred cost |
| **Reckless/Inadvertent** | Missing tests, no error handling | High — unknown unknowns |
| **Prudent/Deliberate** | Accepted tradeoffs with documented rationale | Low — intentional, monitored |
| **Prudent/Inadvertent** | Patterns that didn't scale as expected | Medium — lessons learned |

### Step 2: Score Each Item

For each debt item, assess:

- **Pain frequency**: How often does this cause bugs, slowdowns, or developer frustration? (daily/weekly/monthly/rarely)
- **Fix complexity**: How long would it take to fix? (hours/days/weeks)
- **Risk if ignored**: What happens if this never gets fixed? (minor annoyance → data loss → system failure)
- **Dependencies**: Does fixing this unblock other work?

**Priority score**: `(pain_frequency × risk) / fix_complexity` — high score = fix first.

### Step 3: Choose a Strategy

| Strategy | When to Use | Example |
|----------|-------------|---------|
| **Boy Scout Rule** | Small debt encountered during feature work | Rename a confusing variable while editing the file |
| **Debt Sprint** | Accumulated medium-sized debt | Dedicate 1-2 weeks to paying down top-priority items |
| **Strangler Fig** | Large subsystem that needs rewriting | Gradually replace the old system piece by piece |
| **Quarantine** | Debt that's risky to touch but needs containment | Add tests around the brittle code, don't change it yet |
| **Accept** | Debt with low impact and high fix cost | Document it, monitor it, move on |

### Step 4: Execute

For each debt item being addressed:

1. **Add tests first** — before refactoring, ensure current behavior is captured by tests
2. **Make small, reversible changes** — refactor in steps, each independently deployable
3. **Verify after each step** — run tests, check production behavior
4. **Document what changed and why** — future-you (or your replacement) will thank you
5. **Update the inventory** — mark resolved items, note any new debt discovered during the process

### Step 5: Prevent Recurrence

- **Add debt tracking to your workflow** — tag issues with `tech-debt` in your issue tracker
- **Budget 10-20% of each sprint** for debt paydown
- **Review debt inventory monthly** — is it growing or shrinking?
- **Write ADRs** (Architecture Decision Records) for tradeoffs you accept deliberately

## Decision Matrix: Refactor vs Rewrite vs Accept

| Condition | Decision |
|-----------|----------|
| Code works but is messy | Refactor incrementally |
| Code has fundamental design flaw | Rewrite the affected module |
| Code works, nobody touches it | Accept and document |
| Code causes weekly incidents | Fix immediately, regardless of complexity |
| Rewrite estimate > 2 weeks | Strangler fig: replace incrementally |
| Third-party dependency is the problem | Evaluate alternatives, migrate if ROI is clear |

## Key Principles

- **Debt is a loan, not a gift** — every shortcut has interest. The longer you wait, the more it costs.
- **Not all debt needs to be paid** — some tradeoffs are worth keeping. The key is making the choice deliberately.
- **Tests are the safety net** — never refactor without tests. Untested refactoring is just rearranging bugs.
- **Small and frequent beats large and rare** — 2 hours of debt paydown per week is better than a 2-week "refactoring sprint" that never happens.
- **Measure velocity** — if debt paydown isn't improving your shipping speed, you're fixing the wrong things.

## Anti-Patterns

- **The "big rewrite" fantasy**: Rewrites rarely deliver what they promise. Incremental improvement is safer and more predictable.
- **Refactoring without tests**: You're not refactoring — you're rearranging. Add tests first.
- **Debt as an excuse to stop shipping**: Some debt is fine. Perfect code that never ships is worthless.
- **Ignoring the "boring" debt**: Missing error handling and logging aren't exciting to fix, but they cause the most 3 AM incidents.

## Verification

- [ ] Debt inventory is current and prioritized
- [ ] Top 3 items have estimated fix complexity and risk scores
- [ ] At least one debt item is being addressed per sprint/week
- [ ] Refactored code has test coverage before and after
- [ ] New debt is being tracked, not silently accumulated

## Related Skills

- [[csp-scope-guard]] — for preventing new debt from scope creep
- [[csp-code-review]] — for catching debt-creating patterns during review
- [[csp-legacy-modernization]] — when the debt is in an older codebase
- [[csp-strategy]] — for aligning debt paydown with product goals
