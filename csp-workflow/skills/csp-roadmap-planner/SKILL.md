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
Phase 0 (项目探测) → 首次 or 增量?
    ├─ 首次: Phase R (调研五面) → Phase 0 (战略锚点) → 全量规划
    └─ 增量: 读既有 STRATEGY.md/ROADMAP.md → diff delta → 只改变化部分
         → Phase 1 (版本规则) → Phase 2 (版本序列)
         → Phase 2.5 (集成审视 gate) → Phase 4.5 (PRD SPECs)
         → 收敛闸门 → 内环 00
```

**棕地项目**：先探测 `docs/strategy/ROADMAP.md` 是否存在和 `git tag --list 'v*'` 已有版本。已有规划 → 增量模式（07 findings 回流触发）；首次 → 全量规划。

**新鲜度检查**：若已有 CURRENT-STATE，读其 `observed_at`/`source_commit` vs `HEAD`——commit 不同或距上次 >1 MINOR → **重新评估，不沿用旧结论**。

## Key Outputs

- `docs/strategy/STRATEGY.md` — Rumelt kernel: diagnosis → guiding policy → coherent action
- `docs/strategy/ROADMAP.md` — version rules + reviewed version sequence
- `docs/analysis/MARKET-RESEARCH-{date}.md` — five-face research
- `docs/analysis/INTEGRATION-NECESSITY-{date}.md` — self-critique gate results
- `docs/prd/PRD-{version-slug}.md` — per-version planning-level SPEC (prd_depth: planning)

## Phase 2.5: Integration Necessity Review（强制 self-critique gate）

> **已规划 ≠ 必要**。默认姿态是「砍」不是「留」——精简聚焦核心业务场景。

版本序列产出后**强制执行**（首次规划与 07 回流/战略调整的增量更新都跑）。逐功能过 7 维 self-critique，裁决后回写净版 ROADMAP。

### 7 维审视

| 维度 | 问什么 | 不通过 → 处置 |
|------|--------|-------------|
| 1. 定位契合度 | 功能是否服务 STRATEGY 锚点（诊断/方针/为谁）？偏离锚点的"顺手做"功能 | **降级或剔除** |
| 2. 场景必要性 | 核心用户/场景真需要？无场景支撑、只是"技术可行就做" | **剔除** |
| 3. 与现有能力重叠 | 是否已发布 / 同批次另一功能重叠？（不重复造轮子） | **合并或剔除** |
| 4. 集成成本 vs 价值 | 实现成本 vs 用户/业务价值？成本高且价值低或可替代 | **降级到远期或剔除** |
| 5. 依赖可行性 | 前置依赖是否可达、何时可达？不可达或悬空 | **降级（defer 到依赖就绪版本）或剔除** |
| 6. 攒批合理性 | 是否就该并入同模块另一版本主题？能合并的不单列 | **合并** |
| 7. 核心场景聚焦度 | 是否落在核心业务场景？边缘场景/撑场面/凑数 | **剔除或降级到远期** |

### 裁决（每功能四选一，必记依据可追溯）

| 裁决 | 含义 | 去向 |
|------|------|------|
| **纳入** | 必要，留本版本不动 | 原版本保留 |
| **降级** | 非本版本必要 | 移到更后版本/远期主题，标 `deferred` + 原因 + 触发条件 |
| **剔除** | 无必要集成进项目系统 | 移出版本序列，记入 Not working on + 原因（不静默删） |
| **合并** | 并入同模块另一版本/功能 | 在目标版本功能行追加，原位置移除 |

### 红线

- 已规划不等于必要——审视可剔除/降级已写进 ROADMAP 的功能
- 剔除/降级**必须记原因**，可追溯
- self-critique 只过滤功能层，不动 Phase 0 锚点、不重定版本号规则
- 明显重叠/偏离锚点/依赖悬空 → 直接裁决，不打断；仅在战略根本方向无法 auto-resolve 时人工澄清（≤2 轮）

### 产出

- `docs/analysis/INTEGRATION-NECESSITY-{date}.md`：审视表 `版本 | 功能 | 裁决 | 依据 | 去向` + 汇总（纳入 N / 降级 N / 剔除 N / 合并 N）
- **回写净版 ROADMAP**：剔除的移除、降级的改 status=`deferred`+去向、合并的并功能行；FEATURES.md 同步

## Guardrails

- Planning ≠ feature list. Strategy is what/why, features go to 01 PRD.
- ROADMAP is summary-level. Engineering detail lives in PRD SPEC → 01 upgrade → 03 Spec.
- Planned ≠ necessary. Phase 2.5 must filter every version's features.
- Strategic theme numbers (v2.0="platformization") are NOT SemVer release tags.
- No fabricated metrics — mark unknown as [TBD].