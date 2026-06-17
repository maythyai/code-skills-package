# CSP — Code Skills Package

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![v0.5.0](https://img.shields.io/badge/version-0.5.0-green)](./ARCHITECTURE.md)

**统一 AI 编程技能 · 18 个平台 · 15+ 语言**

整合多个开源 AI 编程项目为分层自动路由框架。

[快速开始](#快速开始) · [架构](#架构) · [使用方式](#使用方式) · [English](./README.md)

</div>

---

CSP（Code Skills Package）将多个开源 AI 编程项目的能力整合为分层架构，支持自动路由技能、按需加载和组合工作流，以极低的token完成任务。

## 快速开始

### 安装

**更多完整命令参考：** [docs/INSTALL.md](./docs/INSTALL.md) | [更新指南](./docs/UPDATE.md)

```bash
# 自动检测 AI 工具并安装
./install.sh

# 全局安装
./install.sh --platform cursor --global

# 指定平台安装（支持 18 个平台）
./install.sh --platform claude-code
./install.sh --platform cursor
./install.sh --platform trae

# 安装到任意目标目录（无需克隆本项目）
./install.sh --platform cursor --target /path/to/your/project

# 一行远程安装（无需克隆本项目）
curl -fsSL https://raw.githubusercontent.com/chensaics/code-skills-package/master/install.sh | bash -s -- --platform cursor

# 远程安装到指定目标目录
curl -fsSL https://raw.githubusercontent.com/chensaics/code-skills-package/master/install.sh | bash -s -- --platform cursor --target /path/to/your/project

# npm 全局安装
npm install -g code-skills-package
cd /your/project && csp-install --platform cursor

# 卸载
./install.sh --uninstall
./install.sh --uninstall --global

# 列出检测到的平台
./install.sh --list
```

## 使用方式

### 自然语言（推荐）

在项目 `CLAUDE.md` 中添加：

```markdown
使用 CSP (Code Skills Package) 技能包。当用户给出任务时，先通过 csp-router 路由到合适的 skill 组合。
```

| 输入 | 结果 |
|------|------|
| `"帮我做个 code review"` | 加载 `csp-code-review` + 语言专项 reviewer |
| `"规划并实现用户认证功能"` | brainstorming → spec → plan → execute → tdd → review → verify → ship |
| `"这个 Django 项目有个 bug"` | 加载 `csp-debug` + `csp-django-patterns` |

### 斜杠命令

```bash
/csp-plan          # 规划阶段
/csp-debug         # 调试流程
/csp-review        # 代码审查
/csp-test          # 测试流程
/csp-ship          # 发布流程
/csp-spec-phase    # 需求澄清
/csp-execute-phase # 执行计划
/csp-verify        # 验证实现
/csp-search <query> # 搜索 skill 索引
```

### 直接调用

```markdown
加载 csp-react-reviewer 审查这段代码
加载 csp-plan-phase 规划这个功能
```

## 架构

CSP 采用分层架构。仅路由器（L0）在会话启动时加载，其余层级按需加载。

```
┌─────────────────────────────────────────────────────────┐
│  L0  csp-router     会话启动（~800 tokens）              │
│                   任务分类 + skill 选择                   │
├─────────────────────────────────────────────────────────┤
│  L1  csp-meta       方法论（~300 tokens/skill）           │
│     规划 · 调试 · TDD · 头脑风暴                          │
├─────────────────────────────────────────────────────────┤
│  L2  csp-workflow   项目管理（~500 tokens/skill）         │
│     plan → execute → verify → ship                      │
├─────────────────────────────────────────────────────────┤
│  L3  csp-patterns   语言/框架（~200-600 tokens）          │
│     15+ reviewer · 构建修复 · patterns                    │
├─────────────────────────────────────────────────────────┤
│  L4  csp-runtime    运行时（~300 tokens/skill）           │
│     autopilot · 知识管理 · 自优化                         │
└─────────────────────────────────────────────────────────┘
```

### 加载策略

| 层级 | 触发条件 | Token 成本 | 频率 |
|------|---------|-----------|------|
| L0 router | 会话启动 | ~800 | 100% |
| L1 meta | 需要方法论 | ~300/skill | 高 |
| L2 workflow | 触发项目管理 | ~500/skill | 高 |
| L3 patterns | 检测到技术栈 | ~200-600/skill | 中 |
| L4 runtime | 请求运行时功能 | ~300/skill | 低 |

### 工作流程

1. **csp-router** 通过触发词匹配和项目文件检测对任务分类
2. 根据任务类型和技术栈从 L1–L4 选择匹配的 skill
3. 仅将所需的 skill 文件加载到上下文
4. skill 按顺序执行，产出结构化结果（REVIEW.md、PLAN.md 等）

## 常见工作流

### 功能开发

```
"开发用户认证功能"
  → brainstorming → spec → plan → execute → tdd → review → verify → ship
```

### Bug 修复

```
"这个 Django 项目有个 bug"
  → csp-debug + csp-django-patterns → 修复 → tdd → verify
```

### 代码审查

```
"帮我做个 code review"
  → csp-code-review + 语言 reviewer → REVIEW.md
```

### 需求澄清

```
"我想做个什么，但不太确定具体要什么"
  → csp-interview-me → csp-brainstorming → spec
```

### 接手新项目

```
"我刚接手这个项目"
  → csp-explore → csp-map-codebase → 架构映射
```

## 版本锁定

项目根目录 `.csp/versions.lock` 记录 skill 版本：

```
csp-plan-phase@1.2.3
csp-code-review@2.0.1
csp-debug@1.5.0
```

## 自定义 Recipe

在 `.csp/recipes.yaml` 中定义可复用工作流：

```yaml
recipes:
  rapid-prototype:
    description: "快速原型，跳过完整测试和文档"
    triggers: ["原型", "prototype", "demo"]
    sequence:
      - skill: csp-brainstorming
        optional: true
      - skill: csp-implement
      - skill: csp-verification
        mode: basic-check

  hotfix:
    description: "紧急生产修复，最小化变更"
    triggers: ["hotfix", "紧急"]
    sequence:
      - skill: csp-debug
      - skill: csp-implement
        mode: minimal-change
      - skill: csp-verification
        mode: regression-only
      - skill: csp-ship
        auto: true
```

Recipe 优先级：用户自定义 → 内置（`csp-router/recipes.yaml`）→ 路由器组合。

## 故障排查

```bash
/csp-why            # 为什么选择了这个 skill？
/csp-debug-router   # 路由器匹配日志
/csp-stats          # 使用统计
```

## 进一步阅读

| 文档 | 说明 |
|------|------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 架构设计（13 章核心原则） |
| [SKILL-INDEX.md](./SKILL-INDEX.md) | 全部 skill/agent 索引 |
| [README.md](./README.md) | English Documentation |

## 许可证

[MIT License](./LICENSE)

CSP 整合的项目均采用 MIT 许可证。

## 鸣谢

CSP 整合了以下开源项目：

- [ECC](https://github.com/burningion/video-editing-ai) — Skill 库
- [GSD](https://github.com/benjiwoss/get-shit-done) — 项目管理
- [OMC](https://github.com/ruvcode/oh-my-claudecode) — 运行时增强
- [Superpowers](https://github.com/SimpleVibe/Superpowers) — 元技能
- [spec-kit](https://github.com/microsoft/spec-kit) — 规范驱动开发
- [Agency-Agents](https://github.com/msitarzewski/agency-agents) — Specialized AI agents
- [awesome-copilot](https://github.com/github/awesome-copilot) — GitHub Copilot skills & agents