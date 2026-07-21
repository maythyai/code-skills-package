# 技术选型决策矩阵

## 按项目类型推荐

### SaaS 产品 (B2B/B2C)
| 维度 | 推荐 | 备选 | 理由 |
|------|------|------|------|
| 语言 | TypeScript (全栈) | Python + TS | 前后端统一，招聘容易 |
| 前端 | Next.js | Nuxt.js | SSR/SSG + API Routes |
| 后端 | NestJS / Next API | FastAPI | 模块化 + DI |
| 数据库 | PostgreSQL | - | 万能选择 |
| 缓存 | Redis | - | 会话 + 缓存 + 限流 |
| 搜索 | Meilisearch | Algolia | 自托管 + typo-tolerant |
| 文件 | S3 / R2 | MinIO | 按量付费 |
| 部署 | Vercel / Railway | AWS ECS | 开发者体验 |

### AI-Native 应用
| 维度 | 推荐 | 备选 | 理由 |
|------|------|------|------|
| 语言 | Python (后端) + TS (前端) | - | AI 生态在 Python |
| AI 框架 | LangChain / LangGraph | LlamaIndex | Agent 编排 |
| 向量库 | pgvector (小) / Qdrant (大) | Pinecone | 按规模选 |
| LLM | OpenAI API + 本地 Ollama | Anthropic | 成本 + 隐私 |
| 队列 | Celery + Redis | - | AI 推理异步化 |
| 数据库 | PostgreSQL | - | + pgvector 一体化 |

### 高并发微服务
| 维度 | 推荐 | 备选 | 理由 |
|------|------|------|------|
| 语言 | Go | Rust | 并发模型 + 部署简单 |
| 框架 | Gin / Chi | Echo | 轻量 + 标准库风格 |
| 消息队列 | Kafka | NATS | 高吞吐 + 事件溯源 |
| 数据库 | PostgreSQL + Redis | CockroachDB | 分布式可选 |
| 服务发现 | Consul / K8s Service | - | 云原生 |
| 监控 | Prometheus + Grafana | Datadog | 开源 + 灵活 |

### 数据密集 / 分析平台
| 维度 | 推荐 | 备选 | 理由 |
|------|------|------|------|
| 语言 | Python | Scala | 数据科学生态 |
| 数据库 | PostgreSQL + ClickHouse | TimescaleDB | OLTP + OLAP |
| 流处理 | Kafka + Flink | Spark Streaming | 实时 + 批量 |
| 调度 | Airflow | Dagster | 成熟 + 社区 |
| 可视化 | Grafana / Superset | Metabase | 灵活 |

## 按规模推荐

### 小型 (MVP / 独立开发者)
```
原则: 最少技术种类，最快上线
语言: TypeScript (全栈)
框架: Next.js (前后端一体)
数据库: PostgreSQL (Supabase/Neon 托管)
缓存: 无需 (或 Upstash Redis)
搜索: PG FTS (内置)
AI: OpenAI API 直调
部署: Vercel
```

### 中型 (成长期产品)
```
原则: 适度分离，保持简单
语言: Python + TypeScript
后端: FastAPI
前端: Next.js
数据库: PostgreSQL + Redis
队列: Celery + Redis
搜索: Meilisearch
AI: LangChain + pgvector
部署: Railway / AWS ECS
```

### 大型 (规模化产品)
```
原则: 按需拆分，可观测性优先
语言: Go/Python + TypeScript
后端: 微服务 (Go) + AI 服务 (Python)
前端: Next.js + 组件库
数据库: PostgreSQL (主) + Redis + 专用存储
队列: Kafka
搜索: Elasticsearch
AI: 自托管 vLLM + LangGraph
监控: 全套 (Prometheus + Grafana + Jaeger + Sentry)
部署: Kubernetes
```

## 技术选型反模式

| 反模式 | 问题 | 正确做法 |
|--------|------|---------|
| 简历驱动开发 | 为学新技术而选 | 需求驱动，团队能力优先 |
| 过度工程 | MVP 就上 Kafka + K8s | 从简单开始，按需升级 |
| 技术栈碎片化 | 5 种语言 3 种数据库 | 收敛到 2 语言 + 1 主库 |
| 忽视运维成本 | 选了不会运维的技术 | 考虑团队运维能力 |
| 盲目追新 | 用 beta 版本上生产 | 核心组件用稳定版 |
| 一刀切 | 所有场景同一个方案 | 按场景选最合适的 |
