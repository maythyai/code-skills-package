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
phase: review
domain: quality
scope: review
tools: [Read, Write, Edit, Glob, Grep, Bash]

dependencies:
  skills:
    - csp-prd-traceability

related_skills:
  - csp-prd-traceability
  - csp-requirement-decomposition
  - csp-prd-generation
  - csp-tech-task-breakdown
  - csp-tech-risk-assessment
  - csp-product-discovery-orchestrator

triggers:
  keywords: ["变更影响", "需求变更", "影响分析", "change impact", "impact analysis",
             "变更评估", "影响范围", "PRD 变更", "变更成本", "变更风险",
             "需求变更评估", "scope change", "变更影响评估"]
  intents:
    - "user needs to assess impact of PRD changes"
    - "user wants to know what code will be affected by a requirement change"
    - "user needs to estimate cost of a scope change"
  context:
    - "prd_changed"
    - "scope_change_request"

anti_rationalizations:
  "改一个需求而已，影响不大": "需求变更的影响链可能很深。一个 PRD 条目可能关联 3 个 Feature、5 个 Spec、12 个 Task。没有追溯矩阵，你无法判断影响。"
  "做完再评估影响": "事后评估 = 亡羊补牢。变更前评估可以避免浪费已经投入的开发资源。"
  "变更影响主要是代码范围": "除了代码，还需要评估对测试、文档、部署、风险的影响。全链路评估才完整。"
---

# PRD Change Impact Analysis

PRD 变更影响分析引擎 — 基于追溯矩阵，全链路追踪变更影响。

## 核心理念

PRD 变更是软件开发中成本最高的活动之一。变更越晚，成本越高。变更影响分析的价值在于：
1. **量化影响** — 不只是"影响很大"，而是"影响 3 个 Feature，12 个 Task，约 24h 返工"
2. **支持决策** — 让产品经理和开发团队基于数据决定是否接受变更
3. **降低风险** — 提前识别变更可能导致的风险
4. **优化变更方案** — 可能有多种实现方式，选择影响最小的

## 输入

- `.csp/traceability/FORWARD-MATRIX.md` — 正向追溯矩阵
- `.csp/traceability/BACKWARD-MATRIX.md` — 反向追溯矩阵
- `.csp/traceability/COVERAGE-REPORT.md` — 覆盖率报告
- PRD 变更内容（新增/修改/删除的 PRD 条目）
- `.csp/tasks/WBS.md` — 当前任务状态

## 变更分类

### 变更类型

| 类型 | 描述 | 典型影响范围 |
|------|------|------------|
| 新增 (ADD) | 新增 PRD 条目 | 新增 Feature → Spec → Task → Code |
| 修改 (MODIFY) | 修改已有 PRD 条目 | 修改 Feature → 修改 Spec → 修改 Task → 修改 Code |
| 删除 (REMOVE) | 删除已有 PRD 条目 | 删除/标记废弃 Feature → Spec → Task → Code |
| 拆分 (SPLIT) | 一个 PRD 条目拆为多个 | 新增 Feature + 修改原 Feature |
| 合并 (MERGE) | 多个 PRD 条目合并为一个 | 修改/删除 Feature |
| 优先级变更 (PRIORITY) | 调整优先级 | 影响 Task 执行顺序和 Wave 划分 |

### 变更成本系数

| 变更阶段 | 相对成本 | 说明 |
|---------|---------|------|
| 需求阶段 | 1x | 仅修改 PRD 文档 |
| 设计阶段 | 2x | 修改 PRD + 技术方案 |
| 开发阶段 | 5x | 修改 PRD + 方案 + 代码 + 测试 |
| 测试阶段 | 10x | 修改 + 重新测试 + 可能回归 |
| 上线后 | 20x+ | 修改 + 测试 + 部署 + 可能回滚 + 用户影响 |

## 影响分析流程

```
1. 接收 PRD 变更内容
2. 识别变更类型（新增/修改/删除/优先级）
3. 通过追溯矩阵定位影响链路
4. 评估每个层级的影响：
   a. Feature 层: 新增/修改/删除 Feature
   b. Spec 层: 新增/修改/删除 Spec
   c. Task 层: 新增/修改/删除 Task，估算工时
   d. Code 层: 新增/修改/删除文件
   e. 测试层: 新增/修改测试用例
   f. 文档层: 更新相关文档
   g. 风险层: 重新评估风险
5. 量化影响（范围、工时、风险）
6. 输出影响分析报告
7. 给出变更建议
```

## 影响链路追踪

### 追踪示例

```
变更: 修改 PRD-2.1 "文档创建" → 增加"支持 Markdown 实时预览"

追溯链路:
  PRD-2.1 → F-B-1 (文档管理) → SPEC-F-B-1 → Tasks

影响分析:
  Feature 层:
    - F-B-1: 修改（增加实时预览功能）
  
  Spec 层:
    - SPEC-F-B-1: 修改（增加实时预览 UI 规格 + 后端渲染 API）
  
  Task 层:
    - T-2-5 (文档创建 API): 修改（增加 Markdown 渲染端点）
    - T-3-2 (文档编辑页): 修改（增加预览面板组件）
    - 新增 Task: 实现 Markdown 渲染服务
    - 新增 Task: 预览面板组件开发
  
  Code 层:
    - 修改: app/api/documents.py (新增 render 端点)
    - 修改: app/services/markdown_service.py (新增渲染逻辑)
    - 修改: frontend/components/DocumentEditor.tsx (增加预览面板)
    - 新增: frontend/components/MarkdownPreview.tsx
  
  Test 层:
    - 修改: test_documents_api.py (新增渲染端点测试)
    - 新增: test_markdown_preview.py (预览组件测试)
    - 修改: e2e/document-edit.spec.ts (更新 E2E 流程)
  
  Doc 层:
    - 修改: SPEC-F-B-1.md
    - 修改: ARCHITECTURE-DESIGN.md (如果有架构变更)
  
  Risk 层:
    - 新增风险: Markdown 渲染 XSS 安全风险
    - 新增风险: 大文档预览性能问题
```

## 影响量化

### 影响范围汇总

```markdown
## Change Impact Summary

### 变更信息
| 属性 | 值 |
|------|-----|
| 变更 ID | CHG-001 |
| 变更类型 | MODIFY |
| 变更 PRD 条目 | PRD-2.1 "文档创建" |
| 变更描述 | 增加 Markdown 实时预览功能 |
| 变更阶段 | 开发阶段 (成本系数 5x) |
| 请求人 | Product Manager |
| 评估日期 | YYYY-MM-DD |

### 影响范围

| 层级 | 新增 | 修改 | 删除 | 无影响 |
|------|------|------|------|--------|
| Feature | 0 | 1 | 0 | 11 |
| Spec | 0 | 1 | 0 | 11 |
| Task | 2 | 2 | 0 | 36 |
| Code (文件) | 1 | 3 | 0 | ~50 |
| Test | 1 | 2 | 0 | ~20 |
| Doc | 0 | 2 | 0 | ~10 |
| Risk | 2 | 0 | 0 | 8 |

### 工作量估算

| 活动 | 原始工时 | 变更工时 | 增量 |
|------|---------|---------|------|
| 开发 | 74h | 84h | +10h |
| 测试 | 16h | 19h | +3h |
| 文档 | 已包含 | 已包含 | +1h |
| 风险缓解 | 已包含 | 已包含 | +2h |
| **总计** | **74h** | **90h** | **+16h (22%)** |

### 进度影响

| 指标 | 变更前 | 变更后 | 影响 |
|------|--------|--------|------|
| 预计完成日期 | 2026-02-10 | 2026-02-13 | +3 天 |
| 关键路径 | 87h | 95h | +8h |
| 风险等级 | 中 | 中 | 新增 2 个风险 |
```

## 变更方案对比

对同一变更，可能有多种实现方式，提供对比分析：

```markdown
## 变更方案对比

### 方案 A: 完全实现 (推荐)
- 描述: 完整实现 Markdown 实时预览，包括语法高亮、数学公式、Mermaid 图表
- 工时: +16h
- 风险: 中（新增 2 个风险）
- 优势: 用户体验完整，竞争力强
- 劣势: 工期延长 3 天

### 方案 B: 最小实现
- 描述: 仅实现基本 Markdown 渲染（标题、列表、代码块），其他功能后续迭代
- 工时: +6h
- 风险: 低（功能简单，风险小）
- 优势: 工期影响小，快速上线
- 劣势: 功能不完整，需后续迭代

### 方案 C: 延时实现
- 描述: 本迭代不实现，纳入下一迭代计划
- 工时: 0h（当前迭代）
- 风险: 无
- 优势: 不影响当前迭代
- 劣势: 产品竞争力不足，用户反馈延迟

### 推荐: 方案 B — 最小实现
- 理由: 快速验证用户需求，根据反馈决定是否在下一迭代中增强
```

## 变更决策矩阵

```yaml
decision_matrix:
  accept:
    conditions:
      - "增量工时 < 总工时 20%"
      - "无 Critical 风险新增"
      - "不影响核心里程碑"
    action: "纳入当前迭代，调整计划"
  
  accept_with_conditions:
    conditions:
      - "增量工时 20-40%"
      - "有新增风险但可缓解"
      - "核心里程碑可能延期 1-3 天"
    action: "与 PM 协商范围置换（用新功能替换低优先级功能）"
  
  defer:
    conditions:
      - "增量工时 > 40%"
      - "有 Critical 风险且无法缓解"
      - "核心里程碑延期 > 3 天"
    action: "纳入下一迭代"
  
  reject:
    conditions:
      - "变更与技术架构冲突"
      - "变更违反产品策略"
      - "变更成本远超收益"
    action: "拒绝变更，给出替代建议"
```

## 输出产物

```
.csp/traceability/
├── CHANGE-IMPACT-CHG-001.md        # 变更影响分析报告
└── CHANGE-HISTORY.md               # 变更历史记录
```

## 门控检查

- [ ] 变更影响链路完整追踪（PRD → Feature → Spec → Task → Code）
- [ ] 影响范围已量化（各层级的新增/修改/删除数量）
- [ ] 工作量影响已估算
- [ ] 进度影响已评估
- [ ] 风险影响已重新评估
- [ ] 变更方案对比已完成（至少 2 个方案）
- [ ] 变更决策已完成（接受/有条件接受/延期/拒绝）

## 完成信号

```yaml
completion_signal:
  output: .csp/traceability/CHANGE-IMPACT-{CHG-ID}.md
  next_step:
    on_accept: update csp-prd-traceability and csp-tech-task-breakdown
    on_defer: add to next iteration backlog
    on_reject: document rejection reason
  status:
    change_id: "CHG-{id}"
    decision: "accept | accept_with_conditions | defer | reject"
    impact_hours: "{{hours}}"
    affected_features: "{{count}}"
    affected_tasks: "{{count}}"
    phase: review
```

## 与其他 Skill 的协作

| 上游 Skill | 提供什么 |
|-----------|---------|
| csp-prd-traceability | 追溯矩阵（影响链路基础） |
| csp-tech-task-breakdown | 当前任务状态 |
| csp-effort-estimation | 当前工时估算 |

| 下游 Skill | 效果 |
|-----------|------|
| csp-prd-traceability | 更新追溯矩阵（如接受变更） |
| csp-tech-task-breakdown | 更新任务拆解（如接受变更） |
| csp-tech-risk-assessment | 重新评估风险 |

## 快速开始示例

```
变更: PRD-2.1 "文档创建" → 增加 Markdown 实时预览
变更阶段: 开发阶段 (成本系数 5x)

追溯链路:
  PRD-2.1 → F-B-1 → SPEC-F-B-1 → T-2-5, T-3-2 (and 2 new tasks)

影响分析:
  Feature: 1 修改
  Spec: 1 修改
  Task: 2 新增 + 2 修改
  Code: 1 新增 + 3 修改
  Test: 1 新增 + 2 修改
  Doc: 2 修改
  Risk: 2 新增

工作量: +16h (22%)
进度: +3 天
风险: 从 M 升到 M+ (新增 XSS 和性能风险)

方案对比:
  A) 完全实现: +16h, 风险中, 体验完整
  B) 最小实现: +6h, 风险低, 基本功能 (推荐)
  C) 延时: 0h, 无风险, 下迭代

决策: 方案 B (有条件接受)
行动: 置换低优先级功能 P2-3 以平衡工期
```