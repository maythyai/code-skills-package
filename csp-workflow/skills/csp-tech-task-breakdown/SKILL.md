---
name: csp-tech-task-breakdown
description: |
  技术方案到开发任务拆解引擎。从技术方案和 Feature Spec 出发，拆解为可执行的原子开发任务。
  每个任务包含：精确文件路径、技术要点、估时、依赖、优先级、WBS 编号、验收标准。
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
    - "user wants task list with file paths and estimates"
    - "user needs sprint planning from tech design"
  context:
    - "after_tech_design_review"
    - "after_spec_generation"

anti_rationalizations:
  "任务拆解太细浪费时间": "粗粒度的任务 = 模糊的估时 = 不可预测的交付。每任务 ≤ 4h 是确保可预测性的最小粒度。"
  "直接按模块分就行": "模块划分 ≠ 开发任务。同一模块内可能有依赖关系，需要进一步拆解并排定顺序。"
  "估时不准，拆了也没用": "估时不准是常态，但拆解本身暴露了依赖和并行机会。即使估时偏 50%，拆解仍比不拆有价值。"
---

# Tech Task Breakdown

技术方案到开发任务拆解引擎 — 把架构设计变成可执行、可追踪、可估时的原子开发任务。

## 核心理念

技术方案说"系统由 4 个模块组成"，任务拆解说"模块 A 需要 3 个后端任务 + 2 个前端任务，先做数据层再做 API 层，2 个前端任务可并行"。任务拆解把抽象的架构设计翻译成具体的开发指令。

好的任务拆解标准：
1. **每个任务 ≤ 4 小时** — 超过则继续拆
2. **每个任务有精确文件路径** — 开发者不需要猜文件放哪
3. **每个任务有明确依赖** — 不会出现"做了但跑不起来"
4. **每个任务有验收标准** — 完成与否无歧义

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

## 拆解维度

每个任务卡片包含：

```yaml
task:
  id: "T-{wave}-{seq}"          # 任务编号
  wbs: "1.2.3"                   # WBS 编号
  feature: "F-A-1"               # 关联 Feature
  title: "创建 features 表 migration"  # 任务标题
  description: "创建 features 表的数据库 migration 文件"  # 任务描述
  
  # 技术细节
  files:                         # 精确文件路径列表
    - "migrations/XXXX_create_features.py"
    - "app/models/feature.py"
  tech_stack:                    # 涉及的技术
    - "PostgreSQL"
    - "SQLAlchemy/Alembic"
  key_points:                    # 技术要点
    - "使用 UUID 主键"
    - "status 字段使用 CHECK 约束"
    - "创建联合索引 idx_features_status_domain"
  
  # 估时
  estimate: "2h"                 # 预估工时
  complexity: "S"                # S/M/L
  
  # 依赖
  depends_on: []                 # 前置任务 ID
  blocks: []                     # 被阻塞任务 ID
  
  # 优先级
  priority: "P0"                 # P0/P1/P2
  wave: 1                        # 实施波次
  
  # 验收标准
  acceptance_criteria:
    - "migration up/down 可正常执行"
    - "所有字段类型和约束与 spec 一致"
    - "索引创建正确"
  
  # 产出
  deliverables:
    - "migrations/XXXX_create_features.py"
    - "app/models/feature.py"
```

## 拆解规则

### 粒度规则

| 任务类型 | 典型粒度 | 超过则拆 |
|---------|---------|---------|
| DB Migration | 1-2h/表 | 一表多 migration 拆分 |
| 后端 API (CRUD) | 2-3h/端点组 | 超过 4 个端点则拆分 |
| 后端 Service | 2-4h/模块 | 超过 3 个方法则拆分 |
| 前端页面 | 2-4h/页面 | 超过 5 个组件则拆分 |
| 前端组件 | 1-2h/组件 | 复杂组件单独拆 |
| 集成测试 | 2-3h/Feature | 超过 5 个场景则拆分 |
| E2E 测试 | 2-3h/流程 | 超过 3 个流程则拆分 |
| 基础设施 | 1-2h/配置项 | 多服务配置分开 |

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

关键路径总工时: 14h
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

```
.csp/tasks/
├── WBS.md                        # 工作分解结构
├── TASK-CARDS/                   # 每个任务的详细卡片
│   ├── T-1-1.md
│   ├── T-1-2.md
│   └── ...
├── DEPENDENCY-DAG.md             # 任务依赖 DAG + 关键路径
├── WAVE-PLAN.md                  # Waves 计划 + 里程碑
└── TASK-BREAKDOWN-SUMMARY.md     # 拆解摘要（供下游消费）
```

## 门控检查

- [ ] 每个 Feature 有对应任务
- [ ] 每个任务粒度 ≤ 4h
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
    recommended: csp-effort-estimation
    alternatives: [csp-plan-phase, csp-implementation-phase]
  status:
    tasks_path: .csp/tasks/
    total_tasks: "{{count}}"
    total_hours: "{{sum}}"
    waves: "{{count}}"
    phase: plan
    ready_for: [effort-estimation, implementation-planning, execution]
```

## 与其他 Skill 的协作

| 上游 Skill | 提供什么 |
|-----------|---------|
| csp-tech-solution-design | 系统架构 + 模块划分 |
| csp-fullstack-spec-generator | 每个 Feature 的详细 Spec |
| csp-tech-design-review | 评审通过确认 |

| 下游 Skill | 消费什么 |
|-----------|---------|
| csp-effort-estimation | 任务清单 + 估时 → 工作量估算 |
| csp-plan-phase | 任务依赖 DAG → 实施计划 |
| csp-implementation-phase | 任务卡片 → 逐任务执行 |

## 快速开始示例

```
输入: 知识库系统，4 个模块，12 个 Feature

输出 (WBS 摘要):
  Wave 1 (基础层): 6 个任务，8h
    T-1-1: 创建 users 表 migration (1h)
    T-1-2: 创建 features 表 migration (1.5h)
    T-1-3: 创建 comments 表 migration (1h)
    T-1-4: 创建 tags 表 migration (0.5h)
    T-1-5: 创建 attachments 表 migration (1h)
    T-1-6: 项目初始化 + Docker Compose (3h)
  
  Wave 2 (核心后端): 12 个任务，24h
    T-2-1: 用户注册/登录 API (2h)
    T-2-2: 权限管理 Service (2h)
    T-2-3: 文档 CRUD API (3h)
    ...
  
  Wave 3 (前端): 8 个任务，20h
    T-3-1: 首页 + 导航 (3h)
    T-3-2: 文档列表页 (2h)
    ...
  
  Wave 4 (测试): 10 个任务，16h
  Wave 5 (部署): 4 个任务，6h
  
  总计: 40 个任务，74h，5 个 Waves
  关键路径: 24h
  最大并行度: 4
```