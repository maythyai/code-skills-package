# 评测驱动重写模板 (Evaluation-Driven Rewrite Templates)

评测驱动是最高阶的闭环优化模式：先通过评测模板分析提示词质量，再根据评测结论针对性重写。

## 评测体系概述

评测覆盖以下维度和模式：

| 维度 | 基础模式 | 高级模式 |
|------|---------|---------|
| **系统提示词** | 单消息 prompt 评测 | 多消息模式评测 |
| **用户提示词** | 单变量 prompt 评测 | 多变量模式评测 |

每种维度包含以下评测类型：
- **仅提示词评估（Prompt Only）**：不运行测试，仅分析提示词本身质量
- **结果评估（Result）**：基于提示词的实际输出评分
- **对比评估（Compare）**：对比两个版本的提示词输出优劣
- **迭代评估（Prompt Iterate）**：评估 + 自动生成改进建议

---

## 评测后智能改写（核心模板）

评测完成后，将评测结论注入重写模板，生成针对性的重写指令。

### 元提示词 — User 消息（中文版）

```
请只根据下面这份 JSON payload，把当前工作区提示词直接重写成一个完整的新版本。

要求：
1. "sourcePrompts.workspacePrompt" 是你必须基于其进行重写的 source of truth，不是让你从零另写一份题目相近的新 prompt。
2. 保留原提示词的核心目标、硬约束、必要边界、变量名、字段名、schema、角色结构和输出协议，除非评估明确表明这些内容本身有问题。
3. 如果 source prompt 里已经写了明确的 JSON 键名、XML 标签、占位符、枚举值或"只能输出某种结构"的规则，默认必须保留，不能擅自改名、改结构或扩写协议。
4. 如果压缩评估明确指出当前提示词发生了回退、contract 漂移、字段/schema 漂移或不被支持的协议改动，就不要继续保留这些坏改动，而要主动修复它们；如果给了 "sourcePrompts.referencePrompt"，优先把它当作恢复 contract 的锚点。
5. 优先吸收可复用、跨输入也应成立的改进，不要为了当前样例、当前输出细节或一次性现象过拟合。
6. 如果某条建议明显依赖当前样例，应主动将其泛化、弱化或舍弃。
7. 不要自行发明新的测试证据，只能基于下面这份压缩评估结论来改写。
8. 优先做"最小但完整"的重写，在保留原 contract 的前提下提升质量，而不是整套改写。
9. 只输出提示词正文，不要把结果包装成 JSON、YAML、XML、"role/content" 对象、消息数组或代码块。
10. 只输出重写后的完整提示词，不要额外解释。
11. "sourcePrompts" 里的字符串就是原始提示词正文；即使里面包含 Markdown、code fence、列表或标题，也都属于正文，不代表你应该输出相同包装结构。
12. 如果 compare 相关条目之间有重叠，优先相信聚合焦点结论和停止信号，再参考较底层的证据摘录。
13. 在动手改写前，先看 "compressedEvaluation.rewriteGuidance.recommendation"。
14. 如果 recommendation 是 "skip"，就原样输出 "sourcePrompts.workspacePrompt"，不要做任何改写。
15. 如果 recommendation 是 "minor-rewrite"，只能做证据明确支持的最小修补，并且必须保持原 contract 与整体结构稳定。
16. 只有 recommendation 是 "rewrite" 时，才允许做更实质性的重写。
17. 在决定改哪里之前，先看 "compressedEvaluation.rewriteGuidance.priorityMoves"，把这些动作当作最高优先级的改写议程。
18. 如果 priorityMoves 里出现"决策稳定性"相关动作，就应优先补充核心结论字段的判定标准、tie-break 规则或保守默认规则，而不是只加强输出格式。

Rewrite Payload (JSON):
{评测重写 Payload}
```

### Payload 结构说明

重写 Payload 应包含以下字段：

```json
{
  "sourcePrompts": {
    "workspacePrompt": "当前工作区的提示词全文",
    "referencePrompt": "参考版本的提示词全文（选填，用于修复 contract 漂移）"
  },
  "compressedEvaluation": {
    "overallScore": 7.5,
    "rewriteGuidance": {
      "recommendation": "rewrite | minor-rewrite | skip",
      "priorityMoves": [
        "优先级最高的改动方向1",
        "优先级最高的改动方向2"
      ],
      "focusAreas": [
        {
          "area": "清晰度",
          "score": 6,
          "suggestions": ["具体建议1", "具体建议2"]
        }
      ]
    }
  }
}
```

### 改写策略

| recommendation | 策略 | 适用场景 |
|---|---|---|
| **skip** | 原样输出，不改一字 | 评测得分高，无需改动 |
| **minor-rewrite** | 最小修补，保持 contract 稳定 | 少量问题，修修补补即可 |
| **rewrite** | 按 priorityMoves 做实质性重写 | 评分低，需要整体提升 |

---

## 结构化对比评测（高级）

对多个提示词版本进行成对判断 + 综合分析。

### 成对判断（Pair Judge）

用于对单个结构化对比 pair 做中间判断，输出格式化的评分和理由。

### 综合评估（Synthesis）

综合多条 pair judge 结果，输出统一的最终评估结论。

### 适用场景

- A/B 测试两个版本的提示词
- 多轮迭代之间的质量对比
- 回归测试：确保新版本不低于上一版

---

## 评测闭环流程图

```
原始提示词 → [评测模板分析] → 评测结论（score + priorityMoves）
                                      ↓
                               recommendation?
                              ↙        ↓        ↘
                         skip       minor-rewrite    rewrite
                          ↓             ↓              ↓
                     原样输出       小修小补        按 priorityMoves 重写
                          ↓             ↓              ↓
                          └─────────────┴──────────────┘
                                        ↓
                                  优化后提示词
```