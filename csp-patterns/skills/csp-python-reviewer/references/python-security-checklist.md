# Python Security Review Checklist — 安全审查深度清单

> 本文件是 `csp-python-reviewer` 的安全审查参考。覆盖 OWASP Top 10 在 Python 上下文中的具体表现。

---

## 一、注入攻击

### 1.1 SQL 注入

```python
# ❌ CRITICAL — f-string 拼接 SQL
query = f"SELECT * FROM users WHERE id = '{user_id}'"
cursor.execute(query)

# ✅ 参数化查询
cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))

# ✅ ORM（SQLAlchemy）
user = session.query(User).filter(User.id == user_id).first()
```

**检查点**：
- grep `f".*SELECT|INSERT|UPDATE|DELETE.*{` 找出所有 f-string SQL
- 检查 `cursor.execute(` 调用是否使用参数占位
- ORM 的 `.filter()` 中是否有 `text()` + 拼接

### 1.2 命令注入

```python
# ❌ CRITICAL — shell=True + 用户输入
import subprocess
subprocess.run(f"grep {user_input} /var/log/app.log", shell=True)

# ✅ 列表参数（不经过 shell 解析）
subprocess.run(["grep", user_input, "/var/log/app.log"], shell=False)

# ✅ 需要 shell 特性时使用 shlex
import shlex
safe_input = shlex.quote(user_input)
```

**检查点**：
- `subprocess.*shell=True` 且参数含变量
- `os.system()` / `os.popen()` 使用
- 任何 `eval()` / `exec()` 接收外部输入

### 1.3 路径遍历

```python
# ❌ CRITICAL — 用户控制文件路径
file_path = f"/uploads/{filename}"
with open(file_path) as f: ...

# ✅ 路径验证
from pathlib import Path

base_dir = Path("/uploads").resolve()
target = (base_dir / filename).resolve()
if not target.is_relative_to(base_dir):
    raise ValueError("Path traversal detected")
```

**检查点**：
- 用户输入直接拼接文件路径
- 未调用 `.resolve()` 验证相对路径
- 未检查 `..` 组件

### 1.4 模板注入（SSTI）

```python
# ❌ Jinja2 无沙箱
from jinja2 import Template
Template(user_input).render()

# ✅ 使用沙箱环境
from jinja2.sandbox import SandboxedEnvironment
env = SandboxedEnvironment()
template = env.from_string(user_template)
```

---

## 二、认证与授权

### 2.1 密码处理

```python
# ❌ 不安全哈希
import hashlib
password_hash = hashlib.md5(password.encode()).hexdigest()

# ✅ bcrypt / argon2
import bcrypt
password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
```

### 2.2 Token 安全

```python
# ❌ 可预测 token
import random
token = str(random.randint(0, 999999))

# ✅ 密码学安全随机
import secrets
token = secrets.token_urlsafe(32)
```

### 2.3 权限检查

**检查点**：
- 每个 API 端点是否有 auth 装饰器/中间件
- 是否存在仅检查前端的权限（后端未验证）
- RBAC 是否可被 header 伪造绕过
- JWT 验证是否检查 `exp`/`iss`/`aud`

---

## 三、不安全反序列化

### 3.1 pickle

```python
# ❌ CRITICAL — 反序列化不可信数据
import pickle
data = pickle.loads(untrusted_bytes)  # 可执行任意代码！

# ✅ 使用安全格式
import json
data = json.loads(untrusted_string)
```

### 3.2 YAML

```python
# ❌ unsafe load
import yaml
data = yaml.load(content)  # 默认 Loader 不安全

# ✅ safe load
data = yaml.safe_load(content)
```

### 3.3 其他

- `marshal.loads()` — 不应用于不可信数据
- `shelve` — 底层使用 pickle
- `dill` — 同 pickle 风险

---

## 四、密钥与凭证管理

### 4.1 检查点

```bash
# 扫描硬编码密钥
grep -rn "password\s*=" --include="*.py" .
grep -rn "secret\s*=" --include="*.py" .
grep -rn "api_key\s*=" --include="*.py" .
grep -rn "token\s*=" --include="*.py" .

# 检查 .env 是否被 gitignore
grep "\.env" .gitignore
```

### 4.2 正确模式

```python
# ✅ 环境变量 + pydantic-settings
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    api_key: str
    secret_key: str
    
    model_config = ConfigDict(env_file=".env")

# ✅ 失败快速（启动时验证）
settings = Settings()  # 缺少环境变量立即报错
```

### 4.3 日志泄漏检查

- 日志中不应出现：密码、token、API key、信用卡号
- 错误响应中不应暴露：stack trace、内部路径、数据库信息
- HTTP 响应头中不应有：服务器版本、框架版本

---

## 五、依赖安全

### 5.1 审计流程

```bash
# pip-audit（推荐）
pip-audit --fix --dry-run

# safety（备选）
safety check

# 检查 GPL 污染
pip-licenses --allow-only="MIT;BSD;Apache Software License;ISC;PSF"
```

### 5.2 评估标准

| 级别 | 标准 |
|------|------|
| P0 | 已知 RCE/认证绕过 CVE，且版本在受影响范围 |
| P1 | 已知 CVE（非 RCE），有公开 exploit |
| P2 | 已知 CVE，无公开 exploit 或低影响 |
| P3 | 依赖过期（>2 年无更新）但无已知漏洞 |

---

## 六、Web 框架特化

### 6.1 FastAPI

| 检查项 | 风险 | 修复 |
|--------|------|------|
| CORS `allow_origins=["*"]` | 跨域攻击 | 明确列出允许域名 |
| 未使用 `Depends()` 做权限检查 | 未授权访问 | 路由级依赖注入 |
| `Response(content=user_data)` 无过滤 | 数据泄漏 | 用 `response_model` 过滤 |
| async 路由中调用阻塞 IO | DoS（线程池耗尽） | `asyncio.to_thread()` |

### 6.2 Django

| 检查项 | 风险 | 修复 |
|--------|------|------|
| `CSRF_COOKIE_SECURE = False` | CSRF token 泄漏 | 设为 True |
| 未使用 `@login_required` | 未授权访问 | 装饰器/中间件 |
| `DEBUG = True` in production | 信息泄漏 | 环境变量控制 |
| `raw()` / `extra()` SQL 注入 | SQL 注入 | 参数化 |

### 6.3 Flask

| 检查项 | 风险 | 修复 |
|--------|------|------|
| `app.secret_key = "hardcoded"` | 会话伪造 | 环境变量 |
| `send_file(user_path)` | 路径遍历 | `send_from_directory()` + 验证 |
| Jinja2 `|safe` 过度使用 | XSS | 仅对信任内容使用 |

---

## 七、并发安全

### 7.1 竞态条件

```python
# ❌ 检查-然后-操作（TOCTOU）
if not path.exists():
    path.write_text(content)  # 竞态窗口!

# ✅ 原子操作
import tempfile
with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as f:
    f.write(content.encode())
    temp_path = Path(f.name)
temp_path.rename(path)  # 原子替换
```

### 7.2 共享状态

```python
# ❌ 无锁共享修改
counter = 0
def increment():
    global counter
    counter += 1  # 非原子操作

# ✅ 线程锁
import threading
lock = threading.Lock()
def increment():
    global counter
    with lock:
        counter += 1
```

---

## 八、安全扫描命令集

```bash
# 全套安全检查
bandit -r src/ -f json -o bandit-report.json
pip-audit --format json > audit-report.json
safety check --json > safety-report.json

# 密钥泄漏扫描
trufflehog filesystem . --json > secrets-report.json
# 或
gitleaks detect --source . --report-format json --report-path gitleaks.json

# 依赖许可证检查
pip-licenses --format=json > licenses.json
```

---

## 九、安全审查输出模板

```
## Security Finding

**Severity**: CRITICAL / HIGH / MEDIUM / LOW
**Category**: Injection / Auth / Crypto / Secrets / Dependency / SSRF
**CWE**: CWE-xxx

**Location**: `src/api/routes.py:42`

**Issue**: 
{具体描述，含代码片段}

**Impact**: 
{攻击者可以做什么，影响范围}

**Fix**: 
{具体修复方案，含代码示例}

**Verification**: 
{如何验证修复有效}
```
