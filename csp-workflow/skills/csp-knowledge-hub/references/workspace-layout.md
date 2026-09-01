# Workspace Layout & Naming Conventions

> The hub's directory, authority, dependency direction, and naming. Local-first
> (markdown + git); no platform coupling.

## Directory structure

The hub roots at `.csp/` and unifies existing CSP artifacts **without moving them**:

```text
.csp/                              # hub root
├── AGENTS.md                      # route contract (6 sections)
├── manifest.json                  # sole source index (cross spec/wiki/memory)
├── product-spec/                  # PMS — Product Module Spec
│   ├── PRODUCT-MODULE-SPEC.md
│   ├── modules/{MOD-ID}.md
│   └── deltas/
├── code-spec/{app}/               # CMS — Code Module Spec (one per app)
│   ├── CODE-MODULE-SPEC.md
│   ├── knowledge-graph.json
│   └── deltas/
├── test-spec/{module}/            # TMS — Test Module Spec (branch of PMS)
│   ├── TEST-MODULE-SPEC.md
│   ├── case-inventory.md
│   └── deltas/
├── wiki/                          # general project wiki (csp-wiki)
│   ├── index.md
│   └── log.md
├── code-wiki/{system}/            # source-grounded code Q&A wiki (csp-code-wiki)
├── specs/                         # full-stack feature specs (csp-fullstack-spec-generator)
├── decomposition/ tech-decisions/ tech-design/ tasks/ plan/ traceability/ prd-ir/
├── intel/                         # session knowledge (csp-session-knowledge-extractor)
├── milestones/v{N}/                # milestone archive
└── .hub-run/<run-id>/             # run workspace (NOT committed)
```

## Authority & dependency direction

```
raw/docs (read-only truth) ──▶ spec/wiki (AI-maintained) ──▶ derived (tasks/plan/trace)
```

- `raw/` (or `docs/`) is the **read-only** source snapshot after fetch; no skill modifies it post-download.
- `schema.md` (when used) is the confirmed compile rule; `auto` mode only an AI schema-builder writes.
- `manifest.json` is the **sole** index; `wiki/`/`spec/` dirs never store a manifest or symlink to it.
- Dependency is **one-way**: raw → spec/wiki → derived. Never reverse.

## Naming conventions

| Artifact | Pattern | Example |
|----------|---------|---------|
| PMS module | `MOD-{DOMAIN}-{seq}` | `MOD-AUTH-1` |
| PMS module file | `modules/MOD-{ID}.md` | `modules/MOD-AUTH-1.md` |
| Feature spec | `SPEC-F-{DOMAIN}-{seq}` | `SPEC-F-A-1` |
| CMS (per app) | `code-spec/{app}/CODE-MODULE-SPEC.md` | `code-spec/auth-svc/CODE-MODULE-SPEC.md` |
| TMS (per module) | `test-spec/{MOD-ID}/TEST-MODULE-SPEC.md` | `test-spec/MOD-AUTH-1/TEST-MODULE-SPEC.md` |
| Wiki page | `{type}/{slug}.md` (slug = kebab-case, english, stable) | `concept/auth-token-refresh.md` |
| Memory fact | `intel/{topic}.md` | `intel/coding-style.md` |
| Delta | `deltas/CHG-{id}-*.md` | `deltas/CHG-001-add-pay.md` |
| Run workspace | `.hub-run/{run-id}/` | `.hub-run/2026-08-28T1500/` |

**Slug rules:** kebab-case, english, stable across renames; one canonical home per topic; other pages link to it (`seeAlso`/`[[link]]`).

## File types (boundary)

| Class | Location | Agent may | As business input? |
|-------|----------|-----------|--------------------|
| Skill protocol (SKILL.md, references/) | skill repo | read | ❌ never as run data |
| Runtime spec/wiki/memory | `.csp/...` | ✅ this run | ✅ this scope only |
| Run workspace | `.csp/.hub-run/<run-id>/` | ✅ this run | ephemeral, never committed |

Hard guardrail: a runtime artifact path resolving inside the skill repo ⇒ reject. `.gitignore` fallback ignores runtime artifact names.

## git sync

- `repo_url` in manifest = the git remote (`CSP_GIT_REMOTE`, default `github.com`).
- Publish only after user confirmation gate.
- `log.md` (per area) = append-only git/sync audit trail.
- Drift check before publish: re-resolve each input ref; if drifted from frozen commit ⇒ refresh, don't publish.
