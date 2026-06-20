---
name: csp-budget-enforcer
description: >
  Token budget management with four-tier graceful degradation.
  Tracks token consumption, enforces budget limits, and automatically
  downgrades model complexity as budget depletes.
  Use when running long sessions or managing token costs.
layer: 4
category: runtime
---

# CSP Budget Enforcer

Token 预算管理采用四级降级策略，确保在预算耗尽前优雅降级而非突然中断。

## 核心概念

在长会话或高消耗任务中，token 预算可能意外耗尽导致会话中断。Budget Enforcer 通过持续追踪消耗、分级预警和自动降级，将"突然死亡"变为"渐进收缩"——用户始终保有控制权和数据安全。

## 四级预算模型

| 级别 | 预算占比 | 状态 | 行为 |
|------|---------|------|------|
| OK | < 75% | 🟢 正常 | 正常执行所有操作，使用默认模型 |
| WARNING | 75-90% | 🟡 警告 | 显示预算警告，建议简化操作 |
| SOFT_LIMIT | 90-100% | 🟠 软限制 | 降级到轻量模型(haiku)，仅执行 essential + standard 操作 |
| HARD_LIMIT | > 100% | 🔴 硬限制 | 仅允许 essential 操作(help, status, save)，需显式解锁继续 |

## 降级策略

### OK → WARNING 转换时

- 在输出中显示预算提示：`⚠️ Token budget: 78% used (est. 12K tokens remaining)`
- 建议使用更简洁的 responses
- 减少非必要 skill 加载
- 记录转换时间戳到 checkpoint

### WARNING → SOFT_LIMIT 转换时

- 自动切换模型偏好：opus → sonnet → haiku
- 跳过非 essential 的 skill（如 csp-brainstorming, deep-research）
- 限制 subagent spawn 数量（最多 1 个并行 agent）
- 显示：`🟠 Soft limit: switched to {model}. Non-essential skills disabled.`
- 禁用自动文档生成和非关键验证步骤

### SOFT_LIMIT → HARD_LIMIT 转换时

- 冻结 workflow 执行
- 保存当前状态到 `.csp/budget-checkpoint.json`
- 显示：`🔴 Hard limit reached. Session state saved. Use /csp-budget-extend to continue.`
- 仅响应：help, status, save-session, budget-report

## Token 估算

各类操作的预估 token 消耗：

| 操作类型 | 预估消耗 | 说明 |
|----------|---------|------|
| Skill 加载 | 200-800 tokens | 取决于 SKILL.md 大小和 references 数量 |
| Subagent spawn | 2000-5000 tokens | 包含 context 传递和结果汇总 |
| File read | 100-500 tokens | 按文件大小线性增长 |
| 基础对话轮次 | 500-1000 tokens | 含 system prompt 摊销 |
| Code generation | 300-2000 tokens | 取决于代码复杂度 |
| Web search/fetch | 500-3000 tokens | 含搜索结果解析 |

详细估算公式见 [references/token-estimation.md](references/token-estimation.md)。

## 预算检查点协议

在每个 workflow stage 转换时自动执行预算检查：

```json
{
  "session_tokens": {
    "input_total": 45000,
    "output_total": 12000,
    "estimated_remaining": 23000,
    "budget_percent_used": 71.25
  },
  "current_tier": "OK",
  "model_preference": "default",
  "skills_disabled": [],
  "checkpoint_timestamp": "2026-06-19T10:00:00Z"
}
```

检查点文件保存在 `.csp/budget-checkpoint.json`，包含完整的会话状态快照，支持跨会话恢复。

## 与 Workflow 引擎集成

csp-autopilot DAG 在每个节点执行前调用 budget check：

- **OK**: 正常执行当前节点
- **WARNING**: 执行但在输出中附加预算提示
- **SOFT_LIMIT**: 评估当前节点是否 essential，非 essential 则 skip 并记录原因
- **HARD_LIMIT**: 暂停 DAG，保存进度到 checkpoint，等待用户指令

其他 workflow skill（ralph, ultrawork, team）同样在每轮迭代前检查预算状态。

## Skill 分类

Budget Enforcer 将所有 CSP skill 分为三类，降级时按类别过滤：

| 分类 | 说明 | SOFT_LIMIT 可用 | 示例 |
|------|------|----------------|------|
| essential | 会话安全和数据保全 | ✅ | help, status, save-session, budget-report |
| standard | 核心开发工作流 | ✅ | plan, execute, verify, code-review |
| optional | 增强型/探索型功能 | ❌ | brainstorming, deep-research, wiki, self-improve |

完整分类映射见 [references/budget-tiers.md](references/budget-tiers.md)。

## 用户命令

| 命令 | 说明 |
|------|------|
| `/csp-budget-status` | 显示当前预算使用情况、tier 状态和已禁用的 skill |
| `/csp-budget-extend` | 显式扩展预算（解锁 HARD_LIMIT），需确认操作 |
| `/csp-budget-set {tokens}` | 设置会话预算上限（默认 200K tokens） |

## 注意事项

- Token 估算是近似值，实际消耗受模型、context window 和缓存命中率影响
- 预算检查是被动触发（在 stage 转换时），不会主动中断正在执行的操作
- HARD_LIMIT 解锁后进入 SOFT_LIMIT 状态，不会直接回到 OK
- Checkpoint 文件包含会话状态但不包含敏感数据（API keys 等）
- 多 agent 场景下，每个 agent 共享同一预算池
