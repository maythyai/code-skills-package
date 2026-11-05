# 项目通用规则（General Project Rules）

> 从本仓库全部 prompts（00–07 链路 + 独立提示词）、根 `CLAUDE.md`、`.claude/CLAUDE.md` 及各 skill 中提炼的**最一般规则**——适用于任何用本套方法论开发的项目。各阶段提示词规定"本阶段怎么做事"，本文件规定"任何阶段都不能违背的底线约定"；冲突时以各阶段提示词的具体条款为准。零 skill 依赖、自包含，可直接粘贴到任意 Agent 作为基线约束。

---

## 一、项目结构：三层文档定位 + 目录白名单

### 1.1 三层定位（权威见 `docs/README.md`）

| 层 | 路径 | 面向 | 定位 |
|---|---|---|---|
| 门面 | `README.md`（根） | 所有人 | 电梯演讲 + 路标：一句话定位、核心特性、可运行 Quick Start、指向 `docs/` 的链接表。**不堆细节** |
| 对外人类文档 | `docs/` | 人 | 安装/使用/架构/索引/编写规范/`analysis/` 报告/`strategy/` 战略/`prd/` PRD 原文 |
| 对内 agent 产物库 | `.csp/` | agent | PMS/CMS/TMS + 全部流水线产物，人不直接读，git 跟踪 |

- **判定原则**：驱动开发流水线的编程管理产物 → `.csp/`；给人读的非开发文档 → `docs/`。PRD 原文供人评审（`docs/prd/`），其工程消费蒸馏 PMS 在 `.csp/product-spec/`。
- **不混放**：编程产物不散落 `docs/`；非编程文档不进 `.csp/`。发现散落 → 整改归位（见 §二）。
- **门面与元数据在根目录**：`README.md`、`README_zh.md`、`CLAUDE.md`、`CHANGELOG.md`、`CONTRIBUTING.md`、`LICENSE`、`VERSION`、`install.sh` 属根目录；**其他文档一律放 `docs/`**。

### 1.2 `.csp/` 目录结构（路径即语义）

```
.csp/
├── AGENTS.md                # 路由契约（进入 workspace 先读）
├── manifest.json            # 唯一产物索引
├── lifecycle-state.json     # 流水线阶段状态（现在第几步、下一步谁）
├── product-spec/            # PMS 产品说明书（01）
├── decomposition/           # 需求拆解（02）
├── tech-decisions/          # 技术选型 + ADR（03）
├── tech-design/             # 技术方案 TDD（03）
├── specs/                   # 全栈 Feature Spec（03）
├── test-spec/               # TMS 测试说明书（03）
├── tasks/                   # 任务拆解 WBS/DAG/WAVE（04）
├── code-spec/{app}/         # CMS 代码说明书（00 棕地蒸馏 / 05 增量）
├── artifacts/               # 开发/验证/评审产物（含 verify/evidence/ 测试证据）
├── ship/ ops/               # 发布/运维产物（05/06）
├── review/                  # 正式评审/复盘报告（01/07）
├── audit/ critic/ ui-review/ gap-analysis/ ...  # 各独立审查产物
├── traceability/            # 追溯矩阵（贯穿）
├── milestones/{milestone}/  # 里程碑归档
└── planning/ spark/ writer-memory/ intel/ wiki/ ...
```

- **权威与依赖方向**：raw/docs → spec/wiki → 派生产物，**单向**；raw 下载后只读。
- **路径原则**：单一事实源（manifest 唯一）、可发现性（manifest 即索引）、幂等（重跑只处理 delta）、不污染根目录。
- **禁止散落根目录裸目录**：`evidence/`、`reports/`、`screenshots/`、`output/`、`spark-output/`、`.planning/`、`.csp-*/` 等——所有 skill 产物一律落 `.csp/` 对应子区或 `docs/`。

### 1.3 三说明书（living baseline）

| 说明书 | 治理对象 | 建立阶段 | 更新节奏 |
|---|---|---|---|
| PMS 产品说明书 | PRD 质量、模块边界 | 01 | PRD/需求变更时增量 |
| CMS 代码说明书 | 代码入口点/调用链/约定 | 棕地设计前 / 05 开发期 | 开发期增量、06 verify 通过后全量 re-align |
| TMS 测试说明书 | 存量+增量用例、需求→方法矩阵 | 03 | 变更只产 delta 用例 |

---

## 二、文档管理：增 / 改 / 删 / 归档

### 2.1 新增文档（六步）

1. **判归属**：编程产物 → `.csp/` 对应子区；人读文档 → `docs/`；门面/元数据 → 根目录白名单。
2. **命名**：统一 slug / feature-id 命名，kebab-case（小写+连字符），描述性不超过 4 个词；文件名含稳定语义前缀（如 `SPEC-F-*-n.md`、`TMS-{module}.md`、`PMS-{module}.md`、`DATA-REPORT-{topic}-{date}.md`、`MARKET-RESEARCH-{date}.md`）。
3. **front-matter 必填**（实质页）：`type` / `confidence` / `sources` / `seeAlso` / `created` / `updated`；类型枚举 `module-spec|feature-spec|test-spec|concept|howto|reference|...`。废弃侧车 `.meta.json`。
4. **追溯锚点（单向）**：`.csp/` 产物 front-matter 锚定 `docs/` 原文（`prd_ref`/`original_ref`/`sources`）+ `.csp/` 内部互链（`spec_ref`/`task_id`/`feature_id`）；**`docs/` 原文不内嵌 `.csp/` 引用**（`.csp/` 易变，`docs/` 沉淀精确），双向映射由 manifest 承载。
5. **manifest 回写**：产出实质页后立即回写 `.csp/manifest.json`——对应 item 的 `source_type` + `build_status=built` + `content_hash`（用 git blob，禁 mtime）。**不回写=未完成**。
6. **索引同步**：新增目录/文档需更新 `docs/README.md` 索引与 `.csp/AGENTS.md` 路由表；重要变更同步中英 README 成对更新。

### 2.2 修改文档（delta 原则）

- **只改 delta**：各阶段重新执行时先读既有产物 diff，只改变更部分，不整篇重写。
- **stale 传播**：上游文档变更 → 沿追溯链把受影响下游标 `stale`，回写 manifest `build_status=degraded`，重置 `lifecycle-state.reconciled=false`，回到对应阶段重跑 delta。
- **版本一致**：VERSION / package.json / CHANGELOG 最新条目 / front-matter version 对齐；不一致以单一事实源（VERSION 或 package.json）为准改齐，CHANGELOG 补条目。
- **治理层与业务内容分离**：整改只动治理层（路径/版本/索引/front-matter/重复清理），**不改业务内容语义**；正文需改归对应阶段，不越权。
- **双语成对**：`README.md` / `README_zh.md` 必须同步更新，内容对应、版本号/统计/命令一致、章节结构一致。
- **幂等**：重跑只处理新 delta，已整改项不重复动。

### 2.3 删除与归档（默认保守）

- **归档移动 ≠ 删除**：一次性发布产物用 `mv` 移入 `.csp/milestones/{milestone}/`，manifest item 自动 re-point 到归档路径（改 `output_path`），保追溯，**不问"删还是 re-point"**；living baseline 与增量文档用 `cp -r` 快照归档（原件留 `.csp/` 继续演进）。
- **真正删除才人工确认**：临时产物（`.tmp/`、`*.zip`、WIP 草稿）可直接删；**业务文档删除必须人工拍板**（破坏性/不可逆操作）。
- **重复副本**：同主题多份 → 保留 canonical，副本删除；双语成对则两份都留并互链。
- **整改可回滚**：所有整改在 git 工作区进行，不 force 覆盖未提交内容；整改清单入册（`reconcile-log.md`：路径 | 类型 | 理由）。

### 2.4 查询与路由

- **manifest 是唯一索引**："有哪些知识产物"查 `manifest.json`（build_status）；"流水线走到哪步"查 `lifecycle-state.json`；两者互补，06 对账时互相校验。
- **进入 workspace 先读 `.csp/AGENTS.md`**：写入前读 schema/manifest；每阶段探测第 0 步查 `AGENTS.md` + `manifest.json` + `lifecycle-state.json`，不存在 → 先跑 00。
- **跨文档引用用节标题**（稳定），不用节号数字（避免增删节后错位）。

---

## 三、一致性约定（数量关系与 ID 纪律）

- **数量关系**：PRD `feature_count`（模块/域级）≈ decomposition 域数 ≤ decomposition 原子 Feature 数 == Spec 数（1:1 硬门控）；每份 P0/P1 Spec ≥1 Task。
- **Finding ID 前缀（防冲突）**：audit=`AUDIT-F-NN`、feature-gap=`GAP-F-NN`、07 review=`REV-F-NN`、03 TDD 评审=`TDD-REV-F-NN`、01 PRD 评审=`PRD-REV-F-NN`、critic=`CRITIC-F-NN`、ui-review=`UI-F-NN`。不同来源不混编，追溯按前缀路由。
- **单一事实源**：描述/触发词/元数据只在一处定义（如 SKILL.md `description:` frontmatter），其余全部派生；派生数据（registry/graph/triggers）**永远不手改**，改源后跑构建重建。
- **导航/常量/元数据防多副本**：同域单一事实源（R3 元数据多副本是反模式）；API URL 集中常量管理，禁硬编码散落。

---

## 四、版本与发布纪律

- **默认 SemVer**：X.Y.Z（MAJOR 不兼容 / MINOR 功能 / PATCH 修复）；**不自动用日期形式 tag**；CalVer 仅用户显式 opt-in。
- **战略主题号 ≠ 发布号**：roadmap 的 v2.0/v3.0 是愿景叙事，不是 tag。实际发布从上一 tag 增量续编：additive→MINOR+1，breaking API→MAJOR+1（仅 06 验证到实际 breaking 才 bump），fix→PATCH+1。
- **攒批发布，feat/fix 分轨**：多 feat 攒一个 MINOR、多 fix 攒一个 PATCH；同迭代既有 feat 又有 fix → 拆两个发布，不混版。
- **全生命周期追踪**：`released ≠ deployed ≠ prod-verified`；`.csp/ship/VERSION-REGISTRY.md` 记录 planned→released→deployed→prod-verified→rolled-back。
- **五方对齐**：tag ↔ package.json ↔ VERSION ↔ Release ↔ prod health；`prod_version ≠ latest_release`（线上跑的不一定是最新）；05 开始前检查 prod 版本对齐。
- **里程碑 ↔ 版本映射**：`lifecycle-state.milestone` 必须是 SemVer 版本号，不得用代号；代号放 `milestone_name`。

---

## 五、Git 与提交规范

- **两类产物两种策略**：`.csp/` 知识产物是共享基础设施 → **直接 commit 主干**（本地 commit 即可，不建 side branch，否则下游阶段读不到）；`src/` 代码 → 05 走 `feat/<scope>` worktree 分支，PR 合回主干。
- **自审通过即本地 commit**：自审 + 本阶段 gate 绿 → 立即原子 commit 到主干，不留"未提交"收尾态（不 commit=未完成）；**push remote 才 gate**（06 release 时）。
- **Conventional Commits**：`type(scope): 描述`；type ∈ `feat|fix|docs|refactor|test|ci|build|chore`；scope 取最具体 skill/area 名。基于意图选 type：修已有问题 `fix:`，新增能力 `feat:`；skill 定义变更（Markdown/JSON）算产品代码，不用 `docs:`。
- **安全红线**：不加未确认的 `!`/`BREAKING CHANGE:`；不 force push；不改 git config；不跳过 pre-commit hooks；提交前确认。
- **CHANGELOG**：遵循 Keep a Changelog 分节（Added/Changed/Deprecated/Removed/Fixed/Security）+ 版本统计表；每版本必更。

---

## 六、通用工程纪律

1. **知识中枢前置**：每阶段 step 0 探测 `.csp/AGENTS.md` + `manifest.json` + `lifecycle-state.json`；不存在 → 先跑 00，未初始化不进 01。
2. **阶段穷尽**：每阶段必须穷尽本阶段全部任务才可标 `done`（03 Spec 数==Feature 数是硬门控）；下游发现上游缺漏 → 停步路由回上游补全，不臆造、不绕过、不留尾巴。
3. **门控真实执行，禁止静默降级**：auto-proceed 只认真实执行（`ran: <命令> exit <code>`）；grep 替代 typecheck/test/build 等降级不算过。工具链不可用 → `BLOCKED` → 不发布、tag 标 `-draft`。
4. **默认优先**：可逆/非破坏/非外向决策一律默认自动执行不打断用户；**仅破坏性/不可逆/外向操作**（删 source、删业务文档、Git 发布）才人工拍板。问询只针对输入真缺失，不针对可默认的偏好。
5. **评审 gate 默认自动**：PRD 评审 auto 跑、findings 自动应用、无未解 Critical 自动 `Approved`；Git 发布 gate 即授权不再二次确认。
6. **状态推进 + 进度播报**：每阶段开始读 `lifecycle-state.json`（确认前置 done，明确"我是第 N 步、下一步是 Y"）+ 播报进度条；完成时写 state（status=done + progress 摘要计数，不存全量）+ `current_stage` 指向下一阶段 + 结束播报。
7. **设计先于编码、测试先于实现、验证先于完成**：声称完成前必须运行验证命令并给出真实输出；报告失败要说失败，跳过的步骤要说跳过。

---

## 七、写作与排版规范（全链路 Markdown 产物遵守）

- 标题层级 H1→H2→H3 不跳级；代码块标注语言。
- 中文排版：中英文之间加空格；默认中文，命令/路径/字段名保留英文。
- 仓库内链接用相对路径；图片统一放 `docs/images/`。
- 简单对比用表格，复杂数据用独立文档；路由表与目录结构用代码块/表格呈现。
- 架构图用 Mermaid（GitHub 原生渲染），单图 ≤15 节点，每图配 2–3 句文字说明，架构变更时同步更新。
- 公共 API 用 TSDoc/JSDoc 注释（参数、返回、异常、示例），代码即文档。
- `.csp/AGENTS.md` 用**电报体**：短句、规则式、无废话；6 节固定结构（项目概览/目录权威与依赖/三说明书定位/manifest 索引约定/操作路由表/闭环）。
- 临时草稿不入库、不提交（`临时草稿不要提交`）；临时脚本不提交 git；脚本输出文件加 `.gitignore`。

---

## 八、本仓库（CSP 自身）内容红线（新增/移植 Skill 时强制）

> 以上 §一–§七 是用这套方法论开发的**目标项目**的通用规则；本节是维护 CSP 仓库本身时的红线。

- **无作者信息**：禁 `author:`、个人姓名、署名/来源脚注。
- **无 LICENSE 文件**：skill 目录内禁 LICENSE/NOTICE/COPYING；包级许可仅根目录 `LICENSE`（MIT）。
- **无谱系字段**：frontmatter 禁 `origin:`；`source:` 仅允许指向公开项目；移植外部技能先确认许可证兼容（禁引入 NC/SA 限制性条款）。
- **无内部 URL**：禁 `*.alibaba-inc.com` 等内部域名；功能性 URL 用占位符 + 环境变量参数化。
- **无个人环境硬编码**：本机路径/端口用环境变量或相对路径参数化。
- **无构建产物**：`__pycache__/`、`*.pyc`、`*.bak`、`.DS_Store` 不入库。
- **Skill 命名**：目录 kebab-case、`csp-` 前缀、≤4 词；内部 `SKILL.md`（必填）+ `references/`/`scripts/`/`assets/`。
- **新增/删除/重命名 skill 的同步清单**：① `csp-router/triggers.yaml`（中英触发词，权重 40–50）→ ② `npm run build:all` 重建 registry/graph（派生数据永不手改）+ `npm run verify:graph` → ③ `SKILL-INDEX.md` → ④ `CHANGELOG.md` → ⑤ 中英 README 成对 → ⑥ Dashboard（如需）→ ⑦ `docs/INSTALL.md`（如安装器变更）。
- **构建/校验**：`npm run build:all`（一键重建）/ `npm run validate:all` / `npm test`（20 条不变量）。

---

## 快速自查（改动后过一遍）

```
□ 产物落位对了吗？（编程→.csp/，人读→docs/，门面→根目录，无根目录散落）
□ 命名符合 slug/前缀约定吗？
□ 实质页带 front-matter 并回写 manifest 了吗？
□ 上游变了，下游 stale 传播了吗？reconciled 重置了吗？
□ 只改了 delta，没整篇重写、没越权改正文语义吗？
□ 删除走人工确认了吗？归档 re-point 了吗？
□ 版本五方对齐了吗？SemVer/攒批/feat-fix 分轨了吗？
□ commit 消息 conventional 且 scope 具体吗？本地已原子 commit 吗？
□ 中英 README 成对同步了吗？CHANGELOG 补条目了吗？
□ 声称"完成/通过"前，验证命令真实跑过并贴了 exit code 吗？
```
