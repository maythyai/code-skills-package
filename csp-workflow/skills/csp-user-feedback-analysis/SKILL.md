---
name: csp-user-feedback-analysis
description: >
  Analyze user feedback data (Excel/CSV/text) to auto-classify, extract high-frequency patterns,
  and output an insight report with sentiment analysis, pain point ranking, and improvement suggestions.
  Supports topic clustering, trend analysis, and triangulation to extract user personas from feedback.
  Use when the user says "用户反馈", "反馈分析", "用户声音", "VOC分析", "NPS分析",
  "用户评价分析", "应用商店评论", "客诉分析", "用户调研", "满意度分析", "差评分析",
  "好评分析", "反馈聚类", "反馈趋势", "用户画像提炼", "user feedback", "feedback analysis",
  "VOC", "voice of customer", "NPS analysis", "app store review analysis".
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
  - csp-prd-generation
  - csp-requirement-prioritization
  - csp-competitive-analysis
  - csp-product-discovery-orchestrator

anti_rationalizations:
  "A few complaints don't represent all users": "Even 5% of users complaining about the same thing is a systemic issue."
  "The feedback is too noisy to analyze": "Noise is signal. Categorize first, then filter."
  "We already know what users want": "Assumptions without feedback data are guesses. Validate with evidence."

triggers:
  keywords: ["用户反馈", "反馈分析", "用户声音", "VOC分析", "NPS分析", "用户评价分析",
             "应用商店评论", "客诉分析", "用户调研", "满意度分析", "差评分析", "好评分析",
             "反馈聚类", "反馈趋势", "用户画像提炼", "user feedback", "feedback analysis",
             "VOC", "voice of customer", "app store review"]
  intents:
    - "user wants to analyze user feedback data for patterns and insights"
    - "user has a collection of reviews or support tickets to process"
    - "user wants to understand user sentiment and pain points from feedback"
  context:
    - "after_feature_launch"
    - "quarterly_review"
    - "pre_prd_writing"
---

# User Feedback Analysis

Analyze user feedback data from any source (app store reviews, support tickets, NPS surveys,
social media comments, in-app feedback forms) to extract actionable insights. Outputs a structured
report with sentiment analysis, pain point ranking, topic clustering, and improvement recommendations.

## When to Use

- After a feature launch, to assess user reception and identify issues
- Before writing a PRD, to ground requirements in real user feedback
- During quarterly review, to track sentiment trends and emerging pain points
- When the team needs to prioritize bug fixes or UX improvements based on user impact
- When preparing for a product strategy meeting and needs user evidence

## When NOT to Use

- The user needs real-time feedback monitoring (set up a recurring pulse instead)
- The feedback volume is under 10 items (analyze manually; clustering adds no value)
- The user needs to design a user research study (use a dedicated research planning skill)

## Process

### Step 1: Data Ingestion and Normalization

Accept feedback data in any of these formats:

| Format | Source Examples | Processing |
|--------|----------------|------------|
| **CSV/Excel** | Exported from Zendesk, Intercom, app store | Parse rows as individual feedback items |
| **Plain text** | Copied from Slack, email threads | Split by paragraph or delimiter |
| **JSON** | API export from feedback tools | Parse structured fields |
| **Pasted text** | User pastes directly into chat | Split by line breaks or numbered items |

Normalize each feedback item into a standard record:

```yaml
feedback_item:
  id: "F-{seq}"
  raw_text: ""
  source: "app_store | support_ticket | nps_survey | social_media | in_app | other"
  date: "YYYY-MM-DD"
  rating: 1-5 or null
  user_identifier: "anonymous | segment label"
  channel: "iOS App Store | Google Play | Email | Chat | Survey | ..."
```

**Data quality check:**
- Remove duplicates (exact text match)
- Flag items with < 10 characters as potentially low-signal
- Note the total count, date range, and source distribution

### Step 2: Sentiment Analysis

Classify each feedback item by sentiment:

| Sentiment | Criteria | Action Implication |
|-----------|---------|-------------------|
| **Positive** | Expresses satisfaction, praise, or delight | Reinforce what's working; identify delighters |
| **Neutral** | Factual statement, question, or mixed signal | Investigate for latent needs or confusion |
| **Negative** | Expresses frustration, complaint, or disappointment | Prioritize for fix; identify pain points |
| **Urgent Negative** | Threatens churn, mentions competitor switch, or reports data loss | Escalate immediately |

Output sentiment distribution:

```markdown
## Sentiment Distribution

| Sentiment | Count | Percentage | Trend vs. Previous Period |
|-----------|-------|-----------|--------------------------|
| Positive | ... | ...% | +/- X% |
| Neutral | ... | ...% | +/- X% |
| Negative | ... | ...% | +/- X% |
| Urgent Negative | ... | ...% | +/- X% |

**Net Sentiment Score**: {positive% - negative%} (range: -100 to +100)
```

### Step 3: Topic Clustering

Group feedback items into thematic clusters. Use a two-level hierarchy:

**Level 1: Category** (broad functional area)
- Onboarding & First Use
- Core Feature Usage
- Performance & Reliability
- Pricing & Billing
- UI/UX & Design
- Customer Support
- Feature Requests
- Other

**Level 2: Sub-topic** (specific issue within category)

For each cluster, compute:
- Frequency (count of items)
- Sentiment ratio (positive/negative within cluster)
- Representative quotes (2-3 most illustrative items)

```markdown
## Topic Clusters

### Cluster: {Category} > {Sub-topic}
**Frequency**: {count} items ({percentage}% of total)
**Sentiment**: {X%} negative, {Y%} positive
**Key Quotes**:
- "{representative quote 1}"
- "{representative quote 2}"
**Pattern**: {What the cluster reveals about user needs or pain points}
```

**Clustering rules:**
- A cluster needs at least 3 items to be significant (fewer = individual issue, not pattern)
- Merge clusters that overlap >50% in content
- Flag "emerging clusters" (new topics not seen in previous period)

### Step 4: Pain Point Ranking

Rank pain points by a composite severity score:

**Severity Score = Frequency x Intensity x Business Impact**

| Factor | Scale | Definition |
|--------|-------|-----------|
| **Frequency** | 1-5 | How many users report this (1=rare, 5=ubiquitous) |
| **Intensity** | 1-5 | How strongly users feel about it (1=mild annoyance, 5=dealbreaker) |
| **Business Impact** | 1-5 | How much this affects key metrics (1=minimal, 5=causes churn/revenue loss) |

```markdown
## Pain Point Ranking

| Rank | Pain Point | Frequency | Intensity | Business Impact | Severity Score | Affected Users |
|------|-----------|-----------|-----------|----------------|---------------|---------------|
| 1 | {description} | 4 | 5 | 4 | 80 | ~X% of users |
| 2 | {description} | 5 | 3 | 3 | 45 | ~X% of users |
| 3 | {description} | 3 | 4 | 4 | 48 | ~X% of users |
```

### Step 5: Trend Analysis (if historical data available)

Compare current period feedback with previous periods:

```markdown
## Feedback Trends

### Rising Topics (increasing frequency or intensity)
| Topic | Previous Period | Current Period | Change |
|-------|----------------|---------------|--------|
| {topic} | {count/sentiment} | {count/sentiment} | {direction and magnitude} |

### Declining Topics (resolved or less relevant)
| Topic | Previous Period | Current Period | Change |
|-------|----------------|---------------|--------|

### New Topics (not present in previous period)
| Topic | Count | First Seen | Possible Trigger |
|-------|-------|-----------|-----------------|
```

### Step 6: Triangulation and Persona Extraction

Cross-reference feedback patterns to extract user personas:

```markdown
## User Personas from Feedback

### Persona: {Name}
**Behavioral Signals**: {Patterns in feedback that define this persona}
**Primary Needs**: {What this persona consistently asks for}
**Primary Frustrations**: {What this persona consistently complains about}
**Estimated Share**: {X% of feedback items match this persona}
**Representative Quotes**:
- "{quote}"
```

**Triangulation**: Validate findings across multiple data sources:
- If app store reviews AND support tickets both mention the same issue -> high confidence
- If only one source mentions it -> verify before acting
- Flag contradictions (e.g., NPS says satisfied but reviews say frustrated)

### Step 7: Improvement Recommendations

For each top pain point, generate an actionable recommendation:

```markdown
## Improvement Recommendations

| Priority | Pain Point | Recommendation | Expected Impact | Effort | Related Feature |
|----------|-----------|---------------|----------------|--------|----------------|
| P0 | {issue} | {specific action} | {metric improvement} | S/M/L | {feature area} |
| P1 | {issue} | {specific action} | {metric improvement} | S/M/L | {feature area} |
```

**Recommendation quality rules:**
- Each recommendation maps to a specific pain point (traceable)
- Includes expected impact (which metric it moves)
- Includes effort estimate (S/M/L)
- Flags whether it's a quick fix (< 1 sprint) or needs planning

### Step 8: Generate Report

Save the complete analysis to `docs/feedback-analysis/FA-{product}-{period}.md`:

```markdown
# User Feedback Analysis: {Product} - {Period}

**Date**: {current date}
**Data Source**: {sources and count}
**Period**: {start date} to {end date}

## Executive Summary
(3-5 sentences: key findings and top recommendations)

## Data Overview
(Total items, source distribution, date range, data quality notes)

## Sentiment Analysis
(Sentiment distribution and net sentiment score)

## Topic Clusters
(Thematic grouping with frequency and sentiment)

## Pain Point Ranking
(Severity-scored pain points)

## Trends
(Changes vs. previous period, if available)

## User Personas
(Personas extracted from feedback patterns)

## Improvement Recommendations
(Prioritized action items)

## Appendix
(Raw data summary, methodology notes, confidence levels)
```

## Key Principles

- **Frequency reveals patterns, intensity reveals urgency**: A complaint from 100 users about a minor annoyance may matter less than a complaint from 10 users about a dealbreaker.
- **Triangulate before acting**: One source can be biased. Cross-reference across channels before committing to a product decision.
- **Negative feedback is more actionable than positive**: Praise tells you what to maintain; complaints tell you what to fix. Weight negative feedback higher in prioritization.
- **Quote the user, don't paraphrase**: Representative quotes carry more weight in stakeholder discussions than summarized findings. Always include 2-3 verbatim quotes per cluster.
- **State data limitations**: If the sample is small, skewed toward one channel, or missing a time period, say so. A biased analysis is worse than no analysis.

## Anti-Patterns

| Anti-Pattern | Symptom | Correct Approach |
|-------------|---------|-----------------|
| Cherry-picking | Only highlighting feedback that supports pre-existing decisions | Present the full distribution; let stakeholders see the counter-evidence |
| Over-clustering | 30+ tiny clusters with 1-2 items each | Merge small clusters; focus on patterns with 3+ items |
| Sentiment without context | "70% negative" without explaining what users are negative about | Always pair sentiment with topic clusters |
| Ignoring silent majority | Only analyzing vocal complainers | Note that feedback represents engaged users; silent users may have different needs |

## Related Skills

- [[csp-product-metrics-review]] - combine feedback insights with quantitative metrics for full picture
- [[csp-prd-generation]] - use pain point findings to inform PRD feature prioritization
- [[csp-requirement-prioritization]] - feed pain point severity scores into RICE/ICE prioritization
- [[csp-competitive-analysis]] - compare feedback pain points with competitor strengths/weaknesses
