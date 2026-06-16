# Decision Point Protocol

> CSP 工作流决策点协议，定义需要用户显式确认的关键节点。

## 决策点清单

| # | 阶段 | 决策 | 触发条件 |
|---|------|------|---------|
| 1 | open | PRD 拆分确认 | 检测到大型 PRD，建议拆分为多个 change |
| 2 | design | 设计方案确认 | 产出多个备选方案，需要用户选择 |
| 3 | build | 计划就绪暂停 | 实施计划已完成，确认是否开始执行 |
| 4 | build | 隔离模式选择 | 选择 worktree 还是 main branch |
| 5 | build | 执行方式选择 | subagent-driven 还是 direct execution |
| 6 | verify | 验证失败决策 | 验证失败时选择修复还是接受 |
| 7 | verify | 分支处理 | 选择 merge、PR 还是 rebase |
| 8 | archive | 最终归档确认 | 确认所有工作已完成，可以归档 |

## 协议规则

### 1. 必须暂停

到达决策点时，**必须**：
- 停止自动执行
- 向用户展示决策选项
- 等待用户显式确认
- 记录用户选择

### 2. 禁止行为

**禁止**：
- ❌ 假设用户会同意（"用户应该会同意这个方案"）
- ❌ 因为变更小而跳过确认（"这是个小改动，不需要确认"）
- ❌ 使用历史偏好（"上次用户选了 A，这次也选 A"）
- ❌ 将沉默视为同意（"我解释了计划，用户没反对"）
- ❌ 用建议代替确认（"我建议这样做"然后直接执行）

### 3. 确认格式

使用平台可用的确认机制：

```markdown
## 决策点: [决策名称]

**背景**: [简要说明]

**选项**:
1. [选项 A] - [说明]
2. [选项 B] - [说明]
3. [选项 C] - [说明]

请选择 (1/2/3):
```

## 各阶段详细协议

### Open 阶段

#### 1. PRD 拆分确认

**触发**: 检测到以下情况：
- PRD 包含 3+ 独立功能
- 预计工作量 > 2 周
- 涉及多个模块/团队

**协议**:
```bash
./shared/scripts/csp-state.sh set prd_split_required true
```

**确认模板**:
```markdown
## PRD 拆分建议

检测到大型 PRD，建议拆分为多个独立 change：

**建议拆分**:
1. `change-1`: [功能 1] - [预估工作量]
2. `change-2`: [功能 2] - [预估工作量]
3. `change-3`: [功能 3] - [预估工作量]

**拆分优势**:
- 独立验证和部署
- 降低风险
- 更快的反馈循环

**选项**:
1. 同意拆分 - 创建 3 个独立 change
2. 保持单一 change - 继续当前流程
3. 自定义拆分 - 我来指定拆分方案

请选择 (1/2/3):
```

### Design 阶段

#### 2. 设计方案确认

**触发**: 产出 2+ 个备选设计方案

**协议**:
```bash
./shared/scripts/csp-state.sh set design_options_count N
```

**确认模板**:
```markdown
## 设计方案选择

已产出以下设计方案：

**方案 A**: [名称]
- 优势: [说明]
- 劣势: [说明]
- 工作量: [预估]

**方案 B**: [名称]
- 优势: [说明]
- 劣势: [说明]
- 工作量: [预估]

**推荐**: [方案 X]，原因: [说明]

**选项**:
1. 采用方案 A
2. 采用方案 B
3. 需要更多信息

请选择 (1/2/3):
```

### Build 阶段

#### 3. 计划就绪暂停

**触发**: 实施计划已完成

**协议**:
```bash
./shared/scripts/csp-state.sh set build_pause plan-ready
./shared/scripts/csp-guard.sh build --check
```

**确认模板**:
```markdown
## 实施计划就绪

实施计划已完成：

**计划文件**: `docs/plans/<name>-plan.md`
**任务数**: [N] 个
**预估工作量**: [X] 小时

**下一步**:
- 选择隔离模式（worktree 或 main branch）
- 选择执行方式（subagent 或 direct）

**选项**:
1. 继续 - 进入配置选择
2. 暂停 - 我需要审查计划
3. 修改 - 我需要调整计划

请选择 (1/2/3):
```

#### 4. 隔离模式选择

**触发**: 用户选择继续执行

**协议**:
```bash
./shared/scripts/csp-state.sh set isolation_mode <worktree|main>
```

**确认模板**:
```markdown
## 隔离模式选择

**Worktree 模式**（推荐）:
- 在独立 worktree 中工作
- 不影响当前分支
- 可以并行开发

**Main Branch 模式**:
- 在当前分支工作
- 更简单直接
- 适合小改动

**选项**:
1. Worktree（推荐）
2. Main Branch

请选择 (1/2):
```

#### 5. 执行方式选择

**触发**: 隔离模式已选择

**协议**:
```bash
./shared/scripts/csp-state.sh set execution_mode <subagent|direct>
```

**确认模板**:
```markdown
## 执行方式选择

**Subagent-driven**（推荐）:
- 并行执行多个任务
- 更快的完成时间
- 适合独立任务

**Direct Execution**:
- 顺序执行任务
- 更简单的控制流
- 适合依赖紧密的任务

**选项**:
1. Subagent-driven（推荐）
2. Direct Execution

请选择 (1/2):
```

### Verify 阶段

#### 6. 验证失败决策

**触发**: `verification_result = fail`

**协议**:
```bash
./shared/scripts/csp-state.sh set verification_result fail
./shared/scripts/csp-guard.sh verify --check
```

**确认模板**:
```markdown
## 验证失败

验证未通过：

**失败原因**: [说明]
**失败测试**: [列出失败的测试]

**选项**:
1. 修复 - 返回 build 阶段修复问题
2. 接受 - 记录偏差，继续归档
3. 重试 - 重新运行验证

请选择 (1/2/3):
```

#### 7. 分支处理

**触发**: `verification_result = pass`

**协议**:
```bash
./shared/scripts/csp-state.sh set branch_strategy <merge|pr|rebase>
```

**确认模板**:
```markdown
## 分支处理策略

验证已通过，选择如何处理分支：

**Merge**:
- 直接 merge 到 main
- 保留完整历史
- 适合独立功能

**Pull Request**:
- 创建 PR 进行 code review
- 更正式的流程
- 适合团队协作

**Rebase**:
- Rebase 到 main 最新
- 线性历史
- 适合小改动

**选项**:
1. Merge
2. Pull Request（推荐）
3. Rebase

请选择 (1/2/3):
```

### Archive 阶段

#### 8. 最终归档确认

**触发**: 所有验证通过，分支已处理

**协议**:
```bash
./shared/scripts/csp-guard.sh archive --check
```

**确认模板**:
```markdown
## 最终归档确认

所有工作已完成：

✅ 所有任务已完成
✅ 验证已通过
✅ 分支已处理
✅ 文档已更新

**即将执行**:
- 归档 change 到 `openspec/changes/archive/`
- 标记 workflow 为 done
- 清理临时文件

**选项**:
1. 确认归档 - 完成所有工作
2. 还需要调整 - 返回之前的阶段

请选择 (1/2):
```

## 自动化集成

### 在 Skill 中使用

```bash
# 检查是否需要决策
if ./shared/scripts/csp-state.sh get prd_split_required | grep -q "true"; then
  # 展示决策模板
  # 等待用户确认
  # 更新状态
fi
```

### 在 Guard 中使用

```bash
# Guard 检查决策点
./shared/scripts/csp-guard.sh build --check
# 如果 build_pause = plan-ready，guard 会失败并提示需要决策
```

## 与 Comet 的差异

| 特性 | Comet | CSP |
|------|-------|-----|
| 配置方式 | `.comet/config.yaml` | `.csp/workflow-state.yaml` |
| 决策点数量 | 8 个 | 8 个 |
| 强制暂停 | 是 | 是 |
| 状态追踪 | `build_pause` 字段 | `build_pause` + 专用字段 |

## 最佳实践

1. **不要跳过决策点** - 即使用户看起来很着急
2. **提供足够信息** - 让用户能做出明智选择
3. **记录决策理由** - 方便后续回顾
4. **尊重用户选择** - 即使你不同意
