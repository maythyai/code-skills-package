---
name: ask
description: Process-first advisor routing for Claude, Codex, or Gemini via `csp ask`, with artifact capture and no raw CLI assembly
layer: 5
category: runtime
----
name: ask
description: Process-first advisor routing for Claude, Codex, or Gemini via `csp ask`, with artifact capture and no raw CLI assembly
---

# Ask

Use CSP's canonical advisor skill to route a prompt through the local Claude, Codex, or Gemini CLI and persist the result as an ask artifact.

## Usage

```bash
/code-skills-package:ask <claude|codex|gemini> <question or task>
```

Examples:

```bash
/code-skills-package:ask codex "review this patch from a security perspective"
/code-skills-package:ask gemini "suggest UX improvements for this flow"
/code-skills-package:ask claude "draft an implementation plan for issue #123"
```

## Routing

**Required execution path — always use this command:**

```bash
csp ask {{ARGUMENTS}}
```

**Do NOT manually construct raw provider CLI commands.** Never run `codex`, `claude`, or `gemini` directly to fulfill this skill. The `csp ask` wrapper handles correct flag selection, artifact persistence, and provider-version compatibility automatically. Manually assembling provider CLI flags will produce incorrect or outdated invocations.

## Requirements

- The selected local CLI must be installed and authenticated.
- Verify availability with the matching command:

```bash
claude --version
codex --version
gemini --version
```

## Artifacts

`csp ask` writes artifacts to:

```text
.csp/artifacts/ask/<provider>-<slug>-<timestamp>.md
```

Task: {{ARGUMENTS}}
