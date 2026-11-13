---
name: csp-writing-skills
description: >
  Use when creating new CSP skills, editing existing skills, or verifying skills
  meet quality standards before release. Covers frontmatter, body structure,
  quality tiers, CSO, token budgets, and RED-GREEN-REFACTOR testing.
  Keywords: write skill, create skill, edit skill, skill quality, skill template,
  编写技能, 创建技能, 技能模板, CSO, token budget.
version: "2.0.0"
layer: 1
category: meta
type: technique
domain: architecture
phase: define
role: specialist
scope: design
tools: [Read, Write, Edit, Glob, Grep]
related_skills:
  - csp-tdd
  - csp-scope-guard
  - csp-prompt-optimizer
anti_rationalizations:
  "This skill is too simple to need a full template": "Simple skills still need When to Use, Process, and Verification. The template scales down — skip sections, don't skip structure."
  "I'll add examples later": "Examples define the contract. Without them, every user interprets the process differently. Later never comes."
  "I know this domain well enough to skip the checklist": "Expertise is where blind spots live. The checklist catches what intuition misses."
  "Batching multiple skills is more efficient": "Each skill needs its own RED-GREEN-REFACTOR cycle. Batch-testing dilutes the signal — you won't know which skill fixed which failure."
---

# Writing Skills

CSP 技能编写方法论 — 从模板到验证的完整流程，包含质量评级、类型分类和 token 预算。

## Purpose

本技能指导如何创建符合 v3 规范的 CSP skill。覆盖 frontmatter 填写、body 结构选择、
CSO 优化、RED-GREEN-REFACTOR 测试循环，以及最终的质量自检。

## When to Use

- ✅ 创建新的 CSP skill
- ✅ 编辑现有 skill 的 frontmatter 或 body
- ✅ 验证 skill 是否符合质量标准
- ✅ 将 v1/v2 skill 迁移到 v3 规范
- ❌ 编写非 CSP 的 Claude skill（用通用 Agent Skills 规范）
- ❌ 编写项目级 CLAUDE.md（CLAUDE.md 有不同格式要求）
- ❌ 纯文档/README 修改

## Quality Tiers

创建 skill 前先决定目标质量等级：

| Tier | Name | 最小要求 | 目标 Token | 适用场景 |
|------|------|---------|-----------|---------|
| **A** | Reference | 全部 Required Sections + 表格 + 代码示例 + 验证清单 | 300-800 | 高频使用的核心 skill、guardian skill |
| **B** | Standard | 核心 sections（Purpose, When to Use, Process, Verification）+ 代码示例 | 200-500 | 大多数新 skill 的默认目标 |
| **C** | Basic | 最小结构（Purpose, When to Use, Process） | 100-300 | 轻量 reference skill、实验性 skill |

选择指南：
- **Guardian / discipline skill** → Tier A（需要 Rationalization Defense 和 Anti-Patterns）
- **Workflow skill** → Tier B 或 A（需要 Routing Logic 和 Completion Signal）
- **Pattern / technique skill** → Tier B
- **Reference skill** → Tier C 或 B（可选，以简洁为优先）

## Skill Type Classification Matrix

每种 skill 类型有不同的结构要求。下面是对照表（R=Required, r=Recommended, o=Optional）：

| Section | technique | pattern | reference | workflow | guardian |
|---------|:---------:|:-------:|:---------:|:--------:|:--------:|
| Purpose | **R** | **R** | **R** | **R** | **R** |
| When to Use | **R** | **R** | **R** | **R** | **R** |
| When NOT to Use | r | r | r | **R** | **R** |
| Routing/Dispatch Logic | o | o | o | **R** | **R** |
| Process (numbered steps) | **R** | **R** | r | **R** | **R** |
| Key Principles | r | **R** | r | r | **R** |
| Anti-Patterns | r | r | r | r | **R** |
| Rationalization Defense | o | o | o | o | **R** |
| Verification Checklist | **R** | **R** | r | **R** | **R** |
| Completion Signal | o | o | o | **R** | o |
| Examples | **R** | **R** | **R** | r | r |
| Related Skills | r | r | r | **R** | r |

### Type Definitions

- **technique**: 具体方法，有步骤可遵循（如 TDD、systematic debugging）
- **pattern**: 思维模式/设计范式（如 scope guard、flatten with flags）
- **reference**: API 文档、语法指南、工具参考（如 csp-code-wiki）
- **workflow**: 项目生命周期阶段或编排（如 csp-plan-phase、csp-simple-dev）
- **guardian**: 强制执行纪律的技能（如 csp-tdd、csp-scope-guard）

## Process: Skill Creation Cycle

### Phase 1: Plan — Choose template and set structure

1. **确定 skill 类型** — 从上表选择 technique/pattern/reference/workflow/guardian
2. **选择质量等级** — Tier B 为新 skill 默认目标
3. **复制模板**：
   ```bash
   cp shared/templates/SKILL-TEMPLATE-v3.md csp-<layer>/skills/<slug>/SKILL.md
   ```
4. **标注 Required Sections** — 根据类型对照表，标记哪些 section 必须写

**检查点**：SKILL.md 文件存在，frontmatter 已填写 name/description/layer/category/type

### Phase 2: RED — Test baseline without skill

在写 skill 之前，先运行 baseline 测试：

1. **创建压力场景** — 对于 guardian skill，至少 3 种组合压力
2. **运行场景（无 skill）** — 记录 Agent 的基线行为，逐字记录借口
3. **识别模式** — Agent 用了哪些合理化借口？在哪些地方偏离预期？

```
RED 输出示例：
- 压力场景：要求快速改 bug 时不写测试
- Agent 借口："This is too simple to test" / "I'll add tests later"
- 基线行为：直接改代码，跳过所有验证步骤
```

**红线**：不跑 RED 就开始写 skill = 未经测试的代码，删除重来。

### Phase 3: GREEN — Write minimal skill

1. **写 description** — 用 "Use when..." 开头 + 中英文关键词
2. **写 Purpose** — 1-2 句核心价值
3. **写 When to Use** — ✅/❌ 格式，具体可检测条件
4. **写 Process** — 编号步骤，每步有检查点和红线
5. **写 Verification Checklist** — 3+ 可客观验证的 checkbox
6. **写 Examples** — 1-2 个具体场景（一个优秀 > 十个泛化）
7. **写 Anti-Patterns** — 表格格式，常见错误 + 信号 + 修正
8. **添加 frontmatter 的 anti_rationalizations** — 直接反驳 RED 阶段记录的借口

**CSO 规则（Claude Search Optimization）：**
- description 只描述何时使用，不描述 skill 做了什么
- 关键词覆盖：错误信息、症状、同义词、工具名
- 关联 skill 使用 `[[wiki-link]]` 格式，附带 "— 在 X 场景使用"
- 表格优于叙述段落（扫描速度更快）

**Token 效率：**
- L1 meta: 目标 ~300 tokens
- L2 workflow: 目标 ~500 tokens
- L3 patterns: 目标 ~200-600 tokens
- L4 runtime: 目标 ~300 tokens
- 超预算时：拆分 heavy reference 到单独文件

### Phase 4: REFACTOR — Close loopholes

1. **运行 skill（有 skill）** — 验证 Agent 现在按要求行事
2. **识别新的借口** — Agent 找到了哪些新的绕行方式？
3. **补上漏洞** — 在 anti_rationalizations 中添加新借口和反驳
4. **重复直到稳定** — 至少 3 轮，直到 Agent 不再产生新的绕行

**REFACTOR 退出条件**：
- 连续 3 轮无新借口
- 所有 RED 阶段识别的借口已被反驳
- 所有压力场景通过

### Phase 5: Deploy — Register and verify

1. **注册到 registry.json**
2. **添加 trigger words** 到 triggers.yaml（中英文）
3. **更新 SKILL-INDEX.md**
4. **运行验证**：
   ```bash
   node scripts/validate-skill-v3.mjs <skill-path>
   npm run validate:all
   npm run build:all
   npm test
   ```

## Anti-Patterns

| Anti-Pattern | 信号 | 修正 |
|-------------|------|------|
| 叙事故事 | "小明想加一个按钮，于是他…" | 直接指令："要加按钮，做 X" |
| 多语言稀释 | Python, JS, Go 各一个示例 | 一种语言，一个出色示例 |
| 流程图中的代码 | Graphviz 节点含代码片段 | 代码放在 markdown 块中 |
| 纯描述无示例 | "这个 skill 帮助调试"（无场景） | 至少一个输入→处理→输出示例 |
| 跳过 RED | 直接写 skill body | 删除。先跑 baseline 测试 |
| "先留着参考" | 未测试的代码保留 | 删除或跑测试 |
| 批量创建 | 一次写多个 skill 不测试 | 每个 skill 独立 RED-GREEN-REFACTOR |

## Verification Checklist

- [ ] `type` field 在 frontmatter 中设置（technique/pattern/reference/workflow/guardian）
- [ ] Description 以 "Use when..." 开头，含中英文关键词
- [ ] Required Sections 根据类型对照表全部存在
- [ ] Process 步骤编号，每步有检查点和红线
- [ ] Verification Checklist 有 3+ 可客观验证的 checkbox
- [ ] 至少 1 个具体示例（输入→处理→输出）
- [ ] Anti-Patterns 表格包含常见错误 + 检测信号
- [ ] anti_rationalizations 反驳了 RED 阶段记录的所有借口
- [ ] Token 数在所属层级的预算范围内
- [ ] 通过了至少 3 轮 RED-GREEN-REFACTOR 循环
- [ ] `node scripts/validate-skill-v3.mjs --strict` 通过
- [ ] 本 skill 自身符合其定义的 Tier A 质量标准（自指一致性）

## Related Skills

- [[csp-tdd]] — 理解 RED-GREEN-REFACTOR 为何适用于 skill 编写
- [[csp-scope-guard]] — 防止 skill 编写中范围蔓延
- [[csp-prompt-optimizer]] — 优化 skill 中的 prompt 模式

## Self-Referential Check

本 skill (`csp-writing-skills`) 应符合其自身定义的质量标准：

| 要求 | 状态 |
|------|------|
| type: technique | ✅ |
| Description 以 "Use when..." 开头 | ✅ |
| All Required Sections for technique 类型 | ✅ Purpose, When to Use, Process, Verification, Examples |
| Tier B 结构 | ✅ 含 Anti-Patterns, Related Skills |
| 中英文关键词 | ✅ |
| Process 有检查点和红线 | ✅ RED 阶段红线 |
| 3+ Verification checkbox | ✅ 12 items |
| ≥1 具体示例 | ✅ RED 输出示例 |
| Token 预算 (L1 ~300) | ✅ |