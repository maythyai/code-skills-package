---
name: csp-roadmap-update
description: >
  Aggregate iteration status, evaluate milestone progress, record priority changes,
  and output a roadmap update report with next-step planning recommendations.
  Supports pulling project status from Linear or other project management tools.
  Use when the user says "路线图", "Roadmap", "版本规划", "迭代计划", "里程碑",
  "迭代状态", "版本进度", "Sprint回顾", "迭代周报", "延期分析", "roadmap update",
  "milestone review", "release planning", "sprint status".
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
  - csp-product-metrics-review
  - csp-requirement-prioritization
  - csp-prd-generation
  - csp-mvp-scoping
  - csp-strategy
  - csp-product-discovery-orchestrator

anti_rationalizations:
  "The roadmap is just a Gantt chart": "A roadmap is a strategic communication tool, not a project schedule. It shows direction, not dates."
  "We're behind schedule, just update the dates": "If you're consistently behind, the plan is wrong, not the calendar. Investigate root cause."
  "Stakeholders just want to see green status": "Hiding delays destroys trust. Show real status with a recovery plan."

triggers:
  keywords: ["路线图", "Roadmap", "版本规划", "迭代计划", "里程碑", "迭代状态",
             "版本进度", "Sprint回顾", "迭代周报", "延期分析", "roadmap update",
             "milestone review", "release planning", "sprint status"]
  intents:
    - "user wants to update the product roadmap with current progress"
    - "user needs to report milestone status to stakeholders"
    - "user wants to assess whether the release plan is on track"
  context:
    - "sprint_review"
    - "milestone_check"
    - "quarterly_planning"
    - "stakeholder_update"
---

# Roadmap Update

Aggregate iteration status, evaluate milestone progress, record priority changes,
and output a roadmap update report with next-step planning recommendations.
Helps product managers maintain an accurate, stakeholder-ready view of where the
product is heading and whether the plan is still viable.

## When to Use

- At the end of a sprint or iteration, to update the roadmap with completed work
- Before a stakeholder meeting, to prepare a status report on milestones
- When a major priority shift occurs, to reassess the roadmap and communicate changes
- During quarterly planning, to review progress against the annual product strategy
- When a release is at risk, to assess impact and propose a recovery plan

## When NOT to Use

- The user needs to create a roadmap from scratch (use `csp-strategy` or `csp-mvp-scoping` first)
- The user only needs to update a single task status (use the project management tool directly)
- The roadmap has not changed since the last update (skip the update; note "no changes" instead)

## Process

### Step 1: Collect Current State

Gather the following inputs:

| Input | Source | Required |
|-------|--------|----------|
| Current roadmap | Existing roadmap document or tool | Yes |
| Iteration/sprint status | Sprint board, Linear, Jira, or verbal update | Yes |
| Milestone definitions | Original roadmap milestones with target dates | Yes |
| Priority changes | Any reprioritization decisions since last update | If applicable |
| Blockers and risks | Known impediments to planned work | If applicable |

**If connected to Linear or similar tool**: Pull project/issue status automatically. Map issue states (Backlog -> Todo -> In Progress -> In Review -> Done) to roadmap progress.

### Step 2: Milestone Progress Assessment

For each milestone on the roadmap, assess progress:

```markdown
## Milestone: {Milestone Name}
**Target Date**: {original date}
**Status**: On Track / At Risk / Delayed / Completed / Cancelled

### Progress Summary
| Metric | Planned | Actual | Variance |
|--------|---------|--------|----------|
| Features planned | N | N | +/- N |
| Features completed | N | N | +/- N |
| Story points planned | N | N | +/- N |
| Story points completed | N | N | +/- N |
| Sprint velocity (avg) | N pts/sprint | N pts/sprint | +/- N% |

### Completed Items
- {Feature/story name} - {completion date}

### In Progress
- {Feature/story name} - {estimated completion} - {blocker if any}

### Deferred / Descoped
- {Feature/story name} - {reason for deferral}
```

**Status definitions:**
- **On Track**: >80% of planned work completed, target date achievable
- **At Risk**: 60-80% completed, target date achievable with focused effort
- **Delayed**: <60% completed or known blocker, target date will slip
- **Completed**: All planned work done and shipped
- **Cancelled**: Milestone no longer relevant; work redirected

### Step 3: Priority Change Log

Document any priority changes since the last roadmap update:

```markdown
## Priority Changes

| Date | Item | Previous Priority | New Priority | Reason | Impact on Roadmap |
|------|------|------------------|-------------|--------|-------------------|
| {date} | {feature/milestone} | P{N} | P{M} | {rationale} | {what gets pushed/pulled} |
```

**Priority change rules:**
- Every priority change must have a stated reason (data-driven, stakeholder request, competitive pressure, technical constraint)
- Record the downstream impact: what gets deferred when something is promoted
- If more than 30% of items changed priority since last update, flag "roadmap instability"

### Step 4: Risk and Blocker Assessment

Identify and assess risks to the roadmap:

```markdown
## Risks and Blockers

| Risk/Blocker | Affected Milestone | Probability | Impact | Mitigation | Owner | Status |
|-------------|-------------------|------------|--------|-----------|-------|--------|
| {description} | {milestone} | High/Med/Low | High/Med/Low | {action plan} | {person/team} | Open/Mitigating/Resolved |
```

**Common risk categories:**
- **Technical**: Unresolved architecture decisions, dependency on unstable third-party APIs
- **Resource**: Key person unavailable, team capacity reduced, hiring delays
- **Scope**: Feature creep, unclear requirements, stakeholder disagreements
- **External**: Regulatory changes, competitor moves, market shifts

### Step 5: Velocity and Capacity Analysis

Analyze team velocity trends to forecast future milestones:

```markdown
## Velocity Analysis

### Historical Velocity
| Sprint | Planned Points | Completed Points | Completion Rate |
|--------|---------------|-----------------|----------------|
| Sprint N-3 | ... | ... | ...% |
| Sprint N-2 | ... | ... | ...% |
| Sprint N-1 | ... | ... | ...% |
| Sprint N | ... | ... | ...% |

**Average Velocity**: {N} points/sprint
**Trend**: {improving / stable / declining}

### Capacity Forecast
| Remaining Milestone | Remaining Points | Sprints Needed (at avg velocity) | Target Date Feasible? |
|--------------------|-----------------|--------------------------------|----------------------|
| {milestone} | N | N sprints | Yes/No/At Risk |
```

**Forecasting rules:**
- Use the average of the last 3 sprints, not the all-time average
- If velocity is declining, use the most recent sprint's velocity (conservative)
- Account for known capacity changes (holidays, team changes, planned time off)

### Step 6: Roadmap Update Decision

Based on the assessment, determine the roadmap action:

| Scenario | Action |
|----------|--------|
| All milestones on track | Publish "no changes" update; celebrate progress |
| Minor delays (< 2 weeks) | Adjust dates, communicate to stakeholders |
| Major delays (> 2 weeks) | Re-sequence milestones, descoped features, or add resources |
| Priority shift | Reorder roadmap, document rationale, communicate impact |
| Milestone no longer relevant | Cancel milestone, redirect resources, update strategy alignment |

### Step 7: Generate Update Report

Save the roadmap update to `docs/roadmap/ROADMAP-UPDATE-{product}-{date}.md`:

```markdown
# Roadmap Update: {Product} - {Date}

**Author**: {name or [TBD]}
**Period Covered**: {start date} to {end date}
**Previous Update**: {date of last update}

## Executive Summary
(3-5 sentences: overall status, key changes, recommended actions)

## Milestone Status
(Per-milestone progress assessment with status indicators)

## Completed This Period
(List of features/stories shipped since last update)

## Priority Changes
(Log of reprioritization decisions with rationale)

## Risks and Blockers
(Current risks with mitigation plans)

## Velocity and Forecast
(Team velocity trend and milestone feasibility assessment)

## Updated Roadmap
(Revised timeline with new dates and scope)

## Next Steps
(Action items for the next period)

## Appendix
(Detailed sprint data, assumption notes, stakeholder communication draft)
```

### Step 8: Stakeholder Communication

Generate a stakeholder-friendly summary (separate from the detailed report):

```markdown
## Stakeholder Summary (for non-technical audience)

**Overall Status**: {Green/Yellow/Red}

**What We Shipped**: {2-3 key accomplishments}
**What's Next**: {2-3 upcoming milestones}
**What Changed**: {priority shifts or date changes, with brief rationale}
**What We Need**: {any decisions or resources needed from stakeholders}
```

**Communication rules:**
- Use Green/Yellow/Red status for quick scanning
- Lead with accomplishments, not problems
- When reporting delays, always include the recovery plan
- Keep the stakeholder summary under 200 words

## Key Principles

- **Roadmap is a living document**: It should be updated at least every sprint. A stale roadmap is a misleading roadmap.
- **Honest status builds trust**: Never hide delays. Report real status with a clear recovery plan. Stakeholders can handle bad news; they cannot handle surprises.
- **Velocity is a forecasting tool, not a performance metric**: Using velocity to judge team performance creates gaming behavior. Use it only for planning.
- **Descoping is a valid strategy**: When a milestone is at risk, reducing scope is often better than slipping dates. Make the trade-off explicit.
- **Separate the roadmap from the backlog**: The roadmap shows strategic direction (milestones, themes, outcomes). The backlog shows tactical work (stories, tasks). Don't mix them.

## Anti-Patterns

| Anti-Pattern | Symptom | Correct Approach |
|-------------|---------|-----------------|
| Date obsession | Roadmap is just a Gantt chart with fixed dates | Show themes and outcomes; dates are estimates, not commitments |
| Feature listing | Roadmap is a flat list of 50 features with no grouping | Group by milestone/theme; show the strategic narrative |
| Status theater | Everything is "green" even when behind | Use honest status; Green/Yellow/Red with recovery plans |
| Update avoidance | Roadmap hasn't been updated in months | Schedule regular updates (every sprint minimum) |
| Scope hiding | Deferred features are silently dropped | Log all descoping decisions with rationale and stakeholder approval |

## Related Skills

- [[csp-product-metrics-review]] - use metrics data to validate whether shipped features moved the needle
- [[csp-requirement-prioritization]] - re-prioritize backlog when roadmap priorities shift
- [[csp-prd-generation]] - new PRDs feed into the roadmap as planned features
- [[csp-mvp-scoping]] - use MVP scoping when a milestone needs to be descoped
- [[csp-strategy]] - align roadmap updates with long-term product strategy
