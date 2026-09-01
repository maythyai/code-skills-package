---
name: csp-product-spec
description: Establish or amend the Product Module Spec (PMS) — the living baseline that governs PRD quality (modules, boundaries, acceptance form). Branch of the Module Spec governance track.
argument-hint: "[--init] [--delta] [--module <MOD-ID>]"
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
Maintain the Product Module Spec (PMS / 产品说明书) — the product-level living baseline
that defines module decomposition, boundaries, and the acceptance-standard form every PRD
must satisfy. PMS *determines PRD generation quality*. Downstream skills (PRD generation,
decomposition, traceability, change-impact) read it before producing their own artifacts.

**Position in lifecycle:** governance track running alongside S1 (decomposition) —
PMS is established/refined *before* PRDs are written.
</objective>

<execution_context>
@~/.claude/code-skills-package/csp-workflow/skills/csp-product-spec/SKILL.md
@~/.claude/code-skills-package/csp-workflow/skills/csp-product-spec/references/product-spec-standard.md
@~/.claude/code-skills-package/csp-workflow/references/module-spec-lifecycle-norms.md
</execution_context>

<context>
Flags:
- `--init` — full-mode: generate canonical PMS from scratch (Step 1-5 of SKILL.md)
- `--delta` — incremental: emit ADDED/MODIFIED/REMOVED deltas against existing baseline (Step 6)
- `--module <MOD-ID>` — scope to one module

Default: auto-detect (`.csp/product-spec/PRODUCT-MODULE-SPEC.md` exists → delta; else → init).
</context>

<process>
Read the SKILL.md BEFORE acting. Follow its 7-step process. Honor the behavioral norms:
no fabrication (mark `[TBD]`), tech-agnostic (no DB/language/framework), delta discipline
(paste full original before editing MODIFIED sections).
</process>

<success_criteria>
- Every module has responsibility + boundary + capability + owner
- Module dependency graph is acyclic
- Acceptance-standard form defined (Given/When/Then + forbidden items)
- PRD coverage gate stated (prd_to_module 100%)
- No technical implementation detail (tech-agnostic)
- Output at `.csp/product-spec/PRODUCT-MODULE-SPEC.md`
</success_criteria>
