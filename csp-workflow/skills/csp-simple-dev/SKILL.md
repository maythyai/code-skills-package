---
name: csp-simple-dev
description: |
  极简模式直接改码引擎。无 PRD、无设计模式时的一句话需求快速实现入口。
  从一句话需求出发：快速定位 → 最小改动实现 → 轻量验证 → 归档。
  整合 minimal-change-engineer 纪律（拒绝范围蔓延），按变更类型自动分发到
  csp-hotfix（紧急 bug）/ csp-tweak（文案配置）/ 自身默认流程。
  当用户说"极简模式""简单模式""直接改码""无PRD""快速改"时使用。
  关键词：极简模式、简单模式、直接改码、无PRD、快速改、simple dev、
  minimal mode、直接改、快速实现、轻量开发。
version: "1.0.0"
layer: 2
category: workflow
phase: build
domain: patterns
scope: implementation
role: specialist
tools: [Read, Write, Edit, Glob, Grep, Bash]

dependencies:
  skills: []

related_skills:
  - csp-hotfix
  - csp-tweak
  - csp-minimal-change-engineer
  - csp-implementation-phase
  - csp-explore

triggers:
  keywords: ["极简模式", "简单模式", "直接改码", "无PRD", "快速改",
             "simple dev", "minimal mode", "直接改", "快速实现", "轻量开发"]
  intents:
    - "user wants to change code without PRD or design docs"
    - "user needs minimal implementation with no formal process"
    - "user explicitly requests simple/minimal mode development"
  context:
    - "no_prd_provided"
    - "no_design_pattern_specified"

anti_rationalizations:
  "这个改动太小不需要任何流程": "再小的改动也需要定位→改→验证三步。跳过验证是最常见的回归来源。极简模式是精简流程，不是无流程。"
  "直接改就好了，不用定位": "不定位就改 = 盲改。快速定位（1-2 分钟 Glob+Read）能避免改错文件、漏改调用方。"
  "既然是极简模式，顺便把旁边的代码也改了": "极简模式的核心纪律就是最小 diff。范围蔓延是极简模式的头号敌人。旁边的代码问题记为 follow-up。"
  "极简模式不用写测试": "极简模式默认不强制测试，但涉及业务逻辑/数据/权限的改动仍需最小回归测试。是否写测试由改动风险决定，不由模式决定。"
---

# Simple Dev

极简模式直接改码引擎 — 无 PRD、无设计模式时的一句话需求快速实现。

## 核心理念

极简模式不是"没有流程"，而是"最短有效路径"。保留 **定位 → 改 → 验证** 的最小闭环，砍掉 design / spec / plan / review 等重型阶段。核心纪律来自 `csp-minimal-change-engineer`：只改被要求的，拒绝范围蔓延。

极简模式与完整流程的对比：

| 维度 | 完整流程（csp-lifecycle-orchestrator） | 极简模式（本技能） |
|------|--------------------------------------|------------------|
| 需求输入 | PRD / Spec / 设计文档 | 一句话需求 |
| 设计阶段 | 概要 + 详细 + 评审 | 无 |
| 任务拆解 | WBS + DAG + Waves | 无（单次改动） |
| 评审 | 多角色并行 | 无 |
| 验证 | 全量 + 回归 + E2E | 轻量（改对即止 + 受影响路径） |
| 产物 | 完整 .csp/ 工件链 | 代码 + 可选 follow-up 记录 |

**适用判定**：当需求是一句话、无 PRD、无设计文档、改动范围明确时，用极简模式。否则升级。

## 适用场景

- ✅ 一句话需求（"改一下登录页按钮文案""这个接口加个分页参数"）
- ✅ 用户明确说"极简模式""简单模式""直接改""不用设计"
- ✅ 无 PRD、无设计文档、无 Spec
- ✅ 改动范围明确（1-3 个文件）
- ❌ 紧急线上 bug → `csp-hotfix`（需要回归测试）
- ❌ 文案/配置/文档微调 → `csp-tweak`（更轻量）
- ❌ 需要架构决策 → `csp-design-hub`
- ❌ 需要完整开发流程 → `csp-lifecycle-orchestrator`
- ❌ 改动涉及 3+ 文件或架构变更 → 升级到 `csp-implementation-phase`

## 分发逻辑

进入极简模式后，先按变更类型判断是否分发到更专用的轻量技能：

| 信号 | 路由到 | 理由 |
|------|--------|------|
| 提及"线上""生产""紧急""P0""故障" | `csp-hotfix` | 紧急 bug 需要回归测试，风险更高 |
| 改动是文案/配置/文档/注释/日志 | `csp-tweak` | 最轻量流程足够，无需定位调用链 |
| 其他情况 | 本技能默认流程 | 需要定位 → 改 → 轻量验证 |

**分发原则**：能更轻就更轻，但不能省验证。tweak 可省测试，hotfix 不可省回归测试，simple-dev 默认按风险决定是否测试。

## 默认流程

### Step 1: 需求解析（1 分钟）

把一句话需求转成可执行的改动描述：

- 要改什么（哪个文件 / 哪个函数 / 哪个行为）
- 改动后预期行为
- 不改什么（明确范围边界）

输出（对话级，不落盘）：
```
需求: [原话]
改动: [文件:函数] 从 X 改为 Y
预期: [改后行为]
范围边界: 不涉及 [Z]
```

如需求有歧义（"改一下那个功能"——哪个功能？），先问 1 个澄清问题再继续，不猜。

### Step 2: 快速定位（2-5 分钟）

用 `csp-explore` 的单问题探索方法论，但只定位不改：

- `Glob` 找候选文件
- `Grep` 定位关键符号 / 调用方
- `Read` 读相关代码段（只读改动的函数 + 直接调用方）

**定位红线**：
- 必须找到所有调用方（`Grep` 函数名），避免改了定义漏改调用
- 必须确认改动是否影响公共接口（影响则升级到 `csp-implementation-phase`）
- 不读无关代码（极简模式不全面理解，只理解改动半径）

### Step 3: 最小改动实现

执行改动，遵守 `csp-minimal-change-engineer` 纪律：

- **只改被要求的**：不顺手重构、不优化"顺便看到的"问题
- **最小 diff**：能用 1 行改完不用 3 行，能改现有代码不新建文件
- **follow-up 记录**：注意到的但不该本次改的问题，记为 follow-up（对话级或写入 `.csp/follow-ups/`），不在本次 diff 里修
- **匹配现有风格**：命名、错误处理、注释密度与周围代码一致

```
diff 纪律自检：
- [ ] diff 只含被要求的改动
- [ ] 没有"顺便"重构
- [ ] 没有新建本可复用的文件
- [ ] 命名/风格与周围一致
- [ ] 注意到的旁路问题已记为 follow-up
```

### Step 4: 轻量验证

按改动风险分级验证：

| 风险等级 | 判定 | 验证方式 |
|---------|------|---------|
| 低 | 文案/常量/注释/纯展示 | 改对即止 + 跑一次相关页面/接口 |
| 中 | 业务逻辑/条件分支/计算 | 最小回归测试（覆盖改动路径） + 跑相关测试 |
| 高 | 数据/权限/鉴权/并发/外部调用 | 必须回归测试 + 受影响路径手动验证 |

**验证红线**：
- 中高风险改动不能"改对即止"
- 受影响调用方必须确认仍能工作（`Grep` 找到的调用方逐个确认）
- 不跑全量测试套件（极简模式不追求全量），但改动直接相关的测试必须跑

### Step 5: 归档

极简模式不创建正式 artifact，但记录改了什么：

- 提交信息遵循项目约定（conventional commits 等）
- 如有 follow-up，记录到 `.csp/follow-ups/` 或 issue 跟踪系统
- 如改动后来发现需要更彻底修复，触发 `csp-hotfix` 或 `csp-tech-debt-paydown`

## 范围自检模板

改动完成后（或提交前）自检：

```
范围自检：
- [ ] 本次 diff 只解决了一个问题（一句话需求）
- [ ] 没有未被要求的文件出现在 diff 里
- [ ] 所有调用方已确认（无漏改）
- [ ] 改动半径 ≤ 3 文件（超出则本不该用极简模式）
- [ ] follow-up 已记录，未混入本次 diff
- [ ] 验证与风险等级匹配
```

任一项不满足 → 停下，要么收窄 diff，要么升级流程。

## 升级路径

极简模式是入口，不是终点。出现以下信号时升级：

| 信号 | 升级到 | 原因 |
|------|--------|------|
| 改动涉及 3+ 文件 | `csp-implementation-phase` | 需要正式 plan 协调多文件 |
| 改动涉及架构/接口变更 | `csp-design-hub` | 需要设计先行 |
| 改动涉及公共 API/数据模型 | `csp-implementation-phase` + `csp-spec-contract` | 需要契约 |
| 改动后测试大面积失败 | `csp-systematic-debugging` | 影响范围超预期，需根因分析 |
| 需求其实不止一句话 | `csp-interview-me` → 完整流程 | 需求需澄清 |

**升级不是失败**：极简模式的价值在于"快速试一下，发现复杂就升级"，避免对简单改动套重型流程。

## 与其他 Skill 的协作

| 上游 Skill | 提供什么 |
|-----------|---------|
| `csp-router` | 改码类意图路由：无 PRD 且无模式时路由到本技能 |
| `csp-interview-me` | 需求歧义时澄清意图 |

| 下游 Skill | 消费什么 |
|-----------|---------|
| `csp-hotfix` | 紧急 bug 分发目标 |
| `csp-tweak` | 文案/配置分发目标 |
| `csp-implementation-phase` | 升级目标（多文件/正式 plan） |
| `csp-design-hub` | 升级目标（需设计） |

| 协同 Skill | 作用 |
|-----------|------|
| `csp-minimal-change-engineer` | 提供"最小 diff"行为纪律（本技能内嵌其原则） |
| `csp-explore` | 提供单问题探索方法论（Step 2 定位） |
| `csp-systematic-debugging` | 改动后测试失败时根因分析 |

## 完成信号

```yaml
completion_signal:
  mode: lightweight
  output: 代码改动（无正式 .csp/ artifact，可选 follow-up 记录）
  next_step:
    recommended: none           # 极简模式完成即结束
    alternatives:
      - csp-verify-phase         # 如需正式验证
      - csp-code-review          # 如需评审
      - csp-hotfix               # 如发现需更彻底修复
  status:
    change_scope: "{{file_count}}"
    follow_ups: "{{count}}"
    verification_level: "low|medium|high"
    phase: build
    ready_for: [ship]
```

## 快速开始示例

```
输入: "登录页的提交按钮文案改成'登录'，现在是'Login'"

分发判断: 文案改动 → 可分发到 csp-tweak，但涉及按钮语义，走本技能默认流程

Step1 需求解析:
  改动: src/pages/Login.tsx 的按钮文案 "Login" → "登录"
  预期: 按钮显示"登录"
  范围边界: 不改按钮样式/行为/校验

Step2 定位:
  Glob src/pages/Login.tsx → 找到
  Grep "Login" → 确认是按钮文案，非变量名（避免改错）
  Read 按钮组件段

Step3 最小改动:
  Edit 一行："Login" → "登录"
  follow-up: 同文件 Sign 按钮也用了英文，但本次不改（超出需求）

Step4 轻量验证（低风险）:
  改对即止 + 跑一次登录页确认显示

Step5 归档:
  commit: "fix(login): 更新提交按钮文案为中文"
  follow-up: 登录页其他英文文案统一问题（记 issue）
```
