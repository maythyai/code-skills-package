# Changelog

All notable changes to CSP will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.4.0] — 2026-06-14

### 质量巩固与工程化

基于 v0.3 思辨分析，不开发 plugin 系统，聚焦项目质量巩固。

#### Phase 1: Skill 重叠合并 ✅
- 11 组 skill 重叠中 7 组已在初始迁移完成
- 5 个 registry 条目标记 deprecated（path: null）
- 删除废弃文件（csp-code-simplifier agent）
- B 级边界调整：api-design 合并、frontend React 分离、interview 交叉引用
- 更新 registry/triggers/SKILL-INDEX/CLAUDE.md 同步

#### Phase 2: 核心技能迁移 ✅
- **Registry 一致性审计**: 30 个未注册 skill 添加到 registry，3 个 MISSING 路径标记 deprecated，创建 `shared/scripts/audit-registry.js`
- **Frontmatter 标准化**: 145 个 SKILL.md 统一格式（csp-layer → layer, level → layer, csp-source → origin），修复 11 个损坏的 frontmatter
- **OMC 依赖清理**: 移除 `resolve-paths.mjs` 对 OMC `state-root.mjs` 外部依赖，移除 `--openclaw` CLI 标志
- **结果**: 497 skills (489 active, 8 deprecated), 0 missing paths, 99.3% frontmatter compliance

#### Phase 3: 安装器优化 ✅
- **--stacks <list>**: 按技术栈过滤安装（python, typescript, rust, go, java, kotlin, swift, cpp, react, django, spring, fastapi, postgres, docker, kubernetes, ai, mobile, devops, security, testing, frontend）
- **--layers <list>**: 按层级选择性安装（router, meta, workflow, patterns, runtime）
- **--minimal**: 仅安装 router + meta 层（<20% 总量）
- **--dry-run**: 预览安装内容而不实际执行
- **向后兼容**: 无参数调用行为与 v0.3 一致
- 版本号升级到 0.4.0

#### Phase 4: 自定义技能创作工具 ✅
- **csp-skill-creator**: 交互式 skill 创建向导（注册为 runtime skill）
- **shared/templates/SKILL-TEMPLATE.md**: 标准化 SKILL.md 模板
- **docs/CONTRIBUTING.md**: 完整贡献指南（fork → 创建 → 测试 → PR）
- **docs/SKILL-AUTHORING.md**: Skill 编写最佳实践

#### Phase 5: 质量审计与文档更新 ✅
- registry.json 与文件系统零差异（0 missing paths）
- ARCHITECTURE.md 更新为 v0.4.0
- SKILL-INDEX.md 更新版本和状态
- CLAUDE.md 更新安装命令和版本号
- CHANGELOG.md 记录所有变更项

### 统计指标

| 指标 | v0.3 | v0.4.0 |
|------|------|--------|
| Total Skills | 466 | 498 (490 active, 8 deprecated) |
| Registry Missing Paths | 3 | 0 |
| Frontmatter Compliance | ~70% | 99.3% |
| OMC 内部依赖 | 2 个文件 | 0 |
| 安装选项 | 基础 | 20+ (stacks/layers/dry-run/minimal) |
| Skill 创作工具 | 无 | skill-creator + 模板 + 指南 |

---

## [0.3.0] - 2026-06-14

### Added
- **AI 工程** (5 skills + 3 agents): `csp-rag-architecture`, `csp-llm-app-development`, `csp-vllm-serving`, `csp-data-pipeline-patterns`, `csp-prompt-engineering`; agents: `csp-rag-architect`, `csp-llm-app-reviewer`, `csp-data-pipeline-reviewer`
- **DevOps/基础设施** (4 skills): `csp-cicd-pipelines`, `csp-infrastructure-as-code`, `csp-kubernetes-patterns`, `csp-cloud-platform-patterns`
- **重构/遗留系统** (2 skills + 1 workflow): `csp-refactoring-strategies`, `csp-tech-debt-assessment`, `csp-legacy-modernization`
- **移动端** (3 skills + 3 agents): `csp-react-native-patterns`, `csp-mobile-performance`, `csp-cross-platform-strategy`; agents: `csp-react-native-build-resolver`, `csp-react-native-reviewer`, `csp-mobile-performance-auditor`
- SKILL-INDEX.md sections 17-20 covering all new categories
- `csp-skill-optimizer` — skill 自优化元技能，基于用户反馈自动收集信号、分析缺口、优化 skill 并支持 PR 回上游
- Full skill audit across all 5 layers (router, meta, workflow, patterns, runtime)
- Resolved 4 cross-module duplicate agents (planner, code-reviewer, code-simplifier, security-reviewer)
- Filled 89 empty skill descriptions in `registry.json`
- Filled 27 empty command descriptions in `csp-runtime/commands/`
- Project infrastructure: `.gitignore`, `LICENSE`, `CONTRIBUTING.md`, `CHANGELOG.md`, `.editorconfig`, `install.sh`
- GitHub issue and PR templates
- BMAD-METHOD integration (Phases 1-5 complete, 71%)
- Compound Engineering plugin integration (learning system, multi-persona review, doc review personas)

### Changed
- Split 8 large skills (500+ lines) into lean SKILL.md + references/ directories, reducing initial token load by 91% (5,453 → 511 lines): `kotlin-testing`, `django-patterns`, `cpp-coding-standards`, `kotlin-patterns`, `frontend-patterns`, `autonomous-loops`, `backend-patterns`, `django-security`
- Architecture version bumped to v0.3
- L3 csp-patterns now covers ~90 skills + ~86 agents across 15+ language stacks
- Architecture reduced from six layers to five (router, meta, workflow, patterns, runtime)
- Artifact templates relocated to `csp-workflow/templates/change-artifacts/`
- Three-dimension verification (completeness/correctness/coherence) integrated into `csp-verify-phase` via `artifact-verification.md`

### Removed
- Spec layer commands: `/csp-propose`, `/csp-apply`, `/csp-sync`, `/csp-archive`, etc.
- External spec CLI dependency references

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
