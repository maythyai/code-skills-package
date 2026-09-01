---
name: csp-lifecycle-orchestrator
description: |
  产品全生命周期编排引擎。串联需求拆解→技术选型→全栈Spec→实施规划→并行开发→测试→审查→发布→运维
  的完整链路，管理阶段间产物流转、门控检查、动态路由和迭代推进。
  是 csp-requirement-decomposition、csp-tech-stack-advisor、csp-fullstack-spec-generator 的
  上层编排器，同时与 csp-full 互补（csp-full 侧重执行，本 skill 侧重规格化拆解与选型）。
  当用户需要"从需求到上线的完整流程"、"自动化产品开发全链路"时使用。
  关键词：全生命周期、lifecycle、端到端编排、产品迭代、从需求到上线、
  full lifecycle、product lifecycle、orchestrate、编排、全链路、
  需求到产品、idea to launch、requirement to production、完整开发流程、
  自动化开发、automate development、product pipeline、开发流水线。
version: "1.0.0"
layer: 2
category: workflow
phase: define
domain: architecture
scope: design
tools: [Read, Write, Edit, Glob, Grep, Bash]

dependencies:
  skills:
    - csp-requirement-decomposition
    - csp-tech-stack-advisor
    - csp-tech-solution-design
    - csp-tech-design-review
    - csp-fullstack-spec-generator
    - csp-tech-task-breakdown

related_skills:
  - csp-full
  - csp-implementation-phase
  - csp-verify-phase
  - csp-ship
  - csp-plan-phase
  - csp-tdd
  - csp-code-review
  - csp-product-discovery-orchestrator
  - csp-effort-estimation
  - csp-tech-risk-assessment
  - csp-product-spec
  - csp-code-spec
  - csp-test-spec
  - csp-knowledge-hub

triggers:
  keywords: ["全生命周期", "lifecycle", "端到端", "从需求到上线", "完整开发流程",
             "产品迭代", "全链路", "自动化开发", "开发流水线", "product pipeline"]
  intents:
    - "user wants complete product development lifecycle automation"
    - "user needs orchestration from requirements to production"
    - "user wants to build a product from scratch with full process"
  context:
    - "complex_product_requirement"

anti_rationalizations:
  "Let's skip the spec phase and just code": "Skipping specs causes rework. The spec phase pays for itself."
  "We can do tech selection during implementation": "Mid-implementation tech changes are 10x more expensive."
  "This is too small for the full lifecycle": "Scale the lifecycle down, don't skip stages. Even a 1-feature module benefits from structured spec."
---

# Lifecycle Orchestrator

产品全生命周期编排引擎 — 从一句话需求到生产上线的结构化流水线。

## 定位与分工

```
┌─────────────────────────────────────────────────────────────────┐
│                    csp-lifecycle-orchestrator                     │
│                    (编排层 — 决策 + 流转 + 门控)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ requirement- │→│ tech-stack-  │→│ tech-solution-       │   │
│  │ decomposition│  │ advisor      │  │ design               │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│         ↓                                       ↓                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  tech-design-review  →  fullstack-spec-generator          │   │
│  │  tech-task-breakdown  →  csp-full / implementation-phase  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**与 csp-full 的关系：**
- `csp-full` = 执行导向（P0-P8 快速推进，适合需求已明确的场景）
- `csp-lifecycle-orchestrator` = 规格化导向（深度拆解 + 选型 + Spec，适合需求模糊或系统复杂的场景）
- 两者可串联：orchestrator 完成 Spec 后，交给 csp-full 的 P4+ 执行

## Module Spec 治理层（PMS / CMS / TMS）

与 S1–S9 并行运行的**治理层** —— 三个 living baseline 说明书，由对应 skill 维护，下游阶段读它们再产出：

| 说明书 | Skill | 治理对象 | 在生命周期中的角色 |
|--------|-------|---------|-------------------|
| **PMS** 产品说明书 | `csp-product-spec` | PRD 生成质量 | S1 前建立模块边界 + 验收形态；S13 增量 delta |
| **CMS** 代码说明书 | `csp-code-spec` | 设计/拆分/生码/CR | 棕地接手时蒸馏；每次 ship 后 auto-align |
| **TMS** 测试说明书 | `csp-test-spec` | 测试用例（存量+增量） | PMS 分支；S5 后建存量；变更只产出增量 |

**与阶段的关系（不是额外阶段，是治理旁路）：**

- S1 需求拆解 → 读 PMS 模块边界（不得越界）
- S3 技术方案 → 读 CMS 入口点/调用链（ground design，不靠想象）
- S5 全栈 Spec → 读 CMS 交叉引用入口；种子 TMS 需求矩阵
- S8 并行开发 → 生码读 CMS 约定（匹配既有模式）
- S10 审查验证 → CR 读 CMS 追溯调用链；读 TMS 存量只产增量用例
- S11 发布 → PMS 闭环（每条验收可追溯到需求）
- S13 变更/迭代 → 三说明书均以 delta 增量，里程碑折叠进 canonical

详细行为准则见 `csp-workflow/references/module-spec-lifecycle-norms.md`；
运行时纪律（断点续跑、文件边界、双重门禁、原子单元）见 `csp-workflow/references/module-spec-operational-protocol.md`。

## 生命周期阶段

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                               │
│  S0  hub init │ S1          S2           S2.5         S2.6        S3    S3.5 │
│  知识中枢初始化│ 需求拆解 → 技术选型 → 技术方案 → 方案评审 → 全栈Spec → 任务拆解│
│  (本地 markdown│                                                              │
│   +git+manifest)│ S4          S5           S6           S7          S8   S9  │
│               │ 实施规划 → 并行开发 → 质量门控 → 审查验证 → 发布交付 → 运维监控│
│                                                                               │
│  (迭代: 回到 S1 增量，hub 持续索引每阶段产物)                                  │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 0: Hub 初始化 (Knowledge Hub Init)

**执行:** `Skill("csp-knowledge-hub")`

**定位:** 生命周期的**第一步**。建立本地知识中枢（`.csp/AGENTS.md` + `manifest.json`），让后续每阶段的 spec/wiki/memory 产物可索引、可定位、可追溯，闭环需求→code→test。

**输入:** 项目根（git 仓库）、资料源根（docs/）、项目名
**输出:** `.csp/AGENTS.md`（路由契约）、`.csp/manifest.json`（唯一索引）、hub 工作区骨架
**门控:**
- `AGENTS.md` 6 节齐全 + 操作路由表
- `manifest.json` 存在且 schemaVersion 记录
- git 仓库可写（`CSP_GIT_REMOTE` 默认 github.com）

**跳过条件:** `.csp/AGENTS.md` + `manifest.json` 已存在且 `doctor` 通过 → 复用，不重建

**与治理层关系:** hub init 在 PMS 建立模块边界**之前**；PMS/CMS/TMS 产物生成后回写 manifest `build_status=built`，使 hub 成为三说明书的统一索引层。

### Stage 1: 需求拆解 (Requirement Decomposition)

**执行:** `Skill("csp-requirement-decomposition")`

**输入:** 用户原始需求（任意格式）
**输出:** `.csp/decomposition/` 全套产物
**门控:** 
- Feature 数 ≥ 1
- 每个 Feature 有验收标准
- 依赖图无环

**跳过条件:** 已有 `.csp/decomposition/` 且用户确认复用

### Stage 2: 技术选型 (Tech Stack Selection)

**执行:** `Skill("csp-tech-stack-advisor")`

**输入:** `.csp/decomposition/DECOMPOSITION-SUMMARY.md`
**输出:** `.csp/tech-decisions/` 全套产物
**门控:**
- 每个技术维度有明确选择
- ADR 数量 ≥ 3（语言、框架、数据库至少要有）
- 技术栈一致性检查通过

**跳过条件:** 已有 `.csp/tech-decisions/` 或用户指定了完整技术栈

### Stage 2.5: 技术方案设计 (Technical Solution Design)

**执行:** `Skill("csp-tech-solution-design")`

**输入:** `.csp/decomposition/` + `.csp/tech-decisions/` + `PRODUCT.md`
**输出:** `.csp/tech-design/` 全套产物
**门控:**
- 系统架构设计完成（服务/模块划分 + 部署拓扑）
- 数据架构设计完成（全局 ER 图 + 数据流）
- 关键技术难点有攻克方案
- 至少 2 个方案对比有结论

**跳过条件:** 已有 `.csp/tech-design/` 且用户确认复用

### Stage 2.6: 技术方案评审 (Technical Design Review)

**执行:** `Skill("csp-tech-design-review")`

**输入:** `.csp/tech-design/` 全套产物
**输出:** `.csp/tech-design/REVIEW-FINDINGS.md`
**门控:**
- 无 CRITICAL 级别发现
- WARNING 级别发现 ≤ 3 个
- 评审结论为 APPROVED 或 APPROVED_WITH_MINOR_CHANGES

**跳过条件:** 项目复杂度为 S 级别（简单 CRUD），或用户确认跳过评审

### Stage 3: 全栈 Spec 生成 (Full-Stack Spec Generation)

**执行:** `Skill("csp-fullstack-spec-generator")`

**输入:** `.csp/decomposition/FEATURE-DETAILS/*.yaml` + `.csp/tech-decisions/`
**输出:** `.csp/specs/` 全套产物
**门控:**
- 每个 P0/P1 Feature 有完整 Spec
- Spec 包含 Schema + API + UI 三个核心维度
- API 契约前后端一致

**跳过条件:** 已有 `.csp/specs/` 且覆盖当前 Feature 集

### Stage 3.5: 任务拆解 (Task Breakdown)

**执行:** `Skill("csp-tech-task-breakdown")`

**输入:** `.csp/tech-design/` + `.csp/specs/`
**输出:** `.csp/tasks/` 全套产物
**门控:**
- 每个 Feature 有对应任务
- 任务粒度 ≤ 4h
- 依赖 DAG 无环
- Waves 划分合理

**跳过条件:** 项目复杂度为 S 级别，或用户已有任务管理工具

### Stage 4: 实施规划 (Implementation Planning)

**执行:** 内置逻辑 或 `Skill("csp-plan-phase")`

**输入:** `.csp/specs/` + `.csp/decomposition/DEPENDENCY-GRAPH.md`
**输出:** `.csp/plan/IMPLEMENTATION-PLAN.md`

**规划内容：**
```markdown
# Implementation Plan

## 任务分解 (从 Spec 到 Task)
| Task ID | Feature | 描述 | 依赖 | 估时 | Wave |
|---------|---------|------|------|------|------|
| T1 | F-A-1 | DB migration: features 表 | - | 0.5h | 1 |
| T2 | F-A-1 | API: CRUD endpoints | T1 | 2h | 2 |
| T3 | F-A-1 | Frontend: 列表页+详情页 | T2 | 3h | 3 |
| T4 | F-B-1 | DB migration: orders 表 | - | 0.5h | 1 |
| ...

## 并行策略
- Wave 1: 所有 DB migration (可并行)
- Wave 2: 所有后端 API (可并行，按 Feature 分)
- Wave 3: 所有前端页面 (可并行)
- Wave 4: 集成测试 + E2E

## 里程碑
- M1 (Day 1-2): 基础设施 + 核心数据模型
- M2 (Day 3-5): 核心业务 API + 前端
- M3 (Day 6-7): 增强功能 + 测试 + 修复
```

**门控:** 任务覆盖所有 P0/P1 Feature 的 Spec

### Stage 5: 并行开发 (Parallel Execution)

**执行:** `Skill("csp-full")` Phase 4 或 `Skill("csp-implementation-phase")`

**策略：**
- 按 Wave 顺序执行
- 同 Wave 内可 spawn 并行 subagent
- 每个 Task 遵循对应 Spec
- 原子提交，每个 Task 一个 commit

**门控:** 所有 Task 完成 + build 通过

### Stage 6: 质量门控 (Quality Gate)

**执行:** `Skill("csp-tdd")` + 构建验证

**检查项：**
- [ ] 单元测试全部通过
- [ ] 集成测试覆盖核心路径
- [ ] Lint / TypeCheck 零警告
- [ ] Build 成功
- [ ] 无 CRITICAL 安全漏洞

**门控:** 所有 CRITICAL 测试通过，覆盖率达标

### Stage 7: 审查验证 (Review & Validation)

**执行:** `Skill("csp-code-review")` + `Skill("csp-verify-phase")`

**检查项：**
- [ ] 代码审查无 CRITICAL 问题
- [ ] Spec 对齐验证（每个验收标准逐一核对）
- [ ] 安全扫描通过
- [ ] 性能基准达标（如有要求）

**门控:** 审查通过 + Spec 对齐 ≥ 90%

### Stage 8: 发布交付 (Ship & Deliver)

**执行:** `Skill("csp-ship")` 或 `Skill("csp-full")` Phase 7

**产物：**
- Git tag
- CHANGELOG.md 更新
- Release notes
- 部署（如适用）
- API 文档发布

### Stage 9: 运维监控 (Post-Launch)

**执行:** 内置逻辑

**产物：**
- 监控配置建议
- 告警规则
- 已知问题清单
- 下一迭代建议

## 编排配置

```yaml
# .csp/lifecycle-config.yaml
lifecycle:
  mode: full              # full | lightweight | spec-only
  stages:
    - decomposition
    - tech-selection
    - tech-solution-design
    - tech-design-review
    - spec-generation
    - task-breakdown
    - planning
    - execution
    - quality-gate
    - review
    - ship
    - post-launch
  
  gates:
    require_user_approval:
      - after_decomposition       # 拆解后确认 Feature 清单
      - after_tech_selection      # 选型后确认技术栈
      - after_tech_design_review  # 方案评审后确认技术方案
      - before_ship               # 发布前确认
    auto_pass:
      - quality_gate           # 测试通过即自动进入下一阶段
      - review                 # 无 CRITICAL 即通过
  
  iteration:
    auto_advance: false        # 完成后是否自动进入下一迭代
    milestone_archive: true    # 每个里程碑归档到 .csp/milestones/
  
  scaling:
    # 根据项目规模自动调整深度
    small:  # ≤5 features
      spec_depth: concise
      skip_stages: [post-launch]
    medium:  # 6-15 features
      spec_depth: standard
    large:  # >15 features
      spec_depth: comprehensive
      parallel_execution: true
```

## 模式选择

| 模式 | 适用场景 | 执行阶段 |
|------|---------|---------|
| `full` | 全新产品、复杂系统 | S1-S9 全部 |
| `lightweight` | 小功能、模块集成 | S1(精简) → S2(精简) → S3(精简) → S3.5(精简) → S5 → S6 → S7 |
| `spec-only` | 只需要规格文档，不执行 | S1 → S2 → S2.5 → S2.6 → S3 → S3.5 → S4 |
| `extend` | 已有系统新增功能 | S1(增量) → S2(增量) → S2.5(增量) → S3 → S3.5 → S5 → S6 → S7 → S8 |

## 产物流转图

```
用户需求 (任意格式)
    │
    ▼ [S1: requirement-decomposition]
.csp/decomposition/
    ├── DECOMPOSITION-SUMMARY.md ─────────────────────┐
    ├── FEATURE-DETAILS/*.yaml ──────────────┐        │
    └── DEPENDENCY-GRAPH.md ─────────────┐   │        │
                                         │   │        │
    ▼ [S2: tech-stack-advisor]           │   │        │
.csp/tech-decisions/                     │   │        │
    ├── TECH-STACK-OVERVIEW.md ──────┐   │   │        │
    ├── ADR/*.md                     │   │   │        │
    └── TECH-DECISIONS-SUMMARY.md ───┤   │   │        │
                                     │   │   │        │
    ▼ [S2.5: tech-solution-design]   │   │   │        │
.csp/tech-design/                     │   │   │        │
    ├── ARCHITECTURE-DESIGN.md ──────┤   │   │        │
    ├── DATA-ARCHITECTURE.md         │   │   │        │
    ├── INTERFACE-ARCHITECTURE.md    │   │   │        │
    └── TECH-DESIGN-SUMMARY.md ──────┤   │   │        │
                                     │   │   │        │
    ▼ [S2.6: tech-design-review]     │   │   │        │
.csp/tech-design/                     │   │   │        │
    └── REVIEW-FINDINGS.md            │   │   │        │
                                     │   │   │        │
    ▼ [S3: fullstack-spec-generator] │   │   │        │
.csp/specs/                          │   │   │        │
    ├── SPEC-F-*.md ◄────────────────┘   │   │        │
    ├── API-OVERVIEW.md                  │   │        │
    └── SPEC-INDEX.md                    │   │        │
                                         │   │        │
    ▼ [S3.5: tech-task-breakdown]        │   │        │
.csp/tasks/                              │   │        │
    ├── WBS.md                           │   │        │
    ├── TASK-CARDS/*.md                  │   │        │
    ├── DEPENDENCY-DAG.md                │   │        │
    └── TASK-BREAKDOWN-SUMMARY.md ───────┤   │        │
                                         │   │        │
    ▼ [S4: planning]                     │   │        │
.csp/plan/                               │   │        │
    └── IMPLEMENTATION-PLAN.md ◄─────────┘   │        │
                                             │        │
    ▼ [S5-S9: execution pipeline]            │        │
.csp/milestones/v{N}/                        │        │
    ├── code changes                         │        │
    ├── test results                         │        │
    ├── review findings                      │        │
    └── release artifacts                    │        │
                                             │        │
    ▼ [迭代: 增量需求]                        │        │
回到 S1 (增量模式) ◄─────────────────────────┘        │
                                                      │
用户确认 ◄────────────────────────────────────────────┘
```

## 动态路由规则

```yaml
routing_rules:
  # 输入评估 → 起始阶段
  input_assessment:
    no_hub:            # .csp/AGENTS.md + manifest.json 不存在
      start: S0        # 先 hub init 再进生命周期
      mode: full
    vague_idea:        # "帮我做一个XX"
      start: S1
      mode: full
    feature_list:      # 用户列了功能但无技术细节
      start: S1
      mode: full
      skip: []
    detailed_prd:      # 完整 PRD + 技术约束
      start: S2        # 跳过拆解，直接选型
      mode: full
    existing_specs:    # 已有 spec 文件
      start: S4        # 直接规划
      mode: full
    module_extension:  # "在现有系统加个XX模块"
      start: S1
      mode: extend
    quick_feature:     # "加个小功能"
      start: S1
      mode: lightweight

  # 门控失败 → 回退
  gate_failure:
    decomposition_incomplete:
      action: retry_S1
      max_retries: 2
    tech_conflict:
      action: retry_S2_with_constraints
    tech_design_incomplete:
      action: retry_S2.5
      max_retries: 2
    tech_design_review_failed:
      action: retry_S2.5_or_S2.6
      max_retries: 3
    spec_misalignment:
      action: retry_S3_for_affected_features
    task_breakdown_incomplete:
      action: retry_S3.5
      max_retries: 2
    test_failure:
      action: insert_debug_before_S6
      max_retries: 5
    review_critical:
      action: insert_fix_before_S7
      max_retries: 2

  # Module Spec 治理旁路（与 S1–S9 并行，不是额外阶段）
  # 三个 living baseline 说明书：每个阶段读对应说明书再产出，ship/变更后写回 delta。
  # 详见 csp-workflow/references/module-spec-lifecycle-norms.md
  module_spec_governance:
    hub:                         # 知识中枢 — Stage 0 前置 + 全阶段统一索引
      skill: csp-knowledge-hub
      init_at: S0                # 生命周期第一步
      index_at: [S1, S2, S2.5, S3, S3.5, S8, S10, S11, S13]  # 每阶段产物回写 manifest
      gate: hub_doctor_pass      # AGENTS.md 6 节 + frontmatter + 无 sidecar
    pms:                      # 产品说明书 — 治理 PRD 质量
      skill: csp-product-spec
      read_at: [S1, S2, S2.5, S3]        # 模块边界 + 验收形态
      write_back_at: [S11, S13]          # 闭环 + 增量 delta
      gate: prd_to_module_coverage == 100%
    cms:                      # 代码说明书 — 治理 设计/拆分/生码/CR
      skill: csp-code-spec
      read_at: [S2, S3, S5, S8, S10]     # 入口点/调用链/约定
      write_back_at: [S8, S13]           # ship 后 auto-align + 增量
      gate: cms_idempotent_align        # 未变更源 → 零 delta
    tms:                      # 测试说明书 — 治理 用例（存量+增量），PMS 分支
      skill: csp-test-spec
      read_at: [S5, S9, S10]            # 需求矩阵 + 存量基线
      write_back_at: [S10, S12, S13]    # 增量用例 + 事件回归 + delta
      gate: requirement_coverage_gap == 0
    routing_principle: "治理旁路不阻塞主链；门控失败时，先查对应说明书是否陈旧（CMS 未 align / TMS 缺口）"
```

## 迭代管理

```yaml
iteration:
  # 里程碑归档
  milestone_complete:
    archive_to: .csp/milestones/v{N}/
    contents:
      - decomposition (snapshot)
      - tech-decisions (snapshot)
      - specs (snapshot)
      - plan
      - test-results
      - review-summary
      - release-notes
    
  # 增量迭代
  next_iteration:
    mode: extend
    input: 增量需求 (新功能/变更/优化)
    context: 上一里程碑的完整产物
    delta_handling:
      new_features: full S1-S3 for new features only
      modified_features: delta spec (ADDED/MODIFIED/REMOVED)
      removed_features: deprecation notice + migration plan
```

## 执行流程伪代码

```python
def run_lifecycle(user_input, config):
    # 1. 评估输入 → 确定模式和起始阶段
    assessment = assess_input(user_input)
    mode = config.mode or assessment.recommended_mode
    start_stage = assessment.start_stage
    
    # 2. 按阶段顺序执行
    stages = get_stages(mode, start_stage)
    artifacts = {}
    
    for stage in stages:
        # 检查跳过条件
        if should_skip(stage, artifacts, config):
            continue
        
        # 执行阶段
        result = execute_stage(stage, user_input, artifacts, config)
        artifacts[stage] = result
        
        # 门控检查
        gate_result = check_gate(stage, result, config)
        if not gate_result.passed:
            if gate_result.needs_user_input:
                user_decision = ask_user(gate_result)
                handle_decision(user_decision)
            else:
                retry_or_rollback(stage, gate_result)
        
        # 用户审批点
        if stage in config.gates.require_user_approval:
            approval = request_approval(stage, result)
            if not approval.approved:
                handle_rejection(approval.feedback)
    
    # 3. 完成报告
    generate_completion_report(artifacts)
    
    # 4. 迭代推进（如配置）
    if config.iteration.auto_advance:
        prompt_next_iteration()
```

## 完成信号

```yaml
completion_signal:
  output: .csp/lifecycle-report.md
  status:
    stages_completed: "{{list}}"
    total_features: "{{count}}"
    specs_generated: "{{count}}"
    phase: shipped
    next_action: "iterate or close"
```

## 快速开始示例

```
用户: "帮我做一个团队知识库系统，支持文档协作、全文搜索、AI 问答"

Orchestrator 执行:
  1. 评估 → mode=full, start=S1
  2. S1: 拆解为 4 域 12 Feature
     - 域A: 用户与权限 (注册/登录/角色/团队)
     - 域B: 文档管理 (创建/编辑/版本/协作)
     - 域C: 搜索与智能 (全文搜索/AI问答/推荐)
     - 域D: 基础设施 (文件存储/通知/审计)
  3. [门控] 用户确认 Feature 清单 ✓
  4. S2: 技术选型
     - Python + FastAPI / Next.js / PostgreSQL + pgvector / Redis / Meilisearch / LangChain
  5. [门控] 用户确认技术栈 ✓
  6. S2.5: 技术方案设计
     - 系统架构: 模块化单体 + 搜索/通知独立服务
     - 数据架构: 7 个核心实体，全局 ER 图
     - 接口架构: REST API + WebSocket + 事件驱动
     - 关键技术难点: 实时协作冲突解决、AI 问答延迟优化
  7. [门控] 技术方案完整 ✓
  8. S2.6: 技术方案评审
     - 架构师: 建议搜索服务独立部署
     - 安全专家: 需增加文档级 RBAC
     - DBA: 大文档内容建议用 S3 存储
     - 评审结论: APPROVED_WITH_MINOR_CHANGES
  9. S3: 生成 12 份 Feature Spec
  10. S3.5: 任务拆解 → 42 个开发任务，4 个 Waves
  11. S4: 实施规划 (4 Wave, 3 里程碑)
  12. S5-S9: 执行 → 测试 → 审查 → 发布
  13. 输出: 完整可运行的知识库系统 + 全套文档
```
