---
name: csp-quality
description: "quality gates | code review debug audit security eval ui"
argument-hint: ""
allowed-tools:
  - Read
  - Skill
requires: [code-review, audit-uat, secure-phase, eval-review, ui-review, validate-phase, debug, forensics]
---

Route to the appropriate quality / review skill based on the user's intent.
`csp-code-review-fix` was absorbed by `csp-code-review --fix` in #2790.

| User wants | Invoke |
|---|---|
| Review code for quality and correctness | csp-code-review |
| Auto-fix code review findings | csp-code-review --fix |
| Audit UAT / acceptance testing | csp-audit-uat |
| Security review of a phase | csp-secure-phase |
| Evaluate AI response quality | csp-eval-review |
| Review UI for design and accessibility | csp-ui-review |
| Validate phase outputs | csp-validate-phase |
| Debug a failing feature or error | csp-debug |
| Forensic investigation of a broken system | csp-forensics |

Invoke the matched skill directly using the Skill tool.
