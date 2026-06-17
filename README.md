# CSP — Code Skills Package

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![v0.5.0](https://img.shields.io/badge/version-0.5.0-green)](./ARCHITECTURE.md)

**Unified AI Programming Skills · 18 Platforms · 15+ Languages**

Integrates capabilities from multiple open-source AI coding projects into a layered, auto-routing framework.

[Quick Start](#quick-start) · [Architecture](#architecture) · [Usage](#usage) · [中文文档](./README_zh.md)

</div>

---

CSP (Code Skills Package) consolidates the capabilities of multiple open-source AI programming projects into a layered architecture with automatic skill routing, on-demand loading, and spec-driven workflows. Instead of loading all skills upfront, CSP loads only what each task requires, keeping token usage between ~500–1,500 per task.

## Quick Start

### Installation

```bash
# Auto-detect AI tool and install
./install.sh

# Install for a specific platform (18 supported)
./install.sh --platform claude-code
./install.sh --platform cursor
./install.sh --platform tra

# Install into any target directory (no need to clone this project here)
./install.sh --platform cursor --target /path/to/your/project

# Remote one-line install (no clone required)
curl -fsSL https://raw.githubusercontent.com/chensaics/code-skills-package/master/install.sh | bash -s -- --platform cursor

# Remote install to a specific target directory
curl -fsSL https://raw.githubusercontent.com/chensaics/code-skills-package/master/install.sh | bash -s -- --platform cursor --target /path/to/your/project

# npm global install
npm install -g code-skills-package
cd /your/project && csp-install --platform cursor

# Global install
./install.sh --platform trae --global

# Uninstall
./install.sh --uninstall

# List detected platforms
./install.sh --list
```

**Full command reference:** [docs/INSTALL.md](./docs/INSTALL.md) | [Update Guide](./docs/UPDATE.md)

## Usage

### Natural Language (Recommended)

Add to your project `CLAUDE.md`:

```markdown
Use CSP (Code Skills Package) skills. When given a task, route to the appropriate skill combination via csp-router.
```

| Input | Result |
|-------|--------|
| `"Do a code review"` | Loads `csp-code-review` + language-specific reviewer |
| `"Plan and implement user auth"` | brainstorming → spec → plan → execute → tdd → review → verify → ship |
| `"Build me a complete habit tracking app"` | csp-full: intake → PRD → design → dev → test → review → ship → ops |
| `"There's a bug in this Django project"` | Loads `csp-debug` + `csp-django-patterns` |

### Slash Commands

```bash
/csp-plan          # Planning phase
/csp-debug         # Debugging flow
/csp-review        # Code review
/csp-test          # Testing flow
/csp-ship          # Release flow
/csp-spec-phase    # Requirements clarification
/csp-execute-phase # Execute plan
/csp-verify        # Verify implementation
/csp-search <query> # Search skill index
```

### Direct Invocation

```markdown
Load csp-react-reviewer to review this code
Load csp-plan-phase to plan this feature
```

## Architecture

CSP uses a 5-layer architecture. Only the router (L0) loads at session start; remaining layers load on demand.

```
┌─────────────────────────────────────────────────────────┐
│  L0  csp-router     Session-start (~800 tokens)          │
│                   Task classification + skill selection  │
├─────────────────────────────────────────────────────────┤
│  L1  csp-meta       Methodology (~300 tokens/skill)      │
│     Planning · Debugging · TDD · Brainstorming           │
├─────────────────────────────────────────────────────────┤
│  L2  csp-workflow   Project management (~500 tokens/skill)│
│     plan → execute → verify → ship                      │
├─────────────────────────────────────────────────────────┤
│  L3  csp-patterns   Language/framework (~200-600 tokens)  │
│     15+ reviewers · build resolvers · patterns           │
├─────────────────────────────────────────────────────────┤
│  L4  csp-runtime    Runtime (~300 tokens/skill)          │
│     autopilot · knowledge management · self-improvement  │
└─────────────────────────────────────────────────────────┘
```

### Loading Strategy

| Layer | Trigger | Token Cost | Frequency |
|-------|---------|-----------|-----------|
| L0 router | Session start | ~800 | 100% |
| L1 meta | Methodology needed | ~300/skill | High |
| L2 workflow | Project management triggered | ~500/skill | High |
| L3 patterns | Tech stack detected | ~200-600/skill | Medium |
| L4 runtime | Runtime features requested | ~300/skill | Low |

### How It Works

1. **csp-router** classifies your task by matching trigger words and detecting project files
2. Matching skills are selected from L1–L4 based on task type and tech stack
3. Only the required skill files are loaded into context
4. Skills execute in sequence, producing structured outputs (REVIEW.md, PLAN.md, etc.)

## Common Workflows

### Full Lifecycle (Idea → Product)

```
"Build me a complete habit tracking app"
  → csp-full: intake → PRD → design → parallel dev → test → review → ship → ops
```

### Feature Development

```
"Build user authentication"
  → brainstorming → spec → plan → execute → tdd → review → verify → ship
```

### Bug Fix

```
"There's a bug in this Django project"
  → csp-debug + csp-django-patterns → fix → tdd → verify
```

### Code Review

```
"Do a code review"
  → csp-code-review + language reviewer → REVIEW.md
```

### Requirements Clarification

```
"I want to build something, not sure what"
  → csp-interview-me → csp-brainstorming → spec
```

### Project Onboarding

```
"I just inherited this project"
  → csp-explore → csp-map-codebase → architecture map
```

### Specialized Agents

```
"Production incident management"
  → csp-incident-commander → severity classification, structured response, post-mortems

"Design a multi-agent AI pipeline"
  → csp-multi-agent-architect → topology selection, failure modes, HITL gating

"Build a data pipeline"
  → csp-data-engineer → ETL/ELT design, lakehouse architecture, data quality

"Create an MCP server"
  → csp-mcp-builder → tool interface design, agent integration, testing

"Minimal bug fix"
  → csp-minimal-change-engineer → surgical diffs, scope discipline, no creep
```

## Version Locking

`.csp/versions.lock` at project root tracks skill versions:

```
csp-plan-phase@1.2.3
csp-code-review@2.0.1
csp-debug@1.5.0
```

## Custom Recipes

Define reusable workflows in `.csp/recipes.yaml`:

```yaml
recipes:
  rapid-prototype:
    description: "Quick prototype, skip full tests and docs"
    triggers: ["prototype", "demo", "proof of concept"]
    sequence:
      - skill: csp-brainstorming
        optional: true
      - skill: csp-implement
      - skill: csp-verification
        mode: basic-check

  hotfix:
    description: "Emergency production fix, minimal change"
    triggers: ["hotfix", "urgent", "production issue"]
    sequence:
      - skill: csp-debug
      - skill: csp-implement
        mode: minimal-change
      - skill: csp-verification
        mode: regression-only
      - skill: csp-ship
        auto: true
```

Recipe priority: user-defined → built-in (`csp-router/recipes.yaml`) → router composition.

## Troubleshooting

```bash
/csp-why            # Why was this skill chosen?
/csp-debug-router   # Detailed router matching log
/csp-stats          # Usage statistics
```

## Further Reading

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Architecture design (13 core principles) |
| [SKILL-INDEX.md](./SKILL-INDEX.md) | Complete skill/agent index |

## License

[MIT License](./LICENSE)

All integrated projects use the MIT license.

## Acknowledgments

CSP integrates capabilities from the following open-source projects:

- [ECC](https://github.com/burningion/video-editing-ai) — Skill library
- [GSD](https://github.com/benjiwoss/get-shit-done) — Project management
- [OMC](https://github.com/ruvcode/oh-my-claudecode) — Runtime enhancement
- [Superpowers](https://github.com/SimpleVibe/Superpowers) — Meta-skills
- [spec-kit](https://github.com/microsoft/spec-kit) — Spec-driven development
- [Agency-Agents](https://github.com/msitarzewski/agency-agents) — Specialized AI agents
- [awesome-copilot](https://github.com/github/awesome-copilot) — GitHub Copilot skills & agents
