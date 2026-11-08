---
name: csp-design-to-workflow-bridge
description: >
  Bridge skill that translates design suite output (.csp/spark/context/*.json)
  into workflow-compatible format and seeds the development lifecycle.
  Use when design is complete and development should begin, or when
  transitioning between the design and engineering tracks.
version: 1.0.0
layer: 2
category: workflow
phase: plan
domain: architecture
role: specialist
scope: design
tools: [Read, Write, Edit, Glob, Grep, Bash]

dependencies: {}
related_skills:
  - [[pattern:csp-brief]]
  - [[pattern:csp-prd]]
  - [[pattern:csp-flow-web]]
  - [[pattern:csp-check]]
  - [[workflow:csp-lifecycle-orchestrator]]
  - [[workflow:csp-requirement-decomposition]]
  - [[workflow:csp-product-discovery-orchestrator]]

triggers:
  keywords:
    - "design to dev"
    - "design handoff"
    - "设计转开发"
    - "设计交付"
    - "spark to workflow"
  intents:
    - "user has completed design and wants to start development"
    - "user wants to bridge design suite output into workflow system"
---

# Design-to-Workflow Bridge

Translates the design suite's Spark context files into workflow-compatible artifacts, bridging the gap between design (csp-patterns) and engineering (csp-workflow).

## When to Activate

- Design suite (brief → journey → flow-web → check → prd) is complete
- User says "start development", "hand off to engineering", "design-to-dev"
- Transitioning from `.csp/spark/` context to `.csp/` lifecycle artifacts

## Entry Conditions

| Condition | Required | Check |
|-----------|----------|-------|
| `.csp/spark/context/brief.json` exists | Yes | File check |
| At least one of `flow-web.json` or `prd.json` exists | Yes | File check |
| `project_name` is known | Yes | From brief.json or user input |

## Exit Conditions

| Condition | Required | Validation |
|-----------|----------|------------|
| `.csp/handoff/design-to-workflow.json` written | Yes | JSON valid |
| `.csp/decomposition/` seeded with feature candidates | Yes | Directory not empty |
| Lifecycle state reflects transition | Yes | `.csp/lifecycle-state.json` updated |

---

## Process

### Step 1 — Read Design Context

Scan and parse all `.csp/spark/context/*.json` files. Map design concepts to engineering concepts:

| Design Context | Maps To | Workflow Artifact |
|---------------|---------|-------------------|
| `brief.business_goal` | Feature candidates | `.csp/decomposition/FEATURE-CANDIDATES.md` |
| `brief.user` / `brief.personas` | User personas | `.csp/decomposition/PERSONAS.md` |
| `flow-web.elements[]` | UI component candidates | `.csp/specs/UI-COMPONENTS.md` |
| `flow-web.screens[]` | Page specifications | `.csp/specs/PAGES.md` |
| `check.findings[]` | Tech debt tickets | `.csp/plan/TECH-DEBT-BACKLOG.md` |
| `prd.features[]` | Feature breakdown input | `.csp/decomposition/PRD-FEATURES.md` |
| `brief.design_criteria[]` | Non-functional requirements | `.csp/specs/NON-FUNCTIONAL.md` |
| `brief.constraints` | Architecture constraints | `.csp/tech-design/CONSTRAINTS.md` |

### Step 2 — Write Unified Handoff

Write `.csp/handoff/design-to-workflow.json` following the connectivity standard (CONNECTIVITY-STANDARD.md §二):

```json
{
  "skill_name": "csp-design-to-workflow-bridge",
  "skill_version": "1.0.0",
  "generated_at": "<ISO8601>",
  "project_name": "<from brief>",
  "handoff_version": "1.0.0",
  "target_subsystem": "workflow",
  "summary": "Design complete: <N screens>, <M findings>, ready for S1 decomposition",
  "output_files": [
    ".csp/handoff/design-to-workflow.json",
    ".csp/decomposition/FEATURE-CANDIDATES.md",
    ".csp/decomposition/PERSONAS.md"
  ],
  "context_digest": {
    "business_goal": "<from brief>",
    "user_persona": "<from brief>",
    "design_criteria": ["<from brief>"],
    "flow_screens_count": "<from flow-web>",
    "check_findings_count": "<from check>"
  },
  "status": "complete",
  "warnings": [],
  "next_recommended": ["csp-lifecycle-orchestrator", "csp-requirement-decomposition"],
  "entry_conditions_met": true,
  "exit_conditions_met": true
}
```

### Step 3 — Seed Workflow Artifacts

Generate initial decomposition artifacts:

**`.csp/decomposition/FEATURE-CANDIDATES.md`**:
```markdown
# Feature Candidates
Generated from design brief: {brief.business_goal}
Bridge timestamp: {now}

## From PRD Features
{for each prd.feature}
- **{feature.name}**: {feature.description}

## From Flow Screens
{for each flow-web.screen}
- **{screen.name}**: {screen.purpose}

## From Design Criteria
{for each brief.design_criteria}
- {criterion}
```

**`.csp/decomposition/PERSONAS.md`** (if brief has user personas):
```markdown
# User Personas
From design brief

{for each persona}
## {persona.name}
- Role: {persona.role}
- Goals: {persona.goals}
- Pain points: {persona.pain_points}
```

### Step 4 — Advance Lifecycle State

Update `.csp/lifecycle-state.json`:
- Set `current_stage` to `"01"` (PRD stage, ready for S1)
- Record the bridge transition in the stage history

### Step 5 — Handoff Guidance

Output to user:

```
✅ 设计到开发桥接完成

设计上下文已翻译为工作流格式：
  - .csp/handoff/design-to-workflow.json（统一交接文件）
  - .csp/decomposition/FEATURE-CANDIDATES.md（{N} 个功能候选）
  - .csp/decomposition/PERSONAS.md（{M} 个用户画像）

推荐下一步：
  1. csp-lifecycle-orchestrator（从 S1 需求拆解开始全链路开发）
  2. csp-requirement-decomposition（直接进入需求拆解）
  3. 查看设计走查发现（如果 check 有 findings），先处理 P0 问题再开发
```

## Downstream Handoff

This skill produces context for the workflow system:
- `.csp/handoff/design-to-workflow.json` — unified handoff following connectivity standard
- `.csp/decomposition/FEATURE-CANDIDATES.md` — seed feature candidates
- `.csp/decomposition/PERSONAS.md` — user personas from design

Natural downstream skills:
- `[[workflow:csp-lifecycle-orchestrator]]` — full lifecycle starting from S1
- `[[workflow:csp-requirement-decomposition]]` — direct requirement decomposition

---

## Edge Cases

### Missing Design Context
If `brief.json` is missing but other Spark files exist: ask user to confirm project goal manually, proceed with available context.

### Conflicting PRD and Flow
If `prd.features` and `flow-web.screens` describe different features: include both in candidates, mark as "needs reconciliation", emit warning.

### No PRD, Only Design
If only design files exist without PRD: recommend running `csp-prd` first, but allow direct bridging to S1 with design context only.

### Check Findings Present
If `check.findings` has blocker issues: warn user that development should not start until P0 issues are resolved. Still perform the bridge for context preservation.

## Related Skills

- [[pattern:csp-brief]] — Produces the business goal and design criteria
- [[pattern:csp-prd]] — Produces the structured PRD consumed here
- [[pattern:csp-flow-web]] — Produces screen/element specifications
- [[pattern:csp-check]] — Produces design walkthrough findings
- [[workflow:csp-lifecycle-orchestrator]] — Natural downstream orchestrator
- [[workflow:csp-requirement-decomposition]] — Direct downstream skill
- [[workflow:csp-product-discovery-orchestrator]] — Upstream PM-side orchestrator