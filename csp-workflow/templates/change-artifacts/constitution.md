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

## Pre-Implementation Phase Gates

> 以下门控在计划阶段（03/04）执行。违反任一条 → 设计退回修改，不得进入实现。

### Gate 1: Simplicity Gate (Article I)
- [ ] 实现方案使用 ≤ 3 个项目/模块？
- [ ] 无「为未来准备」的预留字段/抽象？
- [ ] 如果使用了框架，是否直接使用其标准模式（非过度封装）？
- 违反记录在 `## Complexity Tracking` 表，需注明替代方案被拒绝的原因

### Gate 2: Anti-Abstraction Gate (Article II)
- [ ] 没有为单一消费者创建的抽象层？
- [ ] 数据模型只用一种表示（无多套 ORM/VO/DTO 映射链）？
- [ ] 接口是消费方定义的，而非实现方定义的？

### Gate 3: Integration-First Gate (Article III)
- [ ] 所有接口契约（API/DB/Message）在代码之前定义？
- [ ] 契约测试文件已在 `contracts/` 目录创建？
- [ ] 前后端接口对齐方式已有明确约定？

### Gate 4: Pre-Implementation Convergence
- [ ] spec 与 plan 已进行 ≥ 1 轮双向细化？
- [ ] 无新增 `[NEEDS CLARIFICATION]` 标记残留？
- [ ] 无「待实现时决定」的开放项？

## Spec Uncertainty Handling

### `[NEEDS CLARIFICATION]` 标记规则

所有规格文档中，**任何不确定的字段、逻辑、边界条件必须显式标记**，不得静默假设：

```markdown
### Requirement FR-007: User Notification Preferences
- Users MUST be able to configure notification channels
- [NEEDS CLARIFICATION: Which channels? Email only, or also push/SMS?]
- [NEEDS CLARIFICATION: Per-category granularity or all-or-nothing?]
```

**标记规范：**
- 格式：`[NEEDS CLARIFICATION: 具体问题（不是模糊描述）]`
- 每个标记在进入实现阶段前必须有明确答案
- 标记转决议：`[CLARIFIED: 答案 + 来源（PRD v2/用户确认/技术约束）]`
- 实现阶段检出残留 NEEDS CLARIFICATION → 阻断，退回澄清

## Complexity Tracking

当实现方案违反以上门控时，在此记录豁免理由：

| Violation | Why Needed | Simpler Alternative Rejected |
|-----------|-----------|------------------------------|
| 使用 4 个项目 | 前端/后端/Worker/Shared 物理隔离不同部署单元 | 三项目会导致 Worker 和后端共享无意义依赖 |
| （无违反时留空） | | |

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
