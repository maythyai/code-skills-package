# Phase-Judge Rubric

> The judge contract for the dual-gate (code gate + judge sub-agent). Generalized from
> production PMS generation (51 rubrics across 6 phases). Used by the operational protocol's
> §5 dual-gate. A judge is an **independent sub-agent** that evaluates phase artifacts
> against rubrics; it never repairs.

## 1. Judge model

- **Tier:** `heavy` (blocking — code gate + judge both must pass) or `light` (advisory — code
  gate only; judge optional but skipping writes an audit reason).
- **Input:** all artifacts of the phase + upstream evidence + full spec context.
- **Per-rubric:** pass/fail. A `high`-severity hit ⇒ overall verdict = fail.
- **Violation must carry:** `evidence_quote` (a real string from the artifact) + `rule_id` +
  a fix suggestion. **No verdict by impression.**
- **Independence:** the judge sub-agent cannot see another role's private state; it reads
  artifacts + evidence only, writes only `verdict.json`. Tool whitelist: Read/Grep/Glob +
  Write (verdict only).

## 2. Rubric item format

```
### R{phase}.{seq} [severity]
- applies_to: <artifact file(s) / fields>
- what_to_check: <the rule, in plain terms>
- evidence_required: <how to prove it (file-system / git output / set-equality / content match)>
```

`severity` ∈ `high` (fail) / `medium` / `low` (report). `evidence_required` makes the check
machine-verifiable, not subjective.

## 3. Generalized R-catalog (portable subset)

> The original is 51 rules; these are the platform-neutral core. Confirm the live
> `validate`/`fix_hint` for authoritative thresholds — don't recall.

### Preflight (R0)
| Rule | Severity | Check |
|------|----------|-------|
| R0.1 | high | environment checks all `ok=true` (git / runtime / workspace / assets) — a live probe, not a declaration |
| R0.3 | medium | work-dir path legal (under `CSP_WORK_DIR`, writable, no stale state) |
| R0.4 | high | **file-type boundary**: every artifact path under the current work-dir; none in the skill repo or another work-dir; never treat example/fixture files as this-run input |

### Collect / model (R1–R2)
| Rule | Severity | Check |
|------|----------|-------|
| R1.1 | high | each declared module has a real container in the surveyed source; obvious functional areas are modeled or reasonably merged |
| R1.2 | high | interaction type override sound: delete/add-to-cart → `destructive_committal`; link → `navigation_*`; input → `form_input` |
| R2.1 | high | every module traces to a surveyed M_i; every M_i is either modeled or in `skipModules` (provenance closure) |
| R2.2 | high | node description is a user-readable one-liner, **no tech detail** ("calls X API"/"renders Y"), ≤80 chars |
| R2.3 | high | pure-copy module ⇒ `metadata.static_only=true`; pure-wrapper layer must not become a module (extraction R5) |
| R2.6 | medium | **specs don't bleed**: layout has no API path; workflow has no ASCII sketch; data has no if/else business rule |
| R2.8 | high | node `name` contains ≥1 CJK char (no pure-english "Header"/"Tab Navigation") |
| R2.9 | medium | workflow mentioning state-machine/flow/enum/sequence/ER ⇒ use a Mermaid fenced diagram, not prose only |
| R2.10 | high | `virtual_page`: no children; no matchRegexUrl/layout/i18n; `workflow` non-empty (product-voice only, no interface contract); `data` optional; ≥1 code-repo/doc provenance. `page` type is exempt. |

### Enrich (R4–R5)
| Rule | Severity | Check |
|------|----------|-------|
| R4.1 | high | every local repo path exists and non-empty (clone succeeded) |
| R4.2 | high | every repo is current: `git log -1 --since=30days` has ≥1 commit, or `ls-remote HEAD` diff = 0 |
| R4.3 | high | repo-paths cover all confirmed apps (exact count, none missing none extra) |
| R5.1 | high | every business rule derives from code analysis — **no fabrication**; invented numbers/rules = fail |
| R5.2 | high | **6 extraction signals** explicitly present: numeric constant / if+exception / enum / default / sort param / filter where (≥3 of 6) |
| R5.4 | high | **sanitizer blacklist**: no Controller/Service/DAO/annotation, no tracking-key list, no DTO field-type table, no call-chain/class:line in the product body (see `code-to-spec-extraction.md §2`) |

## 4. Verdict + fix options

- **pass verdict** ⇒ gate clear; record `state.judgeVerdicts[phase]`.
- **fail verdict** ⇒ output violations + 3 fix options (the judge does **not** repair):
  - **rerun** — re-execute the module with the violation feedback appended.
  - **skip** — drop the item (`metadata.no_enrich=true`).
  - **force-exit** — override with a written justification (≥120 chars + rationale keywords). Audited.
- **missing/stale verdict** (wrong schema / rubric_version mismatch) ⇒ move verdict to
  `.stale.json`, re-enter the handoff flow.

## 5. Handoff flow

```
phase N exit:
  code gate (deterministic D-rules + lint) ──fail──▶ reject
        │ pass
        ▼
  judge handoff: write prompt + exit-pending ──▶ sub-agent reads prompt
        │                                          → rubric eval → verdict.json
        │ pass verdict ◄────────────────────────────┘
        ▼
  phase N clear
```

Headless (no sub-agent): set `CSP_AGENT_JUDGE=0`, record `skipJudgeReasons[phase]` (audit-grade,
same tier as force-exit). Never silently skip.

## 6. Relationship

- This is the **judge gate** half of `module-spec-operational-protocol.md §5`.
- R5.1/R5.2/R5.4 enforce `code-to-spec-extraction.md` (no-fabrication, 6 signals, sanitizer).
- R2.2/R2.6/R2.8/R2.10 enforce `product-spec-standard.md` PRD-voice (no tech impl).
- R0.4/R4.x enforce `module-spec-operational-protocol.md §3` file-type boundary.
