---
name: csp-documentation-governance
description: >
  Comprehensive documentation governance: defines internal vs external doc zones,
  content-type boundaries, update-trigger rules (when X changes, update Y),
  document lifecycle (create→maintain→archive), folder taxonomy enforcement,
  INDEX.md requirements, and cross-skill integration rules. Use when setting up
  project docs, auditing doc health, defining what to update after code changes,
  or establishing documentation standards for a team.
version: 1.0.0
layer: 2
category: workflow
phase: plan
domain: architecture
role: specialist
scope: design
tools: [Read, Write, Edit, Bash, Glob, Grep]
related_skills:
  - [[workflow:csp-project-doc-architect]]
  - [[workflow:csp-doc-lifecycle-manager]]
  - [[workflow:csp-session-knowledge-extractor]]
  - [[workflow:csp-knowledge-hub]]
  - [[workflow:csp-lifecycle-orchestrator]]
  - [[pattern:csp-living-docs-governance]]

anti_rationalizations:
  "I'll update the docs later": "Later never comes. If code changed behavior, the docs are stale RIGHT NOW. Stale docs are worse than no docs."
  "The README is enough": "README is a facade, not a knowledge base. Architecture decisions, design rationale, and runbooks need their own homes."
  "Internal docs are for the team, no need to structure them": "Unstructured internal docs are undiscoverable. Six months later, nobody remembers where the decision was recorded."
  "Just keep everything in docs/": "A flat docs/ with 20+ files is a dumping ground. Category folders + INDEX.md make things findable."
---

# Documentation Governance

Define what docs your project needs, where they live, when they get updated, and who owns them. The single source of truth for documentation discipline.

## The Two Zones

Every project has two documentation zones. Confusing them is the root cause of doc rot.

| Zone | Audience | Content | Update Trigger | Storage |
|------|----------|---------|---------------|---------|
| **Human** (`docs/` or established equivalent) | Users, contributors, team members | Architecture, guides, API reference, ADRs, analysis, active PRD originals | Relevant product/code/process change | Existing documented category layout + navigable entry (`README.md` or `INDEX.md`) |
| **Internal** (`.csp/`) | Agents, CI/CD, engineering pipeline | AGENTS.md, manifest, lifecycle state, PMS/CMS/TMS, specs, tasks, tech-design, traceability, artifacts, ship, audit | Every stage gate completion, every commit that changes behavior | `.csp/{subsystem}/` + manifest.json |

**Publication boundary:** A page actually published outside the repository must not link to inaccessible `.csp/` artifacts or disclose internal findings. A human-readable document kept inside the project may cite `.csp/` for engineering traceability. `docs/` is not automatically public: determine what is published from the project's deployment configuration and access rules. Read `csp-knowledge-hub/references/project-entry-contract.md` before changing source/derived paths.

---

## Folder Taxonomy

Use these categories as defaults **where the project has no established equivalent**. In brownfield and monorepo projects, map the existing taxonomy first; preserve working links and active PRDs rather than moving them to match a template:

| Folder | For | Update Trigger | Navigation |
|--------|-----|---------------|------------|
| `docs/architecture/` | ADRs, system design, data models, security architecture | New ADR, architecture change, breaking change | Link from the docs entry |
| `docs/design/` | UI/UX specs, design briefs, wireframe docs, design decisions | Design iteration, UI change, new component | Link from the docs entry |
| `docs/guides/` | Install guides, user guides, contributing, onboarding, runbooks | New feature, dep change, process change | Link from the docs entry |
| `docs/reference/` | API reference, SKILL.md spec, versioning rules, coding standards | API change, spec change, standard update | Link from the docs entry |
| `docs/reports/` | Project reviews, audit reports, case studies, post-mortems | After audit, after review, after incident | Link from the docs entry |
| `docs/analysis/` | Gap analysis, capability maps, alignment checklists | After analysis run, after capability review | Link from the docs entry |
| `docs/prototypes/` | HTML prototypes, design mockups, interactive demos | After prototype creation/update | Local index when needed |
| `docs/archive/` | Superseded material retained by project policy | After consumers are repointed | Retain version and provenance |

---

## Document Lifecycle

```
Draft → Active → Stable → Archived → Retired
```

| State | Location | Meaning | Move Trigger |
|-------|----------|---------|-------------|
| **Draft** | `docs/{category}/` with `[DRAFT]` prefix or YAML `status: draft` | Work in progress, may change significantly | N/A |
| **Active** | Existing canonical path (often `docs/{category}/`) | Current, authoritative, maintained; keep inbound links working | N/A |
| **Stable** | Existing canonical path | Current, rarely changes (e.g., architecture overview) | N/A |
| **Archived** | Project's archive zone (e.g. `docs/archive/{version}/`) | Superseded source retained with a back-reference | Only after confirming its consumers no longer require the active path, updating inbound links and any manifest pointer |
| **Retired** | Explicitly approved deletion | No longer needed or referenced, subject to project retention policy | After checking inbound links, unresolved findings and evidence retention; obtain authorization before deleting |

---

## Update-Trigger Rules: When X Changes, Update Y

These are HARD rules. Violating them means docs are stale.

### Code Changes → Doc Updates

| Code Change | Must Update Doc | Location |
|-------------|----------------|----------|
| New feature (user-facing) | Feature documentation + README feature list (if major) | `docs/guides/` or `docs/design/{feature}.md` |
| API change (breaking) | API reference + migration guide + ADR | `docs/reference/` + `docs/architecture/ADR-NNN.md` |
| API change (additive) | API reference | `docs/reference/` |
| Dependency change (new) | Install guide + architecture overview | `docs/guides/INSTALL.md` + `docs/architecture/ARCHITECTURE.md` |
| Dependency change (remove) | Install guide + architecture overview | Same files |
| Configuration change | Runbook + install guide | `docs/guides/` |
| Security fix | Security architecture + runbook | `docs/architecture/` + `docs/guides/` |
| Performance improvement | Architecture overview (metrics section) | `docs/architecture/` |
| Deprecation | Migration guide + API reference (mark deprecated) | `docs/guides/` + `docs/reference/` |
| Bug fix (behavior change) | Feature doc (if behavior was documented) | `docs/design/{feature}.md` or `docs/guides/` |

### Project Planning Changes → Doc Updates

| Planning Change | Must Update Doc | Location |
|----------------|---------------|----------|
| New planned milestone/version | Roadmap + feature inventory (if maintained) | `docs/strategy/ROADMAP.md` + project feature index; CHANGELOG updates on actual release, not planning |
| Feature added to roadmap | Roadmap | `docs/strategy/ROADMAP.md` or the project's established equivalent |
| Feature cut from roadmap | Roadmap + affected PRD/feature inventory | Update or mark as superseded; archive only after checking active readers |
| Architecture decision | ADR + architecture overview | `docs/architecture/` |
| Team/process change | Contributing guide + onboarding | `docs/guides/` |

### Project Health → Doc Updates

| Health Check | Must Update Doc | Location |
|-------------|----------------|----------|
| Periodic doc audit | Docs entry freshness, broken links, eligibility for archive | Existing `docs/README.md` or `docs/INDEX.md`; preserve active consumers |
| After milestone complete | Review superseded artifacts for archival; update version registry | Existing archive path, only after references and retention checks |
| New team member onboarded | Onboarding guide (if gaps found) | `docs/guides/` |

---

## Design-Before-Code Rule

Certain documents MUST exist BEFORE code is written. These are pre-development artifacts:

| Document | Must Exist Before | Blocks |
|----------|------------------|--------|
| ADR (for novel decisions) | Implementation of the decision | Implementation |
| Architecture overview | First feature of a new system | Spec generation |
| API contract (OpenAPI) | Frontend implementation consuming the API | Frontend dev |
| Data model / ER diagram | Database migration | Migration |
| Feature spec / PRD | Task breakdown | Task breakdown |

**Check**: Before starting implementation on a task, verify that all "Must Exist Before" documents for that task type are present. Missing pre-dev doc → BLOCKED, write the doc first.

---

## Doc-Update-After-Code Rule

Certain documents MUST be updated AFTER code is written and verified. These are post-development artifacts:

| Document | Must Update After | Deadline |
|----------|------------------|----------|
| CHANGELOG | Every release | Before tag push |
| Installation guide | Every dependency or config change | Same PR |
| API reference | Every API change | Same PR |
| Architecture overview | Every architecture change | Same sprint |
| Runbook | Every new operational procedure | Before going on-call |
| Feature documentation | Every user-facing feature | Same PR |

**Check**: In the 06 verify-ship stage, verify that all "Must Update After" documents for changed code are present. Missing post-dev doc → BLOCKED, update before release.

---

## INDEX.md Requirements

For a folder with several human-facing documents and no usable index, add or update its existing navigation page (`INDEX.md` or project-standard `README.md`). Three files is an **index-review trigger**, not a reason to rename functional README files or create empty indexes:

```markdown
# {Directory Name}

One-line description of what lives here.

| File | Purpose | Status | Last Updated |
|------|---------|--------|-------------|
| `file.md` | What it's for | Active/Stable/Archived/Draft | YYYY-MM-DD |

## Related
- `../other-category/` — Why it's related
```

For a new project **without** an existing docs entry, `docs/INDEX.md` can serve as the navigation hub (keep a working `docs/README.md` in brownfield projects):

```markdown
# Documentation Index

## Categories
- [architecture/](architecture/INDEX.md) — ADRs, system design, data models
- [design/](design/INDEX.md) — UI/UX specs, design briefs
- [guides/](guides/INDEX.md) — Install, usage, contributing
- [reference/](reference/INDEX.md) — API, specs, standards
- [reports/](reports/INDEX.md) — Reviews, audits, post-mortems
- [analysis/](analysis/INDEX.md) — Gap analysis, capability maps
- [archive/](archive/INDEX.md) — Historical versions

## Quick Links
- [Install Guide](guides/INSTALL.md)
- [Architecture Overview](architecture/ARCHITECTURE.md)
- [Contributing](guides/CONTRIBUTING.md)
```

---

## Cross-Skill Integration

This skill is the documentation governance authority. Other doc skills implement specific mechanisms under these rules:

| Skill | Relationship to Governance |
|-------|---------------------------|
| `csp-project-doc-architect` | Executes the folder taxonomy and naming conventions. Reads governance for folder structure, writes the project's doc tree. |
| `csp-doc-lifecycle-manager` | Executes the lifecycle (Archive, Prune, Index). Reads governance for state transition rules, executes moves. |
| `csp-session-knowledge-extractor` | Routes extracted knowledge. Reads governance for the "where does X type of knowledge go" routing table. |

### Integration Rules

1. When `csp-project-doc-architect` sets up docs: use these categories as defaults, first map the project's existing folders and navigation entry; only introduce an `INDEX.md` where it improves discoverability.
2. When `csp-doc-lifecycle-manager` archives docs: it MUST follow the lifecycle state transitions defined here (Active→Archived, not arbitrary moves).
3. When `csp-session-knowledge-extractor` routes knowledge: it MUST use the internal vs external zone decision tree to pick the right destination.
4. Check the target project's own `docs/README.md` or `docs/INDEX.md` **if present**, plus its root instructions and `.csp/AGENTS.md` route card. If absent, use this skill's zone rules and the knowledge-hub project-entry contract; never assume a consumer project has this package's `docs/README.md`.
5. A document-size warning requests an ownership/consumer review, not an automatic move or deletion. Preserve active PRDs, referenced screenshots, and unresolved findings; check references and manifest before any migration.

---

## Health Check

Run quarterly (or after every major milestone):

- [ ] The project's existing docs entry page (`INDEX.md` or `README.md`) links to active documentation
- [ ] Folders with 3+ human-facing files have navigable links from that entry page or an appropriate local index
- [ ] No broken links between docs (scan with `scripts/validate-skill-refs.py` extended to docs)
- [ ] `docs/archive/` is organized by version, not by date
- [ ] Published pages do not link to inaccessible internal paths or expose sensitive artifacts
- [ ] All ADRs are numbered sequentially, no gaps
- [ ] No duplicate content across files (one canonical owner per fact)
- [ ] Update-trigger rules have been followed for recent code changes

---

## Anti-Patterns

| Anti-Pattern | Why It's Bad | Fix |
|---|---|---|
| Flat `docs/` with 20+ files | Undiscoverable, no navigation | Categorize into folders + INDEX.md |
| Docs describing the old version | Misleads users, causes errors | Archive old, mark superseded with `→ replaced by [link]` |
| README trying to be everything | README is a facade, not a knowledge base | Split into category docs, README links to them |
| No working docs entry | New team members can't find anything | Maintain the project's `INDEX.md` or `README.md` and link active categories |
| Published page points to inaccessible `.csp/` evidence | External readers can't follow private links | Keep internal trace links in nonpublished docs; publish a self-contained explanation |
| Duplicate active documents with `-final-v2` names | Unclear canonical source | Keep the active document at its linked path; if superseded, archive with backlink after consumers switch |
| "We'll document it later" | Never happens | Document in the same PR as the code change |
| Stale docs with no "last updated" | Readers can't trust anything | Every doc has `> 最后更新: YYYY-MM-DD` in header or frontmatter |

## Related Skills

- [[workflow:csp-project-doc-architect]] — Sets up the folder structure that governance defines
- [[workflow:csp-doc-lifecycle-manager]] — Executes lifecycle transitions (archive, prune, index)
- [[workflow:csp-session-knowledge-extractor]] — Routes extracted knowledge to governed destinations
- [[workflow:csp-knowledge-hub]] — Initializes the `.csp/` internal zone (AGENTS.md, manifest)
- [[workflow:csp-lifecycle-orchestrator]] — Ensures docs are updated at each stage gate
- [[pattern:csp-living-docs-governance]] — Four-role documentation system for long-lived projects