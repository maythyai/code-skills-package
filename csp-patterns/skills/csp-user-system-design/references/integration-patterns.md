# 跨系统集成模式参考

> 本文是 `csp-user-system-design` 的深度参考文档，覆盖用户体系与周边系统（权限、内容、计费、通知、风控、分析）的关联模式、边界约定与集成规范。

## 一、集成总则

**用户体系提供**：
- 用户身份标识（`user_id`）
- 认证状态（是否已登录、会话是否有效）
- 授权信息（角色、权限、套餐等级）
- 联系方式（邮箱、手机）
- 组织归属（`team_id`、成员角色）

**用户体系不提供**：
- 不处理支付本身
- 不发送消息/邮件（只提供通道地址）
- 不做内容存储/管理
- 不做行为数据分析

---

## 二、与权限系统的集成

### 模式：依赖注入

```
Request → Auth Middleware → user_id + role → Permission Checker → Allow/Deny
```

```python
# 权限系统消费用户体系的 user_id + role
class PermissionChecker:
    def __init__(self, user_provider: UserProvider):
        self.user_provider = user_provider

    async def check(self, user_id: str, permission: str, resource_id: str = None):
        # 从用户体系获取当前角色
        role = await self.user_provider.get_role(user_id, resource_id)
        return permission in ROLE_PERMISSIONS[role]
```

### 边界约定

| 约束 | 说明 |
|------|------|
| 权限系统不存储用户 | 只消费 `user_id` + `role` |
| 权限缓存 key 为 `user_id` | 角色变更时主动 invalidate |
| 不允许权限系统直接写用户表 | 角色变更通过用户体系 API |

---

## 三、与内容/资源系统的集成

### 模式：所有权 + 多租户隔离

```
内容 CRUD:
  create:   resource.owner_id = user_id, resource.team_id = team_id
  read:     WHERE team_id = current_user.team_id (多租户隔离)
  update:   WHERE owner_id = current_user.id OR team_role >= 'editor'
  delete:   WHERE owner_id = current_user.id OR team_role >= 'admin'
```

### 用户删除时的级联策略

| 策略 | 适用场景 | 实现 |
|------|---------|------|
| 转移所有权 | 团队成员创建的内容需保留 | 将 `owner_id` 转移给团队 admin |
| 匿名化保留 | 内容有公共价值（如论坛帖子） | 将 `owner_id` 设为 null，`author_name` 显示为 "已注销用户" |
| 级联删除 | 纯个人数据（如私密笔记） | `ON DELETE CASCADE` |
| 混合策略 | 大多数应用 | 按内容类型配置不同策略 |

```python
class UserDeletionHandler:
    CONTENT_STRATEGIES = {
        'public_post': 'anonymize',
        'private_note': 'cascade_delete',
        'team_document': 'transfer_ownership',
        'comment': 'anonymize',
    }

    async def handle_content_on_user_deletion(self, user_id: str):
        for content_type, strategy in self.CONTENT_STRATEGIES.items():
            handler = getattr(self, f'_handle_{strategy}')
            await handler(user_id, content_type)
```

---

## 四、与计费系统的集成

### 模式：用户体系提供身份，计费系统管理交易

```
用户体系                         计费系统
  │                                │
  ├── user_id + plan ──────────→  │
  │                                ├── 配额计算
  │  ←── plan_change_event ────   │── 支付处理
  │                                │── 发票管理
  ├── 更新 plan + features ──→    │
```

### Pre-Flight 配额检查

```python
async def create_content(user_id: str, content_data: dict):
    # 步骤 1：先检查配额（pre-flight check）
    quota_ok = await quota_service.check_quota(user_id, 'content_creation')
    if not quota_ok:
        raise QuotaExceededError("Daily content creation limit reached")

    # 步骤 2：执行操作
    content = await content_service.create(user_id, content_data)

    # 步骤 3：消耗配额
    await quota_service.consume(user_id, 'content_creation', 1)

    return content
```

### 套餐变更的事件驱动同步

```python
# 计费系统发送事件
async def handle_plan_changed(event: PlanChangedEvent):
    user_id = event.user_id
    new_plan = event.new_plan

    # 更新用户体系中的套餐信息
    await user_service.update_plan(user_id, new_plan)

    # 清除权限缓存（套餐变更可能影响 feature flag）
    await permission_cache.invalidate(user_id)

    # 清除配额缓存
    await quota_cache.invalidate(user_id)
```

### 边界约定

| 约束 | 说明 |
|------|------|
| 用户体系不处理支付 | 只存储 `plan_id` 和 `subscription_status` |
| 计费系统不写入用户表 | 通过事件或 API 通知用户体系更新 |
| 配额检查在业务操作前 | 不允许先扣费后检查 |
| 降级宽容、升级即时 | 降级可在周期结束时生效；升级立即生效 |

---

## 五、与通知系统的集成

### 模式：用户体系提供通道 + 偏好，通知系统负责投递

```python
class NotificationDispatcher:
    def __init__(self, user_service: UserService):
        self.user_service = user_service

    async def send(self, user_id: str, notification: Notification):
        # 获取发送通道
        user = await self.user_service.get_by_id(user_id)

        # 获取通知偏好
        prefs = await self.user_service.get_preferences(user_id)
        notif_prefs = prefs.get('notification_prefs', {})

        # 检查免打扰时段
        if self._is_quiet_hours(prefs.get('quiet_hours', {})):
            return  # 延迟到免打扰结束后发送

        # 按优先级选择通道
        if notif_prefs.get('push', {}).get('enabled'):
            await self._send_push(user, notification)
        elif notif_prefs.get('email', {}).get(notification.category):
            await self._send_email(user.email, notification)
        else:
            await self._send_in_app(user_id, notification)
```

### JSONB 通知偏好示例

```json
{
  "email": {
    "marketing": false,
    "transactional": true,
    "security": true,
    "digest": "weekly"
  },
  "push": {
    "enabled": true,
    "quiet_hours": {
      "start": "22:00",
      "end": "07:00"
    }
  },
  "in_app": {
    "enabled": true
  },
  "channels": ["email", "push"]
}
```

### 边界约定

| 约束 | 说明 |
|------|------|
| 用户体系不负责发送 | 只提供通道地址 + 偏好 |
| 通知配置不可硬编码列 | 用 JSONB 灵活扩展 |
| 通知系统不可修改用户数据 | 只读用户联系方式 |

---

## 六、与风控系统的集成

### 模式：风控消费登录行为，通过 API 做账号管控

```
用户体系 ──→ LoginAttempt 事件 ──→ 风控引擎
                                        │
                         ┌──────────────┼──────────────┐
                         ▼              ▼              ▼
                    正常             风险标记         自动冻结
                         │              │              │
                         └── 无操作     └── 标记        └── 调用用户API
                                         is_anomalous     suspend_user()
```

### 风控关注的信号

| 信号 | 来源 | 检测逻辑 |
|------|------|---------|
| 异地登录 | `login_history.ip_address` | 同账户短时间内从不同国家/城市登录 |
| 暴力破解 | 登录失败计数 | per-username 失败次数超过阈值 |
| 异常时间 | `login_history.created_at` | 用户历史上从不在此时间段活跃 |
| 设备变更 | `login_history.user_agent` | 短时间内频繁更换设备 |
| IP 关联 | `login_history.ip_address` | 同一 IP 大量不同账号登录 |

### 边界约定

| 约束 | 说明 |
|------|------|
| 风控系统消费用户行为（只读） | 不直接修改用户数据 |
| 账号冻结/解冻走 API | `POST /users/{id}/suspend` |
| 风控决策可被人工覆盖 | 保留 audit trail |

---

## 七、与数据分析系统的集成

### 模式：只读数据消费

```
用户体系（生产库）──→ 只读副本 / CDC ──→ 数据仓库 ──→ BI/分析
                                        │
                              敏感字段已脱敏或排除：
                              - password_hash (排除)
                              - totp_secret (排除)
                              - recovery_codes (排除)
```

### 典型分析场景

| 分析场景 | 使用的用户字段 | 注意事项 |
|---------|--------------|---------|
| 用户增长曲线 | `users.created_at` | 按日/周/月聚合 |
| 活跃度分析 | `login_history.created_at`, `sessions.last_active_at` | DAU/WAU/MAU |
| 转化漏斗 | `users.created_at`, `subscriptions.plan_id` | 免费→付费转化率 |
| 留存分析 | 首次登录 vs 后续登录 | Cohort 分析 |
| 团队分析 | `teams`, `team_members` | 团队规模分布、活跃团队数 |

### 边界约定

| 约束 | 说明 |
|------|------|
| 分析系统只读 | 不允许写回用户表 |
| 敏感字段不入仓 | 密码/2FA/Token 相关字段必须排除 |
| 数据脱敏 | 邮箱可保留但建议哈希化处理 |
| 不要用生产库直接跑分析 | 走只读副本或 CDC 同步 |

---

## 八、集成检查清单

设计用户体系与外部系统的关联时，逐项确认：

### 权限系统
- [ ] 权限检查不依赖前端——在 API 层完成
- [ ] 角色变更时主动清除权限缓存
- [ ] 套餐 Feature Flag 与角色权限分离

### 内容系统
- [ ] 核心实体有 `owner_id` + `team_id` 双关联
- [ ] 查询默认带 `team_id` 过滤（多租户隔离）
- [ ] 用户删除时有明确的内容归属处理策略

### 计费系统
- [ ] 配额检查在业务操作前（pre-flight check）
- [ ] 计费系统不直接修改用户数据
- [ ] 套餐变更事件被用户体系正确消费

### 通知系统
- [ ] 通知偏好通过 JSONB 灵活扩展
- [ ] 免打扰时段被正确解析
- [ ] 通知系统不修改用户数据

### 风控系统
- [ ] 登录行为数据可被风控消费
- [ ] 账号管控动作通过 API 而非直接 DB 操作
- [ ] 风控决策可被审计和覆盖

### 分析系统
- [ ] 敏感字段不入分析仓库
- [ ] 分析走只读副本而非生产主库
- [ ] 数据保留窗口符合法规要求