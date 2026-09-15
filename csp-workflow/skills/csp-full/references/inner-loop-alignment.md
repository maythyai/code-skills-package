# CSP Full ↔ 内环对齐与产物契约

> csp-full 是**执行车道**，不是独立王国。它与 `.csp/` 内环（00-07 prompts / S0-S9 lifecycle 契约）共享同一产物索引（`manifest.json`）、同一状态机（`lifecycle-state.json`）和同一路由契约（`AGENTS.md`）。本文件定义三套阶段词汇的对齐表、handoff 契约、产物边界与更新时机——是 csp-full 不再"断裂"的根法。

## 1. 三套阶段词汇对齐表

本仓库存在三套并行的阶段编号，必须对齐到同一产物：

| csp-full | 内环 00-07 (prompts) | lifecycle 契约 S0-S9 | 落点产物 | manifest source_type |
|---|---|---|---|---|
| — (hub 前置) | 00 knowledge-hub | S0 | `.csp/AGENTS.md`+`manifest.json`+`lifecycle-state.json` | — |
| P0 Intake | (pre-01 brainstorm) | — | `.csp/full/intake.md` | doc |
| P1 PRD | 01 prd | (S1 decomp 独立) | `docs/prd/PRD-{slug}.md` + `.csp/product-spec/`(PMS) | doc + pms |
| — (拆解) | 02 decomposition | S1 | `.csp/decomposition/` | feature |
| P2 Tech Design | 03 tech-design | S2 / S2.5 / S2.6 / S3 | `.csp/tech-design/` + `.csp/specs/` | spec |
| P3 Plan | 04 task-breakdown | S3.5 / S4 | `.csp/tasks/` + `.csp/plan/` | doc + feature |
| P4 Execute | 05 implementation | S5 | code + `.csp/code-spec/`(CMS delta) | cms |
| P5 QA | 06 (QA 段) | S6 | `.csp/artifacts/verify/` | doc |
| P6 Review | 06 + 07 | S7 | `.csp/review/` | doc |
| P7 Ship | 06 (ship 段) | S8 | `.csp/ship/` + `VERSION-REGISTRY.md` | archive |
| P8 Ops | 06 (ops 段) | S9 | `.csp/ops/` | doc |

**两个结构性缺口**：csp-full 无 00（hub）和 02（decomposition）的对等步骤。
- 00 由「hub 前置探测」补——启动时查 `.csp/AGENTS.md`，缺则先跑 `csp-knowledge-hub`(S0)，未初始化不进 P1。
- 02 在独立全流程下由 P1/P2 吸收（PRD 已含模块边界即隐式拆解）；在轻量增量下可整体跳过，但**必须在 lifecycle-state 标 `skipped_stages`**，不假装走过。

## 2. Handoff 契约（双边，补全 orchestrator 单边声明）

`csp-lifecycle-orchestrator` 的 SKILL.md 已声明："orchestrator 完成 Spec 后，交给 csp-full 的 P4+ 执行"。本节把该单边声明补成双边契约：

- **orchestrator 侧**：S5 执行 = `csp-full` Phase 4 或 `csp-implementation-phase`；S8 ship = `csp-full` Phase 7。
- **csp-full 侧（本契约）**：启动时探测 `.csp/specs/` + `.csp/tasks/`（或 `.csp/plan/IMPLEMENTATION-PLAN.md`）是否已存在且覆盖本次 Feature 集 → 是则**跳过 P0-P3，直接从 P4 起**，读 `.csp/specs/` + `.csp/tasks/WBS.md` 作为 P4 输入，**不重写 PRD/TECH-DESIGN/PLAN 到 `.csp/full/`**。

### 三种运行形态

| 形态 | 触发条件 | 起始阶段 | 产物落点 |
|---|---|---|---|
| **串联（spec-aware）** | `.csp/specs/`+`.csp/tasks/` 已存在（orchestrator 产出） | P4 | 全部进内环产物体系（specs/tasks/manifest/lifecycle） |
| **独立全流程** | 全新项目、无 `.csp/specs/` | P0 | PRD→`docs/prd/`、spec/tasks→`.csp/`、执行态→`.csp/full/` |
| **轻量增量** | PATCH/MINOR 且 PRD 已足够详细 | P1(精简) 或 P4 | `skipped_stages` 诚实标注，不假装全流程 |

**灵活原则**：版本复杂度决定形态，不由人指定。MAJOR/全新产品走独立全流程；MINOR 走轻量增量；PATCH/bugfix 走快速通道。csp-full 的 DAG 路由（见 `dag-routing.md`）负责自动判定。

## 3. 更新时机（强制，对齐内环 00「manifest 回写约定」与 prompts/README「阶段状态追踪」）

### 3.1 manifest.json — 每阶段产出实质页后立即回写

回写字段统一：`source_id` / `source_type` / `content_hash`(用 git blob，禁 mtime) / `build_status` / `raw_path` / `output_path`。

| 阶段 | 回写 item | source_type | build_status |
|---|---|---|---|
| P1 | PRD 原文 + PMS 蒸馏 | doc + pms | built |
| P2 | spec + tech-design + ADR | spec | built |
| P3 | task + plan | doc + feature | built |
| P4 | CMS delta（每次原子 commit 后增量） | cms | built |
| P5 | verify 证据 | doc | built |
| P6 | review findings | doc | built |
| P7 | ship 归档 + VERSION-REGISTRY 行 | archive | built |
| P8 | ops 配置 | doc | built |

### 3.2 lifecycle-state.json — 进程读、每阶段末写

- **启动 step 0.5**：读 `lifecycle-state.json` 定位"现在第几步、下一步谁"；`.csp/AGENTS.md` 不存在 → 先跑 S0/00 init，**不静默进 P1**。
- **每阶段末**：写本阶段 `status=done` + `current_stage` 推进 + `progress` 摘要（计数/指针，非全量）+ `reconciled=false`（待 06 对账）+ `last_updated`。
- **P7 ship**：写 `milestone`（=本次 SemVer tag，**非代号**）+ `latest_release`（=同 tag）；代号写 `milestone_name`（可空）。prod-verified 后写 `prod_version`（=health 端点验证的版本）。`milestone`/`prod_version`/`latest_release` 三者同一抽象层（SemVer），代号不参与版本对齐——对齐 `prompts/version-management.md` §十一，这是 #3 问题的根法。
- **轻量跳过**：跳过的阶段写 `skipped_stages:["P2","P3"]` + 跳过理由，**不假装走了全流程**——这是 #6 问题的根法。

`current_stage` 的 id 用法：**正典为 00-07 id**（`prompts/README` §阶段状态追踪 定义，lifecycle-state.json 默认）；S0-S9 是 `csp-sdk drive.*` 的机器别名（映射见 `lifecycle-contract.json` 的 `stage_id_aliases`）。串联形态下若 orchestrator 已用 S0-S9，则沿用 S0-S9 与其对齐；否则统一用 00-07。**同一项目内保持一致，不可混用**，否则 orchestrator 读不到 csp-full 的进度。

### 3.3 AGENTS.md — 版本/里程碑随 P7 自动更新

P7 ship 时由发版动作更新 `AGENTS.md`「项目概览」节的版本号 + 当前里程碑 + 三说明书定位表（CMS 已有内容则去掉"未建"标注，指向 `.csp/code-spec/`）。**不靠手填**——这是 #4 问题的根法。AGENTS.md 的结构性变更（新增目录/说明书）仍由 00/knowledge-hub 增量处理。

## 4. docs/ ↔ .csp/ 边界（PRD 归位，#7 问题的根法）

| 内容 | 落点 | 性质 |
|---|---|---|
| PRD 原文 | `docs/prd/PRD-{slug}.md` | 人读、永久；manifest 登记 `source_type=doc` |
| PMS 蒸馏 | `.csp/product-spec/` | agent 消费、工程事实源 |
| strategy / ROADMAP | `docs/strategy/` | 人读；版本/主题蒸馏进 `lifecycle-state` + `VERSION-REGISTRY` |
| solutions / analysis | `docs/solutions/`、`docs/analysis/` | 人读摘要；工程全文进 `.csp/specs/`、`.csp/review/`、`.csp/audit/` |
| 执行态（intake、里程碑归档快照） | `.csp/full/` | 仅执行过程态，**不承载 PRD/spec 正本** |

**禁止**：把 PRD 正本写到 `.csp/full/PRD.md` 这一第三处——那会让 `docs/prd/` 与 `.csp/` 各持一份不一致的 PRD，追溯矩阵断裂。P1 产 PRD 一律落 `docs/prd/PRD-{slug}.md`，PMS 蒸馏落 `.csp/product-spec/`，PRD↔PMS 映射由 `manifest.json` 承载（不在 PRD front-matter 内嵌 .csp 引用）。

## 5. 与 lifecycle 契约（S0-S9 / `csp-sdk drive`）的关系

csp-full **不直接调** `csp-sdk drive.advance`（那是 orchestrator 的强制态机：gate 不过则 `drive.next` 不推进）；但 csp-full 写 `lifecycle-state.json` 时**必须用与 orchestrator 同一文件、同一 schema**。否则 orchestrator 后续阶段读不到 csp-full 的进度，形成第二个断裂点。

- 串联形态：csp-full 只推进 S5/S8 对应的 `current_stage`，gate 仍由 orchestrator 的 `drive` 校验。
- 独立全流程：csp-full 自驱全链路 `current_stage`，但仍遵循"gate 不过不推进"——每阶段末写 state 前自检产物存在。

## 6. 里程碑归档（对齐内环 06「里程碑归档规范」）

里程碑完成后归档到 `.csp/milestones/{milestone}/`（**canonical，与内环共享**），不归档到 `.csp/full/milestones/`（那是旧路径，保留为兼容别名但 canonical 在 `.csp/milestones/`）。归档内容：decomposition/tech-decisions/specs/plan/test-results/review/release-notes 快照 + `lifecycle-state.json` 对账后快照（`reconciled=true`）。P7 ship 负责归档动作。
