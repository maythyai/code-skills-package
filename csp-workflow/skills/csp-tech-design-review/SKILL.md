---
name: csp-tech-design-review
description: |
  技术方案评审引擎。对技术方案设计文档(TDD)进行多角色并行评审，发现架构层面的问题。
  评审角色包括：架构师、安全专家、性能专家、DBA、运维专家、成本分析师。
  评审维度：架构合理性、可扩展性、安全性、性能、可维护性、可靠性、成本。
  输出分级评审报告（CRITICAL/WARNING/INFO），类似于 code review 但针对设计文档。
  当技术方案完成后需要评审、或用户需要"方案评审"、"设计评审"、"架构评审"时使用。
  关键词：技术方案评审、设计评审、架构评审、方案评审、tech design review、
  design review、architecture review、技术评审、方案审查、设计审查、
  架构审查、tech review、方案把关、方案REVIEW、技术方案检查。
version: "1.0.0"
layer: 2
category: workflow
phase: review
domain: architecture
scope: review
tools: [Read, Write, Edit, Glob, Grep]

dependencies:
  skills: [csp-tech-solution-design]

related_skills:
  - csp-tech-solution-design
  - csp-doc-review
  - csp-code-review
  - csp-tech-risk-assessment
  - csp-lifecycle-orchestrator
  - csp-full

triggers:
  keywords: ["技术方案评审", "设计评审", "架构评审", "方案评审", "技术评审",
             "方案审查", "设计审查", "架构审查", "方案把关", "方案REVIEW",
             "design review", "architecture review", "tech design review",
             "tech review", "技术方案检查", "架构检查"]
  intents:
    - "user wants to review a technical design document"
    - "user needs multi-perspective architecture review"
    - "user wants to validate the technical solution before implementation"
    - "user needs to catch design flaws early"
  context:
    - "after_tech_solution_design"
    - "before_implementation"

anti_rationalizations:
  "The design looks fine, no need for formal review": "Design flaws caught early cost 1x to fix. Caught during implementation cost 10x. Caught in production cost 100x."
  "A single reviewer is enough": "Different perspectives catch different issues. An architect sees what a DBA misses."
  "We can review during code review": "Code review is too late for architecture decisions. Review the design before coding starts."
  "The AI designed it, so it must be correct": "AI-generated designs need adversarial review just like human-generated ones."
---

# Technical Design Review

对技术方案设计文档进行多角色、多维度并行评审，在设计阶段发现并解决架构问题。

## 定位与分工

`csp-tech-design-review` 与 `csp-doc-review` 互补：
- `csp-doc-review` — 审需求文档（PRD、需求规格），关注"做正确的事"
- `csp-tech-design-review` — 审技术方案（TDD），关注"正确地做事"
- `csp-code-review` — 审代码实现，关注"实现是否正确"

## 输入

- `.csp/tech-design/` — 技术方案设计产物（SYSTEM-CONTEXT、ARCHITECTURE-DESIGN、DATA-ARCHITECTURE、INTERFACE-ARCHITECTURE、SECURITY-ARCHITECTURE、KEY-TECHNICAL-CHALLENGES、DECISION-LOG）
- `.csp/decomposition/` — Feature 拆解（用于验证方案覆盖度）
- `.csp/tech-decisions/` — 技术选型 ADR（用于验证方案一致性）
- PRODUCT.md — 产品能力约束（用于验证方案是否满足约束）

## 评审流程

### Phase 1: 评审范围确定

读取技术方案文档，确定评审范围：

```markdown
## Review Scope

方案来源: .csp/tech-design/
方案复杂度: S/M/L/XL
评审深度: 精简/标准/完整
评审角色: 架构师 / 安全专家 / 性能专家 / DBA / 运维专家 / 成本分析师
```

### Phase 2: 多角色并行评审

对每个角色，从不同维度审查技术方案。

#### 角色 1: 架构师 (Architect)

**审查维度:**
- [ ] 架构风格选择是否与需求匹配
- [ ] 服务/模块划分是否合理（高内聚低耦合）
- [ ] 分层架构是否清晰，层间依赖是否单向
- [ ] 是否过度设计或不足设计
- [ ] 抽象层次是否恰当
- [ ] 方案对比是否充分（至少 2 个方案）
- [ ] 设计决策理由是否充分
- [ ] 与现有架构的兼容性

**典型发现:**
```
WARNING: 服务拆分粒度过细（5 个微服务处理 3 个 Feature），团队 3 人维护 5 个服务运维成本过高。
建议: 合并为 2 个模块化服务，待团队增长后再拆分。
```

#### 角色 2: 安全专家 (Security Expert)

**审查维度:**
- [ ] 认证授权模型是否满足安全要求
- [ ] 数据加密策略是否覆盖传输和存储
- [ ] 威胁模型是否完整（STRIDE）
- [ ] 是否需要考虑 OWASP Top 10 风险
- [ ] 敏感数据是否脱敏
- [ ] 密钥管理方案是否安全
- [ ] API 安全措施是否到位（限流/防注入/CSRF）
- [ ] 审计日志是否覆盖关键操作

**典型发现:**
```
CRITICAL: 安全架构中未提及 API 限流策略，存在被刷风险。
建议: 在 API 网关层增加 per-user 限流（100 req/min），核心写操作更低（20 req/min）。
```

#### 角色 3: 性能专家 (Performance Expert)

**审查维度:**
- [ ] 性能目标是否明确（p99 延迟、吞吐量）
- [ ] 缓存策略是否合理（层级、TTL、失效策略）
- [ ] 数据库查询是否考虑到性能（索引、连接池、慢查询）
- [ ] 是否有性能瓶颈单点
- [ ] 关键路径的响应时间是否满足要求
- [ ] 异步处理策略是否合理
- [ ] 静态资源/CDN 策略

**典型发现:**
```
WARNING: 缓存设计中所有 Feature 列表共用同一缓存 key，Filter 参数变化导致缓存命中率极低。
建议: 缓存 key 应包含筛选参数 hash，或使用 Redis 的 Sorted Set 做多维查询缓存。
```

#### 角色 4: DBA (Database Expert)

**审查维度:**
- [ ] 数据库选型是否与数据模型匹配
- [ ] ER 图是否完整，关系建模是否合理
- [ ] 索引设计是否覆盖核心查询
- [ ] 数据一致性策略是否明确
- [ ] 数据量预估和分区策略是否合理
- [ ] 迁移策略是否安全（在线 DDL、回滚方案）
- [ ] 连接池配置是否合理
- [ ] 慢查询监控和优化策略

**典型发现:**
```
CRITICAL: features 表缺少 search_vector 列用于全文搜索，而当前方案依赖 LIKE 查询。
建议: 增加 tsvector 生成列 + GIN 索引，或使用 Meilisearch 做外部搜索。
```

#### 角色 5: 运维专家 (Ops/DevOps)

**审查维度:**
- [ ] 部署拓扑是否高可用
- [ ] 服务健康检查是否配置
- [ ] 日志和监控是否覆盖
- [ ] 告警规则是否合理
- [ ] 灰度发布和回滚方案是否可行
- [ ] 资源预估是否合理
- [ ] 扩容缩容策略

**典型发现:**
```
WARNING: 部署拓扑中所有服务只部署了 1 个 pod，无冗余。
建议: 核心服务至少 2 个 pod，配置 HPA 自动扩缩容，跨可用区部署。
```

#### 角色 6: 成本分析师 (Cost Analyst)

**审查维度:**
- [ ] 基础设施成本是否在预算内
- [ ] 是否过度使用付费服务
- [ ] 是否可以通过优化降低资源需求
- [ ] 自建 vs 托管服务的成本对比
- [ ] 存储成本（数据量 * 保留期）

**典型发现:**
```
INFO: 搜索服务使用 Elasticsearch 需要 4C8G 三节点集群，月成本约 ¥3000。
建议: 如果搜索量 < 100K 文档，可考虑用 Meilisearch（1C2G 单节点，月成本约 ¥200）。
```

### Phase 3: 发现汇总与分析

汇总所有角色发现，合并重复项，优先级排序：

```markdown
## Review Findings

### CRITICAL (必须修复)
| # | 发现 | 来源角色 | 影响范围 | 修复建议 |
|---|------|---------|---------|---------|
| 1 | [标题] | [角色] | [影响] | [建议] |

### WARNING (强烈建议修复)
| # | 发现 | 来源角色 | 影响范围 | 修复建议 |
|---|------|---------|---------|---------|

### INFO (关注项)
| # | 发现 | 来源角色 | 影响范围 | 修复建议 |
|---|------|---------|---------|---------|
```

### Phase 4: 整体评价

```markdown
## Overall Assessment

### 方案质量评分
| 维度 | 评分 (1-5) | 评价 |
|------|-----------|------|
| 架构合理性 | 4 | [评价] |
| 可扩展性 | 3 | [评价] |
| 安全性 | 4 | [评价] |
| 性能 | 3 | [评价] |
| 可维护性 | 4 | [评价] |
| 可靠性 | 3 | [评价] |
| 成本效率 | 3 | [评价] |
| **综合** | **3.4** | [总结] |

### 评审结论
- 状态: [APPROVED / APPROVED WITH MINOR CHANGES / NEEDS REVISION / REJECTED]
- 通过条件: [如需修改，列出必须满足的条件]
- 下一步: [csp-fullstack-spec-generator / 方案修改后重审]
```

### Phase 5: 输出评审报告

将评审报告输出到 `.csp/tech-design/REVIEW-FINDINGS.md`：

```markdown
# Technical Design Review Report

**方案来源:** .csp/tech-design/
**评审日期:** {date}
**评审角色:** [角色列表]
**评审结论:** [APPROVED / NEEDS REVISION]

## Review Summary
[3-5 行总结]

## Findings
[CRITICAL / WARNING / INFO 分级]

## Design Quality Matrix
[评分矩阵]

## Resolution Plan
[修复计划 + 责任人 + 截止日期]
```

## 评审深度

| 方案复杂度 | 评审角色数 | 评审深度 | 预估 Token |
|-----------|-----------|---------|-----------|
| S (简单) | 3 (架构师 + 安全 + DBA) | 精简 | ~1500 |
| M (中等) | 4 (架构师 + 安全 + 性能 + DBA) | 标准 | ~3000 |
| L (复杂) | 5 (全部 4 + 运维) | 完整 | ~5000 |
| XL (分布式) | 6 (全部) | 深度 | ~8000 |

## 完成信号

```yaml
completion_signal:
  output: .csp/tech-design/REVIEW-FINDINGS.md
  next_step:
    APPROVED: csp-fullstack-spec-generator
    APPROVED_WITH_MINOR_CHANGES: csp-tech-solution-design (修复后) → csp-fullstack-spec-generator
    NEEDS_REVISION: csp-tech-solution-design (重新设计)
    REJECTED: csp-tech-solution-design (重新设计)
  status:
    review_path: .csp/tech-design/REVIEW-FINDINGS.md
    phase: review
    ready_for: [spec-generation, re-design]
```

## 关键原则

1. **评审是设计过程的一部分，不是事后检查** — 早评审、小评审、频繁评审
2. **每个角色独立评审** — 角色之间不串通，确保独立视角
3. **必须给出具体修复建议** — 不说"这个设计不好"，说"这个设计的问题是 X，建议改成 Y"
4. **CRITICAL 必须阻塞后续流程** — 致命问题不修复，后续工作都是浪费
5. **评分要诚实** — 不因为 AI 生成就放水，不因为团队决策就降低标准
6. **与 code review 对齐** — 评审发现的结构性问题应反馈到代码规范中