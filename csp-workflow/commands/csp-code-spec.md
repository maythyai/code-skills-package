---
name: csp-code-spec
description: Distill or auto-align the Code Module Spec (CMS / 代码说明书) — per-app living baseline of entry points, call chains, boundaries, conventions. Feeds design/task-split/codegen/CR.
argument-hint: "[--init] [--align] [--app <name>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Agent
---

<objective>
Maintain the Code Module Spec (CMS / 代码说明书) — the per-application living baseline
distilled from the codebase and auto-aligned to ground truth. One CMS per app/repo.
It is the authoritative codebase map consumed by design, task-split, code generation,
and code review (including `csp-qa-cr-review`'s distillation-enhanced impact analysis).

**Position in lifecycle:** governance track — established on brownfield onboarding,
re-aligned after every ship (delta). Platform-neutral: git + `CSP_GIT_REMOTE` (default github.com).
</objective>

<execution_context>
@~/.claude/code-skills-package/csp-workflow/skills/csp-code-spec/SKILL.md
@~/.claude/code-skills-package/csp-workflow/skills/csp-code-spec/references/code-spec-standard.md
@~/.claude/code-skills-package/csp-workflow/skills/csp-code-spec/references/distillation-strategy.md
@~/.claude/code-skills-package/csp-workflow/skills/csp-code-spec/scripts/code_spec.sh
</execution_context>

<context>
Flags:
- `--init` — full distillation: baseline + entrypoints + call chains + conventions (Step 1-5)
- `--align` — auto-align: incremental delta since last baseline SHA (Step 6)
- `--app <name>` — app name (default: repo basename); output `.csp/code-spec/{app}/`

Default: auto-detect (`CODE-MODULE-SPEC.md` exists → align; else → init).

Helper script:
```bash
bash scripts/code_spec.sh baseline        # git baseline + size overview
bash scripts/code_spec.sh entrypoints     # scan HTTP/CLI/scheduled/MQ entry points (grep-only)
bash scripts/code_spec.sh diff-since <sha>  # files changed since baseline (for align delta)
bash scripts/code_spec.sh graph <dir>     # knowledge-graph skeleton (grep-verified)
```
</context>

<process>
Read the SKILL.md BEFORE acting. Follow its 7-step process. Honor anti-hallucination:
every claim cites `file:line`; high-risk conclusions (dead code / no-auth / never-called)
are machine-verified — never trust agent distillation alone for these.
</process>

<success_criteria>
- Every entry point has `file:line` (grep-verified, no fabrication)
- High-risk findings verified on-machine and tagged 【已实机核验】 or 【核验推翻】
- Module boundaries aligned to PMS; drift recorded with `file:line`
- Delta idempotent: re-running align on unchanged source yields zero delta
- No internal platform names/domains; remote = git + CSP_GIT_REMOTE
- Output at `.csp/code-spec/{app}/CODE-MODULE-SPEC.md` + `knowledge-graph.json` + `entry-points.jsonl`
</success_criteria>
