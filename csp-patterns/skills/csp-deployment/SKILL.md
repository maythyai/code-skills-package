---
name: csp-deployment
description: >
  Deployment workflows, CI/CD quality gates, Docker containerization, health checks,
  rollback strategies, feature flags, and production readiness checklists.
  Combines deployment patterns with CI/CD automation and shift-left quality strategy.
  Use when setting up deployment infrastructure, configuring CI pipelines, or planning releases.
csp-layer: 4-patterns
csp-source: merged(CSP+agent-skills)
---

# Deployment & CI/CD

Production deployment workflows, CI/CD quality gate automation, and infrastructure best practices.

**Shift Left:** Catch problems as early in the pipeline as possible. A bug caught in linting costs minutes; the same bug caught in production costs hours.

**Faster is Safer:** Smaller batches and more frequent releases reduce risk. A deployment with 3 changes is easier to debug than one with 30.

## When to Use

- Setting up CI/CD pipelines or deployment infrastructure
- Dockerizing an application
- Planning deployment strategy (blue-green, canary, rolling)
- Implementing health checks and readiness probes
- Preparing for a production release
- Debugging CI failures
- Adding or modifying automated quality checks

## The Quality Gate Pipeline

Every change goes through these gates before merge. **No gate can be skipped.**

```
Pull Request Opened
    │
    ▼
┌─────────────────┐
│   LINT CHECK     │  eslint, prettier, ruff
│   ↓ pass         │
│   TYPE CHECK     │  tsc --noEmit, pyright
│   ↓ pass         │
│   UNIT TESTS     │  jest/vitest, pytest
│   ↓ pass         │
│   BUILD          │  npm run build, cargo build
│   ↓ pass         │
│   INTEGRATION    │  API/DB tests
│   ↓ pass         │
│   E2E (optional) │  Playwright/Cypress
│   ↓ pass         │
│   SECURITY AUDIT │  npm audit, pip-audit
│   ↓ pass         │
│   BUNDLE SIZE    │  bundlesize check
└─────────────────┘
    │
    ▼
  Ready for review
```

## GitHub Actions Configuration

### Standard CI Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit
      - run: npm test -- --coverage
      - run: npm run build
      - run: npm audit --audit-level=high
```

### Parallel Jobs (for speed)

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci && npm run lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci && npx tsc --noEmit

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci && npm test -- --coverage
```

### With Database Integration Tests

```yaml
  integration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: testdb
          POSTGRES_USER: ci_user
          POSTGRES_PASSWORD: ${{ secrets.CI_DB_PASSWORD }}
        ports: ["5432:5432"]
        options: >-
          --health-cmd pg_isready
          --health-interval 10s --health-timeout 5s --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      - run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://ci_user:${{ secrets.CI_DB_PASSWORD }}@localhost:5432/testdb
      - run: npm run test:integration
```

## CI Failure Feedback Loop

```
CI fails → Copy failure output → Feed to agent:
"The CI pipeline failed with this error: [paste]
Fix the issue and verify locally before pushing again."
→ Agent fixes → pushes → CI runs again
```

**Key patterns:**
- Lint failure → `npm run lint --fix` and commit
- Type error → Read error location, fix the type
- Test failure → Follow systematic-debugging skill
- Build error → Check config and dependencies

## Deployment Strategies

### Rolling Deployment (Default)
Replace instances gradually. Old and new versions run simultaneously during rollout.
**Use when:** Standard deployments, backward-compatible changes.

### Blue-Green Deployment
Run two identical environments. Switch traffic atomically.
**Use when:** Critical services, zero-tolerance for issues.

### Canary Deployment
Route a small percentage of traffic to the new version first (5% → 50% → 100%).
**Use when:** High-traffic services, risky changes, feature flags.

### Feature Flags

```typescript
if (featureFlags.isEnabled('new-checkout-flow', { userId })) {
  return renderNewCheckout();
}
return renderLegacyCheckout();
```

Flag lifecycle: Create → Enable for testing → Canary → Full rollout → Remove the flag and dead code. Flags that live forever become technical debt.

## Docker

### Multi-Stage Dockerfile (Node.js)

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --production=false

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build && npm prune --production

FROM node:22-alpine AS runner
WORKDIR /app
RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001
USER appuser
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/package.json ./
ENV NODE_ENV=production
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1
CMD ["node", "dist/server.js"]
```

### Docker Best Practices
- Use specific version tags (`node:22-alpine`, not `node:latest`)
- Multi-stage builds to minimize image size
- Run as non-root user
- Copy dependency files first (layer caching)
- Use `.dockerignore` to exclude `node_modules`, `.git`, tests
- Add `HEALTHCHECK` instruction
- Set resource limits

## Health Checks

```typescript
app.get("/health", async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
  };
  const allHealthy = Object.values(checks).every(c => c.status === "ok");
  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    checks,
  });
});
```

### Kubernetes Probes

```yaml
livenessProbe:
  httpGet: { path: /health, port: 3000 }
  initialDelaySeconds: 10
  periodSeconds: 30
readinessProbe:
  httpGet: { path: /health, port: 3000 }
  initialDelaySeconds: 5
  periodSeconds: 10
```

## Environment Management

```
.env.example       → Committed (template)
.env                → NOT committed (local)
.env.test           → Committed (test, no real secrets)
CI secrets          → GitHub Secrets / vault
Production secrets  → Deployment platform / vault
```

CI should never have production secrets.

## Rollback Strategy

```bash
kubectl rollout undo deployment/app     # K8s
vercel rollback                          # Vercel
railway up --commit <previous-sha>       # Railway
```

### Rollback Checklist
- [ ] Previous image/artifact is available and tagged
- [ ] Database migrations are backward-compatible
- [ ] Feature flags can disable new features without deploy
- [ ] Monitoring alerts configured for error rate spikes
- [ ] Rollback tested in staging

## CI Optimization (when pipeline > 10 min)

1. Cache dependencies (`actions/cache` or `setup-node` cache)
2. Run jobs in parallel (split lint, typecheck, test, build)
3. Only run what changed (path filters for docs-only PRs)
4. Matrix builds (shard test suites)
5. Optimize test suite (slow tests on schedule, not critical path)

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "CI is too slow" | Optimize the pipeline, don't skip it. |
| "This change is trivial, skip CI" | Trivial changes break builds. CI is fast for trivial changes. |
| "The test is flaky, just re-run" | Flaky tests mask real bugs. Fix the flakiness. |
| "We'll add CI later" | Projects without CI accumulate broken states. Set it up on day one. |

## Red Flags

- No CI pipeline in the project
- CI failures ignored or silenced
- Tests disabled in CI to make the pipeline pass
- Production deploys without staging verification
- No rollback mechanism
- Secrets stored in code or CI config files

## Verification

- [ ] All quality gates present (lint, types, tests, build, audit)
- [ ] Pipeline runs on every PR and push to main
- [ ] Failures block merge (branch protection configured)
- [ ] Secrets stored in secrets manager, not in code
- [ ] Deployment has a rollback mechanism
- [ ] Pipeline runs in under 10 minutes
