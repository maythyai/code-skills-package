# 系统提示词集（端到端交付链路）

一套自包含的系统提示词 + 一个外环战略规划，覆盖从长期规划到上线运维与整体复盘的完整链路。外环 `roadmap.md` 先于 00 跑一次（每个项目通常跑一次用很久）；内环 00-07 每版本迭代执行。八份内环 + 一份外环同源同构：统一目录约定（`docs/` + `.csp/`）、统一 slug/feature-id 命名、统一 front-matter 双向互链、manifest 唯一索引、PMS/CMS/TMS 三说明书全程 living 治理、归档就绪、变更 delta 同步。

## 链路与文件

| 顺序 | 阶段 | 文件 | 产出目录 |
|---|---|---|---|
| 外环 | 产品长期规划（战略锚点+版本号规则+1/3年路径） | [roadmap.md](./roadmap.md) | `docs/strategy/`（STRATEGY+ROADMAP） |
| 0 | 知识中枢初始化 | [00-knowledge-hub.md](./00-knowledge-hub.md) | `.csp/AGENTS.md` + `.csp/manifest.json` |
| 1 | PRD 生成（产品需求） | [01-prd.md](./01-prd.md) | `docs/prd/` + `.csp/product-spec/`（PMS） |
| 2 | 需求拆解（工程级 Feature） | [02-decomposition.md](./02-decomposition.md) | `.csp/decomposition/` |
| 3 | 技术选型 + 技术方案 + 全栈 Spec | [03-tech-design.md](./03-tech-design.md) | `.csp/tech-decisions/` + `.csp/tech-design/` + `.csp/specs/` + `.csp/test-spec/`（TMS） |
| 4 | 任务拆解 + 实施规划 | [04-task-breakdown.md](./04-task-breakdown.md) | `.csp/tasks/`（WBS/DAG/WAVE-PLAN） |
| 5 | 实施开发（多 Agent 团队） | [05-implementation.md](./05-implementation.md) | 代码（git worktree）+ `.csp/code-spec/`（CMS 增量）+ `.csp/artifacts/` |
| 6 | 审查·测试·发布交付·运维 | [06-verify-ship.md](./06-verify-ship.md) | `.csp/artifacts/{verify,review}/` + `.csp/ship/` + `.csp/ops/` + `.csp/milestones/` |
| 7 | 整体复盘审查（产品+技术，迭代探索） | [07-reviewer.md](./07-reviewer.md) | `.csp/review/` + `docs/solutions/`（摘要） |

> **06 vs 07**：06 是**发布前符合性验证**（实现是否满足 PRD/Spec/AC、能否上线），是门控；07 是**里程碑后整体复盘**（产品对不对、架构稳不稳、下一步做什么），探索性/战略性，不卡发布。07 从用户视角+技术视角发现 Spec 之外的新问题，findings 回流下一迭代 01-05 + 外环 roadmap。

> **外环 roadmap**：`roadmap.md` 先于 00 跑一次——产出战略锚点（STRATEGY.md）+ 版本号规则 + 1/3 年+迭代路径（ROADMAP.md）。01 PRD 读 ROADMAP 定位本版本主题（`roadmap_ref`/`target_version`）；06 release 用版本号规则；07 复盘 findings 回流更新 ROADMAP 下一版本主题。每个项目通常只跑一次，07 回流或战略调整时增量更新。

## 阶段并入说明

- **S2 技术选型**：并入 `03-tech-design.md`「技术选型（S2）」节。缺选型时由 03 自行产出 `.csp/tech-decisions/` + ADR；已选型则复用。
- **S3.5 任务拆解 + S4 实施规划**：独立成 `04-task-breakdown.md`（Spec → Task + DAG + Wave），与 `05-implementation.md`（并行开发）分离。同一 Lead 上下文连续（lifecycle-state + 共享 `.csp/tasks/`）。

## 三说明书（living baseline）

| 说明书 | 治理对象 | 建立阶段 | 更新节奏 |
|---|---|---|---|
| **PMS** 产品说明书 | PRD 质量、模块边界 | 01 PRD 阶段 | PRD/需求变更时增量 |
| **CMS** 代码说明书 | 代码入口点/调用链/约定 | 棕地设计前 / 05 开发期 | 开发期增量、06 verify 通过后全量 re-align（不等上线） |
| **TMS** 测试说明书 | 存量+增量用例、需求→方法矩阵 | 03 技术方案阶段 | 变更只产 delta 用例 |

## 核心一致性约定

- **知识中枢前置**：每阶段探测第 0 步查 `.csp/AGENTS.md` + `.csp/manifest.json`；不存在 → 提示先执行 00。
- **manifest 回写**：各阶段产出实质页后回写 `.csp/manifest.json` 对应 item `source_type` + `build_status=built` + `content_hash`，保持索引实时。约定见 00「manifest 回写约定」节。
- **追溯锚点**：`prd_ref` / `pms_module` / `related_decomposition` / `related_specs` / `related_tasks` / `feature_id` / `task_id` 双向互链。
- **数量关系**（详见 03「元数据与一致性」节）：PRD `feature_count`（模块/域级）≈ decomposition 域数 ≤ decomposition 原子 Feature 数 == Spec 数（1:1）；每份 P0/P1 Spec ≥1 Task。
- **归档规范**（详见 06「里程碑归档规范」节）：一次性发布产物用 `mv` 移入 `.csp/milestones/{milestone}/`；living baseline 与增量文档用 `cp -r` 快照归档（原件留在 `.csp/` 继续演进）。
- **变更同步**：各阶段重新执行时先读既有产物 diff delta，只改 delta，沿追溯链传播 stale 标记并回写 manifest `degraded`。
- **跨文档引用**：用**节标题**引用（稳定），不用节号数字（避免增删节后错位）。
- **默认优先**：可逆/非破坏/非外向的决策一律取默认自动执行，不打断用户；仅在破坏性/不可逆/外向操作（删除来源、Git 发布、删业务文档）时人工拍板。各阶段"引导模式"的问询仅针对**输入真缺失**，不针对可默认的偏好。
- **阶段穷尽**：每阶段必须**穷尽完成本阶段全部任务**才可标 `done`、写 lifecycle 进下一阶段，不遗留尾巴到下游。例：03 必须为 decomposition 每个 Feature 产出 Spec（硬门控 Spec 数 == Feature 数）；04 必须为每个 P0/P1 Spec 拆 Task；05 必须按全部 Wave 实施完。下游探测发现上游有缺漏 → 停步路由回上游补全，不臆造、不绕过。
- **评审/批准 gate（默认自动，不等人）**：① **PRD 评审**（01 完成前，reviewer≠author，auto 跑、findings 自动应用、无未解 Critical 自动 `Approved` 进 02，**不要求人工批准**；仅 Rejected fundamental 才人工）；② **Git 发布**（06，S6 质量门控+S7 审查+对账全过后**自动 push+GitHub Release**，gate 即授权，不再二次人工确认；版本号一致性见 06「版本与发布规范」节）；③ **07 复盘**（里程碑后可选触发）。**仅无前置 gate 的纯破坏操作（删 source、删业务文档）才人工拍板。**

## 文档与图规范（全链路 Markdown 产物遵守）

- 标题层级 H1→H2→H3 不跳级；代码块标注语言（`` ```typescript ``）。
- 中文排版：中英文之间加空格。
- 仓库内链接用相对路径；图片统一放 `docs/images/`。
- 简单对比用表格，复杂数据用独立文档。
- 架构图用 Mermaid（GitHub 原生渲染），单图 ≤15 节点，每图配 2–3 句文字说明，架构变更时同步更新。
- 公共 API 用 TSDoc/JSDoc 注释（参数、返回、异常、示例），代码即文档。

## 使用方式

每份提示词可直接作为对应阶段 Agent 的 system prompt。Agent 拿到提示词即可独立完成本阶段任务，通过固定目录、front-matter 与 manifest 与上下游阶段互链，不依赖外部技能加载。建议从 00 起，按链路顺序推进；每阶段探测时若发现上游缺失，路由回上游或进引导模式。

## 阶段状态追踪（Agent 如何知道"现在第几步、下一步去哪"）

全链路用**单一状态文件** `.csp/lifecycle-state.json` 记录流水线进度，由 00 初始化、各阶段读/写、06 对账闭环、07 复盘回流。

**粒度原则**：lifecycle-state 只记**阶段级 + 每阶段 progress 摘要（指针/计数）**，不存全量任务/用例。细粒度状态各有归属：Task 在 `.csp/tasks/WBS.md`、AC 覆盖在 `.csp/traceability/COVERAGE-REPORT.md`、产物 build_status 在 `.csp/manifest.json`。lifecycle-state 是导航摘要，避免重复臃肿。

```json
{
  "pipeline_version": 1,
  "milestone": "v1.0",
  "current_stage": "03-tech-design",
  "last_updated": "...",
  "reconciled": false,
  "stages": [
    {"id":"00-knowledge-hub","name":"知识中枢初始化","status":"done","prompt":"00-knowledge-hub.md","outputs":[".csp/AGENTS.md",".csp/manifest.json"],"progress":{"manifest_items":42,"built":40,"pending":2}},
    {"id":"01-prd","name":"PRD 生成","status":"done","prompt":"01-prd.md","prd_slug":"order-refund","feature_count":5,"progress":{"prd_status":"Approved","pms_modules":4}},
    {"id":"02-decomposition","name":"需求拆解","status":"done","prompt":"02-decomposition.md","feature_count":12,"domain_count":4,"progress":{"features":12,"ac_mapped":34,"dag_acyclic":true}},
    {"id":"03-tech-design","name":"技术选型+技术方案+Spec","status":"in_progress","prompt":"03-tech-design.md","progress":{"tech_decisions":"built","tdd_chapters":6,"specs":0,"ac_coverage":"0/34"}},
    {"id":"04-task-breakdown","name":"任务拆解+实施规划","status":"pending","prompt":"04-task-breakdown.md","progress":{"tasks_total":0,"waves":0,"dag_acyclic":null}},
    {"id":"05-implementation","name":"实施开发","status":"pending","prompt":"05-implementation.md","progress":{"tasks_done":0,"commits":0,"waves_done":0}},
    {"id":"06-verify-ship","name":"审查测试发布运维","status":"pending","prompt":"06-verify-ship.md","progress":{"quality_gate":"pending","review":"pending","shipped":false}},
    {"id":"07-reviewer","name":"整体复盘审查","status":"pending","prompt":"07-reviewer.md","progress":{"findings_total":0,"p0":0,"p1":0,"next_iteration":false}}
  ]
}
```

- **status 取值**：`pending`（未开始）/ `in_progress`（进行中）/ `done`（完成）/ `blocked`（阻塞）/ `stale`（上游变更需重跑）。
- **07 为可选触发阶段**：不在 00→06 的强制线性链路上；里程碑发布（06 done）后由用户触发复盘。07 的 findings 通过 `回流阶段` 字段驱动下一迭代 01-05。
- **每阶段开始（探测 step 0.5）**：读 `lifecycle-state.json`，确认本阶段前置阶段 status==`done`；未完成 → 路由回上游；明确"我是第 N 步、下一步是 Y"。
- **每阶段完成**：写 `lifecycle-state.json`——本阶段 status=`done` + 补 `progress` 摘要（计数/指针，非全量）、`current_stage` 指向下一阶段 id、`last_updated` 更新、`reconciled=false`（待 06 对账）。
- **06 对账闭环（发布归档前必做）**：06 读 lifecycle-state + WBS + COVERAGE-REPORT + manifest + traceability 交叉核对，纠正不一致（如某阶段声称 done 但细粒度未达），写回对账后的 lifecycle-state 并置 `reconciled=true`，再快照归档。详见 06「阶段状态对账与闭环」节。
- **重启/换会话**：Agent 读 `lifecycle-state.json` 即知链路停在何处、已完成哪些阶段、下一步该加载哪份提示词、是否已对账。
- **迭代回路**：上游变更时把受影响下游阶段标 `stale`，回到对应阶段重跑 delta，重置 `reconciled=false`。
- **与 manifest 的分工**：`manifest.json` 索引"有哪些知识产物"（build_status）；`lifecycle-state.json` 记录"流水线走到哪步 + 阶段进度摘要"。两者互补，06 对账时互相校验。

## 进度播报（每阶段开始与完成时向用户输出）

每阶段在 **step 0.5 读 lifecycle-state 后**（开始播报）与**完成写 state 后**（结束播报）各向用户输出一次紧凑进度条，让用户随时知道"现在第几步、已完成哪些、剩哪些"：

```
📊 进度 [00✓][01✓][02✓][03✓][04✓][05✓][06✓][07▶] 当前:07 整体复盘 | 已完成:00-06 | 剩余:下一迭代
```

- 图例：`✓` done / `▶` in_progress / `○` pending / `⛔` blocked / `↻` stale。
- 开始播报：标出本阶段为 `▶`，列已完成与剩余；若前置未完成则改为"⛔ 阻塞：前置 0X 未完成 → 路由回上游"。
- 结束播报：本阶段转 `✓`，`current_stage` 指向下一阶段，列剩余。
- 单行紧凑，不展开；细节在就绪卡/产物块里。
