# Workflow Schema 完整规范

## JSON Schema（可用于验证）

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "CSP Workflow Schema",
  "description": "声明式 JSON 工作流定义规范",
  "type": "object",
  "required": ["name", "stages"],
  "additionalProperties": false,
  "properties": {
    "name": {
      "type": "string",
      "pattern": "^[a-z][a-z0-9]*(-[a-z0-9]+)*$",
      "description": "workflow 标识符，kebab-case，以字母开头"
    },
    "description": {
      "type": "string",
      "maxLength": 500,
      "description": "workflow 描述"
    },
    "stages": {
      "type": "array",
      "minItems": 1,
      "items": {
        "$ref": "#/definitions/stage"
      },
      "description": "阶段列表，按数组顺序执行"
    },
    "defaults": {
      "$ref": "#/definitions/defaults",
      "description": "全局默认值"
    }
  },
  "definitions": {
    "stage": {
      "type": "object",
      "required": ["name", "skills"],
      "additionalProperties": false,
      "properties": {
        "name": {
          "type": "string",
          "pattern": "^[a-z][a-z0-9]*(-[a-z0-9]+)*$",
          "description": "阶段名，kebab-case，在 workflow 内唯一"
        },
        "description": {
          "type": "string",
          "maxLength": 300,
          "description": "阶段描述"
        },
        "skills": {
          "type": "array",
          "minItems": 1,
          "items": {
            "type": "string",
            "pattern": "^[a-z][a-z0-9]*(-[a-z0-9]+)*$"
          },
          "description": "该阶段加载的 skill 名称列表"
        },
        "condition": {
          "oneOf": [
            { "type": "null" },
            { "type": "string", "maxLength": 200 }
          ],
          "default": null,
          "description": "执行条件表达式，null 表示无条件执行"
        },
        "on_failure": {
          "type": "string",
          "enum": ["stop", "skip", "continue", "retry"],
          "description": "失败策略"
        },
        "timeout": {
          "type": "integer",
          "minimum": 10,
          "maximum": 7200,
          "description": "超时秒数 (10-7200)"
        },
        "artifacts": {
          "type": "array",
          "items": {
            "type": "string",
            "pattern": "^\\.csp/artifacts/"
          },
          "description": "该阶段产出的 artifact 文件路径（相对于项目根目录）"
        }
      }
    },
    "defaults": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "on_failure": {
          "type": "string",
          "enum": ["stop", "skip", "continue", "retry"],
          "default": "stop"
        },
        "timeout": {
          "type": "integer",
          "minimum": 10,
          "maximum": 7200,
          "default": 600
        }
      }
    }
  }
}
```

## 字段类型与约束

### name（workflow 级和 stage 级）

- **格式**：kebab-case，正则 `^[a-z][a-z0-9]*(-[a-z0-9]+)*$`
- **长度**：1-64 字符
- **唯一性**：stage name 在同一 workflow 内必须唯一
- **保留字**：不能使用 `all`, `none`, `self` 作为 stage name

### skills

- **格式**：skill 名称数组，每个元素为 kebab-case
- **最少**：1 个 skill
- **解析**：按 CSP registry 查找 skill 路径并加载 SKILL.md
- **加载顺序**：按数组顺序依次加载，所有 skill 共享同一 stage 上下文

### condition

- **类型**：`string | null`
- **null 语义**：无条件执行（等价于 `"true"`）
- **空字符串**：视为无效，抛出 schema validation error

### timeout

- **范围**：10-7200 秒（10 秒到 2 小时）
- **默认**：600 秒（10 分钟）
- **精度**：整数秒
- **行为**：超时后触发 on_failure 策略

### artifacts

- **路径前缀**：必须以 `.csp/artifacts/` 开头
- **格式**：相对路径，相对于项目根目录
- **创建**：stage 执行期间由 skill 负责写入
- **验证**：stage 完成后引擎检查声明的 artifact 是否存在

## 条件表达式求值规则

### 语法 BNF

```
expression     := or_expr
or_expr        := and_expr ("||" and_expr)*
and_expr       := not_expr ("&&" not_expr)*
not_expr       := "!" not_expr | primary
primary        := "(" expression ")" | status_check | artifact_check
status_check   := IDENTIFIER "." STATUS
artifact_check := "artifact_exists(" STRING_LITERAL ")"
STATUS         := "success" | "failed" | "skipped"
IDENTIFIER     := stage name (kebab-case)
STRING_LITERAL := "'" path "'"
```

### 求值语义

| 表达式 | 求值规则 |
|--------|---------|
| `stage.success` | stage 状态为 `success` → true，否则 false |
| `stage.failed` | stage 状态为 `failed` 或 `timeout` → true，否则 false |
| `stage.skipped` | stage 状态为 `skipped` → true，否则 false |
| `artifact_exists(path)` | 文件在磁盘上存在且可读 → true，否则 false |
| `!expr` | expr 为 true → false，反之亦然 |
| `a && b` | a 和 b 都为 true → true，短路求值 |
| `\|\|` | a 或 b 为 true → true，短路求值 |

### 边界情况

- 引用尚未执行的 stage → 返回 false（不报错）
- 引用不存在的 stage name → schema validation 阶段报错
- `artifact_exists` 中路径不存在 → 返回 false（不报错）
- 条件表达式语法错误 → schema validation 阶段报错

## 失败策略决策树

```
Stage 执行失败
  │
  ├── on_failure = "stop"
  │     └── 终止 workflow
  │         写入 state: status="failed", error=message
  │         后续 stages 全部标记为 pending
  │
  ├── on_failure = "skip"
  │     └── 标记当前 stage: status="skipped"
  │         继续执行下一个 stage
  │         后续 condition 引用此 stage 时 .skipped=true
  │
  ├── on_failure = "continue"
  │     └── 标记当前 stage: status="failed"
  │         继续执行下一个 stage
  │         后续 condition 引用此 stage 时 .failed=true
  │
  └── on_failure = "retry"
        └── 重新执行当前 stage（最多 1 次重试）
            ├── 重试成功 → status="success"
            └── 重试仍失败 → 降级为 "stop" 行为
                写入 state: status="failed", retries=1
```

## Artifact 传递机制

### 生命周期

```
Stage A 声明 artifacts: [".csp/artifacts/plan.md"]
  │
  ├── Stage A 执行期间：skill 将内容写入 .csp/artifacts/plan.md
  ├── Stage A 完成后：引擎验证文件存在
  │   ├── 存在 → 标记 artifact 有效
  │   └── 不存在 → 记录 warning（不阻塞，除非 on_failure=stop）
  │
  └── Stage B 可通过以下方式消费：
      ├── condition: "artifact_exists('.csp/artifacts/plan.md')"
      └── skills 内部直接读取文件内容
```

### 命名约定

```
.csp/artifacts/
├── {stage-name}/           # 按 stage 分目录
│   ├── output.md           # 主要产出
│   └── metadata.json       # 元数据（可选）
└── shared/                 # 跨 stage 共享资源
    └── context.md
```

### 清理策略

- Workflow 成功完成：artifacts 保留供后续查阅
- Workflow 失败停止：artifacts 保留供调试
- 用户手动清理：`rm -rf .csp/artifacts/`

## 超时处理流程

```
启动 stage 执行
  │
  ├── 设置定时器 (timeout 秒)
  │
  ├── 定时器到期前完成
  │   └── 正常处理结果
  │
  └── 定时器到期
      ├── 向 skill 发送中断信号
      ├── 等待 5 秒 grace period
      ├── 强制终止
      └── 按 on_failure 策略处理
          state 记录: status="timeout"
```

## Workflow State 完整结构

```json
{
  "workflow": "string — workflow name",
  "status": "pending | running | success | failed | partial",
  "started_at": "ISO 8601 timestamp",
  "completed_at": "ISO 8601 timestamp | null",
  "stages": [
    {
      "name": "string",
      "status": "pending | running | success | failed | skipped | timeout",
      "started_at": "ISO 8601 | null",
      "completed_at": "ISO 8601 | null",
      "duration_seconds": "number | null",
      "artifacts": ["string"],
      "artifacts_verified": "boolean",
      "retries": "number (0 or 1)",
      "error": "string | null",
      "skills_loaded": ["string"]
    }
  ],
  "metadata": {
    "schema_version": "1.0",
    "engine_version": "string",
    "total_duration_seconds": "number | null"
  }
}
```

### 顶层 status 推导规则

| 条件 | workflow.status |
|------|----------------|
| 所有 stage 都是 success | `success` |
| 至少一个 stage 是 failed/timeout 且 on_failure=stop | `failed` |
| 有 failed 但都用了 continue/skip，其余 success | `partial` |
| 正在执行中 | `running` |
| 尚未开始 | `pending` |
