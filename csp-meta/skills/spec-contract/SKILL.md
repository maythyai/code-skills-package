---
name: csp-spec-contract
description: Transform ideas, requirements, or discussions into CSP SPEC contracts with traceable requirements and acceptance criteria. Use when formalizing requirements, generating CSPEC inputs, or validating spec completeness. Triggers on "spec", "specification", "contract", "formalize requirements".
csp-layer: 1-meta
csp-source: csp-native
---

# Spec Contract Generator

## Overview

Converts unstructured input into **CSP SPEC contracts** that feed `/csp-spec-phase`, `/csp-planning-phase`, or phase CSPEC files under `.planning/`.

Distinct from `csp-source-driven-development` (official doc grounding) and `csp-spec-driven-development` (full methodology).

## When to Use

- Bullet points, user stories, or meeting notes needing structure
- Planning phase needs a formal requirements artifact
- Existing docs need gap analysis and SPEC normalization
- Multi-agent review needs a structured input document

## Output Structure

```markdown
# SPEC: [Feature Name]

## Metadata
- Version: 1.0.0
- Status: Draft | Review | Locked
- Phase: [optional phase number]
- Last Updated: YYYY-MM-DD

## Overview
[One paragraph — what this SPEC defines and why]

## Requirements

### Functional (FR-xxx)
- FR-001: [Testable requirement using SHALL/MUST]

### Non-Functional (NFR-xxx)
- NFR-001: [Performance, security, scalability constraint]

## Acceptance Criteria (AC-xxx)
- AC-001: Given [context] When [action] Then [outcome]

## Boundaries
### In Scope
- ...

### Out of Scope
- ... (with brief reason)

## Dependencies
- DEP-001: [Internal or external dependency]

## Technical Constraints
- TC-001: [Platform, integration, or compatibility constraint]
```

## Generation Process

1. **Parse** — Extract goals, constraints, implied requirements
2. **Classify** — Functional, non-functional, constraints
3. **Falsify** — Rewrite vague language into pass/fail criteria
4. **Bound** — Explicit in-scope / out-of-scope lists (mandatory)
5. **Validate** — Quality gates below
6. **Place** — Write to `.planning/phases/{phase}/{phase}-CSPEC.md` or hand off to `/csp-spec-phase`

## Quality Gates

| Gate | Rule |
|------|------|
| Completeness | All sections present; boundaries non-empty |
| Testability | Every FR has ≥1 AC; no "should/might/could" in requirements |
| Consistency | No contradictions between FR and boundaries |
| Traceability | Each requirement maps to a source |
| Feasibility | Constraints achievable with stated stack |

## Templates

`csp-workflow/templates/change-artifacts/`: `proposal.md`, `spec.md`, `design.md`, `tasks.md`

## Integration

- **Router triggers:** `spec`, `specification`, `contract`, `formalize`
- **Downstream:** `/csp-spec-phase` → `/csp-discuss-phase` → `/csp-plan-phase`
- **Review:** `csp-party-mode`, `csp-review-adversarial`, `csp-review-edge-case`

## Red Flags

- Specs without explicit boundaries
- Acceptance criteria requiring human judgment ("nice UX")
- Copying input verbatim without falsification pass
- SPEC files outside `.planning/` with no phase linkage
