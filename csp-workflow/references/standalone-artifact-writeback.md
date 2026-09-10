# Standalone 产物回写约定（Engine Skills）

> 适用于：`csp-requirement-decomposition`、`csp-tech-stack-advisor`、`csp-tech-solution-design`、`csp-tech-design-review`、`csp-fullstack-spec-generator`、`csp-tech-task-breakdown`、`csp-plan-phase`、`csp-implementation-phase`、`csp-tdd`、`csp-verify-phase`、`csp-shipping-and-launch`——所有 S0-S9 契约阶段对应的 engine skill。
>
> **问题**：这些 skill 经 `csp-lifecycle-orchestrator` 调度时，回写由 orchestrator 的治理层承担；但**被单独 `Skill(...)` 调用**（standalone，不经 orchestrator）时，若不自带回写，产物会游离于 `manifest.json` 索引与 `lifecycle-state.json` 状态机之外——这正是"manifest 脱节 / 追溯断裂"的根因。本约定补这个缺口。

## 1. 前置：知识中枢必须存在

standalone 产出前，先探测 `.csp/AGENTS.md` + `.csp/manifest.json`：

- **存在** → 复用，增量回写。
- **不存在** → **提示用户先跑 `csp-knowledge-hub`(S0) 初始化中枢**，不静默产出。未初始化就产出 = 产物落进无索引空间，下游找不到。

> 与 `prompts/00-07` 的"知识中枢前置"step 0 一致；与 `csp-full` 的 step 0.5 探测一致。

## 2. manifest.json 回写

产出实质页后立即回写对应 item。字段规范见 `csp-workflow/skills/csp-knowledge-hub/references/manifest-frontmatter-spec.md`，要点：

```
source_id      # 稳定 id（如 feature:F-A-01 / spec:F-A-01 / task:T1）
source_type    # 见下表
content_hash   # git blob hash（禁 mtime）
build_status   # built
raw_path       # 原文路径（docs/）
output_path    # 工程产物路径（.csp/）
```

### per-stage source_type 表

| 阶段 | engine skill | 落点产物 | source_type |
|---|---|---|---|
| S1 | csp-requirement-decomposition | `.csp/decomposition/` | doc + feature |
| S2 | csp-tech-stack-advisor | `.csp/tech-decisions/` | doc |
| S2.5 | csp-tech-solution-design | `.csp/tech-design/` | spec |
| S2.6 | csp-tech-design-review | `.csp/tech-design/REVIEW-FINDINGS.md` | doc |
| S3 | csp-fullstack-spec-generator | `.csp/specs/` | spec |
| S3.5 | csp-tech-task-breakdown | `.csp/tasks/` | doc + feature |
| S4 | csp-plan-phase | `.csp/plan/` | doc |
| S5 | csp-implementation-phase | code + `.csp/code-spec/`(CMS delta) | cms |
| S6 | csp-tdd | test 证据 | doc |
| S7 | csp-verify-phase | `.csp/verification/` | doc |
| S8 | csp-shipping-and-launch | `.csp/ship/` + VERSION-REGISTRY | archive |

> 完整对齐表（含 csp-full P0-P8 ↔ S0-S9 ↔ 00-07）见 `csp-workflow/skills/csp-full/references/inner-loop-alignment.md` §1。

## 3. lifecycle-state.json 推进

standalone 完成本阶段后，写 `.csp/lifecycle-state.json`（与 orchestrator 同文件、同 schema）：

- `current_stage`：用 S0-S9 id（与 `lifecycle-contract.json` 一致）；若项目历史用 00-07 id 则沿用历史 id，**同项目内不可混用**。
- `stages[本阶段].status = done` + `progress` 摘要（计数/指针，非全量）。
- `reconciled = false`（待 06 对账）+ `last_updated` 更新。
- **S8 ship 特有**：双写 `milestone` 与 `version`(SemVer tag) + `latest_release`；prod-verified 后写 `prod_version`。
- 跳过某阶段（standalone 轻量场景）→ 写 `skipped_stages` + 理由，不假装走过。

状态机 schema 与强制推进语义见 `csp-workflow/references/lifecycle-contract.json`（`csp-sdk drive.advance` 校验 gate）+ `prompts/README.md`「阶段状态追踪」节。

## 4. PMS / CMS / TMS 治理旁路

三说明书（PMS/CMS/TMS）的 per-stage 行为规范见 `csp-workflow/references/module-spec-lifecycle-norms.md`——standalone 调用时同样适用：产出 CMS delta 后 align `.csp/code-spec/`、TMS 增量用例、PMS 闭环。本约定只管 manifest 索引 + lifecycle 状态，三说明书内容由该 norms 管，不在此重复。

## 5. 一句话规则

**standalone 调用的 engine skill：hub 前置（缺则提示 S0）→ 产出即回写 manifest → 推进 lifecycle-state → ship 阶段双写 milestone+version + 更新 AGENTS.md。** 三步缺一即产物游离。
