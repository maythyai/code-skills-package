---
name: csp-prd-review
description: "Review a PRD / BRD / requirement document and return a scored, evidence-cited verdict. Three modes: (A) weighted 10-point scoring against a module rubric, (B) completeness audit across MECE dimensions with severity-ranked gaps. Use when the user says 'PRD评审', '需求评审', 'PRD review'."
version: "1.0.0"
layer: 2
category: workflow
phase: review
domain: patterns
scope: analysis
tools: [Read, Write, Edit, Glob, Grep]

dependencies:
  skills: []

related_skills:
  - csp-prd-generation
  - csp-prd-parser
  - csp-prd-traceability
  - csp-prd-change-impact
  - csp-requirement-decomposition
  - csp-requirement-prioritization
  - csp-tech-design-review
  - csp-doc-review

anti_rationalizations:
  "The PRD is basically fine, just a few typos": "Typos are cosmetic. Missing acceptance criteria, unstated dependencies, and unquantified goals are what cause rework. Score the substance, not the surface."
  "I know what they meant, so I won't flag the ambiguity": "If you had to infer it, the next reader will infer something different. Ambiguity that required interpretation is a defect — cite it."
  "The team is in a hurry, a harsh review will slow them down": "A review that passes a broken PRD costs 10x more downstream. The cheapest place to fix a requirement is before code exists."
  "This module doesn't apply to this product, so I'll skip it silently": "Skip it explicitly and say why. A silent skip reads as 'reviewed and found nothing'."

triggers:
  keywords: ["PRD评审", "需求评审", "PRD打分", "PRD质量", "需求文档审查", "BRD评审",
             "需求评审意见", "验收标准检查", "PRD体检", "PRD review", "requirement review",
             "spec review", "PRD completeness", "需求文档打分", "评审这份PRD"]
  intents:
    - "user has a PRD/BRD/requirement document and wants it reviewed before development starts"
    - "user wants a score or verdict on requirement document quality"
    - "user wants to know what is missing or ambiguous in a spec"
    - "user wants acceptance criteria checked for testability"
  context:
    - "pre_development_gate"
    - "requirement_handoff"
    - "before_decomposition"
role: specialist
---

# PRD Review

Review a requirement document and return a **scored, evidence-cited verdict** — not a list of
vague impressions. Every deduction quotes the PRD. Every gap has an owner and a fix action.

## When to Use

- Before a PRD enters development (gate review)
- After a PRD draft is written, to find structural gaps early
- When a requirement handoff is producing repeated clarification questions
- When acceptance criteria need to be checked for testability
- When a BRD or narrative requirement doc needs paragraph-level annotation review

## When NOT to Use

- The document is a technical design, not a requirement doc → use `csp-tech-design-review`
- The user wants to *write* a PRD, not review one → use `csp-prd-generation`
- The user wants to trace requirements to code/tests → use `csp-prd-traceability`
- The user wants to assess the impact of a *change* to an approved PRD → use `csp-prd-change-impact`

## Mode Selection

Pick the mode from what the user hands you. If unclear, ask once; do not guess and silently run
the wrong mode.

| Input | Mode | Output |
|---|---|---|
| Structured PRD following a team template with 背景/目标/需求详述 sections | **A — Weighted scoring** | Score out of 10 + grade + per-module deductions |
| PRD of any shape, user asks "what's missing" | **B — Completeness audit** | Severity-ranked gap list + overall verdict |
| BRD, one-pager, or narrative doc without fixed sections | **C — Annotation review** | Paragraph-level issues with tags + rewrite suggestions |
| User asks specifically about 验收标准 / acceptance criteria | **AC check** (runs inside any mode) | Per-criterion testability verdict |

Modes B and C compose: run B for the structural verdict, then C for the paragraphs that B flagged
as `AMBIGUOUS` or `INCOMPLETE`.

---

## Mode A — Weighted 10-Point Scoring

Score each module, weight it, sum to 10.0. **Never round up a deduction away.**

### Module weights

| Module | Weight | What it must contain |
|---|---:|---|
| 基础信息 | 1.0 | 文档版本、作者、评审人、状态、关联需求/项目号、变更记录 |
| 背景 | 1.5 | 问题现状 + **量化**数据 + 为什么现在做 |
| 目标与收益 | 2.0 | 可度量目标（数值+时间）、达成路径、评估方式 |
| 需求详述 | 3.0 | 功能清单、交互逻辑、边界与异常、埋点、MECE 拆分 |
| 灰度方案 | 0.5 | 放量节奏或显式标注"无需灰度" |
| 数据报表 | 0.5 | 看板/报表需求或显式标注"无需" |
| 风险与合规 | 1.5 | 资金风险判断、风险等级、数据泄露、合规披露 |

### Per-module deduction rules

Deduct from the module's own weight only. When a module hits 0, stop — it cannot go negative and
cannot borrow from other modules.

**基础信息 (1.0)**
| Condition | Deduction |
|---|---:|
| Each missing item (版本/作者/评审人/状态/关联号) | −0.2 |
| Present but malformed (e.g. version is "final-v2-真的final") | −0.1 |

**背景 (1.5)**
| Condition | Deduction |
|---|---:|
| No structured problem statement | −0.5 |
| No quantified data (no baseline number, no volume, no rate) | −0.5 |
| Vague/hand-wavy ("用户体验不佳") | −0.3 ~ −0.5 |
| Section empty or placeholder | score module as 0 |

**目标与收益 (2.0)**
| Condition | Deduction |
|---|---:|
| No numeric target ("提升转化率" without a number) | −0.6 |
| 达成路径 missing when effort > 5 person-days | −0.6 |
| 评估方式 unclear (who measures, with what, when) | −0.4 |

**需求详述 (3.0)**
| Condition | Deduction |
|---|---:|
| Missing key item in a described feature | −0.2 each |
| Interaction logic absent (only states what, never how it behaves) | −0.3 |
| Decomposition violates MECE (overlapping or gapped feature list) | −0.3 ~ −0.5 |
| 埋点 — pure server-side change | 0 |
| 埋点 — App/H5 missing key events (页面UV / 点击UV) | −0.3 ~ −0.5 |
| 埋点 — section completely unfilled | −0.3 |
| 埋点 — explicitly marked "无需埋点" | 0 |

**灰度方案 (0.5) / 数据报表 (0.5)**
| Condition | Deduction |
|---|---:|
| Unfilled | −0.5 |
| Filled but not concrete ("视情况灰度") | −0.2 ~ −0.3 |
| Not applicable but not marked as such | −0.2 |

**风险与合规 (1.5)**
| Condition | Deduction |
|---|---:|
| 资金风险 not assessed at all | −0.5 |
| 风险等级 missing or obviously wrong (money-moving feature marked 低) | −0.3 |
| 数据泄露风险 not annotated | −0.4 |
| 合规要求 not disclosed (privacy, licensing, industry regulation) | −0.3 |

### Grade bands

| Score | Grade | Action |
|---|---|---|
| ≥ 7.0 | 合格 | Proceed to decomposition; fix LOW items inline |
| 6.0 – 6.9 | 待改进 | Author revises the flagged modules, then re-review those modules only |
| < 6.0 | 不合格 | Do not enter development. Rewrite the zero-scoring modules first |

### Three red lines

1. **Every deduction must quote the PRD.** No quote, no deduction. If you cannot point at the
   offending text (or its absence in a section that exists), the deduction is invalid.
2. **No cross-module offsets.** A stellar 需求详述 cannot rescue an empty 背景. Score each
   module independently, then sum.
3. **Structural deviation caps the score at 6.0.** If the document abandons the team's template
   so thoroughly that modules cannot be located, the maximum achievable grade is 待改进 — say so
   explicitly in the report rather than inventing module scores.

### Mode A report structure

```markdown
# PRD 评审报告 — {文档标题}

**总分**: 6.4 / 10  **档位**: 待改进  **评审模式**: A（加权打分）

## 1. 模块得分
| 模块 | 权重 | 得分 | 主要扣分项 |
|---|---:|---:|---|

## 2. 扣分明细（含原文引用）
### 背景 (1.5 → 0.7)
- **−0.5 无量化数据** — 原文："目前用户反馈搜索不好用" → 缺基线数值、缺反馈量级
- ...

## 3. 阻塞项（必须在开发前修复）
1. ...

## 4. 建议项（可并行修复）
1. ...
```

---

## Mode B — Completeness Audit

Dimension coverage first, then per-gap severity. This mode answers "what is missing", not
"how well is it written".

### Step 1 — Audit the 10 MECE dimensions

| # | Dimension | Core question |
|---:|---|---|
| 1 | 问题与背景 | What breaks today, for whom, how often, what does it cost? |
| 2 | 目标与成功指标 | What numeric outcome, by when, measured how? |
| 3 | 用户与场景 | Which actor, in which context, doing what? |
| 4 | 功能范围 (In Scope) | What exactly is being built? |
| 5 | 非目标 (Out of Scope) | What is explicitly *not* being built? |
| 6 | 交互与流程 | Happy path + every branch, state, and transition |
| 7 | 边界与异常 | Empty / error / timeout / concurrent / permission / limit |
| 8 | 数据与埋点 | What is captured, what is reported, what is retained |
| 9 | 非功能需求 | Performance, security, accessibility, i18n, compatibility |
| 10 | 依赖与风险 | Upstream/downstream systems, third parties, compliance, rollback |

Coverage verdict per dimension:
- **Zero coverage** (dimension never addressed) → `CRITICAL` structural gap
- **Partial coverage** (mentioned but not actionable) → `SIGNIFICANT` gap
- **Full coverage** → no finding

### Step 2 — Classify each gap

| Type | Meaning | Fix action |
|---|---|---|
| `MISSING` | Not present at all | Author writes the section |
| `INCOMPLETE` | Present, insufficient to build from | Author adds the missing detail |
| `INCONSISTENT` | Contradicts another part of the doc | Author picks one and aligns both |
| `AMBIGUOUS` | Multiple valid readings | Author rewrites to a single testable reading |
| `INCORRECT` | Factually or technically wrong | Author corrects against the source of truth |
| `OUTDATED` | Superseded by a later decision | Author updates or deletes |

### Step 3 — Score severity

Each gap gets three 1–4 scores:

- **impact** — how much downstream damage if built as-is
- **likelihood** — probability the team actually builds it wrong
- **detectability** — how hard it is to notice before release (4 = nearly invisible)

```
severity = impact × 0.5 + likelihood × 0.3 + detectability × 0.2
```

| severity | Level |
|---|---|
| ≥ 3.5 | `CRITICAL` |
| 2.5 – 3.4 | `HIGH` |
| 1.5 – 2.4 | `MEDIUM` |
| < 1.5 | `LOW` |

### Step 4 — Apply the anti-pattern checklist

**CRITICAL anti-patterns** (any one of these is automatically ≥ CRITICAL):
1. **方案污染** — the doc specifies HOW (tech stack, table schema, class design) before WHAT is settled. Requirements freeze the solution and block better options.
2. **依赖否认** — a cross-team or third-party dependency is assumed away ("后端会支持的").
3. **验收模糊不可测** — acceptance criteria that no test could ever fail ("系统应稳定运行").
4. **边界缺失** — no error / empty / limit / concurrent behaviour anywhere in the doc.

**HIGH anti-patterns:**
5. No Out of Scope section → scope creep is guaranteed, not possible.
6. No success metric → the feature cannot be evaluated after launch.
7. No stated assumptions → hidden assumptions become silent blockers.
8. 排期幻想 — timeline asserted without an effort basis or dependency check.
9. No risk register → the first risk discovered is discovered in production.
10. Key role missing — no named owner for design, QA, data, or compliance sign-off.

### Step 5 — Rate impact and effort

**Impact class**
| Class | Meaning |
|---|---|
| `BLOCKING` | Development cannot start correctly |
| `DEGRADING` | Development proceeds but quality/scope suffers |
| `COSMETIC` | Presentation only |

**Fix effort**
| Bucket | Range |
|---|---|
| `trivial` | < 30 min |
| `small` | 30 min – 2 h |
| `medium` | 2 – 8 h |
| `large` | 1 day+ |

### Step 6 — Overall verdict

Evaluate top-down; the first match wins.

| Verdict | Condition |
|---|---|
| `critical_issues` | Any CRITICAL gap, **or** more than 5 HIGH gaps |
| `significant_gaps` | No CRITICAL and more than 3 HIGH |
| `minor_issues` | No CRITICAL, ≤ 3 HIGH, some MEDIUM |
| `acceptable` | Only LOW/MEDIUM gaps, all `DEGRADING` or `COSMETIC` |
| `excellent` | Fewer than 5 gaps total and all are LOW |

### Scope tailoring

| Scope | Dimensions to audit | Depth |
|---|---|---|
| `feature` | All 10, but 1/2 may be brief | Full detail on 4–8 |
| `epic` | All 10 | Full detail on 2/3/5/10 |
| `product` / `initiative` | All 10 | Full detail on 1/2/3/5/10; 6–8 may defer to child PRDs |
| `quick` (user asked for a fast pass) | 2, 4, 5, 7, 10 | Report only CRITICAL + HIGH |

State the scope you used at the top of the report.

---

## Mode C — Qualitative Annotation Review

For BRDs, one-pagers, and narrative docs where section scoring is meaningless.

### Annotation triggers

Annotate a paragraph when any of these hold:
- A claim has no evidence or number behind it
- A sentence admits two or more readings
- An actor is unnamed ("系统会处理" — which system? whose action?)
- A data source, format, or volume is referenced but undefined
- A workflow step is skipped ("然后审批通过" — who approves, on what condition?)
- An exception path is absent where one obviously exists
- A dependency is asserted without an owner
- A success condition cannot be tested
- A non-functional expectation is implied but never stated
- A term is used inconsistently or undefined
- Two paragraphs contradict each other

### Issue tags

Use exactly one primary tag per annotation:

`ambiguity` · `scope` · `actor` · `data` · `workflow` · `exception` · `dependency` ·
`acceptance-criteria` · `nonfunctional` · `term-definition` · `conflict`

### Annotation rules

1. **缺则提问，绝不臆造业务规则.** If the document does not say, write a question. Never fill
   the hole with a plausible-sounding rule — you are not the domain owner and a confident
   invention gets built.
2. **修订建议必须给完整可测替换句.** Not "建议补充边界条件" but:
   > 原文："超时后重试。"
   > 建议替换："请求超过 3s 未响应时，客户端最多重试 2 次，间隔 1s；3 次均失败后展示错误码 `TIMEOUT_504` 并上报埋点 `api_timeout`。"
3. **一次只标一个问题.** A paragraph with three defects gets three annotations, not one
   compound note.
4. **保留原文引用.** Every annotation opens with the quoted text so the author can locate it
   without re-reading the whole document.

### Mode C output

```markdown
## 段落级批注

### L42 · `exception` · HIGH
> 原文："用户上传文件后系统进行解析。"

**问题**：未定义解析失败、文件格式不支持、文件超大、并发上传的处理。

**提问**：解析失败的判定条件是什么？失败后用户看到什么？文件是否保留？

**建议替换**：（给出完整可测句）
```

---

## Acceptance Criteria Check

Runs inside any mode whenever the document contains acceptance criteria (or should).

Each criterion must pass all four:

| Check | Pass condition | Fail example |
|---|---|---|
| **SMART** | Specific, Measurable, Achievable, Relevant, Time-bound | "提升性能" (no measure, no bound) |
| **Dual-path coverage** | Both a happy-path criterion *and* an error/edge criterion exist for the feature | Only "用户能成功提交" with no failure case |
| **Objectively verifiable** | Two independent testers would reach the same verdict | "界面美观" |
| **Sign-off named** | A role or person owns acceptance | Criteria listed with no acceptor |

Report per criterion: `PASS` / `FAIL — {which check}` plus a rewritten criterion for every FAIL.

---

## Process

1. **Read the whole document once** before scoring anything. Partial reads produce
   "missing" findings for content that appears later.
2. **Identify the document type** (structured PRD / BRD / one-pager / change note) and pick the mode.
3. **Check for a team template.** If `docs/` or the repo contains a PRD template, audit against
   it; template deviation is itself a finding.
4. **Run the mode.** Collect findings as you go; do not interleave scoring with rewriting.
5. **Run the AC check** if criteria are present.
6. **Write the report** to `docs/analysis/PRD-REVIEW-{slug}-{date}.md`.
7. **Present the verdict first.** Lead with score/verdict + blocking items. The detail follows.
   Do not bury the verdict under 40 findings.
8. **Offer the fix path**, not the fix itself: name the module owner action for each blocking
   item. Rewriting the PRD is `csp-prd-generation`'s job, and only on request.

## Output Location

`docs/analysis/PRD-REVIEW-{slug}-{date}.md`

Never write review artifacts to the repo root.

## Key Principles

- **Evidence over impression** — every deduction and every finding cites the document.
- **Severity is a formula, not a mood** — use the weighted score so two reviewers converge.
- **Skip loudly** — a module you did not audit gets an explicit "N/A because …" line.
- **Ask, don't invent** — an unstated business rule becomes a question, never a guess.
- **Verdict first** — the reader needs the gate decision in the first five lines.

## Anti-Patterns

| Anti-pattern | Why it fails | Do this instead |
|---|---|---|
| Praising the doc before listing gaps | Softens the gate; the author fixes nothing | Lead with score + blocking items |
| Vague findings ("背景不够充分") | Unactionable; author cannot fix what they cannot locate | Quote the text, name the missing element, give the fix |
| Rewriting the PRD unasked | Oversteps the review role and hides the author's ownership | Suggest replacement sentences; leave the edit to the author |
| Scoring a module you never read | Produces a false pass | Mark it N/A and cap the grade |
| Inventing a business rule to fill a gap | The invention gets built and ships wrong | Ask the question; tag it `dependency` or `data` |
| Reporting 40 equal-weight findings | Everything is critical, so nothing is | Rank by severity; show CRITICAL/HIGH, collapse the rest |
| Passing a doc because the team is in a hurry | The cost moves downstream and multiplies | Give the honest grade plus the fastest path to 合格 |
