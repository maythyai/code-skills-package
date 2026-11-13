---
name: csp-fix-loop
description: "Quality gate fix loop — when 06 S6/S7 gates fail, route the failure to the correct fix stage (05 implementation defect / 03 Spec gap / 01 PRD issue), apply minimal delta fix, re-verify affected gates, and iterate until all gates green. Circuit-break after 3 rounds. Triggers: gate failed, 门控失败, fix loop, 修 delta, re-verify."
version: "1.0.0"
layer: 2
category: workflow
phase: verify
domain: quality
scope: testing
role: specialist
tools: [Read, Write, Edit, Bash, Glob, Grep]
triggers:
  - "gate failed"
  - "门控失败"
  - "fix loop"
  - "re-verify"
  - "修 delta"
  - "修复后重验"
  - "gate not passing"
related_skills: [csp-verify-phase, csp-release-manager, csp-systematic-debugging]
anti_rationalizations:
  "小小一个问题，不用走完整 fix loop": "跳过 fix loop 静默修复 = 无追溯。每个 gate 失败必须有路由→修复→重验记录。"
  "修了 3 次还不行，再试一次": "3 次同根因失败 = 架构问题。停止修补，质疑设计。"
---

# Fix Loop — Quality Gate Recovery

> 06 门控失败时的**结构化修复流程**。不是"改一下再跑一次"——是"归类→路由→修 delta→重验→记录"。

## Loop Flow

```
Gate failed (e.g. Check 5.3 Build exit 1)
    │
    ├─ Classify failure:
    │    实现缺陷 → Route to 05 (fix code)
    │    Spec 缺口 → Route to 03 (update Spec → align code)
    │    需求问题 → Route to 01 (PRD Rejected path)
    │    工具链不可用 → BLOCKED (report to user, no degrade)
    │
    ├─ Apply minimal delta fix (only what's needed to pass THIS gate)
    │
    ├─ Re-verify ALL affected gates (not just the failed one)
    │    A type fix might break integration tests
    │
    ├─ Record: gate → root cause → fix commit → re-verify result
    │    Write to DEV-LOG: "Check 5.3 failed: unused import → fix a1b2c3d → re-verified PASS"
    │
    └─ Loop until all gates green OR circuit-break
```

## Circuit-Break Rules

| Rounds | Action |
|--------|--------|
| 1-2 | Normal fix loop |
| 3 | Same root cause → **STOP**. Question architecture/pattern, not "try again" |
| 3+ | Different root causes each round → escalate to user: "systemic quality issues" |

## Re-verify Scope

After fixing a gate failure, re-verify:
1. The fixed gate itself
2. Adjacent gates that share dependencies (e.g. Build fix → re-verify TypeCheck)
3. Any downstream gate that consumes the fixed output

Don't assume a lint fix doesn't break E2E.

## Deviation Recording

Write every fix loop iteration to `.csp/ops/dev-log/DEV-LOG.md`:
- Which gate failed
- Root cause classification
- Fix commit
- Re-verify results (which gates re-passed)
- If circuit-broke: why architecture was questioned