---
name: csp-spec-adr
description: >
  Lightweight spec and ADR writer. Generates specifications, implementation plans,
  architectural decision records, and PRDs from natural language descriptions.
  Use when the team needs structured documentation without a heavy process tool.
metadata:
  origin: CSP
  source: awesome-copilot/skills/create-specification,create-implementation-plan,create-architectural-decision-record,prd
  globs: ["**/*.md", "**/docs/**"]
---

# Spec & ADR Writer

Generate four flavors of structured, AI-ready documentation from a natural-language prompt:

| Artifact        | When to use                                     | Output dir    |
|-----------------|-------------------------------------------------|---------------|
| Specification   | Define requirements, constraints, interfaces    | `/spec/`      |
| Implementation Plan | Break work into executable phases           | `/plan/`      |
| ADR             | Record a non-trivial architectural decision     | `/docs/adr/`  |
| PRD             | Bridge product vision → technical execution     | `/docs/prd/`  |

## Workflow

1. **Clarify intent.** Ask: what are we building/deciding, why now, and what is out of scope?
2. **Pick the artifact.** One request may produce several (e.g., PRD + ADR + plan).
3. **Interview for gaps.** Do not invent constraints — ask or mark `TBD`.
4. **Draft using the templates in `reference/templates.md`.**
5. **Save with the naming convention** listed in each template section.
6. **Summarize**: one paragraph + link to each file created.

## Quality Bar

- **Concrete over vague.** Replace "fast", "easy", "modern" with numbers, standards, or named systems.
- **Self-contained.** Define every acronym; no forward refs to missing context.
- **Machine-parseable.** Use tables, lists, and coded identifiers (`REQ-001`, `CON-001`).
- **Testable.** Every requirement has at least one acceptance criterion.
- **Traceable.** Cross-link between PRD → spec → plan → ADR when multiple artifacts exist.

## Specifications

Purpose: the *contract* for a component or system.

- File: `spec-[purpose]-[slug].md` (e.g., `spec-schema-user-events.md`).
- Purpose prefixes: `schema | tool | data | infrastructure | process | architecture | design`.
- Required sections: Introduction, Purpose & Scope, Definitions, Requirements/Constraints, Interfaces, Acceptance Criteria, Test Strategy, Rationale, Dependencies, Examples, Validation, Related.
- Use Given-When-Then for acceptance criteria wherever possible.

## Implementation Plans

Purpose: an *executable* sequence of phases for humans or AI agents.

- File: `[purpose]-[component]-[version].md` in `/plan/`.
- Purpose prefixes: `upgrade | refactor | feature | data | infrastructure | process | architecture | design`.
- Phases contain atomic tasks; tasks within a phase are parallel-safe unless dependencies are declared.
- Every task names the file, function, or config key it touches — no "update the code" tasks.
- Status badge in intro: `Completed | In progress | Planned | Deprecated | On Hold`.

## Architectural Decision Records

Purpose: capture *why* a design choice was made, with alternatives and consequences.

- File: `adr-NNNN-[title-slug].md` in `/docs/adr/`, sequential 4-digit numbering.
- Status lifecycle: `Proposed → Accepted → Superseded | Deprecated | Rejected`.
- Always include both positive and negative consequences — decisions have tradeoffs.
- Coded bullets: `POS-001`, `NEG-001`, `ALT-001`, `IMP-001`, `REF-001`.

## Product Requirements Documents

Purpose: translate a product idea into a buildable scope.

- Run a **discovery interview** before writing — at least two clarifying questions.
- Sections: Executive Summary, User Experience & Stories, AI System (if applicable), Technical Specs, Risks & Roadmap.
- User stories: `As a [user], I want [action] so that [benefit].` with bulleted acceptance criteria.
- Define non-goals explicitly to protect timeline.
- For AI features: include tool requirements + evaluation strategy (benchmark set, pass rate).

## Cross-Artifact Linking

When more than one artifact is produced for the same initiative:

1. PRD links to the spec(s) that formalize its requirements.
2. Spec links to the plan(s) that implement it.
3. Plan references the ADR(s) that justify its design choices.
4. ADR references the spec(s) and plan(s) it governs.

Use explicit Markdown links: `[spec-schema-user-events](../../spec/spec-schema-user-events.md)`.

## Anti-Patterns

- Writing a PRD without asking any questions first.
- Spec that defers every decision to "TBD" — ask instead.
- Plan whose tasks are not parallel-safe but lack dependency notes.
- ADR with only positive consequences — every decision has tradeoffs.
- Inventing constraints the user never stated; mark as `TBD` or ask.

## Reference

Full Markdown templates for all four artifacts: `reference/templates.md`.
