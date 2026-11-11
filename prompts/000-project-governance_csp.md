使用 CSP 项目治理能力管理项目级规范：目录结构、产物路径、版本管理、文档边界。本文件是三件套（产品规划/开发/测试）的第四份——项目治理横切面。

> 项目治理 ≠ 开发流程。治理关注"东西放哪、叫什么名、谁来维护、什么时候更新"——是所有阶段共享的底层约定。

---

## Phase GB：棕地项目适配（既有项目治理初始化）

> **触发**：项目已存在（非全新初始化），`.csp/AGENTS.md` 或 `CLAUDE.md` 可能缺失或过期时执行。**不推倒重来，按版本迭代逐步对齐**。

### GB.1 现状审计

读清现有结构后再规划迁移：

1. **目录扫描**：记录实际顶层 + `src/` + `tests/` + `docs/` 结构
2. **文档资产盘点**：`README.md` / `CHANGELOG.md` / `docs/` / `.csp/` / `CLAUDE.md` — 存在/缺失/过期
3. **版本管理现状**：`git tag --list 'v*'` — tag 序列是否规范？版本号是否连续？
4. **旧路径识别**：扫描 `output/` `spark-output/` `.planning/` `spark-output/` 等旧路径，记录须迁移的产物

调用 `[[skill:csp-project-doc-architect]]`（分析既有结构）+ `[[skill:csp-file-organizer]]`（扫描重复/过期文件）。

### GB.2 增量迁移计划

基于审计产出，按优先级渐进迁移（不推倒重来）：

| 优先级 | 变更 | 时机 | 风险 |
|--------|------|------|------|
| P0 | 创建 `.csp/AGENTS.md` + `manifest.json`（缺失则 agent 无法路由） | 当前版本 | 无 |
| P1 | `.csp/` 下既有 findings 按标准路径重组 | 下一版本 | 低 |
| P1 | 旧路径产物迁移（`output/`→`.csp/`、`spark-output/`→`.csp/spark/`） | 下一版本 | 中 |
| P2 | `src/` 结构调整（不影响构建前提下） | 后续版本 | 高 |
| P2 | `tests/` 结构调整为分层 | 后续版本 | 中 |
| P3 | README/CHANGELOG 格式标准化 | 各版本渐进 | 无 |

**硬约束**：G0.1 是目标模板非强制命令，既有合理约定优先保留；`src/`/`tests/` 结构调整放 P2；迁移不能破坏 `npm run dev`/`npm test`/lint/build。

### GB.3 知识中枢棕地蒸馏

调用 `[[skill:csp-knowledge-hub]]`（完整初始化：扫项目根和 src/ → 识别既有模块 → 写入 PMS baseline → 蒸馏代码结构为 CMS baseline → 回写 manifest）。

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
├── VERSION                           # 单一版本号源
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
├── verify/                           # 🔍 测试证据（机器产出，给人审阅）
│   ├── ui-test-report.md             #   E2E 测试报告
│   └── visual-diff/                  #   视觉回归截图对比
│
└── .csp/                             # 🤖 Agent 产物库（agent 读/写，人不直接读）
    ├── AGENTS.md                     #   路由契约
    ├── manifest.json                 #   产物索引
    ├── lifecycle-state.json          #   Pipeline 阶段状态
    ├── agent-conventions/            #   Agent 规范（G-01~G-08 等）
    ├── code-spec/                    #   CMS 代码基线
    ├── product-spec/                 #   PMS 模块基线
    ├── test-spec/                    #   TMS 测试基线
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

> **三层定位**（按 CSP 文档边界约定）：
> - `docs/` = 对外人类文档（给人读，GitHub Pages/外部访问者可见）
> - `verify/` = 测试证据（机器产出，给人审阅——截图/log/diff）
> - `.csp/` = Agent 产物库（agent 读/写——PMS/CMS/TMS + specs/tasks/artifacts）

### G0.2 文档边界公约

调用 `[[skill:csp-documentation-governance]]`（对外/对内文档分界 + 更新触发规则）维护文档边界：

| 目录 | 受众 | 写入者 | 更新触发 | 对外发布 |
|------|------|--------|---------|---------|
| `README.md` / `CHANGELOG.md` / `LICENSE` | 外部用户/贡献者 | 发布时（06） | 每个版本发布 | ✅ |
| `docs/` | 外部用户 + 内部团队 | 各阶段产出 | 内容变化时 | ✅（Pages 部署） |
| `verify/` | 内部审阅 | 测试 Pipeline | 每次测试执行 | ❌ |
| `.csp/` | Agent 内部 | Agent 自动 | 每个 phase 结束 | ❌ |

### G0.3 文件命名约定

- **date 占位符**：`{date}` = `YYYY-MM-DD`（如 `MARKET-RESEARCH-2026-11-11.md`）
- **version 占位符**：`{version}` = 版本号（如 `CURRENT-STATE-v1.5.md` 或 `test-basis-v1.5.md`）
- **feature 占位符**：`{feature-slug}` = kebab-case 功能名（如 `test-cases-user-registration.md`）
- **version-slug**：`v{X.Y}-{theme-slug}`（如 `PRD-v1.5-batch-publish.md`）
- **幂等覆盖**：重跑同 slug 直接覆盖，不留 `-v2` 后缀
- **禁止散落根目录**：无 feature/version 后缀的裸文件名（如 `test-cases.md`）禁止出现在根目录

---

## Phase G1：版本与变更管理

### G1.1 版本号管理

调用 `[[skill:csp-git-conventions]]`（Conventional Commits/原子提交/Tag 纪律）+ `[[skill:csp-changelog-management]]`（CHANGELOG 追加/分类/格式）：

- **SemVer X.Y.Z**：MAJOR=breaking / MINOR=additive / PATCH=fix
- **Tag 格式**：`v` 前缀 + annotated（`-a`）+ 不可变（已推送不移动）
- **一 commit 一 tag**，禁多 tag 同 commit
- **纯文档 commit 禁打版本 tag**
- **六处版本同步**：根 `package.json` / 各 app `package.json` / `VERSION` / `pyproject.toml`（如有）/ GitHub Release tag_name + title → 脚本校验，禁人工同步
- 详细版本号规则见 `prompts/version-management.md`

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

> 以下约定确保三份 pipeline 文档的产物落盘一致——不会出现"规划写到 docs/analysis/、开发写到 .csp/planning/、测试写到 verify/"的混乱。

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
| **设计衔接** | Planning Phase 4 | 各设计 skill 自身产物 | 按需 |
| **PRD SPEC** | Planning Phase 5 | `docs/prd/PRD-{version-slug}.md` + `PRD-INDEX.md` | ✅ |
| **增长规划** | Planning Phase G | `docs/analysis/GROWTH-PLAN-{date}.md` | ✅ |
| **PRD 工程升级** | Development 01 | `docs/prd/PRD-{slug}.md`(升级) | ✅ |
| **需求拆解** | Development 02 | `.csp/decomposition/` | ❌ |
| **技术方案** | Development 03 | `.csp/tech-design/` + `.csp/specs/` | ❌ |
| **任务拆解** | Development 04 | `.csp/tasks/` | ❌ |
| **开发实施** | Development 05 | `src/`(代码) + 测试代码(co-locate) | ✅(代码) |
| **质量门控** | Development 06 | `.csp/verification/`(证据) + `.csp/ship/`(发布记录) | ❌ |
| **代码审查** | Development 07 | `.csp/review/REVIEW-FINDINGS-*.json` | ❌ |
| **发布** | Development 08 | `CHANGELOG.md` + `VERSION` + Git tag + Release | ✅ |
| **复盘** | Development 10 | `.csp/review/REVIEW-FINDINGS-*.json`(更新) | ❌ |
| **测试依据** | Testing TB | `docs/analysis/test-basis-{version}.md` | ✅ |
| **用例设计** | Testing TD | `docs/analysis/test-cases-{feature}.md` + `traceability-{feature}.md` | ✅ |
| **测试实施** | Testing TU/TI/TE | 项目既有 `tests/` 目录（不新建顶层） | ✅(代码) |
| **视觉测试** | Testing TV | `verify/visual-diff/` | ❌ |
| **E2E 测试** | Testing TE | `verify/ui-test-report.md` | ❌ |
| **测试复盘** | Testing TQ | `docs/analysis/test-retro-{version}.md` | ✅ |

### G2.2 红线

- **`.csp/` 不进对外发布**：`.csp/` 下的所有内容（PMS/CMS/TMS/specs/tasks/verification）是 agent 内部产物，不进 GitHub Pages 部署
- **`docs/` 是唯一对外的分析/规划内容**：所有给人读的分析报告、PRD、路线图都放 `docs/`
- **`verify/` 是测试证据中间层**：机器产出（截图/log/diff）供人审阅，但不对外发布
- **测试代码与源代码 co-locate**：`tests/` 目录 mirror `src/` 结构，不新建顶层目录
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

- 归档上一个已发布版本的中间产物（specs/tasks/decomposition → `.csp/archive/`）
- 清理过期的 analysis 报告（保留最新一份，旧版标 `superseded_by`）
- 更新 `docs/prd/PRD-INDEX.md`（标版本 status：Draft→Approved→Released）
- 更新 `docs/FEATURES.md`（标功能 status：规划中→已发布→已下线）
- 调用 `[[skill:csp-knowledge-hub]]` 做知识中枢初始化/更新（`.csp/AGENTS.md` + `manifest.json` 回写）

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

---

## 反模式速查

| 反模式 | 症状 | 正确做法 |
|--------|------|---------|
| 产物散落根目录 | `test-cases.md`、`report.md` 直接放根 | 按约定路径落盘：docs/或 .csp/ |
| docs/ 与 .csp/ 混用 | 给人读的 PRD 放进 .csp/，agent 产物放进 docs/ | 三层定位：docs/对外 → verify/证据 → .csp/agent |
| 无 scope 命名 | `test-cases.md` 没有 feature/version 标识 | `{function}-{scope}.md` 格式 |
| 产物多版本并存 | `PRD-v1.0.md` + `PRD-v1.0-v2.md` + `PRD-v1.0-final.md` | 幂等覆盖，不留版本后缀 |
| 路径不统一 | 规划写 `docs/analysis/`，开发写 `.csp/planning/`，测试写 `verify/` | 全阶段统一：产物路径按 G2.1 表 |
| 文档无人维护 | README 过期/CHANGELOG 断更/docs/ 堆积 | G3.2 每个版本发布后做定期维护 |
| 项目结构混乱 | src/ 下混杂测试/文档/配置文件 | G0.1 标准目录结构，测试 co-locate |

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

按 G0→G1→G2→G3 执行项目治理初始化或审计。AI 自主完成，每个阶段按进度条播报。