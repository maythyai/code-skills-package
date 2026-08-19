# scripts/

Build, validation, and maintenance tooling for the CSP skill package. All scripts are
zero-runtime-dependency Node ≥ 18 ESM (or plain JS), invoked via the `npm run` aliases in
[`package.json`](../package.json). See [CLAUDE.md](../CLAUDE.md#engineering) for the pipeline overview.

## Build pipeline (`npm run build:all`)

| Script | `npm run` alias | Purpose |
|--------|-----------------|---------|
| `build-skill-metadata.mjs` | `build:metadata` | Extracts v2 metadata (`phase`/`domain`/`scope`/...) from every `SKILL.md` into `csp-router/skill-metadata.yaml`. |
| `generate-triggers.mjs` | `gen:triggers` | Auto-generates trigger keywords for skills present in `registry.json` but missing from `triggers.yaml`. |
| `fix-triggers.mjs` | `fix:triggers` | Repairs broken skill references and duplicate trigger keys in `triggers.yaml` against `registry.json`. |
| `build-skpg.mjs` + `build-skpg-edges.mjs` | `build:graph` | Builds the Skill Knowledge Graph (`csp-router/skpg/graph.json` + `index.json`), then adds `depends_on`/`related_to` edges. |
| `shared/scripts/build-registry.mjs` | `build:registry` | Regenerates `csp-router/registry.json` from `SKILL.md` frontmatter (canonical skill source of truth). |
| `shared/scripts/build-page.mjs` | `build:page` | Renders `docs/csp-page/index.html`, the interactive skill dashboard. |

## Validation (`npm run validate:all` / `npm test`)

| Script | `npm run` alias | Purpose |
|--------|-----------------|---------|
| `validate-skill-v2.mjs` | `validate:skills` | Validates every `SKILL.md` against the v2 frontmatter spec. |
| `validate-triggers.mjs` | `validate:triggers` | Confirms `triggers.yaml` only references skills that exist in `registry.json`, and flags duplicate trigger keys. |
| `validate-registry.mjs` | `validate:registry` | Structural schema validation for `registry.json` (shape, field types, path existence, layer enum). |
| `count-skills.mjs` | `count:skills` | Authoritative skill counter — reports the canonical count from `registry.json` and fails if any hard-coded count in README/CLAUDE.md/docs drifts from it. |
| `shared/scripts/verify-graph-source.mjs` | `verify:graph` | Confirms the SKPG graph was built from the current registry/metadata (no stale rebuild). |

## One-off / maintenance scripts

| Script | Purpose |
|--------|---------|
| `backfill-v2-frontmatter.mjs` | One-shot migration: adds `phase`/`domain` fields to legacy v1 `SKILL.md` files. |
| `integrate-qoderwork-skills.mjs` | One-shot port of selected external skills into CSP, adapting frontmatter to the v2 spec. |
| `sync-version.js` | Syncs the version in `package.json` to every file that hard-codes it (`node scripts/sync-version.js [new-version]`). |
| `learning-loop-merge.mjs` | Merges/dedupes/decays `.csp/intel/` entries produced by the continuous-learning engine. |
| `token-budget.mjs` | Tracks and enforces per-task token budgets at runtime. |
| `query-skpg.mjs` | CLI to query the Skill Knowledge Graph (dependency lookups, related-skill search). |
| `csp-wiki.mjs` | L4 `csp-wiki` skill operations (persistent markdown knowledge base). |
| `visualize-workflow.js` | Generates a Mermaid DAG diagram from a workflow JSON definition. |

Never hand-edit generated output (`registry.json`, `triggers.yaml`, `skill-metadata.yaml`,
`skpg/graph.json`, `skpg/index.json`, `docs/csp-page/index.html`) — re-run the build scripts instead.
