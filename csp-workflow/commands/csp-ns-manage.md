---
name: csp-manage
description: "config workspace | workstreams thread update ship inbox"
argument-hint: ""
allowed-tools:
  - Read
  - Skill
requires: [config, workspace, workstreams, thread, pause-work, resume-work, update, ship, inbox, pr-branch, undo]
---

Route to the appropriate management skill based on the user's intent.
`csp-config` (settings + advanced + integrations + profile) and `csp-workspace`
(new + list + remove) are post-#2790 consolidated entries.

| User wants | Invoke |
|---|---|
| Configure CSP settings (basic / advanced / integrations / profile) | csp-config |
| Manage workspaces (create / list / remove) | csp-workspace |
| Manage parallel workstreams | csp-workstreams |
| Continue work in a fresh context thread | csp-thread |
| Pause current work | csp-pause-work |
| Resume paused work | csp-resume-work |
| Update the CSP installation | csp-update |
| Ship completed work | csp-ship |
| Process inbox items | csp-inbox |
| Create a clean PR branch | csp-pr-branch |
| Undo the last CSP action | csp-undo |

Invoke the matched skill directly using the Skill tool.
