# CSP — Code Skills Package v0.5.0

Unified AI coding skills from multiple open-source projects with auto-routing, lazy loading, and spec-driven workflows. MIT licensed.

## Install

```bash
./install.sh                        # auto-detect platform
./install.sh --platform claude-code # specify platform
./install.sh --platform cursor
./install.sh --platform copilot-cli
./install.sh --platform hermes-agent
./install.sh --platform windsurf
./install.sh --platform kiro
./install.sh --platform gemini-cli
./install.sh --platform codex
./install.sh --platform aider
./install.sh --platform trae
./install.sh --platform vscode
./install.sh --platform deerflow
./install.sh --platform opencode
./install.sh --platform openclaw
./install.sh --platform qwen-code
./install.sh --platform antigravity
./install.sh --platform claw-code
./install.sh --platform qoder
./install.sh --platform <name> --global  # global install
./install.sh --stacks python,typescript  # stack-filtered install
./install.sh --layers router,meta        # layer-selective install
./install.sh --minimal                   # router + meta only (<20%)
./install.sh --dry-run                   # preview without changes
./install.sh --uninstall
./install.sh --list                 # list detected platforms
```

## Usage

**Slash commands** — `/csp-plan` `/csp-debug` `/csp-review` `/csp-test` `/csp-ship` `/csp-spec-phase` `/csp-execute-phase` `/csp-verify` `/csp-search <query>`

**Direct invoke** — `Load csp-react-reviewer for this code`

## Architecture

```
L0  csp-router    — task classification + skill selection (always loaded, ~800 tokens)
L1  csp-meta      — methodology: brainstorming, TDD, debugging, spec-driven (~22 skills)
L2  csp-workflow  — project lifecycle: plan → execute → verify → ship (94 workflows)
L3  csp-patterns  — language/framework patterns, reviewers, build-resolvers (~100 skills + ~100 agents)
L4  csp-runtime   — autopilot, ralph, wiki, remember, self-improve (~37 skills)
```

## Docs

- [ARCHITECTURE.md](./ARCHITECTURE.md) — full architecture design
- [SKILL-INDEX.md](./SKILL-INDEX.md) — complete skill index
- [MIGRATION.md](./MIGRATION.md) — source-to-CSP mapping

## License

MIT. See [LICENSE](./LICENSE).
