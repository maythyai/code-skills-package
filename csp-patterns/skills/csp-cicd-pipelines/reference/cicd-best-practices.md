# CI/CD Best Practices — Dockerfiles, Dependabot, and Actions Efficiency

Companion reference to the main `csp-cicd-pipelines` skill. Covers three
adjacent concerns that ship alongside every pipeline: image hygiene, dependency
update automation, and cost/latency waste in GitHub Actions.

---

## 1. Multi-Stage Dockerfiles

### Structure rules

- Separate **builder** (compile, install, test) from **runtime** (only what the app needs).
- Name stages with `AS`: `FROM node:22-alpine AS builder`.
- Order: dependencies → build → test → runtime.
- Copy only required artifacts into the runtime stage.

### Base image hygiene

- Pin exact versions (`python:3.12-slim`, not `python`).
- Prefer distroless or Alpine for runtime when compatible.
- Avoid `:latest` — it breaks reproducibility.

### Layer caching

- Put rarely-changing layers first (OS packages, language toolchain).
- Put frequently-changing layers last (app source).
- Combine related `RUN` commands with `&&` to reduce layer count.
- Use `.dockerignore` to exclude `node_modules`, `.git`, tests, docs.
- Use `COPY --chown` to set permissions in one step.

### Example: Node.js service

```dockerfile
# --- builder -------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --production=false
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# --- runtime -------------------------------------------------
FROM node:22-alpine AS runtime
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --production && npm cache clean --force
COPY --from=builder --chown=app:app /app/dist ./dist
USER app
ENV NODE_ENV=production
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "dist/main.js"]
```

### Security

- Never run as root — always `USER <nonroot>`.
- Strip build tools from runtime (multi-stage already does this).
- Set restrictive permissions (`chmod 600` on config files).
- Scan final image: `docker scout cves <image>` or Trivy.
- Use `--mount=type=secret` for build-time secrets — never `ARG`.

---

## 2. Dependabot Configuration

Single file: `.github/dependabot.yml` on the default branch. Multiple files
per repo are not supported.

### Minimal effective config

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule: { interval: "weekly" }
    groups:
      production:
        dependency-type: "production"
        update-types: ["minor", "patch"]
      development:
        dependency-type: "development"
        update-types: ["minor", "patch"]

  - package-ecosystem: "github-actions"
    directory: "/"
    schedule: { interval: "weekly" }

  - package-ecosystem: "docker"
    directory: "/"
    schedule: { interval: "monthly" }
```

### Ecosystem mapping (common ones)

| Manifest                       | `package-ecosystem` |
|--------------------------------|---------------------|
| `package.json`, `pnpm-lock`    | `npm`               |
| `requirements.txt`, `pyproject`| `pip`               |
| `uv.lock`                      | `uv`                |
| `go.mod`                       | `gomod`             |
| `Cargo.toml`                   | `cargo`             |
| `Gemfile`                      | `bundler`           |
| `pom.xml`, `build.gradle`      | `maven` / `gradle`  |
| `.github/workflows/*.yml`      | `github-actions`    |
| `Dockerfile`                   | `docker`            |

### Monorepo patterns

Use `directories` (plural) with globs — `directory` (singular) does not expand wildcards:

```yaml
- package-ecosystem: "npm"
  directories:
    - "/"
    - "/apps/*"
    - "/packages/*"
  schedule: { interval: "weekly" }
  groups:
    monorepo-deps:
      group-by: dependency-name    # one PR per dep across all dirs
```

### PR hygiene

- `commit-message.prefix: "deps"` → aligns with conventional commits.
- `open-pull-requests-limit: 10` → prevent PR flood.
- `cooldown.default-days: 5` → avoid early-adopter breakage.
- `target-branch: "develop"` → route version updates to a dev branch.
- `labels: ["dependencies"]` → filter in dashboards; `labels: []` to disable.

### Ignore + allow

```yaml
ignore:
  - dependency-name: "lodash"
  - dependency-name: "express"
    versions: ["5.x"]
allow:
  - dependency-type: "production"
```

If a dep matches both `allow` and `ignore`, it is **ignored**.

### Active PR commands (Jan 2026+)

`merge`, `close`, `reopen` commands are deprecated. Use the GitHub UI, `gh pr merge`, or auto-merge.

- `@dependabot rebase`
- `@dependabot ignore this major version`
- `@dependabot ignore DEPENDENCY_NAME` (grouped PRs)
- `@dependabot unignore *` (clear all ignores)

---

## 3. GitHub Actions Efficiency Audit

Lean workflow for cutting CI minutes without sacrificing safety.

### Step 1 — Measure

```bash
rg -n "on:|concurrency:|paths:|strategy:|matrix:|cache:" .github/workflows
gh run list --limit 10
run_id=$(gh run list --limit 1 --json databaseId --jq '.[0].databaseId')
gh run view "$run_id" --log-failed
```

Look for:

- Missing dependency caches.
- Missing `concurrency` cancellation.
- Over-broad triggers (`on: push` without branch/path filter).
- Duplicate workflow coverage (same tests running in multiple files).
- Expensive jobs running on every change regardless of scope.

### Step 2 — Guardrails

Before recommending any fix, check:

1. Does not remove required validation (release, schema, migration, shared-lib checks).
2. Does not reduce parallelism without justification (only if user prioritizes cost and critical path stays within 1.25× original).
3. Preserves documented matrix legs only — drop legs with no explicit version/platform commitment.
4. Write-back / formatter jobs use opt-in triggers (flag, don't drop).
5. Repo-level YAML fixes stay separate from org/account-level settings.

### Step 3 — Top-3 fixes, ranked by daily CI minutes saved

From these six candidates, keep only those supported by audit evidence and passing guardrails. Select up to 3.

1. Add dependency caching with lockfile-based keys.
2. Add or correct `concurrency` cancellation.
3. Remove duplicate workflow coverage *before* merging jobs.
4. Narrow workflow / job triggers safely (`paths`, `paths-ignore`, branch filters).
5. Reduce matrix breadth to match risk and event type.
6. Parallelize independent jobs on the critical path.

### Step 4 — Verify

- If `gh` CLI is available: validate path-gating and concurrency with a live test push on a non-protected branch.
- If not: state explicitly that the audit is static only.
- Treat unexpected live behavior as a real bug even when the YAML looks correct.

### Concurrency pattern

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}
```

Never `cancel-in-progress` on `main` — it aborts merges mid-flight.

### Path filter pattern (monorepo)

```yaml
on:
  pull_request:
    paths:
      - "packages/api/**"
      - ".github/workflows/api.yml"
```

For multi-package detection, use `dorny/paths-filter@v3` to output per-package booleans and gate jobs with `if: needs.changes.outputs.api == 'true'`.

### Matrix reduction

```yaml
strategy:
  fail-fast: false
  matrix:
    os: [ubuntu-latest]          # start single-OS; add mac/win for release branches
    node: ["20", "22"]           # drop "24" until LTS
    exclude:
      - os: windows-latest
        node: "20"
```

### Required output

Every audit should end with four sections:

1. **Waste sources** — top cost or latency drivers found.
2. **Proposed fixes** — up to 3, with audit evidence.
3. **Validation** — what was proven live, what was static-only, remaining risk.
4. **Impact** — expected savings vs measured savings; separate PR wall-clock from total runner time.

---

## 4. Cross-Cutting Checklist

Before shipping any pipeline change:

- [ ] Dockerfiles use multi-stage, non-root runtime, pinned base images.
- [ ] `.github/dependabot.yml` covers every active ecosystem and directory.
- [ ] Concurrency groups cancel in-progress on feature branches.
- [ ] Dependency caches use lockfile hashes as keys.
- [ ] Path filters gate monorepo jobs.
- [ ] Actions pinned to SHA or major tag (never `:latest`).
- [ ] Environment protection rules on production deploys.
- [ ] Secrets via GitHub Secrets or OIDC — nothing hardcoded.
- [ ] Artifact retention set (`retention-days: 7` is a sane default).
- [ ] Required status checks on protected branches match the required-checks workflow.
