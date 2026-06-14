# Loop Architectures

Detailed implementations of autonomous loop patterns.

## 1. Sequential Pipeline (`claude -p`)

**The simplest loop.** Break daily development into a sequence of non-interactive `claude -p` calls.

```bash
#!/bin/bash
# daily-dev.sh -- Sequential pipeline for a feature branch

set -e

# Step 1: Implement the feature
claude -p "Read the spec in docs/auth-spec.md. Implement OAuth2 login in src/auth/. Write tests first (TDD). Do NOT create any new documentation files."

# Step 2: De-sloppify (cleanup pass)
claude -p "Review all files changed by the previous commit. Remove any unnecessary type tests, overly defensive checks, or testing of language features. Keep real business logic tests. Run the test suite after cleanup."

# Step 3: Verify
claude -p "Run the full build, lint, type check, and test suite. Fix any failures. Do not add new features."

# Step 4: Commit
claude -p "Create a conventional commit for all staged changes. Use 'feat: add OAuth2 login flow' as the message."
```

### Variations

**With model routing:**
```bash
# Research with Opus (deep reasoning)
claude -p --model opus "Analyze the codebase architecture and write a plan for adding caching..."

# Implement with Sonnet (fast, capable)
claude -p "Implement the caching layer according to the plan in docs/caching-plan.md..."

# Review with Opus (thorough)
claude -p --model opus "Review all changes for security issues, race conditions, and edge cases..."
```

**With `--allowedTools` restrictions:**
```bash
# Read-only analysis pass
claude -p --allowedTools "Read,Grep,Glob" "Audit this codebase for security vulnerabilities..."

# Write-only implementation pass
claude -p --allowedTools "Read,Write,Edit,Bash" "Implement the fixes from security-audit.md..."
```

## 2. NanoClaw REPL

```bash
# Start the default session
node scripts/claw.js

# Named session with skill context
CLAW_SESSION=my-project CLAW_SKILLS=tdd-workflow,security-review node scripts/claw.js
```

| Use Case | NanoClaw | Sequential Pipeline |
|----------|----------|-------------------|
| Interactive exploration | Yes | No |
| Scripted automation | No | Yes |
| Session persistence | Built-in | Manual |
| Context accumulation | Grows per turn | Fresh each step |
| CI/CD integration | Poor | Excellent |

## 3. Infinite Agentic Loop

A two-prompt system that orchestrates parallel sub-agents for specification-driven generation.

```
PROMPT 1 (Orchestrator)              PROMPT 2 (Sub-Agents)
+---------------------+             +----------------------+
| Parse spec file      |             | Receive full context  |
| Scan output dir      |  deploys   | Read assigned number  |
| Plan iteration       |------------| Follow spec exactly   |
| Assign creative dirs |  N agents  | Generate unique output |
| Manage waves         |             | Save to output dir    |
+---------------------+             +----------------------+
```

| Count | Strategy |
|-------|----------|
| 1-5 | All agents simultaneously |
| 6-20 | Batches of 5 |
| infinite | Waves of 3-5, progressive sophistication |

## 4. Continuous Claude PR Loop

```
+-------------------------------------------------------+
|  CONTINUOUS CLAUDE ITERATION                          |
|                                                       |
|  1. Create branch (continuous-claude/iteration-N)     |
|  2. Run claude -p with enhanced prompt                |
|  3. (Optional) Reviewer pass -- separate claude -p    |
|  4. Commit changes (claude generates message)         |
|  5. Push + create PR (gh pr create)                   |
|  6. Wait for CI checks (poll gh pr checks)            |
|  7. CI failure? -> Auto-fix pass (claude -p)          |
|  8. Merge PR (squash/merge/rebase)                    |
|  9. Return to main -> repeat                          |
|                                                       |
|  Limit by: --max-runs N | --max-cost $X               |
|            --max-duration 2h | completion signal       |
+-------------------------------------------------------+
```

### Cross-Iteration Context: SHARED_TASK_NOTES.md

```markdown
## Progress
- [x] Added tests for auth module (iteration 1)
- [x] Fixed edge case in token refresh (iteration 2)
- [ ] Still need: rate limiting tests, error boundary tests

## Next Steps
- Focus on rate limiting module next
- The mock setup in tests/helpers.ts can be reused
```

### Key Configuration

| Flag | Purpose |
|------|---------|
| `--max-runs N` | Stop after N successful iterations |
| `--max-cost $X` | Stop after spending $X |
| `--max-duration 2h` | Stop after time elapsed |
| `--merge-strategy squash` | squash, merge, or rebase |
| `--worktree <name>` | Parallel execution via git worktrees |
| `--disable-commits` | Dry-run mode (no git operations) |
| `--review-prompt "..."` | Add reviewer pass per iteration |
| `--ci-retry-max N` | Auto-fix CI failures (default: 1) |

## 5. The De-Sloppify Pattern

```bash
# Step 1: Implement (let it be thorough)
claude -p "Implement the feature with full TDD. Be thorough with tests."

# Step 2: De-sloppify (separate context, focused cleanup)
claude -p "Review all changes in the working tree. Remove:
- Tests that verify language/framework behavior rather than business logic
- Redundant type checks that the type system already enforces
- Over-defensive error handling for impossible states
- Console.log statements
- Commented-out code

Keep all business logic tests. Run the test suite after cleanup to ensure nothing breaks."
```

## 6. Ralphinho / RFC-Driven DAG Orchestration

```
RFC/PRD Document
       |
       v
  DECOMPOSITION (AI)
  Break RFC into work units with dependency DAG
       |
       v
+------------------------------------------------------+
|  RALPH LOOP (up to 3 passes)                         |
|                                                      |
|  For each DAG layer (sequential, by dependency):     |
|                                                      |
|  +-- Quality Pipelines (parallel per unit) --------+ |
|  |  Each unit in its own worktree:                 | |
|  |  Research -> Plan -> Implement -> Test -> Review | |
|  +-------------------------------------------------+ |
|                                                      |
|  +-- Merge Queue ----------------------------------+ |
|  |  Rebase onto main -> Run tests -> Land or evict | |
|  +-------------------------------------------------+ |
+------------------------------------------------------+
```

### WorkUnit Interface

```typescript
interface WorkUnit {
  id: string;
  name: string;
  rfcSections: string[];
  description: string;
  deps: string[];
  acceptance: string[];
  tier: "trivial" | "small" | "medium" | "large";
}
```

### Complexity Tiers

| Tier | Pipeline Stages |
|------|----------------|
| **trivial** | implement -> test |
| **small** | implement -> test -> code-review |
| **medium** | research -> plan -> implement -> test -> PRD-review + code-review -> review-fix |
| **large** | research -> plan -> implement -> test -> PRD-review + code-review -> review-fix -> final-review |

### Stage Isolation

| Stage | Model | Purpose |
|-------|-------|---------|
| Research | Sonnet | Read codebase + RFC, produce context doc |
| Plan | Opus | Design implementation steps |
| Implement | Codex | Write code following the plan |
| Test | Sonnet | Run build + test suite |
| PRD Review | Sonnet | Spec compliance check |
| Code Review | Opus | Quality + security check |
| Review Fix | Codex | Address review issues |
| Final Review | Opus | Quality gate (large tier only) |
