---
name: csp-design-hub
description: |
  设计方案多模式生成与同步引擎。支持 summary/detailed/rapid/local-rapid/regenerate
  五种模式切换 + 模式互切，输出到现有 .csp/tech-design/ 目录。
  与 csp-tech-solution-design 协作：本技能做模式分发与设计-实现同步管理，
  csp-tech-solution-design 做实际 TDD 生成。支持"设计文档与实现同步"——
  检测代码漂移，标记需同步的设计章节。
  当用户需要"设计方案多模式切换""设计文档重新生成""概要设计""极速设计"时使用。
  关键词：设计模式切换、概要设计、详细设计、极速设计、本地极速、重新生成、
  design mode、summary design、rapid design、regenerate design、
  设计同步、design sync、模式互切、design hub。
version: "1.0.0"
layer: 2
category: workflow
phase: plan
domain: architecture
scope: design
role: architect
tools: [Read, Write, Edit, Glob, Grep, Bash]

dependencies:
  skills:
    - csp-tech-solution-design

related_skills:
  - csp-tech-solution-design
  - csp-fullstack-spec-generator
  - csp-lifecycle-orchestrator
  - csp-tech-design-review
  - csp-implementation-phase

triggers:
  keywords: ["设计模式切换", "概要设计", "极速设计", "本地极速", "重新生成",
             "design mode", "summary design", "rapid design", "regenerate design",
             "设计同步", "design sync", "模式互切", "design hub"]
  intents:
    - "user wants to switch design document mode"
    - "user needs rapid/summary design instead of full TDD"
    - "user wants to regenerate or sync design docs with implementation"
  context:
    - "after_tech_stack_selection"
    - "design_implementation_sync"

anti_rationalizations:
  "设计模式切换没必要，一个详细设计走到底": "不同阶段需要不同精度。初期探索需要概要设计快速验证，实施前才需要详细设计。强制统一精度 = 浪费或不足。"
  "设计文档不需要和实现同步": "设计文档过时 = 误导。代码改了但文档没同步，下一个读文档的人会被误导。同步机制是设计文档可信的前提。"
  "重新生成会丢失之前的设计决策": "regenerate 模式会先备份旧版本到 .csp/tech-design/.archive/，再重新生成。不会丢失历史。"
  "极速设计质量不够": "极速设计不是跳过思考，是用更高密度表达。一张架构图 + 3 个关键决策 = 对有经验的团队足够。"
  "模式互切会引入不一致": "互切有明确规则——升级补全、降级提取摘要（不删原文）、regenerate 先备份。互切是受控的，不是随意改写。"
---

# Design Hub

设计方案多模式生成与同步引擎 — 让设计文档适应当前阶段的精度需求。

## 核心理念

设计文档是**随项目阶段演进、精度可调的动态资产**，不是"一次性全量产出"的静态产物。不同阶段需要不同精度：

- **初期探索**：概要设计快速验证方向（summary）
- **实施前**：详细设计指导编码（detailed）
- **紧急启动**：极速设计抢占时间窗（rapid）
- **单模块迭代**：本地极速限定范围（local-rapid）
- **设计过时**：重新生成对齐现状（regenerate）

本技能管理这些模式的切换与设计-实现同步，实际 TDD 生成逻辑由 `csp-tech-solution-design` 承担。

## 与 csp-tech-solution-design 的边界

| 职责 | 归属 |
|------|------|
| 模式选择 + 模式分发 | **csp-design-hub（本技能）** |
| 模式互切 | **csp-design-hub（本技能）** |
| 设计-实现同步管理 | **csp-design-hub（本技能）** |
| 实际 TDD 生成逻辑（6 维度） | **csp-tech-solution-design（引擎）** |
| 输出目录管理 | 共用 `.csp/tech-design/` |

> **关键原则**：本技能是控制器，`csp-tech-solution-design` 是引擎。镜像 `csp-lifecycle-orchestrator`/`csp-full` 的编排者-执行者模式。

**边界红线**：本技能不重新实现 6 维度 TDD 生成。detailed 模式委派给 `csp-tech-solution-design`；仅 rapid/local-rapid 模式直接生成轻量设计（因为这两类本就不需要全套 TDD）。

## 设计模式

| 模式 | 适用场景 | 输出精度 | 调用方式 |
|------|---------|---------|---------|
| `summary` | 初期探索、方向验证 | 1 页架构概要 + 关键决策 | 调用 `csp-tech-solution-design`，指示只输出 SUMMARY 维度 |
| `detailed` | 实施前、需评审 | 全套 6 维度 TDD | 调用 `csp-tech-solution-design`，正常执行 |
| `rapid` | 紧急启动、抢占时间窗 | 极简架构图 + 3 个关键决策 | 本技能直接生成（轻量，不调引擎） |
| `local-rapid` | 单模块设计、限定范围 | 模块级架构 + 接口 | 本技能直接生成，限定 scope（单模块） |
| `regenerate` | 设计过时、需对齐现状 | 用户指定模式 | 备份旧文档 → 按指定模式全量重新生成 |

## 模式互切

| 当前 → 目标 | 操作 |
|------------|------|
| summary → detailed | 在概要基础上补充详细维度（保留概要，追加详细） |
| detailed → summary | 提取摘要到 SUMMARY（**不删除详细文档**） |
| rapid → detailed | 在极速输出基础上补充缺失维度 |
| any → regenerate | 备份到 `.archive/` → 按新模式全量重新生成 |
| detailed → rapid | 提取 3 个关键决策 + 架构图（保留详细文档为参考） |

**互切红线**：
- 降级（detailed→summary/rapid）**不删除**原文档，只生成新精度版本，原文档保留为参考
- 升级（summary→detailed）在原文档基础上补全，不重写已有部分
- regenerate **必须先备份**到 `.csp/tech-design/.archive/{mode}-{timestamp}/`

## 设计-实现同步机制

### 漂移检测

读取 `.csp/tech-design/` 设计文档 + 已实现代码（`git diff` 或目录扫描），对比设计与实际：

- 设计描述的模块是否存在？
- 设计的接口签名是否与代码一致？
- 设计的关键决策是否在代码中体现？
- 代码是否有设计未覆盖的新增模块/接口？

标记漂移章节到 `.csp/tech-design/.sync-status.yaml`：

```yaml
sync_status:
  last_check: [ISO8601]
  drifted_sections:
    - section: "DATA-ARCHITECTURE.md#users表"
      drift: "代码新增了 deleted_at 字段，设计未记录"
      severity: minor
    - section: "INTERFACE-ARCHITECTURE.md#/api/orders"
      drift: "代码接口签名与设计不一致"
      severity: major
  untracked_code:
    - "modules/billing/（设计未覆盖的新模块）"
```

### 同步操作

两种方向：

1. **更新设计**（代码是对的，设计落后）：更新设计文档中漂移章节，对齐代码现状
2. **标注偏离**（代码偏离设计，需评审）：在 `.sync-status.yaml` 标注偏离原因，生成 `SYNC-REPORT.md` 提交评审，决定是改代码还是改设计

产出 → `.csp/tech-design/SYNC-REPORT.md`

## 执行流程

1. 解析用户意图 → 确定设计模式 + 目标模块（local-rapid 时）
2. 检查 `.csp/tech-design/` 是否已有产物 + `.mode.yaml` 记录的当前模式
3. 分支执行：
   - summary/detailed → 调用 `csp-tech-solution-design`，传入模式指示
   - rapid/local-rapid → 本技能直接生成轻量设计
   - regenerate → 备份 → 按指定模式重新生成
   - 模式互切 → 执行互切操作
   - 同步检查 → 漂移检测 → 输出 SYNC-REPORT.md
4. 更新 `.mode.yaml`（记录当前模式 + 时间）
5. 门控检查

## 输入

- `.csp/decomposition/` — 需求分解（上游）
- `.csp/tech-decisions/` — 技术栈/ADR（上游）
- `.csp/tech-design/` — 已有设计产物（互切/同步时读取）
- `.csp/tech-design/.mode.yaml` — 当前模式记录
- 已实现代码（同步检测时读取）

## 输出产物

共用 `.csp/tech-design/`（与 `csp-tech-solution-design` 共用），额外：

```
.csp/tech-design/
├── [csp-tech-solution-design 的产物]   # ARCHITECTURE-DESIGN.md 等
├── .mode.yaml                           # 当前模式 + 切换历史
├── .sync-status.yaml                    # 漂移检测结果
├── SYNC-REPORT.md                       # 同步报告（同步检查后）
└── .archive/                            # regenerate/降级备份
    └── {mode}-{timestamp}/
```

## 门控检查

- [ ] 当前模式已记录到 `.mode.yaml`
- [ ] summary/rapid 模式输出 ≤ 1 页，含关键决策
- [ ] detailed 模式委派给 `csp-tech-solution-design` 且产物完整
- [ ] regenerate 已备份旧文档到 `.archive/`
- [ ] 互切未删除原文档（降级只新增摘要版）
- [ ] 同步检查产出 `SYNC-REPORT.md`（如执行了同步）

## 完成信号

```yaml
completion_signal:
  output: .csp/tech-design/
  next_step:
    recommended: csp-tech-design-review   # 设计需评审
    alternatives:
      - csp-fullstack-spec-generator      # 详细设计后生成全栈 Spec
      - csp-tech-task-breakdown           # 设计后拆任务
      - csp-implementation-phase           # rapid 后直接实施
  status:
    mode: "summary|detailed|rapid|local-rapid|regenerate"
    design_path: .csp/tech-design/
    delegated_to_engine: true|false       # detailed→true, rapid→false
    sync_report: true|false
    phase: plan
    ready_for: [review, spec, breakdown, implementation]
```

## 与其他 Skill 的协作

| 上游 Skill | 提供什么 |
|-----------|---------|
| `csp-requirement-decomposition` | 需求分解产物 |
| `csp-tech-stack-advisor` | 技术栈决策 |
| `csp-router` | 改码类意图路由：提供 PRD/链接或指定模式时路由到本技能 |

| 下游 Skill | 消费什么 |
|-----------|---------|
| `csp-tech-solution-design` | 模式指示（作为 TDD 生成引擎被调用） |
| `csp-tech-design-review` | 设计产物评审 |
| `csp-fullstack-spec-generator` | 详细设计后生成全栈 Spec |
| `csp-tech-task-breakdown` | 设计后拆解任务 |
| `csp-implementation-phase` | rapid 设计后直接实施 |

| 协同 Skill | 作用 |
|-----------|------|
| `csp-lifecycle-orchestrator` | 生命周期编排（本技能是其 S2.5 技术方案阶段的模式分发器） |

## 快速开始示例

```
输入: "用极速模式帮我出个设计，这个支付模块要重构"

模式判定: rapid
scope: payments 模块（local-rapid 更精确，但 rapid 也可）

执行:
  1. 读 .csp/tech-design/ → 无已有产物
  2. 本技能直接生成（不调 csp-tech-solution-design）:
     - 极简架构图（支付模块内部组件 + 外部依赖）
     - 3 个关键决策（如"支付状态机""幂等策略""异步回调"）
  3. 写 .csp/tech-design/ARCHITECTURE-DESIGN.md（rapid 版，≤1页）
  4. 写 .mode.yaml: mode=rapid, scope=payments

完成信号:
  mode: rapid
  delegated_to_engine: false
  next: csp-implementation-phase（rapid 后可直接实施）

---

输入: "这个设计过时了，代码已经改了很多，帮我同步检查"

模式判定: 同步检查（非设计模式切换）

执行:
  1. 读 .csp/tech-design/ + git diff
  2. 漂移检测 → .sync-status.yaml
  3. 生成 SYNC-REPORT.md:
     - DATA-ARCHITECTURE: 代码新增 deleted_at 字段（minor，更新设计）
     - INTERFACE-ARCHITECTURE: /api/orders 签名不一致（major，需评审）
     - 未覆盖: modules/billing/（设计未记录的新模块）

完成信号:
  sync_report: true
  next: csp-tech-design-review（major 漂移需评审）
```
