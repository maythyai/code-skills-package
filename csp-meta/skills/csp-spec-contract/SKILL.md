---
name: csp-spec-contract
description: Transform ideas, requirements, or discussions into CSP SPEC contracts with traceable requirements and acceptance criteria. Use when formalizing requirements, generating CSPEC inputs, or validating spec completeness. Triggers on "spec", "specification", "contract", "formalize requirements".
layer: 1
origin: csp-native
category: meta
phase: define
domain: quality
scope: design
tools: [Read, Write, Edit, Glob, Grep]
---

| Criterion | Rule |
|-----------|------|
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

## Process

1. **Extract requirements:** Parse the input (idea, discussion, doc) into discrete functional requirements (FRs). Each FR must be a single, testable statement — no compound "and/or" requirements.
2. **Define boundaries:** For each FR, state explicitly what is in scope and what is out of scope. Boundaries prevent scope creep and rationalization ("we'll handle that later").
3. **Write acceptance criteria:** Attach 1+ falsifiable AC to each FR. Use Given/When/Then or assertion format. If you can't write a test for it, the requirement is too vague — refine it.
4. **Map traceability:** Link each FR back to its source (stakeholder quote, ticket, design decision). Untraceable requirements are assumptions — flag them.
5. **Run falsification pass:** Re-read every requirement and ask: "Could a reasonable person argue this is NOT satisfied?" If yes, tighten the wording. Eliminate "should", "might", "could", "approximately".

## Template

```markdown
# Spec Contract: [Feature Name]

## Context
- **Source:** [link or reference to originating discussion/ticket]
- **Stakeholders:** [who cares about this]
- **Date:** [YYYY-MM-DD]

## Functional Requirements

### FR-1: [Short name]
- **Description:** [Single testable statement]
- **Source:** [traceability link]
- **Acceptance Criteria:**
  - [ ] Given X, when Y, then Z
  - [ ] [Additional AC]
- **Boundaries:**
  - In scope: [what this covers]
  - Out of scope: [what this explicitly does NOT cover]

## Non-Functional Constraints
- **Stack:** [technology constraints]
- **Performance:** [measurable targets, e.g. p99 < 200ms]

## Open Questions
- [ ] [Unresolved items that block finalization]
```

## Verification

Before handing off the spec, run this checklist:

- [ ] Every FR has at least one acceptance criterion
- [ ] No FR contains "should", "might", "could", or "approximately"
- [ ] Boundaries section is non-empty for every FR
- [ ] Every FR maps to a traceable source
- [ ] No contradictions between FRs and boundary statements
- [ ] Open questions are listed and assigned, not silently ignored
