---
description: "Install or refresh the code-skills-package plugin using the canonical setup flow for any install method"
---

# CSP csp-setup

This compatibility command keeps `/code-skills-package:csp-setup` available without loading the full `csp-setup` skill description in every Claude Code session.

## Dispatch

1. Read the full bundled skill instructions from the active CSP plugin/install: `skills/csp-setup/SKILL.md`.
2. Follow that SKILL.md exactly, treating the user's arguments as:

```text
$ARGUMENTS
```

If the file is not directly readable from the current working directory, locate it under the active `CLAUDE_PLUGIN_ROOT`/`CSP_PLUGIN_ROOT`, package root, or installed CSP plugin directory, then continue.
