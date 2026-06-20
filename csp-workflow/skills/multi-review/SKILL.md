---
name: csp-multi-review
description: "Structured code review using tiered persona agents, confidence-gated findings, and a merge/dedup pipeline. Use when comprehensive review is needed before creating a PR."
layer: 2
category: workflow
---

| Priority | Definition | Action |
|----------|------------|--------|
| **P0** | Critical breakage, exploitable vulnerability, data loss | Must fix before merge |
| **P1** | High-impact defect likely hit in normal usage | Should fix |
| **P2** | Moderate issue with meaningful downside | Fix if straightforward |
| **P3** | Low-impact, narrow scope | User's discretion |

## Confidence Gates

Findings use anchored confidence levels:

- **100** — Mechanically verifiable from code
- **75** — Concrete scenario, but one step depends on unconfirmed conditions
- **50** — Advisory observation. Surfaces as FYI.
- **Suppress** — Below anchor 50

Cross-reviewer agreement promotes one level: 50->75, 75->100.

## How to Run

### Stage 1: Determine scope

Compute the diff range and file list:

```bash
git diff --name-only HEAD~1 && git diff -U10 HEAD~1
```

For branch reviews, use `git diff --name-only main...HEAD` to get all changes on the branch.

### Stage 2: Intent summary

From commit messages, branch name, and diff content, write a 2-3 line intent summary. This shapes how hard each reviewer looks.

### Stage 3: Select reviewers

Read the diff and file list. Always-on personas are automatic. For conditional personas, use agent judgment — not keyword matching.

### Stage 4: Spawn sub-agents

Dispatch selected reviewers in parallel. Each receives:
1. Their persona definition
2. The diff and file list
3. Intent summary
4. Output schema

Use mid-tier model for routine reviewers, strongest model for correctness and adversarial.

### Stage 5: Merge findings

1. **Validate** — check required fields
2. **Deduplicate** — compute fingerprint (file + line_bucket + title). Merge matches: keep highest severity, highest confidence
3. **Cross-reviewer agreement** — promote confidence by one level when 2+ reviewers flag same issue
4. **Confidence gate** — suppress findings below anchor 75, except P0 at anchor 50+
5. **Sort** — severity (P0 first) -> confidence (descending) -> file path -> line

### Stage 6: Present report

```
## Code Review Report

**Intent:** 2-3 line summary
**Scope:** N files, M lines changed
**Reviewers:** list of personas

### P0 -- Critical
| # | File | Issue | Reviewer | Confidence |
---

|---|------|-------|----------|------------|

### P1 -- High
...

### Learnings
- Any relevant docs/solutions/ patterns found

### Coverage
- Residual risks, testing gaps, failed reviewers
```

---

## Headless Mode

This skill supports `mode:headless` for non-interactive automation. See `shared/references/headless-mode-protocol.md` for the unified protocol.

## Advanced Features (from Compound Engineering)

### Stage 2b: Plan Discovery (Requirements Verification)

Locate the plan document to verify requirements completeness:

1. **`plan:` argument** — caller provided explicit path
2. **PR body** — scan for `docs/plans/*.md` paths
3. **Auto-discover** — extract keywords from branch name, glob `docs/plans/*`

Record `plan_source: explicit | inferred` for confidence tagging.

### Stage 5b: Validation Pass (Optional Quality Gate)

Independent verification of surviving findings:

1. **Select findings** — all survivors of Stage 5
2. **Budget cap** — if >15 findings, validate top 15 by severity (never drop P0/P1)
3. **Spawn validators** — one sub-agent per finding, read-only verification
4. **Collect verdicts** — `validated: true` survives, `validated: false` dropped
5. **Infra failure handling** — P0/P1 kept as "degraded", P2/P3 dropped (conservative)

### Stage 5c: Act on Findings (Default Mode Only)

**Skip in `mode:agent`** — that mode is report-only, caller applies.

**Bias to act:**
- **Apply** clear improvements (test hardening, dead-code removal, localized fixes)
- **Push back** when reviewer is wrong (keep finding, state disagreement)
- **Skip with judgment** taste calls (surface what was skipped)

**Scope invariant:** Apply only when working tree IS what was reviewed (local-aligned or standalone).

**Verify then keep:** After applying, run affected tests/lint. If they fail, revert and report as finding.

**Commit when clean:** If pre-review tree was clean, commit fixes as `fix(review): <summary>`.

### Autofix Class Routing

| `autofix_class` | Default owner | Meaning |
|-----------------|---------------|---------|
| `gated_auto` | `downstream-resolver` or `human` | Concrete fix proposed, caller applies after judgment |
| `manual` | `downstream-resolver` or `human` | Actionable work needing design input |
| `advisory` | `human` or `release` | Report-only — learnings, residual risk |

**Routing rules:**
- Synthesis owns the final route (persona input, not last word)
- Choose more conservative route on disagreement
- `requires_verification: true` means caller-applied fix needs tests

### Mode-Aware Demotion (Stage 5 step 6b)

Demote weak quality findings when ALL hold:
- Severity P2/P3 (P0/P1 always stay)
- `autofix_class` is `advisory`
- ALL contributing reviewers are `testing` or `maintainability`

Move demoted findings to `testing_gaps` or `residual_risks`.

### Model Tiering

**Strongest model (no override):** `csp-correctness-reviewer`, `csp-security-reviewer`, `csp-adversarial-reviewer` — highest-stakes analysis.

**Mid-tier model:** All other persona reviewers and validators — cost control.

**Orchestrator:** Inherits session model for intent discovery, reviewer selection, merge/dedup, synthesis.

### Protected Artifacts

Never flag for deletion/removal/gitignore:
- `docs/brainstorms/*` — requirements from csp-brainstorm
- `docs/plans/*.md` — plan files from csp-plan
- `docs/solutions/*.md` — solution docs from csp-compound

Discard any findings recommending cleanup of these paths during synthesis.

### PR Skip Rules

Before dispatching reviewers, check PR state:
- `state` is `CLOSED` or `MERGED` → stop with reason
- **Trivial PR judgment** — spawn lightweight agent to detect automated/trivial PRs (lock-file bumps, release commits, chore version increments)

### Requirements Completeness (Stage 6)

When a plan was found in Stage 2b, verify each requirement (R1, R2...) and implementation unit appears in the diff:
- **`explicit` plan** → flag unaddressed as P1 `manual`
- **`inferred` plan** → flag unaddressed as P3 `advisory`

Omit section entirely when no plan found.

### Run Artifacts

Always write to `/tmp/csp-multi-review/<run-id>/`:
- Per-agent `{reviewer_name}.json`
- `review.json` — synthesized findings
- `report.md` — rendered report (default mode)
- `metadata.json` — run_id, branch, head_sha, verdict, completed_at

### JSON Output Format (`mode:agent` only)

Emit **one raw JSON object** (no markdown fence) for programmatic callers:

```json
{
  "status": "complete",
  "verdict": "Ready to merge | Ready with fixes | Not ready",
  "scope": { "base", "branch", "head_sha", "pr_url", "files_changed" },
  "intent": "...",
  "intent_confidence": "explicit | inferred | uncertain",
  "reviewers": ["correctness", "security"],
  "findings": [],
  "actionable_findings": [],
  "pre_existing_findings": [],
  "requirements_completeness": null,
  "learnings": [],
  "residual_risks": [],
  "testing_gaps": [],
  "coverage": {},
  "artifact_path": "/tmp/csp-multi-review/<run-id>/",
  "run_id": "<run-id>"
}
```

On failure: `"status": "failed"` with `"reason"`. On skip: `"status": "skipped"`.

### Additional Conditional Reviewers

**Cross-cutting (per diff):**
- `csp-api-contract-reviewer` — routes, serializers, type signatures, versioning
- `csp-data-migration-reviewer` — migration files, schema dumps, backfills (spawn gate: migration artifacts in diff)
- `csp-reliability-reviewer` — error handling, retries, timeouts, background jobs
- `csp-deployment-verification-agent` — deployment checklist + rollback when migration gate applies and change is risky

**Stack-specific (per diff):**
- Language-specific reviewers from csp-patterns layer (React, TypeScript, Python, etc.)
