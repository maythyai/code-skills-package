---
name: csp-pricing-strategy
description: "Design or revise a product's pricing: model selection, tier architecture, discount policy, price validation, and price-increase communication. Covers B2B SaaS, B2C, usage-based and hybrid models with quantitative validation (Van Westendorp, conjoint, price A/B)."
version: "1.0.0"
layer: 2
category: workflow
phase: define
domain: patterns
scope: analysis
tools: [Read, Write, Edit, Glob, Grep, WebSearch]

dependencies:
  skills: []

related_skills:
  - csp-competitive-analysis
  - csp-market-research
  - csp-strategy
  - csp-product-metrics-review
  - csp-requirement-prioritization
  - csp-user-feedback-analysis

anti_rationalizations:
  "Let's just copy the competitor's price": "Their price reflects their cost structure, brand equity and segment — none of which you share. Copying gives you their number without their justification."
  "We'll launch cheap and raise prices later": "Early adopters are the segment most willing to pay for uncertainty. Underpricing them trains the market that your product is cheap, and every later increase reads as a betrayal."
  "Discounts will drive adoption": "A discount changes who buys, not how many. It permanently lowers the reference price and attracts the segment most likely to churn."
  "Nobody reads the pricing page": "The pricing page is the highest-intent page on the site. Confusion there converts directly into lost revenue."

triggers:
  keywords: ["定价", "价格策略", "定价方案", "收费模式", "套餐设计", "分层定价", "涨价",
             "价格调整", "免费版设计", "定价页", "pricing", "pricing strategy", "monetization",
             "tier design", "price increase", "subscription pricing", "usage-based pricing"]
  intents:
    - "user needs to set an initial price for a product or plan"
    - "user wants to restructure pricing tiers or packaging"
    - "user is planning a price increase and needs a communication approach"
    - "user wants to validate whether a price point is right"
  context:
    - "pre_launch"
    - "monetization_design"
    - "business_model_change"
role: specialist
---

# Pricing Strategy

Turn a product's value into a defensible price. Pricing is a **business-model decision with a
number attached** — the number is the last thing you pick, not the first.

## When to Use

- Setting an initial price for a new product, plan, or paid tier
- Restructuring existing tiers (too many, too few, wrong gating)
- Planning a price increase and needing the communication approach
- Validating a proposed price point before committing
- Deciding whether to add a free tier or a usage-based option

## When NOT to Use

- The user needs market sizing or competitive landscape → `csp-market-research`, `csp-competitive-analysis`
- The user is designing the pricing *page UI* → `csp-frontend-design` (this skill supplies the packaging rules it consumes)
- The user needs revenue forecasting from an existing price → `csp-product-metrics-review`

---

## Step 1 — Front Assessment

Answer all four before touching a number. Write the answers into the report; they are the
justification that survives a challenge.

| Question | What to determine | Where to look |
|---|---|---|
| **产品类型** | SaaS subscription / tool / e-commerce / marketplace / API | Product description, repo, existing billing code |
| **价值度量** | What does the customer consume? `seats` / `usage` (calls, GB, minutes) / `features` / `outcomes` | Which dimension grows with the value the customer receives |
| **市场** | Competitor price points, buyer's willingness to pay, price sensitivity of the segment | Competitor pricing pages, sales calls, churn reasons, `csp-competitive-analysis` output |
| **目标** | Is this optimizing revenue, adoption, retention, or a land-and-expand motion? | Business goals, `csp-strategy` |

**Value metric is the highest-leverage answer.** Pick the one that (a) grows as the customer gets
more value, (b) the customer can predict, and (c) you can meter reliably. A metric that fails (b)
produces bill shock and churn; one that fails (c) produces revenue leakage.

## Step 2 — Choose the Pricing Model

| Model | Mechanic | Best for | Watch out for |
|---|---|---|---|
| **Subscription** | Fixed recurring fee per period, per seat | Predictable collaboration tools; seat count tracks value | Seats decouple from value in AI/automation products |
| **Freemium** | Permanent free tier + paid upgrade | Network-effect products, low marginal cost, high volume | Free tier must be genuinely useful *and* genuinely limited; a too-good free tier removes the upgrade reason |
| **Usage-based** | Metered per unit consumed | APIs, infrastructure, variable-workload products, AI token products | Unpredictable bills; needs caps, budgets, alerts |
| **One-time** | Single perpetual payment | Desktop tools, templates, single-outcome products | No recurring revenue; support cost is unfunded after purchase |
| **Hybrid** | Platform fee + usage overage | Products with a baseline workload plus spikes | Complexity; the customer must be able to model their own bill |

**The 10× rule for variable-cost products.** If your marginal cost per unit of consumption varies
by more than 10× across customers, a flat subscription loses money on heavy users. Use
usage-based or hybrid. A flat fee over a 10×-variable cost base is not a pricing decision — it is
an unfunded liability.

### Deriving the number: three anchors

Use all three; they bound the answer from different sides.

1. **Cost-plus — floor only.** Sum COGS + delivery + support + a margin. This tells you the
   price below which you lose money. It never tells you the right price, because it says nothing
   about value. Treat it as a hard floor.
2. **Value-based — the primary derivation.** Estimate the customer's quantified outcome
   (hours saved × loaded hourly rate, revenue gained, cost avoided). Price at **10–30% of the
   value delivered**. Below 10% you are leaving money on the table and signalling low value;
   above 30% the buyer's internal champion cannot defend the purchase.
3. **Competitive anchoring — sanity band.** Position within **±20%** of the closest substitute
   unless you can name the specific differentiator that justifies stepping outside it. Outside
   the band, the buyer needs a one-sentence reason.

### Price-point psychology

| Tactic | Applies to | Rule |
|---|---|---|
| Charm pricing (`9.99`, `19`) | B2C, low consideration, low ticket | Signals "deal"; use for impulse-adjacent purchases |
| Round pricing (`100`, `500`) | B2B, premium, high consideration | Signals quality and confidence; avoid decimals in enterprise quotes |
| Per-unit framing | Any | "per user per month" beats "$1,200/year" for adoption; annual total beats monthly for commitment |

## Step 3 — Tier Architecture

**2–4 tiers. Not 1, not 6.** One tier removes choice and forces every buyer through the same
yes/no. More than four produces comparison paralysis and a support burden explaining the
differences.

Each tier needs:

| Element | Requirement |
|---|---|
| **Name** | Describes the buyer, not the feature count (`Starter` / `Team` / `Business`, not `Basic` / `Plus` / `Pro Max`) |
| **Best-for line** | One sentence naming the segment: "For solo builders shipping their first product" |
| **Feature gates** | The 2–3 differentiating capabilities. Everything else is table stakes and belongs in all tiers |
| **Price + unit** | Explicit metric: per seat, per 1k calls, per month |
| **Upgrade trigger** | The condition that makes the next tier obviously right ("when you add your first teammate") |

### Gate on value, not on volume

Gate features that change *what the customer can do*; meter the dimensions that change *how much
they do*. Gating a core capability that every tier needs produces resentment. Metering a feature
instead of a quantity produces a tier nobody can predict.

**Designate a target tier.** One tier should be where you want most revenue to land. Everything
in the presentation (Step 4) serves that.

## Step 4 — Anchoring and Presentation

| Tactic | Rule |
|---|---|
| **Most popular badge** | On the target tier. Social proof plus a default choice for the undecided |
| **Annual/monthly toggle** | Show both side by side with the saving made explicit ("2 months free"), not hidden in a footnote |
| **Annual discount** | **15–25%**. Below 15% is not worth the cash-flow trade for the buyer; above 25% trains the market to wait for discounts |
| **Decoy tier** | A high tier that makes the target look reasonable. It must be a real offer, not a joke — an absurd price destroys credibility |
| **Order** | Left-to-right ascending for self-serve; descending (premium first) for sales-led enterprise |
| **Comparison table** | Rows grouped by category, not alphabetical. Checkmarks over feature names wherever possible |
| **Currency and localization** | Real purchasing-power localization, not FX conversion. A ¥ price that is a straight conversion of $ reads as expensive to the local buyer. Round to local psychological price points |
| **FAQ** | Answer the four blockers: can I change tiers, what happens at the limit, do you offer nonprofit/student pricing, how does billing work |

## Step 5 — Discount Policy

Discounts are **tactical, never structural**. Set the base price from long-term value; use
discounts only for a named, time-boxed reason.

| Legitimate use | Illegitimate use |
|---|---|
| Annual prepay (buys you cash flow) | Patching a price that is too high |
| Multi-year enterprise commitment | Closing a deal that should have been lost |
| Named segment (student, nonprofit, early adopter cohort with an end date) | A permanent "introductory" price that never ends |
| Migration from a named competitor | Rewarding a customer who threatens to churn |

Every discount granted without a rule becomes the reference price for the next negotiation.

## Step 6 — Validate the Price

Do not ship a number you have not tested. Pick the methods the timeline allows.

### Van Westendorp Price Sensitivity Meter

Four questions, asked of the target segment (n ≥ 100 for a usable curve):

1. At what price is this so cheap you would question its quality?
2. At what price is it a bargain — a good deal for the money?
3. At what price does it start to seem expensive, but you would still consider it?
4. At what price is it too expensive to consider at all?

Plot the cumulative curves. The **intersection of (2) and (3)** is the optimal price point; the
**intersection of (1) and (4)** bounds the acceptable range. Anything outside that range has no
defence.

### Conjoint analysis

Present forced-choice bundles varying price and feature sets. Yields each feature's part-worth —
tells you *which* features justify the tier jump, not just the price level. Use before finalizing
feature gates in Step 3.

### Price A/B test

- Randomize at the **account or visitor** level, never at the session level (the same buyer seeing
  two prices is a trust incident).
- Judge on **conversion × ARPU**, not conversion alone. A lower price always converts better;
  that is not the question.
- Run at least **one full purchase cycle** — typically **2–4 weeks**, longer for annual B2B plans.
  Stopping early captures the impulse buyers and misses the considered ones.
- Watch guardrail metrics: churn/退订率, support ticket volume, sales cycle length. A price that
  lifts ARPU while tripling tickets is a net loss.

### Elasticity

If you have price-change history: `elasticity = %Δquantity / %Δprice`.
`|E| < 1` → inelastic, a price increase raises revenue. `|E| > 1` → elastic, it does not.
Most B2B SaaS sits between 0.5 and 1.5; most B2C commodity products sit above 1.5.

## Step 7 — Communicate a Price Increase

The increase is the easy part. The communication determines whether you keep the customers.

| Rule | Detail |
|---|---|
| **Grandfathering** | Existing customers hold the old price for **3–12 months**. Shorter reads as a surprise; longer defers the revenue you were counting on. State the end date in the first message |
| **Advance notice** | B2C: **≥ 30 days**. B2B enterprise: at the next renewal conversation, never by email blast |
| **Reason anchored to value** | Name what the customer gained since the last price: the features shipped, the reliability improvements, the support added. Never "rising costs" alone — that is your problem, not theirs |
| **Downgrade path** | Offer a lower tier for customers who no longer want the value. Losing them gracefully beats losing them publicly |
| **One message, then a reminder** | Announce, then remind ~7 days before the change. More than three touches reads as anxiety |
| **Sales enablement** | Give the sales team the objection-handling script *before* the announcement, not after the first escalation |

## B2B vs B2C

| Dimension | B2B | B2C |
|---|---|---|
| Decision unit | Committee; economic buyer ≠ user | Individual |
| Price visibility | Often opaque; quote-led above a threshold | Always public |
| Sensitivity driver | Budget cycle and ROI justification | Disposable income and perceived deal |
| Negotiation | Expected above the self-serve threshold | Never |
| Price points | Round, per-seat or per-unit, annual contracts common | Charm pricing, monthly dominant |
| Increase friction | Contractual; requires renewal conversation | Low friction, high churn risk |
| Free tier value | Lead qualification and bottom-up adoption | Volume and habit formation |

## Packaging Rules for the Pricing Page

1. Three tiers maximum on the visible page; a fourth goes behind "Contact sales".
2. The target tier is visually distinct — border, badge, or scale — not just a highlighted price.
3. Every tier states the unit explicitly. `¥99` alone is ambiguous; `¥99 / 人 / 月` is not.
4. Feature lists cap at 6 bullets per tier, then "See all features".
5. The CTA verb differs per tier (`Start free` / `Choose Team` / `Talk to sales`) — a uniform
   `Get started` on an enterprise tier produces unqualified pipeline.
6. Show the annual saving as an absolute amount, not a percentage, when the amount is large.

## Process

1. Run Step 1 and write the four answers down. If 价值度量 is unclear, stop and resolve it first.
2. Check for existing pricing artifacts (billing code, a pricing page, past pricing docs) — the
   current state constrains what is changeable.
3. Select the model (Step 2) and derive the three anchors.
4. Design the tiers (Step 3) and the presentation (Step 4).
5. State the discount policy explicitly, including the discounts you are *not* offering.
6. Pick validation methods that fit the timeline; if none is possible before launch, say so and
   set the review date.
7. Write the output to `docs/analysis/PRICING-{product}-{date}.md`.

## Output Location

`docs/analysis/PRICING-{product}-{date}.md`

## Key Principles

- **Value metric before price point** — the metric determines the model; the model determines the number.
- **Cost-plus is a floor, never a target** — it says nothing about what a customer will pay.
- **Every price needs a sentence of justification** — if you cannot say why, you cannot defend it in a negotiation or a review.
- **Predictability is a feature** — a customer who cannot model their own bill will not sign.
- **Discounts are tactical** — the base price carries the long-term value; discounts carry a named, time-boxed reason.
- **Validate on ARPU, not conversion** — conversion always favours the cheaper price.

## Anti-Patterns

| Anti-pattern | Why it fails | Do this instead |
|---|---|---|
| More than 4 tiers | Comparison paralysis; support cost explains the differences | 2–4 tiers with an obvious target |
| Flat subscription over a >10× variable cost base | Heavy users are unfunded liabilities | Usage-based or hybrid with caps and alerts |
| Using discounts instead of fixing the price | Permanently lowers the reference price and attracts churn-prone buyers | Lower the base price or re-gate the tiers |
| Judging a price test on conversion alone | The cheaper price always wins that comparison | Judge on conversion × ARPU, plus churn and ticket guardrails |
| Raising prices without notice | Public trust incident; the loudest customers leave first | Grandfather 3–12 months, ≥30 days notice, value-anchored reason |
| Copying a competitor's price with no value basis | Their number encodes their cost, brand and segment — not yours | Derive from value-based, sanity-check against competitive ±20% |
| Launching cheap "to get users first" | Trains the market that the product is cheap; every later increase reads as a betrayal | Price at value from day one; discount the early cohort explicitly and time-boxed |
| Hiding the unit | The customer cannot model their bill and defers the decision | State `per seat / per 1k calls / per month` everywhere |
| Straight FX conversion for localized prices | Reads as expensive to the local buyer | Round to local psychological price points based on purchasing power |
