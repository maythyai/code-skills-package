---
name: csp-cli-teams
description: CLI-team runtime for claude, codex, or gemini workers in tmux panes when you need process-based parallel execution
aliases: []
layer: 4
category: patterns
---

| Error                        | Cause                                 | Fix                                                                     |
|------------------------------|---------------------------------------|-------------------------------------------------------------------------|
| `not inside tmux`            | Requested in-place pane topology from a non-tmux surface | Start tmux and rerun, or let `csp team` use its detached-session fallback           |
| `cmux surface detected`      | Running inside cmux without `$TMUX` | Use the normal `csp team ...` flow; CSP will create native cmux worker splits      |
| `Unsupported agent type`     | Requested agent is not claude/codex/gemini | Use `claude`, `codex`, or `gemini`; for native Claude Code agents use `/code-skills-package:team` |
| `codex: command not found`   | Codex CLI not installed             | `npm install -g @openai/codex`                                                      |
| `gemini: command not found`  | Gemini CLI not installed            | `npm install -g @google/gemini-cli`                                                 |
| `Team <name> is not running` | stale or missing runtime state      | `csp team status <team-name>` then `csp team shutdown <team-name> --force` if stale |
| `status: failed`             | Workers exited with incomplete work | inspect runtime output, narrow scope, rerun                                         |

## Relationship to `/team`

| Aspect       | `/team`                                   | `/csp-teams`                                         |
| ------------ | ----------------------------------------- | ---------------------------------------------------- |
| Worker type  | Claude Code native team agents            | claude / codex / gemini CLI processes in tmux        |
| Invocation   | `TeamCreate` / `Task` / `SendMessage`     | `csp team [N:agent]` + `status` + `shutdown` + `api` |
| Coordination | Native team messaging and staged pipeline | tmux worker runtime + CLI API state files            |
| Use when     | You want Claude-native team orchestration | You want external CLI worker execution               |
