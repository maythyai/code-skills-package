---
name: csp-brainstorming
description: >
  Collaborative design partner that turns raw ideas into fully formed specs.
  Combines structured divergent-convergent ideation with interactive design dialogue.
  Use before any creative work — creating features, building components, adding functionality,
  or modifying behavior. Includes idea refinement, assumption surfacing, and approach exploration.
csp-layer: 1-meta
csp-source: merged(CSP+agent-skills)
---

# Brainstorming

Help turn ideas into fully formed designs and specs through natural collaborative dialogue. Combines structured divergent-convergent ideation with interactive design exploration.

## HARD GATE

Do NOT invoke any implementation skill, write any code, scaffold any project, or take any implementation action until you have presented a design and the user has approved it. This applies to EVERY project regardless of perceived simplicity.

## Anti-Pattern: "This Is Too Simple To Need A Design"

Every project goes through this process. "Simple" projects are where unexamined assumptions cause the most wasted work. The design can be short (a few sentences for truly simple projects), but you MUST present it and get approval.

## When to Use

**Always before:**
- Creating features or building components
- Adding functionality or modifying behavior
- Starting a new project or sub-project
- Refining a vague idea into something buildable

**Trigger phrases:** "Let's brainstorm", "I have an idea", "Help me design", "Refine this idea", "Ideate on", "Stress-test my plan"

## Checklist

Complete in order:

1. **Explore project context** — check files, docs, recent commits
2. **Offer visual companion** (if visual questions ahead)
3. **Ask clarifying questions** — one at a time
4. **Propose 2-3 approaches** — with trade-offs and recommendation
5. **Present design** — get user approval
6. **Write design doc** — save and commit
7. **Spec self-review** — check for placeholders, contradictions, ambiguity
8. **User reviews written spec** — get approval
9. **Transition to implementation** — invoke writing-plans skill

## Process

### Phase 1: Understand & Expand (Divergent)

**Goal:** Take the raw idea and open it up.

1. **Restate the idea** as a crisp "How Might We" problem statement.

2. **Ask 3-5 sharpening questions** — no more:
   - Who is this for, specifically?
   - What does success look like?
   - What are the real constraints?
   - What's been tried before?
   - Why now?

3. **Generate 5-8 idea variations** using these lenses:
   - **Inversion:** "What if we did the opposite?"
   - **Constraint removal:** "What if budget/time/tech weren't factors?"
   - **Audience shift:** "What if this were for [different user]?"
   - **Combination:** "What if we merged this with [adjacent idea]?"
   - **Simplification:** "What's the version that's 10x simpler?"
   - **10x version:** "What would this look like at massive scale?"

**For deeper exploration, apply one of these structured frameworks:**

| Framework | Best For | How |
|-----------|----------|-----|
| **SCAMPER** | Transform existing solutions | Substitute, Combine, Adapt, Modify/Magnify, Put to other uses, Eliminate, Rearrange/Reverse |
| **Six Thinking Hats** | Multi-perspective decisions | White (facts), Red (intuition), Black (caution), Yellow (optimism), Green (creativity), Blue (process) |
| **Reverse Brainstorming** | Troubleshooting | "How could we cause this problem?" then reverse each cause into a solution |
| **Mind Mapping** | Complex/interconnected problems | Central concept → main themes → sub-ideas, with visual cross-links |

**If in a codebase:** Use Glob, Grep, Read to scan for relevant context. Ground variations in what actually exists.

### Phase 2: Evaluate & Converge

1. **Cluster** ideas that resonated into 2-3 distinct directions.

2. **Stress-test** each direction:
   - **User value:** Painkiller or vitamin?
   - **Feasibility:** Technical and resource cost?
   - **Differentiation:** Would someone switch from their current solution?

3. **Surface hidden assumptions:**
   - What you're betting is true (but haven't validated)
   - What could kill this idea
   - What you're choosing to ignore (and why that's okay for now)

**Be honest, not supportive.** If an idea is weak, say so with kindness.

### Phase 3: Design & Ship

Present the design in sections scaled to complexity:
- Architecture, components, data flow, error handling, testing
- Ask after each section whether it looks right

**Design for isolation and clarity:**
- Break into units with one clear purpose each
- Well-defined interfaces between units
- Each unit understandable and testable independently

**Produce a concrete artifact:**

```markdown
# [Feature Name]

## Problem Statement
[One-sentence "How Might We" framing]

## Recommended Approach
[The chosen direction and why — 2-3 paragraphs max]

## Key Assumptions to Validate
- [ ] [Assumption 1 — how to test it]
- [ ] [Assumption 2 — how to test it]

## MVP Scope
[Minimum version that tests the core assumption]

## Not Doing (and Why)
- [Thing 1] — [reason]
- [Thing 2] — [reason]

## Open Questions
- [Question that needs answering before building]
```

**The "Not Doing" list is arguably the most valuable part.** Focus is about saying no to good ideas.

## Advanced Frameworks (from CSP)

When deeper structured ideation is needed, apply these frameworks:

| Framework | Best For | How |
|-----------|----------|-----|
| **SCAMPER** | Transform existing solutions | **S**ubstitute, **C**ombine, **A**dapt, **M**odify, **P**ut to other uses, **E**liminate, **R**earrange/Reverse |
| **Six Thinking Hats** | Multi-perspective decisions | White (facts), Red (intuition/emotion), Black (caution), Yellow (optimism), Green (creativity), Blue (process) |
| **Mind Mapping** | Complex/interconnected problems | Central concept → main themes → sub-ideas, with visual cross-links |
| **Reverse Brainstorming** | Troubleshooting | "How could we cause this problem?" then reverse each cause into a solution |
| **How Might We (HMW)** | Solution-oriented reframing | "How might we [achieve X]?" — turns problems into opportunity statements |

## Key Principles

- **One question at a time** — Don't overwhelm with multiple questions
- **Multiple choice preferred** — Easier to answer than open-ended
- **YAGNI ruthlessly** — Remove unnecessary features from all designs
- **Explore alternatives** — Always propose 2-3 approaches before settling
- **Incremental validation** — Present design, get approval before moving on
- **Be flexible** — Go back and clarify when something doesn't make sense

## Visual Companion

When upcoming questions will involve visual content (mockups, layouts, diagrams), offer the companion once for consent:

> "Some of what we're working on might be easier to explain if I can show it to you in a web browser. Want to try it?"

This offer MUST be its own message — don't combine it with clarifying questions.

Per-question decision: **would the user understand this better by seeing it than reading it?**

## Spec Self-Review

After writing the spec:
1. **Placeholder scan:** Any "TBD", "TODO", incomplete sections? Fix them.
2. **Internal consistency:** Do sections contradict each other?
3. **Scope check:** Focused enough for a single implementation plan?
4. **Ambiguity check:** Could any requirement be interpreted two ways?

Fix inline, then ask user to review.

## Anti-Patterns to Avoid

- Don't generate 20+ ideas — 5-8 well-considered variations beat 20 shallow ones
- Don't be a yes-machine — push back on weak ideas
- Don't skip "who is this for" — every good idea starts with a person
- Don't produce a plan without surfacing assumptions
- Don't over-engineer the process — three phases, each doing one thing well
- Don't ignore the codebase — existing architecture is a constraint and opportunity

## Red Flags

- Generating 20+ shallow variations instead of 5-8 considered ones
- Skipping the "who is this for" question
- No assumptions surfaced before committing to a direction
- Yes-machining weak ideas instead of pushing back
- Producing a plan without a "Not Doing" list
- Jumping straight to implementation without design approval

## Verification

- [ ] Clear "How Might We" problem statement exists
- [ ] Target user and success criteria are defined
- [ ] Multiple directions were explored
- [ ] Hidden assumptions are explicitly listed with validation strategies
- [ ] "Not Doing" list makes trade-offs explicit
- [ ] Output is a concrete artifact (markdown), not just conversation
- [ ] User confirmed the final direction before implementation
