---
name: prune
description: Delete pending instincts older than 30 days that were never promoted
command: true
---

# Prune Pending Instincts

Remove expired pending instincts that were auto-generated but never reviewed or promoted.

## Implementation

Run the instinct CLI using the plugin root path:

```bash
python3 "${CSP_ROOT}/skills/csp-learning-loop/scripts/csp-intel" prune
```

Or if the CSP root is not auto-detected:

```bash
python3 {CSP_SKILLS_DIR}/csp-learning-loop/scripts/csp-intel prune
```

## Usage

```
/prune                    # Delete instincts older than 30 days
/prune --max-age 60      # Custom age threshold (days)
/prune --dry-run         # Preview without deleting
```
