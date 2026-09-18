---
name: csp-competitive-analysis
description: >
  Structured competitive analysis with two modes: (1) a full framework report — feature
  comparison matrix, SWOT, Porter's Five Forces, differentiation strategy, branching by
  purpose (product design / fundraising BP / strategic planning / annual review); (2) a
  single-movement competitive-intelligence scan — business-scenario-driven, 6-month
  time-windowed, source-graded (A–E) recent-move digest. Both modes enforce zero fabrication
  and forced disconfirmation. Use when the user says "竞品分析", "功能对比", "竞品调研",
  "竞争分析", "竞品动向", "友商分析", "竞品扫描", "competitive analysis", "competitor
  research", "market analysis", "competitive intelligence".
version: "2.0.0"
layer: 2
category: workflow
phase: define
domain: patterns
scope: analysis
tools: [Read, Write, Edit, Glob, Grep, Bash, WebFetch, WebSearch]

dependencies:
  skills: []

related_skills:
  - csp-prd-generation
  - csp-brainstorming
  - csp-strategy
  - csp-mvp-scoping
  - csp-product-discovery-orchestrator

anti_rationalizations:
  "We don't have real competitors": "Every product has alternatives, including 'do nothing'. Find them. Search ≥3 rounds with different terms before concluding a gap."
  "Copying features is enough": "Feature lists miss positioning, pricing, and ecosystem differences."
  "SWOT is too generic": "SWOT is a starting frame, not the final answer. Pair it with Porter's Five Forces."
  "I recall this competitor move": "Model memory is not a source. Unsourced claims are fabrication. Retrieve, then cite."
  "The move is recent enough": "Adopt only information inside the trailing 6-month window. Out-of-window or undated sources are excluded, not quietly reused."
  "A blog said it, so it's a fact": "A lone self-media source is never sufficient. Flag it for cross-validation; prefer primary/official and authoritative sources."

triggers:
  keywords: ["竞品分析", "功能对比", "竞品调研", "竞争分析", "竞品动向", "友商分析",
             "竞品扫描", "对标调研", "competitor analysis",
             "市场调研", "产品对标", "功能对标", "竞品报告", "竞争格局", "五力分析",
             "竞品跟踪", "竞争战略", "competitor research", "market analysis",
             "competitive intelligence"]
  intents:
    - "user wants to analyze competitors before building a feature"
    - "user needs competitive landscape overview for a product decision"
    - "user is preparing a fundraising deck and needs market positioning"
    - "user wants a scenario-focused scan of recent competitor moves"
  context:
    - "before_prd_writing"
    - "strategy_planning"
---

# Competitive Analysis

Generate a structured competitive analysis report covering feature comparison, SWOT,
Porter's Five Forces, and differentiation strategy. The report adapts its depth and
emphasis based on the analysis purpose.

## When to Use

This skill has two modes:

- **Full framework report** — feature comparison matrix, SWOT, Porter's Five Forces, differentiation strategy. Use before PRD writing, during strategic planning, for a fundraising BP, or an annual review.
- **Single-movement competitive intelligence** — a scenario-focused, time-boxed (6-month) scan of recent competitor moves, each with a source-graded citation. Use when the user wants "what are competitors doing lately about X" for a specific business scenario. Full discipline: [references/source-grading.md](references/source-grading.md).

### When to use the full framework report
- Before writing a PRD, to understand the competitive landscape and identify differentiation opportunities
- During strategic planning, to assess market positioning and competitive threats
- When preparing a fundraising BP, to demonstrate market awareness and competitive moat
- During annual review, to update competitive intelligence and adjust product direction
- When entering a new market segment, to understand incumbent players and entry barriers

### When to use single-movement intelligence
- "What are competitors' latest moves on <specific capability>?" within a defined business scenario
- A lightweight, source-graded scan rather than a full structured report

## When NOT to Use

- The user needs UX/visual design benchmarking of competitor products (use `csp-product-pulse` or manual design audit)
- The user wants to benchmark technical architecture (use `csp-codebase-audit` on competitor open-source code)
- The user already has a complete competitive analysis and just wants to update one data point (edit the existing report)

## Source Credibility & Anti-Fabrication (both modes)

Both modes inherit the research-lifecycle behavioral norms (`shared/references/research-lifecycle-protocol.md`): zero fabrication, source grading, time-window discipline, forced disconfirmation. Specifics:

- **Zero fabrication:** every factual claim traces to a retrieved source. "I recall this from training" is fabrication. Unsourced numbers are downgraded to qualitative statements.
- **Time window:** single-movement mode adopts only the trailing **6 months** from the real current date (run `date` first). Undated sources are excluded. Full-report mode prefers data ≤12 months and calls out stale data.
- **Source grading (A–E):** primary/official and authoritative media sufficient alone; vertical media needs cross-check; self-media never sole source (flag `⚠ awaiting corroboration`); marketing copy is a lead only. Full table + conflict handling: [references/source-grading.md](references/source-grading.md).
- **Forced disconfirmation:** every "competitor is weak here" claim seeks a "competitor does this well" counter-example. Steel-man competitors; actively seek disconfirming evidence.
- **Business-scenario bound scope:** "interesting but irrelevant" findings are excluded. The interview step is mandatory.

## Process

### Step 1: Determine Analysis Purpose and Scope

Ask the user (or infer from context) which purpose drives this analysis:

| Purpose | Emphasis | Output Length |
|---------|----------|---------------|
| **Product Design** | Feature comparison, UX patterns, pricing models | Medium (focus on actionable feature insights) |
| **Fundraising BP** | Market size, competitive moat, positioning map | Short (focus on narrative and differentiation) |
| **Strategic Planning** | Porter's Five Forces, market dynamics, long-term positioning | Long (comprehensive strategic analysis) |
| **Annual Review** | Year-over-year changes, emerging threats, opportunity shifts | Medium (delta-focused, not from scratch) |

Collect:
- **Product/domain**: What product or market to analyze
- **Known competitors**: User-provided list (if any)
- **Analysis depth**: Quick scan (3 competitors) or deep dive (5-8 competitors)

### Step 2: Competitor Identification and Classification

Identify and classify competitors into three tiers:

| Tier | Definition | Analysis Depth |
|------|-----------|---------------|
| **Direct** | Same target user, same core need, similar solution | Full analysis |
| **Indirect** | Same target user, different solution to same need | Medium analysis |
| **Benchmark** | Different market but exemplary in relevant dimensions | Selective analysis |

For each competitor, gather:
- Product name, company, founding year, funding stage
- Target users and core value proposition
- Key features and pricing model
- Market position and estimated scale

### Step 3: Feature Comparison Matrix

Build a feature comparison matrix:

```markdown
| Feature | Our Product | Competitor A | Competitor B | Competitor C |
|---------|------------|-------------|-------------|-------------|
| Feature 1 | Full / Partial / None | ... | ... | ... |
| Feature 2 | ... | ... | ... | ... |
```

Rate each cell: Full (complete implementation), Partial (limited/partial), None (absent), Planned (announced but not shipped).

After the matrix, identify:
- **Parity features**: Everyone has them; table stakes
- **Differentiation features**: Where we lead or lag
- **White space**: Features no one offers but users need

### Step 4: SWOT Analysis

For our product and each direct competitor, fill the SWOT matrix:

```markdown
## Our Product SWOT
| Strengths | Weaknesses |
|-----------|-----------|
| Internal advantages | Internal gaps |

| Opportunities | Threats |
|--------------|---------|
| External tailwinds | External risks |
```

Cross-reference SWOT across competitors to identify:
- Where our strengths exploit competitor weaknesses
- Where competitor strengths expose our vulnerabilities
- Which opportunities are contested vs. uncontested

### Step 5: Porter's Five Forces (Strategic Planning Purpose)

Analyze the five competitive forces:

| Force | Key Question | Rating (High/Medium/Low) |
|-------|-------------|------------------------|
| **Threat of new entrants** | How easy is it for new players to enter? | |
| **Bargaining power of buyers** | How much leverage do customers have? | |
| **Bargaining power of suppliers** | How dependent are we on key suppliers? | |
| **Threat of substitutes** | What alternatives exist outside direct competition? | |
| **Competitive rivalry** | How intense is current competition? | |

Synthesize into an overall industry attractiveness assessment and strategic implications.

### Step 6: Differentiation Strategy

Based on the analysis, recommend a differentiation strategy:

```markdown
## Differentiation Strategy

### Positioning Statement
For [target user] who [need], our product is [category] that [key benefit].
Unlike [alternative], we [key differentiator].

### Competitive Moat
| Moat Type | Status | Investment Needed |
|-----------|--------|-------------------|
| Network effects | ... | ... |
| Switching costs | ... | ... |
| Data advantage | ... | ... |
| Brand | ... | ... |
| Scale economics | ... | ... |

### Recommended Actions
1. **Offensive**: Where to attack competitor weaknesses
2. **Defensive**: Where to protect our advantages
3. **Neutral**: Where to achieve parity to remove competitive disadvantage
```

### Step 7: Generate Report

Save the full framework report to `docs/competitive-analysis/<product>-<date>.md`. Save single-movement intelligence to `docs/competitive-intel/<date>-<topic-slug>.md` (template and self-check: [references/source-grading.md](references/source-grading.md); worked example: [references/worked-example.md](references/worked-example.md)).

The report structure:
1. Executive Summary (1 paragraph)
2. Competitor Landscape (identification + classification)
3. Feature Comparison Matrix
4. SWOT Analysis (cross-referenced)
5. Porter's Five Forces (if strategic planning purpose)
6. Differentiation Strategy
7. Appendix (data sources, assumptions, date of analysis)

## Key Principles

- **Analysis purpose drives depth**: A fundraising BP needs narrative, not a 50-feature matrix. Match the output to the audience.
- **Feature comparison is a starting point, not the answer**: Features alone miss pricing, positioning, ecosystem, and execution speed differences.
- **Date-stamp everything**: Competitive landscapes change. Every analysis should note when data was collected.
- **Distinguish facts from inference**: Mark clearly when a claim is verified data vs. estimation vs. assumption.
- **Actionable over encyclopedic**: Every section should lead to a "so what" - a decision the reader can make.

## Anti-Patterns

| Anti-Pattern | Symptom | Correct Approach |
|-------------|---------|-----------------|
| Feature obsession | 100-row feature matrix with no synthesis | Matrix + "so what" synthesis for each cluster |
| Static snapshot | Analysis treats competition as frozen in time | Note trends: who is investing, who is retreating |
| Confirmation bias | Only finding evidence that supports pre-existing strategy | Actively seek disconfirming evidence and steel-man competitors |
| Ignoring indirect competitors | "We have no real competitors" | If users solve the problem with spreadsheets, that's a competitor |

## Related Skills

- [[csp-prd-generation]] - use competitive insights to inform PRD feature prioritization
- [[csp-brainstorming]] - generate differentiation ideas after competitive analysis
- [[csp-strategy]] - align competitive positioning with long-term product strategy
- [[csp-mvp-scoping]] - use competitive gaps to define MVP differentiators
- [[csp-market-research]] - market sizing and consulting-grade reports (broader than competitors alone)
- [[csp-product-research]] - venture-direction evaluation that includes a competitor deep-dive module
- [[csp-account-research]] - B2B target-account batch research pipeline
- [[csp-research-report-writing]] - the report writing craft for this skill's deliverable
- [[csp-deep-research]] - multi-source web research with citations
