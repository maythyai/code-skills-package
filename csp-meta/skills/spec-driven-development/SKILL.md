---
name: csp-spec-driven-development
description: CSP-native spec-driven methodology integrated with CSP phase workflows. Use when formalizing requirements before implementation, managing brownfield requirement deltas, or verifying artifact-to-code alignment. Triggers on "spec-driven", "规范驱动", "write spec before code", "delta requirements".
csp-layer: 1-meta
csp-source: csp-native
---

# Spec-Driven Development (CSP)

## Overview

CSP treats specifications as the contract between intent and implementation — but routes them through the **CSP phase workflow** (`.planning/`) rather than a separate tooling layer. Specs live where phases live; verification uses the same gates as `/csp-verify-phase`.

**Core principle:** Write falsifiable requirements before code. Verify implementation against those requirements in three dimensions — not just "tests pass."

## When to Use

- Starting a feature that needs explicit requirements before planning
- Brownfield changes where existing behavior must be preserved or migrated
- AI-assisted implementation where artifact drift is a risk
- User asks for "spec first", "规范驱动", or formal change proposals

**When NOT to use:**

- Trivial one-line fixes (use `/csp-quick` or direct implementation)
- Exploratory spikes (use `/csp-spike` first, spec afterward if validated)
- Pure documentation updates with no behavioral contract

## CSP Workflow Mapping

Artifact chains are absorbed into CSP phases — no external spec tooling layer:

| Intent | CSP Command | Primary Artifact |
|--------|-------------|------------------|
| Clarify what to build | `/csp-spec-phase` | `{phase}-CSPEC.md` |
| Discuss how to build | `/csp-discuss-phase` | Discussion notes → PLAN inputs |
| Plan implementation | `/csp-plan-phase` | `{phase}-PLAN.md` + tasks |
| Execute tasks | `/csp-execute-phase` | Code + `{plan}-SUMMARY.md` |
| Verify alignment | `/csp-verify-phase` | `VERIFICATION.md` |
| Ship / archive | `/csp-ship` | PR + milestone archive |

**Quick change path** (single feature, no full milestone):

```
/csp-planning-phase  →  proposal + requirements in .planning/
/csp-solutioning-phase  →  design + task breakdown
/csp-implementation-phase  →  implement with checkbox tracking
/csp-verify-phase  →  three-dimension check
/csp-ship
```

Templates: `csp-workflow/templates/change-artifacts/`

## Artifact Dependency Graph

Create artifacts in dependency order:

```
Proposal (why + scope)
    ↓
Requirements / CSPEC (what — falsifiable)
    ↓
Design (how — decisions + trade-offs)
    ↓
Tasks (ordered checkboxes)
    ↓
Implementation
    ↓
Verification (evidence-backed)
```

**Rule:** Never skip a layer for non-trivial work. If design is trivial, write a one-paragraph design stub — don't omit the file.

## Delta Requirements (Brownfield)

When modifying existing behavior, use **delta sections** in spec files:

```markdown
## ADDED Requirements
### Requirement: User can export data
...

## MODIFIED Requirements
### Requirement: Login session timeout
(full updated requirement block — copy entire original, then edit)

## REMOVED Requirements
### Requirement: Legacy export endpoint
**Reason:** Replaced by v2 API
**Migration:** Use POST /api/v2/export
```

**Merge discipline:**

1. Locate canonical requirement in `.planning/specs/` or phase CSPEC
2. For MODIFIED: paste **full** requirement block before editing
3. After phase ships, fold deltas into canonical spec during milestone archive

## Three-Dimension Verification

Use alongside goal-backward verification in `/csp-verify-phase`:

| Dimension | Question | Evidence |
|-----------|----------|----------|
| **Completeness** | Every requirement and task addressed? | Checkbox audit, requirement trace matrix |
| **Correctness** | Implementation matches spec intent? | Code search, test results, scenario walkthrough |
| **Coherence** | Design decisions reflected consistently? | Pattern scan, no contradictory approaches |

Severity: **CRITICAL** (blocks ship) / **WARNING** (document) / **SUGGESTION** (optional).

See `csp-workflow/references/artifact-verification.md`.

## Integration

| Skill | Role |
|-------|------|
| `csp-spec-contract` | Generate formal SPEC documents from raw input |
| `csp-source-driven-development` | Ground implementation in official docs after spec is locked |
| `csp-interview-me` | Extract intent when requirements are underspecified |
| `csp-brainstorming` | Explore options before locking CSPEC |
| `csp-party-mode` | Multi-agent review of specs before planning |

## Red Flags

- Writing code before any written requirement exists
- MODIFIED requirements with partial content
- Subjective acceptance criteria
- Spec artifacts disconnected from `.planning/` phase files

## Verification Checklist

- [ ] Requirements are falsifiable (pass/fail acceptance criteria)
- [ ] Boundaries explicit: in-scope vs out-of-scope lists
- [ ] Tasks use `- [ ]` checkbox format
- [ ] Three-dimension verification run with evidence cited
- [ ] Delta specs merged into canonical location if brownfield change
