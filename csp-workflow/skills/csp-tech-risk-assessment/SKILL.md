---
name: csp-tech-risk-assessment
description: |
  技术方案风险评估引擎。在设计阶段系统性识别和评估技术风险，制定缓解策略。
  覆盖：架构风险、性能风险、安全风险、数据风险、集成风险、运维风险、组织风险。
  使用概率 × 影响矩阵评级，输出风险登记册(Risk Register)和缓解计划。
  当技术方案设计完成后需要评估风险、或用户需要"风险评估"、"风险分析"、"技术风险"时使用。
  关键词：风险评估、技术风险、风险分析、risk assessment、risk analysis、
  风险识别、风险登记册、risk register、风险矩阵、风险缓解、技术隐患、
  风险排查、技术风险排查、风险点、risk evaluation。
version: "1.0.0"
layer: 2
category: workflow
phase: review
domain: quality
scope: review
tools: [Read, Write, Edit, Glob, Grep, Bash]

dependencies:
  skills:
    - csp-tech-solution-design

related_skills:
  - csp-tech-solution-design
  - csp-tech-design-review
  - csp-lifecycle-orchestrator
  - csp-security-review
  - csp-tech-debt-assessment

triggers:
  keywords: ["风险评估", "技术风险", "风险分析", "risk assessment", "risk analysis",
             "风险识别", "风险登记册", "风险矩阵", "风险缓解", "风险排查",
             "技术隐患", "risk register", "risk evaluation", "风险点"]
  intents:
    - "user needs technical risk assessment"
    - "user wants to identify and mitigate risks"
    - "user needs risk register"
  context:
    - "after_tech_solution_design"
    - "after_tech_design_review"

anti_rationalizations:
  "风险看运气，评估了也没用": "已知风险可以通过缓解措施降低概率或影响。评估不是消除风险，是管理风险。"
  "项目小没有风险": "小项目也有风险，只是概率和影响不同。跳过评估 = 在风险面前裸奔。"
  "等出了问题再说": "被动应对的成本远高于主动管理。预防 1 小时 = 救火 40 小时。"
---

# Tech Risk Assessment

技术方案风险评估引擎 — 系统性识别、评估、缓解技术风险。

## 核心理念

风险评估不是悲观预测，而是**风险管理**。每个项目都有风险，不做评估意味着在风险面前毫无准备。好的风险评估：
1. 提前发现潜在问题，而非事后救火
2. 量化风险的概率和影响，优先处理高风险的
3. 制定缓解策略，而非仅仅记录风险
4. 持续跟踪，风险状态动态更新

> **定位与分工（与 `csp-tech-design-review` 的区别）：**
> - `csp-tech-design-review` 回答"设计哪里不对"——找确定性设计缺陷（缺少索引、缺少鉴权、耦合过紧），输出 CRITICAL/WARNING/INFO
> - `csp-tech-risk-assessment` 回答"什么可能出错"——做概率性风险建模（概率 × 影响矩阵），输出风险登记册和缓解计划
> - 两者互补：review 之后做 assessment 可以覆盖 review 未发现的不确定性风险；review 中的安全/性能发现可以作为 assessment 的输入信号

## 输入

- `.csp/tech-design/` — 全套技术方案产物
- `.csp/tech-design/REVIEW-FINDINGS.md` — 评审发现（如有）
- `.csp/decomposition/DECOMPOSITION-SUMMARY.md` — Feature 清单
- `.csp/tech-decisions/ADR/*.md` — 架构决策记录

## 风险识别维度

### 7 大风险维度

#### 1. 架构风险

| 风险类型 | 示例 | 触发条件 |
|---------|------|---------|
| 架构选型不当 | 选择了不适合业务的技术栈 | 新技术栈、团队不熟悉 |
| 扩展性不足 | 单体架构无法支撑增长 | 预估用户量 > 单体承载上限 |
| 耦合度过高 | 模块间强依赖，修改一处影响多处 | 模块边界模糊 |
| 技术债务累积 | 为了赶进度牺牲架构质量 | 时间压力、MVP 快速迭代 |

#### 2. 性能风险

| 风险类型 | 示例 | 触发条件 |
|---------|------|---------|
| 查询性能瓶颈 | 大数据量下查询慢 | 缺少索引、N+1 查询 |
| 缓存穿透/雪崩 | 缓存失效导致 DB 压力 | 热点数据无缓存策略 |
| 并发瓶颈 | 高并发下响应变慢 | 未做并发测试 |
| 资源泄漏 | 内存/连接泄漏 | 连接池配置不当 |

#### 3. 安全风险

| 风险类型 | 示例 | 触发条件 |
|---------|------|---------|
| 认证绕过 | JWT 未签名或弱密钥 | 认证实现不规范 |
| 数据泄露 | API 返回敏感字段 | 响应未过滤 |
| 注入攻击 | SQL/NoSQL/命令注入 | 未使用参数化查询 |
| 权限越权 | 普通用户访问管理接口 | 授权检查不完整 |

#### 4. 数据风险

| 风险类型 | 示例 | 触发条件 |
|---------|------|---------|
| 数据丢失 | 误删除无恢复机制 | 无备份、无软删除 |
| 数据不一致 | 分布式事务失败 | 跨服务操作 |
| 数据迁移失败 | DDL 执行失败 | 大表变更 |
| 数据合规 | 存储了不合规的数据 | GDPR/HIPAA 要求 |

#### 5. 集成风险

| 风险类型 | 示例 | 触发条件 |
|---------|------|---------|
| 第三方服务不可用 | 支付/短信服务宕机 | 强依赖第三方 |
| API 版本不兼容 | 接口变更导致集成方报错 | 无版本策略 |
| 数据格式不一致 | 系统间字段类型不匹配 | 多系统集成 |
| 网络延迟/超时 | 跨网络调用耗时过长 | 跨区域/跨机房部署 |

#### 6. 运维风险

| 风险类型 | 示例 | 触发条件 |
|---------|------|---------|
| 部署失败 | 新版本发布后系统不可用 | 无回滚方案 |
| 单点故障 | 关键服务无冗余 | 单实例部署 |
| 监控盲区 | 关键指标未监控 | 无监控或告警配置 |
| 日志丢失 | 容器重启丢失日志 | 日志未持久化 |

#### 7. 组织风险

| 风险类型 | 示例 | 触发条件 |
|---------|------|---------|
| 关键人依赖 | 核心开发者离职 | 知识集中在少数人 |
| 技术栈学习曲线 | 团队不熟悉新技术 | 引入新技术栈 |
| 需求变更频繁 | 开发中 PRD 频繁变更 | 需求调研不充分 |
| 时间压力 | 不切实际的交付日期 | 倒排期、无缓冲 |

## 风险评级矩阵

### 概率 × 影响 = 风险等级

```
            影响 (Impact)
            Low    Medium    High    Critical
概率       ┌──────┬──────┬──────┬──────┐
(Prob)     │      │      │      │      │
Very High  │  M   │  H   │  C   │  C   │
High       │  M   │  H   │  H   │  C   │
Medium     │  L   │  M   │  H   │  C   │
Low        │  L   │  L   │  M   │  H   │
Very Low   │  L   │  L   │  L   │  M   │
           └──────┴──────┴──────┴──────┘
```

| 风险等级 | 响应策略 | 行动 |
|---------|---------|------|
| C (Critical) | 规避/转移 | 必须立即制定缓解方案，可能需要架构变更 |
| H (High) | 缓解/转移 | 制定详细缓解计划，每周跟踪 |
| M (Medium) | 缓解/接受 | 制定缓解计划，每两周跟踪 |
| L (Low) | 接受 | 记录即可，保持关注 |

### 概率定义

| 等级 | 定义 | 概率范围 |
|------|------|---------|
| Very High | 几乎肯定发生 | > 80% |
| High | 很可能发生 | 50-80% |
| Medium | 可能发生 | 20-50% |
| Low | 不太可能发生 | 5-20% |
| Very Low | 极少发生 | < 5% |

### 影响定义

| 等级 | 进度影响 | 质量影响 | 成本影响 |
|------|---------|---------|---------|
| Critical | 延期 > 2 周 | 系统不可用 | 超预算 > 50% |
| High | 延期 1-2 周 | 核心功能受影响 | 超预算 20-50% |
| Medium | 延期 2-5 天 | 非核心功能受影响 | 超预算 10-20% |
| Low | 延期 < 2 天 | 轻微影响 | 超预算 < 10% |

## 输出产物

```
.csp/tech-design/
├── RISK-REGISTER.md          # 风险登记册
├── RISK-MITIGATION-PLAN.md   # 风险缓解计划
└── RISK-ASSESSMENT-SUMMARY.md # 风险评估摘要
```

### RISK-REGISTER.md 结构

```markdown
# Risk Register

## 风险概览

| 风险等级 | 数量 | 需缓解 | 可接受 |
|---------|------|--------|--------|
| Critical | 0 | 0 | 0 |
| High | 2 | 2 | 0 |
| Medium | 5 | 3 | 2 |
| Low | 8 | 0 | 8 |

## 风险清单

### R-001: 实时协作冲突解决复杂度高
| 属性 | 值 |
|------|-----|
| 维度 | 架构风险 |
| 概率 | High (60%) |
| 影响 | High (延期 1-2 周) |
| 等级 | **H** |
| 触发条件 | 采用 CRDT 方案但团队无经验 |
| 后果 | 功能延期、bug 频发 |
| 缓解策略 | MVP 阶段用乐观锁替代 CRDT，降低复杂度 |
| 负责人 | Tech Lead |
| 状态 | Active |
| 最后更新 | YYYY-MM-DD |

### R-002: 第三方搜索服务不可用
| 属性 | 值 |
|------|-----|
| 维度 | 集成风险 |
| 概率 | Medium (30%) |
| 影响 | Medium (搜索功能不可用) |
| 等级 | **M** |
| 触发条件 | Meilisearch 服务宕机 |
| 后果 | 全文搜索不可用，用户体验下降 |
| 缓解策略 | 降级到 PG FTS 作为后备搜索 |
| 负责人 | DevOps |
| 状态 | Active |
| 最后更新 | YYYY-MM-DD |
```

### RISK-MITIGATION-PLAN.md 结构

```markdown
# Risk Mitigation Plan

## 缓解行动项

| 编号 | 风险 | 缓解措施 | 责任人 | 截止日期 | 状态 |
|------|------|---------|--------|---------|------|
| A1 | R-001 | 实现乐观锁 demo | Dev Lead | Week 1 | Done |
| A2 | R-001 | 评估 CRDT 库成熟度 | Tech Lead | Week 2 | In Progress |
| A3 | R-002 | 配置 PG FTS 降级方案 | Backend | Week 1 | Done |
| A4 | R-002 | 添加搜索服务健康检查 | DevOps | Week 1 | Done |

## 缓解策略模板

### 规避 (Avoid)
- 通过改变方案消除风险
- 例如：放弃不成熟的技术，选择成熟方案

### 缓解 (Mitigate)
- 降低概率或影响
- 例如：增加冗余、增加测试、增加监控

### 转移 (Transfer)
- 将风险转移给第三方
- 例如：使用 SaaS 服务替代自建

### 接受 (Accept)
- 接受风险，准备应急预案
- 例如：低概率低影响的风险
```

## 门控检查

- [ ] 7 个维度均已完成风险识别
- [ ] 每个已识别风险有概率和影响评级
- [ ] High 和 Critical 风险有缓解计划
- [ ] 缓解计划有明确的责任人和截止日期
- [ ] 无未缓解的 Critical 风险（否则不应进入实施阶段）

## 完成信号

```yaml
completion_signal:
  output: .csp/tech-design/RISK-ASSESSMENT-SUMMARY.md
  next_step:
    recommended: csp-tech-design-review
    alternatives: [csp-tech-task-breakdown]
  status:
    risk_register: ready
    critical_count: "{{count}}"
    high_count: "{{count}}"
    mitigation_plan: ready
    phase: review
    ready_for: [tech-design-review, task-breakdown]
```

## 与其他 Skill 的协作

| 上游 Skill | 提供什么 |
|-----------|---------|
| csp-tech-solution-design | 技术方案（作为风险识别基础） |
| csp-tech-design-review | 评审发现（可能揭示新风险） |

| 下游 Skill | 效果 |
|-----------|------|
| csp-tech-design-review | 风险发现可同步到评审报告 |
| csp-tech-task-breakdown | 风险缓解任务可纳入开发计划 |
| csp-lifecycle-orchestrator | 高风险项目影响阶段决策 |

## 快速开始示例

```
输入: 知识库系统技术方案

风险识别:
  架构风险:
    - R-001: 实时协作冲突解决复杂度高 (H) — 缓解: MVP 使用乐观锁
    - R-002: 模块耦合风险 (M) — 缓解: 明确接口契约
  
  性能风险:
    - R-003: 大文档全文搜索性能 (M) — 缓解: 异步索引 + 分页
    - R-004: AI 问答延迟高 (M) — 缓解: 流式响应 + 超时处理
  
  安全风险:
    - R-005: 未授权文档访问 (H) — 缓解: 文档级 RBAC
    - R-006: API 限流不足 (M) — 缓解: per-user + per-IP 限流
  
  数据风险:
    - R-007: 大文档内容存储 (M) — 缓解: S3 存储 + PG 存元数据
  
  集成风险:
    - R-008: AI API 限流/不可用 (M) — 缓解: 降级到静态搜索
  
  运维风险:
    - R-009: 单点故障 (M) — 缓解: 关键服务双实例部署
  
  组织风险:
    - R-010: 新技术栈学习成本 (L) — 缓解: 技术 spike 先行

评级汇总: 0 Critical, 2 High, 7 Medium, 1 Low
缓解计划: 9 个行动项，4 个责任人
```