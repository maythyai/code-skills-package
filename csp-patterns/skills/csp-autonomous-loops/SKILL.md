---
name: csp-autonomous-loops
description: "Patterns and architectures for autonomous Claude Code loops — from simple sequential pipelines to RFC-driven multi-agent DAG systems."
origin: CSP
layer: 4
category: patterns
---

| Pattern | Complexity | Best For |
|---------|------------|----------|
| Sequential Pipeline | Low | Daily dev steps, scripted workflows |
| NanoClaw REPL | Low | Interactive persistent sessions |
| Infinite Agentic Loop | Medium | Parallel content generation, spec-driven work |
| Continuous Claude PR Loop | Medium | Multi-day iterative projects with CI gates |
| De-Sloppify Pattern | Add-on | Quality cleanup after any Implementer step |
| Ralphinho / RFC-Driven DAG | High | Large features, multi-unit parallel work with merge queue |

## Choosing the Right Pattern

```
Is the task a single focused change?
+- Yes -> Sequential Pipeline or NanoClaw
+- No -> Is there a written spec/RFC?
         +- Yes -> Do you need parallel implementation?
         |        +- Yes -> Ralphinho (DAG orchestration)
         |        +- No -> Continuous Claude (iterative PR loop)
         +- No -> Do you need many variations of the same thing?
                  +- Yes -> Infinite Agentic Loop (spec-driven generation)
                  +- No -> Sequential Pipeline with de-sloppify
```

## Anti-Patterns

1. **Infinite loops without exit conditions** — Always have a max-runs, max-cost, max-duration, or completion signal.
2. **No context bridge between iterations** — Use `SHARED_TASK_NOTES.md` or filesystem state to bridge context.
3. **Retrying the same failure** — Capture the error context and feed it to the next attempt.
4. **Negative instructions instead of cleanup passes** — Don't say "don't do X." Add a separate pass that removes X.
5. **All agents in one context window** — Separate concerns into different agent processes. The reviewer should never be the author.
6. **Ignoring file overlap in parallel work** — If two parallel agents might edit the same file, you need a merge strategy.

## References

| Project | Author | Link |
|---------|--------|------|
| Ralphinho | enitrat | credit: @enitrat |
| Infinite Agentic Loop | disler | credit: @disler |
| Continuous Claude | AnandChowdhary | credit: @AnandChowdhary |
| NanoClaw | CSP | `/claw` command in this repo |
| Verification Loop | CSP | `skills/verification-loop/` in this repo |

## Detailed References

- [references/loop-architectures.md](references/loop-architectures.md) — Full implementations of all 6 loop patterns with code examples
- [references/safety-guardrails.md](references/safety-guardrails.md) — Decision matrices, combining patterns, and anti-patterns in detail
