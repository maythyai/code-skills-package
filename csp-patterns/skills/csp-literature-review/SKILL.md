---
name: csp-literature-review
description: "Run a reproducible academic literature review end to end: PICO question framing, boolean search strings across PubMed/arXiv/Semantic Scholar/OpenAlex, PRISMA dedup and three-stage screening, risk-of-bias quality appraisal, thematic synthesis, and DOI-verified citations. Use when the user needs a systematic review, scoping review, related-work section, evidence summary, or a reproducible search protocol for a research topic."
version: 0.1.0
layer: 3
category: patterns
phase: define
domain: other
scope: analysis
tools: [Read, Write, Edit, Glob, Grep, Bash, WebSearch, WebFetch]
related_skills: [csp-paper-reader, csp-deep-research, csp-article-writing, csp-market-research]
---

# Literature Review

Produce a review that someone else could **reproduce** — same question, same search strings, same
inclusion rules, same result set. An unreproducible review is an opinion piece with references.

## When to Use

- A systematic, scoping, or narrative review of a research topic
- A related-work section for a paper, thesis, or technical report
- An evidence summary to support a technical or product decision
- Establishing the state of the art before starting research
- Verifying and rebuilding a citation list

## When NOT to Use

- Reading and explaining one specific paper → `csp-paper-reader`
- Market or competitive research on products and companies → `csp-market-research`
- General web research without academic rigor requirements → `csp-deep-research`

---

## Stage 1 — Frame the Question

### PICO (or the variant that fits)

| Element | Question |
|---|---|
| **P** — Population/Problem | What system, dataset, population, or problem class? |
| **I** — Intervention/Method | What technique, model, treatment, or approach? |
| **C** — Comparison | Compared against what? (baseline, prior method, placebo, no intervention) |
| **O** — Outcome | Measured how? Which metric decides whether it worked? |

For CS/engineering work, `C` is often "the prior state of the art" and `O` is a benchmark metric.
For a scoping review, replace PICO with **Population–Concept–Context**.

A question that cannot be written as one sentence with all four elements filled is not ready.

### Choose the review type

| Type | Purpose | Rigor | Output |
|---|---|---|---|
| **Narrative** | Broad orientation; expert summary | Low — selection is judgement-based | Thematic prose |
| **Systematic** | Answer a focused question with minimal bias | High — protocol, exhaustive search, quality appraisal, PRISMA | Reproducible synthesis ± meta-analysis |
| **Scoping** | Map the extent and nature of a field | Medium — exhaustive search, no quality appraisal | Evidence map + gap analysis |
| **Meta-analysis** | Quantitatively pool effect sizes | Highest — adds heterogeneity and bias testing | Pooled estimate + forest plot |

State the type at the top of the protocol. It determines how much of Stages 3–5 you must run.

### Decompose into concepts

Break the question into **2–4 main concepts**. For each, list:
- The canonical term
- Synonyms and near-synonyms
- Abbreviations and acronyms (and their expansions)
- Alternate spellings (US/UK, hyphenation)
- Controlled vocabulary terms (MeSH for biomedical, ACM CCS / IEEE for computing)

| Concept | Free-text terms | Controlled vocabulary |
|---|---|---|
| federated learning | "federated learning", "distributed learning", "collaborative learning", FL | MeSH: none (too new) — rely on free text |
| differential privacy | "differential privacy", DP, "privacy-preserving", ε-DP | MeSH: `Privacy` |

### Build the boolean string

- **AND** between concepts, **OR** within a concept, **NOT** sparingly (it silently excludes
  relevant work that happens to mention the excluded term).
- Quote multi-word phrases: `"federated learning"`.
- Truncation: `genom*` catches genome/genomic/genomics; `randomi?ed` catches randomised/randomized.
  Truncation before a short stem (`a*`) destroys precision.
- Group with parentheses and keep the nesting readable — you will need to re-run and modify it.
- Build the string once, then **adapt per database** (field tags differ).

### Select the databases

Choose **≥ 3 complementary** sources — one broad, one domain-specific, one preprint.

| Source | Strength | Query syntax notes |
|---|---|---|
| **PubMed** | Biomedical, life sciences; MeSH indexing | `[Title]`, `[Title/Abstract]`, `[MeSH]`, date via `2015:2024[Publication Date]` |
| **arXiv** | CS/physics/math preprints; fastest for new methods | `cat:cs.LG`, `ti:`, `abs:`, `all:` |
| **Semantic Scholar** | CS + citation graph, influence scores | `title:`, `year:`, `venue:`; **rate limit ~100 requests / 5 min** |
| **OpenAlex** | 250M+ works, free, no API key, broad coverage | `filter=title_and_abstract.search:`, `cites:`, `publication_year:` |
| **IEEE Xplore** | Engineering, standards | Requires subscription |
| **ACM DL** | Computing, full proceedings | Requires subscription |
| **Web of Science / Scopus** | Citation indexing, journal metrics | Requires subscription |
| **Google Scholar** | Broad but no API, unstable scraping, poor reproducibility | Use for snowballing only, never as the primary systematic source |

## Stage 2 — Execute and Record

**Record every search at the time you run it.** A search you cannot report is a search you cannot
defend.

For each database log:

```
Database:      OpenAlex
Date run:      2026-10-22
Exact query:   filter=title_and_abstract.search:("federated learning" AND "differential privacy"),
               publication_year:2018-2026,type:article|preprint
Filters:       language:en, has_abstract:true
Hits:          1,842
Exported to:   search/openalex-2026-10-22.json
```

### Examples

PubMed:
```
("federated learning"[Title/Abstract] OR "collaborative learning"[Title/Abstract])
AND ("differential privacy"[Title/Abstract] OR "privacy-preserving"[Title/Abstract])
AND 2018:2026[Publication Date]
AND (randomizedcontrolledtrial[pt] OR journalarticle[pt])
```

arXiv:
```
cat:cs.LG AND (abs:"federated learning" AND abs:"differential privacy")
```

OpenAlex (no key required; add a `mailto` to enter the polite pool — **use a project contact
address, configured, not hardcoded**):
```bash
curl -sG "https://api.openalex.org/works" \
  --data-urlencode 'filter=title_and_abstract.search:"federated learning" "differential privacy",publication_year:2018-2026' \
  --data-urlencode 'per-page=200' \
  --data-urlencode "mailto=${OPENALEX_CONTACT_EMAIL}"
```

OpenAlex notes:
- Abstracts come as an **inverted index** — reconstruct with
  `Object.entries(abstract_inverted_index).flatMap(([w, idx]) => idx.map(i => [i, w])).sort((a,b)=>a[0]-b[0]).map(x=>x[1]).join(' ')`.
- On HTTP 429, back off exponentially and retry up to 3 times; the polite pool reduces 429s.
- Cursor-paginate (`cursor=*`) rather than page-paginating past 10,000 results.

## Stage 3 — Deduplicate and Screen

### Deduplication

Match on **DOI first**, title+year as fallback (normalized: lowercase, strip punctuation, collapse
whitespace). Report the count removed. Keep the record with the richest metadata.

### Three-stage screening

| Stage | Screen on | Record |
|---|---|---|
| 1. Title | Relevance of the topic | Excluded count + reason categories |
| 2. Abstract | Meets all inclusion criteria | Excluded count + reason per category |
| 3. Full text | Verifiable against the criteria | Excluded count + reason per paper |

Record the count and reason **at every stage**. That record *is* the PRISMA flow diagram:

```
Identified (n = 4,318)  →  After dedup (n = 2,907)  →  Title/abstract screened
  →  Excluded (n = 2,610)  →  Full text assessed (n = 297)  →  Excluded with reasons (n = 231)
  →  Included (n = 66)
```

### Inclusion / exclusion criteria — write them before screening

Example criteria set:

**Include**
- Published 2016–2026 (or: last 10 years)
- English (state the limitation explicitly in the review's threats-to-validity)
- Peer-reviewed venue **or** a preprint with a named author affiliation
- Empirical evaluation on a stated benchmark or dataset

**Exclude**
- Case reports or studies with n < 5 (insufficient to generalize)
- Conference abstracts with no full text available
- Editorials, commentaries, position pieces (unless the review type explicitly includes them)
- Duplicate publications of the same study (keep the most complete version; note the linkage)
- Retracted papers — check retraction status before including
- Work where the preprint has since been formally published with different results → cite the
  published version and record the preprint's version date

### Citation snowballing

Systematic searching misses recent and poorly-indexed work. Snowball to close the gap:

| Direction | Method | Finds |
|---|---|---|
| **Backward** | Read the reference list of each included paper | Foundational work |
| **Forward** | "Cited by" — Semantic Scholar, OpenAlex `filter=cites:<work_id>`, Google Scholar | Newer work building on it |
| **Seeded** | Pick 3–5 known-relevant seeds, snowball both directions, iterate until no new relevant papers appear | Coverage confirmation |
| **Author** | Track prolific authors via ORCID or OpenAlex `author.id` | Group-level output |
| **Similar** | "Related articles" / OpenAlex `filter=related_to:<id>` / Semantic Scholar recommendations | Adjacent work with different terminology |

Iterate snowballing until **saturation**: a full round produces no new inclusions. Report the
number of rounds and the saturation point.

## Stage 4 — Quality Appraisal

Required for systematic reviews; optional for scoping. Pick the tool that matches the study design.

| Study design | Instrument |
|---|---|
| Randomized controlled trial | **Cochrane Risk of Bias (RoB 2)** — randomization, deviations, missing data, outcome measurement, selective reporting |
| Non-randomized / observational | **Newcastle-Ottawa Scale** — selection, comparability, outcome |
| Systematic review (reviewing reviews) | **AMSTAR 2** |
| Diagnostic accuracy | **QUADAS-2** |
| Qualitative | **CASP** checklist |
| CS/ML empirical paper | No standard tool — build one: benchmark appropriateness, baseline strength, ablation presence, statistical significance, code/data availability, reproducibility of the reported numbers |

Grade each included study: **High / Moderate / Low / Very Low** confidence, with the reason.

Then grade the body of evidence for each outcome (GRADE-style): start at High for RCTs / Moderate
for observational, downgrade for risk of bias, inconsistency, indirectness, imprecision, and
publication bias.

**Do not silently exclude low-quality studies.** Report them, grade them, and run a sensitivity
analysis with and without them. Exclusion without reporting is bias.

## Stage 5 — Synthesize

### Synthesize by theme, not by paper

The single most common failure is a review that reads:

> Zhang et al. (2021) proposed X. Li et al. (2022) proposed Y. Wang et al. (2023) proposed Z.

That is an annotated bibliography, not a review. Instead:

Organize into **3–5 themes** that answer the question. Within each theme, compare studies against
each other:

```markdown
### 主题 2 — 隐私预算的分配策略

三种策略在文献中占主导：均匀分配 [3,7,12]、按数据量加权 [5,9]、以及基于梯度的自适应分配 [11,14,15]。

**共识**：均匀分配在客户端数据分布接近 IID 时足够 [3,5,7]。

**争议**：自适应分配是否优于加权分配尚无定论 — [11] 在 CIFAR-10 上报告 +4.2% 准确率，
而 [14] 在相同数据集上未能复现（差异可能来自客户端数量：60 vs 500）。

**缺口**：没有研究评估这些策略在 >10,000 客户端规模下的表现。
```

Every theme section names: what the literature **agrees** on, what it **disputes**, and what is
**missing**. Those three are the value of the review.

### Comparison table

| Paper | Year | Method | Dataset | Metric | Result | Quality | Limitation |
|---|---|---|---|---|---|---|---|

Numbers must be transcribed exactly, with the unit and the comparison condition. A result quoted
without its baseline is not a result.

### Extract the gap

The review's conclusion is a gap statement, not a summary: what is unknown, why it matters, and
what evidence would settle it.

## Stage 6 — Verify Citations

**Every citation is verified before it appears in the output.** An unverifiable citation is worse
than no citation — it propagates.

For each reference:
1. Resolve the **DOI** through CrossRef:
   ```bash
   curl -s "https://api.crossref.org/works/${DOI}" | head -c 2000
   ```
2. Confirm **authors, title, year, and venue** match what you are citing.
3. Confirm the **claim** you attribute to it is actually in the paper (check the abstract at
   minimum; check the relevant section for a specific number).
4. Re-run until **all** pass. A 95% verified reference list is a 5% fabricated one.

Additional rules:
- Prefer the **published version** over the preprint. If citing a preprint, say so and record the
  version (`arXiv:2103.04567v2`) and its date.
- One citation format throughout. Mixing APA and IEEE in one document is a visible defect.
- No citation you have not read, except when explicitly marked as cited-in (secondary citation):
  `(Smith 2019, as cited in Lee 2022)`.
- Check retraction status for anything load-bearing.

## Stage 7 — Output

```markdown
# {Topic} — {Review Type}

**Protocol registered**: {date}  **Searches last run**: {date}  **Included studies**: {n}

## 1. Question (PICO)
## 2. Method
   ### 2.1 Review type and rationale
   ### 2.2 Databases and dates searched
   ### 2.3 Search strings (verbatim, per database)
   ### 2.4 Inclusion / exclusion criteria
   ### 2.5 Screening process (PRISMA flow)
   ### 2.6 Quality appraisal instrument
## 3. Results
   ### 3.1 Study characteristics table
   ### 3.2 Quality assessment
   ### 3.3 Thematic synthesis (3–5 themes, each with 共识/争议/缺口)
## 4. Discussion
   ### 4.1 What the evidence supports
   ### 4.2 What remains contested
   ### 4.3 Gaps and future work
   ### 4.4 Threats to validity (language restriction, database coverage, publication bias)
## 5. References (all DOI-verified)
## Appendix A — Full search log
## Appendix B — Excluded papers with reasons
```

Write to `docs/analysis/LIT-REVIEW-{topic}-{date}.md`. Convert to PDF only if the user asks.

## Key Principles

- **Reproducible or it didn't happen** — the search log is a first-class deliverable, not scaffolding.
- **Criteria before screening** — writing inclusion rules after seeing the results is how bias enters.
- **Record exclusions with reasons** — the PRISMA flow is the audit trail.
- **Synthesize across studies** — a paper-by-paper list is a bibliography.
- **Grade the evidence, don't hide it** — low-quality studies are reported, not silently dropped.
- **Every citation resolves** — DOI-checked against CrossRef, claim-checked against the paper.
- **Snowball to saturation** — database search alone misses recent and poorly-indexed work.

## Anti-Patterns

| Anti-pattern | Consequence | Instead |
|---|---|---|
| Annotated bibliography disguised as a review | No synthesis, no gaps, no value | Organize by theme; name consensus/dispute/gap per theme |
| Searching one database | Systematic bias toward that database's coverage | ≥ 3 complementary sources + snowballing |
| Writing inclusion criteria after screening | Criteria reverse-engineered to justify the result set | Criteria in the protocol, dated before the search |
| Not recording exclusion counts | No PRISMA flow; the review cannot be audited | Count and categorize at every screening stage |
| Citing an abstract you never read | Misattribution; the claim is often not what the title implies | Read it, or mark it as a secondary citation |
| Unverified or hallucinated references | Destroys the review's credibility entirely | DOI-verify every entry through CrossRef |
| Ignoring retracted papers | Building on withdrawn findings | Check retraction status |
| Silently dropping low-quality studies | Selection bias with no trail | Include, grade, and run a sensitivity analysis |
| Quoting a result without its baseline | The number is meaningless alone | Always record metric + dataset + comparison condition |
| Using Google Scholar as the primary source | Unstable, unexportable, irreproducible | Use it for snowballing only |
| `NOT` in the search string | Silently excludes relevant work mentioning the term | Use `NOT` only with an explicit justification |
| Claiming exhaustive coverage in a narrative review | Overstates what was done | State the review type and its limits honestly |
