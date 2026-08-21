---
name: csp-code-understanding
description: |
  代码理解文档自动生成引擎。产出结构化、可增量更新的代码理解文档（模块依赖图、
  关键执行路径、数据流、调用关系、入口点、外部依赖），持久化到 .csp/code-understanding/
  下 system/module/function 三级 Markdown。消费 csp-code-graph 图谱数据（如可用）
  + csp-explore 探索方法论，支持增量更新（检测代码变更后重新生成受影响部分）。
  当用户需要"代码理解文档""模块依赖图""代码结构文档""onboarding 文档"时使用。
  关键词：代码理解、模块依赖、调用关系、代码结构文档、code understanding、
  module dependencies、代码导览、onboarding doc、codebase documentation、
  代码地图、系统理解、架构理解文档。
version: "1.0.0"
layer: 2
category: workflow
phase: define
domain: architecture
scope: analysis
role: architect
tools: [Read, Write, Edit, Glob, Grep, Bash]

dependencies:
  skills: []

related_skills:
  - csp-explore
  - csp-code-graph
  - csp-graph-architecture
  - csp-codebase-audit
  - csp-map-codebase

triggers:
  keywords: ["代码理解", "模块依赖", "调用关系", "代码结构文档", "code understanding",
             "module dependencies", "代码导览", "onboarding doc", "代码地图",
             "系统理解", "架构理解文档", "codebase documentation"]
  intents:
    - "user wants structured codebase understanding documentation"
    - "user needs module dependency graph and call relationships"
    - "user wants persistent code understanding docs for onboarding"
  context:
    - "codebase_exploration"
    - "onboarding"

anti_rationalizations:
  "代码自己看就行了，不用写文档": "大型代码库一个 context 看不完。持久化的理解文档让下次进入成本从 30 分钟降到 3 分钟。"
  "文档会过时": "本技能支持增量更新——检测代码变更后只重新生成受影响部分，不是全量重写。"
  "已有 README 就够了": "README 是项目介绍，不是代码结构理解。模块依赖图、调用关系、执行路径 README 不覆盖。"
  "用 csp-explore 就够了": "csp-explore 产出的是临时对话块，不落盘。本技能把探索结果持久化、结构化、可增量更新。"
  "等架构稳定了再写": "理解文档的价值在架构不稳定时最大——它记录当前真实状态，是后续重构/评审的基线。"
---

# Code Understanding

代码理解文档自动生成引擎 — 把代码探索结果持久化为结构化、可增量更新的理解文档。

## 核心理念

代码理解文档是降低"进入成本"的关键资产。它不是一次性报告，而是**随代码演进、可增量更新的活体参考**。

与现有技能的分工：

| 技能 | 产出 | 持久化 | 增量更新 |
|------|------|:------:|:--------:|
| `csp-explore` | 单问题探索（对话级临时块） | ❌ | ❌ |
| `csp-code-graph` | 代码知识图谱（外部 CLI 索引） | 外部 | ❌ |
| `csp-graph-architecture` | 架构 wiki/html（外部 CLI 生成） | 外部 | 部分（时间快照） |
| `csp-codebase-audit` | 审计报告（发现问题 + 升级方案） | ✅ docs/analysis/ | ❌ |
| **本技能** | **结构化理解文档（结构/依赖/路径/调用）** | ✅ .csp/ | ✅ |

本技能是 `csp-explore` 的**持久化版**：相同探索方法论，但落盘到 `.csp/code-understanding/`、结构化、支持增量更新。`csp-codebase-audit` 侧重"发现问题"，本技能侧重"映射结构"——二者互补。

## 输出结构

```
.csp/code-understanding/
├── SYSTEM-OVERVIEW.md          # 系统级：全局架构、入口点、外部依赖、数据流全景
├── MODULE-DEPENDENCIES.md      # 模块依赖图（Mermaid graph）
├── KEY-PATHS.md                # 关键执行路径（核心业务流程的调用链）
├── CALL-RELATIONSHIPS.md       # 调用关系（谁调用谁、被谁调用、hub/bridge 函数）
├── modules/                    # 模块级：每模块一份（职责/边界/接口/内部结构）
│   ├── auth.md
│   ├── payment.md
│   └── ...
├── functions/                  # 函数级：关键/热点函数（核心算法、hub 函数）
│   └── ...
└── .metadata.yaml              # 增量更新元数据（源文件 hash、生成时间、覆盖范围）
```

## 数据来源

### 优先：图谱数据（如可用）

检查 `code-review-graph status` 是否可用：

- ✅ 可用 → 调用 `csp-code-graph` 方法论，从图谱获取结构化数据（节点：文件/类/函数/类型；边：CALLS/INHERITS/IMPLEMENTS/TESTED_BY/DEPENDS_ON）。本技能把图谱数据转译为人类可读 Markdown。
- ❌ 不可用 → 回退到手动探索（下方）

### 回退：手动探索

使用 `csp-explore` 方法论：

1. `Glob` 建立文件清单（按目录/扩展名）
2. `Read` 入口点（main/index/app/路由配置）
3. `Grep` 追踪符号定义与调用方
4. 沿调用链/数据流深度追踪

**红线**：图谱不可用时降级，不阻断。手动探索精度略低（无社区检测、无中心性指标），但能产出有效文档。

## 生成流程

### Phase 1: 全局扫描

- 项目结构（目录树、模块划分）
- 技术栈（语言/框架/构建工具/依赖管理）
- 入口点（启动文件、路由入口、API 入口、CLI 入口）
- 外部依赖（第三方库、内部服务、数据库、消息队列）
- 配置文件与环境

产出 → `SYSTEM-OVERVIEW.md`

### Phase 2: 模块划分

- 按目录或图谱社区划分模块
- 每模块：职责 / 边界 / 对外接口 / 内部结构 / 依赖的其他模块
- 识别模块间依赖方向（单向/双向/环）

产出 → `MODULE-DEPENDENCIES.md`（Mermaid graph）+ `modules/*.md`

### Phase 3: 关键路径追踪

- 选 3-7 条核心业务流程（如"用户登录""下单支付""数据写入"）
- 每条路径：入口 → 调用链 → 数据流 → 出口
- 标注关键决策点、异步边界、错误处理路径

产出 → `KEY-PATHS.md`

### Phase 4: 调用关系映射

- hub 函数（被大量调用的核心函数）
- bridge 函数（跨模块连接点）
- 未测试的关键路径（图谱可用时从 TESTED_BY 边检测）
- 孤立代码（无调用方，可能死代码）

产出 → `CALL-RELATIONSHIPS.md` + `functions/*.md`（关键/热点函数）

### Phase 5: 增量更新元数据

- 记录每个源文件的 hash（`git hash-object` 或内容 hash）到 `.metadata.yaml`
- 记录生成时间、覆盖范围、数据来源（图谱/手动）

产出 → `.metadata.yaml`

## 增量更新流程

代码变更后重新运行本技能时：

1. 读取 `.metadata.yaml` 中各源文件 hash
2. 对比当前 hash，识别 stale 文件
3. 只重新生成受 stale 文件影响的部分：
   - stale 文件在某模块内 → 只重生成该模块文档
   - stale 文件是入口/接口 → 重生成模块依赖图 + 受影响路径
   - stale 文件涉及关键路径 → 重生成该路径文档
4. 更新 `.metadata.yaml`
5. 在 `SYSTEM-OVERVIEW.md` 顶部标注"最近更新：[模块/路径] @ [时间]"

**红线**：增量更新不是全量重写。全量重写会丢失人工补充的注解。stale 检测确保只动需要动的部分。

## 文档模板

详见 `reference/`：

| 文件 | 用途 |
|------|------|
| `reference/system-overview.md` | SYSTEM-OVERVIEW.md 模板 |
| `reference/module-template.md` | modules/*.md 模板 |
| `reference/key-paths.md` | KEY-PATHS.md 模板（含 Mermaid sequenceDiagram） |
| `reference/call-relationships.md` | CALL-RELATIONSHIPS.md 模板（含 Mermaid graph） |

## 门控检查

- [ ] SYSTEM-OVERVIEW.md 含入口点、技术栈、外部依赖
- [ ] MODULE-DEPENDENCIES.md 有 Mermaid 图且无孤立节点（除死代码标注）
- [ ] 每个核心模块有对应 modules/*.md
- [ ] KEY-PATHS.md 至少覆盖 3 条核心业务流程
- [ ] CALL-RELATIONSHIPS.md 识别了 hub/bridge 函数
- [ ] .metadata.yaml 含全部已扫描源文件的 hash
- [ ] 图谱不可用时已降级并注明数据来源

## 完成信号

```yaml
completion_signal:
  output: .csp/code-understanding/
  next_step:
    recommended: csp-codebase-audit       # 理解后做健康审计
    alternatives:
      - csp-writing-plans                 # 基于理解做实施计划
      - csp-code-review                   # 基于理解做评审
      - csp-graph-architecture            # 深入架构分析
  status:
    docs_path: .csp/code-understanding/
    system_overview: true
    modules_count: "{{count}}"
    key_paths_count: "{{count}}"
    data_source: "graph|manual"
    incremental: false                    # 首次生成 false，增量更新 true
    phase: define
    ready_for: [plan, review, audit]
```

## 与其他 Skill 的协作

| 上游 Skill | 提供什么 |
|-----------|---------|
| `csp-explore` | 单问题探索方法论（手动回退路径） |
| `csp-code-graph` | 代码知识图谱数据（优先数据源） |
| `csp-map-codebase` | 代码库映射基础 |

| 下游 Skill | 消费什么 |
|-----------|---------|
| `csp-codebase-audit` | 理解文档作为审计的结构基线 |
| `csp-writing-plans` | 理解文档作为实施计划的上下文 |
| `csp-code-review` | 调用关系作为评审的影响范围依据 |
| `csp-tech-solution-design` | 现有架构作为新设计约束 |

## 快速开始示例

```
输入: "帮我生成这个项目的代码理解文档"

数据源检测: code-review-graph status → 不可用，降级手动探索

Phase1 全局扫描:
  技术栈: Python/FastAPI + PostgreSQL + Redis
  入口: app/main.py → app/api/routes/
  外部依赖: Stripe SDK, SendGrid, Celery

Phase2 模块划分:
  auth / users / orders / payments / notifications / workers
  依赖: orders → payments → notifications（单向）

Phase3 关键路径:
  下单: POST /orders → create_order → charge_payment → enqueue_notification
  登录: POST /auth/login → verify_password → issue_jwt

Phase4 调用关系:
  hub: charge_payment（被 3 模块调用）
  bridge: enqueue_notification（连接 orders 与 workers）
  未测试: refund_payment（无 TESTED_BY 边）

Phase5 元数据: 记录 142 个源文件 hash

输出: .csp/code-understanding/ 下 6 个文档 + modules/6 个 + .metadata.yaml
```
