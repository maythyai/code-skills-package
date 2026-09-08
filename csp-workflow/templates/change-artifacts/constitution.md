# Project Constitution

> **项目宪法**：不可违背的项目级原则。所有 spec / design / task / 代码生成**必须继承**，
> 不得在单个 spec 中重复声明这些基线约束——它们是 AI 的「潜意识」。
>
> 初始化时机：00 知识中枢阶段，与 PMS/CMS/TMS baseline 同步建立，落到
> `.csp/CONSTITUTION.md`（git 跟踪）。版本演进走 SemVer；任何条款变更需在
> `## Amendment Log` 记录原因 + 日期，并触发下游 spec 一致性复核。

## Immutable Principles

### 1. API Design
- 所有 API 遵循 RESTful 规范，版本化路径（`/api/v1/...`）
- 错误响应统一使用 RFC 7807 Problem Details 格式
- 所有 API 必须有 OpenAPI 3.0 文档（与 `.csp/specs/API-OVERVIEW.md` 同源）

### 2. Security
- 所有用户输入必须经过校验和清洗
- 敏感数据（密码、Token、PII）禁止出现在日志、错误信息、URL 参数中
- 数据库查询必须使用参数化查询，禁止字符串拼接
- 禁止引入未经安全审计的第三方依赖

### 3. Code Quality
- 单元测试覆盖率不低于 80%（与 TMS 追溯矩阵挂钩）
- 所有公共方法必须有文档注释
- 一个任务 = 一个原子提交（可审查、可回滚）
- 禁止 `__pycache__/`、`*.pyc`、`.DS_Store` 等构建产物入库

### 4. Infrastructure
- 所有服务必须支持优雅关闭（Graceful Shutdown）
- 配置项通过环境变量注入，禁止硬编码本机路径/端口/凭证
- 日志格式统一使用结构化 JSON
- 无内部域名硬编码（内部域名如 `*.corp.example` 等用 `{VAR_API_BASE}` + 环境变量参数化）

## How Specs Inherit This

- **spec.md**：约束条款只写「本 Feature 的外部限制」（如「必须兼容现有 OAuth2.0 流程」），
  不重复宪法已声明的基线（如「参数化查询」）。
- **design.md**：技术选型若与宪法冲突，必须在 `## Decisions` 显式记录「宪法例外」+
  理由 + 豁免范围；无记录的冲突即违规。
- **tasks.md**：每个 task 隐式继承宪法，无需逐条复制；验收时由 verify 阶段交叉核对。
- **代码生成**：生成代码须符合宪法条款；reviewer 在 06 审查时把宪法作为兜底检查表。

## Amendment Log

| Date | Version | Change | Reason |
|------|---------|--------|--------|
| YYYY-MM-DD | 0.1.0 | Initial constitution | Project bootstrap (00) |

<!-- 模板说明：本文件是项目级「宪法」，不是单 feature 产物。
     条款应少而稳——只放「全员适用、长期不变」的基线。
     频繁变更的约束属于 PMS 模块边界或 spec Constraints，不进宪法。 -->
