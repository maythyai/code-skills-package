---
name: csp-user-system-design
description: >
  Comprehensive user system design methodology covering layered architecture, account model,
  identity & role design (RBAC), permission systems, authentication & security, user tier &
  growth, data modeling, system integration patterns, design principles, common pitfalls,
  and a reusable review checklist. Use when designing, reviewing, or refactoring user/auth
  systems for any application — from MVP to enterprise.
version: 1.0.0
layer: 3
category: patterns
phase: plan
domain: architecture
role: specialist
scope: design
tools: [Read, Write, Edit, Glob, Grep]

dependencies: {}
related_skills:
  - csp-oauth-integration
  - csp-subscription-management
  - csp-privacy-compliance
  - csp-backend-patterns
  - csp-security-review
  - csp-api-governance

triggers:
  keywords:
    - "用户体系"
    - "用户系统"
    - "账号系统"
    - "权限设计"
    - "RBAC"
    - "角色权限"
    - "认证体系"
    - "用户数据模型"
    - "user system"
    - "auth system"
    - "identity management"
    - "account model"
    - "permission system"
  intents:
    - "user wants to design a user/auth system"
    - "user wants to review an existing user system"
    - "user wants to refactor authentication architecture"
    - "user wants to implement RBAC"
    - "user is planning multi-tenant user isolation"
---

# 用户体系设计方法论

> 用户体系不是扁平的 CRUD，而是一个系统工程的**分层设计**问题。本方法论覆盖从数据层到呈现层的四层架构、六大核心模块、跨系统关联模式、常见设计陷阱与可复用的评审检查清单。

## 何时激活

- 从零设计一个新应用的账号、认证、权限体系
- 重构或升级现有用户系统的架构（如从单角色迁移到 RBAC）
- 为 SaaS/多租户产品设计团队与权限模型
- 评审现有用户体系的安全性、扩展性与合规性
- 设计 API Key、OAuth/SSO 等多通道认证方案
- 规划用户的成长体系、套餐分级、配额管理

## 何时不适用

- 已有成熟的第三方 auth 方案（如 Auth0/Clerk/WorkOS），仅需集成——参考 [[csp-oauth-integration]]
- 仅需实现计费订阅逻辑——参考 [[csp-subscription-management]]
- 仅需 GDPR/CCPA 隐私合规——参考 [[csp-privacy-compliance]]
- 仅需代码层的认证实现（JWT/Session 等）——参考 [[csp-backend-patterns]]

---

## 一、分层架构

用户体系应采用四层架构设计，各层职责清晰、依赖单向：

```
┌─────────────────────────────────────────────────┐
│  Layer 4  呈现层    │ 前端 Profile/设置/团队页面     │
├─────────────────────────────────────────────────┤
│  Layer 3  业务层    │ 角色权限/配额/订阅/团队协作    │
├─────────────────────────────────────────────────┤
│  Layer 2  安全层    │ 认证/授权/2FA/审计/会话管理    │
├─────────────────────────────────────────────────┤
│  Layer 1  数据层    │ User/Team/ApiKey/Session      │
└─────────────────────────────────────────────────┘
```

**依赖规则**：上层可依赖下层，下层不可反向依赖上层。数据层不应包含业务逻辑（如不应在 `users` 表上直接做角色检查），安全层不依赖呈现层的任何概念。

---

## 二、六大核心模块

### 模块一：账号模型

账号模型是所有上层设计的基础，核心问题只有三个：**用什么标识用户、如何绑定多身份、账号与资料是否分离**。

| 设计维度 | 关键决策 | 推荐方案 |
|---------|---------|---------|
| 主键策略 | 用 UUID 还是自增 ID？ | **UUID 主键**（不可变、不可猜测、可分布式生成） |
| 唯一标识 | 用户用什么登录？ | **用户名 + 邮箱双唯一索引**，两者均可改但需唯一性校验 |
| 多身份绑定 | 一个用户可以有多个登录方式？ | **独立 `user_identities` 关联表**，支持多 provider 绑定 |
| 账号与资料分离 | 认证信息 vs 展示信息 | **分表**：`users`（认证）+ `user_profiles`（展示） |
| 实体 vs 个人 | 用户是自然人还是组织？ | 统一 `users` 表 + `type` 字段（`personal` / `organization`） |

**核心原则**：
- **标识符一旦生成永不改变**——这是所有外键关联的基础
- 用户名/邮箱可改，但每次变更必须有审计日志
- 禁止用邮箱/手机号直接做主键（用户可能更换，且隐私合规要求可删除）

> 详细的账号模型模式与代码示例见 [references/account-model.md](references/account-model.md)

### 模块二：身份与角色

角色设计遵循**最小权限原则 + 职责分离**。关键认知：**全局角色和资源级角色是两个正交维度**。

**全局角色**（平台级）：
- `super_admin`：系统级管理（通常仅 1-2 人）
- `admin`：平台日常管理
- `operator`（默认注册角色）：正常使用
- `viewer`：只读访问
- `billing_admin`：独立的计费管理（职责分离）

**资源级角色**（团队/项目/租户内）：
- `owner`：创建者，不可删除、不可降级
- `admin`：管理者
- `editor`：内容编辑
- `viewer`：只读访客

**设计要点**：
- 角色检查必须在 **API 层** 做（中间件/装饰器/依赖注入），UI 层仅做条件渲染——前端隐藏按钮不等于后端安全
- 角色字段用 `String(50)` 而非数据库 ENUM 类型（预留扩展性，未来添加角色无需 DDL 变更）
- 全局 admin 不自动获得团队内权限——需显式加入团队并分配角色

> 详细的 RBAC 权限矩阵与实现模式见 [references/rbac-permission-design.md](references/rbac-permission-design.md)

### 模块三：权限系统

权限模型的核心公式：

```
权限 = Subject(谁) + Action(做什么) + Resource(对什么) + Scope(范围)
```

**分层权限检查**（纵深防御）：
- **API 层**：`require_admin` / `require_feature("seo")` / `require_team_role("owner")` —— 准入控制
- **服务层**：`MembershipService.check_feature_access()` —— 业务规则
- **数据层**：`query.filter(team_id=user.team_id)` —— 多租户隔离

**权限检查原则**：
- **默认拒绝**：未显式授权的操作一律禁止
- **逐操作检查**：每个 API 端点独立声明所需权限
- **套餐能力与角色解耦**：`FeatureFlags`（能否用 SEO/SSO）独立于角色（能否管理成员）

### 模块四：认证与安全

多通道认证应**统一解析到 `user_id`**，上层业务代码不感知认证通道差异：

```
认证通道（多入口，统一出口 → user_id）：

  Cookie/Web      → Session JWT → getToken() → user_id
  API/CLI          → Bearer token → SHA-256(api_key) → DB lookup → user_id
  Proxy/SSR        → X-User-ID + HMAC签名 → user_id
  WebSocket        → ?token=xxx → validate_token() → user_id
  OAuth/SSO        → PKCE → 第三方IdP映射 → user_id
```

**安全机制清单**：

| 机制 | 目的 | 关键实现 |
|------|------|---------|
| 密码策略 | 防弱密码 | 最小长度 + 字符组合 + 禁止常见密码列表 |
| 登录限流 | 防暴力破解 | Redis 分布式计数器，per-username + per-IP |
| 2FA/TOTP | 防凭证泄露 | TOTP + 恢复码，`failed_attempts` + `locked_until` |
| 会话管理 | 防劫持 | JWT 短有效期(≤24h)、signOut 即时失效、会话列表可查看/撤销 |
| API Key | 程序化访问 | SHA-256 哈希存储，权限范围(read/read_write)，过期时间 |
| 审计日志 | 合规追溯 | actor/action/target/details，结构化存储，可导出 |
| 代理认证 | 防伪造 | HMAC 常量时间比较，内部 secret |

> 详细的认证方案与实现参考 [references/auth-security.md](references/auth-security.md)

### 模块五：用户分层与成长体系

```
套餐分层（Plan Tier）：
  FREE ────→ PRO ────→ TEAM ────→ ENTERPRISE
  基础功能    高级功能    协作功能    定制功能

每层定义：
  ├── QuotaLimits    (日操作次数、存储容量、API 调用量)
  ├── FeatureFlags   (高级功能开关：SEO、A/B测试、SSO、API访问)
  └── MaxMembers     (团队规模上限：1 / 1 / 50 / unlimited)
```

**配额消耗优先级**（团队场景）：
1. **席位基础配额** — 每人固定额度，优先消耗
2. **个人附加包** — 用完基础配额后才启用
3. **团队共享池** — 最后兜底，需设置 per-member cap 防止单人耗尽

**设计要点**：
- 套餐定义用配置驱动（YAML/JSON），不硬编码在代码中
- Feature flag 与角色权限是两个独立维度——不应在角色检查中混入套餐判断
- 配额检查应在业务操作前（pre-flight check），避免"先做了再报错"

### 模块六：数据模型

核心实体关系（通用范式）：

```
User (UUID)
  ├──1:1── UserPreference (主题/语言/通知偏好)
  ├──1:1── User2FA (TOTP密钥/恢复码)
  ├──1:N── ApiKey (SHA-256哈希/权限范围/过期)
  ├──1:N── Session/LoginHistory
  ├──1:N── Subscription (计划/状态/周期)
  ├──1:N── CreditLedger (Credit变动记录)
  │
  ├──N:1── Team (所属团队)
  │         ├──1:N── TeamMember (角色/席位)
  │         ├──1:N── TeamQuotaPool (共享资源池)
  │         └──1:N── TeamAuditLog (操作审计)
  │
  └──1:N── Content (owner归属)
```

> 详细的表结构、索引策略与迁移模式见 [references/data-model.md](references/data-model.md)

---

## 三、系统关联：与业务模块的连通方式

```
                     ┌──────────────┐
                     │   用户体系    │
                     │  (User/Team/  │
                     │  Role/Auth)   │
                     └───┬────┬──┬───┘
       ┌────────────────┼────┼──┼──────────────┐
       ▼                ▼    ▼  ▼              ▼
 ┌──────────┐  ┌──────────┐ ┌──────────┐ ┌──────────┐
 │ 权限系统  │  │ 内容系统  │ │交易/计费  │ │ 运营系统  │
 └──────────┘  └──────────┘ └──────────┘ └──────────┘
```

### 与权限系统的关联

```
关联方式：User.role → 权限检查中间件 → API 准入
         TeamMember.role → 资源级准入

边界约束：
  - 权限系统不存储用户，仅消费 user_id + role
  - 权限缓存以 user_id 为 key，角色变更时主动 invalidate
```

### 与内容/资源系统的关联

```
关联方式：Resource.owner_id = User.id（归属）
         Resource.team_id = Team.id（多租户隔离）

边界约束：
  - 内容 CRUD 通过 owner_id 做所有权校验
  - 列表查询通过 team_id 做多租户隔离
  - 用户删除时，内容归属需有降级策略（转移/匿名化/级联删除）
```

### 与计费/交易系统的关联

```
关联方式：Subscription.user_id → 计划等级 → 配额上限
         QuotaUsage.user_id → 每日消耗 → 限额检查

边界约束：
  - 用户体系不处理支付，只提供 user_id + plan
  - 计费系统消费 user_id 做归属，不反向修改用户数据
  - 配额检查应在业务操作前完成（pre-flight check）
```

### 与消息通知系统的关联

```
关联方式：User.email / phone → 发送通道
         UserPreference.notification_prefs → 通知策略
         UserPreference.quiet_hours → 免打扰时段

边界约束：
  - 用户体系提供联系方式 + 偏好，通知系统负责发送
  - 通知配置用 JSONB 扩展，不硬编码为数据库列
```

### 与风控系统的关联

```
关联方式：LoginAttempt → 异常登录检测
         LoginHistory.is_anomalous → 风险标记

边界约束：
  - 风控系统消费用户行为数据做决策（只读）
  - 账号冻结/解冻由风控调用用户系统 API，不直接修改 DB
```

> 详细的跨系统集成模式与边界约定见 [references/integration-patterns.md](references/integration-patterns.md)

---

## 四、设计原则与常见陷阱

### 扩展性原则

| 原则 | 错误做法 | 正确做法 |
|------|---------|---------|
| 字段预留 | 角色用 `ENUM('admin','user')` | 用 `String(50)`，未来加角色不改 DDL |
| 偏好存储 | 每个偏好用一个列 | 核心偏好独立列 + JSONB 兜底 |
| 标识符不变 | 用户名做主键，允许修改 | UUID 主键，用户名/邮箱可改但唯一 |
| 多身份绑定 | email 只一个字段 | `user_identities` 表支持多 provider |
| 软删除 | 物理删除用户数据 | `deactivated_at` 软删除，可配置保留期 |

### 数据一致性

| 场景 | 风险 | 解决方案 |
|------|------|---------|
| 并发角色变更 | 两人同时提升导致席位超限 | `SELECT ... FOR UPDATE` 行锁 |
| 并发邀请 | 席位超限 | 数据库唯一约束 + 行锁 |
| API Key 明文 | 创建后丢失无法恢复 | SHA-256 哈希存储，明文仅返回一次 |
| 缓存不一致 | 角色变更后缓存未失效 | 角色变更时主动 invalidate 缓存 |
| 双向关联不一致 | `User.team_id` 与 `TeamMember` 不同步 | 事务内同时更新，或定期一致性校验 |

### 认证一致性

多前端（Web/iOS/Android/CLI）场景下的典型陷阱：不同终端使用不同认证方式导致体验割裂。

**根本解法**：所有认证入口统一解析到 `user_id`。
- HTTP：session cookie / Bearer token / X-User-ID
- WebSocket：`?token=JWT`（而非独立持久 API Key）
- SSR：通过内部代理 secret 信任下游

### 隐私合规

| 法规要求 | 配套能力 |
|---------|---------|
| 数据导出 | 用户可下载自己的所有数据（结构化、机器可读格式） |
| 数据删除 | 物理删除 + 级联处理关联数据，或匿名化保留 |
| Cookie 同意 | 区分必要/非必要 Cookie |
| 审计追溯 | 谁在何时做了什么，结构化存储、可导出 |
| 数据最小化 | 仅收集必要字段，提供隐私设置开关 |

### 多租户隔离

```
数据隔离：
  - 所有核心业务查询必须带 team_id 过滤（或在中间件层自动注入）
  - 核心实体必须有 team_id FK

权限隔离：
  - TeamMember.role 仅影响本团队内资源
  - 全局 admin 不自动获得团队内权限（需显式加入）

配额隔离：
  - 团队配额池不与个人配额混淆
  - 跨团队用户需明确切换上下文
```

### 账号生命周期

```
注册 ──→ 激活 ──→ 活跃 ──→ 停用 ──→ 删除/归档
  │                │        │
  │                │        └── deactivated_at 软删除
  │                │            保留期后可物理删除
  │                │
  │                └── 正常使用：
  │                    ├── 修改资料/变更密码
  │                    ├── 升级套餐/加入团队
  │                    └── 所有操作产生审计日志
  │
  └── 邮箱/手机验证
      企业场景需审批流程
```

> 完整的反模式清单与纠正方案见 [references/anti-patterns.md](references/anti-patterns.md)

---

## 五、性能考量

| 关注点 | 策略 |
|--------|------|
| 认证热路径 | API Key 哈希字段加索引，避免全表扫描 |
| 会话查询 | JWT 自包含（不查 DB），仅 refresh 时查 |
| 用户列表 | 分页 + 搜索索引 + 避免 N+1 查询 |
| 偏好读取 | 单行主键查询，可加 Redis 短期缓存 |
| 配额检查 | Redis 计数器 + 定期刷回 DB，避免每次操作都查库 |

---

## 六、设计检查清单

执行用户体系设计或评审时，逐项核对：

### 标识符
- [ ] 主键使用 UUID（不可变、不可猜测）
- [ ] 用户名/邮箱有唯一索引
- [ ] 支持未来绑定多种登录方式

### 认证
- [ ] 多通道（Web/API/Mobile/SSR）统一解析到 user_id
- [ ] 密码强度策略可配置
- [ ] 登录限流（per-user + per-IP，Redis 分布式计数）
- [ ] 2FA 支持（TOTP + 恢复码）
- [ ] 会话可查看、可撤销

### 授权
- [ ] 全局角色 + 资源级角色分离
- [ ] 权限检查在 API 层（非仅前端）
- [ ] 套餐 feature flag 独立于角色

### 安全
- [ ] API Key SHA-256 哈希存储，明文仅返回一次
- [ ] 内部代理认证 HMAC 常量时间比较
- [ ] 审计日志完整保留（推荐 ≥180 天）
- [ ] 密码禁止明文存储或传输

### 数据
- [ ] 核心实体（资源/内容）与 User/Team 关联完整
- [ ] 软删除支持（`deactivated_at`）
- [ ] 偏好字段通过 JSONB 灵活扩展
- [ ] 多租户数据隔离（team_id 过滤）

### 扩展
- [ ] 角色/套餐用 String 类型（非 ENUM）
- [ ] 预留扩展字段（metadata JSONB）
- [ ] 账号生命周期各状态有明确处理流程

> 详细的逐项评审指南见 [references/design-checklist.md](references/design-checklist.md)

---

## 相关技能

- [[csp-oauth-integration]] — OAuth 2.0 / OIDC 认证流程实现（PKCE、Social Login、Token 管理）
- [[csp-subscription-management]] — 订阅生命周期、套餐变更、使用量计费、催款策略
- [[csp-privacy-compliance]] — GDPR/CCPA 隐私合规（数据导出、删除权、Cookie 同意）
- [[csp-backend-patterns]] — 通用后端模式（分层架构、Repository、缓存、幂等）
- [[csp-security-review]] — 安全审查（认证实现、授权漏洞、数据泄露风险）
- [[csp-api-governance]] — API 治理（API Key 管理、速率限制、访问控制）