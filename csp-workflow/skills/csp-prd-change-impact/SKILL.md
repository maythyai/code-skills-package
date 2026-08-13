---
name: csp-prd-change-impact
description: |
  PRD 变更影响分析引擎。当 PRD 发生变更时，追踪影响链：PRD 条目 → Feature → Spec → Task → Code，
  量化变更影响范围、成本和时间，输出影响分析报告和变更建议。
  依赖 csp-prd-traceability 建立的追溯矩阵。
  当 PRD 变更需要评估影响、或用户需要"变更影响分析"、"需求变更评估"、"影响范围"时使用。
  关键词：变更影响、需求变更、影响分析、change impact、impact analysis、
  变更评估、影响范围、需求变更影响、PRD 变更、变更成本、变更风险、
  需求变更评估、scope change、变更影响评估。
version: "1.0.0"
layer: 2
category: workflow
phase: plan
domain: quality
scope: analysis
tools: [Read, Write, Edit, Glob, Grep]

dependencies:
  skills: [csp-prd-traceability]

related_skills:
  - csp-prd-traceability
  - csp-requirement-decomposition
  - csp-tech-solution-design
  - csp-lifecycle-orchestrator
  - csp-full

triggers:
  keywords: ["变更影响", "需求变更", "影响分析", "change impact", "impact analysis",
             "变更评估", "影响范围", "需求变更影响", "PRD 变更", "变更成本",
             "变更风险", "需求变更评估", "scope change", "变更影响评估"]
  intents:
    - "user wants to assess the impact of a PRD change"
    - "user needs to know which features/specs/tasks are affected by a requirement change"
    - "user wants to estimate the cost of a scope change"
    - "user needs to understand the ripple effects of modifying a requirement"
  context:
    - "prd_changed"
    - "requirement_changed"
    - "scope_change_request"

anti_rationalizations:
  "This is a small change, it won't affect much": "Small changes can have large ripple effects. Trace before you assume."
  "We don't need impact analysis, we'll just fix it": "Without impact analysis, you'll miss affected code and introduce regressions."
  "The traceability matrix is out of date, so impact analysis is impossible": "Even a partial matrix is better than no analysis. Update it first."
  "Impact analysis takes too long": "Not doing impact analysis takes longer when you fix the bugs you missed."
---

# PRD Change Impact Analysis

当 PRD 发生变更时，追踪全链路影响，量化变更成本和风险。

## 核心理念

PRD 变更是常态，不是例外。变更影响分析的价值在于：
1. **看全貌** — 不受局部变更的"看起来很小"迷惑
2. **算成本** — 量化工时、资源和风险成本
3. **做决策** — 基于数据和证据决定是否接受变更

## 输入

- 变更内容（PRD 变更描述、变更条目、增量 PRD）
- `.csp/traceability/RTM.md` — 需求追溯矩阵
- `.csp/decomposition/` — Feature 拆解
- `.csp/specs/` — Feature Spec（如有）
- `.csp/tasks/` — 任务拆解（如有）
- 现有代码库（如已开始实现）

## 执行流程

### Phase 1: 变更解析

解析 PRD 变更内容，分类变更类型：

```markdown
## 变更解析

### 变更类型分类
| 变更 ID | 类型 | 描述 | 来源 |
|---------|------|------|------|
| CHG-001 | 新增 | 新增"批量导入 Feature"功能 | PRD v1.1 |
| CHG-002 | 修改 | "Feature 优先级"从 0-4 改为 0-10 | PRD v1.1 |
| CHG-003 | 删除 | 删除"Feature 导出"功能 | PRD v1.1 |
| CHG-004 | 修改 | "Feature 列表"增加"按标签筛选" | PRD v1.1 |

### 变更类型影响评估
| 类型 | 典型影响范围 | 典型成本 |
|------|------------|---------|
| 新增 | 新增 Feature/Spec/Task | 高 |
| 修改 | 修改已有 Feature/Spec/Task/Code | 中-高 |
| 删除 | 删除 Feature/Spec/Task/Code | 低-中 |
| 澄清 | 不改代码，只更新文档 | 低 |
```

### Phase 2: 影响链追踪

从追溯矩阵追踪变更的影响链：

```markdown
## 影响链追踪

### CHG-001: 新增"批量导入 Feature"

#### 影响链
```
PRD 变更
  → 新增 Feature: F-A-3 (批量导入 Feature)
    → 新增 Spec: SPEC-F-A-3.md
      → 新增 Task: TASK-2.3.1 (imports 表 Migration)
      → 新增 Task: TASK-3.3.1 (导入 API 路由)
      → 新增 Task: TASK-3.3.2 (导入 Service)
      → 新增 Task: TASK-4.3.1 (导入 UI 页面)
```

#### 影响范围
| 层级 | 影响项 | 操作 | 工时影响 |
|------|--------|------|---------|
| PRD | 新增 PRD-007 | 创建 | +1h |
| Feature | 新增 F-A-3 | 创建 | +0.5h |
| Spec | 新增 SPEC-F-A-3 | 创建 | +3h |
| Data | 新增 imports 表 | 创建 Migration | +1h |
| Backend | 导入 API | 新增端点 | +4h |
| Frontend | 导入 UI | 新增页面 | +4h |
| Test | 新增测试 | 单元+集成+E2E | +4h |
| **总计** | | | **+17.5h** |

### CHG-002: 修改"优先级"从 0-4 改为 0-10

#### 影响链
```
PRD 变更
  → 修改 Feature: F-A-1 (Feature CRUD)
    → 修改 Spec: SPEC-F-A-1.md (DB Schema + API + UI)
      → 修改 Task: TASK-2.2.1 (features 表 Migration)
      → 修改 Task: TASK-3.2.2 (Feature Schema)
      → 修改 Task: TASK-4.2.1 (Feature 列表页)
      → 修改 Task: TASK-4.2.2 (Feature 创建/编辑页)
      → 修改 Task: TASK-3.2.5 (Feature API 测试)
      → 修改 Task: TASK-5.1 (E2E 测试)
  → 关联影响: 搜索索引 (priority 字段类型变更)
```

#### 影响范围
| 层级 | 影响项 | 操作 | 工时影响 |
|------|--------|------|---------|
| PRD | 修改 PRD-001 | 更新 | +0.5h |
| Feature | 修改 F-A-1 | 更新 | +0.5h |
| Spec | 修改 SPEC-F-A-1 | 更新 | +1h |
| Data | 修改 features 表 | ALTER CHECK 约束 | +0.5h |
| Backend | 修改 Schema + Service | 修改验证逻辑 | +2h |
| Frontend | 修改 3 个页面 | 修改 UI 组件 | +2h |
| Test | 修改 5 个测试文件 | 更新测试用例 | +2h |
| 搜索 | 修改搜索索引 | 更新索引映射 | +1h |
| **总计** | | | **+9.5h** |

### CHG-003: 删除"Feature 导出"

#### 影响链
```
PRD 变更
  → 删除 Feature: F-A-4 (Feature 导出)
    → 删除 Spec: SPEC-F-A-4.md
      → 删除相关 Task: 3 个
      → 删除相关 Code: 2 个文件
```

#### 影响范围
| 层级 | 影响项 | 操作 | 工时影响 |
|------|--------|------|---------|
| PRD | 删除 PRD-008 | 标记删除 | +0.2h |
| Spec | 删除 SPEC-F-A-4 | 归档 | +0.2h |
| Code | 删除 2 个文件 | 删除 + 清理引用 | +1h |
| Test | 删除 2 个测试文件 | 删除 | +0.5h |
| **总计** | | | **+1.9h** |
```

### Phase 3: 变更汇总

```markdown
## 变更汇总

### 影响摘要
| 变更 ID | 描述 | 类型 | 影响工时 | 影响 Feature | 影响 Task | 风险等级 |
|---------|------|------|---------|-------------|----------|---------|
| CHG-001 | 批量导入 | 新增 | +17.5h | 1 新增 | 5 新增 | 中 |
| CHG-002 | 优先级范围 | 修改 | +9.5h | 1 修改 | 6 修改 | 中 |
| CHG-003 | 删除导出 | 删除 | +1.9h | 1 删除 | 3 删除 | 低 |
| CHG-004 | 标签筛选 | 修改 | +6h | 1 修改 | 3 修改 | 低 |
| **总计** | | | **+34.9h** | **4** | **17** | |

### 时间线影响
| 项目 | 变更前 | 变更后 | 影响 |
|------|--------|--------|------|
| 预估工期 | 12 个工作日 | 16.5 个工作日 | +4.5 天 |
| 预估完成 | 2026-08-29 | 2026-09-04 | 延迟 6 天 |
| 团队规模 | 3 人 | 3 人 | 不变 |
```

### Phase 4: 风险评估

```markdown
## 变更风险评估

### 新增风险
| 风险 | 来源变更 | 概率 | 影响 | 等级 |
|------|---------|------|------|------|
| 批量导入性能问题 | CHG-001 | 中 | 中 | **M(9)** |
| 优先级变更导致已有数据迁移问题 | CHG-002 | 中 | 高 | **H(12)** |
| 标签筛选与现有搜索功能冲突 | CHG-004 | 低 | 中 | **L(6)** |

### 已有风险影响
| 风险 | 影响 | 说明 |
|------|------|------|
| R01: PG 单点 | 无影响 | 不涉及数据库架构变更 |
| R03: 搜索性能 | 影响增加 | CHG-004 新增标签筛选加重搜索负载 |
| R06: 数据增长 | 影响增加 | CHG-001 批量导入加速数据增长 |
```

### Phase 5: 变更建议

```markdown
## 变更建议

### 决策矩阵
| 变更 | 价值 | 成本 | 风险 | 建议 |
|------|------|------|------|------|
| CHG-001: 批量导入 | 高 | +17.5h | 中 | ✅ 接受，建议降低优先级为 P1 |
| CHG-002: 优先级 0-10 | 中 | +9.5h | 中 | ⚠️ 建议评估必要性，是否真的需要 0-10 |
| CHG-003: 删除导出 | 低 | +1.9h | 低 | ✅ 接受，清理代码即可 |
| CHG-004: 标签筛选 | 中 | +6h | 低 | ✅ 接受 |

### 建议的变更执行顺序
1. 先执行 CHG-003 (删除导出，低风险，快速完成)
2. 再执行 CHG-004 (标签筛选，中等风险)
3. 评估 CHG-002 是否必要，如必要则在 CHG-004 后执行
4. 最后执行 CHG-001 (新增批量导入，高成本，建议降优先级)
```

### Phase 6: 输出产物

```
.csp/change-impact/
├── CHANGE-LOG.md              # 变更记录
├── IMPACT-ANALYSIS.md         # 影响链分析
├── IMPACT-SUMMARY.md          # 变更汇总
├── COST-ESTIMATION.md         # 变更成本估算
├── RISK-ASSESSMENT.md         # 变更风险评估
├── RECOMMENDATIONS.md         # 变更建议
└── CHANGE-IMPACT-SUMMARY.md   # 变更影响摘要
```

## 变更影响的自定义规则

```yaml
impact_rules:
  # 自定义影响规则
  field_change:
    priority: "影响: Schema + API + UI + Test"
    status: "影响: Schema + Service + UI + Test"
    title: "影响: Schema + API + UI + Search"
  
  new_feature:
    default_impact: "新增 Feature + Spec + Schema + API + UI + Test"
    estimation: "Simple CRUD: 8-12h, Complex: 20-40h"
  
  delete_feature:
    default_impact: "删除 Feature + Spec + Task + Code + Test"
    estimation: "Simple: 1-3h, Complex: 5-10h"
  
  db_schema_change:
    default_impact: "Migration + Schema + Service + Test"
    risk: "数据迁移风险，需要回滚方案"
```

## 完成信号

```yaml
completion_signal:
  output: .csp/change-impact/CHANGE-IMPACT-SUMMARY.md
  next_step:
    accepted: "更新 PRD/Feature/Spec/Task，进入实现"
    rejected: "记录拒绝原因，归档变更请求"
    needs_discussion: "与相关方讨论后再决定"
  status:
    impact_path: .csp/change-impact/
    total_changes: "{{count}}"
    total_impact_hours: "{{hours}}"
    timeline_delay: "{{days}}"
    high_risk_count: "{{count}}"
    phase: analyze
    ready_for: [decision, implementation]
```

## 关键原则

1. **全链路追踪** — 不只看直接影响，还看间接影响（关联 Feature、搜索索引等）
2. **量化成本** — 不用"影响很大"，用"影响 17.5h，延迟 4.5 天"
3. **风险透明** — 新增风险和已有风险的影响都标注
4. **建议具体** — 不是"可能有问题"，而是"建议降低优先级为 P1，原因：..."
5. **依赖追溯矩阵** — 没有追溯矩阵就没有影响分析，必须先建立 RTM
6. **变更记录归档** — 每次变更分析结果归档，供未来参考