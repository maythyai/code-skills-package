# CSP — Code Skills Package v0.7.1

Unified AI coding skills from multiple open-source projects with auto-routing, lazy loading, and spec-driven workflows. MIT licensed.

## Architecture

```
L0  csp-router    — task classification + skill selection (always loaded, ~800 tokens)
L1  csp-meta      — methodology: brainstorming, TDD, debugging, spec-driven (~24 skills)
L2  csp-workflow  — project lifecycle: plan → execute → verify → ship (~153 skills)
L3  csp-patterns  — language/framework patterns, reviewers, build-resolvers (~340 skills)
L4  csp-runtime   — autopilot, ralph, wiki, remember, self-improve (~55 skills)
Total: 584 skills across 5 layers
```

## Docs

- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) — full architecture design
- [SKILL-INDEX.md](./docs/SKILL-INDEX.md) — complete skill index
- [USER-GUIDE.md](./docs/USER-GUIDE.md) — user guide
- [INSTALL.md](./docs/INSTALL.md) — installation guide
- [UPDATE.md](./docs/UPDATE.md) — update guide
- [VERSIONING.md](./docs/VERSIONING.md) — version management (X=arch, Y=feature, Z=fix)

