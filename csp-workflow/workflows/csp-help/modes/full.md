<purpose>
Display the complete CSP command reference. Output ONLY the reference content. Do NOT add project-specific analysis, git status, next-step suggestions, or any commentary beyond the reference.
</purpose>

<reference>
# CSP Command Reference

**CSP** (Code Skills Package) creates hierarchical project plans optimized for solo agentic development with Claude Code.

## Quick Start

1. `/csp-new-project` - Initialize project (includes research, requirements, roadmap)
2. `/csp-plan-phase 1` - Create detailed plan for first phase
3. `/csp-execute-phase 1` - Execute the phase

## Staying Updated

CSP evolves fast. Update periodically:

```bash
npx code-skills-package-cc@latest
```

## Core Workflow

```text
/csp-new-project → /csp-plan-phase → /csp-execute-phase → repeat
```

### Project Initialization

**`/csp-new-project`**
Initialize new project through unified flow.

One command takes you from idea to ready-for-planning:
- Deep questioning to understand what you're building
- Optional domain research (spawns 4 parallel researcher agents)
- Requirements definition with v1/v2/out-of-scope scoping
- Roadmap creation with phase breakdown and success criteria

Creates all `.planning/` artifacts:
- `PROJECT.md` — vision and requirements
- `config.json` — workflow mode (interactive/yolo)
- `research/` — domain research (if selected)
- `REQUIREMENTS.md` — scoped requirements with REQ-IDs
- `ROADMAP.md` — phases mapped to requirements
- `STATE.md` — project memory

Usage: `/csp-new-project`

**`/csp-map-codebase [--fast] [--focus <area>] [--query <term>]`**
Map an existing codebase for brownfield projects.

- `--fast` — rapid lightweight assessment (replaces the former `csp-scan`)
- `--focus <area>` — scope the map to a specific area
- `--query <term>` — query the codebase intelligence index in `.planning/intel/` (replaces the former `csp-intel`)

- Analyzes codebase with parallel Explore agents
- Creates `.planning/codebase/` with 7 focused documents
- Covers stack, architecture, structure, conventions, testing, integrations, concerns
- Use before `/csp-new-project` on existing codebases

Usage: `/csp-map-codebase`

### Phase Planning

**`/csp-discuss-phase <number> [--chain | --analyze | --power | --assumptions] [--batch[=N]]`**
Help articulate your vision for a phase before planning.

- `--chain` — chained-prompt discuss flow
- `--analyze` — deep assumption analysis pass
- `--power` — power-user mode with extended question set
- `--assumptions` — surface Claude's implementation assumptions about the phase without an interactive session

- Captures how you imagine this phase working
- Creates CONTEXT.md with your vision, essentials, and boundaries
- Use when you have ideas about how something should look/feel
- Optional `--batch` asks 2-5 related questions at a time instead of one-by-one

Usage: `/csp-discuss-phase 2`
Usage: `/csp-discuss-phase 2 --batch`
Usage: `/csp-discuss-phase 2 --batch=3`

**`/csp-plan-phase <number> [--research] [--skip-research] [--research-phase <N>] [--view] [--gaps] [--skip-verify] [--prd <file>] [--ingest <path-or-glob>] [--ingest-format <auto|nygard|madr|narrative>] [--reviews] [--text] [--tdd] [--mvp]`**
Create detailed execution plan for a specific phase.

- `--skip-research` — bypass the research subagent
- `--research-phase <N>` — research-only mode. Spawns the research agent for phase `<N>`, writes `RESEARCH.md`, then exits before the planner runs. Useful for cross-phase research, doc review before committing to a planning approach, and correction-without-replanning loops. Replaces the deleted `csp-research-phase` standalone command (#3042).
  - Modifiers: `--research` forces refresh (re-spawn researcher, no prompt). `--view` prints existing `RESEARCH.md` to stdout without spawning. With neither, prompts `update / view / skip` if `RESEARCH.md` already exists.
- `--gaps` — focus only on closing gaps from a prior plan-check
- `--skip-verify` — skip the post-plan verifier loop
- `--ingest <path-or-glob>` — pre-ingest external ADRs/PRDs/CSPECs before planning (see *PRD Express Path* below)
- `--ingest-format <auto|nygard|madr|narrative>` — hint the ADR ingester's parser when `--ingest` is set; defaults to `auto`
- `--tdd` — plan in test-driven order (tests before code)
- `--mvp` — vertical-slice MVP planning mode (see also `/csp-mvp-phase`)

- Generates `.planning/phases/XX-phase-name/XX-YY-PLAN.md`
- Breaks phase into concrete, actionable tasks
- Includes verification criteria and success measures
- Multiple plans per phase supported (XX-01, XX-02, etc.)

Usage: `/csp-plan-phase 1`
Usage: `/csp-plan-phase --research-phase 2` — research only on phase 2 (prompts if `RESEARCH.md` exists)
Usage: `/csp-plan-phase --research-phase 2 --view` — print existing `RESEARCH.md`, no spawn
Usage: `/csp-plan-phase --research-phase 2 --research` — force-refresh, no prompt
Result: Creates `.planning/phases/01-foundation/01-01-PLAN.md`

**PRD Express Path:** Pass `--prd path/to/requirements.md` to skip discuss-phase entirely. Your PRD becomes locked decisions in CONTEXT.md. Useful when you already have clear acceptance criteria.

### Execution

**`/csp-execute-phase <phase-number> [--wave N] [--gaps-only] [--tdd]`**
Execute all plans in a phase, or run a specific wave.

- `--wave N` — execute only wave N (see *Plans within each wave* below)
- `--gaps-only` — re-run only plans flagged as gaps by a prior verifier
- `--tdd` — enforce test-driven order during execution

- Groups plans by wave (from frontmatter), executes waves sequentially
- Plans within each wave run in parallel via Task tool
- Optional `--wave N` flag executes only Wave `N` and stops unless the phase is now fully complete
- Verifies phase goal after all plans complete
- Updates REQUIREMENTS.md, ROADMAP.md, STATE.md

Usage: `/csp-execute-phase 5`
Usage: `/csp-execute-phase 5 --wave 2`

### Smart Router

**`/csp-progress --do "<description>"`**
Route freeform text to the right CSP command automatically.

- Analyzes natural language input to find the best matching CSP command
- Acts as a dispatcher — never does the work itself
- Resolves ambiguity by asking you to pick between top matches
- Use when you know what you want but don't know which `/csp-*` command to run

Usage: `/csp-progress --do "fix the login button"`
Usage: `/csp-progress --do "refactor the auth system"`
Usage: `/csp-progress --do "I want to start a new milestone"`

### Quick Mode

**`/csp-quick [--full] [--validate] [--discuss] [--research]`**
Execute small, ad-hoc tasks with CSP guarantees but skip optional agents.

Quick mode uses the same system with a shorter path:
- Spawns planner + executor (skips researcher, checker, verifier by default)
- Quick tasks live in `.planning/quick/` separate from planned phases
- Updates STATE.md tracking (not ROADMAP.md)

Flags enable additional quality steps:
- `--full` — Complete quality pipeline: discussion + research + plan-checking + verification
- `--validate` — Plan-checking (max 2 iterations) and post-execution verification only
- `--discuss` — Lightweight discussion to surface gray areas before planning
- `--research` — Focused research agent investigates approaches before planning

Granular flags are composable: `--discuss --research --validate` gives the same as `--full`.

Usage: `/csp-quick`
Usage: `/csp-quick --full`
Usage: `/csp-quick --research --validate`
Result: Creates `.planning/quick/NNN-slug/PLAN.md`, `.planning/quick/NNN-slug/NNN-slug-SUMMARY.md`

---

**`/csp-fast [description]`**
Execute a trivial task inline — no subagents, no planning files, no overhead.

For tasks too small to justify planning: typo fixes, config changes, forgotten commits, simple additions. Runs in the current context, makes the change, commits, and logs to STATE.md.

- No PLAN.md or SUMMARY.md created
- No subagent spawned (runs inline)
- ≤ 3 file edits — redirects to `/csp-quick` if task is non-trivial
- Atomic commit with conventional message

Usage: `/csp-fast "fix the typo in README"`
Usage: `/csp-fast "add .env to gitignore"`

### Roadmap Management

**`/csp-phase <description>`**
Add new phase to end of current milestone.

- Appends to ROADMAP.md
- Uses next sequential number
- Updates phase directory structure

Usage: `/csp-phase "Add admin dashboard"`

**`/csp-phase --insert <after> <description>`**
Insert urgent work as decimal phase between existing phases.

- Creates intermediate phase (e.g., 7.1 between 7 and 8)
- Useful for discovered work that must happen mid-milestone
- Maintains phase ordering

Usage: `/csp-phase --insert 7 "Fix critical auth bug"`
Result: Creates Phase 7.1

**`/csp-phase --remove <number>`**
Remove a future phase and renumber subsequent phases.

- Deletes phase directory and all references
- Renumbers all subsequent phases to close the gap
- Only works on future (unstarted) phases
- Git commit preserves historical record

Usage: `/csp-phase --remove 17`
Result: Phase 17 deleted, phases 18-20 become 17-19

**`/csp-phase --edit <number> [--force]`**
Edit any field of an existing roadmap phase in place, preserving number and position.

- Updates title, description, requirements, dependencies in `ROADMAP.md`
- `--force` allows editing already-started phases (use with caution)

### Milestone Management

**`/csp-new-milestone <name>`**
Start a new milestone through unified flow.

- Deep questioning to understand what you're building next
- Optional domain research (spawns 4 parallel researcher agents)
- Requirements definition with scoping
- Roadmap creation with phase breakdown
- Optional `--reset-phase-numbers` flag restarts numbering at Phase 1 and archives old phase dirs first for safety

Mirrors `/csp-new-project` flow for brownfield projects (existing PROJECT.md).

Usage: `/csp-new-milestone "v2.0 Features"`
Usage: `/csp-new-milestone --reset-phase-numbers "v2.0 Features"`

**`/csp-complete-milestone <version>`**
Archive completed milestone and prepare for next version.

- Creates MILESTONES.md entry with stats
- Archives full details to milestones/ directory
- Creates git tag for the release
- Prepares workspace for next version

Usage: `/csp-complete-milestone 1.0.0`

### Progress Tracking

**`/csp-progress [--next | --forensic | --do "<description>"]`**
Check project status and intelligently route to next action.

- Shows visual progress bar and completion percentage
- Summarizes recent work from SUMMARY files
- Displays current position and what's next
- Lists key decisions and open issues
- Offers to execute next plan or create it if missing
- Detects 100% milestone completion

Modes:
- **default** — progress report + intelligent routing
- **`--next`** — auto-advance to the next logical step (use `--next --force` to bypass safety gates)
- **`--forensic`** — append a 6-check integrity audit after the progress report
- **`--do "<text>"`** — smart router: dispatch freeform intent to the matching `/csp-*` command (see *Smart Router* above)

Usage: `/csp-progress`
Usage: `/csp-progress --next`
Usage: `/csp-progress --forensic`

### Session Management

**`/csp-resume-work`**
Resume work from previous session with full context restoration.

- Reads STATE.md for project context
- Shows current position and recent progress
- Offers next actions based on project state

Usage: `/csp-resume-work`

**`/csp-pause-work [--report]`**
Create context handoff when pausing work mid-phase.

- `--report` — generate a post-session summary in `.planning/reports/` capturing commits, file changes, and phase progress
- Creates .continue-here file with current state
- Updates STATE.md session continuity section
- Captures in-progress work context

Usage: `/csp-pause-work`

### Debugging

**`/csp-debug [issue description] [--diagnose]`**
Systematic debugging with persistent state across context resets.

- `--diagnose` — run a one-shot diagnostic pass without opening a persistent debug session

- Gathers symptoms through adaptive questioning
- Creates `.planning/debug/[slug].md` to track investigation
- Investigates using scientific method (evidence → hypothesis → test)
- Survives `/clear` — run `/csp-debug` with no args to resume
- Archives resolved issues to `.planning/debug/resolved/`

Usage: `/csp-debug "login button doesn't work"`
Usage: `/csp-debug` (resume active session)

### Spiking & Sketching

**`/csp-spike [idea] [--quick]`**
Rapidly spike an idea with throwaway experiments to validate feasibility.

- Decomposes idea into 2-5 focused experiments (risk-ordered)
- Each spike answers one specific Given/When/Then question
- Builds minimum code, runs it, captures verdict (VALIDATED/INVALIDATED/PARTIAL)
- Saves to `.planning/spikes/` with MANIFEST.md tracking
- Does not require `/csp-new-project` — works in any repo
- `--quick` skips decomposition, builds immediately

Usage: `/csp-spike "can we stream LLM output over WebSockets?"`
Usage: `/csp-spike --quick "test if pdfjs extracts tables"`

**`/csp-sketch [idea] [--quick]`**
Rapidly sketch UI/design ideas using throwaway HTML mockups with multi-variant exploration.

- Conversational mood/direction intake before building
- Each sketch produces 2-3 variants as tabbed HTML pages
- User compares variants, cherry-picks elements, iterates
- Shared CSS theme system compounds across sketches
- Saves to `.planning/sketches/` with MANIFEST.md tracking
- Does not require `/csp-new-project` — works in any repo
- `--quick` skips mood intake, jumps to building

Usage: `/csp-sketch "dashboard layout for the admin panel"`
Usage: `/csp-sketch --quick "form card grouping"`

**`/csp-spike --wrap-up`**
Package spike findings into a persistent project skill.

- Curates each spike one-at-a-time (include/exclude/partial/UAT)
- Groups findings by feature area
- Generates `./.claude/skills/spike-findings-[project]/` with references and sources
- Writes summary to `.planning/spikes/WRAP-UP-SUMMARY.md`
- Adds auto-load routing line to project CLAUDE.md

Usage: `/csp-spike --wrap-up`

**`/csp-sketch --wrap-up`**
Package sketch design findings into a persistent project skill.

- Curates each sketch one-at-a-time (include/exclude/partial/revisit)
- Groups findings by design area
- Generates `./.claude/skills/sketch-findings-[project]/` with design decisions, CSS patterns, HTML structures
- Writes summary to `.planning/sketches/WRAP-UP-SUMMARY.md`
- Adds auto-load routing line to project CLAUDE.md

Usage: `/csp-sketch --wrap-up`

### Capturing Ideas, Notes, and Todos

**`/csp-capture [description]`**
Capture an idea or task as a structured todo from current conversation.

- Extracts context from conversation (or uses provided description)
- Creates structured todo file in `.planning/todos/pending/`
- Infers area from file paths for grouping
- Checks for duplicates before creating
- Updates STATE.md todo count

Usage: `/csp-capture` (infers from conversation)
Usage: `/csp-capture Add auth token refresh`

**`/csp-capture --note <text>`**
Zero-friction note capture — one command, instant save, no questions.

- Saves timestamped note to `.planning/notes/` (or `~/.claude/notes/` globally)
- Three subcommands: append (default), list, promote
- Promote converts a note into a structured todo
- Works without a project (falls back to global scope)

Usage: `/csp-capture --note refactor the hook system`
Usage: `/csp-capture --note list`
Usage: `/csp-capture --note promote 3`
Usage: `/csp-capture --note --global cross-project idea`

**`/csp-capture --list [area]`**
List pending todos and select one to work on.

- Lists all pending todos with title, area, age
- Optional area filter (e.g., `/csp-capture --list api`)
- Loads full context for selected todo
- Routes to appropriate action (work now, add to phase, brainstorm)
- Moves todo to done/ when work begins

Usage: `/csp-capture --list`
Usage: `/csp-capture --list api`

### User Acceptance Testing

**`/csp-verify-work [phase]`**
Validate built features through conversational UAT.

- Extracts testable deliverables from SUMMARY.md files
- Presents tests one at a time (yes/no responses)
- Automatically diagnoses failures and creates fix plans
- Ready for re-execution if issues found

Usage: `/csp-verify-work 3`

### Ship Work

**`/csp-ship [phase]`**
Create a PR from completed phase work with an auto-generated body.

- Pushes branch to remote
- Creates PR with summary from SUMMARY.md, VERIFICATION.md, REQUIREMENTS.md
- Optionally requests code review
- Updates STATE.md with shipping status

Prerequisites: Phase verified, `gh` CLI installed and authenticated.

Usage: `/csp-ship 4` or `/csp-ship 4 --draft`

---

**`/csp-review --phase N [--gemini] [--claude] [--codex] [--coderabbit] [--opencode] [--qwen] [--cursor] [--all]`**
Cross-AI peer review — invoke external AI CLIs to independently review phase plans.

- Detects available CLIs (gemini, claude, codex, coderabbit)
- Each CLI reviews plans independently with the same structured prompt
- CodeRabbit reviews the current git diff (not a prompt) — may take up to 5 minutes
- Produces REVIEWS.md with per-reviewer feedback and consensus summary
- Feed reviews back into planning: `/csp-plan-phase N --reviews`

Usage: `/csp-review --phase 3 --all`

---

**`/csp-pr-branch [target]`**
Create a clean branch for pull requests by filtering out .planning/ commits.

- Classifies commits: code-only (include), planning-only (exclude), mixed (include sans .planning/)
- Cherry-picks code commits onto a clean branch
- Reviewers see only code changes, no CSP artifacts

Usage: `/csp-pr-branch` or `/csp-pr-branch main`

---

**`/csp-capture --seed [idea]`**
Capture a forward-looking idea with trigger conditions for automatic surfacing.

- Seeds preserve WHY, WHEN to surface, and breadcrumbs to related code
- Auto-surfaces during `/csp-new-milestone` when trigger conditions match
- Better than deferred items — triggers are checked, not forgotten

Usage: `/csp-capture --seed "add real-time notifications when we build the events system"`

**`/csp-capture --backlog [description]`**
Add an idea to the backlog parking lot for future milestones.

- Creates a backlog item under 999.x numbering in ROADMAP.md
- Reserves ideas without committing to the current milestone
- Surface and promote later via `/csp-review-backlog`

Usage: `/csp-capture --backlog "real-time notifications when events ship"`

---

**`/csp-audit-uat`**
Cross-phase audit of all outstanding UAT and verification items.
- Scans every phase for pending, skipped, blocked, and human_needed items
- Cross-references against codebase to detect stale documentation
- Produces prioritized human test plan grouped by testability
- Use before starting a new milestone to clear verification debt

Usage: `/csp-audit-uat`

### Milestone Auditing

**`/csp-audit-milestone [version]`**
Audit milestone completion against original intent.

- Reads all phase VERIFICATION.md files
- Checks requirements coverage
- Spawns integration checker for cross-phase wiring
- Creates MILESTONE-AUDIT.md with gaps and tech debt

Usage: `/csp-audit-milestone`

### Configuration

**`/csp-settings`**
Configure workflow toggles and model profile interactively.

- Toggle researcher, plan checker, verifier agents
- Select model profile (quality/balanced/budget/inherit)
- Updates `.planning/config.json`

Usage: `/csp-settings`

**`/csp-config [--profile <profile> | --advanced | --integrations]`**
Configure CSP beyond the basic settings: model profile, advanced tuning, and third-party integrations.

- `--profile <profile>` — quick switch model profile (`quality | balanced | budget | inherit`)
- `--advanced` — power-user tuning: plan bounce, timeouts, branch templates, cross-AI execution (replaces the former `csp-settings-advanced`)
- `--integrations` — third-party API keys, code-review CLI routing, agent-skill injection (replaces the former `csp-settings-integrations`)

- `quality` — Opus everywhere except verification
- `balanced` — Opus for planning, Sonnet for execution (default)
- `budget` — Sonnet for writing, Haiku for research/verification
- `inherit` — Use current session model for all agents (OpenCode `/model`)

Usage: `/csp-config --profile budget`

**`/csp-surface [list|status|profile <name>|disable <cluster>|enable <cluster>|reset]`**
Toggle which skills are surfaced — apply a profile, list, or disable a cluster without reinstall.

- `list` / `status` — Show enabled and disabled clusters and skills with token cost
- `profile <name>` — Switch to a named base profile (`core`, `standard`, `full`)
- `disable <cluster>` — Remove a cluster from the active surface
- `enable <cluster>` — Add a cluster back to the active surface
- `reset` — Delete the surface delta and return to the install-time profile

Usage: `/csp-surface list`
Usage: `/csp-surface profile standard`
Usage: `/csp-surface disable utility`

### Utility Commands

**`/csp-cleanup`**
Archive accumulated phase directories from completed milestones.

- Identifies phases from completed milestones still in `.planning/phases/`
- Shows dry-run summary before moving anything
- Moves phase dirs to `.planning/milestones/v{X.Y}-phases/`
- Use after multiple milestones to reduce `.planning/phases/` clutter

Usage: `/csp-cleanup`

**`/csp-help [--brief | --full | <topic> | --brief <topic>]`**
Show CSP command help at the tier you ask for.

- `--brief` — one-liner refresher of the top commands (~10 lines)
- *(no flag)* — one-page newcomer tour (default)
- `--full` — the complete reference you are reading now
- `<topic>` — emit only the matching section (e.g. `/csp-help debug`, `/csp-help workflow`)
- `--brief <topic>` — compact scoped lookup: signature + one-line summary of the matched section

Every topic output starts with a `**Topic:** \`<alias>\` → \`<heading>\` *(scope: full | compact)*` preamble so resolved routing is visible. See `code-skills-package/workflows/help/modes/topic.md` for the full alias table. Unknown topics print the recognized list.

Usage: `/csp-help`
Usage: `/csp-help --brief`
Usage: `/csp-help --full`
Usage: `/csp-help debug`
Usage: `/csp-help --brief debug`

**`/csp-update [--sync] [--reapply]`**
Update CSP to latest version with changelog preview.

- `--sync` — sync managed CSP skills across runtime roots (replaces the former `csp-sync-skills`)
- `--reapply` — reapply local modifications after an update (replaces the former `csp-reapply-patches`)

- Shows installed vs latest version comparison
- Displays changelog entries for versions you've missed
- Highlights breaking changes
- Confirms before running install
- Better than raw `npx code-skills-package-cc`

Usage: `/csp-update`

## Additional Commands

The commands above cover the most common day-to-day flows. Every command listed here is also a live `/csp-*` slash command and is grouped by purpose.

### Discovery & Specification

- **`/csp-explore`** — Socratic ideation and idea routing. Think through ideas before committing to plans.
- **`/csp-spec-phase <phase> [--auto] [--text]`** — Clarify WHAT a phase delivers with ambiguity scoring; produces a CSPEC.md before discuss-phase.
- **`/csp-ai-integration-phase [phase]`** — Generate an AI-CSPEC.md design contract for phases that involve building AI systems.
- **`/csp-ui-phase [phase]`** — Generate UI design contract (UI-CSPEC.md) for frontend phases.
- **`/csp-import --from <filepath> | --from-legacy-planning`** — Ingest external plans with conflict detection, or migrate a legacy planning layout into the standard `.planning/` format.
- **`/csp-ingest-docs [path] [--mode new|merge] [--manifest <file>] [--resolve auto|interactive]`** — Bootstrap or merge a `.planning/` setup from existing ADRs, PRDs, CSPECs, and docs in a repo.

### Planning & Execution

- **`/csp-mvp-phase <phase-number>`** — Plan a phase as a vertical MVP slice (user story + CSPIDR splitting) before handing off to plan-phase. Same end-state as `/csp-plan-phase --mvp`, with a guided MVP-shaping intro.
- **`/csp-ultraplan-phase [phase]`** — [BETA] Offload plan phase to Claude Code's ultraplan cloud; review in browser and import back.
- **`/csp-plan-review-convergence <phase> [--codex] [--gemini] [--claude] [--opencode] [--ollama] [--lm-studio] [--llama-cpp] [--all] [--text] [--ws <name>] [--max-cycles N]`** — Cross-AI plan convergence loop — replan with review feedback until no HIGH concerns remain. Supports both cloud reviewers (Codex/Gemini/Claude/OpenCode) and local model runtimes (Ollama, LM Studio, llama.cpp).
- **`/csp-autonomous [--from N] [--to N] [--only N] [--interactive]`** — Run all remaining phases autonomously: discuss → plan → execute per phase.

### Quality, Review & Verification

- **`/csp-code-review <phase> [--depth=quick|standard|deep] [--files file1,file2,...] [--fix [--all] [--auto]]`** — Review source files changed during a phase for bugs, security issues, and code quality problems.
- **`/csp-secure-phase [phase]`** — Retroactively verify threat mitigations for a completed phase.
- **`/csp-validate-phase [phase]`** — Retroactively audit and fill Nyquist validation gaps for a completed phase.
- **`/csp-ui-review [phase]`** — Retroactive 6-pillar visual audit of implemented frontend code.
- **`/csp-eval-review [phase]`** — Audit an executed AI phase's evaluation coverage and produce an EVAL-REVIEW.md remediation plan.
- **`/csp-audit-fix --source <audit-uat> [--severity medium|high|all] [--max N] [--dry-run]`** — Autonomous audit-to-fix pipeline: find issues, classify, fix, test, commit.
- **`/csp-add-tests <phase> [additional instructions]`** — Generate tests for a completed phase based on UAT criteria and implementation.

### Diagnostics & Maintenance

- **`/csp-health [--repair] [--context]`** — Diagnose planning directory health and optionally repair issues.
- **`/csp-forensics [problem description]`** — Post-mortem investigation for failed CSP workflows; diagnoses what went wrong.
- **`/csp-undo --last N | --phase NN | --plan NN-MM`** — Safe git revert. Roll back phase or plan commits using the phase manifest with dependency checks.
- **`/csp-docs-update [--force] [--verify-only]`** — Generate or update project documentation verified against the codebase.
- **`/csp-extract-learnings <phase>`** — Extract decisions, lessons, patterns, and surprises from completed phase artifacts.

### Knowledge & Context

- **`/csp-graphify [build|query <term>|status|diff]`** — Build, query, and inspect the project knowledge graph in `.planning/graphs/`.
- **`/csp-thread [list [--open|--resolved] | close <slug> | status <slug> | name | description]`** — Manage persistent context threads for cross-session work.
- **`/csp-profile-user [--questionnaire] [--refresh]`** — Generate developer behavioral profile and create Claude-discoverable artifacts.
- **`/csp-stats`** — Display project statistics: phases, plans, requirements, git metrics, and timeline.

### Workflow & Orchestration

- **`/csp-manager [--analyze-deps]`** — Interactive command center for managing multiple phases from one terminal. `--analyze-deps` scans ROADMAP phases for dependency relationships before parallel execution.
- **`/csp-workspace [--new | --list | --remove] [name]`** — Manage CSP workspaces: create, list, or remove isolated workspace environments.
- **`/csp-workstreams`** — Manage parallel workstreams: list, create, switch, status, progress, complete, and resume.
- **`/csp-review-backlog`** — Review and promote backlog items to active milestone.
- **`/csp-milestone-summary [version]`** — Generate a comprehensive project summary from milestone artifacts for team onboarding and review.

### Repository Integration

- **`/csp-inbox [--issues] [--prs] [--label] [--close-incomplete] [--repo owner/repo]`** — Triage and review open GitHub issues and PRs against project templates and contribution guidelines.

### Namespace Routers (model-facing meta-skills)

These six skills exist primarily for the model to perform two-stage hierarchical routing across 60+ skills. You can invoke them directly when you want to browse a category interactively.

- **`/csp-context`** — Codebase intelligence routing (map, graphify, docs, learnings).
- **`/csp-ideate`** — Exploration / capture routing (explore, sketch, spike, spec, capture).
- **`/csp-manage`** — Configuration and workspace routing (workstreams, thread, update, ship, inbox).
- **`/csp-project`** — Project-lifecycle routing (milestones, audits, summary).
- **`/csp-quality`** — Quality-gate routing (code review, debug, audit, security, eval, ui).
- **`/csp-workflow`** — Phase-pipeline routing (discuss, plan, execute, verify, phase, progress).

## Files & Structure

```text
.planning/
├── PROJECT.md            # Project vision
├── ROADMAP.md            # Current phase breakdown
├── STATE.md              # Project memory & context
├── RETROCSPECTIVE.md      # Living retrospective (updated per milestone)
├── config.json           # Workflow mode & gates
├── todos/                # Captured ideas and tasks
│   ├── pending/          # Todos waiting to be worked on
│   └── done/             # Completed todos
├── spikes/               # Spike experiments (/csp-spike)
│   ├── MANIFEST.md       # Spike inventory and verdicts
│   └── NNN-name/         # Individual spike directories
├── sketches/             # Design sketches (/csp-sketch)
│   ├── MANIFEST.md       # Sketch inventory and winners
│   ├── themes/           # Shared CSS theme files
│   └── NNN-name/         # Individual sketch directories (HTML + README)
├── debug/                # Active debug sessions
│   └── resolved/         # Archived resolved issues
├── milestones/
│   ├── v1.0-ROADMAP.md       # Archived roadmap snapshot
│   ├── v1.0-REQUIREMENTS.md  # Archived requirements
│   └── v1.0-phases/          # Archived phase dirs (via /csp-cleanup or --archive-phases)
│       ├── 01-foundation/
│       └── 02-core-features/
├── codebase/             # Codebase map (brownfield projects)
│   ├── STACK.md          # Languages, frameworks, dependencies
│   ├── ARCHITECTURE.md   # Patterns, layers, data flow
│   ├── STRUCTURE.md      # Directory layout, key files
│   ├── CONVENTIONS.md    # Coding standards, naming
│   ├── TESTING.md        # Test setup, patterns
│   ├── INTEGRATIONS.md   # External services, APIs
│   └── CONCERNS.md       # Tech debt, known issues
└── phases/
    ├── 01-foundation/
    │   ├── 01-01-PLAN.md
    │   └── 01-01-SUMMARY.md
    └── 02-core-features/
        ├── 02-01-PLAN.md
        └── 02-01-SUMMARY.md
```

## Workflow Modes

Set during `/csp-new-project`:

**Interactive Mode**

- Confirms each major decision
- Pauses at checkpoints for approval
- More guidance throughout

**YOLO Mode**

- Auto-approves most decisions
- Executes plans without confirmation
- Only stops for critical checkpoints

Change anytime by editing `.planning/config.json`

## Planning Configuration

Configure how planning artifacts are managed in `.planning/config.json`:

**`planning.commit_docs`** (default: `true`)
- `true`: Planning artifacts committed to git (standard workflow)
- `false`: Planning artifacts kept local-only, not committed

When `commit_docs: false`:
- Add `.planning/` to your `.gitignore`
- Useful for OSS contributions, client projects, or keeping planning private
- All planning files still work normally, just not tracked in git

**`planning.search_gitignored`** (default: `false`)
- `true`: Add `--no-ignore` to broad ripgrep searches
- Only needed when `.planning/` is gitignored and you want project-wide searches to include it

Example config:
```json
{
  "planning": {
    "commit_docs": false,
    "search_gitignored": true
  }
}
```

## Common Workflows

**Starting a new project:**

```text
/csp-new-project        # Unified flow: questioning → research → requirements → roadmap
/clear
/csp-plan-phase 1       # Create plans for first phase
/clear
/csp-execute-phase 1    # Execute all plans in phase
```

**Resuming work after a break:**

```text
/csp-progress  # See where you left off and continue
```

**Adding urgent mid-milestone work:**

```text
/csp-phase --insert 5 "Critical security fix"
/csp-plan-phase 5.1
/csp-execute-phase 5.1
```

**Completing a milestone:**

```text
/csp-complete-milestone 1.0.0
/clear
/csp-new-milestone  # Start next milestone (questioning → research → requirements → roadmap)
```

**Capturing ideas during work:**

```text
/csp-capture                                  # Capture from conversation context
/csp-capture Fix modal z-index                # Capture with explicit description
/csp-capture --note refactor auth system      # Quick friction-free note
/csp-capture --seed "real-time notifications" # Forward-looking idea with triggers
/csp-capture --list                           # Review and work on todos
/csp-capture --list api                       # Filter by area
```

**Debugging an issue:**

```text
/csp-debug "form submission fails silently"  # Start debug session
# ... investigation happens, context fills up ...
/clear
/csp-debug                                    # Resume from where you left off
```

## Getting Help

- Read `.planning/PROJECT.md` for project vision
- Read `.planning/STATE.md` for current context
- Check `.planning/ROADMAP.md` for phase status
- Run `/csp-progress` to check where you're up to
</reference>
