---
name: csp-tweak
description: |
  CSP 微调工作流 — 最轻量的变更流程，适用于文案调整、配置修改、文档更新等小改动。
  跳过 design 和完整的 build 阶段，直接进入轻量级验证。
  Use when: 修改文案、调整配置、更新文档、小范围代码调整。
  关键词: tweak, 微调, 小改, 文案调整, 配置修改, minor change
layer: L2
category: workflow
triggers:
  - tweak
  - 微调
  - 小改
  - 文案调整
  - 配置修改
---

# CSP Tweak Workflow

最轻量的变更流程，适用于小范围调整。

## 适用场景

- 文案/字符串调整
- 配置文件修改
- 文档内容更新
- 注释/日志优化
- 不需要测试的小改动

## 流程

```
open → build (light) → verify (light) → archive
```

## 使用方法

### 1. 初始化 tweak 工作流

```bash
./shared/scripts/csp-state.sh init tweak --name "tweak-<description>"
```

### 2. Open 阶段

极简变更文档：

```markdown
# Tweak Proposal

## What
- 要改什么

## Why
- 为什么改

## Impact
- 影响范围（通常很小）
```

```bash
./shared/scripts/csp-state.sh set proposal_file docs/changes/<name>/proposal.md
./shared/scripts/csp-state.sh set task_count 1
./shared/scripts/csp-guard.sh open --apply
```

### 3. Build 阶段（轻量级）

**跳过 design，直接修改**：

1. 执行修改
2. 快速验证（无需完整测试套件）

```bash
./shared/scripts/csp-state.sh set task_completed 1
./shared/scripts/csp-guard.sh build --apply
```

### 4. Verify 阶段（轻量级）

简化验证：

- 检查修改是否符合预期
- 确认没有破坏现有功能
- 如果是文案，检查语法/拼写

```bash
./shared/scripts/csp-state.sh set verification_result pass
./shared/scripts/csp-guard.sh verify --apply
```

### 5. Archive 阶段

```bash
./shared/scripts/csp-guard.sh archive --apply
```

## 与 Hotfix 的差异

| 特性 | Hotfix | Tweak |
|------|--------|-------|
| 用途 | Bug 修复 | 小调整 |
| 测试 | 需要回归测试 | 可选 |
| 风险 | 中等 | 低 |
| 阶段 | open→build→verify→archive | open→build(light)→verify(light)→archive |

## 相关技能

- [[csp-hotfix]] — 热修复流程
- [[csp-full]] — 完整工作流程
