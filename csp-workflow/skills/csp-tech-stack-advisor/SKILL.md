---
name: csp-tech-stack-advisor
description: |
  全栈技术选型决策引擎。基于 Feature 需求的技术维度，为每个 Feature 和系统整体推荐最优技术栈：
  主语言、Web 框架、数据库、缓存、消息队列、AI 框架、向量库、搜索引擎、实时通信、
  对象存储、任务调度、监控可观测性等。输出结构化技术决策记录(ADR)和选型理由。
  当需求拆解完成后需要进行技术选型、或用户询问"用什么技术"时使用。
  关键词：技术选型、tech stack、technology selection、架构选型、技术栈推荐、
  用什么数据库、用什么框架、tech decision、ADR、技术决策、选型建议、
  消息队列选型、AI框架、向量库选择、database selection、framework choice。
version: "1.0.0"
layer: 2
category: workflow
phase: plan
domain: architecture
scope: design
tools: [Read, Write, Edit, Glob, Grep, Bash]

dependencies:
  skills: [csp-requirement-decomposition]

related_skills:
  - csp-requirement-decomposition
  - csp-fullstack-spec-generator
  - csp-lifecycle-orchestrator
  - csp-full

triggers:
  keywords: ["技术选型", "tech stack", "technology selection", "架构选型",
             "用什么技术", "技术栈", "选型", "database selection", "framework"]
  intents:
    - "user needs technology recommendations for their project"
    - "user asks which database/framework/queue to use"
    - "user wants architecture decisions documented"
  context:
    - "after_requirement_decomposition"

anti_rationalizations:
  "I'll just use the same stack as last time": "Different requirements demand different tools. Evaluate fresh."
  "This technology is trendy so let's use it": "Trend != fit. Evaluate against actual requirements."
  "We don't need a message queue for this": "Async processing, event-driven architecture, and decoupling often need one. Check the requirements."
---

# Tech Stack Advisor

基于需求拆解结果，进行全维度技术选型决策。

## 核心理念

技术选型不是选"最好的"技术，而是选"最合适的"。决策基于：
1. **需求匹配度** — 技术能力是否覆盖 Feature 需求
2. **团队能力** — 学习曲线与现有技能匹配
3. **生态成熟度** — 社区、文档、长期维护
4. **运维复杂度** — 部署、监控、故障排查成本
5. **成本** — 许可证、基础设施、人力
6. **可演进性** — 未来扩展不需要推倒重来

## 输入

消费 `csp-requirement-decomposition` 的产物：
- `.csp/decomposition/DECOMPOSITION-SUMMARY.md` — 技术维度汇总
- `.csp/decomposition/FEATURE-DETAILS/*.yaml` — 每个 Feature 的技术维度标记
- `.csp/decomposition/NFR.md` — 非功能性需求

如果没有上游产物，也可独立工作：直接从用户需求中提取技术维度。

## 选型维度全景

### 1. 主语言与运行时

| 候选 | 适用场景 | 优势 | 劣势 |
|------|---------|------|------|
| Python | AI/ML、数据密集、快速原型 | 生态丰富、AI 库完善 | 性能瓶颈、GIL |
| TypeScript/Node.js | 全栈统一、实时应用、API 密集 | 前后端统一、事件驱动 | CPU 密集弱 |
| Go | 高并发、微服务、基础设施 | 性能、并发模型、部署简单 | 生态较年轻 |
| Rust | 极致性能、安全关键 | 内存安全、零成本抽象 | 学习曲线陡 |
| Java/Kotlin | 企业级、大数据、Android | 成熟生态、强类型 | 启动慢、冗长 |

**决策因子：**
- 需要 AI/ML → Python 优先
- 全栈统一 + 实时 → TypeScript
- 高并发微服务 → Go
- 性能关键 + 安全 → Rust
- 企业合规 + 大数据 → Java/Kotlin

### 2. Web 框架

| 语言 | 候选框架 | 适用场景 |
|------|---------|---------|
| Python | FastAPI | 异步 API、自动文档、类型安全 |
| Python | Django | 全功能、Admin、ORM 成熟 |
| Python | Flask | 轻量、灵活、微服务 |
| TypeScript | Next.js | 全栈 React、SSR/SSG |
| TypeScript | NestJS | 企业级、DI、模块化 |
| TypeScript | Express/Fastify | 轻量 API |
| Go | Gin/Echo/Fiber | 高性能 API |
| Go | Chi | 标准库风格路由 |
| Rust | Actix-web/Axum | 极致性能 API |
| Java | Spring Boot | 企业全家桶 |

### 3. 数据库

| 类型 | 候选 | 适用场景 |
|------|------|---------|
| 关系型 | PostgreSQL | 复杂查询、事务、JSON、GIS |
| 关系型 | MySQL | 读密集、简单 CRUD |
| 文档型 | MongoDB | 灵活 schema、快速迭代 |
| KV | Redis | 缓存、会话、排行榜、限流 |
| 宽列 | Cassandra/ScyllaDB | 时序、高写入、分布式 |
| 图 | Neo4j | 关系网络、推荐、知识图谱 |
| 时序 | TimescaleDB/InfluxDB | 监控、IoT、指标 |
| 嵌入式 | SQLite | 单机、边缘、测试 |

**决策矩阵：**
```
数据模型复杂 + 事务要求高 → PostgreSQL
Schema 频繁变化 + 文档结构 → MongoDB
纯缓存/会话 → Redis
社交关系/推荐路径 → Neo4j
时序指标 → TimescaleDB
```

### 4. 消息队列 / 事件总线

| 候选 | 适用场景 | 吞吐量 | 复杂度 |
|------|---------|--------|--------|
| Redis Streams | 轻量异步、小团队 | 中 | 低 |
| RabbitMQ | 复杂路由、可靠投递 | 中 | 中 |
| Apache Kafka | 高吞吐、事件溯源、流处理 | 极高 | 高 |
| NATS | 云原生、轻量、低延迟 | 高 | 低 |
| AWS SQS/SNS | 云托管、免运维 | 中 | 低 |
| Bull/BullMQ (Node) | 任务队列、后台作业 | 中 | 低 |
| Celery (Python) | 异步任务、定时任务 | 中 | 中 |

**何时需要消息队列：**
- Feature 标记了 `needs_queue: true`
- 存在异步处理需求（邮件发送、文件处理、AI 推理）
- 服务间解耦
- 削峰填谷
- 事件驱动架构

### 5. AI/ML 框架

| 候选 | 适用场景 | 部署模式 |
|------|---------|---------|
| LangChain/LangGraph | LLM 编排、Agent、RAG | 应用层 |
| LlamaIndex | RAG、文档问答、知识检索 | 应用层 |
| vLLM | 自托管 LLM 推理 | 推理服务 |
| Ollama | 本地 LLM、开发测试 | 本地 |
| OpenAI/Anthropic API | 云端 LLM 调用 | SaaS |
| HuggingFace Transformers | 微调、自定义模型 | 训练+推理 |
| ONNX Runtime | 模型部署、跨平台推理 | 推理服务 |
| Ray | 分布式计算、模型服务 | 集群 |

**决策路径：**
```
需要 LLM 能力？
├── 是 → 自托管 or API？
│   ├── API → OpenAI/Anthropic + LangChain 编排
│   └── 自托管 → vLLM + Ollama(开发)
├── 需要 RAG？
│   ├── 是 → LangChain/LlamaIndex + 向量库
│   └── 否 → 直接 API 调用
└── 需要自定义模型？
    ├── 是 → HuggingFace + Ray
    └── 否 → 预训练模型 + 微调
```

### 6. 向量数据库

| 候选 | 适用场景 | 规模 | 特点 |
|------|---------|------|------|
| pgvector | 中小规模、已用 PG | <10M 向量 | 无需额外基础设施 |
| Pinecone | 云托管、免运维 | 任意 | 全托管、低延迟 |
| Weaviate | 多模态、混合搜索 | 中-大 | 内置向量化 |
| Milvus | 大规模、高性能 | >100M | 分布式、GPU 加速 |
| Qdrant | Rust 实现、高性能 | 中-大 | 过滤能力强 |
| ChromaDB | 原型、小规模 | <1M | 嵌入式、简单 |
| FAISS | 研究、批量检索 | 任意 | 库（非服务） |

**何时需要向量库：**
- Feature 标记了 `needs_vector_store: true`
- 语义搜索
- RAG（检索增强生成）
- 推荐系统（基于 embedding）
- 图片/音频相似度搜索

### 7. 搜索引擎

| 候选 | 适用场景 |
|------|---------|
| PostgreSQL FTS | 简单全文搜索、小规模 |
| Elasticsearch | 复杂搜索、聚合分析、日志 |
| Meilisearch | 即时搜索、typo-tolerant |
| Typesense | 低延迟、易部署 |
| Algolia | SaaS、极致体验 |

### 8. 实时通信

| 候选 | 适用场景 |
|------|---------|
| WebSocket (原生) | 双向实时、聊天 |
| Server-Sent Events | 单向推送、通知 |
| Socket.IO | 房间、广播、降级 |
| Pusher/Ably | 托管 WebSocket |
| WebRTC | P2P、音视频 |

### 9. 对象存储 / 文件

| 候选 | 适用场景 |
|------|---------|
| AWS S3 / MinIO | 通用文件存储 |
| Cloudflare R2 | 免出口费 |
| 本地文件系统 | 开发/单机 |

### 10. 任务调度

| 候选 | 适用场景 |
|------|---------|
| Celery Beat (Python) | 定时任务、周期任务 |
| Bull Scheduler (Node) | Node 生态定时 |
| Cron | 系统级简单定时 |
| Temporal | 复杂工作流编排 |
| APScheduler | Python 轻量调度 |

### 11. 可观测性

| 维度 | 候选 |
|------|------|
| 日志 | ELK / Loki+Grafana / 云日志 |
| 指标 | Prometheus+Grafana / Datadog |
| 追踪 | Jaeger / Zipkin / OpenTelemetry |
| 告警 | PagerDuty / Grafana Alerting |
| APM | Sentry / Datadog APM |

## 输出产物

```
.csp/tech-decisions/
├── TECH-STACK-OVERVIEW.md     # 技术栈全景图
├── ADR/                       # 架构决策记录
│   ├── ADR-001-language.md
│   ├── ADR-002-framework.md
│   ├── ADR-003-database.md
│   ├── ADR-004-cache.md
│   ├── ADR-005-queue.md
│   ├── ADR-006-ai-framework.md
│   ├── ADR-007-vector-store.md
│   └── ...
├── PER-FEATURE-STACK.md       # 每个 Feature 的技术栈映射
└── TECH-DECISIONS-SUMMARY.md  # 供下游消费的摘要
```

**ADR 模板：**
```markdown
# ADR-{NNN}: {决策标题}

## 状态
Proposed / Accepted / Deprecated

## 上下文
什么需求驱动了这个决策？

## 决策
选择了什么？

## 备选方案
| 方案 | 优势 | 劣势 | 适用条件 |
|------|------|------|---------|

## 理由
为什么选择这个方案？关键权衡是什么？

## 后果
- 正面:
- 负面:
- 风险:

## 关联 Feature
- F-X-1, F-Y-2
```

**TECH-STACK-OVERVIEW.md 结构：**
```markdown
# Technology Stack Overview

## 技术栈全景
| 层次 | 技术选择 | 版本 | 用途 |
|------|---------|------|------|
| 语言 | Python 3.12 | 3.12+ | 后端主语言 |
| Web 框架 | FastAPI | 0.100+ | API 服务 |
| 前端 | Next.js + React | 14+ | Web 应用 |
| 数据库 | PostgreSQL | 16+ | 主数据存储 |
| 缓存 | Redis | 7+ | 会话/缓存/限流 |
| 消息队列 | Celery + Redis | 5.3+ | 异步任务 |
| AI 框架 | LangChain | 0.2+ | LLM 编排 |
| 向量库 | pgvector | 0.7+ | 语义搜索 |
| 搜索 | Meilisearch | 1.6+ | 全文搜索 |
| 对象存储 | MinIO | latest | 文件存储 |
| 监控 | Prometheus + Grafana | - | 可观测性 |

## 架构图 (Mermaid)
graph TB
    ...

## 技术栈选型理由摘要
...
```

## 选型决策流程

```
1. 读取 DECOMPOSITION-SUMMARY.md
2. 提取所有技术维度需求
3. 对每个维度：
   a. 列出候选技术
   b. 按决策因子打分 (需求匹配 40% + 团队能力 20% + 生态 15% + 运维 15% + 成本 10%)
   c. 输出推荐 + 备选
   d. 记录 ADR
4. 检查技术栈一致性（避免过多异构技术）
5. 输出全景图 + 摘要
```

## 技术栈一致性原则

- **语言收敛**: 后端最多 2 种语言（主 + 辅）
- **数据库收敛**: 主库 1 个 + 辅助存储不超过 2 个
- **避免过度工程**: 如果 Redis Streams 够用，不上 Kafka
- **团队优先**: 团队熟悉的技术 > 理论最优技术
- **渐进式复杂度**: MVP 用简单方案，验证后再升级

## 完成信号

```yaml
completion_signal:
  output: .csp/tech-decisions/TECH-DECISIONS-SUMMARY.md
  next_step:
    recommended: csp-fullstack-spec-generator
    alternatives: [csp-plan-phase, csp-full]
  status:
    tech_decisions_path: .csp/tech-decisions/
    adr_count: "{{count}}"
    phase: plan
    ready_for: [spec-generation, implementation-planning]
```
