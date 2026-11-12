# Project Entry and Freshness Contract

Use this contract when initializing a project's knowledge hub, writing a project instruction file, or deciding what a new agent should read. It governs *selection and provenance*, not a mandatory repository template. Read the project's own conventions before selecting paths; examples below are CSP defaults when the project has no established equivalent.

## Four layers: read by intent, not by directory traversal

| Layer | Read on arrival | Contains | Do not embed |
|---|---|---|---|
| L0 identity | Project `CLAUDE.md` / root `AGENTS.md` if the host loads them | Purpose, hard constraints, safety boundaries, runnable commands, link to the route card | Version histories, full skill catalog, metrics, test logs |
| L1 position | `.csp/lifecycle-state.json` if present | Current milestone/stage, blocker summary and pointers to the most recent evidence | `dev_log` history, large reports, unqualified `tests_passed` claims |
| L2 route | `.csp/AGENTS.md` operation table; query `.csp/manifest.json` with `hub_manifest.sh locate/list` | Intent → authoritative source path → scope/owner | Full manifest pasted into a prompt, second manually maintained index |
| L3 evidence | Only the matching PRD/PMS, Spec/CMS, TMS, source/test files and verification artifacts | Decision details and reproducible evidence | Unrelated modules |

For design load active PRD and PMS; for implementation add Spec and affected CMS entry points; for testing add TMS and the relevant test files; for audit add finding sources and last gate evidence. If the route card is absent, discover paths once and record the route, not a permanent broad glob instruction. If a route target is missing, report it as missing and correct the route; do not invent an authoritative replacement.

## File roles and ownership

| Artifact | Owner/update trigger | Validity check and access |
|---|---|---|
| Root instruction files | Project owner on hard-rule/tool changes | Link targets resolve; loaded instructions stay short and actionable, not a second repository wiki |
| `.csp/AGENTS.md` | Knowledge hub on directory/authority change | Six sections including the operation route table; test representative intents against real paths |
| `.csp/lifecycle-state.json` | Lifecycle driver at stage transitions | First detect which supported state schema the project's driver actually writes; do not mix `00–07` arrays with `S0–S9` objects |
| `.csp/manifest.json` | Artifact producer at writeback (unless an actual writer exists) | Stable `source_id` and git-blob `content_hash`; unique source index, queried selectively; no claimed automatic sharding |
| `docs/strategy/`, active `docs/prd/` | Planning/PRD owner on requirement change | Human-readable, active originals stay discoverable while 01 and TB consume them; PMS is derived engineering context |
| `.csp/product-spec/`, `.csp/code-spec/{app}/`, `.csp/test-spec/{module}/` | PMS/CMS/TMS owner on accepted change | Trace PRD → spec/code → test with evidence; preserve module boundaries |
| `.csp/artifacts/verify/evidence/` (or mapped existing evidence root) | Verification stage on actual execution | Command/exit, screenshot/trace or test report and source commit; referenced evidence is retained |
| `*FINDINGS*.json` in registered finding zones | Finding producer on audit/fix | Status, stable ID, source path and verification evidence; unresolved items remain locatable |
| `.csp/findings-baseline.json` | Closure-check operator in a bounded legacy-cleanup operation | **Existing rule-violation grandfathering only**; never store all OPEN findings or auto-expand to accommodate new violations |

`docs/` is for human-readable material, `.csp/` for agent/pipeline artifacts, and the root for discoverable entry/config files. Whether a project publishes its human docs is a separate access-control decision; do not call `docs/` automatically public. A monorepo may keep code/tests under `apps/*` or `packages/*`; mirror existing module organization rather than requiring root `src/` and `tests/`.

## Current truth versus last observation

1. A metric is a **last-known observation** only when paired with `observed_at`, `source_commit`, `environment`, `command`, `exit_code`, `evidence_path`, and the measured value. Without that metadata report `unknown`. A human status card can point to an existing `.csp/verification/` result; do not duplicate full test output in lifecycle state.
2. A cached observation helps prioritize what to inspect, **never** satisfies today's quality/release gate. Run the relevant command again before claiming green. If the source commit or environment differs, mark the observation stale explicitly.
3. A current finding inventory is derived from source `*FINDINGS*.json` files with de-duplication by `(source_path, finding_id)`. If creating a convenient OPEN summary, annotate `generated_at`, scanned paths and any unscanned zones; it is disposable and never replaces the underlying findings or the closure-violation baseline. Do not call the existing `hub_manifest.sh diff` an OPEN-finding refresh: it compares **already indexed output files** against recorded hashes.
4. The manifest may be large. Query it by intent; a `recent changes` summary, if needed, is a derived view with provenance. Do not add an unimplemented `recent_delta` field or promise automatic scanning, writeback, or sharding. A newly created source not yet indexed requires an explicit indexing action.

## Size, retention and migration

- Size is a signal, not correctness. Keep auto-loaded rules and route cards concise; use links and stable indexes for large details. A 50 KiB Markdown warning is a configurable review prompt, **not** a universal 10/100/250 KiB release gate. `scripts/check-large-files.sh` is read-only and warnings-only by default; `--fail-kb N` explicitly opts into failure. It scans only paths printed in its output. JSON indexes are not subject to Markdown limits.
- Split an oversized entry document by responsibility after checking consumers; keep the authoritative path/index and update links. Never truncate source, delete an active PRD, rotate a baseline referenced by an unresolved finding, or archive a spec needed by a pending version merely because of age/size/count. Archives require supersession, an inbound-reference check, manifest re-pointing and an explicit project retention decision.
- In brownfield projects, inventory existing source/outputs and determine ownership before proposing a migration. Preserve established executable paths until readers, imports, CI and references are changed and validated. Directory examples are non-destructive defaults, not a whitelist of allowed root files. Do not edit working code to satisfy a documentation layout rule.

## Scenario checks

| Scenario | Expected decision |
|---|---|
| `CLAUDE.md` is 44 KiB and contains mandatory constraints | Keep mandatory text visible; move only non-binding background to indexed references; validate load behavior before promising a 10 KiB result |
| A 220 KiB approved PRD is still the next version's 01 input | Keep it accessible; consider a linked appendix after checking readers; size alone never archives it |
| A 503 KiB manifest is slow to read | Locate/list only relevant items; do not invent sharding or load all JSON into context |
| Fresh OPEN findings coexist with `.csp/findings-baseline.json` | Search source findings; baseline remains a separate set of legacy checker violations |
| A recent gate says green on a different commit/environment | Show it as historical observation and rerun the gate before release |
| A monorepo uses `apps/web`, `backend/` and package-local tests | Record those as authoritative paths; no forced root `src/tests` migration |
