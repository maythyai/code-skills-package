---
name: csp-hotfix
description: |
  CSP 热修复工作流 — 快速修复线上 bug 的轻量级流程。
  跳过 design 阶段，直接进入 build → verify → archive。
  适用于紧急 bug 修复、安全漏洞、线上故障。
  Use when: 生产环境 bug、紧急安全漏洞、线上故障。
  Keywords: hotfix, 热修复, 紧急修复, 线上bug, 生产问题, quick fix, emergency fix
layer: 2
category: workflow
phase: build
domain: patterns
tools: [Read, Write, Edit, Glob, Grep, Bash]
related_skills: [csp-tweak, csp-full, csp-systematic-debugging]
anti_rationalizations:
  "I'll do a full review later": "Hotfixes skip review by design. But you MUST add a regression test."
  "This is too small for a formal process": "Small fixes can cause big regressions. The verify step is non-negotiable."
---

# CSP Hotfix Workflow

快速修复工作流，跳过 design 阶段，直接进入 build 阶段。适用于紧急场景。

## 适用场景

- ✅ 生产环境 bug 修复
- ✅ 紧急安全漏洞 (CVE)
- ✅ 线上故障处理
- ❌ 新功能开发 (用 `csp-full`)
- ❌ 需要架构变更的修复 (用 `csp-full`)
- ❌ 非紧急改进 (用 `csp-tweak`)

## 流程

```
open → build → verify → archive
```

## 使用方法

### 1. Open 阶段 — 快速分析

创建变更文档，但极度精简：

```markdown
# Hotfix: [bug描述]

## Problem
- Bug 描述 (1-2 句)
- 影响范围
- 复现步骤

## Root Cause
- 根因分析 (定位到具体代码行)

## Fix
- 修复方案 (简要)
- 修改的文件列表

## Risks
- 可能的副作用
- 回滚方案
```

**使用 `csp-state.sh` 初始化：**

```bash
./shared/scripts/csp-state.sh init hotfix --name "fix-<issue-id>"
./shared/scripts/csp-state.sh set proposal_file docs/changes/<name>/proposal.md
./shared/scripts/csp-state.sh set task_count 1
./shared/scripts/csp-guard.sh open --apply
```

### 2. Build 阶段 — 直接修复

**跳过 design，直接修复：**

1. 阅读 bug 报告和相关代码
2. 定位 root cause（用 `csp-systematic-debugging` 辅助）
3. 编写修复代码
4. **必须**编写回归测试
5. 运行完整测试套件

```bash
./shared/scripts/csp-state.sh set task_completed 1
./shared/scripts/csp-guard.sh build --apply
```

### 3. Verify 阶段 — 验证修复

**验证清单：**

- [ ] 回归测试通过 (证明 bug 已修复)
- [ ] 完整测试套件通过 (证明没有破坏其他功能)
- [ ] 相关代码路径手动验证
- [ ] 如果是安全漏洞，确认漏洞已消除

```bash
./shared/scripts/csp-state.sh set verification_result pass
./shared/scripts/csp-guard.sh verify --apply
```

### 4. Archive 阶段 — 归档

```bash
./shared/scripts/csp-guard.sh archive --apply
```

归档后：
- 更新 CHANGELOG
- 如果是安全漏洞，通知相关团队
- 创建 follow-up task 记录是否需要更彻底的修复

## 与 csp-full 的对比

| 阶段 | csp-full | csp-hotfix |
|------|---------|------------|
| brainstorming | ✅ | ❌ 跳过 |
| design | ✅ | ❌ 跳过 |
| plan | ✅ | ❌ 精简 |
| build | ✅ | ✅ 直接修复 |
| review | ✅ 4 人审查 | ❌ 跳过 |
| verify | ✅ 全面验证 | ✅ 回归测试 |
| archive | ✅ | ✅ |

## 关键原则

1. **速度优先，但安全不可妥协** — 可以跳过 review，但不能跳过测试
2. **回归测试是底线** — 没有测试的 hotfix 是定时炸弹
3. **根因分析不可跳过** — 不理解的修复只是掩盖问题
4. **记录 follow-up** — 紧急修复后，评估是否需要更彻底的解决方案

## 相关技能

- [[csp-tweak]] — 更轻量的微调流程（非紧急改进）
- [[csp-full]] — 完整工作流程（新功能、架构变更）
- [[csp-systematic-debugging]] — 系统化调试方法论