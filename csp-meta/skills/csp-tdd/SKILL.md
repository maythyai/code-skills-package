---
name: csp-tdd
description: >
  Test-Driven Development: write failing test first, minimal code to pass, then refactor.
  Enforces Red-Green-Refactor cycle with 80%+ coverage across unit, integration, and E2E tests.
  Use when implementing any feature, fixing bugs, or refactoring code.
layer: 1
origin: merged(CSP+agent-skills)
category: meta
phase: build
domain: testing
scope: implementation
tools: [Read, Write, Edit, Bash, Glob, Grep]
dependencies:
  skills: [csp-spec-contract]
related_skills: [csp-verification, csp-code-review]
anti_rationalizations:
  "I'll add tests later": "Later never comes. Write tests first."
  "This is too simple to test": "Simple code has bugs too. Tests are cheap."
  "Tests slow me down": "Tests prevent debugging sessions that take longer."
---

| Test Layer | Scope | When to Write |
|------------|-------|---------------|
| **Unit** | Individual functions, component logic, pure helpers | Always |
| **Integration** | API endpoints, database operations, service interactions | Always |
| **E2E** | Critical user flows (Playwright/Cypress) | Critical paths |

## Coverage Requirements

- Minimum **80%** coverage (branches, functions, lines, statements)
- All edge cases covered
- Error scenarios tested
- Boundary conditions verified

```bash
npm run test:coverage
# Verify 80%+ achieved
```

## Edge Cases You MUST Test

1. **Null/Undefined** input
2. **Empty** arrays/strings
3. **Invalid types** passed
4. **Boundary values** (min/max)
5. **Error paths** (network failures, DB errors)
6. **Race conditions** (concurrent operations)
7. **Large data** (performance with 10k+ items)
8. **Special characters** (Unicode, emojis, SQL chars)

## Test File Organization

```
src/
├── components/
│   └── Button/
│       ├── Button.tsx
│       └── Button.test.tsx          # Unit tests
├── app/api/markets/
│   ├── route.ts
│   └── route.test.ts               # Integration tests
└── e2e/
    └── markets.spec.ts              # E2E tests
```

## Mocking External Services

```typescript
// Supabase mock
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: [], error: null }))
      }))
    }))
  }
}))
```

Always mock: external APIs, databases, Redis, LLM services, file system (in unit tests).

## Testing Anti-Patterns

| Anti-Pattern | Correct Approach |
|---|---|
| Testing implementation details | Test user-visible behavior |
| Brittle CSS selectors | Semantic selectors (`button:has-text("Submit")`) |
| Tests depending on each other | Each test sets up its own data |
| Testing mock instead of code | Mock minimally, test real behavior |
| `test('test1')` | Descriptive: `test('rejects empty email')` |
| Asserting too little | Specific, meaningful assertions |

## Eval-Driven TDD Addendum

For release-critical paths:
1. Define capability + regression evals before implementation
2. Run baseline and capture failure signatures
3. Implement minimum passing change
4. Re-run tests and evals; report pass@1 and pass@3
5. Target pass^3 stability before merge

## Verification Checklist

Before marking work complete:
- [ ] Every new function/method has a test
- [ ] Watched each test fail before implementing
- [ ] Each test failed for expected reason
- [ ] Wrote minimal code to pass each test
- [ ] All tests pass with pristine output
- [ ] Tests use real code (mocks only if unavoidable)
- [ ] Edge cases and errors covered
- [ ] 80%+ coverage achieved

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Too simple to test" | Simple code breaks. Test takes 30 seconds. |
| "I'll test after" | Tests passing immediately prove nothing. |
| "Need to explore first" | Fine. Throw away exploration, start with TDD. |
| "Test hard = design unclear" | Hard to test = hard to use. Simplify interface. |
| "TDD will slow me down" | TDD faster than debugging. |
| "Existing code has no tests" | You're improving it. Add tests for what you touch. |
| "Just this once" | No exceptions. |

## Red Flags — STOP and Start Over

- Code written before test
- Test passes immediately (testing existing behavior)
- Can't explain why test failed
- Tests added "later"
- "Keep as reference" or "adapt existing code"
- "I already manually tested it"

**All of these mean: Delete code. Start over with TDD.**
