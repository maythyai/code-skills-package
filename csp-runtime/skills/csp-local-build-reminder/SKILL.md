---
name: csp-local-build-reminder
description: Remind the user to rebuild CSP after editing TypeScript when running from a local fork. Triggered automatically by the AI whenever it notices it (or the user) just changed a src/**/*.ts file in an CSP dev install.
layer: 1
category: meta
---

| Path                         | Needs rebuild?       | Auto-handled |
|------------------------------|----------------------|--------------|
| `src/**/*.ts`                  | Only after build       | **Yes**      |
| `templates/hooks/**/*.mjs`     | Yes                    | No           |
| `scripts/**/*.mjs` / `*.cjs`   | Yes                    | No           |
| `skills/**/SKILL.md`           | Yes                    | No           |
| `agents/**/*.md`               | Yes                    | No           |
| `commands/**/*.md`             | Yes                    | No           |
| `.claude-plugin/plugin.json`   | Yes (on Claude restart)| No           |
| `docs/**/*.md`                 | Cosmetic only          | No           |

## One-command setup for hands-free dev

If the user is iterating heavily and tired of remembering the build, suggest:

```powershell
npm run dev:full
```

This runs `tsc --watch` plus all bridge builders in parallel — every save
triggers a rebuild within a second, so `restart Claude Code` is all that's
needed afterwards.

## Detection signal — how the AI knows it's "local mode"

The HUD's `[CSP#X.Y.ZL]` suffix is the visible cue. Programmatically, the
detection lives in `src/lib/version.ts::isRuntimePackageLocal()` and triggers
on any of: `.git/` at package root, `src/` at package root, package reached
via symlink/junction, or any ancestor is a symlink/junction.

When running inside the CSP fork repo itself, the AI is by definition in
local mode — the reminder always applies.
