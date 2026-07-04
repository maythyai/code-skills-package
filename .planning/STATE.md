# CSP Project State

**Last Updated**: 2026-07-04
**Current Version**: v0.7.0 (released 2026-06-21)
**Next Target**: v0.8.0 — 独立开发者场景扩展

---

## Architecture Metrics

| Metric | Value |
|--------|-------|
| Total Skills (registry) | 538 (active + deprecated) |
| V2-upgraded Skills | 20 |
| SKPG Nodes / Edges | 597 / 638 |
| Total Agents | ~135 (csp-patterns 84 + csp-runtime 18 + csp-workflow 33) |
| Language Stacks | 15+ |
| Installation Platforms | 18 |
| Token Cost per Task | ~500-1,500 |
| Full Load (reference) | ~12,000+ tokens |
| Token Savings | 87-96% |
| Frontmatter Compliance | 99.3% (name/description/layer) |
| Registry Path Consistency | 100% (0 missing paths) |

---

## Version History

| Version | Release Date | Key Features |
|---------|-------------|--------------|
| v0.3 | 2026-06-12 | AI Engineering + DevOps + Refactoring + Mobile skills; 8 skill splits |
| v0.4.0 | 2026-06-14 | 质量巩固: 11 组重叠合并, 核心迁移, 安装器优化, 创作工具 |
| v0.5.0 | ~2026-06-16 | Agency-Agents 专业化代理集成 |
| v0.6.0 | ~2026-06-18 | State-aware routing, SKILL.md v2 spec |
| v0.7.0 | 2026-06-21 | SKPG 知识图谱, 置信度评分路由, 状态检测 hook |

---

## v0.7.0 核心能力

1. **状态感知路由**: 基于项目上下文自动检测开发阶段，路由到对应 skill 组合
2. **SKILL.md V2 规范**: 新增 classification (version/phase/domain/scope)、tool permissions、enhanced triggers
3. **SKPG 知识图谱**: 597 节点 / 638 边的 skill 关联图谱，支持智能推荐和上下文扩展
4. **置信度评分路由**: keyword 40% + intent 30% + context 30% 的三维置信度评分
5. **状态检测 hook**: 自动检测 session 状态变化，触发 skill 加载/卸载

---

## Forward Planning

### v0.8.0 方向 (详见 [indie_builder_plan.md](indie_builder_plan.md))

| 优先级 | 方向 | 预估新增 Skills |
|--------|------|----------------|
| P0 | 商业化与产品运营 (支付/SEO/分析/邮件) | 5-8 |
| P0 | 运维与部署 (Vercel/VPS/监控/On-call) | 6-10 |
| P1 | 性能优化 (前端/后端/数据库/度量) | 3-5 |
| P1 | API 设计与第三方集成 (Webhook/OAuth/治理) | 4-6 |
| P2 | 测试工程 (E2E/视觉回归/Mock/ROI) | 3-4 |
| P2 | 数据库运维 (备份/迁移/隐私/灾难恢复) | 2-3 |
| P3 | 国际化、Monorepo、软性技能 | 6-9 |

**总计**: 29-45 新增 skills → 目标 ~570-585 skills

---

## Blockers / Concerns

None currently.

---

## Document Map

- 入口索引: [INDEX.md](INDEX.md)
- 路线图: [ROADMAP.md](ROADMAP.md)
- 架构设计: [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)
- 技能目录: [docs/SKILL-INDEX.md](../docs/SKILL-INDEX.md)
- 历史归档: [archive/](archive/)
- 参考知识: [reference/](reference/)
