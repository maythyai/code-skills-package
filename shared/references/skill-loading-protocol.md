# Skill-Loading Protocol (Non-Claude-Code Platforms)

> Reference for bootstrap prompts on platforms that lack Claude Code's native `Skill` tool.
> Goal: make CSP routing honor the same contract everywhere, even when the AI must
> `read_file` a SKILL.md instead of calling a `Skill` tool.

## The Problem

Claude Code exposes a first-class `Skill` tool: the router emits a tool-call and the
skill body is loaded deterministically. Most other AI coding tools (Cursor, Windsurf,
Cline, Roo Code, JetBrains Junie, Neovim/avante, Codex, etc.) have **no such tool** —
they only auto-load a rules/instructions file at session start. On those platforms
CSP works by writing a bootstrap rule (`alwaysApply: true` or equivalent) that
*instructs the model* to honor csp- routing and `read_file` the matched SKILL.md.

The quality gap is real: a model that ignores the instruction silently degrades to
its default behavior. This document is the canonical instruction text that every
non-native bootstrap generator embeds, so the routing contract is identical across
platforms.

## The Contract (embedded in every non-native bootstrap)

Regardless of platform, the bootstrap instructs the AI to:

1. **Route before acting.** On any non-trivial task, first identify the task type
   and consult `csp-router`'s routing rules (keyword + intent + regex pattern +
   state-aware phase matching). Do not jump straight to code.
2. **Load matched skills explicitly.** When a skill matches (even at low confidence
   — ≥1% plausibility), `read_file` its `SKILL.md` and follow its workflow. Treat
   the SKILL.md as authoritative process, not background reference.
3. **Honor the five-layer load order.** L0 router is always loaded; L1-L4 are
   on-demand. Only load the minimum skill set the current task needs (token budget).
4. **Design → Test → Implement → Verify.** Methodology skills (brainstorming,
   writing-plans, TDD, verification) precede implementation skills.
5. **Verify before claiming done.** Run the verification command the skill specifies
   (a test, a build, a curl, a `validate:*`) and report its actual exit code/output —
   never assert completion without it.

## Platform-Specific Loading Mechanisms

| Platform | Bootstrap location | Auto-load mechanism | `read_file` equivalent |
|----------|--------------------|----------------------|------------------------|
| Cursor | `.cursor/rules/csp.md` (`alwaysApply: true`) | rules auto-injected into context | model's file-read tool |
| Windsurf | `.windsurfrules` | rules auto-injected | model's file-read tool |
| Cline | `.cline/rules/csp.md` (`alwaysApply: true`) | rules auto-injected; custom-instructions can call tools | `read_file` tool |
| Roo Code | `.roo/rules/csp.md` | rules auto-injected per mode | `read_file` tool |
| JetBrains (Junie) | `.junie/guidelines.md` | project guidelines auto-loaded | Junie's file-read |
| Neovim (avante) | `.avante/rules/csp.md` | avante auto-loads `.avante/rules/*.md` | `read_file` via avante |
| Trae / Qoder | `.trae`/`.qoder/rules/csp.md` | rules auto-injected | model's file-read tool |
| Codex | `AGENTS.md` | auto-loaded | model's file-read tool |
| Gemini CLI | `GEMINI.md` | auto-loaded | model's file-read tool |
| VS Code (Copilot) | `.github/copilot-instructions.md` | auto-loaded (weakest — Copilot has no Skill tool) | n/a (methodology only) |

## Fallback When the Model Won't Load a Skill

If the model fails to `read_file` a matched SKILL.md (low instruction-following),
the bootstrap's enumerated skill list (`generate_skill_list` output) still surfaces
the skill name + one-line description in-context, so the model has *some* signal.
This is the floor; the ceiling is deterministic `Skill`-tool loading (Claude Code).

## Keeping This In Sync

When adding a new platform adapter:
1. Add `platform_name` / `platform_dir` / `platform_detect` / `resolve_alias` to `lib/platforms.sh`.
2. Add `bootstrap_<name>` to `lib/bootstrap.sh` — embed the Contract above verbatim
   (the 5 numbered rules), point skills at `<platform_dir>`.
3. Add the case branch to `write_bootstrap_for_platform` (lib/bootstrap.sh) — single place.
4. Add the slug to `ALL_PLATFORMS` + `generate_bootstrap_for` (install.sh).
5. The `test/csp-invariants.test.mjs` "platform coverage" test enforces all four.
