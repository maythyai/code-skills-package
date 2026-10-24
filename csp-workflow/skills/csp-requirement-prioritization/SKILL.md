---
name: csp-requirement-prioritization
description: "Prioritize a list of requirements or user stories using RICE, ICE, MoSCoW, or Kano models. Includes a framework selection decision tree based on data availability and decision context, plus a 4-stage opportunity funnel for filtering a large raw pool down to a defensible 1-3."
version: "1.0.0"
layer: 2
category: workflow
phase: plan
domain: patterns
scope: analysis
tools: [Read, Write, Edit, Glob, Grep]

dependencies:
  skills: []

related_skills:
  - csp-user-story-decomposition
  - csp-prd-generation
  - csp-mvp-scoping
  - csp-product-metrics-review
  - csp-requirement-decomposition
  - csp-product-discovery-orchestrator
  - csp-strategy
  - csp-effort-estimation
  - csp-roadmap-update

anti_rationalizations:
  "Everything is high priority": "If everything is P0, nothing is P0. Force-rank if needed."
  "Let's just do what the loudest stakeholder wants": "Stakeholder volume is not a prioritization framework."
  "We don't have data for RICE": "Use ICE or MoSCoW which work with less data. Absence of data is itself information."
  "Let's score all 50 ideas with RICE": "Effort and reach estimates for ideas that should never have been evaluated are invention. Run the funnel's cheap binary gates first."
  "The weighting came out wrong, let's adjust it": "Changing a threshold after seeing which ideas it killed is reverse-engineering the answer. Record the reason or leave it."

triggers:
  keywords: ["需求排序", "优先级", "RICE", "ICE", "需求排期", "MoSCoW", "排backlog",
             "sprint规划", "需求取舍", "迭代规划", "backlog排序", "需求评估", "机会漏斗",
             "机会筛选", "立项评估", "资源分配",
             "prioritize", "backlog prioritization", "requirement ranking", "opportunity funnel"]
  intents:
    - "user has multiple requirements and needs to decide what to build first"
    - "user is preparing for sprint planning and needs to rank backlog items"
    - "user wants to resolve conflicting stakeholder priorities with data"
    - "user has a large raw pool of opportunities and needs to filter it down to a funded few"
  context:
    - "after_story_decomposition"
    - "sprint_planning"
    - "roadmap_planning"
    - "quarterly_planning"
role: specialist
---

# Requirement Prioritization

Prioritize a list of requirements or user stories using structured frameworks.
Includes a decision tree for selecting the right framework based on data availability
and decision context. Outputs a priority matrix and sprint planning recommendation.

## When to Use

- Multiple requirements compete for limited development capacity
- Sprint planning requires ranking the backlog
- Stakeholders disagree on what to build next and need an objective framework
- Roadmap planning requires sequencing features across releases
- MVP scoping needs to identify the essential feature set

## When NOT to Use

- There is only one requirement (no prioritization needed, just build it)
- The decision is already made and the user just wants validation (ask directly instead)
- Requirements have not been decomposed into stories yet (use `csp-user-story-decomposition` first)

## Two Modes

| Input | Mode | Output |
|---|---|---|
| A ranked candidate list of 3–30 requirements, already agreed to be in scope | **Framework scoring** (the Process below) | Priority matrix + sprint plan |
| A raw pool of 20–50+ opportunities, ideas, or asks that have not been filtered | **Opportunity funnel** (below) | A defensible 1–3 with the elimination trail |

Run the funnel first when the pool is large or contested; then score the survivors with the
framework. Scoring 50 raw ideas with RICE produces a ranking nobody trusts, because the effort
and reach estimates for ideas that should never have been evaluated are pure invention.

## Opportunity Funnel

Four converging stages. Each stage uses a cheaper, coarser filter than the last — you never do
expensive analysis on an idea that a cheap filter would have killed.

```
20–50 raw  →  20–30 pass gates  →  5–15 weighted  →  3–7 financial  →  1–3 selected
```

### Stage 1 — Hard gates (binary, no scoring)

Each gate is pass/fail with a stated threshold. Any single fail eliminates the idea, and the
reason is recorded.

| Gate | Pass condition | Default threshold |
|---|---|---|
| **战略契合** | The opportunity serves a stated strategic objective | ≥ 60% of the objective's criteria met |
| **市场规模** | The addressable segment is large enough to matter | ≥ 50% of the minimum viable segment |
| **所需投资** | The investment is within the available envelope | ≤ 40% of the period's capacity for a single item |
| **时间窗** | The window is open now, not hypothetically later | ≥ 70% confidence the window is current |
| **资源可用** | The required skills and systems exist or can be obtained | ≥ 50% available in-house |

Thresholds are defaults — the product owner sets the real numbers and records them in the report.
**Binary gates are not weighted.** Averaging a fatal strategic mismatch against a great market
size produces a score that justifies building the wrong thing.

### Stage 2 — Weighted scoring (1–5 per dimension)

Only survivors of Stage 1 get scored.

| Dimension | Weight | What a 5 looks like |
|---|---:|---|
| 战略对齐 | 30% | Directly advances the top strategic objective |
| 市场潜力 | 25% | Large, growing, reachable segment |
| 盈利影响 | 20% | Positive NPV or measurable gross-margin lift |
| 实施容易度 | 15% | Existing capability, no new dependency |
| 风险 | 10% | Reversible, bounded downside, no compliance exposure |

`score = Σ (dimension_score × weight)`. Keep the per-dimension scores visible — the aggregate
alone hides *why* something ranked where it did.

### Stage 2.5 — Impact/Effort triage (cheap visual screen)

Financial modelling is expensive. Before spending it on the top candidates, plot every survivor of
Stage 2 on a 2×2 so the room can see the shape of the backlog at once. Impact comes from the Stage 2
score; effort is a T-shirt estimate from whoever will build it — **not** from the person proposing it.

|  | **Low effort** | **High effort** |
|---|---|---|
| **High impact** | 🟢 **Quick wins** — do first, this sprint. If this quadrant is empty, say so out loud: it means the backlog is all expensive bets. | 🟡 **Major projects** — schedule deliberately, break into stages, and re-run Stage 1 gates on each stage before committing to the next. |
| **Low impact** | 🔵 **Fill-ins** — only when capacity is idle, or bundle several into one release to amortize the coordination cost. Never let these displace a Quick win. | 🔴 **Money pits** — explicitly decline and record the reason in the Decision Log. An undeclined Money pit keeps resurfacing in every planning meeting. |

**Rules:**
- Axes are **ordinal, not numeric**. Do not compute a ratio like impact/effort — dividing two
  T-shirt sizes produces false precision and ranks a "3/2" above a "5/4" for no defensible reason.
- Effort includes coordination, review, migration and rollout, not just typing. Items routinely land
  in the wrong quadrant because effort was estimated as code-only.
- Anything whose impact score rests on a guess goes in the lower row until the guess is tested.
  Optimism about impact is the most common way Quick wins turn into Money pits.
- The output of this stage is a **sequencing decision**, not a final ranking. Only the 🟢 and 🟡
  quadrants proceed to Stage 3.

### Stage 3 — Financial modelling (top 5–15 only)

| Metric | Rule |
|---|---|
| **NPV** | Discounted at the org's cost of capital; state the rate and the horizon |
| **IRR** | Report alongside NPV — a high IRR on a tiny investment is not a priority |
| **回收期** | Payback period in months; compare against the planning horizon |
| **敏感性** | Vary the two most uncertain inputs ±30% and report whether the ranking flips |

An idea whose rank flips under a 30% input variation is a bet, not a plan — label it as such.

### Stage 4 — Selection and commitment

Produce:

1. **Ranked list** with the score, and **the key differentiator** for each — one sentence saying
   why it beat the item below it. A ranking without a differentiator cannot be defended in a
   review meeting.
2. **Action / Owner / Timeline / Budget** for each selected item. An unowned selection is a wish.
3. **Resource allocation table — including a `Hold` row.** Showing what is explicitly *not*
   funded is what makes the plan credible; a table where everything is funded is a table nobody
   has read.
4. **Stage gates** — the condition that must hold for the item to proceed to the next funding
   tranche.
5. **Monitoring table** with red/amber/green per item, and a resource-utilization target
   (~90% — above that there is no slack for the unplanned, below it capacity is being wasted).

### Funnel baselines

Use these to sanity-check whether the funnel is being run honestly. A stage that passes 100% of
its inputs was not a filter.

| Stage | Typical input | Typical pass rate | Typical effort |
|---|---:|---:|---|
| 定义 (Define) | 50 | ~60% | 1 week |
| 评估 (Evaluate) | 30 | ~50% | 2 days |
| 财务建模 (Model) | 15 | ~33% | 1 week |
| 选择 (Select) | 7 | 100% → 1–3 chosen | 2 days |

### Funnel risks

- **Over-weighting quick wins.** Cheap-and-fast items dominate Stages 2–3 because 实施容易度 is
  easy to score and 战略对齐 is hard. If the selected set contains nothing strategic, re-run
  Stage 2 with 战略对齐 weight raised — or state plainly that this cycle is a tactical one.
- **Under-valuing strategic opportunities.** A capability investment with no near-term revenue
  loses every weighted comparison against a feature with a clear uplift. Reserve an explicit
  strategic quota (e.g. 1 of the 3 selected items) rather than letting the formula decide.
- **Gate inflation.** Loosening a threshold after seeing which ideas it killed is
  reverse-engineering the answer. Thresholds are set in Stage 1 and changed only with a recorded
  reason.

## Process

### Step 1: Framework Selection

Use the decision tree to select the most appropriate framework:

```
Do you have reliable reach/impact data for each requirement?
├── Yes -> Do you need to compare effort across requirements?
│   ├── Yes -> RICE (most rigorous, needs data)
│   └── No -> Kano (focus on satisfaction impact)
└── No -> Is the decision time-sensitive (e.g., sprint planning tomorrow)?
    ├── Yes -> MoSCoW (fast, consensus-based)
    └── No -> ICE (quick scoring with rough estimates)
```

**Framework comparison:**

| Framework | Data Need | Time to Apply | Best For | Output |
|-----------|-----------|---------------|----------|--------|
| **RICE** | High (reach, impact, confidence data) | 30-60 min | Quarterly roadmap planning | Scored ranking |
| **ICE** | Medium (rough 1-10 estimates) | 15-30 min | Sprint planning, backlog grooming | Scored ranking |
| **MoSCoW** | Low (qualitative judgment) | 10-20 min | Release scoping, stakeholder alignment | Categorized list |
| **Kano** | Medium (user satisfaction survey data) | 45-90 min | Feature investment decisions, UX prioritization | Satisfaction classification |

### Step 2: Collect Requirement List

Gather the items to prioritize. Each item needs at minimum:
- Name / short description
- Source (user feedback, data analysis, stakeholder request, competitive pressure)
- Dependency hints (what it blocks / is blocked by) — for Wave ordering

> **不估工时/story points**：AI 编程下 story points 与工时同样无意义（可能几分钟到几小时
> 完成同一项）。优先级由价值/风险/依赖决定，排波次由依赖 DAG 决定，不靠容量估算。
> 若上游 `csp-user-story-decomposition` 带了 story points，仅作参考、不用于排期。

### Step 3: Apply Selected Framework

> **关于 effort/estimate**：RICE/ICE 的 Effort 维度是**相对打分**（如 0.5–3 或 1–10 的相对值），
> 用于**横向比较优先级**，**不是人日/工时**，也不用于排期。AI 编程下人日无意义；
> 排波次由依赖 DAG 决定，不由 effort 分推。

#### RICE Scoring

For each requirement, score four dimensions:

| Dimension | Definition | Scale |
|-----------|-----------|-------|
| **Reach** | How many users will this affect in a given period? | Number of users per quarter |
| **Impact** | How much will this move the metric for each affected user? | 3 = massive, 2 = high, 1 = medium, 0.5 = low, 0.25 = minimal |
| **Confidence** | How sure are we about these estimates? | 100% = high, 80% = medium, 50% = low |
| **Effort** | How many person-months will this take? | Person-months (team-level) |

**RICE Score = (Reach x Impact x Confidence) / Effort**

Score all requirements, then rank by RICE score descending.

#### ICE Scoring

For each requirement, score three dimensions on a 1-10 scale:

| Dimension | Definition |
|-----------|-----------|
| **Impact** | How much will this move our key metric? |
| **Confidence** | How sure are we that this will have the expected impact? |
| **Ease** | How easy is it to implement? (10 = trivial, 1 = very hard) |

**ICE Score = Impact x Confidence x Ease**

#### MoSCoW Classification

Classify each requirement into one of four categories:

| Category | Definition | Guideline |
|----------|-----------|-----------|
| **Must have** | Non-negotiable for this release. Without it, the release fails. | Typically 20-40% of items |
| **Should have** | Important but not critical. Release is viable without it. | Typically 30-40% of items |
| **Could have** | Desirable but easily deferred. Include if time permits. | Typically 15-25% of items |
| **Won't have** | Explicitly excluded from this release. May revisit later. | Typically 10-20% of items |

**MoSCoW rules:**
- "Must have" items must pass the "remove it and the release fails" test
- The total "Must have" effort must fit within the available capacity
- "Won't have" is not "unimportant" - it's "not this time"
- **Must have ≤60%**: if everything is Must, nothing is — re-classify until the split is healthy (roughly Must ≤60% / Should ~20% / Could ~10% / Won't ~10%).

#### Kano Classification

Classify each requirement into one of six categories based on user satisfaction impact:

| Category | If Present | If Absent | Strategic Implication |
|----------|-----------|-----------|----------------------|
| **Must-be** | Neutral (expected) | Very dissatisfied | Implement to minimum standard, don't over-invest |
| **Performance** | Satisfied (linear) | Dissatisfied | Invest proportionally to competitive need |
| **Attractive** | Very satisfied | Neutral (delighter) | Use as differentiator, invest selectively |
| **Indifferent** | Neutral | Neutral | Don't build unless other reasons justify it |
| **Reverse** | Dissatisfied | Satisfied | Don't build; some users actively dislike this |
| **Questionable** | Unclear | Unclear | Clarify requirement; survey may be poorly designed |

**Kano decay law**: Attractive features degrade into Performance (expected) and then Must-be (basic) over 2-3 years as users habituate and competitors copy (e.g., fingerprint unlock went from delight to default). Consequence: continuously create new Attractive features; never treat today's delight as tomorrow's moat.

### Scoring Calibration (anti-bias discipline, mandatory for RICE/ICE)

Uncalibrated scoring produces garbage rankings. Apply these rules:

- **Score by dimension, not by item**: rate all Reach values first, then all Impact, then all Confidence. Item-by-item scoring anchors each requirement on the previous one.
- **Anchor Reach to a reference item**: pick a well-understood requirement (e.g., login) as the R baseline and score others relative to it.
- **Force Impact differentiation**: if >50% of items get the same Impact score, scores are not distinguishing anything — re-score and force spread (not every requirement is a "3").
- **Effort is a relative score, not person-days**: use a 4-part full-chain ratio (design 20% + dev 50% + test 20% + integration 10%) — never count dev time only.
- **Confidence <80%**: mark "建议先做小实验验证" — low-confidence high-score items need validation before commitment.

### Step 4: Generate Priority Matrix

Output a priority matrix combining the framework score with practical constraints:

```markdown
## Priority Matrix

| Rank | Requirement | Framework Score | Effort | Dependencies | Recommended Release |
|------|------------|----------------|--------|-------------|-------------------|
| 1 | ... | 240 (RICE) | 2 PM | None | v1.0 Sprint 1 |
| 2 | ... | 180 (RICE) | 3 PM | Req #1 | v1.0 Sprint 1 |
| 3 | ... | 120 (RICE) | 1 PM | None | v1.0 Sprint 2 |
```

**Impact-Effort quadrant** (cross-check every framework result):

| Quadrant | Impact | Effort | Strategy |
|----------|--------|--------|----------|
| Quick Wins | High | Low | Do first |
| Strategic Bets | High | High | Plan into roadmap phases |
| Fill-ins | Low | Low | Do when slack allows |
| Avoid | Low | High | Drop or deprioritize indefinitely |

Any requirement in "Avoid" that survived the framework ranking must be challenged — check whether Impact was over-scored or Effort was under-scored.

### Step 5: Sprint Planning Recommendation

Based on the priority matrix and **dependency Wave**（不靠 story-point 容量），推荐波次计划：

```markdown
## Sprint Plan Recommendation（按依赖 Wave + 优先级，不估工时）

**Total requirements**: {count}
**Waves**: {count}（按依赖 DAG 划分）

### Wave 1 — 基础层（P0，无前置依赖）
- {Requirement 1} - P0
- {Requirement 2} - P0

### Wave 2 — 核心层（P0/P1，依赖 Wave 1）
- {Requirement 3} - P1

### Deferred (not in current plan)
- {Requirement X} - {reason for deferral}
```

### Step 6: Output

Save the prioritization result to `docs/prioritization/PRIOR-{topic}-{date}.md`:

```markdown
# Requirement Prioritization: {Topic}

**Framework Used**: {RICE / ICE / MoSCoW / Kano}
**Date**: {current date}
**Participants**: {who was involved in the prioritization}
**Total Items**: {count}

## Framework Scores
(Detailed scoring table)

## Priority Matrix
(Ranked view with release recommendation)

## Sprint Plan
(Capacity-based sprint allocation)

## Decision Log
(Key trade-off decisions and their rationale)

## Open Questions
(Unresolved items needing further discussion)
```

## Key Principles

- **Framework serves the decision, not vice versa**: Choose the simplest framework that gives enough confidence for the decision at hand. RICE is not always better than MoSCoW.
- **Make assumptions explicit**: Every score involves assumptions. Write them down so they can be challenged and updated.
- **Re-prioritize regularly**: Priorities shift as data arrives, markets change, and learnings accumulate. Schedule re-prioritization at each sprint review.
- **Capacity is a constraint, not a suggestion**: The sprint plan must fit within real team capacity. Overcommitting is not ambition; it's a planning failure.

## Related Skills

- [[csp-user-story-decomposition]] - decompose epics into stories before prioritizing
- [[csp-prd-generation]] - PRD provides the business context for scoring Impact
- [[csp-mvp-scoping]] - use MoSCoW to define MVP boundary
- [[csp-product-metrics-review]] - metrics data informs RICE Reach and Impact scoring
- [[csp-requirement-decomposition]] - decompose requirements into features before story-level prioritization
