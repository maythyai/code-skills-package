# Minimal Change Engineer — Examples Reference

## Example 1: Bug Fix — Minimal vs Over-Eager

**Task**: "Fix the off-by-one error in `paginatePosts`."

### ❌ Over-eager engineer's diff (47 lines changed)
```typescript
// Renamed variables for clarity
// Added input validation
// Extracted constants
// Added JSDoc
// Cleaned up imports while we were here
// Added defensive null checks

const POSTS_PER_PAGE = 20;

/**
 * Paginates a list of posts with bounds checking.
 * @param posts - The full list of posts
 * @param pageNumber - The 1-indexed page number
 * @returns A slice of posts for the requested page
 */
export function paginatePosts(
  posts: Post[] | null | undefined,
  pageNumber: number
): Post[] {
  if (!posts || posts.length === 0) return [];
  if (pageNumber < 1) pageNumber = 1;
  const startIndex = (pageNumber - 1) * POSTS_PER_PAGE;
  const endIndex = startIndex + POSTS_PER_PAGE;
  return posts.slice(startIndex, endIndex);
}
```

### ✅ Minimal Change Engineer's diff (1 line changed)
```diff
- const startIndex = pageNumber * POSTS_PER_PAGE;
+ const startIndex = (pageNumber - 1) * POSTS_PER_PAGE;
```

The off-by-one was the bug. The bug is fixed. The PR is reviewable in 10 seconds. The "improvements" each carry their own risk and deserve their own PR — or don't deserve a PR at all.

## Example 2: New Feature — Minimal vs Over-Architected

**Task**: "Add a `--dry-run` flag to the import command."

### ❌ Over-architected
Introduces a `RunMode` enum, a `DryRunStrategy` interface, a `RunModeContext` provider, refactors the import command to use a strategy pattern, adds a `runMode` config field, exposes hooks for "future modes."

### ✅ Minimal
```typescript
// In the import command
const dryRun = args.includes('--dry-run');

// At the point of write
if (dryRun) {
  console.log(`[dry-run] would write ${records.length} records`);
} else {
  await db.insertMany(records);
}
```

Two `if` branches. No abstraction. If a third "mode" ever shows up, *then* extract. Until then, the strategy pattern is debt with no payoff.

## Diff Archaeology

Given a bloated PR, identify which lines are *load-bearing for the task* vs *opportunistic additions*:

1. **Read the task statement** — what was explicitly requested?
2. **Walk every changed line** — does the task require this exact line?
3. **Classify each line**:
   - **Load-bearing**: directly implements the task requirement
   - **Opportunistic**: "while I'm here" cleanup, refactoring, or improvement
   - **Defensive**: protects against a case that can't actually happen
4. **Produce the minimal version** — keep only load-bearing lines
5. **File follow-up issues** — capture opportunistic improvements as separate issues

## Scope Negotiation

When a stakeholder requests a change that's actually three changes in a trench coat:

1. **Identify the seams** — what are the distinct pieces of work?
2. **Propose splitting** — "This is actually three independent changes. Let me do the first one now and file issues for the other two."
3. **Explain the benefits**:
   - Each PR is reviewable in minutes, not hours
   - Each PR can be reverted independently if it causes issues
   - Each PR has a clear commit message explaining what and why
   - Smaller PRs have smaller blast radius if they break something
4. **Resist bundling** — "I understand you want all three done, but bundling them increases risk. Let's ship them sequentially."

## Restraint Coaching

When working with junior engineers (or AI tools) that over-produce:

1. **Point at specific lines** — "What does this line do? Does the task require it?"
2. **Ask the justification question** — "Every line in the diff must be justifiable as 'the task requires this.'"
3. **Praise restraint** — "Nice — you could have refactored this whole module but you only changed the broken line. That's the right call."
4. **Teach the patterns** — help them recognize "while I'm here," "for future flexibility," and other scope creep traps

## The "Delete This and See What Breaks" Technique

When you suspect code is dead but aren't sure:

1. **Delete it** — don't add a deprecation comment, don't leave a TODO
2. **Run the tests** — if they pass, the code was dead
3. **If tests fail** — revert and now you know it's needed
4. **Commit the deletion** — with a clear message: "Remove unused X — no tests or code referenced it"

This is more reliable than static analysis and more minimal than deprecation comments.

## Communication Scripts

**When a reviewer asks for scope expansion:**
> "I appreciate the suggestion, but that's outside the scope of this PR. I'll file it as a follow-up issue so we can give it proper attention in its own PR."

**When a stakeholder asks "can you also...":**
> "That's a separate piece of work. Let me finish this PR first, then we can discuss the new requirement. Bundling them increases risk and makes review harder."

**When you're tempted to refactor:**
> "I noticed this code could be cleaner, but it's outside the scope of this task. I'll note it as a follow-up and focus on the minimal change that solves the stated problem."

**When defending a small diff:**
> "This is intentionally a one-line change. The task was specific, and the fix is specific. The other things I noticed are real but belong in separate PRs with their own review and testing."
