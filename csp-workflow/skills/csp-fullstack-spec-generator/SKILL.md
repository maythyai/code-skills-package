---
name: csp-fullstack-spec-generator
description: |
  全栈技术规格生成器。为每个 Feature 生成完整的、可直接指导实现的技术规格文档，覆盖：
  UI/UX 原型描述、数据库 Schema（DDL 级）、API 契约（OpenAPI 级）、后端架构设计、
  前端组件树、基础设施需求、测试策略、安全考量。
  当技术选型完成后需要生成详细实现规格、或用户需要"每个 feature 的完整技术细节"时使用。
  关键词：全栈spec、fullstack spec、技术规格、implementation spec、详细设计、
  数据库设计、API设计、schema design、前端设计、组件设计、接口契约、
  generate spec、生成规格、feature spec、模块设计、detailed design。
version: "1.0.0"
layer: 2
category: workflow
phase: plan
domain: architecture
scope: design
tools: [Read, Write, Edit, Glob, Grep, Bash]

dependencies:
  skills: [csp-requirement-decomposition, csp-tech-stack-advisor]

related_skills:
  - csp-requirement-decomposition
  - csp-tech-stack-advisor
  - csp-lifecycle-orchestrator
  - csp-implementation-phase
  - csp-spec-driven-development

triggers:
  keywords: ["全栈spec", "技术规格", "详细设计", "数据库设计", "API设计",
             "schema design", "implementation spec", "feature spec", "接口设计"]
  intents:
    - "user needs detailed technical specification for each feature"
    - "user wants database schema and API contract generated"
    - "user needs implementation-ready spec documents"
  context:
    - "after_tech_stack_selection"

anti_rationalizations:
  "The feature is simple, no need for detailed spec": "Simple features have hidden edge cases. Spec them."
  "I'll design the schema during implementation": "Schema changes cascade. Design first, implement second."
  "API contract can be informal": "Informal contracts break frontend-backend integration. Formalize."
---

# Full-Stack Spec Generator

为每个 Feature 生成实现级全栈技术规格，是需求到代码之间的最后一座桥梁。

## 核心理念

一份好的 Feature Spec 应该让任何开发者（或 AI Agent）拿到后能**直接开始编码**，无需再问"这个字段什么类型"、"这个接口返回什么"、"这个页面有哪些状态"。

## 输入

消费上游产物：
- `.csp/decomposition/FEATURE-DETAILS/*.yaml` — Feature 定义
- `.csp/tech-decisions/TECH-STACK-OVERVIEW.md` — 技术栈全景
- `.csp/tech-decisions/PER-FEATURE-STACK.md` — Feature 级技术映射
- `.csp/decomposition/NFR.md` — 非功能性需求

## 每个 Feature Spec 的完整结构

对每个 Feature 生成一份独立的 `SPEC-{feature-id}.md`，包含以下 8 个维度：

---

### 维度 1: UI/UX 规格

````markdown
## 1. UI/UX Specification

### 页面/视图清单
| 页面 | 路由 | 布局 | 权限 |
|------|------|------|------|
| 列表页 | /features | MainLayout | authenticated |
| 详情页 | /features/:id | MainLayout | authenticated |
| 创建/编辑 | /features/new | FormLayout | admin |

### 组件树
```
FeatureListPage
├── PageHeader (title, actions)
├── FilterBar
│   ├── SearchInput
│   ├── StatusFilter (dropdown)
│   └── DateRangePicker
├── FeatureTable
│   ├── TableHeader (sortable columns)
│   ├── TableRow (clickable → detail)
│   │   ├── StatusBadge
│   │   ├── PriorityTag
│   │   └── ActionMenu (edit/delete/archive)
│   └── Pagination
└── EmptyState (when no data)

FeatureDetailPage
├── Breadcrumb
├── FeatureHeader (title, status, actions)
├── TabPanel
│   ├── OverviewTab
│   ├── ActivityTab (timeline)
│   └── SettingsTab
└── SidePanel (metadata, relations)
```

### 交互规格
| 交互 | 触发 | 行为 | 反馈 |
|------|------|------|------|
| 创建 | 点击"新建"按钮 | 打开表单抽屉/跳转新页 | Toast 成功/失败 |
| 删除 | 点击删除 → 确认弹窗 | 调用 DELETE API | 行消失 + Undo Toast |
| 筛选 | 修改筛选条件 | debounce 300ms → 重新请求 | 骨架屏 |
| 排序 | 点击列头 | 切换 asc/desc/none | 箭头图标变化 |

### 状态设计
| 状态 | 触发条件 | UI 表现 |
|------|---------|---------|
| Loading | 首次加载/刷新 | 骨架屏 (Skeleton) |
| Empty | 无数据 | 插画 + 引导文案 + CTA |
| Error | API 失败 | 错误提示 + 重试按钮 |
| Partial | 部分加载失败 | 降级展示 + 提示 |
| Success | 正常数据 | 完整内容 |

### 响应式断点
| 断点 | 布局变化 |
|------|---------|
| ≥1280px (xl) | 完整表格 + 侧边栏 |
| 768-1279px (md) | 表格隐藏次要列 |
| <768px (sm) | 卡片列表替代表格 |
````

---

### 维度 2: 数据库 Schema

````markdown
## 2. Database Schema

### ER 图 (Mermaid)
erDiagram
    FEATURE ||--o{ FEATURE_COMMENT : has
    FEATURE }o--|| USER : created_by
    FEATURE }o--o{ TAG : tagged_with

### 表定义

#### features 表
```sql
CREATE TABLE features (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','active','archived','deleted')),
    priority        SMALLINT NOT NULL DEFAULT 2
                    CHECK (priority BETWEEN 0 AND 4),
    domain_id       UUID REFERENCES domains(id) ON DELETE SET NULL,
    created_by      UUID NOT NULL REFERENCES users(id),
    updated_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,  -- soft delete
    
    -- 业务字段
    acceptance_criteria JSONB DEFAULT '[]',
    tech_dimensions     JSONB DEFAULT '{}',
    metadata            JSONB DEFAULT '{}'
);

-- 索引
CREATE INDEX idx_features_status ON features(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_features_domain ON features(domain_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_features_created_by ON features(created_by);
CREATE INDEX idx_features_priority ON features(priority, status);
CREATE INDEX idx_features_created_at ON features(created_at DESC);

-- 全文搜索 (如使用 PG FTS)
ALTER TABLE features ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (to_tsvector('english', title || ' ' || COALESCE(description, ''))) STORED;
CREATE INDEX idx_features_search ON features USING GIN(search_vector);
```

#### 关联表
```sql
CREATE TABLE feature_tags (
    feature_id  UUID REFERENCES features(id) ON DELETE CASCADE,
    tag_id      UUID REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (feature_id, tag_id)
);
```

### Migration 策略
- 使用 [Alembic/Prisma/Knex] 管理迁移
- 每次 schema 变更一个 migration 文件
- 包含 up() 和 down()
- 大表变更须考虑在线 DDL（避免锁表）

### 数据量预估与分区
| 表 | 预估行数(1年) | 增长速率 | 分区策略 |
|----|-------------|---------|---------|
| features | 10K | 低 | 无需分区 |
| feature_comments | 100K | 中 | 按 created_at 月分区 |
| activity_logs | 1M | 高 | 按 created_at 月分区 + 归档 |
````

---

### 维度 3: API 契约

````markdown
## 3. API Contract

### 端点清单
| Method | Path | 描述 | 认证 | 限流 |
|--------|------|------|------|------|
| GET | /api/v1/features | 列表(分页+筛选) | Bearer | 100/min |
| POST | /api/v1/features | 创建 | Bearer | 20/min |
| GET | /api/v1/features/:id | 详情 | Bearer | 200/min |
| PATCH | /api/v1/features/:id | 更新 | Bearer | 50/min |
| DELETE | /api/v1/features/:id | 删除(soft) | Bearer+Admin | 10/min |
| POST | /api/v1/features/:id/comments | 评论 | Bearer | 30/min |

### 详细接口定义

#### GET /api/v1/features
```yaml
summary: 获取 Feature 列表
parameters:
  - name: page
    in: query
    schema: { type: integer, default: 1, minimum: 1 }
  - name: page_size
    in: query
    schema: { type: integer, default: 20, maximum: 100 }
  - name: status
    in: query
    schema: { type: string, enum: [draft, active, archived] }
  - name: priority
    in: query
    schema: { type: integer, minimum: 0, maximum: 4 }
  - name: search
    in: query
    schema: { type: string, maxLength: 200 }
  - name: sort_by
    in: query
    schema: { type: string, enum: [created_at, priority, title], default: created_at }
  - name: sort_order
    in: query
    schema: { type: string, enum: [asc, desc], default: desc }

responses:
  200:
    content:
      application/json:
        schema:
          type: object
          properties:
            items:
              type: array
              items: { $ref: '#/components/schemas/FeatureSummary' }
            total: { type: integer }
            page: { type: integer }
            page_size: { type: integer }
            has_next: { type: boolean }
  401: { $ref: '#/components/responses/Unauthorized' }
  429: { $ref: '#/components/responses/RateLimited' }
```

#### POST /api/v1/features
```yaml
summary: 创建 Feature
requestBody:
  required: true
  content:
    application/json:
      schema:
        type: object
        required: [title]
        properties:
          title: { type: string, minLength: 1, maxLength: 255 }
          description: { type: string, maxLength: 10000 }
          priority: { type: integer, minimum: 0, maximum: 4, default: 2 }
          domain_id: { type: string, format: uuid, nullable: true }
          acceptance_criteria:
            type: array
            items: { type: string }
          tags:
            type: array
            items: { type: string }

responses:
  201:
    content:
      application/json:
        schema: { $ref: '#/components/schemas/FeatureDetail' }
  400: { $ref: '#/components/responses/ValidationError' }
  401: { $ref: '#/components/responses/Unauthorized' }
```

### 错误响应格式
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": [
      { "field": "title", "message": "Title is required" }
    ]
  }
}
```

### 认证与授权
- 认证: Bearer Token (JWT, 15min access + 7d refresh)
- 授权: RBAC (role → permission → resource)
- API Key: 用于服务间调用

### 版本策略
- URL 路径版本: /api/v1/, /api/v2/
- 破坏性变更必须新版本
- 旧版本至少维护 6 个月
````

---

### 维度 4: 后端架构

````markdown
## 4. Backend Architecture

### 模块结构
```
src/
├── features/
│   ├── router.py          # API 路由定义
│   ├── service.py         # 业务逻辑层
│   ├── repository.py      # 数据访问层
│   ├── schemas.py         # 请求/响应 Schema (Pydantic)
│   ├── models.py          # ORM 模型
│   ├── events.py          # 领域事件定义
│   └── tests/
│       ├── test_router.py
│       ├── test_service.py
│       └── test_repository.py
├── shared/
│   ├── database.py
│   ├── auth.py
│   ├── pagination.py
│   └── errors.py
```

### 分层职责
| 层 | 职责 | 禁止 |
|----|------|------|
| Router | 参数校验、认证、调用 Service | 业务逻辑、直接 DB 操作 |
| Service | 业务逻辑、事务编排、事件发布 | HTTP 概念、直接 SQL |
| Repository | 数据访问、查询构建 | 业务判断、HTTP 概念 |

### 关键业务逻辑
```python
# service.py 伪代码
class FeatureService:
    async def create_feature(self, data: CreateFeatureInput, user: User) -> Feature:
        # 1. 校验业务规则
        # 2. 创建实体
        # 3. 处理关联 (tags)
        # 4. 发布领域事件
        # 5. 返回结果
        ...
```

### 异步任务 (如需要)
| 任务 | 触发 | 队列 | 超时 | 重试 |
|------|------|------|------|------|
| 发送通知 | Feature 创建 | notifications | 30s | 3次 |
| 生成摘要 | 描述更新 | ai-tasks | 60s | 2次 |
| 更新搜索索引 | 任何变更 | indexing | 10s | 5次 |

### 缓存策略
| 数据 | 缓存层 | TTL | 失效策略 |
|------|--------|-----|---------|
| Feature 详情 | Redis | 5min | 写穿 (write-through) |
| 列表查询 | Redis | 1min | 写失效 (write-invalidate) |
| 用户权限 | Redis | 15min | 角色变更时失效 |
````

---

### 维度 5: 前端架构

````markdown
## 5. Frontend Architecture

### 状态管理
| 状态类型 | 方案 | 示例 |
|---------|------|------|
| 服务端数据 | React Query / SWR | Feature 列表、详情 |
| 客户端 UI 状态 | Zustand / useState | 筛选条件、弹窗开关 |
| 表单状态 | React Hook Form | 创建/编辑表单 |
| URL 状态 | nuqs / searchParams | 分页、排序、筛选 |

### API 层
```typescript
// api/features.ts
export const featuresApi = {
  list: (params: ListParams) => 
    fetcher.get<PaginatedResponse<Feature>>('/features', { params }),
  get: (id: string) => 
    fetcher.get<Feature>(`/features/${id}`),
  create: (data: CreateFeatureInput) => 
    fetcher.post<Feature>('/features', data),
  update: (id: string, data: Partial<Feature>) => 
    fetcher.patch<Feature>(`/features/${id}`, data),
  delete: (id: string) => 
    fetcher.delete(`/features/${id}`),
}
```

### 关键 Hooks
```typescript
// hooks/useFeatures.ts
export function useFeatures(params: ListParams) {
  return useQuery({
    queryKey: ['features', params],
    queryFn: () => featuresApi.list(params),
    keepPreviousData: true,
  })
}

export function useCreateFeature() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: featuresApi.create,
    onSuccess: () => qc.invalidateQueries(['features']),
  })
}
```

### 路由设计
```typescript
// 路由结构
/features              → FeatureListPage
/features/new          → FeatureCreatePage
/features/:id          → FeatureDetailPage
/features/:id/edit     → FeatureEditPage
```
````

---

### 维度 6: 基础设施需求

````markdown
## 6. Infrastructure Requirements

### 服务依赖
| 服务 | 用途 | 部署方式 | 资源需求 |
|------|------|---------|---------|
| PostgreSQL 16 | 主数据库 | Docker/RDS | 2C4G, 50GB SSD |
| Redis 7 | 缓存+队列 | Docker/ElastiCache | 1C2G |
| Meilisearch | 全文搜索 | Docker | 1C2G, 10GB |
| MinIO | 文件存储 | Docker/S3 | 按需 |

### 环境变量
```env
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://host:6379/0
MEILISEARCH_URL=http://host:7700
MEILISEARCH_API_KEY=xxx
MINIO_ENDPOINT=host:9000
JWT_SECRET=xxx
JWT_ACCESS_TTL=900
JWT_REFRESH_TTL=604800
```

### Docker Compose (开发环境)
```yaml
services:
  db:
    image: postgres:16-alpine
    volumes: [pgdata:/var/lib/postgresql/data]
    environment:
      POSTGRES_DB: app
      POSTGRES_PASSWORD: dev
    ports: ["5432:5432"]
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
```
````

---

### 维度 7: 测试策略

```markdown
## 7. Testing Strategy

### 测试金字塔
| 层级 | 覆盖 | 工具 | 目标覆盖率 |
|------|------|------|-----------|
| 单元测试 | Service 层业务逻辑 | pytest/jest | ≥80% |
| 集成测试 | API 端点 + DB | pytest+httpx / supertest | 核心路径 100% |
| E2E 测试 | 关键用户流程 | Playwright | Top 5 流程 |

### 关键测试用例
| 场景 | 类型 | 断言 |
|------|------|------|
| 创建 Feature (正常) | 集成 | 201 + 返回完整对象 |
| 创建 Feature (缺 title) | 集成 | 400 + 错误详情 |
| 未认证访问 | 集成 | 401 |
| 并发创建 | 压力 | 无重复、无死锁 |
| 软删除后不可见 | 集成 | 列表不含已删除项 |
```

---

### 维度 8: 安全考量

```markdown
## 8. Security Considerations

### 认证授权
- JWT 双 token 机制 (access + refresh)
- RBAC 权限模型
- API 限流 (per-user + per-IP)

### 数据安全
- 输入校验 (前后端双重)
- SQL 注入防护 (ORM 参数化)
- XSS 防护 (输出编码)
- CSRF 防护 (SameSite cookie + token)

### 敏感数据
- PII 字段加密存储
- 日志脱敏
- API 响应不含内部 ID/敏感字段
```

## 输出产物

```
.csp/specs/
├── SPEC-F-A-1.md          # Feature A1 完整 spec
├── SPEC-F-A-2.md          # Feature A2 完整 spec
├── SPEC-F-B-1.md
├── ...
├── SHARED-SCHEMAS.md      # 跨 Feature 共享的数据模型
├── API-OVERVIEW.md        # API 全景（所有端点汇总）
└── SPEC-INDEX.md          # Spec 索引 + 完成状态
```

## 生成策略

| Feature 复杂度 | Spec 深度 | 预估 Token |
|---------------|----------|-----------|
| S (简单 CRUD) | 精简版：Schema + API + 基本 UI | ~1500 |
| M (中等业务) | 标准版：全 8 维度 | ~3000 |
| L (复杂逻辑) | 完整版：全 8 维度 + 详细状态机 | ~5000 |
| XL (核心系统) | 深度版：全 8 维度 + 性能方案 + 容灾 | ~8000 |

## 完成信号

```yaml
completion_signal:
  output: .csp/specs/SPEC-INDEX.md
  next_step:
    recommended: csp-implementation-phase
    alternatives: [csp-plan-phase, csp-tdd]
  status:
    specs_path: .csp/specs/
    spec_count: "{{count}}"
    phase: plan
    ready_for: [implementation, task-breakdown]
```
