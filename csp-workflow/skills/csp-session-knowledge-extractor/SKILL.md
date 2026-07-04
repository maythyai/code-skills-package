---
name: csp-session-knowledge-extractor
description: "Extract reusable knowledge from development sessions and route to appropriate documentation stores. Use after completing a sprint, finishing a complex task, or when session discoveries should be preserved. Triggers: 提炼经验, 沉淀知识, session review, extract learnings, 会话总结, knowledge capture, 经验提取."
layer: 2
category: workflow
origin: original
---

# Session Knowledge Extractor

Extract and categorize reusable knowledge from development sessions into proper documentation destinations.

## When to Use

- After completing a sprint or milestone
- After solving a complex debugging session
- When a session produced decisions, patterns, or pitfalls worth preserving
- At the end of a planning session that produced architecture decisions
- Periodic knowledge hygiene (weekly or monthly)

## Knowledge Types and Destinations

| Knowledge Type | Destination | Example |
|---|---|---|
| Architecture decisions | `docs/architecture/ADR-{NNN}.md` | "We chose SQLite because..." |
| Technical constraints | `.planning/reference/constraints.md` | "SKILL.md must be under 500 lines" |
| Implementation pitfalls | `docs/development/pitfalls.md` or AGENTS.md | "Next.js output:'export' breaks dev server" |
| Design decisions | `docs/design/{feature}.md` | "Dark theme with #0B0F1A base" |
| Process improvements | `.planning/reference/decisions.md` | "Archive completed plans by version" |
| Tool/workflow patterns | Project AGENTS.md or memory | "Use py_compile instead of ruff" |
| Session execution records | `.planning/archive/{version}/` | "Phase 1 completed: 3 plans, 11 merges" |

## Extraction Process

1. **Scan**: Review session for decisions, discoveries, pitfalls, and patterns. Look for moments where approach changed, unexpected errors hit, deliberate choices made, or "remember this" was said.
2. **Classify**: Assign each finding to a knowledge type. If spanning multiple types, pick the primary destination and cross-reference.
3. **Deduplicate**: Check whether the knowledge already exists. Update if refinement needed, skip if already well-captured.
4. **Write**: Add to the appropriate file, following its existing format. Create the file with a minimal header if it doesn't exist.

## Quality Filters

Only extract knowledge that passes ALL of these:

- **Future-useful**: Relevant in a future session, not just today
- **Non-obvious**: Not something any experienced developer would already know
- **Actionable**: Specific enough to change a decision or avoid a mistake
- **Undocumented**: Not already captured elsewhere

## Output Format

```
**[{Type}]** {One-line summary}
- Context: {What prompted this discovery}
- Detail: {The actual knowledge, 2-3 sentences}
- Destination: {File path}
- Action: {append | update | create}
```

## Anti-Patterns

| Anti-Pattern | Do This Instead |
|---|---|
| Dump everything to memory | Memory is for preferences; docs are for project knowledge |
| Write a session blog post | Extract structured knowledge, not narrative |
| Store raw transcripts | Distill to decisions, pitfalls, and patterns |
| Skip dedup check | Adding the same fact twice creates maintenance burden |

## Related Skills

- `csp-doc-lifecycle-manager` — newly created docs need lifecycle tracking
- `csp-project-doc-architect` — extracted ADRs expand the documentation architecture
- `csp-remember` (L4) — routes knowledge to the correct memory surface
