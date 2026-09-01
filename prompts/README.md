# 系统提示词集（端到端交付链路）

一套自包含的系统提示词，覆盖从知识中枢初始化到上线运维的完整交付链路。六份提示词同源同构：统一目录约定（`docs/prd/` + `.csp/`）、统一 slug/feature-id 命名、统一 front-matter 双向互链、manifest 唯一索引、PMS/CMS/TMS 三说明书全程 living 治理、归档就绪、变更 delta 同步。

## 链路与文件

| 顺序 | 阶段 | 文件 | 产出目录 |
|---|---|---|---|
| 0 | 知识中枢初始化 | [00-knowledge-hub.md](./00-knowledge-hub.md) | `.csp/AGENTS.md` + `.csp/manifest.json` |
| 1 | PRD 生成（产品需求） | [01-prd.md](./01-prd.md) | `docs/prd/` + `.csp/product-spec/`（PMS） |
| 2 | 需求拆解（工程级 Feature） | [02-decomposition.md](./02-decomposition.md) | `.csp/decomposition/` |
| 3 | 技术选型 + 技术方案 + 全栈 Spec | [03-tech-design.md](./03-tech-design.md) | `.csp/tech-decisions/` + `.csp/tech-design/` + `.csp/specs/` + `.csp/test-spec/`（TMS） |
| 4 | 任务拆解 + 实施开发（多 Agent 团队） | [04-implementation.md](./04-implementation.md) | `.csp/tasks/` + 代码（git worktree）+ `.csp/code-spec/`（CMS 增量）+ `.csp/artifacts/` |
| 5 | 审查·测试·发布交付·运维 | [05-verify-ship.md](./05-verify-ship.md) | `.csp/artifacts/{verify,review}/` + `.csp/ship/` + `.csp/ops/` + `.csp/milestones/` |

## 阶段并入说明

- **S2 技术选型**：并入 `03-tech-design.md`「技术选型（S2）」节。缺选型时由 03 自行产出 `.csp/tech-decisions/` + ADR；已选型则复用。
- **S3.5 任务拆解 + S4 实施规划**：并入 `04-implementation.md`「Phase 0：任务拆解 + 实施规划」节。同一 Lead 拆完即执行，上下文连续，不独立成步骤。

## 三说明书（living baseline）

| 说明书 | 治理对象 | 建立阶段 | 更新节奏 |
|---|---|---|---|
| **PMS** 产品说明书 | PRD 质量、模块边界 | 01 PRD 阶段 | PRD/需求变更时增量 |
| **CMS** 代码说明书 | 代码入口点/调用链/约定 | 棕地设计前 / 04 开发期 | 开发期增量、05 发布后全量 re-align |
| **TMS** 测试说明书 | 存量+增量用例、需求→方法矩阵 | 03 技术方案阶段 | 变更只产 delta 用例 |

## 核心一致性约定

- **知识中枢前置**：每阶段探测第 0 步查 `.csp/AGENTS.md` + `.csp/manifest.json`；不存在 → 提示先执行 00。
- **manifest 回写**：各阶段产出实质页后回写 `.csp/manifest.json` 对应 item `source_type` + `build_status=built` + `content_hash`，保持索引实时。约定见 00「manifest 回写约定」节。
- **追溯锚点**：`prd_ref` / `pms_module` / `related_decomposition` / `related_specs` / `feature_id` / `task_id` 双向互链。
- **数量关系**（详见 03「元数据与一致性」节）：PRD `feature_count`（模块/域级）≈ decomposition 域数 ≤ decomposition 原子 Feature 数 == Spec 数（1:1）。
- **归档规范**（详见 05「里程碑归档规范」节）：一次性发布产物用 `mv` 移入 `.csp/milestones/{milestone}/`；living baseline 与增量文档用 `cp -r` 快照归档（原件留在 `.csp/` 继续演进）。
- **变更同步**：各阶段重新执行时先读既有产物 diff delta，只改 delta，沿追溯链传播 stale 标记并回写 manifest `degraded`。
- **跨文档引用**：用**节标题**引用（稳定），不用节号数字（避免增删节后错位）。
- **默认优先**：可逆/非破坏/非外向的决策一律取默认自动执行，不打断用户；仅在破坏性/不可逆/外向操作（删除来源、Git 发布、删业务文档）时人工拍板。各阶段"引导模式"的问询仅针对**输入真缺失**，不针对可默认的偏好。

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

全链路用**单一状态文件** `.csp/lifecycle-state.json` 记录流水线进度，由 00 初始化、各阶段读/写、05 对账闭环。

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
    {"id":"04-implementation","name":"任务拆解+实施开发","status":"pending","prompt":"04-implementation.md","progress":{"tasks_total":0,"tasks_done":0,"waves":0,"commits":0}},
    {"id":"05-verify-ship","name":"审查测试发布运维","status":"pending","prompt":"05-verify-ship.md","progress":{"quality_gate":"pending","review":"pending","shipped":false}}
  ]
}
```

- **status 取值**：`pending`（未开始）/ `in_progress`（进行中）/ `done`（完成）/ `blocked`（阻塞）/ `stale`（上游变更需重跑）。
- **每阶段开始（探测 step 0.5）**：读 `lifecycle-state.json`，确认本阶段前置阶段 status==`done`；未完成 → 路由回上游；明确"我是第 N 步、下一步是 Y"。
- **每阶段完成**：写 `lifecycle-state.json`——本阶段 status=`done` + 补 `progress` 摘要（计数/指针，非全量）、`current_stage` 指向下一阶段 id、`last_updated` 更新、`reconciled=false`（待 05 对账）。
- **05 对账闭环（发布归档前必做）**：05 读 lifecycle-state + WBS + COVERAGE-REPORT + manifest + traceability 交叉核对，纠正不一致（如某阶段声称 done 但细粒度未达），写回对账后的 lifecycle-state 并置 `reconciled=true`，再快照归档。详见 05「阶段状态对账与闭环」节。
- **重启/换会话**：Agent 读 `lifecycle-state.json` 即知链路停在何处、已完成哪些阶段、下一步该加载哪份提示词、是否已对账。
- **迭代回路**：上游变更时把受影响下游阶段标 `stale`，回到对应阶段重跑 delta，重置 `reconciled=false`。
- **与 manifest 的分工**：`manifest.json` 索引"有哪些知识产物"（build_status）；`lifecycle-state.json` 记录"流水线走到哪步 + 阶段进度摘要"。两者互补，05 对账时互相校验。

