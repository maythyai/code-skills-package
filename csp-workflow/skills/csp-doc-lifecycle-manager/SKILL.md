---
name: csp-doc-lifecycle-manager
description: "Manage project documentation lifecycle: categorize, archive, index, and prune documents. Use when organizing docs into folders (design/plan/architecture/prototypes/reference), creating INDEX.md files, archiving obsolete docs, or doing documentation health checks. Triggers: 整理文档, doc cleanup, organize docs, 文档归类, 文档管理, archive docs, documentation hygiene."
layer: 2
category: workflow
origin: original
---

# Documentation Lifecycle Manager

A structured workflow for keeping project documentation organized, current, and navigable.

## When to Use

- Starting a new version/milestone and docs need reorganization
- After a major sprint when planning docs become obsolete
- When INDEX.md is out of sync with actual files
- When onboarding new team members who need to navigate docs

## Document Categories

8-folder taxonomy. Adapt names to the project's language but keep the semantics.

| Folder | Purpose |
|--------|---------|
| `design/` | UI/UX specs, wireframes, visual guidelines |
| `plan/` | Sprint plans, roadmaps, milestone trackers (active only) |
| `architecture/` | System design, ADRs, technical decisions |
| `prototypes/` | HTML/interactive prototypes, mockups |
| `reference/` | Persistent reference knowledge (constraints, decisions, context) |
| `reports/` | Analysis reports, audit findings, deep dives |
| `guides/` | User-facing how-to docs (quickstart, deployment) |
| `archive/` | Completed/obsolete docs, organized by version |

**Reference vs Plan**: Plan is time-bound (expires after sprint). Reference persists across versions. Ask: "Will this be useful in 6 months?" Yes → reference. No → plan (and eventually archive).

## Lifecycle Rules

1. Active docs stay at the root of their category
2. Completed docs move to `archive/{version}/`
3. Every category folder gets an `INDEX.md` or `README.md`
4. Root `INDEX.md` links to all category indexes
5. Archive subdirectories named by version (`v0.4.0/`, `v0.7.0/`) or theme (`intel/`, `diagnostics/`)

## Process: 5-Step Workflow

### 1. Audit
Scan all docs, classify each as: Active (still relevant), Completed (milestone done), Obsolete (superseded), or Duplicate (same content elsewhere).

### 2. Categorize
Move each doc to its category folder. Use `git mv` to preserve history.

### 3. Archive
Move completed docs to `archive/{version}/`. Add a brief `README.md` noting what was delivered.

### 4. Prune
Delete true duplicates and zero-value stubs. Never delete without checking inbound links first.

### 5. Index
Create or update `INDEX.md` at root and each category level. Keep indexes short — a map, not a catalog.

## Documentation Health Check

- [ ] STATE.md reflects current version
- [ ] ROADMAP.md has completed versions archived
- [ ] INDEX.md links are all valid
- [ ] No duplicate content across locations
- [ ] Archive organized by version, not a flat dump
- [ ] Reference docs separated from active plans
- [ ] Every category folder has an INDEX.md or README.md

## Common Anti-Patterns

| Anti-Pattern | Do This Instead |
|---|---|
| "I'll organize later" | Organize at each milestone boundary |
| "Everything is in `.planning/`" | Split into plan (active) + archive (completed) |
| "The INDEX.md is comprehensive" | Run link checks after every file move |
| "Archive is a flat dump" | Group by version or theme |
| "Reference and plans mixed" | Separate plan (expires) from reference (persistent) |

## Related Skills

- `csp-project-doc-architect` — designs the folder structure this skill maintains
- `csp-session-knowledge-extractor` — creates new docs that need lifecycle tracking
- `csp-deprecation-and-migration` — governs system deprecation, this handles doc deprecation
