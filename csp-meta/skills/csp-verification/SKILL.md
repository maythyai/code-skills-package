---
name: csp-verification
description: >
  Verify changes really work before claiming completion. Evidence before assertions, always.
  Includes 6-phase verification (build, types, lint, tests, security, diff) and continuous mode.
  Use when about to claim work is complete, before committing or creating PRs.
layer: 1
category: meta
phase: build
domain: architecture
---

| Check | Evidence Required | NOT Sufficient |
|-------|-------------------|----------------|
| Tests pass | Test command output: 0 failures | Previous run, "should pass" |
| Linter clean | Linter output: 0 errors | Partial check, extrapolation |
| Build succeeds | Build command: exit 0 | Linter passing, logs look good |
| Bug fixed | Test original symptom: passes | Code changed, assumed fixed |
| Agent completed | VCS diff shows changes | Agent reports "success" |
| Requirements met | Line-by-line checklist | Tests passing |

## Continuous Mode

For long sessions, run verification at checkpoints:
- After completing each function
- After finishing a component
- Before moving to next task

## Key Patterns

**Tests:**
```
✅ [Run test command] [See: 34/34 pass] "All tests pass"
❌ "Should pass now" / "Looks correct"
```

**Regression tests (TDD Red-Green):**
```
✅ Write → Run (pass) → Revert fix → Run (MUST FAIL) → Restore → Run (pass)
❌ "I've written a regression test" (without red-green verification)
```

**Build:**
```
✅ [Run build] [See: exit 0] "Build passes"
❌ "Linter passed" (linter doesn't check compilation)
```

## Quality Gates

A gate is a **number with a PASS/FAIL rule and a rollback trigger**, written down before the
change ships. "Seems fine" is not a gate.

| Gate | Default threshold | Must be explicit |
|------|-------------------|------------------|
| Line coverage | ≥ 80% | Actual measured %, and the delta vs. the previous run |
| Branch coverage | ≥ 70% | Line coverage alone hides untested conditionals |
| p95 latency | project-defined | Baseline value + the degradation limit that trips an alert |
| Error rate | project-defined | Baseline + alert threshold, per endpoint class |
| Build time | no regression > 20% | Slower builds silently erode the verification habit |
| Bundle size | no regression > 5% | Frontend only |

Rules:
- **Define the degradation threshold before shipping**, not after the metric moves. A threshold
  chosen post-hoc always accommodates the result.
- **Write the rollback trigger explicitly**: "if p95 > 800 ms for 10 min, roll back" — not
  "monitor and decide".
- **State PASS/FAIL as a verdict**, with the command and its output. Never "大概没问题" /
  "should be fine" / "looks stable".
- Thresholds live in config or CI, so the gate runs without a human remembering it.

## Test Case Coverage

Verification of *behaviour* requires cases across five dimensions. A suite covering only the
happy path verifies nothing about the change's risk.

| Dimension | Question it answers |
|-----------|---------------------|
| 正常 (happy path) | Does it work as specified? |
| 边界 (boundary) | What happens at the edge of every input range? |
| 异常 (error) | What happens when a dependency fails, input is malformed, or a step times out? |
| 并发 (concurrency) | What happens when two actors do it at once? |
| 幂等 (idempotency) | What happens when the same request arrives twice? |

### Case template (8 fields)

| Field | Content |
|-------|---------|
| 编号 | Stable ID — the traceability key |
| 场景 | One sentence: what situation |
| 前置 | State required before the step runs |
| 步骤 | Ordered, each independently executable |
| 输入 | Exact values, including units and types |
| 预期 | Observable outcome — not "works correctly" |
| 优先级 | P0 (blocks release) / P1 (must fix soon) / P2 (tracked) |
| 关联AC | The acceptance criterion this case proves |

**Traceability is bidirectional**: every AC has ≥ 1 case, and every case maps to an AC. A case
with no AC is testing something nobody asked for; an AC with no case is an unverified claim.

### Generating the case set

- **Boundary matrix** — list every input dimension as rows, every boundary point (min−1, min,
  min+1, typical, max−1, max, max+1, null, empty, wrong type) as columns. Each populated cell is
  a case.
- **State transition table** — `current state × event → next state + assertion`. Every cell that
  is not "invalid transition" needs a case; every cell that *is* invalid needs a case proving it
  is rejected.
- **Parameterized / data-driven** — one test body, a table of inputs. Adding a row is cheaper than
  adding a test, which is what makes broad boundary coverage actually happen.

## Rationalization Prevention

| Excuse | Reality |
|--------|---------|
| "Should work now" | RUN the verification |
| "I'm confident" | Confidence ≠ evidence |
| "Just this once" | No exceptions |
| "Linter passed" | Linter ≠ compiler |
| "Agent said success" | Verify independently |
| "Partial check is enough" | Partial proves nothing |
| "Coverage is close enough" | 79% ≠ 80% — a gate is a number, not a vibe |
| "We'll set the threshold after we see the metric" | A post-hoc threshold always accommodates the result |
| "The happy path passes, so it works" | Untested error/concurrency/idempotency paths are where the incident lives |

## Red Flags — STOP

- Using "should", "probably", "seems to"
- Expressing satisfaction before verification
- About to commit/push/PR without verification
- Trusting agent success reports
- Relying on partial verification
- Thinking "just this once"
- ANY wording implying success without having run verification

## Rules

- Do not say a change is complete without evidence
- If a check fails, include the failure clearly
- If no realistic verification path exists, say that explicitly
- Prefer concise evidence summaries over noisy logs
