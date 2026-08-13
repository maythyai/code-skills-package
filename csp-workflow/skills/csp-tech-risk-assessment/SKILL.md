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
phase: plan
domain: architecture
scope: analysis
tools: [Read, Write, Edit, Glob, Grep]

dependencies:
  skills: [csp-tech-solution-design]

related_skills:
  - csp-tech-solution-design
  - csp-tech-design-review
  - csp-lifecycle-orchestrator
  - csp-full

triggers:
  keywords: ["风险评估", "技术风险", "风险分析", "risk assessment", "风险识别",
             "风险登记册", "risk register", "风险矩阵", "风险缓解", "技术隐患",
             "风险排查", "技术风险排查", "风险点", "risk evaluation", "risk analysis"]
  intents:
    - "user wants to assess technical risks in the design"
    - "user needs a risk register for the project"
    - "user wants to identify potential failure points"
    - "user needs mitigation strategies for identified risks"
  context:
    - "after_tech_solution_design"
    - "before_implementation"

anti_rationalizations:
  "This project is too simple for risk assessment": "Even simple projects have risks. A single DB failure can take down the entire app."
  "We'll handle risks as they come up": "Reactive risk handling is 10x more expensive than proactive risk mitigation."
  "The risks are obvious": "Obvious risks are rarely documented, and undocumented risks are forgotten risks."
  "Risk assessment is PM's job": "Technical risks need engineering judgment. PMs can't assess architecture or performance risks."
---

# Technical Risk Assessment

在设计阶段系统性地识别、评级和缓解技术风险。

## 核心理念

风险管理的黄金法则：
1. **早识别** — 设计阶段发现的风险成本最低
2. **量化评级** — 不是"这个有风险"，而是"概率 30%，影响 4 天"
3. **有缓解** — 每个风险有具体的缓解策略，不是"注意一下"
4. **持续跟踪** — 风险登记册是活的文档，随项目推进更新

## 输入

- `.csp/tech-design/` — 技术方案设计产物
- `.csp/decomposition/NFR.md` — 非功能性需求（含 SLA 等指标）
- `.csp/tech-decisions/` — 技术选型 ADR
- 团队信息（规模、经验、技能分布）

## 执行流程

### Phase 1: 风险识别

从 7 个维度系统性地识别风险：

```markdown
## 风险识别清单

### 1. 架构风险
- [ ] 单点故障: 是否有服务无冗余
- [ ] 循环依赖: 服务间是否存在循环调用
- [ ] 架构不匹配: 架构风格是否与需求规模匹配
- [ ] 过度设计: 是否引入了不必要的复杂度
- [ ] 技术债: 是否为了速度牺牲了长期可维护性

### 2. 性能风险
- [ ] 瓶颈点: 高并发下哪个组件先成为瓶颈
- [ ] 冷启动: 容器/函数冷启动时间是否可接受
- [ ] 内存泄漏: 是否有潜在的内存泄漏风险
- [ ] 慢查询: 是否有不加索引的查询
- [ ] 缓存穿透: 缓存策略是否有穿透风险

### 3. 安全风险
- [ ] 未授权的数据访问: 是否有越权访问的可能
- [ ] 注入攻击: 是否有 SQL/NoSQL 注入风险
- [ ] 敏感数据泄露: 日志/错误信息是否包含敏感数据
- [ ] 会话管理: Token/会话管理是否安全
- [ ] 依赖漏洞: 第三方库是否有已知漏洞

### 4. 数据风险
- [ ] 数据丢失: 是否有数据备份和恢复方案
- [ ] 数据不一致: 分布式事务如何保证一致性
- [ ] 数据迁移: 大表变更是否有在线 DDL 方案
- [ ] 数据增长: 1 年后的数据量是否超出当前设计
- [ ] 数据隔离: 多租户数据隔离是否可靠

### 5. 集成风险
- [ ] 第三方依赖: 外部服务不可用时的降级方案
- [ ] API 变更: 第三方 API 变更的兼容性
- [ ] 网络延迟: 跨区域/跨服务调用的延迟
- [ ] 数据格式: 集成方数据格式变化的影响

### 6. 运维风险
- [ ] 部署失败: 部署流程是否有回滚能力
- [ ] 监控盲区: 是否有未监控的关键指标
- [ ] 告警风暴: 是否有大量误报告警
- [ ] 日志不足: 出问题时是否有足够的日志排查
- [ ] 灾难恢复: 是否有 RTO/RPO 定义

### 7. 组织风险
- [ ] 关键人依赖: 核心模块是否只有一人熟悉
- [ ] 技能缺口: 团队是否缺少某项关键技术能力
- [ ] 学习曲线: 新技术栈的学习成本是否被低估
- [ ] 并行瓶颈: 是否因为依赖关系大部分任务只能串行
```

### Phase 2: 风险评级

使用 5×5 风险矩阵：

```markdown
## 风险矩阵

### 概率 (Probability)
| 等级 | 描述 | 概率范围 |
|------|------|---------|
| 1 | 几乎不可能 | < 5% |
| 2 | 不太可能 | 5-20% |
| 3 | 可能 | 20-40% |
| 4 | 很可能 | 40-70% |
| 5 | 几乎确定 | > 70% |

### 影响 (Impact) — 按类型
| 等级 | 进度影响 | 技术影响 | 业务影响 |
|------|---------|---------|---------|
| 1 | < 0.5 天 | 可忽略 | 无感知 |
| 2 | 0.5-2 天 | 轻微 | 轻微体验下降 |
| 3 | 2-5 天 | 中等 | 部分功能不可用 |
| 4 | 1-2 周 | 严重 | 核心功能不可用 |
| 5 | > 2 周 | 灾难 | 系统不可用 / 数据丢失 |

### 风险等级 = 概率 × 影响
| 分数 | 等级 | 处理策略 |
|------|------|---------|
| 1-4 | 低 (L) | 监控，不主动处理 |
| 5-9 | 中 (M) | 制定缓解计划，按需执行 |
| 10-16 | 高 (H) | 必须制定缓解计划，定期跟踪 |
| 17-25 | 严重 (C) | 必须立即缓解，阻塞后续流程 |
```

### Phase 3: 风险登记册

```markdown
## Risk Register

| ID | 风险描述 | 类别 | 概率 | 影响 | 等级 | 触发条件 | 缓解策略 | 负责人 | 状态 |
|----|---------|------|------|------|------|---------|---------|--------|------|
| R01 | PostgreSQL 单点故障导致全站不可用 | 架构 | 3 | 5 | **H(15)** | 主库宕机 | 配置主从复制 + 自动故障转移 | [name] | Open |
| R02 | 未做 API 限流导致被恶意刷接口 | 安全 | 4 | 4 | **H(16)** | 上线后 | 网关层增加 per-user 限流 | [name] | Open |
| R03 | 全文搜索使用 LIKE 查询，10K 数据时性能下降 | 性能 | 4 | 2 | **M(8)** | 数据量 > 5K | 切换到 Meilisearch 或添加 tsvector | [name] | Open |
| R04 | 团队不熟悉 Rust，学习曲线影响进度 | 组织 | 3 | 4 | **H(12)** | 选择 Rust 时 | 换用 Go 或安排 Rust 培训 | [name] | Open |
| R05 | 第三方支付 API 因网络问题不可用 | 集成 | 2 | 4 | **M(8)** | 支付 API 超时 | 实现重试 + 降级（记录订单、后补支付） | [name] | Open |
| R06 | features 表软删除后历史数据持续增长 | 数据 | 4 | 2 | **M(8)** | 运行 6 个月后 | 定期归档 + 分区表 | [name] | Open |
| R07 | 只有一个 DBA 熟悉数据库设计 | 组织 | 2 | 5 | **H(10)** | DBA 离职 | 文档化所有设计决策 + 交叉培训 | [name] | Open |
| R08 | 部署脚本未测试回滚，首次灰度失败时手忙脚乱 | 运维 | 3 | 3 | **M(9)** | 首次部署 | 部署前 dry-run 测试回滚流程 | [name] | Open |

### 风险热力图

|      | 1(极低) | 2(低) | 3(中) | 4(高) | 5(极高) |
|------|--------|------|------|------|---------|
| 1(极小) | | | | | |
| 2(小) | | | | R05 | R07 |
| 3(中) | | | R08 | R04 | R01 |
| 4(大) | | R03,R06 | | R02 | |
| 5(灾难) | | | | | |

🟢 低风险 (1-4)  🟡 中风险 (5-9)  🟠 高风险 (10-16)  🔴 严重风险 (17-25)
```

### Phase 4: 缓解计划

```markdown
## 缓解计划

### 立即执行 (C 级，阻塞项目启动)
| 风险 | 缓解措施 | 成本 | 执行时间 | 验证方式 |
|------|---------|------|---------|---------|
| — | — | — | — | — |

### 短期执行 (H 级，开发生命周期内)
| 风险 | 缓解措施 | 成本 | 截止时间 | 验证方式 |
|------|---------|------|---------|---------|
| R01: PG 单点 | 配置主从 + 自动故障转移 | 2h | Wave 1 | 杀掉主库，验证自动切换 |
| R02: 无限流 | 网关增加限流中间件 | 1h | Wave 3 | 压测验证限流生效 |
| R04: Rust 学习曲线 | 换用 Go 或安排培训 | 1d | 技术选型阶段 | 团队成员完成 Go 教程 |

### 中期执行 (M 级，监控触发)
| 风险 | 触发条件 | 缓解措施 | 执行时间 |
|------|---------|---------|---------|
| R03: 搜索性能 | 数据量 > 5K | 切换 Meilisearch | 1d |
| R05: 支付不可用 | 首次超时 | 实现重试 + 降级 | 2h |
| R06: 数据增长 | 运行 6 个月 | 定期归档 | 0.5d |
| R08: 回滚失败 | 首次部署前 | dry-run 回滚 | 1h |

### 长期跟踪 (L 级，定期回顾)
| 风险 | 回顾频率 | 负责人 |
|------|---------|--------|
| — | — | — |
```

### Phase 5: 风险跟踪矩阵

```markdown
## 风险跟踪

### 项目启动时评估
- 总风险数: 8
- 严重 (C): 0
- 高 (H): 4 (R01, R02, R04, R07)
- 中 (M): 4 (R03, R05, R06, R08)
- 低 (L): 0

### 风险暴露度 (Risk Exposure)
总暴露度 = Σ(概率 × 影响 × 未缓解比率)
= 当前: 15+16+8+12+8+8+10+9 = 86
= 缓解后 (预计): 5+4+3+4+3+3+4+3 = 29

### 缓解后剩余风险
| 风险 | 缓解前 | 缓解后 | 剩余风险 |
|------|--------|--------|---------|
| R01 | H(15) | L(3) | 主从切换延迟 |
| R02 | H(16) | L(4) | 限流阈值配置不当 |
| R04 | H(12) | L(3) | 新技术栈的未知问题 |
```

### Phase 6: 输出产物

```
.csp/risk/
├── RISK-REGISTER.md           # 风险登记册
├── RISK-MATRIX.md             # 风险矩阵 + 热力图
├── MITIGATION-PLAN.md         # 缓解计划
├── RISK-TRACKING.md           # 风险跟踪表
└── RISK-ASSESSMENT-SUMMARY.md # 风险评估摘要
```

## 完成信号

```yaml
completion_signal:
  output: .csp/risk/RISK-ASSESSMENT-SUMMARY.md
  next_step:
    has_high_risks: "解决 H 级风险后进入 csp-tech-design-review"
    no_high_risks: csp-tech-design-review
  status:
    risk_path: .csp/risk/
    total_risks: "{{count}}"
    critical_risks: "{{count}}"
    high_risks: "{{count}}"
    risk_exposure: "{{score}}"
    phase: plan
    ready_for: [tech-design-review, implementation]
```

## 关键原则

1. **诚实评级** — 不低估概率，不轻描淡写影响
2. **每个风险有 Owner** — 不指定负责人的风险 = 没人负责的风险
3. **缓解措施可验证** — 不是"加强监控"，而是"配置 Prometheus alert，CPU > 80% 告警"
4. **风险登记册是活的** — 每周/每里程碑回顾更新
5. **不解决所有风险** — 低风险接受即可，资源聚焦高/严重风险