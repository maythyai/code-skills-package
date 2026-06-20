---
name: csp-agent-introspection-debugging
description: Structured self-debugging workflow for AI agent failures using capture, diagnosis, contained recovery, and introspection reports.
layer: 4
category: patterns
---

| Symptom | Likely Cause | First Step |
|---------|--------------|------------|
| Maximum tool calls / repeated same command | loop or no-exit observer path | inspect the last N tool calls for repetition |
| Context overflow / degraded reasoning | unbounded notes, repeated plans, oversized logs | inspect recent context for duplication and low-signal bulk |
| `ECONNREFUSED` / timeout | service unavailable or wrong port | verify service health, URL, and port assumptions |
| `429` / quota exhaustion | retry storm or missing backoff | count repeated calls and inspect retry spacing |
| file missing after write / stale diff | race, wrong cwd, or branch drift | re-check path, cwd, git status, and actual file existence |
| tests still failing after “fix” | wrong hypothesis | isolate the exact failing test and re-derive the bug |

Diagnosis questions:
- is this a logic failure, state failure, environment failure, or policy failure?
- did the agent lose the real objective and start optimizing the wrong subtask?
- is the failure deterministic or transient?
- what is the smallest reversible action that would validate the diagnosis?

### Phase 3: Contained Recovery

Recover with the smallest action that changes the diagnosis surface.

Safe recovery actions:
- stop repeated retries and restate the hypothesis
- trim low-signal context and keep only the active goal, blockers, and evidence
- re-check the actual filesystem / branch / process state
- narrow the task to one failing command, one file, or one test
- switch from speculative reasoning to direct observation
- escalate to a human when the failure is high-risk or externally blocked

Do not claim unsupported auto-healing actions like “reset agent state” or “update harness config” unless you are actually doing them through real tools in the current environment.

Contained recovery checklist:

```markdown
## Recovery Action
- Diagnosis chosen:
- Smallest action taken:
- Why this is safe:
- What evidence would prove the fix worked:
```

### Phase 4: Introspection Report

End with a report that makes the recovery legible to the next agent or human.

```markdown
## Agent Self-Debug Report
- Session / task:
- Failure:
- Root cause:
- Recovery action:
- Result: success | partial | blocked
- Token / time burn risk:
- Follow-up needed:
- Preventive change to encode later:
```

## Recovery Heuristics

Prefer these interventions in order:

1. Restate the real objective in one sentence.
2. Verify the world state instead of trusting memory.
3. Shrink the failing scope.
4. Run one discriminating check.
5. Only then retry.

Bad pattern:
- retrying the same action three times with slightly different wording

Good pattern:
- capture failure
- classify the pattern
- run one direct check
- change the plan only if the check supports it

## Integration with CSP

- Use `verification-loop` after recovery if code was changed.
- Use `continuous-learning-v2` when the failure pattern is worth turning into an instinct or later skill.
- Use `council` when the issue is not technical failure but decision ambiguity.
- Use `workspace-surface-audit` if the failure came from conflicting local state or repo drift.

## Output Standard

When this skill is active, do not end with “I fixed it” alone.

Always provide:
- the failure pattern
- the root-cause hypothesis
- the recovery action
- the evidence that the situation is now better or still blocked
