---
# SKILL-TEMPLATE-v3.md — CSP Skill 增强版模板
#
# 用法：复制本文件到 <layer-dir>/skills/<your-skill-slug>/SKILL.md，删除注释行（以 # 开头），
# 填入实际内容。不要保留注释。
#
# 设计原则（借鉴 TRL AGENTS.md）：
#   - 简洁性优先：内联优于引用，30 行清晰指令 > 80 行防御性包装
#   - 自包含：每个 skill 独立可理解，不依赖隐式上下文
#   - 一致性：同类 skill 遵循相同结构，变量名/控制流/注释对齐
#   - 可测试：每个流程步骤有验证检查点，反模式有检测信号
#
# Frontmatter 字段参考（参见 docs/reference/SKILL-SPEC.md）：
#   必填: name, description, layer, category
#   v2 推荐: version, phase, domain, role, scope, tools, triggers,
#            dependencies, related_skills, anti_rationalizations
---
name: csp-<skill-slug>                          # kebab-case, csp- 前缀
description: >                                   # Use when [trigger], [context], [outcome].
  Use when [specific triggering condition].
  Include symptoms, situations, and contexts that trigger this skill.
  Keywords: [逗号分隔的中英文关键词].
version: "0.1.0"                                 # SemVer
layer: <1|2|3|4>                                 # 1=meta 2=workflow 3=patterns 4=runtime
category: <meta|workflow|patterns|runtime>
phase: <define|plan|build|verify|review|ship>    # 生命周期阶段
domain: <language|quality|security|architecture|devops|database|testing|api|patterns|other>
role: <specialist|reviewer|guardian|orchestrator> # 技能角色
scope: <implementation|review|analysis|design|testing>  # 工作范围
tools: [Read, Write, Edit, Glob, Grep, Bash]     # 所需工具权限

dependencies:
  skills: []                                     # 必须在此之前加载的 skill

related_skills:                                  # 互补/后续 skill
  - csp-related-skill-name                       # — 在什么场景下使用

triggers:                                        # 触发条件（增强路由精度）
  keywords: ["keyword1", "keyword2", "中文关键词"]
  patterns: []                                   # 正则匹配
  intents: []                                    # 自然语言意图
  context: []                                    # 会话状态上下文

anti_rationalizations:                           # 防止 Agent 跳过关键步骤
  "常见借口 1": "为什么这个借口不成立的理由。"
  "常见借口 2": "具体反驳，引用经验数据更佳。"

---

# <Human-Readable Skill Name>

<!-- Purpose: 1-2 句话说明这个 skill 做什么，核心价值是什么。 -->

<简述本 skill 的核心目的和价值。>

## When to Use

<!-- 列出明确的触发条件。使用 ✅/❌ 或表格格式。 -->

- ✅ <触发条件 1 — 具体、可检测的场景>
- ✅ <触发条件 2>
- ❌ <不适用条件 1 — 避免误路由>
- ❌ <不适用条件 2>

## When NOT to Use

<!-- 边界清晰。如果不适用条件已在上面列出，此段可合并。 -->

## Routing / Dispatch Logic

<!--
  仅 routing 类 skill 需要此段。
  描述从本 skill 到其他 skill 的分发逻辑。
  使用表格格式：信号 → 路由目标 → 理由。
-->

| 信号 | 路由到 | 理由 |
|------|--------|------|
| <检测到的信号> | `<target-skill>` | <为什么路由到这里> |

## Process

<!--
  核心流程，按步骤编号。
  每步包含：动作 + 检查点 + 红线（不可逾越的约束）。
  参考 csp-simple-dev 的 Step 1-5 结构。
-->

### Step 1: <步骤名称>（<预计耗时>）

<步骤描述 — 做什么、为什么做。>

**检查点**：<完成本步的验证条件>

**红线**：
- <不可违反的约束 1>
- <不可违反的约束 2>

### Step 2: <步骤名称>

...

## Key Principles

<!-- 3-5 条核心原则，每条一句话。参考 TRL 的简洁性。 -->

- **<原则名>**：<一句话解释>
- **<原则名>**：<一句话解释>

## Anti-Patterns / Red Flags

<!--
  常见错误模式和检测信号。
  使用表格格式增强可读性。
-->

| Anti-Pattern | 信号 | 正确做法 |
|-------------|------|---------|
| <反模式描述> | <如何检测> | <应该怎么做> |

## Rationalization Defense

<!--
  仅 guardian/discipline 类 skill 需要此段。
  列出 Agent 可能用来绕过的借口及其反驳。
  也可见 frontmatter 的 anti_rationalizations。
-->

| 常见借口 | 反驳 |
|---------|------|
| "<借口>" | <为什么这不对，用数据/逻辑反驳> |

## Verification / Completion Checklist

<!--
  完成本 skill 后的自检清单。
  用 checkbox 格式，每项可验证。
-->

- [ ] <检查项 1 — 可被客观判断>
- [ ] <检查项 2>
- [ ] <检查项 3>

## Completion Signal

<!--
  可选。完成信号，供下游 skill 检测是否可跳过本阶段。
  参考 csp-simple-dev 的 completion_signal YAML。
-->

```yaml
completion_signal:
  output: <生成的产物类型>
  next_step:
    recommended: <推荐下一步 skill>
    alternatives:
      - <备选 1>
      - <备选 2>
  status:
    phase: <当前阶段>
    ready_for: [<下游阶段>]
```

## Examples

<!--
  1-2 个具体示例。一个简洁示例胜过十个泛化模板。
  参考 TRL trainer 的 quickstart 示例风格：最小可运行代码。
-->

### Example 1: <场景描述>

```
输入: <用户输入示例>
处理: <简述处理过程>
输出: <预期结果>
```

### Example 2: <场景描述>

```
输入: ...
```

## Related Skills

<!--
  使用双括号 wiki-link 格式。
  每个关联 skill 附带一行说明：在什么场景下需要它。
-->

- [[csp-related-1]] — 在 <场景> 时使用
- [[csp-related-2]] — 在 <场景> 时使用

---

<!--
  Token 预算指导（参考，不写入最终 skill）：
  | 层级 | 目录 | 推荐 token 预算 |
  |------|------|----------------|
  | L1   | csp-meta | ~300 tokens |
  | L2   | csp-workflow | ~500 tokens |
  | L3   | csp-patterns | ~200-600 tokens |
  | L4   | csp-runtime | ~300 tokens |

  超出预算时考虑：
  - 将 heavy reference（100+ 行）移到单独的 reference 文件
  - 将可复用工具/脚本移到 shared/ 目录
  - 压缩代码示例到最精简可运行版本
  - 用表格替代叙述段落
-->