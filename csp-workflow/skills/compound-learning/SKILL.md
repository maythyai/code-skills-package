---
name: csp-compound
description: "Document a recently solved problem to compound your team's knowledge. Captures solutions in docs/solutions/ with YAML frontmatter for searchability. Use after fixing bugs or establishing patterns."
---

# /csp-compound

Document solved problems to compound team knowledge. Each documented solution makes the next occurrence take minutes instead of research time.

## Usage

```bash
/csp-compound                            # Document the most recent fix
/csp-compound mode:headless              # Non-interactive run for automations
```

## Mode Detection

Check `$ARGUMENTS` for `mode:headless` token.

| Mode | When | Behavior |
|------|------|----------|
| **Interactive** (default) | No mode token | Ask Full vs Lightweight, ask about session history (Full only), prompt for Discoverability Check consent |
| **Headless** | `mode:headless` in arguments | No blocking questions. Run Full without session history. Apply Discoverability Check silently. |

## Support Files

- `references/schema.yaml` — canonical frontmatter fields and enum values
- `references/yaml-schema.md` — category mapping and YAML safety rules
- `references/resolution-template.md` — section structure for new docs

## Full Mode

### Phase 0.5: Auto Memory Scan

Before launching Phase 1 subagents, check the auto-memory block injected into your system prompt for notes relevant to the problem being documented.

1. Look for a block labeled "user's auto-memory" already present in your system prompt context
2. If the block is absent or empty, skip this step
3. Scan the entries for anything related to the problem being documented — use semantic judgment
4. If relevant entries are found, prepare a labeled excerpt:

```
## Supplementary notes from auto memory
Treat as additional context, not primary evidence. Conversation history
and codebase findings take priority over these notes.

[relevant entries here]
```

5. Pass this block as additional context to the Context Analyzer and Solution Extractor task prompts in Phase 1. Tag any memory-sourced content in the final doc with "(auto memory)".

### Phase 1: Research

Launch research subagents in parallel:

#### 1. Context Analyzer
- Extracts conversation history for problem and solution
- Reads `references/schema.yaml` for enum validation and track classification
- Bug track: symptoms, root_cause, resolution_type
- Knowledge track: applies_when (symptoms/root_cause/resolution_type optional)
- Reads `references/yaml-schema.md` for category mapping into `docs/solutions/`
- Suggests filename using `[sanitized-problem-slug].md` pattern
- Returns: YAML frontmatter skeleton, category directory path, suggested filename, track

#### 2. Solution Extractor
- Adapts output structure based on problem_type track
- Bug track: Problem, Symptoms, What Didn't Work, Solution, Why This Works, Prevention
- Knowledge track: Context, Guidance, Why This Matters, When to Apply, Examples

#### 3. Related Docs Finder
- Searches `docs/solutions/` for related documentation
- Assesses overlap across 5 dimensions: problem statement, root cause, solution approach, referenced files, prevention rules
  - **High**: 4-5 dimensions match — update existing doc instead of creating new
  - **Moderate**: 2-3 dimensions match — create new, flag for consolidation review
  - **Low**: 0-1 dimensions match — create new normally

### Phase 2: Assembly & Write

1. Collect all text results from Phase 1
2. Check overlap assessment — update existing doc if high overlap
3. Assemble markdown using `references/resolution-template.md` structure
4. Validate YAML frontmatter against `references/schema.yaml`
5. Write to `docs/solutions/[category]/[filename].md`

### Phase 2.4: Vocabulary Capture

**First, read `references/concepts-vocabulary.md`** (in the compound-refresh skill's references). This is unconditional — the reference's criteria are non-obvious.

Then, applying those criteria, scan the new doc **and** the surrounding conversation for qualifying domain terms:

- If `CONCEPTS.md` exists at repo root, add missing qualifying terms and refine existing entries
- If it does not exist and at least one qualifying term surfaced, create it with the preamble:

  > Shared domain vocabulary for this project — entities, named processes, and status concepts with project-specific meaning. Seeded with core domain vocabulary, then accretes as csp-compound and csp-compound-refresh process learnings; direct edits are fine. Glossary only, not a spec or catch-all.

**Seed the learning's area at creation** — alongside the surfaced term, also seed the core domain nouns of the area this learning touched. The seed is scoped to the learning's area, not repo-wide.

If no terms qualified, record that outcome explicitly (e.g., "Vocabulary capture: scanned, no qualifying terms").

Apply edits silently in every mode — vocabulary capture is a side effect, not a user decision.

### Phase 2.5: Selective Refresh Check

After writing the new learning, decide whether this new solution suggests older docs should be refreshed.

Invoke `csp-compound-refresh` when:
1. A related learning recommends an approach the new fix contradicts
2. The new fix supersedes an older documented solution
3. A pattern doc now looks overly broad or outdated
4. The Related Docs Finder surfaced high-confidence refresh candidates

Do NOT invoke when:
1. No related docs were found
2. Related docs still appear consistent with the new learning
3. Refresh would require a broad historical review with weak evidence

When invoking, pass a narrow scope hint (specific file, module, or category name).

### Discoverability Check

After writing, check if AGENTS.md/CLAUDE.md would lead an agent to discover `docs/solutions/`:

1. Find which root-level instruction files exist
2. Assess if an agent would learn: knowledge store exists, its structure, when to search it
3. If not, draft the smallest addition that communicates these three things
4. In interactive mode, show proposal and ask consent. In headless mode, apply silently.

**CONCEPTS.md discoverability:** If `CONCEPTS.md` exists at repo root, run a parallel discoverability check — ensure the instruction file would lead an agent to discover the shared domain vocabulary. Same workflow as above. Skip this step entirely if `CONCEPTS.md` does not exist.

## Lightweight Mode

Single-pass alternative — same documentation, fewer tokens:

1. Extract problem and solution from conversation history
2. Classify track, category, filename
3. Write minimal doc using template
4. Skip specialized agent reviews

## What It Creates

**Bug track categories:**
- `docs/solutions/build-errors/`
- `docs/solutions/test-failures/`
- `docs/solutions/runtime-errors/`
- `docs/solutions/performance-issues/`
- `docs/solutions/database-issues/`
- `docs/solutions/security-issues/`
- `docs/solutions/ui-bugs/`
- `docs/solutions/integration-issues/`
- `docs/solutions/logic-errors/`

**Knowledge track categories:**
- `docs/solutions/architecture-patterns/`
- `docs/solutions/design-patterns/`
- `docs/solutions/tooling-decisions/`
- `docs/solutions/conventions/`
- `docs/solutions/workflow-issues/`
- `docs/solutions/developer-experience/`
- `docs/solutions/documentation-gaps/`
- `docs/solutions/best-practices/`

## Preconditions

- Problem has been solved (not in-progress)
- Solution has been verified working
- Non-trivial problem (not simple typo)

## Auto-Invoke

Trigger when user says: "that worked", "it's fixed", "working now", "problem solved"
