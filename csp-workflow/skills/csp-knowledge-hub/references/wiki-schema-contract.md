# Wiki Schema Contract

> The `schema.md` that drives wiki build / validate / render / confirm. Generalized from
> production wiki-builder schema-spec. Used by `csp-knowledge-hub` and `csp-wiki`.
>
> `schema.md` is the **sole structured contract** for a wiki build. It is built only **after**
> raw ingest produces the manifest; never before. The user-confirmation page shows only a
> summary + the wiki structure tree; internal fields are stored fully for the agent/worker.

## 1. Required fields

| Field | Type | Notes |
|------|------|-------|
| `schema_id` | string | stable id |
| `mode` | string | `auto` or `user` (the first-build mode choice) |
| `status` | string | `draft` or `confirmed` |
| `scenario` | string | business scenario |
| `audience` | string[] | wiki users |
| `key_questions` | string[] | questions the wiki must answer |
| `source_scope` | object | `include` + `exclude` arrays |
| `knowledge_model` | object | `page_types` + `required_metadata` arrays |
| `extraction_priorities` | string[] | ingest focus |
| `terminology` | object | canonical term → alias array |
| `query_requirements` | string[] | answer requirements |
| `lint_requirements` | string[] | domain patrol requirements |
| `wiki_structure` | object[] | **required** — topic organization + directory plan; each item has non-empty `topic` + ≥1 of `summary`/`stores`/`examples`/`pages`; optional `source_types` / `organization_rule` / `children`; default max 3 levels unless deeper explicitly requested |

## 2. Three extraction classes

Schema extraction converges to three classes:

- **Raw data types** — at schema-build time, recognize each material's type, purpose,
  whether it enters the wiki, storage path, and description-file requirement. A type may
  be reference-only (no page generated).
- **Business evaluation framework** — extract evaluation criteria, analysis dimensions,
  process stages, capability models from raw or user voice — these become the wiki's
  organization coordinates.
- **Directory hierarchy rules** — different top-level dirs may expand differently; keep
  levels minimal (≤3 by default) unless the user explicitly asks for deeper.

## 3. Mode (`auto` vs `user`)

| Mode | Who writes | When |
|------|------------|------|
| `auto` | the AI schema-builder (reads `raw/` + user intent) | first build, or rebuild on request |
| `user` | the user supplies the full `schema.md` body (file/doc) | first build, or rebuild — **never** call the AI builder in this mode, and never generate a schema from a terse outline intent |

On any schema prep (auto-generate / user-attach / rebuild), output the **full** `schema.md`
body (Markdown-rendered; the `## Wiki Structure` ASCII tree in a `text` fence) — no summary —
and confirm with the user before compiling.

## 4. Build ordering

```
raw ingest → manifest.json ──▶ schema build (auto|user) ──▶ confirm ──▶ compile wiki ──▶ lint/publish
```

- **No schema before manifest** — schema is built on the ingested raw + manifest.
- Schema unconfirmed or manifest invalid ⇒ blocker (publish blocked).
- After confirm, `schema.md` is the compile rule; a rebuild re-reads it.

## 5. Quality gates (blocker / error / warning)

| Tier | Examples |
|------|----------|
| **Blocker** | env gate failed; schema unconfirmed or manifest invalid; raw modified or hash mismatch; `sources` point to wiki pages (not raw) or title empty/=id; `ori_ref` missing; raw-pages-map missing or not covering all ready/published sources; hard-unresolved contradiction; no write permission |
| **Error** | index/log missing or misplaced; `schema.md` missing (can't publish, update can't re-read); metadata required field missing; broken links; duplicate slug; manifest ready/published items unprocessed; page cites non-existent raw revision |
| **Warning** | image/table/attachment degraded; low-confidence or stale page; orphan page; thin coverage |

Publish requires blocker=0 and error=0. Warnings are disclosed in the publish preview and
accepted via a structured `accept_warning` control by the user. Run ≥1 query smoke test
covering a key question before publish.

## 6. Relationship

- The hub's `manifest.json` (see `manifest-frontmatter-spec.md`) is the source index;
  `schema.md` (this contract) is the compile rule built on that index.
- `csp-wiki` ingests per `schema.md`; lint enforces `lint_requirements`.
- `csp-code-wiki` has its own coverage matrix (not this schema) — this contract is for the
  doc-sourced general wiki, not the code-sourced wiki.
