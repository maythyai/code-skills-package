# CSP (Code Skills Package) — 统一编程技能包

> 版本: v0.2 | 日期: 2026-06-11

CSP 将 6 个开源 AI 编程辅助项目的精华整合为一体化解决方案,提供自动路由、分层加载、规范驱动的开发工作流。

---

## 快速开始

### 安装

**方式一:一键安装(推荐)**

```bash
# 自动检测当前项目的 AI 编程工具并安装
./install.sh

# 指定平台安装（支持 18 个平台）
./install.sh --platform claude-code   # Claude Code
./install.sh --platform cursor        # Cursor
./install.sh --platform copilot-cli   # Copilot CLI
./install.sh --platform hermes-agent  # Hermes Agent
./install.sh --platform windsurf      # Windsurf
./install.sh --platform kiro          # Kiro
./install.sh --platform gemini-cli    # Gemini CLI
./install.sh --platform codex         # Codex
./install.sh --platform aider         # Aider
./install.sh --platform trae          # Trae
./install.sh --platform vscode        # VS Code (Copilot)
./install.sh --platform deerflow      # DeerFlow
./install.sh --platform opencode      # OpenCode
./install.sh --platform openclaw      # OpenClaw
./install.sh --platform qwen-code     # Qwen Code
./install.sh --platform antigravity   # Antigravity
./install.sh --platform claw-code     # Claw Code
./install.sh --platform qoder         # Qoder

# 全局安装（安装到 ~/.xxx/skills/）
./install.sh --platform trae --global

# 卸载
./install.sh --uninstall

# 列出检测到的平台
./install.sh --list
```

**方式二:手动复制**

```bash
# 复制 CSP 到目标目录
cp -r code-skills-package/ ~/.csp/

# 在项目 CLAUDE.md 中添加引用(见下方"使用方式")
```

### 使用方式

**入口一:自然语言(推荐,零学习成本)**

在项目 `CLAUDE.md` 中添加:

```markdown
使用 CSP (Code Skills Package) 技能包。当用户给出任务时,先通过 csp-router 路由到合适的 skill 组合。
```

之后正常给 Claude 下任务即可:

- "帮我做个 code review" → 自动加载 `csp-code-review` + 语言专项 reviewer
- "规划并实现用户认证功能" → csp-brainstorming (可选) → csp-spec-phase → csp-discuss-phase → csp-plan-phase → csp-execute-phase → csp-tdd → csp-code-review → csp-verification → csp-ship
- "这个 Django 项目有个 bug" → 自动加载 `csp-debug` + `csp-django-patterns`

**入口二:斜杠命令(进阶)**

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

**入口三:直接调用(专家)**

手动指定加载特定 skill:

```markdown
加载 csp-react-reviewer 审查这段代码
加载 csp-plan-phase 规划这个功能
```

---

## 架构概览

### 五层架构

```
┌─────────────────────────────────────────────────────┐
│  Layer 0: csp-router  (常驻,~800 tokens)            │
│  ─ 任务分类 + skill 选择 + 上下文探测                │
├─────────────────────────────────────────────────────┤
│  Layer 1: csp-meta    (SP 17 个元技能)               │
│  ─ 方法论层: brainstorming, TDD, debugging...        │
│     + BMAD: csp-brainstorming(含SCAMPER等框架),       │
│       csp-party-mode                                 │
├─────────────────────────────────────────────────────┤
│  Layer 2: csp-workflow (CSP 93 workflows 骨架)      │
│  ─ 项目管理: plan → execute → verify → ship          │
├─────────────────────────────────────────────────────┤
│  Layer 1: csp-meta    (spec-driven 方法论并入元技能)          │
│  ─ 规范驱动: propose → specs → apply → verify        │
├─────────────────────────────────────────────────────┤
│  Layer 3: csp-patterns (ECC 技术库 ~200 skills)     │
│  ─ 语言/框架 patterns, reviewers, build-resolvers    │
├─────────────────────────────────────────────────────┤
│  Layer 4: csp-runtime (OMC 独特能力 ~20 skills)     │
│  ─ autopilot, ralph, wiki, remember, self-improve    │
└─────────────────────────────────────────────────────┘
```

### 核心特性

- **自动路由**:用户描述任务,系统自动选择最匹配的 skill 组合
- **渐进式披露**:索引常驻,正文懒加载,深度材料按需再加载
- **Token 节约**:分片加载,单次任务仅需 ~500-1,500 tokens(vs 全量 12,000)
- **规范驱动**:CSP 阶段工作流 + spec-driven 元技能,proposal → specs → apply → verify
- **多栈支持**:Python/Rust/Go/TypeScript/Java/Kotlin/Swift 等 10+ 语言

---

## 常见场景

### 需求澄清(新增 DEFINE 阶段)

```
用户:"我想做个什么,但不太确定具体要什么"
  ↓
csp-router:识别为 underspecified-requirement
  ↓
csp-interview-me (一问一答提取真实意图) → csp-brainstorming (发散-收敛打磨概念+设计) → csp-spec-driven-development (写入规范)
```

### 新功能开发

```
用户:"开发用户认证功能"
  ↓
csp-router:识别为 feature-development
  ↓
csp-brainstorming (可选) → csp-spec-phase → csp-discuss-phase → csp-plan-phase → csp-execute-phase → csp-tdd → csp-code-review → csp-verification → csp-ship
```

### Bug 修复

```
用户:"这个 Django 项目有个 bug"
  ↓
csp-router:识别为 bug-fix + 技术栈探测(Django)
  ↓
csp-debug → csp-implement → csp-tdd (回归测试) → csp-verification
```

### 代码审查

```
用户:"帮我做个 code review"
  ↓
csp-router:识别为 review + 文件探测(.tsx → React)
  ↓
csp-code-review + csp-react-reviewer → 输出 REVIEW.md
```

### 知识复合

```
用户:"那个 bug 修好了"
  ↓
csp-router:识别为 problem-solved
  ↓
csp-compound → 记录解决方案到 docs/solutions/ → 自动检查 discoverability → 更新 CONCEPTS.md
```

### 文档审查

```
用户:"审查这个计划文档"
  ↓
csp-router:识别为 doc-review
  ↓
csp-coherence-reviewer + csp-scope-guardian + csp-product-lens → 合并报告
```

### Skill 自优化

```
用户:"优化一下 skills,让它们更懂我的需求"
  ↓
csp-router:识别为 skill-optimization
  ↓
csp-skill-optimizer (收集反馈 → 分析缺口 → 生成优化 → 用户审批 → 应用/PR)
```

### 接手陌生项目

```
用户:"我刚接手这个项目,需要理解架构"
  ↓
csp-router:识别为 onboard-project
  ↓
csp-explore → csp-map-codebase → csp-understand-architecture
```

---

### 版本锁定

项目根目录 `.csp/versions.lock` 记录当前使用的 skill 版本:

```
csp-plan-phase@1.2.3
csp-code-review@2.0.1
csp-debug@1.5.0
```

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
      - skill: csp-verification
        mode: basic-check

  # 热修复
  hotfix:
    description: "紧急生产修复,最小化变更"
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

**Recipe 优先级:**
1. 用户自定义 recipe(`.csp/recipes.yaml`)
2. 内置 recipe(`csp-router/recipes.yaml`)
3. Router 动态组合

---

## 故障排查

### 为什么选择了这个 skill?

```bash
/csp-why
# 输出:router 决策追踪
# 匹配 skills:
# 1. csp-plan-phase (L2) — 触发词"规划",置信度 95%
# 2. csp-auth-patterns (L4) — 语义"用户认证",置信度 88%
```

### 调试 router 决策

```bash
/csp-debug-router
# 输出:详细匹配日志
```

### 查看使用统计

```bash
/csp-stats
# 输出:
# - 总执行次数: 47
# - 成功率: 94%
# - 常用 skill: csp-code-review, csp-plan-phase
# - 平均耗时: 2.3s
```

---

## 进一步阅读

- **完整架构设计**:[ARCHITECTURE.md](./ARCHITECTURE.md)
- **Skill 索引**:[SKILL-INDEX.md](./SKILL-INDEX.md)
- **迁移映射表**:[MIGRATION.md](./MIGRATION.md)

---

## 许可证

CSP 整合的 6 个项目均采用 MIT 或 Apache 2.0 许可证。具体见各项目原始 LICENSE 文件。
