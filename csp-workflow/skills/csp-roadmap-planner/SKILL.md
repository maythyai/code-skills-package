---
name: csp-roadmap-planner
description: "Product long-term planner — direction research + version numbering rules + version sequence paths + integration necessity self-critique gate + per-version planning-level PRD SPECs. Runs once per project (outer ring), 07 retro findings trigger incremental updates. Triggers: 路线图, roadmap, 产品规划, version planning, 长期规划, product strategy."
version: "1.0.0"
layer: 2
category: workflow
phase: plan
domain: architecture
scope: design
role: architect
tools: [Read, Write, Edit, Glob, Grep, WebFetch]
triggers:
  - "路线图"
  - "roadmap"
  - "产品规划"
  - "产品长期规划"
  - "version planning"
  - "版本序列"
  - "product strategy"
  - "feature roadmap"
related_skills: [csp-product-discovery-orchestrator, csp-prd-generation, csp-product-design-convergence, csp-requirement-prioritization]
anti_rationalizations:
  "已有 ROADMAP 了，不用再审视": "Phase 2.5 集成必要性审视是强制 gate——已规划不等于必要。7 维 self-critique 过滤后才算定稿。"
  "规划就是列 feature list": "Anchor not plan。战略是 what/why，功能细节归 01 PRD。"
---

# Roadmap Planner

> 外环战略规划 —— 调研 → 战略锚点 → 版本序列 → 集成审视 → PRD SPECs。
> 跑一次/低频增量，先于内环 00-07。

## Core Flow

```
Phase R (调研五面) → Phase 0 (战略锚点) → Phase 1 (版本规则) → Phase 2 (版本序列)
    → Phase 2.5 (集成审视 gate) → Phase 4.5 (PRD SPECs) → 收敛闸门 → 内环 00
```

## Key Outputs

- `docs/strategy/STRATEGY.md` — Rumelt kernel: diagnosis → guiding policy → coherent action
- `docs/strategy/ROADMAP.md` — version rules + reviewed version sequence
- `docs/analysis/MARKET-RESEARCH-{date}.md` — five-face research
- `docs/analysis/INTEGRATION-NECESSITY-{date}.md` — self-critique gate results
- `docs/prd/PRD-{version-slug}.md` — per-version planning-level SPEC (prd_depth: planning)

## Phase 2.5: Integration Necessity Review

7-dimension self-critique per feature:
1. Positioning fit — serves STRATEGY anchors?
2. Scenario necessity — core users really need this?
3. Existing capability overlap — already built / overlapping?
4. Integration cost vs value — cost-benefit ratio?
5. Dependency feasibility — prerequisites reachable?
6. Batch reasonability — belongs in another version?
7. Core scenario focus — on core business path?

Verdict: INCLUDE / DEMOTE (defer) / REMOVE (discard) / MERGE (combine)

## Guardrails

- Planning ≠ feature list. Strategy is what/why, features go to 01 PRD.
- ROADMAP is summary-level. Engineering detail lives in PRD SPEC → 01 upgrade → 03 Spec.
- Planned ≠ necessary. Phase 2.5 must filter every version's features.
- Strategic theme numbers (v2.0="platformization") are NOT SemVer release tags.
- No fabricated metrics — mark unknown as [TBD].