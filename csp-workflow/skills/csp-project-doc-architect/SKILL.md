---
name: csp-project-doc-architect
description: "Design and maintain project documentation architecture: folder structure, naming conventions, index files, and cross-references. Use when setting up docs for a new project, restructuring existing docs, or creating documentation standards. Triggers: 文档架构, doc structure, 文件夹结构."
layer: 2
category: workflow
phase: plan
domain: patterns
version: "1.0.0"
role: architect
scope: design
tools: [Read, Write, Edit, Glob, Grep]
---

# Project Documentation Architect

## When to Use

- Setting up documentation structure for a new project
- Restructuring docs after rapid growth (10+ docs without clear organization)
- Creating documentation standards/conventions for a team
- Migrating docs between tools or reorganizing after a pivot

## Project-Adapted Documentation Tree

First read the project's root instructions and existing docs entry page. `csp-documentation-governance` owns the human/internal boundary; `csp-knowledge-hub/references/project-entry-contract.md` owns the L0–L3 entry pattern. This is a **greenfield example**, not a directory migration instruction for brownfield or monorepo projects:

```
docs/
  README.md             # Human navigation; INDEX.md is also valid
  strategy/ROADMAP.md   # Human-readable version themes and active PRD handoff
  prd/                  # Active PRD originals read by 01 and testing
  architecture/         # Architecture/ADR
  design/               # Design docs
  guides/               # User-facing how-to
  reference/            # Long-lived reference
  analysis/             # Analysis summaries
.csp/
  AGENTS.md             # Agent operation route card
  manifest.json         # Sole indexed artifact inventory
  lifecycle-state.json  # Runtime stage state (schema set by actual driver)
  planning/             # Agent-internal planning artifacts, not ROADMAP's canonical copy
  product-spec/          # Derived PMS
  code-spec/             # Derived CMS
  test-spec/             # Derived TMS
```

Check each source file's readers before moving it: a live `docs/prd/` file cannot be archived while the next release still consumes it. If the project already has a functional taxonomy, preserve it and record its routes instead of creating another tree.

## Naming Conventions

- `INDEX.md` or existing `README.md` for navigation; prefer a single entry per scope
- `STATE.md` only for a project-maintained human summary; `.csp/lifecycle-state.json` is runtime state, not a duplicate dashboard
- Keep a root or sub-package `README.md` if it is the documented entry point
- `ADR-{NNN}-{slug}.md` for architecture decision records
- kebab-case for multi-word filenames
- Date-prefix for time-sensitive docs: `YYYY-MM-DD-{topic}.md`

## Index File Requirements

A navigation page (`INDEX.md` or project-standard `README.md`) should include:
1. One-line description of what this index covers
2. Table of all docs (file | purpose | status)
3. Links to sub-directory indexes
4. "Last updated" date

## Documentation Hygiene Rules

1. **Root navigability**: Review root clutter by purpose, not an arbitrary file-count cap; legitimate build/workspace configs stay in place.
2. **Single canonical source**: Avoid competing copies; derived views identify their inputs and generation time.
3. **Evidence-aware archive**: Move only superseded material after readers, inbound links, retention and manifest pointers have been checked.
4. **Reference persists**: An active reference is not archived because it is old or large.
5. **Index on demand**: Three or more human-facing files trigger a navigation review; use the project's existing docs entry or add an index when it improves discovery.

## Process: Setting Up New Project Docs

1. Identify doc types and existing conventions; use governance's taxonomy as a default, not a mandatory eight-folder scaffold.
2. Create only folders with actual owners/content; retain active PRD and ROADMAP routes.
3. Make the docs entry page point to the new material; add local indexes where navigation needs them.
4. Offer a read-only hygiene check; claim CI enforcement only if the project actually wires it.

## Process: Restructuring Existing Docs

1. **Audit**: List documents, current readers, inbound links, manifest paths and retention requirements.
2. **Classify**: Mark active originals, derived artifacts, superseded documents and copies.
3. **Propose**: Keep existing valid paths; for necessary moves list old→new route and affected consumers.
4. **Migrate only after approval**: Update every reader, manifest pointer and test; never archive an active handoff.
5. **Index**: Update the existing navigation entry and verify links.

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Flat directory with no task-oriented entry | Link active documents by intent; group when it improves retrieval |
| Duplicate README and INDEX in one folder | Keep one authoritative navigation entry |
| Archive used to meet a file-count cap | Archive only after supersession and reference checks |
| No cross-references | Route entry links to active source and records its owner |

## Related Skills

- [[workflow:csp-documentation-governance]] — **权威治理规则**：定义文件夹分类、命名规范、INDEX.md 要求。本技能执行治理规则中定义的文件结构搭建。
- [[workflow:csp-doc-lifecycle-manager]] — 维护本技能设计的结构
- [[workflow:csp-session-knowledge-extractor]] — 用提取的知识填充结构
