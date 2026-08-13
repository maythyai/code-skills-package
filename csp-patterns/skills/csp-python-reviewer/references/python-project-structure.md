# Python Enterprise Project Structure — 项目结构规范与评估

> 本文件是 `csp-python-reviewer` 的企业级项目结构参考。用于评估 Python 项目的工程完备性、代码组织合理性，以及生产就绪度。

---

## 一、标准项目结构（Production Agentic Template）

### 1.1 推荐目录布局（src-layout）

```
project-name/
├── src/
│   └── package_name/
│       ├── __init__.py          # 版本 + 公共 API 导出
│       ├── py.typed             # PEP 561 类型标记
│       ├── domain/              # 领域模型（纯业务逻辑，无外部依赖）
│       │   ├── __init__.py
│       │   ├── models.py        # 实体、值对象
│       │   ├── events.py        # 领域事件
│       │   ├── errors.py        # 业务异常层次
│       │   └── protocols.py     # 接口定义（Protocol/ABC）
│       ├── application/         # 应用服务层（编排 domain + infra）
│       │   ├── __init__.py
│       │   ├── services.py      # 用例实现
│       │   ├── commands.py      # 命令对象（CQRS 写操作）
│       │   └── queries.py       # 查询对象（CQRS 读操作）
│       ├── infrastructure/      # 外部依赖适配（DB、HTTP、消息队列）
│       │   ├── __init__.py
│       │   ├── database/
│       │   │   ├── __init__.py
│       │   │   ├── repository.py
│       │   │   └── migrations/
│       │   ├── http/
│       │   │   └── client.py
│       │   └── messaging/
│       │       └── publisher.py
│       ├── api/                 # 接入层（REST/gRPC/CLI）
│       │   ├── __init__.py
│       │   ├── routes.py
│       │   ├── schemas.py       # 请求/响应 DTO
│       │   ├── middleware.py
│       │   └── dependencies.py  # 依赖注入配置
│       └── config/              # 配置管理
│           ├── __init__.py
│           └── settings.py      # pydantic-settings
├── tests/
│   ├── conftest.py              # 全局 fixture
│   ├── unit/                    # 纯逻辑测试（无 IO）
│   │   ├── test_models.py
│   │   └── test_services.py
│   ├── integration/             # 真实依赖测试
│   │   ├── test_repository.py
│   │   └── test_api.py
│   └── e2e/                     # 端到端测试
│       └── test_workflows.py
├── scripts/                     # 运维/部署脚本
│   ├── migrate.py
│   └── seed.py
├── docs/                        # 项目文档
│   ├── architecture.md
│   └── api.md
├── .github/
│   └── workflows/
│       ├── ci.yml               # CI 流水线
│       └── release.yml          # 发布流水线
├── pyproject.toml               # 项目元数据 + 工具配置
├── uv.lock / poetry.lock        # 依赖锁文件
├── Dockerfile                   # 容器化
├── docker-compose.yml           # 本地开发环境
├── Makefile                     # 常用命令快捷方式
├── README.md                    # 项目说明
├── CHANGELOG.md                 # 变更日志
└── .pre-commit-config.yaml      # Git hooks
```

### 1.2 分层依赖规则

```
api → application → domain ← infrastructure
         ↓                       ↑
    infrastructure ──────────────┘
```

**关键约束**：
- `domain/` 不依赖任何外部包（纯 Python + typing）
- `application/` 仅依赖 `domain/` 的 Protocol，不直接依赖 `infrastructure/`
- `infrastructure/` 实现 `domain/` 定义的 Protocol
- `api/` 通过依赖注入组装各层

---

## 二、项目完备性评估矩阵

### 2.1 基础设施维度

| 检查项 | A（优秀） | B（合格） | C（及格） | D（不合格） |
|--------|-----------|-----------|-----------|-------------|
| **Python 版本** | pyproject 声明 + CI 矩阵验证 | pyproject 声明 | 仅 README 提及 | 未声明 |
| **包管理** | uv/poetry + lock 文件 + CI 还原验证 | lock 文件存在 | requirements.txt | 无锁定 |
| **虚拟环境** | 自动创建脚本 + .python-version | Makefile/README 说明 | 仅 README | 未提及 |
| **入口点** | pyproject `[project.scripts]` | `__main__.py` | `if __name__` 散落 | 不明确 |

### 2.2 代码质量维度

| 检查项 | A | B | C | D |
|--------|---|---|---|---|
| **Linting** | ruff (严格 select) + CI 阻断 | ruff 基础 + CI | 本地但无 CI | 无 |
| **格式化** | ruff format / black + pre-commit | 有配置但手动 | 仅 README 提及 | 无 |
| **类型检查** | pyright strict + CI 阻断 | basic mode + CI | 本地有但不强制 | 无 |
| **Import 排序** | isort/ruff I + pre-commit | 有配置 | 无 | 无 |
| **Pre-commit** | 完整 hooks (lint+type+format+security) | 基础 hooks | 仅 format | 无 |

### 2.3 测试维度

| 检查项 | A | B | C | D |
|--------|---|---|---|---|
| **覆盖率** | ≥80% branch + CI fail-under | ≥70% line | 有测试但 <50% | 无测试/仅占位 |
| **测试分层** | unit + integration + e2e 明确分离 | unit + integration | 混杂 | 无分层 |
| **Fixture 设计** | conftest 分层 + factory pattern | conftest 有组织 | 散乱 | 硬编码 |
| **CI 执行** | 矩阵(多 Python 版本) + 并行 | 单版本 CI | 本地手动 | 无 |
| **测试方法多样性** | unit + property + mutation + fuzz | unit + property | 仅 unit | happy-path only |

### 2.4 安全维度

| 检查项 | A | B | C | D |
|--------|---|---|---|---|
| **依赖审计** | pip-audit/safety CI + Dependabot | CI 有扫描 | 手动检查 | 从不审计 |
| **代码扫描** | bandit + semgrep CI 阻断 | bandit CI | 本地偶尔 | 无 |
| **密钥管理** | secrets manager + .env.example | 环境变量 + gitignore .env | .env 模板 | 硬编码 |
| **输入验证** | Pydantic 全量 + 边界层强制 | 关键接口有验证 | 部分有 | 无 |

### 2.5 文档维度

| 检查项 | A | B | C | D |
|--------|---|---|---|---|
| **README** | quickstart 可照走 + 架构图 | 安装+使用说明 | 仅项目描述 | 无/过期 |
| **API 文档** | OpenAPI 自动生成 + 示例 | 手写 API doc | docstring 覆盖 | 无 |
| **CHANGELOG** | 自动生成(conventional commits) | 手动维护 | 有但不更新 | 无 |
| **Architecture doc** | ADR + 架构图 + 决策记录 | 架构概述 | 零散注释 | 无 |

### 2.6 部署与运维维度

| 检查项 | A | B | C | D |
|--------|---|---|---|---|
| **容器化** | 多阶段 Dockerfile + compose | Dockerfile 存在 | 仅文档说明 | 无 |
| **Health check** | /health + /ready 分离 | /health 存在 | 进程存活检查 | 无 |
| **配置管理** | pydantic-settings + 环境分离 | 环境变量 | 配置文件 | 硬编码 |
| **日志** | 结构化(JSON) + 级别配置 + rotation | logging 模块有配置 | print 混合 logging | 仅 print |
| **监控** | metrics + tracing (OTel) | Prometheus metrics | 日志聚合 | 无 |
| **优雅退出** | signal handler + 连接排空 | 有 signal 处理 | 无 | 直接 kill |

---

## 三、Agentic Python 项目特化结构

针对 AI Agent / LLM 应用的额外结构要求：

```
src/package_name/
├── agents/                  # Agent 定义
│   ├── __init__.py
│   ├── base.py             # Agent Protocol/ABC
│   ├── orchestrator.py     # 多 Agent 编排
│   └── tools/              # Agent 可用工具
│       ├── __init__.py
│       └── search.py
├── prompts/                 # Prompt 模板管理
│   ├── __init__.py
│   ├── templates/           # Jinja2/字符串模板
│   └── registry.py         # Prompt 版本注册
├── memory/                  # 记忆/状态管理
│   ├── __init__.py
│   ├── short_term.py
│   └── vector_store.py
├── evaluation/              # 评估框架
│   ├── __init__.py
│   ├── metrics.py
│   └── datasets/
└── guardrails/              # 安全护栏
    ├── __init__.py
    ├── input_filter.py
    └── output_validator.py
```

### Agentic 项目额外评估点

| 维度 | 评估点 |
|------|--------|
| **Prompt 管理** | 模板是否版本化？是否有 A/B 测试机制？ |
| **Tool 安全** | 工具调用是否有权限控制？沙箱隔离？ |
| **评估体系** | 有无自动评估 pipeline？指标定义是否明确？ |
| **成本控制** | Token 用量监控？API 调用限流？fallback 策略？ |
| **可观测性** | LLM 调用是否有 tracing（如 LangSmith/Phoenix）？ |
| **幂等性** | Agent 执行是否幂等？重试是否安全？ |

---

## 四、常见反模式

### 4.1 结构反模式

| 反模式 | 问题 | 修复 |
|--------|------|------|
| **Flat layout**（所有 .py 在根目录） | 无法 pip install、namespace 冲突 | 迁移到 src-layout |
| **God module**（单文件 >1000 行） | 难以理解、合并冲突频繁 | 按职责拆分模块 |
| **循环导入** | 运行时 ImportError | 提取共享接口到独立模块 |
| **测试与代码混排** | 发布包包含测试 | tests/ 独立顶层目录 |
| **配置散落** | 多处硬编码、不一致 | 统一 config/ + pydantic-settings |
| **utils/helpers 抽屉** | 无边界的杂物抽屉 | 按领域分发到对应模块 |

### 4.2 依赖反模式

| 反模式 | 问题 | 修复 |
|--------|------|------|
| **无 lock 文件** | 不可复现构建 | 添加 uv.lock/poetry.lock |
| **无版本约束** | 依赖升级可能破坏 | 明确版本范围 `>=X,<Y` |
| **dev 依赖混入 prod** | 发布包体积膨胀 | 分组：`[project.optional-dependencies]` |
| **requirements.txt 手动维护** | 容易漏/过期 | 工具生成（`uv pip compile`） |

---

## 五、项目初始化检查清单

新建 Python 项目时的 Day-1 清单：

```
□ pyproject.toml (name, version, requires-python, dependencies)
□ src-layout 目录结构
□ py.typed marker
□ .gitignore (Python + IDE + .env)
□ .pre-commit-config.yaml (ruff + pyright + ruff-format)
□ tests/ + conftest.py + pytest 配置
□ Makefile (lint, test, format, build 命令)
□ README.md (安装 + quickstart + 架构概述)
□ CHANGELOG.md
□ CI workflow (lint → type-check → test → build)
□ Dockerfile (如需容器化)
□ .env.example (环境变量模板)
□ docs/ (至少 architecture.md)
```

---

## 六、评估输出模板

```markdown
## Python 项目结构评估报告

**项目**: {name}
**评估日期**: {date}
**Python 版本**: {version}
**技术栈**: {frameworks}

### 总体评级

| 维度 | 评级 | 关键发现 |
|------|------|----------|
| 基础设施 | {A/B/C/D} | {一句话} |
| 代码质量 | {A/B/C/D} | {一句话} |
| 测试 | {A/B/C/D} | {一句话} |
| 安全 | {A/B/C/D} | {一句话} |
| 文档 | {A/B/C/D} | {一句话} |
| 部署运维 | {A/B/C/D} | {一句话} |

### 结构问题
1. {问题} — {位置} — {修复建议}

### 改进路线图
- P0 (本周): {紧急修复}
- P1 (本月): {重要改进}
- P2 (本季): {体系完善}
```
