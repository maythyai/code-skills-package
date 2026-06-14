# CSP 用户指南

> Code Skills Package — 统一编程技能包
> 版本: v0.2 | 更新日期: 2026-06-11

---

## 目录

1. [简介](#简介)
2. [快速开始](#快速开始)
3. [架构概览](#架构概览)
4. [三种使用方式](#三种使用方式)
5. [常见场景](#常见场景)
6. [Skill 层速查](#skill-层速查)
7. [自定义扩展](#自定义扩展)
8. [运行 E2E 测试](#运行-e2e-测试)
9. [故障排查](#故障排查)
10. [更新 CSP](#更新-csp)

---

## 简介

CSP (Code Skills Package) 是一个将 6 个开源 AI 编程辅助项目的精华整合为一体化解决方案的编程技能包。它提供自动路由、分层加载、规范驱动的开发工作流。

**核心优势:**
- **自动路由**: 用自然语言描述任务,系统自动选择最匹配的 skill 组合
- **渐进式披露**: 索引常驻,正文懒加载,Token 消耗从 ~12,000 降至 ~500-1,500
- **规范驱动**: CSP 阶段工作流 + spec-driven 元技能,proposal → specs → apply → verify
- **多栈支持**: Python/Rust/Go/TypeScript/Java/Kotlin/Swift 等 10+ 语言

**来源项目:**

| 项目 | 定位 | 贡献 |
|------|------|------|
| csp-patterns | 全平台 skill 库 | 技术库主体 (~200 skills) |
| CSP | 项目管理框架 | 工作流骨架 (93 workflows) |
| csp-runtime | Claude Code 增强运行时 | 独特运行时能力 |
| CSP Meta | 元技能方法论 | 底层方法论 (14 个元技能) |
| spec-kit | 社区扩展工具 | 扩展机制兼容 |

---

## 快速开始

### 安装

**方式一: 复制安装**

```bash
# 复制 CSP 到本地目录
cp -r code-skills-package/ ~/.csp/
```

**方式二: 在项目中使用**

在你的项目 `CLAUDE.md` 中添加引用:

```markdown
使用 CSP (Code Skills Package) 技能包。当用户给出任务时,先通过 csp-router 路由到合适的 skill 组合。
```

### 验证安装

```bash
# 在项目根目录运行 E2E 测试
bash ~/.csp/shared/scripts/e2e-test.sh
# 输出: [E2E PASSED] 全部 106 项检查通过
```

---

## 架构概览

CSP 采用五层架构,从路由到技能内容逐层深入:

```
┌─────────────────────────────────────────────────────┐
│  Layer 0: csp-router  (常驻,~800 tokens)            │
│  ─ 任务分类 + skill 选择 + 上下文探测                │
├─────────────────────────────────────────────────────┤
│  Layer 1: csp-meta    (SP 14 个元技能)               │
│  ─ 方法论层: brainstorming, TDD, debugging...        │
├─────────────────────────────────────────────────────┤
│  Layer 2: csp-workflow (CSP 93 workflows 骨架)      │
│  ─ 项目管理: plan → execute → verify → ship          │
├─────────────────────────────────────────────────────┤
│  Layer 1: csp-meta    (spec-driven 方法论并入元技能)          │
│  ─ 规范驱动: propose → specs → apply → verify        │
├─────────────────────────────────────────────────────┤
│  Layer 4: csp-patterns (技术库 ~200 skills)     │
│  ─ 语言/框架 patterns, reviewers, build-resolvers    │
├─────────────────────────────────────────────────────┤
│  Layer 5: csp-runtime (运行时能力 ~40 skills)     │
│  ─ autopilot, ralph, wiki, remember, self-improve    │
└─────────────────────────────────────────────────────┘
```

**数据量统计:**

| 层 | 内容 | 数量 |
|---|------|------|
| Layer 1 | 元技能 | 14 |
| Layer 2 | 工作流 Commands + Agents | 67 + 33 |
| Layer 3 | OPSX Commands + Templates | 12 + 8 |
| Layer 4 | Agents + Skill Categories | 64 + 71 |
| Layer 5 | 运行时 Skills | 40 |
| **总计** | | **509 skills** |

---

## 三种使用方式

### 入口一: 自然语言 (推荐,零学习成本)

在项目 `CLAUDE.md` 中添加 CSP 引用后,直接用自然语言描述任务:

```
"帮我做个 code review"
→ 自动加载 csp-code-review + 语言专项 reviewer

"规划并实现用户认证功能"
→ 自动编排 brainstorming → plan → implement → test → review → verify → ship

"这个 Django 项目有个 bug"
→ 自动加载 csp-debug + csp-django-patterns + csp-django-reviewer
```

### 入口二: 斜杠命令 (进阶)

```bash
/csp-plan          # 进入规划阶段
/csp-debug         # 进入调试流程
/csp-review        # 代码审查
/csp-test          # 测试流程
/csp-ship          # 发布流程
/csp-spec-phase    # 澄清阶段需求 (CSPEC.md)
/csp-execute-phase # 执行阶段计划
/csp-verify        # 验证实现
/csp-search <query> # 搜索 skill 索引
```

### 入口三: 直接调用 (专家)

手动指定加载特定 skill:

```markdown
加载 csp-react-reviewer 审查这段代码
加载 csp-plan-phase 规划这个功能
加载 csp-django-patterns 查看 Django 最佳实践
```

---

## 常见场景

### 场景 1: 代码审查

```
用户: "帮我做个 code review"
Router 决策:
  1. 触发词匹配: "review" → csp-code-review (weight: 50)
  2. 文件类型探测: .tsx → csp-react-reviewer
  3. 加载: csp-code-review + csp-react-reviewer
输出: REVIEW.md
```

### 场景 2: Bug 修复

```
用户: "这个 Django 项目有个 bug"
Router 决策:
  1. 触发词匹配: "bug" → csp-debug (weight: 45)
  2. 技术栈探测: 发现 Django 项目文件 → csp-django-patterns
  3. 加载: csp-debug + csp-systematic-debugging + csp-django-patterns
流程: 探测 → 复现 → 定位 → 修复 → 回归测试
```

### 场景 3: 新功能开发

```
用户: "开发用户认证功能"
Router 决策:
  1. 触发词匹配: "开发"/"feature" → csp-plan-phase
  2. 技术栈探测 → 对应语言 reviewer + patterns
  3. 加载链: brainstorming → plan-phase → propose → implement → tdd → code-review → verify → ship
```

### 场景 4: 接手陌生项目

```
用户: "我刚接手这个项目,需要理解架构"
Router 决策:
  1. 触发词匹配: "理解"/"explore" → csp-explore + csp-map-codebase
  2. 加载: csp-explore + csp-codebase-mapper + 技术栈对应 patterns
输出: .planning/codebase/ 文档
```

### 场景 5: 安全审计

```
用户: "检查这段代码的安全性"
Router 决策:
  1. 触发词匹配: "security"/"安全" → csp-security-review (weight: 50)
  2. 加载: csp-security-reviewer + csp-secure-phase
输出: 安全漏洞报告 + 修复建议
```

---

## Skill 层速查

### Layer 1: 元技能 (方法论)

| Skill | 何时使用 |
|-------|---------|
| csp-brainstorming | 创造性工作前,探索需求和设计 |
| csp-test-driven-development | 实现功能/修复时,先写测试 |
| csp-systematic-debugging | 遇到 bug/测试失败时 |
| csp-writing-plans | 有多步任务的实现计划时 |
| csp-executing-plans | 有写好的实现计划要执行时 |
| csp-verification-before-completion | 声称完成前,验证输出 |
| csp-dispatching-parallel-agents | 有 2+ 独立任务可并行时 |
| csp-subagent-driven-development | 在当前会话执行独立任务时 |
| csp-using-git-worktrees | 需要隔离工作区时 |
| csp-finishing-a-development-branch | 开发完成,准备合并时 |
| csp-requesting-code-review | 完成任务/实现功能后 |
| csp-receiving-code-review | 收到代码审查反馈时 |
| csp-writing-skills | 创建/编辑/验证新 skill 时 |
| csp-using-skills | 任何对话开始时 |

### Layer 2: 工作流 (项目管理)

核心工作流命令:

| 命令 | 用途 |
|------|------|
| /csp-new-project | 初始化新项目 |
| /csp-plan-phase | 创建阶段计划 |
| /csp-execute-phase | 并行执行任务 |
| /csp-verify-work | 验收测试 |
| /csp-ship | 创建 PR 并发布 |
| /csp-debug | 调试流程 |
| /csp-code-review | 代码审查 |
| /csp-add-tests | 生成测试 |

### Layer 1: 规范驱动 (Meta + Workflow)

| 命令 | 用途 |
|------|------|
| /csp-spec-phase | 澄清阶段需求 (CSPEC.md) |
| /csp-plan-phase | 生成阶段计划 |
| /csp-execute-phase | 执行阶段任务 |
| /csp-verify-phase | 三维度 + 目标反向验证 |
| /csp-ship | 发布与归档 |

### Layer 4: 技术库 (语言 & 框架)

**Reviewers (21 个):** 通用 code-reviewer + 17 个语言专项 reviewer + 领域专项 reviewer

**Build Resolvers (12 个):** Python/Rust/Go/React/Java/Kotlin/Swift/C++/Dart/Django/PyTorch/HarmonyOS

**Skill Categories (71 个):** 涵盖代码审查、语言模式、测试、安全、基础设施、工具方法论

### Layer 5: 运行时 (csp-runtime)

| Skill | 用途 |
|-------|------|
| csp-autopilot | 自动驱动任务执行 |
| csp-ralph | 迭代式代码生成 |
| csp-ultrawork | 超长工作流管理 |
| csp-remember | 跨会话记忆 |
| csp-wiki | 项目知识库 |
| csp-self-improve | 自我改进循环 |

---

## 自定义扩展

### 用户自定义 Recipe

在项目根目录创建 `.csp/recipes.yaml`:

```yaml
recipes:
  # 快速原型开发
  rapid-prototype:
    description: "快速原型,跳过完整测试和文档"
    triggers: ["原型", "prototype", "demo"]
    sequence:
      - skill: csp-brainstorming
        optional: true
      - skill: csp-implement
      - skill: csp-verify-phase
        mode: basic-check

  # 热修复
  hotfix:
    description: "紧急生产修复,最小化变更"
    triggers: ["hotfix", "紧急"]
    sequence:
      - skill: csp-debug
      - skill: csp-implement
        mode: minimal-change
      - skill: csp-verify-phase
        mode: regression-only
      - skill: csp-ship
        auto: true
```

**Recipe 优先级:**
1. 用户自定义 recipe (`.csp/recipes.yaml`) — 最高优先级
2. 内置 recipe (`csp-router/recipes.yaml`)
3. Router 动态组合

---

## 运行 E2E 测试

CSP 提供端到端测试脚本,验证整个系统完整性:

```bash
bash ~/.csp/shared/scripts/e2e-test.sh
```

**测试覆盖:**
1. 项目骨架完整性 (12 项)
2. Router 组件 (3 项)
3. Layer 1 元技能 (14 项)
4. Layer 2 工作流 Commands (11 项)
5. Layer 2 工作流 Agents (7 项)
6. Layer 3 规范驱动 (9 项)
7. Layer 4 Reviewers (9 项)
8. Layer 4 Build Resolvers (8 项)
9. Layer 4 Skills (13 项)
10. Layer 5 运行时 (8 项)
11. 共享资源 (3 项)
12. 场景路由覆盖 (6 项)
13. Registry 一致性 (1 项)
14. Registry 统计 (1 项)
15. Triggers 覆盖 (1 项)

**总计: 106 项检查**

---

## 故障排查

### 为什么选择了这个 skill?

Router 决策追踪:

```
/csp-why
# 输出:
# 匹配 skills:
# 1. csp-plan-phase (L2) — 触发词"规划",置信度 95%
# 2. csp-auth-patterns (L4) — 语义"用户认证",置信度 88%
```

### Skill 没有按预期加载?

1. 检查触发词是否在 `csp-router/triggers.yaml` 中
2. 检查 skill 文件是否在 `csp-router/registry.json` 中注册
3. 运行 E2E 测试: `bash shared/scripts/e2e-test.sh`
4. 检查 `.csp/recipes.yaml` 是否有覆盖规则

### 如何添加新的触发词?

编辑 `csp-router/triggers.yaml`,在 `trigger_index` 下添加:

```yaml
"我的关键词":
  skills: [csp-my-skill]
  weight: 45
```

### 如何添加新的技术栈?

编辑 `csp-router/triggers.yaml`,在 `stack_rules` 下添加:

```yaml
my_language:
  files: ["my-lang-config-file"]
  reviewers: ["csp-my-lang-reviewer"]
  testers: ["csp-my-lang-testing"]
  build_resolvers: ["csp-my-lang-build-resolver"]
  patterns: ["csp-my-lang-patterns"]
```

---

## 更新 CSP

### 检查更新

```bash
# 检查并生成更新计划
csp-update-check

# 输出: update-plan-2026-06-11.md
# - ECC: 3 new skills, 2 bug fixes since last sync
# - CSP: 1 new workflow, hook improvements
```

### 应用更新

```bash
# 人工审查后执行更新
csp-update-apply --plan update-plan-2026-06-11.md
```

### 版本锁定

项目根目录 `.csp/versions.lock` 记录当前使用的 skill 版本:

```
csp-plan-phase@1.2.3
csp-code-review@2.0.1
csp-debug@1.5.0
```

---

## 进一步阅读

- **完整架构设计**: [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Skill 索引**: [SKILL-INDEX.md](./SKILL-INDEX.md)
- **迁移映射表**: [MIGRATION.md](./MIGRATION.md)
- **来源项目**: `开源项目参考/` 目录包含 6 个原始项目

---

## 许可证

CSP 整合的 6 个项目均采用 MIT 或 Apache 2.0 许可证。具体见各项目原始 LICENSE 文件。
