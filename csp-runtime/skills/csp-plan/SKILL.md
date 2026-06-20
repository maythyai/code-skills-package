---
name: csp-plan
description: >
  Strategic planning with optional interview, consensus (Planner/Architect/Critic),
  and review modes. Auto-detects whether to interview the user or plan directly.
  Unified entry point replacing ralplan alias. Use before implementing any non-trivial work.
layer: 5
triggers: ["plan", "plan this", "let's plan", "ralplan", "review this plan"]
category: runtime
phase: plan
domain: architecture
scope: design
tools: [Read, Write, Edit, Glob, Grep, WebFetch, WebSearch]
---

| Mode | When to Use | Behavior |
|------|-------------|----------|
| **Interview** | Default for broad requests | Interactive requirements gathering |
| **Direct** | `--direct`, or detailed request | Skip interview, generate plan directly |
| **Consensus** | `--consensus`, "ralplan" | Planner → Architect → Critic loop with RALPLAN-DR |
| **Review** | `--review`, "review this plan" | Critic evaluation of existing plan |

## Flags

- `--interactive`: Enables user prompts at key decision points
- `--deliberate`: Forces deliberate mode for high-risk work (adds pre-mortem + expanded test plan)
- `--architect codex`: Use Codex for Architect pass (when CLI available)
- `--critic codex`: Use Codex for Critic pass (when CLI available)

## When to Use

- User wants to plan before implementing
- User wants structured requirements gathering for a vague idea
- User wants an existing plan reviewed
- User wants multi-perspective consensus on a plan
- Task is broad or vague and needs scoping before code

## When NOT to Use

- User wants autonomous end-to-end execution → use `autopilot`
- User wants to start coding with a clear task → use `ralph` or delegate to executor
- User asks a simple question → just answer it
- Task is a single focused fix with obvious scope → use an execution skill

## Interview Mode

1. **Classify the request**: Broad → interview mode
2. **Gather codebase facts first**: Spawn explore agent before asking user
3. **Ask one focused question** at a time using AskUserQuestion
4. **Build on answers**: Each question builds on the previous
5. **Consult Analyst** for hidden requirements, edge cases, risks
6. **Create plan** when user signals readiness

### Question Classification

| Type | Examples | Action |
|------|----------|--------|
| Codebase Fact | "What patterns exist?" | Explore first, do not ask user |
| User Preference | "Priority?", "Timeline?" | Ask user |
| Scope Decision | "Include feature Y?" | Ask user |

## Direct Mode

1. Optional brief Analyst consultation
2. Generate comprehensive work plan immediately
3. Optional Critic review if requested

## Consensus Mode (`--consensus` / "ralplan")

Iterative Planner → Architect → Critic loop until agreement.

### RALPLAN-DR Summary

Planner creates a compact summary before any review:
- **Principles** (3-5)
- **Decision Drivers** (top 3)
- **Viable Options** (≥2) with bounded pros/cons
- If only one viable option: explicit invalidation rationale for alternatives

### Deliberate Mode (high-risk)

Auto-enables when request signals: auth/security, migrations, destructive changes, production incidents, compliance/PII, public API breakage. Or force with `--deliberate`.

Adds:
- **Pre-mortem** (3 failure scenarios)
- **Expanded test plan** (unit/integration/e2e/observability)

### Consensus Steps

1. **Planner** creates initial plan + RALPLAN-DR summary
2. **User feedback** (`--interactive` only): Proceed to review / Request changes / Skip review
3. **Architect** reviews for soundness (antithesis + tradeoff + synthesis)
4. **Critic** evaluates quality (must be sequential after Architect, never parallel)
5. **Re-review loop** (max 5 iterations): Collect feedback → revise → Architect → Critic → repeat
6. **Apply improvements**: Merge accepted suggestions, add ADR section
7. **Final approval** (`--interactive` only): Approve via team (recommended) / via ralph / Compact then approve / Request changes / Reject
8. **Execute**: On approval, invoke team or ralph skill — never implement directly

### Pre-Execution Gate

Planning modes MUST NOT:
- Run mutation-oriented shell commands
- Edit source files
- Commit, push, open PRs
- Invoke execution skills
- Delegate implementation tasks

Until explicit execution approval is received.

### Gate Auto-Pass

The gate passes when it detects any concrete signal (one is enough):
- File path, issue/PR number, symbol name (camelCase/PascalCase/snake_case)
- Test runner, numbered steps, acceptance criteria, error reference
- Code block, escape prefix (`force:` or `!`)

## Review Mode

1. Read plan file
2. Evaluate via Critic
3. Return verdict: APPROVED, REVISE (with feedback), or REJECT

## Plan Output Format

Every plan includes:
- Requirements Summary
- Acceptance Criteria (testable)
- Implementation Steps (with file references)
- Risks and Mitigations
- Verification Steps
- Consensus: RALPLAN-DR summary + ADR section
- Deliberate: Pre-mortem + Expanded Test Plan

Plans saved to `.csp/plans/`. Drafts to `.csp/drafts/`.

## Final Checklist

- [ ] Plan has testable acceptance criteria (90%+ concrete)
- [ ] Plan references specific files/lines where applicable (80%+ claims)
- [ ] All risks have mitigations identified
- [ ] No vague terms without metrics ("fast" → "p99 < 200ms")
- [ ] Plan saved to `.csp/plans/`
- [ ] Consensus: RALPLAN-DR summary included
- [ ] Consensus final: ADR section included
- [ ] Deliberate: pre-mortem + expanded test plan included

## Escalation

- Stop interviewing when requirements are clear enough to plan
- In consensus: stop after 5 iterations, present best version
- If user says "just do it": output plan as `pending approval`, require explicit execution approval
- Escalate when there are irreconcilable trade-offs requiring a business decision
