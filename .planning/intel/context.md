# Context

## Project Positioning

CSP consolidates AI programming capabilities from 5 open-source projects:

| Source | Role in CSP |
|--------|-------------|
| ECC | Skill content body (patterns, reviewers, build-resolvers) |
| GSD | Workflow skeleton (plan → execute → verify → ship) |
| OMC | Unique runtime capabilities (autopilot, wiki, remember) |
| Superpowers | Meta-skills methodology (TDD, debugging, brainstorming) |
| spec-kit | Spec-driven development methodology (absorbed into meta + workflow) |

## Core Principles

1. Merge overlaps, preserve uniqueness
2. Progressive disclosure — users don't need to know all skills upfront
3. Token optimization — index常驻, lazy load, on-demand deep load
4. Automated routing — describe tasks naturally, system selects skills
5. Unified naming — `csp-` prefix only, hyphens as separators

## Integration Status

- **Compound Engineering**: P0-P2 items partially integrated (learning system, multi-persona review done)
- **BMAD-METHOD**: 71% complete (Phases 1-5 done, 6-7 pending)
- **Overlap Analysis**: 11 groups identified, merge operations planned in 4 phases
- **Skill Index**: Updated with Sections 17-20 (AI Engineering, DevOps, Refactoring, Mobile)

## Platform Support

18 platforms supported via `install.sh`:
Claude Code, Cursor, Copilot CLI, Hermes Agent, Windsurf, Kiro, Gemini CLI, Codex, Aider, Trae, VSCode, DeerFlow, OpenCode, OpenClaw, Qwen Code, Antigravity, Claw Code, Qoder

## Key Files

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Main entry point, routing instructions |
| `ARCHITECTURE.md` | Architecture design (v0.3, 13 core principles) |
| `SKILL-INDEX.md` | Complete skill/agent index |
| `USER-GUIDE.md` | End-user documentation |
| `CHANGELOG.md` | Version history with Unreleased v0.3 section |
| `MIGRATION.md` | Source-to-CSP mapping |
| `csp-router/registry.json` | Skill registry (~90 skills) |
| `csp-router/triggers.yaml` | Trigger word rules |
