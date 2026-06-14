---
name: autonomous-loops
description: "Patterns and architectures for autonomous Claude Code loops — from simple sequential pipelines to RFC-driven multi-agent DAG systems."
origin: CSP
---

# Autonomous Loops Skill

> Compatibility note (v1.8.0): `autonomous-loops` is retained for one release.
> The canonical skill name is now `continuous-agent-loop`. New loop guidance
> should be authored there, while this skill remains available to avoid
> breaking existing workflows.

Patterns, architectures, and reference implementations for running Claude Code autonomously in loops. Covers everything from simple `claude -p` pipelines to full RFC-driven multi-agent DAG orchestration.

## When to Use

- Setting up autonomous development workflows that run without human intervention
- Choosing the right loop architecture for your problem (simple vs complex)
- Building CI/CD-style continuous development pipelines
- Running parallel agents with merge coordination
- Implementing context persistence across loop iterations
- Adding quality gates and cleanup passes to autonomous workflows

## Loop Pattern Spectrum

From simplest to most sophisticated:

| Pattern | Complexity | Best For |
|---------|-----------|----------|
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
