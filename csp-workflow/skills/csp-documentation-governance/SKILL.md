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
| **External** (`docs/`) | Humans: users, contributors, new team members | Architecture, install guides, usage, API reference, ADRs, runbooks, feature docs, analysis reports | Code merge, breaking change, new feature, API change, dep bump | `docs/{category}/` + INDEX.md |
| **Internal** (`.csp/`) | Agents, CI/CD, engineering pipeline | AGENTS.md, manifest, lifecycle state, PMS/CMS/TMS, specs, tasks, tech-design, traceability, artifacts, ship, audit | Every stage gate completion, every commit that changes behavior | `.csp/{subsystem}/` + manifest.json |

**Hard rule**: External docs NEVER reference `.csp/` paths. Internal `.csp/` artifacts MAY reference `docs/` as source material with `original_ref` anchors.

---

## Folder Taxonomy

Apply the 8-category taxonomy under `docs/`:

| Folder | For | Update Trigger | INDEX.md Required? |
|--------|-----|---------------|-------------------|
| `docs/architecture/` | ADRs, system design, data models, security architecture | New ADR, architecture change, breaking change | Yes |
| `docs/design/` | UI/UX specs, design briefs, wireframe docs, design decisions | Design iteration, UI change, new component | Yes |
| `docs/guides/` | Install guides, user guides, contributing, onboarding, runbooks | New feature, dep change, process change | Yes |
| `docs/reference/` | API reference, SKILL.md spec, versioning rules, coding standards | API change, spec change, standard update | Yes |
| `docs/reports/` | Project reviews, audit reports, case studies, post-mortems | After audit, after review, after incident | Yes |
| `docs/analysis/` | Gap analysis, capability maps, alignment checklists | After analysis run, after capability review | Yes |
| `docs/prototypes/` | HTML prototypes, design mockups, interactive demos | After prototype creation/update | If 3+ files |
| `docs/archive/` | Completed/retired docs organized by version | After milestone archive, after deprecation | By version |

---

## Document Lifecycle

```
Draft → Active → Stable → Archived → Retired
```

| State | Location | Meaning | Move Trigger |
|-------|----------|---------|-------------|
| **Draft** | `docs/{category}/` with `[DRAFT]` prefix or YAML `status: draft` | Work in progress, may change significantly | N/A |
| **Active** | Root of `docs/{category}/` | Current, authoritative, maintained | N/A |
| **Stable** | Root of `docs/{category}/` | Current, rarely changes (e.g., v1.0 architecture overview) | N/A |
| **Archived** | `docs/archive/{version}/` | Superseded by newer version, kept for history | After new version supersedes it |
| **Retired** | Deleted (or `docs/archive/_retired/`) | No longer relevant, no historical value | After confirming zero inbound links and zero value |

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
| New milestone/version | CHANGELOG + roadmap + FEATURES | Root + `docs/analysis/` |
| Feature added to roadmap | Roadmap | `docs/strategy/ROADMAP.md` |
| Feature cut from roadmap | Roadmap + feature doc (archive) | Root + `docs/archive/` |
| Architecture decision | ADR + architecture overview | `docs/architecture/` |
| Team/process change | Contributing guide + onboarding | `docs/guides/` |

### Project Health → Doc Updates

| Health Check | Must Update Doc | Location |
|-------------|----------------|----------|
| Quarterly doc audit | INDEX.md freshness + broken links + archive | `docs/INDEX.md` + `docs/archive/` |
| After milestone complete | Archive milestone artifacts, update version registry | `docs/archive/{version}/` |
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

Every directory with 3+ files MUST have an INDEX.md:

```markdown
# {Directory Name}

One-line description of what lives here.

| File | Purpose | Status | Last Updated |
|------|---------|--------|-------------|
| `file.md` | What it's for | Active/Stable/Archived/Draft | YYYY-MM-DD |

## Related
- `../other-category/` — Why it's related
```

Root `docs/INDEX.md` provides the master navigation hub:

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

1. When `csp-project-doc-architect` sets up docs: it MUST reference this governance skill's folder taxonomy and INDEX.md template — no ad-hoc structures.
2. When `csp-doc-lifecycle-manager` archives docs: it MUST follow the lifecycle state transitions defined here (Active→Archived, not arbitrary moves).
3. When `csp-session-knowledge-extractor` routes knowledge: it MUST use the internal vs external zone decision tree to pick the right destination.
4. All three skills MUST read `docs/README.md` for zone definitions before operating.

---

## Health Check

Run quarterly (or after every major milestone):

- [ ] Root `docs/INDEX.md` exists and links to all category INDEX.md files
- [ ] Every category folder with 3+ files has an INDEX.md
- [ ] No broken links between docs (scan with `scripts/validate-skill-refs.py` extended to docs)
- [ ] `docs/archive/` is organized by version, not by date
- [ ] No internal `.csp/` paths appear in external-facing docs
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
| No INDEX.md | New team members can't find anything | Create INDEX.md at root and per category |
| `.csp/` paths in `docs/` | External readers can't follow internal links | Rewrite as human-readable descriptions |
| Versioned filenames (`ARCHITECTURE-v2.md`) | Confusion about which is canonical | Use folders: `archive/v1/ARCHITECTURE.md` + `architecture/ARCHITECTURE.md` |
| "We'll document it later" | Never happens | Document in the same PR as the code change |
| Stale docs with no "last updated" | Readers can't trust anything | Every doc has `> 最后更新: YYYY-MM-DD` in header or frontmatter |

## Related Skills

- [[workflow:csp-project-doc-architect]] — Sets up the folder structure that governance defines
- [[workflow:csp-doc-lifecycle-manager]] — Executes lifecycle transitions (archive, prune, index)
- [[workflow:csp-session-knowledge-extractor]] — Routes extracted knowledge to governed destinations
- [[workflow:csp-knowledge-hub]] — Initializes the `.csp/` internal zone (AGENTS.md, manifest)
- [[workflow:csp-lifecycle-orchestrator]] — Ensures docs are updated at each stage gate
- [[pattern:csp-living-docs-governance]] — Four-role documentation system for long-lived projects