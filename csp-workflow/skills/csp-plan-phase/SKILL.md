---
name: csp-plan-phase
description: |
  实施规划阶段引擎。从任务拆解出发，制定详细的实施计划。
  包括：里程碑规划、资源分配、风险缓冲、并行策略、进度跟踪方案。
  是"任务拆解→实施执行"之间的桥梁，为 csp-implementation-phase 提供可执行的计划。
  当任务拆解完成需要制定实施计划、或用户需要"实施计划"、"开发计划"、"里程碑"时使用。
  关键词：实施计划、开发计划、里程碑、milestone、implementation plan、执行计划、
  项目计划、迭代计划、交付计划、release plan、sprint plan。
version: "1.0.0"
layer: 2
category: workflow
phase: plan
domain: architecture
scope: design
tools: [Read, Write, Edit, Glob, Grep, Bash]

dependencies:
  skills:
    - csp-tech-task-breakdown

related_skills:
  - csp-tech-task-breakdown
  - csp-effort-estimation
  - csp-implementation-phase
  - csp-lifecycle-orchestrator
  - csp-tech-risk-assessment
  - csp-tdd
  - csp-verify-phase

triggers:
  keywords: ["实施计划", "开发计划", "里程碑", "milestone", "implementation plan",
             "执行计划", "项目计划", "迭代计划", "排期", "交付计划",
             "release plan", "sprint plan", "开发排期"]
  intents:
    - "user needs an implementation plan from task breakdown"
    - "user wants milestone planning and resource allocation"
    - "user needs to plan the execution of development tasks"
  context:
    - "after_task_breakdown"

anti_rationalizations:
  "有任务清单就够了，不用做计划": "任务清单只说做什么，计划说怎么安排——先做什么后做什么、谁来做、风险怎么处理。没有计划的任务清单是不可执行的。"
  "计划赶不上变化，做了也白做": "计划的价值不在于精确预测，而在于建立基线。有了基线才能衡量偏差，才能调整。"
  "小项目不需要里程碑": "即使只有一个里程碑，明确它也能让团队对齐预期。"
  "不估时怎么排期": "排期由**依赖 DAG + Wave + 关键路径**决定，不需要工时。AI 编程下工时方差极大且易腐烂，强行估时给虚假信心。`csp-effort-estimation` 仅当团队确有工时/资源需求时按需调用。"
---

# Plan Phase

实施规划阶段引擎 — 把任务清单变成可执行的实施计划。

## 核心理念

实施计划是任务拆解到执行之间的桥梁。任务拆解回答"做什么"，实施计划回答"怎么安排"——先做什么后做什么、谁来做、并行怎么打、风险怎么处理。

> **不估时**：排期与并行由**依赖 DAG + Wave + 关键路径**决定，不靠工时。AI 编程下工时方差大且易腐烂。
> 里程碑按 Wave 序号定（不绑日历）；需要工时/资源计划时按需调用 `csp-effort-estimation`，不进默认输出。

好的实施计划：
1. 有明确的里程碑和交付物
2. 有合理的资源分配和并行策略
3. 有风险缓冲和应对预案
4. 有清晰的进度跟踪方式
5. 可被 csp-implementation-phase 直接执行

## 输入

- `.csp/tasks/WBS.md` — 工作分解结构
- `.csp/tasks/TASK-CARDS/*.md` — 任务卡片
- `.csp/tasks/DEPENDENCY-DAG.md` — 任务依赖 DAG
- `.csp/tasks/WAVE-PLAN.md` — Waves 计划（如有）
- `.csp/estimation/EFFORT-ESTIMATION.md` — 工作量估算（**可选**，按需产出；无则跳过）
- `.csp/tech-design/RISK-REGISTER.md` — 风险登记册（如有）

## 执行流程

```
1. 读取任务拆解和估算产物
2. 确认里程碑和交付物
3. 制定资源分配计划
4. 确认并行策略和关键路径
5. 加入风险缓冲
6. 制定进度跟踪方案
7. 输出实施计划
8. 门控检查
```

## 输出产物

### IMPLEMENTATION-PLAN.md

```markdown
# Implementation Plan

## 项目概览
- 项目名称: [项目名]
- 总任务数: N
- Wave 数: N
- 计划版本: v1.0
- 制定日期: YYYY-MM-DD

## 里程碑（按 Wave 序号，不绑日历）

| 里程碑 | 出口 Wave | 交付物 | 验收标准 | 状态 |
|--------|---------|--------|---------|------|
| M1: 基础设施 | Wave 1 | DB schema + 开发环境 | 所有 migration 可执行，Docker Compose 可启动 | Pending |
| M2: 核心功能 | Wave 2-3 | 核心 API + 前端页面 | 核心用户流程可走通 | Pending |
| M3: 功能完善 | Wave 4 | 增强功能 + 测试 | 全部测试通过，覆盖率达标 | Pending |
| M4: 上线 | Wave 5 | 生产部署 + 文档 | 一键部署可用，文档完整 | Pending |

## 资源分配

| 角色 | 人员 | 负责模块 | 关键任务 |
|------|------|---------|---------|
| 后端开发 | [name] | 用户/文档/搜索 API | T-2-1 ~ T-2-12 |
| 前端开发 | [name] | 全部前端页面 | T-3-1 ~ T-3-8 |
| DevOps/全栈 | [name] | 基础设施/部署/测试 | T-1-1 ~ T-1-6, T-5-1 ~ T-5-4 |

## Wave 计划（按依赖 DAG 序，不绑日历）

### Wave 1: 基础设施 (M1)
| 并行组 | 任务 |
|--------|------|
| 后端 | Users/Features/... 表 migration |
| DevOps | 项目初始化 + Docker Compose + CI/CD |

### Wave 2-3: 核心功能 (M2)
...

## 并行策略

| Wave | 并行组 | 任务 |
|------|--------|------|
| 1 | 后端-A | T-2-1, T-2-2 (用户 API) |
| 1 | 后端-B | T-2-5, T-2-6 (文档 API) |
| 1 | 前端-A | T-3-1 (首页布局) |
| 2 | 后端-A | T-2-7, T-2-8 (搜索 API) |
| 2 | 前端-A | T-3-2 (文档列表页) |
| 2 | 前端-B | T-3-3 (文档编辑页) |

## 关键路径

```
T-1-1 (基础 DB) → T-2-1 (用户 API) → T-2-5 (文档 API) → T-3-2 (文档列表页) → T-4-1 (集成测试) → T-5-1 (部署)
```

关键路径 = 依赖 DAG 上零 slack 的串行链（决定最短可交付序列，不附工时）。

## 风险缓冲

| 风险 | 概率 | 缓冲策略 |
|------|------|---------|
| 技术难点攻关超时 | 中 | 每里程碑预留缓冲 Wave / 降级方案 |
| 需求变更 | 中 | 优先级置换，低优先级可延期 |
| 人员不可用 | 低 | 关键路径任务有备份负责人 |
| 第三方服务问题 | 低 | 降级方案 + Mock |

## 进度跟踪

### 每日站会
- 昨天完成了什么
- 今天计划做什么
- 有什么阻塞

### 进度看板
| 状态 | 任务数 | 占比 |
|------|--------|------|
| 待开始 | 20 | 50% |
| 进行中 | 5 | 12.5% |
| 已完成 | 10 | 25% |
| 阻塞 | 2 | 5% |
| 已取消 | 3 | 7.5% |

### 进度趋势
[剩余任务数 vs Wave 推进；以任务数/通过率衡量，不以工时衡量]
```

## 门控检查

- [ ] 里程碑定义清晰，每个有交付物和验收标准
- [ ] 资源分配合理，无单点依赖
- [ ] 关键路径已识别，有缓冲
- [ ] 并行策略已制定，最大化并行度
- [ ] 风险缓冲已纳入计划
- [ ] 进度跟踪方案已确定
- [ ] 计划与任务拆解一致（不依赖工时）

## 完成信号

```yaml
completion_signal:
  output: .csp/plan/IMPLEMENTATION-PLAN.md
  next_step:
    recommended: csp-implementation-phase
    alternatives: [csp-tdd, csp-lifecycle-orchestrator]
  status:
    plan_path: .csp/plan/
    milestones: "{{count}}"
    waves: "{{count}}"
    phase: plan
    ready_for: [implementation]
```

## 与其他 Skill 的协作

| 上游 Skill | 提供什么 |
|-----------|---------|
| csp-tech-task-breakdown | 任务清单 + 依赖 DAG + Wave 划分 |
| csp-tech-risk-assessment | 风险登记册（缓冲依据） |
| csp-effort-estimation | （可选，按需）工作量估算 + 资源计划 |

| 下游 Skill | 消费什么 |
|-----------|---------|
| csp-implementation-phase | 实施计划（逐任务执行） |
| csp-lifecycle-orchestrator | 实施计划（Stage 4 → Stage 5 流转） |

## 快速开始示例

```
输入: 知识库系统，40 个任务，5 个 Waves

输出:
  里程碑（按 Wave 出口）:
    M1 (Wave 1): 基础设施 — DB + CI/CD + 开发环境
    M2 (Wave 2-3): 核心功能 — 用户/文档/搜索 API + 前端页面
    M3 (Wave 4): 功能完善 — 增强功能 + 测试
    M4 (Wave 5): 上线 — 部署 + 文档

  资源:
    后端 1 人 + 前端 1 人 + DevOps（兼任）

  关键路径: T-1-1 → T-2-1 → T-2-5 → T-3-2 → T-4-1 → T-5-1（依赖链，无工时）
  缓冲: 每里程碑预留降级方案 + 关键路径备份负责人

  并行策略:
    Wave 1: 后端×2 (用户 API ∥ 文档 API)
    Wave 2: 后端×1 + 前端×2
    Wave 3: 前端×2 + 测试
```