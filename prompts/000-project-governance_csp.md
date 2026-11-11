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

## Phase GK：知识中枢初始化与三基线管理

> 知识中枢是整条交付链路的基座。本 Phase 不重复方法论细节、通过 `[[skill:csp-knowledge-hub]]` 承载完整初始化流程，此处只定义治理层的约定。

### GK.1 知识中枢初始化

调用 `[[skill:csp-knowledge-hub]]` 完成：

- **AGENTS.md**：路由契约（6 节固定结构 + 操作路由表），电报体风格
- **manifest.json**：唯一产物索引（`source_id`/`content_hash`/`build_status`/`raw_path`/`output_path`），所有阶段产出即回写
- **lifecycle-state.json**：8 阶段状态机（00→01→...→07），每阶段读/写推进
- **既有文档整改**（Phase 1.5）：版本对齐/散落归位/重复清理/front-matter 补全，只动治理层不动业务内容
- **棕地 CMS 蒸馏**（Phase 1.7）：代码已存在时自动蒸馏入口点→调用链→模块边界→生成 CMS baseline

### GK.2 三基线体系

| 基线 | 全称 | 目录 | 生产者 | 消费者 |
|------|------|------|--------|--------|
| **PMS** | Product Module Spec | `.csp/product-spec/` | Planning Phase 5 + 01 PRD | 02 拆解 / 03 技术方案 / 07 复盘 |
| **CMS** | Code Module Spec | `.csp/code-spec/{app}/` | 00 棕地蒸馏 / 05 增量对齐 | 03 技术方案 ground / 05 开发 / CR |
| **TMS** | Test Module Spec | `.csp/test-spec/{module}/` | Testing Phase TD + 03 Spec | TU/TI/TE 测试实施 / 门控 |

**三基线闭环**：PMS 定义"要做什么"→ CMS 定义"代码怎么做"→ TMS 定义"怎么验证做得对"→ 07 复盘 findings 回流更新 PMS。

### GK.3 manifest 回写约定

每阶段产出实质页必须回写 manifest（`content_hash` 用 git blob，禁 mtime；`source_type` 按阶段标 `pms/cms/tms/doc/archive`；`build_status=built` 才被视为有效产物）：

| 阶段 | 产物 | source_type |
|------|------|------------|
| Planning | STRATEGY.md / ROADMAP.md / PRD SPEC | `doc` / `pms` |
| Development 02-04 | decomposition / specs / tasks | `doc` |
| Development 05 | CMS 基线 | `cms` |
| Development 06-08 | 门控证据 / 发布记录 / 里程碑 | `doc` / `archive` |
| Testing TD | TMS 基线 + 用例集 | `tms` / `doc` |

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
| `.csp/` 知识产物（AGENTS/manifest/lifecycle-state/specs/tasks/PMS/CMS/TMS） | **主干**（master/main） | 全链路共享基础设施，必须各阶段可见 |
| `src/` 代码 | **feat 分支** → PR → 主干 | 05 实施走 worktree 隔离，PR 合回 |
| `docs/` 文档 | **主干** | 人类文档随版本演进 |

红线：知识产物禁止滞留未合并 side branch——下游阶段读不到 AGENTS.md 会导致路由死循环。

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

> **MINOR (Y) 是攒批发布，不是一个功能一个版本**：同一模块的多个功能打包成一个 MINOR+1 版本（每版本 3-5 条功能是常态，可更多），不逐功能 bump。只有不同模块/主题方向不同/体量过大才拆到下一版本。"一个版本一个功能"是模块内恰好只剩一个功能时的特例，不是默认形态。

- **feat/fix 分轨**：feat 批打 MINOR+1 tag，fix 批打 PATCH+1 tag；同迭代两者兼有 → 拆两个发布，不混合
- **Tag 格式**：`v` 前缀 + annotated（`-a`）+ 不可变（已推送不移动）
- **一 commit 一 tag**，禁多 tag 同 commit
- **纯文档 commit 禁打版本 tag**
- 详细版本号规则见 `prompts/version-management.md`

**多文件版本同步**：版本号是一个事实，但各生态工具各认各的文件。原则：**一处定义、多处派生、脚本校验、禁手填**。

| 文件 | 角色 | 同步方式 |
|------|------|---------|
| `VERSION` | 单一真相源（开发期 canonical） | 手改（唯一可手改的文件） |
| `git tag` | 发布锚点（发布后 canonical，不可变） | `git tag -a vX.Y.Z -m "..."` |
| `package.json` | 打包消费 | 从 VERSION 同步（`scripts/sync-version.mjs`） |
| `pyproject.toml`（如有） | 打包消费 | `dynamic = ["version"]` 或 sync 写入 |
| GitHub Release tag_name + title | 发布元数据 | 从 tag 自动创建 |
| `CHANGELOG.md` 最新条目 | 发布历史 | 发布时校验 == tag |

**同步校验**：发布前必须跑 `python3 prompts/scripts/version_integrity_check.py`——全源字符串完全一致，任一不一致 `exit 1` 阻断发布（T3 gate）。

**冲突消解**：若 `package.json`/`VERSION` 与已发布 `git tag` 不一致 → 以 tag 为 canonical，自动 bump 文件到 tag 版本，不问（仅多 tag 冲突/canonical 不明才人工）。开发期间（tag 未打）→ 以 `VERSION` 为 canonical，所有文件从它派生。

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
| 环境分层 | dev / staging / prod 三套配置，通过环境变量注入（非硬编码文件） | `[[skill:csp-deployment]]` |
| 配置文件 | `.env.example`（模板，入库） + `.env`（实际值，不入库，.gitignore 排除） | — |
| 密钥管理 | 密钥/token 不入仓库；CI 通过 secrets 注入；本地通过 `.env` 或 secret manager | `[[skill:csp-security-review]]` |
| 依赖管理 | `package.json`/`requirements.txt`/`Cargo.toml` 锁定版本（lock 文件入库）；定期 `npm audit`/`pip audit` | `[[skill:csp-security-review]]`（依赖审计） |

### G4.3 CI/CD 治理

| 关注点 | 约定 | CSP Skill |
|--------|------|-----------|
| CI 管道定义 | `.github/workflows/` 或等效 CI 配置入库 | `[[skill:csp-cicd-pipelines]]` |
| 门控集成 | CI 中集成 Lint/TypeCheck/Build/Test/Security Audit（对齐 Pipeline S6） | `[[skill:csp-cicd-pipelines]]` |
| 部署管道 | 构建→测试→部署→冒烟→上线，每步可观测 | `[[skill:csp-deployment]]` |
| 回滚策略 | 每次部署可回滚（数据库迁移有 down 脚本，部署有上一版本 tag） | `[[skill:csp-deployment]]` |

### G4.4 发布检查清单

每个版本发布前（06 done），按以下清单逐项确认：

- [ ] `VERSION` + `package.json` + tag 三处一致
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

### G5.1 根目录合法文件清单

以下文件/目录允许出现在项目根目录。**不在清单中的 → 按 G5.2 归类移动或清理**。

| 类别 | 允许的文件/目录 | 说明 |
|------|---------------|------|
| **Git** | `.git/` `.github/` `.gitignore` `.gitattributes` | 版本控制 |
| **编辑器/Agent** | `.claude/` `.cursor/` `.vscode/` `.qoder/` `.editorconfig` | 不污染仓库 |
| **依赖** | `package.json` `pyproject.toml` `requirements.txt` `pnpm-lock.yaml` `uv.lock` `Cargo.toml` `go.mod` | 包管理 |
| **构建/部署** | `Dockerfile` `Dockerfile.*` `docker-compose.yml` `docker-compose.*.yml` `Makefile` `turbo.json` `nginx.conf` | CI/CD |
| **工具配置** | `.pre-commit-config.yaml` `alembic.ini` `playwright.config.ts` `playwright.*.config.ts` | 单文件，可接受 |
| **环境变量** | `.env` `.env.example` `.env.production` `.env.production.example` | 不入库（`.env` 在 `.gitignore`） |
| **标准文档** | `README.md` `CHANGELOG.md` `LICENSE` `CONTRIBUTING.md` `CODE_OF_CONDUCT.md` `SECURITY.md` | 项目门面 |
| **Agent 指令** | `AGENTS.md` `CLAUDE.md` | Agent 路由 |
| **源码** | `src/` `apps/` `backend/` `frontend/` `packages/` `public/` | 代码 |
| **测试** | `tests/` — E2E 配置（`playwright.config.ts` 等）可放根 | 测试代码在 `tests/` 内 |
| **文档** | `docs/` | 对外人类文档 |
| **脚本** | `scripts/` | 工具脚本 |
| **数据/配置** | `data/` `configs/` `tooling/` | 按项目需要 |
| **运行时** | `logs/` `backups/` | 不入库（在 `.gitignore`） |
| **CSP 产物** | `.csp/` `prompts/`（symlink） `verify/` | Agent 产物 |
| **参考** | `开源项目参考/` | 外部参考（可接受，建议移到 `.csp/references/` 或 `docs/references/`） |
| **工作区** | `node_modules/` `.venv/` `__pycache__/` | 不入库（在 `.gitignore`） |

### G5.2 根目录整洁规则

调用 `[[skill:csp-file-organizer]]` 按以下规则执行项目根目录卫生检查：

**规则 1 — 测试产物归 `verify/`**：
- `coverage.json` `coverage.xml` `.coverage` → `verify/coverage/`
- `playwright-report/` → `verify/playwright-report/` 或 `.gitignore`
- `pacts/`（契约测试产物）→ `verify/pacts/`
- `test-results/` → `verify/test-results/`

**规则 2 — 分析/调研报告归 `docs/analysis/`**：
- 散落根目录的 `*调研报告*.md` `*竞品分析*.md` `*分析*.md` → `docs/analysis/`

**规则 3 — 旧路径迁移到 `.csp/`**：
- `spark-output/` → `.csp/spark/`
- `output/` → `.csp/archive/output/` 或删除
- `.planning/` → `.csp/planning/`
- 裸 `evidence/` `.csp-*-test/` → 归入 `.csp/` 对应子目录

**规则 4 — 缓存/构建产物归 `.gitignore`**：
- `.hypothesis/` `.mypy_cache/` `.pytest_cache/` `.ruff_cache/` `.turbo/` `.playwright-cli/` — 工具缓存
- `.DS_Store` — macOS 产物
- `dist/` `build/` `*.egg-info/` — 构建输出
- 以上全部加入 `.gitignore`，已提交的 `git rm --cached` 移除

**规则 5 — 过期/重复文件清理**：
- `*.bak` `*.tmp` `*.old` `*-old` `*-v2`（无意义后缀）→ 删除或归档
- 同名不同后缀的冗余文件（如 `.env.production` + `.env.production.example` 两者合理保留；但 `coverage.json` + `coverage.xml` 同时存在是冗余——留一种）

**规则 6 — 根目录单文件上限**：根目录非隐藏文件（不含目录）建议 ≤ 25 个（不含 node_modules/.venv 内容）。超过 → 审视是否有可归类的。

### G5.3 根目录卫生检查清单

每个版本发布后或规划启动前，执行：

- [ ] `.gitignore` 排除了所有缓存目录（`.hypothesis/` `.mypy_cache/` `.pytest_cache/` `.ruff_cache/` `.turbo/` `.playwright-cli/`）
- [ ] `.gitignore` 排除了 `.DS_Store` `.coverage` `coverage.*` `*.pyc` `__pycache__/` `dist/` `build/`
- [ ] 测试产物已归入 `verify/`（非散落根目录）
- [ ] 分析/调研文档已归入 `docs/analysis/`（非散落根目录或直接放 `docs/` 根）
- [ ] 旧路径（`spark-output/` `output/` `.planning/`）已迁移到 `.csp/` 对应位置
- [ ] 根目录无裸 `evidence/` `.csp-*-test/` 目录
- [ ] 根目录无 `*.bak` `*.tmp` `*.old` 文件
- [ ] 根目录非隐藏文件 ≤ 25 个
- [ ] 根目录下无单文件过大（>1MB）的孤立文件（如 `coverage.json` 8MB）

调用 `[[skill:csp-file-organizer]]` 执行清理 + `[[skill:csp-documentation-governance]]` 校验文档路径合规。

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
| 文件整理 | `[[skill:csp-file-organizer]]`（.gitignore/.npmignore 清理/根目录卫生检查/过期文件归档） |

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

按 GB→GK→G0→G1→G2→G3→G4→G5 执行项目治理初始化或审计。AI 自主完成，每个阶段按进度条播报。

**全新项目**：GK→G0→G1→G2→G4→G5 完整初始化。
**棕地项目**：GB（审计+迁移计划）→ GK（知识中枢棕地蒸馏）→ G5（根目录卫生）→ G0.2/G1/G2/G4 对齐现有

**缺口报告**：执行过程中若发现本说明未覆盖的治理维度（项目要素缺失/路径约定不完整），**立即指出缺口**——不跳过、不假装覆盖。AI 自主完成，每个阶段按进度条播报。