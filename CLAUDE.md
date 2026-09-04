# CSP — Code Skills Package v0.10.0

Unified AI coding skills from multiple open-source projects with auto-routing, lazy loading, and spec-driven workflows. MIT licensed.

## Architecture

```
L0  csp-router    — task classification + skill selection (always loaded, ~800 tokens)
L1  csp-meta      — methodology: brainstorming, TDD, debugging, spec-driven (26 skills)
L2  csp-workflow  — project lifecycle: plan → execute → verify → ship (193 skills)
L3  csp-patterns  — language/framework patterns, reviewers, build-resolvers (381 skills)
L4  csp-runtime   — autopilot, ralph, wiki, remember, self-improve (58 skills)
Total: 660 skills across 5 layers (2 deprecated, carry redirect targets)
```

## Skill 内容规范（强制，所有新增/移植技能必须遵守）

- **无作者信息**：禁止 `author:` 字段、个人姓名、署名/来源脚注；技能只保留内容本身。
- **无 LICENSE 文件**：技能目录内不得包含 LICENSE/NOTICE/COPYING；包级许可仅根目录 `LICENSE`（MIT）。
- **无谱系字段**：frontmatter 禁止 `origin:`（含 `metadata:` 内嵌）；`source:` 仅允许指向公开项目（如 GitHub 开源仓库）。
- **无内部 URL**：禁止 `*.alibaba-inc.com`、`*.antfin.com` 等内部域名；功能性 URL 用占位符（如 `{CR_API_BASE}`）+ 环境变量参数化。公开链接（github.com、官方文档等）保留。
- **无个人环境硬编码**：本机路径/端口等用环境变量或相对路径参数化。
- **无构建产物**：`__pycache__/`、`*.pyc`、`*.bak`、`.DS_Store` 不入库。
- **移植外部技能**：先确认许可证兼容（MIT 包禁止引入 NC/SA 等限制性条款内容）；内容改写通用化，不带来源归属。

## Engineering

Build / validate / test pipeline (all zero-runtime-dependency Node ≥ 18 ESM):

```bash
npm run build:all      # registry → metadata → triggers → graph → page (one-shot rebuild)
npm run validate:all   # skill-v2 + triggers + registry schema validation
npm test               # validate:all + build:graph + node --test test/ (20 invariants)
```

- **Single source of truth**: `SKILL.md` frontmatter (v2: `phase`/`domain`/`scope`/`tools`/`deprecated`/`redirect`) → derived `registry.json` / `triggers.yaml` / `skill-metadata.yaml` / `skpg/graph.json` / `index.json` / `docs/csp-page`. Never hand-edit derived data.
- **Shared YAML parser**: `shared/scripts/lib/yaml.mjs` (handles `>-`/`|-` multiline, inline + block arrays, nested objects, type coercion).
- **`csp-sdk` CLI**: `query <sub>` · `doctor` · `version` · `init-skill <name> --layer <1-4>` (scaffolds a validate-passing SKILL.md). Unknown subcommands exit non-zero (no silent stub-pass).
- **`install.sh`**: split into `install.sh` (930 lines) + `lib/platforms.sh` + `lib/bootstrap.sh`. CSP_BRANCH whitelisted (`^[A-Za-z0-9._-]+$`); remote bootstrap supports `CSP_SHA256` integrity pinning.
- **Tests**: `test/csp-invariants.test.mjs` (registry shape, graph consistency, triggers integrity, version sync across 5 files, csp-sdk contract, npm-pack hygiene).

## Docs

- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) — full architecture design
- [SKILL-INDEX.md](./docs/SKILL-INDEX.md) — complete skill index
- [USER-GUIDE.md](./docs/USER-GUIDE.md) — user guide
- [INSTALL.md](./docs/INSTALL.md) — installation guide
- [UPDATE.md](./docs/UPDATE.md) — update guide
- [VERSIONING.md](./docs/VERSIONING.md) — version management (X=arch, Y=feature, Z=fix)
- [CONTRIBUTING.md](./CONTRIBUTING.md) — how to contribute a skill or fix
- [scripts/README.md](./scripts/README.md) — build/validate/maintenance tooling reference
- [docs/analysis/](./docs/analysis/project-review-2026-08.md) — audit reports + upgrade plans (project-review-2026-08, REVIEW-PROGRAMMING-SKILLS, cross-layer-testing-case-study)

## CSP 知识中枢 & Agent 团队

本项目用 `.csp/` 作为**编程管理统一文档库**（PMS/CMS/TMS + 流水线产物），`.claude/agents/` 为多智能体团队。约定详见 `.claude/agents/README.md`。

### 知识中枢（进入 workspace 先读）
- `.csp/AGENTS.md`：路由契约。
- `.csp/manifest.json`：唯一产物索引（`source_id`+`content_hash`+`build_status`）。
- `.csp/lifecycle-state.json`：流水线阶段状态（现在第几步、下一步谁）。
- **若 `.csp/AGENTS.md` 不存在** → 先运行 `knowledge-hub` agent 初始化：建 `AGENTS.md`/`manifest.json`/`lifecycle-state.json` + 棕地 CMS 蒸馏（`.csp/code-spec/`）+ 既有文档整改（Phase 1.5）。这是整条链路（00→07）的第一步，未初始化不进 01。

### Agent 团队（`.claude/agents/`）
- 外环 `roadmap-planner`（战略锚点+版本号规则+1/3年路径，跑一次）
- 内环：`knowledge-hub`(00) → `prd-writer`(01) → `decomposer`(02) → `tech-designer`(03) → `task-breaker`(04) → `dev-lead`(05) → `release-manager`(06) → `reviewer`(07)
- 主调度：`lifecycle-orchestrator`（读 lifecycle-state 自动派 agent；gate 即授权，仅破坏性/无解才问人）
- 05 角色：`backend-engineer`/`frontend-engineer`/`db-engineer`/`qa-engineer`（由 dev-lead spawn + worktree 并行）

### 文档边界
- `.csp/` = 编程管理产物（PMS/CMS/TMS + specs/tasks/tech-design/traceability/artifacts/ship/ops/milestones），git 跟踪。
- `docs/` = 非编程人类文档（README/USER-GUIDE/PRD 原文/CHANGELOG）。
- 版本号默认 SemVer（X.Y.Z），不自动用日期形式 tag。

### 用法
- 端到端：说"跑流程/从 00 开始/推进" → `lifecycle-orchestrator` 自动推进到 06 发布。
- 单阶段：说"写 PRD/拆 task/发版/复盘" → 对应 agent。
- 产物遵循 `.csp/` 格式（front-matter 互链 + manifest 回写 + lifecycle-state 推进）。
