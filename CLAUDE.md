# CSP — Code Skills Package

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
./install.sh --uninstall
./install.sh --list                 # list detected platforms
```

## Usage

**Natural language** (recommended) — Add to your project `CLAUDE.md`:

```markdown
Use CSP (Code Skills Package). Route tasks through csp-router.
```

Then just describe tasks: "review this code", "plan and build auth", "fix this Django bug".

**Slash commands** — `/csp-plan` `/csp-debug` `/csp-review` `/csp-test` `/csp-ship` `/csp-spec-phase` `/csp-execute-phase` `/csp-verify` `/csp-search <query>`

**Direct invoke** — `Load csp-react-reviewer for this code`

## Architecture

```
L0  csp-router    — task classification + skill selection (always loaded, ~800 tokens)
L1  csp-meta      — methodology: brainstorming, TDD, debugging, spec-driven (~22 skills)
L2  csp-workflow  — project lifecycle: plan → execute → verify → ship (94 workflows)
L3  csp-patterns  — language/framework patterns, reviewers, build-resolvers (~90 skills + ~86 agents)
L4  csp-runtime   — autopilot, ralph, wiki, remember, self-improve (~37 skills)
```

**Key features:** auto-routing · lazy loading (~500-1500 tokens/task vs 12K full) · spec-driven · 15+ language stacks · AI/LLM · DevOps · mobile

## Common Flows

| Scenario | Skills chain |
|----------|-------------|
| Clarify requirements | `csp-interview-me` → `csp-brainstorming` → `csp-spec-driven-development` |
| New feature | `csp-spec-phase` → `csp-discuss-phase` → `csp-plan-phase` → `csp-execute-phase` → `csp-tdd` → `csp-code-review` → `csp-verification` → `csp-ship` |
| **Full lifecycle** (idea → product) | `csp-full` — 自动编排需求→PRD→设计→开发→测试→审查→发布→运维 |
| Bug fix | `csp-debug` → `csp-implement` → `csp-tdd` → `csp-verification` |
| Code review | `csp-code-review` + language-specific reviewer |
| Onboard project | `csp-explore` → `csp-map-codebase` → `csp-understand-architecture` |
| AI/LLM app | `csp-rag-architecture` + `csp-llm-app-development` + `csp-prompt-engineering` |
| DevOps setup | `csp-cicd-pipelines` + `csp-kubernetes-patterns` + `csp-infrastructure-as-code` |
| Legacy modernization | `csp-tech-debt-assessment` → `csp-refactoring-strategies` → `csp-legacy-modernization` |
| Mobile dev | `csp-react-native-patterns` + `csp-mobile-performance` + `csp-cross-platform-strategy` |

## Custom Recipes

Create `.csp/recipes.yaml` in your project root:

```yaml
recipes:
  rapid-prototype:
    triggers: ["prototype", "demo"]
    sequence:
      - skill: csp-implement
      - skill: csp-verification
        mode: basic-check
```

Priority: user recipes > built-in recipes > router dynamic combinations.

## Docs

- [ARCHITECTURE.md](./ARCHITECTURE.md) — full architecture design
- [SKILL-INDEX.md](./SKILL-INDEX.md) — complete skill index
- [MIGRATION.md](./MIGRATION.md) — source-to-CSP mapping

## License

MIT. See [LICENSE](./LICENSE).
