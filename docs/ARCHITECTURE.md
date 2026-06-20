# CSP (Code Skills Package) 架构设计

> 版本: v0.4.0 | 日期: 2026-06-14
> 状态: 质量巩固完成

---

## 一、项目定位

**CSP** (Code Skills Package) 是一个统一的编程技能包,将多个开源 AI 编程辅助项目的精华整合为一体化解决方案:

| 来源项目 | 定位 | 整合角色 |
|----------|------|----------|
| **ECC** | 全平台 skill 库 | 技能内容主体 |
| **GSD** | 项目管理框架 | 工作流骨架 |
| **OMC** | Claude Code 增强运行时 | 独特运行时能力 |
| **Superpowers** | 元技能方法论 | 底层方法论 |
| **spec-kit** | 规范驱动工具 | 方法论扩展 |

### 核心原则

1. **融合交集,保留独特** — 重叠部分合并为单一实现,独有能力原样保留
2. **渐进式披露** — 用户无需一次性了解全部 skill,系统按需加载
3. **Token 节约** — 索引常驻,正文懒加载,深度材料按需再加载
4. **自动化路由** — 用户描述任务,系统自动选择最匹配的 skill 组合
5. **统一命名空间** — 所有 skill 和命令均仅使用 `csp-` 前缀

### 命名规范

**强制规则**: CSP 项目中不存在双入口兼容或原始前缀保留。所有名称均使用短横线 `-` 连接。

| 原始来源 | 原始前缀示例 | CSP 统一命名 |
|---------|------------|------------|
| ECC | `ecc:react-review` | `csp-react-review` |
| GSD | `gsd:plan-phase`, `/gsd:debug` | `csp-plan-phase`, `/csp-debug` |
| OMC | `omc:autopilot` | `csp-autopilot` |
| Superpowers | `sp:brainstorming` | `csp-brainstorming` |

**实施要求**:
- 迁移时将所有 skill 文件名、目录名、命令名统一添加 `csp-` 前缀
- 所有连接符统一使用短横线 `-`,不使用冒号 `:`
- 移除所有 `replaces` 字段(不再需要记录原始名称映射)
- slash commands 统一使用 `/csp-xxx` 格式,不保留 `/gsd-`, `/csp-` 等
- 文档和代码注释中不引用原始项目前缀

---

## 二、五层架构

```
┌─────────────────────────────────────────────────────┐
│  Layer 0: csp-router  (常驻,~800 tokens)            │
│  ─ 任务分类 + skill 选择 + 上下文探测                │
├─────────────────────────────────────────────────────┤
│  Layer 1: csp-meta    (SP + 规范驱动元技能)          │
│  ─ 方法论: brainstorming, TDD, spec-driven...       │
├─────────────────────────────────────────────────────┤
│  Layer 2: csp-workflow (GSD 93 workflows 骨架)      │
│  ─ 项目管理: plan → execute → verify → ship               │
├─────────────────────────────────────────────────────┤
│  Layer 3: csp-patterns (ECC 技术库 ~200 skills)     │
│  ─ 语言/框架 patterns, reviewers, build-resolvers    │
├─────────────────────────────────────────────────────┤
│  Layer 4: csp-runtime (OMC 独特能力 ~20 skills)     │
│  ─ autopilot, ralph, wiki, remember, self-improve    │
└─────────────────────────────────────────────────────┘
```

### 层级加载策略

| 层级 | 加载时机 | Token 成本 |
|------|----------|-----------|
| L0 router | **会话启动时永久加载** | ~800 |
| L1 meta | router 识别需要方法论时加载 | ~300/skill |
| L2 workflow | 用户触发项目管理流程时加载 | ~500/skill |
| L3 patterns | router 识别技术栈后加载对应 skill | ~200-600/skill |
| L4 runtime | 用户请求自主执行/知识管理时加载 | ~300/skill |

---

## 三、目录结构

```
code-skills-package/
├── CLAUDE.md                          # 主入口,路由说明 + 安装指引
├── ARCHITECTURE.md                    # 本文件
├── SKILL-INDEX.md                     # 完整 skill 索引(已有)
│
├── csp-router/                        # Layer 0: 路由器
│   ├── SKILL.md                       # 路由逻辑
│   ├── registry.json                  # skill 注册表(索引)
│   └── triggers.yaml                  # 触发词规则库
│
├── csp-meta/                          # Layer 1: 元技能(SP)
│   └── skills/
│       ├── brainstorming/SKILL.md
│       ├── test-driven-development/SKILL.md
│       ├── systematic-debugging/SKILL.md
│       ├── writing-plans/SKILL.md
│       ├── executing-plans/SKILL.md
│       ├── verification-before-completion/SKILL.md
│       ├── writing-skills/SKILL.md
│       ├── dispatching-parallel-agents/SKILL.md
│       ├── subagent-driven-development/SKILL.md
│       ├── using-git-worktrees/SKILL.md
│       ├── finishing-a-development-branch/SKILL.md
│       ├── requesting-code-review/SKILL.md
│       └── receiving-code-review/SKILL.md
│
├── csp-workflow/                      # Layer 2: 工作流(GSD)
│   ├── commands/                      # slash commands
│   │   ├── csp-plan-phase.md
│   │   ├── csp-execute-phase.md
│   │   ├── csp-verify-phase.md
│   │   ├── csp-debug.md
│   │   ├── csp-new-project.md
│   │   ├── csp-ship.md
│   │   └── ...
│   ├── agents/                        # workflow agents
│   │   ├── csp-planner.md
│   │   ├── csp-executor.md
│   │   ├── csp-verifier.md
│   │   ├── csp-debugger.md
│   │   ├── csp-debug-session-manager.md
│   │   ├── csp-explorer.md
│   │   ├── csp-codebase-mapper.md
│   │   └── ...
│   └── workflows/                     # 多步骤工作流定义
│       ├── csp-code-review.md
│       ├── csp-ui-phase.md
│       ├── csp-secure-phase.md
│       └── ...
│
├── csp-patterns/                      # Layer 3: 技术库(ECC)
│   ├── skills/                        # 按领域组织
│   │   ├── code-review/               # 通用代码审查
│   │   │   └── SKILL.md
│   │   ├── reviewers/                 # 语言专项审查
│   │   │   ├── python-reviewer.md
│   │   │   ├── go-reviewer.md
│   │   │   ├── rust-reviewer.md
│   │   │   └── ...
│   │   ├── build-resolvers/           # 构建错误修复
│   │   │   ├── python-build-resolver.md
│   │   │   └── ...
│   │   ├── testing/                   # 测试相关
│   │   │   ├── tdd-workflow.md
│   │   │   ├── python-testing.md
│   │   │   └── ...
│   │   ├── security/                  # 安全相关
│   │   │   ├── security-review.md
│   │   │   ├── django-security.md
│   │   │   └── ...
│   │   ├── backend-patterns/          # 后端模式
│   │   │   ├── django-patterns.md
│   │   │   ├── fastapi-patterns.md
│   │   │   └── ...
│   │   ├── frontend-patterns/         # 前端模式
│   │   │   ├── react-patterns.md
│   │   │   ├── nextjs-turbopack.md
│   │   │   └── ...
│   │   └── content/                   # 内容/营销(ECC独有)
│   │       ├── article-writing.md
│   │       ├── brand-voice.md
│   │       └── ...
│   └── agents/                        # 技术 agents
│       ├── code-reviewer.md           # 统一代码审查 agent
│       ├── code-simplifier.md
│       ├── security-reviewer.md
│       └── ...
│
├── csp-runtime/                       # Layer 4: 运行时(OMC)
│   └── skills/
│       ├── autopilot/SKILL.md
│       ├── ralph/SKILL.md
│       ├── ultrawork/SKILL.md
│       ├── remember/SKILL.md
│       ├── wiki/SKILL.md
│       ├── deep-interview/SKILL.md
│       ├── ai-slop-cleaner/SKILL.md
│       ├── self-improve/SKILL.md
│       └── ...
│
├── shared/                            # 共享资源
│   ├── hooks/                         # 统一 hooks 配置
│   │   └── hooks.json
│   ├── scripts/                       # 共享脚本
│   │   └── lib/
│   └── templates/                     # 通用模板
│
└── MIGRATION.md                       # 来源→CSP 映射表
```

---

## 四、Skill 注册表 (registry.json)

每个 skill 在注册表中有一条记录,是路由器进行匹配的核心数据结构:

```json
{
  "name": "csp-code-review",
  "description": "通用代码审查:正确性、安全性、性能、可维护性",
  "layer": 4,
  "category": "review",
  "triggers": {
    "keywords": ["review", "审查", "code review", "CR", "看看代码"],
    "file_patterns": ["*.diff", "*.patch"],
    "context": ["post-commit", "pre-merge", "PR"]
  },
  "stack_detection": false,
  "path": "csp-patterns/skills/code-review/SKILL.md",
  "deps": [],
  "priority": 10
}
```

### 注册表字段说明

| 字段 | 用途 |
|------|------|
| `name` | 统一名称(无来源前缀) |
| `description` | 短描述(≤80字,进索引) |
| `layer` | 所属层级(0-5) |
| `category` | 功能分类(review/debug/test/plan/spec/pattern/runtime) |
| `triggers.keywords` | 触发关键词列表 |
| `triggers.file_patterns` | 文件模式触发 |
| `triggers.context` | 上下文触发(如 post-commit) |
| `stack_detection` | 是否需要探测项目技术栈 |
| `path` | SKILL.md 相对路径 |
| `deps` | 依赖的其他 skill |
| `replaces` | 合并前的旧名称列表 |
| `priority` | 同 category 内的优先级(数字越小越优先) |

---

## 五、自动路由器 (csp-router)

### 工作流程

```
用户输入任务描述
      │
      ▼
  ┌──────────┐
  │ 信号抽取  │  关键词 / 文件模式 / 上下文 / 技术栈探测
  └────┬─────┘
       │
       ▼
  ┌──────────┐     命中     ┌──────────┐
  │ 规则匹配  │────────────→│ 确定 skill │
  └────┬─────┘             └──────────┘
       │ 未命中
       ▼
  ┌──────────┐     匹配     ┌──────────┐
  │ 语义分类  │────────────→│ 候选 skill │
  └────┬─────┘             └────┬─────┘
       │                        │
       ▼                        ▼
  ┌──────────────────────────────┐
  │ 组装激活列表(≤5 个,按层级排序)│
  └──────────────────────────────┘
       │
       ▼
  按层级顺序加载 SKILL.md → 执行
```

### 信号抽取

1. **关键词匹配**:从用户输入中提取 `triggers.keywords` 中的词
2. **文件模式**:如用户提供了文件路径,匹配 `triggers.file_patterns`
3. **上下文**:检测当前是否在 git commit 后、PR 中等场景
4. **技术栈探测**:当 `stack_detection: true` 时,扫描项目根目录:
   - `package.json` → Node.js/前端
   - `Cargo.toml` → Rust
   - `go.mod` → Go
   - `pyproject.toml` / `setup.py` → Python
   - `pom.xml` / `build.gradle` → Java/Kotlin
   - `*.xcodeproj` / `Package.swift` → Swift

### 技术栈→Skill 映射

```yaml
# triggers.yaml 片段

stack_rules:
  python:
    files: ["pyproject.toml", "setup.py", "requirements.txt", "Pipfile"]
    reviewers: ["python-reviewer", "django-reviewer", "fastapi-reviewer"]
    testers: ["python-testing"]
    build_resolvers: ["django-build-resolver"]
    patterns: ["python-patterns", "django-patterns", "fastapi-patterns"]

  rust:
    files: ["Cargo.toml"]
    reviewers: ["rust-reviewer"]
    testers: ["rust-testing"]
    build_resolvers: ["rust-build-resolver"]
    patterns: ["rust-patterns"]

  golang:
    files: ["go.mod"]
    reviewers: ["go-reviewer"]
    testers: ["golang-testing"]
    build_resolvers: ["go-build-resolver"]
    patterns: ["golang-patterns"]

  typescript:
    files: ["tsconfig.json", "package.json"]
    reviewers: ["typescript-reviewer", "react-reviewer"]
    testers: ["react-testing"]
    build_resolvers: ["react-build-resolver"]
    patterns: ["react-patterns", "nextjs-turbopack", "frontend-patterns"]

  # ...更多栈
```

### 路由器 SKILL.md 示例

```markdown
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
- ...

## 3. 匹配 Skill
读取 registry.json,按 triggers 匹配:
- 关键词命中 → 直接激活
- 技术栈命中 → 加载对应 reviewer/patterns
- 上下文命中 → 加载对应 workflow

## 4. 输出激活列表
最多激活 5 个 skill,按层级排序:
L1(meta) → L2(workflow) → L3(patterns) → L4(runtime)

## 5. 加载执行
按顺序读取每个激活 skill 的 SKILL.md,按指引执行。
```

---

## 六、csp-auto：动态 DAG 编排引擎

### 6.1 设计理念

静态 recipe 无法覆盖所有编程场景。`csp-auto` 是一个**智能 DAG 编排器**：

```
用户输入任务
      │
      ▼
  csp-auto（DAG 决策 Agent）
      │
      │ 分析任务 → 构建 DAG（有向无环图）
      │
      ▼
  ┌─────────────────────────────────────┐
  │  DAG 示例：新功能开发               │
  │                                     │
  │  [understand] → [plan] → [spec]    │
  │                         │           │
  │                         ▼           │
  │                    [implement]      │
  │                    /        \       │
  │              [frontend]  [backend]  │
  │                    \        /       │
  │                     ▼               │
  │               [integrate]          │
  │                    │                │
  │                    ▼                │
  │              [test] → [review]     │
  │                        │            │
  │                        ▼            │
  │                   [verify] → [ship] │
  └─────────────────────────────────────┘
      │
      │ 逐节点执行，每个节点动态选择 skill
      │
      ▼
  最终动态 Skill 链
```

**核心区别：**
- **静态 recipe**：预定义序列，一刀切
- **csp-auto DAG**：任务驱动，逐节点动态决策，支持分支/并行/回退

### 6.2 DAG 节点定义

每个节点是**逻辑阶段**（非具体 skill），由 csp-auto 在运行时决策加载哪个 skill：

```yaml
# csp-auto/nodes.yaml — 节点类型注册表
# 每个节点对应一个索引分片

nodes:
  understand:
    description: "理解需求/代码库"
    shard: index-understand.json
    candidates:
      - csp-explore           # 探索代码库
      - csp-map-codebase      # 映射架构
      - csp-deep-interview    # 需求澄清
      - csp-brainstorming     # 头脑风暴
    decision_factors:
      - 用户是否了解现有代码？ → explore / map-codebase
      - 需求是否清晰？ → brainstorming / deep-interview

  plan:
    description: "规划方案"
    shard: index-plan.json
    candidates:
      - csp-plan-phase        # 阶段规划
      - csp-spike             # 技术探查
      - csp-ultraplan-phase   # 深度规划
    decision_factors:
      - 方案复杂度？ 高 → ultraplan / 中 → plan-phase / 低 → spike
      - 是否需要技术验证？ → spike

  spec:
    description: "编写规范"
    shard: index-spec.json
    candidates:
      - csp-spec-phase        # 澄清阶段需求 (CSPEC.md)
      - csp-planning-phase    # 快速规划工件链
      - skip                  # 简单任务可跳过
    decision_factors:
      - 需要正式规范？ → spec-phase / planning-phase
      - 任务是否足够简单？ → skip

  implement:
    description: "编写代码"
    shard: index-implement.json
    candidates:
      - csp-implement         # 通用实现
      - csp-tdd               # TDD 方式
      - csp-executor          # 按计划执行
    decision_factors:
      - 用户偏好 TDD？ → tdd
      - 是否有现成计划？ → executor
      - 默认 → implement

  test:
    description: "测试验证"
    shard: index-test.json
    candidates:
      - csp-tdd               # 单元测试
      - csp-e2e-testing       # E2E 测试
      - csp-python-testing    # Python 测试
      - csp-react-testing     # React 测试
      - csp-rust-testing      # Rust 测试
    decision_factors:
      - 技术栈？ → 对应语言测试 skill
      - 需要 E2E？ → e2e-testing
      - 默认 → tdd

  review:
    description: "代码审查"
    shard: index-review.json
    candidates:
      - csp-code-review       # 通用审查
      - csp-python-reviewer   # Python 审查
      - csp-go-reviewer       # Go 审查
      - csp-rust-reviewer     # Rust 审查
      - csp-react-reviewer    # React 审查
      - csp-security-review   # 安全审查
    decision_factors:
      - 技术栈？ → 对应语言 reviewer
      - 涉及安全敏感代码？ → security-review
      - 默认 → code-review

  verify:
    description: "验证结果"
    shard: index-verify.json
    candidates:
      - csp-verify-phase      # 阶段验证
      - csp-spec-contract   # SPEC 契约生成
      - csp-nyquist-auditor   # 覆盖率验证
    decision_factors:
      - 有 CSPEC？ → verify-phase（三维度 + 目标反向）
      - 需要覆盖率？ → nyquist-auditor
      - 默认 → verify-phase

  ship:
    description: "发布部署"
    shard: index-ship.json
    candidates:
      - csp-ship              # 发布
      - csp-pr-branch         # 创建 PR
      - skip                  # 不需要发布
    decision_factors:
      - 用户要求发布？ → ship / pr-branch
      - 仅本地修改？ → skip

  debug:
    description: "调试修复"
    shard: index-debug.json
    candidates:
      - csp-debug             # 通用调试
      - csp-debug-session     # 多轮调试管理
      - csp-forensics         # 取证分析
      - csp-build-error-fix   # 构建错误
    decision_factors:
      - 构建错误？ → build-error-fix
      - 复杂 bug 需要多轮？ → debug-session
      - 需要历史分析？ → forensics
      - 默认 → debug

  parallel:
    description: "并行执行节点（特殊类型）"
    shard: null  # 不加载 skill，仅做编排
    behavior: 子节点并行执行，等待全部完成后合并
```

### 6.3 DAG 执行流程

```
csp-auto 接收任务
  │
  ├─ 1. 任务分析
  │     输入：用户描述 + 项目上下文
  │     输出：任务类型、复杂度、约束条件
  │
  ├─ 2. DAG 构建
  │     根据任务类型，选择节点子集并确定拓扑关系
  │     输出：nodes[] + edges[] (DAG 定义)
  │
  ├─ 3. 逐节点执行（拓扑排序遍历）
  │     for node in topological_sort(DAG):
  │       │
  │       ├─ 3a. 加载节点对应的索引分片
  │       │      read(index-{node}.json)  ← 仅加载此分片
  │       │
  │       ├─ 3b. Agent 决策：从候选 skill 中选择
  │       │      考虑：技术栈、上下文、历史结果、用户偏好
  │       │      输出：selected_skill
  │       │
  │       ├─ 3c. 加载并执行 skill
  │       │      read(selected_skill/SKILL.md)
  │       │      执行 skill 逻辑
  │       │
  │       ├─ 3d. 收集输出
  │       │      写入 .csp/artifacts/{node}-{timestamp}.yaml
  │       │
  │       └─ 3e. 动态调整 DAG（可选）
  │              如果执行结果偏离预期：
  │                - 添加回退节点（如 verify 失败 → 插入 debug）
  │                - 跳过后续可选节点
  │                - 添加新分支
  │
  └─ 4. 输出最终结果
        汇总所有节点的 artifact
        生成执行报告
```

### 6.4 索引分片策略

**问题：** registry.json 包含 ~200 个 skill，全量加载约 12K tokens

**解决方案：** 按节点类型分片，按需加载

```
csp-router/
├── index-directory.json         # 总目录（常驻，~200 tokens）
│                                # 列出所有分片名 + 分片描述
│
├── index-understand.json        # "理解"节点候选 skill（~15 条）
├── index-plan.json              # "规划"节点候选 skill（~12 条）
├── index-spec.json              # "规范"节点候选 skill（~8 条）
├── index-implement.json         # "实现"节点候选 skill（~10 条）
├── index-test.json              # "测试"节点候选 skill（~20 条）
├── index-review.json            # "审查"节点候选 skill（~25 条）
├── index-verify.json            # "验证"节点候选 skill（~10 条）
├── index-ship.json              # "发布"节点候选 skill（~8 条）
├── index-debug.json             # "调试"节点候选 skill（~12 条）
├── index-stacks.json            # 技术栈相关 skill（~50 条，按需）
└── index-content.json           # 内容/营销 skill（~15 条，按需）
```

**总目录格式（常驻加载）：**

```json
{
  "version": "1.0",
  "total_skills": 200,
  "shards": [
    {
      "name": "understand",
      "file": "index-understand.json",
      "description": "代码库理解、需求澄清、架构探索",
      "skill_count": 15,
      "size_tokens": 900
    },
    {
      "name": "plan",
      "file": "index-plan.json",
      "description": "任务规划、技术探查、方案设计",
      "skill_count": 12,
      "size_tokens": 720
    },
    {
      "name": "spec",
      "file": "index-spec.json",
      "description": "规范驱动、变更提案、工件管理",
      "skill_count": 8,
      "size_tokens": 480
    }
  ]
}
```

**Token 消耗对比：**

| 策略 | 常驻 Token | 单次任务 Token |
|------|-----------|---------------|
| 全量索引 | ~12,000 | ~12,000（全部加载） |
| 分片加载 | ~200（仅目录） | ~500-1,500（仅相关分片） |
| **节约比例** | **98%** | **87-96%** |

### 6.5 分片内容格式

```json
{
  "shard": "review",
  "node": "review",
  "skills": [
    {
      "name": "csp-code-review",
      "description": "通用代码审查：正确性、安全、性能、可维护",
      "path": "csp-patterns/skills/code-review/SKILL.md",
      "stacks": ["any"],
      "priority": 1,
      "modes": ["comprehensive", "quick", "architecture-analysis"]
    },
    {
      "name": "csp-python-reviewer",
      "description": "Python 专项审查：PEP8、类型提示、安全、性能",
      "path": "csp-patterns/agents/csp-python-reviewer.md",
      "stacks": ["python"],
      "priority": 2,
      "triggers": { "file_ext": [".py"], "frameworks": ["django", "fastapi", "flask"] }
    },
    {
      "name": "csp-go-reviewer",
      "description": "Go 专项审查：并发模式、错误处理、性能",
      "path": "csp-patterns/agents/csp-go-reviewer.md",
      "stacks": ["golang"],
      "priority": 2,
      "triggers": { "file_ext": [".go"], "frameworks": ["gin", "echo", "fiber"] }
    }
  ]
}
```

### 6.6 节点决策逻辑

每个节点的 skill 选择遵循以下决策树：

```
节点：review
  │
  ├─ 项目技术栈？
  │   ├─ Python → csp-python-reviewer
  │   ├─ Go → csp-go-reviewer
  │   ├─ Rust → csp-rust-reviewer
  │   ├─ TypeScript + React → csp-react-reviewer
  │   └─ 其他/多栈 → csp-code-review（通用）
  │
  ├─ 是否涉及安全敏感代码？
  │   ├─ 是 → 额外加载 csp-security-review
  │   └─ 否 → 跳过
  │
  ├─ 审查模式？
  │   ├─ 全面审查 → mode: comprehensive
  │   ├─ 快速检查 → mode: quick
  │   └─ 架构分析 → mode: architecture-analysis
  │
  └─ 输出：selected_skills = [csp-python-reviewer(mode=comprehensive), csp-security-review]
```

### 6.7 DAG 动态调整

csp-auto 在执行过程中可以根据结果动态修改 DAG：

```yaml
adjustment_rules:
  # verify 失败 → 插入 debug + 重新 implement
  verify_failed:
    condition: "artifact.status == 'failed'"
    action:
      - insert_node: debug
        position: before_current
      - insert_node: implement
        position: after_debug
      - re_execute: verify
    max_retries: 3

  # test 全部通过 + 代码简单 → 跳过 review
  test_pass_simple:
    condition: "artifact.all_passed && complexity < threshold"
    action:
      - skip_node: review

  # 实现过程中发现需要数据库变更 → 插入 migration 节点
  db_change_detected:
    condition: "artifact.outputs contains 'schema_change'"
    action:
      - insert_node: database-migration
        position: before_verify

  # 用户上下文接近 token 上限 → 压缩剩余节点
  token_pressure:
    condition: "context_usage > 80%"
    action:
      - merge_nodes: [test, review] → csp-verify-phase(mode=quick)
      - skip_optional: true
```

### 6.8 csp-auto 与 csp-router 的关系

```
┌────────────────────────────────────────────┐
│              用户输入任务                    │
└─────────────┬──────────────────────────────┘
              │
              ▼
       ┌──────────────┐
       │  csp-router   │ ← L0 常驻路由器
       │  (简单任务)    │    关键词匹配 → 直接选 skill
       └──────┬───────┘
              │
         ┌────┴────┐
         │         │
    简单任务    复杂任务
         │         │
         ▼         ▼
   直接执行     ┌──────────────┐
   单个 skill   │   csp-auto    │ ← L0 智能编排器
               │  (复杂任务)    │    构建 DAG → 逐节点决策
               └──────┬───────┘
                      │
                ┌─────┴─────┐
                ▼           ▼
           加载分片     Agent 决策
           index-xxx    选择 skill
                │           │
                └─────┬─────┘
                      ▼
                 执行 skill
                      │
                      ▼
                 调整 DAG？
                  │      │
                 是      否 → 下一节点
                  │
                  ▼
             修改 DAG
             继续执行
```

**路由判断规则：**
- **简单任务**（单一动作、明确 skill）→ csp-router 直接处理
- **复杂任务**（多步骤、需要规划、全链路）→ 交给 csp-auto

### 6.9 完整 DAG 示例：接手陌生项目并添加功能

```
用户："我刚接手这个 Django 项目，需要添加用户权限管理功能"

csp-auto 构建的 DAG：

  [understand] ──────────────────────────────┐
  │                                          │
  ├─ 加载 index-understand.json 分片          │
  ├─ 决策：csp-explore + csp-map-codebase    │
  ├─ 执行：探索项目结构、映射架构              │
  └─ 输出：architecture-map.yaml             │
                                             │
  [plan] ←───────────────────────────────────┘
  │
  ├─ 加载 index-plan.json 分片
  ├─ 决策：csp-plan-phase
  ├─ 输入：architecture-map.yaml
  ├─ 执行：制定权限管理功能计划
  └─ 输出：plan.yaml
       │
       ▼
  [spec]
  │
  ├─ 加载 index-spec.json 分片
  ├─ 决策：csp-spec-phase（项目已有 spec-driven 流程）
  ├─ 执行：创建变更提案
  └─ 输出：proposal.yaml
       │
       ▼
  [implement]
  │
  ├─ 加载 index-implement.json 分片
  ├─ 决策：csp-tdd（Django 项目，测试重要）
  ├─ 同时加载 index-stacks.json → csp-django-patterns
  ├─ 执行：TDD 方式实现权限管理
  └─ 输出：implementation.yaml
       │
       │ ← 动态调整：检测到需要数据库变更
       │
  [migrate] (动态插入)
  │
  ├─ 加载 index-stacks.json → csp-database-migration
  ├─ 执行：生成并测试 Django migration
  └─ 输出：migration.yaml
       │
       ▼
  [test]
  │
  ├─ 加载 index-test.json 分片
  ├─ 决策：csp-python-testing + csp-django-testing
  ├─ 执行：单元测试 + 集成测试
  └─ 输出：test-results.yaml
       │
       ▼
  [review]
  │
  ├─ 加载 index-review.json 分片
  ├─ 决策：csp-django-reviewer + csp-security-review
  │         （权限管理涉及安全，额外加载安全审查）
  ├─ 执行：Django 专项审查 + 安全审查
  └─ 输出：review-findings.yaml
       │
       │ ← 审查发现安全问题 → 动态插入修复
       │
  [fix-security] (动态插入)
  │
  ├─ 执行：修复审查发现的安全问题
  └─ 输出：fix.yaml
       │
       ▼
  [verify]
  │
  ├─ 加载 index-verify.json 分片
  ├─ 决策：csp-verify-phase
  ├─ 执行：验证所有变更
  └─ 输出：verification.yaml (status: passed)
       │
       ▼
  [ship]
  │
  ├─ 加载 index-ship.json 分片
  ├─ 决策：csp-pr-branch（创建 PR 而非直接发布）
  └─ 输出：pr-url
```

**本次执行加载的分片：**
- index-understand.json (900 tokens)
- index-plan.json (720 tokens)
- index-spec.json (480 tokens)
- index-implement.json (600 tokens)
- index-test.json (1,200 tokens)
- index-review.json (1,500 tokens)
- index-verify.json (600 tokens)
- index-ship.json (480 tokens)
- index-stacks.json (3,000 tokens, 加载了 2 次)
- **总计：~6,480 tokens**（vs 全量 12,000 tokens）

---

## 七、Skill 编排与阶段转换

### 7.1 问题：为什么需要编排

单个编程任务往往需要多个 skill 协作：

**示例：开发新功能**
```
brainstorming (L1) 
  → plan-phase (L2) 
    → propose (L3) 
      → implement + react-patterns (L4) 
        → tdd (L1) 
          → code-review (L4) 
            → verify (L2) 
              → ship (L2)
```

这不是同时激活 8 个 skill，而是**分阶段按需加载**。

### 7.2 阶段转换协议

每个 skill 执行完毕后，通过**阶段信号**决定下一步：

```markdown
### 7.3 Skill 完成信号格式

每个 skill 的 SKILL.md 应在结尾定义完成信号：

#### 完成信号
- **输出**: plan.md (计划文档路径)
- **下一步**: 
  - 默认: csp-spec-phase (创建变更提案)
  - 备选: csp-execute-phase (直接执行)
  - 跳过: 如果用户只想看计划
- **状态**: 
  - plan_path: {{output_path}}
  - phase: planning
  - ready_for: [propose, execute]
```

**路由器根据完成信号自动加载下一个 skill：**

```
csp-plan-phase 完成
  ↓ (输出 plan.md, 信号: ready_for=propose)
csp-router 读取信号
  ↓ (匹配 next=csp-spec-phase)
加载 csp-spec-phase, 传入 plan.md 路径
```

### 7.4 Skill 组合模板

为常见编程场景预定义 skill 序列，存储在 `csp-router/recipes.yaml`：

```yaml
recipes:
  # 新功能开发
  feature-development:
    description: "从零开发新功能（含规范和测试）"
    triggers: ["新功能", "feature", "添加功能", "实现XXX"]
    sequence:
      - skill: csp-brainstorming
        layer: 1
        optional: true  # 用户明确需求时可跳过
      - skill: csp-plan-phase
        layer: 2
        outputs: [plan_path]
      - skill: csp-spec-phase
        layer: 3
        inputs: [plan_path]
        outputs: [spec_path]
      - skill: csp-implement
        layer: 2
        inputs: [spec_path]
      - skill: csp-tdd
        layer: 1
        auto_select_stack: true
      - skill: csp-code-review
        layer: 4
        auto_select_stack: true
      - skill: csp-verify-phase
        layer: 2
      - skill: csp-ship
        layer: 2
        optional: true

  # Bug 修复
  bug-fix:
    description: "定位并修复 bug"
    triggers: ["bug", "修复", "fix", "问题", "报错"]
    sequence:
      - skill: csp-debug
        layer: 2
        outputs: [root_cause]
      - skill: csp-implement
        layer: 2
        inputs: [root_cause]
      - skill: csp-tdd
        layer: 1
        mode: regression-test  # 回归测试模式
      - skill: csp-verify-phase
        layer: 2
        check: fix-confirmed

  # 代码重构
  refactor:
    description: "重构现有代码"
    triggers: ["重构", "refactor", "重写", "优化结构"]
    sequence:
      - skill: csp-code-review
        layer: 4
        mode: architecture-analysis
        outputs: [refactor-plan]
      - skill: csp-plan-phase
        layer: 2
        inputs: [refactor-plan]
      - skill: csp-implement
        layer: 2
      - skill: csp-tdd
        layer: 1
        mode: ensure-no-regression
      - skill: csp-code-review
        layer: 4
        mode: verify-improvement

  # 快速修复（跳过规划和规范）
  quick-fix:
    description: "快速修复小问题"
    triggers: ["快速修复", "小改动", "简单修复"]
    sequence:
      - skill: csp-implement
        layer: 2
      - skill: csp-verify-phase
        layer: 2
        mode: quick-check
```

### 7.5 动态加载与上下文管理

**问题：** 长序列执行时，早期 skill 占用上下文窗口

**解决方案：阶段化加载/卸载**

```
阶段 1: 加载 csp-brainstorming (300 tokens)
  ↓ 执行完毕，保存输出到 brainstorm.md
  ↓ 卸载 csp-brainstorming (释放 300 tokens)
  
阶段 2: 加载 csp-plan-phase (500 tokens)
  ↓ 读取 brainstorm.md 作为输入
  ↓ 执行完毕，保存输出到 plan.md
  ↓ 卸载 csp-plan-phase (释放 500 tokens)
  
阶段 3: 加载 csp-spec-phase (400 tokens)
  ↓ 读取 plan.md 作为输入
  ...
```

**上下文预算控制：**
- 同时激活的 skill: ≤3 个
- 单次任务总 token 消耗: ≤10,000 tokens
- 超出预算时：提示用户拆分任务或选择 quick-fix 模式

### 7.6 反馈循环与错误恢复

**非线性执行：允许回退**

```
csp-verify-phase 失败
  ↓ (输出: verification_failed, issues=[...])
csp-router 读取失败原因
  ↓ (匹配 feedback_loop)
回退到 csp-debug 或 csp-implement
  ↓ (传入 issues 列表)
重新执行修复
  ↓
再次 csp-verify-phase
```

**最大循环次数：3 次（防止无限循环）**

### 7.7 Skill 间数据交换格式

**问题：** Skill 之间如何传递状态和输出？

**解决方案：标准化 Artifact 格式**

每个 skill 的输出写入 `.csp/artifacts/` 目录，使用统一格式：

```yaml
# .csp/artifacts/plan-phase-2026-06-11.yaml
artifact:
  type: plan
  skill: csp-plan-phase
  timestamp: 2026-06-11T14:30:00Z
  status: completed
  
outputs:
  primary:
    path: ./plan.md
    format: markdown
    description: "实施计划文档"
  
  metadata:
    estimated_effort: "2 hours"
    risk_level: medium
    dependencies: ["database-migration", "api-endpoint"]
    
next_skills:
  recommended: csp-spec-phase
  alternatives: [csp-execute-phase]
  
context:
  project_stack: [python, django, postgresql]
  related_files: [models.py, views.py, urls.py]
```

**路由器读取 artifact 决定下一步：**

```python
# router 伪代码
def route_after_skill_completion(artifact_path):
    artifact = load_yaml(artifact_path)
    
    # 优先使用用户指定的 next_skill
    if user_override:
        return user_override
    
    # 否则使用 recommended
    next_skill = artifact['next_skills']['recommended']
    
    # 传递 outputs 作为输入
    inputs = artifact['outputs']
    
    return load_skill(next_skill, inputs)
```

### 7.8 编程场景覆盖清单

**确保常见编程场景都有对应 recipe：**

| 场景 | Recipe 名称 | 关键 Skills |
|------|------------|------------|
| 新功能开发 | `feature-development` | plan → propose → implement → tdd → review → verify |
| Bug 修复 | `bug-fix` | debug → implement → tdd → verify |
| 代码重构 | `refactor` | review(分析) → plan → implement → tdd → review(验证) |
| 性能优化 | `performance-optimization` | profile → analyze → implement → benchmark → verify |
| 接手陌生项目 | `onboard-project` | explore → map-codebase → understand-architecture |
| 构建错误修复 | `build-error-fix` | detect-error → resolve → verify-build |
| CI/CD 失败 | `ci-failure` | analyze-logs → debug → fix → verify-ci |
| 数据库迁移 | `database-migration` | plan-migration → generate → test → apply → verify |
| 依赖升级 | `dependency-upgrade` | analyze-deps → plan-upgrade → test → verify |
| 安全修复 | `security-fix` | security-scan → analyze-vulnerability → fix → verify |
| 多栈项目 | `fullstack-feature` | plan → frontend-impl → backend-impl → integration-test |

### 7.9 用户自定义 Recipe 扩展

**允许用户定义自己的 skill 组合：**

用户可在项目根目录创建 `.csp/recipes.yaml`：

```yaml
# .csp/recipes.yaml
recipes:
  # 用户自定义：快速原型开发
  rapid-prototype:
    description: "快速原型，跳过完整测试和文档"
    triggers: ["原型", "prototype", "demo", "快速验证"]
    sequence:
      - skill: csp-brainstorming
        optional: true
      - skill: csp-implement
        layer: 2
      - skill: csp-verify-phase
        mode: basic-check  # 只检查能否运行

  # 用户自定义：热修复
  hotfix:
    description: "紧急生产修复，最小化变更"
    triggers: ["hotfix", "紧急", "生产问题"]
    sequence:
      - skill: csp-debug
        layer: 2
      - skill: csp-implement
        mode: minimal-change
      - skill: csp-verify-phase
        mode: regression-only
      - skill: csp-ship
        auto: true  # 验证通过后自动发布
```

**Recipe 优先级：**
1. 用户自定义 recipe（`.csp/recipes.yaml`）
2. 内置 recipe（`csp-router/recipes.yaml`）
3. Router 动态组合

### 7.10 多栈项目处理策略

**问题：** 前后端同时开发时，如何选择技术栈相关的 skill？

**解决方案：分层探测 + 并行激活**

```yaml
# 多栈项目示例
project_structure:
  frontend/
    package.json  # TypeScript + React
    tsconfig.json
  backend/
    pyproject.toml  # Python + Django
    manage.py
  shared/
    api-contracts.yaml  # OpenAPI 规范

# Router 探测策略
stack_detection:
  strategy: directory-based  # 按目录分别探测
  
  zones:
    - path: frontend/
      stack: typescript-react
      skills: [react-reviewer, react-patterns, react-testing]
      
    - path: backend/
      stack: python-django
      skills: [django-reviewer, django-patterns, python-testing]
      
    - path: shared/
      stack: api-contracts
      skills: [api-design, openapi-validation]
```

**Recipe 处理多栈：**

```yaml
fullstack-feature:
  description: "全栈功能开发（前端+后端）"
  sequence:
    - skill: csp-plan-phase
      outputs: [frontend-plan, backend-plan, api-contract]
    
    - skill: csp-implement
      mode: parallel  # 并行处理前后端
      zones:
        - path: backend/
          sub_recipe: [csp-spec-phase, csp-implement, csp-tdd]
          stack: python-django
        - path: frontend/
          sub_recipe: [csp-spec-phase, csp-implement, csp-tdd]
          stack: typescript-react
    
    - skill: csp-integration-test
      verify: api-contract-compliance
    
    - skill: csp-verify-phase
```

### 7.11 错误信号自动检测

**Router 应自动检测常见错误信号并触发对应 skill：**

```yaml
error_detection:
  # 构建错误
  build_error:
    triggers:
      - stderr_contains: ["error:", "Error:", "failed to compile", "build failed"]
      - exit_code: [1, 2]
      - file_patterns: ["*.log", "build.log"]
    auto_trigger: csp-build-error-fix
    context:
      capture: [stderr, exit_code, error_file]
  
  # 测试失败
  test_failure:
    triggers:
      - stderr_contains: ["FAIL", "AssertionError", "test failed"]
      - exit_code: [1]
      - command_patterns: ["npm test", "pytest", "cargo test"]
    auto_trigger: csp-test-failure-debug
    context:
      capture: [test_output, failing_tests]
  
  # CI 失败
  ci_failure:
    triggers:
      - file_patterns: [".github/workflows/*.yml", ".gitlab-ci.yml"]
      - context: ["post-push", "pr-check"]
    auto_trigger: csp-ci-failure
    context:
      capture: [ci_logs, failed_jobs]
  
  # 运行时错误
  runtime_error:
    triggers:
      - stderr_contains: ["Exception", "Traceback", "panic:", "segmentation fault"]
      - exit_code: [1, 139]
    auto_trigger: csp-debug
    context:
      capture: [stack_trace, error_message]
```

**检测时机：**
- 用户执行 bash 命令后
- 用户粘贴错误日志时
- Git push 后 CI 失败时（通过 hook 检测）

### 7.12 Git 工作流集成

**与 Git 分支、PR 的深度集成：**

```yaml
git_workflow:
  # 分支策略
  branch_strategies:
    feature:
      pattern: "feature/*"
      recipe: feature-development
      auto_verify: true  # 提交前自动验证
    
    hotfix:
      pattern: "hotfix/*"
      recipe: hotfix
      auto_verify: true
      auto_ship: true  # 验证通过后自动合并
    
    refactor:
      pattern: "refactor/*"
      recipe: refactor
      auto_review: true  # 自动触发代码审查
  
  # Git Hook 集成
  hooks:
    pre-commit:
      - skill: csp-verify-phase
        mode: quick-check
        on_fail: abort-commit
    
    pre-push:
      - skill: csp-verify-phase
        mode: full-check
        on_fail: abort-push
    
    post-merge:
      - skill: csp-extract-learnings
        optional: true
  
  # PR 工作流
  pull_request:
    on_create:
      - skill: csp-code-review
        mode: comprehensive
      - skill: csp-verify-phase
        mode: ci-check
    
    on_review_comment:
      - skill: csp-implement
        mode: address-feedback
        context: [review_comments]
```

### 7.13 测试策略矩阵

**不同场景的测试要求：**

| 场景 | 单元测试 | 集成测试 | E2E 测试 | 性能测试 |
|------|---------|---------|---------|---------|
| feature-development | ✅ 必须 | ✅ 必须 | ⚠️ 可选 | ❌ 跳过 |
| bug-fix | ✅ 必须（回归测试） | ✅ 必须 | ⚠️ 可选 | ❌ 跳过 |
| refactor | ✅ 必须（无回归） | ✅ 必须 | ✅ 必须 | ❌ 跳过 |
| performance-optimization | ⚠️ 可选 | ⚠️ 可选 | ❌ 跳过 | ✅ 必须 |
| hotfix | ✅ 必须 | ⚠️ 可选 | ❌ 跳过 | ❌ 跳过 |
| database-migration | ❌ 跳过 | ✅ 必须 | ✅ 必须 | ❌ 跳过 |
| rapid-prototype | ❌ 跳过 | ❌ 跳过 | ❌ 跳过 | ❌ 跳过 |

**测试 Skill 选择：**

```yaml
testing_strategy:
  unit_test:
    skills:
      python: [csp-python-testing, csp-pytest-patterns]
      typescript: [csp-react-testing, csp-jest-patterns]
      rust: [csp-rust-testing]
      go: [csp-golang-testing]
  
  integration_test:
    skills: [csp-integration-testing, csp-api-testing]
  
  e2e_test:
    skills: [csp-e2e-testing, csp-playwright-patterns]
  
  performance_test:
    skills: [csp-performance-testing, csp-benchmark-patterns]
```

### 7.14 文档生成集成

**何时生成文档，如何与代码同步：**

```yaml
documentation_strategy:
  # 自动文档生成时机
  auto_generate:
    on_feature_complete:
      - skill: csp-doc-writer
        mode: api-docs
        trigger: csp-verify-phase 成功后
    
    on_refactor_complete:
      - skill: csp-doc-updater
        mode: update-architecture
        trigger: csp-verify-phase 成功后
    
    on_api_change:
      - skill: csp-doc-writer
        mode: openapi-spec
        trigger: 检测到 API 路由变更
  
  # 文档类型映射
  doc_types:
    api_documentation:
      skill: csp-doc-writer
      format: [openapi, markdown]
      auto: true
    
    architecture_docs:
      skill: csp-doc-writer
      format: [mermaid, markdown]
      auto: false  # 需要手动触发
    
    changelog:
      skill: csp-doc-writer
      mode: changelog
      trigger: csp-ship 成功后
      auto: true
    
    inline_comments:
      skill: csp-code-review
      mode: suggest-comments
      auto: true  # 代码审查时自动建议
```

### 7.15 配置与环境管理

**环境变量、配置文件的处理策略：**

```yaml
config_management:
  # 环境感知
  environment_detection:
    sources:
      - .env
      - .env.local
      - .env.production
      - config/
      - settings.py
      - application.yml
    
    skill_context:
      inject_env_vars: true  # 将环境变量注入 skill 上下文
      mask_secrets: true     # 敏感信息自动脱敏
  
  # 配置文件变更检测
  config_change_detection:
    patterns:
      - "*.env*"
      - "config/**"
      - "settings.*"
      - "*.yml"
      - "*.yaml"
    
    auto_trigger:
      - skill: csp-verify-phase
        mode: config-validation
      - skill: csp-security-review
        mode: secret-scan
  
  # 数据库配置
  database_config:
    detect_from:
      - DATABASE_URL
      - db_config.py
      - database.yml
    
    related_skills:
      - csp-database-migration
      - csp-database-reviewer
```

### 7.16 Skill 版本管理与更新

**如何管理 skill 版本和更新：**

```yaml
versioning:
  # Skill 版本格式
  skill_version:
    format: semver  # major.minor.patch
    example: "1.2.3"
    
    compatibility:
      - major: breaking changes
      - minor: new features, backward compatible
      - patch: bug fixes
  
  # 更新策略
  update_strategy:
    check_interval: weekly  # 每周检查更新
    sources:
      - github: code-skills-package/skills
      - registry: csp-registry.example.com
    
    auto_update:
      patch: true   # 自动更新补丁版本
      minor: false  # 次要版本需确认
      major: false  # 主版本需确认
  
  # 版本锁定
  version_lock:
    file: .csp/versions.lock
    format: |
      csp-plan-phase@1.2.3
      csp-code-review@2.0.1
      csp-debug@1.5.0
    
    update_command: /csp-update [--check] [--apply]
```

### 7.17 冲突处理与优先级

**多个 skill 推荐冲突时的处理：**

```yaml
conflict_resolution:
  # 冲突类型
  conflict_types:
    # 同一 category 多个 skill 匹配
    same_category:
      strategy: priority-based
      rules:
        - user_explicit > auto_detected  # 用户指定优先
        - specific > general             # 具体优先于通用
        - higher_priority wins           # 按 priority 字段排序
    
    # 互斥 skill 同时激活
    mutually_exclusive:
      examples:
        - [csp-quick-fix, csp-feature-development]
        - [csp-rapid-prototype, csp-full-verification]
      strategy: ask_user  # 询问用户选择
    
    # 依赖冲突
    dependency_conflict:
      strategy: resolve_or_skip
      rules:
        - 尝试找到兼容版本
        - 无法解决则提示用户
  
  # 优先级规则
  priority_rules:
    user_override: 1000      # 用户明确指定
    recipe_match: 100        # Recipe 匹配
    trigger_exact: 50        # 精确触发词
    trigger_fuzzy: 20        # 模糊触发词
    stack_detection: 10      # 技术栈检测
    context_match: 5         # 上下文匹配
```

### 7.18 CSP 自身调试与监控

**当 router 选错 skill 或执行异常时的调试机制：**

```yaml
self_debugging:
  # 执行日志
  execution_log:
    location: .csp/logs/
    format: jsonl
    retention: 30d
    
    fields:
      - timestamp
      - user_input
      - router_decision  # router 选择的 skill
      - confidence       # 置信度
      - actual_skill     # 实际执行的 skill
      - duration
      - success
  
  # 调试命令
  debug_commands:
    /csp-why:
      description: "解释为什么选择这个 skill"
      output: router_decision_trace
    
    /csp-debug-router:
      description: "调试 router 决策过程"
      output: detailed_matching_log
    
    /csp-stats:
      description: "查看 CSP 使用统计"
      output: |
        - 总执行次数
        - 成功率
        - 常用 skill
        - 平均耗时
  
  # 性能监控
  performance_monitoring:
    metrics:
      - router_latency      # router 决策耗时
      - skill_load_time     # skill 加载耗时
      - total_execution_time # 总执行时间
      - token_usage         # token 使用量
    
    alerts:
      - router_latency > 2s
      - token_usage > 8000
      - success_rate < 80%
```

---

## 八、Skill 快速检索与定位

当用户或路由器需要反向查找"哪个 skill 能处理 X"时,应具备亚秒级定位能力,而不是遍历 ~200 个 SKILL.md。本节定义四层检索策略,按成本从低到高逐级升级。

### 8.1 四层检索策略

| 层级 | 方法 | 工具 | 延迟 | 适用场景 |
|------|------|------|------|----------|
| L1 索引扫描 | 读 `registry.json` 匹配 name/description/triggers | jq / node | <50ms | 已知关键词或 skill 名片段 |
| L2 触发词反查 | grep `triggers.yaml` 关键词表 | ripgrep | <20ms | 已知用户原话,反推 skill |
| L3 全文语义搜索 | 在所有 SKILL.md 中 grep 概念/术语 | ripgrep + context | <200ms | 只记得概念("CORS"、"migration") |
| L4 模糊匹配 | fzf / 向量索引(可选) | fzf / embedding | <500ms | 拼写不确定或语义模糊 |

### 8.2 L1:registry.json 索引扫描

**常驻入口**:路由器启动时已加载 `registry.json`,可直接用 `jq` 过滤:

```bash
# 按 name 模糊匹配
jq '.skills[] | select(.name | test("react"; "i"))' registry.json

# 按触发词匹配
jq '.skills[] | select(.triggers.keywords | any(contains("review")))' registry.json

# 按技术栈过滤
jq '.skills[] | select(.stack_detection == true and .stacks[] == "python")' registry.json

# 按层级 + category 复合过滤
jq '.skills[] | select(.layer == 4 and .category == "reviewer")' registry.json
```

**封装脚本**:`shared/scripts/csp-search.sh`

```bash
#!/usr/bin/env bash
# 用法: csp-search <query> [--layer N] [--stack X] [--category Y]
query="$1"; shift
filters="true"
while [[ "$1" == --* ]]; do
  case "$1" in
    --layer)    filters="$filters and .layer == $2"; shift 2 ;;
    --stack)    filters="$filters and (.stacks // [] | any(. == \"$2\"))"; shift 2 ;;
    --category) filters="$filters and .category == \"$2\""; shift 2 ;;
  esac
done

jq -r --arg q "$query" \
  ".skills[] | select(
    ($filters) and
    ((.name | test(\$q; \"i\")) or
     (.description | test(\$q; \"i\")) or
     (.triggers.keywords // [] | any(test(\$q; \"i\"))))
  ) | \"\(.name)\t\(.layer)\t\(.description)\"" \
  csp-router/registry.json | column -t -s $'\t'
```

**示例**:

```bash
$ csp-search "review" --stack python --layer 4
csp-python-reviewer   4   Python 专项审查:PEP8、类型提示、安全、性能
csp-django-reviewer   4   Django 专项审查:ORM、DRF、迁移安全
csp-fastapi-reviewer  4   FastAPI 专项审查:async、依赖注入、Pydantic
```

### 8.3 L2:触发词反查 (triggers.yaml grep)

当用户说"帮我做个 CR",路由器需要快速定位到 code-review 类 skill。`triggers.yaml` 是倒排索引:

```yaml
# csp-router/triggers.yaml(片段)
trigger_index:
  "review":
    skills: [csp-code-review, csp-requesting-code-review]
    weight: 50
  "审查":
    skills: [csp-code-review]
    weight: 50
  "CR":
    skills: [csp-code-review]
    weight: 40
  "debug":
    skills: [csp-debug, csp-systematic-debugging, csp-debug-session]
    weight: 50
  "bug":
    skills: [csp-debug]
    weight: 45
```

**检索命令**:

```bash
# 精确触发词
rg -A2 '^  "review":' csp-router/triggers.yaml

# 模糊触发词(支持中英文)
rg -B1 -A3 'skills:.*csp-debug' csp-router/triggers.yaml
```

### 8.4 L3:SKILL.md 全文语义搜索

当用户描述模糊("处理 CORS 的那个 skill")或仅记得概念时,在所有 SKILL.md 中全文检索:

```bash
# 跨所有 SKILL.md 搜概念
rg -l "CORS" csp-*/skills/**/SKILL.md csp-*/agents/**/*.md

# 带上下文查看(-C 3 行)
rg -C3 "CORS" csp-patterns/skills/csp-frontend-patterns/react-patterns.md

# 搜 frontmatter 字段(name/description)
rg -g "**/SKILL.md" "^description:.*migration" -l

# 搜代码示例中的特定 API
rg -l "useEffect" csp-*/skills/**/*.md | head -5
```

**封装脚本**:`shared/scripts/csp-grep.sh`

```bash
#!/usr/bin/env bash
# 用法: csp-grep <pattern> [--type skill|agent|all] [--layer N]
pattern="$1"; shift
type="all"
layer=""
while [[ "$1" == --* ]]; do
  case "$1" in
    --type)  type="$2"; shift 2 ;;
    --layer) layer="$2"; shift 2 ;;
  esac
done

search_paths=()
[[ "$type" == "all" || "$type" == "skill" ]] && search_paths+=("csp-*/skills/**/SKILL.md")
[[ "$type" == "all" || "$type" == "agent" ]] && search_paths+=("csp-*/agents/**/*.md")

if [[ -n "$layer" ]]; then
  search_paths=("csp-layer${layer}-*/**/*.md")
fi

rg -l "$pattern" "${search_paths[@]}" | while read -r f; do
  name=$(grep -m1 "^name:" "$f" | sed 's/name: *//')
  echo "$name  →  $f"
done
```

### 8.5 L4:模糊匹配 (fzf / 向量)

**fzf 交互模式**:

```bash
# 交互式 skill 选择器
csp-search "" | fzf --preview 'jq ".skills[] | select(.name == \"{}\")" csp-router/registry.json'

# 一键加载选中 skill
csp-search "react" | fzf | awk '{print $1}' | xargs -I{} csp-load {}
```

**向量语义索引(可选增强)**:

对 SKILL.md 的描述和触发词生成 embedding,存入 `~/.csp/skill-index.faiss`,仅当 skill 数 > 500 或语义查询频繁时启用,避免过早设计。

### 8.6 检索策略选择决策树

```
用户输入查询
  │
  ├─ 查询是 skill 名片段?("react-rev")
  │   └─ L1: jq 模糊匹配 registry.json  ✅ <50ms
  │
  ├─ 查询是触发词?("review"/"debug"/"plan")
  │   └─ L2: grep triggers.yaml  ✅ <20ms
  │
  ├─ 查询是技术概念?("CORS"/"migration"/"JWT")
  │   └─ L3: ripgrep 所有 SKILL.md  ✅ <200ms
  │
  ├─ 查询模糊或拼写不确定?("那个处理并发的")
  │   ├─ 优先: L3 + 关键词扩展
  │   └─ 兜底: L4 fzf 交互选择  ✅ <500ms
  │
  └─ 查询需要语义理解?("让网站更快")
      └─ L4 向量索引(如已构建)  ✅ <500ms
      └─ 或 L3 同义词扩展("performance|优化|加速|慢")
```

### 8.7 索引维护与一致性

**触发时机**:

| 事件 | 动作 |
|------|------|
| 新增/删除 skill | 自动更新 `registry.json` + `triggers.yaml` |
| 修改 SKILL.md 的 frontmatter | 自动同步 `registry.json` |
| 修改 SKILL.md 正文 | 不影响索引,无需动作 |
| 用户执行 `csp-update` | 重建全部索引 |
| 手动触发 | `csp-reindex` 命令 |

**校验命令**:

```bash
csp-reindex --dry-run
# [OK]   csp-react-reviewer: registry ↔ SKILL.md 一致
# [WARN] csp-go-reviewer: SKILL.md 已修改,需同步 description
# [ERR]  csp-orphan-skill: SKILL.md 存在但 registry 无记录

csp-reindex --apply   # 应用修复
```

### 8.8 跨平台工具兼容性

| 平台 | grep 替代 | 安装 |
|------|----------|------|
| macOS/Linux | ripgrep (`rg`) | `brew install ripgrep` / `apt install ripgrep` |
| Windows | ripgrep 或 `Select-String` | `scoop install ripgrep` |
| 无 ripgrep | 回退到 `grep -rE` | 系统自带 |
| 无 jq | 回退到 node/python 解析 | `npm install -g node-jq` |

**降级策略**:

```bash
if command -v rg &>/dev/null; then
  GREP_CMD="rg"
elif command -v grep &>/dev/null; then
  GREP_CMD="grep -rE"
else
  echo "ERROR: no grep tool found" >&2; exit 1
fi
```

---

## 九、Token 节约策略

### 9.1 三级加载

| 级别 | 内容 | 加载时机 | 大小 |
|------|------|----------|------|
| **索引** | registry.json 条目 | 会话启动 | ~60 tokens/skill × ~200 skills = ~12K |
| **正文** | SKILL.md 主体 | router 匹配后 | ~200-600 tokens/skill |
| **深度** | references/*, examples/* | 执行中按需 | 可变 |

### 9.2 索引优化

registry.json 的 `description` 字段控制在 80 字以内,只放路由需要的信息。
完整的 skill 文档放在 SKILL.md 中,仅在匹配后才加载。

### 9.3 上下文预算

单次任务激活的 skill 总 token 预算上限:

| 任务复杂度 | 最大激活数 | Token 预算 |
|-----------|-----------|-----------|
| 简单(单 skill) | 1-2 | ~1,200 |
| 中等(workflow + patterns) | 3-4 | ~3,000 |
| 复杂(全链路 plan→execute→verify) | 5 | ~5,000 |

---

## 十、合并策略详细规则

### 10.1 重叠 Skill 合并原则

当多个来源有同类 skill 时:

1. **选择最完整版本**作为基础
2. **吸收其他版本的独特点**作为补充章节
3. **统一命名**,去掉来源前缀
4. **在 MIGRATION.md 中记录映射**

### 10.2 具体合并案例

#### 代码审查 (Code Review)

| 来源 | 原始名称 | 处理方式 |
|------|----------|----------|
| ECC | `code-reviewer` agent | ✅ 作为主 agent |
| ECC | 14 个语言专项 reviewer | ✅ 全部保留 |
| GSD | `gsd-code-reviewer` | 🔀 REVIEW.md 输出格式合入主 agent |
| OMC | `code-reviewer` | 🔀 严重度评级逻辑合入主 agent |
| OMC | `critic` | 🔀 多角度审查逻辑合入 |
| SP | `requesting-code-review` | ✅ 保留为元技能 |
| SP | `receiving-code-review` | ✅ 保留为元技能 |

合并结果:
- `csp-patterns/skills/code-review/SKILL.md` — 统一审查流程
- `csp-patterns/agents/code-reviewer.md` — 统一审查 agent(含 REVIEW.md 输出)
- `csp-patterns/skills/reviewers/<lang>-reviewer.md` — 语言专项(14 个)
- `csp-meta/skills/csp-requesting-code-review/SKILL.md` — 元技能(如何请求)
- `csp-meta/skills/csp-receiving-code-review/SKILL.md` — 元技能(如何接收)

#### 调试 (Debug)

| 来源 | 原始名称 | 处理方式 |
|------|----------|----------|
| GSD | `gsd-debug-session-manager` | ✅ 保留多轮管理架构 |
| GSD | `gsd-debugger` | ✅ 保留科学方法调试 |
| OMC | `debugger` | 🔀 根因分析合入 |
| OMC | `trace` + `tracer` | 🔀 证据追踪合入 GSD forensics |
| ECC | `agent-introspection-debugging` | ✅ 保留(Agent 自省独特) |
| SP | `systematic-debugging` | ✅ 保留为元技能 |

合并结果:
- `csp-workflow/commands/csp-debug.md` — 调试工作流入口
- `csp-workflow/agents/csp-debug-session-manager.md` — 多轮管理
- `csp-workflow/agents/csp-debugger.md` — 科学调试 agent
- `csp-workflow/workflows/csp-forensics.md` — 取证分析(吸收 OMC trace)
- `csp-patterns/skills/csp-agent-introspection-debugging/SKILL.md` — Agent 自省
- `csp-meta/skills/csp-systematic-debugging/SKILL.md` — 元技能

---

## 十一、用户上手路径

### 11.1 安装

```bash
# 方式一: 直接复制
cp -r code-skills-package/ ~/.csp/
# 在 CLAUDE.md 中引用

# 方式二: Claude Code 插件
# (未来) claude plugin install csp
```

### 11.2 首次使用

用户只需在 CLAUDE.md 中加一行:
```markdown
使用 CSP (Code Skills Package) 技能包。当用户给出任务时,先通过 csp-router 路由。
```

之后正常给 Claude 下任务即可,路由器会自动工作。

### 11.3 渐进式学习

| 阶段 | 用户操作 | 系统行为 |
|------|----------|----------|
| **新手** | 直接描述任务 | router 自动选 skill,用户无需知道 skill 名称 |
| **进阶** | 使用 slash command(如 `/csp-debug`) | 直接触发特定 workflow |
| **高级** | 阅读 SKILL-INDEX.md 了解全部能力 | 手动指定 skill 组合 |
| **专家** | 编写自定义 skill | 按 SP 的 SKILL.md 格式扩展 |

### 11.4 Slash Commands

CSP 提供统一的 slash command 前缀 `/csp-`,**不保留**任何原始项目前缀:

```
/csp-plan          # 进入规划阶段
/csp-debug         # 进入调试流程
/csp-review        # 代码审查
/csp-test          # 测试流程
/csp-ship          # 发布流程
/csp-spec          # 规范驱动流程
/csp-spec-phase    # 澄清阶段需求
/csp-execute-phase # 执行阶段计划
/csp-verify-phase  # 验证实现
/csp-search <query> # 搜索 skill 索引
```

**注意**: 不提供 `/gsd-`, `/csp-`, `/ecc-` 等原始前缀的兼容入口。

---

## 十二、迁移计划

### Phase 1: 骨架搭建 (已完成 ✅ 2026-06-11)
- [x] 项目根目录创建
- [x] SKILL-INDEX.md 生成
- [x] ARCHITECTURE.md 定稿（含十三章核心设计原则）
- [x] SKILL-INDEX.md 覆盖率审计（5 个参考项目全量核对，2026-06-11）
- [x] CLAUDE.md 主入口创建（路由说明 + 安装指引）
- [x] 目录骨架创建（csp-router/ csp-meta/ csp-workflow/ csp-meta/skills/csp-spec-driven-development/ csp-patterns/ csp-runtime/ shared/）
- [x] csp-router 实现（registry.json + triggers.yaml + SKILL.md）
- [x] MIGRATION.md 来源→CSP 映射表
- [x] ARCHITECTURE.md.bak 清理（旧版备份）

### Phase 2: 元技能迁移 (L1)
- [x] 复制 SP 14 个 skills → csp-meta/skills/ (✅ 2026-06-14, 实际 22 个含后续新增)
- [x] 验证 frontmatter 格式一致性 (✅ 2026-06-14, 统一 layer/name/description 字段, 99.3% 合规)

### Phase 3: 工作流迁移 (L2)
- [x] 复制 GSD commands → csp-workflow/commands/ (✅ 2026-06-14, 已存在)
- [x] 复制 GSD agents → csp-workflow/agents/ (✅ 2026-06-14, 已存在)
- [x] 处理 GSD hooks 依赖 (✅ 2026-06-14, hooks 已独立)
- [x] 处理路径引用 (✅ 2026-06-14, 路径一致)

### Phase 4: 规范驱动集成 (L3)
- [x] 规范驱动已吸收至 csp-meta + csp-workflow
- [x] schemas → csp-meta/skills/csp-spec-driven-development/schemas/
- [x] 编写 CLI 集成说明

### Phase 5: 技术库迁移 (L3)
- [x] 复制 ECC skills → csp-patterns/skills/ (✅ 2026-06-14, 已存在)
- [x] 复制 ECC agents → csp-patterns/agents/ (✅ 2026-06-14, 已存在)
- [x] 合并重叠项(code-review, debug, verify 等) (✅ 已在 Phase 1 完成)
- [x] 生成 registry.json (✅ 已验证一致性, 0 missing paths)

### Phase 6: 运行时迁移 (L4)
- [x] 精选 OMC 独特 skills → csp-runtime/skills/ (✅ 2026-06-14, 已存在)
- [x] 验证独立性(去除 OMC 内部依赖) (✅ 2026-06-14, 已清理 OMC 引用)

### Phase 7: 测试 & 文档
- [ ] 端到端测试:给定任务→router→skill 执行
- [ ] 完善 MIGRATION.md
- [ ] 编写用户指南

---

## 十三、开放问题与决策记录

### 已决策

| # | 问题 | 决策 | 理由 |
|---|------|------|------|
| 1 | registry.json 规模与加载策略 | **分片加载**：按节点类型分片，skill 名称与任务场景挂钩，router 按触发规则加载，csp-auto 按 DAG 节点动态加载 | 全量 ~12K tokens，分片后单次任务仅 ~500-1,500 tokens，节约 87-96% |
| 2 | 规范驱动 | **吸收至 GSD workflow + meta skills**，无外部 CLI 依赖 |
| 3 | GSD hooks 集成 | **全部迁移**，根据 CSP 项目结构调整路径和配置 | hooks 是 GSD 核心能力，确保工作流防护完整 |
| 4 | 版本管理与更新同步 | 编写脚本拉取来源项目最新提交，记录更新的功能，生成 `update-plan-[date].md` 供人工审查 | 半自动流程：脚本负责发现变更，人工决定是否合入 |
| 5 | 多平台支持 | **全平台支持**：Claude Code / Cursor / Windsurf / Kiro / Codex / Gemini CLI，提供一键自动化安装脚本 | 最大化覆盖面，各平台均通过标准化安装脚本部署 |

### 安装脚本设计（全平台）

```bash
# 一键安装（自动检测平台）
curl -fsSL https://csp.dev/install.sh | bash

# 或手动指定平台
csp-install --platform claude-code   # Claude Code
csp-install --platform cursor        # Cursor
csp-install --platform windsurf      # Windsurf
csp-install --platform kiro          # Kiro
csp-install --platform codex         # Codex
csp-install --platform gemini        # Gemini CLI
```

安装脚本负责：
1. 检测目标平台的配置目录（如 `~/.claude/`、`~/.cursor/`）
2. 复制 CSP 文件到对应目录
3. 生成平台特定的配置文件（CLAUDE.md / .cursorrules / .windsurfrules 等）
4. 配置 hooks 和 slash commands
5. 验证安装结果

### 版本更新脚本设计

```bash
# 检查并生成更新计划
csp-update-check

# 输出：update-plan-2026-06-11.md
# 内容：
# - ECC: 3 new skills, 2 bug fixes since last sync
# - GSD: 1 new workflow, hook improvements
# - OMC: no changes
# - SP: no changes
#
# 建议操作：
# [ ] 合入 ECC react-performance skill
# [ ] 合入 GSD hook improvements

# 执行更新（人工审查后）
csp-update-apply --plan update-plan-2026-06-11.md
```

### 待讨论

（暂无）

---

## 十四、核心设计原则详解

### 14.1 用户上手：三层入口，零学习成本

CSP 提供三种使用方式，覆盖从新手到专家的全部用户画像：

| 入口层 | 使用方式 | 示例 | 适用用户 |
|--------|----------|------|----------|
| **自然语言**（推荐） | 直接描述任务 | "帮我做个 code review" | 所有用户 |
| **斜杠命令**（进阶） | `/csp-xxx` | `/csp-plan-phase` | 熟悉命令的用户 |
| **直接调用**（专家） | 手动指定 skill | 加载 `csp-react-reviewer` | 高级用户 |

**自然语言驱动的完整流程：**

```
用户："帮我做个 code review"
  ↓
路由器（L0 常驻）：
  1. 触发词匹配："code review" → csp-code-review 类
  2. 文件探测：项目含 .tsx → TypeScript + React
  3. 组合决策：加载 csp-code-review + csp-react-reviewer
  ↓
执行：输出 REVIEW.md
```

**安装即用：** `./install.sh` 一键部署到 18 个平台，无需任何配置。

---

### 14.2 渐进式披露：频率驱动的分层加载

当前六层架构的披露策略按使用频率排序：

| 层级 | 披露时机 | Token 成本 | 使用频率 |
|------|----------|-----------|----------|
| L0 router | 会话启动常驻 | ~800 | 100%（每次会话） |
| L1 meta | 需要方法论时 | ~300/skill | 高（规划/调试/TDD） |
| L2 workflow | 项目管理流程时 | ~500/skill | 高（plan/execute/verify） |
| L3 spec | 规范驱动时 | ~400/skill | 中（大型功能） |
| L4 patterns | 识别技术栈后 | ~200-600/skill | 中（专项审查） |
| L4 runtime | 自主执行/知识管理时 | ~300/skill | 低（autopilot/ralph） |

**增强披露策略：**

1. **场景模板（Bundle）：** 预定义常见场景的 skill 组合，一次性加载相关 skill 集合

   | 场景模板 | 包含 skills | 触发条件 |
   |----------|------------|----------|
   | 新功能开发包 | csp-plan-phase + csp-execute-phase + csp-verify-phase | "开发一个新功能" |
   | Bug 修复包 | csp-debug + csp-systematic-debugging + 语言 reviewer | "有个 bug 需要修" |
   | Code Review 包 | csp-code-review + 语言 reviewer + csp-security-review | "review 这段代码" |
   | 安全审计包 | csp-security-review + csp-secure-phase + 框架安全 skill | "安全审查" |

2. **上下文感知加载：**
   - 检测到 `.planning/` 目录存在 → 自动预加载 workflow 相关 skill
   - 检测到 `specs/` 目录存在 → 自动预加载 spec-driven 相关 skill
   - 检测到 git merge conflict → 自动提示冲突解决 skill

---

### 14.3 Token 节约：四层优化策略

**第一层：索引分片（已设计）**

```
全量加载 200 个 skills:  ~80,000 tokens
分片按需加载:            ~2,000 tokens
节约:                    97%
```

**第二层：技能摘要缓存**

路由器在 `registry.json` 中维护每个 skill 的单行摘要（~30 tokens）。路由器仅需读取摘要即可判断是否需要加载完整 SKILL.md。

```json
{
  "name": "csp-react-reviewer",
  "summary": "React/JSX 专项审查：hook 正确性、render 性能、server/client 边界",
  "tokens": 25
}
```

避免重复读取已使用过的 skill 全文。预期收益：**-15% 重复加载**。

**第三层：动态卸载**

任务完成后，卸载 L4-L5 层的 skill 正文，仅保留 L0-L2 的核心上下文。

```
执行 csp-react-reviewer 完成
  → 卸载 L4 skill 正文（释放 ~400 tokens）
  → 保留执行结果摘要（~50 tokens）
```

预期收益：**-30% 长会话 token 消耗**。

**第四层：共享上下文**

多个 skill 共享 `.planning/` 和 `.specs/` 目录，避免跨 skill 调用时重复传递项目上下文。

```
csp-plan-phase → 写入 .planning/PLAN.md
csp-execute-phase → 读取 .planning/PLAN.md（无需重新传递项目背景）
csp-verify-phase → 读取 .planning/PLAN.md + .planning/VERIFICATION.md
```

预期收益：**-20% 跨 skill 调用开销**。

**综合效果：**

| 优化层 | 策略 | 单独收益 | 叠加效果 |
|--------|------|----------|----------|
| 第一层 | 索引分片 | 97% | 基线 |
| 第二层 | 摘要缓存 | -15% | 在基线上再省 15% |
| 第三层 | 动态卸载 | -30% | 长会话显著降低 |
| 第四层 | 共享上下文 | -20% | 多 skill 协作场景 |

---

### 14.4 路由策略：五层信号融合

路由器采用五层信号融合，按优先级从高到低：

```
┌─────────────────────────────────────────────────┐
│  信号层 1：显式指令（最高优先级）                  │
│  ─ 用户说"用 TDD 方式" → 强制 csp-test-driven-development │
├─────────────────────────────────────────────────┤
│  信号层 2：触发词匹配（权重 40%）                  │
│  ─ "review" → code-review 类                     │
│  ─ "debug"/"bug" → debug 类                      │
│  ─ "plan"/"规划" → planning 类                    │
├─────────────────────────────────────────────────┤
│  信号层 3：文件类型探测（权重 30%）                │
│  ─ .py → Python reviewer                         │
│  ─ .tsx/.jsx → React reviewer                    │
│  ─ .rs → Rust reviewer                           │
│  ─ .go → Go reviewer                             │
├─────────────────────────────────────────────────┤
│  信号层 4：项目结构探测（权重 20%）                │
│  ─ pyproject.toml / requirements.txt → Python 技术栈 │
│  ─ Cargo.toml → Rust 技术栈                       │
│  ─ package.json + next.config.js → Next.js 技术栈 │
│  ─ go.mod → Go 技术栈                             │
├─────────────────────────────────────────────────┤
│  信号层 5：历史偏好（权重 10%）                    │
│  ─ 用户上次使用了 csp-django-reviewer → 下次优先推荐 │
│  ─ 记录在 ~/.csp/preferences.json                  │
└─────────────────────────────────────────────────┘
```

**多 skill 组合示例：**

```
用户："帮我规划并实现用户认证功能"

路由器决策过程：
  信号 1："规划" → csp-plan-phase (L2)
  信号 2："用户认证" → csp-auth-patterns (L4)
  信号 3：检测到 Django 项目 → csp-django-security (L4)
  信号 4：新功能 → 预加载 csp-verify-phase (L2)

  组合执行：plan → auth-patterns → django-security → verify
```

**路由决策输出格式：**

```markdown
## 路由决策

**匹配 skills：**
1. `csp-plan-phase` (L2) — 触发词"规划"，置信度 95%
2. `csp-auth-patterns` (L4) — 语义"用户认证"，置信度 88%
3. `csp-django-security` (L4) — 项目探测 Django，置信度 92%

**执行顺序：** plan → auth-patterns → django-security
**预计 Token 消耗：** ~1,800 tokens
```

---

### 14.5 架构增强方向

#### A. 路由器意图分类（轻量级）

在路由器中加入四大意图分类规则，仅需 ~100 tokens 的规则定义：

| 意图 | 触发模式 | 默认加载层 |
|------|----------|-----------|
| **规划** | "规划/设计/plan/design/architecture" | L1(meta) + L2(workflow) |
| **实现** | "实现/添加/创建/implement/add/create" | L4(patterns) |
| **调试** | "bug/debug/错误/error/崩溃/crash" | L1(meta) + L2(workflow) |
| **审查** | "review/审查/检查/check/security" | L4(patterns) |

意图分类不依赖外部模型，仅使用触发词 + 正则匹配，保持路由器的轻量性。

#### B. Skill 依赖图

在 `registry.json` 中为每个 skill 声明依赖关系，路由器自动加载前置 skill：

```json
{
  "name": "csp-django-reviewer",
  "layer": 4,
  "dependsOn": ["csp-python-reviewer", "csp-security-reviewer"],
  "summary": "Django 专项审查：ORM 正确性、DRF 模式、迁移安全"
}
```

**加载逻辑：**
```
路由器选择 csp-django-reviewer
  → 检查 dependsOn → 发现 csp-python-reviewer 未加载
  → 先加载 csp-python-reviewer（摘要 30 tokens + 正文 350 tokens）
  → 再加载 csp-django-reviewer（正文 400 tokens）
  → 两个 reviewer 共享上下文执行
```

**依赖类型：**

| 类型 | 字段 | 语义 | 示例 |
|------|------|------|------|
| 硬依赖 | `dependsOn` | 必须先加载 | django-reviewer 依赖 python-reviewer |
| 软依赖 | `enhances` | 可选增强 | security-review 增强 code-review |
| 互斥 | `conflicts` | 不可同时加载 | 不同框架的同类 reviewer |

#### C. 会话状态持久化

在 `~/.csp/` 目录持久化会话状态，跨会话复用：

```
~/.csp/
├── session-state.json    # 当前会话已加载的 skill 列表
├── preferences.json      # 用户偏好（常用语言、偏好 skill）
└── history.jsonl         # 历史任务记录（用于推荐）
```

**session-state.json 结构：**

```json
{
  "session_id": "2026-06-11-abc123",
  "loaded_skills": [
    {"name": "csp-plan-phase", "layer": 2, "loaded_at": "2026-06-11T10:00:00Z"},
    {"name": "csp-react-reviewer", "layer": 4, "loaded_at": "2026-06-11T10:05:00Z"}
  ],
  "project_context": {
    "languages": ["typescript", "python"],
    "frameworks": ["nextjs", "django"],
    "build_tools": ["vite", "poetry"]
  }
}
```

**preferences.json 结构：**

```json
{
  "preferred_languages": ["python", "typescript"],
  "preferred_reviewers": ["csp-python-reviewer", "csp-react-reviewer"],
  "auto_load_on_start": ["csp-code-review"],
  "last_used": "2026-06-11T10:30:00Z"
}
```

**使用场景：**
- 新会话启动时，路由器读取 `preferences.json`，优先推荐常用 skill
- 任务完成后，更新 `session-state.json` 记录已加载 skill
- 下次会话打开同一项目时，跳过已知的技术栈探测步骤
