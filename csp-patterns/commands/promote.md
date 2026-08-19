---
name: promote
description: Promote project-scoped instincts to global scope
command: true
---

# Promote Command

Promote instincts from project scope to global scope in csp-learning-loop.

## Implementation

Run the instinct CLI using the plugin root path:

```bash
python3 "${CSP_ROOT}/skills/csp-learning-loop/scripts/csp-intel" promote [instinct-id] [--force] [--dry-run]
```

Or if the CSP root is not auto-detected:

```bash
python3 {CSP_SKILLS_DIR}/csp-learning-loop/scripts/csp-intel promote [instinct-id] [--force] [--dry-run]
```

## Usage

```bash
/promote                      # Auto-detect promotion candidates
/promote --dry-run            # Preview auto-promotion candidates
/promote --force              # Promote all qualified candidates without prompt
/promote grep-before-edit     # Promote one specific instinct from current project
```

## What to Do

1. Detect current project
2. If `instinct-id` is provided, promote only that instinct (if present in current project)
3. Otherwise, find cross-project candidates that:
   - Appear in at least 2 projects
   - Meet confidence threshold
4. Write promoted instincts to `{CSP_DATA_DIR}/intel/instincts/personal/` with `scope: global`
