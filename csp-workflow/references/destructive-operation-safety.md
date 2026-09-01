# Destructive-Operation Safety

> Shared safety classification for operations encountered during code exploration, CR,
> code-wiki authoring, and hub knowledge capture. Generalized from production interaction
> policy. Used by `csp-qa-cr-review`, `csp-code-wiki`, `csp-code-spec`, `csp-knowledge-hub`.
>
> When an Agent explores a UI or reads code, it must classify operations before acting:
> **destructive** ops are never auto-triggered; **reversible** ops may be auto-reset.

## 1. Classification

| Class | Definition | Agent action |
|-------|------------|--------------|
| **destructive** | truly irreversible (real delete/destroy) — **always skipped at the UI layer, never clicked** | block; stub-response; never invoke |
| **reversible** | writes a backend effect but has an explicit inverse to restore | may act; auto-reset via the inverse; priority over destructive |
| **safe** | read-only / navigation / no side effect | free to act |

**Reversible wins over destructive**: if an operation matches both lists (e.g. "reset"),
classify it reversible and auto-reset.

## 2. Destructive text keywords (truly irreversible)

| Lang | Keywords |
|------|----------|
| zh | 删除, 移除, 清空, 丢弃, 废弃, 销毁, 永久删除, 撤销, 退订, 注销 |
| en | delete, remove, clear, discard, drop, destroy, wipe, purge, unsubscribe, cancel account |

> Only real delete/destroy. Do **not** mix in "modify/edit" (those are reversible).

## 3. Reversible text keywords

| Lang | Keywords |
|------|----------|
| zh | 增加, 减少, 选中, 取消选中, 勾选, 取消勾选, 切换, 排序, 筛选, 刷新, 重置 |
| en | increase, decrease, select, unselect, deselect, toggle, sort, filter, refresh, reset |
| symbols | `+`, `-` (incl. full-width `＋ －`) |

## 4. Backend belt-and-suspenders (URL + body)

When the UI layer misses a destructive op, the backend pattern catches it:

**URL patterns** (stub-response if matched AND body predicate matches):
`/manage\.json`, `/delete`, `/remove`, `/clear`, `/destroy`, `/cancel`, `/unsubscribe`

**Body predicates** — match if any field's value is destructive:

| Field | Destructive values |
|-------|--------------------|
| `operateType` | DELETE, BATCH_DELETE, REMOVE, BATCH_REMOVE, CLEAR, CLEAR_ALL, CLEAR_SELECTED, CLEAR_INVALID, DROP, DESTROY, PURGE, WIPE, CANCEL |
| `action` | delete, remove, clear, destroy, cancel |

## 5. Auto-skip interaction types

During exploration/enrich, these interaction types are **auto-skipped** (recorded in
`skipped_actions`, never dispatched):
- `navigation_*` (route changes)
- `safe_reversible` (reversible, no need to enrich)
- `destructive_opener` (opens a destructive flow — never enter it)

## 6. Override

Business-specific overrides live in a local file (`interaction-policy-override.json` next
to the work dir) that **extends** (not replaces) these defaults. Overrides are audited;
they never silently broaden the destructive set.

## 7. Use across CSP

- **CR (`csp-qa-cr-review`):** a diff touching a destructive path (URL/body predicate) ⇒
  high-severity finding (impact range + safety).
- **code-wiki (`csp-code-wiki`):** destructive operations documented with the
  `destructive_opener` type + a "never auto-trigger" note.
- **code-spec (`csp-code-spec`):** entry-point scan flags destructive endpoints.
- **hub (`csp-knowledge-hub`):** captured as a `development_pitfall` knowledge signal
  (see `closed-loop.md`).
