---
name: csp-deployment
description: >
  Deployment workflows, CI/CD quality gates, Docker containerization, health checks,
  rollback strategies, feature flags, and production readiness checklists.
  Combines deployment patterns with CI/CD automation and shift-left quality strategy.
  Use when setting up deployment infrastructure, configuring CI pipelines, or planning releases.
layer: 4
origin: merged(CSP+agent-skills)
category: patterns
---

| Rationalization | Counter |
|-----------------|---------|
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
