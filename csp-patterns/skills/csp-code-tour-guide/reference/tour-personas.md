# Tour Personas & Mentoring Prompts

Reference for `csp-code-tour-guide`. Two parts: the 20 CodeTour personas
and the Socratic mentoring toolkit.

---

## Part 1 — CodeTour Personas

Each persona is a different reader with a different goal. Cut every step that
does not serve the chosen persona.

| #  | Persona                | Goal                              | Must cover                                           | Avoid                                    |
|----|------------------------|-----------------------------------|------------------------------------------------------|------------------------------------------|
| 1  | Vibecoder              | Get the vibe fast                 | Entry point, request flow, main modules. Max 8 steps | Deep dives, edge cases                   |
| 2  | New joiner             | Structured ramp-up                | Directories, setup, business context, boundaries     | Advanced internals                       |
| 3  | Bug fixer              | Root cause fast                   | User action → trigger → fault points + test locs     | Architecture tours                       |
| 4  | RCA investigator       | Why did it fail                   | Causality chain, side effects, race, observability   | Happy path                               |
| 5  | Feature explainer      | One feature end-to-end            | UI → API → backend → storage, flags, edge cases      | Unrelated features                       |
| 6  | PR reviewer            | Review the change correctly       | Change story, invariants, risky areas, checklist     | Unrelated context                        |
| 7  | Security reviewer      | Trust boundaries                  | Auth flow, validation, secret handling, sinks        | Unrelated business logic                 |
| 8  | Refactorer             | Safe restructuring                | Seams, hidden deps, coupling hotspots, extract order | Feature explanations                     |
| 9  | External contributor   | Contribute without breaking       | Safe areas, code style, architecture landmines       | Deep internals                           |
| 10 | Tech lead / architect  | Shape and rationale               | Module boundaries, tradeoffs, risk hotspots          | Line-by-line walkthroughs                |
| 11 | Performance optimizer  | Find bottlenecks                  | Hot path, N+1 queries, I/O, caches                   | Features unrelated to perf               |
| 12 | Test writer            | Cover contracts and seams         | Public surface, integration points, coverage gaps    | Unrelated internals                      |
| 13 | API consumer           | Learn to call the API             | Public surface, auth, error semantics                | Storage layer                            |
| 14 | Concept learner        | Master one pattern                | Concept → implementation → rationale                 | Everything else                          |
| 15 | DevOps / SRE           | Operate and recover               | Deployment, observability, runbooks, failure modes   | Feature code                             |
| 16 | Data engineer          | Understand data flow              | Ingest → transform → sink, schema ownership          | UI layer                                 |
| 17 | Frontend specialist    | Component + state architecture    | Component tree, state, routing, API client           | Backend internals                        |
| 18 | Mobile engineer        | Platform-specific constraints     | Lifecycle, offline, memory, permissions              | Server-only paths                        |
| 19 | Compliance / audit     | Prove controls are in place       | Logging, retention, access control, audit trail      | UX polish                                |
| 20 | Release manager        | Ship safely                       | Versioning, rollout, feature flags, rollback         | Implementation details                   |

### Persona-Specific Recipes

**PR reviewer tour.** Set `"ref"` to the branch. Open with a `uri` step pointing at the PR. Cover changed files first, then unchanged-but-critical files. Close with a reviewer checklist (invariants, risks, follow-ups).

**Bug fixer / RCA tour.** Start with user-visible symptom, trace backwards through trigger → fault → root cause. Include test locations and repro hints. Use `selection` steps to highlight the exact faulty code span.

**Architect tour.** Favor `directory` and `uri` steps for module boundaries. Use `pattern` steps (regex) rather than `line` numbers on volatile files. Each description should surface a design tradeoff.

**New joiner tour.** Set `isPrimary: true`. Cover repo layout, setup, the business domain, and the 2–3 services they will touch most. Skip internals they will not see in their first month.

---

## Part 2 — Step Type Recipes

Quick reference for when to reach for each step type.

| Situation                             | Step type             | Example                                                                 |
|---------------------------------------|-----------------------|-------------------------------------------------------------------------|
| Intro / closing                       | `content`             | Welcome text, next-steps, follow-up tour links                          |
| "Here is what lives in this folder"   | `directory`           | `{"directory": "src/services"}`                                         |
| One line tells the whole story        | `file` + `line`       | `{"file": "src/auth.ts", "line": 42}`                                   |
| A function body is the point          | `selection`           | `{"file": "...", "selection": [10, 25]}`                                |
| Line numbers shift constantly         | `pattern`             | `{"file": "...", "pattern": "^export function handleLogin"}`            |
| PR / issue / doc gives the "why"      | `uri`                 | `{"uri": "https://github.com/.../pull/123"}`                            |
| Reader should open terminal           | `commands`            | `{"commands": ["workbench.action.terminal.focus"]}`                     |
| Reader should focus a VS Code panel   | `view`                | `{"view": "explorer"}`                                                  |

### Conditional tour display

Use `"when"` to show a tour only under certain conditions:

```json
{ "when": "workspaceFolders[0].name === 'api'" }
```

### Tour series (chaining)

Set `"nextTour"` to the exact `title` of the next tour. Plan the series before
writing any single tour:

- Clear escalation: broad → narrow, orientation → deep-dive.
- No duplicate steps between tours.
- Each tour stands alone well enough to be useful on its own.

---

## Part 3 — Socratic Mentoring Prompts

Ready-to-use question banks, ordered by phase.

### Context Gathering

- "What were you trying to achieve?"
- "What did you try so far?"
- "What did you expect to happen, and what actually happened?"
- "Have you checked the documentation for this API/library?"
- "Can you paste the exact error message?"

### Diagnostic Questions

- "At what exact moment does the problem appear?"
- "What happens if you remove this line?"
- "What is the value of this variable at this point?"
- "What patterns do you recognize in the existing code?"
- "How many responsibilities does this function have?"
- "Which project standard applies here?"

### Conceptual Anchors

- **Rubber duck**: "Explain the code to me line by line, as if I were a rubber duck."
- **5 Whys**: keep asking *why* until the root cause surfaces — usually five levels.
- **Minimal reproducible example**: "Can you isolate the problem in 10 lines or less?"
- **Red-Green-Refactor**: "First write a failing test. What should it check?"

### Progressive Clues Ladder

| Level          | Help format                                                       |
|----------------|-------------------------------------------------------------------|
| Light          | Guided question + documentation link                              |
| Medium         | Pseudocode or conceptual diagram                                  |
| Strong         | Incomplete snippet with `___` blanks to fill                      |
| Critical       | Detailed pseudocode + step-by-step guided questions               |
| Escalate       | Suggest pair-programming, Slack question, or draft PR for review  |

### AI Usage Coaching

Teach juniors the **CTEX prompt formula**:

- **C**ontext — what are you working on?
- **T**ask — what do you need?
- **E**xample — what does the current code look like?
- **eX**plain — ask the AI to explain, not just fix.

Common pitfalls to call out:

- Blind copy-paste — "Did you read every line before using it?"
- Over-confidence in AI — "AI can be wrong. How would you verify?"
- Skill atrophy — "Try without help first, then we will compare."
- Excessive dependency — "What would you have done without AI?"

### Session Recap Template

```markdown
Concept mastered: [e.g., closures]
Mistake to avoid: [e.g., forgetting to await a Promise]
Resource for deeper learning: [link]
Bonus exercise: [similar challenge to practice]
```

---

## Part 4 — Description Quality Rubric (SMIG)

When reviewing a step description, check each element:

| Element       | Question it answers                                             |
|---------------|-----------------------------------------------------------------|
| Situation     | What is the reader looking at?                                  |
| Mechanism     | How does this code work? What pattern is in play?               |
| Implication   | Why does it matter for *this persona's* goal specifically?      |
| Gotcha        | What would a smart person get wrong here?                       |

A description that answers only Situation is a caption, not a tour. Aim for all four,
even if each is just one sentence.
