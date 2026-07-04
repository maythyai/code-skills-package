---
name: csp-project-doc-architect
description: "Design and maintain project documentation architecture: folder structure, naming conventions, index files, and cross-references. Use when setting up docs for a new project, restructuring existing docs, or creating documentation standards. Triggers: 文档架构, doc structure, 文件夹结构, documentation architecture, 文档规范."
layer: 2
category: workflow
origin: original
---

# Project Documentation Architect

## When to Use

- Setting up documentation structure for a new project
- Restructuring docs after rapid growth (10+ docs without clear organization)
- Creating documentation standards/conventions for a team
- Migrating docs between tools or reorganizing after a pivot

## Standard Documentation Tree

```
docs/
  INDEX.md              # Master navigation hub
  architecture/         # System design, ADRs, tech decisions
  design/               # UI/UX specs, wireframes, visual guidelines
  guides/               # User-facing how-to (quickstart, deployment)
  reference/            # Persistent reference knowledge
  reports/              # Analysis reports, audits, deep dives
  prototypes/           # Interactive prototypes, mockups
.planning/
  INDEX.md              # Planning entry point
  STATE.md              # Current project status (always latest version)
  ROADMAP.md            # Milestone tracker (completed + next)
  reference/            # Persistent planning reference
  archive/              # Historical records by version
    {version}/          # e.g., v0.4.0/, v1.0.0/
```

## Naming Conventions

- `INDEX.md` for navigation hubs (always uppercase)
- `STATE.md` for status dashboards
- `README.md` only for git repo roots and sub-packages
- `ADR-{NNN}-{slug}.md` for architecture decision records
- kebab-case for multi-word filenames
- Date-prefix for time-sensitive docs: `YYYY-MM-DD-{topic}.md`

## Index File Requirements

Every `INDEX.md` must include:
1. One-line description of what this index covers
2. Table of all docs (file | purpose | status)
3. Links to sub-directory indexes
4. "Last updated" date

## Documentation Hygiene Rules

1. **Root cap**: Max 5 files at root (STATE, ROADMAP, INDEX, plus 1-2 active plans)
2. **Single source**: No doc in 2+ locations
3. **Version archive**: Archive by version, not date (`archive/v1.0.0/` not `archive/2026-06/`)
4. **Reference persists**: Reference docs never go to archive
5. **Auto-index**: Every folder with 3+ files needs an INDEX.md

## Process: Setting Up New Project Docs

1. Identify doc types needed (pick from 8 categories)
2. Create folder structure matching the standard tree
3. Create INDEX.md at each level
4. Add documentation hygiene check to CI or pre-commit

## Process: Restructuring Existing Docs

1. **Audit**: List all docs with status (active/completed/obsolete/duplicate)
2. **Classify**: Assign each to a category
3. **Move**: Restructure into the standard tree
4. **Archive**: Move completed to `archive/{version}/`
5. **Index**: Create/update all INDEX.md files

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Flat directory with 30+ files | Group by category, max 10 per folder |
| README.md everywhere | INDEX.md for navigation, README.md only for repos |
| Archive is a dumping ground | Organize by version with brief context |
| No cross-references | Every INDEX.md links to sub-indexes and key docs |

## Related Skills

- `csp-doc-lifecycle-manager` — maintains the structure this skill designs
- `csp-session-knowledge-extractor` — fills the structure with extracted knowledge
