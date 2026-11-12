---
name: csp-doc-lifecycle-manager
description: "Manage project documentation lifecycle: categorize, archive, index, and prune documents. Use when organizing docs into folders, archiving obsolete docs, or doing documentation health checks. Triggers: 整理文档, doc cleanup, organize docs, 文档归类, archive docs."
layer: 2
category: workflow
phase: plan
domain: patterns
version: "1.0.0"
role: specialist
scope: design
tools: [Read, Write, Edit, Glob, Grep]
---

# Documentation Lifecycle Manager

A structured workflow for keeping project documentation organized, current, and navigable.

## When to Use

- Starting a new version/milestone and docs need reorganization
- After a major sprint when planning docs become obsolete
- When INDEX.md is out of sync with actual files
- When onboarding new team members who need to navigate docs

## Document Categories

Use the existing project taxonomy first. For greenfield projects, use `csp-documentation-governance` categories as defaults (architecture, design, guides, reference, reports, analysis, prototypes, archive); add `docs/strategy/` for a human-readable ROADMAP and `docs/prd/` for active PRD originals when the project uses them. `.csp/planning/` is the internal workflow area, not a replacement for an active roadmap. `plan/` can remain a project's established human-doc path; no mandatory rename is implied.

**Reference vs Plan**: Plan is time-bound (expires after sprint). Reference persists across versions. Ask: "Will this be useful in 6 months?" Yes → reference. No → plan (and eventually archive).

## Lifecycle Rules

1. Active source documents remain at their canonical paths while any planned/ongoing consumer still needs them.
2. Completion of a milestone alone does not make a PRD, verification baseline or open finding archiveable. Check supersession, inbound references and retention first.
3. Maintain the project's existing `docs/README.md` or `docs/INDEX.md`; add local indexes only where navigation needs them.
4. For approved archives, record the version or domain in the destination and update the manifest pointer, inbound references and route card before declaring a move done.
5. Never delete referenced evidence or a source finding to meet a size/count quota. Get authorization for destructive cleanup.

## Process: 5-Step Workflow

### 1. Audit
Read the project entry contract; inventory canonical sources, current consumers, manifest links, unresolved finding/evidence references and project retention rules. Classify each as Active, Superseded, Duplicate or Unknown. Milestone completion is not proof of supersession.

### 2. Categorize
Map the project's valid paths to the taxonomy. Propose a move only if it improves navigation without breaking a consumer; don't move documents simply to satisfy a template or size limit.

### 3. Archive
After authorization for the proposed migration, relocate only superseded files to the project's archive zone, leaving a findable reference; update affected readers, route card and manifest output_path. Verify no live references point at the former path.

### 4. Prune
Delete only confirmed duplicates/ephemeral files after checking inbound links and user authorization. Preserve evidence referenced by an OPEN finding and a PRD still needed by 01/TB.

### 5. Index
Update the existing `README.md` or `INDEX.md` entry page and any local indexes; rerun the link/route checks. Keep an index a map, not another fact source.

## Documentation Health Check

- [ ] Lifecycle state comes from the current runtime file, not a stale human STATE.md
- [ ] Active ROADMAP and PRDs retain working consumers; only superseded copies enter archive
- [ ] The existing docs entry and any category indexes link to actual files
- [ ] No competing canonical copies exist
- [ ] Archived files remain referenced where necessary; OPEN findings retain their evidence
- [ ] Project retention/access policy is respected

## Common Anti-Patterns

| Anti-Pattern | Do This Instead |
|---|---|
| "I'll organize later" | Organize at each milestone boundary |
| "ROADMAP belongs in `.csp/planning/`" | Keep the human roadmap's active path (`docs/strategy/ROADMAP.md` by default); internal plans can live under `.csp/planning/` |
| "The INDEX.md is comprehensive" | Run link checks after every approved file move |
| "Archive the last milestone automatically" | Check supersession, readers and retention; then re-point and verify |
| "Reference and plans mixed" | Separate plan (expires) from reference (persistent) |

## Related Skills

- [[workflow:csp-documentation-governance]] — **权威治理规则**：定义对内/对外文档分界、更新触发规则、文档生命周期。本技能执行治理规则中定义的生命周期转换（Active→Archived）。
- [[workflow:csp-project-doc-architect]] — 设计本技能维护的文件夹结构
- [[workflow:csp-session-knowledge-extractor]] — 创建需要生命周期跟踪的新文档
- [[pattern:csp-deprecation-and-migration]] — 管理系统废弃，本技能处理文档废弃
