# CSP Project Knowledge Governance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give users of CSP a reliable layered entry into their project's facts, state, and artifacts without unverified new sources of truth or destructive generic layout rules.

**Architecture:** A single reference contract under `csp-knowledge-hub/references/` defines the four-layer read and freshness rules. Existing skills own their respective responsibilities; the four prompts only direct when to use them. A read-only document-size checker reports real scope and has explicit opt-in failure rather than contradicting prose.

**Tech Stack:** CSP Markdown SKILL.md v2, Bash 3.2+, Node 18+ `node:test` fixtures, existing build/validate tools.

**Spec:** `docs/superpowers/specs/2026-11-12-csp-project-knowledge-governance-design.md`

## Global Constraints

- Do not modify or clean `/Users/cs/projects/auto_content` or the user's pre-existing changed `prompts/临时草稿不要提交.md`.
- Existing project rules override default directory templates; do not claim CI enforcement or automatic sharding/writeback that does not exist.
- `.csp/findings-baseline.json` is the existing violation baseline, not the inventory of open findings.
- No remote push, publication, or deletion of live artifacts in this task.

---

### Task 1: Four-layer project knowledge contract

**Files:**
- Create: `csp-workflow/skills/csp-knowledge-hub/references/project-entry-contract.md`
- Modify: `csp-workflow/skills/csp-knowledge-hub/SKILL.md`, `csp-meta/skills/csp-context-engineering/SKILL.md`
- Test: `test/hub-manifest-fixture.test.mjs` (existing regression checks), plus search for contradictions.

**Interfaces:** The contract defines L0 instructions, L1 lifecycle/last-observed evidence, L2 route/manifest and L3 task details. `csp-knowledge-hub` links it; context engineering consumes it.

- [ ] Write an authoritative contract including roles, ownership, freshness, source-vs-view, fallback, anti-patterns and small bounded examples for greenfield/brownfield/monorepo.
- [ ] Add a compact reference from the two skills; correct inaccurate manifest, AGENTS-section, and helper claims while preserving existing interfaces.
- [ ] Run targeted hub fixtures and inspect the diff for accidental feature claims.

### Task 2: Reconcile documentation and handoff rules

**Files:**
- Modify: `csp-workflow/skills/csp-documentation-governance/SKILL.md`, `csp-workflow/skills/csp-project-doc-architect/SKILL.md`, `csp-workflow/skills/csp-doc-lifecycle-manager/SKILL.md`, `csp-runtime/skills/csp-file-organizer/SKILL.md`, `prompts/000-project-governance_csp.md`, `prompts/000-product-planning_csp.md`, `prompts/000-develop_pipeline_csp.md`, `prompts/000-test_pipeline_csp.md`.
- Test: static searches for contradicting ROADMAP, active PRD, TMS, evidence, 06/07 semantics and unauthorized archiving wording.

**Interfaces:** Existing skill responsibilities remain unchanged. The prompt files route to skills rather than duplicating a second governance contract.

- [ ] Align doc zones and active handoff files; change project templates into examples, with discover-first and references preserved.
- [ ] Amend lifecycle, finding and artifact sections to distinguish source/derived views, observations/fresh gates, per-project retention, and explicit conditional exceptions.
- [ ] Align the four prompt handoffs and avoid new mandatory paths or unimplemented automation claims.
- [ ] Review diff for careless deletions/changes to unrelated project data.

### Task 3: Make document-size check honest and testable

**Files:**
- Modify: `scripts/check-large-files.sh`
- Create: `test/check-large-files-fixture.test.mjs`
- Modify: `prompts/000-project-governance_csp.md` (only size-check explanation, as part of Task 2).

**Interfaces:** `bash scripts/check-large-files.sh [project-root] [--warn-kb N] [--fail-kb N]` is read-only: default warnings, explicit optional failure. Report paths actually scanned, missing zones, counts and exit code. Generated large JSON is not subject to Markdown limits.

- [ ] Write fixtures: empty project, 50 KiB boundary, explicit fail threshold, path with spaces, and large JSON index untouched.
- [ ] Run `node --test test/check-large-files-fixture.test.mjs` to observe failing behavior against the current script.
- [ ] Implement the minimal portable checker (macOS Bash 3.2+, Linux) using null-delimited paths and actual scan paths; warnings default to exit 0; optional fail exits 1.
- [ ] Re-run targeted fixtures and `npm run validate:all && npm test` (report precise exit status).
- [ ] If skills changed, run `npm run build:all` then rerun validation; review only generated diff and keep the user's unrelated modifications untouched.

## Self-review

- [ ] No unconditional archival of active source documents or evidence.
- [ ] No 'recent_delta', metrics freshness, finding inventory or sharding behavior claimed without implementation.
- [ ] Stage names and artifact paths are descriptive mappings to existing authoritative schema, not a new state machine.
- [ ] All scripts' status/exit semantics described exactly as implemented.
