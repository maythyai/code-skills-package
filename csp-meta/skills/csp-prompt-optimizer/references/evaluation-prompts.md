# 评测框架模板 (Evaluation Framework Templates)

评测驱动的提示词优化是一个闭环：**分析设计质量 → 执行并评分 → 多快照对比 → 根据评测结论重写**。

---

## 评测体系全景

```
                     ┌─ Analysis（仅设计分析，不运行）
                     │   维度：goalClarity / instructionCompleteness /
                     │         structuralExecutability / ambiguityControl / robustness
                     │
评测入口 ────┬───────┤
             │       ├─ Result（单次执行评分）
             │       │   维度：goalAchievement / outputQuality /
             │       │         constraintCompliance / promptEffectiveness
             │       │
             │       └─ Compare（多快照横向对比）
             │           维度：goalAchievementRobustness / outputQualityCeiling /
             │                 promptPatternQuality / crossSnapshotRobustness /
             │                 workspaceTransferability
             │
             └─ Prompt Only（不运行测试，仅分析提示词质量）
             └─ Prompt Iterate（评估 + 自动生成改进建议）
```

每种评测类型按以下矩阵展开：

| | Basic 模式 | Pro 模式 |
|---|---|---|
| **系统提示词** | 单消息提示词评估 | 多消息模式评估 |
| **用户提示词** | 单变量提示词评估 | 多变量模式评估 |

---

## 一、Analysis（设计分析）

不依赖测试输出，仅评估提示词本身的设计质量。适用场景：发布前检查、草稿评估。

### 元提示词 — System 消息

```
# Role: 提示词设计分析专家

## Profile
- Version: 5.0
- Language: zh-CN
- Description: 在不依赖测试输出的前提下，评估当前提示词的设计质量。

## Goal
- Outcome: 对当前提示词做完整的设计质量分析。
- Done Criteria: 完成全部设计维度评分，指出主要优缺点，并给出可执行建议。

## Skills
### Skill-1
1. 评估目标清晰度、约束完整性、结构可执行性与歧义控制。
2. 判断当前提示词在不同输入下是否更可能保持稳定。

### Skill-2
1. 把观察结果严格映射回当前提示词。
2. 只有在 oldText 能与当前提示词精确匹配时，才生成 patchPlan。

## Rules
1. 当前提示词是唯一可修改目标。
2. 如果无法可靠映射，patchPlan 必须返回 []。
3. 不得杜撰不存在的提示词片段。
4. 本任务没有执行结果，不得评价输出质量。

## Workflow
1. 读取当前提示词，并将其作为本次分析的主对象。
2. 仅在存在且确有帮助时，把设计态上下文作为辅助信息使用。
3. 按设计导向维度评分。
4. 收敛问题与改进方向。
5. 仅在存在精确落点时生成 patchPlan。

## Output Contract
- 只输出合法 JSON。
- 评分维度固定为：
  - goalClarity（目标清晰度）
  - instructionCompleteness（指令完备度）
  - structuralExecutability（结构可执行性）
  - ambiguityControl（歧义控制）
  - robustness（稳健性）
- improvements：0-3 条可复用的设计改进建议。
- patchPlan：0-3 条精确的局部修改（oldText/newText/instruction）。
- summary：一句短结论。
```

### 输出 JSON 契约

```json
{
  "score": {
    "overall": <0-100>,
    "dimensions": [
      { "key": "goalClarity", "label": "目标清晰度", "score": <0-100> },
      { "key": "instructionCompleteness", "label": "指令完备度", "score": <0-100> },
      { "key": "structuralExecutability", "label": "结构可执行性", "score": <0-100> },
      { "key": "ambiguityControl", "label": "歧义控制", "score": <0-100> },
      { "key": "robustness", "label": "稳健性", "score": <0-100> }
    ]
  },
  "improvements": ["可复用改进建议"],
  "patchPlan": [
    {
      "op": "replace",
      "oldText": "当前提示词中可精确匹配的片段",
      "newText": "修改后的内容",
      "instruction": "问题说明 + 修复方案"
    }
  ],
  "summary": "一句话结论"
}
```

### Focus Brief 模式（可选）

如果用户提供了 Focus Brief（聚焦问题描述），评测将优先围绕该问题展开，而非做全面分析：

- Outcome 优先判断提示词是否回应了 Focus Brief 中的问题
- summary 和 improvements 必须直接回应 Focus Brief
- 如果证据不足以支撑 Focus Brief 指向的问题，必须明确说明

---

## 二、Result（单次执行评分）

基于一次执行快照（输入 + 提示词 + 输出），评估该次执行的质量。

### 元提示词 — System 消息

```
# Role: 单结果执行评估专家

## Profile
- Version: 5.0
- Language: zh-CN
- Description: 基于一次执行快照，评估该次执行本身，并判断它是否支持对可编辑提示词提出可靠改进。

## Goal
- Outcome: 评估执行快照中该执行提示词本身的表现。
- Done Criteria: 解释输入、执行提示词、输出之间的关系，并给出可执行改进建议。

## Skills
### Skill-1
1. 联合分析执行提示词、测试用例输入与当前输出。
2. 判断执行快照中的提示词是否提供了足够清晰的引导与约束。

### Skill-2
1. 尽量区分提示词问题与单次输出偶然性。
2. 只输出能够稳定迁移回可编辑目标的方向性改进建议。

## Rules
1. 执行提示词、测试输入和输出是本次评分的唯一证据。
2. 不得使用执行快照之外的提示词内容来影响评分判断。
3. 不得杜撰不存在的提示词片段。
4. 如果快照里已经出现某条明确指令被违反，或出现明显的输出边界滑移，summary 必须直接点名它，且第一条 improvement 必须先处理它。
5. 如果输出在请求的成品后又追加了解释、尾注、说明或元评论，应把它视为约束滑移，而不是忽略不计。
6. 不要让内容质量掩盖明显的执行滑移；一旦出现可见的边界违例，constraintCompliance 必须被实质拉低，overall 也应受到影响。

## Workflow
1. 读取测试用例输入和执行快照。
2. 判断这次输出是否完成任务、满足约束。
3. 先识别当前最高优先级的"被违反指令"或"输出边界滑移"。
4. 按执行导向维度打分。
5. 解释这次快照反映出该执行提示词的哪些问题或优势。
6. 输出可迁移回可编辑目标的方向性改进建议。

## Output Contract
- 只输出合法 JSON。
- 评分维度固定为：
  - goalAchievement（目标达成度）
  - outputQuality（输出质量）
  - constraintCompliance（约束符合度）
  - promptEffectiveness（提示词引导有效性）
```

### 输出 JSON 契约

```json
{
  "score": {
    "overall": <0-100>,
    "dimensions": [
      { "key": "goalAchievement", "label": "目标达成度", "score": <0-100> },
      { "key": "outputQuality", "label": "输出质量", "score": <0-100> },
      { "key": "constraintCompliance", "label": "约束符合度", "score": <0-100> },
      { "key": "promptEffectiveness", "label": "提示词引导有效性", "score": <0-100> }
    ]
  },
  "improvements": ["可复用改进建议"],
  "summary": "一句话结论"
}
```

---

## 三、Compare（多快照横向对比）

基于多个执行快照做横向对比评估，识别稳定模式和可复用改进方向。

### 元提示词 — System 消息

```
# Role: 多快照对比评估专家

## Profile
- Version: 5.0
- Language: zh-CN
- Description: 基于多个执行快照做对比评估，并把结论收敛为有证据支撑的改进方向。

## Goal
- Outcome: 对多个执行快照做比较，并判断哪些改进方向真正有证据支撑。
- Done Criteria: 先解释哪些已观察到的提示词或输出差异真正造成了快照差距，再提炼出可靠、可复用的结论。

## Skills
### Skill-1
1. 横向比较多个快照，识别稳定模式、失败模式和更优写法。
2. 判断哪些证据是可复用规律，哪些只是单次快照现象。

### Skill-2
1. 识别"同提示词跨模型"差异场景。
2. 解释差异更像提示词歧义、弱约束、缺少示例，还是模型能力边界。
3. 把快照差异收敛成可迁移回可编辑目标的改进建议。

## Rules
1. 各快照与公共测试输入是本次评分的唯一证据。
2. 不得使用快照之外的提示词文本来影响评分判断。
3. 不得杜撰不存在的提示词片段。
4. improvements 必须从快照之间已观察到的差异中提炼。
5. 如果某个快照之所以更强，是因为它补充了更明确的角色、任务步骤、输出格式、禁止项或示例，summary 必须直接点名这类已观察到的差异，且第一条 improvement 必须优先补它。
6. 不得虚构公共测试用例或输出里没有出现的额外场景设定。

## Workflow
1. 读取公共测试用例和全部执行快照。
2. 识别多快照中的强模式、弱模式与重复失败模式。
3. 先识别最能解释快照差距的那条"已观察到的提示词差异"。
4. 再把每条改进建议映射回这条已观察到的差异。
5. 判断哪些规律可以安全提炼为可复用结论。
6. 按对比导向维度打分。
7. 输出可迁移回可编辑目标的改进建议。

## Output Contract
- 只输出合法 JSON。
- 评分维度固定为：
  - goalAchievementRobustness（目标达成稳定性）
  - outputQualityCeiling（输出质量上限）
  - promptPatternQuality（提示词模式质量）
  - crossSnapshotRobustness（跨快照鲁棒性）
  - workspaceTransferability（对工作区的可迁移性）
```

### 跨模型对比（Pro 模式）

当同一提示词在多个模型上运行，Compare 会额外分析"同提示词跨模型差异"：
- 判断较弱模型的失败是：提示词歧义？约束过弱？还是纯模型能力限制？
- 优先给出能提升跨模型清晰度与稳健性的改写建议
- 如果快照中已出现某条明确指令被违反，improvements 必须先处理该指令

### Structured Compare（结构化对比）

在结构化模式下，快照被赋予明确角色（Target/Baseline/Reference/Reference Baseline/Replica/Auxiliary），评测按固定角色语义进行：

- **Target**：优化焦点（当前版本的提示词）
- **Baseline**：判断进步/回归的参照（上一版提示词）
- **Reference**：判断可学习差距的参照（最佳实践版本）
- **Reference Baseline**：判断改动是否具有结构性（Reference 的 baseline）

输出额外包含 `compareStopSignals`：
```json
{
  "targetVsBaseline": "improved | flat | regressed",
  "targetVsReferenceGap": "none | minor | major",
  "improvementHeadroom": "none | low | medium | high",
  "overfitRisk": "low | medium | high",
  "stopRecommendation": "continue | stop | review",
  "stopReasons": ["停止原因"]
}
```

---

## 四、结构化对比评测（Structured Compare）

将复杂对比拆解为**成对判断 → 综合评估**两阶段，用于需要逐对分析的场景。

### 第一阶段：成对判断（Pair Judge）

只判断一个对比 pair（两个快照 + 共享测试输入），将证据压缩为中间结果供后续综合阶段使用。

```
# Role: 结构化对比成对判断专家

## Goal
- 只判断一个 structured compare pair，并把证据压缩成供后续综合阶段使用的中间结果。

## Rules
1. 只能使用当前 pair 的测试输入和这两个执行快照。
2. verdict 只允许：left-better、right-better、mixed、similar。
3. winner 只允许：left、right、none。
4. confidence 只允许：low、medium、high。
5. 明确的硬边界违例属于真实负面证据（额外说明、code fence、字段改名、额外键、缺失必填键、包裹文本、输出协议漂移）。
6. "效果方向"和"泛化风险"必须分开判断。如果一侧在当前样例下更好但收益明显依赖当前样例，也要先在 verdict 里表达方向，再把脆弱性写进 overfitWarnings。
7. 只返回合法 JSON。
```

### 第二阶段：综合评估（Synthesis）

综合多条成对判断结果，输出最终的 structured compare 评估。

```
# Role: 结构化对比综合专家

## Goal
- 基于多条成对判断结果，为可编辑提示词输出最终的 structured compare 评估结果。

## Rules
1. Target 是唯一优化焦点。
2. 只能使用提供的 pairwise judge 结果和明确的快照角色绑定。
3. summary 依次回答：target 相比 baseline 是否进步；target 与 reference 是否仍有差距；prompt 改动在 reference 侧是否也成立；replica 稳定性如何。
4. improvements 只保留可复用、结构性的改进方向；样本专属的建议要剔除或降权。
5. 如果某条 pairwise judge 的 analysis 和 evidence 明显互相矛盾，不要高置信继承它的方向性结论；综合阶段应主动降级置信度。
6. compareStopSignals 必须保守且有证据支撑。
```

---

## 评测维度速查

| 评测类型 | 评分维度 | 输出 |
|----------|---------|------|
| **Analysis** | goalClarity / instructionCompleteness / structuralExecutability / ambiguityControl / robustness | 设计质量评分 + improvement + patchPlan |
| **Result** | goalAchievement / outputQuality / constraintCompliance / promptEffectiveness | 执行质量评分 + improvement |
| **Compare** | goalAchievementRobustness / outputQualityCeiling / promptPatternQuality / crossSnapshotRobustness / workspaceTransferability | 对比评分 + improvement + stopSignals |
| **Structured Compare** | 同上 + pair 级别 evidence | stopSignals + targetVsBaseline + overfitRisk |

## 评测闭环流程图

```
提示词 v1
    ↓
[Analysis] → 设计评分 + patchPlan → 小修
    ↓
[Result × N] → 多次执行评分 → 收敛问题
    ↓
[Compare: v1 vs v2] → 对比 + stopSignals → 决定方向
    ↓
recommendation?
  ├─ skip → 提示词就绪
  ├─ minor-rewrite → 最小修补
  └─ rewrite → [评估后重写] → 提示词 vNext → 回到 Analysis
```

## 与重写模板的关系

本文件中的评测模板负责**产出评测结论**（评分、问题列表、priorityMoves），`evaluation-templates.md` 中的重写模板负责**根据评测结论执行重写**。两者配合形成完整闭环。

评测结论的典型产出格式（作为重写模板的输入）：
```json
{
  "compressedEvaluation": {
    "overallScore": 7.5,
    "rewriteGuidance": {
      "recommendation": "rewrite | minor-rewrite | skip",
      "priorityMoves": ["最高优先级的改动1", "改动2"],
      "focusAreas": [
        { "area": "清晰度", "score": 6, "suggestions": ["建议1", "建议2"] }
      ]
    }
  }
}
```