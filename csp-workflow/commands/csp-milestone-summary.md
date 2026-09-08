---
type: prompt
name: csp-milestone-summary
description: Generate a comprehensive project summary from milestone artifacts for team onboarding and review
argument-hint: "[version]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Grep
  - Glob
---

<objective>
Generate a structured milestone summary for team onboarding and project review. Reads completed milestone artifacts (ROADMAP, REQUIREMENTS, CONTEXT, SUMMARY, VERIFICATION files) and produces a human-friendly overview of what was built, how, and why.

Purpose: Enable new team members to understand a completed project by reading one document and asking follow-up questions.
Output: MILESTONE_SUMMARY written to `.csp/planning/reports/`, presented inline, optional interactive Q&A.
</objective>

<execution_context>
@~/.claude/code-skills-package/csp-workflow/workflows/milestone-summary.md
</execution_context>

<context>
**Project files:**
- `.csp/planning/ROADMAP.md`
- `.csp/planning/PROJECT.md`
- `.csp/planning/STATE.md`
- `.csp/planning/RETROSPECTIVE.md`
- `.csp/planning/milestones/v{version}-ROADMAP.md` (if archived)
- `.csp/planning/milestones/v{version}-REQUIREMENTS.md` (if archived)
- `.csp/planning/phases/*-*/` (SUMMARY.md, VERIFICATION.md, CONTEXT.md, RESEARCH.md)

**User input:**
- Version: $ARGUMENTS (optional — defaults to current/latest milestone)
</context>

<process>
Execute end-to-end.
</process>

<success_criteria>
- Milestone version resolved (from args, STATE.md, or archive scan)
- All available artifacts read (ROADMAP, REQUIREMENTS, CONTEXT, SUMMARY, VERIFICATION, RESEARCH, RETROSPECTIVE)
- Summary document written to `.csp/planning/reports/MILESTONE_SUMMARY-v{version}.md`
- All 7 sections generated (Overview, Architecture, Phases, Decisions, Requirements, Tech Debt, Getting Started)
- Summary presented inline to user
- Interactive Q&A offered
- STATE.md updated
</success_criteria>
