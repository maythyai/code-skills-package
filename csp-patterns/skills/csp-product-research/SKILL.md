---
name: csp-product-research
description: >
  Scientific, comprehensive product & business-direction research suite. Covers five
  scenarios: venture-direction evaluation, industry scan, competitor deep-dive, customer
  insight, and unit-economics. AI completes all desk research autonomously and outputs a
  structured report + Lean Canvas + decision memo. Built on 35+ methodologies with strict
  data-quality rules. Activate even when the user does not say "research" — any question
  about direction feasibility, market opportunity, or competitive landscape ("can this be
  done?", "is anyone doing this?", "how big is the market?") triggers systematic analysis.
  Explicit triggers: "评估这个方向", "能不能做", "行业分析", "竞品分析", "客户洞察",
  "经济模型", "商业验算", "创业调研", "方向评估", "市场调研", "这个赛道怎么样",
  "有没有机会", "evaluate this direction", "market sizing", "is there an opportunity".
version: "1.0.0"
layer: 3
category: patterns
domain: patterns
phase: define
scope: analysis
tools: [Read, Write, Edit, Bash, Glob, Grep, WebFetch, WebSearch, Agent]

dependencies:
  skills: []

related_skills:
  - csp-market-research
  - csp-competitive-analysis
  - csp-research-report-writing
  - csp-deep-research
  - csp-strategy

anti_rationalizations:
  "No competitors exist": "Every direction has alternatives, including 'do nothing'. Search ≥3 rounds with different terms before concluding a gap."
  "The market is blank": "A blank result is a search failure, not a market opportunity. Expand keywords (synonym / hypernym / English / government / company-registry)."
  "I recall this number": "Model memory is not a source. Unsourced numbers are downgraded to qualitative statements."
  "Has pain point, therefore will pay": "Need is real ≠ business is viable. Apply the five-layer falsification (demand / willingness-to-pay / scale / defensibility / team)."

triggers:
  keywords: ["评估方向", "能不能做", "行业分析", "竞品分析", "客户洞察", "经济模型",
             "商业验算", "创业调研", "方向评估", "市场调研", "赛道", "有没有机会",
             "evaluate direction", "market sizing", "opportunity assessment", "is there an opportunity"]
  intents:
    - "user wants to assess whether a venture direction is viable"
    - "user asks about market size, competition, or customer demand before building"
    - "user needs a go/no-go/pivot decision backed by research"
  context: ["define", "strategy_planning", "before_prd_writing"]
---

# Product Research

> Scientific, comprehensive, deep product & business-direction research suite. Covers venture-direction evaluation, industry scan, competitor deep-dive, customer insight, and unit-economics. The AI autonomously completes all desk research and outputs a structured report + Lean Canvas + decision memo. 35+ methodologies, strict data-quality rules.

This skill operates in the **`define`** lifecycle phase — it de-risks a direction *before* code is written. Read `shared/references/research-lifecycle-protocol.md` for the cross-cutting behavioral norms (zero fabrication, time-window discipline, source grading, forced disconfirmation) — they apply on top of this skill's own rules.

## Entry Routing

Route by user intent:

| User intent | Entry | Output |
|-------------|-------|--------|
| Assess whether a venture direction can be done | **Full flow** (Phase 0–3) | Deep report + Lean Canvas + decision memo |
| Understand an industry landscape, no decision | **Module A: Industry Scan** | Industry panorama report |
| Deeply analyze a few competitors | **Module B: Competitor Deep-Dive** | Competitor deep-analysis report |
| Study who the users are and what they need | **Module C: Customer Insight** | Customer insight report |
| Calculate whether the model can make money | **Module D: Unit Economics** | Unit-economics report |

**Routing rule:** user gives a direction + wants a decision → full flow; user wants one dimension only → the corresponding module.

---

## Core Principles

- **Landscape before detail; objective research before subjective judgment.**
- **No reasoning in place of evidence:** competitive landscape, market size, and policy dynamics require 2–3 rounds of `WebSearch`. Never conclude "no competitors / blank market / the giant hasn't done this" from model memory.
- **Time-awareness:** all searches are based on the real current date; queries carry the current year; data ≤12 months old is preferred.
- **Forced disconfirmation:** every conclusion has a pro and a con.
- **Opportunities and risks weighted equally:** if risks get N bullets, advantages get N bullets — preventing latent pessimism bias.
- **Explicit unknowns:** known-unknowns and unknown-unknowns are both listed.
- **Traceable data:** every data point carries a source and a confidence grade.

## Interaction Principles

1. **Phases 0–1.5 need no user participation:** the AI completes all desk research and produces a complete report.
2. **Phase 2 is user confirmation:** show report + Canvas; user corrects and answers judgment questions.
3. **Phase 3 is user execution:** the AI prepares the interview outline and tools; the user does real conversations and the final decision.
4. **One question at a time** in Phase 2 — guide gradually, never dump all questions.
5. **Direct tone:** like a strict investment analyst. No鸡汤. Data speaks.
6. **Red lines are decisive:** trigger → immediate verdict, no dragging.
7. **B2B/B2C auto-adapt:** switch paths by the confirmed business model.

**Standalone module use:** after confirming prerequisites, the AI runs the full module autonomously; after output, the user may request a deeper chapter.

---

## Data-Quality Rules

All outputs obey the 10 data-quality rules in [data-quality-rules.md](references/data-quality-rules.md). Core points: five-element annotation (source + timeliness + scope + confidence + applicability), time-aware search (current date + year filter), high-hallucination-number control, source-verification before writing, forced disconfirmation.

> Why strict data quality: AI desk research naturally produces hallucinated numbers; unsourced data leads to decisions built on false premises.

---

## Full Flow: Venture-Direction Deep Research & Evaluation

### Prerequisite Confirmation (must complete before starting)

After receiving the direction to evaluate, confirm:

1. **Direction name:** one-sentence description.
2. **Business model:** B2B / B2C / B2B2C / mixed.
3. **Team background:** size, core capabilities, existing resources (used later for team-fit evaluation).
4. **End-state goal:** what do you want to build? (one sentence)

Adapt subsequent analysis paths by business model (B2B / B2C / B2B2C).

---

### Phase 0: Dead-End Detection (5 min)

**Purpose:** quickly rule out obviously infeasible directions before deep research.

Detect four structural dead-ends:

1. **Giant free-crush:** a major player already has a free or very-low-price solution, with no differentiation space.
2. **Economics clearly fail:** rough LTV < CAC; cannot be profitable under any optimization.
3. **Regulation explicitly prohibits:** policy red line.
4. **Team genes completely mismatch:** required core capabilities have zero overlap with the team's, and cannot be filled short-term.

**Verdict rule:**
- Hit any one → kill directly, output a one-sentence reason, do not enter Phase 1.
- Hit none → enter Phase 0.5.

---

### Phase 0.5: Category-Ladder Positioning (2–3 min)

**Purpose:** prevent over-narrow scope, missing non-obvious competitors and substitutes.

Draw the category ladder:

```
Example:
  AI BI Agent (user-given topic)
    ↑ parent category: enterprise BI / data-analysis tools
    ↑ one level up: enterprise data consumption / data monetization

Two layers:
  Panorama layer (for horizontal scan, seek breadth): enterprise BI + data-analysis services +
    the "do nothing" invisible substitute + directly using a general LLM to write SQL
  Deep-dive layer (for competitor deep-dive, seek depth): AI BI Agent + FDE-mode data services
```

**Rules:**
- Panorama scan runs at the panorama layer: breadth search, horizontal competitor inventory, value chain.
- Competitor deep-dive runs at the deep-dive layer: five-element deep profile of the sub-category the user actually cares about.
- The report must explicitly mark the boundary of both layers.

---

### Phase 1: Four-Way Parallel Deep Research (20–40 min)

**Execution:** dispatch 4 parallel research agents (use the `Agent` tool / subagents) plus the AI itself, 4 ways in parallel. No user participation.

```
Phase 1 parallel:
├── 1A Market scan (industry-scan module)
├── 1B Competitor deep-dive (competitor module)
├── 1C Customer insight (customer module)
└── 1D Unit economics (economics module)
```

Each agent uses `WebSearch` autonomously. Each output obeys the data-quality rules.

**3C analysis spine:** the four ways organize around the 3C strategy triangle:
- **Customer:** 1C — who are the customers, what do they need, why pay.
- **Competitor:** 1B — who is competing, how, where are the moats.
- **Company (self):** Phase 2.3 team-fit — why we win, how big the capability gap.

The intersection of 3C = the strategic sweet spot. Any missing corner is a blind spot.

#### 1A. Market Scan
Methodologies: TAM/SAM/SOM + bottom-up cross-validation, value-chain analysis, Porter's Five Forces, track-evaluation 3+3, Why Now, crossing-the-chasm, market-delivery-mode detection. **Output:** three-layer market-size estimate (TAM/SAM/SOM dual-method cross-validation), value-chain map (with relationship positioning), Porter's Five Forces, market-delivery-mode detection, timing judgment (Why Now + chasm position), track-evaluation 3+3. Full steps: [module-industry-scan.md](references/module-industry-scan.md). **Counter-evidence:** find ≥1 "this market is not worth entering" datapoint.

#### 1B. Competitor Deep-Dive
Methodologies: four-layer competitor coverage, competitor five-element deep profile, blue-ocean strategy canvas, 3C-Competitor corner. **Output:** four-layer competitor map (panorama layer), core-competitor five-element deep profile (deep-dive layer ≥5, including key limitations), competitor-relationship labels, blue-ocean strategy canvas, shared competitor weaknesses. Full steps: [module-competitor.md](references/module-competitor.md). **Counter-evidence:** find ≥1 "a competitor does this so well we'd struggle to surpass" case.

#### 1C. Customer Insight
Methodologies: STP, JTBD, switching-cost analysis, buying-decision chain. **Output:** market segmentation (STP, 2–4 groups), core JTBD (Top 3 + role differences), existing solutions & switching costs, buying-decision chain (decider / user / evaluator). Full steps: [module-customer.md](references/module-customer.md). **Counter-evidence:** find ≥1 "users don't actually need this" datapoint.

#### 1D. Unit Economics
Methodologies: LTV/CAC, CAC payback, minimum viable scale, pricing research, contribution margin, data-moat four-questions, AARRR. **Output:** pricing reference (Van Westendorp four-question), unit economics (LTV/CAC three-scenario, regional SaaS benchmark), minimum viable scale, contribution-margin analysis, data-moat build path, growth path (AARRR + flywheel), 3-year revenue forecast. Full steps: [module-economics.md](references/module-economics.md). **Counter-evidence:** find ≥1 "this economics does not hold" case or datapoint.

---

### Phase 1.5: Source Verification

**Purpose:** ensure data quality before merging the report.

1. Aggregate all data points from the four ways into a data inventory.
2. Annotate each with the five elements: source + timeliness + scope + confidence + applicability.
3. High-hallucination-number check: NRR/CAC/LTV/conversion/ARPU/growth → unsourced ones downgrade to qualitative.
4. Contradiction handling: list all conflicting versions, analyze the cause, prefer primary data.
5. Mark data points that need downgrading.

---

### Phase 1.6: Adversarial Falsification Round (Devil's Advocate)

**Purpose:** before giving a positive conclusion, run an independent falsification pass to prevent "excited first, slapped later."

**Execution:** spawn an independent Devil's Advocate agent (not the same agent that did the positive research); its sole task = falsify.

```
Devil's Advocate agent brief:
- Goal: prove this direction cannot be done. Exhaust every reason to overturn.
- Does not care "how big the opportunity is"; only cares "why it dies."
- Must do 3 things:
  1. Use ≥5 distinct search terms to find competitors (synonym / hypernym / English / functional-description / government-program name)
  2. Search policy documents / tender notices / association notices from the last 6 months (site-restricted to government / tender / association sites)
  3. Search company-registry / business-info services (e.g. 天眼查/IT桔子 in CN, Crunchbase/Similarweb elsewhere) for companies registered in the last 2 years + recent funding
- Output:
  - List of directly comparable competitors found (name + founding + funding + core capability)
  - List of policy / platform dynamics found (doc name + date + impact)
  - Key assumptions that are insufficiently supported or unverifiable
  - Final verdict: falsifiable / not falsifiable / partially falsifiable
```

**Verdict rule:**
- Devil's Advocate finds a direct comparable that Phase 1B missed → Phase 1B fails, go back.
- Finds a policy change in the last 6 months → re-evaluate Why Now.
- "Falsifiable" → trigger the red-line scan directly, do not enter Phase 2.
- "Not falsifiable" or "partially falsifiable" → proceed to Phase 2, but fold the falsification findings into counter-evidence.

---

### Phase 2: Structured Synthesis + User Confirmation

#### Step 2.1: Generate Lean Canvas draft
Auto-fill the 9 cells from Phase 1 outputs (Problem, Customer Segments, UVP, Solution, Channels, Revenue Streams, Cost Structure, Key Metrics, Unfair Advantage). Fill what you can (with data source); mark uncertain cells `[待确认]`.

#### Step 2.2: Show Canvas + user correction
Show the full Canvas, annotate each cell's confidence. User corrects and adds internal info. Empty/ vague cells auto-marked as "riskiest assumptions", sorted by risk, defining validation focus.

#### Step 2.3: Team-fit evaluation (user answers)
AI guides; only the user can answer: VRIO four-questions, founder-market fit (domain experience / customer empathy / network / unique insight), team capability matrix (Top 5 needed vs current, each marked have / short-term-fillable / unfillable; is the unfillable one fatal?).

#### Step 2.4: Devil's-advocate self-check + five-layer falsification
Switch to the "opponent" perspective: which 3 points of this report are most attackable? Prepare one-sentence defenses. Undefendable = hard flaw, return to Phase 1. Five-layer falsification (demand / willingness-to-pay / scale / defensibility / team) — used as a thinking frame, each layer rated high/medium/low, summarized as decision input, not a direct veto.

#### Step 2.5: Final self-check
See checklist in SKILL (core conclusion typed & explicit; category ladder defined; five-element data annotation; hallucination numbers sourced or downgraded; ≥1 counter-evidence per chapter; competitor two-step done; ≥3 search rounds; Devil's Advocate done; five-layer falsification done; delivery-mode detected; data-moat path assessed; revenue vs minimum-viable-scale compared; 3 challenge points defended).

#### Step 2.6: Validation plan
From the riskiest assumptions: people to meet (role + count, B2B ≥3 / B2C ≥5), Switch Interview outline (Mom Test), per-assumption validation criteria, willingness-to-pay quick-test questions.

---

### Phase 3: Validation & Decision (user executes + AI assists)

#### Real conversations
User runs Switch Interviews (AI prepared the outline). **Mom Test:** ask only about past behavior and spending, never future intent ("how much did you spend on this last time?" ✓; "do you think this product is good?" ✗). **Iron-clad verdict:** did the conversation partner actively push for a next step (ask for a demo, ask how to partner)? Active push = real-demand signal; all-talk-no-push = false-demand signal.

#### Synthesized decision
Update Lean Canvas with real-conversation evidence; mark each assumption ✓verified / ✗overturned / ?uncertain; compute verification rate. Minimum-viable-scale check (team needs X customers → Y prospects by channel → is Y realistic within SAM?). Pre-mortem ("if this failed in 2 years, the 3 most likely causes? does each have a mitigation?"). Final decision — pick one of 6 verdicts:

| Verdict | Meaning | Next step |
|---------|---------|-----------|
| **Structural dead-end** | unsolvable problem | kill, start cooldown protocol |
| **Solvable obstacle** | problems but clear path | plan, re-validate |
| **Conditional recommend** | viable if specific conditions met | conditions → kill-criteria, start targeting |
| **Recommend enter** | positive across dimensions | start 2-week targeting plan |
| **Pivot** | not viable but a better adjacent direction found | restart research on the new direction |
| **Insufficient info** | key data confidence too low | mark must-fill gaps, supplement then judge |

---

## Standalone Modules

Confirm prerequisites, then the AI runs the full module autonomously; output a report; the user may request a deeper chapter.

| Module | Use | Steps |
|--------|-----|-------|
| **A: Industry Panorama Scan** | quick industry overview, no decision | [module-industry-scan.md](references/module-industry-scan.md) |
| **B: Competitor Deep-Analysis** | investment/strategy-grade competitor deep-dive (five-element + moats + relationship positioning) | [module-competitor.md](references/module-competitor.md) |
| **C: Customer Insight Research** | who are the customers, what do they need, why pay | [module-customer.md](references/module-customer.md) |
| **D: Business Unit-Economics** | answer with numbers whether this business can make money | [module-economics.md](references/module-economics.md) |

---

## Report & Decision Templates

- Report structure (full-flow Phase 1 output): [template-report.md](references/template-report.md)
- Decision memo structure (full-flow Phase 3 output): [template-decision.md](references/template-decision.md)

> Write reports following `csp-research-report-writing` craft: verdict-first, every section title a conclusion with a number, action recommendation table on page one.

---

## Red Lines

Triggered at any point → verdict is no-go (the point: avoid sunk-cost amplification; the earlier the stop, the better):

1. Phase 1–3 cannot complete within 72h → no-go (research stalling means information gaps or complexity beyond expectations).
2. Cannot find enough conversation partners (B2B <3 / B2C <5) → no-go (unvalidatable assumptions = gambling).
3. Core capability gap cannot be filled to deliverable within the validation window → no-go.
4. Uncontrollable security/compliance risk → no-go (compliance red lines are irreversible).
5. Minimum viable scale exceeds SAM → no-go (a mathematically-infeasible business is not worth validating).
6. "Research a bit more" → trigger stop-loss (continuous research without action is decision-avoidance).

---

## Cooldown Protocol

After a direction is killed, guide the user into a 24h cooldown (avoid emotional decisions). First write a 200-word post-mortem: at which Phase could you earliest see it failing? Why didn't you stop then? Did it die on "can't build" or "built but nobody bought"? What is the closest match to the last failure? Starting a new direction without a post-mortem → suggest +24h cooldown.

---

## Pitfalls (all agents must avoid)

| Pitfall | Consequence | Correct practice |
|---------|-------------|------------------|
| Skip web search, conclude directly | false "no competitors / blank market" | competitive landscape / market size / policy → forced 2–3 WebSearch rounds |
| Hard-case hallucinated numbers | NRR/CAC/LTV/CAGR/share unsourced = fabrication | unsourced → downgrade to qualitative |
| Only overseas data | regional conclusion distorted | local research uses local data; overseas is reference only |
| Write while researching | high fabrication mode | list data inventory, verify sources, then write |
| Single search term | miss non-obvious competitors / government platforms | ≥3 rounds (original / English / hypernym / government / company-registry) |
| English methodology names in titles | non-expert readers can't follow | section titles in plain language; first mention gets one-sentence explanation |
| Research without arithmetic | unit economics hand-waved through | LTV/CAC/payback must be explicit calculations |
| Missing counter-evidence | confirmation bias | ≥1 counter datapoint per chapter; if none, mark bias risk |
| Stale policy info | miss recent regulatory change | site-restricted government query + time range |
| Equate "has pain point" with "will pay" | need ≠ commercial viability | five-layer falsification |

---

## Methodology Cheat-Sheet

35+ core methodologies (market & scale, customer & demand, competition & differentiation, team & advantage, unit economics, growth & risk, research quality): [methodology.md](references/methodology.md).

## Related Skills

- [[csp-market-research]] — long-form consulting-style market report (50+ pages, LaTeX)
- [[csp-competitive-analysis]] — structured competitor analysis with source grading & time-window discipline
- [[csp-account-research]] — B2B target-account batch research pipeline
- [[csp-research-report-writing]] — the 8-rule report writing craft
- [[csp-strategy]] — turns research verdicts into product strategy
