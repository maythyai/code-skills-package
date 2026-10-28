# 账号模型设计参考

> 本文是 `csp-user-system-design` 的深度参考文档，覆盖账号模型的表结构设计、多身份绑定、账号与资料分离模式。

## 一、主键策略

### 为什么用 UUID

| 策略 | 优点 | 缺点 | 使用场景 |
|------|------|------|---------|
| 自增 ID (BIGSERIAL) | 简单、索引效率高、天然排序 | 可猜测、迁移冲突、不适合分布式 | 内部工具、单数据库 |
| UUID v4 | 不可猜测、分布式友好、全局唯一 | 索引碎片、存储空间大(16B) | **推荐：通用 Web/SaaS** |
| ULID | 可排序、URL 安全、与 UUID 兼容 | 库支持不如 UUID 成熟 | 需要时间排序的场景 |
| Snowflake | 可排序、高性能、分布式 | 依赖机器时钟、需部署 ID 服务 | 高吞吐分布式系统 |

**选择 UUID v4 作为默认推荐**：它是最通用的方案，无需额外服务或时钟同步。

### 不要用作为主键的字段

- **邮箱**：用户可能更换、可能被回收后分配给他人、隐私合规要求可删除
- **手机号**：同上，且国际号码格式复杂
- **用户名**：用户可能想改名

这些字段都应作为**唯一索引的辅助字段**，而非主键。

---

## 二、核心表结构

### users 表（认证信息）

```sql
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username    VARCHAR(50) NOT NULL,
    email       VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    type        VARCHAR(20) NOT NULL DEFAULT 'personal',  -- personal / organization
    status      VARCHAR(20) NOT NULL DEFAULT 'active',    -- active / suspended / deactivated
    email_verified_at TIMESTAMPTZ,
    deactivated_at    TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- 唯一约束
    CONSTRAINT uq_users_username UNIQUE (username),
    CONSTRAINT uq_users_email UNIQUE (email),
    -- 状态约束
    CONSTRAINT ck_users_type CHECK (type IN ('personal', 'organization')),
    CONSTRAINT ck_users_status CHECK (status IN ('active', 'suspended', 'deactivated'))
);

-- 索引
CREATE INDEX idx_users_status ON users (status);
CREATE INDEX idx_users_created_at ON users (created_at);
```

### user_profiles 表（展示信息，与 users 分离）

```sql
CREATE TABLE user_profiles (
    user_id        UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    display_name   VARCHAR(100),
    avatar_url     VARCHAR(500),
    bio            TEXT,
    website        VARCHAR(500),
    location       VARCHAR(200),
    timezone       VARCHAR(50) DEFAULT 'UTC',
    locale         VARCHAR(10) DEFAULT 'en',
    metadata       JSONB DEFAULT '{}',          -- 扩展字段

    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**分离的原因**：
- 认证表是安全敏感数据，访问控制严格
- 展示表是公开或半公开数据，读取频繁但安全要求低
- 各自独立演化，互不阻塞迁移

### user_identities 表（多身份绑定）

```sql
CREATE TABLE user_identities (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider      VARCHAR(30) NOT NULL,        -- email / google / github / apple / saml
    provider_id   VARCHAR(255) NOT NULL,       -- 第三方用户 ID（邮箱提供商时为邮箱本身）
    access_token  TEXT,                         -- 加密存储
    refresh_token TEXT,                         -- 加密存储
    token_expires_at TIMESTAMPTZ,
    metadata      JSONB DEFAULT '{}',

    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- 同一 provider 下 provider_id 唯一
    CONSTRAINT uq_identities_provider UNIQUE (provider, provider_id),
    -- 一个用户同一 provider 只能绑定一次
    CONSTRAINT uq_user_provider UNIQUE (user_id, provider)
);

CREATE INDEX idx_identities_user ON user_identities (user_id);
```

**设计要点**：
- `provider_id` 是第三方返回的唯一标识符（如 Google 的 `sub` claim）
- 允许一个用户绑定多个 provider（邮箱 + Google + GitHub）
- 禁止同一 provider 的同一 ID 绑定到多个用户
- Token 字段需加密存储（AES-256-GCM 或应用层加密）

---

## 三、用户偏好设计

### 存储策略

```sql
CREATE TABLE user_preferences (
    user_id              UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

    -- 核心偏好（独立列，便于查询和索引）
    theme                VARCHAR(20) DEFAULT 'system',   -- light / dark / system
    language             VARCHAR(10) DEFAULT 'en',
    content_density      VARCHAR(20) DEFAULT 'comfortable', -- compact / comfortable / spacious
    timezone             VARCHAR(50) DEFAULT 'UTC',

    -- 通知偏好（JSONB，灵活扩展）
    notification_prefs   JSONB DEFAULT '{
        "email": {"marketing": false, "transactional": true, "security": true},
        "push": {"enabled": true, "quiet_hours": {"start": "22:00", "end": "07:00"}},
        "in_app": {"enabled": true}
    }',

    -- 兜底扩展
    extra_prefs          JSONB DEFAULT '{}',

    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**原则**：
- 高频读取/查询的偏好（theme、language）用独立列
- 动态变化/不需要查询的偏好（通知配置）用 JSONB
- 不把偏好字段膨胀成几十个列——每加一个偏好就加一列是不可持续的

---

## 四、实体 vs 组织账号

当系统需要支持组织/企业账号时，推荐方案：

```
统一 users 表 + type 字段 + 可选的 organization_profiles 表
```

```sql
-- 在 users 表上扩展
ALTER TABLE users ADD COLUMN type VARCHAR(20) NOT NULL DEFAULT 'personal';
ALTER TABLE users ADD CONSTRAINT ck_users_type CHECK (type IN ('personal', 'organization'));

-- 组织专属信息
CREATE TABLE organization_profiles (
    user_id          UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    company_name     VARCHAR(200) NOT NULL,
    tax_id           VARCHAR(50),
    industry         VARCHAR(100),
    company_size     VARCHAR(20),               -- 1-10 / 11-50 / 51-200 / 201-1000 / 1000+
    verified         BOOLEAN DEFAULT FALSE,
    metadata         JSONB DEFAULT '{}'
);
```

**为什么不分成两张主表（`personal_users` + `org_users`）**：
- 多态关联变得复杂（资源 owner 可能是两种类型）
- 认证逻辑需要重复实现
- 个人用户可能升级为企业账号时涉及数据迁移