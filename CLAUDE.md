# CSP — Code Skills Package v0.10.0

Unified AI coding skills from multiple open-source projects with auto-routing, lazy loading, and spec-driven workflows. MIT licensed.

## Architecture

```
L0  csp-router    — task classification + skill selection (always loaded, ~800 tokens)
L1  csp-meta      — methodology: brainstorming, TDD, debugging, spec-driven (26 skills)
L2  csp-workflow  — project lifecycle: plan → execute → verify → ship (193 skills)
L3  csp-patterns  — language/framework patterns, reviewers, build-resolvers (381 skills)
L4  csp-runtime   — autopilot, ralph, wiki, remember, self-improve (58 skills)
Total: 661 skills across 5 layers (2 deprecated, carry redirect targets)
```

## Skill 内容规范（强制，所有新增/移植技能必须遵守）

- **无作者信息**：禁止 `author:` 字段、个人姓名、署名/来源脚注；技能只保留内容本身。
- **无 LICENSE 文件**：技能目录内不得包含 LICENSE/NOTICE/COPYING；包级许可仅根目录 `LICENSE`（MIT）。
- **无谱系字段**：frontmatter 禁止 `origin:`（含 `metadata:` 内嵌）；`source:` 仅允许指向公开项目（如 GitHub 开源仓库）。
- **无内部 URL**：禁止 `*.alibaba-inc.com`、`*.antfin.com` 等内部域名；功能性 URL 用占位符（如 `{CR_API_BASE}`）+ 环境变量参数化。公开链接（github.com、官方文档等）保留。
- **无个人环境硬编码**：本机路径/端口等用环境变量或相对路径参数化。
- **无构建产物**：`__pycache__/`、`*.pyc`、`*.bak`、`.DS_Store` 不入库。
- **移植外部技能**：先确认许可证兼容（MIT 包禁止引入 NC/SA 等限制性条款内容）；内容改写通用化，不带来源归属。

## Engineering

Build / validate / test pipeline (all zero-runtime-dependency Node ≥ 18 ESM):

```bash
npm run build:all      # registry → metadata → triggers → graph → page (one-shot rebuild)
npm run validate:all   # skill-v2 + triggers + registry schema validation
npm test               # validate:all + build:graph + node --test test/ (20 invariants)
```

- **Single source of truth**: `SKILL.md` frontmatter (v2: `phase`/`domain`/`scope`/`tools`/`deprecated`/`redirect`) → derived `registry.json` / `triggers.yaml` / `skill-metadata.yaml` / `skpg/graph.json` / `index.json` / `docs/csp-page`. Never hand-edit derived data.
- **Shared YAML parser**: `shared/scripts/lib/yaml.mjs` (handles `>-`/`|-` multiline, inline + block arrays, nested objects, type coercion).
- **`csp-sdk` CLI**: `query <sub>` · `doctor` · `version` · `init-skill <name> --layer <1-4>` (scaffolds a validate-passing SKILL.md). Unknown subcommands exit non-zero (no silent stub-pass).
- **`install.sh`**: split into `install.sh` (930 lines) + `lib/platforms.sh` + `lib/bootstrap.sh`. CSP_BRANCH whitelisted (`^[A-Za-z0-9._-]+$`); remote bootstrap supports `CSP_SHA256` integrity pinning.
- **Tests**: `test/csp-invariants.test.mjs` (registry shape, graph consistency, triggers integrity, version sync across 5 files, csp-sdk contract, npm-pack hygiene).

## Docs

- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) — full architecture design
- [SKILL-INDEX.md](./docs/SKILL-INDEX.md) — complete skill index
- [USER-GUIDE.md](./docs/USER-GUIDE.md) — user guide
- [INSTALL.md](./docs/INSTALL.md) — installation guide
- [UPDATE.md](./docs/UPDATE.md) — update guide
- [VERSIONING.md](./docs/VERSIONING.md) — version management (X=arch, Y=feature, Z=fix)
- [CONTRIBUTING.md](./CONTRIBUTING.md) — how to contribute a skill or fix
- [scripts/README.md](./scripts/README.md) — build/validate/maintenance tooling reference
- [docs/analysis/](./docs/analysis/project-review-2026-08.md) — audit reports + upgrade plans (project-review-2026-08, REVIEW-PROGRAMMING-SKILLS, cross-layer-testing-case-study)

## CSP 知识中枢 & Agent 团队

本项目用 `.csp/` 作为**编程管理统一文档库**（PMS/CMS/TMS + 流水线产物），`.claude/agents/` 为多智能体团队。约定详见 `.claude/agents/README.md`。

### 知识中枢（进入 workspace 先读）
- `.csp/AGENTS.md`：路由契约。
- `.csp/manifest.json`：唯一产物索引（`source_id`+`content_hash`+`build_status`）。
- `.csp/lifecycle-state.json`：流水线阶段状态（现在第几步、下一步谁）。
- **若 `.csp/AGENTS.md` 不存在** → 先运行 `knowledge-hub` agent 初始化：建 `AGENTS.md`/`manifest.json`/`lifecycle-state.json` + 棕地 CMS 蒸馏（`.csp/code-spec/`）+ 既有文档整改（Phase 1.5）。这是整条链路（00→07）的第一步，未初始化不进 01。

### Agent 团队（`.claude/agents/`）
- 外环 `roadmap-planner`（战略锚点+版本号规则+1/3年路径，跑一次）
- 内环：`knowledge-hub`(00) → `prd-writer`(01) → `decomposer`(02) → `tech-designer`(03) → `task-breaker`(04) → `dev-lead`(05) → `release-manager`(06) → `reviewer`(07)
- 主调度：`lifecycle-orchestrator`（读 lifecycle-state 自动派 agent；gate 即授权，仅破坏性/无解才问人）
- 05 角色：`backend-engineer`/`frontend-engineer`/`db-engineer`/`qa-engineer`（由 dev-lead spawn + worktree 并行）

### 文档边界
- **三层定位**（权威见 `docs/README.md`）：`README.md`（根，门面+路标，不堆细节）→ `docs/`（对外人类文档：安装/使用/架构/技能编写/分析/PRD 原文/战略）→ `.csp/`（对内 agent 产物库，人不直接读）。
- `.csp/` = 编程管理产物（PMS/CMS/TMS + specs/tasks/tech-design/traceability/artifacts/ship/ops/milestones + planning/spark/writer-memory/intel），git 跟踪。
- `docs/` = 对外人类文档（给人读，非流水线驱动）；门面 `README.md` 与发布元数据 `CHANGELOG.md`/`LICENSE` 在根目录，不属 `docs/`。
- 测试运行证据（截图/DOM/联动契约/进度文件）统一落 `.csp/artifacts/verify/evidence/` 与 `.csp/artifacts/verify/`，禁止散落根目录裸 `evidence/` 或 `.csp-*-test/`。L2 csp-workflow 生命周期产物落 `.csp/planning/`（原 `.planning/`），Spark 设计链产物落 `.csp/spark/`（原 `spark-output/`），写作记忆落 `.csp/writer-memory/`（原 `.csp-writer-memory/`）——所有 skill 产物一律进 `.csp/` 或 `docs/`，不散落根目录。
- 版本号默认 SemVer（X.Y.Z），不自动用日期形式 tag；攒批发布——一个版本可含多个功能/修复，不逐功能 bump（按整批最高级别一次 bump）。

### 用法
- 端到端：说"跑流程/从 00 开始/推进" → `lifecycle-orchestrator` 自动推进到 06 发布。
- 单阶段：说"写 PRD/拆 task/发版/复盘" → 对应 agent。
- 产物遵循 `.csp/` 格式（front-matter 互链 + manifest 回写 + lifecycle-state 推进）。

<!-- csp-begin (do not edit between these markers) -->
# CSP (Code Skills Package)

本项目已安装 CSP 技能包（309 个 skills，五层架构）。

## 使用方式

在 CLAUDE.md 中添加路由指令即可自动使用：

```
使用 CSP (Code Skills Package) 技能包。当用户给出任务时,先通过 csp-router 路由到合适的 skill 组合。
```

## 核心规则

1. **收到任务时，先通过 csp-router 路由** — 识别任务类型并加载对应 skill 组合
2. **设计先于编码** — 功能需求先做 brainstorming 和 plan
3. **测试先于实现** — 写代码前先写测试（TDD）
4. **验证先于完成** — 声称完成前必须运行验证命令

## 可用 Skills

Skills 位于 `.claude/skills/` 目录，按五层架构组织。

- **csp-router**: >
- **csp-context-engineering**: Optimizes agent context setup. Use when starting a new session, when agent outpu
- **csp-verification**: >
- **csp-test-methodology**: >
- **csp-mvp-scoping**: >
- **csp-spec-contract**: Transform ideas, requirements, or discussions into CSP SPEC contracts with trace
- **csp-receiving-code-review**: Use when receiving code review feedback, before implementing suggestions, especi
- **csp-source-driven-development**: Grounds every implementation decision in official documentation. Use when you wa
- **csp-doubt-driven-development**: Subjects every non-trivial decision to a fresh-context adversarial review before
- **csp-using-skills**: Use when starting any conversation - establishes how to find and use skills, req
- **csp-skill-optimizer**: Use when collecting user feedback on skill behavior, identifying skill coverage 
- **csp-interview-me**: Extracts what the user actually wants instead of what they think they should wan
- **csp-code-graph**: Code knowledge graph methodology and lifecycle orchestration. Use when starting 
- **csp-executing-plans**: Use when you have a written implementation plan to execute in a separate session
- **csp-using-git-worktrees**: Use when starting feature work that needs isolation from current workspace or be
- **csp-requesting-code-review**: Use when completing tasks, implementing major features, or before merging to ver
- **csp-systematic-debugging**: Use when encountering any bug, test failure, or unexpected behavior, before prop
- **csp-writing-skills**: Use when creating new skills, editing existing skills, or verifying skills work 
- **csp-tdd**: >
- **csp-party-mode**: Multi-agent collaboration for complex problem-solving with specialized AI agents
- **csp-spec-driven-development**: CSP-native spec-driven methodology integrated with CSP phase workflows. Use when
- **csp-scope-guard**: >
- **csp-finishing-a-development-branch**: Use when implementation is complete, all tests pass, and you need to decide how 
- **csp-agent-teams**: >
- **csp-writing-plans**: Use when you have a spec or requirements for a multi-step task, before touching 
- **csp-doc-review**: Review requirements or plan documents using parallel persona agents that surface
- **csp-brainstorming**: >
- **csp-competitive-analysis**: >
- **csp-code-understanding**: 
- **csp-prd-change-impact**: 
- **csp-code-spec**: >
- **csp-code-wiki**: >
- **csp-knowledge-hub**: >
- **csp-requirement-decomposition**: 
- **csp-indie-deploy-ops**: >
- **csp-fullstack-spec-generator**: 
- **csp-hotfix**: 
- **csp-graph-architecture**: Codebase architecture analysis via knowledge graph. Use when onboarding to a cod
- **csp-user-story-decomposition**: >
- **csp-lifecycle-orchestrator**: 
- **csp-plan-phase**: 
- **csp-graph-build**: Build and maintain the code knowledge graph. Use when indexing a new repository,
- **csp-product-metrics-review**: >
- **csp-domain-driven-design**: 
- **csp-requirement-prioritization**: >
- **csp-test-spec**: >
- **csp-doc-lifecycle-manager**: Manage project documentation lifecycle: categorize, archive, index, and prune do
- **csp-prd-traceability**: 
- **csp-deprecation-and-migration**: Manages deprecation and migration. Use when removing old systems, APIs, or featu
- **csp-tech-debt-paydown**: >
- **csp-compound-learning**: Document a recently solved problem to compound your team's knowledge. Captures s
- **csp-simple-dev**: 
- **csp-compound-refresh**: Refresh stale learning and pattern docs under docs/solutions/ by reviewing them 
- **csp-session-knowledge-extractor**: Extract reusable knowledge from development sessions and route to appropriate do
- **csp-workflow-schema**: >
- **csp-parallel-worktree**: >
- **csp-project-doc-architect**: Design and maintain project documentation architecture: folder structure, naming
- **csp-roadmap-update**: >
- **csp-user-feedback-analysis**: >
- **csp-qa-cr-review**: 系统化 Code Review 评审工作流。覆盖影响范围、安全性、代码质量、测试覆盖、性能、可维护性六个维度，支持大 CR 并行模式、蒸馏增强调用链追溯、增量版
- **csp-tech-stack-advisor**: 
- **csp-multi-review**: Structured code review using tiered persona agents, confidence-gated findings, a
- **csp-design-hub**: 
- **csp-explore**: Exploration phase specialist for understanding codebases, investigating patterns
- **csp-implementation-phase**: Implementation phase specialist for executing planned work with proper patterns,
- **csp-tech-task-breakdown**: 
- **csp-codebase-audit**: Multi-dimensional codebase audit: parallel Explore agents investigate one dimens
- **csp-product-spec**: >
- **csp-graph-review**: Graph-powered code review with minimal context assembly and risk scoring. Use wh
- **csp-tweak**: 
- **csp-full**: 
- **csp-tech-design-review**: 
- **csp-defect-mining**: Systematic defect discovery via DIVERSE test methodologies — when a test suite h
- **csp-product-discovery-orchestrator**: 
- **csp-strategy**: Create or maintain STRATEGY.md - the product's target problem, approach, users, 
- **csp-graph-refactor**: Graph-powered safe refactoring. Use when renaming symbols, moving code between m
- **csp-product-pulse**: Generate a time-windowed pulse report on what users experienced and how the prod
- **csp-tech-solution-design**: 
- **csp-effort-estimation**: 
- **csp-tech-risk-assessment**: 
- **csp-integration-design**: 
- **csp-solo-oncall**: >
- **csp-prd-parser**: 
- **csp-prd-generation**: >
- **csp-legacy-modernization**: >
- **csp-verify-phase**: Verification phase specialist ensuring all acceptance criteria are met, tests pa
- **csp-graph-impact**: Graph-powered change impact analysis. Use when a diff or PR is ready and you nee
- **csp-shipping-and-launch**: Prepares production launches. Use when preparing to deploy to production. Use wh
- **csp-agentic-identity-trust**: Identity systems architect for autonomous AI agents — designs cryptographic iden
- **csp-api-tester**: Comprehensive API testing specialist — functional validation, performance testin
- **csp-data-engineer**: Data pipeline architect specializing in reliable ETL/ELT, lakehouse architecture
- **csp-multi-agent-architect**: Systems architect for multi-agent AI pipelines — topology selection, context man
- **csp-workflow-architect**: Workflow design specialist who maps complete workflow trees — happy paths, all b
- **csp-prompt-engineer**: Prompt design and LLM behavior specialist — crafts, tests, and systematically op
- **csp-project-standards-reviewer**: >
- **csp-csharp-reviewer**: >
- **csp-incident-commander**: Production and security incident management specialist — severity classification
- **csp-springboot-reviewer**: >
- **csp-web-performance-auditor**: Web performance engineer focused on Core Web Vitals, loading, rendering, and net
- **csp-model-qa**: Independent ML model QA auditor — end-to-end audits from documentation review, d
- **csp-test-engineer**: QA engineer specialized in test strategy, test writing, and coverage analysis. U
- **csp-mcp-builder**: Model Context Protocol specialist who designs, builds, and tests MCP servers tha
- **csp-minimal-change-engineer**: Surgical implementation specialist — fixes only what was asked, refuses scope cr
- **csp-document-generator**: Programmatic document creation specialist — generates professional PDF, PPTX, DO
- **csp-swift-actor-persistence**: Thread-safe data persistence in Swift using actors — in-memory cache with file-b
- **csp-fal-ai-media**: Unified media generation via fal.ai MCP — image, video, and audio. Covers text-t
- **csp-cloud-platform-patterns**: >
- **csp-django-patterns**: Django architecture patterns, REST API design with DRF, ORM best practices, cach
- **csp-web-artifacts**: 用于创建复杂、多组件的 HTML 网页，采用现代前端 Web 技术（React、Tailwind CSS、shadcn/ui）。适用于需要状态管理、路由或 sh
- **csp-crosspost**: Multi-platform content distribution across X, LinkedIn, Threads, and Bluesky. Ad
- **csp-flow-web**: >
- **csp-deep-research**: Multi-source deep research using firecrawl and exa MCPs. Searches the web, synth
- **csp-db-backup**: >
- **csp-golang-patterns**: >
- **csp-cross-layer-testing**: >
- **csp-cicd-pipelines**: >
- **csp-docs-lookup**: >
- **csp-django-security**: Django security best practices, authentication, authorization, CSRF protection, 
- **csp-code-review**: Comprehensive code review specialist for correctness, reuse, simplification, and
- **csp-chart**: >
- **csp-docker-patterns**: >
- **csp-ruff-fixer**: >
- **csp-tech-diagram**: >-
- **csp-python-testing**: >
- **csp-dmux-workflows**: Multi-agent orchestration using dmux (tmux pane manager for AI agents). Patterns
- **csp-kotlin-testing**: Kotlin testing patterns with Kotest, MockK, coroutine testing, property-based te
- **csp-user-analytics**: >
- **csp-code-tour-guide**: >
- **csp-codeql-analyst**: >
- **csp-java-coding-standards**: Java coding standards for Spring Boot and Quarkus services: naming, immutability
- **csp-agent-introspection-debugging**: Structured self-debugging workflow for AI agent failures using capture, diagnosi
- **csp-jpa-patterns**: JPA/Hibernate patterns for entity design, relationships, query optimization, tra
- **csp-frame**: >
- **csp-investor-outreach**: Draft cold emails, warm intro blurbs, follow-ups, update emails, and investor co
- **csp-agent-sort**: Build an evidence-backed CSP install plan for a specific repo by sorting skills,
- **csp-webhook-architecture**: >
- **csp-scope**: >
- **csp-cpp-coding-standards**: C++ coding standards based on the C++ Core Guidelines (isocpp.github.io). Use wh
- **csp-data-pipeline-patterns**: Production data pipeline patterns covering Airflow DAG design, dbt transformatio
- **csp-java-testing**: >
- **csp-access**: >
- **csp-mcp-server-patterns**: Build MCP servers with Node/TypeScript SDK — tools, resources, prompts, Zod vali
- **csp-pitch**: >
- **csp-i18n-frameworks**: >
- **csp-swift-protocol-di-testing**: Protocol-based dependency injection for testable Swift code — mock file system, 
- **csp-bun-runtime**: Bun as runtime, package manager, bundler, and test runner. When to choose Bun vs
- **csp-postgres-patterns**: >
- **csp-sql-reviewer**: >
- **csp-typescript-testing**: >
- **csp-react-version-patterns**: >
- **csp-deployment**: >
- **csp-postgres-optimizer**: >
- **csp-qa**: >
- **csp-react-reviewer**: Expert React code reviewer specializing in hooks rules, component patterns, perf
- **csp-market-research**: Conduct market research, competitive analysis, investor due diligence, and indus
- **csp-observability-and-instrumentation**: Instruments code so production behavior is visible and diagnosable. Use when add
- **csp-brand-voice**: Build a source-derived writing style profile from real posts, essays, launch not
- **csp-springboot-security**: Spring Security best practices for authn/authz, validation, CSRF, secrets, heade
- **csp-bench**: >
- **csp-qa-test-engineering**: 全生命周期 QA 测试工程技能。覆盖需求分析→测试计划→测试用例→自动化执行→生产问题调查完整流程。涉及测试规划、测试策略、用例生成、接口测试、回归测试、生产调
- **csp-subscription-management**: >
- **csp-springboot-patterns**: Spring Boot architecture patterns, REST API design, layered services, data acces
- **csp-changelog-management**: >
- **csp-mock-strategies**: >
- **csp-db-performance**: >
- **csp-frontend-performance**: >
- **csp-x-api**: X/Twitter API integration for posting tweets, threads, reading timelines, search
- **csp-prompt-engineering**: Production prompt engineering covering template management with Jinja2/Mustache,
- **csp-refactorer**: >
- **csp-article-writing**: Write articles, guides, blog posts, tutorials, newsletter issues, and other long
- **csp-python-coding-standards**: Python coding standards (Python 3.10+) covering naming & style (PEP 8), type ann
- **csp-responsive-design**: Implement modern responsive layouts using container queries, fluid typography, C
- **csp-journey**: >
- **csp-cpp-testing**: Use only when writing/updating/fixing C++ tests, configuring GoogleTest/CTest, d
- **csp-react-patterns**: React 18/19 patterns including hooks discipline, server/client component boundar
- **csp-h5-visual-testing**: >
- **csp-nestjs-patterns**: NestJS architecture patterns for modules, controllers, providers, DTO validation
- **csp-sitemap**: >
- **csp-search-first**: >
- **csp-rust-testing**: Rust testing patterns including unit tests, integration tests, async testing, pr
- **csp-board**: >
- **csp-cross-platform-strategy**: >
- **csp-platform-deploy**: >
- **csp-flow-mobile**: >
- **csp-paper-reader**: 解析、解读、探索、讲解、总结某领域最新论文或某篇具体论文。 触发词：解析论文、解读论文、论文总结、paper review、read paper、论文笔记、最新
- **csp-vps-deploy**: >
- **csp-everything-claude-code**: Development conventions and patterns for JavaScript projects with conventional c
- **csp-product-capability**: Translate PRD intent, roadmap asks, or product discussions into an implementatio
- **csp-frontend-patterns**: >
- **csp-kotlin-patterns**: Idiomatic Kotlin patterns, best practices, and conventions for building robust, 
- **csp-git-conventions**: >
- **csp-html-prototype**: 生成用于 UI 线框图和模型图的交互式 HTML 原型页面。当用户要求创建原型、线框图、模型图、页面设计或 UI 布局时使用。支持移动端、桌面端和平板设备，并可
- **csp-motion-plan**: >
- **csp-stories**: >
- **csp-refactoring-strategies**: >
- **csp-exa-search**: Neural search via Exa MCP for web, code, and company research. Use when the user
- **csp-db-state-assertion**: >
- **csp-playwright-ui-test**: >
- **csp-typescript-patterns**: >
- **csp-fastapi-patterns**: FastAPI patterns for async APIs, dependency injection, Pydantic request and resp
- **csp-strategic-compact**: Suggests manual context compaction at logical intervals to preserve context thro
- **csp-mobile-performance**: >
- **csp-backend-patterns**: >
- **csp-infrastructure-as-code**: >
- **csp-monitoring-alerting**: >
- **csp-mle-workflow**: Production machine-learning engineering workflow for data contracts, reproducibl
- **csp-eval-harness**: Formal evaluation framework for Claude Code sessions implementing eval-driven de
- **csp-monorepo-tooling**: >
- **csp-check**: >
- **csp-code-simplification**: >
- **csp-file-storage**: >
- **csp-nextjs-turbopack**: Next.js 16+ and Turbopack — incremental bundling, FS caching, dev speed, and whe
- **csp-frontend-slides**: Create stunning, animation-rich HTML presentations from scratch or by converting
- **csp-oauth-integration**: >
- **csp-probe**: >
- **csp-avatar**: >
- **csp-edge**: >
- **csp-react-native-patterns**: >
- **csp-webapp-testing**: >
- **csp-visual-regression**: >
- **csp-frontend-design**: Create distinctive, production-grade frontend interfaces with high design qualit
- **csp-autonomous-loops**: Patterns and architectures for autonomous Claude Code loops — from simple sequen
- **csp-api-governance**: >
- **csp-motion-apply**: >
- **csp-vllm-serving**: Production vLLM inference serving patterns covering Docker setup, continuous bat
- **csp-e2e-testing**: >
- **csp-kubernetes-patterns**: >
- **csp-llm-app-development**: Production LLM application development patterns covering prompt engineering, fun
- **csp-content-engine**: Create platform-native content systems for X, LinkedIn, TikTok, YouTube, newslet
- **csp-db-migration**: >
- **csp-browser-testing-with-devtools**: Tests in real browsers via Chrome DevTools MCP. Use when building or debugging a
- **csp-video-editing**: AI-assisted video editing workflows for cutting, structuring, and augmenting rea
- **csp-rust-patterns**: Idiomatic Rust patterns, ownership, error handling, traits, concurrency, and bes
- **csp-package-publishing**: >
- **csp-metric**: >
- **csp-rag-architecture**: Production RAG architecture patterns covering chunking strategies, embedding mod
- **csp-extract**: >
- **csp-agentic-engineering**: >
- **csp-python-reviewer**: Python coding specification and code review specialist. Covers PEP 8, type safet
- **csp-coding-standards**: >
- **csp-audit**: >
- **csp-seo-engineering**: >
- **csp-spec-adr**: >
- **csp-investor-materials**: Create and update pitch decks, one-pagers, investor memos, accelerator applicati
- **csp-tech-debt-assessment**: >
- **csp-signal**: >
- **csp-performance-optimizer**: Performance optimization specialist for identifying bottlenecks, improving effic
- **csp-react-testing**: React component testing with React Testing Library, Vitest/Jest, MSW for network
- **csp-prd**: >
- **csp-content-hash-cache-pattern**: Cache expensive file processing results using SHA-256 content hashes — path-inde
- **csp-api-codegen**: >
- **csp-payment-integration**: >
- **csp-data-analysis**: Implement analytics, data analysis, and visualization best practices using Pytho
- **csp-locale-management**: >
- **csp-python-patterns**: >
- **csp-retro**: >
- **csp-backend-performance**: >
- **csp-pytorch-patterns**: PyTorch deep learning patterns and best practices for building robust, efficient
- **csp-privacy-compliance**: >
- **csp-brief**: >
- **csp-poster**: >
- **csp-golang-testing**: >
- **csp-test**: >
- **csp-security-review**: >
- **csp-email-systems**: >
- **csp-cancel**: Cancel any active CSP mode (autopilot, ralph, ultrawork, ultraqa, swarm, ultrapi
- **csp-create-skill**: 标准技能创建向导 — 交互式引导用户创建高质量 CSP 新技能，自动完成脚手架、注册与校验。当用户想创建/新增/编写/迁移 skill（create skill
- **csp-setup**: Use first for install/update routing — sends setup, doctor, or MCP requests to t
- **csp-mcp-setup**: Configure popular MCP servers for enhanced agent capabilities
- **csp-ralph**: Self-referential loop until task completion with configurable verification revie
- **csp-reference**: CSP agent catalog, available tools, team pipeline routing, commit protocol, and 
- **csp-autopilot**: Full autonomous execution from idea to working code
- **csp-budget-enforcer**: >
- **csp-deep-interview**: Socratic deep interview with mathematical ambiguity gating before explicit execu
- **csp-deepinit**: Deep codebase initialization with hierarchical AGENTS.md documentation
- **csp-ultraqa**: QA cycling workflow - test, verify, fix, repeat until goal met
- **csp-team**: N coordinated agents on shared task list using Claude Code native teams
- **csp-external-context**: Invoke parallel document-specialist agents for external web searches and documen
- **csp-doctor**: Diagnose and fix code-skills-package installation issues
- **csp-trace**: Evidence-driven tracing lane that orchestrates competing tracer hypotheses in Cl
- **csp-ask**: Process-first advisor routing for Claude, Codex, or Gemini via `csp ask`, with a
- **csp-model-selector**: >
- **csp-linked-test-runner**: >
- **csp-project-session-manager**: Worktree-first dev environment manager for issues, PRs, and features with option
- **csp-release**: Generic release assistant — analyzes repo release rules, caches them in .csp/REL
- **csp-skill**: Manage local skills - list, add, remove, search, edit, setup wizard
- **csp-plan**: >
- **csp-autoresearch**: Stateful single-mission improvement loop with strict evaluator contract, markdow
- **csp-learner**: Extract a learned skill from the current conversation
- **csp-scientist**: Orchestrate parallel scientist agents for comprehensive analysis with AUTO mode
- **csp-ultrawork**: Parallel execution engine for high-throughput task completion
- **csp-learning-loop**: >
- **csp-wiki**: >
- **csp-writer-memory**: Agentic memory system for writers - track characters, relationships, scenes, and
- **csp-ccg**: Claude-Codex-Gemini tri-model orchestration via /ask codex + /ask gemini, then C
- **csp-hud**: Configure HUD display options (layout, presets, display elements)
- **csp-skillify**: Turn a repeatable workflow from the current session into a reusable CSP skill dr
- **csp-debug**: Diagnose the current CSP session or repo state using logs, traces, state, and fo
- **csp-file-organizer**: 通过理解上下文、查找重复文件、建议更合理的目录结构并自动化清理任务，智能整理你电脑中的文件与文件夹。降低整理负担，让数字工作空间长期保持整洁有序。
- **csp-deep-dive**: 2-stage pipeline: trace (causal investigation) -> deep-interview (requirements c
- **csp-complexity-classifier**: >
- **csp-skill-creator**: Interactive skill creation wizard — guides users through creating new CSP skills
- **csp-configure-notifications**: Configure notification integrations (Telegram, Discord, Slack) via natural langu
- **csp-visual-verdict**: Structured visual QA verdict for screenshot-to-reference comparisons
- **csp-self-improve**: Autonomous evolutionary code improvement engine with tournament selection
- **csp-ultragoal**: Durable multi-goal workflow that persists plan/ledger artifacts under .csp/ultra
- **csp-local-build-reminder**: Remind the user to rebuild CSP after editing TypeScript when running from a loca
- **csp-remember**: Review reusable project knowledge and decide what belongs in project memory, not
- **csp-cli-teams**: CLI-team runtime for claude, codex, or gemini workers in tmux panes when you nee

## 如何使用

使用 `Skill` 工具加载对应 skill 并严格遵循其流程。如果你认为哪怕只有 1% 的可能性某个 skill 适用，你必须调用该 skill 检查。
<!-- csp-end -->
