---
name: csp-verification
description: >
  Verify changes really work before claiming completion. Evidence before assertions, always.
  Includes 6-phase verification (build, types, lint, tests, security, diff) and continuous mode.
  Use when about to claim work is complete, before committing or creating PRs.
csp-layer: 1-meta
csp-source: merged(CSP)
---

# Verification

## Overview

Claiming work is complete without verification is dishonesty, not efficiency.

**Core principle:** Evidence before claims, always.

**The Iron Law:** NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE.

If you haven't run the verification command in this message, you cannot claim it passes.

## When to Use

- About to claim work is complete, fixed, or passing
- Before committing, creating PRs, or marking tasks done
- After completing a feature or significant code change
- After refactoring
- Before moving to the next task
- When delegating to agents (verify independently)

## The Gate Function

```
BEFORE claiming any status or expressing satisfaction:

1. IDENTIFY: What command proves this claim?
2. RUN: Execute the FULL command (fresh, complete)
3. READ: Full output, check exit code, count failures
4. VERIFY: Does output confirm the claim?
   - If NO: State actual status with evidence
   - If YES: State claim WITH evidence
5. ONLY THEN: Make the claim

Skip any step = lying, not verifying
```

## Verification Order

Prefer the narrowest verification that proves the claim:

1. **Existing tests** — run them, check output
2. **Typecheck / build** — `tsc --noEmit`, `npm run build`
3. **Narrow direct commands** — specific checks for the change
4. **Manual validation** — only when automation isn't enough

## 6-Phase Verification (Full Suite)

For comprehensive verification before PRs or releases:

### Phase 1: Build
```bash
npm run build 2>&1 | tail -20
```
If build fails, STOP and fix before continuing.

### Phase 2: Type Check
```bash
npx tsc --noEmit 2>&1 | head -30   # TypeScript
pyright . 2>&1 | head -30           # Python
```

### Phase 3: Lint
```bash
npm run lint 2>&1 | head -30        # JS/TS
ruff check . 2>&1 | head -30        # Python
```

### Phase 4: Test Suite
```bash
npm run test -- --coverage 2>&1 | tail -50
```
Target: 80% minimum coverage.

### Phase 5: Security Scan
```bash
grep -rn "sk-" --include="*.ts" --include="*.js" . 2>/dev/null | head -10
grep -rn "api_key" --include="*.ts" --include="*.js" . 2>/dev/null | head -10
grep -rn "console.log" --include="*.ts" --include="*.tsx" src/ 2>/dev/null | head -10
```

### Phase 6: Diff Review
```bash
git diff --stat
git diff HEAD~1 --name-only
```
Review each changed file for unintended changes, missing error handling, edge cases.

## Verification Report

```
VERIFICATION REPORT
==================

Build:     [PASS/FAIL]
Types:     [PASS/FAIL] (X errors)
Lint:      [PASS/FAIL] (X warnings)
Tests:     [PASS/FAIL] (X/Y passed, Z% coverage)
Security:  [PASS/FAIL] (X issues)
Diff:      [X files changed]

Overall:   [READY/NOT READY] for PR

Issues to Fix:
1. ...
2. ...
```

## Common Failures

| Claim | Requires | Not Sufficient |
|-------|----------|----------------|
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
