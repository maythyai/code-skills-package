# Phase 1: Install CLAUDE.md

## Determine Configuration Target

If `--local` flag was passed, set `CONFIG_TARGET=local`.
If `--global` flag was passed, set `CONFIG_TARGET=global`.

Otherwise (initial setup wizard), use AskUserQuestion to prompt:

**Question:** "Where should I configure code-skills-package?"

**Options:**
1. **Local (this project)** - Creates `.claude/CLAUDE.md` in current project directory. Best for project-specific configurations.
2. **Global (all projects)** - Creates `~/.claude/CLAUDE.md` for all Claude Code sessions. Best for consistent behavior everywhere.

Set `CONFIG_TARGET` to `local` or `global` based on user's choice.

If `CONFIG_TARGET=global` and `~/.claude/CLAUDE.md` already exists without CSP markers, ask a second explicit question before running setup:

**Question:** "Global setup will change your base Claude config. Which behavior do you want?"

**Options (default first):**
1. **Overwrite base CLAUDE.md (Recommended)** - plain `claude` and `csp` both use CSP globally.
2. **Keep base CLAUDE.md; use CSP only through `csp`** - preserve the user's base file, install CSP into `CLAUDE-csp.md`, and let `csp` force-load that companion config at launch.

Set `GLOBAL_INSTALL_STYLE=overwrite` or `preserve` based on the user's choice. If you did not ask this question, default `GLOBAL_INSTALL_STYLE=overwrite`.

## Download and Install CLAUDE.md

**MANDATORY**: Always run this command. Do NOT skip. Do NOT use the Write tool. Let the setup script choose the safest canonical source (bundled `docs/CLAUDE.md` first, GitHub fallback only if needed).

```bash
bash "${CSP_SETUP_PLUGIN_ROOT:-${CLAUDE_PLUGIN_ROOT}}/scripts/setup-claude-md.sh" <CONFIG_TARGET> [GLOBAL_INSTALL_STYLE]
```

Replace `<CONFIG_TARGET>` with `local` or `global`. For local installs, omit the optional style argument. For global installs, pass `overwrite` or `preserve` when you know the user's choice; otherwise let the script default to `overwrite`.

The script must install the canonical `docs/CLAUDE.md` content and preserve the required
`<!-- CSP:START -->` / `<!-- CSP:END -->` markers. Do **not** hand-write, summarize, or
partially reconstruct CLAUDE.md.

After running the script, verify the target file contains both markers. If marker validation
fails, stop and report the failure instead of writing CLAUDE.md manually.

For `local` installs inside a git repository, the script also seeds `.git/info/exclude` with an CSP block that re-includes `.csp/`, ignores local `.csp/*` artifacts by default, and preserves `.csp/skills/` for project skills you intend to commit.

**FALLBACK** if curl fails:
Tell user to manually download from:
https://raw.githubusercontent.com/Yeachan-Heo/code-skills-package/main/docs/CLAUDE.md

**Note**: The downloaded CLAUDE.md includes Context Persistence instructions with `<remember>` tags for surviving conversation compaction.

**Note**: Preserve mode installs CSP into a companion `CLAUDE-csp.md` with a small managed import block, and `csp` launch force-loads that companion config without changing plain `claude`.

## Report Success

If `CONFIG_TARGET` is `local`:
```
CSP Project Configuration Complete
- CLAUDE.md: Updated with latest configuration from GitHub at ./.claude/CLAUDE.md
- Git excludes: Added local `.csp/*` ignore rules to `.git/info/exclude` (keeps `.csp/skills/` trackable for committed project skills)
- Backup: Previous CLAUDE.md backed up (if existed)
- Scope: PROJECT - applies only to this project
- Hooks: Provided by plugin (no manual installation needed)
- Agents: 28+ available (base + tiered variants)
- Model routing: Haiku/Sonnet/Opus based on task complexity

Note: This configuration is project-specific and won't affect other projects or global settings.
```

If `CONFIG_TARGET` is `global`:
```
CSP Global Configuration Complete
- CLAUDE.md: Updated at ~/.claude/CLAUDE.md, or preserved with explicit preserve mode
- Companion: May install ~/.claude/CLAUDE-csp.md when preserve mode is chosen
- Backup: Previous CLAUDE.md backed up (if existed)
- Scope: GLOBAL - applies to all Claude Code sessions
- Hooks: Provided by plugin (no manual installation needed)
- Agents: 28+ available (base + tiered variants)
- Model routing: Haiku/Sonnet/Opus based on task complexity

Note: Hooks are now managed by the plugin system automatically. No manual hook installation required.
```

## Save Progress

```bash
bash "${CSP_SETUP_PLUGIN_ROOT:-${CLAUDE_PLUGIN_ROOT}}/scripts/setup-progress.sh" save 2 <CONFIG_TARGET>
```

## Early Exit for Flag Mode

If `--local` or `--global` flag was used, clear state and **STOP HERE**:
```bash
bash "${CSP_SETUP_PLUGIN_ROOT:-${CLAUDE_PLUGIN_ROOT}}/scripts/setup-progress.sh" clear
```
Do not continue to Phase 2 or other phases.
