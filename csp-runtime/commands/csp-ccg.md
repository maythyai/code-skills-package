---
description: "Orchestrate parallel Claude, Codex, and Gemini advisors then synthesize their outputs into one unified answer"
---

# CSP ccg

This compatibility command keeps `/code-skills-package:ccg` available without loading the full `ccg` skill description in every Claude Code session.

## Dispatch

1. Read the full bundled skill instructions from the active CSP plugin/install: `skills/ccg/SKILL.md`.
2. Follow that SKILL.md exactly, treating the user's arguments as:

```text
$ARGUMENTS
```

If the file is not directly readable from the current working directory, locate it under the active `CLAUDE_PLUGIN_ROOT`/`CSP_PLUGIN_ROOT`, package root, or installed CSP plugin directory, then continue.
