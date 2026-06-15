# CSP Project State

**Last Updated**: 2026-06-14
**Current Version**: v0.3 → v0.4.0 (in progress)
**Overall Progress**: 85% (v0.3 complete), v0.4.0 starting

---

## v0.3 Release — RELEASED

### Completed in v0.3
- **AI Engineering** (5 skills + 3 agents): RAG, LLM app dev, vLLM serving, data pipelines, prompt engineering
- **DevOps/Infrastructure** (4 skills): CI/CD, IaC, Kubernetes, cloud platform patterns
- **Refactoring/Legacy** (3 skills): Refactoring strategies, tech debt assessment, legacy modernization
- **Mobile** (3 skills + 3 agents): React Native patterns, mobile performance, cross-platform strategy
- **Skill Optimization**: 8 large skills split (5,453 → 511 lines, 91% reduction)
- **Architecture**: Updated to v0.3 (5-layer, sharded index, csp-auto DAG design)
- **Documentation**: SKILL-INDEX.md sections 17-20, ARCHITECTURE.md updated
- **Doc Ingest**: 10 documents ingested, SYNTHESIS.md created

---

## v0.4.0 — 质量巩固与工程化 (COMPLETED ✅)

### 目标
基于 v0.3 思辨分析: 不开发 plugin 系统, 聚焦项目质量巩固。
消除重叠 → 完善迁移 → 优化安装 → 开放贡献。

### Phases

| # | Phase | Status | Disk |
|---|-------|--------|------|
| 1 | Skill 重叠合并 | **Executed** ✅ (3/3 plans, 5 deprecated) | 01-skill |
| 2 | 核心技能迁移 | **Executed** ✅ (4/4 plans) | 02-migration |
| 3 | 安装器优化 | **Executed** ✅ | install.sh |
| 4 | 自定义技能创作 | **Executed** ✅ | templates/guides/creator |
| 5 | 质量审计与文档 | **Executed** ✅ | docs/changelog |

### Key Decisions
- **不开发 plugin 系统**: 过早抽象, 现有 recipes + registry 已足够灵活
- **完成核心迁移优先**: ARCHITECTURE.md Phase 2-7 尚未执行
- **11 组重叠需合并**: 参考 CSP-OVERLAP-ANALYSIS.md

---

## Deferred Items

### BMAD Integration (71% → deferred to v0.5+)
- Phase 6: Quick Dev Flow & Integration
- Phase 7: Verification & Audit

### Compound Engineering (Partial → deferred)
- Headless mode support
- Discoverability Check
- CONCEPTS.md maintenance
- Session History
- Strategy Anchor

### Agency-Agents Integration (New → planned for v0.5.0)
- Integrate 232 specialized agents from Agency-Agents project
- Focus on Engineering Division agents (Frontend Dev, Backend Arch, Code Reviewer, etc.)
- MCP Builder agent for extended MCP server capabilities
- Maintain CSP's auto-routing and lazy-loading architecture

---

## Architecture Metrics

| Metric | Value |
|--------|-------|
| Total Skills (registry) | 497 (489 active, 8 deprecated) |
| Total Agents | ~84 (csp-patterns) + 18 (csp-runtime) + 33 (csp-workflow) = 135 |
| Language Stacks | 15+ |
| Installation Platforms | 18 |
| Token Cost per Task | ~500-1,500 |
| Full Load (reference) | ~12,000 tokens |
| Token Savings | 87-96% |
| Overlap Groups | 0 — all resolved in v0.4.0 Phase 1 |
| Registry Missing Paths | 0 — 100% consistent |
| Frontmatter Compliance | 99.3% (name/description/layer) |

---

## Blockers/Concerns

None currently.
