# Task 产物对齐 Checklist

> 现有 task 产物（如 `TASKS-M{N}.md` 单文件、`T-X01-1` ID、缺 `files`/`pms_module`）
> 与三方规范（`csp-tech-task-breakdown` skill 的 Canonical Task Schema、`task-breaker` agent、
> `lifecycle-contract.json` S3.5 gate）不一致。本 checklist 给出对齐动作。
>
> 根因：三方规范此前各自为政（skill 用 `T-{wave}-{seq}`、agent 用 `T-{feature-id}-{seq}`、
> 产物用 `T-X01-1`），且 agent 仍强制 `估时≤4h` 而 skill 已去估时——**Spec Rot**。
> 已先让三方规范自洽于一套 Canonical Task Schema（skill 为权威源，agent 引用不重定义），
> 产物按下表对齐这一套。

## 规范源（已对齐，权威顺序）

1. **`csp-workflow/skills/csp-tech-task-breakdown/SKILL.md`** — Canonical Task Schema（字段集唯一权威）
2. **`.claude/agents/task-breaker.md`** — 引用 skill schema，不另立字段
3. **`csp-workflow/references/lifecycle-contract.json` S3.5** — gate 检 `.csp/tasks/WBS.md` + `DEPENDENCY-DAG.md` 独立文件

## 产物对齐动作

### 1. 文件结构：单文件 → 独立文件（**必须**，否则 drive.gate S3.5 失败）

现状：`TASKS-M{N}.md` 单文件合并全部内容。
对齐：拆成 `.csp/tasks/` 下独立文件——

| 文件 | 内容 | gate 是否检查 |
|---|---|---|
| `WBS.md` | 所有 task 卡的集合视图（Canonical Task Schema） | ✅ drive.gate 检 |
| `DEPENDENCY-DAG.md` | 依赖 DAG（Mermaid）+ 关键路径，无环 | ✅ drive.gate 检 |
| `WAVE-PLAN.md` | Wave|task 集|可并行|里程碑出口 | 否（建议有，05 消费） |
| `TASK-BREAKDOWN-SUMMARY.md` | 摘要 + 缺口清单（05 索引） | 否（建议有） |
| `TASK-CARDS/T-F-*-*.md` | 每 task 一卡（可选，WBS.md 已含则可省） | 否 |

> 里程碑归档时再 `cp` 快照到 `.csp/milestones/{milestone}/tasks/`；`.csp/tasks/` 始终是「现行」。
> 合并的 `TASKS-M{N}.md` 把「现行」与「快照」混淆了，是结构问题不是风格问题。

### 2. Task ID：`T-X01-1` → `T-{feature-id}-{seq}`（**必须**，追溯链断裂）

现状：`T-X01-1`（丢失 feature/module 归属）。
对齐：`T-{feature-id}-{seq}`，如 `T-F-A-1-3`（F-A-1 是 feature-id，3 是该 feature 内序号）。
价值：task→feature→PMS module 可追溯；PMS gate 据此查覆盖率。

### 3. 字段：补 `files` + `pms_module` + `spec_ref` + `acceptance`（**必须**）

| 字段 | 现状 | 对齐值 | 为什么必须 |
|---|---|---|---|
| `spec_ref` | 缺 | `.csp/specs/SPEC-F-{group}-{seq}.md` | Spec 追溯，不臆造 task |
| `pms_module` | 缺 | `MOD-{domain}-{seq}` | PMS gate 覆盖率 + 不越界 |
| `files` | 缺 | 目标文件/目录列表 | 05 并行 + worktree 冲突检测 |
| `acceptance` | 缺/名不一致 | AC id 列表（如 `AC-AUTH-1.2`） | 验收闭环 + TMS gate |
| `depends_on` | 有 | task_id 列表 | DAG（必须无环） |
| `complexity` | 缺 | S/M/L（风险标注，**非工时**） | 不确定性标注 |

### 4. 去估时（**必须**，与去人天原则一致）

现状：task 卡若有 `estimate`/`估时` 字段 → 删除。
对齐：无 `estimate` 字段。粒度判据是**原子性**（一任务一原子提交、文件可数 ≤6、单一职责），
不是「≤4h」。`csp-effort-estimation` 仅按需调用。

### 5. Mermaid DAG（建议）

现状：无。
对齐：`DEPENDENCY-DAG.md` 用 Mermaid 画 DAG + 标关键路径。机器读 `depends_on` 即可，
Mermaid 是给人审查用的（低代价，建议有）。

### 6. 拆解就绪卡（建议）

对齐 `task-breaker` agent §3 的「拆解就绪卡」：执行范围/技术栈/PMS 模块边界/CMS 代码地图/
既有任务计划/缺口。M9/M11 简化的需补全——它暴露上游缺口（缺 Spec/ADR）的。

## 对齐顺序建议

1. 先在 `.csp/tasks/` 产出 `WBS.md` + `DEPENDENCY-DAG.md`（独立文件，过 drive.gate S3.5）
2. ID 改 `T-{feature-id}-{seq}`
3. 补 `files`/`pms_module`/`spec_ref`/`acceptance` 四字段
4. 删 `estimate`
5. 补 Mermaid + 就绪卡（建议项）

从哪个版本开始修正皆可；修正后跑 `csp-sdk query drive.gate S3.5` 确认过 gate。
