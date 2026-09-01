# Closed Loop: 需求 → code → test

> How the hub closes the knowledge loop across the lifecycle. The manifest index is what
> makes the loop traceable. Decoupled from platform-hosted dev-knowledge services to local git.

## 1. The loop

```
需求对齐 (PMS 文档spec记录) ──manifest──▶ code 开发 (CMS ground design/codegen)
        ▲                                                │
        │                                                ▼
   test (TMS 存量+增量) ◀──manifest── 审查 (CR 读 CMS+TMS) ◀─ ship (PMS 闭环)
```

Every artifact in the loop is a manifest item with `source_id` + `output_path` + `build_status`,
so any stage can **locate** what it needs and **trace** what it depends on.

### Stage by stage

| Stage | Spec | Manifest role |
|-------|------|---------------|
| 需求对齐 | PMS module boundaries + acceptance form recorded as `type: module-spec` pages | items: `pms:MOD-*` |
| tech design / spec | feature spec `SPEC-F-*`; CMS cross-ref entry points | items: `feature-spec:*`, `cms:*` |
| code 开发 | CMS distilled entry/call-chain/conventions; codegen reads CMS to match existing patterns | CMS auto-align after ship → manifest `built` |
| test | TMS requirement→method matrix + stock cases; incremental only for delta combos | items: `tms:*` |
| 审查 (CR) | CR reads CMS call-chains + TMS stock → emits only incremental cases | locate `cms:*` + `tms:*` |
| ship | PMS closure (every AC traceable to a requirement) + three specs fold deltas into canonical | manifest marks `built`; milestone archive |

## 2. Knowledge-signal rules (what to capture, how to tag)

Capture into the hub when a signal is **durable, cross-session, and non-derivable from code alone**.
Tag each captured signal by type so the hub can route it to the right spec/wiki area.

### Signal types → knowledge types

| signalType | When | knowledgeType |
|------------|------|--------------|
| `development_pitfall` | dev gotcha + avoidance method | `development_pitfall` |
| `user_correction` | user corrects an existing conclusion | `user_correction` (or original type) |
| `knowledge_missing` | task found a knowledge gap | the missing type |
| `knowledge_stale` | knowledge conflicts with current fact | original type |
| `knowledge_conflict` | multi-source divergence | original type |
| `requirement_impact` | new requirement affects existing knowledge | `product_prd` / `business_rule` / app type |

### Allowed knowledgeType (closed vocab)

`business_rule` · `product_prd` · `development_standard` · `application_module` ·
`application_interface` · `development_pitfall` · `user_correction`

### Capture record (minimum fields)

```json
{
  "signalType": "development_pitfall",
  "knowledgeType": "development_pitfall",
  "summary": "≤500-char short summary",
  "sourceRefs": [{"type": "task", "ref": "TASK-1"}]
}
```
Optional: `relatedRefs`, `target.scope`, `target.knowledgeId`, `severity`, `reviewOwner`.
`user_correction`/`knowledge_stale`/`knowledge_conflict` **must** carry `target.knowledgeId`;
`requirement_impact` **must** carry `relatedRefs`.

### Catalog-template association (each knowledgeType → page sections)

| knowledgeType | Page sections |
|---------------|---------------|
| `product_prd` | background, goals, scope, business flow, acceptance criteria, affected apps, sources |
| `business_rule` | rule, scope, exceptions, upstream/downstream impact, sources |
| `development_standard` | scope, norm content, counter-examples, check method, sources |
| `application_module` | responsibility, entry, dependencies, key flows, code location, sources |
| `application_interface` | purpose, request/response, error codes, permissions, callers, code location, sources |
| `development_pitfall` | symptom, cause, fix, prevention, scope, sources |
| `user_correction` | original conclusion, user's correction, basis, impact scope, sources |

### Discipline

- **Report only short summary + recoverable source refs** — never upload bodies, command output, logs, tokens, cookies, passwords.
- A capture creates a **candidate for review**, not a final knowledge page — never directly overwrites a canonical page.
- **Conflict ⇒ issue, not overwrite.** Preserve `target.knowledgeId`; route to owner review/CR; apply only after approval.
- After apply, **re-read** the target page and compare version + source refs; readback failure ⇒ partial-success/conflict.

### What NOT to capture

Temporary debug info, large raw code blocks, secrets, one-off task notes that won't outlive the session.

## 3. Init distinction (two meanings of "initialize")

"Initialize" has two distinct meanings — judge by the user's stated object, not the cwd:

| User wants | Flow |
|------------|------|
| Onboard current repo/app into the knowledge system (link code + business lib + code-wiki) | **app onboarding**: `hub init` → answer → plan → apply → doctor |
| Generate a first-version business knowledge base from a batch of materials (PRD/files/docs) | **business genesis**: `hub init business-audit` → business-plan → business-apply → draft → confirm |

If the user says "init" without specifying: ask **one** clarifying question (onboard vs genesis), do not write.

## 4. Conflict detection before add (production memory practice, localized)

Before writing any new knowledge page:

1. **search** the hub for an existing same-topic page (`hub_manifest.sh locate <query>`).
2. If a conflict exists (same fact, different value) ⇒ **auto-update** the existing page with the new value + provenance; **do not** ask "delete the old one?".
3. If the conflict is a genuine divergence (two sources disagree) ⇒ keep both, mark the divergence in the body, set `confidence: low`.

Definition-of-done for a knowledge operation:
- (a) conflict-detection run before write
- (b) user clearly told what happened (added / updated / skipped)
- (c) manifest updated (`build_status`, `content_hash`, `updated`)

## 5. CLI-over-generated-code

Always prefer `scripts/hub_manifest.sh` (pure git+grep, zero deps) over generating Python
to manipulate the hub. Generated code is ~10× slower, non-reproducible, and cannot be
audited. The script is the contract layer — don't bypass it.

## 6. top-level hub commands (mirrors a six-command dev-knowledge surface, localized)

| Command | Purpose |
|---------|---------|
| `hub init` | onboard a repo/app; discover relations |
| `hub doctor` | health-check manifest + AGENTS.md + frontmatter consistency |
| `hub context` | load the relevant manifest slice for the current task |
| `hub explain` | surface the provenance/confidence of a located page |
| `hub finish` | fold deltas into canonical + archive milestone |

## 7. Team wiki coordination (cross-team shared hubs)

For shared cross-team hubs:
- one owning team per topic; `seeAlso` links across team boundaries.
- cross-team pages are `type: reference` (index) — the substantive page lives in the owning team's area.
- conflicts between teams ⇒ divergence-marked, `confidence: low`, escalated to owners (never auto-adjudicated).
