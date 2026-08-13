---
name: csp-requirement-prioritization
description: >
  Prioritize a list of requirements or user stories using RICE, ICE, MoSCoW, or Kano models.
  Includes a framework selection decision tree based on data availability and decision context.
  Use when the user says "需求排序", "优先级", "RICE", "ICE", "需求排期", "MoSCoW",
  "排backlog", "sprint规划", "需求取舍", "迭代规划", "backlog排序", "需求评估",
  "prioritize requirements", "backlog prioritization", "sprint planning", "requirement ranking".
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

anti_rationalizations:
  "Everything is high priority": "If everything is P0, nothing is P0. Force-rank if needed."
  "Let's just do what the loudest stakeholder wants": "Stakeholder volume is not a prioritization framework."
  "We don't have data for RICE": "Use ICE or MoSCoW which work with less data. Absence of data is itself information."

triggers:
  keywords: ["需求排序", "优先级", "RICE", "ICE", "需求排期", "MoSCoW", "排backlog",
             "sprint规划", "需求取舍", "迭代规划", "backlog排序", "需求评估",
             "prioritize", "backlog prioritization", "requirement ranking"]
  intents:
    - "user has multiple requirements and needs to decide what to build first"
    - "user is preparing for sprint planning and needs to rank backlog items"
    - "user wants to resolve conflicting stakeholder priorities with data"
  context:
    - "after_story_decomposition"
    - "sprint_planning"
    - "roadmap_planning"
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
- Estimated effort (if available)

If the input comes from `csp-user-story-decomposition`, read the story list with story points directly.

### Step 3: Apply Selected Framework

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

### Step 5: Sprint Planning Recommendation

Based on the priority matrix and team capacity, recommend a sprint plan:

```markdown
## Sprint Plan Recommendation

**Team capacity**: {N} story points per sprint
**Total requirements**: {count}
**Total estimated effort**: {sum}

### Sprint 1 ({capacity} points)
- {Requirement 1} ({points} pts) - P0
- {Requirement 2} ({points} pts) - P0
- {Requirement 3} ({points} pts) - P1

### Sprint 2 ({capacity} points)
- {Requirement 4} ({points} pts) - P1
- ...

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
