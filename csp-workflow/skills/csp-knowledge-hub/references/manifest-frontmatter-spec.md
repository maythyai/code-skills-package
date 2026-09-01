# Manifest & Frontmatter Spec

> The sole index + page metadata format. Local-first, git-native (content_hash = git blob hash).

## 1. manifest.json — sole source index

Lives at `.csp/manifest.json`. It is the git-sync baseline, the change-detection source, and
the locator for every spec/wiki/memory page. **No other file holds the index** — `wiki/`
and `spec/` dirs never store a manifest or a symlink to it.

### Top-level fields (all required)

| Field | Notes |
|-------|-------|
| `manifest_id` | stable id, e.g. `<project>-hub` |
| `version` | schema version (integer) |
| `generated_at` | ISO timestamp |
| `adapter` | the producing skill (e.g. `csp-knowledge-hub`) |
| `repo_url` | git remote (`CSP_GIT_REMOTE`, default `github.com`) |
| `items` | array of item objects |

### Item fields

Required for every item:

| Field | Notes |
|-------|-------|
| `source_id` | stable, unique id (e.g. `pms:MOD-AUTH-1`, `codewiki:auth/token-refresh`) |
| `source_type` | `pms` / `cms` / `tms` / `wiki` / `codewiki` / `memory` / `doc` |
| `kind` | `module` / `feature` / `page` / `fact` |
| `title` | real human-readable title (never a placeholder id) |
| `raw_path` | the read-only source file (repo-relative) |
| `output_path` | the produced page (`.csp/...`) |
| `original_ref` | `raw_path @ <commit>` |
| `content_hash` | git blob hash (`git hash-object`) |
| `source_updated_at` | source's last substantive change |
| `build_status` | `pending` / `built` / `failed` |
| `wiki_pages` | pages derived from this source |
| `status` | `ready` / `degraded` / `blocked` (`degraded`/`blocked` require `warnings`) |

### Change detection (incremental)

- Judge added/changed/removed by **stable `source_id` + `content_hash`** — **never mtime or file size**.
- Removed source ⇒ second-confirm, then drop from `items`; pass the removed-id list to the rebuild step.
- Raw fetch success ⇒ update `original_ref`/`hash`/`raw_path`/`status=ready`.
- Fetch failure ⇒ keep item, mark `blocked`/`degraded` with `warnings`.

## 2. Inline YAML frontmatter (per substantive page)

Every **substantive** `.md` page carries metadata as YAML frontmatter at the top (`---`-delimited),
making each page self-contained. **No sidecar `.meta.json`**.

```md
---
type: concept
confidence: high
sources:
  - "[[raw/docs/auth.md@a1b2c3d]]"
seeAlso:
  - "[[code-spec/auth-svc/CODE-MODULE-SPEC]]"
created: "2026-08-28"
updated: "2026-08-28"
---

# Auth Token Refresh
```

### Required fields

| Field | Type | Notes |
|------|------|-------|
| `type` | string | page type, see allowed values |
| `confidence` | string | `high` / `medium` / `low` |
| `sources` | array | cited raw docs as Obsidian wiki links `[[path@commit]]` |

### Recommended fields

| Field | Type | Notes |
|------|------|-------|
| `seeAlso` | array | related pages (wiki links) |
| `aliases` | array | for `type: entity` (aliases, abbreviations, english names) |
| `created` | string | `YYYY-MM-DD` first created |
| `updated` | string | `YYYY-MM-DD` last *substantive* change (not file-write time) |
| `module_id` | string | for spec pages — the PMS `MOD-ID` they belong to |
| `commit` | string | frozen commit the page was derived from (code-wiki) |

### `type` allowed values (closed)

- `archive` — time-point snapshot
- `case` — typical-case experience page
- `comparison` — comparative analysis
- `concept` — concept explanation
- `entity` — entity description (person/system/service)
- `faq` — common question
- `howto` — how-to guide
- `reference` — reference/index page
- `skill` — skill index page
- `source-summary` — raw-doc summary
- `module-spec` — PMS module spec page
- `feature-spec` — full-stack feature spec page
- `test-spec` — TMS test spec page
- `insight` / `data-partition` / `data-index` — data pages (optional, for data-centric wikis)

`index` is invalid — use `reference`. `index.md`/`log.md` are system pages; frontmatter optional (minimal `type: index` / `type: log`).

### confidence assignment

| Value | When |
|-------|------|
| `high` | ≥2 sources cross-verify, or derived from authority (official doc / code) |
| `medium` | single reliable source, clear but unverified; or multi-source with minor inference |
| `low` | inferred from incomplete info; unresolved contradiction |

Principle: prefer lower. Unresolved contradiction ⇒ `low` and mark the divergence in the body.

## 3. Sources as wiki links

`sources` entries use Obsidian wiki-link form `[[path@commit]]` so they render + click-jump in any markdown viewer. A bare `path:line` is **not** a valid citation (readers can't follow it); for narrow spans use `[[path@commit#L44-71]]`.
