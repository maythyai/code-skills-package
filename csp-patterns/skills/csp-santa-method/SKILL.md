---
name: csp-santa-method
description: >
  Multi-agent adversarial verification: two independent reviewers with the same
  rubric must both pass before output ships. Fix-and-re-review convergence loop
  (3-iteration max) with human escalation cap. Use when gating publishing,
  production deploys, compliance or brand-sensitive content, or
  hallucination-prone claims. Complements build/test/lint pipelines with
  semantic adversarial checks.
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
  - [[csp-agent-self-evaluation]]
  - [[csp-council]]

anti_rationalizations:
  "One reviewer is enough": "A single agent reviewing its own output shares the same biases and systematic errors. Two independent reviewers break this failure mode."
  "This is too simple for dual review": "If it ships to users, it deserves verification. Rubric scales with complexity — simple output gets simple pass/fail checks."
  "Dual review costs too much": "A production bug costs far more. Batch sampling reduces cost to 15-20% while catching >90% of systematic issues."
---

# Santa Method — Dual Adversarial Review

Two independent reviewers. Same rubric. Both must pass. No exceptions.

## Core Insight

A single agent reviewing its own output shares the same biases, knowledge gaps, and systematic errors that produced the output. Two independent reviewers with no shared context break this failure mode.

## Entry Conditions

- Output will be published, deployed, or consumed by end users
- Compliance, regulatory, or brand constraints enforced
- Code ships to production without human review
- Content accuracy matters (docs, educational material, customer-facing copy)
- Batch generation at scale where spot-checking misses systemic patterns
- Hallucination risk is elevated (claims, statistics, API references, legal language)

## Do NOT Use For

Internal drafts, exploratory research, or tasks with deterministic verification (use build/test/lint pipelines).

## Workflow — 4 Phases

### Phase 1: Make a List (Generate)
Execute the primary task normally. Santa Method is a post-generation verification layer — it wraps the output, not the generation process.

### Phase 2: Check It Twice (Independent Dual Review)
Spawn two review subagents in **parallel**. Four critical invariants:

1. **Context isolation** — neither reviewer sees the other's assessment (fresh subagents, no conversation history)
2. **Identical rubric** — both receive the same evaluation criteria
3. **Same inputs** — both receive original spec AND generated output
4. **Structured output** — each returns typed JSON verdict, not prose

**Reviewer prompt template:**
```
You are an independent quality reviewer. You have NOT seen any other review.

## Task Specification
{task_spec}

## Output Under Review
{output}

## Evaluation Rubric
{rubric}

## Instructions
Evaluate the output against EACH rubric criterion. For each:
- PASS: criterion fully met, no issues
- FAIL: specific issue found (cite exact problem)

Return JSON:
{
  "verdict": "PASS" | "FAIL",
  "checks": [
    {"criterion": "...", "result": "PASS|FAIL", "detail": "..."}
  ],
  "critical_issues": ["..."],
  "suggestions": ["..."]
}

Be rigorous. Your job is to find problems, not to approve.
```

### Phase 3: Naughty or Nice (Verdict Gate)
Both reviewers must PASS. No partial credit. If only one reviewer catches an issue, that issue is real — the other's blind spot is exactly the failure mode Santa Method exists to eliminate.

### Phase 4: Fix Until Nice (Convergence Loop)
- **Max 3 iterations**. After each round: fix ALL critical issues (suggestions optional)
- Re-run BOTH reviewers on fixed output with **FRESH agents** (no memory of previous rounds — anchoring bias)
- Fix instruction: "Fix ONLY the flagged issues. Do NOT refactor or add unrequested changes."
- On iteration exhaustion (3 rounds of failures): **escalate to human** with full audit trail

## Rubric Design

Every criterion must have an objective pass/fail condition.

| Criterion | Pass Condition | Failure Signal |
|-----------|---------------|----------------|
| Factual accuracy | All claims verifiable against sources or common knowledge | Invented statistics, wrong version numbers, nonexistent APIs |
| Hallucination-free | No fabricated entities, quotes, URLs, or references | Links to nonexistent pages, unattributed quotes |
| Completeness | Every requirement in spec is addressed | Missing sections, skipped edge cases, incomplete coverage |
| Compliance | Passes all project-specific constraints | Banned terms used, tone violations, regulatory non-compliance |
| Internal consistency | No contradictions within the output | Section A says X, section B says not-X |
| Technical correctness | Code compiles/runs, algorithms are sound | Syntax errors, logic bugs, wrong complexity claims |

### Domain-Specific Extensions

**Code:** Type safety (no `any` leaks, null handling), error handling coverage, security (no secrets, input validation, injection prevention), test coverage for new paths.

**Content/Marketing:** Brand voice adherence, SEO requirements met, no competitor trademark misuse, CTA present and correctly linked.

**Compliance:** No unsubstantiated claims, required disclaimers present, approved terminology only, jurisdiction-appropriate language.

## Batch Sampling (For 100+ Items)

For large-scale output: random sample 10-15% (minimum 5), categorize failures by type, apply targeted fixes to entire batch, re-sample and re-verify, continue until clean sample passes.

## Failure Modes

| Failure Mode | Symptom | Mitigation |
|---|---|---|
| Infinite loop | Reviewers keep finding new issues after fixes | Max 3 iterations; escalate |
| Rubber stamping | Both reviewers pass everything | Adversarial prompt: "Find problems, don't approve." |
| Subjective drift | Reviewers flag style preferences | Tight rubric with objective pass/fail only |
| Fix regression | Fixing A introduces B | Fresh reviewers each round catch regressions |
| Agreement bias | Both reviewers miss the same thing | Add third reviewer or human spot-check for critical output |
| Cost explosion | Too many iterations on large output | Batch sampling; budget caps per verification cycle |

## Integration Order

1. **Run deterministic checks first** — build, lint, test ([[csp-verification]])
2. **Run Santa second** — semantic, adversarial verification
3. **Self-evaluate** — optional, use [[csp-agent-self-evaluation]] for quality metrics

## Cost Model

Santa costs ~2-3× the generation token cost per verification cycle. Batch sampling reduces to ~15-20% while catching &gt;90% of systematic issues.

## Verification

After completion: confirm both reviewers returned structured JSON, verdict gate correctly applied (BOTH must pass), convergence loop did not exceed 3 iterations, human escalation path preserved with full audit trail.

## Related Skills

- [[csp-verification]] — Run deterministic checks BEFORE Santa
- [[csp-agent-self-evaluation]] — Single-agent quality self-assessment (complement, not replacement)
- [[csp-council]] — Four-voice decision council for ambiguous choices (Santa is for verification, not decision-making)
- [[csp-code-review]] — Standard code review (Santa adds adversarial dimension)