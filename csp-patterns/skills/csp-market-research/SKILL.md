---
name: csp-market-research
description: >
  Market research that supports decisions, and the reports that carry it. Two modes:
  (1) decision-oriented research — market sizing, competitor comparisons, investor dossiers,
  technology scans, with source attribution and a go/no-go verdict; (2) comprehensive 50+ page
  consulting-grade report (McKinsey/BCG/Gartner style) with LaTeX formatting, generated visuals,
  and multi-framework analysis (Porter's Five Forces, PESTLE, SWOT, TAM/SAM/SOM, BCG Matrix).
  Use when the user wants market sizing, competitor comparisons, fund/industry intelligence,
  a market-entry or due-diligence report, or any research that informs a business decision.
  Triggers: "市场调研", "market research", "market sizing", "竞品对比", "investor dossier",
  "industry report", "行业分析报告", "due diligence", "TAM SAM SOM", "market entry".
version: "2.0.0"
layer: 3
category: patterns
domain: patterns
phase: define
scope: analysis
tools: [Read, Write, Edit, Bash, Glob, Grep, WebFetch, WebSearch, Agent]

dependencies:
  skills: []

related_skills:
  - csp-deep-research
  - csp-competitive-analysis
  - csp-product-research
  - csp-research-report-writing
  - csp-tech-diagram
  - csp-fal-ai-media
  - csp-multi-review

anti_rationalizations:
  "Research theater": "A research deliverable that doesn't end in a decision is theater. Every report ends with a verdict or an explicit action table."
  "The market size is obvious": "TAM/SAM/SOM is a model with assumptions, not a lookup. State the bottom-up build and cross-validate; never quote a single round number as fact."
  "We can skip the sources": "Every important claim needs a source. Unsourced market numbers are downgraded to qualitative statements."
  "Visuals are decoration": "Each chart must carry one independent argument. If removing it doesn't break the argument, delete it."

triggers:
  keywords: ["市场调研", "market research", "market sizing", "竞品对比",
             "investor dossier", "industry report", "行业分析报告", "due diligence",
             "TAM SAM SOM", "market entry", "市场进入", "market analysis"]
  intents:
    - "user wants market sizing or competitor comparison to inform a decision"
    - "user needs a comprehensive consulting-grade market report (50+ pages)"
    - "user is preparing due-diligence or market-entry materials"
  context: ["define", "strategy_planning", "before_prd_writing"]
---

# Market Research

Produce research that supports decisions — not research theater. This skill has two modes: a light **decision-oriented** mode for a quick verdict, and a heavy **comprehensive-report** mode for a 50+ page consulting-grade deliverable. Route by the decision the user is trying to make.

This skill operates in the **`define`** lifecycle phase. Read `shared/references/research-lifecycle-protocol.md` for the cross-cutting behavioral norms (zero fabrication, source grading A–E, time-window discipline, forced disconfirmation, decision-oriented output) — they apply on top of this skill's own rules.

## When to Activate

- researching a market, category, company, investor, or technology trend
- building TAM/SAM/SOM estimates
- comparing competitors or adjacent products
- preparing investor dossiers before outreach
- pressure-testing a thesis before building, funding, or entering a market
- producing a comprehensive market report for investment, strategic planning, M&A diligence, or thought leadership

## Research Standards (both modes)

1. **Every important claim needs a source.** Unsourced market numbers (CAGR, share, TAM) are downgraded to qualitative statements.
2. **Prefer recent data and call out stale data.** Default time window: 12 months trailing; data >24 months is marked "may be outdated".
3. **Include contrarian evidence and downside cases.** Each conclusion carries ≥1 counter datapoint.
4. **Translate findings into a decision**, not just a summary. End with a verdict or an action table.
5. **Separate fact, inference, and recommendation** clearly (see the lifecycle protocol's evidence labeling).

---

## Mode 1: Decision-Oriented Research (light)

For a quick verdict that informs a build / fund / enter decision. Output: a concise Markdown report under `docs/market-research/<topic-slug>/`.

### Common research modes

**Investor / fund diligence** — collect: fund size, stage, typical check size; relevant portfolio companies; public thesis and recent activity; fit reasons and mismatches; red flags.

**Competitive analysis** — collect: product reality (not marketing copy); funding and investor history if public; traction metrics if public; distribution and pricing clues; strengths, weaknesses, positioning gaps. (For a full structured competitor report with SWOT/Porter, use `csp-competitive-analysis`.)

**Market sizing** — use TAM → SAM → SOM with clear assumptions. Cross-validate top-down with a bottom-up build. State the build, don't quote a single number.

**Technology scan** — map the landscape, maturity (TRL / hype-cycle position), adoption, and who is building what.

### Workflow
1. Clarify the decision the research must inform (1–2 questions).
2. Break the topic into 3–5 sub-questions.
3. Search (`WebSearch` + `WebFetch`); use `csp-deep-research` for multi-source synthesis with citations.
4. Apply the relevant framework (TAM/SAM/SOM, Porter, PESTLE, SWOT).
5. Write the report to `docs/market-research/<topic-slug>/report.md` with a page-one verdict + action table.
6. Surface the verdict and the file path in chat.

---

## Mode 2: Comprehensive Report (50+ pages, consulting-grade)

A professional-grade market research report modeled after top consulting-firm deliverables. Output: LaTeX → PDF, 50+ pages, visual-rich, multi-framework. Project layout under `docs/market-reports/<topic-slug>/`.

### Key features
- **50+ pages**, no token constraints — write fully, don't abbreviate.
- **Visual-rich**: 6 essential visuals generated first (more as needed). Use `csp-tech-diagram` for charts/diagrams/matrices and `csp-fal-ai-media` for infographics/illustrations.
- **Multi-framework**: Porter's Five Forces, PESTLE, SWOT, BCG Matrix, TAM/SAM/SOM.
- **Professional formatting**: the `market_research.sty` LaTeX style package for consistent typography, colored boxes, and tables.
- **Actionable recommendations**: strategic focus with an implementation roadmap.

### When to use Mode 2
- comprehensive market analysis for investment decisions
- industry reports for strategic planning
- competitive-landscape and market-dynamics analysis
- market sizing (TAM/SAM/SOM)
- market-entry evaluation, M&A diligence, go-to-market documentation
- thought-leadership content, business cases for new product launches

### Report structure (50+ pages)

**Front matter (~5p):** cover (title, subtitle, hero visual, date, prepared for/by) · TOC + list of figures + list of tables · executive summary (market snapshot box, investment thesis 3–5 bullets, key findings, top 3–5 recommendations, executive infographic).

**Core analysis (~35p):**
1. Market overview & definition (ecosystem, stakeholders, boundaries, history)
2. Market size & growth (TAM/SAM/SOM, historical + projected, regional + segment breakdown, drivers/inhibitors)
3. Industry drivers & trends (PESTLE, trend impact matrix)
4. Competitive landscape (Porter's Five Forces, positioning matrix, strategic groups, barriers)
5. Customer analysis & segmentation (segmentation matrix, value-proposition canvas, journey)
6. Technology & innovation landscape (TRL, hype cycle, roadmap, patents)
7. Regulatory & policy environment (framework, bodies, compliance, upcoming changes)
8. Risk analysis (risk heatmap, register, mitigation matrix)

**Strategic recommendations (~10p):**
9. Strategic opportunities & recommendations (opportunity matrix, build/buy/partner/ignore, priority matrix)
10. Implementation roadmap (phased plan, milestones, resources, Gantt)
11. Investment thesis & financial projections (revenue projections, scenario analysis, ROI, sensitivity)

**Back matter (~5p):** appendix A methodology & data sources · appendix B detailed data tables · appendix C company profiles · references (BibTeX).

Detailed per-section content requirements, visual lists, and data-point checklists: [references/report_structure_guide.md](references/report_structure_guide.md).

### Workflow

**Phase 1 — Research & data gathering.** Define scope (market definition, geography, time horizon, key questions). Use `csp-deep-research` extensively for market size, competitive landscape, trends, regulation. Organize data into a `sources/` folder by section; identify gaps; follow up.

**Phase 2 — Analysis & framework application.** Apply each framework with structured analysis (TAM→SAM→SOM with assumptions; Porter rated High/Medium/Low with rationale; PESTLE per dimension; SWOT internal/external; positioning on defined axes). Synthesize insights and prioritize opportunities. Patterns and templates: [references/data_analysis_patterns.md](references/data_analysis_patterns.md).

**Phase 3 — Visual generation.** Generate visuals BEFORE writing. Use the batch script:
```bash
python scripts/generate_market_visuals.py --topic "[MARKET]" --output-dir figures/
# dry-run to preview the prompt catalog:
python scripts/generate_market_visuals.py --topic "[MARKET]" --output-dir figures/ --dry-run
```
The script emits curated prompts for the 6 core visuals (market growth, TAM/SAM/SOM, Porter, positioning, risk heatmap, executive infographic) plus an extended set. Without `CSP_DIAGRAM_CMD`/`CSP_IMAGE_CMD` env vars it emits prompts to feed the `csp-tech-diagram` / `csp-fal-ai-media` skills; with them set, it shells out. Full prompt catalog: [references/visual_generation_guide.md](references/visual_generation_guide.md).

**Phase 4 — Report writing.** Initialize the project structure:
```
docs/market-reports/<topic-slug>/
├── progress.md
├── drafts/v1_market_report.tex
├── references/references.bib
├── figures/                 ← generated visuals
├── sources/                  ← research notes
└── final/                    ← compiled PDF
```
Use `assets/market_report_template.tex` as the starting point and `assets/market_research.sty` for styling. Write each section per the structure guide: comprehensive coverage, data-driven, visual integration, consulting tone, no abbreviation. Follow `csp-research-report-writing` craft (verdict-first titles, page-one action table, tension pairing). Formatting reference: [assets/FORMATTING_GUIDE.md](assets/FORMATTING_GUIDE.md).

**Phase 5 — Compilation & review.** Compile:
```bash
cd docs/market-reports/<topic-slug>/drafts/
xelatex v1_market_report.tex && bibtex v1_market_report && xelatex v1_market_report.tex && xelatex v1_market_report.tex
```
Quality review against the 50+ page checklist (structure completeness, core 5–6 visuals, content quality, technical quality — see [references/report_structure_guide.md](references/report_structure_guide.md)). Use `csp-multi-review` for a peer review pass.

### Quality standards

| Section | Min pages | Target |
|---------|-----------|--------|
| Front matter | 4 | 5 |
| Market overview | 4 | 5 |
| Market size & growth | 5 | 7 |
| Industry drivers | 4 | 6 |
| Competitive landscape | 5 | 7 |
| Customer analysis | 3 | 5 |
| Technology landscape | 3 | 5 |
| Regulatory environment | 2 | 4 |
| Risk analysis | 2 | 4 |
| Strategic recommendations | 3 | 5 |
| Implementation roadmap | 2 | 4 |
| Investment thesis | 2 | 4 |
| Back matter | 4 | 5 |
| **Total** | **43** | **66** |

**Data quality:** data ≤2 years old (prefer current year); all statistics sourced; cross-reference multiple sources; state projection assumptions; acknowledge gaps.
**Visual quality:** ≥300 DPI; colorblind-friendly; consistent palette; all axes/legends labeled; sources in captions.
**Writing quality:** objective (balanced, acknowledge uncertainty); clear (define jargon); precise (specific numbers over vague qualifiers); structured; actionable.

## Artifact structure

```
<repo-root>/
├── docs/
│   ├── market-research/<topic-slug>/report.md   ← Mode 1 light report
│   └── market-reports/<topic-slug>/             ← Mode 2 comprehensive report
│       ├── drafts/v1_market_report.tex
│       ├── figures/
│       ├── sources/
│       └── final/v1_market_report.pdf
└── .csp/research/<topic-slug>/                  ← runtime state (gitignored)
```

## Related Skills

- [[csp-deep-research]] — multi-source web research with citations (the data-gathering engine for both modes)
- [[csp-competitive-analysis]] — structured competitor report with source grading (use for the competitive-landscape chapter)
- [[csp-product-research]] — venture-direction evaluation suite (use when the question is "should we build this?")
- [[csp-research-report-writing]] — the 8-rule report writing craft (apply to both modes' prose)
- [[csp-tech-diagram]] — charts, matrices, diagrams (Mode 2 visuals)
- [[csp-fal-ai-media]] — infographics and illustrations (Mode 2 visuals)
- [[csp-multi-review]] — peer-review pass before finalizing
