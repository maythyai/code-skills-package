---
description: "Maintain a persistent markdown knowledge base that compounds across sessions using the LLM Wiki model"
---

# CSP wiki

This compatibility command keeps `/code-skills-package:wiki` available without loading the full `wiki` skill description in every Claude Code session.

## Dispatch

1. Read the full bundled skill instructions from the active CSP plugin/install: `skills/wiki/SKILL.md`.
2. Follow that SKILL.md exactly, treating the user's arguments as:

```text
$ARGUMENTS
```

If the file is not directly readable from the current working directory, locate it under the active `CLAUDE_PLUGIN_ROOT`/`CSP_PLUGIN_ROOT`, package root, or installed CSP plugin directory, then continue.
