# CSP Project Synthesis

**Synthesized:** 2026-06-14
**Mode:** merge
**Sources:** 10 documents

---

## Project Overview

CSP (Code Skills Package) is a unified AI programming skills framework that consolidates capabilities from 5 open-source projects (ECC, GSD, OMC, Superpowers, spec-kit) into a layered, auto-routing system with on-demand skill loading.

**Key metrics:**
- ~90 skills + ~86 agents across L0-L4
- 15+ language stacks supported
- 18 installation platforms
- ~500-1,500 tokens per task (vs ~12K full load)
- MIT licensed

## Architecture

| Layer | Name | Role | Token Cost |
|-------|------|------|-----------|
| L0 | csp-router | Task classification + skill selection | ~800 (always loaded) |
| L1 | csp-meta | Methodology (TDD, debugging, brainstorming) | ~300/skill |
| L2 | csp-workflow | Project lifecycle (plan → execute → verify → ship) | ~500/skill |
| L3 | csp-patterns | Language/framework patterns, reviewers, build-resolvers | ~200-600/skill |
| L4 | csp-runtime | Runtime features (autopilot, wiki, remember) | ~300/skill |

## Decisions (from ingested docs)

1. **Five-layer architecture** (v0.3) — reduced from six layers by absorbing spec layer into meta + workflow
2. **Sharded index loading** — registry.json split by node type, ~98% token savings on directory, 87-96% per task
3. **Unified naming** — all skills use `csp-` prefix, no legacy prefix aliases
4. **Token budget** — max 5 skills active simultaneously, ≤10K tokens per task
5. **csp-auto DAG engine** — dynamic orchestration for complex multi-step tasks (documented, partially implemented)

## Requirements (from expansion plan)

### Completed in v0.3
- **AI Engineering** (P0): 5 skills (rag-architecture, llm-app-development, vllm-serving, data-pipeline-patterns, prompt-engineering) + 3 agents
- **DevOps/Infrastructure** (P1): 4 skills (cicd-pipelines, infrastructure-as-code, kubernetes-patterns, cloud-platform-patterns)
- **Refactoring/Legacy** (P1): 3 skills (refactoring-strategies, tech-debt-assessment, legacy-modernization)
- **Mobile** (P2): 3 skills (react-native-patterns, mobile-performance, cross-platform-strategy) + 3 agents
- **Skill Optimization** (Continuous): 8 large skills split, 91% token reduction (5,453 → 511 lines)

### Pending
- BMAD Integration Phase 6 (Quick Dev Flow) and Phase 7 (Verification)
- Overlap analysis merge operations (11 overlap groups identified, partially resolved)
- Headless mode support for all skills
- Skill dependency graph implementation
- Session state persistence

## Constraints

- Hard cap of 500 lines per SKILL.md (split references to `references/` directories)
- Max 5 concurrently active skills per task
- Registry descriptions ≤ 80 characters
- All skills must have valid YAML frontmatter with name, description, version

## Current State (from STATE.md + CHANGELOG)

- **Architecture version**: v0.3
- **CHANGELOG**: Unreleased section populated with v0.3 changes
- **All expansion plan items**: Marked as completed (expansion-plan.md)
- **BMAD Integration**: 71% complete (Phases 1-5 done, 6-7 pending)
- **Overlap Analysis**: 11 groups identified (7 A-level, 4 B-level, several C-level)

## Release Readiness

v0.3 is ready for release with the following scope:
- 15 new skills + 6 agents across 4 new categories
- 8 skills refactored for token optimization
- Architecture documentation updated to v0.3
- SKILL-INDEX.md sections 17-20 added
- install.sh supports 18 platforms
