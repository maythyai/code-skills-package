---
name: csp-workflow-schema
description: >
  Declarative JSON workflow schema engine. Define workflows as JSON with stages,
  conditions, failure strategies, and artifact passing. Use when designing or
  executing structured multi-phase workflows.
layer: 2
category: workflow
---

# CSP Workflow Schema

声明式 JSON 工作流 schema 引擎 — 用 JSON 定义结构化多阶段工作流。

## 核心概念

- **声明式定义**：workflow 以纯 JSON 描述，机器可解析、版本可控
- **Stage 顺序执行**：每个 workflow 由 stages 数组组成，按顺序逐阶段执行
- **条件门控**：每个 stage 可指定 condition，不满足则自动跳过
- **失败策略**：支持 stop / skip / continue / retry 四种失败处理方式
- **Artifact 传递**：stage 产出 artifact 文件，后续 stage 可通过条件或路径引用
- **与 Markdown workflow 互补**：JSON schema 是执行规范，Markdown 是人类可读文档

## JSON Schema 规范

```json
{
  "name": "workflow-name",
  "description": "What this workflow does",
  "stages": [
    {
      "name": "stage-name",
      "description": "What this stage accomplishes",
      "skills": ["skill-name-1", "skill-name-2"],
      "condition": null,
      "on_failure": "stop",
      "timeout": 600,
      "artifacts": [".csp/artifacts/stage-name.md"]
    }
  ],
  "defaults": {
    "on_failure": "stop",
    "timeout": 600
  }
}
```

### 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | ✅ | workflow 标识符，kebab-case |
| `description` | string | ❌ | workflow 描述 |
| `stages` | array | ✅ | 阶段列表，按顺序执行 |
| `defaults` | object | ❌ | 全局默认值，被 stage 级配置覆盖 |

#### Stage 字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | ✅ | 阶段名，kebab-case，在整个 workflow 中唯一 |
| `description` | string | ❌ | 阶段描述 |
| `skills` | array[string] | ✅ | 该阶段加载的 skill 名称列表 |
| `condition` | string\|null | ❌ | 执行条件表达式，`null` = 无条件执行 |
| `on_failure` | string | ❌ | 失败策略，默认取 `defaults.on_failure` 或 `"stop"` |
| `timeout` | number | ❌ | 超时秒数，默认取 `defaults.timeout` 或 `600` |
| `artifacts` | array[string] | ❌ | 该阶段产出的 artifact 文件路径列表 |

## 条件表达式语法

condition 字段支持以下表达式：

| 表达式 | 含义 | 示例 |
|--------|------|------|
| `{stage}.success` | 某阶段执行成功 | `"plan.success"` |
| `{stage}.failed` | 某阶段执行失败 | `"build.failed"` |
| `{stage}.skipped` | 某阶段被跳过 | `"lint.skipped"` |
| `artifact_exists('{path}')` | 文件存在 | `"artifact_exists('.csp/artifacts/plan.md')"` |
| `!{expr}` | 取反 | `"!test.failed"` |
| `{expr1} && {expr2}` | 逻辑与 | `"plan.success && artifact_exists('.csp/artifacts/design.md')"` |
| `{expr1} \|\| {expr2}` | 逻辑或 | `"lint.success \|\| lint.skipped"` |

**求值规则：**
- 未执行的 stage 视为 neither success nor failed（condition 引用它时返回 false）
- `artifact_exists` 检查相对于项目根目录的路径
- 表达式从左到右求值，`&&` 优先级高于 `||`
- 括号可用于改变优先级：`(a || b) && c`

## 失败策略

| 策略 | 行为 | 适用场景 |
|------|------|---------|
| `"stop"` | 停止整个 workflow，记录错误状态 | 关键阶段失败，后续无法继续 |
| `"skip"` | 跳过当前阶段，继续下一个 | 可选阶段（如 lint、格式化） |
| `"continue"` | 标记当前阶段为 failed，但继续执行 | 非阻塞性检查（如 warning 级别的审查） |
| `"retry"` | 重试当前阶段一次，仍失败则按 stop 处理 | 网络依赖、临时性故障 |

## Artifact 传递机制

1. Stage 在执行过程中将产出写入 `artifacts` 声明的路径
2. 后续 stage 可通过 `condition` 中的 `artifact_exists()` 检查前置产出
3. 后续 stage 的 skills 可直接读取 artifact 文件内容作为输入
4. 所有 artifact 路径相对于项目根目录
5. 推荐存放位置：`.csp/artifacts/{stage-name}/`

## 执行引擎行为

```
for each stage in workflow.stages:
  1. 评估 stage.condition
     → false: 标记为 skipped，跳到下一个 stage
     → true/null: 继续
  2. 加载 stage.skills 中的所有 skill
  3. 启动超时计时器 (stage.timeout 秒)
  4. 执行 skill 逻辑
  5. 收集 artifacts（验证声明的文件是否存在）
  6. 评估执行结果：
     → 成功: 标记为 success，继续下一个 stage
     → 超时: 按 on_failure 处理
     → 失败: 按 stage.on_failure 处理
       - stop: 终止 workflow，写入最终状态
       - skip: 标记为 skipped，继续
       - continue: 标记为 failed，继续
       - retry: 重新执行一次，仍失败则 stop
  7. 将 stage 结果写入 .csp/workflow-state.json
```

## Workflow State 文件

执行过程中，引擎维护 `.csp/workflow-state.json`：

```json
{
  "workflow": "workflow-name",
  "status": "running",
  "started_at": "2026-06-19T10:00:00Z",
  "stages": [
    {
      "name": "stage-name",
      "status": "success",
      "started_at": "2026-06-19T10:00:00Z",
      "completed_at": "2026-06-19T10:05:00Z",
      "artifacts": [".csp/artifacts/stage-name.md"],
      "error": null
    }
  ]
}
```

`status` 取值：`pending` | `running` | `success` | `failed` | `skipped` | `timeout`

## 与现有 CSP Workflow 的关系

| 组件 | 角色 |
|------|------|
| **csp-workflow-schema** | 声明式 JSON 定义，机器可解析的执行规范 |
| **csp-auto / csp-full** | 可从 JSON schema 读取阶段定义并驱动执行 |
| **Markdown workflow** | 人类可读的流程文档，保留为参考 |
| **csp-guard.sh / csp-state.sh** | 底层状态管理工具，被执行引擎调用 |

JSON schema 不替代现有 Markdown workflow，而是为其提供可编程的结构化表示。
一个 Markdown workflow 可以有对应的 JSON schema，反之亦然。

## 使用方法

### 定义 workflow

创建 `.csp/workflows/my-workflow.json`：

```json
{
  "name": "my-workflow",
  "description": "自定义工作流",
  "stages": [
    {
      "name": "analyze",
      "skills": ["csp-explore"],
      "artifacts": [".csp/artifacts/analyze.md"]
    },
    {
      "name": "implement",
      "skills": ["csp-tdd"],
      "condition": "analyze.success",
      "artifacts": [".csp/artifacts/implement.md"]
    }
  ]
}
```

### 在 skill 中引用

其他 skill 可以读取 JSON schema 来动态构建执行计划：

```
1. 读取 .csp/workflows/<name>.json
2. 解析 stages 数组
3. 按顺序执行每个 stage 的 skills
4. 根据 condition 和 on_failure 控制流程
```

## 参考文件

- `references/schema-spec.md` — 完整 JSON Schema 定义、验证规则和决策树
- `references/examples.md` — 三个完整的 workflow JSON 示例

## 模板执行

预定义的 Pipeline 模板存放在 `csp-workflow/templates/` 目录：

| 模板 | 阶段数 | 适用场景 |
|------|--------|---------|
| feature-development | 7 | 新功能开发 |
| bug-fix | 5 | Bug 修复 |
| refactor | 6 | 代码重构 |
| code-review | 4 | 代码审查 |
| release | 5 | 发布部署 |
| migration | 6 | 系统迁移 |
| hotfix | 4 | 紧急修复 |
| onboarding | 5 | 新人上手 |

### 使用方式

1. **直接执行**: 用户说 "用 feature-development 流程" → 加载对应模板
2. **定制执行**: 用户说 "从 feature-development 开始，跳过 spec 阶段" → 加载模板后修改 condition
3. **组合执行**: 用户说 "先 code-review，再 refactor" → 串联多个模板

### 模板发现

路由器通过以下关键词自动匹配模板：
- "新功能"/"feature" → feature-development
- "修 bug"/"fix" → bug-fix
- "重构"/"refactor" → refactor
- "审查"/"review" → code-review
- "发布"/"release" → release
- "迁移"/"migrate" → migration
- "紧急"/"hotfix" → hotfix
- "上手"/"onboard" → onboarding

## 相关技能

- [[csp-full]] — 全链路产品交付工作流
- [[csp-hotfix]] — 快速修复工作流
- [[csp-verify-phase]] — 验证阶段
