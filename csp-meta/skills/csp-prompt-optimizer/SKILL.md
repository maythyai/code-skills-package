---
name: csp-prompt-optimizer
description: "提示词优化专家。将模糊、不完整或结构松散的提示词优化为高质量、结构化的专家级提示词。覆盖：系统提示词优化（通用/分析式/带输出格式）、用户提示词优化（基础/步骤化/专业）、上下文感知优化（多轮对话消息优化）、人格文件生成（SOUL.md）、迭代优化、评测驱动重写、评测框架（Analysis/Result/Compare/StructuredCompare）、变量提取与生成。触发词：优化提示词、优化prompt、prompt优化、提示词工程、改写提示词、prompt engineering、提示词迭代、prompt评测、提取变量、生成变量值、帮我改提示词、这个提示词不好用、生成AI人格、写SOUL.md、对话消息优化、提示词打分、提示词对比。"
layer: 1
category: meta
phase: plan
domain: architecture
scope: design
tools: [Read, Write, Edit, Bash, Glob, Grep]
version: "1.0.0"
role: specialist
---

# 提示词优化专家 (Prompt Optimizer)

基于经过验证的元提示词（Meta-Prompt）模板，将用户提交的粗糙提示词优化为结构清晰、角色明确、约束完整、可执行性强的专家级提示词。

## 核心理念

提示词优化不是"换个说法"，而是通过**结构化元框架**引导 LLM 将原始意图展开为完整的角色定义、技能匹配、约束条件和执行流程。优化的核心是一组经过实战打磨的"元提示词"（优化提示词的提示词），存放在 `references/` 目录下，共 8 份参考文件覆盖 8 大优化类别。

### 参考文件索引

| 文件 | 覆盖内容 | 模板数 |
|------|----------|--------|
| `references/optimize-templates.md` | 系统提示词优化（通用/分析式/带输出格式）| 3 |
| `references/user-optimize-templates.md` | 用户提示词优化（基础/步骤化/专业精准）| 3 |
| `references/context-templates.md` | 上下文感知优化（多轮对话消息优化/分析型/上下文迭代/用户消息精炼）| 7 |
| `references/personality-templates.md` | AI 人格文件生成（Hermes-SOUL/OpenClaw-SOUL/SOUL 定向迭代）| 3 |
| `references/iterate-template.md` | 迭代优化（通用迭代）| 1 |
| `references/evaluation-prompts.md` | 评测框架（Analysis/Result/Compare/StructuredCompare 完整评测元提示词）| 4+ |
| `references/evaluation-templates.md` | 评测驱动重写（根据评测结论执行重写）| 1 |
| `references/variable-templates.md` | 变量管理（智能提取/值生成）| 2 |

## 优化模式速查

### 系统提示词优化

| 模式 | 模板来源 | 适用场景 | 输出结构 |
|------|----------|----------|----------|
| **通用优化** | `references/optimize-templates.md#通用优化` | 系统提示词快速标准化 | Role → Profile → Skills → Rules → Workflows → Initialization |
| **分析式优化** | `references/optimize-templates.md#分析式结构优化` | 复杂业务场景，需要深度分析 | 11 段式：Role → Background → Attention → Profile → Skills → Goals → Constrains → Workflow → OutputFormat → Suggestions → Initialization |
| **带输出格式优化** | `references/optimize-templates.md#带输出格式的通用优化` | 需要精确控制输出格式 | 通用结构 + OutputFormat 详细定义 |

### 用户提示词优化

| 模式 | 模板来源 | 适用场景 | 输出结构 |
|------|----------|----------|----------|
| **基础用户优化** | `references/user-optimize-templates.md#基础优化` | 消除模糊表达，快速改善 | 自由结构，聚焦清晰度和完整性 |
| **步骤化规划** | `references/user-optimize-templates.md#步骤化规划` | 将模糊需求分解为可执行步骤 | Task → 角色与目标 → 背景与上下文 → 关键步骤 → 输出要求 |
| **专业精准优化** | `references/user-optimize-templates.md#专业精准优化` | 将泛泛而谈转化为精准描述 | 自由结构，聚焦量化标准和针对性 |

### 上下文感知优化（多轮对话）

| 模式 | 模板来源 | 适用场景 | 输出结构 |
|------|----------|----------|----------|
| **通用消息优化** | `references/context-templates.md#通用消息优化` | 多轮对话中某条消息的优化 | 保持原消息角色，增强具体性和清晰度 |
| **分析型消息优化** | `references/context-templates.md#分析型优化` | 代码审查、方案评估等技术场景 | 添加分析框架和可验证标准 |
| **上下文感知迭代** | `references/context-templates.md#上下文感知迭代` | 在对话上下文中迭代已有提示词 | 保持结构，融入新需求 + 上下文信息 |
| **用户消息精炼** | `references/context-templates.md#上下文感知用户提示词优化` | 结合对话历史精炼用户消息 | 明确目标/范围/格式/验收标准 |

### 人格文件生成

| 模式 | 模板来源 | 适用场景 | 输出结构 |
|------|----------|----------|----------|
| **Hermes-SOUL 生成** | `references/personality-templates.md#Hermes-SOUL` | 生成注重判断力和专业判断的 AI 人格 | Core Identity → Communication Defaults → Default Behavior → Interaction Style... |
| **OpenClaw-SOUL 生成** | `references/personality-templates.md#OpenClaw-SOUL` | 生成注重关系感和陪伴感的 AI 人格 | Core Identity → Default Behavior → Speaking Style → Relationship... |
| **SOUL 定向迭代** | `references/personality-templates.md#SOUL-定向迭代` | 已有 SOUL.md 的定向修改 | 保持原结构和核心人格，仅修改必要部分 |

### 迭代与评测

| 模式 | 模板来源 | 适用场景 | 输出结构 |
|------|----------|----------|----------|
| **通用迭代** | `references/iterate-template.md` | 在已有优化稿上按新要求修改 | 保持原结构，融入新需求 |
| **评测驱动重写** | `references/evaluation-templates.md` | 基于评测分数/对比结论针对性重写 | 按 priorityMoves 修复弱点 |
| **设计分析评测** | `references/evaluation-prompts.md#Analysis` | 仅分析提示词设计质量（不运行）| JSON：goalClarity + instructionCompleteness + ... |
| **执行结果评测** | `references/evaluation-prompts.md#Result` | 基于单次执行快照评分 | JSON：goalAchievement + outputQuality + constraintCompliance + promptEffectiveness |
| **多快照对比评测** | `references/evaluation-prompts.md#Compare` | 多版本/跨模型横向对比 | JSON + stopSignals（含跨模型分析）|
| **结构化对比评测** | `references/evaluation-prompts.md#结构化对比` | 需要逐对分析的复杂对比 | Pair Judge → Synthesis 两阶段 |

### 变量管理

| 模式 | 模板来源 | 适用场景 | 输出结构 |
|------|----------|----------|----------|
| **变量提取** | `references/variable-templates.md#变量提取` | 识别可参数化的变化点 | JSON：variables[] + summary |
| **变量值生成** | `references/variable-templates.md#变量值生成` | 为变量推测合理示例值 | JSON：values[] + confidence + summary |

## 工作流程

### 第一步：识别优化需求

向用户确认以下信息：

1. **优化场景**：
   - 独立提示词文档？→ 系统提示词优化 / 用户提示词优化
   - 多轮对话中的某条消息？→ 上下文感知优化
   - 想要创建 AI 人格文件？→ 人格文件生成
   - 已有优化版需要继续改进？→ 迭代优化
   - 想要评估提示词质量？→ 评测框架

2. **提示词类型**（非对话场景）：系统提示词（定义 AI 角色/行为）还是用户提示词（单次交互指令）？

3. **优化目标**：
   - 快速标准化 → 通用优化
   - 深度重构 → 分析式优化
   - 精准控制输出格式 → 带输出格式优化
   - 消除模糊 → 基础/专业用户优化
   - 分解为步骤 → 步骤化规划
   - 对话消息优化 → 上下文感知优化
   - 生成 AI 人设 → 人格文件生成
   - 评估质量 → 评测框架
   - 基于评测改进 → 评测驱动重写

4. **待优化的内容**：让用户粘贴原始提示词/对话消息/人设需求

如果用户需求明确（如"帮我把这个提示词结构化"），可跳过确认直接推荐最适合的模式。

### 第二步：选择元提示词模板

根据上述信息，从 `references/` 中读取对应的元提示词模板，理解其结构和约束：

```bash
# 示例：分析式优化
cat references/optimize-templates.md  # 读取模板内容
```

### 第三步：应用元提示词

**核心规则**：你作为 LLM，需要**双重角色执行**——

1. **首先**，将自己设定为元提示词中定义的"提示词优化专家"角色
2. **然后**，将用户的原始提示词作为 `{{originalPrompt}}` 证据注入元提示词的用户消息部分
3. **严格遵循**元提示词中所有约束（特别是：只重写不执行、保留变量占位符、不套代码块）

**关键约束（所有模板共有）**：
- ⚠️ **重写而非执行**：优化的是提示词文本本身，不是执行提示词中的任务
- ⚠️ **保留变量占位符**：`{{variable_name}}` 或 `{{=<% %>=}}{{var}}<%={{ }}=%>` 格式的变量必须逐字保留
- ⚠️ **不要前缀解释**：不输出"优化后的提示词："等引导语
- ⚠️ **不要代码块包围**：直接输出优化后的提示词正文
- ⚠️ **内容具体化**：将模板占位符（如 `[角色名称]`）替换为实际内容，而不是保留空泛模板

### 第四步：输出优化结果

直接输出优化后的提示词，**不加任何包装**。用户拿到的就是一个可以直接使用的优化版提示词。

如果用户选择了迭代模式（已有优化稿），将 `lastOptimizedPrompt` 和 `iterateInput` 注入迭代模板。

### 第五步：确认与迭代

输出后询问：
> 以上是优化后的提示词。是否需要进一步调整？可以告诉我具体的改进方向（如：更专业/更简短/增加某约束/调整角色定位等）。

## 快速参考：通用优化示例

用户输入：
```
帮我写代码
```

应用通用优化模板后输出大致结构：
```
# Role: 编程助手

## Profile
- language: 中文
- description: 专业的编程助手...
...
```

## 快速参考：步骤化规划示例

用户输入：
```
写一篇关于AI的文章
```

应用步骤化规划模板后输出大致结构：
```
# 任务：撰写关于人工智能的深度分析文章

## 1. 角色与目标
你将扮演一位资深科技撰稿人...

## 2. 背景与上下文
...

## 3. 关键步骤
1. 选题调研...
2. 框架搭建...
...

## 4. 输出要求
- 格式: Markdown
- 风格: 专业易懂
...
```

## 评测闭环（高级）

当需要对提示词进行系统性评估和改进时，使用完整评测驱动链路。

### 评测三阶段

| 阶段 | 模板 | 做什么 | 产出 |
|------|------|--------|------|
| **设计分析** | `references/evaluation-prompts.md#Analysis` | 仅分析提示词设计质量，不运行测试 | 5 维评分 + patchPlan |
| **执行评分** | `references/evaluation-prompts.md#Result` | 基于单次执行快照评分 | 4 维评分 + improvement |
| **多快照对比** | `references/evaluation-prompts.md#Compare` | 多版本/跨模型横向对比 | 5 维评分 + stopSignals |

### 评测驱动优化流程

1. **定义评测维度**：明确要在哪些方面评估提示词质量
2. **构造评测样本**：准备有代表性的输入-期望输出对
3. **设计分析**：用 Analysis 模板评估提示词设计质量
4. **执行并评分**：用 Result 模板对每次执行评分
5. **横向对比**：用 Compare 模板对比优化前后效果
6. **根据评测重写**：将评测结论注入 `references/evaluation-templates.md` 中的重写模板
7. **迭代**：重复 3-6 直到质量达标

### 高级评测模式

- **Structured Compare**（`references/evaluation-prompts.md#结构化对比`）：将复杂对比拆解为 Pair Judge → Synthesis 两阶段，适合需要逐对分析的场景
- **跨模型对比**：同一提示词在多个模型上运行，Compare 会自动分析跨模型差异并给出稳健性改进建议
- **Focus Brief 模式**：用户可指定聚焦问题，评测将优先围绕该问题展开

## 变量管理（高级）

对于包含变量的提示词模板，使用变量工具链：

1. **提取变量**：用 `references/variable-templates.md#变量提取` 识别可参数化的变化点
2. **生成值**：用 `references/variable-templates.md#变量值生成` 为变量推测合理的示例值
3. **组装测试**：用生成的值填充变量，构造完整的测试提示词

## 上下文感知优化（多轮对话）

当需要优化多轮对话中的某一条消息时，核心约束是**保持角色身份**——用户消息优化后不能变成助手回复。

1. **读取对话上下文**：了解前后消息的角色、风格、内容
2. **选择优化模板**：
   - 日常消息 → 通用消息优化（`references/context-templates.md#通用消息优化`）
   - 技术/分析消息 → 分析型优化（`references/context-templates.md#分析型优化`）
   - 已有提示词+上下文迭代 → 上下文感知迭代（`references/context-templates.md#上下文感知迭代`）
3. **应用模板**：注入对话上下文 JSON 和选中消息
4. **输出**：保持原角色身份的优化后消息

## 人格文件生成（SOUL.md）

这是一个特殊的优化类别：不是优化"执行任务的提示词"，而是生成"定义 AI 身份的长期人格文件"。

1. **了解需求**：用户想要什么样的 AI 人格？（气质、语气、互动风格、判断倾向）
2. **选择风格**：
   - 注重判断力和专业感 → Hermes-SOUL（`references/personality-templates.md#Hermes-SOUL`）
   - 注重关系感和陪伴感 → OpenClaw-SOUL（`references/personality-templates.md#OpenClaw-SOUL`）
3. **生成 SOUL.md**：将用户需求注入对应模板，输出结构化的 SOUL.md
4. **文件拆分判断**：如果需求中包含"如何称呼用户"等用户侧信息，自动拆分为 SOUL.md + USER.md
5. **后续迭代**：用 SOUL 定向迭代模板（`references/personality-templates.md#SOUL-定向迭代`）进行增量修改

## 注意事项

- **不要直接执行用户的原始提示词**——你的任务是优化它
- **变量占位符是生命线**——即使不理解含义也必须逐字保留
- **结构不等于模板**——输出的每个部分都要有具体内容，不要留空泛的 `[角色名称]` 占位符
- **选择正确的模板**——系统提示词和用户提示词的优化策略完全不同
- **迭代优于重写**——如果用户已有优化稿，优先使用迭代模式进行增量改进
- **上下文感知优化的角色保持**——对话消息优化必须保持原消息角色（user/assistant/system），用户消息优化后不能变成助手回复
- **人格文件不是任务提示词**——SOUL.md 定义的是"谁"，不是"做什么"
- **评测优先于重写**——先评测后重写，不要凭感觉改