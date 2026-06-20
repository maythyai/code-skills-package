---
name: csp-mvp-scoping
description: >
  Cut a product idea down to the smallest shippable version that validates the
  core hypothesis. Use when facing a long feature wishlist, when planning a new
  product or feature, or when scope needs to be reduced to ship within a deadline.
layer: 1
category: meta
phase: define
domain: architecture
scope: design
tools: [Read, Write, Glob, Grep]
related_skills: [csp-scope-guard, csp-strategy, csp-brainstorming, csp-plan-phase]
anti_rationalizations:
  "We need all these features to be competitive": "Ship one feature and learn. Competitors ship faster because they cut more."
  "Users will expect this on day one": "Users don't know what they want until they use something. Ship and iterate."
  "It's harder to add later": "Adding to a working product is easier than debugging a bloated one that never shipped."
  "This is the minimum": "If you can't describe why each feature is essential, it isn't."
---

# MVP Scoping

Reduce a product idea to the smallest shippable increment that validates the core hypothesis.

## When to Use

- You have a list of 10+ features and don't know where to start
- A project timeline is slipping and scope needs to be cut
- You're building a new product and need to define the first release
- A stakeholder is pushing for "just one more feature" before launch
- You want to validate a hypothesis with minimal engineering effort

## When NOT to Use

- The product is already launched and this is an iteration (use sprint planning instead)
- A compliance or security requirement is non-negotiable (those aren't scope — they're constraints)
- The team has already agreed on scope and is in execution mode

## The MVP Scoping Framework

### Step 1: State the Hypothesis

Write a single sentence: "We believe that [user] needs [capability] to solve [problem]. We'll know we're right when [measurable signal]."

Example: "We believe that freelance designers need automated invoice tracking to reduce time spent on billing. We'll know we're right when 30% of beta users generate 5+ invoices in the first month."

### Step 2: List All Desired Features

Dump every feature, nice-to-have, and "we should also" into a flat list. No filtering yet.

### Step 3: Classify Each Feature

| Classification | Definition | MVP Decision |
|----------------|------------|--------------|
| **Core** | Without this, the hypothesis cannot be tested | Include |
| **Enabling** | Required for core to function (auth, data storage) | Include minimal version |
| **Nice-to-have** | Improves experience but doesn't validate hypothesis | Defer |
| **Speculative** | "Users might want this someday" | Kill or park |

### Step 4: Apply the "Remove One" Test

For each feature classified as Core, ask: "If I remove this, can I still test the hypothesis?" If yes, reclassify as Enabling or Nice-to-have.

### Step 5: Define the MVP Boundary

Write the MVP scope as: "Version 1 does: [3-5 features]. Version 1 does NOT do: [explicit exclusions]."

The explicit exclusions list is critical — it prevents scope creep by making deferrals visible.

## Decision Heuristics for Solo Developers

- **Time-box**: An MVP for a solo developer should be shippable in 2-4 weeks. If your estimate is longer, cut more.
- **The "manual first" rule**: If a feature can be done manually for the first 10 users, automate it later.
- **The "ugly but working" rule**: Visual polish is almost always nice-to-have. Functional correctness is core.
- **The "single user flow" rule**: Your MVP should serve one user persona doing one primary task. Multi-persona is V2.

## Key Principles

- **The MVP is an experiment, not a product** — its purpose is to learn, not to impress.
- **Exclusions are more important than inclusions** — what you explicitly don't build prevents scope creep.
- **Ship to learn** — code that hasn't shipped teaches you nothing about user behavior.
- **Perfect is the enemy of shipped** — a working 70% solution in users' hands beats a perfect 100% solution in your repo.

## Anti-Patterns

- **The "feature-complete" MVP**: If your MVP has 15 features, it's not an MVP. It's a delayed launch.
- **The "just the backend" MVP**: An MVP must be testable by users. A backend-only release validates nothing.
- **The "polish before launch" trap**: Refactoring before your first user is premature optimization.
- **The "everyone's MVP is different"**: If the team can't agree on the hypothesis, you can't agree on the MVP. Align on Step 1 first.

## Verification

- [ ] Is the hypothesis stated in one sentence with a measurable success signal?
- [ ] Are there 3-5 (not 10-15) features in the MVP scope?
- [ ] Is there an explicit "NOT doing" list with at least 3 deferred features?
- [ ] Can a solo developer ship this in 2-4 weeks?
- [ ] Would a real user be able to complete the core task with this MVP?

## Related Skills

- [[csp-scope-guard]] — when scope starts creeping after the MVP is defined
- [[csp-strategy]] — when the MVP needs to align with longer-term product direction
- [[csp-brainstorming]] — when the feature list needs to be generated before scoping
- [[csp-plan-phase]] — when the MVP scope is agreed and needs implementation planning
