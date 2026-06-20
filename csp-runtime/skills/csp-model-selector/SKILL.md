---
name: csp-model-selector
description: >
  Automatic model selection based on task complexity.
  Maps complexity levels to optimal models (haiku/sonnet/opus)
  considering cost, speed, and quality trade-offs.
  Use automatically during task routing.
layer: 4
category: runtime
---

# CSP Model Selector

根据任务复杂度自动选择最优模型，在成本、速度和质量之间取得平衡。

## 核心映射表

| 复杂度 | 首选模型 | 备选模型 | 理由 |
|--------|---------|---------|------|
| simple | haiku | sonnet | 成本优先，任务简单不需要强推理 |
| medium | sonnet | opus | 平衡质量和成本 |
| complex | opus | sonnet | 质量优先，复杂推理需要最强模型 |

## 与 csp-complexity-classifier 的协作

```
complexity-classifier 输出 complexity level
        ↓
model-selector 映射到模型
        ↓
budget-enforcer 检查预算约束
        ↓
最终模型选择
```

## 预算降级覆盖

当 csp-budget-enforcer 触发降级时，model-selector 的映射被覆盖：

| 预算级别 | 行为 |
|----------|------|
| OK | 原模型不变 |
| WARNING | 原模型不变（仅显示警告） |
| SOFT_LIMIT | 强制降一级 (opus→sonnet, sonnet→haiku) |
| HARD_LIMIT | 强制降到 haiku |

## 特殊规则

- **用户显式指定模型** → 覆盖自动选择（最高优先级）
- **代码审查/review** → 至少 sonnet（需要理解力）
- **简单文件操作** → haiku（不需要推理）
- **架构设计** → 至少 opus（需要深度思考）
- **安全审计** → 至少 opus（不能遗漏关键问题）
- **文档生成** → sonnet（平衡质量和成本）

## 决策流程

```
1. 用户是否显式指定模型？
   → 是：使用指定模型
   → 否：继续

2. 获取任务复杂度 (from complexity-classifier)
   → simple / medium / complex

3. 查核心映射表得到候选模型

4. 应用特殊规则覆盖
   → review类任务 ≥ sonnet
   → 架构设计 ≥ opus
   → 简单文件操作 = haiku

5. 检查预算约束 (from budget-enforcer)
   → OK/WARNING: 保持候选
   → SOFT_LIMIT: 降一级
   → HARD_LIMIT: 强制 haiku

6. 输出最终选择
```

## 输出格式

```json
{
  "selected_model": "sonnet",
  "reason": "medium complexity + budget OK",
  "alternatives": ["opus"],
  "budget_tier": "OK",
  "overrides_applied": []
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| selected_model | string | 最终选择的模型 (haiku/sonnet/opus) |
| reason | string | 选择理由的人类可读描述 |
| alternatives | string[] | 可替代的模型列表 |
| budget_tier | string | 当前预算级别 (OK/WARNING/SOFT_LIMIT/HARD_LIMIT) |
| overrides_applied | string[] | 应用的覆盖规则列表 |

## 集成示例

### 在 csp-router 中使用

```yaml
# triggers.yaml 中的路由结果
routing_result:
  skills: [csp-code-review]
  complexity: medium
  model_hint: auto  # 触发 model-selector
```

### 手动调用

```
/model-selector --task "review PR #42" --complexity medium
```

## 参考文档

- [Model Profiles](references/model-profiles.md) — 各模型的详细性能指标和适用场景
