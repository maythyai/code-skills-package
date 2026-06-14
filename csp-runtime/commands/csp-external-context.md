---
description: "Spawn parallel document-specialist agents to fetch external web searches and documentation for any query topic"
---

# CSP external-context

This compatibility command keeps `/code-skills-package:external-context` available without loading the full `external-context` skill description in every Claude Code session.

## Dispatch

1. Read the full bundled skill instructions from the active CSP plugin/install: `skills/external-context/SKILL.md`.
2. Follow that SKILL.md exactly, treating the user's arguments as:

```text
$ARGUMENTS
```

If the file is not directly readable from the current working directory, locate it under the active `CLAUDE_PLUGIN_ROOT`/`CSP_PLUGIN_ROOT`, package root, or installed CSP plugin directory, then continue.
