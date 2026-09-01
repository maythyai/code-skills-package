# Wiki Metadata Spec

> Page frontmatter规范 for `.csp/wiki/*.md`. Generalized (git-native; no platform doc IDs).

## Required fields

| Field | Type | Notes |
|------|------|-------|
| `type` | string | page type, see allowed values below |
| `confidence` | string | `high` / `medium` / `low` — content confidence (see standard below) |
| `sources` | array | cited raw source docs (required for all pages except `index.md`/`log.md`) |

## Recommended fields

| Field | Type | Notes |
|------|------|-------|
| `seeAlso` | array | related wiki pages |
| `created` | string | first-created date (`YYYY-MM-DD`) |
| `updated` | string | last *substantive* content change (`YYYY-MM-DD`), not file-write time |

## `type` allowed values (closed vocabulary)

- `archive` — query snapshot, excluded from cascade updates
- `comparison` — comparative analysis
- `concept` — concept explanation
- `entity` — entity description (person, system, service)
- `faq` — common question
- `howto` — how-to guide
- `reference` — reference/index page (e.g. index.md)
- `source-summary` — raw-doc summary

`index` is invalid — use `reference`.

## `confidence` assignment

| Value | When |
|-------|------|
| `high` | cross-verified by ≥2 sources, or derived from authority (official doc / code); unambiguous |
| `medium` | single reliable source, clear but unverified; or multi-source with minor inference |
| `low` | inferred from incomplete info; source is vague/stale; or unresolved contradiction |

Principle: prefer lower over higher. Uncertain ⇒ `medium`; unresolved contradiction ⇒ `low`.

## `sources` format (git-native)

Each source is an object citing a raw file pinned to a commit:

```yaml
sources:
  - file: docs/auth.md          # repository-relative path of the raw doc
    title: "认证架构"             # human-readable title (the file's name/heading, never a placeholder id)
    commit: a1b2c3d             # frozen commit the claim was derived from
    sections: ["## Token 刷新"]  # optional: which sections (incremental-update hint, not a render anchor)
```

| Field | Required | Notes |
|------|----------|-------|
| `file` | yes | raw doc path (git-visible); must be a source doc, not a wiki page |
| `title` | yes | real title; **must not** equal the path/id (front-end would show a UUID/path) |
| `commit` | yes | the frozen commit the claim is pinned to |
| `sections` | no | compile-time hint for incremental ingest (which section changed → which pages update) |

### `sections` behavior
- Write-time: best-effort, recommended not mandatory.
- Render: only doc-level link is rendered; sections are NOT rendered as anchors.
- Lint: does NOT validate sections (titles change too often; cost > benefit).
- Incremental ingest: used as an "impact hint"; if old sections don't match the new doc, refresh to current actual sections.

## Cross-repo / multi-source ingest

Two ingest modes:

| Mode | Notes |
|------|-------|
| **single-repo** | raw docs and wiki under the same project; `file` paths relative to project root |
| **multi-source** | read raw docs from multiple dirs/repos; write wiki to `.csp/wiki/`; `sources[].repo` marks the source repo when ambiguous |

Multi-source: `sources` must carry `repo` (clone URL or local path) when sources span repos; the wiki layer records provenance per source.
