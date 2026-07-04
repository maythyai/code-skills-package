---
name: csp-explore
description: Exploration phase specialist for understanding codebases, investigating patterns, and mapping architecture. Use when starting new work or investigating unfamiliar code.
layer: 2
category: workflow
phase: plan
domain: patterns
scope: analysis
tools: [Read, Glob, Grep, WebFetch, WebSearch]
---

# Explore Phase

Understand before building. Exploration prevents implementation surprises — the most expensive bugs come from assumptions that weren't checked.

## Exploration Process

### Step 1: Define the Question

Write down exactly what you need to learn. Vague questions get vague answers.
- **Good**: "How does the auth middleware validate JWTs and where does it reject expired tokens?"
- **Bad**: "How does auth work?" — too broad to guide exploration

### Step 2: Map Code Paths

Start from the entry point and trace the execution flow:

1. Identify the entry point (route handler, function export, CLI command)
2. Follow the call chain — what calls what, in what order
3. Note branching logic (conditionals, feature flags, environment checks)
4. Mark the boundaries where your question's scope ends
5. Use Glob to find files, Read to trace them, Grep to find call sites

### Step 3: Trace Dependencies

For each file in the code path, identify:

- **Internal dependencies** — other modules/functions it imports
- **External dependencies** — third-party libraries, APIs, databases
- **Implicit dependencies** — environment variables, config files, global state
- **Data flow** — what data enters, what transformations occur, what leaves

### Step 4: Document Findings

Write down what you learned while it's fresh. Use the Output Template below. Don't rely on memory — if you can't write it down, you don't understand it yet.

### Step 5: Identify Risks

Flag anything that could cause problems during implementation:

- Brittle code that might break with adjacent changes
- Undocumented behavior that tests don't cover
- Circular dependencies or tightly coupled modules
- Magic numbers, hardcoded values, or implicit conventions

## Tools

| Tool | Use For | Example |
|------|---------|---------|
| **Read** | Trace individual files, understand implementation details | Read the auth middleware source |
| **Glob** | Find files matching a pattern, map directory structure | `**/auth/**` to find all auth-related files |
| **Grep** | Find call sites, references, patterns across the codebase | Search for `import.*auth` to find consumers |
| **git log** | Understand why code was written this way | `git log --follow -p <file>` for full history |
| **git blame** | Find who wrote a specific line and in what context | `git blame <file>` then check the commit message |

## Output Template

Record findings in this structure:

```markdown
## Exploration: [question]

**Summary**: One-paragraph answer.
**Key Files**: `path/to/file.ts` — role (1 line each)
**Code Path**: Entry → Function A → Function B → Output (note branches)
**Dependencies**: Internal (module-a, module-b) | External (lib-x v2.3) | Implicit (ENV_VAR, config.json)
**Hidden Complexity**: [caching, retries, race conditions, side effects]
**Risk Areas**: [brittle code, untested paths, tight coupling, undocumented behavior]
```

## When to Go Deeper

- The code path crosses a module boundary you haven't explored before
- You find a dependency that looks simple but has no tests (untested = risky)
- You encounter a pattern you don't recognize (custom framework, internal DSL)
- The behavior differs between environments (dev vs production configs)

## When to Stop

- You can answer the original question with specific file paths and line references
- You've traced the full code path from entry to exit for the scope in question
- Additional depth would be "nice to know" but doesn't affect your implementation plan
- Further exploration is procrastination disguised as diligence

## Common Rationalizations

| What you tell yourself | What's actually happening |
|------------------------|--------------------------|
| "I already know how this works" | When did you last read the code? Codebases change. Verify. |
| "I'll figure it out while implementing" | Discovery during implementation is the most expensive kind of learning. |
| "It's just a simple change" | Simple changes in complex systems have complex effects. Map first. |
| "The README explains it" | READMEs rot. Trust the code and git history, not stale docs. |

## Verification

- [ ] The original question is answered in writing with specific file/line references
- [ ] Code path is traced from entry to exit, not guessed from file names
- [ ] Dependencies (internal, external, implicit) are listed
- [ ] Risk areas are identified, not just "looks straightforward"
- [ ] Findings are recorded in the Output Template format
