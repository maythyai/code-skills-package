---
name: csp-import
description: Ingest external plans with conflict detection against project decisions before writing anything.
argument-hint: "--from <filepath> | --from-legacy-planning"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
  - Agent
---

<objective>
Import external plan files into the CSP planning system with conflict detection against PROJECT.md decisions.

- **--from**: Import an external plan file, detect conflicts, write as CSP PLAN.md, validate via csp-plan-checker.
- **--from-legacy-planning**: Migrate a legacy planning layout into the standard `.planning/` format. Runs `csp-tools.cjs from-legacy-planning`. Pass `--path <dir>` to migrate a project at a different path.
</objective>

<execution_context>
@~/.claude/code-skills-package/csp-workflow/workflows/import.md
@~/.claude/code-skills-package/csp-workflow/references/ui-brand.md
@~/.claude/code-skills-package/csp-workflow/references/gate-prompts.md
@~/.claude/code-skills-package/csp-workflow/references/doc-conflict-engine.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
If `--from-legacy-planning` is in $ARGUMENTS:
Run: `node "$HOME/.claude/code-skills-package/bin/csp-tools.cjs" from-legacy-planning`
Pass `--path <dir>` if provided. Present the migration result to the user.
Stop here (do not run the standard import workflow).

Otherwise, execute the import workflow end-to-end.
</process>
