---
name: csp-tech-design-review
description: |
  技术方案评审引擎。对技术方案设计文档(TDD)进行多角色并行评审，发现架构层面的问题。
  评审角色包括：架构师、安全专家、性能专家、DBA、运维专家、成本分析师。
  评审维度：架构合理性、可扩展性、安全性、性能、可维护性、可靠性、成本。
  输出分级评审报告（CRITICAL/WARNING/INFO），类似于 code review 但针对设计文档。
  当技术方案完成后需要评审、或用户需要"方案评审"、"设计评审"、"架构评审"时使用。
  关键词：技术方案评审、设计评审、架构评审、方案评审、tech design review、
  design review、architecture review、技术评审、方案审核、技术方案审核、
  设计审核、技术方案评估、方案评估、技术评估。
version: "1.0.0"
layer: 2
category: workflow
phase: review
domain: architecture
scope: review
tools: [Read, Write, Edit, Glob, Grep, Bash]

dependencies:
  skills:
    - csp-tech-solution-design

related_skills:
  - csp-tech-solution-design
  - csp-doc-review
  - csp-code-review
  - csp-tech-risk-assessment
  - csp-lifecycle-orchestrator
  - csp-multi-review

triggers:
  keywords: ["技术方案评审", "设计评审", "架构评审", "方案评审", "技术评审",
             "tech design review", "design review", "architecture review",
             "方案审核", "方案评估", "技术方案评估"]
  intents:
    - "user needs technical design review"
    - "user wants architecture review"
    - "user needs to validate design decisions"
  context:
    - "after_tech_solution_design"

anti_rationalizations:
  "方案是我自己写的，不用评审": "作者偏见是最大的盲区。自己写的方案至少要经过 2 个独立角色评审。"
  "项目太小不需要评审": "小项目也有架构决策。评审的深度可以缩放，但不能跳过。"
  "评审太慢，先做起来": "设计阶段的返工成本远低于实施后的返工。现在花 1 小时评审，可能节省 40 小时重写。"
---

# Tech Design Review

技术方案评审引擎 — 多角色并行评审，确保技术方案在落地前经过充分验证。

## 核心理念

技术方案评审不是找茬，而是**降低技术决策风险**。好的评审：
1. 发现盲区 — 每个人都有自己的知识盲区，多角色互补
2. 验证假设 — 技术方案中隐含的假设需要被挑战
3. 统一认知 — 评审过程也是团队对齐过程
4. 防止过度设计 — 架构师的方案可能过于复杂，需要实际约束拉回

与 `csp-doc-review` 的分工：
- `csp-doc-review` 审需求文档（PRD/需求文档），关注需求完整性、一致性
- `csp-tech-design-review` 审技术方案（TDD），关注架构合理性、可行性

## 评审角色

### 6 大评审角色

| 角色 | 关注点 | 典型问题 |
|------|--------|---------|
| 架构师 | 系统架构合理性、模块划分、扩展性 | "这个模块职责是否单一？扩展点在哪里？" |
| 安全专家 | 安全架构、威胁建模、数据保护 | "API 鉴权是否覆盖所有端点？敏感数据是否加密？" |
| 性能专家 | 性能瓶颈、容量规划、缓存策略 | "这个查询在 100 万数据下需要多久？" |
| DBA | 数据模型、索引设计、一致性策略 | "这个表设计是否满足第三范式？索引是否合理？" |
| 运维专家 | 部署方案、监控告警、容灾策略 | "如何滚动升级？回滚方案是什么？" |
| 成本分析师 | 资源需求、成本估算、优化建议 | "这个架构的月度云成本预估是多少？" |

## 评审输入

- `.csp/tech-design/ARCHITECTURE-DESIGN.md` — 系统架构设计
- `.csp/tech-design/DATA-ARCHITECTURE.md` — 数据架构设计
- `.csp/tech-design/INTERFACE-ARCHITECTURE.md` — 接口架构设计
- `.csp/tech-design/SECURITY-ARCHITECTURE.md` — 安全架构设计
- `.csp/tech-design/KEY-CHALLENGES.md` — 关键技术难点
- `.csp/tech-design/SOLUTION-COMPARISON.md` — 方案对比
- `.csp/tech-decisions/ADR/*.md` — 架构决策记录

## 评审流程

```
1. 加载技术方案全套产物
2. 并行启动 6 个评审角色（每个角色独立审查）
3. 每个角色输出评审发现（CRITICAL / WARNING / INFO）
4. 汇总所有发现，去重，按严重程度排序
5. 生成评审报告
6. [门控] 无 CRITICAL → 通过；有 CRITICAL → 需要修复
```

## 评审发现分级

### CRITICAL — 必须修改

会导致安全事故、数据丢失、系统不可用或无法扩展的设计缺陷：

- 安全漏洞（未鉴权的敏感接口、明文存储密码）
- 数据一致性风险（缺少事务保护的关键操作）
- 单点故障（关键服务无冗余）
- 架构不可扩展（上线即瓶颈）
- 关键技术难点无攻克方案

### WARNING — 建议修改

可能导致性能问题、维护困难或成本过高：

- 缺少索引的关键查询
- 缓存策略不合理
- 接口设计不规范（缺少版本策略）
- 部署方案缺少监控/告警
- 模块耦合度过高

### INFO — 改进建议

不影响功能但可优化的设计建议：

- 命名规范建议
- 日志策略建议
- 文档完善建议
- 代码组织建议
- 技术选型替代方案（不强制）

## 评审维度矩阵

| 维度 | 架构师 | 安全专家 | 性能专家 | DBA | 运维专家 | 成本分析师 |
|------|--------|---------|---------|-----|---------|-----------|
| 架构合理性 | ● | ○ | ○ | ○ | ○ | ○ |
| 可扩展性 | ● | ○ | ● | ● | ○ | ○ |
| 安全性 | ○ | ● | ○ | ○ | ○ | ○ |
| 性能 | ○ | ○ | ● | ● | ○ | ○ |
| 可维护性 | ● | ○ | ○ | ○ | ● | ○ |
| 可靠性 | ● | ○ | ○ | ○ | ● | ○ |
| 成本 | ○ | ○ | ○ | ○ | ○ | ● |

● 主要关注 ○ 次要关注

## 输出产物

### REVIEW-FINDINGS.md

```markdown
# Technical Design Review Report

## 评审概览
- 评审日期: YYYY-MM-DD
- 评审范围: .csp/tech-design/
- 评审角色: 架构师、安全专家、性能专家、DBA、运维专家、成本分析师
- 发现总数: N
- 评审结论: APPROVED / APPROVED_WITH_MINOR_CHANGES / NEEDS_REVISION

## 发现汇总

| 编号 | 严重程度 | 维度 | 发现 | 影响 | 建议 |
|------|---------|------|------|------|------|
| R1 | CRITICAL | 安全 | API 未鉴权 | 数据泄露 | 增加 JWT 中间件 |
| R2 | WARNING | 性能 | 列表查询无分页 | 大数据量 OOM | 增加分页参数 |
| R3 | WARNING | 运维 | 无健康检查端点 | 无法自动恢复 | 增加 /health 端点 |
| R4 | INFO | 架构 | 模块命名建议 | 可读性 | 重命名为 xxx |

## 分角色评审详情

### 架构师评审
**总体评价：** [评价]

**发现：**
- [R-X] CRITICAL/WARNING/INFO: [描述]
  - 问题: [具体问题]
  - 影响: [影响范围]
  - 建议: [修改建议]
  - 参考: [相关 ADR 或最佳实践]

### 安全专家评审
...

### 性能专家评审
...

### DBA 评审
...

### 运维专家评审
...

### 成本分析师评审
...

## 评审结论

- [ ] APPROVED — 无 CRITICAL，WARNING ≤ 3
- [ ] APPROVED_WITH_MINOR_CHANGES — 无 CRITICAL，WARNING > 3 但非阻塞
- [ ] NEEDS_REVISION — 存在 CRITICAL，需修复后重新评审

## 后续行动

| 行动项 | 负责人 | 截止日期 | 状态 |
|--------|--------|---------|------|
| 修复 R1 | [name] | YYYY-MM-DD | Pending |
| 修复 R2 | [name] | YYYY-MM-DD | Pending |
```

## 评审策略

| 项目复杂度 | 评审深度 | 评审角色 | 评审时间 |
|-----------|---------|---------|---------|
| S (简单) | 核心角色 | 架构师 + 安全专家 | 30 min |
| M (中等) | 完整 6 角色 | 全部 | 1-2 h |
| L (复杂) | 完整 6 角色 + 专项 | 全部 + 领域专家 | 2-4 h |
| XL (核心) | 完整 + 外部评审 | 全部 + 外部顾问 | 1-2 d |

## 门控规则

```yaml
gate:
  PASS:
    - no_critical_findings: true
    - warning_count: <= 3
    - conclusion: APPROVED or APPROVED_WITH_MINOR_CHANGES
  
  FAIL:
    - has_critical_findings: true  → NEEDS_REVISION
    - warning_count: > 3 and unaddressed → NEEDS_REVISION
  
  RETRY:
    - after_fix: re-run review for affected dimensions only
    - max_retries: 3
```

## 完成信号

```yaml
completion_signal:
  output: .csp/tech-design/REVIEW-FINDINGS.md
  next_step:
    on_approved: csp-tech-task-breakdown or csp-fullstack-spec-generator
    on_needs_revision: retry csp-tech-solution-design
  status:
    conclusion: "APPROVED | APPROVED_WITH_MINOR_CHANGES | NEEDS_REVISION"
    critical_count: "{{count}}"
    warning_count: "{{count}}"
    phase: review
    ready_for: [task-breakdown, spec-generation]
```

## 与其他 Skill 的协作

| 上游 Skill | 提供什么 |
|-----------|---------|
| csp-tech-solution-design | 全套技术方案产物 |

| 下游 Skill | 效果 |
|-----------|------|
| csp-tech-solution-design | 需要修复 CRITICAL 时回退 |
| csp-tech-task-breakdown | 评审通过后进入任务拆解 |
| csp-fullstack-spec-generator | 评审通过后生成全栈 Spec |
| csp-tech-risk-assessment | 评审发现的风险纳入风险评估 |

## 快速开始示例

```
用户: "评审刚才的技术方案"

执行:
  1. 加载 .csp/tech-design/ 全套产物
  2. 并行启动 6 个评审角色:
     - 架构师: 发现模块边界模糊，建议明确接口契约
     - 安全专家: 发现 JWT 无刷新机制，标记 WARNING
     - 性能专家: 发现列表查询无分页，标记 WARNING
     - DBA: 发现缺少联合索引，标记 WARNING
     - 运维专家: 发现无健康检查端点，标记 WARNING
     - 成本分析师: 预估月成本 $500-800，标记 INFO
  3. 汇总: 0 CRITICAL, 4 WARNING, 1 INFO
  4. 评审结论: APPROVED_WITH_MINOR_CHANGES
  5. 输出 .csp/tech-design/REVIEW-FINDINGS.md
```