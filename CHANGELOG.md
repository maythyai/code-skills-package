# Changelog

All notable changes to CSP will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- **AI 工程** (5 skills + 3 agents): `csp-rag-architecture`, `csp-llm-app-development`, `csp-vllm-serving`, `csp-data-pipeline-patterns`, `csp-prompt-engineering`; agents: `csp-rag-architect`, `csp-llm-app-reviewer`, `csp-data-pipeline-reviewer`
- **DevOps/基础设施** (4 skills): `csp-cicd-pipelines`, `csp-infrastructure-as-code`, `csp-kubernetes-patterns`, `csp-cloud-platform-patterns`
- **重构/遗留系统** (2 skills + 1 workflow): `csp-refactoring-strategies`, `csp-tech-debt-assessment`, `csp-legacy-modernization`
- **移动端** (3 skills + 3 agents): `csp-react-native-patterns`, `csp-mobile-performance`, `csp-cross-platform-strategy`; agents: `csp-react-native-build-resolver`, `csp-react-native-reviewer`, `csp-mobile-performance-auditor`
- SKILL-INDEX.md sections 17-20 covering all new categories

### Changed
- Split 8 large skills (500+ lines) into lean SKILL.md + references/ directories, reducing initial token load by 91% (5,453 → 511 lines): `kotlin-testing`, `django-patterns`, `cpp-coding-standards`, `kotlin-patterns`, `frontend-patterns`, `autonomous-loops`, `backend-patterns`, `django-security`
- Architecture version bumped to v0.3
- L3 csp-patterns now covers ~90 skills + ~86 agents across 15+ language stacks

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
