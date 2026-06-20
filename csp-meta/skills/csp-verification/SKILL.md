---
name: csp-verification
description: >
  Verify changes really work before claiming completion. Evidence before assertions, always.
  Includes 6-phase verification (build, types, lint, tests, security, diff) and continuous mode.
  Use when about to claim work is complete, before committing or creating PRs.
layer: 1
category: meta
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

## Rationalization Prevention

| Excuse | Reality |
|--------|---------|
| "Should work now" | RUN the verification |
| "I'm confident" | Confidence ≠ evidence |
| "Just this once" | No exceptions |
| "Linter passed" | Linter ≠ compiler |
| "Agent said success" | Verify independently |
| "Partial check is enough" | Partial proves nothing |

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
