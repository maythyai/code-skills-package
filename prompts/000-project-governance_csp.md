使用 CSP 项目治理能力管理项目级规范：目录结构、产物路径、版本管理、文档边界。本文件是三件套（产品规划/开发/测试）的第四份——项目治理横切面。

> 项目治理 ≠ 开发流程。治理关注权威、路径、更新责任、新鲜度、引用和保留。跨项目的四层入口与产物规则由 `[[workflow:csp-knowledge-hub]]` 的 `references/project-entry-contract.md` 承载；本文只指引何时调用对应技能。先识别项目现有约定；下文单仓/monorepo 树是示例，不是强制迁移目标。

---

## Phase GB：棕地项目适配（既有项目治理初始化）

> **触发**：项目已存在（非全新初始化），`.csp/AGENTS.md` 或 `CLAUDE.md` 可能缺失或过期时执行。**不推倒重来，按版本迭代逐步对齐**。

### GB.1 现状审计

读清现有结构后再规划迁移：

1. **目录扫描**：记录现有顶层、`apps/*`/`packages/*`/`backend/`/`src/` 的实际源码与测试根；识别各自的构建入口。
2. **文档资产盘点**：`README.md` / `CHANGELOG.md` / `docs/` / `.csp/` / `CLAUDE.md`，标识谁写、谁读、哪些实际发布。
3. **版本管理现状**：读现有版本真源、tag 及包版本，标出单源派生关系，不假定每仓都有根 `VERSION`。
4. **候选旧路径**：若有 `output/`、`spark-output/`、`.planning/`，先查生产者配置和入站引用；仍在使用就保留，不将文件名视作迁移依据。

调用 `[[skill:csp-project-doc-architect]]`（分析既有结构）+ `[[skill:csp-file-organizer]]`（扫描重复/过期文件）。

### GB.2 增量迁移计划

基于审计产出，按优先级渐进迁移（不推倒重来）：

| 优先级 | 变更 | 时机 | 风险 |
|--------|------|------|------|
| 优先 | 候选工作 | 执行前证据 | 处置 |
|------|----------|------------|------|
| 必要入口 | 初始化或修复 `.csp/AGENTS.md` + `manifest.json` | 既有 hub/驱动器、权威文档清单 | 原路径没有等价路由时由 `csp-knowledge-hub` 建立 |
| 实际漂移 | 修复已证实的失效索引、路径和阅读入口 | 读写者、引用、manifest、构建/测试命令 | 先给 old→new 映射和回退方案；另行批准迁移 |
| 可选整洁 | README/CHANGELOG 导航、目录分层 | 真实查找困难或维护成本 | 不因文件数、年代、模板不同而强制重排 |

**约束**：棕地已运行的 `src/`、`tests/`、monorepo 目录、构建与 CI 路径优先保留。仅凭缺少默认目录不能断言路由失效；迁移需检查消费者和项目实际的构建/测试，不能自动删文件。

### GB.3 知识中枢棕地蒸馏

调用 `[[workflow:csp-knowledge-hub]]`：沿项目实际入口识别模块，蒸馏已有代码的 CMS，并以 source_id/hash 登记产物；没有自动回写器时由产物写入者显式回写并核对 manifest。

---

## Phase GK：知识中枢初始化与三基线管理

> 知识中枢是整条交付链路的基座。本 Phase 不重复方法论细节、通过 `[[skill:csp-knowledge-hub]]` 承载完整初始化流程，此处只定义治理层的约定。

### GK.1 知识中枢初始化

调用 `[[skill:csp-knowledge-hub]]` 完成：

- **AGENTS.md**：路由契约（6 节固定结构 + 操作路由表），电报体风格
- **manifest.json**：唯一产物索引（`source_id`/`content_hash`/`build_status`/`raw_path`/`output_path`），所有阶段产出即回写
- **lifecycle-state.json**：运行态索引；先识别当前驱动器实际使用的阶段 schema（提示词 00–07 或 SDK S-stage），按它读写，不混用数组与对象、不把长 `dev_log` 和测试输出塞进去。
- **既有文档整改**：只给出冲突清单和受影响读者；路径/版本/frontmatter 的更改先确定权威与回滚，不自动移动活跃原文。
- **棕地 CMS 蒸馏**（Phase 1.7）：代码已存在时自动蒸馏入口点→调用链→模块边界→生成 CMS baseline

> 数据字典是项目的**统一表字段文档**——所有表/字段/类型/约束/所属 feature 的唯一真相源。Spec 定义单个 feature 的数据模型，数据字典聚合全项目视角。

### GK.2 三基线体系

| 基线 | 全称 | 目录 | 生产者 | 消费者 |
|------|------|------|--------|--------|
| **PMS** | Product Module Spec | `.csp/product-spec/` | Planning Phase 5 + 01 PRD | 02 拆解 / 03 技术方案 / 07 复盘 |
| **CMS** | Code Module Spec | `.csp/code-spec/{app}/` | 00 棕地蒸馏 / 05 增量对齐 | 03 技术方案 ground / 05 开发 / CR |
| **TMS** | Test Module Spec | `.csp/test-spec/{module}/` | Testing Phase TD + 03 Spec | TU/TI/TE 测试实施 / 门控 |
| **DDS** | Data Dictionary Spec | `docs/architecture/DATA-SCHEMA.md` | S3 Spec 产出时同步更新 / 05 开发新字段时增量更新 | 全阶段——字段名唯一真相源 |

**三基线闭环**：PMS 定义"要做什么"→ CMS 定义"代码怎么做"→ TMS 定义"怎么验证做得对"→ 07 复盘 findings 回流更新 PMS。DDS 是跨三基线的字段级真相源——PMS 提需求时说"需要用户表"、Spec 设计时说"user_id 是 UUID"、代码/Migration/API 回应时全部从这里取字段名。

**DDS 格式**（`docs/architecture/DATA-SCHEMA.md`）：

```markdown
# 数据字典 — {project}

> 所有表/字段/类型/约束的唯一真相源。Spec 定义单 feature 数据模型，本文档聚合全项目视角。
> 更新触发：S3 Spec 产出时 + 05 开发新增字段时 + DB migration 变更时。

## 枚举与常量
| 名称 | 值 | 含义 | 所属 feature |
|------|-----|------|-------------|
| UserRole | admin/editor/viewer | 用户角色 | F-001 用户管理 |

## 表
### users
| 字段 | 类型 | 约束 | 默认值 | 说明 | 所属 feature |
|------|------|------|--------|------|-------------|
| id | UUID | PK | gen_random_uuid() | 用户唯一标识 | F-001 |
| email | VARCHAR(255) | UNIQUE NOT NULL | — | 登录邮箱 | F-001 |
| created_at | TIMESTAMPTZ | NOT NULL | now() | 创建时间 | F-001 |
| updated_at | TIMESTAMPTZ | NOT NULL | now() | 更新时间 | F-003 审计日志 |
```

**更新规则**：
- S3 Spec 产出时，新增 entity → 在 DDS 中建表/加字段行，标注所属 feature
- 05 开发中新发现需要字段 → **先改 DDS，再改 Spec，再写代码**（DDS 驱动 Spec 驱动代码，不要反过来）
- DB migration 变更时 → 同步更新 DDS 对应字段行
- 字段重命名/删字段 → DDS 中标记 `→ renamed to xxx` / `DEPRECATED vX.Y.Z`，保留历史记录

### GK.3 manifest 回写约定

产物写入者负责把实质页登记至 manifest（`content_hash` 用 git blob，禁 mtime；`source_type` 用现有枚举 `pms/cms/tms/wiki/codewiki/memory/doc`，归档页仍可用 `doc`，归档形态用 frontmatter `type: archive` 或项目登记状态表达；`build_status=built` 需产物存在并校验）。当前 `hub_manifest.sh` 提供只读定位和已索引 output 的 hash 对账，不自动回写或分片：

| 阶段 | 产物 | source_type |
|------|------|------------|
| Planning | STRATEGY.md / ROADMAP.md / PRD SPEC | `doc` / `pms` |
| Development 02-04 | decomposition / specs / tasks | `doc` |
| Development 05 | CMS 基线 | `cms` |
| Development 06 发布、07 复盘 | 门控证据 / 发布记录 / 里程碑 | `doc`（归档内容用页面 `type: archive`） |
| Testing TD | TMS 基线 + 用例集 | `tms` / `doc` |

**入场信息边界**（细则见 `csp-knowledge-hub/references/project-entry-contract.md`）：
- 最近指标只作为带 `observed_at/source_commit/environment/command/exit_code/evidence_path` 的历史观测摘要；发布前重新运行当前门禁。不要把 100 条历史日志或全量报告内联生命周期状态。
- `findings-baseline.json` 是旧版闭合规则违规的豁免记录，不是所有 OPEN finding 的清单；OPEN 项从原始 `*FINDINGS*.json` 派生可重建导航，不扩充豁免基线。
- `manifest.json` 是索引真源；最近变更可按已索引 output 的哈希查询并注明范围。未实现全新源发现、自动写回、自动分片时不宣称已自动化。

### GK.4 frontmatter 约定

全链路实质页必须内联 YAML frontmatter（禁 `.meta.json` 侧车）：

```yaml
---
type: concept|entity|faq|howto|module-spec|feature-spec|test-spec
confidence: high|medium|low
sources: ["[[raw/xxx.md@hash]]"]
seeAlso: ["[[code-spec/app/CODE-MODULE-SPEC]]"]
created: "YYYY-MM-DD"
updated: "YYYY-MM-DD"
---
```

### GK.5 Git 分支策略

调用 `[[pattern:csp-git-conventions]]` 管理两类产物不同策略：

| 产物类型 | 分支策略 | 原因 |
|---------|---------|------|
| `.csp/` 知识产物（AGENTS/manifest/lifecycle-state/specs/tasks/PMS/CMS/TMS） | 与本项目实际工作的版本分支同读同写；合并时一起集成 | 避免代码分支与其 Spec/测试基线不同步 |
| `apps/`/`packages/`/`src/` 代码 | 按项目既有 PR/分支策略 | 测试和规格应与同一变更一起被审阅 |
| `docs/` 活跃原文 | 与对应需求/代码变更同步评审 | 保证读者在工作分支上看到一致的 PRD |

规则：工作分支上的阶段不得声称主干已就绪；需要切换分支或发布前检查文件与运行态是否存在于目标分支。是否使用 worktree 由用户和项目策略决定。

---

## Phase G0：项目结构初始化与维护

> 适用于新项目初始化或既有项目结构整理。

### G0.1 标准目录结构

调用 `[[skill:csp-project-doc-architect]]`（文件夹结构/命名/索引/交叉引用）设计项目目录：

```
项目根/
├── README.md                         # 项目门面：是什么/怎么跑/怎么参与
├── CHANGELOG.md                      # 版本变更记录
├── CLAUDE.md                         # Agent 路由契约
├── LICENSE                           # 开源许可
├── VERSION                           # 仅项目采用它为版本真源时存在；也可由 package.json/pyproject.toml 管理
│
├── src/                              # 源代码
│   ├── app/                          # 前端应用（如有）
│   │   ├── components/               # UI 组件
│   │   ├── pages/                    # 页面路由
│   │   ├── hooks/                    # 自定义 hooks
│   │   ├── lib/                      # 工具函数/API client
│   │   └── styles/                   # 样式/token
│   ├── api/                          # 后端 API（如有）
│   │   ├── routes/                   # 路由层
│   │   ├── services/                 # 业务逻辑层
│   │   ├── models/                   # 数据模型
│   │   └── middleware/               # 中间件
│   └── db/                           # 数据库迁移/seed
│       └── migrations/
│
├── tests/                            # 测试代码
│   ├── unit/                         # 单元测试（mirror src/ 结构）
│   ├── integration/                  # 集成测试
│   ├── e2e/                          # E2E 测试
│   └── fixtures/                     # 测试数据/fixtures
│
├── docs/                             # 📖 对外人类文档（给人读）
│   ├── strategy/                     #   战略规划
│   │   ├── STRATEGY.md               #     战略锚点
│   │   └── ROADMAP.md                #     版本路线图
│   ├── prd/                          #   产品需求文档
│   │   ├── PRD-{version-slug}.md     #     每版本 PRD SPEC
│   │   └── PRD-INDEX.md              #     PRD 索引
│   ├── FEATURES.md                   #   功能列表（版本×模块×功能×状态）
│   ├── analysis/                     #   分析报告
│   │   ├── CURRENT-STATE-{date}.md   #     项目现状评估
│   │   ├── MARKET-RESEARCH-{date}.md #     市场调研
│   │   ├── COMPETITIVE-REFERENCE.md  #     竞品借鉴
│   │   ├── INTEGRATION-NECESSITY-{date}.md  # 集成审视
│   │   ├── GROWTH-PLAN-{date}.md     #     增长实验规划
│   │   ├── test-basis-{version}.md   #     测试依据
│   │   ├── test-cases-{feature}.md   #     测试用例集
│   │   ├── traceability-{feature}.md #     AC 追溯矩阵
│   │   └── test-retro-{version}.md   #     测试复盘
│   ├── architecture/                 #   架构文档
│   └── guides/                       #   使用指南/开发指南
│
└── .csp/                             # 🤖 Agent 产物库（agent 读/写，人不直接读）
    ├── AGENTS.md                     #   路由契约
    ├── manifest.json                 #   产物索引
    ├── lifecycle-state.json          #   Pipeline 阶段状态
    ├── agent-conventions/            #   Agent 规范（G-01~G-08 等）
    ├── code-spec/                    #   CMS 代码基线
    ├── product-spec/                 #   PMS 模块基线
    ├── test-spec/                    #   TMS 测试基线
    ├── artifacts/verify/evidence/    #   运行证据；已有其他有效目录先登记映射
    ├── specs/                        #   Spec 产物
    ├── tasks/                        #   任务拆解
    ├── tech-design/                  #   技术方案
    ├── planning/                     #   规划产物
    ├── decomposition/                #   需求拆解
    ├── verification/                 #   门控证据
    ├── convergence/                  #   收敛审查产物
    │   └── CONVERGED-FEATURE-PLAN.md
    ├── audit/                        #   审计 findings
    ├── critic/                       #   产品批评 findings
    ├── gap-analysis/                 #   缺口分析 findings
    ├── review/                       #   复盘 findings
    ├── milestones/                   #   里程碑归档
    ├── spark/                        #   Spark 设计链产物
    └── ship/                         #   发布记录
```

> **文档边界**：根入口（README/Agent 指令）→ `docs/`（人读原文，是否发布由项目配置决定）→ `.csp/`（Agent 工程产物与引用证据）。运行证据默认 `.csp/artifacts/verify/evidence/`；项目已有 `verify/` 时登记读写者映射并保留有效引用，不在初始化时强制搬迁。源码与测试目录仅是示例，monorepo 和语言原生结构依既有配置。

### G0.1-M：Monorepo 项目适配

> 项目使用 `packages/` 或 `apps/` 结构（pnpm workspaces / Turborepo / Nx / Lerna）时，以下模板替换 G0.1 的单仓库模板。调用 `[[skill:csp-monorepo-tooling]]` 辅助 monorepo 工具链配置。

```
项目根/
├── README.md                         # 项目门面
├── CHANGELOG.md                      # 统一变更记录
├── CLAUDE.md                         # Agent 路由契约
├── LICENSE                           # 开源许可
├── VERSION                           # 可选：只在本项目用其作为版本真源时创建
├── package.json                      # workspace root（private: true）
├── pnpm-workspace.yaml               # monorepo workspace 定义
├── turbo.json                        # Turborepo pipeline
│
├── apps/                             # 应用（独立部署单元）
│   ├── web/                          # 前端应用（Next.js）
│   │   ├── package.json
│   │   ├── src/
│   │   ├── tests/                    # 前端测试（unit/integration/e2e）
│   │   └── next.config.ts
│   └── api/                          # 后端应用（FastAPI）
│       ├── pyproject.toml            # 或 package.json / go.mod
│       ├── src/
│       │   ├── routes/               # API 路由层
│       │   ├── services/             # 业务逻辑层
│       │   ├── models/               # 数据模型
│       │   └── middleware/           # 中间件
│       └── tests/                    # 后端测试（unit/integration）
│
├── packages/                         # 共享包（被 apps/ 引用）
│   ├── shared/                       # 共享工具/类型
│   │   ├── package.json
│   │   ├── src/
│   │   └── tests/
│   ├── ui/                           # 共享 UI 组件
│   │   ├── package.json
│   │   ├── src/
│   │   └── tests/
│   └── config/                       # 共享配置（eslint/tsconfig）
│       └── package.json
│
├── docs/                             # 📖 对外人类文档（项目级共享，同 G0.1）
│
├── docker-compose.yml                # 本地开发环境（web + api + redis + db）
├── docker-compose.prod.yml           # 生产环境
├── .env.example                      # 环境变量模板（入库）
│
└── .csp/                             # 🤖 Agent 产物库（项目级共享——PMS/CMS/TMS 跨 package 统一）
```

**Monorepo 关键差异**：

| 维度 | 单仓库 (G0.1) | Monorepo (G0.1-M) |
|------|--------------|-------------------|
| 源码 | `src/` 单入口 | `apps/web/src/` + `apps/api/src/` + `packages/*/src/` 多入口 |
| 测试 | `tests/` 单层 | 各 package 自含 `tests/`；前端 E2E `apps/web/tests/e2e/`；后端 API 测试 `apps/api/tests/` |
| 版本 | 一个 `VERSION` | 统一 `VERSION`（推荐）或各 package 独立 `package.json.version` |
| `.csp/` | 项目根 | 项目根（跨 package 共享 PMS/CMS/TMS） |
| CMS 基线 | `.csp/code-spec/{app}/` | `.csp/code-spec/web/` + `.csp/code-spec/api/` + `{package-name}/` 每入口独立 CMS |
| 本地开发 | 单服务启动 | `docker-compose up`（web + api + redis + db）多服务编排 |
| CI | 单语言 | 多语言并行（前端 Node.js + 后端 Python）或矩阵构建 |
| Pipeline | 整个项目一条 pipeline | 整个项目一条 pipeline（跨 package 协同交付）；单 package 独立 pipeline 按需 |
| Tag | `vX.Y.Z` | 统一 `vX.Y.Z`（推荐）；独立版本用 `{package}@vX.Y.Z` 或 changesets |

**Monorepo 版本策略**：
- **统一版本**：若各包同批发布，由项目已有的唯一真源（可为根 `package.json` 或 `VERSION`）及其同步工具驱动；不能默认创建第二份版本真源。
- **独立版本**：各包独立发布时沿用现有 changesets/包管理器及 tag 约定，审查每个包的真源和版本关系。
- `.csp/` PMS/CMS/TMS 使用独立的 schema/产物更新信息与索引，不把它们误当所有 package 的发布号。

### G0.2 文档边界与发布范围

调用 `[[workflow:csp-documentation-governance]]` 确定各文件的真实读者和发布配置：

| 区域 | 主要内容 | 更新触发 | 发布范围 |
|------|----------|----------|----------|
| 根入口（README/AGENTS/CLAUDE） | 快速上手、工具与不可违背规则 | 行为、工具或入口路径改变 | 按项目访问控制 |
| `docs/` 或现有人读目录 | 战略、活跃 PRD 原文、指南/报告 | 需求与产品变更 | 由站点/仓库访问配置决定，不能一律宣称公开 |
| `.csp/` 或已映射的工程区域 | PMS/CMS/TMS、manifest、运行态、证据、findings | 各阶段真实产物与门控 | 默认不发布；内部文档可引用 |

若已有 `verify/` 运行目录，先登记输出者和读者，不为匹配示例而重排。

### G0.3 文件命名约定

- **date 占位符**：`{date}` = `YYYY-MM-DD`（如 `MARKET-RESEARCH-2026-11-11.md`）
- **version 占位符**：`{version}` = 版本号（如 `CURRENT-STATE-v1.5.md` 或 `test-basis-v1.5.md`）
- **feature 占位符**：`{feature-slug}` = kebab-case 功能名（如 `test-cases-user-registration.md`）
- **version-slug**：`v{X.Y}-{theme-slug}`（如 `PRD-v1.5-batch-publish.md`）
- **幂等覆盖**：重跑同 slug 直接覆盖，不留 `-v2` 后缀
- **禁止散落根目录**：无 feature/version 后缀的裸文件名（如 `test-cases.md`）禁止出现在根目录

**命名审查**：新增业务实现避免 `_v2`、`-final`、milestone 前缀等无语义副本；用功能职责命名并以 Git 跟踪版本。存量命名要查 import、路由、迁移链与外部协议后提出增量重命名方案，不因匹配模式就直接改动。数据库迁移 revision、按版本发布的 API/Schema 文件等可能依赖精确标识；这些属于工具/协议的稳定主键而非任意豁免，必须保留或完成受控迁移。

---

## Phase G1：版本与变更管理

### G1.1 版本号管理

调用 `[[skill:csp-git-conventions]]`（Conventional Commits/原子提交/Tag 纪律）+ `[[skill:csp-changelog-management]]`（CHANGELOG 追加/分类/格式）：

- **SemVer X.Y.Z**：MAJOR=breaking / MINOR=additive / PATCH=fix

> **MINOR (Y) 是攒批发布，不是一个功能一个版本**：同一模块的多个功能打包成一个 MINOR+1 版本（不设硬上限——模块内有几个相关 feature 就打包几个），不逐功能 bump。只有不同模块/主题方向不同/体量过大才拆到下一版本。"一个版本一个功能"是模块内恰好只剩一个功能时的特例，不是默认形态。

- **feat/fix 分轨**：feat 批打 MINOR+1 tag，fix 批打 PATCH+1 tag；同迭代两者兼有 → 拆两个发布，不混合
- **Monorepo 版本**：识别项目实际的统一/独立发布策略与唯一真源，不凭模板创建 `VERSION` → 见 G0.1-M
- **Tag 格式**：`v` 前缀 + annotated（`-a`）+ 不可变（已推送不移动）
- **一 commit 一 tag**，禁多 tag 同 commit
- **纯文档 commit 禁打版本 tag**
- 详细版本号规则见 `prompts/version-management.md`

**多文件版本同步**：版本号是一个事实，但各生态工具各认各的文件。原则：**一处定义、多处派生、脚本校验、禁手填**。

| 文件 | 角色 | 同步方式 |
|------|------|---------|
| 项目选定的真源（`package.json.version`、`VERSION` 或语言原生版本字段） | 仅一个可编辑定义点，记录在项目规则中；**本 CSP 仓库实际用 `package.json.version`** | 使用项目现有的 version/sync 工具更新 |
| `git tag` | 发布锚点（不可变） | 由发布流程基于已验证版本创建，不因文件漂移改动既有 tag |
| 其他包元数据、代码常量、Release/CHANGELOG | 派生/发布元数据 | 依据真实的构建与发布工具同步或校验；独立发布的包需独立对照 |

**同步校验**：先看项目真源/包版本方案，再传入实际存在的版本文件运行 `python3 prompts/scripts/version_integrity_check.py --files <冒号分隔的相应文件>`；检查器当前只实现 T1–T4，无法识别的文件或缺失项会产生 WARNING，不能声称已验证全源、T5/T6 或 CI enforcement。同步工具由项目提供；本仓库使用 `npm run version:sync`，不是强制从根 `VERSION` 派生。

**冲突消解**：先确定是"在已发布 tag 之后的新工作版本"还是意外漂移，并核对 Git 历史与项目真源；不要把新版本盲目回退到旧 tag，也不移动已发布 tag。规则不明时停止自动更改并报告冲突。

### G1.2 Commit 规范

Conventional Commits 格式（遵循 `[[pattern:csp-git-conventions]]` §3）：

```
<type>(<scope>): <subject>

[body]

[footer]
```

| Type | 用途 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat(auth): add OAuth2 login` |
| `fix` | Bug 修复 | `fix(api): handle null user session` |
| `docs` | 文档变更 | `docs(readme): update install guide` |
| `refactor` | 重构（不改功能） | `refactor(db): extract query builder` |
| `test` | 测试相关 | `test(e2e): add checkout flow test` |
| `chore` | 构建/工具/依赖 | `chore(deps): bump react to 18.3` |

### G1.3 README 维护

每个版本发布时，检查并更新 `README.md` 的必要节：

- **项目简介**——项目是什么、解决什么问题
- **快速开始**——最小可运行步骤（clone → install → run）
- **项目结构**——顶层目录说明（链接到完整结构文档）
- **开发指南**——如何参与开发、环境要求、常用命令
- **版本历史**——链接到 `CHANGELOG.md`
- **许可**——LICENSE 引用

调用 `[[skill:csp-file-organizer]]` 在迭代间隙清理项目文件（重复文件/临时产物/过期文档归档）。

---

## Phase G2：全阶段产物路径约定

> 下表是 CSP 默认路径与角色的**示例映射**，目标项目已有可用路径先记录在 `.csp/AGENTS.md`，不得按表强制搬迁。表中“✅”仅表示人读/可能对外，**不表示自动公开或发布**；实际发布范围由 G0.2 与访问控制决定。

### G2.1 按阶段汇总

| 阶段 | 所属文档 | 产物路径 | 对外 |
|------|---------|---------|------|
| **战略规划** | Planning Phase 0–1 | `docs/strategy/STRATEGY.md` + `ROADMAP.md` | ✅ |
| **现状评估** | Planning Phase A | `docs/analysis/CURRENT-STATE-{date}.md` | ✅ |
| **市场调研** | Planning Phase R | `docs/analysis/MARKET-RESEARCH-{date}.md` | ✅ |
| **竞品借鉴** | Planning Phase 0.5 | `docs/analysis/COMPETITIVE-REFERENCE.md` | ✅ |
| **版本序列** | Planning Phase 2 | `docs/strategy/ROADMAP.md`(更新) + `docs/FEATURES.md` | ✅ |
| **集成审视** | Planning Phase 2.5 | `docs/analysis/INTEGRATION-NECESSITY-{date}.md` | ✅ |
| **架构收敛** | Planning Phase 3 | `.csp/convergence/CONVERGED-FEATURE-PLAN.md` | ❌ |
| **设计衔接** | Planning Phase 4 | `.csp/spark/` 工程设计链；需人读的成品在项目现有 docs 目录 | 按项目发布设置 |
| **PRD SPEC** | Planning Phase 5 | `docs/prd/PRD-{version-slug}.md` + `PRD-INDEX.md` | ✅ |
| **增长规划** | Planning Phase G | `docs/analysis/GROWTH-PLAN-{date}.md` | ✅ |
| **PRD 工程升级** | Development 01 | `docs/prd/PRD-{slug}.md`(升级) | ✅ |
| **需求拆解** | Development 02 | `.csp/decomposition/` | ❌ |
| **技术方案** | Development 03 | `.csp/tech-design/` + `.csp/specs/` | ❌ |
| **任务拆解** | Development 04 | `.csp/tasks/` | ❌ |
| **开发实施** | Development 05 | 项目实际源码根（`src/`、`apps/*`、`backend/`）与既有测试/迁移目录 | 代码依项目策略 |
| **数据模型 Spec** | Development S3 | `.csp/specs/`（DDL 设计与数据契约） | 内部 |
| **数据库迁移** | Development 05 | 项目实际的 Alembic/Flyway/Prisma 迁移目录 | 代码依项目策略 |
| **SQL 审查** | Development 05/06 | `.csp/verification/sql-review-{version}.md` 或既有记录 | 内部 |
| **质量门控与发布** | Development 06（含 S6/S7/S8） | `.csp/artifacts/verify/evidence/` + `.csp/ship/`，发布元数据按项目配置 | 证据内部、Release 按项目策略 |
| **复盘** | Development 07（S10 是别名） | `.csp/review/REVIEW-FINDINGS-*.json` | 内部 |
| **测试依据** | Testing TB | `docs/analysis/test-basis-{version}.md` | ✅ |
| **用例设计** | Testing TD | `docs/analysis/test-cases-{feature}.md` + `traceability-{feature}.md` | ✅ |
| **测试实施** | Testing TU/TI/TE | 项目既有测试根（可与 package 同层或紧邻源码） | 代码依项目策略 |
| **视觉测试** | Testing TV | `.csp/artifacts/verify/evidence/visual-diff/`（或登记既有位置） | 内部 |
| **E2E 测试** | Testing TE | `.csp/artifacts/verify/ui-test-report.md`（或登记既有位置） | 内部 |
| **测试复盘** | Testing TQ | `docs/analysis/test-retro-{version}.md` | ✅ |

### G2.2 测试产物分层约定

> 测试产物散落是项目混乱的头号来源——coverage 文件、截图、JSON 报告、契约文件各有归属。

| 测试产物 | 落点 | 受众 | 入 Git |
|---------|------|------|--------|
| **测试代码** | 项目既有测试目录（如 `tests/`、`apps/web/tests/`、`src/**/*.test.ts`） | 开发者 | 依代码策略提交，与被测模块可追溯 |
| **固定 fixtures/契约源** | 项目既有 fixtures/pacts 源目录 | 开发者与 CI | 可复现、为验证所需时提交，不把全部 pacts 当临时垃圾 |
| **测试依据、用例、追溯** | 项目人读 docs 的 `test-basis-*`、`test-cases-*`、`traceability-*` | 人审阅 | 依项目文档策略提交，发布范围另判定 |
| **TMS 基线** | `.csp/test-spec/{module}/` | Agent 消费 | 随模块维护，manifest 索引 |
| **E2E/视觉/覆盖率等运行结果** | `.csp/artifacts/verify/evidence/` 默认；已存在的 `verify/` 可映射 | 内部验证 | 可重建输出按项目策略忽略或 CI 留存；被 findings/发布引用的证据须保留 |
| **审计 findings** | `.csp/audit/`、`.csp/review/` 等现有注册来源 | Agent 消费 | 未关闭项与引用证据不得按日期或大小清除 |

**测试代码组织**：沿用语言与仓库约定；`tests/unit/auth.service.test.ts`、`apps/web/src/Auth.test.tsx`、`backend/tests/test_auth.py` 都可能合理。要求测试 runner 能发现、每个变更可定位到被测模块和 AC，新增测试随代码一起提交。E2E 放在可访问的应用或项目级测试根，跨包测试放在有消费责任的套件；共享 fixtures 要明确所有者，避免把运行输出当源 fixture。

**运行产物**：配置测试/覆盖率/浏览器工具直接写到登记的证据目录；先修改 CI 和消费者，再提迁移建议。是否提交契约、视觉基线或报告依可复现性/追溯要求决定；不得因大文件或两个格式共存就认定冗余。

**多服务本地开发约定**：从本项目的启动配置、环境模板和健康端点探测实际服务与端口，登记前端、API、队列/缓存和数据库的依赖及启动顺序。若项目使用 Compose 则读其服务映射；否则沿项目原生命令启动。不要在通用规则中默认端口、`docker-compose.yml`、代理配置或一定存在 `/health`。真实探活须核对响应身份，不凭端口开放即认定正确服务。

### G2.3 红线

- **`.csp/` 不进对外发布**：`.csp/` 下的所有内容（PMS/CMS/TMS/specs/tasks/verification）是 agent 内部产物，不进 GitHub Pages 部署
- **人读原文**：活跃战略/PRD/指南优先放项目已有的人读区（默认 `docs/`）；是否对外发布按实际访问配置判断。
- **机器证据**：默认 `.csp/artifacts/verify/evidence/`；既有 `verify/` 可登记映射，迁移须先修改运行工具与消费者。
- **测试代码**：沿用项目实际语言/框架与 monorepo 规则，可紧邻源码或镜像目录；有 runner 发现与需求追溯，不强制另建根 `tests/`。
- **产物命名带 scope 标识**：`{function}-{scope}.md`，避免 `test-cases.md` 这类无 scope 的文件散落

---

## Phase G3：文档生命周期维护

调用 `[[skill:csp-doc-lifecycle-manager]]`（分类/归档/索引/清理）：

### G3.1 文档生命周期阶段

| 阶段 | 判定 | 动作 |
|------|------|------|
| **活跃** | 当前版本正在使用/引用的文档 | 保持原位，定期更新 |
| **归档** | 已发布版本的产物（不再修改但需保留） | 移入 `docs/archive/` 或 `.csp/archive/` |
| **过期** | 已 superseded 的文档（新版本已替代） | 标 `superseded_by: <新文档路径>`，考虑删除 |
| **废弃** | 不再需要的临时产物 | 删除，或移入 `.csp/archive/` 备查 |

### G3.2 定期维护

每个版本发布后（06 done）或规划启动前（Planning Phase 0）：

- 检查上一版 specs/tasks/decomposition 是否已被取代且无人引用；有读者或下版仍依赖则继续保留，符合项目留存条件后才提出归档并更新索引。
- 检查 analysis 报告权威和入站引用；新版本不等于旧报告无价值，不按最新一份自动清理。
- 更新 `docs/prd/PRD-INDEX.md`（标版本 status：Draft→Approved→Released）
- 更新 `docs/FEATURES.md`（标功能 status：规划中→已发布→已下线）
- 调用 `[[skill:csp-knowledge-hub]]` 做知识中枢初始化/更新（`.csp/AGENTS.md` + `manifest.json` 回写）
- 调用 `[[skill:csp-file-organizer]]` 审计可重建的覆盖率/playwright 输出；执行前确认 CI 和未关闭 findings 是否仍依赖原文件。
- OPEN/BLOCKED findings 保留在各来源目录；只有关闭且不再被门禁/版本索引消费的材料才按项目保留策略提出归档。`findings-baseline.json` 不作开放问题清单使用。

---

## Phase G4：项目生产要素管理

> 项目不止代码和文档——还有协作者、安全策略、环境配置、CI/CD、依赖管理等生产要素。

### G4.1 项目元文件清单

| 文件 | 角色 | 维护时机 | CSP Skill |
|------|------|---------|-----------|
| `CONTRIBUTING.md` | 贡献指南（提交流程/分支策略/PR 流程） | 流程变更时 | `[[skill:csp-project-doc-architect]]` |
| `CODE_OF_CONDUCT.md` | 社区行为准则（Contributor Covenant） | 极少（创建后不变） | — |
| `SECURITY.md` | 安全策略（支持版本/漏洞上报/响应 SLA） | 策略变更时 | `[[skill:csp-security-review]]` |
| `.gitignore` | 忽略规则（临时产物/构建产物/凭证/`.csp/tmp`） | 按需 | `[[skill:csp-file-organizer]]` |
| `.npmignore` / `.dockerignore` | 发布/镜像忽略规则 | 按需 | — |

### G4.2 环境与配置管理

| 关注点 | 约定 | CSP Skill |
|--------|------|-----------|
| 环境分层 | 识别项目实际的开发/预发/生产环境与配置来源；只给存在的环境配置约定 | `[[skill:csp-deployment]]` |
| 配置文件 | 示例模板可入库；包含实际凭据的配置不入库，按项目已采用的密钥机制传递 | — |
| 密钥管理 | 密钥/token 不入仓库；CI 通过 secrets 注入；本地通过 `.env` 或 secret manager | `[[skill:csp-security-review]]` |
| 依赖管理 | `package.json`/`requirements.txt`/`Cargo.toml` 锁定版本（lock 文件入库）；定期 `npm audit`/`pip audit` | `[[skill:csp-security-review]]`（依赖审计） |

### G4.3 CI/CD 治理

| 关注点 | 约定 | CSP Skill |
|--------|------|-----------|
| CI 管道定义 | `.github/workflows/` 或等效 CI 配置入库 | `[[skill:csp-cicd-pipelines]]` |
| 门控集成 | CI 中集成 Lint/TypeCheck/Build/Test/Security Audit（对齐 Pipeline S6） | `[[skill:csp-cicd-pipelines]]` |
| 部署管道 | 构建→测试→部署→冒烟→上线，每步可观测 | `[[skill:csp-deployment]]` |
| 回滚策略 | 按实际部署与数据库迁移工具说明可验证的恢复/回退路径；不假定每个迁移都有安全的 down 脚本 | `[[skill:csp-deployment]]` |

### G4.4 发布检查清单

每个版本发布前（06 done），按以下清单逐项确认：

- [ ] 检查该项目选定的版本真源、派生文件和发布 tag 一致；未发布的新工作版本与最近 tag 不强行相等
- [ ] `CHANGELOG.md` 已追加（Added/Changed/Fixed 分类完整）
- [ ] `README.md` 快速开始步骤可运行（clone → install → run → 核心流程走通）
- [ ] `CONTRIBUTING.md` 与实际流程一致（如有）
- [ ] `SECURITY.md` 漏洞上报渠道有效（如有）
- [ ] `.gitignore` 排除了临时产物/凭证/构建输出
- [ ] CI 管道全绿（lint/build/test/security audit）
- [ ] 依赖审计无 CRITICAL 漏洞
- [ ] 部署回滚方案已就绪

调用 `[[skill:csp-release]]` 辅助生成 release notes + `[[skill:csp-project-standards-reviewer]]` 审查项目标准文件合规。

---

## Phase G5：项目根目录卫生

> 根目录是项目的门面。散落的临时产物、遗留的旧路径、未清理的缓存——这些不只是"不好看"，会导致新成员困惑、agent 误判项目结构、CI 误读配置。

### G5.1 根目录候选分类（非白名单）

以下是常见根目录用途，不是所有项目必须采用的名称。清单外的文件不自动归类或移动；先查包管理器、构建脚本、CI、运行态以及入站引用。源代码、迁移链、可复现契约等可能有工具规定的特殊文件名。

| 类别 | 允许的文件/目录 | 说明 |
|------|---------------|------|
| **Git** | `.git/` `.github/` `.gitignore` `.gitattributes` | 版本控制 |
| **编辑器/Agent** | `.claude/` `.cursor/` `.vscode/` `.qoder/` `.editorconfig` | 不污染仓库 |
| **依赖** | `package.json` `pyproject.toml` `requirements.txt` `pnpm-lock.yaml` `uv.lock` `Cargo.toml` `go.mod` | 包管理 |
| **构建/部署** | `Dockerfile` `Dockerfile.*` `docker-compose.yml` `docker-compose.*.yml` `Makefile` `turbo.json` `nginx.conf` | CI/CD + 本地多服务编排 |
| **工具配置** | `.pre-commit-config.yaml` `alembic.ini` `playwright.config.ts` `playwright.*.config.ts` | 单文件，可接受 |
| **环境变量** | `.env` `.env.example` `.env.production` `.env.production.example` | 真实密钥不入库；示例模板可入库，按项目策略检查 |
| **标准文档** | `README.md` `CHANGELOG.md` `LICENSE` `CONTRIBUTING.md` `CODE_OF_CONDUCT.md` `SECURITY.md` | 项目门面 |
| **Agent 指令** | `AGENTS.md` `CLAUDE.md` | Agent 路由 |
| **源码** | `src/` `apps/` `backend/` `frontend/` `packages/` `public/` | 代码 |
| **测试** | `tests/`、`src/**/*.test.ts`、`apps/*/tests/` 等 | 按语言/构建系统约定组织 |
| **文档** | `docs/` | 对外人类文档 |
| **脚本** | `scripts/` | 工具脚本 |
| **数据/配置** | `data/` `configs/` `tooling/` | 按项目需要 |
| **运行时** | `logs/` `backups/` | 不入库（在 `.gitignore`） |
| **CSP 产物** | `.csp/`、项目按需保留的 `prompts/`/`verify/` | 索引与证据；真实读写者决定路径 |
| **参考** | 项目已有的外部参考目录/submodule | 确认许可证、读写者与是否入包；不按中文目录名强制迁移 |
| **工作区** | `node_modules/` `.venv/` `__pycache__/` | 不入库（在 `.gitignore`） |

### G5.2 根目录卫生审查

调用 `[[skill:csp-file-organizer]]` 的项目模式做**只读候选分类**；规范制定或审计任务不操作目标仓库：

| 信号 | 先查 | 处置 |
|------|------|------|
| 根目录覆盖率/浏览器报告 | CI/测试 runner 的输出路径与后续消费；是否被 release/finding 引用 | 可重建输出优先修改生产者配置再迁移，引用中的证据保持可访问 |
| 人读报告或旧 `.planning/`/`spark-output/` | 原文是否活跃；工具是否仍写此处；入站链接和 manifest | 给出 old→new 计划和回滚方法，未经授权不移动 |
| 缓存、备份或版本样式文件名 | Git 跟踪、内容及工具协议（迁移 revision/契约版本等） | 不凭文件名或大小认定冗余；明确可重建性和保留期 |

根目录条目数量只是导航信号，没有统一的 25 文件上限。`coverage.json` 与 `coverage.xml` 可以服务不同消费者；不能直接删一种。忽略规则按项目精确配置，不能用宽泛 `data/` 或 `.csp/` 忽略仍需追溯的源文件。

### G5.3 根目录卫生检查清单

每次规划/发布前只审查受影响范围：

- [ ] 快速上手、源码/测试入口与现有构建工具配置相符；monorepo 不被强迫迁回根 `src/`。
- [ ] 已识别无意生成/可重建的缓存和凭据，并检查 `.gitignore` 是否不会误伤源码、fixture、契约与发布证据。
- [ ] 测试报告或旧目录若要迁移，已有生产者配置修改、消费者/CI 更新、manifest re-point 与回退方案。
- [ ] 活跃 PRD、未关闭 findings、被引用的基线不因文件名、体积或日期被移走。
- [ ] 人读 docs 与 Agent 路由卡都能定位当前权威文件；异常项附具体路径和拥有者。

仅执行文档约定检查；文件移动/清理由用户另行授权。

---

## Phase G6：产物大小治理

> 持续迭代的项目会积累大量产物——日志、changelog、ROADMAP、PRD、验证基线——这些文件天然持续增长，不加管理会导致 Agent 上下文超限、构建变慢、仓库体积膨胀。

### G6.1 按用途治理体积

| 对象 | 体积增大时的动作 | 保留条件 |
|------|----------------|----------|
| 自动加载的根 Agent 指令 / `.csp/AGENTS.md` | 将背景和详细步骤移至有稳定链接的参考页，保留硬约定、当前入口与路由 | 不能挪走平台必须自动加载的约束；先验证读取行为 |
| lifecycle 运行态 | 长历史与测试详情留在原始日志/证据文件，运行态存阶段、短摘要及指针 | `last_known_metrics` 如存在必须有时间、commit、环境、命令、退出码与证据路径；不替代本次门禁 |
| manifest / findings | 选择性 locate/list；OPEN 导航仅从原始 findings 派生，存量违规基线独立 | 大 JSON 不是 Markdown 体积门禁；未实现自动分片、OPEN 汇总或写回前不可宣称已生效 |
| 活跃 PRD/ROADMAP/Spec 与验证基线 | 按章节或索引改善检索，不强制移动原文 | 仍被 01/TB/未关闭 finding 消费时保持原路径和证据可用 |
| 可重建缓存/日志/备份 | 按项目保留、安全、恢复策略配置输出及清理 | 不按固定天数/份数清除，不把实际备份或契约视作普通缓存 |

### G6.2 可验证大小策略

`bash scripts/check-large-files.sh <项目根>` 是**只读 Markdown 警告**，默认 `--warn-kb 50`、退出码 0；只有该项目明确配置 `--fail-kb <KiB>` 才在超过阈值时 exit 1。脚本打印实际扫描目录、缺失目录及统计；不扫描完整 `.csp/` 或 JSON manifest，也不修改文件。接入 CI 前不可称“强制大小门禁”。

Agent 依功能审阅：根指令/路由卡应便于快速装载；长 PRD/CHANGELOG 可按主题导航但不能截断；索引需支持选择性查询。不存在通用的 10/100/250 KiB 禁令，大小不是文档失效的证据。

### G6.3 归档时机

每次规划/发布后**评估**候选而非定期自动搬迁：先确认已有替代物、活跃读者、入站链接、未关闭 findings 引用、法定/项目留存要求；若具备迁移理由，由 `[[workflow:csp-doc-lifecycle-manager]]` 给出源→目标、manifest re-point、断链检查和回退方案，获授权后才执行。CHANGELOG、PRD、截图、备份均不因年份、体积或“最近 N 份”自动转移。

### G6.4 归档路径

优先使用目标项目已有 archive 结构。新项目可按来源将**已确认被取代**的人读文档置于 `docs/archive/`，工程证据置于 `.csp/milestones/` 或已有归档区；保留源文件的可定位入口、被引用证据与版本记录。第三方参考项目是否在独立目录、submodule 或项目已有路径，取决于许可证、打包范围与实际使用者，不一概强制移动。

### G6.5 本地审阅命令

`bash scripts/check-large-files.sh <项目根> [--warn-kb N] [--fail-kb N]`。默认只报告 Markdown 告警；项目自行选择是否显式设置 `--fail-kb` 并接入 CI。检查器不会整理文件、不扫描 JSON、不自动处理 manifest；发现大文件后由 `[[workflow:csp-project-doc-architect]]` 先确认索引、读者与信息密度。

### G6.6 忽略规则

用 `[[skill:csp-file-organizer]]` 对照该项目实际输出与打包配置制定精确 `.gitignore`：真实密钥、可重建缓存应忽略；源码、固定测试 fixture、存量契约、manifest、仍被引用的视觉/发布基线不得被通配规则误伤。特别避免未核实就忽略整个 `data/`、`docs/`、`.csp/` 或归档区。已跟踪文件不会因加入 `.gitignore` 自动消失；变更跟踪前确认保留/发布责任并获取授权。

---

## CSP Skill 路径速查

### 项目结构

| 阶段 | CSP Skill |
|------|-----------|
| 文档架构设计 | `[[skill:csp-project-doc-architect]]`（文件夹结构/命名/索引/交叉引用） |
| 文档治理 | `[[skill:csp-documentation-governance]]`（文档区域/更新触发/边界约定） |
| 文档生命周期 | `[[skill:csp-doc-lifecycle-manager]]`（分类/归档/索引/清理） |
| 文件整理 | `[[skill:csp-file-organizer]]`（重复文件/临时产物/过期文档清理） |
| 知识中枢 | `[[skill:csp-knowledge-hub]]`（PMS/CMS/TMS 统一 workspace + manifest） |

### 版本与变更

| 阶段 | CSP Skill |
|------|-----------|
| Git 规范 | `[[pattern:csp-git-conventions]]`（Conventional Commits/原子提交/Tag 纪律） |
| CHANGELOG 管理 | `[[skill:csp-changelog-management]]`（版本变更记录/分类/格式） |
| 编码规范 | `[[pattern:csp-coding-standards]]`（命名/安全/跨层对齐） |
| 版本号规则 | `prompts/version-management.md`（SemVer 机制/对齐检查/预发布，规则参考文档） |

### 项目标准审查

| 阶段 | CSP Skill |
|------|-----------|
| 项目标准审查 | `[[skill:csp-project-standards-reviewer]]`（CLAUDE.md/AGENTS.md 合规/frontmatter 规则） |
| 发布辅助 | `[[skill:csp-release]]`（分析 release 规则/生成 release notes） |

### 项目生产要素（Phase G4）

| 阶段 | CSP Skill |
|------|-----------|
| CI/CD 管道 | `[[skill:csp-cicd-pipelines]]`（构建/测试/部署管道，GitHub Actions） |
| 部署策略 | `[[skill:csp-deployment]]`（健康检查/回滚/灰度/蓝绿） |
| 安全审计（依赖/漏洞） | `[[skill:csp-security-review]]`（鉴权/注入/依赖审计/密钥管理） |
| 项目标准审查 | `[[skill:csp-project-standards-reviewer]]`（CLAUDE.md/AGENTS.md/CONTRIBUTING/SECURITY 合规） |
| 文档架构设计 | `[[skill:csp-project-doc-architect]]`（CONTRIBUTING/SECURITY/CODE_OF_CONDUCT 模板） |
| Monorepo 工具链 | `[[skill:csp-monorepo-tooling]]`（workspace/pipeline/版本策略/跨 package 治理） |
| 文件整理 | `[[skill:csp-file-organizer]]`（.gitignore/.npmignore 清理/根目录卫生检查/过期文件归档/verify 清理） |

### 全阶段产物路径（Phase G2）

| 阶段 | CSP Skill |
|------|-----------|
| 产物路径约定 | 本文件 G2.1-G2.3 规则表——所有阶段产物落盘统一 |
| 测试产物分层 | G2.2 测试产物分层表（代码/文档/证据/审计 findings 各有归属） |

### 项目根目录卫生（Phase G5）

| 阶段 | CSP Skill |
|------|-----------|
| 根目录审计 | 本文件 G5.1-G5.3 规则 + `[[skill:csp-file-organizer]]`（执行移动/清理） |
| 文档路径合规 | `[[skill:csp-documentation-governance]]`（校验 docs/ .csp/ verify/ 边界） |

---

## 反模式速查

| 反模式 | 症状 | 正确做法 |
|--------|------|---------|
| 产物散落根目录 | `test-cases.md`、`report.md` 直接放根 | 按约定路径落盘：docs/或 .csp/ |
| 原文/工程蒸馏竞争 | PRD 与 PMS 都宣称独立权威 | 人读原文在项目既定位置；PMS 指向原文及版本 |
| 无可定位入口 | 无 feature/scope 标识的产物难查 | 稳定名称或 manifest/source_id 索引，按项目命名标准落盘 |
| 旧文档原地覆盖 | 活跃 PRD 被新 PRD 或归档写入覆盖 | 核对读者和版本，保留可追溯的原文与引用 |
| 强制搬迁路径 | 为追 G2.1 示例把已运行的 `verify/` 移走 | 先映射写入者/读者，升级工具后再考虑移动 |
| 状态文件膨胀 | lifecycle 内联历史日志、把旧指标当本次 gate | 只留阶段与证据指针，最新指标标观测元数据、发布时重跑 |
| 文档无人维护 | README 过期/CHANGELOG 断更/docs 入口失效 | G3.2 按真实变化更新读者依赖 |
| 模板替代项目约定 | 假设每仓都有根 `src/tests`、根 `VERSION` 或 Compose | 探测项目结构再设计，示例不是迁移命令 |

---

## 四文档协作关系

本文件是 CSP 第四份——项目治理横切面，为另外三份提供底层约定：

```
000-project-governance_csp.md（本文件）
  │  项目结构/产物路径/版本管理/文档生命周期
  │
  ├──→ 被 000-product-planning_csp.md 引用
  │      Planning 产物按 G2.1 表落盘
  │
  ├──→ 被 000-develop_pipeline_csp.md 引用
  │      Development 产物按 G2.1 表落盘，版本按 G1 管理
  │
  └──→ 被 000-test_pipeline_csp.md 引用
         Testing 产物按 G2.1 表落盘，测试代码按 G0.1 co-locate
```

---

按任务路由：新项目走 GK/G0/G1/G2/G4，棕地先 GB 再按需补 GK；文件卫生走 G5，文档生命周期/体积走 G3/G6。各阶段只审所需范围，不以全跑流程替代判断；审计不等于取得文件迁移、删除或发布授权。

**缺口报告**：执行过程中若发现本说明未覆盖的治理维度（项目要素缺失/路径约定不完整），**立即指出缺口**——不跳过、不假装覆盖。AI 自主完成，每个阶段按进度条播报。