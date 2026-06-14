---
name: csp-workspace
description: Manage CSP workspaces — create, list, or remove isolated workspace environments
argument-hint: "[--new | --list | --remove] [name]"
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

<objective>
Manage CSP workspaces with a single consolidated command.

Mode routing:
- **--new**: Create an isolated workspace with repo copies and independent .planning/ → new-workspace workflow
- **--list**: List active CSP workspaces and their status → list-workspaces workflow
- **--remove**: Remove a CSP workspace and clean up worktrees → remove-workspace workflow
</objective>

<routing>

| Flag | Action | Workflow |
|------|--------|----------|
| --new | Create workspace with worktree/clone strategy | new-workspace |
| --list | Scan ~/csp-workspaces/, show summary table | list-workspaces |
| --remove | Confirm and remove workspace directory | remove-workspace |

</routing>

<execution_context>
@~/.claude/code-skills-package/csp-workflow/workflows/new-workspace.md
@~/.claude/code-skills-package/csp-workflow/workflows/list-workspaces.md
@~/.claude/code-skills-package/csp-workflow/workflows/remove-workspace.md
@~/.claude/code-skills-package/csp-workflow/references/ui-brand.md
</execution_context>

<context>
Arguments: $ARGUMENTS

Parse the first token of $ARGUMENTS:
- If it is `--new`: strip the flag, pass remainder (--name, --repos, --path, --strategy, --branch, --auto flags) to new-workspace workflow
- If it is `--list`: execute list-workspaces workflow (no argument needed)
- If it is `--remove`: strip the flag, pass remainder (workspace-name) to remove-workspace workflow
- Otherwise (no flag): show usage — one of --new, --list, or --remove is required
</context>

<process>
1. Parse the leading flag from $ARGUMENTS.
2. Load and execute the appropriate workflow end-to-end based on the routing table above.
3. Preserve all workflow gates from the target workflow (validation, approvals, commits, routing).
</process>
