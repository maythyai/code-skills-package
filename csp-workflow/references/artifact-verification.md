# Artifact Verification Reference

Three-dimension verification for CSP spec-driven work. Use with `/csp-verify-phase`, `/csp-verify-work`, and verification-before-completion.

## Dimensions

### 1. Completeness

**Question:** Is everything specified actually built?

| Check | Method |
|-------|--------|
| All tasks checked or explained | Audit `tasks.md` / PLAN checkboxes |
| All FR/NFR addressed | Requirement → file/test trace matrix |
| Scenarios covered | Each scenario has matching test or manual proof |
| Out-of-scope respected | Grep for forbidden patterns in boundaries |

**CRITICAL if:** A locked requirement has zero implementation evidence.

### 2. Correctness

**Question:** Does the implementation match spec intent?

| Check | Method |
|-------|--------|
| Behavior matches scenarios | Run tests; walk through WHEN/THEN manually |
| Edge cases from spec | Failure analyst scenarios from CSPEC |
| API/data contracts | Types, schema, OpenAPI match design |
| Error paths | Specified failure modes implemented |

**CRITICAL if:** Happy path works but spec-defined error behavior missing.

### 3. Coherence

**Question:** Do design decisions appear consistently in code?

| Check | Method |
|-------|--------|
| Single pattern per concern | No mixed abstractions for same job |
| Design doc decisions reflected | Each Decision traceable to code |
| Naming and structure | Matches project conventions |
| No orphan experiments | Spike code removed or integrated |

**WARNING if:** Two valid patterns coexist without documented reason.

## Report Format

```markdown
# Verification Report — [Phase/Feature]

## Summary
- Completeness: PASS | FAIL (N gaps)
- Correctness: PASS | FAIL (N mismatches)
- Coherence: PASS | WARN (N inconsistencies)

## Findings

### CRITICAL
- [C1] Requirement FR-003 not implemented

### WARNING
- [W1] Design chose Redis cache; code uses in-memory only

### SUGGESTION
- [S1] Add integration test for AC-002 scenario
```

## Severity Rules

| Severity | Blocks ship? | Action |
|----------|--------------|--------|
| CRITICAL | Yes | Fix before `/csp-ship` |
| WARNING | No | Fix or document rationale in VERIFICATION.md |
| SUGGESTION | No | Backlog or optional follow-up |

## Goal-Backward + Three-Dimension

CSP verify-phase uses goal-backward analysis (must-haves, artifacts, key links) as primary structure. Apply three dimensions within each must-have:

1. Must-have exists? → Completeness
2. Must-have behaves correctly? → Correctness
3. Must-have fits architecture? → Coherence

Task completion ≠ verification success.
