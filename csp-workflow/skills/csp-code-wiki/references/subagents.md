# Subagent Contracts

> Bounded subagent roles for survey + write + independent verification.
> Generalized to the host's sub-agent mechanism (Agent/Task tool or equivalent).
> Tool whitelist per role enforces the black-box separation.

## Roles

| Subagent | Reads | Writes | Cannot |
|----------|-------|--------|--------|
| **surveyor** | one input repo (read-only) | survey notes (inventory) | edit plan/evidence/Markdown/Git; read other inputs' survey |
| **planner** | reduced inventory + coverage matrix | proposed taxonomy + coverage allocation + page plan | write content; edit evidence/Git |
| **plan-critic** | the proposed plan only | critique (pass/fail + violations) | edit the plan; read evidence |
| **page-writer** | one coherent domain's evidence allowlist (entrypoints/impl/types/tests/knowledge rules/ops) | that domain's disjoint page set | research a domain twice; edit the plan; read other domains' drafts |
| **question-finder** | source + tests (never wiki output) | source-derived questions + acceptance criteria | read wiki pages |
| **answer-verifier** | wiki-only answers + questions (never source/tests/evidence) | verdict (pass/fail per unchanged acceptance criteria) | repair pages; read source |
| **auditor** | final wiki + source-lock + coverage + validator results | audit report (blocking findings) | edit content |

## Dispatch rules

- Dispatch as **independent sub-agents** (separate context) — the black-box separation
  only holds if a sub-agent cannot see another role's private state.
- Tool whitelist enforced: surveyor/writer = `Read`/`Grep`/`Glob` (+ `Write` only for that
  role's own output); verifier = `Read`/`Glob` (+ `Write` verdict only).
- **One coherent domain per writer invocation** with a disjoint allowlist; research and
  write that domain once.
- Parent synthesis may use verified child summaries but must inspect any additional
  cross-domain evidence it states.
- **Reviewers never edit** the plan, coverage state, evidence state, Markdown, or Git.

## Black-box verification flow

```
surveyor ──▶ inventory ──▶ planner ──▶ plan-critic ──▶ (pass) page-writers (reverse-BFS, deepest first)
                                                              │
                                                              ▼
                                                    assembled wiki pages
                                                              │
              question-finder (source-only) ──▶ questions ──▶ answer-verifier (wiki-only)
                                                              │
                                                              ▼
                                                    verdict (pass / fail→re-author)
                                                              │
                                                              ▼
                                                          auditor ──▶ delivery
```

- question-finder derives questions from **source/tests** (it cannot see the wiki).
- answer-verifier evaluates **wiki-only answers** against **unchanged acceptance criteria**
  (it cannot see source/tests/evidence).
- A fail verdict ⇒ the **main agent** (not the verifier) reconciles evidence and repairs
  Markdown; the verifier never repairs.

## Headless hosts

If the host has no sub-agent mechanism, set `CSP_CODEWIKI_SUBAGENTS=0` and record a
`skipSubagents` reason (audit-grade). Verification then degrades to main-agent self-check
with an explicit audit entry — never silently skip.
