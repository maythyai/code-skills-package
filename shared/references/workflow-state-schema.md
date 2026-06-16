# CSP Workflow State Schema

> CSP 工作流状态文件 schema 定义，用于 `.csp/workflow-state.yaml`。

## 概述

`workflow-state.yaml` 是 CSP 工作流的核心状态文件，记录当前 change 的所有信息：
- 工作流类型和阶段
- 上下文文件路径
- 任务进度
- 验证结果
- 配置选项

## 完整 Schema

```yaml
# Schema 版本
version: "1.0"

# 工作流类型
workflow: full | ralph | autopilot | hotfix | tweak

# 当前阶段
phase: open | design | build | verify | archive | done

# 时间戳
started_at: "2026-06-16T10:00:00Z"  # ISO 8601
updated_at: "2026-06-16T10:30:00Z"  # ISO 8601

# 上下文
context:
  change_name: "feature-name"           # Change 名称（必填）
  description: "简要描述"                # Change 描述
  proposal_file: "docs/changes/feature/proposal.md"
  design_doc_file: "docs/changes/feature/design.md"
  plan_file: "docs/plans/feature-plan.md"
  spec_file: "docs/specs/feature-spec.md"
  base_ref: "abc1234"                    # 实现开始前的 git commit
  handoff_json: ".csp/handoff/design-to-build-context.json"
  handoff_md: ".csp/handoff/design-to-build-context.md"

# 任务进度
tasks:
  total: 8                               # 总任务数
  completed: 3                           # 已完成任务数
  current: "实现用户认证模块"              # 当前任务描述

# 验证
verification:
  result: pending | pass | fail          # 验证结果
  mode: light | full                     # 验证模式
  scale:
    tasks_count: 8                       # 任务数
    changed_files: 12                    # 变更文件数
    delta_specs: 1                       # Spec 变更数

# 配置
config:
  auto_transition: true | false          # 自动阶段转换
  tdd_mode: true | false                 # TDD 模式
  isolation: worktree | main             # 隔离模式
  build_mode: subagent | direct          # 执行方式
  context_compression: off | beta        # 上下文压缩

# PRD 拆分（可选）
prd_split_required: true | false         # 是否需要拆分 PRD

# 设计方案（可选）
design_options_count: 3                  # 备选方案数量

# 构建暂停（可选）
build_pause: plan-ready | null           # 构建暂停状态

# 执行模式（可选）
isolation_mode: worktree | main          # 隔离模式
execution_mode: subagent | direct        # 执行方式

# 分支策略（可选）
branch_strategy: merge | pr | rebase     # 分支处理策略

# 工作流暂停（可选）
workflow_paused: true | false            # 工作流是否暂停
```

## 字段详解

### 必填字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `version` | string | Schema 版本，当前为 "1.0" |
| `workflow` | enum | 工作流类型 |
| `phase` | enum | 当前阶段 |
| `started_at` | string | 工作流开始时间（ISO 8601） |
| `updated_at` | string | 最后更新时间（ISO 8601） |
| `context.change_name` | string | Change 名称 |

### 条件必填字段

| 字段 | 条件 | 说明 |
|------|------|------|
| `context.proposal_file` | phase >= open | Proposal 文件路径 |
| `context.design_doc_file` | phase >= design | Design Doc 文件路径 |
| `context.plan_file` | phase >= build | 实施计划文件路径 |
| `tasks.total` | phase >= open | 总任务数 |
| `verification.result` | phase >= verify | 验证结果 |

## 状态转换图

```
┌─────────┐
│  open   │
└────┬────┘
     │ open-done
     ▼
┌─────────┐
│ design  │
└────┬────┘
     │ design-done
     ▼
┌─────────┐
│  build  │ ◄──── verify-fail
└────┬────┘
     │ build-done
     ▼
┌─────────┐
│ verify  │
└────┬────┘
     │ verify-pass
     ▼
┌─────────┐
│ archive │
└────┬────┘
     │ archive-done
     ▼
┌─────────┐
│  done   │
└─────────┘
```

## 阶段说明

### Open 阶段

**目标**: 明确变更范围和目标

**进入条件**: 无（初始阶段）

**退出条件**:
- ✅ `proposal_file` 已设置且文件存在
- ✅ `tasks.total > 0`

**产物**:
- `proposal.md` - 变更提案
- `tasks.md` - 任务列表

### Design 阶段

**目标**: 设计技术方案

**进入条件**:
- ✅ Open 阶段退出条件满足

**退出条件**:
- ✅ `design_doc_file` 已设置且文件存在

**产物**:
- `design.md` - 设计文档
- `spec.md` - 规格说明（可选）

### Build 阶段

**目标**: 实现功能

**进入条件**:
- ✅ Design 阶段退出条件满足

**退出条件**:
- ✅ `tasks.completed == tasks.total`
- ✅ `plan_file` 已设置且文件存在

**产物**:
- 代码实现
- 测试代码
- `plan.md` - 实施计划

### Verify 阶段

**目标**: 验证实现质量

**进入条件**:
- ✅ Build 阶段退出条件满足

**退出条件**:
- ✅ `verification.result` 为 `pass` 或 `fail`

**产物**:
- 验证报告
- 测试结果

### Archive 阶段

**目标**: 归档完成的 change

**进入条件**:
- ✅ `verification.result == pass`

**退出条件**:
- ✅ 所有工作已完成
- ✅ 用户确认归档

**产物**:
- 归档记录
- 最终报告

## 工作流类型

### Full（完整工作流）

```
open → design → build → verify → archive
```

**适用**: 大型功能、复杂变更

**特点**:
- 完整的 5 阶段流程
- 包含设计和验证
- 适合团队协作

### Ralph（自主循环）

```
open → build → verify → (loop)
```

**适用**: 自主迭代、持续改进

**特点**:
- 跳过 design 阶段
- 可以循环执行
- 适合探索性开发

### Autopilot（全自动）

```
open → build → verify → archive
```

**适用**: 明确需求的自动化任务

**特点**:
- 全自动执行
- 最少用户干预
- 适合标准化任务

### Hotfix（热修复）

```
open → build → verify → archive
```

**适用**: 紧急 bug 修复

**特点**:
- 跳过 design 阶段
- 快速响应
- 适合生产问题

### Tweak（微调）

```
open → build (light) → verify (light) → archive
```

**适用**: 小范围调整

**特点**:
- 轻量级流程
- 简化验证
- 适合文案、配置修改

## 脚本接口

### csp-state.sh

```bash
# 初始化
./shared/scripts/csp-state.sh init <workflow> --name <change-name>

# 读取字段
./shared/scripts/csp-state.sh get <field>

# 设置字段
./shared/scripts/csp-state.sh set <field> <value>

# 状态转换
./shared/scripts/csp-state.sh transition <event>

# 阶段检查
./shared/scripts/csp-state.sh check <phase>

# 规模评估
./shared/scripts/csp-state.sh scale

# 任务完成
./shared/scripts/csp-state.sh task-checkoff "<task-description>"

# 下一步
./shared/scripts/csp-state.sh next
```

### csp-guard.sh

```bash
# 检查阶段退出条件
./shared/scripts/csp-guard.sh <phase> --check

# 检查并推进阶段
./shared/scripts/csp-guard.sh <phase> --apply
```

### csp-handoff.sh

```bash
# 生成 handoff 包（压缩模式）
./shared/scripts/csp-handoff.sh <from-phase> <to-phase> --write

# 生成 handoff 包（完整模式）
./shared/scripts/csp-handoff.sh <from-phase> <to-phase> --full
```

## 示例

### 完整工作流示例

```yaml
version: "1.0"
workflow: full
phase: build
started_at: "2026-06-16T10:00:00Z"
updated_at: "2026-06-16T14:30:00Z"

context:
  change_name: "user-authentication"
  description: "实现用户认证系统"
  proposal_file: "docs/changes/user-auth/proposal.md"
  design_doc_file: "docs/changes/user-auth/design.md"
  plan_file: "docs/plans/user-auth-plan.md"
  spec_file: "docs/specs/user-auth-spec.md"
  base_ref: "abc1234def5678"

tasks:
  total: 5
  completed: 3
  current: "实现 JWT token 验证"

verification:
  result: pending
  mode: full
  scale:
    tasks_count: 5
    changed_files: 8
    delta_specs: 1

config:
  auto_transition: true
  tdd_mode: true
  isolation: worktree
  build_mode: subagent
  context_compression: beta
```

### Hotfix 示例

```yaml
version: "1.0"
workflow: hotfix
phase: verify
started_at: "2026-06-16T15:00:00Z"
updated_at: "2026-06-16T15:45:00Z"

context:
  change_name: "fix-login-crash"
  description: "修复登录崩溃问题"
  proposal_file: "docs/changes/fix-login-crash/proposal.md"
  plan_file: "docs/plans/fix-login-crash-plan.md"
  base_ref: "xyz7890"

tasks:
  total: 2
  completed: 2
  current: ""

verification:
  result: pass
  mode: light
  scale:
    tasks_count: 2
    changed_files: 3
    delta_specs: 0

config:
  auto_transition: true
  tdd_mode: false
  isolation: main
  build_mode: direct
  context_compression: off
```

## 验证规则

### Schema 验证

```bash
# 检查必填字段
if [ -z "$(yaml_get 'version' $STATE_FILE)" ]; then
  error "Missing required field: version"
fi

if [ -z "$(yaml_get 'workflow' $STATE_FILE)" ]; then
  error "Missing required field: workflow"
fi

if [ -z "$(yaml_get 'phase' $STATE_FILE)" ]; then
  error "Missing required field: phase"
fi

if [ -z "$(yaml_get 'context.change_name' $STATE_FILE)" ]; then
  error "Missing required field: context.change_name"
fi
```

### 阶段验证

```bash
# 检查阶段转换合法性
current_phase=$(yaml_get 'phase' $STATE_FILE)
case $current_phase in
  open)    # 可以转换到 design
  design)  # 可以转换到 build
  build)   # 可以转换到 verify
  verify)  # 可以转换到 archive 或 build (verify-fail)
  archive) # 可以转换到 done
  done)    # 终态，不能转换
esac
```

## 与 Comet 的差异

| 特性 | Comet | CSP |
|------|-------|-----|
| 文件路径 | `openspec/changes/<name>/.comet.yaml` | `.csp/workflow-state.yaml` |
| Schema 版本 | 无 | `version: "1.0"` |
| 工作流类型 | full, hotfix, tweak | full, ralph, autopilot, hotfix, tweak |
| 阶段数量 | 5 个 | 6 个（增加 done） |
| 配置位置 | 顶层字段 | `config` 子对象 |

## 最佳实践

1. **保持简洁** - 只记录必要信息
2. **及时更新** - 每个阶段完成后更新 `updated_at`
3. **使用绝对路径** - 文件路径使用相对于项目根目录的路径
4. **记录 base_ref** - 在 build 阶段开始前记录 git commit
5. **定期备份** - 重要 change 可以备份 `.csp/workflow-state.yaml`
