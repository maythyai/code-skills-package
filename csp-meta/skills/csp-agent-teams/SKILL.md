---
name: csp-agent-teams
description: >
  Orchestrate multiple AI agents for parallel or sequential task execution.
  Includes subagent-driven development (per-task dispatch with two-stage review)
  and parallel agent dispatch (independent problems solved concurrently).
  Use when executing implementation plans with independent tasks, or facing 2+ independent failures.
layer: 1
origin: merged(CSP)
category: meta
-----------|---------|-------|
| Mechanical | 1-2 files, clear spec | Fast/cheap |
| Integration | Multi-file, debugging | Standard |
| Architecture/Review | Design judgment, broad understanding | Most capable |

### Handling Agent Status

- **DONE** → Proceed to spec review
- **DONE_WITH_CONCERNS** → Read concerns before proceeding
- **NEEDS_CONTEXT** → Provide missing context, re-dispatch
- **BLOCKED** → Assess: context problem → more context; reasoning problem → more capable model; task too large → break it down; plan wrong → escalate to human

### Agent Prompt Structure

Good prompts are:
1. **Focused** — One clear problem domain
2. **Self-contained** — All context needed to understand the problem
3. **Specific about output** — What should the agent return?

```markdown
Fix the 3 failing tests in src/agents/agent-tool-abort.test.ts:

1. "should abort tool with partial output capture" - expects 'interrupted at' in message
2. "should handle mixed completed and aborted tools" - fast tool aborted instead of completed
3. "should properly track pendingToolCount" - expects 3 results but gets 0

These are timing/race condition issues. Your task:
1. Read the test file and understand what each test verifies
2. Identify root cause - timing issues or actual bugs?
3. Fix by replacing arbitrary timeouts with event-based waiting

Do NOT just increase timeouts - find the real issue.
Return: Summary of what you found and what you fixed.
```

## Mode 2: Parallel Dispatch (Independent Problems)

When facing multiple unrelated failures across different subsystems, dispatch one agent per problem domain and let them work concurrently.

### Process

1. **Identify independent domains** — Group failures by subsystem
2. **Create focused agent tasks** — Specific scope, clear goal, constraints, expected output
3. **Dispatch in parallel** — All agents run concurrently
4. **Review and integrate** — Read summaries, verify no conflicts, run full suite

### When to Use Parallel

- 3+ test files failing with different root causes
- Multiple subsystems broken independently
- Each problem understandable without context from others
- No shared state between investigations

### When NOT to Use Parallel

- Failures are related (fix one might fix others)
- Need to understand full system state
- Agents would interfere (editing same files)
- Exploratory debugging (don't know what's broken yet)

## Red Flags

**Never:**
- Start implementation on main/master without explicit user consent
- Skip reviews (spec compliance OR code quality)
- Proceed with unfixed issues
- Dispatch multiple implementation agents in parallel (conflicts)
- Make agent read plan file (provide full text instead)
- Start code quality review before spec compliance is approved
- Move to next task while reviews have open issues
- Ignore agent questions or escalations

**If agent asks questions:** Answer clearly, provide additional context.

**If reviewer finds issues:** Agent fixes → reviewer reviews again → repeat until approved.

## Verification

After all agents return:
- [ ] Review each summary — understand what changed
- [ ] Check for conflicts — did agents edit same code?
- [ ] Run full test suite — verify all fixes work together
- [ ] Spot check — agents can make systematic errors
- [ ] All spec compliance reviews passed
- [ ] All code quality reviews passed
