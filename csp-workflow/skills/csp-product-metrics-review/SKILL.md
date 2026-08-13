---
name: csp-product-metrics-review
description: >
  Analyze product metrics for a given time period, output health assessment, trend analysis,
  attribution analysis, and action recommendations. Includes North Star metric decomposition,
  retention analysis, conversion funnel, and A/B experiment interpretation.
  Use when the user says "指标复盘", "数据复盘", "DAU分析", "留存分析", "转化漏斗",
  "北极星指标", "产品数据", "周报数据", "月报数据", "指标下降", "数据异常",
  "增长分析", "MAU分析", "用户增长", "漏斗分析", "metrics review", "data review".
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
  - csp-product-pulse
  - csp-prd-generation
  - csp-requirement-prioritization
  - csp-strategy
  - csp-product-discovery-orchestrator

anti_rationalizations:
  "The numbers look fine, no need to dig deeper": "Flat metrics hide churn. Always decompose before concluding."
  "Correlation proves the feature caused the lift": "Correlation suggests. Check for seasonality, external events, and selection bias."
  "We don't have enough data yet": "Work with what you have. State confidence intervals and revisit when data grows."

triggers:
  keywords: ["指标复盘", "数据复盘", "DAU分析", "留存分析", "转化漏斗", "北极星指标",
             "产品数据", "周报数据", "月报数据", "指标下降", "数据异常", "增长分析",
             "MAU分析", "用户增长", "漏斗分析", "metrics review", "data review"]
  intents:
    - "user wants to review product performance for a time period"
    - "user notices a metric anomaly and wants root cause analysis"
    - "user needs to prepare a data review for stakeholders"
  context:
    - "sprint_review"
    - "monthly_review"
    - "post_launch_review"
    - "metric_anomaly_investigation"
---

# Product Metrics Review

Analyze product metrics for a given time period and output a structured review covering
health assessment, trend analysis, attribution analysis, and action recommendations.
Supports North Star metric decomposition, retention analysis, conversion funnels,
and A/B experiment interpretation.

## When to Use

- Preparing a weekly or monthly product data review
- A key metric has dropped or spiked and needs root cause analysis
- Evaluating the impact of a recently launched feature
- Assessing whether the product is on track for quarterly goals
- A/B experiment results need interpretation and decision recommendation

## When NOT to Use

- The user needs real-time product health monitoring (use `csp-product-pulse` for recurring pulse reports)
- The user needs to set up metrics tracking from scratch (define metrics in PRD first using `csp-prd-generation`)
- The user needs to analyze raw database data without product context (use a data analysis tool directly)

## Process

### Step 1: Define Review Scope

Collect the following from the user:

| Field | Required | Notes |
|-------|----------|-------|
| Time period | Yes | e.g., "last 7 days", "March 2026", "since launch" |
| Product/feature scope | Yes | Which product or feature area to review |
| Key metrics | No | If not provided, infer from North Star decomposition |
| Comparison baseline | No | Previous period, same period last year, or target value |
| Known events | No | Launches, campaigns, outages, or other events during the period |

### Step 2: North Star Metric Decomposition

Decompose the product's North Star metric into a measurable hierarchy:

```markdown
## North Star Decomposition

**North Star Metric**: {metric name} = {current value} ({trend: up/down/flat} vs. previous period)

### Level 1: Component Breakdown
NSM = {formula, e.g., Active Users x Avg Sessions x Revenue per Session}

| Component | Current | Previous | Change | Contribution to NSM Change |
|-----------|---------|----------|--------|--------------------------|
| Component A | ... | ... | +X% | Y% of NSM change |
| Component B | ... | ... | -X% | Y% of NSM change |

### Level 2: Driver Metrics
(For each component that changed significantly, decompose further)

### Level 3: Health Metrics
(Underlying system health that supports the drivers)
```

### Step 3: Health Assessment

For each key metric, assess health status:

| Status | Criteria | Action |
|--------|---------|--------|
| **Healthy** | Within 10% of target, trending stable or improving | Continue current strategy |
| **Watch** | 10-25% below target, or declining trend | Investigate root cause, prepare action plan |
| **Critical** | >25% below target, or sharp decline | Immediate investigation and intervention required |
| **Exceeding** | >10% above target | Understand why; consider raising targets |

Output a health dashboard:

```markdown
## Metric Health Dashboard

| Metric | Current | Target | Status | Trend (7d) | Trend (30d) |
|--------|---------|--------|--------|-----------|-------------|
| DAU | ... | ... | Healthy | +3% | +8% |
| D7 Retention | ... | ... | Watch | -2% | -5% |
| Conversion Rate | ... | ... | Critical | -8% | -12% |
```

### Step 4: Trend Analysis

For metrics in "Watch" or "Critical" status, perform trend analysis:

1. **Plot the trend**: Show daily/weekly values over the review period
2. **Identify inflection points**: When did the trend change? Correlate with known events.
3. **Decompose the trend**: Break the metric into segments (new vs. existing users, platform, geography) to find where the change is concentrated.

```markdown
## Trend Analysis: {Metric Name}

**Period**: {start date} to {end date}
**Overall change**: {X%} ({direction})

### Inflection Point
- Date: {date}
- Possible cause: {event, release, external factor}

### Segment Breakdown
| Segment | Current | Previous | Change |
|---------|---------|----------|--------|
| New users | ... | ... | ... |
| Existing users | ... | ... | ... |
| iOS | ... | ... | ... |
| Android | ... | ... | ... |
```

### Step 5: Conversion Funnel Analysis

If the product has a defined user journey, analyze the conversion funnel:

```markdown
## Conversion Funnel

| Step | Users | Conversion Rate | Drop-off |
|------|-------|----------------|----------|
| 1. Landing page visit | 10,000 | - | - |
| 2. Sign up | 2,000 | 20% | 8,000 (80%) |
| 3. Onboarding complete | 1,200 | 60% | 800 (40%) |
| 4. First core action | 800 | 67% | 400 (33%) |
| 5. Retained (D7) | 400 | 50% | 400 (50%) |

**Bottleneck**: Step {N} has the highest drop-off rate.
**Recommendation**: {actionable suggestion to improve this step}
```

### Step 6: Retention Analysis

If retention is a concern, perform cohort-based retention analysis:

```markdown
## Retention Analysis

### Cohort Retention Table
| Cohort (signup week) | D1 | D3 | D7 | D14 | D30 |
|---------------------|-----|-----|-----|------|------|
| Week 1 | ...% | ...% | ...% | ...% | ...% |
| Week 2 | ...% | ...% | ...% | ...% | ...% |

### Key Observations
- D7 retention trend: {improving/declining/stable}
- Best performing cohort: {week} ({reason if known})
- Retention cliff: {at which day does retention drop most sharply}
```

### Step 7: A/B Experiment Interpretation (if applicable)

If there are active A/B experiments, interpret the results:

```markdown
## A/B Experiment: {Experiment Name}

**Hypothesis**: {what was being tested}
**Duration**: {start date} to {end date}
**Sample size**: Control={N}, Treatment={N}

| Metric | Control | Treatment | Lift | p-value | Significant? |
|--------|---------|-----------|------|---------|-------------|
| Primary: {metric} | ... | ... | +X% | 0.03 | Yes |
| Guardrail: {metric} | ... | ... | -X% | 0.12 | No |

**Recommendation**: {Ship / Iterate / Kill}
**Reasoning**: {statistical and practical interpretation}
```

**Interpretation rules:**
- p < 0.05 on primary metric AND no significant guardrail degradation -> Ship
- p < 0.05 on primary metric BUT guardrail degradation -> Investigate further before shipping
- p >= 0.05 -> Inconclusive; either run longer or accept no significant difference
- Always check practical significance, not just statistical significance

### Step 8: Attribution and Root Cause

For metrics with significant changes, perform root cause attribution:

```markdown
## Root Cause Analysis: {Metric} {increased/decreased} by {X%}

### Hypotheses
| # | Hypothesis | Evidence | Confidence |
|---|-----------|----------|-----------|
| 1 | {hypothesis} | {data point} | High/Medium/Low |
| 2 | {hypothesis} | {data point} | High/Medium/Low |

### Most Likely Root Cause
{Narrative explanation connecting evidence to conclusion}

### Confounding Factors
- {External event, seasonality, data quality issue, etc.}
```

### Step 9: Action Recommendations

Based on the analysis, output prioritized action items:

```markdown
## Action Recommendations

| Priority | Action | Expected Impact | Effort | Owner |
|----------|--------|----------------|--------|-------|
| P0 | {action} | {metric improvement} | S/M/L | {team/person} |
| P1 | {action} | {metric improvement} | S/M/L | {team/person} |
| P2 | {action} | {metric improvement} | S/M/L | {team/person} |
```

### Step 10: Generate Report

Save the complete review to `docs/metrics-review/MR-{product}-{period}.md`:

```markdown
# Product Metrics Review: {Product} - {Period}

**Date**: {current date}
**Author**: {name or [TBD]}
**Period**: {start date} to {end date}

## Executive Summary
(3-5 sentences: key findings and recommended actions)

## Metric Health Dashboard
(Health status table)

## North Star Decomposition
(Metric hierarchy and component analysis)

## Deep Dives
(Trend analysis, funnel analysis, retention analysis for flagged metrics)

## A/B Experiment Results
(If applicable)

## Root Cause Analysis
(For significant metric changes)

## Action Recommendations
(Prioritized action items)

## Appendix
(Data sources, methodology notes, caveats)
```

## Key Principles

- **Decompose before concluding**: A flat or declining aggregate metric often hides segments that are thriving and segments that are crashing. Always decompose first.
- **Distinguish signal from noise**: Short-term fluctuations are normal. Look for sustained trends (7+ days) before raising alarms.
- **Correlation is not causation**: A metric change coinciding with a feature launch does not prove the feature caused the change. Check for confounders.
- **Actionable over comprehensive**: A review that generates 20 observations but no actions is useless. Every section should lead to a "therefore we should..." statement.
- **State confidence levels**: When data is limited or noisy, say so. A 50% confidence conclusion with a plan to validate is better than a false 100% certainty.

## Related Skills

- [[csp-product-pulse]] - for recurring lightweight health checks between deep reviews
- [[csp-prd-generation]] - PRD defines the metrics and tracking events that feed into reviews
- [[csp-requirement-prioritization]] - use metrics data to inform RICE Impact scoring
- [[csp-strategy]] - align metric targets with long-term product strategy
