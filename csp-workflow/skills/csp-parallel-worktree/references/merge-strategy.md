# Merge Strategy

> Specification for merging parallel worktree results back into the main branch.

## Overview

After parallel tasks complete in their isolated worktrees, changes must be merged back into the main working branch. This document defines the merge protocol, conflict handling, and rollback mechanisms.

## Pre-Merge Validation

Before attempting any merge, verify:

1. **All tasks in the current group completed** — no running or pending tasks
2. **Each worktree has at least one commit** — empty worktrees are skipped
3. **Main branch is clean** — no uncommitted changes on the main worktree
4. **State file is consistent** — `.csp/parallel-state.json` matches actual worktree state

```bash
# Verify main branch is clean
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "ERROR: Main branch has uncommitted changes"
  echo "Resolve before merging parallel results"
  exit 1
fi
```

## Conflict-Free Auto-Merge

### Cherry-Pick Strategy

We use cherry-pick (not merge) to integrate worktree commits because:

- Preserves linear history on the main branch
- Each task's commits remain atomic and identifiable
- Easier to revert individual tasks if needed
- Avoids merge commits that obscure task boundaries

### Merge Order

Tasks are merged in a deterministic order:

1. **Explicit order**: If the workflow defines task ordering, follow it
2. **Dependency order**: Tasks with `depends_on` are merged after their dependencies
3. **Alphabetical fallback**: Otherwise, merge by task name (alphabetical)

### Procedure

```bash
# For each task in merge order:
for task in "${merge_order[@]}"; do
  worktree=".worktrees/task-${task}"
  branch="csp/task-${task}"

  # Get commits from the worktree branch that aren't on main
  commits=$(git log --reverse --format="%H" HEAD..${branch})

  # Cherry-pick each commit
  for commit in $commits; do
    if ! git cherry-pick "$commit"; then
      # Conflict detected — handle below
      handle_conflict "$task" "$commit"
      break
    fi
  done

  # Tag the merge point for easy identification
  git tag "csp/merged/${task}" HEAD
done
```

### Post-Merge Verification

After all cherry-picks succeed:

```bash
# Run project verification (tests, lint, build)
npm test        # or project-specific verify command
npm run lint
npm run build   # if applicable
```

If verification fails, initiate rollback (see below).

## Conflict Detection and Reporting

### Types of Conflicts

| Type | Cause | Severity |
|------|-------|----------|
| Content conflict | Two tasks modified the same lines | High |
| Add/add conflict | Both tasks created the same new file | Medium |
| Delete/modify conflict | One task deleted a file another modified | High |
| Rename conflict | Tasks renamed the same file differently | Medium |

### Conflict Report Format

When a conflict is detected, generate a structured report:

```markdown
## ⚠️ Merge Conflict Detected

**Task**: backend
**Commit**: abc1234 ("feat(api): add user endpoint")
**Conflicting files**:

| File | Conflict Type | Task A Change | Task B Change |
|------|--------------|---------------|---------------|
| src/types/user.ts | Content | Added `email` field | Added `phone` field |
| src/api/routes.ts | Add/add | Created with user routes | Created with auth routes |

**Suggested resolution**:
1. Manual merge — open files and resolve conflicts
2. Accept task 'frontend' version
3. Accept task 'backend' version
4. Skip this task's changes
5. Abort all merges and return to pre-merge state
```

## User Decision Interaction

### Interactive Resolution

When conflicts occur, pause and present options:

```
Conflict in task 'backend' (commit abc1234):
  src/types/user.ts — content conflict
  src/api/routes.ts — add/add conflict

Options:
  (m) Manual merge    — I'll resolve conflicts in the editor
  (a) Accept theirs   — use the worktree's version
  (o) Accept ours     — keep the current main branch version
  (s) Skip task       — skip this task's changes entirely
  (x) Abort all       — undo all merges, restore pre-merge state

Choice: _
```

### Manual Merge Flow

If user chooses manual merge:

1. Leave the cherry-pick in progress (conflict markers in files)
2. Open conflicting files in the user's editor
3. Wait for user to resolve and stage changes
4. Continue cherry-pick: `git cherry-pick --continue`
5. Resume remaining tasks

### Non-Interactive Mode

For CI/automated execution, conflicts cause immediate failure:

```json
{
  "on_conflict": "fail"
}
```

Other options: `"ask"` (default), `"skip"`, `"abort"`.

## Rollback Mechanism

### Full Rollback

If the user chooses to abort, or if post-merge verification fails:

```bash
# Find the pre-merge commit (tagged at merge start)
pre_merge_commit=$(git rev-parse csp/pre-merge)

# Reset main branch to pre-merge state
git reset --hard "$pre_merge_commit"

# Remove the pre-merge tag
git tag -d csp/pre-merge

# Clean up merge tags
git tag -l "csp/merged/*" | xargs -r git tag -d
```

### Partial Rollback (Single Task)

To undo a specific task's merge:

```bash
# Find the merge tag for the task
merge_tag="csp/merged/backend"

if git rev-parse "$merge_tag" >/dev/null 2>&1; then
  # Revert all commits between previous merge and this one
  prev_tag="csp/merged/frontend"  # or HEAD~N
  git revert --no-commit "${prev_tag}..${merge_tag}"
  git commit -m "revert: undo task 'backend' changes"
  git tag -d "$merge_tag"
fi
```

### State Recovery

After rollback, update `.csp/parallel-state.json`:

```json
{
  "merge_status": "rolled_back",
  "rollback_reason": "user_abort",
  "rolled_back_at": "2026-06-19T10:30:00Z",
  "worktrees_preserved": true
}
```

Setting `worktrees_preserved: true` prevents automatic cleanup so the user can inspect the worktrees.

## Cleanup Flow

### Successful Merge Cleanup

After successful merge and verification:

```bash
for task in "${all_tasks[@]}"; do
  worktree=".worktrees/task-${task}"
  branch="csp/task-${task}"

  # Remove worktree
  git worktree remove "$worktree" --force 2>/dev/null

  # Delete temporary branch
  git branch -D "$branch" 2>/dev/null

  # Remove merge tag
  git tag -d "csp/merged/${task}" 2>/dev/null
done

# Remove pre-merge tag
git tag -d csp/pre-merge 2>/dev/null

# Update state
# Set merge_status to "completed"
```

### Failed Merge Cleanup

If merge fails but user wants to retry:

```bash
# Keep worktrees intact
# Reset main branch to pre-merge state
git reset --hard csp/pre-merge

# Update state to allow retry
# Set merge_status to "retry_pending"
```

### Interrupted Execution Cleanup

If execution was interrupted (crash, kill):

```bash
# On next run, detect stale state
if [ -f .csp/parallel-state.json ]; then
  # Check each listed worktree
  for wt in $(jq -r '.parallel_groups[].worktrees[]' .csp/parallel-state.json); do
    if [ -d "$wt" ]; then
      echo "Found stale worktree: $wt"
      echo "  (1) Resume from this state"
      echo "  (2) Clean up and start fresh"
      echo "  (3) Inspect worktree contents"
    fi
  done
fi
```

## Safety Guarantees

1. **No data loss** — worktrees are never removed without checking for unmerged commits
2. **Atomic merge** — either all tasks in a group merge successfully, or none do (when using abort-on-conflict)
3. **Reversible** — pre-merge tag always exists until cleanup completes
4. **Idempotent** — re-running merge on already-merged tasks is a no-op (detected via merge tags)
5. **Auditable** — all merge operations are logged in `.csp/parallel-state.json`
