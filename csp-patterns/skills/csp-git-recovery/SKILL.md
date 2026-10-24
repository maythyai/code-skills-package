---
name: csp-git-recovery
description: "Diagnose and repair broken git repository state without losing work: orphaned worktree metadata, detached HEAD, HEAD/ref contradictions, missing or corrupt refs. Snapshot-first, non-destructive-first, every step gated by verification. Use when git status errors out or the repo is broken."
version: 0.1.0
layer: 3
category: patterns
phase: build
domain: devops
scope: implementation
tools: [Read, Write, Edit, Glob, Grep, Bash]
related_skills: [csp-using-git-worktrees, csp-systematic-debugging, csp-finishing-a-development-branch, csp-git-conventions, csp-parallel-worktree]
role: specialist
---

# Git Recovery

Repair a repository that git itself is complaining about, **without losing uncommitted or
unpushed work**. This skill is deliberately paranoid: `.git/` is production data, and most
"git is broken" incidents are made worse by the first command someone runs.

## When to Use

- `git status` prints a fatal error or refuses to run
- A branch cannot be checked out, deleted, or is reported as already checked out elsewhere
- `git worktree list` shows a missing path or an all-zero hash
- HEAD is detached unexpectedly, or `HEAD` and the branch ref disagree
- A ref is missing, corrupt, or points at a non-existent object
- After an interrupted rebase, merge, cherry-pick, or a crashed tool

## When NOT to Use

- Undoing a *commit* in a healthy repo → `git revert` / `git reset`, see `csp-git-conventions`
- Cleaning untracked build output → `git clean` after reading what it would remove
- Resolving merge conflicts in a working repo → resolve them; this skill is for broken metadata

---

## Core Rules

1. **Snapshot first, try nothing first.** The state you have now is recoverable. The state after
   three speculative commands usually is not.
2. **Non-destructive before force.** If a read-only command can answer the question, run that.
3. **Treat `.git/` as production data until it is backed up.** No `--force`, no `rm -rf`, no
   hand-editing before a tarball exists.
4. **`git symbolic-ref` before you ever touch `.git/HEAD`.** Hand-writing HEAD is the last resort,
   not the first idea.
5. **Every step passes a verification gate** before the next one runs. A gate that fails means
   stop and re-plan — not "run it again with --force".
6. **Destructive commands require the user's explicit confirmation.** Recommend, do not execute.

---

## Phase 1 — Snapshot

Capture the current state to a timestamped directory **before changing anything**. All commands
are read-only.

```bash
STAMP=$(date +%Y%m%d-%H%M%S)
DIR=".git-recovery/$STAMP"
mkdir -p "$DIR"

git status --porcelain=v2 --branch      > "$DIR/status.txt"        2>&1
git branch --show-current               > "$DIR/branch.txt"        2>&1
git symbolic-ref -q HEAD                > "$DIR/symbolic-ref.txt"  2>&1
git worktree list --porcelain           > "$DIR/worktrees.txt"     2>&1
git show-ref --head                     > "$DIR/show-ref.txt"      2>&1
git reflog --date=iso -n 50 HEAD        > "$DIR/reflog.txt"        2>&1
git fsck --full --no-reflogs            > "$DIR/fsck.txt"          2>&1
git remote -v                           > "$DIR/remotes.txt"       2>&1
git log --oneline -n 20 --all --graph   > "$DIR/log.txt"           2>&1
cp .git/HEAD "$DIR/HEAD.raw"                                       2>/dev/null
cp .git/packed-refs "$DIR/packed-refs.raw"                         2>/dev/null
```

Read the snapshot. The combination of `symbolic-ref.txt`, `worktrees.txt`, `reflog.txt` and
`fsck.txt` identifies the scenario in almost every case.

## Phase 2 — Symptom Map

| Symptom | Scenario | Go to |
|---|---|---|
| `'git status' failed` / worktree path missing / "is not a working tree" | Orphaned worktree metadata | §A |
| "already checked out at '/path/that/does/not/exist'" | Phantom branch lock | §B |
| `git branch --show-current` empty, prompt shows a hash | Detached HEAD | §C |
| `symbolic-ref HEAD` ≠ the branch you believe you are on | HEAD/ref contradiction | §D |
| `fatal: ambiguous argument` / `unknown revision` / ref missing | Missing or corrupt ref | §E |
| `git worktree list` shows `0000000000000000000000000000000000000000` | All-zero worktree hash | §F |
| `fsck` reports dangling objects but nothing is broken | Not a fault | Dangling objects are normal after rebase/reset. Do nothing |

## Phase 3 — Plan (Non-Destructive)

Write the plan out. **Present it to the user; do not execute the destructive parts.**

For each step state: the command, what it changes, whether it is reversible, and what could be
lost. Order the plan so that every reversible step precedes every irreversible one.

## Phase 4 — Minimal Playbook

Run the smallest thing that can work. Escalate only when the verification gate fails.

### §A — Orphaned worktree metadata

The worktree's directory is gone but `.git/worktrees/<name>/` still records it.

```bash
git worktree list --porcelain     # confirm the path really is missing
git worktree prune -v             # -v shows what it removes; dry-run first with -n
```

Reversible: re-adding the worktree recreates the metadata. Verify with
`git worktree list` — no missing paths.

### §B — Phantom branch lock

Git believes a branch is checked out in a worktree that no longer exists.

```bash
git worktree list --porcelain | grep -A3 "branch refs/heads/<name>"
```

- If the worktree **does** exist, the lock is correct: go into that worktree and switch away
  (`git switch --detach` or `git switch <other>`), then the branch frees up.
- If the worktree is **gone**, run §A first — pruning releases the lock.
- Do **not** delete `.git/worktrees/<name>/` by hand while `prune` can do it correctly.

### §C — Detached HEAD

Commits made here are reachable only through the reflog.

```bash
git reflog -n 20                                  # find where you came from
git switch <branch>                               # if the commits are already on a branch
# or, if there are commits that exist nowhere else:
git switch -c rescue/$(date +%Y%m%d-%H%M%S)       # keep them, then merge/cherry-pick later
```

Before switching away, check whether HEAD has commits no branch contains:

```bash
git log --oneline --branches --not HEAD           # what branches have that HEAD lacks
git log --oneline HEAD --not --branches           # what HEAD has that no branch does  ← rescue this
```

If the second command prints anything, create the rescue branch **first**.

### §D — HEAD / ref contradiction

```bash
git symbolic-ref -q HEAD                          # what HEAD claims
git show-ref --verify refs/heads/<branch>          # does that ref exist and resolve?
git rev-parse HEAD                                # does it resolve to an object?
```

Fix by re-pointing HEAD with the porcelain command:

```bash
git symbolic-ref HEAD refs/heads/<branch>
```

**Only if that fails**, and only after backing up:

```bash
tar -czf ".git-recovery/$STAMP/git-metadata-backup.tar.gz" .git
printf 'ref: refs/heads/%s\n' "<branch>" > .git/HEAD
```

Never `echo` a raw commit hash into `.git/HEAD` unless you intend a detached HEAD and know why.

### §E — Missing or corrupt ref

```bash
git fetch --all --prune                           # restore refs from remotes
git reflog --date=iso -n 50 <branch>              # does the local history still have it?
git fsck --full                                   # any dangling commit that is the lost tip?
```

- If the ref exists on a remote and there are **no** local-only commits:
  `git branch -f <branch> origin/<branch>` — after confirming with the reflog that nothing local
  would be discarded.
- If there **are** local-only commits: recover the hash from reflog or `fsck --lost-found`, then
  `git branch <branch> <hash>`. Never `-f` over a ref that holds unpushed work.
- If a packed ref is corrupt: the Phase-1 tarball plus `git fetch` from a remote rebuilds it.

### §F — All-zero worktree hash

An all-zero hash means "no commit" — which is legitimate for a freshly-created worktree on an
unborn branch. **Rule out the false positive before pruning.**

```bash
git -C <worktree-path> symbolic-ref -q HEAD       # unborn branch → HEAD is a ref, not a hash
git -C <worktree-path> status --porcelain=v2 --branch
```

- Unborn branch with no work to lose → `git worktree prune -v` or remove intentionally.
- Real corruption → rebuild from the remote: re-clone into a new directory, then copy over any
  uncommitted files from the broken worktree.

## Phase 5 — Verification Gate

Run after **every** repair step. All must pass.

```bash
git status                                        # no fatal, no error output
git symbolic-ref -q HEAD                          # equals the expected refs/heads/<branch>
git worktree list                                 # no missing paths, no unexpected zero hashes
git fsck --full                                   # no new critical errors vs. the Phase-1 snapshot
git rev-parse HEAD && git log --oneline -n 3      # smoke test: resolves and prints
git branch -vv                                    # upstreams intact
```

Diff `fsck` output against the Phase-1 snapshot. Pre-existing dangling objects are not new
problems; **new** `missing blob`/`broken link` entries are — stop and escalate.

## Phase 6 — Hard Stop / Escalate

Escalate when any of these hold:

- Refs are broadly corrupt (`fsck` reports many missing objects)
- There may be unpushed commits you cannot account for
- The repair would require deleting worktrees or hand-editing HEAD
- Two repair attempts have failed

Escalation procedure:

1. **Back up `.git` in full**:
   `tar -czf git-metadata-backup-$(date +%Y%m%d-%H%M%S).tar.gz .git`
2. **Fresh clone** into a sibling directory from the remote.
3. **Rescue unpushed work** from the old repo: `git -C <old> reflog` to find the commits, then
   `git -C <new> fetch <old-path> <branch>` and cherry-pick, or copy uncommitted files across.
4. **Record the failure mode** — the symptom, the commands run, what worked. A repo that broke once
   usually broke from a specific tool or workflow, and it will break again.

A fresh clone plus a targeted rescue beats an hour of metadata surgery. The tarball means the old
state is never lost, so escalation is always safe.

## Stop-and-Back-Up Triggers

Do not run any destructive command until these are satisfied:

| Trigger | Required action |
|---|---|
| Refs broadly corrupt | Full `.git` tarball first |
| Possible unpushed commits | `git log --branches --not --remotes` to enumerate them; rescue before anything else |
| Deleting worktrees | Tarball first |
| Hand-editing `.git/HEAD` or `packed-refs` | Tarball first |
| Any `--force`, `reset --hard`, `clean -fd`, `branch -D` | **Explicit user confirmation**, in this session |
| A shared or protected branch is involved | Stop. Confirm with the user; a force-push here is not a local action |

## Prohibited

- Running speculative repair commands before the Phase-1 snapshot
- `--force` of any kind before a backup exists
- Editing `.git/HEAD` by hand when `git symbolic-ref` would do it
- Continuing past a failed verification gate
- `git branch -f` over a ref that holds unpushed commits
- Deleting `.git/worktrees/<name>/` manually while `git worktree prune` can do it
- Assuming an all-zero hash is corruption without checking for an unborn branch
- Cleaning up "weird files" in `.git/` — they are usually load-bearing

## Key Principles

- **The current state is the most recoverable state you will ever have** — snapshot before touching it.
- **Porcelain commands over plumbing files.** `symbolic-ref`, `worktree prune`, `branch -f` know
  the invariants; `echo > .git/HEAD` does not.
- **Dangling objects are not damage.** `fsck` noise after a rebase is normal. Compare against the
  baseline snapshot instead of reacting to absolute output.
- **Unpushed commits are the only truly irreplaceable thing.** Everything else exists on a remote.
  Enumerate them first and protect them explicitly.
- **Escalation is a success path**, not a failure — a fresh clone with a rescued reflog is a clean
  outcome, provided the tarball was made.
