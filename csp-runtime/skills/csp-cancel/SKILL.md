---
name: cancel
aliases: [cancel-ralph]
description: Cancel any active CSP mode (autopilot, ralph, ultrawork, ultraqa, swarm, ultrapilot, pipeline, team)
argument-hint: "[--force|--all]"
layer: 2
category: workflow
------|-----------------|
| Autopilot | "Autopilot cancelled at phase: {phase}. Progress preserved for resume." |
| Ralph | "Ralph cancelled. Persistent mode deactivated." |
| Ultrawork | "Ultrawork cancelled. Parallel execution mode deactivated." |
| UltraQA | "UltraQA cancelled. QA cycling workflow stopped." |
| Swarm | "Swarm cancelled. Coordinated agents stopped." |
| Ultrapilot | "Ultrapilot cancelled. Parallel autopilot workers stopped." |
| Pipeline | "Pipeline cancelled. Sequential agent chain stopped." |
| Team | "Team cancelled. Teammates shut down and cleaned up." |
| Plan Consensus | "Plan Consensus cancelled. Planning session ended." |
| Force | "All CSP modes cleared. You are free to start fresh." |
| None | "No active CSP modes detected." |

## What Gets Preserved

| Mode | State Preserved | Resume Command |
|------|-----------------|----------------|
| Autopilot | Yes (phase, files, spec, plan, verdicts) | `/code-skills-package:autopilot` |
| Ralph | No | N/A |
| Ultrawork | No | N/A |
| UltraQA | No | N/A |
| Swarm | No | N/A |
| Ultrapilot | No | N/A |
| Pipeline | No | N/A |
| Plan Consensus | Yes (plan file path preserved) | N/A |

## Notes

- **Dependency-aware**: Autopilot cancellation cleans up Ralph and UltraQA
- **Link-aware**: Ralph cancellation cleans up linked Ultrawork
- **Safe**: Only clears linked Ultrawork, preserves standalone Ultrawork
- **Local-only**: Clears state files in `.csp/state/` directory
- **Resume-friendly**: Autopilot state is preserved for seamless resume
- **Team-aware**: Detects native Claude Code teams and performs graceful shutdown

## MCP Worker Cleanup

When cancelling modes that may have spawned MCP workers (team bridge daemons), the cancel skill should also:

1. **Check for active MCP workers**: Look for heartbeat files at `.csp/state/team-bridge/{team}/*.heartbeat.json`
2. **Send shutdown signals**: Write shutdown signal files for each active worker
3. **Kill tmux sessions**: Run `tmux kill-session -t csp-team-{team}-{worker}` for each worker
4. **Clean up heartbeat files**: Remove all heartbeat files for the team
5. **Clean up shadow registry**: Remove `.csp/state/team-mcp-workers.json`

### Force Clear Addition

When `--force` is used, also clean up:
```bash
rm -rf .csp/state/team-bridge/       # Heartbeat files
rm -f .csp/state/team-mcp-workers.json  # Shadow registry
# Kill all csp-team-* tmux sessions
tmux list-sessions -F '#{session_name}' 2>/dev/null | grep '^csp-team-' | while read s; do tmux kill-session -t "$s" 2>/dev/null; done
```
