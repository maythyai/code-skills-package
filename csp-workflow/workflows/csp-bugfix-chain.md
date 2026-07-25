# csp-bugfix-chain — Automated Bug Fix Pipeline

Chains the full bug fix lifecycle — debug → fix → tdd → verify — into a single
automated pipeline. Each stage delegates to the matching CSP persona and
auto-advances when its exit criteria are met, looping back on failure within
bounded retry limits.

## Trigger

- "fix this bug", "there's a bug in...", "/csp-bugfix"
- Any debug session that identifies a root cause

## Pipeline

### Stage 1: DEBUG (delegate to csp-systematic-debugging)

- Reproduce the bug (mandatory — no fix without repro)
- Identify root cause using hypothesis loop (max 3 hypotheses)
- Output: `ROOT-CAUSE.md` with evidence

### Stage 2: FIX (minimal surgical change)

- Implement the smallest fix that addresses root cause
- Do NOT refactor unrelated code
- Do NOT add features
- Constraint: <5% of touched files changed

### Stage 3: TDD (delegate to csp-tdd)

- Write regression test FIRST (RED)
- Verify fix makes test pass (GREEN)
- Refactor if needed (REFACTOR)
- Output: test file + passing result

### Stage 4: VERIFY (delegate to csp-verification)

- Run full test suite
- Verify no regressions
- Check the original bug scenario is fixed
- Output: `VERIFICATION.md` with status: passed/failed

## Auto-advance rules

- Stage 1 → 2: automatic when `ROOT-CAUSE.md` has confidence > 80%
- Stage 2 → 3: automatic when fix compiles/lints clean
- Stage 3 → 4: automatic when regression test passes
- Stage 4 FAIL → back to Stage 2 (max 2 retries, then escalate to user)

## Stop conditions

- 3 failed hypotheses in Stage 1 → ask user for more context
- 2 failed verify cycles → escalate, do not loop forever
- Fix touches >5 files → warn user, may be architectural issue

## State persistence

- `.planning/debug/{slug}/ROOT-CAUSE.md`
- `.planning/debug/{slug}/FIX-SUMMARY.md`
- `.planning/debug/{slug}/VERIFICATION.md`
