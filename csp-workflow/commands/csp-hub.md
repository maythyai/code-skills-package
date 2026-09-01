---
name: csp-hub
description: Initialize or operate the local-first Knowledge Hub — a git-managed markdown workspace indexing specs (PMS/CMS/TMS) + wiki + memory, closing the 需求→code→test loop. Lifecycle Stage 0.
argument-hint: "<subcommand> [args]  # init|status|locate|diff|doctor|build"
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
Operate the Knowledge Hub — the local-first unified knowledge workspace. Initializes
`.csp/AGENTS.md` (route contract) + `.csp/manifest.json` (sole source index) so every
spec/wiki/memory page is locatable, traceable, and incrementally synced across the lifecycle,
closing the 需求对齐 → code开发 → 测试 loop.

**Position in lifecycle:** Stage 0 (before S1 decomposition). The hub is the first lifecycle
step; PMS/CMS/TMS products write back to the manifest so the hub is the unified index layer.
</objective>

<execution_context>
@~/.claude/code-skills-package/csp-workflow/skills/csp-knowledge-hub/SKILL.md
@~/.claude/code-skills-package/csp-workflow/skills/csp-knowledge-hub/references/workspace-layout.md
@~/.claude/code-skills-package/csp-workflow/skills/csp-knowledge-hub/references/manifest-frontmatter-spec.md
@~/.claude/code-skills-package/csp-workflow/skills/csp-knowledge-hub/references/agents-md-route-contract.md
@~/.claude/code-skills-package/csp-workflow/skills/csp-knowledge-hub/references/closed-loop.md
@~/.claude/code-skills-package/csp-workflow/skills/csp-knowledge-hub/scripts/hub_manifest.sh
</execution_context>

<context>
Subcommands:
- `init`           — create `.csp/AGENTS.md` + `manifest.json` + workspace skeleton (Stage 0)
- `status`         — hub health: items / built / pending / failed / AGENTS.md sections
- `locate <query>` — keyword-locate across spec/wiki/memory → output_path + frontmatter
- `list [--type t]`— list manifest items (filter by source_type: pms|cms|tms|wiki|codewiki|memory)
- `diff`           — added/changed/removed since last manifest content_hash snapshot
- `doctor`         — validate AGENTS.md 6 sections + inline frontmatter + no sidecar .meta.json
- `build`          — route missing items (build_status=pending) to the producing spec skill

Helper script: `bash scripts/hub_manifest.sh <status|locate|list|diff|doctor>`.

Discipline (non-negotiable):
- conflict-check before add (locate first; auto-update conflicts, don't ask-delete)
- CLI script over generated code (use hub_manifest.sh, don't generate Python)
- raw read-only after fetch; query read-only
- content_hash for change detection (never mtime)
- git publish needs user confirmation gate; no credentials in workspace
</context>

<process>
Read the SKILL.md BEFORE acting. For `init`: confirm inputs (project name, source roots,
repo URL via CSP_GIT_REMOTE default github.com) via one consolidated AskUserQuestion, then
write AGENTS.md (6 sections from agents-md-route-contract.md) + manifest.json skeleton.
For `build`: read manifest pending items, route each to its skill (csp-product-spec /
csp-code-spec / csp-test-spec / csp-wiki / csp-code-wiki), then write back build_status.
</process>

<success_criteria>
- `init`: `.csp/AGENTS.md` has ≥6 H2 sections + route table; `.csp/manifest.json` valid
- `status`/`doctor`: hub_manifest.sh doctor exits 0 (no sidecar, frontmatter present)
- `locate`: returns output_path + frontmatter for the query
- No internal platform names; git + CSP_GIT_REMOTE only
- Hub indexes across PMS/CMS/TMS/wiki/memory (closed loop)
</success_criteria>
