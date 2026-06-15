---
name: csp-router
description: CSP 任务路由器 — 自动识别任务类型并加载合适的 skill 组合
version: 0.1.0
---

# CSP Router

当用户给出任务时,按以下步骤执行:

## 1. 信号抽取

从用户输入中提取:
- 关键词(如 "review", "debug", "plan", "test")
- 文件路径和模式
- 上下文(git 状态、PR 等)

## 2. 技术栈探测

扫描项目根目录,识别技术栈:
- package.json → TypeScript/JavaScript
- Cargo.toml → Rust
- go.mod → Go
- pyproject.toml → Python
- pom.xml / build.gradle → Java/Kotlin
- *.xcodeproj / Package.swift → Swift

## 3. 匹配 Skill

读取 registry.json,按 triggers 匹配:
- 关键词命中 → 直接激活
- 技术栈命中 → 加载对应 reviewer/patterns
- 上下文命中 → 加载对应 workflow

## 4. 输出激活列表

最多激活 5 个 skill,按层级排序:
L1(meta) → L2(workflow) → L3(spec) → L4(patterns) → L4(runtime)

## 5. 路由决策输出

输出格式:
```
## 路由决策
匹配 skills:
1. csp-xxx (L层) — 触发来源,置信度 N%
执行顺序: skill-a → skill-b
预计 Token 消耗: ~N tokens
```

## 6. 加载执行

按顺序读取每个激活 skill 的 SKILL.md,按指引执行。

## 信号优先级(从高到低)

1. **显式指令**:用户说"用 TDD 方式" → 强制加载对应 skill
2. **触发词匹配**:"review" → code-review 类
3. **文件类型探测**:.py → Python reviewer
4. **项目结构探测**:pyproject.toml → Python 技术栈
5. **历史偏好**:上次使用过的 skill 优先推荐

## 复杂任务判断

- **简单任务**(单一动作、明确 skill)→ 直接处理
- **复杂任务**(多步骤、需要规划、全链路)→ 交给 csp-auto DAG 编排引擎
