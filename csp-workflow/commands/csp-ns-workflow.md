---
name: csp-workflow
description: "workflow | discuss plan execute verify phase progress"
argument-hint: ""
allowed-tools:
  - Read
  - Skill
requires: [discuss-phase, spec-phase, plan-phase, execute-phase, verify-work, phase, progress, ultraplan-phase, plan-review-convergence]
---

Route to the appropriate phase-pipeline skill based on the user's intent.
Sub-skill names below are post-#2790 consolidated targets — `csp-phase`
absorbs the former add/insert/remove/edit-phase commands and `csp-progress`
absorbs the former next/do commands.

| User wants | Invoke |
|---|---|
| Gather context before planning | csp-discuss-phase |
| Clarify what a phase delivers | csp-spec-phase |
| Create a PLAN.md | csp-plan-phase |
| Execute plans in a phase | csp-execute-phase |
| Verify built features through UAT | csp-verify-work |
| Add / insert / remove / edit a phase | csp-phase |
| Advance to the next logical step | csp-progress |
| Offload planning to the ultraplan cloud | csp-ultraplan-phase |
| Cross-AI plan review convergence loop | csp-plan-review-convergence |

Invoke the matched skill directly using the Skill tool.
