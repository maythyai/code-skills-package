# CSP — Code Skills Package v0.5.0

Unified AI coding skills from multiple open-source projects with auto-routing, lazy loading, and spec-driven workflows. MIT licensed.

## Architecture

```
L0  csp-router    — task classification + skill selection (always loaded, ~800 tokens)
L1  csp-meta      — methodology: brainstorming, TDD, debugging, spec-driven (~22 skills)
L2  csp-workflow  — project lifecycle: plan → execute → verify → ship (94 workflows)
L3  csp-patterns  — language/framework patterns, reviewers, build-resolvers (~100 skills + ~100 agents)
L4  csp-runtime   — autopilot, ralph, wiki, remember, self-improve (~37 skills)
```

## Docs

- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) — full architecture design
- [SKILL-INDEX.md](./docs/SKILL-INDEX.md) — complete skill index
- [USER-GUIDE.md](./docs/USER-GUIDE.md) — user guide

## License

MIT. See [LICENSE](./LICENSE).
