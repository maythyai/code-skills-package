<purpose>
Retroactive UI audit of implemented frontend code. Two modes: **Quick Audit** (6-pillar visual, score /24) for per-phase checks, and **Deep Audit** (8-lens methodology from ui-review-to-iteration.md) for comprehensive cross-module review with findings-to-document mapping and version iteration planning. Standalone command that works on any project — CSP-managed or not.
</purpose>

<required_reading>
@~/.claude/code-skills-package/csp-workflow/references/ui-brand.md
@~/.claude/code-skills-package/code-skills-package/prompts/ui-review-to-iteration.md
</required_reading>

<available_agent_types>
Valid CSP subagent types (use exact names — do not fall back to 'general-purpose'):
- csp-ui-auditor — Audits UI against design requirements
</available_agent_types>

<process>

## 0. Initialize

```bash
INIT=$(csp-sdk query init.phase-op "${PHASE_ARG}")
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
AGENT_SKILLS_UI_REVIEWER=$(csp-sdk query agent-skills csp-ui-auditor)
```

Parse: `phase_dir`, `phase_number`, `phase_name`, `phase_slug`, `padded_phase`, `commit_docs`.

```bash
UI_AUDITOR_MODEL=$(csp-sdk query resolve-model csp-ui-auditor --raw)
```

Display banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 CSP ► UI AUDIT — PHASE {N}: {name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 1. Detect Input State

```bash
SUMMARY_FILES=$(ls "${PHASE_DIR}"/*-SUMMARY.md 2>/dev/null)
UI_CSPEC_FILE=$(ls "${PHASE_DIR}"/*-UI-CSPEC.md 2>/dev/null | head -1)
UI_REVIEW_FILE=$(ls "${PHASE_DIR}"/*-UI-REVIEW.md 2>/dev/null | head -1)
```

**If `SUMMARY_FILES` empty:** Exit — "Phase {N} not executed. Run /csp-execute-phase {N} first."


**Text mode (`workflow.text_mode: true` in config or `--text` flag):** Set `TEXT_MODE=true` if `--text` is present in `$ARGUMENTS` OR `text_mode` from init JSON is `true`. When TEXT_MODE is active, replace every `AskUserQuestion` call with a plain-text numbered list and ask the user to type their choice number. This is required for non-Claude runtimes (OpenAI Codex, Gemini CLI, etc.) where `AskUserQuestion` is not available.
**If `UI_REVIEW_FILE` non-empty:** Use AskUserQuestion:
- header: "Existing UI Review"
- question: "UI-REVIEW.md already exists for Phase {N}."
- options:
  - "Re-audit — run fresh audit"
  - "View — display current review and exit"

If "View": display file, exit.
If "Re-audit": continue.

## 2. Gather Context Paths

Build file list for auditor:
- All SUMMARY.md files in phase dir
- All PLAN.md files in phase dir
- UI-CSPEC.md (if exists — audit baseline)
- CONTEXT.md (if exists — locked decisions)

## 3. Spawn csp-ui-auditor

```
◆ Spawning UI auditor...
```

Build prompt:

```markdown
Read {CLAUDE_CONFIG_DIR}/agents/csp-ui-auditor.md for instructions.

<objective>
Conduct 6-pillar visual audit of Phase {phase_number}: {phase_name}
{If UI-CSPEC exists: "Audit against UI-CSPEC.md design contract."}
{If no UI-CSPEC: "Audit against abstract 6-pillar standards."}
</objective>

<files_to_read>
- {summary_paths} (Execution summaries)
- {plan_paths} (Execution plans — what was intended)
- {ui_spec_path} (UI Design Contract — audit baseline, if exists)
- {context_path} (User decisions, if exists)
</files_to_read>

${AGENT_SKILLS_UI_REVIEWER}

<config>
phase_dir: {phase_dir}
padded_phase: {padded_phase}
</config>
```

Omit null file paths.

```
Agent(
  prompt=ui_audit_prompt,
  subagent_type="csp-ui-auditor",
  model="{UI_AUDITOR_MODEL}",
  description="UI Audit Phase {N}"
)
```

> **ORCHESTRATOR RULE — CODEX RUNTIME**: After calling Agent() above, stop working on this task immediately. Do not read more files, edit code, or run tests related to this task while the subagent is active. Wait for the subagent to return its result. This prevents duplicate work, conflicting edits, and wasted context. Only resume when the subagent result is available.

## 4. Handle Return

**If `## UI REVIEW COMPLETE`:**

Display score summary:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 CSP ► UI AUDIT COMPLETE ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Phase {N}: {Name}** — Overall: {score}/24

| Pillar | Score |
|--------|-------|
| Copywriting | {N}/4 |
| Visuals | {N}/4 |
| Color | {N}/4 |
| Typography | {N}/4 |
| Spacing | {N}/4 |
| Experience Design | {N}/4 |

Top fixes:
1. {fix}
2. {fix}
3. {fix}

Full review: {path to UI-REVIEW.md}

───────────────────────────────────────────────────────────────

## ▶ Next

`/clear` then one of:

- `/csp-verify-work {N}` — UAT testing
- `/csp-plan-phase {N+1}` — plan next phase

- `/csp-verify-work {N}` — UAT testing
- `/csp-plan-phase {N+1}` — plan next phase

───────────────────────────────────────────────────────────────
```

## Automated UI Verification (when Playwright-MCP is available)

If `mcp__playwright__*` tools are accessible in this session:

1. Navigate to each UI component described in the phase's UI-CSPEC.md using
   `mcp__playwright__navigate` (or equivalent Playwright-MCP tool).
2. Take a screenshot of each component using `mcp__playwright__screenshot`.
3. Compare against the spec's visual requirements — dimensions, color palette,
   layout, spacing scale, and typography.
4. Report any dimension, color, or layout discrepancies automatically as
   additional findings within the relevant pillar section of UI-REVIEW.md.
5. Flag items that require human judgment (brand feel, content tone) as
   `needs_human_review: true` in the findings — these are surfaced to the user
   separately after the automated pass completes.

If Playwright-MCP is not available in this session, this section is skipped
entirely. The audit falls back to the standard code-only review described above.
No configuration change is required — the availability of `mcp__playwright__*`
tools is detected at runtime.

## 5. Commit (if configured)

```bash
csp-sdk query commit "docs(${padded_phase}): UI audit review" --files "${PHASE_DIR}/${PADDED_PHASE}-UI-REVIEW.md"
```

---

## Deep Audit Mode (Cross-Module UI Review)

> When reviewing across multiple phases or the entire application, use the comprehensive 8-lens methodology from `prompts/ui-review-to-iteration.md`. This is triggered by `/csp-ui-review --deep` or when no single `PHASE_ARG` is provided.

### Mode Selection

**If `--deep` flag is present OR `PHASE_ARG` is empty:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 CSP ► DEEP UI AUDIT — CROSS-MODULE REVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Skip the per-phase quick audit flow. Instead, invoke the full `prompts/ui-review-to-iteration.md` methodology:

1. **Phase 1**: Establish baseline (product positioning, design system, token drift table, UI inventory)
2. **Phase 2**: 8-lens per-module review:
   - Lens 1: Visual hierarchy & layout (M1)
   - Lens 2: Interaction patterns & feedback (M2)
   - Lens 3: Information architecture & navigation (M7)
   - Lens 4: Visual & interaction consistency (M5)
   - Lens 5: User habits & cognition (Nielsen ①⑥)
   - Lens 6: Responsive & multi-device (M3)
   - Lens 7: Accessibility (M6 + WCAG 2.1)
   - Lens 8: State coverage & edge cases
3. **Phase 3**: Cross-module aggregation (consistency batches, IA reorganization, token drift governance)
4. **Phase 4**: Priority matrix (severity 0-4, P0-P3) + version iteration roadmap
5. **Phase 5**: Map findings to product documents (PRD/UI requirements, Spec/AC, Task)
6. **Phase 6**: Version iteration execution plan + regression verification checklist

Outputs go to `.csp/ui-review/` (engineering artifacts) + `docs/analysis/` (human-readable summaries):
- `UI-REVIEW-REPORT-{date}.md` — Full review report
- `UI-FINDINGS-{date}.json` — Structured findings (prefix `UI-F-NN`)
- `CROSS-MODULE-UI-{date}.md` — Cross-module aggregation verdict
- `UI-TO-ROADMAP-{date}.md` — Handoff to roadmap
- `UI-VERSION-PLAN-{date}.md` — Version iteration roadmap

### Quick Audit vs Deep Audit Comparison

| Aspect | Quick Audit (6-pillar) | Deep Audit (8-lens) |
|--------|----------------------|---------------------|
| Scope | Single phase | Cross-module / entire app |
| Dimensions | 6 pillars (Copywriting, Visuals, Color, Typography, Spacing, XD) | 8 lenses (Visual hierarchy, Interaction, IA, Consistency, Cognition, Responsive, a11y, States) |
| Output | Scored UI-REVIEW.md (score /24) | Structured UI-FINDINGS.json + version iteration plan |
| Scoring | Numeric score per pillar | Severity 0-4 + P0-P3 priority |
| Product doc mapping | No | Yes (PRD → Spec AC → Task) |
| Version planning | No | Yes (iteration roadmap with batch scheduling) |
| Token drift | No | Yes (design token comparison table) |
| Cross-module aggregation | No | Yes (consistency batches, IA reorganization) |

</process>

<success_criteria>
- [ ] Phase validated
- [ ] SUMMARY.md files found (execution completed)
- [ ] Existing review handled (re-audit/view)
- [ ] csp-ui-auditor spawned with correct context
- [ ] UI-REVIEW.md created in phase directory
- [ ] Score summary displayed to user
- [ ] Next steps presented
- [ ] (Deep mode) 8-lens methodology invoked with correct scope
- [ ] (Deep mode) UI-FINDINGS.json + version iteration plan produced
</success_criteria>
