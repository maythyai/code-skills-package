---
name: csp-council
description: >
  Convene a four-voice council (Architect, Skeptic, Pragmatist, Critic) for
  ambiguous decisions, tradeoffs, and go/no-go calls. Fresh subagents for
  anti-anchoring. Structured verdict with consensus, strongest dissent, premise
  check, and recommendation. Use when multiple valid paths exist and you need
  structured disagreement before committing.
version: 1.0.0
layer: 3
category: patterns
phase: plan
domain: architecture
role: specialist
scope: design
tools: [Read, Write, Edit, Bash, Glob, Grep]
related_skills:
  - [[csp-brainstorming]]
  - [[csp-santa-method]]
  - [[csp-writing-plans]]

anti_rationalizations:
  "I already know the right answer": "Confidence is not correctness. The council exists to find what you're missing."
  "This will slow things down": "One wrong architectural decision costs weeks. A 10-minute council is cheap insurance."
  "I'll just ask a single reviewer": "Single reviewers share your blind spots. Four independent voices with different lenses catch different failure modes."
---

# Council — Four-Voice Decision Framework

Structured disagreement for ambiguous choices. Four independent voices, one compact verdict.

## Entry Conditions

- A decision has multiple credible paths and no obvious winner
- Trade-offs need explicit surfacing (speed vs quality, simplicity vs power)
- User asks for second opinions, dissent, or multiple perspectives
- Conversational anchoring is a real risk (you've been discussing this for a while)
- A go/no-go call would benefit from adversarial challenge

**Examples:** Monorepo vs polyrepo, ship now vs hold for polish, feature flag vs full rollout, simplify scope vs keep strategic breadth.

## When NOT to Use

| Instead of Council | Use |
|---|---|
| Verifying whether output is correct | [[csp-santa-method]] |
| Breaking a feature into implementation steps | [[csp-writing-plans]] |
| Designing system architecture from scratch | [[csp-tech-solution-design]] |
| Reviewing code for bugs | [[csp-code-review]] |
| Straight factual questions | Just answer directly |

## The Four Voices

| Voice | Lens | Signature Question |
|-------|------|-------------------|
| **Architect** | Correctness, maintainability, long-term implications | "Will this still make sense in 18 months?" |
| **Skeptic** | Premise challenge, simplification, assumption breaking | "Are we solving the right problem at all?" |
| **Pragmatist** | Shipping speed, user impact, operational reality | "What's the smallest thing we can ship this week?" |
| **Critic** | Edge cases, downside risk, failure modes | "What specific way does this fail in production?" |

The three external voices (Skeptic, Pragmatist, Critic) MUST be launched as **fresh subagents** with ONLY the question and relevant context — not the full conversation history. This is the anti-anchoring mechanism.

## Workflow — 6 Steps

### Step 1 — Extract the Real Question
Reduce the decision to one explicit prompt: what are we deciding? what constraints matter? what counts as success? If the question is vague, ask one clarifying question before convening.

### Step 2 — Gather Only Necessary Context
- **Codebase-specific**: collect relevant files, snippets, issue text, metrics. Keep it compact. Include only what's needed.
- **Strategic/general**: skip repo snippets unless they materially change the answer.

### Step 3 — Form the Architect Position First
Before reading other voices, write down: your initial position, the three strongest reasons for it, the main risk in your preferred path. Do this first so your synthesis doesn't just mirror the external voices.

### Step 4 — Launch Three Independent Voices in Parallel

Each subagent gets:
- Decision question
- Compact context (if needed)
- Strict role — no hedging, under 300 words

**Skeptic prompt shape:**
```
You are the SKEPTIC on a decision council. Challenge framing, question assumptions,
propose the simplest credible alternative.

Question: {decision_question}
Context: {compact_context}

Respond: 1. Position (1-2 sentences). 2. Reasoning (3 bullets).
3. Risk (biggest risk). 4. Surprise (one thing others may miss).
Be direct. No hedging.
```

**Pragmatist prompt shape:**
```
You are the PRAGMATIST. Optimize for speed, simplicity, and real-world execution.

Question: {decision_question}
Context: {compact_context}

Respond: 1. Position (1-2 sentences). 2. Reasoning (3 bullets).
3. Risk. 4. Surprise. Be direct. Under 300 words.
```

**Critic prompt shape:**
```
You are the CRITIC. Surface downside risk, edge cases, and reasons this could fail.

Question: {decision_question}
Context: {compact_context}

Respond: 1. Position (1-2 sentences). 2. Reasoning (3 bullets).
3. Risk (biggest failure mode). 4. Surprise. Be direct. Under 300 words.
```

### Step 5 — Synthesize with Bias Guardrails

Rules:
- Do NOT dismiss an external view without explaining why
- If an external voice changed your recommendation, say so explicitly
- ALWAYS include the strongest dissent, even if rejected
- If two voices align against your initial position, treat that as a real signal
- Keep raw positions visible before the verdict

### Step 6 — Present Compact Verdict

```markdown
## Council: [short decision title]

**Architect:** [1-2 sentence position] — [1-line why]
**Skeptic:** [1-2 sentence position] — [1-line why]
**Pragmatist:** [1-2 sentence position] — [1-line why]
**Critic:** [1-2 sentence position] — [1-line why]

### Verdict
- **Consensus:** [where they align]
- **Strongest dissent:** [most important disagreement]
- **Premise check:** [did Skeptic challenge the question itself?]
- **Recommendation:** [the synthesized path]
```

Keep it scannable on a phone screen.

## Multi-Round Follow-up

Default is one round. For another round: keep the new question focused, include previous verdict only if necessary, keep the Skeptic as clean as possible (anti-anchoring).

## Anti-Patterns

- Using council for code review — use [[csp-santa-method]]
- Using council for pure implementation tasks — just do the work
- Feeding subagents the entire conversation transcript — context pollution defeats anti-anchoring
- Hiding disagreement in the final verdict — dissent must be visible
- Persisting every decision as a permanent note regardless of importance

## Persistence Rule

Only persist a decision when it changes something real: update the ADR ([[csp-spec-adr]]), record in roadmap, or log to project memory. Do NOT write ad-hoc notes to shadow paths.

## Related Skills

- [[csp-brainstorming]] — Divergent ideation before narrowing with Council
- [[csp-santa-method]] — Adversarial verification for output quality (Council is for decisions, Santa is for verification)
- [[csp-spec-adr]] — Persist council decisions as Architecture Decision Records
- [[csp-writing-plans]] — Execute the council's recommendation as an implementation plan