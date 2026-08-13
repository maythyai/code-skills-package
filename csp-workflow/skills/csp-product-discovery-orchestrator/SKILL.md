---
name: csp-product-discovery-orchestrator
description: |
  产品发现与交付前编排引擎。串联市场调研/竞品分析/用户反馈 → 产品策略与路线图 → 需求拆解与优先级 →
  PRD/用户故事/Spec 契约 → 交付桥接（capability contract）的完整链路，管理阶段间产物流转、门控检查、
  动态路由与迭代推进。是 14 个产品管理 skill 的上层编排器，覆盖"产品需求调研到交付给技术开发之前"
  的全流程；在交付边界把 capability contract 交给 csp-lifecycle-orchestrator 的 S2（技术选型），
  由后者接管 S1 拆解→S9 运维的技术生命周期。
  当用户需要"从调研到开发"、"产品发现全流程"、"PM 端到端"、"需求到交付前"时使用。
  关键词：产品发现、产品调研、PM 全流程、需求到交付、调研到开发、PRD 流程、
  product discovery、idea to spec、PM lifecycle、需求到技术开发、交付前流程、
  产品需求调研、产品管理流程、market to spec、discovery to dev。
version: "1.0.0"
layer: 2
category: workflow
phase: define
domain: architecture
scope: design
tools: [Read, Write, Edit, Glob, Grep, Bash]

dependencies:
  skills:
    - csp-market-research
    - csp-competitive-analysis
    - csp-user-feedback-analysis
    - csp-product-pulse
    - csp-product-metrics-review
    - csp-strategy
    - csp-roadmap-update
    - csp-brainstorming
    - csp-requirement-decomposition
    - csp-requirement-prioritization
    - csp-mvp-scoping
    - csp-prd-generation
    - csp-user-story-decomposition
    - csp-spec-contract
    - csp-product-capability

related_skills:
  - csp-lifecycle-orchestrator
  - csp-fullstack-spec-generator
  - csp-tech-stack-advisor
  - csp-tech-solution-design
  - csp-tech-design-review
  - csp-full

triggers:
  keywords: ["产品发现", "产品调研", "PM 全流程", "调研到开发", "需求到交付", "PRD 流程",
             "交付前流程", "产品管理流程", "product discovery", "idea to spec",
             "PM lifecycle", "需求到技术开发", "产品需求调研", "market to spec",
             "discovery to dev", "从调研到开发", "产品全流程"]
  intents:
    - "user wants the full product-management flow from research to dev handoff"
    - "user needs to go from market research to a dev-ready capability contract"
    - "user wants to orchestrate the pre-development PM lifecycle"
    - "user needs to hand off product requirements to engineering with constraints made explicit"
  context:
    - "new_product_idea"
    - "vague_product_requirement"
    - "pre_development_planning"

anti_rationalizations:
  "调研太慢，直接写 PRD": "跳过调研 = 用猜测替代证据。没有市场/竞品/用户反馈的 PRD 是拍脑袋的需求，返工成本远高于调研成本。"
  "竞品分析没必要，我们没竞品": "没竞品说明要么赛道太新（需验证市场存在性），要么没找全。后者更危险。"
  "PRD 里直接写技术实现省一轮沟通": "PRD 描述 WHAT 不描述 HOW。技术实现是工程决策权，混入 PRD 会绑架技术选型、模糊需求边界。"
  "不写 capability contract，直接把 PRD 丢给开发": "PRD 只说做什么，不说实现前必须成立哪些约束/不变量。丢给开发 = 把隐藏假设留给工程师猜，跨服务/跨团队时必出问题。"
  "一次性全量调研再启动": "调研是持续活动不是前置 gate。按 MVP 范围做够支撑决策的最小调研，剩余在迭代中补。"
---

# Product Discovery Orchestrator

产品发现与交付前编排引擎 — 从一句话产品想法到交付给技术开发前的结构化流水线。

## 定位与分工

```
┌─────────────────────────────────────────────────────────────────────┐
│                csp-product-discovery-orchestrator                    │
│          (编排层 — PM 全流程：调研 → 策略 → 需求 → 规格 → 交付桥接)    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  D1 调研      D2 策略       D3 需求塑形     D4 规格        D5 桥接   │
│  market-     strategy +    brainstorming + prd-generation  product-   │
│  research,   roadmap-      requirement-   user-story-     capability │
│  competitive,-update       decomposition,  decomposition,            │
│  user-feedback,            prioritization, spec-contract            │
│  product-pulse,            mvp-scoping                              │
│  product-metrics-review                                            │
│                                                                       │
│              ↓ D5 产出 capability contract（HANDOFF）                │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │        csp-lifecycle-orchestrator / fullstack-spec-generator     ││
│  │        (技术生命周期：S2 选型 → S3 Spec → … → S9 运维)           ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

**与 csp-lifecycle-orchestrator 的边界：**
- 本 skill = **PM 端**：调研 → 策略 → 需求塑形 → 规格 → 交付桥接（capability contract）
- `csp-lifecycle-orchestrator` = **工程端**：S1 需求拆解 → S2 技术选型 → … → S9 运维
- **串联点**：本 skill D5 产出 capability contract 后，交给 `csp-lifecycle-orchestrator` 的 S2（技术选型）起步；若对方已从 S1 起步，则 D5 的 capability contract 作为 S1 的输入种子
- 两者可独立使用：已有 PRD 只想跑工程端 → 直接用 lifecycle-orchestrator；只想做调研到 PRD 不想跑工程 → 只用本 skill 到 D4

## 生命周期阶段

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  D1          D2           D3            D4          D5                │
│  调研  →   策略  →   需求塑形  →    规格    →   交付桥接             │
│                                                                        │
│  research   strategy    requirement     spec       capability          │
│             + roadmap   shaping         contract   → dev handoff      │
│                                                                        │
│  →→→→→ 交付给技术开发之前 ◄ (D5 HANDOFF) ◄◄◄◄◄                       │
│                                                                        │
└──────────────────────────────────────────────────────────────────────┘
```

### Stage 1: 调研 (Research)

把"我觉得用户要这个"升级为"有证据支撑的需求假设"。

**执行 skill（按需组合，非全量必跑）：**
- `Skill("csp-market-research")` — 市场规模、趋势、赛道验证
- `Skill("csp-competitive-analysis")` — 竞品矩阵、差异化定位
- `Skill("csp-user-feedback-analysis")` — 现有用户反馈/工单/评论挖掘
- `Skill("csp-product-pulse")` — 在产产品的脉冲报告（仅 extend 模式或已有产品）
- `Skill("csp-product-metrics-review")` — 在产产品指标复盘（同上）

**输入：** 用户原始想法/需求（任意格式）+ 可选的在产产品数据源
**输出：** `.csp/discovery/RESEARCH-BRIEF.md`（市场判断 + 竞品矩阵 + 用户反馈摘要 + 在产信号 + 需求假设清单）
**门控：**
- 至少一条"需求假设"有证据来源标注（市场数据 / 竞品引用 / 用户反馈 / 指标信号）
- 无证据支撑的假设显式标记为 `[UNVERIFIED]`
**跳过条件：** 用户已提供完整调研材料，或 spec-only 模式

### Stage 2: 策略 (Strategy)

把调研结论锚定为产品策略，使后续需求决策有取舍依据。

**执行 skill：**
- `Skill("csp-strategy")` — 生成/更新 `STRATEGY.md`（目标问题 / 用户 / 方法 / 关键指标 / 工作轨道）
- `Skill("csp-roadmap-update")` — 落短期路线图，把轨道映射到时间

**输入：** `.csp/discovery/RESEARCH-BRIEF.md`
**输出：** `STRATEGY.md`（仓库根，README 同级）+ `.csp/discovery/ROADMAP.md`
**门控：**
- `STRATEGY.md` 存在且非空，含目标问题、主要用户、方法、指标、轨道五要素
- 关键指标 ≤ 5，且混搭 leading（周级可动）与 lagging（季度级）
- 无虚荣指标（总注册/总 PV 等）
**跳过条件：** `STRATEGY.md` 已存在且用户确认复用（仍需读它作 D3 种子）

### Stage 3: 需求塑形 (Requirement Shaping)

把策略意图发散收敛为原子级 Feature 清单，并切出 MVP 边界。

**执行 skill：**
- `Skill("csp-brainstorming")` — 发散方案、暴露假设、收敛选型（在拆解前）
- `Skill("csp-requirement-decomposition")` — 拆为原子 Feature，每个附用户故事/验收标准/前后端边界/数据实体/依赖
- `Skill("csp-requirement-prioritization")` — P0/P1/P2 标定
- `Skill("csp-mvp-scoping")` — 切 MVP 边界，验证核心假设

**输入：** `STRATEGY.md` + `.csp/discovery/RESEARCH-BRIEF.md`
**输出：** `.csp/decomposition/`（DECOMPOSITION-SUMMARY.md + FEATURE-DETAILS/*.yaml + DEPENDENCY-GRAPH.md）+ MVP 范围声明
**门控：**
- Feature 数 ≥ 1，每个 Feature 有验收标准
- 依赖图无环
- MVP 范围明确（哪些 P0 进 v1，哪些延后），且 MVP 至少验证一个核心假设
**跳过条件：** 已有 `.csp/decomposition/` 且用户确认复用

### Stage 4: 规格 (Specification)

把 Feature 清单固化为可评审、可追溯、工程可承接的规格。

**执行 skill：**
- `Skill("csp-prd-generation")` — 按产品类型（B2C/B2B/internal-tool/platform）分支出 `docs/prd/PRD-{feature}.md`，8 节结构 + 10 点自检
- `Skill("csp-user-story-decomposition")` — 把已批准 PRD 拆为可执行用户故事
- `Skill("csp-spec-contract")` — 固化为带可追溯 ID 的 SPEC 契约

**输入：** `.csp/decomposition/FEATURE-DETAILS/*.yaml` + MVP 范围
**输出：** `docs/prd/PRD-*.md` + `.csp/specs/`（SPEC-*.md + SPEC-INDEX.md）
**门控：**
- PRD 10 点自检全过（背景不空泛、目标可量化、用户具体、规则穷举、异常覆盖、AC 可测、埋点完整、无技术实现、优先级显式、估时落地）
- PRD 不含技术实现细节（无 DB 类型/语言/框架名）
- 用户故事可执行、SPEC 契约可追溯到需求 ID
**跳过条件：** 已有 `docs/prd/` + `.csp/specs/` 且覆盖当前 Feature 集

### Stage 5: 交付桥接 (Dev Handoff)

把"做什么"翻译为"实现前必须成立什么"，产出 capability contract，明确交付给技术开发的边界。

**执行 skill：**
- `Skill("csp-product-capability")` — 产出 SRS 式 capability contract：约束/不变量/接口/数据/安全/计费/未决问题 + HANDOFF 结论

**输入：** `docs/prd/PRD-*.md` + `.csp/specs/` + `STRATEGY.md` + 交付约束（auth/计费/合规/灰度/兼容/性能/评审策略）
**输出：** capability contract（写入 `PRODUCT.md` 或 `docs/product/` 或 `docs/examples/product-capability-template.md` 指向位置；无则新建）+ HANDOFF 结论
**门控（HANDOFF 必须三选一）：**
- `ready` — 可直接交付开发
- `needs-arch-review` — 需架构评审后再交付
- `needs-product-clarification` — 需产品澄清未决问题（回退 D3/D4）
**跳过条件：** 无（D5 是交付前最后一道，不可跳过——这是"交付给技术开发之前"的交付质量门）

## 模式选择

| 模式 | 适用场景 | 执行阶段 |
|------|---------|---------|
| `full` | 全新产品、需求模糊 | D1→D2→D3→D4→D5 全部 |
| `lightweight` | 小功能、模块增强 | D1(精简，仅竞品+用户反馈)→D3→D4→D5 |
| `spec-only` | 已有调研与策略，只要规格 | D3→D4→D5 |
| `extend` | 在产产品增量功能 | D1(pulse+metrics+user-feedback)→D3(增量)→D4→D5 |

## 产物流转图

```
用户想法/需求 (任意格式)
    │
    ▼ [D1: research cluster]
.csp/discovery/
    └── RESEARCH-BRIEF.md ─────────────────────┐
                                                │
    ▼ [D2: strategy + roadmap-update]          │
STRATEGY.md (repo root)                         │
.csp/discovery/ROADMAP.md                       │
                                                │
    ▼ [D3: brainstorming → decomposition →     │
    │      prioritization → mvp-scoping]        │
.csp/decomposition/                              │
    ├── DECOMPOSITION-SUMMARY.md ◄──────────────┘
    ├── FEATURE-DETAILS/*.yaml
    ├── DEPENDENCY-GRAPH.md
    └── MVP-SCOPE.md
    │
    ▼ [D4: prd-generation → user-story-decomposition → spec-contract]
docs/prd/
    └── PRD-{feature}.md
.csp/specs/
    ├── SPEC-F-*.md
    └── SPEC-INDEX.md
    │
    ▼ [D5: product-capability]
capability contract (PRODUCT.md / docs/product/)
    ├── CAPABILITY
    ├── CONSTRAINTS
    ├── IMPLEMENTATION CONTRACT
    ├── NON-GOALS
    ├── OPEN QUESTIONS
    └── HANDOFF: {ready | needs-arch-review | needs-product-clarification}
    │
    ▼ [交付边界 — 交给工程端]
csp-lifecycle-orchestrator S2 (技术选型)
  → S3 全栈Spec → S4 规划 → S5 开发 → … → S9 运维
```

## 动态路由规则

```yaml
routing_rules:
  # 输入评估 → 起始阶段 + 模式
  input_assessment:
    vague_idea:           # "帮我做一个XX"
      start: D1
      mode: full
    feature_with_market:  # 用户已做了些调研
      start: D2
      mode: full
    has_strategy:         # STRATEGY.md 已存在
      start: D3
      mode: full
      seed_from: STRATEGY.md
    existing_prd:         # 已有 PRD
      start: D4
      mode: spec-only
    in_production:        # 在产产品增量
      start: D1
      mode: extend
    small_feature:        # 小功能
      start: D1
      mode: lightweight

  # 门控失败 → 回退
  gate_failure:
    research_unverified:
      action: retry_D1_with_focus        # 聚焦到缺证据的假设
      max_retries: 2
    strategy_vanity_metrics:
      action: retry_D2_metrics_challenge  # 逼问"指标变差时能否发现"
    decomposition_incomplete:
      action: retry_D3
      max_retries: 2
    prd_self_check_failed:
      action: retry_D4_for_failed_items   # 只补不过的自检项
    handoff_needs_clarification:
      action: rollback_to_D3_or_D4         # 按 OPEN QUESTIONS 性质回退
      max_retries: 3
```

## 迭代管理

```yaml
iteration:
  # 本 skill 的迭代 = 增量需求再走 D1→D5
  next_iteration:
    mode: extend
    input: 增量需求（新功能/变更/优化）
    context: 上一轮的 RESEARCH-BRIEF / STRATEGY / decomposition / specs / capability
    delta_handling:
      new_features: full D3→D4→D5 for new features only
      modified_features: delta PRD + delta capability (ADDED/MODIFIED/REMOVED)
      removed_features: deprecation notice (交给 csp-deprecation-and-migration)
```

## 执行流程伪代码

```python
def run_discovery(user_input, config):
    # 1. 评估输入 → 确定模式和起始阶段
    assessment = assess_input(user_input)
    mode = config.mode or assessment.recommended_mode
    start_stage = assessment.start_stage

    # 2. 按阶段顺序执行
    stages = get_stages(mode, start_stage)  # D1..D5 子集，有序
    artifacts = {}

    for stage in stages:
        if should_skip(stage, artifacts, config):
            continue
        result = execute_stage(stage, user_input, artifacts, config)
        artifacts[stage] = result

        gate_result = check_gate(stage, result, config)
        if not gate_result.passed:
            if gate_result.needs_user_input:
                handle_decision(ask_user(gate_result))
            else:
                retry_or_rollback(stage, gate_result)

        if stage in config.gates.require_user_approval:
            if not request_approval(stage, result).approved:
                handle_rejection()

    # 3. D5 HANDOFF 结论决定终态
    handoff = artifacts.get("D5").handoff
    if handoff == "ready":
        point_to("csp-lifecycle-orchestrator", start="S2")
    elif handoff == "needs-arch-review":
        request_architecture_review()
    else:
        rollback_for_clarification(handoff.open_questions)
```

## 完成信号

```yaml
completion_signal:
  output: .csp/discovery-report.md
  status:
    stages_completed: "{{list}}"
    research_brief: ready
    strategy: anchored
    features: "{{count}}"
    mvp_scope: defined
    prds: "{{count}}"
    spec_contracts: "{{count}}"
    capability_handoff: "ready | needs-arch-review | needs-product-clarification"
    next_action: "hand to csp-lifecycle-orchestrator S2"
```

## 快速开始示例

```
用户: "我想做一个面向独立开发者的 AI 代码审查 SaaS，帮他们做 PR 评审"

Orchestrator 执行 (mode=full):
  1. 评估 → start=D1
  2. D1 调研:
     - market-research: AI 代码审查赛道规模、增长、付费意愿
     - competitive-analysis: GitHub Copilot Review / CodeRabbit / Greptile 矩阵
     - user-feedback-analysis: 抓独立开发者社区对现有工具的吐槽
     产出 .csp/discovery/RESEARCH-BRIEF.md（3 条带证据的需求假设）
  3. [门控] 假设有证据来源 ✓
  4. D2 策略: STRATEGY.md
     - 目标问题：独立开发者没钱雇人审 PR，却怕低质代码进主干
     - 用户：独立开发者 / 小团队 maintainer
     - 方法：聚焦 PR 级增量审查，不做全仓重构建议（差异化）
     - 指标：PR 采纳率(leading) / 周活(lagging)
     - 轨道：审查质量 / 集成深度 / 增长
  5. [门控] 指标非虚荣、≤5 ✓
  6. D3 需求塑形:
     - brainstorming → requirement-decomposition: 4 域 11 Feature
     - prioritization: P0=4 / P1=4 / P2=3
     - mvp-scoping: v1 = 4 个 P0（GitHub 接入/增量 diff 审查/评论回写/规则配置）
  7. [门控] MVP 验证"增量审查采纳率"假设 ✓
  8. D4 规格: 4 份 PRD（B2B-leaning 平台型）+ SPEC 契约，10 点自检全过
  9. D5 交付桥接: capability contract
     - CONSTRAINTS: 增量审查只看 diff、不存源码全文、评论必须可关闭
     - IMPLEMENTATION CONTRACT: GitHub App surfaces / webhook 状态机
     - OPEN QUESTIONS: 私有仓库鉴权模型待定
     - HANDOFF: needs-product-clarification（鉴权未决）
  10. 回退 D3 澄清鉴权 → D5 重出 HANDOFF=ready
  11. 交付 csp-lifecycle-orchestrator S2（技术选型）
```

## 关键原则

- **调研是证据不是仪式**：每条需求假设必须能指向一个来源；没证据就标 `[UNVERIFIED]` 而不是编造。
- **策略锚定取舍**：D2 的 STRATEGY.md 不是写口号，是让 D3 的优先级决策有依据。无策略直接拆需求 = 拍脑袋排序。
- **PRD 只说 WHAT**：D4 严禁技术实现细节；HOW 是工程端 S2/S3 的决策权。
- **交付前必过 capability 门**：D5 不可跳过。"交付给技术开发之前"的质量门就是把隐藏假设显式化为 capability contract。
- **不绑架工程端**：D5 HANDOFF=ready 才交付；needs-arch-review / needs-product-clarification 必须先回退处理，不把烂摊子丢给开发。

## Anti-Patterns

| Anti-Pattern | 症状 | 正确做法 |
|-------------|------|---------|
| 调研编造 | RESEARCH-BRIEF 里有市场规模数字但无来源 | 标 `[TBD]` 或 `[UNVERIFIED]`，不编 |
| 策略空泛 | STRATEGY.md 满篇"客户至上、快速迭代" | 逼问"方法 = 你比竞品多赌了什么" |
| PRD 越界 | PRD 写了"用 Redis 存会话" | 删掉，只写"会话需 < 50ms 读取" |
| 跳过 capability | D5 缺失，直接 PRD 丢开发 | 必跑 D5，把约束/不变量/未决问题显式化 |
| 全量调研阻塞 | D1 跑几周才进 D2 | 按 MVP 范围做最小够用调研，剩余迭代补 |

## Related Skills

- [[csp-lifecycle-orchestrator]] - D5 HANDOFF 后接管技术生命周期（S2 选型→S9 运维）
- [[csp-fullstack-spec-generator]] - D4/D5 之后生成全栈技术 Spec
- [[csp-tech-stack-advisor]] - 交付后的技术选型
- [[csp-full]] - 工程端执行导向（可与本 skill 的 D5 之后串联）
- D1 调研: [[csp-market-research]] [[csp-competitive-analysis]] [[csp-user-feedback-analysis]] [[csp-product-pulse]] [[csp-product-metrics-review]]
- D2 策略: [[csp-strategy]] [[csp-roadmap-update]]
- D3 需求塑形: [[csp-brainstorming]] [[csp-requirement-decomposition]] [[csp-requirement-prioritization]] [[csp-mvp-scoping]]
- D4 规格: [[csp-prd-generation]] [[csp-user-story-decomposition]] [[csp-spec-contract]]
- D5 桥接: [[csp-product-capability]]
