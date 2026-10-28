# 认证与安全参考

> 本文是 `csp-user-system-design` 的深度参考文档，覆盖多通道认证架构、安全机制实现、API Key 管理、会话策略与审计日志。

## 一、多通道认证统一架构

### 设计目标

所有认证通道（Web Cookie / API Key / SSO / WebSocket / SSR Proxy）最终**统一解析为 `user_id`**，上层业务代码不感知用户是通过哪个通道认证的。

### 认证中间件统一入口

```python
class AuthMiddleware:
    """统一认证中间件 — 按顺序尝试各通道，第一个成功的通道返回 user_id"""

    async def authenticate(self, request) -> str:
        # 通道优先级
        handlers = [
            self._try_session_cookie,     # Web Cookie
            self._try_bearer_token,       # API Key / JWT
            self._try_proxy_header,       # SSR 代理认证
            self._try_websocket_token,    # WebSocket 参数
        ]

        for handler in handlers:
            user_id = await handler(request)
            if user_id:
                return user_id

        raise UnauthenticatedError()

    async def _try_session_cookie(self, request) -> str | None:
        token = request.cookies.get('session')
        if not token:
            return None
        return await self._validate_jwt(token)

    async def _try_bearer_token(self, request) -> str | None:
        auth = request.headers.get('Authorization', '')
        if not auth.startswith('Bearer '):
            return None
        token = auth[7:]

        # 先尝试作为 API Key 验证
        user_id = await self._validate_api_key(token)
        if user_id:
            return user_id

        # 再尝试作为 JWT 验证
        return await self._validate_jwt(token)

    async def _try_proxy_header(self, request) -> str | None:
        user_id = request.headers.get('X-User-ID')
        proxy_sig = request.headers.get('X-Internal-Proxy-Signature')

        if not user_id or not proxy_sig:
            return None

        # HMAC 常量时间验证
        expected = hmac.new(
            INTERNAL_PROXY_SECRET.encode(),
            user_id.encode(),
            hashlib.sha256
        ).hexdigest()

        if not hmac.compare_digest(expected, proxy_sig):
            raise SecurityError("Invalid proxy signature")

        return user_id
```

---

## 二、安全机制清单

### 2.1 密码策略

```python
class PasswordPolicy:
    MIN_LENGTH = 8
    MAX_LENGTH = 128
    REQUIRE_UPPER = True
    REQUIRE_LOWER = True
    REQUIRE_DIGIT = True
    REQUIRE_SPECIAL = False

    # 禁止的常见密码（top 10000）
    COMMON_PASSWORDS: set[str]

    @classmethod
    def validate(cls, password: str) -> list[str]:
        errors = []
        if len(password) < cls.MIN_LENGTH:
            errors.append(f"Password must be at least {cls.MIN_LENGTH} characters")
        if cls.REQUIRE_UPPER and not re.search(r'[A-Z]', password):
            errors.append("Password must contain an uppercase letter")
        if cls.REQUIRE_LOWER and not re.search(r'[a-z]', password):
            errors.append("Password must contain a lowercase letter")
        if cls.REQUIRE_DIGIT and not re.search(r'\d', password):
            errors.append("Password must contain a digit")
        if password.lower() in cls.COMMON_PASSWORDS:
            errors.append("Password is too common")
        return errors

    @classmethod
    def hash(cls, password: str) -> str:
        # 使用 bcrypt (cost=12) 或 argon2id
        return bcrypt.hashpw(
            password.encode(),
            bcrypt.gensalt(rounds=12)
        ).decode()
```

### 2.2 登录限流

```python
class LoginRateLimiter:
    """分布式登录限流 (per-username + per-IP)"""

    MAX_ATTEMPTS_PER_USERNAME = 5   # 每用户名每窗口
    MAX_ATTEMPTS_PER_IP = 20        # 每 IP 每窗口
    WINDOW_SECONDS = 900            # 15 分钟窗口
    LOCKOUT_SECONDS = 3600          # 锁定 1 小时

    def __init__(self, redis_client):
        self.redis = redis_client

    async def check_and_increment(
        self, username: str, ip: str
    ) -> tuple[bool, str | None]:
        """
        返回 (allowed, error_message)
        """
        now = time.time()
        window_start = now - self.WINDOW_SECONDS

        # 检查是否已被锁定
        lock_key = f"login_lock:{username}"
        if await self.redis.exists(lock_key):
            ttl = await self.redis.ttl(lock_key)
            return False, f"Account locked. Try again in {ttl} seconds."

        # 获取窗口内尝试次数
        username_key = f"login:user:{username}"
        ip_key = f"login:ip:{ip}"

        pipe = self.redis.pipeline()
        pipe.zremrangebyscore(username_key, 0, window_start)
        pipe.zcard(username_key)
        pipe.zremrangebyscore(ip_key, 0, window_start)
        pipe.zcard(ip_key)
        _, username_attempts, _, ip_attempts = await pipe.execute()

        # 检查阈值
        if username_attempts >= self.MAX_ATTEMPTS_PER_USERNAME:
            await self.redis.setex(lock_key, self.LOCKOUT_SECONDS, "locked")
            return False, "Too many attempts. Account locked."

        if ip_attempts >= self.MAX_ATTEMPTS_PER_IP:
            return False, "Too many attempts from this IP."

        # 记录本次尝试
        pipe = self.redis.pipeline()
        pipe.zadd(username_key, {str(now): now})
        pipe.expire(username_key, self.WINDOW_SECONDS)
        pipe.zadd(ip_key, {str(now): now})
        pipe.expire(ip_key, self.WINDOW_SECONDS)
        await pipe.execute()

        return True, None

    async def reset(self, username: str):
        """登录成功后重置计数器"""
        await self.redis.delete(f"login:user:{username}")
        await self.redis.delete(f"login_lock:{username}")
```

### 2.3 TOTP 双因素认证

```python
class TOTPService:
    ISSUER = "YourApp"
    DIGITS = 6
    PERIOD = 30
    RECOVERY_CODES_COUNT = 8

    @classmethod
    def generate_secret(cls) -> str:
        """生成 TOTP 密钥"""
        return pyotp.random_base32()

    @classmethod
    def get_provisioning_uri(cls, username: str, secret: str) -> str:
        """生成二维码 URI（用于 Authenticator App 扫码）"""
        return pyotp.totp.TOTP(secret).provisioning_uri(
            name=username,
            issuer_name=cls.ISSUER
        )

    @classmethod
    def verify(cls, secret: str, code: str) -> bool:
        """验证 TOTP 码（允许前后各 1 个窗口的时间偏差）"""
        totp = pyotp.TOTP(secret)
        return totp.verify(code, valid_window=1)

    @classmethod
    def generate_recovery_codes(cls) -> list[str]:
        """生成恢复码"""
        codes = []
        for _ in range(cls.RECOVERY_CODES_COUNT):
            code = secrets.token_hex(4)  # 8 字符
            code_hash = hashlib.sha256(code.encode()).hexdigest()
            codes.append({"code": code, "hash": code_hash})
        return codes

    @classmethod
    def verify_recovery_code(cls, code: str, stored_hashes: list[str]) -> bool:
        """验证并消费恢复码（一次性使用）"""
        code_hash = hashlib.sha256(code.encode()).hexdigest()
        return code_hash in stored_hashes
```

### 2.4 会话管理

```python
class SessionManager:
    """JWT 会话管理 — 短有效期 + 即时撤销"""

    ACCESS_TOKEN_TTL = 24 * 3600        # 24 hours
    REFRESH_TOKEN_TTL = 30 * 86400      # 30 days
    REVOCATION_LIST_KEY = "jwt_revoked"

    @classmethod
    def create_access_token(cls, user_id: str, session_id: str) -> str:
        now = datetime.utcnow()
        return jwt.encode({
            'sub': user_id,
            'sid': session_id,
            'iat': now,
            'exp': now + timedelta(seconds=cls.ACCESS_TOKEN_TTL),
            'type': 'access'
        }, JWT_SECRET, algorithm='HS256')

    @classmethod
    async def revoke_session(cls, redis_client, session_id: str):
        """即时撤销会话 — 加入黑名单"""
        await redis_client.setex(
            f"{cls.REVOCATION_LIST_KEY}:{session_id}",
            cls.ACCESS_TOKEN_TTL,
            "revoked"
        )

    @classmethod
    async def is_revoked(cls, redis_client, session_id: str) -> bool:
        return await redis_client.exists(
            f"{cls.REVOCATION_LIST_KEY}:{session_id}"
        ) > 0

    @classmethod
    async def list_active_sessions(
        cls, user_id: str, db_session
    ) -> list[dict]:
        """列出用户所有活跃会话"""
        sessions = await db_session.execute(
            """SELECT id, created_at, last_active_at, user_agent, ip_address
               FROM sessions
               WHERE user_id = :uid AND expires_at > NOW()
               ORDER BY last_active_at DESC""",
            {"uid": user_id}
        )
        return [
            {
                "session_id": s.id,
                "created_at": s.created_at.isoformat(),
                "last_active": s.last_active_at.isoformat(),
                "device": parse_user_agent(s.user_agent),
                "current": False  # 调用方标记当前会话
            }
            for s in sessions
        ]
```

### 2.5 API Key 管理

```python
class ApiKeyService:
    KEY_PREFIX_LENGTH = 8            # 明文前缀，用于 UI 识别
    KEY_LENGTH = 40                  # 随机部分长度
    HASH_ALGORITHM = 'sha256'

    @classmethod
    def generate(cls) -> tuple[str, str]:
        """
        生成 API Key
        返回 (plain_text_key, hashed_key)
        plain_text_key:  仅在创建时返回一次，后续不可恢复
        hashed_key:      存储到数据库
        """
        prefix = secrets.token_hex(cls.KEY_PREFIX_LENGTH // 2)
        random_part = secrets.token_hex(cls.KEY_LENGTH // 2)
        plain_text = f"{prefix}_{random_part}"

        hashed = hashlib.new(
            cls.HASH_ALGORITHM,
            plain_text.encode()
        ).hexdigest()

        return plain_text, hashed

    @classmethod
    def hash_key(cls, key: str) -> str:
        return hashlib.new(cls.HASH_ALGORITHM, key.encode()).hexdigest()

    @classmethod
    def mask_key_for_display(cls, key: str) -> str:
        """UI 展示用：只显示前 8 字符前缀"""
        prefix = key.split('_')[0] if '_' in key else key[:8]
        return f"{prefix}...{key[-4:]}"


# API Key 表结构
# CREATE TABLE api_keys (
#     id UUID PRIMARY KEY,
#     user_id UUID NOT NULL REFERENCES users(id),
#     name VARCHAR(100) NOT NULL,
#     key_hash VARCHAR(128) NOT NULL UNIQUE,      -- SHA-256 哈希
#     key_prefix VARCHAR(8) NOT NULL,              -- 用于 UI 展示
#     scope VARCHAR(20) NOT NULL DEFAULT 'read',   -- read / read_write
#     last_used_at TIMESTAMPTZ,
#     expires_at TIMESTAMPTZ,
#     revoked_at TIMESTAMPTZ,
#     created_at TIMESTAMPTZ NOT NULL DEFAULT now()
# );
# CREATE INDEX idx_api_keys_user ON api_keys (user_id);
# CREATE INDEX idx_api_keys_hash ON api_keys (key_hash);
```

---

## 三、审计日志

### 日志结构

```python
@dataclass
class AuditEvent:
    actor_id: str        # 谁
    action: str          # 做了什么
    target_type: str     # 对什么类型
    target_id: str       # 对哪个实例
    details: dict        # 变更详情
    ip_address: str
    user_agent: str
    timestamp: datetime
    request_id: str      # 关联请求 ID
```

### 审计日志表

```sql
CREATE TABLE audit_logs (
    id            BIGSERIAL PRIMARY KEY,
    actor_id      UUID NOT NULL,
    action        VARCHAR(100) NOT NULL,
    target_type   VARCHAR(50) NOT NULL,
    target_id     VARCHAR(100),
    details       JSONB DEFAULT '{}',
    ip_address    INET,
    user_agent    TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    request_id    UUID
);

-- 分区按月（大数据量表）
-- CREATE TABLE audit_logs (...) PARTITION BY RANGE (created_at);

CREATE INDEX idx_audit_actor ON audit_logs (actor_id, created_at DESC);
CREATE INDEX idx_audit_target ON audit_logs (target_type, target_id);
CREATE INDEX idx_audit_action ON audit_logs (action, created_at DESC);
```

### 关键事件必须记录

| 事件类型 | 何时记录 |
|---------|---------|
| `user.login` | 每次登录 |
| `user.login_failed` | 每次登录失败 |
| `user.password_changed` | 密码变更 |
| `user.email_changed` | 邮箱变更 |
| `user.2fa_enabled` / `user.2fa_disabled` | 2FA 状态变更 |
| `user.role_changed` | 角色变更（含变更前后值） |
| `api_key.created` / `api_key.revoked` | API Key 操作 |
| `session.revoked` | 会话撤销 |
| `team.member_added` / `team.member_removed` | 团队成员变更 |
| `team.member_role_changed` | 成员角色变更 |
| `billing.plan_changed` | 套餐变更 |

---

## 四、安全编码规范

### 必须遵守

1. **常量时间比较**：所有密钥/签名比较使用 `hmac.compare_digest()` 或等价函数
2. **密码永不明文**：存储用 bcrypt/argon2，传输用 HTTPS，日志决不打印密码
3. **Token 哈希存储**：API Key / 恢复码 / 会话 token 永远只存哈希
4. **速率限制**：登录、密码重置、2FA 验证、API Key 验证都必须有限流
5. **最小暴露**：错误消息不暴露用户是否存在（"用户名或密码错误"而非"用户不存在"）
6. **HTTPS only**：所有认证相关 Cookie 设置 `Secure; HttpOnly; SameSite=Lax`