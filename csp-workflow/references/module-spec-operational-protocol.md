# Module Spec Operational Protocol

> Shared operational discipline for `csp-product-spec` (PMS), `csp-code-spec` (CMS),
> `csp-test-spec` (TMS). Distilled from production spec-generation practice and
> generalized to be platform-neutral (git + `CSP_GIT_REMOTE`, default `github.com`).
>
> These are the **how** — the runtime disciplines that keep a living baseline
> trustworthy across long, interruptible, multi-agent runs. The **what/when** is in
> `module-spec-lifecycle-norms.md`; the **content standard** is in each skill's
> `references/*-spec-standard.md`. Read this when a spec job may span sessions,
> agents, or iterations.

## 1. Disk as Source of Truth (磁盘为真相源)

A Module Spec job (full distillation, auto-align, incremental case gen) can span
hours and multiple context windows. **Memory is not reliable; the filesystem is.**

- Every long job writes a **checkpoint** (`state.json` + cursor) under its work dir
  (`.csp/{product,code,test}-spec/.../`). The checkpoint — not the conversation — is
  the only trusted resume source.
- **Write-before-throw:** on any failure, persist `lastError` + cursor + history
  *then* surface the error. Never reverse the order — a thrown error that pre-empts
  the write loses the resume point.
- `cursor` = "where to resume next" (phase + scope + item). `history` = append-only
  event log (truncate >200 entries).
- Status vocabulary: `completed | in_progress | failed | skipped | paused`.

### Checkpoint schema (shared shape)

```json
{
  "schemaVersion": 1,
  "spec": "pms|cms|tms",
  "scope": "<module|app|module>",
  "baseline": { "gitSha": "...", "tag": "...", "remote": "github.com" },
  "inputs": { "...": "..." },
  "phases": { "<phase>": { "status": "...", "items": {}, "error": null } },
  "cursor":  { "phase": "...", "scope": "...", "item": "..." },
  "lastError": null,
  "history":  [ { "ts": "...", "event": "phase.completed", "phase": "..." } ]
}
```

## 2. Resume Protocol (断点续跑)

On startup, detect an existing checkpoint for the scope:

1. **Resume decision** (offer, don't assume): continue from cursor / rollback to last
   completed phase / restart (clear checkpoint) / view progress only.
2. **Drift check before resume** (mandatory — the world moved since the checkpoint):

| Check | Fail handling |
|-------|---------------|
| Baseline git SHA still reachable (`git cat-file -e`) | ask rebuild / abort |
| Work-dir path still a readable git repo | re-resolve; mismatch → confirm update |
| Local branch == checkpoint record | ask keep-local / switch-back / skip |
| Per-item status still matches upstream | externally-completed → ask skip |
| Placeholder IDs (`_TBD*` / `_NEW*`) present | block the execution phase (see §6) |

3. **Idempotency per phase** (determines resume action):

| Phase class | Idempotent? | Resume action |
|-------------|-------------|---------------|
| Establish (init/distill baseline) | No | verify baseline exists → skip; else ask rebuild |
| Split / decompose | Yes | reconcile against source; fill missing, never delete |
| Generate (code/cases) | No | per-item: done→skip, in-progress→ask, fresh→run |
| Review / align | Yes | just re-run |

> A re-run over an **unchanged** source must yield **zero delta**. Non-zero delta on
> unchanged source ⇒ the baseline rotted (manual edit or prior mis-align) ⇒ trigger
> full re-distillation + warn.

## 3. File-Type Boundary (文件类型边界)

Mixing skill-owned files with runtime artifacts corrupts the package and lets one
project's output masquerade as another's input. Four classes:

| Class | Location | Agent may | As business input? |
|-------|----------|-----------|--------------------|
| **Skill protocol** (SKILL.md, references/, assets/) | skill repo | read (the protocol/templates) | ❌ never as this-run data |
| **Skill impl** (scripts, build tooling) | skill repo | treat as black box | ❌ do not Read/grep to "predict" rules |
| **Runtime work dir** (checkpoint, spec, deltas) | `.csp/...` under project | ✅ this run's valid input | ✅ this scope only — never read another scope's |
| **Runtime temp** (clones, scratch) | `/tmp` or `.csp/tmp/` | ✅ this phase only | ✅ ephemeral |

**Hard guardrails (enforced by convention + scripts):**
- A runtime artifact path resolving inside the skill repo → reject (do not write).
- `.gitignore` fallback: ignore all runtime artifact names so a stray write can't be
  `git add`-ed into the package.
- Resolve symlinks before the boundary check (prevent `ln -s` bypass).
- One work-dir per scope; **never** two projects share one git worktree (branch
  conflicts). Use `git worktree` for isolation.

## 4. Contract Authority (契约优先，禁止读实现预判规则)

- The skill's documents + the spec's own `validate`/`fix_hint` messages are the
  **only** authority for rules, thresholds, and enums.
- **Never Read/grep skill implementation source to "pre-derive" what a rule will
  accept.** Static memory of enums drifts as the toolchain upgrades; query the
  contract, don't recall it.
- **Never bypass the contract layer** (CLI / scripts) to call a platform HTTP API
  directly. Field-type conventions (e.g., a version field must be a JSON-*string*,
  not a dict) are encapsulated inside the contract; hand-writing them invites silent
  server-side failures whose real cause is swallowed.
- On contract failure: read the error code / `fix_hint`; if network/timeout, advise
  tuning `DEFAULT_TIMEOUT_SEC` or retry; if truly unreachable, report — **do not
  silently switch paths**.

## 5. Dual Gate + Judge (双重门禁 + 判官)

A spec phase exits through **two gates** (both must pass to advance):

1. **Code gate** (deterministic): runs the phase's exit contract — artifact presence,
   schema, hard rules (the `D1..Dn` constraints), lint. Fail → fix per `fix_hint`.
2. **Judge gate** (adversarial, only for blocking phases): an **independent sub-agent**
   evaluates the phase artifacts against a **rubric**, writing a `verdict.json`.

### Judge handoff protocol
- Code gate passes ⇒ write a judge handoff prompt + exit-with-pending.
- The judge **must** be dispatched as a sub-agent (independent context). Tool
  whitelist: Read / Grep / Glob / Write (verdict only).
- A **pass verdict** ⇒ gate clear. A **fail verdict** ⇒ output violations + 3
  fix options. A **missing/stale** verdict ⇒ re-enter handoff.
- Every violation **must** cite `evidence_quote` (a real string from the artifact) +
  `rule_id` + fix suggestion. No verdict by impression.
- Judge needs no external API — it relies only on the host's sub-agent capability.
  Headless hosts without sub-agents must set a skip flag and **record the reason**
  (audit-grade, same tier as a force-exit).

### Three fail-fix options (when a gate blocks)
- **rerun** — re-execute the offending module with the violation feedback appended.
- **skip** — drop a specific item from this run (mark `no_enrich=true`).
- **force-exit** — override the gate with a written justification (≥120 chars +
  rationale keywords). Audited; never silent.

> Advisory phases (preflight, decide, persist) run only the code gate; the judge is
> optional but skipping it still writes a `skipJudgeReasons` audit entry.

## 6. Anti-Hallucination at Input (check-inputs，禁止语义猜测)

Before any `init`, machine-validate the required inputs and ask only for what's
missing — **one** consolidated `AskUserQuestion`, never piecemeal.

- **Options must come from the real tree, not from semantic guessing.** If a field
  must pick a product/module from the existing spec, query the real candidates
  (`suggest` against the live baseline) and use those as option labels. Seeing a URL
  path and *guessing* "looks like the Seller-Products module" is forbidden — a
  guessed option not in the real tree fails at save time and leaves the node orphaned.
- **Never rename the user's stated names.** If the user says "Favorites page", the
  spec node name is "Favorites page" — verbatim. Do not "helpfully" expand it to
  "Buyer Favorites Homepage" from URL/DOM inference.
- If the contract network is down, ask the user to type the full name — **do not**
  fall back to guessing a few candidates from semantics.

## 7. Atomic Execution Unit + Exit Codes (原子单元 + 退出码)

For autonomous / loop-driven maintenance, break the job into atomic units (one
process per unit) so context never approaches the limit:

| Unit granularity | Example |
|------------------|---------|
| Establish | whole baseline (one HLD) |
| Decompose | one module |
| Generate | one module's one task/case |
| Review/align | one module |

**Exit codes** (consumed by an outer loop):

| Code | Meaning | Loop behavior |
|------|---------|---------------|
| 0 | unit done, more pending | continue |
| 100 | all phases complete | success exit |
| 2 | blocked, needs user (drift fail / missing input / branch conflict) | wait for user |
| 1 | unrecoverable (repeated failure / corrupt checkpoint) | fail exit |

**Machine-readable status line** (stderr tail, `grep`-able by the outer loop):
```
##CSP-SPEC STATUS: pending|complete|blocked|error
##CSP-SPEC NEXT: spec=cms,scope=auth-service,phase=align,item=entrypoints
##CSP-SPEC CKPT: .csp/code-spec/auth-service/checkpoint.json
```

**Soft-pause triggers** (degrade when no outer loop): ran ≥ `--max-units` units /
user said stop / single tool output >30K chars / pre-compact hook fired. On
soft-pause, **in order**: write checkpoint (cursor → next unit) → write handoff →
emit short summary + resume command → stop. **Do not** "try one more unit".

## 8. Handoff Document (5-block, human-readable)

Alongside the machine `checkpoint.json`, write a human handoff with **file:line
references and why-not-what**:

1. **Goal + acceptance** — what "done" means for this scope.
2. **Status snapshot** — per-phase ✅/⏳/⏸ with counts and the blocking item.
3. **Key decisions + why** — non-obvious choices with rationale (not restating what).
4. **Irreproducible artifacts** — `file:line` of entry points / placeholders / known
   fixtures a fresh session cannot rediscover.
5. **Next concrete actions** — numbered, executable (with exact commands/paths).

## 9. Anomaly Handling Matrix (anomalies)

Concrete failure → handling (generalize per skill). Pattern:

| Scenario | Handling |
|----------|---------|
| Required input missing | one consolidated ask; never guess |
| Current branch is `master`/`main` | block; tell user to cut a feature branch |
| Placeholder ID (`_TBD*`/`_NEW*`) in items | block execution phase; pre-check after decompose |
| One item fails | skip that item, continue siblings; summarize at end |
| All items in a phase fail | halt the phase; emit error list |
| Contract NPE / internal error | do **not** paper over with a local placeholder; retry ≤3 then halt |
| Path drifted since checkpoint | re-resolve; mismatch → confirm update |
| Baseline upstream gone | ask rebuild / abort |

## 10. Cross-Cutting Constraints (violate → bugs)

1. The skill is a **contract layer, not a tool inventor** — drive via the documented
   commands/scripts; don't fabricate calls.
2. **Cross-scope serial, not parallel** — parallel causes write conflicts + file
   overwrites. Isolate with `git worktree` when parallelism is unavoidable.
3. **Each scope on its own worktree/branch** — the contract hard-checks branches.
4. **Write-before-throw** — persist state, then surface the error.
5. **Soft-pause then stop** — never "squeeze in one more".
6. **Don't auto-trigger fixes** — a review/CR report ends the run; the user decides
   what to fix. (Auto-fix is a separate, user-invoked step.)
7. **Don't skip steps** — a scope that failed/skipped a phase is skipped in later
   phases too.

## 11. Escape-Hatch Matrix (skip conditions)

A **user choosing "skip" in AskUserQuestion is NOT an escape hatch** — only environment-level
unavailability qualifies. Escape hatches are audited; a `force-exit` requires a written
justification (≥120 chars + rationale keywords: `不可恢复 / 紧急 / 已与 / 环境 / 已确认`).

| Scope | Skip condition | Audit |
|-------|----------------|-------|
| Whole enrich phase | user `enrichWithCode=false` | legal path, no justification needed |
| `force-exit <phase>` | justification ≥120 chars | audited |
| Node `metadata.static_only=true` | pure-copy module | skips PRD-voice + layout lint |
| Node `metadata.no_visual_layout=true` | invisible/no-visual module | skips layout lint |
| Node `metadata.no_traversal=true` | pure static doc page | skips JS injection |
| Node `metadata.public_component=true` | shared component | business lives on the public node |
| Node `metadata.tech_voice_allowed=true` | rare engineering-voice allowance | audited |
| Node `metadata.archetype_freeform=true` | page matches none of the 5 archetypes | audited |
| Node `metadata.no_enrich=true` | user actively skipped this module/action | `phase decide skipModules/skipActions` |
| Node `metadata.no_action=true` | module has no interaction (display card) | structural completeness |
| Auto-skip action | interaction.type ∈ SKIP_ENRICH_TYPES (navigation_*, safe_reversible, destructive_opener) | written to `skipped_actions` |

## 12. Enrich Depth Tiers

| Tier | Behavior |
|------|----------|
| **skip** | no code enrich; skeleton is the spec |
| **smart** (recommended) | enrich only required (destructive-commit / form-input / modal-open) + optional action enrich; SKIP types don't dispatch a subagent |
| **full** | enrich everything including optional; highest-quality first edition |

## 13. Error-Recovery Exit Taxonomy (finer than §7's 0/100/2/1)

For sub-process / loop-driven runs that emit machine-readable exits:

| Exit | Meaning | Recovery |
|------|---------|----------|
| 0 | unit done, more pending | continue |
| 100 | all phases complete | success exit |
| 2 | input/config invalid | fix args / config |
| 3 | input or confirmation required | collect outstanding selections **once**, bundle them; handle structured `needs_input`; recover a legacy plan if present |
| 4 | auth/permission denied | read `failedAction.target`; request access via the owner; retry same session |
| 5 | dependency/source unavailable | retry source check; **do not use model memory** |
| 6 | policy blocked | create a knowledge Issue; do not continue with deterministic facts |
| 7 | partial recoverable | do **not** stop at first exit 7; execute returned actions, resolve blockers, then re-audit |
| 8 | conflict | preserve both sides; route to owner decision |

**Selection-first recovery (exit 3):** present all returned `selectionBundle.questions`
**once** in one confirmation UI, map answers to candidate IDs, then `complete` — do not add
a per-question follow-up prompt. Use manual `--value` only when `allowManual=true` and
discovery is unavailable/wrong.

**Plan-hash semantics:** a confirmation expires only when **semantic** inputs change (write
targets/actions, selected-object stable identity or real revision, project config/Git
revision, spec identity/association, effective policy). Provider status, display fields,
candidate ordering, and equivalent aggregate-observation drift do **not** expire confirmation.

## 14. Selection ordering (init)

When onboarding an app into the knowledge system, resolve selections in this order:
**Git context → real application identity → exact existing code-wiki → business domain /
knowledge repos / sources.** Code-wiki is auto-selected when unique; it becomes a
single-select question only when multiple exact matches exist. Never auto-pick the first /
newest / `master` / `main` result.
