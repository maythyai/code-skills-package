# Python Coding Standards — 详细规范

> 本文件是 `csp-python-reviewer` 的完整编码规范参考。SKILL.md 中的核心规则表为摘要，本文件提供每条规则的详细说明、代码示例和常见违规模式。

---

## 一、类型标注规范

### 1.1 公共 API 必须完整标注

```python
# ✅ 正确
def create_user(name: str, email: str, age: int | None = None) -> User:
    ...

# ❌ 错误 — 缺少返回值标注
def create_user(name: str, email: str, age=None):
    ...
```

### 1.2 使用现代类型语法（Python 3.10+）

```python
# ✅ 现代语法
def process(data: str | bytes | None) -> list[dict[str, Any]]:
    ...

# ❌ 旧语法（仍可接受但不推荐）
from typing import Optional, Union, List, Dict
def process(data: Union[str, bytes, None]) -> List[Dict[str, Any]]:
    ...
```

### 1.3 Protocol 优先于 ABC

```python
from typing import Protocol, runtime_checkable

@runtime_checkable
class Serializable(Protocol):
    def to_dict(self) -> dict[str, Any]: ...
    
    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Self: ...
```

### 1.4 TypedDict 用于结构化字典

```python
from typing import TypedDict, NotRequired

class UserConfig(TypedDict):
    name: str
    email: str
    timeout: NotRequired[int]
```

### 1.5 泛型与 TypeVar

```python
from typing import TypeVar, Generic

T = TypeVar("T")

class Result(Generic[T]):
    def __init__(self, value: T | None = None, error: str | None = None) -> None:
        self.value = value
        self.error = error
```

---

## 二、命名与风格

### 2.1 命名约定

| 元素 | 风格 | 示例 |
|------|------|------|
| 模块 | snake_case | `user_service.py` |
| 类 | PascalCase | `UserService` |
| 函数/方法 | snake_case | `get_user_by_id` |
| 常量 | UPPER_SNAKE | `MAX_RETRY_COUNT` |
| 私有 | 前导下划线 | `_internal_cache` |
| 类型变量 | 单大写字母或描述性 | `T`, `ReturnT` |
| Protocol | 形容词或名词 | `Serializable`, `Repository` |

### 2.2 Import 顺序（isort 标准）

```python
# 1. 标准库
import os
import sys
from pathlib import Path

# 2. 第三方库
import httpx
from pydantic import BaseModel

# 3. 本地模块
from .models import User
from .services import UserService
```

### 2.3 行长度

- 代码行：88 字符（black 默认）
- 文档字符串/注释：79 字符（PEP 8）
- URL：不限

---

## 三、错误处理

### 3.1 异常层次设计

```python
class AppError(Exception):
    """应用根异常"""
    def __init__(self, message: str, code: str | None = None) -> None:
        self.code = code
        super().__init__(message)

class DomainError(AppError):
    """业务逻辑错误"""
    pass

class NotFoundError(DomainError):
    """资源未找到"""
    def __init__(self, resource: str, identifier: str) -> None:
        super().__init__(f"{resource} '{identifier}' not found", code="NOT_FOUND")

class ValidationError(DomainError):
    """输入验证失败"""
    def __init__(self, field: str, reason: str) -> None:
        self.field = field
        super().__init__(f"Validation failed for '{field}': {reason}", code="VALIDATION")

class InfrastructureError(AppError):
    """基础设施错误（DB、网络、外部服务）"""
    pass
```

### 3.2 错误处理模式

```python
# ✅ 具体异常 + 上下文
try:
    user = await repo.get(user_id)
except DatabaseError as e:
    raise InfrastructureError(f"Failed to fetch user {user_id}") from e

# ❌ 裸 except
try:
    user = await repo.get(user_id)
except:
    pass
    
# ❌ 过宽 except
try:
    user = await repo.get(user_id)
except Exception:
    return None  # 吞掉了所有错误
```

### 3.3 Result 模式（替代异常的场景）

```python
@dataclass(frozen=True)
class Result(Generic[T]):
    value: T | None = None
    error: str | None = None
    
    @property
    def is_ok(self) -> bool:
        return self.error is None
    
    @classmethod
    def ok(cls, value: T) -> Result[T]:
        return cls(value=value)
    
    @classmethod
    def fail(cls, error: str) -> Result[T]:
        return cls(error=error)
```

---

## 四、异步编程规范

### 4.1 TaskGroup 替代 gather（Python 3.11+）

```python
# ✅ TaskGroup — 错误隔离，自动取消
async with asyncio.TaskGroup() as tg:
    task1 = tg.create_task(fetch_user(uid))
    task2 = tg.create_task(fetch_orders(uid))
results = (task1.result(), task2.result())

# ❌ gather — 异常可能丢失
results = await asyncio.gather(fetch_user(uid), fetch_orders(uid))
```

### 4.2 超时必须显式设置

```python
async with asyncio.timeout(5.0):
    response = await client.get(url)
```

### 4.3 避免阻塞调用

```python
# ❌ 阻塞事件循环
def sync_io():
    time.sleep(1)  # 阻塞!
    
# ✅ 异步等待
async def async_io():
    await asyncio.sleep(1)

# ✅ 线程池包装不可避免的阻塞调用
result = await asyncio.to_thread(blocking_function, arg1, arg2)
```

### 4.4 正确处理取消

```python
async def long_running_task() -> None:
    try:
        while True:
            await process_batch()
            await asyncio.sleep(1)
    except asyncio.CancelledError:
        await cleanup()  # 释放资源
        raise  # 必须重新 raise
```

---

## 五、数据结构选择

### 5.1 Dataclass vs Pydantic vs NamedTuple

| 场景 | 选择 | 原因 |
|------|------|------|
| 内部数据传输 | `@dataclass` | 轻量、标准库 |
| 外部输入验证 | `pydantic.BaseModel` | 自动验证、序列化 |
| 不可变值对象 | `@dataclass(frozen=True)` 或 `NamedTuple` | 强制不可变 |
| 配置对象 | `pydantic-settings` | 环境变量绑定 |

### 5.2 集合选择

| 操作 | 推荐 | 避免 |
|------|------|------|
| 去重 | `set` / `frozenset` | 手动循环去重 |
| 有序去重 | `dict.fromkeys(items)` | 自建逻辑 |
| 计数 | `collections.Counter` | 手动计数 |
| 默认值字典 | `collections.defaultdict` | `d.get(k, []).append(v)` |
| FIFO 队列 | `collections.deque` | `list.pop(0)`（O(n)） |
| 优先队列 | `heapq` | 排序后取首元素 |

---

## 六、性能模式

### 6.1 生成器替代列表（大数据集）

```python
# ✅ 惰性求值
def read_records(path: Path) -> Iterator[Record]:
    with path.open() as f:
        for line in f:
            yield Record.from_line(line)

# ❌ 全量加载
def read_records(path: Path) -> list[Record]:
    with path.open() as f:
        return [Record.from_line(line) for line in f.readlines()]
```

### 6.2 __slots__ 减少内存

```python
class Point:
    __slots__ = ("x", "y")
    
    def __init__(self, x: float, y: float) -> None:
        self.x = x
        self.y = y
```

### 6.3 缓存

```python
from functools import lru_cache, cache

@lru_cache(maxsize=256)
def expensive_computation(n: int) -> int:
    ...

# Python 3.9+ 无限缓存
@cache
def parse_config(path: str) -> Config:
    ...
```

### 6.4 批量操作

```python
# ❌ N+1
for user_id in user_ids:
    user = await repo.get(user_id)
    
# ✅ 批量
users = await repo.get_many(user_ids)
```

---

## 七、日志规范

### 7.1 结构化日志

```python
import logging
import structlog

logger = structlog.get_logger()

# ✅ 结构化
logger.info("user.created", user_id=user.id, email=user.email)

# ❌ 拼接字符串
logging.info(f"Created user {user.id} with email {user.email}")
```

### 7.2 日志级别使用

| 级别 | 使用场景 |
|------|----------|
| ERROR | 需要人工干预的失败 |
| WARNING | 异常但可自动恢复的情况 |
| INFO | 业务关键事件（用户操作、服务启停） |
| DEBUG | 调试信息（仅开发环境） |

### 7.3 敏感信息过滤

```python
# ❌ 泄漏密码
logger.info("Login attempt", password=password)

# ✅ 脱敏
logger.info("Login attempt", email=email, password="[REDACTED]")
```

---

## 八、文档规范

### 8.1 Docstring 风格（Google Style）

```python
def transfer_funds(
    from_account: str,
    to_account: str,
    amount: Decimal,
) -> TransferResult:
    """Transfer funds between accounts.

    Args:
        from_account: Source account identifier.
        to_account: Destination account identifier.
        amount: Transfer amount (must be positive).

    Returns:
        TransferResult with transaction ID on success.

    Raises:
        InsufficientFundsError: If source account balance is insufficient.
        AccountNotFoundError: If either account does not exist.
    """
```

### 8.2 何时需要 Docstring

- 所有公共模块/类/函数：**必须**
- 私有方法（逻辑复杂时）：**推荐**
- 显而易见的简单方法：**不需要**

---

## 九、依赖管理

### 9.1 推荐工具链

| 工具 | 用途 |
|------|------|
| `uv` | 包管理器 + 虚拟环境（首选） |
| `poetry` | 包管理器 + 构建系统（成熟） |
| `pip-tools` | 轻量依赖锁定 |
| `ruff` | Linter + Formatter（替代 flake8+isort+black） |
| `pyright` | 类型检查（首选） |
| `pytest` | 测试框架 |
| `pre-commit` | Git hooks |

### 9.2 pyproject.toml 规范

```toml
[project]
name = "mypackage"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "httpx>=0.25",
    "pydantic>=2.0",
]

[project.optional-dependencies]
dev = ["pytest>=8.0", "ruff>=0.5", "pyright>=1.1"]

[tool.ruff]
target-version = "py311"
line-length = 88
select = ["E", "F", "I", "N", "UP", "B", "A", "C4", "SIM", "TCH"]

[tool.pyright]
pythonVersion = "3.11"
typeCheckingMode = "strict"

[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = "--cov=src --cov-branch --cov-fail-under=80"
```
