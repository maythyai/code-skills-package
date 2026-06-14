<purpose>
One-page newcomer-oriented tour of CSP. Output ONLY the `<reference>` content below. No additions.
</purpose>

<reference>
# CSP — Code Skills Package

Plan-driven development for solo agentic work with Claude Code. CSP turns a vague idea into a hierarchical plan, then executes it phase by phase with state tracking and atomic commits.

## Start here (3 commands)

```text
/csp-new-project        # Greenfield: questioning → research → requirements → roadmap
/csp-plan-phase 1       # Create a detailed plan for phase 1
/csp-execute-phase 1    # Execute all plans in the phase
```

Existing codebase? Run `/csp-map-codebase` first to ground CSP in your code.

## Common commands

| Command | Purpose |
|---|---|
| `/csp-progress` | Where am I, what's next — also routes freeform intent with `--do "..."` |
| `/csp-quick` | Small ad-hoc task with CSP guarantees (planning dir + atomic commit) |
| `/csp-fast "<task>"` | Trivial inline change — no subagents, ≤3 file edits |
| `/csp-discuss-phase <N>` | Capture vision and decisions before planning |
| `/csp-debug "<symptom>"` | Persistent debug session, survives `/clear` |
| `/csp-capture` | Save an idea, todo, note, seed, or backlog item |
| `/csp-verify-work <N>` | Conversational UAT for a completed phase |
| `/csp-ship <N>` | Open a PR from a completed phase |
| `/csp-help --full` | Complete reference (every command, every flag) |

## Want more?

```text
/csp-help --brief         # 10-line refresher of top commands
/csp-help --full          # complete reference
/csp-help <topic>         # one section only — see topics below
/csp-help --brief <topic> # compact scoped lookup — signature + one-line summary
```

Topics: `workflow` · `planning` · `execute` · `quick` · `debug` · `capture` · `ship` · `config` · `milestones` · `spike` · `sketch` · `review` · `audit` · `progress`

## Update CSP

```bash
npx code-skills-package-cc@latest
```
</reference>
