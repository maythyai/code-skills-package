# Changelog

All notable changes to CSP will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Changed
- Architecture reduced from six layers to five (router, meta, workflow, patterns, runtime)
- Artifact templates relocated to `csp-workflow/templates/change-artifacts/`
- Three-dimension verification (completeness/correctness/coherence) integrated into `csp-verify-phase` via `artifact-verification.md`

### Removed
- Spec layer commands: `/csp-propose`, `/csp-apply`, `/csp-sync`, `/csp-archive`, etc.
- External spec CLI dependency references
### Added (historical draft)
- `csp-skill-optimizer` — skill 自优化元技能，基于用户反馈自动收集信号、分析缺口、优化 skill 并支持 PR 回上游
- Full skill audit across all 5 layers (router, meta, workflow, patterns, runtime)
- Resolved 4 cross-module duplicate agents (planner, code-reviewer, code-simplifier, security-reviewer)
- Filled 89 empty skill descriptions in `registry.json`
- Filled 27 empty command descriptions in `csp-runtime/commands/`
- Project infrastructure: `.gitignore`, `LICENSE`, `CONTRIBUTING.md`, `CHANGELOG.md`, `.editorconfig`, `install.sh`
- GitHub issue and PR templates

## [0.2.0] - 2026-06-11

### Added
- Five-layer architecture (L0-L4) with token-optimized sharded loading
- `csp-router/` with 509-skill registry and multi-signal trigger matching
- `csp-meta/` with 14 meta-skills (TDD, debugging, planning, brainstorming)
- `csp-workflow/` with 94 GSD workflows covering full project lifecycle
- Spec-driven development (later absorbed into csp-meta + csp-workflow)
- `csp-patterns/` with ~200 skills (reviewers, build-resolvers, patterns for 15+ languages)
- `csp-runtime/` with 19 agents and 28 commands (autopilot, wiki, remember, self-improve)
- `SKILL-INDEX.md` with full skill catalog (607 lines)
- `ARCHITECTURE.md` with detailed design documentation
- `MIGRATION.md` with source-to-CSP mapping table
- `USER-GUIDE.md` with end-user documentation
- `CLAUDE.md` as main project entry point

### Changed
- Unified skill naming convention (`csp-` prefix)
- Standardized YAML frontmatter format across all skills
- Consolidated cross-project overlapping features (code review, debugging, testing, planning)
