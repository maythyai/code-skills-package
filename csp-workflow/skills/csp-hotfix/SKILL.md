---
name: csp-hotfix
description: |
  CSP 热修复工作流 — 快速修复线上 bug 的轻量级流程。
  跳过 design 阶段，直接进入 build，适用于紧急 bug 修复。
  Use when: 需要快速修复生产环境 bug、紧急安全漏洞、线上故障。
  关键词: hotfix, 热修复, 紧急修复, 线上 bug, 生产问题, quick fix
layer: L2
category: workflow
triggers:
  - hotfix
  - 热修复
  - 紧急修复
  - 线上bug
---

# CSP Hotfix Workflow

快速修复工作流，跳过 design 阶段，直接进入 build 阶段。

## 适用场景

- 生产环境 bug 修复
- 紧急安全漏洞
- 线上故障处理
- 不需要重新设计架构的小修复

## 流程

```
open → build → verify → archive
```

## 使用方法

### 1. 初始化 hotfix 工作流

```bash
./shared/scripts/csp-state.sh init hotfix --name "fix-<issue-id>"
```

### 2. Open 阶段

快速创建变更文档：

```markdown
# Proposal (简化版)

## Problem
- Bug 描述
- 影响范围
- 复现步骤

## Solution
- 修复方案（简要）

## Risks
- 修复风险
- 回滚方案
```

```bash
./shared/scripts/csp-state.sh set proposal_file docs/changes/<name>/proposal.md
./shared/scripts/csp-state.sh set task_count 1
./shared/scripts/csp-guard.sh open --apply
```

### 3. Build 阶段

**跳过 design，直接修复**：

1. 阅读 bug 报告和相关代码
2. 定位 root cause
3. 编写修复代码
4. 编写回归测试
5. 运行测试套件

```bash
./shared/scripts/csp-state.sh set task_completed 1
./shared/scripts/csp-guard.sh build --apply
```

### 4. Verify 阶段

```bash
./shared/scripts/csp-state.sh set verification_result pass
./shared/scripts/csp-guard.sh verify --apply
```

### 5. Archive 阶段

```bash
./shared/scripts/csp-guard.sh archive --apply
```

## 与 Comet 的差异

| 特性 | Comet Hotfix | CSP Hotfix |
|------|--------------|------------|
| 依赖 | OpenSpec + Superpowers | CSP 原生 |
| 状态管理 | .comet.yaml | .csp/workflow-state.yaml |
| 阶段守卫 | comet-guard.sh | csp-guard.sh |
| 设计文档 | 可选 | 跳过 |

## 相关技能

- [[csp-tweak]] — 更轻量的微调流程
- [[csp-full]] — 完整工作流程
