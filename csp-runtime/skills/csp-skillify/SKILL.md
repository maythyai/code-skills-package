---
name: csp-skillify
aliases: [learner]
description: Turn a repeatable workflow from the current session into a reusable CSP skill draft
layer: 5
category: runtime
---
     name: <skill-name>
     description: <one-line description>
     triggers:
       - <trigger-1>
       - <trigger-2>
     ---
     ```
   - Write learned/user/project skills to flat file-backed paths:
     - `${CLAUDE_CONFIG_DIR:-~/.claude}/skills/csp-learned/<skill-name>.md`
     - `.csp/skills/<skill-name>.md`
   - Remember that uncommitted skills are still worktree-local until committed or copied to a user-level directory.
5. Draft the rest of the skill file with clear triggers, steps, success criteria, and pitfalls.
6. Point out anything still too fuzzy to encode safely.

## Rules
- Only capture workflows that are actually repeatable.
- Keep the skill practical and scoped.
- Prefer explicit success criteria over vague prose.
- If the workflow still has unresolved branching decisions, note them before drafting.
- Keep `csp-learned` as the storage directory name for compatibility; do not present it as the public invocation name.

## Output
- Proposed skill name
- Target location
- Draft workflow structure or complete skill file
- Verification or quality-gate notes
- Open questions, if any
