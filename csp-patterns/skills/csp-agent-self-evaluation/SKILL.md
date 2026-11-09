---
name: csp-agent-self-evaluation
description: >
  After completing any non-trivial task, self-rate output on 5 axes (accuracy,
  completeness, clarity, actionability, conciseness) with concrete evidence per
  criterion. Produces a structured 1-5 scorecard with specific improvement
  suggestions. Use after multi-file implementations, debugging sessions, design
  docs, or when the user asks "how good was that?"
version: 1.0.0
layer: 3
category: patterns
phase: verify
domain: quality
role: reviewer
scope: review
tools: [Read, Write, Edit, Bash, Glob, Grep]
related_skills:
  - [[csp-code-review]]
  - [[csp-verification]]
  - [[csp-santa-method]]

anti_rationalizations:
  "Everything is a 5": "No evidence cited — self-congratulation, not evaluation. Cite specific gaps."
  "The task was simple, no need to evaluate": "Simple tasks benefit from crispness checks. A 3-line fix can legitimately score 5/5/5/5/5 — score it."
  "I don't need to check, the tests passed": "Tests passing doesn't mean the output is clear, concise, or complete. Evaluate all axes."
---

# Agent Self-Evaluation

Task-completion quality reflection using a structured 5-axis rubric. Every score below 5 must cite specific evidence — "show the gap, don't just name it."

## Entry Conditions

- Completed a task spanning 3+ files or 50+ lines
- Finished a multi-step workflow (implement, test, review)
- Finished a debugging session with 3+ attempts
- Produced a design document, architecture decision, or written analysis
- User asks "how good was that?" or "rate your work"
- User explicitly says don't evaluate — skip

## The 5 Evaluation Axes

| Axis | Question | What it catches |
|------|----------|-----------------|
| **Accuracy** | Are the facts, claims, and outputs correct? | Hallucinations, wrong API names, incorrect syntax, false statements |
| **Completeness** | Did it cover everything asked for? | Missed edge cases, unhandled error paths, forgotten requirements |
| **Clarity** | Is it understandable and well-structured? | Confusing explanations, undefined jargon, rambling, wall-of-text |
| **Actionability** | Can the user act immediately? | Vague suggestions, missing steps, no verification path |
| **Conciseness** | Minimum words needed? | Redundancy, over-explanation, filler content |

## Scoring Scale

| Score | Meaning |
|-------|---------|
| **5** | Exceptional — no reasonable improvement possible |
| **4** | Good — minor nits only, no substantive gaps |
| **3** | Adequate — meets request but has a notable weakness on one axis |
| **2** | Weak — clear gap affecting usability or correctness |
| **1** | Poor — fundamentally misses the request or contains significant errors |

## The Evidence Rule

**Every score below 5 MUST cite concrete evidence.** A score of 3 cannot just say "could be better" — it must say exactly what's missing or wrong.

## Workflow

### Step 1 — Collect Raw Material
- Original user request
- Your final response/output
- Tool outputs verifying correctness (test results, exit codes, lint output)
- Any user feedback received

### Step 2 — Score Each Axis Independently
Work through the 5 axes one at a time. Do NOT average first and work backwards.

### Step 3 — Produce the Report
One-line summary → 5-axis scorecard with evidence → overall score (average, rounded to 1 decimal) → 1-3 specific improvements ranked by impact → self-check "Would the user agree?"

### Step 4 — Apply Improvement Action

| Overall Score | Action |
|--------------|--------|
| ≥ 4.5 | Deliver as-is. No changes needed. |
| 3.5–4.4 | Flag top improvement but deliver. Fix if &lt;30 seconds. |
| 2.5–3.4 | State what you'd change. Ask user: "Redo [axis] or deliver?" |
| &lt; 2.5 | Do NOT deliver. "This scored [X] because [evidence]. Let me redo with [fix]." Then redo. |

## Scoring Anchors

### Accuracy Anchors
- **5**: All facts verified against tool output, docs, or authoritative sources
- **4**: One minor inaccuracy that doesn't affect correctness
- **3**: One significant factual error, or 3+ minor inaccuracies
- **2**: Multiple significant errors; output would fail if followed
- **1**: Fundamentally incorrect; output contradicts itself or known facts

### Completeness Anchors
- **5**: All explicit AND implicit requirements covered; edge cases handled; error paths addressed
- **4**: All explicit requirements covered; one implicit requirement missed
- **3**: One explicit requirement missed, or 2+ implicit gaps
- **2**: Multiple explicit requirements missed; partial solution
- **1**: Misses the core request; delivers something adjacent

### Clarity Anchors
- **5**: Perfectly structured; jargon explained; visual hierarchy; no ambiguity
- **4**: Generally clear; one section could be better organized or one term undefined
- **3**: Understandable after re-reading; multiple organizational issues
- **2**: Confusing; reader needs follow-up questions
- **1**: Unintelligible or contradictory

### Actionability Anchors
- **5**: Single action required; verification path included; no implicit steps
- **4**: Single action but verification path implied, not explicit
- **3**: Multiple actions, or one action with unclear next step
- **2**: User must figure out how to use output; missing critical instructions
- **1**: Cannot be acted on without significant rework

### Conciseness Anchors
- **5**: Every sentence earns its place; no redundancy; high information density
- **4**: Minor redundancy; one paragraph could be tightened
- **3**: Noticeable redundancy; 20%+ could be removed
- **2**: Significantly bloated; 40%+ is filler
- **1**: More filler than substance

## Quick Reference: Scoring Triggers

| Trigger | Axis | Max Score |
|---------|------|-----------|
| "should work" / "probably fine" | Accuracy | ≤ 4 |
| "I think" / "I believe" | Accuracy | ≤ 4 |
| No test output cited | Accuracy | ≤ 4 |
| "TODO" / "FIXME" left behind | Accuracy, Completeness, Actionability | ≤ 3 each |
| Missing error handling | Completeness | ≤ 3 |
| Only happy path covered | Completeness | ≤ 3 |
| Wall-of-text (&gt;200 words without break) | Clarity | ≤ 3 |
| No headings or structure | Clarity | ≤ 3 |
| "You should..." without specifics | Actionability | ≤ 3 |
| No PR or file created | Actionability | ≤ 3 |
| User needs to figure out next step | Actionability | ≤ 2 |
| Repeated points (3+ times) | Conciseness | ≤ 3 |
| Output &gt;15× longer than task | Conciseness | ≤ 3 |

## Edge Case Rules

- **Unclear instructions**: Do NOT penalize completeness. Note: "User's request was ambiguous about [scope]. I chose [interpretation]. If they meant [alternative], this score would drop to [X]."
- **Inherently simple task**: A 3-line bug fix can legitimately score 5/5/5/5/5. Rubric scales with complexity.
- **Caught your own error mid-task**: That's a 5 on Accuracy for the final output. Evaluation is about what the user received.
- **Tool output contradicts your claim**: Automatic Accuracy ≤ 2. Tool output is ground truth.
- **Mid-workflow intermediate step**: Skip evaluation — only evaluate completed deliverables.

## Anti-Patterns

- **"Everything is a 5"** — self-congratulation, not evaluation. No evidence = not a real score.
- **Over-penalizing for scope creep** — evaluating against things user didn't request
- **Re-litigating decisions** — re-arguing design choices instead of evaluating the output
- **Mixing preference with gaps** — "I don't like decorators" is not a clarity issue; cite concrete readability/testability concerns

## Verification

After self-evaluation: confirm overall score matches individual axis scores, all scores below 5 have evidence cited, improvement actions align with score thresholds, and the evaluation would be defensible if shown to a third party.

## Related Skills

- [[csp-code-review]] — Code-level review (self-evaluation covers output quality, not code correctness)
- [[csp-verification]] — Build/lint/test verification (run BEFORE self-evaluation)
- [[csp-santa-method]] — Independent dual review for critical output (self-evaluation is a complement, not replacement)