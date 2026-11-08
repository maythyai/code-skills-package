# CSP System Map

> 版本 v1.0.0 · 2026-11-08
>
> CSP 全模块连接概览。包含架构图、模块连接矩阵和四条典型用户旅程路径。

---

## 一、架构全图

```
┌────────────────────────────────────────────────────────────────────────┐
│                           csp-router                                    │
│                    (entry point, intent routing)                        │
└───────┬───────────────┬──────────────────┬─────────────────┬───────────┘
        │               │                  │                 │
        ▼               ▼                  ▼                 ▼
┌───────────────┐ ┌─────────────┐ ┌─────────────────┐ ┌──────────┐
│ Design Suite  │ │ Workflow    │ │ Meta Skills     │ │ Prompts  │
│ (patterns)    │ │ System      │ │ (csp-meta)      │ │ (33 .md) │
│ 180 skills    │ │ 68 skills   │ │ 26 skills       │ │          │
└───┬───────┬───┘ └──┬──────┬──┘ └───────┬─────────┘ └────┬─────┘
    │       │        │      │            │                │
    │   chain-   lifecycle-  │        tdd, mvp-       00-07
    │  protocol    contract   │        scoping,        linear
    │     │          │       │        debugging       chain
    │     ▼          ▼       │            │              │
    │  .csp/spark/  .csp/    │            │         .csp/
    │  context/     handoff/  │            │      lifecycle-
    │     │          │       │            │       state.json
    │     │          │       │            │
    └─────┼──────────┼───────┴────────────┼──────────────┘
          │          │                    │
          └──────────┼────────────────────┘
                     ▼
            ┌────────────────┐
            │   Bridge       │
            │   Artifacts    │
            │                │
            │ .csp/handoff/  │
            │ .csp/spark/    │
            │ .csp/lifecycle │
            └────────────────┘
```

### 阶段映射

```
Prompts:    00 ──→ 01 ──→ 02 ──→ 03 ──→ 04 ──→ 05 ──→ 06 ──→ 07

Workflow:   S0 ──→ S1 ──→ S2 ──→ S2.5─→ S2.6─→ S3 ──→ S3.5─→ S4 ──→ S5 ──→ S6 ──→ S7 ──→ S8 ──→ S9 ──→ S10

Design:     frame─→ brief─→ journey─→ stories─→ sitemap─→ flow-web ─→ check ─→ qa ─→ prd
                                │                              │
                                └──→ board ──→ flow-web       └──→ flow-mobile
                                                               └──→ access/test

Bridge:     .csp/spark/context/*.json ──→ csp-design-to-workflow-bridge ──→ .csp/handoff/design-to-workflow.json
```

---

## 二、模块连接矩阵

| 从 / 到 | 设计套件 | 工作流系统 | 元技能 | 提示词链 |
|---------|:--------:|:--------:|:------:|:--------:|
| **设计套件** | chain-protocol (文件+会话双通道) | bridge skill → handoff JSON | 手动引用 | 手动触发 |
| **工作流系统** | bridge skill → Spark context | lifecycle-contract (门控+工件) | 子代理调度 | lifecycle-state.json |
| **元技能** | 独立调用 | 被编排器调用 | 独立调用 | 被提示词引用 |
| **提示词链** | 自由文本引用 | lifecycle-state 推进 | 自由文本引用 | 线性锁步 (01→02→...) |

### 连接机制说明

| 连接类型 | 机制 | 强制性 |
|---------|------|--------|
| 设计套件 → 设计套件 | chain-protocol 双通道（.csp/spark/context/*.json + 会话 marker） | 顺序约束，但无强制门控 |
| 工作流 → 工作流 | lifecycle-contract.json 门控（工件存在 + 命令退出码） | 强制门控（drive.advance 拒绝跳过） |
| 设计套件 → 工作流 | csp-design-to-workflow-bridge（Spark JSON → 工作流工件） | 手动触发 |
| 工作流 → 设计套件 | .csp/handoff/ 文件被设计技能读取为补充上下文 | 可选 |
| 元技能 → 任意 | 直接 Skill() 调用或子代理调度 | 按需 |
| 提示词链 00-07 | lifecycle-state.json 阶段推进 + 进度广播 | 线性锁步 |
| 独立提示词 | 零依赖，可随时运行 | 无 |

---

## 三、用户旅程

### 旅程 1：从零到一的产品（设计优先）

```
"帮我做一个 SaaS 报销系统"
        │
        ▼
  csp-router → csp-frame (确定项目边界)
        │
        ▼
  csp-brief (商业目标、用户画像、设计标准)
        │
        ▼
  csp-journey → csp-stories → csp-sitemap → csp-flow-web (页面流程)
        │
        ▼
  csp-check (设计走查)
        │
        ▼
  csp-prd (设计交付 PRD)
        │
        ▼
  [BRIDGE] csp-design-to-workflow-bridge (Spark → 工作流)
        │
        ▼
  csp-lifecycle-orchestrator (S1-S9: 需求拆解 → 开发 → 发布)
        │
        ▼
  csp-verify-phase (对照原始 brief.constraints 验证)
```

**关键跳转点**：
1. frame → brief：需要用户确认项目类型和约束
2. prd → bridge：设计上下文翻译为功能候选
3. bridge → lifecycle-orchestrator：进入 S1 需求拆解

### 旅程 2：在已有代码库上加功能（代码优先）

```
"给现有项目加一个导出报表的功能"
        │
        ▼
  csp-router → csp-lifecycle-orchestrator (S0 中枢初始化)
        │
        ▼
  S1: csp-requirement-decomposition (拆解新功能)
        │
        ▼
  S2-S4: 技术选型 → 方案设计 → 全栈规格 → 任务拆解
        │
        ▼
  S5: csp-implementation-phase (并行开发)
        │
        ▼
  S7: csp-verify-phase (验证 + 可选 csp-check 走查UI一致性)
        │
        ▼
  如果 csp-check 发现问题 → csp-workflow-to-design-feedback → 设计修复
```

**关键跳转点**：
1. 无 PRD 时 S0 中枢初始化先建立项目上下文
2. 实现后的 csp-check 作为反馈回设计

### 旅程 3：全面审计与迭代规划

```
"做一次全面的产品和代码审计"
        │
        ▼
  prompts/audit-pipeline.md (全面审计流水线)
        │
        ├── audit.md (模块级审计+可用性评审)
        ├── e2e-deep-audit.md (E2E 深度验证)
        ├── ui-review-to-iteration.md (UI/UX 设计审查)
        ├── product-critic-review.md (产品总监视角)
        ├── feature-gap-analysis.md (功能缺口分析)
        └── product-audit-to-roadmap.md (审计→路线图)
                │
                ▼
          csp-roadmap-update (汇聚发现 → 版本规划)
                │
                ▼
          下一迭代的 01-prd 或 S1
```

**关键跳转点**：
1. 审计发现按严重度分流：P0→05(修复)，P1/P2→roadmap(规划)
2. 审计结果触发版本迭代决策，而非直接开始开发

### 旅程 4：紧急热修复

```
"生产环境出问题了"
        │
        ▼
  csp-router → 检测 "hotfix" 信号
        │
        ▼
  csp-hotfix + csp-systematic-debugging
        │
        ├── 诊断 (根因分析)
        ├── 修复 (最小变更)
        ├── 验证 (测试+构建)
        └── 发布 (patch 版本)
```

**关键跳转点**：无——热修复跳过设计和全生命周期，直接走最小修复路径。

---

## 四、路径决策树

```
用户输入
    │
    ├── 有 PRD/需求文档？
    │   ├── YES → 从 S1 (需求拆解) 开始
    │   └── NO  → 继续
    │
    ├── 有设计稿/原型？
    │   ├── YES → csp-frame (设计套件入口)
    │   └── NO  → 继续
    │
    ├── 是已有项目的增量修改？
    │   ├── YES → csp-lifecycle-orchestrator (extend 模式)
    │   └── NO  → 继续
    │
    ├── 是修复/优化工作？
    │   ├── YES → 规模小：csp-hotfix / csp-tweak
    │   │         规模大：csp-refactorer / csp-legacy-modernization
    │   └── NO  → 继续
    │
    └── 是全新项目？
        └── YES → csp-frame (设计套件) 或 prompts/00 (知识中枢初始化)
```

---

## 五、跨系统数据流总览

```
┌─────────────────────────┐     ┌─────────────────────────┐
│  DESIGN SUITE           │     │  WORKFLOW SYSTEM        │
│  .csp/spark/context/    │     │  .csp/                  │
│                         │     │                         │
│  brief.json       ──────┼──→  │  decomposition/         │
│  flow-web.json    ──────┼──→  │  specs/                 │
│  prd.json         ──────┼──→  │  tech-design/           │
│  check.json       ──────┼──→  │  plan/TECH-DEBT.md      │
│                         │     │                         │
│            BRIDGE:       │     │                         │
│  csp-design-to-         │     │                         │
│  workflow-bridge        │     │                         │
│                    ─────┼──→  │  handoff/design-to-     │
│                         │     │  workflow.json          │
└─────────────────────────┘     └─────────────────────────┘
           │                              │
           │              ┌───────────────┼───────────────┐
           │              ▼               ▼               ▼
           │        ┌──────────┐  ┌──────────┐  ┌──────────┐
           │        │ S0 Hub   │  │ S1 Decomp│  │ S2 Tech  │
           │        └──────────┘  └──────────┘  └──────────┘
           │
           ▼
    ┌──────────────┐
    │ lifecycle-   │
    │ state.json   │ ◄── Prompts 00-07 也写入此文件
    └──────────────┘
```

---

## 六、相关文档

- [CONNECTIVITY-STANDARD.md](CONNECTIVITY-STANDARD.md) — 衔接标准（强制格式、交接协议、边界处理）
- [SKILL-INDEX.md](SKILL-INDEX.md) — 技能分类索引（686 个技能）
- [csp-patterns/chain-protocol.md](../csp-patterns/chain-protocol.md) — 设计套件链式协议
- [csp-workflow/references/lifecycle-contract.json](../csp-workflow/references/lifecycle-contract.json) — 工作流生命周期合同
- [prompts/README.md](../prompts/README.md) — 提示词目录与阶段说明
- [prompts/skill-prompt-map.json](../prompts/skill-prompt-map.json) — 提示词→技能映射