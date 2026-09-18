# Source Grading & Single-Movement Workflow

The discipline layer for `csp-competitive-analysis` when the user wants **business-scenario-driven competitive intelligence** (a lightweight, time-boxed scan of recent competitor moves) rather than the full framework report. This reference defines the source-credibility grading, time-window, anti-fabrication rules, the single-movement output template, and the self-check list.

Read `shared/references/research-lifecycle-protocol.md` first — the eight behavioral norms there govern this mode; this file adds the competitive-intelligence specifics.

---

## Core Principles (non-negotiable)

1. **Business-scenario driven:** all search keywords, inclusion criteria, and analysis dimensions revolve around the user's stated business scenario and goal. "Interesting but irrelevant" findings are excluded — even if accurate.
2. **Time-window hard constraint:** adopt only information within the trailing **6 months** from the real current date. Run `date` first, then compute the window.
3. **Zero fabrication:** every fact, number, and quote must come from a retrieved source. If retrieval returns nothing, say so and list the queries tried. Never backfill from model memory.
4. **Traceable sources:** every move lists the original source title and a clickable URL (Markdown link).
5. **Merge same-type:** same-industry same-type competitor info is merged and summarized; no duplication.
6. **Source grading:** official/authoritative preferred; self-media demoted; a lone self-media source is flagged for verification.

---

## Source Credibility Grading

| Grade | Type | Examples | Handling |
|-------|------|----------|----------|
| A | Primary / official | company official-site announcements, official accounts, prospectus, SEC/regulator filings, official press livestream | single source sufficient |
| B | Authoritative media | established outlets with editorial standards (e.g. 36Kr, Huxiu, LatePost, TechCrunch, The Verge, Reuters, Bloomberg) | single source sufficient |
| C | Vertical / trade media | industry-specialized outlets | adopt only if cross-checked by ≥1 A/B source; otherwise mark "awaiting cross-validation" |
| D | Self-media / forum / short video | columns, microblogs, short-video platforms | **never** the sole source; if only D exists, flag `⚠ single self-media source, awaiting corroboration` |
| E | Marketing copy / syndicated reprints | homogenized "industry news" reprints | lead only — trace back to an A/B source, do not cite directly |

**Conflict handling:** when sources disagree on the same event (time, spec, number), present each side's claim side by side. **Never** pick one, average, or silently drop one.

---

## Standard Workflow

Track progress with this checklist:

```
- [ ] Step 1: upfront interview (scenario / goal / focus objects / depth)
- [ ] Step 2: get real current date, compute 6-month window
- [ ] Step 3: design keywords around the business focus
- [ ] Step 4: search (WebSearch + WebFetch; a browser MCP if available)
- [ ] Step 5: filter by time / relevance; diverge to same-type competitors
- [ ] Step 6: write each move by the template (highlight / relevance / insight)
- [ ] Step 7: self-check (sources complete, no fabrication, scenario-focused)
- [ ] Step 8: output in chat + write Markdown file
```

### Step 1: Upfront interview (mandatory, not skippable)

Use the harness's blocking question tool to collect 4 items in one pass; only re-ask the missing ones if the user already gave some.

| Field | Meaning | Example |
|-------|---------|---------|
| Business scenario | the specific domain and link | in-car AI proactive service, parking-lot scenario rendering, highway-service-area charging queue |
| Business goal | the decision this research supports | find proactive-user interaction forms; improve rendering expressiveness |
| Focus objects | named competitors / companies / products | Li Auto, NIO, Xpeng / Amap, Baidu / a specific app |
| Depth | how many moves, allow same-type divergence | 5–8, allow same-type divergence |

**Key judgment:** the business focus decides inclusion. E.g. scenario = "in-car AI proactive service" → focus on proactive-trigger timing, context inference, scenario triggers, user authorization; **not** general Q&A quality or TTS voice.

### Step 2: Time-window computation
Get the real current date (YYYY-MM-DD) from the environment; compute the 6-month start. Every source must satisfy `publish date ≥ start`. Sources with no determinable date are not adopted.

### Step 3: Keyword design
Around the business focus, not broad terms. Templates:
```
"<focus object>" + "<scenario core action>" + "<time qualifier>"
"<industry>" + "<specific capability of interest>" + "new release / upgrade"
```
Bad (too broad): `理想汽车 AI`
Good: `理想汽车 主动服务 场景触发 2026` / `Li Auto proactive AI assistant 2026`

### Step 4: Search
- **Primary:** `WebSearch`, with the time-range filter closest to 6 months.
- **Deep:** for key links WebSearch surfaces, use `WebFetch` (or a browser MCP if available) to read the original and extract primary info.
- **Bilingual strategy:** overseas companies → English-first (hits English primary reporting); domestic companies → both Chinese and English (Chinese for official moves, English for overseas angles), keywords mutually translated. E.g. `Li Auto proactive AI assistant` ↔ `理想汽车 主动服务`.

### Step 5: Filter & diverge
- Strict filter: publish date outside window / irrelevant to focus / no credible source → discard.
- Reasonable divergence: when named competitors have insufficient info, supplement within the same industry and type (named "Li Auto" → may diverge to "NIO", "Xpeng", "AITO"); do not diverge to unrelated industries.
- Merge rules:
  - **Must merge:** multiple reports of the same launch / product release / event → one entry, sources stacked.
  - **May merge:** several competitors launching the same capability in the same period → one "industry move" entry with per-competitor sub-items.
  - **Cannot merge:** the same company's different events (e.g. a launch + an OTA upgrade) → separate entries.
- **Empty-result fallback** (named competitor has no relevant info in-window):
  1. Try same-industry same-focus divergence.
  2. Still nothing → write explicitly "no public move found for <competitor> on <focus> within <window>", list the keywords tried.
  3. **Never** pad with out-of-window info; **never** backfill from training data.

### Step 6: Single-move output template
Each move strictly:
```markdown
### N. <competitor/object> — <one-sentence title>

- **Publish date:** YYYY-MM-DD (per the source; if unstated, note "source didn't specify a date, but published within X months")
- **Source grade:** A / B / C / D
- **Core highlight:** 1–3 sentences on what was done and what's distinctive. Based on retrieved facts, no extrapolation.
- **Relevance to business goal:** how this maps to the user's scenario + goal. If only indirectly related, say "indirectly related".
- **Insight for our business:** 1–3 concrete actionable suggestions or thought directions; avoid platitudes.
- **Sources:**
  - [source title 1](https://...)
  - [source title 2](https://...)
```
If the only source is grade D, prefix the title with `⚠` and mark the source-grade row "awaiting cross-validation".

### Step 7: Self-check list
- [ ] every move has ≥1 accessible URL
- [ ] every move has a source grade (A/B/C/D)
- [ ] lone D-grade sources flagged "⚠ awaiting cross-validation"
- [ ] no "insiders say / reportedly" unsourced descriptions
- [ ] all publish dates within the 6-month window
- [ ] every move explicitly states "relevance to business goal" — not generic
- [ ] same-type competitors merged, no duplication
- [ ] move count matches the user's request (default 5–8)
- [ ] no "I know this from training" facts that weren't retrieved this run
- [ ] empty results used the fallback statement, not padded with out-of-window info

### Step 8: Output form
Default: in-chat + Markdown file. Write to `docs/competitive-intel/<YYYYMMDD>-<topic-slug>.md` and offer a `file://` link. When the user asks to "write to a knowledge base / external doc", save the Markdown file and let the user import it to their target system — do not couple to a specific doc-platform API.

---

## Industry Focus-Dimension Scaffold

When the user struggles to articulate the "business focus", use [industry-dimensions.md](industry-dimensions.md) to converge from a broad phrase to 1–3 specific, searchable capability points (in-car AI, map/LBS, e-commerce, SaaS, content/AI apps, finance).

---

## Output Overall Structure

```markdown
# Competitive Intelligence: <scenario> — <goal>

> Research date: YYYY-MM-DD | Window: YYYY-MM-DD to YYYY-MM-DD | Focus objects: A / B / C

## 1. Research scope
- Business scenario: ...
- Business goal: ...
- Focus objects: ...
- Research questions (what to answer): ...

## 2. Competitor moves (N total)
### 1. ...
### 2. ...

## 3. Cross-comparison & shared insights
(≤200 words; distill commonalities, differences, gaps; still based on listed sources, no new uncited conclusions.)

## 4. Overall insight for our business
(3–5 items, tied to the business goal, concrete and actionable.)

## Appendix: source inventory
- [source 1](url)
- [source 2](url)
```

---

## Anti-Patterns (prohibited)

1. **Generic listing** — stuffing "industry AI new progress" into an in-car proactive-service scan.
2. **Training-data recall** — writing "Li Auto previously released X" without searching.
3. **Vague insight** — "strengthen AI capability", "improve UX" (zero information).
4. **Missing sources** — using "reportedly" / "media say" in place of a URL.
5. **Out-of-window info** — including a launch from a year ago.
6. **Cross-domain divergence** — user asks about carmakers, you go check the education industry.

---

## Relationship to the full framework report

This single-movement mode is **not** a replacement for the full `csp-competitive-analysis` report (feature matrix + SWOT + Porter). Use this mode when the user wants a scenario-focused scan of recent moves; use the full report when the user wants structured competitive positioning. The full report's anti-fabrication and source-grading discipline inherits from this file.
