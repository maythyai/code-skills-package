# RBAC 与权限设计参考

> 本文是 `csp-user-system-design` 的深度参考文档，覆盖角色设计、权限矩阵、分层检查、权限缓存等核心主题。

## 一、角色模型设计

### 角色定义的四个要素

```
Role = Name + Permissions + Scope + Constraints
```

- **Name**：唯一标识符，用 `String(50)` 而非 ENUM
- **Permissions**：该角色包含的权限列表
- **Scope**：`global`（平台级）或 `resource`（团队/项目级）
- **Constraints**：可选限制（如 `max_assignments`、`inheritable`）

### 全局角色定义

```yaml
roles:
  global:
    super_admin:
      description: "系统级最高权限，通常仅 1-2 人持有"
      permissions: ["*"]
      constraints:
        max_assignments: 5
        require_2fa: true

    admin:
      description: "平台日常管理"
      permissions:
        - "user:read"
        - "user:suspend"
        - "content:moderate"
        - "system:configure"
      constraints:
        require_2fa: true

    operator:
      description: "默认注册角色，正常使用权限"
      permissions:
        - "profile:manage"
        - "content:create"
        - "content:manage_own"
        - "team:join"
      is_default: true

    viewer:
      description: "只读访客"
      permissions:
        - "content:read"
        - "profile:read"
      constraints:
        cannot_create: true

    billing_admin:
      description: "独立的计费管理角色（职责分离）"
      permissions:
        - "billing:read"
        - "billing:manage"
        - "subscription:manage"
      constraints:
        cannot_access_content: true
```

### 资源级角色定义

```yaml
roles:
  resource:
    owner:
      description: "团队/项目的创建者"
      permissions: ["*"]  # 该资源范围内的全部权限
      constraints:
        undeletable: true      # 不可被删除
        undemotable: true      # 不可被降级
        unique: true            # 每资源仅一位

    admin:
      description: "资源管理者"
      permissions:
        - "member:invite"
        - "member:remove"
        - "member:role_manage"
        - "resource:configure"
        - "content:manage_all"
      constraints:
        cannot_delete_resource: true   # 不能删除团队/项目本身

    editor:
      description: "内容编辑者"
      permissions:
        - "content:create"
        - "content:edit_all"
        - "content:publish"
      constraints:
        cannot_manage_members: true

    viewer:
      description: "只读成员"
      permissions:
        - "content:read"
        - "member:read"
      constraints:
        readonly: true
```

---

## 二、权限矩阵

设计权限矩阵的标准流程：

1. 列出所有 `resource` 类型（content / member / team / billing / analytics）
2. 对每种 resource 定义可能的 `action`（create / read / update / delete / publish / export / manage）
3. 对每个角色标记允许的 action

### 示例权限矩阵

| Action | owner | admin | editor | viewer |
|--------|-------|-------|--------|--------|
| `content:create` | ✅ | ✅ | ✅ | ❌ |
| `content:read` | ✅ | ✅ | ✅ | ✅ |
| `content:edit_own` | ✅ | ✅ | ✅ | ❌ |
| `content:edit_all` | ✅ | ✅ | ✅ | ❌ |
| `content:delete` | ✅ | ✅ | ❌ | ❌ |
| `content:publish` | ✅ | ✅ | ✅ | ❌ |
| `content:approve` | ✅ | ✅ | ❌ | ❌ |
| `member:invite` | ✅ | ✅ | ❌ | ❌ |
| `member:remove` | ✅ | ✅ | ❌ | ❌ |
| `member:role_manage` | ✅ | ❌ | ❌ | ❌ |
| `team:rename` | ✅ | ❌ | ❌ | ❌ |
| `team:delete` | ✅ | ❌ | ❌ | ❌ |
| `team:configure` | ✅ | ✅ | ❌ | ❌ |
| `billing:read` | ✅ | ✅ | ❌ | ❌ |
| `billing:manage` | ✅ | ❌ | ❌ | ❌ |
| `analytics:view` | ✅ | ✅ | ✅ | ❌ |
| `analytics:export` | ✅ | ✅ | ❌ | ❌ |

---

## 三、分层权限检查

### 中间件层（API Gateway / Middleware）

```python
# 全局角色检查装饰器
def require_role(role: str):
    """检查当前用户是否具有指定全局角色"""
    def decorator(func):
        @wraps(func)
        async def wrapper(request, *args, **kwargs):
            user = request.state.user
            if user.global_role != role and user.global_role != 'super_admin':
                raise HTTPException(status_code=403, detail="Insufficient permissions")
            return await func(request, *args, **kwargs)
        return wrapper
    return decorator

# 资源级角色检查
def require_team_role(role: str):
    """检查当前用户在指定团队中的角色"""
    def decorator(func):
        @wraps(func)
        async def wrapper(request, team_id: str, *args, **kwargs):
            membership = await get_membership(request.state.user.id, team_id)
            if not membership or not has_minimum_role(membership.role, role):
                raise HTTPException(status_code=403, detail="Insufficient team permissions")
            return await func(request, team_id, *args, **kwargs)
        return wrapper
    return decorator
```

### 服务层（Business Logic）

```python
class PermissionService:
    """统一的权限检查服务"""

    ROLE_HIERARCHY = {
        'owner': 100,
        'admin': 80,
        'editor': 50,
        'viewer': 10
    }

    @staticmethod
    def has_minimum_role(actual_role: str, required_role: str) -> bool:
        return PermissionService.ROLE_HIERARCHY.get(actual_role, 0) >= \
               PermissionService.ROLE_HIERARCHY.get(required_role, 0)

    @staticmethod
    async def check_feature_access(user_id: str, feature: str) -> bool:
        """检查用户是否有指定功能的使用权限（基于套餐）"""
        plan = await get_user_plan(user_id)
        return feature in plan.features

    @staticmethod
    async def check_quota(user_id: str, quota_type: str) -> bool:
        """检查用户是否超出配额限制"""
        usage = await get_usage(user_id, quota_type)
        limit = await get_quota_limit(user_id, quota_type)
        return usage < limit
```

### 数据层（Row-Level Security / Query Filtering）

```python
# 自动注入 team_id 过滤
class TeamScopedQuery:
    """所有查询自动附加 team_id 过滤条件"""

    def __init__(self, user_id: str, team_id: str):
        self.user_id = user_id
        self.team_id = team_id

    async def list_resources(self, model, **filters):
        return await model.filter(
            team_id=self.team_id,
            **filters
        ).all()

    async def get_resource(self, model, resource_id: str):
        resource = await model.filter(
            id=resource_id,
            team_id=self.team_id
        ).first()
        if not resource:
            raise NotFoundError("Resource not found in this team")
        return resource
```

---

## 四、权限缓存策略

### 缓存设计

```
Key Pattern:  perm:{user_id}:{team_id}  →  {role, permissions[], features[]}
TTL:          5 minutes (变更时主动 invalidate)
Storage:      Redis
```

```python
class PermissionCache:
    PREFIX = "perm"
    TTL = 300  # 5 minutes

    def __init__(self, redis_client):
        self.redis = redis_client

    async def get_permissions(self, user_id: str, team_id: str) -> dict:
        key = f"{self.PREFIX}:{user_id}:{team_id}"
        cached = await self.redis.get(key)
        if cached:
            return json.loads(cached)

        # Cache miss — 从 DB 加载
        perms = await self._load_from_db(user_id, team_id)
        await self.redis.setex(key, self.TTL, json.dumps(perms))
        return perms

    async def invalidate(self, user_id: str, team_id: str = None):
        """角色变更时主动失效缓存"""
        if team_id:
            await self.redis.delete(f"{self.PREFIX}:{user_id}:{team_id}")
        else:
            # 全局角色变更 — 清除该用户所有缓存
            keys = await self.redis.keys(f"{self.PREFIX}:{user_id}:*")
            if keys:
                await self.redis.delete(*keys)
```

---

## 五、角色设计反模式

| 反模式 | 问题 | 正确做法 |
|--------|------|---------|
| 角色用 ENUM | 添加新角色需要 DDL 变更 | `VARCHAR(50)` |
| 把套餐信息混入角色检查 | 角色与套餐是两个独立维度 | 分别检查 `require_role()` 和 `check_feature()` |
| 前端判断权限（如 `v-if="user.role === 'admin'"`） | 可被绕过 | 前端只做条件渲染优化；后端必须做权限检查 |
| 权限名称不统一 | `can_edit` / `edit_permission` / `allow_edit` 混用 | 统一 `resource:action` 命名格式 |
| 硬编码权限到代码中 | 新增权限需改代码、走发布 | 用配置文件/数据库驱动的权限定义 |
| 超级管理员角色滥用 | 排查问题时所有人都用 admin | 严格限制 super_admin 人数，给运维有限的专项权限 |