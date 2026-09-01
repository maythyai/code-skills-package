# Shared Workflow & Mode Selection

> Mode routing + durable run workspace. Generalized to git-native (no platform SDK).

## Stage mapping (preserve logical stages)

| Logical stage | Plugin/native responsibility |
|---------------|------------------------------|
| README/overview discovery | inventory purpose, entrypoints, runtime ownership |
| catalogue filter | remove noise; reduce partition surveys into one coverage inventory |
| catalogue think/generate | propose a domain taxonomy, recursively allocate coverage, pass an independent plan critic |
| reverse-BFS generation | write disjoint coherent domains **once**, deepest dependencies before parent synthesis |
| post-process/finalize | run black-box semantic QA, assemble shared navigation, validate, audit, deliver |

## Mode selection

- **`generate`** — always build a complete inventory and follow `generate.md` (the full flow).
- **`refresh`** — require an existing canonical `index.md` whose managed-input inventory can be reconciled with the requested code/knowledge inputs. Every unchanged identity needs its old revision reachable from its new snapshot; re-survey an individual input whose history was rewritten. **Switch to `generate`** when the logical code-system identity changed or the old inventory can't be trusted.
- **`auto`** — normalize a legacy single-source block into a one-item code input. Generate when: index absent / no trustworthy managed-input baseline / logical system identity changed / existing requested-depth coverage incomplete. Otherwise refresh across the input set.

A **ref-name change** can refresh only when the old commit is reachable from the resolved
new snapshot and the user intends continuity. **Added** knowledge dependencies enter the
impact plan; **removed** inputs require explicit review, never silent deletion. Do not
choose a mode from a guessed aggregate-diff percentage.

## Durable run workspace

Create `.csp/code-wiki/.codewiki-run/<run-id>/` **outside** the output tree. Persist at minimum:

- `source-lock.json` — every code/knowledge input: kind, canonical repo, ref, path,
  frozen revision, relation target/type, semantic relation, role, local checkout;
- `run-manifest.json` — tasks, dependencies, assigned domain, owned paths, status,
  attempts, result path, result hash;
- reduced inventory + coverage matrix;
- proposed/frozen page plan + critic request ledger;
- domain task/result artifacts + verified child summaries;
- semantic-QA questions/results + remediation status;
- audit + final delivery results.

`checkout_root` is run-local and **never** copied into wiki frontmatter or committed.

### source-lock.json shape

```json
{
  "inputs": [
    {
      "kind": "code_repository",
      "repo": "https://github.com/org/repo",
      "ref": "main",
      "path": ".",
      "frozen_revision": "a1b2c3d...",
      "role": "primary",
      "checkout_root": "/tmp/codewiki-run/<run-id>/repo-0"
    }
  ],
  "locked_at": "2026-08-28T15:00:00Z"
}
```

## Drift before delivery

Before delivery, re-resolve every input ref. If any input drifted from its frozen commit
(history rewritten, force-pushed) ⇒ **refresh instead of publish**. Never publish against
a moved baseline.
