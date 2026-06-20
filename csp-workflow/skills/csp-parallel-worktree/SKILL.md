---
name: csp-parallel-worktree
description: >
  Automatic git worktree allocation for parallel task execution.
  Detects parallelizable tasks, creates isolated worktrees,
  manages concurrent execution with configurable workers,
  and handles cleanup. Use when executing multi-file changes
  that can run in parallel.
layer: 2
category: workflow
---

# CSP Parallel Worktree

> 自动为并行任务分配独立 git worktree，实现文件系统级别的任务隔离与并发执行。

## 核心概念

当一个 workflow 包含多个可以并行执行的任务时（如同时修改不同文件/模块），自动为每个任务分配独立的 git worktree，实现：

- **文件系统隔离** — 每个任务在独立目录中工作，互不干扰
- **并发安全** — 避免多任务同时修改同一文件导致的冲突
- **独立提交历史** — 每个任务有自己的 commit 链，便于 review 和回滚
- **可控并发度** — 通过 max_workers 限制同时运行的任务数

## 与现有系统的关系

| Skill | 层级 | 职责 | 与本 skill 的关系 |
|-------|------|------|-------------------|
| `using-git-worktrees` | L1 meta | Worktree 创建的方法论指导 | 提供底层 worktree 操作规范 |
| `csp-project-session-manager` | L4 runtime | 管理 worktree-per-session | 跨 session 的 worktree 生命周期 |
| **`csp-parallel-worktree`** | **L2 workflow** | **管理 worktree-per-task** | **单次执行内的并行任务隔离** |

**分工原则**：
- `using-git-worktrees` 回答 "如何正确创建 worktree"
- `csp-project-session-manager` 回答 "如何跨 session 保持 worktree"
- `csp-parallel-worktree` 回答 "如何在一次执行中并行运行多个任务"

## 并行检测算法

### 概述

在执行 workflow 前，分析任务的依赖关系和文件重叠情况，自动划分并行组。

```
输入: workflow stages/tasks
输出: parallel_groups[] (每组内的任务可安全并行)
```

### 算法步骤

```
1. 分析 workflow 的 stages/tasks
2. 提取每个 task 的目标文件/目录（从 files 字段或 skill 推断）
3. 检查文件重叠：
   - 无重叠 → 可并行
   - 有重叠 → 必须串行
4. 检查共享资源（package.json, tsconfig.json 等）
5. 生成并行组（parallel groups）
6. 组间串行，组内并行
```

### 示例

```
Task A: src/components/, src/pages/
Task B: src/api/, src/services/
Task C: tests/
Task D: package.json, src/config/

分析结果:
- Group 1 (并行): [A, B, C]  ← 文件无重叠
- Group 2 (串行): [D]        ← 修改共享资源 package.json

执行顺序: Group 1 (A∥B∥C) → Group 2 (D)
```

详细算法规范见 [references/parallel-detection.md](references/parallel-detection.md)。

## Worktree 生命周期

### 创建

```bash
# 基础分支：当前 HEAD
# Worktree 路径：.worktrees/task-{task-id}/
# 分支命名：csp/task-{task-id}
git worktree add -b csp/task-{task-id} .worktrees/task-{task-id}
```

**前置检查**：
1. 确认 `.worktrees/` 已在 `.gitignore` 中
2. 确认目标分支不存在（若存在则复用或报错）
3. 确认主 worktree 是 clean 状态（参考 dirty-worktree-protocol）

### 执行

- 每个 worktree 内独立执行对应的 skill/task
- 并发控制：`max_workers` 参数限制同时运行的任务数
- 默认 `max_workers = min(task_count, cpu_cores - 1, 4)`
- 每个任务在对应 worktree 目录下执行，使用 `cd` 或 `--worktree` 参数

**执行模式**：

```
对于每个 parallel_group:
  1. 为该组内每个 task 创建 worktree
  2. 启动最多 max_workers 个并发执行
  3. 等待该组所有任务完成
  4. 收集结果（成功/失败/产出物）
  5. 进入下一组
```

### 合并

```
1. 所有并行任务完成后，收集各 worktree 的 commits
2. 按任务定义的顺序依次 cherry-pick 到主分支
3. 检测合并冲突：
   - 无冲突：自动完成 cherry-pick
   - 有冲突：报告冲突文件，暂停并请求用户决策
4. 合并完成后验证（运行测试/lint）
```

详细合并策略见 [references/merge-strategy.md](references/merge-strategy.md)。

### 清理

```bash
# 移除 worktree 目录
git worktree remove .worktrees/task-{task-id} --force

# 删除临时分支
git branch -D csp/task-{task-id}
```

**清理时机**：
- 合并成功后立即清理对应 worktree
- 如果用户选择保留（用于 debug），跳过清理
- 异常中断时，在下次执行前清理残留 worktree

## JSON Workflow 集成

在 csp-workflow-schema 的 stage 定义中支持 `parallel` 配置：

```json
{
  "name": "implement",
  "parallel": true,
  "tasks": [
    {
      "name": "frontend",
      "skills": ["csp-executing-plans"],
      "files": ["src/components/", "src/pages/"]
    },
    {
      "name": "backend",
      "skills": ["csp-executing-plans"],
      "files": ["src/api/", "src/services/"]
    },
    {
      "name": "tests",
      "skills": ["csp-tdd"],
      "files": ["tests/"]
    }
  ],
  "max_workers": 3
}
```

### 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `parallel` | boolean | 否 | 是否启用并行执行，默认 false |
| `tasks[].name` | string | 是 | 任务标识符，用于分支命名和状态追踪 |
| `tasks[].skills` | string[] | 是 | 该任务要执行的 skill 列表 |
| `tasks[].files` | string[] | 是 | 该任务涉及的文件/目录路径（用于冲突检测） |
| `max_workers` | number | 否 | 最大并发数，默认 min(task_count, cores-1, 4) |

## 冲突检测

执行前自动检查以下冲突类型：

### 1. 文件路径重叠

精确到文件级别的检测：

```
Task A files: src/utils/helper.ts, src/utils/format.ts
Task B files: src/utils/helper.ts, src/api/client.ts
→ 冲突: src/utils/helper.ts 被两个任务修改
→ 处理: A 和 B 放入不同的并行组（串行执行）
```

### 2. 共享资源检测

以下文件被视为全局共享资源，任何修改它们的任务不能与其他任务并行：

- `package.json`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`
- `tsconfig.json`, `tsconfig.*.json`
- `.eslintrc*`, `.prettierrc*`, `biome.json`
- `Makefile`, `Dockerfile`, `docker-compose.yml`
- `Cargo.toml`, `go.mod`, `pyproject.toml`, `requirements.txt`
- CI/CD 配置文件（`.github/workflows/`, `.gitlab-ci.yml`）

完整列表见 [references/parallel-detection.md](references/parallel-detection.md)。

### 3. 数据库 Migration 冲突

多个任务同时创建 migration 文件时：
- 检测 `migrations/` 或 `db/migrate/` 目录下的新增文件
- 如果多个任务都产生 migration，强制串行并按序编号

### 4. 自动降级

如果发现冲突，自动将该组降级为串行执行：

```
原始计划: [A ∥ B ∥ C] → [D]
检测到 A 和 C 文件重叠
降级后:   [A] → [B ∥ C] → [D]  或  [A ∥ B] → [C] → [D]
```

降级时会输出警告信息告知用户。

## 状态管理

并行执行的状态持久化到 `.csp/parallel-state.json`：

```json
{
  "session_id": "abc123",
  "created_at": "2026-06-19T10:00:00Z",
  "parallel_groups": [
    {
      "group_id": "group-1",
      "tasks": ["frontend", "backend"],
      "worktrees": [
        ".worktrees/task-frontend/",
        ".worktrees/task-backend/"
      ],
      "status": "running",
      "started_at": "2026-06-19T10:00:00Z"
    },
    {
      "group_id": "group-2",
      "tasks": ["tests"],
      "worktrees": [
        ".worktrees/task-tests/"
      ],
      "status": "pending",
      "depends_on": ["group-1"]
    }
  ],
  "completed_tasks": [],
  "failed_tasks": [],
  "max_workers": 3,
  "merge_status": null
}
```

### 状态流转

```
pending → running → completed
                  → failed
                  → conflict (等待用户决策)
```

### 恢复机制

如果执行中断（crash、手动停止），下次执行时：
1. 读取 `.csp/parallel-state.json`
2. 检查残留 worktree 是否存在
3. 已完成的任务跳过
4. 未完成的任务从断点继续或重新开始
5. 失败的任務根据用户选择重试或跳过

## Dirty Worktree 处理

复用 `shared/references/dirty-worktree-protocol.md` 中的策略：

### 创建前检查

```bash
# 检查主 worktree 是否 clean
if ! git diff --quiet || ! git diff --cached --quiet; then
  # 触发 dirty-worktree-protocol
  # 提供选项: commit / stash / pause / manual
fi
```

### 执行中检查

每个 worktree 内的任务执行完毕后，检查是否有未提交的变更：
- 如果有：自动 commit（使用任务名作为 commit message 前缀）
- 如果 commit 失败：标记任务为 failed，保留 worktree 供调试

### 清理前检查

```bash
# 清理 worktree 前检查未提交变更
cd .worktrees/task-{task-id}
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "⚠️ Worktree has uncommitted changes:"
  git status --short
  echo "Options: (1) Commit & merge  (2) Discard  (3) Keep worktree"
fi
```

## 使用流程

### Step 1: 分析 Workflow

```
读取 workflow 定义 → 提取 tasks → 分析文件依赖 → 生成并行组
```

### Step 2: 确认并行计划

向用户展示并行执行计划：

```markdown
## Parallel Execution Plan

**Group 1** (并行, max 3 workers):
  - frontend: src/components/, src/pages/
  - backend: src/api/, src/services/
  - tests: tests/

**Group 2** (串行, 依赖 Group 1):
  - config: package.json, tsconfig.json

预计提速: ~2.5x (3 tasks in parallel)

确认执行? (Y/n)
```

### Step 3: 创建 Worktrees 并执行

按计划创建 worktree 并启动并行执行。

### Step 4: 合并与清理

所有任务完成后，按顺序合并 commits 并清理 worktree。

## 注意事项

1. **Worktree 数量限制** — 过多 worktree 会占用磁盘空间，建议单个工作流不超过 8 个并行任务
2. **Node modules** — 每个 worktree 需要独立的 `node_modules`，首次执行需安装依赖
3. **环境变量** — worktree 间不共享运行时状态（端口、临时文件等）
4. **IDE 支持** — 部分 IDE 可能不支持多 worktree 同时打开，建议使用 CLI 执行
5. **Git hooks** — pre-commit hooks 会在每个 worktree 中独立运行，确保 hooks 不依赖绝对路径
