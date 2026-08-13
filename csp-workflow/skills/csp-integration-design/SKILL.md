---
name: csp-integration-design
description: |
  跨系统集成方案设计引擎。当 PRD 涉及多个系统/服务时的集成方案设计。
  覆盖：系统间接口契约设计（API/消息/事件）、数据一致性策略（分布式事务/Saga/最终一致性）、
  集成测试策略、灰度发布与回滚方案、故障隔离与降级策略。
  当技术方案涉及多系统集成、或用户需要"集成方案"、"系统对接"、"服务间通信"、"接口设计"时使用。
  关键词：集成方案、系统集成、系统对接、服务间通信、接口设计、集成设计、
  integration design、system integration、service communication、
  跨系统、分布式事务、Saga、最终一致性、API 集成、消息集成、事件驱动。
version: "1.0.0"
layer: 2
category: workflow
phase: plan
domain: architecture
scope: design
tools: [Read, Write, Edit, Glob, Grep, Bash]

dependencies:
  skills: [csp-tech-solution-design]

related_skills:
  - csp-tech-solution-design
  - csp-tech-design-review
  - csp-fullstack-spec-generator
  - csp-lifecycle-orchestrator
  - csp-full

triggers:
  keywords: ["集成方案", "系统集成", "系统对接", "服务间通信", "接口设计",
             "集成设计", "integration design", "system integration",
             "跨系统", "分布式事务", "Saga", "最终一致性", "API 集成",
             "消息集成", "事件驱动", "service communication"]
  intents:
    - "user wants to design integration between multiple systems"
    - "user needs to define service-to-service communication contracts"
    - "user wants to handle distributed data consistency"
    - "user needs to design API contracts between systems"
  context:
    - "after_tech_solution_design"
    - "multi_system_project"

anti_rationalizations:
  "We only have one system, no integration needed": "Every system integrates with something — auth, payment, storage, email. These are integrations."
  "We can just call each other's APIs directly": "Direct API calls create tight coupling. Use contracts, events, and circuit breakers."
  "Data consistency is the DBA's problem": "In distributed systems, consistency is a design decision, not a database setting."
  "We'll handle integration during implementation": "Integration design decisions (sync vs async, consistency model) affect architecture. Decide early."
---

# Integration Design

为多系统/多服务场景设计集成方案，确保系统间通信可靠、数据一致、故障隔离。

## 核心理念

集成设计的 8 个谬误（Fallacies of Distributed Computing）：
1. 网络是可靠的
2. 延迟为零
3. 带宽是无限的
4. 网络是安全的
5. 拓扑不会改变
6. 只有一个管理员
7. 传输成本为零
8. 网络是同构的

好的集成方案从不假设这些，而是为每个谬误设计应对策略。

## 输入

- `.csp/tech-design/` — 技术方案设计
- `.csp/decomposition/` — Feature 拆解（识别跨系统 Feature）
- 各系统/服务的 API 文档（如有）
- 外部系统/服务的文档（如有）

## 执行流程

### Phase 1: 集成点识别

识别所有系统间交互点：

```markdown
## 集成点清单

### 内部服务间集成
| 集成 ID | 调用方 | 被调用方 | 交互类型 | 数据方向 | 频率 | 延迟要求 |
|---------|--------|---------|---------|---------|------|---------|
| INT-001 | Web App | user-svc | API 调用 | 双向 | 高 | < 50ms |
| INT-002 | feature-svc | user-svc | API 调用 | 单向 | 高 | < 50ms |
| INT-003 | feature-svc | search-svc | 事件 | 单向 | 中 | < 1s (最终一致) |
| INT-004 | feature-svc | notification-svc | 事件 | 单向 | 低 | < 5s (最终一致) |

### 外部系统集成
| 集成 ID | 系统 | 交互类型 | 协议 | 认证 | 可用性目标 |
|---------|------|---------|------|------|-----------|
| EXT-001 | 支付网关 | API 调用 | HTTPS | API Key | 99.9% |
| EXT-002 | 邮件服务 | API 调用 | SMTP/API | API Key | 99.5% |
| EXT-003 | 对象存储 | API 调用 | S3 API | Access Key | 99.99% |
```

### Phase 2: 通信模式选择

```markdown
## 通信模式设计

### 同步请求-响应 (Request-Response)
**适用场景:**
- 实时查询（查用户信息、查订单状态）
- 命令操作（创建订单、更新配置）
- 需要立即获取结果的场景

**设计约束:**
- 超时设置: 3s (默认), 10s (长查询)
- 重试策略: 指数退避，最多 3 次
- 幂等性: 通过 idempotency-key 保证

**接口契约模板:**
```yaml
# INT-001: Web App → user-svc
GET /api/v1/users/:id
  request:
    headers:
      Authorization: Bearer <jwt>
  response:
    200:
      body:
        id: uuid
        name: string
        email: string
        role: enum
    404:
      body:
        error: "USER_NOT_FOUND"
    503:
      body:
        error: "SERVICE_UNAVAILABLE"
```

### 异步事件 (Event-Driven)
**适用场景:**
- 状态变更通知（Feature 创建后通知搜索索引）
- 异步处理（发邮件、生成报表）
- 跨服务解耦

**事件契约模板:**
```yaml
# INT-003: feature-svc → search-svc
event: feature.created
  payload:
    feature_id: uuid
    title: string
    description: string
    status: enum
    created_at: datetime
  metadata:
    event_id: uuid
    timestamp: datetime
    source: "feature-svc"
    version: "1.0"
  guarantee: at-least-once
  retention: 7d

event: feature.updated
  payload:
    feature_id: uuid
    changes: object
    updated_at: datetime
  ...

event: feature.deleted
  payload:
    feature_id: uuid
    deleted_at: datetime
  ...
```

### 异步消息 (Message Queue)
**适用场景:**
- 任务队列（发邮件、视频转码）
- 削峰填谷（高并发写入缓冲）
- 工作流编排

**消息契约模板:**
```yaml
# INT-004: feature-svc → notification-svc
queue: notifications.email
  message:
    type: "send_welcome_email"
    payload:
      user_id: uuid
      email: string
      template: "welcome"
      variables: object
    priority: normal
    max_retries: 3
    ttl: 3600
```

### 文件/批量传输
**适用场景:**
- 数据导入/导出
- 报表生成
- 批量同步

**设计要点:**
- 文件格式: CSV / JSON / Parquet
- 传输方式: SFTP / S3 Pre-signed URL
- 校验: checksum + record count
- 重试: 全量重试 / 断点续传
```

### Phase 3: 数据一致性策略

```markdown
## 数据一致性策略

### 一致性模型选择

| 场景 | 推荐模型 | 原因 |
|------|---------|------|
| 用户注册 (写入 user + 发邮件) | 最终一致 | 邮件发送失败不影响注册 |
| 创建订单 (写入 order + 扣库存) | 强一致 | 库存和订单必须同步 |
| 搜索索引更新 | 最终一致 | 搜索可以容忍短暂延迟 |

### 分布式事务方案

#### 方案 A: Saga (推荐)
```
订单创建 Saga:
1. order-svc: 创建订单 (状态: pending)
2. payment-svc: 扣款
   ← 失败 → 补偿: order-svc 取消订单
3. inventory-svc: 扣库存
   ← 失败 → 补偿: payment-svc 退款, order-svc 取消订单
4. order-svc: 确认订单 (状态: confirmed)
```

#### 方案 B: 两阶段提交 (2PC)
- 适用: 需要强一致的场景
- 代价: 性能开销大，协调者单点
- 慎用: 仅在无法用 Saga 替代时使用

#### 方案 C: 事件溯源 (Event Sourcing)
- 适用: 审计要求高、状态变更复杂
- 代价: 实现复杂，查询需要 CQRS

### 最终一致性保证

| 策略 | 说明 | 实现 |
|------|------|------|
| 重试 | 失败后自动重试 | 指数退避，max 3 次 |
| 死信队列 | 重试失败后的消息 | DLQ 监控 + 人工处理 |
| 幂等消费 | 重复消费不会出错 | 基于 event_id 去重 |
| 顺序保证 | 同一实体的事件有序 | 按 entity_id 分区 |
| 补偿事务 | 撤销已完成的操作 | Saga 补偿逻辑 |
```

### Phase 4: 故障隔离与降级

```markdown
## 故障隔离与降级

### 熔断器 (Circuit Breaker)

```yaml
circuit_breaker:
  INT-001 (user-svc):
    failure_threshold: 5       # 连续失败 5 次
    timeout: 3000ms            # 超时 3s
    half_open_max: 3           # 半开状态允许 3 个请求
    recovery_timeout: 30000ms  # 30s 后进入半开状态
    fallback:
      type: "cache"            # 使用缓存数据降级
      ttl: 300s                # 缓存有效期 5min
```

### 降级策略

| 集成点 | 故障场景 | 降级方案 | 用户影响 |
|--------|---------|---------|---------|
| INT-003 (search-svc) | 搜索服务不可用 | 使用数据库 LIKE 查询 | 搜索变慢 |
| EXT-001 (支付) | 支付网关超时 | 记录订单，提示稍后支付 | 无法支付 |
| EXT-002 (邮件) | 邮件服务不可用 | 消息入队，延迟发送 | 邮件延迟 |
| INT-004 (通知) | 通知服务不可用 | 静默失败，不阻塞 | 收不到通知 |

### 重试策略

```yaml
retry_policy:
  default:
    max_attempts: 3
    backoff: exponential       # 1s, 2s, 4s
    jitter: true               # 随机抖动避免惊群
    retry_on:
      - timeout
      - 5xx
      - 429 (rate_limited)
    do_not_retry_on:
      - 400 (bad_request)
      - 401 (unauthorized)
      - 403 (forbidden)
      - 404 (not_found)
```

### Phase 5: 集成测试策略

```markdown
## 集成测试策略

### 测试类型
| 类型 | 覆盖范围 | 工具 | 频率 |
|------|---------|------|------|
| 契约测试 | 接口契约 | Pact / Spring Cloud Contract | 每次 PR |
| 集成测试 | 服务间交互 | 测试容器 + 真实依赖 | 每次 PR |
| 端到端测试 | 关键业务流程 | Playwright / Cypress | 每日 |
| 混沌测试 | 故障场景 | Chaos Mesh / Gremlin | 每周 |

### 关键测试场景
| 场景 | 测试内容 | 断言 |
|------|---------|------|
| 正常流程 | Feature 创建 → 搜索索引更新 | 搜索可见 |
| 搜索服务故障 | Feature 创建 → 搜索不可用 → 降级 | 创建成功，搜索降级 |
| 支付超时 | 支付请求超时 → 重试 → 降级 | 订单保留，可重试支付 |
| 消息重复 | 同一事件发送 2 次 | 幂等消费，不重复处理 |
```

### Phase 6: 灰度发布与回滚

```markdown
## 灰度发布策略

### 发布流程
```
1. 金丝雀发布 (10% 流量, 15min)
   → 监控指标正常?
   ↓
2. 扩大灰度 (50% 流量, 30min)
   → 监控指标正常?
   ↓
3. 全量发布 (100% 流量)
   → 监控指标正常?
   ↓
4. 发布完成

任一阶段异常 → 自动回滚
```

### 回滚方案
| 变更类型 | 回滚方式 | 回滚时间 | 数据影响 |
|---------|---------|---------|---------|
| 代码变更 | 部署前一版本 | < 5min | 无 (向后兼容) |
| 数据库 Migration | 执行 down Migration | < 10min | 可能丢失新增数据 |
| 配置变更 | 恢复配置中心旧版本 | < 1min | 无 |
| API 变更 | 保留旧版本 API 共存 | — | 双写期间数据一致 |

### 兼容性策略
- API 向后兼容: 新版本保留旧字段，新增字段设默认值
- 数据库 Migration 向后兼容: 新增列有默认值，不删除列（标记 deprecated）
- 事件契约向后兼容: 新增字段不影响旧消费者
```

### Phase 7: 输出产物

```
.csp/integration/
├── INTEGRATION-MAP.md            # 集成点清单
├── COMMUNICATION-DESIGN.md       # 通信模式设计
├── API-CONTRACTS/                # 接口契约
│   ├── CONTRACT-INT-001.yaml
│   ├── CONTRACT-INT-002.yaml
│   └── ...
├── EVENT-CONTRACTS/              # 事件契约
│   ├── EVENT-feature-created.yaml
│   └── ...
├── CONSISTENCY-STRATEGY.md       # 数据一致性策略
├── FAULT-TOLERANCE.md            # 故障隔离与降级
├── INTEGRATION-TESTING.md        # 集成测试策略
├── DEPLOYMENT-STRATEGY.md        # 灰度发布与回滚
└── INTEGRATION-SUMMARY.md        # 集成方案摘要
```

## 完成信号

```yaml
completion_signal:
  output: .csp/integration/INTEGRATION-SUMMARY.md
  next_step:
    recommended: csp-tech-design-review
    alternatives: [csp-fullstack-spec-generator]
  status:
    integration_path: .csp/integration/
    integration_points: "{{count}}"
    external_integrations: "{{count}}"
    contracts_defined: "{{count}}"
    phase: plan
    ready_for: [tech-design-review, spec-generation]
```

## 关键原则

1. **契约优先** — 先定义接口契约，再实现。契约是服务间的"宪法"
2. **异步优先** — 能异步的不同步，能解耦的不耦合
3. **为故障设计** — 假设每个集成点都可能失败，设计降级和熔断
4. **幂等必须** — 所有写操作必须幂等，应对重试和重复
5. **向后兼容** — 接口变更不破坏已有消费者
6. **可观测** — 每个集成点都有日志、指标、追踪