---
name: csp-de-ai-ify
description: "Remove machine-generated tells from Chinese or English prose so it reads like a person wrote it — banned vocabulary, uniform sentence rhythm, hollow enumeration, filler transitions — while preserving every factual claim, number and citation exactly. Use when the user says the text sounds like AI, wants a human rewrite, asks to 去AI味, or needs a document to pass a human-sounding review."
version: 0.1.0
layer: 3
category: patterns
phase: review
domain: patterns
scope: review
tools: [Read, Write, Edit, Glob, Grep]
related_skills: [csp-article-writing, csp-brand-voice, csp-doc-review, csp-deep-research]
---

# De-AI-ify

Strip the machine tells out of a piece of writing so it reads like a person wrote it.

The cardinal constraint: **this is an expression-layer edit only.** Facts, numbers, names, dates,
claims and citations come through byte-identical. A rewrite that reads beautifully and quietly
changes a number is worse than the original.

## When to Use

- A draft reads as obviously machine-generated and needs to pass for human writing
- A document is technically correct but rhythmically dead
- The user asks to 去 AI 味 / humanize / make it sound natural
- Content marketing or docs that need a specific person's voice

## When NOT to Use

- The content itself is wrong or thin → fix the substance first; polishing bad content hides it
- Formal specifications, API docs, or legal text where the neutral register *is* correct
- The user wants a style profile built from real samples → `csp-brand-voice`
- The user wants new content written → `csp-article-writing`

---

## The Tells

### 1. Vocabulary layer

Chinese filler and hollow intensifiers:

| Category | Cut these |
|---|---|
| 机械连接词 | 首先 / 其次 / 再次 / 最后（连续使用）、此外、然而、因此、综上所述、总而言之 |
| 空洞开场 | 在当今社会、随着科技的发展、众所周知、随着…的不断…、在…的背景下 |
| 客套收尾 | 希望本文对您有所帮助、期待您的反馈、谢谢阅读、让我们拭目以待 |
| 万能褒义 | 有很多优势、表现出色、精细考究、极具价值、赋能、打造、闭环（无实指时） |
| 程度副词堆叠 | 非常、极其、十分、大大地、显著地（无数据支撑时） |

English equivalents:

| Category | Cut these |
|---|---|
| Hollow openers | "In today's fast-paced world", "It's worth noting that", "In the realm of" |
| Filler transitions | "Furthermore", "Moreover", "Additionally", "It is important to note" |
| Puffery | "robust", "seamless", "cutting-edge", "leverage", "unlock", "delve", "tapestry", "landscape" |
| Hedged closers | "In conclusion", "Ultimately", "At the end of the day" |
| Em-dash overuse | One per paragraph maximum; AI writing averages far more |

### 2. Sentence-rhythm layer

- **Uniform length.** Machine prose converges on 18–25 words per sentence, every sentence. Human
  prose varies: a long clause-heavy sentence, then a four-word one. Measure it — if the standard
  deviation of sentence length is small, that is the tell.
- **Passive voice by default.** "The configuration was updated by the system" → "The system
  updated the configuration". Passive is fine when the actor is unknown or irrelevant; it is a
  tell when it is everywhere.
- **Subject–verb–object without variation.** No fronted adverbials, no inverted clauses, no
  sentence starting with a conjunction.
- **Every paragraph the same shape**: topic sentence, two supporting sentences, a summarizing
  sentence. Real paragraphs vary — some are one line, some run long, some end mid-thought.

### 3. Structure layer

- **Perfect enumeration.** Three or five parallel bullets, each the same length, each starting
  with the same part of speech. Real lists are lopsided: one long item, two short ones.
- **Symmetric sections.** Every heading the same grammatical form, every section the same depth.
- **Compulsive signposting.** Announcing what you are about to say, saying it, then summarizing
  what you said.
- **No digression, no aside, no change of register.** Human writing has texture: a parenthetical,
  a rhetorical question, an abrupt shift to blunt.
- **Balanced hedging on both sides of everything.** "While X has benefits, it also has drawbacks"
  — a real author has an opinion.

---

## Rewrite Rules

Apply in this order. Later rules depend on earlier ones.

### R1 — Break the structure

- Vary paragraph length deliberately. Merge two thin paragraphs; split one dense one.
- Cut the summarizing sentence from every paragraph that has one. If the paragraph was clear, the
  summary is noise.
- Convert at least one list into prose, and at least one prose passage into a list — whichever
  direction makes that section read better.
- Delete section signposts ("In this section we will discuss…").

### R2 — Vary the rhythm

- Mix sentence lengths hard. Target a range from 4 words to 40+, not a mean.
- Start some sentences with a conjunction (但 / 可 / 所以 / And / But / So) where the register allows.
- Use a fragment. Deliberately.
- Insert one parenthetical aside per few paragraphs — the thing a person adds because they thought
  of it mid-sentence.

### R3 — Replace the connective vocabulary

| 原 | 改 |
|---|---|
| 此外 | 还有啊 / 对了 / 另外一点 |
| 然而 | 但问题是 / 可实际上 / 话虽这么说 |
| 因此 | 所以啊 / 这就导致 / 结果就是 |
| 综上所述 | 说白了 / 一句话 |
| 首先…其次…最后 | 直接讲第一件事，不加序号；用内容本身的顺序承接 |
| 众所周知 | 删掉，直接陈述事实 |
| 在当今社会 | 删掉，或换成具体时间/场景 |

English: `Furthermore` → `And`, `However` → `But`, `Therefore` → `So`, `It is important to note
that X` → `X`, `In conclusion` → delete.

### R4 — Add a person

- **口语标记** where the register permits: 说白了、讲道理、老实说、其实、你想想看。
- **Specific over abstract.** "性能有显著提升" → "P95 从 800ms 掉到 210ms". "用户体验良好" →
  "点三下就能提交，不用返回上一页".
- **主观判断.** Take a position. "这个方案更合适，因为…" beats "该方案具有一定的优势".
- **Repeated emphasis.** Humans circle back: state something, then two paragraphs later say
  "还是那句话——".
- **Pauses.** A short sentence after a long one. A question. Then the answer.
- **第一人称经历** where the user supplies one, or where the doc is authored in first person.
  Never fabricate an experience the author did not have.

### R5 — Cut what has no content

- Any sentence that could be deleted without losing information: delete it.
- Any adjective that is not doing work: delete it.
- Any sentence that exists only to transition: delete it and let the paragraphs sit next to each other.

---

## Fact Preservation (Non-Negotiable)

The rewrite changes **how** things are said, never **what** is said.

### Before rewriting

Extract an inventory of every load-bearing element:

```
- 数字（含单位、量级、百分比、日期、版本号）
- 专有名词（人名、产品名、公司名、API 名、命令名、文件路径）
- 引用（文献、链接、出处、被引用的原话）
- 事实断言（"X 导致 Y"、"A 不支持 B"、"该接口幂等"）
- 限定条件（"在…情况下"、"仅限"、"不适用于"）
```

### After rewriting

Diff the inventory against the new text, item by item:

| Check | Rule |
|---|---|
| Every number present and unchanged | A missing or altered digit is a **hard fail**; revert that sentence |
| Every proper noun spelled identically | Including case, hyphens, and version suffixes |
| Every citation intact | Same source, same claim attributed |
| Every factual assertion preserved | Weakening a claim ("必须" → "建议") is a change, not a style edit |
| Every qualifier preserved | Dropping "仅限生产环境" changes the meaning |
| Nothing added | No new example, number, or claim that was not in the source — even a plausible one |

Write the inventory into the delivery so the check is auditable.

### The tempting failure

Making text human often means adding a concrete example. **Do not invent one.** If the source says
"性能提升明显" and you need specificity, either find the number in the source material or leave
the sentence vague. A fabricated statistic in a human voice is indistinguishable from a real one —
that is exactly why it is the worst outcome this skill can produce.

---

## Process

1. Read the whole piece. Identify its register: is it a blog post, an internal doc, marketing copy,
   or a technical guide? The register sets how far R2–R4 can go.
2. Extract the fact inventory.
3. Run the tell scan (vocabulary → rhythm → structure) and mark the worst offenders. A quick
   mechanical scan helps:

   ```bash
   # sentence-length spread — a low spread is the rhythm tell
   # banned-phrase count
   grep -o -E "首先|其次|此外|然而|因此|综上所述|众所周知|在当今社会" input.md | sort | uniq -c
   grep -o -E "\b(Furthermore|Moreover|Additionally|However|Therefore|In conclusion|robust|seamless|leverage|delve)\b" input.md | sort | uniq -c
   ```

4. Rewrite section by section, applying R1–R5.
5. Run the fact-preservation diff.
6. **Self-check** (below).
7. Deliver the rewritten text plus the fact inventory diff. Do not silently drop the diff — it is
   the evidence that nothing was lost.

## Self-Check

- [ ] 有没有 "首先…其次…最后" 残留？
- [ ] 句长有没有变化？随机挑三段，最长句和最短句差几倍？
- [ ] 有没有具体例子（且例子来自原文，不是编的）？
- [ ] 有没有情绪词、主观判断、立场？
- [ ] 大声读一遍——哪里读着别扭、哪里像念稿？
- [ ] 段落长度是不是参差不齐（应该是）？
- [ ] 有没有一个列表被改成了散文，或反过来？
- [ ] 数字、专名、引用逐个对过了吗？
- [ ] 有没有新增原文没有的信息？（必须为"无"）

## Key Principles

- **Expression layer only** — the rewrite is cosmetic by contract; the facts are load-bearing.
- **Specificity comes from the source, never from invention** — a plausible fabricated number is
  the worst possible output.
- **Variance is the goal** — uniform rhythm is the tell; human writing is lopsided.
- **Register sets the ceiling** — a legal document should not get 说白了; a blog post should.
- **The diff is part of the deliverable** — an unverifiable humanization is an unauditable edit.

## Anti-Patterns

| Anti-pattern | Consequence | Instead |
|---|---|---|
| Swapping banned words for synonyms without touching rhythm | Still reads machine-made — the rhythm is the deeper tell | Apply R2 before/with R3 |
| Adding a plausible example to make it concrete | Fabricated content in a confident human voice | Find it in the source or leave it vague |
| Injecting 口语 into a formal spec | Register violation; the document loses authority | Match the register first |
| Weakening a claim to sound natural ("必须" → "最好") | Silent semantic change | Preserve modal strength exactly |
| Keeping every paragraph the same length | Structure tell survives the vocabulary fix | Vary paragraph length deliberately |
| Overcorrecting into forced quirk | Reads as performed casualness, which is its own tell | One or two asides per few paragraphs, not every sentence |
| Deleting a qualifier for flow | Changes the scope of the claim | Qualifiers are facts |
| Shipping without the fact diff | Nobody can tell whether a number moved | Always deliver the inventory diff |
