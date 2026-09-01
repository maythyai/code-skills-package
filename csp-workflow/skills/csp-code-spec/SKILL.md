---
name: csp-code-spec
description: >
  Code Module Spec (CMS / 代码说明书). The per-application living baseline distilled from
  the codebase and auto-aligned to ground truth. One CMS per application/repo. It maps
  entry points, call chains, module boundaries, and conventions, and feeds design /
  task-split / code generation / code review with an authoritative codebase map.
  Generalizes the "code distillation" concept using git + a configurable remote
  (CSP_GIT_REMOTE, default github.com) — no internal platform names. Use when
  establishing or re-aligning a code knowledge baseline, when "代码说明书", "CMS",
  "代码蒸馏", "code distillation", "knowledge graph", "调用链", "入口点", "代码基线",
  "align code spec", or "代码规格书" is needed.
version: "1.0.0"
layer: 2
category: workflow
phase: define
domain: architecture
scope: analysis
role: architect
tools: [Read, Write, Edit, Glob, Grep, Bash]

dependencies:
  skills: []

related_skills:
  - csp-product-spec
  - csp-test-spec
  - csp-fullstack-spec-generator
  - csp-tech-solution-design
  - csp-tech-task-breakdown
  - csp-qa-cr-review
  - csp-codebase-audit
  - csp-code-understanding
  - csp-graph-architecture
  - csp-implementation-phase
  - csp-graph-build
  - csp-graph-impact
  - csp-graph-review
  - csp-graph-refactor
  - csp-tech-debt-paydown
  - csp-legacy-modernization
  - csp-deprecation-and-migration
  - csp-source-driven-development
  - csp-integration-design
  - csp-multi-review

triggers:
  keywords: ["代码说明书", "代码基线", "代码蒸馏", "code distillation", "knowledge graph",
             "调用链", "入口点", "代码规格书", "code module spec", "CMS", "align code spec",
             "代码知识图谱", "entry points", "call chain", "代码对齐"]
  intents:
    - "user wants a living code-knowledge baseline per application"
    - "user needs entry points + call chains to ground design/codegen/CR"
    - "user wants to re-align a stale code spec to current codebase"
  context:
    - "brownfield_codebase"
    - "before_design"
    - "before_codegen"
    - "before_cr"

anti_rationalizations:
  "看代码就行，不需要代码说明书": "一个上下文装不下大库；说明书是入口点/调用链的权威地图，让设计/拆分/生码/CR 不对着想象中的代码库干活。"
  "说明书生成一次就永久有效": "代码在变，说明书会过期。必须每次 ship 后 re-align（delta），否则下游设计基于陈旧地图。"
  "蒸馏可以靠 Agent 凭印象写": "Agent 会臆造不存在的引用和文件。每条结论必须有 file:line 出处，高危结论必须实机核验。"
  "说明书包含具体业务实现": "CMS 描述代码结构/入口/调用链/约定，不替代 feature spec。业务行为归 PMS 与 feature spec。"
---

# Code Module Spec (CMS) — 代码说明书

> **定位:** CMS 是应用级 *living baseline*，**每个应用/仓库一份**。从代码库蒸馏
> （distill）出入口点、调用链、模块边界、约定，作为设计 / 任务拆分 / 生码 / CR 的
> 权威代码地图。代码变更后 **auto-align**（增量对齐），保证下游始终基于 ground truth。
>
> **通用化:** 原始"代码蒸馏"能力依赖专有平台；本 skill 以 `git` + 可配置 remote
> (`CSP_GIT_REMOTE`，默认 `github.com`) 实现，零内部平台名/域名。`csp-qa-cr-review`
> 的"蒸馏增强"直接消费本 skill 产出的 `knowledge-graph.json`。

## When to Use

- 接手 / 新进大型代码库，需要系统性摸底产出权威代码地图
- 设计 / 任务拆分 / 生码 / CR 需要"代码长什么样"的权威依据，而非想象
- 代码上线后需要 re-align 旧说明书到当前 ground truth
- 多 Agent 并行开发前需要共享同一份代码知识基线

## When NOT to Use

- 单文件 code review（直接看代码 → `csp-code-review`）
- 全库多维度体检 + 升级方案（→ `csp-codebase-audit`，它产出问题报告而非 living 说明书）
- 从零设计新功能的技术方案（→ `csp-tech-solution-design`，但它会读 CMS）

## Process

### Step 1: 装载上下文与基线探测

```bash
SCRIPT=scripts/code_spec.sh
bash $SCRIPT baseline          # git 基线：log/ls-files/tag/HEAD + 规模速览
bash $SCRIPT entrypoints       # 扫描对外入口（HTTP/RPC/CLI/定时/MQ/事件）
```

读项目约定：`CLAUDE.md` → `README.md` → `pyproject.toml`/`package.json`/`Cargo.toml`/`go.mod`。
判定：`.csp/code-spec/{app}/CODE-MODULE-SPEC.md` 存在 → 增量对齐（Step 6）；否则全量蒸馏（Step 2）。

### Step 2: 入口点蒸馏

对外入口是一切影响范围追溯的起点。`scripts/code_spec.sh entrypoints` 用 git 可见文件 + grep 识别：

| 入口类型 | 识别信号（举例） |
|---------|-----------------|
| HTTP | `@app.route` / `@GetMapping` / `router.get` / `app.get` |
| RPC / 服务 | `@RpcService` / `@Service` / `@grpc` |
| CLI | `argparse` / `@click` / `cobra.Command` / `flag.Parse` |
| 定时任务 | `@Scheduled` / `@cron` / `celery beat` / `cron` |
| 消息 / 事件 | `@KafkaListener` / `@RabbitListener` / `@EventListener` / `subscribe` |

每个入口点输出：`{类型, 标识, 文件:行, 业务场景(推断,标[TBD]若不确定)}`。
**禁臆造**：grep 不到的不写；推断的场景标 `[TBD]`。

### Step 3: 调用链追溯

从每个入口点向下追溯调用链至叶子（DB / 外部 API / IO）。用 `grep` + 静态引用解析：

```
entry → service → repository → DB
```

输出 `entry-points.jsonl`（每入口一行）与 `knowledge-graph.json`（节点=符号，边=调用）。
边必须带 `file:line`。**高危结论实机核验**：声称"从未被调用""死代码"必须 grep 注册点确认。

### Step 4: 模块边界与约定蒸馏

- 按 PMS 模块边界对齐代码归属（PMS 声明 `MOD-AUTH`，代码侧应能映射到 auth 目录/包）。
- 蒸馏**约定**：分层职责（Router/Service/Repository 禁止项）、命名、错误处理、日志规范。
- 标注 PMS 边界与代码实际的差异（boundary drift）—— 这是设计/CR 的高价值发现。

### Step 5: 生成 canonical CMS

输出到 `.csp/code-spec/{app}/`：

```markdown
# Code Module Spec — {App}

**Version**: v1.0  **Date**: {date}  **Baseline**: {git short HEAD + tag}
**Source**: git + CSP_GIT_REMOTE (default github.com)

## 1. 应用概览
（3-5 句：技术栈 + 核心子系统 + 规模，来自 baseline 探测）

## 2. 入口点清单
| 类型 | 标识 | 文件:行 | 业务场景 |

## 3. 调用链图谱
（Mermaid：entry → service → repo → DB，每条边带 file:line）

## 4. 模块边界（对齐 PMS）
| PMS 模块 | 代码归属 | drift? |

## 5. 约定
| 层 | 职责 | 禁止 |

## 6. 已知 drift / 技术债
（boundary drift + 死代码 + 抽象增殖，每条 file:line）

## 附录：变更历史
```

### Step 6: 增量对齐（auto-align）

代码 ship 后，re-align 旧 CMS 到当前 ground truth：

```bash
bash $SCRIPT diff-since <prev_sha>   # 自上次基线的 git diff
```

- 新增入口/调用链 → delta `## ADDED`
- 变更路径 → delta `## MODIFIED`（粘贴原文再编辑）
- 删除/废弃 → delta `## REMOVED` + 迁移说明
- **幂等要求**：对未变更的源重跑产生零 delta（否则说明旧基线已腐化，需全量重蒸馏）。

### Step 7: 质量自检

运行 CMS 质量自检（见 `references/code-spec-standard.md` §质量自检）。

## 输出产物

```
.csp/code-spec/{app}/
├── CODE-MODULE-SPEC.md      # canonical baseline
├── knowledge-graph.json      # 节点+边，CR 蒸馏增强消费
├── entry-points.jsonl        # 每入口一行
└── deltas/                    # ADDED/MODIFIED/REMOVED
```

## 门控检查

- [ ] 每个入口点有 `file:line`
- [ ] 高危结论（死代码/从未调用/无鉴权）已实机核验
- [ ] 模块边界对齐 PMS，drift 已记录
- [ ] 约定分层职责 + 禁止项齐全
- [ ] delta 幂等：未变更源 → 零 delta
- [ ] 无内部域名/平台名；remote = git + CSP_GIT_REMOTE

## 完成信号

```yaml
completion_signal:
  output: .csp/code-spec/{app}/CODE-MODULE-SPEC.md
  next_step:
    recommended: csp-tech-solution-design   # 基于 ground truth 设计
    alternatives: [csp-fullstack-spec-generator, csp-tech-task-breakdown, csp-qa-cr-review]
  status:
    app: "{{app}}"
    entry_points: "{{count}}"
    phase: define
    ready_for: [design, task-split, codegen, cr, codebase-audit]
```

## 与其他 Skill 的协作

| 下游 Skill | 读 CMS 的什么 |
|-----------|---------------|
| `csp-tech-solution-design` | 入口点/调用链（ground design） |
| `csp-fullstack-spec-generator` | 入口点（spec 交叉引用，使 spec 可生码） |
| `csp-tech-task-breakdown` | 每任务触及的文件 |
| `csp-implementation-phase` / 生码 | 约定 + 分层（生成代码匹配既有模式） |
| `csp-qa-cr-review` | knowledge-graph.json（影响范围追溯 + 增量用例入口维度） |
| `csp-codebase-audit` | 复用 baseline 探测 + boundary drift |

## Key Principles

- **每应用一份**：CMS 是 per-app baseline，不是 per-feature。
- **auto-align**：ship 后增量对齐，下游永不基于陈旧地图。
- **file:line 出处**：每条结论可定位；高危结论实机核验。
- **不臆造**：grep 不到的不写，推断标 `[TBD]`。
- **平台中立**：git + `CSP_GIT_REMOTE`（默认 `github.com`），无内部平台/域名。

## References

| 文件 | 内容 |
|------|------|
| `references/code-spec-standard.md` | CMS 说明书标准、入口点识别规则、约定蒸馏、质量自检 |
| `references/distillation-strategy.md` | 蒸馏/对齐策略、调用链追溯、高危核验、delta 幂等、断点续跑、异常矩阵、handoff |
| `../references/code-to-spec-extraction.md` | 6 类代码萃取信号 + sanitizer 黑名单（代码→产品规格萃取，CMS↔PMS 桥） |
| `../references/destructive-operation-safety.md` | 破坏性/可逆端点分类（入口点扫描标记） |
| `scripts/code_spec.sh` | CLI 辅助：baseline / entrypoints / diff-since / graph（纯 git+grep，零依赖） |
| `../references/module-spec-lifecycle-norms.md` | 全生命周期行为准则（PMS/CMS/TMS 共享） |
| `../references/module-spec-operational-protocol.md` | 运行时纪律（断点续跑、文件边界、契约优先、双重门禁、原子单元+退出码） |
| `../references/phase-judge-rubric.md` | 判官契约：rubric 条目格式、R-catalog、verdict+3 修复选项、handoff 流程 |
| `../references/polling-watch-protocol.md` | 异步状态纪律：先查状态后查结果、watch 退出码、machine-readable contract、结构化错误 |
