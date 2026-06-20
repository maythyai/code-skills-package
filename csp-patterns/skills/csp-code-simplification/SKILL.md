---
name: csp-code-simplification
description: >
  Simplify code for clarity, remove dead code, and clean AI-generated slop.
  Combines five simplification principles, dead-code detection tools (knip, depcheck, ts-prune),
  and AI slop cleanup workflow. Use when refactoring for clarity, removing unused code,
  or cleaning bloated AI-generated implementations.
layer: 4
origin: merged(agent-skills+CSP)
category: patterns
---

| Smell | Fix |
|-------|-----|
| Deep nesting (3+ levels) | Extract conditions into guard clauses |
| Long functions (50+ lines) | Split into focused functions |
| Nested ternaries | Replace with if/else or lookup objects |
| Boolean parameter flags | Replace with options objects |
| Repeated conditionals | Extract to predicate function |

**Naming:** Generic names (`data`, `result`, `temp`) → descriptive names. Abbreviated names → full words (except universal: `id`, `url`, `api`).

**Redundancy:** Duplicated logic → shared function. Dead code → remove. Unnecessary abstractions → inline. Over-engineered patterns → direct approach.

### Step 3: Apply Incrementally
One simplification at a time. Run tests after each change. Submit refactoring separately from feature changes.

### Step 4: Verify
All tests pass without modification. Build succeeds. Linter passes. Diff is clean and reviewable.

## Dead Code Detection Tools

```bash
npx knip                                    # Unused files, exports, dependencies
npx depcheck                                # Unused npm dependencies
npx ts-prune                                # Unused TypeScript exports
npx eslint . --report-unused-disable-directives  # Unused eslint directives
```

### Detection Workflow

1. **Analyze** — Run detection tools in parallel
2. **Categorize by risk:**
   - **SAFE**: Unused exports/deps (no public API impact)
   - **CAREFUL**: Dynamic imports, string-based references
   - **RISKY**: Public API surfaces, plugin hooks
3. **Verify each item** — Grep for all references (including dynamic imports)
4. **Remove safely** — Start with SAFE items. Remove one category at a time: deps → exports → files → duplicates
5. **Test after each batch** — Run tests, commit with descriptive message

### Safety Checklist

Before removing:
- [ ] Detection tools confirm unused
- [ ] Grep confirms no references (including dynamic)
- [ ] Not part of public API
- [ ] Tests pass after removal

## AI Slop Cleanup

AI-generated code often has distinctive slop patterns. Classify before editing:

| Slop Type | Description |
|-----------|-------------|
| **Duplication** | Repeated logic, copy-paste branches, redundant helpers |
| **Dead code** | Unused code, unreachable branches, debug leftovers |
| **Needless abstraction** | Pass-through wrappers, speculative indirection, single-use helpers |
| **Boundary violations** | Hidden coupling, misplaced responsibilities, wrong-layer imports |
| **Missing tests** | Behavior not locked, weak regression coverage |

### Cleanup Passes (one at a time)

1. **Dead code deletion** — remove unused code
2. **Duplicate removal** — consolidate repeated logic
3. **Naming and error-handling cleanup** — improve clarity
4. **Test reinforcement** — add missing regression tests

Re-run targeted verification after each pass.

### Review Mode

For high-impact cleanup, separate writer and reviewer:
- **Writer pass**: Make cleanup changes with behavior locked by tests
- **Reviewer pass**: Inspect plan, changes, and verification evidence
- Never self-approve high-impact cleanup without separate review

## Language-Specific Examples

### TypeScript / JavaScript

```typescript
// SIMPLIFY: Unnecessary async wrapper
async function getUser(id: string): Promise<User> {
  return await userService.findById(id);
}
// → Just return the promise
function getUser(id: string): Promise<User> {
  return userService.findById(id);
}

// SIMPLIFY: Redundant boolean return
function isValid(input: string): boolean {
  if (input.length > 0 && input.length < 100) return true;
  return false;
}
// → Return the condition directly
function isValid(input: string): boolean {
  return input.length > 0 && input.length < 100;
}
```

### Python

```python
# SIMPLIFY: Nested conditionals with early return
def process(data):
    if data is not None:
        if data.is_valid():
            if data.has_permission():
                return do_work(data)
# → Guard clauses
def process(data):
    if data is None: raise TypeError("Data is None")
    if not data.is_valid(): raise ValueError("Invalid data")
    if not data.has_permission(): raise PermissionError("No permission")
    return do_work(data)
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "It's working, no need to touch it" | Working code that's hard to read will be hard to fix when it breaks. |
| "Fewer lines is always simpler" | A 1-line nested ternary is not simpler than a 5-line if/else. |
| "I'll just quickly simplify this unrelated code too" | Unscoped simplification creates noisy diffs and risks regressions. |
| "This abstraction might be useful later" | Don't preserve speculative abstractions. Remove and re-add when needed. |
| "The original author must have had a reason" | Check git blame. But accumulated complexity often has no reason. |

## Red Flags

- Simplification that requires modifying tests (you likely changed behavior)
- "Simplified" code that is longer and harder to follow
- Removing error handling because "it makes the code cleaner"
- Simplifying code you don't fully understand
- Batching many simplifications into one large commit

## Agent Output Format

When operating as an agent, the code simplifier produces structured output:

### Files Simplified
- `path/to/file.ts:line`: [brief description of changes]

### Changes Applied
- [Category]: [what was changed and why]

### Skipped
- `path/to/file.ts`: [reason no changes were needed]

### Verification
- Diagnostics: [N errors, M warnings per file]

## Verification

- [ ] All existing tests pass without modification
- [ ] Build succeeds with no new warnings
- [ ] Linter/formatter passes
- [ ] Each simplification is a reviewable, incremental change
- [ ] No error handling was removed or weakened
- [ ] No dead code left behind (unused imports, unreachable branches)
- [ ] Bundle size reduced (if applicable)
