# Coverage Contract

> Coverage matrix: the accountability that "everything material is covered". Generalized
> to git-native (no platform validator coupling); the matrix is the durable record.

## Principle

Every `standard` or `exhaustive` run reaches **zero unresolved coverage rows**. Coverage is
not "page count" — it is the closed mapping from each material subject in the code system
to its owning page + evidence.

## Coverage matrix shape

```json
{
  "run_id": "<run-id>",
  "system": "<logical system>",
  "rows": [
    {
      "subject": "auth token refresh",
      "kind": "workflow",
      "owning_page": "auth/token-refresh.md",
      "evidence": [
        { "repo": "org/auth-svc", "file": "src/token.py", "commit": "a1b2c3d", "lines": "44-71" }
      ],
      "status": "covered | uncovered | partial | conflict",
      "notes": ""
    }
  ]
}
```

| Field | Notes |
|------|-------|
| `subject` | a material subject (system/concept/workflow/data/operation) |
| `kind` | system / concept / workflow / data-ownership / operation |
| `owning_page` | the single canonical page (or `[unassigned]`) |
| `evidence` | frozen-commit source spans actually inspected |
| `status` | `covered` / `uncovered` / `partial` / `conflict` |

## Status semantics

- `covered` — owning page exists, evidence pinned, verified.
- `uncovered` — material subject with no page (blocks `standard`/`exhaustive` completion).
- `partial` — page exists but evidence is thin/inferred (must supplement or mark `low` confidence).
- `conflict` — source and knowledge dep disagree (preserve, don't adjudicate).

## Zero-unresolved gate

Completion requires **every row** resolved to `covered` (or explicitly waived with audit
rationale). `uncovered` / `conflict` rows block delivery for `standard`/`exhaustive` depth.

## Refresh reconciliation

On `refresh`, reconcile the new input inventory against the managed baseline matrix:

- unchanged identity + old revision reachable from new snapshot ⇒ keep row, update evidence commit.
- added subject ⇒ new row (covered or uncovered).
- removed input ⇒ mark affected rows for explicit review (never silent delete).
- logical-system identity changed ⇒ escalate to `generate`.

The matrix is the durable record that makes "what changed, what needs re-authoring"
deterministic — never rebuild from a guessed diff percentage.
