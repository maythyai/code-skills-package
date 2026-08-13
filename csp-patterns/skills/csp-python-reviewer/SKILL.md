---
name: csp-python-reviewer
description: "Python coding specification and code review specialist. Covers PEP 8, type safety, Pythonic idioms, security, performance, async patterns, and enterprise project structure evaluation. Use for all Python code review, project audits, and coding standard enforcement."
version: 2.0.0
layer: 3
category: patterns
phase: review
domain: language
scope: review
role: reviewer
tools: [Read, Grep, Glob, Bash]
triggers:
  keywords: ["python review", "python code quality", "python coding standard", "pythonic", "PEP 8", "python项目审查"]
  patterns: ["*.py", "*.pyi", "pyproject.toml"]
  intents: ["review Python code", "enforce Python coding standards", "audit Python project structure"]
dependencies:
  skills: [csp-python-patterns, csp-python-testing]
related_skills: [csp-code-review, csp-codebase-audit, csp-graph-review]
anti_rationalizations:
  "类型标注太麻烦": "静态检查能提前发现90%的类型错误，重构时间减半。"
  "这段代码很简单不需要review": "简单代码也有隐患——mutable默认参数、裸except、路径注入在简单代码中更隐蔽。"
  "先跑通再优化": "结构债务在早期修复成本是后期的1/10。项目结构第一天就要对。"
  "测试之后补": "没有测试的代码是未经验证的假设，不是实现。"
---

# Python Coding Specification & Review

Python 代码规范与审查技能——覆盖编码风格、类型安全、安全加固、性能模式、异步最佳实践和企业级项目结构评估。

## When to Use

- 审查 Python PR/diff（单文件或多文件）
- 对 Python 项目做编码规范合规检查
- 评估 Python 项目的工程完备性和代码组织结构
- 新项目 Python 技术栈选型和结构设计
- Python 代码的安全审查

## When NOT to Use

- 纯算法/数据科学 notebook 评审（用 `csp-data-science-reviewer`）
- 已有明确 bug 需要调试（用 `csp-systematic-debugging`）
- 仅跑 lint/type-check 命令（直接执行即可）

---

## 核心规则（Hard Rules）

### 禁止项

| # | 规则 | 原因 |
|---|------|------|
| H1 | **禁止裸 `except`** | 吞掉 SystemExit/KeyboardInterrupt，隐藏 bug |
| H2 | **禁止隐式 Any** | 公共函数必须有完整类型标注（参数+返回值） |
| H3 | **禁止 mutable 默认参数** | `def f(x=[])` → `def f(x=None)` |
| H4 | **禁止 f-string 拼 SQL** | 必须用参数化查询 |
| H5 | **禁止 `eval()`/`exec()` 处理用户输入** | 代码注入 |
| H6 | **禁止 `asyncio.run()` 嵌套** | 在异步上下文中用 `await` |
| H7 | **禁止硬编码密钥/凭证** | 用环境变量或 secrets manager |
| H8 | **禁止 `from module import *`** | 命名空间污染，难以追踪来源 |

### 必须项

| # | 规则 | 说明 |
|---|------|------|
| M1 | **资源用 context manager** | 文件/连接/锁必须 `with` |
| M2 | **异步函数处理 CancelledError** | 不能忽略取消信号 |
| M3 | **自定义异常继承层次** | 业务异常 → DomainError → Exception |
| M4 | **日志代替 print** | 生产代码用 `logging` |
| M5 | **pathlib 代替字符串路径** | 跨平台、安全（防路径遍历） |

---

## 审查维度（Six-Dimension Python Review）

基于 `csp-code-review` 六维框架，叠加 Python 语言特化：

### 1. 正确性（Correctness）
- 类型标注是否完整且正确（pyright/mypy 零报错）
- `None` 处理：`Optional` 标注 + guard clause
- 异步陷阱：GIL 下的阻塞调用、task 泄漏、gather 异常丢失
- 数据类不变量：`frozen=True` 的实体是否被意外修改

### 2. 复用（Reuse）
- 是否重复实现了标准库已有功能（`itertools`/`collections`/`pathlib`）
- 是否有现成 Protocol/ABC 可以复用
- 跨模块重复代码 → 提取到 `shared/` 或 utils

### 3. 简化（Simplification）
- 可用列表推导替代的显式循环
- 可用 `isinstance()` 替代 `type() ==`
- 深层嵌套 → early return / guard clause
- 过度抽象：只有一个实现的 ABC

### 4. 效率（Efficiency）
- N+1 查询（循环中 await db query → batch）
- 字符串拼接循环 → `"".join()`
- 全量加载大集合 → generator/streaming
- 缺少 `__slots__` 的高频实例化类

### 5. 安全（Security）
- SQL 注入 / 命令注入 / 路径遍历
- 不安全反序列化（`pickle.loads`/`yaml.unsafe_load`）
- 弱加密算法（MD5/SHA1 用于安全场景）
- 未验证外部输入直接进入 subprocess

### 6. 可测试性（Testability）
- 依赖是否可注入（构造器注入 > 模块级全局）
- 时间/随机/IO 是否可被 mock
- 测试是否断言行为而非实现细节

---

## 项目结构评估（Enterprise Project Completeness）

审查 Python 项目时，除代码层面外还评估项目工程完备性：

### 结构合规矩阵

| 维度 | 评估点 | 成熟度标准 |
|------|--------|-----------|
| **项目骨架** | src-layout / pyproject.toml / 明确入口 | A: 标准结构 + CLI entry_points |
| **依赖管理** | lock 文件 / 版本约束 / 分组(dev/test/prod) | A: uv.lock 或 poetry.lock + groups |
| **类型系统** | py.typed marker / strict mode / stub 文件 | A: pyright strict 零报错 |
| **测试体系** | 分层(unit/integration/e2e) / fixtures / CI 门禁 | A: ≥80% 覆盖 + CI 强制 |
| **文档** | docstring 覆盖 / README quickstart / CHANGELOG | A: 可 sphinx/mkdocs 生成 |
| **安全** | bandit CI / dependency audit / secrets scanning | A: 全部门禁化 |
| **打包发布** | sdist+wheel / version 同步 / MANIFEST.in | A: CI 自动发布 |
| **代码质量** | ruff + black + isort + pre-commit | A: 零 lint 错误 |

> 详细评估标准和企业项目模板见 `references/python-project-structure.md`

---

## 诊断命令

```bash
# 静态分析全套
ruff check . --select=ALL          # Lint (超集 flake8+pylint)
pyright .                          # 类型检查 (strict)
bandit -r src/                     # 安全扫描
black --check .                    # 格式检查

# 测试与覆盖
pytest --cov=src --cov-branch --cov-report=term-missing
pytest --cov-fail-under=80

# 项目结构检查
python -m build --no-isolation     # 包构建验证
pip-audit                          # 依赖 CVE 扫描
```

---

## 审查输出格式

```
[SEVERITY] Issue title
File: path/to/file.py:42
Issue: Description with evidence
Fix: Specific actionable fix
Rule: H1/M2/etc. (reference to which rule violated)
```

### 判定标准

| 判定 | 条件 |
|------|------|
| **Approve** | 无 CRITICAL/HIGH；仅 MEDIUM/NIT |
| **Request Changes** | 存在 CRITICAL 或 HIGH |
| **Comment** | 仅有建议性意见（suggestion/nit） |

---

## References

| 场景 | 参考文档 |
|------|----------|
| 详细编码规范（完整 checklist） | [`references/python-coding-standards.md`](references/python-coding-standards.md) |
| 企业项目结构模板与评估 | [`references/python-project-structure.md`](references/python-project-structure.md) |
| Python 安全审查深度清单 | [`references/python-security-checklist.md`](references/python-security-checklist.md) |
| Python 设计模式 | skill: `csp-python-patterns` |
| Python 测试最佳实践 | skill: `csp-python-testing` |
| 通用代码审查方法论 | skill: `csp-code-review` |

---

## Verification

- ruff/pyright 零错误
- 所有 Hard Rules (H1-H8) 无违反
- 项目结构合规矩阵各维度 ≥ B 级
- 测试覆盖率 ≥ 80%（含 branch coverage）
