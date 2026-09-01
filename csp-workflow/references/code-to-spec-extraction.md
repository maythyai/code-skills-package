# Code-to-Spec Extraction Norms

> Shared normative reference for reading code to produce a **product**-voice spec (not a
> code index). Used by `csp-code-spec` (distillation), `csp-code-wiki` (authoring), and
> `csp-product-spec` (PMS enrich). Generalized from production spec-fill practice.
>
> The goal: produce ONE business-rule document for the product reader, with evidence from
> code — without leaking implementation detail or splitting by front/back.

## 1. Six extraction signals (only scan these when reading code)

When reading code to extract product rules, scan **only these 6 signal types**; ignore
everything else:

| # | Signal | What it yields | Example |
|---|--------|----------------|---------|
| 1 | **Numeric constants** (5000 / 20 / 60s) | quantity / time limits | `MAX_NAME=20` → name ≤ 20 chars |
| 2 | **`if` + business exception** | business validation rules | `if (balance < 0) throw` → reject negative balance |
| 3 | **Enum classes** (`enum XxxStatus`) | state machines | `OrderStatus{PENDING,PAID,...}` → state transitions |
| 4 | **Default values** (`@Value` / `DEFAULT_*` / `@PageSize`) | default behavior | `DEFAULT_PAGE_SIZE=20` → default page 20 |
| 5 | **ORDER BY / sort params** | default sort | `ORDER BY created_at DESC` → newest first |
| 6 | **Filter SQL where / `@QueryParam`** | filterable dimensions | `WHERE status=?` → filterable by status |

Everything else (boilerplate, wiring, framework calls) is noise — don't extract it.

## 2. Sanitizer blacklist (forbidden in a product-voice spec)

A product-voice spec describes **what the user/business experiences**, never the
implementation. The following must **not** appear in a product (PMS) spec page:

- ❌ Controller / Service / DAO / Mapper / `@annotation` implementation detail
- ❌ Tracking-key lists (those belong in the `metrics` spec, not the product body)
- ❌ DTO field-type tables (belong in `data` spec)
- ❌ Call chains / `ClassName:line` (evidence lives in `sources[]`, not the body)
- ❌ Package names, hook names, framework identifiers

Evidence is still required — but it goes in `sources` (frontmatter `[[path@commit#Lx]]`),
**not** inlined as implementation prose.

## 3. Front/back fusion (one business voice)

When a feature spans a backend repo and a frontend repo, produce **one** business-rule
document organized by user/business voice — the reader is the product person, not a dev
looking for a code index.

1. **One rule, one line** — express in user/business terms; don't annotate whether evidence
   came from front or back. `用户创建分组时，名称非空、最多 20 字符；同名拒绝`
2. **Same effect, different impl → merge into one rule** — still no source annotation.
   `分组名最多 20 字符，超出即被拒绝` (not "front blocks + backend fallback")
3. **Pure-front UX (live validation, scroll-to-top, loading mask, empty state) and
   pure-back hard constraints (login required, cross-account isolation, stock check,
   permission check)** → write by **user-perceptible effect / business constraint**, with
   **no** `[front]`/`[back]` tags. `未登录用户无法勾选商品` (not `**[back]** login enforced`)

**Absolutely forbidden:**
- `**[前端]**` / `**[后端]**` / `(前端兜底)` / `(后端强制)` source annotations
- "front calls / back handles" or `## 前端规则 / ## 后端规则` engineering-voice sections
- Writing the same rule twice (front version + back version)
- Controller names / hook names / package names in the body

## 4. Depth tiers (enrich decision)

When enriching a spec from code, three depth tiers — let the user choose:

| Tier | Behavior |
|------|----------|
| **skip** (save directly) | no code enrich; the model skeleton is the spec |
| **smart** (recommended) | enrich only required signals (destructive-commit / form-input / modal-open) + optional action enrich; SKIP-type actions don't dispatch a subagent |
| **full** | enrich everything including optional; for the highest-quality first edition |

SKIP-type interactions (navigation_*, safe_reversible, destructive_opener) are auto-skipped
and recorded in a `skipped_actions` audit list — never silently dropped.

## 5. Evidence + confidence

- Every material rule cites a frozen commit: `sources: ["[[src/auth.py@a1b2c3d#L44-71]]"]`.
- Cross-verified by ≥2 signals ⇒ `confidence: high`; single signal ⇒ `medium`; inferred or
  conflicting ⇒ `low` (and mark the divergence in the body).

## 6. Relationship to the specs

- **CMS** distills the **structure** (entry/call-chain/convention) — this reference governs
  the **product-rule extraction** that bridges code → PMS.
- **PMS** `workflow` spec is the destination; the sanitizer (§2) + fusion (§3) enforce
  PRD-voice (no tech impl).
- **code-wiki** pages cite the same frozen-commit evidence; the 6 signals (§1) focus what
  a page-writer surveys per domain.
