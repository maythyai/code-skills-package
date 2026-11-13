# CSP Skill 质量指南

**Version:** 1.0.0
**Based on:** TRL project engineering conventions + CSP v3 SKILL-SPEC

---

## 概述

本文档定义 CSP skill 的质量标准，帮助贡献者创建一致、可发现、可维护的技能。
设计原则借鉴 TRL 项目（HuggingFace Transformers Reinforcement Learning）的工程实践：

1. **简洁性优先** — 内联优于抽象，30 行清晰指令 > 80 行防御性包装
2. **自包含** — 每个 skill 独立可理解，不依赖隐式上下文
3. **一致性** — 同类 skill 遵循相同结构，变量名/控制流/注释对齐
4. **可测试** — 每个流程步骤有验证检查点，反模式有检测信号

---

## 质量评级体系

### Tier A: Reference（参考级）

全部 Required Sections + 推荐 Sections 均存在。

**特征：**
- 完整的 frontmatter（含 type、triggers、anti_rationalizations）
- 所有 Required Sections 按类型对照表齐全
- 表格驱动的对比/参考内容
- 至少 1 个代码示例（最小可运行）
- Verification Checklist 含 5+ 可客观验证的 checkbox
- Anti-Patterns 表格含检测信号和修正
- Token 在层级预算范围内

**参考 skill：** `csp-writing-skills`, `csp-simple-dev`, `csp-brainstorming`

### Tier B: Standard（标准级）

核心 Required Sections 存在 + 代码示例。

**特征：**
- 完整的 frontmatter
- Purpose, When to Use, Process, Verification Checklist, Examples 齐全
- 至少 1 个代码示例
- Verification Checklist 含 3+ checkbox
- Token 在层级预算范围内

**适用于大多数新 skill。**

### Tier C: Basic（基础级）

最小结构：Purpose, When to Use, Process。

**特征：**
- 最小 frontmatter（name, description, layer, category）
- 三段 body 结构
- Token 通常 < 200
- 无代码示例要求

**适用于：** 轻量 reference skill、实验性 skill、过渡性 skill。

---

## 技能类型分类

| 类型 | 描述 | 最小 Required Sections | 示例 |
|------|------|----------------------|------|
| **technique** | 具体方法，有步骤可遵循 | Purpose, When to Use, Process, Verification, Examples | csp-tdd, csp-writing-skills |
| **pattern** | 思维模式/设计范式 | Purpose, When to Use, Process, Key Principles, Verification, Examples | csp-scope-guard |
| **reference** | API 文档、语法指南、工具参考 | Purpose, When to Use, Examples | csp-code-wiki |
| **workflow** | 生命周期阶段或编排 | Purpose, When to Use, When NOT, Routing, Process, Verification, Completion Signal, Related Skills | csp-simple-dev, csp-plan-phase |
| **guardian** | 强制执行纪律 | Purpose, When to Use, When NOT, Routing, Process, Key Principles, Anti-Patterns, Rationalization Defense, Verification | csp-tdd, csp-scope-guard |

---

## 描述编写指南

### 好的描述

遵循 CSO（Claude Search Optimization）原则：

1. **以 "Use when..." 开头** — 描述触发条件，不是 skill 功能
   ```yaml
   description: >
     Use when creating new CSP skills, editing existing skills, or verifying skills
     meet quality standards before release. Covers frontmatter, body structure,
     quality tiers, CSO, token budgets, and RED-GREEN-REFACTOR testing.
     Keywords: write skill, create skill, edit skill, 编写技能, 创建技能.
   ```

2. **包含中英文关键词** — 结尾附带 Keywords 列表

3. **保持 ≤500 字符** — 短描述加载更快

### 不好的描述

```yaml
# ❌ 描述了功能而非触发条件
description: A skill that helps with writing and testing new CSP skills.

# ❌ 太短，无法触发路由
description: Plan phase.

# ❌ 缺少关键词
description: Use when you need to debug.
```

---

## Token 预算指南

| 层级 | 目录 | 目标 Token | 超标时 |
|------|------|-----------|--------|
| L1 | csp-meta | ~300 | 拆分 heavy reference 到单独文件 |
| L2 | csp-workflow | ~500 | 拆分详细流程指南到 reference 文件 |
| L3 | csp-patterns | ~200-600 | 拆分语言特定参考到单独文件 |
| L4 | csp-runtime | ~300 | 拆分 agent 特定配置到单独文件 |

**Token 节省技巧：**
- 用表格替代叙述段落进行对比
- 用精炼的 bullet list 替代散文
- 一个优秀示例 > 多个泛化模板
- 用 wiki-link 交叉引用，避免重复内容
- API 参考和语法指南移到单独文件

---

## 内容卫生规则

- **禁止作者信息** — 无 `author:` 字段、个人姓名、署名脚注
- **禁止 LICENSE 文件** — skill 目录内不得含 LICENSE/NOTICE/COPYING
- **禁止谱系字段** — `origin:` 禁止（含 `metadata:` 内嵌）
- **禁止内部 URL** — `*.alibaba-inc.com`, `*.antfin.com` 等
- **禁止个人环境硬编码** — 本地路径/端口参数化
- **禁止构建产物** — `__pycache__/`, `*.pyc`, `*.bak`, `.DS_Store`
- **移植技能需验证许可证** — NC/SA 等限制性条款内容禁止引入 MIT 包

---

## 常见反模式

| 反模式 | 信号 | 修正 |
|--------|------|------|
| 叙事故事 | "小明想加一个按钮，于是他…" | 直接指令："要加按钮，做 X" |
| 多语言稀释 | Python, JS, Go 各一个示例 | 一种语言，一个出色示例 |
| 纯描述无示例 | 无输入→处理→输出流程 | 至少一个具体场景 |
| 跳过 RED | 直接写 skill body | 删除。先跑 baseline 测试 |
| 批量创建 | 一次写多个 skill 不独立测试 | 每个 skill 独立 RED-GREEN-REFACTOR |
| "先留着参考" | 未测试的代码保留 | 删除或跑测试 |
| 过度规格化 | skill 比被指导的代码还长 | 精简到核心流程，拆 reference |

---

## 验证命令

```bash
# 检查单个 skill 的 v3 合规性
node scripts/validate-skill-v3.mjs csp-meta/skills/csp-writing-skills/SKILL.md

# 严格模式（section 缺失 = error）
node scripts/validate-skill-v3.mjs <path> --strict

# 详细模式（显示所有通过的文件）
node scripts/validate-skill-v3.mjs csp-meta/ --verbose

# 完整验证套件
npm run validate:all
npm run build:all
npm test
```

---

## 参考

- [SKILL-SPEC.md](SKILL-SPEC.md) — 完整 v3 规范
- [SKILL-TEMPLATE-v3.md](../../shared/templates/SKILL-TEMPLATE-v3.md) — v3 增强版模板
- [CONTRIBUTING.md](../../CONTRIBUTING.md) — 贡献指南
- [csp-writing-skills SKILL.md](../../csp-meta/skills/csp-writing-skills/SKILL.md) — 技能编写方法论