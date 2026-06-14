---
description: "Configure popular MCP servers to extend Claude Code with external tools like web search and GitHub"
---

# CSP mcp-setup

This compatibility command keeps `/code-skills-package:mcp-setup` available without loading the full `mcp-setup` skill description in every Claude Code session.

## Dispatch

1. Read the full bundled skill instructions from the active CSP plugin/install: `skills/mcp-setup/SKILL.md`.
2. Follow that SKILL.md exactly, treating the user's arguments as:

```text
$ARGUMENTS
```

If the file is not directly readable from the current working directory, locate it under the active `CLAUDE_PLUGIN_ROOT`/`CSP_PLUGIN_ROOT`, package root, or installed CSP plugin directory, then continue.
