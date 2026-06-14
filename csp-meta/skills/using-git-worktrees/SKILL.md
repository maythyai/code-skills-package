---
name: using-git-worktrees
description: Use when starting feature work that needs isolation from current workspace or before executing implementation plans - ensures an isolated workspace exists via native tools or git worktree fallback
---

# Using Git Worktrees

## Overview

Ensure work happens in an isolated workspace. Prefer your platform's native worktree tools. Fall back to manual git worktrees only when no native tool is available.

**Core principle:** Detect existing isolation first. Then use native tools. Then fall back to git. Never fight the harness.

**Announce at start:** "I'm using the using-git-worktrees skill to set up an isolated workspace."

## Step 0: Detect Existing Isolation

**Before creating anything, check if you are already in an isolated workspace.**

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
BRANCH=$(git branch --show-current)
```

**Submodule guard:** `GIT_DIR != GIT_COMMON` is also true inside git submodules. Before concluding "already in a worktree," verify you are not in a submodule:

```bash
# If this returns a path, you're in a submodule, not a worktree — treat as normal repo
git rev-parse --show-superproject-working-tree 2>/dev/null
```

**If `GIT_DIR != GIT_COMMON` (and not a submodule):** You are already in a linked worktree. Skip to Step 3 (Project Setup). Do NOT create another worktree.

Report with branch state:
- On a branch: "Already in isolated workspace at `<path>` on branch `<name>`."
- Detached HEAD: "Already in isolated workspace at `<path>` (detached HEAD, externally managed). Branch creation needed at finish time."

**If `GIT_DIR == GIT_COMMON` (or in a submodule):** You are in a normal repo checkout.

Has the user already indicated their worktree preference in your instructions? If not, ask for consent before creating a worktree:

> "Would you like me to set up an isolated worktree? It protects your current branch from changes."

Honor any existing declared preference without asking. If the user declines consent, work in place and skip to Step 3.

## Step 1: Create Isolated Workspace

**You have two mechanisms. Try them in this order.**

### 1a. Native Worktree Tools (preferred)

The user has asked for an isolated workspace (Step 0 consent). Do you already have a way to create a worktree? It might be a tool with a name like `EnterWorktree`, `WorktreeCreate`, a `/worktree` command, or a `--worktree` flag. If you do, use it and skip to Step 3.

Native tools handle directory placement, branch creation, and cleanup automatically. Using `git worktree add` when you have a native tool creates phantom state your harness can't see or manage.

Only proceed to Step 1b if you have no native worktree tool available.

### 1b. Git Worktree Fallback

**Only use this if Step 1a does not apply** — you have no native worktree tool available. Create a worktree manually using git.

#### Directory Selection

Follow this priority order. Explicit user preference always beats observed filesystem state.

1. **Check your instructions for a declared worktree directory preference.** If the user has already specified one, use it without asking.

2. **Check for an existing project-local worktree directory:**
   ```bash
   ls -d .worktrees 2>/dev/null     # Preferred (hidden)
   ls -d worktrees 2>/dev/null      # Alternative
   ```
   If found, use it. If both exist, `.worktrees` wins.

3. **Check for an existing global directory:**
   ```bash
   project=$(basename "$(git rev-parse --show-toplevel)")
   ls -d ~/.config/code-skills-package/worktrees/$project 2>/dev/null
   ```
   If found, use it (backward compatibility with legacy global path).

4. **If there is no other guidance available**, default to `.worktrees/` at the project root.

#### Safety Verification (project-local directories only)

**MUST verify directory is ignored before creating worktree:**

```bash
git check-ignore -q .worktrees 2>/dev/null || git check-ignore -q worktrees 2>/dev/null
```

**If NOT ignored:** Add to .gitignore, commit the change, then proceed.

**Why critical:** Prevents accidentally committing worktree contents to repository.

Global directories (`~/.config/code-skills-package/worktrees/`) need no verification.

#### Create the Worktree

```bash
project=$(basename "$(git rev-parse --show-toplevel)")

# Determine path based on chosen location
# For project-local: path="$LOCATION/$BRANCH_NAME"
# For global: path="~/.config/code-skills-package/worktrees/$project/$BRANCH_NAME"

git worktree add "$path" -b "$BRANCH_NAME"
cd "$path"
```

**Sandbox fallback:** If `git worktree add` fails with a permission error (sandbox denial), tell the user the sandbox blocked worktree creation and you're working in the current directory instead. Then run setup and baseline tests in place.

## Step 3: Project Setup

Auto-detect and run appropriate setup:

```bash
# Node.js
if [ -f package.json ]; then npm install; fi

# Rust
if [ -f Cargo.toml ]; then cargo build; fi

# Python
if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
if [ -f pyproject.toml ]; then poetry install; fi

# Go
if [ -f go.mod ]; then go mod download; fi
```

## Step 4: Verify Clean Baseline

Run tests to ensure workspace starts clean:

```bash
# Use project-appropriate command
npm test / cargo test / pytest / go test ./...
```

**If tests fail:** Report failures, ask whether to proceed or investigate.

**If tests pass:** Report ready.

### Report

```
Worktree ready at <full-path>
Tests passing (<N> tests, 0 failures)
Ready to implement <feature-name>
```

## Quick Reference

| Situation | Action |
|-----------|--------|
| Already in linked worktree | Skip creation (Step 0) |
| In a submodule | Treat as normal repo (Step 0 guard) |
| Native worktree tool available | Use it (Step 1a) |
| No native tool | Git worktree fallback (Step 1b) |
| `.worktrees/` exists | Use it (verify ignored) |
| `worktrees/` exists | Use it (verify ignored) |
| Both exist | Use `.worktrees/` |
| Neither exists | Check instruction file, then default `.worktrees/` |
| Global path exists | Use it (backward compat) |
| Directory not ignored | Add to .gitignore + commit |
| Permission error on create | Sandbox fallback, work in place |
| Tests fail during baseline | Report failures + ask |
| No package.json/Cargo.toml | Skip dependency install |

## Common Mistakes

### Fighting the harness

- **Problem:** Using `git worktree add` when the platform already provides isolation
- **Fix:** Step 0 detects existing isolation. Step 1a defers to native tools.

### Skipping detection

- **Problem:** Creating a nested worktree inside an existing one
- **Fix:** Always run Step 0 before creating anything

### Skipping ignore verification

- **Problem:** Worktree contents get tracked, pollute git status
- **Fix:** Always use `git check-ignore` before creating project-local worktree

### Assuming directory location

- **Problem:** Creates inconsistency, violates project conventions
- **Fix:** Follow priority: existing > global legacy > instruction file > default

### Proceeding with failing tests

- **Problem:** Can't distinguish new bugs from pre-existing issues
- **Fix:** Report failures, get explicit permission to proceed

## Red Flags

**Never:**
- Create a worktree when Step 0 detects existing isolation
- Use `git worktree add` when you have a native worktree tool (e.g., `EnterWorktree`). This is the #1 mistake — if you have it, use it.
- Skip Step 1a by jumping straight to Step 1b's git commands
- Create worktree without verifying it's ignored (project-local)
- Skip baseline test verification
- Proceed with failing tests without asking

**Always:**
- Run Step 0 detection first
- Prefer native tools over git fallback
- Follow directory priority: existing > global legacy > instruction file > default
- Verify directory is ignored for project-local
- Auto-detect and run project setup
- Verify clean test baseline

---

## AI Agent 高速生成代码的版本控制 (agent-skills 增强)

> 来源: agent-skills/git-workflow-and-versioning

AI agent 以人类无法匹配的速度生成代码。纪律性的版本控制是让变更可管理、可审查、可回滚的唯一机制。

### 核心原则: Trunk-Based Development

保持 `main` 始终可部署。在短生命周期特性分支(1-3 天)上工作,然后合并回主干。长期存在的开发分支是隐藏成本——它们会分叉、产生合并冲突、延迟集成。

```
main ──●──●──●──●──●──●──●──●──●── (始终可部署)
        ╲      ╱  ╲    ╱
         ●──●─╱    ●──╱    ← 短生命周期特性分支 (1-3 天)
```

### AI Agent 特有的挑战

**问题:** AI 可以在几分钟内生成数百行代码。如果不频繁提交,你会得到:
- 巨大的、不可审查的 diff
- 无法定位引入 bug 的提交
- 回滚时会丢失大量工作

**解决方案:** 原子提交纪律

### 原子提交规则

每个提交应该:
1. **单一目的** — 一个提交做一件事
2. **可编译** — 提交时代码必须能编译
3. **可测试** — 提交时测试必须通过
4. **可审查** — diff 应该在 200-400 行以内
5. **有意义** — 提交信息描述"为什么",不是"什么"

### AI Agent 提交频率指南

| 场景 | 提交时机 |
|------|----------|
| 实现单个函数 | 函数完成 + 测试通过后立即提交 |
| 重构多个文件 | 每个逻辑单元完成后提交 |
| 修复 bug | 回归测试通过后立即提交 |
| 添加新特性 | 每个垂直切片(实现 + 测试)后提交 |

### 提交信息模板

```
<type>(<scope>): <subject>

<body - 解释 WHY,不是 WHAT>

Co-Authored-By: AI Agent <agent@example.com>
```

**类型:**
- `feat`: 新功能
- `fix`: Bug 修复
- `refactor`: 重构(不改变行为)
- `test`: 添加/修改测试
- `docs`: 文档
- `chore`: 构建/工具

### 示例: AI 实现认证功能

```bash
# 提交 1: 添加用户模型
git add src/models/user.ts src/models/user.test.ts
git commit -m "feat(auth): add User model with email validation

Introduced User entity with email/password fields and validation logic.
Tests cover edge cases for email format and password strength.

Co-Authored-By: Claude <noreply@anthropic.com>"

# 提交 2: 实现登录端点
git add src/routes/auth.ts src/routes/auth.test.ts
git commit -m "feat(auth): implement POST /login endpoint

Added login endpoint that validates credentials and returns JWT.
Tests verify successful login, invalid credentials, and rate limiting.

Co-Authored-By: Claude <noreply@anthropic.com>"

# 提交 3: 添加认证中间件
git add src/middleware/auth.ts src/middleware/auth.test.ts
git commit -m "feat(auth): add JWT verification middleware

Middleware extracts and verifies JWT from Authorization header.
Tests cover valid tokens, expired tokens, and missing headers.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### 分支生命周期

- **开发分支是成本** — 分支存在的每一天都在积累合并风险
- **1-3 天规则** — 特性分支应该在 1-3 天内合并
- **频繁同步** — 每天从 main 拉取最新变更,减少冲突

### 冲突解决策略

当冲突发生时:
1. **不要恐慌** — 冲突是正常的
2. **理解双方意图** — 为什么两边都改了同一行?
3. **优先保留测试** — 如果冲突涉及测试,保留更严格的版本
4. **人工审查** — AI 不应该自动解决冲突,需要人工确认
