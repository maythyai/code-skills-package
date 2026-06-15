---
name: csp-contributing
description: 贡献指南 — 如何为 CSP 创建和提交新技能
---

# CSP 贡献指南

## 前置条件

1. Fork 本仓库并 clone
2. 阅读 [ARCHITECTURE.md](../ARCHITECTURE.md) 了解五层架构
3. 阅读 [SKILL-AUTHORING.md](./SKILL-AUTHORING.md) 了解 Skill 编写最佳实践

## 快速开始

### 1. 选择层级

| 层级 | 目录 | 放什么 |
|------|------|--------|
| L1 | `csp-meta/` | 元技能：brainstorming, TDD, debugging 等方法论 |
| L2 | `csp-workflow/` | 工作流：plan → execute → verify → ship |
| L4 | `csp-patterns/` | 技术库：语言/框架 patterns, reviewers, build-resolvers |
| L5 | `csp-runtime/` | 运行时：autopilot, ralph, wiki, remember |

### 2. 创建 Skill 目录

```bash
mkdir -p csp-patterns/skills/<your-skill-slug>/
```

### 3. 复制模板

```bash
cp shared/templates/SKILL-TEMPLATE.md csp-patterns/skills/<your-skill-slug>/SKILL.md
```

### 4. 填写内容

- `name`: kebab-case slug（如 `csp-python-patterns`）
- `description`: 一句话描述，动词开头，说明何时使用
- `layer`: 对应层级（1/2/4/5）
- `category`: 分类标签（如 `patterns`, `reviewer`, `meta`）
- `origin`: 如果是从其他项目迁移来的，标注来源

### 5. 注册到 registry

在 `csp-router/registry.json` 的 `skills` 数组中添加条目：

```json
{
  "name": "csp-your-skill",
  "description": "描述文本",
  "layer": 4,
  "category": "your-category",
  "triggers": {
    "keywords": ["keyword1", "keyword2"],
    "file_patterns": ["*.ext"],
    "context": ["review", "build"]
  },
  "stack_detection": false,
  "path": "csp-patterns/skills/your-skill-slug/SKILL.md",
  "deps": [],
  "priority": 10
}
```

### 6. 验证

```bash
# 检查路径一致性
node shared/scripts/audit-registry.js

# 检查 frontmatter
node shared/scripts/standardize-frontmatter.js --report

# 本地安装测试
./install.sh --platform claude-code --dry-run
```

### 7. 提交 PR

```bash
git add csp-patterns/skills/your-skill-slug/
git add csp-router/registry.json
git commit -m "feat: add csp-your-skill — description"
git push origin your-branch
```

## PR Checklist

- [ ] SKILL.md 包含标准 frontmatter（name/description/layer/category）
- [ ] 路径已在 registry.json 注册
- [ ] `audit-registry.js` 无 MISSING paths
- [ ] `standardize-frontmatter.js --report` 无错误
- [ ] 内容无 OMC/internal 依赖

## 命名约定

- Skill slug: `csp-<name>` kebab-case
- 目录名与 slug 一致（去掉 `csp-` 前缀）
- 避免缩写，使用完整单词

## 常见错误

1. **路径错误**: registry path 必须指向真实存在的 SKILL.md
2. **缺少 frontmatter**: name/description/layer 三个字段必须存在
3. **重复触发器**: 检查 triggers.yaml 是否与已有 skill 冲突
4. **内部依赖**: 不要引用 OMC 或其他外部项目的内部路径
