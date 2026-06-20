---
name: csp-router
description: >
  CSP 任务路由器 — 状态感知 + 置信度评分 + 知识图谱增强的智能路由。
  自动识别任务类型并加载最合适的 skill 组合。
layer: 0
category: router
phase: plan
domain: architecture
tools: [Read, Glob, Grep]
---

# CSP Router

状态感知 + 置信度评分 + 知识图谱增强的智能路由系统。

## 路由流程

### 1. 状态检测 (Pre-Router Hook)

`state-detector.mjs` 自动检测并注入上下文:

| 信号 | 检测方式 | 示例值 |
|------|---------|--------|
| git_status | `git status --porcelain` | clean, dirty, conflict |
| tech_stack | 项目文件扫描 | python, typescript, go |
| phase | 目录结构分析 | planning, building, testing |
| test_status | 测试结果文件 | passing, failing, unknown |

状态写入 `.csp/state.json`，供后续步骤使用。

### 2. 关键词 + 意图匹配

- **触发词匹配**: `triggers.yaml` → 候选 skills
- **意图分类**: `intent_patterns` → 语义匹配
- **技术栈匹配**: `stack_rules` → 语言/框架特定 skills

### 3. SDD 状态感知路由

基于 `.csp/artifacts/` 下的文件自动判断当前开发阶段：

| 已有 artifact | 当前阶段 | 推荐下一步 |
|---------------|---------|-----------|
| 无 | 初始 | understand (codebase-mapper) |
| understand.md | 理解完成 | plan (writing-plans) |
| plan.md | 计划完成 | spec (spec-contract) |
| spec.md | 规范完成 | implement (tdd + executing-plans) |
| implement.md | 实现完成 | review (code-review) |
| review.md | 审查完成 | verify (verification) |

路由规则定义在 `triggers.yaml` 的 `sdd_state_routing` 段。

### 4. 正则模式匹配层

在关键词匹配之上，增加正则 pattern 匹配以提高模糊意图的命中率：

- 支持正则表达式（如 `re\\s*factor` 匹配 "refactor", "re factor"）
- 支持多词组合（如 `production.*issue`）
- 定义在 `triggers.yaml` 的 `intent_patterns` 段中以 `patterns:` 字段

与关键词匹配的关系：
1. 关键词精确匹配 → confidence 0.9
2. 正则模式匹配 → confidence 0.7
3. 意图推断 → confidence 0.5

### 5. 置信度评分

```
confidence = keyword_score × 0.4
           + intent_score × 0.3
           + context_score × 0.3
```

Context score 考虑:
- 当前 phase 与 skill phase 匹配 → +0.2
- 技术栈与 skill domain 匹配 → +0.15
- Git 状态 (dirty → 偏向 debug skills)

### 6. 路由决策

| 置信度 | 决策 |
|--------|------|
| > 80% | 直接路由到 top skill |
| 50-80% | 展示 top 3，让用户确认 |
| < 50% | 回退到 `/csp-interview-me` 深度访谈 |

### 7. SKPG 增强 (可选)

读取 `csp-router/skpg/graph.json` 进行:
- **依赖检查**: 激活的 skill 是否有前置依赖？
- **影响分析**: 如果修改 skill X，哪些其他 skill 受影响？
- **路径查找**: skill A 到 skill B 的最短路径

### 8. 输出格式

```
## 路由决策

**状态**: git=clean | lang=python | phase=building

**匹配 skills** (置信度):
1. csp-tdd [build] — 78%
2. csp-implementation-phase [build] — 65%
3. csp-python-reviewer [review] — 35%

**决策**: Top 3 候选 — 请确认

**SKPG 提示**: csp-tdd 依赖 csp-spec-contract
```

## 信号优先级 (从高到低)

1. **显式指令**: 用户说"用 TDD 方式" → 强制加载
2. **高置信度匹配**: >80% → 直接路由
3. **上下文增强**: 状态检测调整权重
4. **技术栈探测**: 语言/框架匹配
5. **历史偏好**: 上次使用的 skill 优先

## 文件参考

| 文件 | 用途 |
|------|------|
| `triggers.yaml` | 触发词 → skill 映射 |
| `skill-metadata.yaml` |  元数据集中注册 |
| `registry.json` | 全量 skill 注册表 |
| `csp-router/skpg/graph.json` | 技能知识图谱 |
| `.csp/state.json` | 当前项目状态快照
