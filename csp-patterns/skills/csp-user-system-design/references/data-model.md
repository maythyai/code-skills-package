# 用户体系数据模型参考

> 本文是 `csp-user-system-design` 的深度参考文档，覆盖核心表结构、索引策略、迁移规范与扩展性设计。

## 一、核心 ER 图

```
User (UUID)
  │
  ├──1:1── UserProfile (display_name, avatar, bio, metadata JSONB)
  ├──1:1── UserPreference (theme, language, notification_prefs JSONB)
  ├──1:1── User2FA (totp_secret, recovery_codes[], enabled_at)
  │
  ├──1:N── UserIdentity (provider, provider_id, tokens)
  ├──1:N── ApiKey (key_hash, key_prefix, scope, expires_at)
  ├──1:N── Session (token_hash, expires_at, user_agent, ip)
  ├──1:N── LoginHistory (success, ip, user_agent, is_anomalous)
  ├──1:N── Subscription (plan_id, status, current_period_start/end)
  ├──1:N── CreditLedger (amount, balance_after, reason, idempotency_key)
  │
  ├──N:1── Team (name, slug, plan, settings JSONB)
  │         │
  │         ├──1:N── TeamMember (user_id, role, joined_at, seat_type)
  │         ├──1:N── TeamInvitation (email, role, token, expires_at)
  │         ├──1:N── TeamQuotaPool (quota_type, total, used, period)
  │         └──1:N── TeamAuditLog (actor_id, action, target, details)
  │
  └──1:N── Resource (owner_id, team_id, ...)
```

## 二、完整表结构

### 2.1 用户核心表

```sql
-- users: 认证信息（安全敏感）
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username        VARCHAR(50) NOT NULL,
    email           VARCHAR(255) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    type            VARCHAR(20) NOT NULL DEFAULT 'personal',
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    email_verified_at   TIMESTAMPTZ,
    deactivated_at      TIMESTAMPTZ,
    last_login_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_users_username UNIQUE (username),
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT ck_users_type CHECK (type IN ('personal', 'organization')),
    CONSTRAINT ck_users_status CHECK (status IN ('active', 'suspended', 'deactivated'))
);

-- user_profiles: 展示信息（公开/半公开）
CREATE TABLE user_profiles (
    user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    display_name    VARCHAR(100),
    avatar_url      VARCHAR(500),
    bio             TEXT,
    website         VARCHAR(500),
    location        VARCHAR(200),
    timezone        VARCHAR(50) DEFAULT 'UTC',
    locale          VARCHAR(10) DEFAULT 'en',
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- user_preferences: 用户偏好
CREATE TABLE user_preferences (
    user_id             UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    theme               VARCHAR(20) DEFAULT 'system',
    language            VARCHAR(10) DEFAULT 'en',
    content_density     VARCHAR(20) DEFAULT 'comfortable',
    notification_prefs  JSONB DEFAULT '{}',
    quiet_hours         JSONB DEFAULT '{}',
    extra_prefs         JSONB DEFAULT '{}',
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- user_identities: 多身份绑定
CREATE TABLE user_identities (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider        VARCHAR(30) NOT NULL,
    provider_id     VARCHAR(255) NOT NULL,
    email           VARCHAR(255),
    access_token    TEXT,
    refresh_token   TEXT,
    token_expires_at TIMESTAMPTZ,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_identities_provider UNIQUE (provider, provider_id),
    CONSTRAINT uq_user_provider UNIQUE (user_id, provider)
);

-- user_2fa: 双因素认证
CREATE TABLE user_2fa (
    user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    totp_secret     VARCHAR(64) NOT NULL,
    recovery_codes  JSONB NOT NULL DEFAULT '[]',   -- [{hash: "..."}], 明文仅在设置时返回
    enabled_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until    TIMESTAMPTZ
);
```

### 2.2 认证与安全表

```sql
-- sessions: 活跃会话
CREATE TABLE sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      VARCHAR(128) NOT NULL UNIQUE,
    expires_at      TIMESTAMPTZ NOT NULL,
    last_active_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sessions_user ON sessions (user_id);

-- login_history: 登录历史（用于风控与活跃度分析）
CREATE TABLE login_history (
    id              BIGSERIAL PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    success         BOOLEAN NOT NULL,
    ip_address      INET,
    user_agent      TEXT,
    is_anomalous    BOOLEAN DEFAULT FALSE,
    failure_reason  VARCHAR(100),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_login_user ON login_history (user_id, created_at DESC);
CREATE INDEX idx_login_ip ON login_history (ip_address, created_at DESC);

-- api_keys: 程序化访问密钥
CREATE TABLE api_keys (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    key_hash        VARCHAR(128) NOT NULL UNIQUE,
    key_prefix      VARCHAR(8) NOT NULL,
    scope           VARCHAR(20) NOT NULL DEFAULT 'read',
    last_used_at    TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    revoked_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT ck_api_key_scope CHECK (scope IN ('read', 'read_write'))
);
CREATE INDEX idx_api_keys_user ON api_keys (user_id);
CREATE INDEX idx_api_keys_hash ON api_keys (key_hash);

-- audit_logs: 审计日志
CREATE TABLE audit_logs (
    id              BIGSERIAL PRIMARY KEY,
    actor_id        UUID NOT NULL,
    action          VARCHAR(100) NOT NULL,
    target_type     VARCHAR(50) NOT NULL,
    target_id       VARCHAR(100),
    details         JSONB DEFAULT '{}',
    ip_address      INET,
    user_agent      TEXT,
    request_id      UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_actor ON audit_logs (actor_id, created_at DESC);
CREATE INDEX idx_audit_target ON audit_logs (target_type, target_id);
CREATE INDEX idx_audit_created ON audit_logs (created_at DESC);
```

### 2.3 订阅与配额表

```sql
-- subscriptions: 订阅记录
CREATE TABLE subscriptions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL REFERENCES users(id),
    plan_id                 VARCHAR(50) NOT NULL,
    status                  VARCHAR(20) NOT NULL DEFAULT 'active',
    current_period_start    TIMESTAMPTZ NOT NULL,
    current_period_end      TIMESTAMPTZ NOT NULL,
    cancel_at_period_end    BOOLEAN DEFAULT FALSE,
    trial_ends_at           TIMESTAMPTZ,
    payment_provider_id     VARCHAR(255),
    payment_provider        VARCHAR(30),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_subscription_user UNIQUE (user_id),
    CONSTRAINT ck_subscription_status CHECK (
        status IN ('active', 'past_due', 'canceled', 'trialing', 'expired')
    )
);

-- credit_ledger: Credit 变动记录
CREATE TABLE credit_ledger (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    amount          INTEGER NOT NULL,               -- 正数为增加，负数为扣减
    balance_after   INTEGER NOT NULL,
    reason          VARCHAR(50) NOT NULL,
    idempotency_key VARCHAR(128) UNIQUE,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_credit_user ON credit_ledger (user_id, created_at DESC);
```

### 2.4 团队与多租户表

```sql
-- teams: 团队/租户
CREATE TABLE teams (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(200) NOT NULL,
    slug            VARCHAR(50) NOT NULL UNIQUE,
    plan_id         VARCHAR(50) NOT NULL DEFAULT 'free',
    settings        JSONB DEFAULT '{}',
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- team_members: 团队成员（资源级角色在此定义）
CREATE TABLE team_members (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            VARCHAR(30) NOT NULL DEFAULT 'viewer',
    seat_type       VARCHAR(20) NOT NULL DEFAULT 'member',  -- member / guest
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_team_member UNIQUE (team_id, user_id),
    CONSTRAINT ck_member_role CHECK (
        role IN ('owner', 'admin', 'editor', 'viewer', 'guest')
    )
);
CREATE INDEX idx_member_team ON team_members (team_id);
CREATE INDEX idx_member_user ON team_members (user_id);

-- team_invitations: 团队邀请
CREATE TABLE team_invitations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    invited_by      UUID NOT NULL REFERENCES users(id),
    email           VARCHAR(255) NOT NULL,
    role            VARCHAR(30) NOT NULL DEFAULT 'viewer',
    token           VARCHAR(128) NOT NULL UNIQUE,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending / accepted / expired
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_invitation UNIQUE (team_id, email, status)
);

-- team_quota_pools: 团队共享配额池
CREATE TABLE team_quota_pools (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    quota_type      VARCHAR(50) NOT NULL,
    total           INTEGER NOT NULL,
    used            INTEGER NOT NULL DEFAULT 0,
    period_start    TIMESTAMPTZ NOT NULL,
    period_end      TIMESTAMPTZ NOT NULL,

    CONSTRAINT uq_team_quota UNIQUE (team_id, quota_type, period_start)
);
```

---

## 三、索引策略

### 必须建立的索引

| 表 | 索引 | 原因 |
|-----|------|------|
| `users` | `username UNIQUE` | 登录查找 |
| `users` | `email UNIQUE` | 登录查找、重复检测 |
| `users` | `status` | 过滤活跃/停用用户 |
| `api_keys` | `key_hash UNIQUE` | **认证热路径**，必须快速查找 |
| `api_keys` | `user_id` | 查看用户的 API Keys |
| `sessions` | `token_hash UNIQUE` | 会话验证 |
| `sessions` | `user_id` | 查看用户会话列表 |
| `user_identities` | `(provider, provider_id) UNIQUE` | OAuth 登录 |
| `team_members` | `(team_id, user_id) UNIQUE` | 成员查找 |
| `team_members` | `user_id` | 查看用户所属团队 |
| `audit_logs` | `(actor_id, created_at DESC)` | 用户审计记录 |
| `audit_logs` | `(target_type, target_id)` | 按目标查找审计 |
| `credit_ledger` | `user_id` | 查看用户 Credit 变动 |

### 索引设计原则

- 认证热路径（API Key 验证、Session 验证）的查找字段**必须有索引**
- 复合索引的列顺序：等值查询列在前，范围查询列在后
- 避免在频繁更新的列上建过多的索引
- JSONB 字段若需频繁查询某 key，考虑用表达式索引

---

## 四、扩展性设计

### JSONB 扩展字段

```sql
-- 每个核心表预留 metadata JSONB 字段
ALTER TABLE users ADD COLUMN metadata JSONB DEFAULT '{}';
ALTER TABLE teams ADD COLUMN settings JSONB DEFAULT '{}';
ALTER TABLE team_members ADD COLUMN metadata JSONB DEFAULT '{}';
```

**JSONB 使用规范**：
- 用于存储不需要查询/索引的扩展属性
- 字段名使用 snake_case
- 不要在 JSONB 中存储核心业务逻辑的依赖字段
- 对 JSONB 中高频读取的字段考虑提取为独立列

### 避免的设计

| 反模式 | 后果 | 替代方案 |
|--------|------|---------|
| 角色用数据库 ENUM | 添加角色需 DDL 变更 | `VARCHAR(50)` + CHECK 约束 |
| 每个偏好一个列 | 表列数膨胀，迁移频繁 | 核心偏好独立列 + JSONB 兜底 |
| 邮箱做主键 | 用户换邮箱时所有 FK 断裂 | UUID 主键 + 邮箱唯一索引 |
| 物理删除用户 | FK 断裂，数据不一致 | `deactivated_at` 软删除 |
| 一张大表存所有 | 查询慢、锁竞争、迁移困难 | 认证/资料/偏好分表 |

---

## 五、数据保留与清理

### 保留策略参考

| 数据类型 | 保留期 | 清理方式 |
|---------|--------|---------|
| 活跃用户数据 | 永久（账号存续期间） | — |
| 已注销用户数据 | 30 天宽限期后可删除 | 软删除 → 物理删除/匿名化 |
| 会话记录 | 90 天 | 定时任务清理过期会话 |
| 登录历史 | 1 年 | 按月分区，定期 DROP 旧分区 |
| 审计日志 | 180 天（合规场景 ≥1 年） | 按月分区 + 定期归档至冷存储 |
| API Key 记录 | Key 撤销后保留 30 天 | 用于审计追溯 |
| 团队邀请 | 过期后保留 90 天 | 定时任务清理 |