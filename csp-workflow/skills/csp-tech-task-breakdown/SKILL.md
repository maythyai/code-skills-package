---
name: csp-tech-task-breakdown
description: |
  技术方案到开发任务拆解引擎。从技术方案和 Feature Spec 出发，拆解为可执行的原子开发任务。
  每个任务包含：精确文件路径、技术要点、依赖、优先级、WBS 编号、验收标准。
  支持 Waves 划分、并行策略优化、关键路径识别。
  当技术方案评审通过后需要拆解任务、或用户需要"任务拆解"、"WBS"、"开发计划"、"Sprint拆解"时使用。
  关键词：任务拆解、WBS、开发任务、Sprint拆解、任务分解、开发计划、task breakdown、
  工作分解、开发排期、task list、任务清单、开发估算、实施计划、拆分任务、
  开发任务拆解、编码任务、编程任务清单、开发 backlog、sprint planning。
version: "1.0.0"
layer: 2
category: workflow
phase: plan
domain: architecture
scope: design
tools: [Read, Write, Edit, Glob, Grep, Bash]

dependencies:
  skills:
    - csp-tech-solution-design
    - csp-fullstack-spec-generator

related_skills:
  - csp-tech-solution-design
  - csp-fullstack-spec-generator
  - csp-tech-design-review
  - csp-lifecycle-orchestrator
  - csp-effort-estimation
  - csp-plan-phase
  - csp-implementation-phase

triggers:
  keywords: ["任务拆解", "WBS", "开发任务", "Sprint拆解", "任务分解", "开发计划",
             "task breakdown", "任务清单", "拆分任务", "开发排期", "工作分解",
             "task list", "sprint planning", "开发 backlog"]
  intents:
    - "user needs to break down technical design into development tasks"
    - "user wants task list with file paths and acceptance criteria"
    - "user needs sprint planning from tech design"
  context:
    - "after_tech_design_review"
    - "after_spec_generation"

anti_rationalizations:
  "任务拆解太细浪费时间": "粗粒度的任务 = 模糊的验收 = 不可预测的交付。一任务一原子提交是确保可审查、可回滚的最小粒度。"
  "直接按模块分就行": "模块划分 ≠ 开发任务。同一模块内可能有依赖关系，需要进一步拆解并排定顺序。"
  "不估时怎么排期/并行": "排期与并行由**依赖 DAG + Wave**决定，不需要工时。估时在 AI 编程下方差极大且易腐烂（机器速度 + 上下文差异），强行估时反而给虚假信心。拆解的真正价值是暴露依赖与并行机会，不是预测时间——`csp-effort-estimation` 仅当团队确有工时需求时按需调用，不进默认流。"
  "估时不准，拆了也没用": "估时不准是常态——AI 编程下更甚。但拆解本身暴露了依赖和并行机会，这比工时预测有价值得多。"
---

# Tech Task Breakdown

技术方案到开发任务拆解引擎 — 把架构设计变成可执行、可追踪、**原子化**的开发任务。

## 核心理念

技术方案说"系统由 4 个模块组成"，任务拆解说"模块 A 需要 3 个后端任务 + 2 个前端任务，先做数据层再做 API 层，2 个前端任务可并行"。任务拆解把抽象的架构设计翻译成具体的开发指令。

好的任务拆解标准：
1. **每个任务 = 一个原子提交** — 可独立审查、可回滚；触及文件可数（通常 ≤6）、单一职责
2. **每个任务有精确文件路径** — 开发者不需要猜文件放哪
3. **每个任务有明确依赖** — 不会出现"做了但跑不起来"
4. **每个任务有验收标准** — 完成与否无歧义

> **不估时**：AI 编程下工时方差极大（机器速度 + 上下文差异）且易腐烂，强行估时给的是虚假信心。
> 排期与并行由**依赖 DAG + Wave** 决定，不需要工时。`csp-effort-estimation` 仅当团队确有工时/资源
> 需求时**按需**调用，不在默认流。

## 输入

消费上游产物：
- `.csp/tech-design/ARCHITECTURE-DESIGN.md` — 系统架构 + 模块划分
- `.csp/tech-design/DATA-ARCHITECTURE.md` — 数据架构 + ER 图
- `.csp/tech-design/INTERFACE-ARCHITECTURE.md` — 接口架构
- `.csp/specs/SPEC-F-*.md` — 每个 Feature 的全栈 Spec
- `.csp/decomposition/DEPENDENCY-GRAPH.md` — Feature 级依赖图

## 拆解流程

```
1. 读取技术方案和 Feature Spec
2. 识别开发层级（DB/后端/前端/测试/基础设施）
3. 对每个 Feature 按层级拆解为原子任务
4. 标注每个任务的依赖关系
5. 划分 Waves（实施波次）
6. 识别关键路径
7. 标注并行机会
8. 输出 WBS + 任务卡片 + 依赖 DAG
```

## 拆解维度（Canonical Task Schema）

> **本 schema 是 task 卡的唯一权威定义**。`.claude/agents/task-breaker.md` 与
> `csp-lifecycle-orchestrator` 均引用此处，不另立字段集——避免三方漂移。
> 技术细节（tech_stack/key_points/HOW）归 `spec_ref` 指向的 Spec，task 卡只载
> WHAT + WHERE + 追溯锚点，不重复 Spec 内容（SDD 粒度：task 卡不是伪代码）。

```yaml
task:
  # ── 追溯锚点（必填，机器可校验）──
  id: "T-F-A-1-3"               # 格式 T-{feature-id}-{seq}，feature-id 含 group+seq，确保 task→feature→module 可追溯
  spec_ref: ".csp/specs/SPEC-F-A-1.md"  # 溯源到 Spec 维度（不臆造 task）
  pms_module: "MOD-AUTH-1"       # 归属 PMS 模块（不越界；PMS gate 据此查覆盖率）
  acceptance: ["AC-AUTH-1.2"]     # 对应 PRD/Spec AC id（验收闭环）

  # ── WHAT + WHERE ──
  title: "创建 features 表 migration"
  type: "db-migration"           # db-migration / backend-api / frontend / test / infra
  files:                         # 目标文件/目录（供 05 并行 + worktree 冲突检测）
    - "migrations/XXXX_create_features.py"
    - "app/models/feature.py"

  # ── 结构（排期靠这个，不靠工时）──
  depends_on: ["T-F-A-1-1"]      # 前置 task_id（构成 DAG，必须无环）
  wave: 1                        # 并行波次
  priority: "P0"                 # P0/P1/P2
  complexity: "S"                # S/M/L — 复杂度与不确定性（风险标注，**非工时**）
```

> **去估时**：无 `estimate` 字段。粒度判据是原子性（一任务一原子提交、文件可数 ≤6、单一职责），
> 不是「≤4h」。排期/并行/关键路径由 `depends_on` DAG + `wave` 计算，不需要工时。
> `csp-effort-estimation` 仅按需调用。

> **去冗余**：无 `wbs` 编号（task_id 已是有序唯一键）、无 `blocks`（由 `depends_on` 反推可得）、
> 无 `deliverables`（≈ `files`）、无 `tech_stack`/`key_points`（归 Spec，经 `spec_ref` 引用，不在卡内重复）。

## 拆解规则

### 粒度规则

粒度判据是**原子性**（一任务一提交、可独立审查回滚），不是工时。下表给「超过则拆」的可数判据：

| 任务类型 | 超过则拆的判据（可数，非时间） |
|---------|---------|
| DB Migration | 一表多 migration 拆分；单 migration 超 1 张大表含多索引则拆 |
| 后端 API (CRUD) | 超 4 个端点则拆分 |
| 后端 Service | 超 3 个方法则拆分 |
| 前端页面 | 超 5 个组件则拆分 |
| 前端组件 | 复杂组件单独拆 |
| 集成测试 | 超 5 个场景则拆分 |
| E2E 测试 | 超 3 个流程则拆分 |
| 基础设施 | 多服务配置分开 |

> 一律以「能否做成一个干净、可回滚的原子提交」收口：若一个任务要碰 >6 文件、或含 >1 个不相关职责、或无法用一句话写 commit message，继续拆。

### 拆解顺序

```
1. 基础设施层 (DB、配置、CI/CD)           → Wave 1
2. 数据访问层 (Models、Migrations)         → Wave 1-2
3. 业务逻辑层 (Services、Domain Logic)     → Wave 2-3
4. API 层 (Routes、Controllers、Middleware) → Wave 2-3
5. 前端层 (Pages、Components、Hooks)       → Wave 3-4
6. 测试层 (Unit、Integration、E2E)         → Wave 2-4（随对应层）
7. 部署层 (Docker、CI、监控)               → Wave 4-5
```

## Waves 划分

```
Wave 1 (基础层) — 所有 DB migration + 基础设施配置
  可并行: 所有 migration 独立运行
  完成标志: 数据库可启动，所有表创建成功

Wave 2 (核心后端) — 核心业务 API + Service
  可并行: 按 Feature 分（F-A 后端、F-B 后端可同时开发）
  完成标志: 核心 API 端点可调用，返回 mock 数据

Wave 3 (前端 + 补全后端) — 前端页面 + 后端增强功能
  可并行: 前端页面可并行（F-A 页面、F-B 页面）
  完成标志: 前端页面可访问，API 联调通过

Wave 4 (集成 + 测试) — 集成测试 + E2E
  可并行: 不同 Feature 的测试可并行
  完成标志: 所有测试通过

Wave 5 (部署 + 文档) — 部署配置 + 文档
  可并行: 部署脚本和文档可并行
  完成标志: 一键部署可运行
```

## 关键路径识别

```markdown
## 关键路径

Task T1.1 (DB Schema) → T2.1 (API 核心) → T2.3 (Service 核心) → T3.1 (前端列表页)
  → T4.1 (集成测试) → T5.1 (部署)

关键路径 = 依赖 DAG 上零 slack 的串行链；决定最短可交付序列（不附工时）。
非关键路径最大并行度: 4 个任务同时进行
```

## 并行策略

```yaml
parallel_strategy:
  # 按模块并行
  by_module:
    - F-A 后端任务 (T2.1, T2.2) ∥ F-B 后端任务 (T2.5, T2.6)
    - F-A 前端任务 (T3.1, T3.2) ∥ F-B 前端任务 (T3.5, T3.6)
  
  # 按层级并行
  by_layer:
    - Wave 1: 所有 DB migration 并行 (T1.1 ∥ T1.2 ∥ T1.3)
    - Wave 2: 后端 API 按 Feature 并行
    - Wave 3: 前端页面按 Feature 并行
  
  # 并行约束
  constraints:
    - 同一 Feature 的前端依赖后端（API 先完成）
    - 依赖同一 DB 表的 migration 串行
    - 测试依赖被测试代码完成
```

## 输出产物

> **独立文件，不合并**（与 `csp-lifecycle-orchestrator` / `task-breaker` agent / `drive.gate` 一致）：
> `drive.gate S3.5` 检查 `WBS.md` + `DEPENDENCY-DAG.md` 为独立文件；合并单文件会让 gate 误判失败。
> 里程碑归档时再 `cp` 快照到 `.csp/milestones/{milestone}/tasks/`，当前目录始终是「现行」。

```
.csp/tasks/
├── WBS.md                        # 工作分解结构（所有 task 卡的集合视图）
├── TASK-CARDS/                   # 每个 task 的独立卡片（Canonical Task Schema）
│   ├── T-F-A-1-1.md
│   ├── T-F-A-1-2.md
│   └── ...
├── DEPENDENCY-DAG.md             # 任务依赖 DAG（Mermaid）+ 关键路径（无环）
├── WAVE-PLAN.md                  # Waves 计划（Wave|task 集|可并行|里程碑出口）
└── TASK-BREAKDOWN-SUMMARY.md     # 拆解摘要 + 缺口清单（供 05 消费，即索引）
```

## 门控检查

- [ ] 每个 Feature 有对应任务
- [ ] 每个任务可作为一个原子提交（单一职责、文件可数、一句话 commit message）
- [ ] 每个任务有精确文件路径
- [ ] 依赖 DAG 无环
- [ ] Waves 划分合理（基础层先于业务层）
- [ ] 关键路径已识别
- [ ] 并行机会已标注

## 完成信号

```yaml
completion_signal:
  output: .csp/tasks/TASK-BREAKDOWN-SUMMARY.md
  next_step:
    recommended: csp-plan-phase
    alternatives: [csp-implementation-phase, csp-effort-estimation]  # effort-estimation 按需，不默认
  status:
    tasks_path: .csp/tasks/
    total_tasks: "{{count}}"
    waves: "{{count}}"
    phase: plan
    ready_for: [implementation-planning, execution]
```

## 与其他 Skill 的协作

| 上游 Skill | 提供什么 |
|-----------|---------|
| csp-tech-solution-design | 系统架构 + 模块划分 |
| csp-fullstack-spec-generator | 每个 Feature 的详细 Spec |
| csp-tech-design-review | 评审通过确认 |

| 下游 Skill | 消费什么 |
|-----------|---------|
| csp-plan-phase | 任务依赖 DAG → 实施计划 |
| csp-implementation-phase | 任务卡片 → 逐任务执行 |
| csp-effort-estimation | （可选，按需）任务清单 → 工作量/资源估算 |

## 快速开始示例

```
输入: 知识库系统，4 个模块，12 个 Feature

输出 (WBS 摘要):
  Wave 1 (基础层): 6 个任务
    T-1-1: 创建 users 表 migration
    T-1-2: 创建 features 表 migration
    T-1-3: 创建 comments 表 migration
    T-1-4: 创建 tags 表 migration
    T-1-5: 创建 attachments 表 migration
    T-1-6: 项目初始化 + Docker Compose
  
  Wave 2 (核心后端): 12 个任务
    T-2-1: 用户注册/登录 API
    T-2-2: 权限管理 Service
    T-2-3: 文档 CRUD API
    ...
  
  Wave 3 (前端): 8 个任务
    T-3-1: 首页 + 导航
    T-3-2: 文档列表页
    ...
  
  Wave 4 (测试): 10 个任务
  Wave 5 (部署): 4 个任务
  
  总计: 40 个任务，5 个 Waves
  关键路径: T-1-1 → T-2-3 → T-3-2 → T-4-1 → T-5-1（依赖链，无工时）
  最大并行度: 4
```