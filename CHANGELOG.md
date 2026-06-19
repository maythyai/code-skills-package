# Changelog

All notable changes to CSP will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.6.0] — 2026-06-18

### 持续学习引擎

新增 `csp-learning-loop` 技能，实现会话边界的自动知识提取与 5 维度智能积累。

#### Added

- `csp-learning-loop` — 自动会话边界学习编排器，提取并存储 5 个维度的知识：
  - 项目核心信息（架构决策、技术栈、命名规范）
  - 用户需求指令（任务模式、偏好工作流、常用命令）
  - 开发者画像（编码风格、专长水平、工作习惯）
  - 长期记忆（经验教训、历史决策、持久事实）
  - 技能反馈（正面/负面信号、覆盖缺口）
- `.csp/intel/` — 结构化智能存储目录，含 5 个维度文件 + 元数据 + 审计日志
- 3 个 hook 脚本（Stop/PreCompact/SessionEnd）自动触发学习循环
- 委托 csp-remember、csp-learner、skill-optimizer、csp-compound、csp-profile-user 执行提取

## [0.5.0] — 2026-06-15

### awesome-copilot Skills 深度融入

从 [awesome-copilot](https://github.com/github/awesome-copilot) 356 个 skills 中精选 TIER 1/2/3 共 ~40 个融入 CSP，采用"核心 SKILL.md + reference 按需加载"架构。

#### Added

**新建 Skills（8 个）**
- `csp-refactorer` — 外科式重构（规划→复杂度降低→执行→验证）
- `csp-sql-reviewer` + `csp-postgres-optimizer` — SQL/PostgreSQL 审查与性能调优
- `csp-ruff-fixer` — Python Ruff 迭代式 lint 修复
- `csp-codeql-analyst` — CodeQL 静态分析 + 密钥扫描
- `csp-react-version-patterns` — React 18/19 版本特性 + 迁移指南
- `csp-git-conventions` — Git 工作流约定（提交消息、分支命名、PR 卫生）
- `csp-spec-adr` — 轻量级 spec/ADR/impl-plan/PRD 编写器
- `csp-code-tour-guide` — VS Code CodeTour + 苏格拉底式辅导（20 个 persona）
- `csp-api-codegen` — OpenAPI/TypeSpec → 应用代码生成
- `webapp-testing` — 端到端 Web 应用测试（Cypress/Playwright/Puppeteer）

**新建 Agents（2 个）**
- `csp-springboot-reviewer` — Java/Kotlin Spring Boot 审查
- `csp-incident-response` — 安全事件响应（数据泄露影响评估）

**增强的现有 Skills/Agents（11 个，新增 46 个 reference 文件）**
- `csp-security-reviewer` + STRIDE-A 威胁建模 + 数据泄露影响评估
- `csp-csharp-reviewer` 转为目录结构 + 4 个 reference（async/testing/EF Core/best practices）
- `csp-mcp-builder` + 9 语言 MCP server 模板 + .NET/PHP/Copilot Studio + 部署指南
- `csp-project-standards-reviewer` 转为目录结构 + 标准提取 + 代码典范识别
- `csp-incident-commander` + 数据泄露响应章节
- `csp-e2e-runner` + Playwright 代码片段
- `react-patterns` + 高级 UI patterns（premium/container-presentation/audit grep）
- `python-testing` + pytest 覆盖率深度指南
- `react-testing` + Jest 高级模式
- `csp-cicd-pipelines` + GitHub Actions 规范 + CI/CD 最佳实践

**总计**: 11 个新 skill/agent + 11 个增强 + 46 个新 reference 文件（~8,000+ 行新增内容）

#### Design Decisions

- **按需加载架构**: 每个 SKILL.md 控制在 80-120 行，细节知识拆入 `reference/` 子目录按需加载，token 开销最小化
- **去重策略**: 与现有 `csp-refactoring-strategies`、`csp-database-reviewer`、`react-patterns` 等无重叠，形成策略层 vs 实操层的互补
- **跳过类别**: Power Platform / Azure / AWS / GTM / 3D 游戏 / Linux triage 等 niche skills 不纳入（见 TIER 4 报告）

#### Documentation

- `SKILL-INDEX.md` 新增 Section 21（awesome-copilot 融入）
- `CLAUDE.md` 版本号升级到 v0.5.0，L3 patterns 计数更新
- `README.md` / `README_zh.md` Acknowledgments 新增 awesome-copilot 来源

### 统计指标

| 指标 | v0.4.0 | v0.5.0 |
|------|--------|--------|
| Total Skills | 498 | ~510+ |
| L3 Patterns Skills | ~90 | ~100+ |
| L3 Patterns Agents | ~95 | ~100+ |
| Reference 文件 | ~50 | ~96+ |
| awesome-copilot 融入 | 0 | ~40 |

---

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
