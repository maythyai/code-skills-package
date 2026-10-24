---
name: csp-meeting-action-extraction
description: "Turn meeting notes (pasted text, doc, transcript) into a verified action-item report: parse assignees/tasks/deadlines, extract decisions and risks, apply action-item quality gates, and map items onto a task system (Jira/Linear/any tracker)."
version: "1.0.0"
layer: 2
category: workflow
phase: plan
domain: patterns
scope: analysis
tools: [Read, Write, Edit, Glob, Grep]

dependencies:
  skills: []

related_skills:
  - csp-session-knowledge-extractor
  - csp-roadmap-update
  - csp-effort-estimation
  - csp-requirement-prioritization
  - csp-user-story-decomposition
  - csp-prd-generation

anti_rationalizations:
  "The notes are too messy to parse": "Messy notes are the norm. Parse patterns, flag ambiguity, never guess silently."
  "I'll just create the tasks directly": "Unconfirmed task creation pollutes the backlog. Present first, create after approval."
  "No assignee means I should pick someone": "Fabricating an assignee is worse than an unassigned task. Mark it '待认领' instead."

triggers:
  keywords: ["会议纪要", "会议记录", "会议任务", "行动项", "待办提取", "会后跟进", "会议结论",
             "meeting notes", "meeting minutes", "action items", "extract tasks from meeting",
             "会后行动", "例会纪要", "需求评审纪要", "排期会议"]
  intents:
    - "user wants to extract action items and tasks from meeting notes"
    - "user wants meeting decisions and open questions summarized"
    - "user wants parsed meeting action items created in a task tracker"
role: specialist
---

# Meeting Action Extraction

Extract actionable, verifiable work items from meeting notes and turn them into a
confirmation-ready task list. This skill handles parsing, quality gating, and task-system
mapping — it never invents assignees, deadlines, or decisions that are not in the source.

## When to Use

- After a meeting, to convert notes into a follow-up task list
- When notes mix decisions, discussions, and action items and need separating
- Before syncing parsed items into Jira/Linear/TAPD or another tracker
- When the team needs a decision log (what was decided, by whom, when)

## When NOT to Use

- Notes contain no meetings (use `csp-session-knowledge-extractor` for general session knowledge)
- The user only needs a meeting summary, not tasks (write the summary directly)
- Tasks already exist in the tracker and only statuses changed (edit the tracker directly)

## Process

### Step 1: Collect Notes

Input forms, in priority order:

| Form | Handling |
|------|----------|
| Pasted text | Use as-is; keep the original wording for quotes |
| Document file (md/doc/txt) | Read the file; cite the path |
| Audio transcript | Treat as raw text; transcripts may garble names — flag uncertain parses |
| Task-tracker page (Confluence/Notion/飞书) | Fetch via available tools; record the source link |

Record the meeting title and date — every extracted item carries this context.

### Step 2: Parse Action Items

Scan for action items using these patterns (priority order):

| # | Pattern | Example |
|---|---------|---------|
| 1 | @mention | `@Sarah to create user stories for chat feature` |
| 2 | Name + action verb | `Sarah will update architecture doc` / `Mike should review PR #123` |
| 3 | Action label | `Action: Sarah - create user stories` / `AI: Mike - update docs` |
| 4 | TODO with assignee | `TODO: Create user stories (Sarah)` / `[ ] Mike: review PR #123` |
| 5 | Bullet with name | `- Sarah: create user stories` / `* Mike - update docs` |

Extraction rules:
- **Assignee**: name after `@`, before `to/will/should/needs to`, after `Action:` or in parentheses.
- **Task**: text after the verb marker or `-`/`:`; strip markers; keep original wording.
- **Context**: meeting title + date + the decision or discussion this item came from.
- **Deadline**: parse explicit dates ("by Friday", "before 10/30", "本周五前"); leave blank if absent.
- **Priority**: only if the notes state one (P0/P1, 紧急, before release); otherwise leave to the user.

Chinese-language notes: names may be 中文名, English names, or pinyin — extract exactly as written,
never transliterate or guess. `陈赛负责跟进数据口径` → assignee 陈赛, task 跟进数据口径.

### Step 3: Quality Gate

Apply to every extracted item:

- **Verb-led**: starts with an action verb (create/update/review/follow up/确认/跟进). "Do the thing" fails.
- **Has owner or is explicitly unassigned**: never fabricate an assignee.
- **Verifiable**: completion can be objectively checked ("review PR #123" ✓, "想想方案" → flag as vague).
- **One action per item**: split compound items ("update doc and notify team" → two items).

Output quality tags per item:
- `待认领` — no assignee found (keep in a separate list, do not drop)
- `低置信` — parse is ambiguous (pronoun-only owner, garbled transcript)
- `表述含糊` — task passes no verifiability check (ask user to sharpen before creating)

### Step 4: Extract Decisions, Risks, Open Questions

Action items are only one output. Also extract:

**Decision log** — decisions made in the meeting:
`决策：A/B 实验结果不显著，暂不上线新首页（决策人：陈赛；日期：2026-10-22）`

**Risks and blockers** — items that block planned work:
`风险：依赖的支付接口文档未交付，联调排期有延期风险（owner：待认领）`

**Open questions** — explicitly deferred or unresolved topics:
`待定：Q4 是否保留双周发版节奏`

Rules: decisions must be traceable to the notes (quote the original line). If the notes say
"大家倾向方案 B" but no explicit decision, record it as 倾向 not 决策 — do not upgrade
tendencies into decisions.

### Step 5: Present for Confirmation

**CRITICAL**: Always show the parsed list BEFORE creating anything in a task system.

```
I found [N] action items, [M] decisions, [K] risks, [J] open questions.

Action items:
1. [任务] Create user stories for chat feature
   负责人: Sarah | 期限: 10/24 | 来源: Product Planning - 10/22
2. [待认领] 跟进数据口径确认
   负责人: (未指定) | 来源: 例会纪要 - 10/22
...

Confirm options:
1. 全部创建  2. 跳过某项（指明序号）  3. 修改负责人/描述/期限  4. 只输出报告，不创建
```

Wait for explicit confirmation. Options "yes create all" / "skip task 3" / "change assignee
for task 2" are the confirmation contract.

### Step 6: Map to Task System

After confirmation, map items onto the target tracker (Jira/Linear/TAPD/anything):

| Field | Source |
|-------|--------|
| summary | verb-led task description (keep original wording) |
| assignee | parsed owner (skip or leave unassigned for 待认领 items) |
| due date | parsed deadline (leave empty if absent) |
| description | task + context + source link + `> original note quote` |
| type | Story for user-facing features, Bug for defects, Task otherwise |

Issue-type rule: default to Task; escalate to Story only when the item is user-facing feature
work; Bug only for defects. Never set priority/sprint fields unless the notes or user specify.

### Step 7: Output Report

Save to `docs/analysis/MEETING-ACTIONS-{date}-{meeting-slug}.md`:

```markdown
# Meeting Action Report: {Meeting Title} - {Date}

## Action Items
| # | Task | Assignee | Deadline | Priority | Confidence | Source |
|---|------|----------|----------|----------|------------|--------|

## Decision Log
- 决策：...（决策人：...）

## Risks & Blockers
- ...

## Open Questions
- ...

## Unassigned (待认领)
- ...

## Task System Sync Status
(created / pending confirmation / report-only)
```

## Key Principles

- **Present before create**: unconfirmed task creation pollutes the backlog; confirmation is a hard gate.
- **Never fabricate**: no invented assignees, deadlines, or decisions. Missing = blank or 待认领.
- **Distinguish decisions from tendencies**: only explicit decisions enter the decision log.
- **Keep original wording**: task text stays as written; paraphrase only in the summary line.
- **Chinese notes need no translation**: extract names and tasks exactly as written.

## Anti-Patterns

| Anti-Pattern | Symptom | Correct Approach |
|-------------|---------|------------------|
| Silent guessing | Ambiguous owner auto-assigned to someone | Tag 待认领 and ask |
| Decision inflation | "大家倾向 B" recorded as "已决策 B" | Record 倾向 separately |
| Task dumping | Every bullet becomes a task, including discussion points | Only action items with verbs become tasks |
| Context loss | Tasks created without source reference | Every task quotes its original note line |
| Deadline invention | Blank deadline filled with a guess | Leave blank; let tracker rules apply |
