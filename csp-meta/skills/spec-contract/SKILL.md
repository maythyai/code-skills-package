---
name: csp-spec-contract
description: Transform ideas, requirements, or discussions into CSP SPEC contracts with traceable requirements and acceptance criteria. Use when formalizing requirements, generating CSPEC inputs, or validating spec completeness. Triggers on "spec", "specification", "contract", "formalize requirements".
layer: 1
origin: csp-native
category: meta
version: "2.0.0"
phase: define
domain: quality
role: guardian
scope: design
model: sonnet
tools: [Read, Write, Edit, Glob, Grep]
---
------|------|
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
