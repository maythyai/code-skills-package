---
description: "Generate comprehensive hierarchical AGENTS.md documentation across the entire codebase for improved agent understanding"
---

# CSP deepinit

This compatibility command keeps `/code-skills-package:deepinit` available without loading the full `deepinit` skill description in every Claude Code session.

## Dispatch

1. Read the full bundled skill instructions from the active CSP plugin/install: `skills/deepinit/SKILL.md`.
2. Follow that SKILL.md exactly, treating the user's arguments as:

```text
$ARGUMENTS
```

If the file is not directly readable from the current working directory, locate it under the active `CLAUDE_PLUGIN_ROOT`/`CSP_PLUGIN_ROOT`, package root, or installed CSP plugin directory, then continue.
