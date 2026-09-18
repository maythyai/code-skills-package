---
name: csp-research-report-writing
description: >
  Research-report writing & refactoring craft — distilled from top consulting reports and
  editorial playbooks. Use it to (1) write a research/user-research/industry report from
  scratch, or (2) optimize/rewrite/refactor an existing report (e.g. after stakeholder
  feedback). Triggers when the user asks to write a research report, tighten report
  structure, rewrite a report, add insight or action items, add data baselines, tension
  structure, "in-practice" boxes, or sharpen the close. Also used by other research skills
  (csp-product-research, csp-market-research, csp-account-research) as the writing-craft
  layer for their deliverables.
version: "1.4.0"
layer: 3
category: patterns
domain: patterns
phase: review
scope: analysis
tools: [Read, Write, Edit, Glob, Grep]

dependencies:
  skills: []

related_skills:
  - csp-product-research
  - csp-market-research
  - csp-competitive-analysis
  - csp-account-research
  - csp-article-writing

anti_rationalizations:
  "The data speaks for itself": "Data without a frame is a cross-tab dump. Pick one analytical device and tell the story through it."
  "Longer is more thorough": "A 79-page report with 10 recommendations gives nothing. One page-one action table + one minimum action gives the reader something to do."
  "The reader can judge the numbers": "An isolated 91% is meaningless. Every number needs a baseline (last year / competitor / industry mean)."
  "A catchy coined term helps": "A term that needs explanation to be understood is a bad term. Use plain words; if a coinage isn't first-glance clear, don't use it."

triggers:
  keywords: ["写调研报告", "优化报告", "重写报告", "报告结构", "洞察", "行动点",
             "数据基线", "张力结构", "实操框", "收尾精炼", "重构报告",
             "write research report", "refactor report", "report structure", "sharpen report"]
  intents:
    - "user wants to write a research report from scratch"
    - "user brings an existing report and wants it restructured or sharpened"
    - "user received stakeholder feedback and wants the report revised"
  context: ["review", "define", "after_research"]
---

# Research Report Writing & Refactoring

A writing-craft skill for research reports. Distilled from consulting-firm reports and editorial playbooks. Two scenarios:

- **Write from scratch** — follow the "writing flow" step by step.
- **Refactor an existing report** — follow the "refactor workflow" to diagnose, redesign, and rewrite.

This is the **writing-craft layer**. It does not gather data — pair it with a research skill (`csp-product-research`, `csp-market-research`, `csp-competitive-analysis`, `csp-account-research`) for evidence. Its job is to turn gathered evidence into a report a busy reader can act on after page one.

Read `shared/references/research-lifecycle-protocol.md` for the cross-cutting behavioral norms; this skill enforces the decision-oriented-output and evidence-labeling norms in particular.

---

## Refactor Workflow

When the user brings an existing report to optimize/rewrite:

### Step A: Read the existing report, understand the current structure

Read the whole thing, record:
1. The current chapter structure and logic line.
2. What the core conclusion is and where it sits.
3. Whether there are action recommendations, and in what format.
4. Language style (academic? AI-flavored? plain speech?).

### Step B: Diagnose — feedback vs research purpose

**Against stakeholder feedback** (common problem patterns):
- "Too much content" → structure problem: info laid out by topic order, no hierarchical convergence.
- "Lacks core insight" → conclusions are data descriptions, not judgment sentences; findings aren't named.
- "Finished it but don't know what to do" → missing action recommendation table.
- "Too long / can't finish" → fails "page one carries 80%".
- "Data doesn't land" → missing comparison baseline; absolute numbers with no reference frame.

**Against the original research purpose:**
- List the 3–5 core questions the research was meant to answer.
- Check each: does the report answer it explicitly?
- Find "clearly insufficient" and "completely missing" parts.

### Step C: Design new structure & rewrite

1. Pick a new analytical device (comparison / classification / progression).
2. Distill 3–5 core findings from existing content (judgment sentence + number).
3. Give each core finding a memorable name (but it must be first-glance understandable — see rule 5).
4. Write the action recommendation table (format below).
5. Rewrite each section by the 8 core rules.
6. Verify with the self-check list.

---

## Action Recommendation Table

On page one, right after "core findings", the action table:

| Priority | Direction | Concrete action | Expected effect |
|----------|-----------|------------------|-----------------|
| P0 | [one-word direction] | [actionable enough to be a project ticket] | [what happens after doing it] |
| P0 | ... | ... | ... |
| P1 | ... | ... | ... |
| P2 | ... | ... | ... |

**Writing requirements:**
- P0 ≤2 items (truly most urgent), P1 ≤3, P2 catches the rest.
- "Direction" uses the shortest possible word ("打通系统权限", "收口AI入口").
- "Concrete action" is specific enough to hand to a team — not "strengthen XX" platitudes.
- "Expected effect" maps to a pain point in a core finding above.
- After reading this table, the reader knows what to do, in what order, and what it buys them.

---

## Writing Flow (from scratch)

### Step 1: Confirm before writing

Confirm with the user before drafting:
1. What are the 3–5 core questions this report must answer?
2. Who is the reader? (decides formality and how explicit the actions are)
3. Any style reference or finalized report to align language with?

### Step 2: Design the analytical device

Before writing, fix an "analytical device" — all data unfolds around it:
- **Comparison group** (most common): two groups (deep vs shallow users; satisfied vs not); all analysis围绕 the difference, expressed in multiples ("3.6×").
- **Classification frame**: split the subject into mutually exclusive types (7 personas, 6 feedback dimensions); each type analyzed by the same template.
- **Maturity progression**: define 2–4 stages ("assist → optimize → reshape"); show the low-to-high path.
- **Longitudinal** (needs two-period data): same users/dimension, last year vs this year. The strongest format is a "same-person quote table" — left column last year, right this year, with name and role, so the change is visible at a glance. Use ✅⚠️❌ to mark per-dimension progress.

Also: name the 2–3 most central findings; define each in one sentence on first mention, then reuse the name. **But the name must be first-glance understandable** (rule 5).

### Step 3: Write by the 8 core rules

#### Rule 1: Conclusion first; every layer independently readable
- **Page one**: "core findings" (3–5 complete judgment sentences, each with a number) + action table. A reader who reads only this page gets 80%.
- **Chapter titles**: themselves the chapter's conclusion, **embedding the key number** ("91% of designers use AI weekly — up from 54% last year", not "AI usage analysis").
- **Chart titles**: judgment sentences, not descriptions ("product X leads satisfaction, but its most-mentioned strength isn't capability", not "satisfaction comparison").
- **Key transitions**: one bold lead sentence summarizing the point, so skimmers still catch it.
- **"Must drive" principle**: every subsection must drive a core finding or action. Test — "if I delete this subsection, what do the core findings and action table lose?" If "nothing", delete it or compress to one sentence and merge into the adjacent paragraph.

#### Rule 2: Give data a frame; don't lay out cross-tabs
- Once the analytical device is fixed, chart format is fixed — use "repeated structure" to lower cognitive cost.
- Multi-product/multi-dimension analysis uses one template per unit (e.g. each product: 4 key numbers + satisfied/dissatisfied table + top-3 user quotes).
- **Appendices by dimension/role use the same template × N units** so readers jump to what they care about.
- **Spec-Sheet template for parallel types**: ≥3 parallel types (products / team shapes / decision modes) each by a uniform tag set (typical feature → identifier → strengths → boundary) for zero-learning-cost horizontal comparison.
- One chart carries one message. If it needs 3 conclusions, split into 3 charts.
- **Infographics are argument tools, not illustrations**: each chart carries one independent argument (a 2×2 = a two-dimension cross/classification; a flowchart = a causal chain). Test — remove the chart; is the argument残缺? If not, it's decoration: either give it an argument role or delete it.
- No "comprehensive" cross-analysis. Pick one comparison angle and tell it through.

#### Rule 3: Tension pairing — positive, negative, open judgment
Structure: **positive data → "but"/negative voice → open judgment or direction**
- Don't open with "the first question's result is..."; lead with a tense judgment.
- Prove the positive with data.
- Immediately introduce the negative or contradictory ("but...", "meanwhile...").
- End with a directional judgment or an open question — not a forced conclusion.

**Multi-voice citation**: under one point, put 3–5 quotes from different roles/positions to show the opinion spectrum. Reader trust comes from "I saw all the voices" — beneficiaries and skeptics, managers and frontline. Don't cherry-pick only quotes that support your conclusion.

Each chapter can use the same micro-arc internally: find a fact → introduce the counter/ surprising → open judgment.

#### Rule 4: Separate fact layer and judgment layer
- **Body**: only facts and data ("67% of users mentioned 'not smart'").
- **Opinion/inference**: at the chapter end, a "what it means" paragraph, marked by tone ("this suggests...", "the logic here is...").
- **Explicit stance**: when a judgment is exploratory, mark it ("our lean is...", "we want to offer a judgment:") so readers know it's the author's view, not a settled conclusion. Knowledge honesty builds trust.
- **Real-person quotes**: pick representative quotes from user voice, tag identity ("a deep user said..."), as the感性 evidence layer. Lightweight tagging — "subo said:", "CEO Li Zhifei admitted:", like storytelling not citations.
- **Cases in two tiers**: in-body cases use "summary format" (half page: problem → practice → effect, one quantified number); appendix cases use "full format" (1–2 pages: avatar+name/dept → title+tools → one-line core value → detailed Before/After → steps → screenshots). Linked between tiers.
- **Representative case box**: when embedding a case in body, visually separate it (gray box / indented block) from the analysis narrative; title it "Representative case:". The narrative rhythm isn't broken, but the case sits alongside for comparison.
- **Methodology**: in the end appendix or括号 footnotes ("based on 298-user survey feedback"), not展开 in body.

#### Rule 5: Short sentences, plain speech, neutral forceful wording
- One sentence, one thing. More periods, fewer commas.
- Don't write "调研结果表明" — write the result.
- Don't write "X and Y have a positive association" — write "heavy users are more satisfied (87% vs 52%)".
- Use multiples over percentage growth ("deep-user satisfaction is 1.7× shallow users'").
- Use metaphor to make the abstract perceivable ("AI has a brain but no hands" beats "AI lacks execution ability").
- **"Not… but…" denial frame**: when a concept is easily misunderstood, first voice the wrong reading then deny it — "super-teams are a product of structure, not of parties"; "form is a static slice; the operating mechanism is the dynamic system." This prevents misreading better than a bare correct conclusion.
- No academic rhetoric, no passive voice, no "呈现...趋势" filler.
- **Naming red line**: when naming a finding, it must be first-glance understandable. If a coined term needs explanation, don't use it. Good names use plain words ("AI has a brain but no hands"); bad names sound academic ("脑手分离", "结构化天花板" — first-glance opaque, don't use).
- **Neutral-wording rule**: no emotional/exaggerated rhetoric. Banned words: 反噬, 用脚投票, 碾压, 疯狂, 好牌打烂, 消耗殆尽, 护城河, 巧妇难为. Replace with neutral fact verbs: migrate, spread, gap exists, weaken, drag. Test — if removing the word doesn't change the factual meaning, it's rhetoric, not fact; delete or replace.

#### Rule 6: Data must carry a baseline, and must "land"
- Every key datapoint has a comparison baseline (last year / competitor / industry mean / last survey) so the reader can judge magnitude.
- Express change as YoY, multiples, or percentage-point delta ("from 54% to 91%, +37pp").
- An isolated absolute number is unconvincing — "91%" < "91% (last year 54%)".
- With no comparable baseline, give at least a reference anchor (industry average, team target, full mark).
- **Before→after number landing**: the strongest way to make data perceivable — "bids went from two weeks to 5 minutes", "customer questions compressed from two weeks to same day", "from 300 people to 150, efficiency up 4–5×". Beats abstract percentages.
- **Scale threshold explicit**: for gradual processes, give precise breakpoint numbers so readers can find themselves — "5–50 people靠直接信任", "50–300 need AI coordination", "300+ must have systematic info infrastructure". Not "from small to large" — give the scale ruler.

#### Rule 7: Tagging & visual anchors
Key judgments, classifications, comparisons get reusable "tags" so a reader entering anywhere can orient fast.
- **Scattered bold judgment sentences**: core judgments aren't only in titles/page one — embed them in body paragraphs in bold. A skimmer reading only bold sentences gets all core judgments. ≥2–3 bold judgment sentences per chapter, scattered.
- **"X vs Y" antithesis tags**: use antithesis phrases to mark structural tension — "by-role split vs by-advantage amplify", "slim down vs add revenue", "flat result vs flat design". High information density navigation; one glance tells the reader what this section is about.
- **Number + plain short-tag combo**: classifications are never pure-numbered. Always followed by a plain short tag — "path A: bottom-up spontaneous emergence" (not "path A: emergence mode"). The tag itself carries information.
- **Infographic title = judgment**: every chart/table/frame title is itself a conclusion — "collaboration logic: from split to amplify", "four structural tensions of super-teams". The title doesn't describe what's in the chart; it tells the reader what the chart says.

#### Rule 8: Narrative rhythm & trust-building
Good reports have right content and right rhythm. These techniques control cognitive load and trust.
- **Running metaphor system**: pick one core metaphor running through the whole report (e.g. "gardener"); earlier text plants the seed ("you can't design how a tree grows"), the close正式 reveals it. Metaphor isn't decoration — it's the感性 anchor parallel to the analytical device (analytical device = rational骨架, metaphor =感性骨架; together they support the whole).
- **"Hourglass" paragraph rhythm**: at the section level, repeatedly use concrete → abstract → concrete — open with a case/quote → abstract to a principle → land on another case for contrast. Prevents readers from "floating away" in consecutive abstract paragraphs; every 2–3 paragraphs a concrete anchor pulls them back.
- **Restrained "not-expanding" statement**: explicitly tell the reader which questions you deliberately don't answer — "this is a question this report intentionally doesn't展开 but can't bypass." Daring to say "I don't know" increases the credibility of the "I do know" part.
- **Second-person immersive narrative** (optional, for org/experience reports): after the framework analysis, switch to "imagine you are..." second-person to let the reader feel the framework in reality. Template: assume identity → one infographic (core pattern) → concrete work scene → one-line point.

### Step 4: Chapter-level layout rules

Multi-finding chapter internal layout:
- **Chapter-opening infographic map**: each chapter opens with an overview infographic/框架 table as the chapter "map" (a 2×2, a stage diagram, a classification table), then unfolds block by block. Reader sees the panorama first, then enters the local.
- Use **numbered sub-blocks** (1.1 / 1.2 / 1.3...) for each independent finding.
- Each sub-block fixed structure: **bold conclusion title** (1 judgment sentence + number) → immediately a data table or key number → ≤2–3 sentence interpretation → `---` separator.
- Insert **"In Practice" boxes** inside chapters — action landing points独立 of the narrative主线, visually distinct (indent/box/italic). Box traits: title "实操建议：XXX" / "In Practice: XXX"; content opens with imperative, directly executable ("assess what tools your team uses", "pick 2–3 chains to pilot"); 3–5 bullets, 1–2 sentences each; placed after the related finding, before the next finding.

### Step 5: Report close structure

After the action table, before the appendix, add two close modules:

**Key Takeaways (required)**:
- Numbered list (01–05), distilling全文 core findings.
- 1–2 sentences each, covering all chapters.
- Function: a reader who flips to the end still gets all key points.
- Differs from page-one "core findings" — Key Takeaways are the高度提炼 after reading the whole thing; may include judgments only understandable after the full read.

**Open questions (optional, for exploratory/trend reports)**:
- 3–5 questions the report couldn't fully answer.
- Introduce with "we're curious...", "worth tracking next...".
- Each followed by 1–2 sentences of lean answer but no settled verdict ("our lean is...").
- Function: invite the reader to keep thinking, signal follow-up research方向, avoid "know-it-all" lecturing. Explicitly admitting boundaries increases全篇 credibility.

**Narrowed action recommendation (optional, for manager-facing reports)**:
- After all analysis, deliberately narrow to one minimum starter action — "if you could do only one thing, do this."
- 79 pages of analysis + 10 recommendations = nothing. 1 minimum action = the reader actually does it.
- Format: one bold action sentence + 2–3 sentences on why this one and not others.

### Step 6: Self-check list

After writing, verify each:
1. Does a page-one-only reader know 80% of conclusions?
2. Is there an analytical "device" (comparison / classification / progression), or number-piling?
3. Are the 2–3 most important findings named? Can others reference them in one word? **Are the names first-glance understandable?**
4. Is every chart title a judgment sentence or a description? **Does the title carry a number?**
5. Can the reader tell data-fact from inference?
6. Is methodology in body (breaking narrative) or in end/footnotes?
7. Is there narrative tension (positive → negative → open), or flat平铺?
8. Is multi-product analysis one template, or format chaos?
9. Language: short sentences + active voice + embedded numbers, or long sentences + academic flavor?
10. Are there real-person quotes as感性 evidence? **3–5 multi-role quotes under one point?**
11. **Is there an action table (P0/P1/P2 + direction + action + expected effect)? Does the reader know what to do?**
12. **Does the report answer every original research purpose? Any gaps?**
13. Does every key datapoint carry a baseline, or are there isolated absolutes?
14. Is wording neutral? Any emotional/exaggerated rhetoric? (check banned-word list)
15. Does every subsection drive a core conclusion or action? Any "exists but doesn't drive" filler?
16. Is there a numbered Key Takeaways close?
17. **≥2–3 scattered bold judgment sentences per chapter? Does a skimmer reading only bold get the core?**
18. **Does each chapter open with an infographic "map"? Can the reader see the panorama first?**
19. **Do numbers use before→after landing, or only abstract percentages?**
20. **Is there a running metaphor (感性 anchor)? Planted earlier,回收 at close?**
21. **Hourglass paragraph rhythm (concrete→abstract→concrete)? Any 3+ consecutive pure-abstract paragraphs?**

### Step 7: Language tuning (user preference)

Final pass against user writing preferences:
- Conclusions in plain speech; metaphor and colloquial expression allowed.
- Fact first, inference minimized.
- Product dimension必须有 a dedicated deep analysis (each product's strengths/weaknesses).
- User-quote classification frame: product function / model capability / ecosystem integration / experience / system performance / onboarding.

---

## Pitfalls

- Don't open with a wall of cross-tabs — fix the analytical device first, then selectively prove with data.
- Don't let "efficiency" override the user's thinking lead — show the data panorama first, let the user pick the direction, then deepen.
- Don't average-force all findings — pick 3–5 core findings to deepen; rest go to appendix.
- Don't mix methodology explanation into body — it breaks narrative rhythm.
- Don't let language sound "AI-written" — check for "呈现" "表明" "显著" academic words.
- Chart titles must not be descriptive — judgment sentences, with numbers.
- **Don't coin opaque terms** — "脑手分离" "结构化天花板" are first-glance opaque and intimidating. Use plain words.
- **Don't omit action recommendations** — "finished but don't know what to do" is the most common boss feedback. The action table is a requirement, not optional.
- **When refactoring, don't only fix language** — if the report doesn't answer the original research purpose, pretty language is useless. Diagnose structure first, then expression.
- **Cited data must trace back to the original source to confirm scope** — don't use a sub-category's number for the dimension total. Estimates and actuals can differ greatly; verify every number's source.
- **Quantity and percentage in the same column** — "N条（X%）" format, not two columns; reduces visual load.
- **Don't use emotional rhetoric in place of fact** — "碾压" "反噬" "用脚投票" make the report read like self-media; manager readers lose trust. Use neutral fact verbs.
- **Don't keep non-driving paragraphs** — they dilute attention. Ask "what's lost if deleted"; if "nothing", delete or compress to one sentence and merge.
- **Don't give isolated absolute numbers** — "91%" < "91% (last year 54%, +37pp)".
- **Don't let all quotes come from one kind of person** — multi-role quotes per point, show the spectrum.
- **Don't let infographics be decoration** — each chart must carry an independent argument.
- **Don't write 3+ consecutive pure-abstract paragraphs** — readers float away. Every 2–3 paragraphs a concrete anchor pulls back (hourglass rhythm).
- **Don't pretend omniscience** — for unanswerable questions, use "not-expanding" statements to explicitly mark the boundary. Pretending to know everything makes sharp readers distrust全篇.

## Verification

- Have someone not involved in the research read only page one, ask "what does this report say" — if they can restate it accurately, structure is right.
- Show them the action table, ask "do you know what to do" — if yes, actions are clear.
- List all chart titles alone — do they串 into a complete story?
- Check that every core finding has a "name" — and it's first-glance understandable.
- Read aloud — if it reads awkward, it's not plain enough.
- **Check against original research purpose, tick each** — does every purpose have a chapter answering it?
- **Random-sample 3 datapoints, check each has a baseline** — if isolated numbers, add a reference.
- **Check each chapter has ≥1 "In Practice" box** — does the reader know "what to do after reading"?
- **Read only the全篇 bold sentences — do they串 into a complete story?** If not, tagging is insufficient.
- **Check for a running metaphor** — planted earlier? 回收 at close? If it appears once, it's not yet a "system".
- **Check number landing** — random-sample 3 datapoints, do each have before→after or a scale threshold?

## Related Skills

- [[csp-product-research]] — venture-direction research (feeds this skill with evidence)
- [[csp-market-research]] — long-form consulting market report (uses this craft)
- [[csp-competitive-analysis]] — competitor analysis (its deliverable uses this craft)
- [[csp-account-research]] — B2B account pipeline (deliverables D1–D8 use this craft)
- [[csp-article-writing]] — long-form article writing with voice (a different writing discipline)
