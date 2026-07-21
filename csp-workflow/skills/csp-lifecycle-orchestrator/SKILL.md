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
  skills: [csp-requirement-decomposition, csp-tech-stack-advisor, csp-fullstack-spec-generator]

related_skills:
  - csp-full
  - csp-implementation-phase
  - csp-verify-phase
  - csp-ship
  - csp-plan-phase
  - csp-tdd
  - csp-code-review

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
│  │ requirement- │→│ tech-stack-  │→│ fullstack-spec-       │   │
│  │ decomposition│  │ advisor      │  │ generator             │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│         ↓                  ↓                    ↓                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              csp-full / csp-implementation-phase           │   │
│  │              (执行层 — 编码 + 测试 + 审查 + 发布)           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**与 csp-full 的关系：**
- `csp-full` = 执行导向（P0-P8 快速推进，适合需求已明确的场景）
- `csp-lifecycle-orchestrator` = 规格化导向（深度拆解 + 选型 + Spec，适合需求模糊或系统复杂的场景）
- 两者可串联：orchestrator 完成 Spec 后，交给 csp-full 的 P4+ 执行

## 生命周期阶段

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                       │
│  S1          S2           S3            S4         S5      S6       │
│  需求拆解 → 技术选型 → 全栈Spec → 实施规划 → 并行开发 → 质量门控   │
│                                                                       │
│  S7          S8           S9                                         │
│  审查验证 → 发布交付 → 运维监控 → (迭代: 回到 S1 增量)              │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

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

### Stage 3: 全栈 Spec 生成 (Full-Stack Spec Generation)

**执行:** `Skill("csp-fullstack-spec-generator")`

**输入:** `.csp/decomposition/FEATURE-DETAILS/*.yaml` + `.csp/tech-decisions/`
**输出:** `.csp/specs/` 全套产物
**门控:**
- 每个 P0/P1 Feature 有完整 Spec
- Spec 包含 Schema + API + UI 三个核心维度
- API 契约前后端一致

**跳过条件:** 已有 `.csp/specs/` 且覆盖当前 Feature 集

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
    - spec-generation
    - planning
    - execution
    - quality-gate
    - review
    - ship
    - post-launch
  
  gates:
    require_user_approval:
      - after_decomposition    # 拆解后确认 Feature 清单
      - after_tech_selection   # 选型后确认技术栈
      - before_ship            # 发布前确认
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
| `lightweight` | 小功能、模块集成 | S1(精简) → S3(精简) → S5 → S6 → S7 |
| `spec-only` | 只需要规格文档，不执行 | S1 → S2 → S3 → S4 |
| `extend` | 已有系统新增功能 | S1(增量) → S2(增量) → S3 → S5 → S6 → S7 → S8 |

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
    ▼ [S3: fullstack-spec-generator] │   │   │        │
.csp/specs/                          │   │   │        │
    ├── SPEC-F-*.md ◄────────────────┘   │   │        │
    ├── API-OVERVIEW.md                  │   │        │
    └── SPEC-INDEX.md                    │   │        │
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
    spec_misalignment:
      action: retry_S3_for_affected_features
    test_failure:
      action: insert_debug_before_S6
      max_retries: 5
    review_critical:
      action: insert_fix_before_S7
      max_retries: 2
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
  6. S3: 生成 12 份 Feature Spec
  7. S4: 实施规划 (4 Wave, 3 里程碑)
  8. S5-S9: 执行 → 测试 → 审查 → 发布
  9. 输出: 完整可运行的知识库系统 + 全套文档
```
