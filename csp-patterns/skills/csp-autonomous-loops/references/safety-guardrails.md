# Safety Guardrails

Anti-patterns, decision matrices, and combining patterns safely.

## Choosing the Right Pattern

### Decision Matrix

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

### Combining Patterns

These patterns compose well:

1. **Sequential Pipeline + De-Sloppify** -- The most common combination. Every implement step gets a cleanup pass.

2. **Continuous Claude + De-Sloppify** -- Add `--review-prompt` with a de-sloppify directive to each iteration.

3. **Any loop + Verification** -- Use CSP's `/verify` command or `verification-loop` skill as a gate before commits.

4. **Ralphinho's tiered approach in simpler loops** -- Even in a sequential pipeline, you can route simple tasks to Haiku and complex tasks to Opus:
   ```bash
   # Simple formatting fix
   claude -p --model haiku "Fix the import ordering in src/utils.ts"

   # Complex architectural change
   claude -p --model opus "Refactor the auth module to use the strategy pattern"
   ```

### When to Use Ralphinho vs Simpler Patterns

| Signal | Use Ralphinho | Use Simpler Pattern |
|--------|--------------|-------------------|
| Multiple interdependent work units | Yes | No |
| Need parallel implementation | Yes | No |
| Merge conflicts likely | Yes | No (sequential is fine) |
| Single-file change | No | Yes (sequential pipeline) |
| Multi-day project | Yes | Maybe (continuous-claude) |
| Spec/RFC already written | Yes | Maybe |
| Quick iteration on one thing | No | Yes (NanoClaw or pipeline) |

## Anti-Patterns

### Common Mistakes

1. **Infinite loops without exit conditions** -- Always have a max-runs, max-cost, max-duration, or completion signal.

2. **No context bridge between iterations** -- Each `claude -p` call starts fresh. Use `SHARED_TASK_NOTES.md` or filesystem state to bridge context.

3. **Retrying the same failure** -- If an iteration fails, don't just retry. Capture the error context and feed it to the next attempt.

4. **Negative instructions instead of cleanup passes** -- Don't say "don't do X." Add a separate pass that removes X.

5. **All agents in one context window** -- For complex workflows, separate concerns into different agent processes. The reviewer should never be the author.

6. **Ignoring file overlap in parallel work** -- If two parallel agents might edit the same file, you need a merge strategy (sequential landing, rebase, or conflict resolution).

### Key Design Principles

1. **Deterministic execution** -- Upfront decomposition locks in parallelism and ordering
2. **Human review at leverage points** -- The work plan is the single highest-leverage intervention point
3. **Separate concerns** -- Each stage in a separate context window with a separate agent
4. **Conflict recovery with context** -- Full eviction context enables intelligent re-runs, not blind retries
5. **Tier-driven depth** -- Trivial changes skip research/review; large changes get maximum scrutiny
6. **Resumable workflows** -- Full state persisted to SQLite; resume from any point
