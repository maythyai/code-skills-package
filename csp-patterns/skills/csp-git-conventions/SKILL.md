---
name: csp-git-conventions
description: >
  Git workflow conventions agent. Enforces conventional commits, branch naming
  strategies, commit message quality, and PR hygiene. Use for commit messages,
  branch naming, and git workflow questions.
metadata:
  origin: CSP
  source: awesome-copilot/skills/conventional-*,git-commit
  globs: ["**/.git/**", "**/.github/**"]
---

# Git Conventions

Unified reference for conventional commits, branch naming, and commit hygiene.
Apply these rules whenever the user asks to commit, name a branch, or write a PR.

## 1. Conventional Commits

Format: `<type>(<optional scope>): <imperative description>`

### Types

| Type       | Use for                                       |
|------------|-----------------------------------------------|
| `feat`     | New user-facing capability                    |
| `fix`      | Bug correction                                |
| `docs`     | Prose / markdown only                         |
| `style`    | Formatting, no logic change                   |
| `refactor` | Restructure, no behavior change               |
| `perf`     | Measurable speed / memory improvement         |
| `test`     | Add or adjust tests only                      |
| `build`    | Build system, deps, toolchain                 |
| `ci`       | CI/workflow config                            |
| `chore`    | Maintenance, deps bumps, metadata             |
| `revert`   | Undo a previous commit                        |

### Writing rules

- Imperative mood, lowercase: `add login page`, not `Added Login Page`.
- Description under 72 chars; no trailing period.
- Scope = module/package (optional but recommended).
- Breaking change: append `!` after type/scope **or** add `BREAKING CHANGE:` footer.
  - `feat(api)!: remove deprecated /v1 endpoints`
- Reference issues in footer: `Closes #123`, `Refs #456`.
- One logical change per commit; do not bundle unrelated work.

### Body / footer example

```
feat(auth): add OAuth2 PKCE flow

Implement authorization-code-with-PKCE for public clients. Refresh
tokens rotate on use to reduce replay risk.

Closes #412
BREAKING CHANGE: legacy password grant is disabled by default.
```

## 2. Conventional Branch Naming

Format: `<type>/<description>` (kebab-case, lowercase only).

| Prefix      | Alias     | When to use                       |
|-------------|-----------|-----------------------------------|
| `feature/`  | `feat/`   | New feature or enhancement        |
| `bugfix/`   | `fix/`    | Non-urgent bug fix                |
| `hotfix/`   | —         | Urgent production fix             |
| `release/`  | —         | Release prep (dots allowed: `release/v1.2.0`) |
| `chore/`    | —         | Docs, deps, config                |

Trunk branches (`main`, `master`, `develop`) have no prefix — never recreate them.

### Validation rules

- Lowercase alphanumerics, hyphens, dots (dots only inside `release/`).
- No underscores, spaces, leading/trailing hyphens, or consecutive `--` / `..`.
- Include ticket number when known: `feature/issue-123-add-oauth`.
- Keep total length under ~50 chars; 2–5 descriptive words.

### Create-and-checkout recipe

```bash
base=$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's|^origin/||')
[ -z "$base" ] && for b in develop main master; do git show-ref --verify --quiet "refs/heads/$b" && base=$b && break; done
git checkout "$base" && git pull origin "$base"
git checkout -b "<type>/<description>"
```

## 3. Commit Workflow

1. `git status --porcelain` + `git diff [--staged]` — understand the change.
2. Stage logical groups with `git add <path>` (avoid `git add -A` near secrets).
3. Derive type + scope from the diff; never guess.
4. **Never commit** `.env`, credentials, private keys, or build artifacts.
5. Prefer `git commit` (opens editor for multi-line) over `-m` for non-trivial changes.

## 4. Safety Protocol

- Never update git config unless the user explicitly asks.
- Never `--force`, `--hard`, `checkout .`, or `clean -f` on main/master.
- Never `--no-verify` or `--no-gpg-sign` unless requested.
- If a pre-commit hook fails, fix the root cause and create a **new** commit — do not amend.
- Never force-push to `main` / `master` / protected branches.

## 5. PR Hygiene Checklist

- Title follows conventional commit format (`feat(scope): summary`).
- Body describes *why*, not just *what*.
- Linked issue(s) via `Closes #N` in the body.
- Squash trivial fixup commits before requesting review.
- Ensure CI is green and no unresolved review threads.
- Branch name aligns with the primary commit type.

## Quick Decision Tree

```
Is it a new capability?         → feat
Is behavior wrong?              → fix
Only prose changed?             → docs
Code same, layout different?    → style
Same behavior, different shape? → refactor
Measurably faster?             → perf
Only tests changed?             → test
Build/deps/CI changed?          → build | ci
Otherwise housekeeping?         → chore
```
