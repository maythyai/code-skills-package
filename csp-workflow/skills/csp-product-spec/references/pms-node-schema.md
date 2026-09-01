# PMS Node Schema & Hierarchy

> The structure model and JSON schema shape for a PMS (Product Module Spec) baseline.
> Distilled from production spec-generation practice and generalized (platform-neutral;
> node identity uses the PMS `type` vocabulary, not any platform's doc tree).
>
> Use with `csp-product-spec`. The content standard (acceptance form, spec-type
> constraints) is in `product-spec-standard.md`; the runtime discipline is in
> `../../references/module-spec-operational-protocol.md`.

## 1. Five-Layer Architecture (semantic)

The product spec is a tree. The **semantic** layers (what each node *means*) are:

```
Layer 1  page       route / URL / global auth / page-level telemetry
Layer 2  shell      shared header/aside/footer/global overlay (cross-page; public_component=true)
Layer 3  area       in-page functional container (carries child-module coordination) — optional
Layer 4  feature    concrete business capability (independent API / rule / widget)
Layer 5  action     a user interaction with an observable side effect
```

> **`type` field is a closed vocabulary (hard-validated).** The legal JSON `type`
> values are exactly: `page · module · action · product · product_line`. The semantic
> layers `area / shell / widget / modal` are **not** legal `type` values — a container
> layer is encoded as `type=module` with a semantic id prefix (`id=area_*`). A wrong
> `type` is rejected at validation with a diagnostic.

Skip rules:
- `area` is optional; absent ⇒ `feature` attaches directly to `page`.
- `shell` always attaches directly to `page`.

## 2. Extraction Rules R1–R5

When decomposing a page/module into nodes:

| Rule | When to extract | Notes |
|------|------------------|-------|
| **R1 shell** | DOM role banner/footer/aside/overlay iframe; or same selector appears ≥3 pages | `public_component=true`; skips PRD-voice lint, keeps structural validation |
| **R2 area** (container) | ≥2 child modules coordinate; shared child state; unified load strategy; unified empty/error fallback; or "this whole block" visually | optional layer |
| **R3 feature** | independent API / independent business rule / independent widget form | — |
| **R4 action** | user interaction (click/hover/fill) **and** observable side effect | — |
| **R5 don't extract** | pure div/form/section wrapper; pure copy block; semantic HTML tags | fold into parent layout |

## 3. Five Page Archetypes

Avoid locking to one team's page. Each archetype lists cross-domain common shapes:

| Archetype | Common shapes | Structure |
|-----------|---------------|-----------|
| **list_management** | e-comm item list / SaaS data table / favorites / order list / admin resource list | page → shell×N + area(filter+list+pagination+recommend) + shell-footer |
| **detail** | product detail / ticket detail / user home / doc detail | page → shell×N + feature×N (no area) |
| **workflow** | registration / publish form / refund request / config wizard | page → shell×N + area(step-indicator+step-content+step-actions) |
| **dashboard** | workbench / data board / personal home / marketing landing | page → shell×N + feature×M widget (no area) |
| **modal_overlay** | SKU modal / chat overlay / confirm dialog / drag editor | page → trigger + area(modal-body+modal-actions) |

Archetype is inferred (skeleton stage), the agent consumes the result — e.g. a paged
list API (pageIndex/pageSize) ⇒ `list_management`.

## 4. JSON Schema Shape (3 levels: page → module → action)

The canonical PMS document is a 3-level tree. Each level carries a `specs` map; the
spec types allowed differ per level.

### Level 1 — `page`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `type` | string | ✓ | `page` |
| `id` | string | ✓ | `page_<short_name>` (e.g. `page_cart_home`) |
| `name` | string | ✓ | user's verbatim name (never renamed) |
| `matchRegexUrl` | string | ✓ | URL match pattern |
| `bizScene` | string | ✓ | page business-scene key (URL + env derived) |
| `parentUuid` / `prevUuid` | string | ✓ | tree linkage |
| `description` | string | ✓ | — |
| `specs` | object | ✓ | see below |
| `children` | array | ✓ | level-2 modules |

`page.specs` (additionalProperties: false):

| Spec | Required | Content |
|------|----------|---------|
| `layout` | ✓ | ASCII layout + region map + visual spec |
| `metrics` | ✓ | page-level metrics + tracking plan |
| `i18n` | ✓ | multilingual key table |
| `env` | — | `accountTypes:…;platforms:…;experiments:…` |
| `data` | — | page-level application topology (mermaid + front/back app list + storage deps + coverage); **not** interface contracts |

### Level 2 — `module` (child of page)

| Field | Type | Required |
|-------|------|----------|
| `type` | string (`module`) | ✓ |
| `id` | string | ✓ |
| `name` | string | ✓ |
| `description` | string | ✓ |
| `specs` | object | ✓ |
| `children` | array | ✓ (level-3 actions) |

`module.specs` (additionalProperties: false):

| Spec | Required | Content |
|------|----------|---------|
| `workflow` | ✓ | EARS happy-path + anomaly table + tracking table + state transition |
| `data` | ✓ | API doc: URI+method + request params + response→UI mapping + call chain |
| `layout` | — | module layout (optional) |

### Level 3 — `action` (child of module)

| Field | Type | Required |
|-------|------|----------|
| `type` | string (`action`) | ✓ |
| `id` / `name` / `description` | string | ✓ |
| `specs` | object | ✓ |
| `children` | array | ✓ (usually empty) |

`action.specs` (additionalProperties: false): only `workflow` (the interaction logic +
tracking + state change). No required spec keys at action level (workflow optional).

### Common spec-object shape

Every spec object is `{ "name": string, "content": string }`, `additionalProperties: false`,
both required. `content` holds the structured markdown (ASCII/EARS/mermaid/tables per
the spec-type constraints in `product-spec-standard.md §9`).

## 5. Minimal Valid Example

```json
{
  "type": "page",
  "id": "page_favorites",
  "name": "收藏夹",
  "matchRegexUrl": "^/favorites",
  "bizScene": "favorites_default",
  "parentUuid": "", "prevUuid": "",
  "description": "买家收藏的商品列表页",
  "specs": {
    "layout": { "name": "layout", "content": "..." },
    "metrics": { "name": "metrics", "content": "..." },
    "i18n":    { "name": "i18n",    "content": "..." }
  },
  "children": [
    {
      "type": "module", "id": "mod_fav_list", "name": "收藏列表",
      "description": "...",
      "specs": {
        "workflow": { "name": "workflow", "content": "WHEN user scrolls THEN load next page AND debounce 300ms ..." },
        "data":     { "name": "data",     "content": "GET /api/favorites ..." }
      },
      "children": [
        { "type": "action", "id": "act_remove", "name": "取消收藏",
          "description": "...", "specs": {}, "children": [] }
      ]
    }
  ]
}
```

## 6. virtual_page Variant

A module with no independent UI (mid-platform logic: membership, points, risk, payment
routing) uses the virtual_page form:

- Flat nodes (no `children`).
- No `layout` / `i18n` specs (no UI text).
- Default `workflow` only (product-perspective business rules; **no interface contract**).
- `data` optional, not hard-validated.
- Business-rule source: ≥1 git repo URL or design doc (aligns CMS + PMS); missing ⇒
  stop and ask, never placeholder.

## 7. Validation Gates (D-rules)

The schema is enforced by deterministic validators (the code gate). Representative
constraints (confirm against the live `validate`/`fix_hint`, don't recall):

- **D-type:** `type ∈ {page, module, action, product, product_line}` (closed vocab).
- **D-required:** every level carries its required fields + required specs.
- **D-additional:** `specs` is closed — unknown spec keys rejected.
- **D-structure:** shell attaches to page; area optional; no orphan nodes.
- **D-voice (page/module):** `workflow` content passes PRD-voice lint (EARS, no tech
  implementation, no vague quantifiers). `page.data` (topology) is exempt — architecture
  description needs no PRD sentence form.

On gate failure: read the `fix_hint`; use the three fix options (rerun / skip /
force-exit with ≥120-char audited justification) per the operational protocol.

## 8. Relationship to Other Specs

- **CMS:** `page.data` topology reuses the CMS `knowledge-graph.json` (entry points +
  call chains) — CMS is the source for the front/back app lists and coverage percentage.
- **TMS:** `module.workflow` EARS happy-path + anomaly table seeds the TMS
  requirement→method matrix; `action` nodes become the TMS entry×state matrix's entry
  dimension.
- **Traceability:** `id` lineage (page→module→action) is the PMS-side origin of the
  PRD→Feature→Spec→Task→Code→Test trace chain.
