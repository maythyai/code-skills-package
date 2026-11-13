---
name: csp-review-retro
description: "Post-release review and retrospective — dual-stack analysis (product defects + architecture issues), findings triage (open/deferred), ROADMAP reflow of adopted findings, and closed-loop traceability from finding → PRD → Spec → Task → commit. Use after each version release (06 done). Triggers: 复盘, 回顾, retrospective, post-release review, 版本复盘."
version: "1.0.0"
layer: 2
category: workflow
phase: review
domain: quality
scope: review
role: reviewer
tools: [Read, Write, Edit, Glob, Grep]
triggers:
  - "复盘"
  - "回顾"
  - "retrospective"
  - "retro"
  - "post-release review"
  - "版本复盘"
  - "sprint review"
  - "release review"
related_skills: [csp-retro, csp-agent-self-evaluation, csp-code-review]
anti_rationalizations:
  "复盘不重要，下个版本直接开始": "不复盘 = 同一个坑踩两次。07 findings 是下一轮 01 的事实输入。"
  "问题太多，挑几个重要的说": "全部记录——open/deferred 的都有去处。漏记的 finding 不会自己消失。"
---

# Review & Retrospective

> 版本发布后的强制复盘——不是"总结会"，是下一轮规划的事实输入工厂。

## Dual-Stack Analysis

### Stack A: Product/Feature Defects
- What was delivered vs what was planned?
- Which AC were not met?
- What user feedback came in during this version?
- What was deferred and why?

### Stack B: Architecture/Technical Issues
- What technical debt accumulated?
- What patterns emerged that need refactoring?
- What toolchain issues slowed delivery?
- What test gaps were exposed?

## Findings Triage

Every finding gets ONE of three statuses:

| Status | Meaning | Next Action |
|--------|---------|------------|
| **open** | Confirmed issue, needs fixing | Enter next version's 01 as an AC or optimization item |
| **deferred** | Real issue, but blocked or deprioritized | Record with unblock condition; automatically re-enters 01 when condition met |
| **closed** | Fixed and verified in this version | Record fix commit and verification evidence |

## ROADMAP Reflow

Findings that are `open` or `deferred` automatically feed into the next planning cycle:
1. Planning Phase 2 picks up findings as version theme candidates
2. Phase 2.5 integration review evaluates each finding for inclusion
3. Adopted findings trace: `REVIEW-FINDING-NN → PRD-{slug} → SPEC-F-* → TASK-NN → commit`

## Outputs

- `.csp/review/REVIEW-REPORT-{slug}.md` — human-readable summary
- `.csp/review/REVIEW-FINDINGS-{version}.json` — machine-consumable findings
- `docs/analysis/test-retro-{version}.md` — test-specific retrospective

## Finding Format

```json
{
  "finding_id": "REV-F-NN",
  "stack": "A|B",
  "severity": "P0|P1|P2|P3",
  "summary": "What happened and why it matters",
  "evidence": ["file:line or metric or feedback quote"],
  "recommendation": "What to do about it",
  "status": "open|deferred|closed",
  "adopted_by": null,
  "fix_commit": null
}
```