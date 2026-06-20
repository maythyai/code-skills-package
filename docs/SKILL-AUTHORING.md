---
name: csp-skill-authoring
description: Skill 编写最佳实践 — 格式、结构、内容指南
---

# Skill 编写最佳实践

## 黄金规则

1. **触发明确**: 说明何时使用，何时不使用
2. **流程可执行**: 步骤是 imperative（祈使句），不是描述性文本
3. **内容可复用**: 聚焦方法论，不绑定特定工具版本
4. **长度适中**: 800-2000 字。超过 3000 字考虑拆分

## Frontmatter 标准

```yaml
---
name: csp-skill-slug          # kebab-case，以 csp- 开头
description: 何时用 + 做什么     # 动词开头，一句话
version: 0.1.0                # semver
layer: 4                      # 1=meta, 2=workflow, 4=patterns, 5=runtime
category: patterns            # 分类标签
origin: optional-source        # 迁移来源，可选
---
```

**必填字段**: name, description, layer, category

**常见错误**:
- 用 `csp-layer` 替代 `layer` → 必须是 `layer`
- 用 `level` 替代 `layer` → 必须是 `layer`
- description 过长（>120 字）→ 精简为一句话

## 推荐结构

```markdown
# Human-Readable Name

概述：什么场景下用，做什么。

## When to Use
- 触发条件 1
- 触发条件 2

## When NOT to Use
- 不触发场景

## Process
1. 第一步（具体动作）
2. 第二步
3. 第三步

## Key Principles
- 原则 1
- 原则 2

## Examples (可选)
具体示例或代码片段。

## Related Skills
- [[related-skill]] — 什么场景用那个
```

## 触发器设计

在 `registry.json` 中配置触发器：

```json
"triggers": {
  "keywords": ["review", "code quality"],      // 关键词匹配
  "file_patterns": ["*.rs", "Cargo.toml"],     // 文件模式匹配
  "context": ["review", "build"]               // 上下文匹配
}
```

**优先级**:
- `keywords`: 通用触发词，不要过度具体
- `file_patterns`: 语言/框架相关文件
- `context`: 任务上下文（review, build, debug, test 等）

## 层级选择

| 如果你的 skill... | 放到 |
|-------------------|------|
| 是方法论/工作方式（TDD, debugging, brainstorming） | L1 csp-meta |
| 是项目生命周期流程（plan, execute, verify, ship） | L2 csp-workflow |
| 是语言/框架特定模式（Python, Rust, React patterns） | L4 csp-patterns |
| 是运行时功能（auto-routing, memory, self-improve） | L5 csp-runtime |

## 测试 Checklist

1. **路径验证**: `node shared/scripts/audit-registry.js`
2. **Frontmatter**: `node shared/scripts/standardize-frontmatter.js --report`
3. **本地安装**: `./install.sh --platform claude-code --dry-run`
4. **内容审查**: 无 internal 依赖，无硬编码路径

## 拆分原则

一个 skill 只做一件事。如果出现以下情况，考虑拆分：

- 文件超过 3000 字
- "When to Use" 超过 5 个条件
- 包含两个以上独立的子流程
- 同时涉及 "代码审查" 和 "性能优化" 等不相关主题

## 从其他项目迁移

1. 保留原文档的方法论内容
2. 移除 internal 路径引用
3. 替换为 CSP 标准路径和工具名
4. 标注 `origin:` 来源
5. 调整 frontmatter 为标准格式
