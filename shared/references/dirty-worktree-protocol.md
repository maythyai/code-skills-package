# Dirty Worktree Protocol

> CSP 脏工作区协议，处理工作流中未提交的变更。

## 问题场景

在工作流执行过程中，可能会遇到：

1. **未提交的变更** - 工作区有未 commit 的文件
2. **不属于当前 change 的变更** - 工作区有之前工作的残留
3. **冲突的变更** - 当前 change 的修改与其他修改冲突

## 处理原则

### 1. 安全第一

- ✅ 永远不要丢失用户的工作
- ✅ 明确区分当前 change 和其他变更
- ✅ 在继续前解决冲突

### 2. 显式处理

- ❌ 不要忽略未提交的变更
- ❌ 不要假设变更属于当前 change
- ❌ 不要自动 stash 或 commit

### 3. 用户决策

- ✅ 告知用户工作区状态
- ✅ 提供处理选项
- ✅ 等待用户确认

## 检测脏工作区

### 自动检测

在关键阶段（如 build、verify）开始时检测：

```bash
# 检查未提交变更
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "⚠️ Dirty worktree detected"
  git status
fi
```

### 检测时机

| 阶段 | 检测 | 原因 |
|------|------|------|
| open | ❌ | 还未开始编码 |
| design | ❌ | 还未开始编码 |
| build | ✅ | 开始修改代码前 |
| verify | ✅ | 验证前需要干净的基线 |
| archive | ✅ | 归档前需要所有变更已提交 |

## 处理流程

### Step 1: 识别变更归属

分析未提交的变更，判断是否属于当前 change：

```bash
# 列出变更文件
git status --porcelain

# 对于每个文件，检查是否与当前 change 相关
# 例如：检查文件路径、内容、修改时间
```

### Step 2: 分类变更

将变更分为三类：

| 类别 | 说明 | 处理方式 |
|------|------|---------|
| 属于当前 change | 与当前 change 直接相关 | 继续当前流程 |
| 属于其他工作 | 与当前 change 无关 | 需要单独处理 |
| 不确定 | 无法判断归属 | 询问用户 |

### Step 3: 提供处理选项

```markdown
## Dirty Worktree Detected

检测到未提交的变更：

**变更列表**:
- `src/user.ts` - Modified
- `src/order.ts` - Modified
- `docs/api.md` - Modified

**分析**:
- ✅ `src/user.ts` - 属于当前 change (user-system)
- ❓ `src/order.ts` - 不确定归属
- ❌ `docs/api.md` - 属于其他工作

**选项**:
1. 提交当前 change - 只提交属于当前 change 的文件
2. Stash 所有变更 - 暂时保存，继续工作流
3. 暂停工作流 - 先处理这些变更
4. 手动选择 - 我来指定哪些属于当前 change

请选择 (1/2/3/4):
```

## 处理策略

### 策略 1: 选择性提交

只提交属于当前 change 的文件：

```bash
# 添加属于当前 change 的文件
git add src/user.ts

# 提交
git commit -m "feat(user): add user registration"

# 继续工作流
./shared/scripts/csp-guard.sh build --apply
```

**适用**: 变更归属清晰，可以安全分离

### 策略 2: Stash 所有变更

暂时保存所有变更，继续工作流：

```bash
# Stash 所有变更
git stash push -m "before csp workflow"

# 继续工作流
./shared/scripts/csp-guard.sh build --apply

# 工作流完成后恢复
git stash pop
```

**适用**: 变更与当前 change 无关，需要稍后处理

### 策略 3: 暂停工作流

先处理这些变更，再继续工作流：

```bash
# 标记工作流暂停
./shared/scripts/csp-state.sh set workflow_paused true

# 处理变更（由用户决定）
git add .
git commit -m "wip: work in progress"

# 恢复工作流
./shared/scripts/csp-state.sh set workflow_paused false
./shared/scripts/csp-guard.sh build --apply
```

**适用**: 变更复杂，需要用户仔细判断

### 策略 4: 手动选择

用户指定哪些文件属于当前 change：

```bash
# 用户选择文件
git add src/user.ts src/order.ts

# 提交
git commit -m "feat: add user and order features"

# 继续工作流
./shared/scripts/csp-guard.sh build --apply
```

**适用**: 需要用户精确控制

## 特殊场景

### 场景 1: Worktree 模式

如果使用 worktree 隔离，脏工作区问题更少：

```bash
# Worktree 模式下独立目录工作
git worktree add ../feature-user-system -b feature/user-system

# 工作区的变更只影响当前 worktree
# 不会影响 main branch
```

**优势**: 隔离性好，不容易产生脏工作区

### 场景 2: 验证失败后的脏工作区

验证失败后，工作区可能包含：
- 修复代码
- 新增测试
- 调试日志

```bash
# 验证失败
./shared/scripts/csp-state.sh set verification_result fail

# 处理脏工作区
# 选项 1: 提交修复
git add .
git commit -m "fix: address verification failures"

# 选项 2: 回滚修复
git checkout .
git clean -fd
```

### 场景 3: 多个 change 并行

如果同时有多个 change 在进行：

```bash
# Change 1: user-system
./shared/scripts/csp-state.sh set current_change user-system
# ... 做一些工作 ...

# 切换到 Change 2
git stash push -m "user-system wip"
./shared/scripts/csp-state.sh set current_change product-system
# ... 做一些工作 ...

# 切换回 Change 1
git stash push -m "product-system wip"
./shared/scripts/csp-state.sh set current_change user-system
git stash pop  # 恢复 user-system 的工作
```

## 检查清单

### Build 阶段前

- [ ] 检查未提交变更
- [ ] 识别变更归属
- [ ] 选择处理策略
- [ ] 执行处理（提交/stash/暂停）
- [ ] 确认工作区干净

### Verify 阶段前

- [ ] 确认所有任务已完成
- [ ] 确认所有变更已提交
- [ ] 确认没有调试代码（如 console.log）
- [ ] 确认没有临时文件

### Archive 阶段前

- [ ] 确认验证已通过
- [ ] 确认分支已处理
- [ ] 确认没有未提交变更
- [ ] 确认文档已更新

## 自动化集成

### 在 Guard 中集成

```bash
# csp-guard.sh 中检查脏工作区
check_build_entry() {
  # 检查脏工作区
  if ! git diff --quiet || ! git diff --cached --quiet; then
    red "BLOCKED: Dirty worktree detected"
    red "Please commit or stash changes before entering build phase"
    git status --short
    return 1
  fi
  
  green "✓ Worktree is clean"
  return 0
}
```

### 在 Skill 中集成

```markdown
## Step 1: 准备工作区

在开始编码前，确保工作区干净：

\`\`\`bash
# 检查未提交变更
git status

# 如果有变更，处理它们
if [ -n "$(git status --porcelain)" ]; then
  # 提供处理选项
  echo "检测到未提交变更，请选择处理方式："
  echo "1. 提交当前工作"
  echo "2. Stash 变更"
  echo "3. 暂停工作流"
  read choice
  
  case $choice in
    1) git add . && git commit -m "wip" ;;
    2) git stash ;;
    3) exit 1 ;;
  esac
fi
\`\`\`
```

## 与 Comet 的差异

| 特性 | Comet | CSP |
|------|-------|-----|
| 检测时机 | build、verify、archive | build、verify、archive |
| 处理策略 | 4 种 | 4 种 |
| Worktree 支持 | ✅ | ✅ |
| 自动 stash | ❌ | ❌ |

## 最佳实践

1. **频繁提交** - 小步提交，减少脏工作区
2. **有意义的 commit message** - 方便后续回顾
3. **使用 worktree** - 隔离不同 change 的工作
4. **定期清理** - 删除临时文件和调试代码
5. **备份重要工作** - 在 stash 前确保知道如何恢复
