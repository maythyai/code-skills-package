---
name: csp-account-research
description: >
  B2B target-account batch research pipeline (orchestrator entry). A four-layer funnel
  (L1 quick-screen → L2 signal scan → L3 light research → L4 deep research → deliverable
  generation) progressively converges a candidate pool into a top target list, dispatching
  three sub-skills under references/ on demand. Each move is source-graded and traceable;
  no conclusion is fabricated. Deliverables land under docs/account-research/ (battle-handbook,
  decision-support, methodology, process-archive); orchestrator metadata under
  .csp/account-research/runs/<run_id>/; runtime state under .csp/account-research/state/<scope>/.
  Triggers: "帮我调研一批客户", "行业客户摸底", "批量客户筛选", "目标客户分析",
  "market research on X companies", "customer research pipeline", "B2B target account research",
  "扫描这批公司的采购信号", "signal scan", "信号扫描", "深入调研这家公司", "轻度调研",
  "deep research on company X", "把调研数据整理成作战手册", "生成客户攻坚方案",
  "generate research deliverables".
version: "1.0.0"
layer: 3
category: patterns
domain: patterns
phase: define
scope: analysis
tools: [Read, Write, Edit, Bash, Glob, Grep, WebFetch, WebSearch, Agent]

dependencies:
  skills: []

related_skills:
  - csp-product-research
  - csp-competitive-analysis
  - csp-market-research
  - csp-research-report-writing
  - csp-deep-research
  - csp-strategy

anti_rationalizations:
  "I'll skip Phase 0 and just start scanning": "brief.json is the single source of truth for the task. Without it locked, every downstream stage reads from conversation memory and drifts. Always run Phase 0 first."
  "The competitor list is obvious": "Never hardcode competitor vendors. The user's product and competing vendors are collected in Phase 0 and stored in brief.json. Defaults are empty."
  "I recall this company's signals": "Model memory is not a source. Every signal and conclusion must trace to a retrieved public source, or be marked [信息缺失]."
  "The gate is a formality": "G1–G6 are mandatory. A gate is never skipped because 'it seems fine'. Run check.sh + check-structure before showing any gate."

triggers:
  keywords: ["调研一批客户", "行业客户摸底", "批量客户筛选", "目标客户分析",
             "采购信号", "signal scan", "信号扫描", "深入调研", "轻度调研",
             "customer research pipeline", "B2B target account research",
             "作战手册", "客户攻坚", "调研交付物", "generate research deliverables",
             "L3", "L4", "account research"]
  intents:
    - "user wants to research a batch of B2B target accounts end-to-end"
    - "user has a company list and wants batch layering (signal scan only)"
    - "user wants a deep profile on one or a few companies"
    - "user has L2-L4 research data and wants deliverables (battle handbook, exec summary)"
  context: ["define", "strategy_planning", "before_prd_writing"]
---

# Account Research — B2B Target-Account Batch Research Pipeline (orchestrator)

> This skill operates in the **`define`** lifecycle phase. Read `shared/references/research-lifecycle-protocol.md` for the cross-cutting behavioral norms (zero fabrication, source grading A–E, time-window discipline, forced disconfirmation, evidence labeling) — they apply on top of this skill's own gates and anti-patterns.

## 术语约定（阅读下文前必看）

- **`<本技能目录>`** = 本 SKILL.md 所在目录 = 用户安装本技能后的实际路径。
  CSP 默认装到技能目录下（如 `~/.csp/skills/csp-account-research/` 或宿主技能目录），用户可自定义。**下文任何 `<本技能目录>`
  出现处，都用本 SKILL.md 的实际所在目录替换**（脚本里通过 `$(dirname "$0")/..`
  动态定位，无需硬编码）。
- **`<run_id>`** = 本次调研运行的唯一标识，缺省格式 `run-YYYYMMDD-N`（N 从 1 递增），
  用于把编排器元数据（request/handoff/gate-summary/sentinel）隔离到
  `$PWD/.csp/account-research/runs/<run_id>/` 子目录，多次调研互不污染。
- **子技能原文提到的 "account-research orchestrator"** = 本编排器。原套件的 account-research orchestrator
  技能已被吸收取代（其 Phase 0-5 workflow、brief.json 校验门、启动硬约束、
  State management、CSV 约束、CHANGELOG 格式全部搬到本文件与 `references/shared/`）；
  子技能原文里"退回 account-research orchestrator Phase 0"、"由 account-research orchestrator 调度"等
  描述性文字按语义映射为"退回本编排器 phase0 阶段"、"由本编排器调度"——
  详见下文「子技能间调用的适配协议」四条覆盖声明。

你是本流水线的**编排器**。你负责路由与编排 3 个子技能和 `scripts/check.sh`
确定性校验。子技能**不是宿主注册的技能**，而是本技能目录下的文件：

```
<技能目录>/                                ← 只放"程序"，不放产物
├── SKILL.md                              ← 你（编排器 / 路由器）
├── references/
│   ├── signal-scan/                   ← L2 执行器：13 维信号扫描 + A/B/C 分层
│   ├── depth-research/                ← L3/L4 执行器：轻度调研 + 20 维深度画像
│   ├── deliverable/                   ← Phase 5 执行器：D1-D8 交付物生成
│   └── shared/                           ← 原 account-research orchestrator 的共享资产
│       ├── account_research_toolkit.py                 ← 6 个工程化校验命令
│       ├── phase-0-task-definition.md    ← 启动四层收集 + brief.json 结构
│       ├── phase-0.5-validation.md       ← 方法论验证批次
│       ├── phase-1-pool-construction.md  ← L1 初始池构建
│       ├── phase-2-5-execution.md        ← Phase 2-5 门禁 / Resume / 名称校正
│       ├── anti-patterns.md              ← 10 类反模式（全流程必读）
│       ├── quality-checklist.md          ← 每 Phase 末尾自检清单
│       ├── cross-skill-data-handoff.md   ← 上下游容错与版本对齐
│       ├── cross-skill-fallback.md       ← 套件外技能调用的四步流程
│       ├── industry-type-adaptation.md   ← A/B/C/D 型行业差异化
│       ├── market-entry-barriers.md      ← 五层壁垒诊断
│       ├── differentiation-positioning.md← 三支点自检
│       ├── market-sizing-tam-sam-som.md  ← 市场规模分解
│       ├── progressive-convergence.md    ← 升降层信号与权重调整
│       └── batch-scoring-consistency.md  ← 三层保障防止标准漂移
└── scripts/
    └── check.sh                          ← doctor + gate 确定性校验
```

**运行时产物落用户当前工作目录**（$PWD 视为项目根，沿用原套件目录约定）：

```
$PWD/                                     ← 项目根（读者打开就能看到）
├── docs/account-research/battle-handbook/                          ← 一线 BD 直接使用（D1 + supporting/）
├── docs/account-research/decision-support/                          ← 高管决策支持（D2 + supporting/）
├── docs/account-research/methodology/                            ← 调研负责人（方法论 + supporting/）
├── docs/account-research/process-archive/                          ← L1/L2/L3/L4 中间产物 + 搜索留痕
├── CHANGELOG.md                          ← 每 Phase 自动追加
├── README.md                             ← Phase 5 结束时自动生成
├── .csp/account-research/state/<industry-slug>/             ← Agent 内部工作区
│   ├── brief.json                        ← Phase 0 锁定的任务配置
│   └── progress.json                     ← Agent 内部进度追踪
└── .csp/account-research/runs/<run_id>/                     ← 编排器元数据（读者不用进）
    ├── request.md                        ← 用户原始请求（逐字保存）
    ├── <阶段名>/handoff.md               ← 子技能待联动事项上交
    ├── <阶段名>/gate-summary.md          ← 每个 GATE 展示快照
    └── <阶段名>.ready                    ← 完成 sentinel
```

**为什么产物不走 .csp/account-research/runs/**：原套件的 `account_research_toolkit.py check-structure` 硬编码校验
`docs/account-research/battle-handbook/` `docs/account-research/process-archive/` 等路径，D1-D8 交付物路径与 CHANGELOG 追加规则也
写死了这套目录——迁走会破坏工程化校验。`.csp/account-research/runs/<run_id>/` 只承载编排器自己的
元数据（request/handoff/sentinel/gate 快照）。

## 三条设计不变量

1. **子技能调用 = 读文件照做**。调用子技能时，把对应的
   `references/<name>/SKILL.md` 读进上下文（或作为 subagent 的 system prompt），
   严格按其执行——其内部的工艺流程、硬约束、Quality Gate、
   Anti-patterns 原样保留，一条不减。绝不凭记忆复述。
2. **子技能之间只通过文件通信**。每个子技能的业务产物按原套件目录约定
   写入 `$PWD/` 对应位置；编排器元数据（handoff/ready）写
   `$PWD/.csp/account-research/runs/<run_id>/<阶段名>/`。编排器只认文件，不认口头承诺。
3. **无判断步骤进代码，判断留在技能里**。产物是否齐全由
   `scripts/check.sh` + `account_research_toolkit.py check-structure` 确定性验证；
   内容质量与是否推进下一阶段由用户在 GATE 决定。

## 启动交互硬约束（吸收自原 account-research orchestrator，不得违反）

Agent 在任何阶段都不得越界，禁止以下 6 类行为：

1. ❌ 跳过 Phase 0 直接进入 L1
2. ❌ 用默认值 / 行业常识 / 推断填补用户未明确提供的必填信息
3. ❌ 在用户未上传产品资料前推进到下一层（产品是必问）
4. ❌ 把多层问题合并成一长串「一口气问完」
5. ❌ 自答用户确认（「我假设你已确认，继续」）
6. ❌ 向用户暴露内部编号（L1/L2/L3/L4、D1-D8、Phase、brief.json 等）

启动后的全局交互顺序不得颠倒：

```
识别意图 → 建议启动 → 用户同意 → Phase 0 四层收集 → 产品资料消化
  → 启动确认单 → 用户回「确认」 → 写盘 brief.json → 进入 Phase 0.5 / Phase 1
```

任何下游 Phase（含子技能）启动前必须过「brief.json 校验门」，字段缺失一律退回
Phase 0。详见下文「编排核心约束」。

## 路由表（原套件的"触发词自动路由"由你接管）

| 用户意图 | 路由到 | 典型触发词 |
|---|---|---|
| 端到端调研一批客户 | 完整链 phase0 → phase1 → l2 → l3 → l4 → deliverable | 帮我调研一批客户 / 行业客户摸底 / 批量客户筛选 / 目标客户分析 / 量化私募-新能源-智能制造客户调研 / market research on X companies / customer research pipeline / B2B target account research |
| 已有公司名单，只做批量分层 | 单点执行 l2（先跑 phase0 补 brief.json） | 扫描这批公司的 AI 采购信号 / signal scan / 信号扫描 |
| 单家或少数家深挖 | 单点执行 l3 或 l4（先跑 phase0 补 brief.json） | 深入调研这家公司 / 轻度调研 / deep research on company X / L3 / L4 |
| 已有 L2-L4 调研数据，只出交付物 | 单点执行 deliverable（先跑 phase0 补 brief.json） | 把调研数据整理成作战手册 / 生成客户攻坚方案 / 出一份调研交付物 / generate research deliverables |

原套件各子技能 description 里的"通常由 account-research orchestrator 调用"**一律失效，
由你按下述编排链显式接管**——所有触发词命中本技能后，先看意图属完整链还是
单点出口，单点仍走对应 GATE。

**任何入口都必须先有 brief.json**：若 `.csp/account-research/state/<industry-slug>/brief.json`
不存在或字段缺失，无论用户从哪个入口进来，都先退回 phase0 补齐。

## 子技能间调用的适配协议（必须写进每个 subagent 的 brief）

子技能正文是套件时代的原文，里面按**注册名**引用兄弟技能（如 depth-research
提到"参见 account-research orchestrator 的 industry-type-adaptation.md"）。这些名字在本技能里
没有解析对象，且宿主中可能装有**同名独立技能（版本不一致）**。因此每次 spawn
subagent，brief 里必须包含以下覆盖声明，且声明优先级高于子技能正文的联动条款：

1. **嵌套工艺调用**：本套件无此类调用（3 个子技能都是链上独立阶段，不是阶段
   交付物内部工序）。
2. **下游触发一律上交**：子技能正文中所有对兄弟技能的"自动调用/强制触发/
   联动口令/退回上游"条款，subagent **不得自行执行**，改为把待联动事项写进
   `$PWD/.csp/account-research/runs/<run_id>/<阶段名>/handoff.md`（列出：目标子技能、输入数据、
   原文依据的条款、退回原因）。编排器读 handoff.md，按编排链和 GATE 接管。
   具体覆盖：
   - signal-scan/depth-research/deliverable 校验门失败时的
     "退回 account-research orchestrator Phase 0" → 改为写 handoff.md 上报
   - depth-research 的"完成 ≥ 4 家后横向对比" → 阶段内工序，不外调
3. **禁用宿主名字解析**：subagent 不得通过宿主 Skill 机制调用任何与子技能
   同名的技能（account-research orchestrator / signal-scan / depth-research /
   deliverable）——宿主里的同名独立技能与内嵌版内容可能不一致，且会绕过
   GATE。子技能工艺只能来自编排器随 brief 下发的 `references/` 文件。
   同时，原 account-research orchestrator 的资产路径 `<skill_dir>/references/xxx.md` 一律
   改写为 `<本技能目录>/references/shared/xxx.md`；子技能间的路径引用
   `<skill_dir>/../account-research orchestrator/references/xxx` 一律改写为
   `<本技能目录>/references/shared/xxx`。
4. **套件外技能维持原降级策略**：depth-research 引用 csp-strategy
   和 csp-paper-reader（"存在则用，不存在则 fallback 到内置模板"）、
   deliverable 引用 csp-research-report-writing（同样存在则用不存在则 fallback）、
   deliverable 的 When NOT to use 提到 a presentation/deck skill (e.g. csp-frontend-slides)（拒绝转派）——
   这些**不经编排器**，按原文降级策略处理，遵循
   `references/shared/cross-skill-fallback.md` 的四步流程。

## 用户确认门（GATE）

每个门必须停下来问用户，**绝不跳过**。

| Gate | 时机 | 展示什么 | 问什么 |
|---|---|---|---|
| **G1 启动确认单** | phase0 完成，brief.json 落盘前 | 四层前置信息摘要（用户角色/受众/深入程度/行业/产品/执行路径） | 是否确认启动 |
| **G2 方法论验证** | phase0.5 完成（首次进入新行业必经） | 验证报告 + 5 项调整决策 | 是否接受方法论调整 |
| **G3 L2 分层预览** | l2 完成 | A/B/C/信息缺失四级分层统计 + 边界公司清单 | 是否进入 L3 |
| **G4 L3 升降层判定** | l3 完成 | 升/降/维持判定 + 证据标签 | 是否进入 L4 |
| **G5 L4 TOP 名单** | l4 完成 | TOP 攻坚名单 + 20 维画像概览 | 是否进入交付物生成 |
| **G6 交付物门** | deliverable 章节大纲前置（生成前）+ 全部生成后 | 生成前：章节大纲；生成后：D1-D8 清单 + 术语净化自检结果 | 生成前：是否开始写正文；生成后：是否收尾 |

**本套件无外发动作**——所有产物落本地文件（项目根目录 + `.csp/account-research/state/`），不写
外部文档、不发消息、不改共享 MEMORY，故**无外发确认门**。G6 是本套件最接近
"外发"的门（产物即将被读者打开），因此设为双重门（大纲前置 + 完成收尾）。

每个 GATE 前必须先过 `bash scripts/check.sh gate <阶段> <run_id>`
（确定性完整性校验）+ `python references/shared/account_research_toolkit.py check-structure
--workspace $PWD --phase <当前Phase>`（原套件的目录合规校验），
避免拿半成品找用户确认。

任一门用户说"不行"：听取反馈 → 判定范围 → 重跑对应子技能 → 重新展示。

## 编排链

```
主链（端到端）：
  [phase0 任务定义与 brief.json 锁定]
      ↓ G1 启动确认单（必经）
  [phase0.5 方法论验证批次]（首次进入新行业必经，否则跳过）
      ↓ G2 验证报告（必经）
  [phase1 L1 初始池构建]（自动执行，无 GATE）
      ↓
  [l2 信号扫描 + A/B/C 分层]（子技能 signal-scan）
      ↓ G3 分层预览（必经）
  [l3 轻度调研 + 升降层判定]（子技能 depth-research L3 模式）
      ↓ G4 升降层判定（必经）
  [l4 深度调研 + TOP 名单]（子技能 depth-research L4 模式）
      ↓ G5 TOP 名单确认（必经）
  [deliverable D1-D8 生成]（子技能 deliverable）
      ↓ G6 章节大纲前置 + 交付物预览（双重门）
  收尾（CHANGELOG + README 自动生成）

单点出口：
  用户只要 l2 产物 → phase0 补 brief.json → l2 → G3 后收尾；
  用户只要 l3/l4 → phase0 → l3/l4 → G4/G5 后收尾；
  用户只要 deliverable → phase0 → deliverable → G6 后收尾；
  不强制走全链。

环回出口：
  l2 分层结果异常（边界公司过多/信息缺失过多） → 编排器建议重跑 phase1
    补池或调整 l2 阈值 → 用户确认后重入；
  l3 升降层判定推翻 l2 分层 → 编排器建议回 l2 重扫（携带 l3 反例）→
    用户确认后重入；
  l4 深度画像发现关键假设失效 → 编排器建议回 phase0 补 brief.json
    或调整产品资料 → 用户确认后重入。

套件外技能引用（仅提示边，不经编排器）：
  l4 横向对比 → csp-strategy / csp-paper-reader（存在则用）
  deliverable D2 → csp-research-report-writing（存在则用）
  deliverable 需 PPT → 拒绝转派到 a presentation/deck skill (e.g. csp-frontend-slides)（When NOT to use）

定时流：
  本套件无 cron / 周期性触发。
```

## 编排核心约束（吸收自原 account-research orchestrator）

1. **brief.json 校验门**（硬阻断）：进入 phase0.5 / phase1 及下游任何子技能前，
   必须执行以下校验：
   ```
   读取 .csp/account-research/state/<industry-slug>/brief.json：
   - 文件不存在 → 退回 phase0
   - 任一必填字段为空或为默认占位词（「未确认」/「待补充」/「默认」）→ 退回 phase0
   - products 为空或未经用户确认 → 退回 phase0 产品消化环节
   - 未检测到用户「确认」启动确认单的记录 → 退回启动确认单环节
   ```
   必填字段清单：`user_role` / `audience` / `depth` / `industry_name` /
   `products` / `execution_path`。
2. **进度留痕**：每 Phase 完成后更新 `.csp/account-research/state/<industry-slug>/progress.json`，
   记录完成时间、产物路径、人工确认状态。
3. **严格依赖**：Phase 不可跳步——l3 依赖 l2 分层（启用安全阈值流水线时，
   硬 A 公司可提前进入 l3，详见 `references/shared/phase-2-5-execution.md`）、
   l4 依赖 l3 升降层、deliverable 依赖 l4 深度数据。
4. **质量关卡**：无证据的结论一律标注 `[信息缺失]` 或 `[待验证]`，不得以推测填充。
5. **门禁不可绕过**：任一 Phase 启动前必须通过门禁校验
   （详见 `references/shared/phase-2-5-execution.md`）。
6. **Resume 支持**：执行中断后必须能从 progress.json 恢复，不得让人工确认节点失效。

## 质量规范（吸收自原 account-research orchestrator）

1. **证据链强制**：所有结论必须基于可追溯公开信息（URL/原文片段/发布日期）
2. **信息源覆盖**：国内外双语搜索，覆盖官网、招聘、技术社区、监管公告、
   行业媒体；不得仅依赖单一信息源
3. **产品名称合规**：严格使用 brief.json 中提供的产品名称体系，禁用模糊称谓
4. **竞对深度绑定判定**：四选二硬证据（竞对厂商默认为竞对厂商（brief.json 配置），
   可由 brief.json 配置覆盖；单家搜到列表外竞对则如实记录）
   - 公开采购合同 / 中标公告
   - 官方合作新闻 / 联合发布
   - 核心系统迁移痕迹（技术博客、招聘 JD 中明确提及）
   - 决策人公开背书（高管演讲、署名文章、专访）
5. **OCR 纠错与名称合并误用检测**：公司名搜索无结果时，主动尝试发音相近 /
   字形相近的候选名称；同时检查是否为「名称合并误用」（如将公募经理名+另一家
   私募名合成不存在的客户名）。发现名称错误时保留原始画像、校正标题、加 ⚠️
   校正说明——详见 `references/shared/phase-2-5-execution.md` Phase 2 段
6. **结论可追溯**：所有判断（A/B/C 分层、深度绑定、产品匹配）必须可追溯到
   具体证据
7. **证据强度标签**：使用统一 `[F]/[I]/[A]/[E]` 体系（详见 depth-research）

## CSV 输出全局硬约束（跨 Phase、跨子技能适用）

所有 `.csv` 产物（L1_初始池.csv / L2_全量信号扫描.csv / L3_升降层判定.csv /
L4_对比分析_*.csv / validation-batches/*.csv / 公司全景表.csv 等）必须同时满足：

1. **编码 = `utf-8-sig`**（UTF-8 with BOM）——不允许裸 `utf-8`。Excel
   （Windows 版与 Mac 版都一样）打开裸 UTF-8 CSV 不会自动识别为 UTF-8，
   会按系统默认编码解码导致中文乱码；BOM 是 Excel 跨平台识别 UTF-8 的
   唯一可靠触发点。
2. **行尾 = CRLF**——Python 写入时使用
   `open(path, "w", encoding="utf-8-sig", newline="")` + `csv.writer/DictWriter`
   （默认 `excel` dialect 会自动输出 CRLF）。
3. **读入也使用 `utf-8-sig`**：agent 读取上游 CSV（如读 L2 给下游）一律用
   `encoding="utf-8-sig"`，这样无论上游带不带 BOM 都能正确解析。
4. **字段包含逗号 / 换行 / 双引号时**交给 `csv` 模块转义，不要手拼字符串拼 CSV。

已生成的乱码 CSV 可以跑下面这个命令一键修：

```bash
python <本技能目录>/references/shared/account_research_toolkit.py fix-csv --workspace <项目根目录>
```

## CHANGELOG.md 格式规范

Agent 在每个 Phase 完成后自动追加一条记录，格式如下：

```markdown
## Phase X — <名称> | <日期>

- 产物：<列出本 Phase 生成的文件>
- 关键决策：<本 Phase 的重要决定或发现>
- 数据快照：<关键数字，如"A层 8 家 / B层 12 家 / C层 15 家">
- Quality Gate：<无 / QG-x 触发，用户选择 A/B/C>
```

如果用户在中途调整了方法论（如切换业务规模口径、新增竞对厂商、更改分层标准），
同样追加记录：

```markdown
## 方法论调整 | <日期>

- 变更：<具体变更内容>
- 原因：<用户确认 / agent 提议后用户确认>
- 影响范围：<影响哪些已生成文件，是否需要重新生成>
```

## 半自动模式说明

- **触发方式**：Agent 识别到符合路由表场景时，主动建议启动本技能并说明理由；
  用户确认后才启动。
- **强制人工确认节点**（不可绕过）：G1-G6 共 6 个门（见上文 GATE 表）。
- **默认自动执行**：phase1 L1 初始池构建、l2 扫描执行、l3 分批调研、
  l4 深度挖掘、deliverable D1-D8 生成。
- **用户可随时暂停**：执行中用户可口令"暂停/审核"，Agent 立即停止当前批次，
  输出已完成内容供审阅。

## 逐步流程

### Step 0 — preflight

**SKILL_DIR 动态定位**（不硬编码宿主路径，兼容任意安装位置）：Agent 通过读取本
SKILL.md 时的实际路径推导——如宿主加载路径是
`~/.csp/skills/csp-account-research/SKILL.md`，则
`SKILL_DIR=~/.csp/skills/csp-account-research`。

```bash
# SKILL_DIR = 本 SKILL.md 所在目录（Agent 从加载路径推导，此处仅为示例）
SKILL_DIR="<本技能目录>"
RUN_ID="run-$(date +%Y%m%d)-1"                     # 缺省格式，同日多次运行递增 N

bash "$SKILL_DIR/scripts/check.sh" doctor          # 校验子技能文件在位
mkdir -p "$PWD/.csp/account-research/runs/$RUN_ID"                    # 创建本次运行的元数据目录
```

把用户的原始请求**逐字**写入 `$PWD/.csp/account-research/runs/<run_id>/request.md`
——不总结、不翻译。这是"用户到底要什么"的唯一事实源，子技能从这里读，
不从对话记忆猜。

### Step 1 — 路由

按路由表判定走哪条链或单点执行。把判定结果（1 行）告知用户后开始执行；
意图不明时先问，不猜。**任何入口都必须先检查 brief.json**，缺失则退回 phase0。

### Step 2 — 执行子技能（每个阶段重复此协议）

1. **读取本技能 SKILL.md 的对应 Phase 章节** + `references/shared/phase-*.md`
   详细规则（phase0 读 phase-0-task-definition.md，phase0.5 读
   phase-0.5-validation.md，phase1 读 phase-1-pool-construction.md，
   phase2-5 读 phase-2-5-execution.md）。
2. **调用子技能时**（l2/l3/l4/deliverable）：读取
   `references/<name>/SKILL.md` 全文，严格照做（其自带的 references/
   资料按其正文链接按需加载）；宿主支持 subagent 时 spawn 一个，把
   SKILL.md 全文 + 其资料目录路径 + `request.md` 路径 + 本阶段输出目录
   交给它。
3. **brief 中必须附上"子技能间调用的适配协议"四条覆盖声明**。
4. **向子技能附加统一输出契约**：
   - 业务产物按原套件目录约定写入 `$PWD/` 对应位置
     （如 `docs/account-research/process-archive/L2_全量信号扫描.csv`）；
   - 有待联动事项写 `$PWD/.csp/account-research/runs/<run_id>/<阶段名>/handoff.md`；
   - 完成后 `touch $PWD/.csp/account-research/runs/<run_id>/<阶段名>.ready`；
   - 每 Phase 完成后追加一条记录到 `$PWD/CHANGELOG.md`。
5. **阶段结束跑确定性校验，通过后才进 GATE**：

```bash
bash "$SKILL_DIR/scripts/check.sh" gate <phase0|phase1|l2|l3|l4|deliverable> <run_id>
python "$SKILL_DIR/references/shared/account_research_toolkit.py" check-structure \
  --workspace "$PWD" --phase <当前Phase编号>
```

同时读取 handoff.md，把待联动事项并入编排链的下一步。

### Step 3 — GATE 交互

按 GATE 表在对应节点停下确认。展示内容写进
`$PWD/.csp/account-research/runs/<run_id>/<阶段名>/gate-summary.md` 留档，得到明确同意后才推进
下一阶段；不同意则按用户反馈重跑对应子技能。

### Step 4 — 交付

Phase 5（deliverable）完成后：
1. 自动生成/更新 `$PWD/README.md`（含按角色的 3 步阅读路径）
2. 追加最后一条 CHANGELOG.md 记录
3. 报告本次 run 的产物清单：`$PWD/` 下按读者目录分放的最终交付物 +
   `$PWD/.csp/account-research/runs/<run_id>/` 下的编排器元数据 + 建议的下一步动作。

## Agent 必读流程

1. 进入新任务时，先读本文件顶部「启动交互硬约束」+
   `references/shared/anti-patterns.md`
2. Phase 0 启动前，读 `references/shared/phase-0-task-definition.md`
   按四层结构对话式收集前置信息，由上而下严格遵守三个硬约束：
   反模式清单 / 交互方式映射 / 启动确认单
3. 进入任何下游 Phase 或调用任何子技能前，必须过 brief.json 校验门
   （见「编排核心约束」第 1 条）
4. 每个 Phase 启动前，读对应 `references/shared/phase-*.md` +
   校验该 Phase 门禁
5. 每个 Phase 结束时，运行 `references/shared/quality-checklist.md` 对应清单
6. 每个 Phase 结束时，执行落盘确认：
   `python <本技能目录>/references/shared/account_research_toolkit.py check-structure
   --workspace <项目根目录> --phase <当前Phase编号>`。输出 WARN 时立即将本
   Phase 产出写入正确目录后再进入下一 Phase。
7. 任何中断后恢复执行，先读 progress.json +
   `references/shared/phase-2-5-execution.md` 中的 Resume 流程

## DON'Ts

- ❌ 不跳过任何 GATE——G1-G6 六个门一个都不能省，尤其 G1 启动确认单
  （brief.json 未锁定就进 Phase 1 是最常见事故）。
- ❌ 不在编排层自己做子技能的判断类工作——编排器只做路由、校验、展示。
  L2 评分、L3 升降层、L4 二十维画像、D1-D8 生成一律交给对应子技能，
  orchestrator 不得"自行模拟"（原套件明令禁止的反模式）。
- ❌ 不凭记忆执行子技能——每次调用前重新读 `references/<name>/SKILL.md`。
- ❌ subagent 不得调用宿主注册的任何同名技能（account-research orchestrator /
  signal-scan / depth-research / deliverable），也不得自行执行
  子技能正文里的"自动触发/退回上游"条款——联动一律经 handoff.md 上交编排器。
- ❌ 不删减子技能内部的工艺与硬约束（Quality Gate、Anti-patterns、
  证据强度配比、CSV 编码约束、术语净化清单）——编排器无权降级子技能的质量标准。
- ❌ 不把业务产物写进技能目录或 `.csp/account-research/runs/`——业务产物只落在 `$PWD/` 的
  `docs/account-research/battle-handbook/` `docs/account-research/decision-support/` `docs/account-research/methodology/` `docs/account-research/process-archive/` `.csp/account-research/state/`
  等原套件约定路径；`.csp/account-research/runs/<run_id>/` 只放编排器元数据
  （request/handoff/gate-summary/sentinel）。
- ❌ 不在 `check.sh gate` + `account_research_toolkit.py check-structure` 双校验未通过时
  向用户展示 GATE。
- ❌ 子技能未 touch `.ready` 就视为未完成，哪怕产物文件已存在。
- ❌ 不向用户暴露内部编号（L1/L2/L3/L4、D1-D8、Phase、brief.json 等）——
  用自然语言描述进度与产物。
