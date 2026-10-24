# Next-Skill 三层结构模板

> 本模板定义产品设计套件所有 Skill 的 Handoff 输出结构（chain-protocol §七）。
> 候选清单由 `_shared/skill-graph.json` 依赖图算法实时生成（chain-protocol §八），**本模板只定结构，不定内容**。

## 第一层 — 完成摘要（首行）

一行完成声明，格式：`✅ <本 Skill 中文名> 已完成，<2-3 个关键产出> 已沉淀。`

- 必须包含本 Skill 的核心交付物（如「JTBD 提炼 + 12 张 HMW 卡片 + 方向收敛」）
- 引用具体写盘文件或数量锚点，不用空泛的「完成了设计」
- 示例：`✅ 设计简报 已完成，business_goal + 5 维 strategy_dimensions + 9 项 design_criteria 已沉淀。`

## 第二层 — 候选清单（算法生成，必输出）

```
下一步建议（由 skill-graph 实时计算）：
🎯 /brief — 理由
   └ /probe (用研验证假设) · /bench (竞品参考)
```

- **候选来源**：`_shared/skill-graph.json#skills[id="<skill>"].next_hint`（preferred → alternatives），不足 5 个按 chain-protocol §八 的同阶段 → anchor → fan-out 顺序补齐
- **done ⊆ ready**：已完成节点不得出现在候选里
- **preferred** 带优先理由；**alternatives** 各带一句触发场景（括号内）
- **终端节点**（preferred 为空）：候选清单行也必须输出，写明闭环建议（归档 / 复盘 / 开启下一个项目）

## 第三层 — 红线约束

Handoff 输出必须满足：

- ❌ 禁止硬编码候选清单（如「进入 X / Y / Z」）——所有候选必须由算法实时生成
- ❌ 禁止按「文档类 / 视觉类 / 决策类」再分类候选（分类已折叠进 next_hint.alternatives）
- ❌ 禁止与「更新链路面板」段合并——两段必须各自独立成段，中间空一行
- ❌ 禁止漏第 2 行候选清单——即使候选只有 1 个、或为空（终端节点）也要写出来
- ❌ 禁止强制推进：候选是建议，用户选择其他节点或终止链均为合法
