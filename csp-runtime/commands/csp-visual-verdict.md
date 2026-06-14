---
description: "Compare generated UI screenshots against reference images and return a structured pass-or-fail JSON verdict"
---

# CSP visual-verdict

This compatibility command keeps `/code-skills-package:visual-verdict` available without loading the full `visual-verdict` skill description in every Claude Code session.

## Dispatch

1. Read the full bundled skill instructions from the active CSP plugin/install: `skills/visual-verdict/SKILL.md`.
2. Follow that SKILL.md exactly, treating the user's arguments as:

```text
$ARGUMENTS
```

If the file is not directly readable from the current working directory, locate it under the active `CLAUDE_PLUGIN_ROOT`/`CSP_PLUGIN_ROOT`, package root, or installed CSP plugin directory, then continue.
