---
name: csp-context
description: "codebase intelligence | map graphify docs learnings"
argument-hint: ""
allowed-tools:
  - Read
  - Skill
requires: [map-codebase, graphify, docs-update, extract-learnings]
---

Route to the appropriate codebase-intelligence skill based on the user's intent.
`csp-scan` and `csp-intel` were folded into `csp-map-codebase` flags by #2790.

| User wants | Invoke |
|---|---|
| Map the full codebase structure | csp-map-codebase |
| Quick lightweight codebase scan | csp-map-codebase --fast |
| Query mapped intelligence files | csp-map-codebase --query |
| Generate a knowledge graph | csp-graphify |
| Update project documentation | csp-docs-update |
| Extract learnings from a completed phase | csp-extract-learnings |

Invoke the matched skill directly using the Skill tool.
