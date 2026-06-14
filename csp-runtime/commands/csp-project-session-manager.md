---
description: "Manage isolated development environments using git worktrees and tmux sessions for parallel issue and feature work"
---

# CSP project-session-manager

This compatibility command keeps `/code-skills-package:project-session-manager` available without loading the full `project-session-manager` skill description in every Claude Code session.

## Dispatch

1. Read the full bundled skill instructions from the active CSP plugin/install: `skills/project-session-manager/SKILL.md`.
2. Follow that SKILL.md exactly, treating the user's arguments as:

```text
$ARGUMENTS
```

If the file is not directly readable from the current working directory, locate it under the active `CLAUDE_PLUGIN_ROOT`/`CSP_PLUGIN_ROOT`, package root, or installed CSP plugin directory, then continue.
