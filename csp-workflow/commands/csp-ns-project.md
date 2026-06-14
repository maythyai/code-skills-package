---
name: csp-project
description: "project lifecycle | milestones audits summary"
argument-hint: ""
allowed-tools:
  - Read
  - Skill
---

Route to the appropriate project / milestone skill based on the user's intent.
`csp-plan-milestone-gaps` was deleted by #2790 — gap planning now happens
inline as part of `csp-audit-milestone`'s output.

| User wants | Invoke |
|---|---|
| Start a new project | csp-new-project |
| Create a new milestone | csp-new-milestone |
| Complete the current milestone | csp-complete-milestone |
| Audit a milestone for issues | csp-audit-milestone |
| Summarize milestone status | csp-milestone-summary |

Invoke the matched skill directly using the Skill tool.
