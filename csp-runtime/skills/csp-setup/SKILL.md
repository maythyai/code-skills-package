---
name: setup
description: Use first for install/update routing — sends setup, doctor, or MCP requests to the correct CSP setup flow
level: 2
---

# Setup

Use `/code-skills-package:setup` as the unified setup/configuration entrypoint.

## Usage

```bash
/code-skills-package:setup                # full setup wizard
/code-skills-package:setup doctor         # installation diagnostics
/code-skills-package:setup mcp            # MCP server configuration
/code-skills-package:setup wizard --local # explicit wizard path
```

## Routing

Process the request by the **first argument only** so install/setup questions land on the right flow immediately:

- No argument, `wizard`, `local`, `global`, or `--force` -> route to `/code-skills-package:csp-setup` with the same remaining args
- `doctor` -> route to `/code-skills-package:csp-doctor` with everything after the `doctor` token
- `mcp` -> route to `/code-skills-package:mcp-setup` with everything after the `mcp` token

Examples:

```bash
/code-skills-package:setup --local          # => /code-skills-package:csp-setup --local
/code-skills-package:setup doctor --json    # => /code-skills-package:csp-doctor --json
/code-skills-package:setup mcp github       # => /code-skills-package:mcp-setup github
```

## Notes

- `/code-skills-package:csp-setup`, `/code-skills-package:csp-doctor`, and `/code-skills-package:mcp-setup` remain valid compatibility entrypoints.
- Prefer `/code-skills-package:setup` in new documentation and user guidance.

Task: {{ARGUMENTS}}
