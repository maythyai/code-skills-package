---
name: projects
description: List known projects and their instinct statistics
command: true
---

# Projects Command

List project registry entries and per-project instinct/observation counts for csp-learning-loop.

## Implementation

Run the instinct CLI using the plugin root path:

```bash
python3 "${CSP_ROOT}/skills/csp-learning-loop/scripts/csp-intel" projects
```

Or if the CSP root is not auto-detected:

```bash
python3 {CSP_SKILLS_DIR}/csp-learning-loop/scripts/csp-intel projects
```

## Usage

```bash
/projects
```

## What to Do

1. Read `{CSP_DATA_DIR}/intel/projects.json`
2. For each project, display:
   - Project name, id, root, remote
   - Personal and inherited instinct counts
   - Observation event count
   - Last seen timestamp
3. Also display global instinct totals
