# Research Lifecycle Protocol

Common behavioral norms for every research / analysis / reporting skill in CSP. Read this before running any skill in the research cluster: `csp-market-research`, `csp-competitive-analysis`, `csp-product-research`, `csp-account-research`, `csp-research-report-writing`, `csp-deep-research`.

The governing rule: **research serves a decision, not the researcher's curiosity.** Every step must drive toward an actionable verdict. If the reader cannot act after the report, the research failed — regardless of how thorough it was.

---

## Where research sits in the code-production lifecycle

CSP defines six lifecycle phases: `define → plan → build → verify → review → ship`. Research is primarily a **`define`-phase** activity — it de-risks a direction *before* code is written. It also feeds back into later phases:

| Phase | Research role | Skills |
|-------|---------------|--------|
| **define** | Validate the problem is real, the market exists, the competitor landscape is known, the unit economics close. Output: a go / no-go / pivot verdict. | `csp-product-research`, `csp-market-research`, `csp-competitive-analysis`, `csp-account-research` |
| **plan** | Translate research verdicts into scope and priorities. Research artifacts (competitor matrices, customer segments, TAM/SAM/SOM) become inputs to PRD and roadmap. | `csp-product-research` (decision memo), `csp-account-research` (battle handbook) |
| **build** | Light competitive / signal scans to unblock a specific build decision ("does competitor X already ship feature Y?"). | `csp-competitive-analysis` (single-movement mode), `csp-account-research` (signal-scan single export) |
| **verify / review** | Pressure-test claims made during define against new evidence; audit a report for fabrication and missing baselines. | `csp-research-report-writing` (refactor workflow), `csp-deep-research` |
| **ship** | Post-launch pulse: did the researched opportunity materialize? (Feeds back into the next define cycle.) | `csp-product-pulse` |

A research skill that runs in the wrong phase wastes effort. A 50-page consulting report is a `define`-phase artifact for a funding or strategy decision — it is *not* a `build`-phase task. Route by the decision the user is trying to make, not by the topic.

---

## The eight behavioral norms (non-negotiable)

These apply across every research skill. A skill may add its own discipline on top, but may not relax any of these.

### 1. Zero fabrication — inference is never evidence

Every factual claim, number, and quote must trace to a retrieved source. If retrieval returns nothing, say "no public information found for X in the time window" and list the queries already tried. **Never** backfill from model memory. "I know this from training" is fabrication, not research.

- Numbers are the highest-risk hallucination surface: NRR, CAC, LTV, CAGR, market share, conversion rates. Any number without a source is downgraded to a *qualitative* statement ("analysts describe growth as rapid").
- Conflicting sources are presented side by side with each side's claim. **Never** pick one, average them, or silently drop one.

### 2. Time-window discipline

Research is perishable. Before searching, get the real current date from the environment (`date`) and compute the window backward. Default window: **6–12 months** trailing (each skill states its own — `csp-competitive-analysis` uses 6 months, `csp-product-research` prefers ≤12 months). A source whose publish date cannot be determined is **not adopted** — it is not "old", it is "undated and excluded". Stale data is called out explicitly, never silently reused.

### 3. Source credibility grading

Grade every source. A single self-media post is never sufficient on its own.

| Grade | Type | Handling |
|-------|------|----------|
| A | Primary / official (company filings, SEC/regulator docs, official announcements, official press livestreams) | Single source sufficient |
| B | Authoritative media (established outlets with editorial standards) | Single source sufficient |
| C | Vertical / trade media | Adopt only if cross-checked by ≥1 A/B source; otherwise mark "awaiting cross-validation" |
| D | Self-media / forum / short video | **Never** the sole source; if only D exists, flag `⚠ single self-media source, awaiting corroboration` |
| E | Marketing copy / syndicated reprints | Lead only — trace back to an A/B source, do not cite directly |

Official and authoritative sources are preferred; self-media is demoted; a lone self-media source is flagged for verification.

### 4. Evidence labeling — fact vs inference vs recommendation

Separate the three layers explicitly in every output:
- **Fact** — what a source says, with the source attached.
- **Inference** — the analyst's conclusion, marked ("this suggests…", "our read is…").
- **Recommendation** — the action, marked, tied back to a fact and an inference.

When an inference is exploratory, label it as a stance ("our lean is…") rather than a conclusion. Knowledge honesty — admitting what you don't know — increases the credibility of what you do know.

### 5. Forced disconfirmation

Every conclusion carries a counter-evidence obligation. For each "this is an opportunity" claim, find at least one "this is not worth doing" data point. For each "competitor X is weak here", find at least one "competitor X does this well" case. Opportunities and risks are weighted equally: if risks get N bullets, opportunities get N bullets — preventing latent pessimism bias. A conclusion with no findable counter-evidence is marked `no counter-evidence found` rather than presented as unambiguously positive.

### 6. Business-scenario driven scope

Research scope is bound by the user's stated business scenario and decision goal. "Interesting but irrelevant" findings are excluded — even if they are accurate. The interview step (collecting scenario / goal / focus objects / depth) is mandatory and not skippable; only the missing fields are re-asked. Keyword design targets the focus point, not broad terms (`理想汽车 主动服务 场景触发 2026`, never just `理想汽车 AI`).

### 7. Decision-oriented output

The report's first page delivers 80% of the value: core findings (judgment sentences with numbers) + an action recommendation table (priority / direction / concrete action / expected effect). Every section title is itself a conclusion embedding a number, not a neutral description ("91% of designers use AI weekly — up from 54% last year", never "AI usage analysis"). Every chart title is a verdict, not a description. If a section can be deleted without removing a core finding or action, delete it.

### 8. Reproducible artifacts

Research writes durable artifacts to disk, not just chat. Outputs land under CSP-conventional paths (see below), one run per directory, greppable and diffable across time. Saved reports contain no PII. The conversation is the preview; the file is the record.

---

## Artifact structure (CSP-compliant)

Research artifacts are consolidated under two roots — never scattered in the project root.

```
<repo-root>/
├── docs/                                 ← human-facing deliverables
│   └── research/
│       ├── <topic-or-run-id>/            ← one directory per run
│       │   ├── battle-handbook/          ← front-line deliverables (D1-style)
│       │   ├── decision-support/          ← executive summaries (D2-style)
│       │   ├── methodology/              ← methodology + supporting
│       │   ├── process-archive/          ← L1/L2/L3/L4 intermediates, search traces
│       │   └── report.md / report.pdf    ← the report itself
│       └── market-reports/<topic>/        ← long-form consulting reports (csp-market-research)
└── .csp/                                  ← machine state (gitignored, machine-local)
    ├── config.local.yaml                  ← shared local config (research_* keys)
    └── research/
        ├── <scope-slug>/                  ← per-scope persistent state
        │   ├── brief.json                 ← locked task config
        │   └── progress.json              ← resumable progress
        └── runs/<run-id>/                 ← per-run orchestrator metadata
            ├── request.md                 ← user's original request, verbatim
            ├── <stage>/handoff.md         ← cross-stage handoff items
            ├── <stage>/gate-summary.md    ← gate snapshot
            └── <stage>.ready              ← completion sentinel
```

**Why two roots.** `docs/` is versioned and shared — the human-readable record a team reads. `.csp/` is machine-local and gitignored — runtime state, resumability, orchestrator metadata. Mixing them pollutes the repo; splitting them keeps the readable surface clean while the pipeline stays resumable. Add `.csp/` to `.gitignore` if not already covered.

The `request.md` is the single source of truth for "what the user actually asked" — stored verbatim, never summarized or translated. Sub-stages read from it; they do not guess from conversation memory.

---

## Interaction model

- **Default to the harness's blocking question tool** (`AskUserQuestion` in Claude Code; the platform equivalent elsewhere) — one question at a time. Numbered chat options only when no blocking tool exists.
- **Never combine multiple questions into one wall of text.** Never self-answer on the user's behalf ("I assume you confirmed, continuing").
- **Gates are mandatory.** A research pipeline stops at each gate (start confirm, methodology validation, layering preview, ranking, deliverable outline, final) and waits for explicit confirmation. A gate is never skipped because "it seems fine".
- **Headless mode** (`mode:headless`) suppresses the prompts but applies the same judgment and produces the same artifacts — useful for skill-to-skill composition and scheduled reruns.
- **Scheduling** is platform-specific (cron, GitHub Actions, the host's automation). Skills never schedule automatically; a scheduling handoff requires explicit confirmation.

---

## Cross-skill data handoff

When one research skill feeds another (e.g. `csp-competitive-analysis` signal scan → `csp-account-research` depth research), the two communicate **only through files** under the artifact structure above — never through conversation memory. The upstream skill writes its output to the agreed path and touches a `.ready` sentinel; the downstream skill reads from that path. This makes the pipeline resumable and auditable: a crashed run resumes from the last `.ready`, and a reviewer can trace any claim back through the chain.

For skills outside the CSP cluster, follow `references/shared/cross-skill-fallback.md` (in `csp-account-research`): use if present, fall back to the built-in template if not. Never let an external-skill dependency become a hard failure.

---

## Common anti-patterns (prohibited)

1. **Reasoning instead of evidence** — concluding "no competitors exist" / "market is blank" / "the giant hasn't done this" from model memory without 2–3 search rounds.
2. **Hard-casing hallucinated numbers** — NRR/CAC/LTV/CAGR/share written as fact with no source. Downgrade to qualitative when unsourced.
3. **Over-broad keywords** — `理想汽车 AI` instead of `理想汽车 主动服务 场景触发 2026`.
4. **Single-search-word** — missing non-obvious competitors and government/platform moves. Expand ≥3 rounds (original term / English / hypernym / government / company-registry).
4. **Only-overseas data** — for a regional market, overseas data distorts conclusions. Use regional data; overseas is reference only.
5. **Writing while researching** — the highest fabrication-risk mode. List the data inventory, verify sources, *then* write.
6. **Missing counter-evidence** — confirmation bias. Each chapter needs ≥1 counter datapoint.
7. **Stale policy/regulation** — missing recent regulatory change. Use `site:`-restricted queries with a time range.
8. **Equating "has pain point" with "will pay"** — need is real ≠ business is viable. Apply the five-layer falsification: demand / willingness-to-pay / scale / defensibility / team.
9. **Scattered artifacts** — writing outputs to the project root or the skill directory. Everything goes under `docs/research/` and `.csp/research/`.
10. **Exposing internal numbering** — readers see natural-language progress and deliverables, never `L1/L2/L3/L4`, `D1-D8`, `Phase`, or `brief.json`.

---

## Platform-independence note

These skills are platform-neutral. Web retrieval uses the harness's `WebSearch` / `WebFetch` tools (or a configured browser MCP). Source repositories and collaboration use GitHub and git operations — never a proprietary internal registry. Company-registry and government-tender lookups use whatever public regional services are available in the target market (e.g. official company registries, public tender sites); the skill names the *category* of service and gives examples, and adapts to the locale at run time.

---

## Related references

- `csp-account-research/references/shared/anti-patterns.md` — the B2B pipeline's full anti-pattern catalog
- `csp-product-research/references/data-quality-rules.md` — the five-element data annotation standard
- `csp-competitive-analysis/references/source-grading.md` — the A–E source grading table in detail
- `csp-research-report-writing/SKILL.md` — the 8-rule report writing craft
- `shared/references/headless-mode-protocol.md` — non-interactive automation protocol
