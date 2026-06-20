---
name: csp-skill-creator
description: Interactive skill creation wizard — guides users through creating new CSP skills with templates, validation, and registry registration
layer: 5
category: runtime
---

# Skill Creator — 交互式技能创建向导

## When to Use

- 用户想要创建新的 CSP skill
- 需要标准化的 skill 模板和 frontmatter
- 需要自动注册到 registry.json

## When NOT to Use

- 修改已有 skill（直接编辑即可）
- 仅需要了解 skill 编写规范 → 参考 `docs/SKILL-AUTHORING.md`

## Process

1. **收集信息**: 询问用户以下信息
   - Skill 名称（kebab-case slug，如 `csp-python-patterns`）
   - 一句话描述
   - 所属层级（1=meta, 2=workflow, 4=patterns, 5=runtime）
   - 分类标签
   - 是否从其他项目迁移（如果是，标注 origin）

2. **确定目录路径**:
   - Layer 1 → `csp-meta/skills/<slug>/`
   - Layer 2 → `csp-workflow/skills/<slug>/`
   - Layer 4 → `csp-patterns/skills/<slug>/`
   - Layer 5 → `csp-runtime/skills/<slug>/`

3. **生成 SKILL.md**: 使用模板（见下方）填充 frontmatter 和基础结构

4. **注册到 registry.json**: 在 `csp-router/registry.json` 的 skills 数组中添加新条目

5. **验证**:
   - 运行 `node shared/scripts/audit-registry.js` 检查路径
   - 运行 `node shared/scripts/standardize-frontmatter.js --report` 检查 frontmatter
   - 运行 `./install.sh --dry-run --platform claude-code` 预览安装

6. **提交**: 建议用户 git add + commit

## Template

```markdown
---
name: csp-skill-creator
description: <description>
version: 0.1.0
layer: <layer>
category: <category>
---

# <Human Name>

<Overview>

## When to Use
- <trigger 1>
- <trigger 2>

## Process
1. <step 1>
2. <step 2>

## Key Principles
- <principle 1>
```

## Registry Entry Template

```json
{
  "name": "<slug>",
  "description": "<description>",
  "layer": <layer>,
  "category": "<category>",
  "triggers": {
    "keywords": [],
    "file_patterns": [],
    "context": []
  },
  "stack_detection": false,
  "path": "<layer-dir>/skills/<slug>/SKILL.md",
  "deps": [],
  "priority": 10
}
```

## Validation Rules

- `name` 必须以 `csp-` 开头，kebab-case
- `description` 不超过 120 字符
- `layer` 必须是 1, 2, 4, 或 5
- `path` 必须指向实际存在的 SKILL.md 文件
- 不能与 registry 中已有 skill 重名
