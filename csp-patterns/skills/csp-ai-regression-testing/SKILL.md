---
name: csp-ai-regression-testing
description: >
  Regression testing strategies specifically for AI-assisted development.
  Identifies 5 systematic AI blind spots where the same model writes and reviews
  code. Sandbox-mode API testing without database dependencies, automated
  bug-check workflows, and patterns to catch AI-introduced regressions. Use when
  adding regression coverage to AI-assisted code, or when the same model both
  wrote and reviewed a change.
version: 1.0.0
layer: 3
category: patterns
phase: verify
domain: testing
role: specialist
scope: implementation
tools: [Read, Write, Edit, Bash, Glob, Grep]
related_skills:
  - [[csp-code-review]]
  - [[csp-test-case-design]]
  - [[csp-e2e-testing]]
  - [[csp-santa-method]]

anti_rationalizations:
  "The AI reviewed its own code, it's fine": "AI self-review is the exact failure mode this skill exists to prevent. Same model, same blind spots."
  "Tests passed, no need for regression tests": "Passing tests prove existing behavior is intact. They prove nothing about new behavior being correct."
  "I'll write the regression test later": "The bug you fix today will be re-introduced tomorrow. Regression tests are part of the fix, not a follow-up."
---

# AI Regression Testing

Catch the bugs AI introduces when it both writes and reviews the same code.

## The Core Problem

```
AI writes fix → AI reviews fix → AI says "looks correct" → Bug still exists
```

Real observed pattern across 4 iterations:
- Fix 1: Added field to API response but forgot SELECT query. AI: "LGTM"
- Fix 2: Added to SELECT query. Build error (column missing in types). AI: "LGTM"
- Fix 3: Changed to `SELECT *`. Fixed production path, forgot sandbox path. AI: "LGTM" AGAIN
- Fix 4: Regression test caught it instantly on first run

**Sandbox/production path inconsistency is the #1 AI-introduced regression.**

## The 5 AI Blind Spot Patterns

### Pattern 1: Sandbox/Production Path Mismatch (Most Common)

```typescript
// FAIL: AI adds field to production path only
if (isSandboxMode()) {
  return { data: { id, email, name } };           // Missing new field
}
return { data: { id, email, name, notification_settings } };

// PASS: Both paths return the same shape
if (isSandboxMode()) {
  return { data: { id, email, name, notification_settings: null } };
}
return { data: { id, email, name, notification_settings } };
```

**Test:** Assert all `REQUIRED_FIELDS` exist in sandbox response.

### Pattern 2: SELECT Clause Omission

```typescript
// FAIL: New column added to response but not to SELECT
const { data } = await supabase
  .from("users")
  .select("id, email, name")  // notification_settings missing
  .single();
return { data: { ...data, notification_settings: data.notification_settings } };
// → notification_settings is always undefined

// PASS: Use SELECT * or explicitly include new columns
const { data } = await supabase.from("users").select("*").single();
```

**Test:** Assert all `REQUIRED_FIELDS` in response with non-undefined values.

### Pattern 3: Error State Leakage

```typescript
// FAIL: Error state set but old data not cleared
catch (err) {
  setError("Failed to load");
  // reservations still shows stale data!
}

// PASS: Clear related state on error
catch (err) {
  setReservations([]);
  setError("Failed to load");
}
```

### Pattern 4: Optimistic Update Without Rollback

```typescript
// FAIL: No rollback on failure
const handleRemove = async (id: string) => {
  setItems(prev => prev.filter(i => i.id !== id));
  await fetch(`/api/items/${id}`, { method: "DELETE" });
  // API fails → item gone from UI but still in DB
};

// PASS: Capture + rollback
const handleRemove = async (id: string) => {
  const prevItems = [...items];
  setItems(prev => prev.filter(i => i.id !== id));
  try {
    const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("API error");
  } catch {
    setItems(prevItems);  // Rollback
    showError("Failed to remove item");
  }
};
```

### Pattern 5: Type Cast Masking Null

```typescript
// FAIL: TypeScript cast hides null from AI review
const settings = data.notification_settings as NotificationSettings;
// settings could be null — TypeScript won't warn because of the cast

// PASS: Assert before cast
if (!data.notification_settings) throw new Error("Missing notification_settings");
const settings: NotificationSettings = data.notification_settings;
```

**Test:** Assert field is not undefined/null before use.

## Sandbox-Mode API Testing Setup

The key insight: force sandbox mode in tests so NO database is needed.

```typescript
// __tests__/setup.ts
process.env.SANDBOX_MODE = "true";
process.env.DATABASE_URL = "";

// __tests__/helpers.ts
export function createTestRequest(url: string, opts?: {
  method?: string; body?: Record<string, unknown>; sandboxUserId?: string;
}): NextRequest {
  const headers: Record<string, string> = {};
  if (opts?.sandboxUserId) headers["x-sandbox-user-id"] = opts.sandboxUserId;
  if (opts?.body) headers["content-type"] = "application/json";

  return new NextRequest(`http://localhost:3000${url}`, {
    method: opts?.method || "GET",
    headers,
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  });
}
```

## Bug-Check Workflow

Four mandatory steps, in order:

```
Step 1: npm test        (automated tests — MUST run, cannot skip)
Step 2: npm run build    (type check + build — MUST run, cannot skip)
Step 3: AI code review   (with known blind spots in mind)
Step 4: For each fix, write a regression test
```

**AI review checklist (Step 3):**
1. Sandbox/production path consistency
2. API response shape matches frontend expectations
3. SELECT clause completeness
4. Error handling with state cleanup
5. Optimistic update rollback safety

## Strategy: Test Where Bugs Were Found

Do NOT aim for 100% coverage. Instead:
- Bug found in `/api/user/profile` → write test for profile API
- No bug in `/api/user/notifications` → don't write test (yet)

**Rationale:** AI makes the same category of mistake repeatedly; bugs cluster in complex areas; once tested, that exact regression cannot happen again; test count grows organically with bug fixes.

## Quick Reference

| AI Regression Pattern | Test Strategy | Priority |
|---|---|---|
| Sandbox/production mismatch | Assert same response shape in sandbox mode | HIGH |
| SELECT clause omission | Assert all required fields in response | HIGH |
| Error state leakage | Assert state cleanup on error | MEDIUM |
| Missing rollback | Assert state restored on API failure | MEDIUM |
| Type cast masking null | Assert field is not undefined | MEDIUM |

## DO / DON'T

**DO:**
- Write tests immediately after finding a bug (before fixing if possible)
- Test API response shape, not implementation
- Run tests as Step 1 of every bug-check
- Keep tests fast (&lt;1 second with sandbox mode)
- Name tests after the bug they prevent (e.g., `BUG-R1: notification_settings regression`)

**DON'T:**
- Write tests for code that has never had a bug
- Trust AI self-review as a substitute for automated tests
- Skip sandbox path testing because "it's just mock data"
- Write integration tests when unit tests suffice
- Aim for coverage percentage — aim for regression prevention

## Related Skills

- [[csp-code-review]] — Standard code review (supplement with AI blind spot patterns)
- [[csp-test-case-design]] — Test case enumeration methodology
- [[csp-e2e-testing]] — End-to-end testing for critical flows
- [[csp-santa-method]] — Dual adversarial review (adds verification layer for critical fixes)