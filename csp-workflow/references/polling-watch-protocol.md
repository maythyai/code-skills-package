# Polling & Watch Protocol

> Shared async-state discipline for `csp-code-spec` (align watch) and `csp-test-spec`
> (test execution / environment-deploy watch). Generalized from production test/tooling
> practice to be platform-neutral: the watch interface is whatever the contract exposes
> (`<cli> <resource> status --watch`), not a specific platform API.
>
> Read when a spec job waits on an async operation (build, deploy, test run, re-align).

## 1. The Core Rule: Status Before Result

**先查状态，终态后才查结果。** Never call the result/fetch endpoint while the task is
still running — you will get an empty/partial payload and mistake it for failure.

```
submit task → poll status (watch) → only on TERMINAL status → fetch result
```

A task has exactly one terminal transition. Before it, status only. After it, result only.

## 2. Watch Interface

Prefer the contract's native watch flag over hand-rolled loops:

```
<cli> <resource> status --id <id> --watch --interval <dur> --timeout <dur>
```

| Parameter | Purpose |
|-----------|---------|
| `--watch` | block and poll until terminal or timeout |
| `--interval` | poll cadence (backend deploy ~30s; build ~15s) |
| `--timeout` | hard cap; exceeding ⇒ exit code 3 |
| `--id` / `--environment-id` | pin the exact target (avoid picking up a historical env sharing the same change id) |

If the contract lacks `--watch`, fall back to a manual loop (e.g. every 15s, max 10
iterations) following the same terminal-state rules.

## 3. Exit Codes (the contract's verdict)

| Exit | Meaning | Action |
|------|---------|--------|
| `0` | ready / success | verify the success predicate (e.g. all machines `deployStatus == SUCCESS`); fetch result |
| `2` | failed / cancelled | immediate stop; show failure info; do not fetch result as success |
| `3` | polling timeout | give the user the environment/dashboard link to confirm manually; decide whether to backfill |

> Exit code 0 is necessary but not sufficient — re-check the success predicate from the
> returned payload (all units ready), because a `0` on a partial check is a classic
> false-positive. Exit code 3 is **not** a failure; it is "undetermined" — surface it to
> the user, don't auto-retry.

## 4. Backend-Deploy Watch

```
<cli> env status --change-id <id> --stage PRE_PUBLISH \
  --watch --environment-id <env-id> --interval 30s --timeout 15m
```

- Ready predicate: **every** entry in `machineList[].deployStatus.value === SUCCESS`
  (not just the first, not "most").
- `FAILED` / `CANCEL` on any unit ⇒ exit 2 immediately, do not wait for siblings.
- Timeout ⇒ exit 3, hand the env link to the user.

## 5. Build Watch

```
<cli> build status --task-id <id> --watch --interval 15s --timeout 3m
```

Status matrix (typical `pub_status` semantics — always confirm against the live
contract enum, never from memory):

| Status | `endtime` | Interpretation | Action |
|--------|----------|----------------|--------|
| building | empty | in progress | keep waiting; **do not** call result |
| success | present | terminal-success | fetch artifact |
| failed | present | terminal-failure | fetch error log |
| other | present | terminal | fetch artifact first; if none, fetch error log |

Normalize case per the contract enum (e.g. `WAP→Wap`, `ios→iOS`); an explicit value
not in the enum ⇒ stop and ask, never substitute.

## 6. Region / Lookup Caching

When a flow first needs a region (or any lookup dimension):

- Query once (`<cli> env regions --json`), cache for the whole flow.
- The returned `Label` is the single source of truth for display. **Do not abbreviate**
  it ("Singapore (new unit)" → never shorten to "new unit").
- Map user natural-language aliases to the returned `Label`, then use the record's
  machine key for calls.
- If the target `Label` is absent, **stop** and show the currently-available list. Do
  not backfill from this doc's historical values.

## 7. Machine-Readable Contract (describe before construct)

Before constructing any command the first time, read its contract:

```
<cli> describe <command> --json
```

The contract is the single source of truth for sources, enums, schema, and unsupported
combinations. Reference docs describe **orchestration**, never copy these volatile
rules (they drift as the toolchain upgrades).

| Contract field | How to use |
|----------------|------------|
| `sources.options` | the complete source whitelist; classify input via `when`/`pattern`/`extract_hint` |
| `sources.mutex` | `true` ⇒ at most one source per call (no silent merge) |
| `sources.fallback` | only the described condition permits a sourceless call |
| `required` / `optional` | `required_with` =联动必填 (conditional on source) |
| `enum` | use returned values as the canonical spelling; normalize input case, don't recall |
| `schema` | construct & validate objects against the returned JSON Schema |
| `unsupported_combinations` | non-empty ⇒ check each; on hit use its `remediation`, never trial-submit |

If `describe` is missing or lacks a needed field, the CLI and skill versions mismatch —
**stop**, don't fall back to static enums or guessed DTOs.

## 8. Structured Errors

Business commands emit machine-readable errors. Handle by field, not by re-running:

```json
{ "ok": false, "errorCode": "...", "remediation": "...", "retryable": true }
```

- Retry **only** when `retryable === true` **and** `remediation` explicitly allows; at
  most one auto-retry. Blind re-submission can create duplicate tasks/environments.
- Surface a desensitized failure summary + the actionable remediation to the user.
- "submitted" ≠ "complete" — a `taskId` means guide the user to poll, not declare done.

## 9. Four Confusable Dimensions

Distinguish by the contract's `dimension` field — they share value-spaces but not
applicability:

| Dimension | Meaning |
|-----------|---------|
| repository-case-platform | case's declared端型 in the repo manifest (filter) |
| case-content-platform | the case body's own端型 (execute, text/local-file source) |
| execution-engine | the target engine to run the case |
| application-relation-platform | app↔case relation platform (filter by app) |

Never substitute one for another (e.g. don't use "image-diff" test-type as a端型, nor
coerce端型 into an execution-engine). Shared value-space ≠ shared parameter scope.

## 10. When Watch Is Used in Module Spec

- **CMS auto-align:** long re-align may watch a build/test gate before recording the
  delta — use §1-§5 (status before result; exit-code verdict; timeout ⇒ user).
- **TMS test execution:** the run is async (`taskId`); poll status, fetch report only on
  terminal, surface `resultUrl` on success.
- **Environment deploy (TMS):** §4 backend-deploy watch; never start a test until the
  env gate returns 0 with all units SUCCESS.
