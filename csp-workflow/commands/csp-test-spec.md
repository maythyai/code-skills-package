---
name: csp-test-spec
description: Establish or amend the Test Module Spec (TMS / 测试说明书) — per-module living test baseline (branch of PMS): stock case inventory + requirement→method matrix; generates stock + incremental cases.
argument-hint: "[--init] [--delta] [--module <MOD-ID>] [--from-change <CHG-ID>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

<objective>
Maintain the Test Module Spec (TMS / 测试说明书) — the per-module living test baseline,
a branch of PMS. Maintains the stock (existing) test-case inventory and the
requirement→method trace matrix, and generates stock + incremental test cases from
requirement/design docs. On change, emits only the incremental cases the delta newly
requires (entry × state matrix). Governs test-case quality the way PMS governs PRD quality.

**Position in lifecycle:** governance track, verify phase — established after PRD/design,
re-aligned on every change (delta).
</objective>

<execution_context>
@~/.claude/code-skills-package/csp-workflow/skills/csp-test-spec/SKILL.md
@~/.claude/code-skills-package/csp-workflow/skills/csp-test-spec/references/test-spec-standard.md
@~/.claude/code-skills-package/csp-workflow/references/module-spec-lifecycle-norms.md
</execution_context>

<context>
Flags:
- `--init` — full: build stock inventory + requirement→method matrix (Step 1-5)
- `--delta` — incremental: emit only new cases for the change's newly-touched entry×state combinations (Step 6)
- `--module <MOD-ID>` — scope to one PMS module (must be declared in PMS)
- `--from-change <CHG-ID>` — read `csp-prd-change-impact` output for the affected requirements/entries

Default: auto-detect (`TEST-MODULE-SPEC.md` exists → delta; else → init).

Branch discipline: modules must be declared in PMS; TMS never invents modules.
Entry dimension comes from CMS `entry-points.jsonl` (consistent with CR distillation).
</context>

<process>
Read the SKILL.md BEFORE acting. Follow its 7-step process. Honor anti-fragmentation:
matrix organization (entry × state), narrative-sentence naming, one cross-layer
round-trip case per write path. Green tests ≠ requirement coverage — run the gap analysis.
</process>

<success_criteria>
- Module declared in PMS (branch discipline upheld)
- Every requirement maps to ≥1 test method; unmapped requirements listed as gaps
- Stock cases organized as entry×state matrix with narrative-sentence names
- Write paths have ≥1 cross-layer round-trip case (anti-fragmentation)
- Incremental covers only newly-touched combinations (delta idempotent on unchanged reqs)
- Output at `.csp/test-spec/{module}/TEST-MODULE-SPEC.md` + `case-inventory.md` + `requirement-matrix.md`
</success_criteria>
