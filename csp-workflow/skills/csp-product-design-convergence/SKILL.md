---
name: csp-product-design-convergence
description: "Architecture convergence gate between roadmap and development — validates feature architecture alignment, core/secondary trade-offs, IA/navigation admission, iteration priority, positioning alignment, and system hygiene before allowing 01 PRD to start. Mandatory gate after every roadmap update. Triggers: 收敛审查, 架构收敛, convergence review, roadmap gate."
version: "1.0.0"
layer: 2
category: workflow
phase: plan
domain: architecture
scope: design
role: architect
tools: [Read, Write, Edit, Glob, Grep]
triggers:
  - "收敛审查"
  - "架构收敛"
  - "convergence"
  - "convergence review"
  - "roadmap gate"
  - "功能架构审查"
related_skills: [csp-roadmap-planner, csp-prd-generation, csp-product-lens-reviewer]
anti_rationalizations:
  "规划通过了就不需要收敛审查": "收敛闸门是外环→内环的硬 gate——不通过不进 01。定位漂移/架构混乱/边界模糊都在这里拦截。"
---

# Product Design Convergence

> 外环 roadmap → 内环 01 之间的**硬闸门**。每次 roadmap 更新后必跑。

## Six Dimensions

### D1: Feature Architecture
- Merge candidates: features that overlap → combine into single capability
- Split candidates: oversized features → decompose into manageable units
- Migrate candidates: features in wrong module → reassign to correct owner
- Cut candidates: features that don't serve the product → remove from roadmap

### D2: Core/Secondary Trade-Off
Classify every feature: Must have / Should have / Nice to have / Wrong (shouldn't be here at all). If >30% fall into "Nice to have", the roadmap is unfocused.

### D3: IA & Navigation Admission
Three-question gate per feature:
1. Where does this feature live in the navigation?
2. Can a user reach it in ≤3 clicks from the home screen?
3. Is there a clear entry point that doesn't conflict with existing items?

### D4: Iteration Priority
- Dependency chain ordering: what must come before what
- User value per iteration: each version must deliver independently testable value
- Risk diversification: don't batch all high-risk features into one version

### D5: Positioning Alignment
- Does each feature strengthen the product's unique positioning?
- Are we building what competitors already have, or what they can't/won't build?
- Does the feature set tell a coherent story about what this product IS?

### D6: System Hygiene
- Backend capability bloat: endpoints without consumers
- Feature flag hygiene: flags older than 2 versions without cleanup plan
- Document authority: every feature has a clear owning PRD/Spec pair

## Output

`.csp/convergence/CONVERGED-FEATURE-PLAN.md` — the authoritative feature list for 01 PRD. This is the single source of truth, not the raw ROADMAP.

## Gate Rule

Convergence review MUST pass before 01 PRD starts. If the feature list changes during convergence, Phase 4.5 PRD SPECs must be re-synchronized.