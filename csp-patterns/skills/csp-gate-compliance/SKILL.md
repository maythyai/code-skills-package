---
name: csp-gate-compliance
description: "Audit whether prior quality gates were actually passed before the current release. Detects gate-skipping patterns: shipped versions despite BLOCKED audit/verify/finding gates, reusing old metrics as current proof, silently skipping mandatory checks. Use before every release or when version history shows suspicious patterns."
version: "1.0.0"
layer: 3
category: patterns
phase: verify
domain: quality
scope: testing
role: specialist
tools: [Read, Grep, Glob, Bash]
triggers:
  - "gate audit"
  - "gate compliance"
  - "release gate check"
  - "门控合规"
  - "检查 gates 是否通过"
related_skills: [csp-verify-phase, csp-release-manager, csp-security-review]
anti_rationalizations:
  "上个门控报告说 BLOCKED 但是已经修复了": "修复记录必须存在且带 fix commit/tag 和时间证据。无记录的修复 = 未修复。"
  "只是测试没覆盖到，功能是好的": "绿测试 ≠ 覆盖需求。门控 fail 必须有显式 override 记录。"
---

# Gate Compliance Audit

> 发布前必检：上一次及所有前置门控是否真正通过了——不是"我记得是通过的"，不是"看报告标题是 PASS"。用证据说话。

## When to Run

- **每次 06 发布前强制跑**——不做这个检查不能打 tag
- 发现版本连续发布但 audit/verify findings 没有闭合记录时
- 版本号从 vX.1 跳到 vX.5 但中间 vX.2~vX.4 无 gate 记录时

## Audit Steps

### Step 1: 收集 gate 证据

```bash
# 列出上一已发布 tag 以来所有 gate snapshot
git log --oneline <prev-tag>..HEAD -- '.csp/audit/GATE-SNAPSHOT*' '.csp/verification/*.json'

# 读取最新 gate snapshot 的 verdict
cat .csp/audit/GATE-SNAPSHOT-*.json | grep -E '"verdict"|"blocked"|"BLOCKED"'

# 检查 findings closure 脚本是否跑过
git log --oneline <prev-tag>..HEAD | grep -i 'findings_closure\|闭合'
```

### Step 2: 门控矩阵对照

对每个 gate 检查三个条件：

| Gate | 通过条件 | 证据要求 |
|------|---------|---------|
| **代码门控** | lint/typecheck/build exit 0 | 命令+exit code+commit，必须在当前 commit 或更近的 commit 上跑过 |
| **测试门控** | 覆盖率 ≥ 阈值，exit 0 | 测试命令+exit code+覆盖报告路径，同一 commit |
| **审计门控** | 无 CRITICAL；P0 全部 closed | 每个 P0 finding 的 fix commit 证据 |
| **findings 闭合** | `findings_closure_check.py` exit 0 | 脚本输出+baseline，同一 commit |
| **版本对齐** | `version_integrity_check.py` exit 0 | 脚本输出+baseline，无新增 T1/T3 违规 |

### Step 3: 违规判定

| 发现 | 严重度 | 处置 |
|------|--------|------|
| 上一版 gate snapshot 为 BLOCKED 但无修复记录即 shipped | CRITICAL | **阻断发布**，先闭合上一版 gates |
| gate 证据来自旧 commit（非当前或更近） | CRITICAL | **阻断发布**，在当前 commit 重跑 |
| gate 声称 PASS 但无命令/exit code 证据（仅描述性文本） | HIGH | 重新运行 gate 获取机器证据 |
| 中间版本缺 gate 记录 | MEDIUM | 记录缺口，当前发布前补跑 |

### Step 4: CI 接线检查

- 每个 gate 的检查命令是否在 CI pipeline 中实际执行？（不是文档写"应该跑"）
- CI 是否在 gate fail 时阻断 merge/deploy？（不是只报 WARNING）
- 纯人眼检查的 gate → 标为"不可靠"，必须有机器证据补充

## Output

```markdown
## Gate Compliance Audit — {version}

### Previous Gate Status
- Latest GATE-SNAPSHOT: {path} @ {commit}
- Verdict: {BLOCKED/PASS/WARNING}
- Open CRITICAL findings: {N}
- Gate evidence age: {same commit / N commits behind}

### Gate-by-Gate Compliance
| Gate | Last Passed | Evidence Fresh? | CI Wired? | Status |
|------|------------|----------------|-----------|--------|
| Lint/TypeCheck | v6.50 @ a1b2c3d | YES | ✅ CI | PASS |
| Test Coverage | v6.48 @ d4e5f6g | NO (+4 commits) | ✅ CI | **RERUN** |
| Findings Closure | v6.47 | N/A (not run) | ❌ | **MISSING** |

### Verdict: {PASS / BLOCKED — reasons}
```

## Execution Constraints

- 纯人眼评估不替代机器证据。无命令/exit code 的 gate = 不可信。
- 上一版 gate 为 BLOCKED 且无修复记录 → **不打 tag**。先闭合。
- 本检查自身应接入 CI：`gate-compliance-check.sh` 在 tag push 前强制运行。