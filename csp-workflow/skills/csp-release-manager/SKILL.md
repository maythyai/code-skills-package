---
name: csp-release-manager
description: >
  End-to-end release management: quality gate (S6) → review (S7) → ship (S8)
  → ops (S9). Orchestrates csp-verify-phase, csp-code-review, csp-ship into
  a single pipeline with exit code enforcement, batch evidence tracking,
  release recurrence checks, and version integrity validation. Use when
  preparing a release or running the full 06 verify-ship pipeline.
version: 1.0.0
layer: 2
category: workflow
phase: verify
domain: quality
role: specialist
scope: review
tools: [Read, Write, Edit, Bash, Glob, Grep]
related_skills:
  - [[workflow:csp-verify-phase]]
  - [[workflow:csp-code-review]]
  - [[workflow:csp-ship]]
  - [[pattern:csp-santa-method]]
  - [[pattern:csp-git-conventions]]

anti_rationalizations:
  "Tests passed, we can ship": "The S6 gate has 11 checks plus backend API tests. Tests passing is only Check 1. Ship only when ALL gates ran with exit 0."
  "The CI is green, skip manual verification": "CI tests ≠ backend API integration tests. R2b and v6.1.1 both regressed because backend API tests were skipped. Never skip Check 1.5."
  "I'll run version integrity later": "Version integrity (T1-T6) is a BLOCKING gate. Multi-tag or version drift discovered after push is a hard revert."
---

# Release Manager — Full 06 Verify-Ship Pipeline

Orchestrates the complete S6→S7→S8→S9 release pipeline as defined in `prompts/06-verify-ship.md`. This skill is the entry point for the release workflow; it delegates individual gate checks to specialized skills.

## Entry Conditions

- S5 (implementation) status is `done` in `.csp/lifecycle-state.json`
- All tasks in WBS.md are complete
- `.csp/AGENTS.md` and `.csp/manifest.json` exist (00 hub initialized)

## Pipeline

### Phase 0: Pre-flight

1. Read `.csp/lifecycle-state.json` → confirm S5 done
2. Phase 0.5 — Toolchain health: `pnpm install`, `tsc`, `pytest`, `pnpm build`, linter all available
3. Phase 0.6 — Release recurrence: check unshipped commits vs cadence thresholds

### Phase 1: S6 Quality Gate

Run all 11 mandatory checks. Evidence format: `ran: <cmd> exit <code>`.

| # | Check | Delegate To | Mandatory? |
|---|---|---|---|
| 1 | Unit/Integration/E2E | [[workflow:csp-verify-phase]] Check 1 | Yes |
| 1.5 | Backend API Tests | `pytest tests/backend/api/` | **Yes (BLOCKING)** |
| 2 | Lint | `ran: <lint cmd> exit 0` | Yes |
| 3 | Build | `ran: <build cmd> exit 0` | Yes |
| 4 | TypeCheck | `ran: <tsc/mypy> exit 0` | Yes |
| 5 | AC Demo | [[workflow:csp-verify-phase]] Check 5 | Yes |
| 6 | Documentation | [[workflow:csp-documentation-governance]] health check | Yes |
| 7-11 | Visual/A11y/Contract/Mutation/Observability | As applicable | Conditional |

**Batch delivery check (C-01)**: If shipping multiple features, verify `batch_evidence_map` has per-feature gate results.

### Phase 2: S7 Review

- [[workflow:csp-code-review]] — six dimensions + pattern exhaustiveness + cross-layer alignment
- [[pattern:csp-santa-method]] — dual adversarial review for critical modules
- Spec alignment ≥ 90%

### Phase 3: S8 Ship

- Version integrity: `version_integrity_check.py` (T1-T6 all pass)
- Tag: `v` prefix, annotated, one-commit-one-tag ([[pattern:csp-git-conventions]] §6)
- Release: `gh release create`
- Archive: milestone artifacts per `prompts/06-verify-ship.md` §十

### Phase 4: S9 Post-Launch

- Health endpoint verification
- Monitoring alert configuration
- Known issues tracking

## Exit Conditions

- [ ] All S6 gates `ran` with exit 0 (zero `not-run`)
- [ ] Check 1.5 Backend API tests passed
- [ ] S7 no CRITICAL findings
- [ ] `reconciled=true` in lifecycle-state
- [ ] `version_integrity_check.py` exit 0 (T1-T6)
- [ ] C-01 batch_evidence_map complete
- [ ] Tag pushed, Release created, archive done

## Evidence Schema

Every gate check produces structured evidence (see `prompts/06-verify-ship.md` §6.7.8):

```json
{
  "gate": "backend_api_tests",
  "command": "pytest tests/backend/api/ -v",
  "exit_code": 0,
  "duration_ms": 4520,
  "ran_at": "2026-11-09T10:00:00Z",
  "artifacts": ["test-results/api-tests.log"]
}
```

`not-run` with any reason = BLOCKED, no release.

## Related Skills

- [[workflow:csp-verify-phase]] — S6 gate checks 1 + 5
- [[workflow:csp-code-review]] — S7 review (six dimensions)
- [[pattern:csp-santa-method]] — S7 dual adversarial review
- [[workflow:csp-ship]] — S8 release + archive
- [[pattern:csp-git-conventions]] — Tag discipline + commit conventions