---
name: csp-integration-necessity-review
description: "Phase 2.5 mandatory self-critique gate: 7-dimension per-function verdict table (include/downgrade/remove/merge) filtering roadmap features against STRATEGY anchor. Default posture is cut not keep. Use after roadmap version planning, before PRD SPEC generation."
argument-hint: "[roadmap file path, default docs/strategy/ROADMAP.md]"
version: "1.0.0"
layer: 2
category: workflow
phase: review
domain: patterns
scope: analysis
tools: [Read, Write, Edit, Glob, Grep, Bash]
dependencies:
  skills: []
related_skills:
  - csp-roadmap-update
  - csp-product-lens-reviewer
  - csp-product-design-convergence
  - csp-requirement-prioritization
anti_rationalizations:
  "It's already in the roadmap so it must be necessary": "Planned ≠ necessary. Every feature must survive the 7-dimension gauntlet independently."
  "We should keep it for completeness": "Completeness is not a goal — core-scenario focus is. Features that don't serve the anchor are dead weight."
  "Removing features silently is fine": "Every removal/downgrade must record the reason. Traceability is mandatory."
  "Strategic anchor is debatable here": "This review only filters features, it does not challenge strategy. Strategic disputes escalate separately."
triggers:
  keywords: ["集成审视", "集成必要性", "integration necessity", "Phase 2.5", "功能审视",
             "self-critique gate", "砍功能", "精简功能", "feature necessity review",
             "necessity check", "功能必要性"]
  intents:
    - "user wants to review which planned features are actually necessary"
    - "user wants to cut unnecessary features from the roadmap"
    - "user wants to run the Phase 2.5 integration necessity self-critique gate"
  context:
    - "after_roadmap_planning"
    - "after_version_sequence"
    - "before_prd_spec_generation"
role: specialist
---

# Integration Necessity Review (Phase 2.5 Self-Critique Gate)

The mandatory gate between roadmap version planning (Phase 2) and PRD SPEC generation (Phase 5).
Filters every planned feature through 7 dimensions, producing a verdict table that records
what stays, what goes, what merges, and why — with full traceability.

**Core stance**: Default posture is **cut, not keep**. Every feature must answer: "What if we don't build this?"
Features that fall outside core business scenarios → default to defer or remove.

## When to Use

- After Phase 2 (roadmap version sequence) produces a version feature table
- Before Phase 5 (PRD SPEC generation) for each planned version
- When 07 review findings trigger a roadmap incremental update (re-run on new theme candidates)
- When the user explicitly asks to review feature necessity or cut scope

## When NOT to Use

- Before a roadmap exists (run Phase 2 first)
- To challenge the STRATEGY anchor itself (that's a separate strategic discussion)
- For single-feature PATCH versions that add no new capabilities
- To review implementation details or code quality (use code review skills instead)

## Process

### Step 0: Context Detection

Read the following files to establish the review baseline. Skip any that don't exist, but record their absence:

1. `docs/strategy/STRATEGY.md` — Extract: target problem, approach, who it's for, key metrics, tracks, not-working-on list
2. `docs/strategy/ROADMAP.md` — Extract: version sequence, per-version feature summaries, status fields
3. `docs/FEATURES.md` — Extract: current feature matrix (version × module × feature × status)
4. `.csp/manifest.json` — Check for existing integration-necessity records

**Output**: A "review baseline card" showing:
- STRATEGY anchor summary (1-2 lines per element)
- Version count to review: N versions, M total features
- Prior necessity reviews on file (if any)

### Step 1: Extract Feature Inventory

From `ROADMAP.md`, extract every feature listed under each planned version. Build a flat inventory:

```
| Version | Feature | Module | Summary | Status |
|---------|---------|--------|---------|--------|
```

Only review features with `status: planned` or `status: in-progress`. Skip already `shipped` or `deferred` features.

### Step 2: 7-Dimension Per-Feature Review

For each feature in the inventory, evaluate against all 7 dimensions. Use the STRATEGY anchor
as ground truth. For each dimension, record: evidence, reasoning, and a pass/fail signal.

#### Dimension 1: Positioning Fit (定位契合度)
**Question**: Does this feature serve the STRATEGY anchor (target problem / approach / who)?
- **Pass**: Directly serves the target problem, approach, or target users
- **Fail**: "Nice to have" that doesn't connect to any anchor element
- **Signal**: Features that are "handy to build" but strategically irrelevant → remove or downgrade

#### Dimension 2: Scenario Necessity (场景必要性)
**Question**: Do target users/scenarios genuinely need this?
- **Pass**: Mapped to a specific user scenario with evidence (research/feedback/data)
- **Fail**: No scenario support; built because "technically feasible"
- **Signal**: "Would be cool" ≠ necessary

#### Dimension 3: Existing Capability Overlap (现有重叠)
**Question**: Does this overlap with already-shipped versions, existing capabilities, or another feature in the same batch?
- **Pass**: Unique capability not covered elsewhere
- **Fail**: Duplicates existing functionality or another planned feature
- **Signal**: Overlap → merge or remove (don't build it twice)

#### Dimension 4: Integration Cost vs Value (集成成本 vs 价值)
**Question**: Integration cost (external deps, architecture changes, long-term maintenance) vs user/business value?
- **Pass**: Value clearly outweighs cost
- **Fail**: High cost, low or substitutable value
- **Signal**: Expensive and low-value → downgrade to future or remove

#### Dimension 5: Dependency Feasibility (依赖可行性)
**Question**: Are prerequisite dependencies (external capabilities, upstream versions) reachable?
- **Pass**: All dependencies exist or are planned in prior versions
- **Fail**: Dependencies unavailable, unreachable, or dangling
- **Signal**: Unreachable deps → defer until deps ready or remove

#### Dimension 6: Batching Reasonableness (攒批合理性)
**Question**: Should this feature be merged into another version of the same module?
- **Pass**: Feature belongs in this version's theme, or is the only feature for its module
- **Fail**: Same-module features split across versions unnecessarily
- **Signal**: Can merge → merge into target version, remove from current

#### Dimension 7: Core Scenario Focus (核心场景聚焦度)
**Question**: Does this feature fall within STRATEGY-defined core business scenarios?
- **Pass**: Directly in the core scenario path
- **Fail**: Edge case, filler, "looks complete but nobody uses"
- **Signal**: Edge → remove or defer to far future

### Step 3: Verdict Assignment

For each feature, assign one of four verdicts based on the 7-dimension signals.
Every verdict MUST record the reasoning (which dimension triggered it and why).

| Verdict | Trigger | Action |
|---------|---------|--------|
| **Include** (纳入) | All 7 dimensions pass | Keep in current version, no changes |
| **Downgrade** (降级) | Fails 1+ dimensions but has future potential | Move to later version, mark `deferred` + unlock condition |
| **Remove** (剔除) | Fails on core dimensions (positioning/scenario/focus) | Remove from version sequence, record in Not Working On with reason |
| **Merge** (合并) | Fails batching dimension | Merge into another same-module version, remove from current |

**Decision rules**:
- Fail on Dimension 1 (positioning) or Dimension 2 (scenario) or Dimension 7 (focus) → default to **Remove**
- Fail only on Dimension 5 (dependencies) → default to **Downgrade** (defer until deps ready)
- Fail only on Dimension 6 (batching) → default to **Merge**
- Fail on Dimension 4 (cost) with other passes → judge: high-cost/low-value = Downgrade/Remove; acceptable cost = Include
- Fail on Dimension 3 (overlap) → Merge with the overlapped feature or Remove the duplicate
- When uncertain and feature is non-core → default to **Remove** (cut posture)

### Step 4: Produce Verdict Table

Generate the full verdict table. Every row must have:

```markdown
| Version | Feature | Dim-1 | Dim-2 | Dim-3 | Dim-4 | Dim-5 | Dim-6 | Dim-7 | Verdict | Evidence | Destination |
|---------|---------|-------|-------|-------|-------|-------|-------|-------|---------|----------|-------------|
```

- **Evidence**: Which dimension(s) drove the verdict, with brief reasoning
- **Destination**: For Include = current version; Downgrade = target version + condition; Remove = "Not Working On" reason; Merge = target version + feature name

### Step 5: Summary and Statistics

Compute aggregate statistics:

```
纳入 (Include):  N features
降级 (Downgrade): N features
剔除 (Remove):   N features
合并 (Merge):    N features
─────────────────────────
Review coverage: N/N features (100%)
```

### Step 6: Write Integration Necessity Report

Save to `docs/analysis/INTEGRATION-NECESSITY-{date}.md` with these sections:

1. **Review Context**: STRATEGY anchor summary, version scope, date
2. **Verdict Table**: Full 7-dimension table with all features (Step 4)
3. **Summary Statistics**: Aggregate counts (Step 5)
4. **Removed Features Log**: Every removed feature + detailed reason (for traceability)
5. **Downgraded Features Log**: Every downgraded feature + unlock condition
6. **Net Version Sequence**: The clean version sequence after all cuts/merges/downgrades

### Step 7: Back-Propagate to ROADMAP and FEATURES

After the report is written, update the canonical files:

1. **ROADMAP.md**: Replace version sequence with the clean post-review version
   - Removed features: delete from version rows
   - Downgraded features: move to target version, change status to `deferred`
   - Merged features: append to target version's feature row, remove from original
2. **FEATURES.md**: Sync with ROADMAP changes
   - Removed: delete or mark `❌ 摒弃`
   - Downgraded: move row, update version number
   - Merged: merge rows
3. **.csp/manifest.json**: Register the integration-necessity analysis item
   - `source_type=doc`, `build_status=built`, add `content_hash`
   - Mark removed/downgraded feature manifest items as `degraded` or remove

## Key Principles

1. **Cut by default**: The review posture is "what if we don't build this?" — not "is there any reason to keep it?"
2. **Evidence over opinion**: Every verdict must cite which dimension triggered it and why
3. **Traceable removals**: Removed features are logged with reasons, never silently deleted
4. **Don't challenge strategy**: This review filters features, not the STRATEGY anchor. Strategic disputes escalate separately.
5. **Auto-resolve when clear**: Clear overlap / clear anchor deviation / clear dependency gap → decide directly, don't interrupt
6. **Core scenario focus**: Edge cases and "completeness" features default to removal
7. **Agent-paced**: No time estimation, no calendar scheduling — order by dependency DAG + priority

## Anti-Patterns

| Anti-Pattern | Symptom | Correct Approach |
|-------------|---------|-----------------|
| Rubber-stamp review | Every feature gets "Include" | Default to cut; make features prove their necessity |
| Silent removal | Features disappear without explanation | Every removal has a recorded reason |
| Strategy challenge disguised as review | Using dimension signals to argue against the anchor | Escalate strategic disputes separately |
| Analysis paralysis | Debating every feature at length | When signals are clear, decide immediately |
| Completeness bias | Keeping features "so the product looks complete" | Core scenario focus; edge cases get cut |
| Batching neglect | Reviewing features in isolation without checking module affinity | Always check Dimension 6: can it merge? |

## Related Skills

- [[csp-roadmap-update]] — updates ROADMAP after necessity review changes
- [[csp-product-lens-reviewer]] — strategic-level premise challenge (complementary, used for strategic questions this skill doesn't cover)
- [[csp-product-design-convergence]] — downstream architecture convergence gate after necessity review
- [[csp-requirement-prioritization]] — priority scoring for features that survive the necessity filter