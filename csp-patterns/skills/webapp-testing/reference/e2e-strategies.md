# E2E Testing Strategies

> Test architecture, data management, flakiness prevention, and CI optimization.

## Testing Pyramid

```
        /  E2E  \          -- 10-15%, critical journeys
       / Integration \      -- 25-35%, cross-component
      /    Unit Tests   \   -- 50-65%, logic + components
```

E2E is slow and brittle. Reserve for cross-page flows and frontend-backend integration.

| Scenario | Level | Tool |
|---|---|---|
| Button toggles state | Unit | Vitest + RTL |
| Form validates + submits | Integration | RTL + MSW |
| Login then navigate | E2E | Playwright |
| Payment flow | E2E (staged) | Playwright + mock |

## Test Data

### Seeding

```ts
test.beforeEach(async ({ request }) => {
  await request.post("/api/test/seed", { data: { users: [{ email: "test@example.com", role: "admin" }] } });
});
test.afterEach(async ({ request }) => await request.post("/api/test/reset"));
```

### Reset Approaches

| Approach | Speed | Use When |
|---|---|---|
| Transaction rollback | Fast | Shared DB connection |
| Truncate tables | Medium | Separate test DB |
| API seed/reset | Slow | Black-box testing |

### Fixture Factories

```ts
export function createUser(overrides?: Partial<User>): User {
  return { id: faker.string.uuid(), email: faker.internet.email(), role: "user", ...overrides };
}
```

## Preventing Flaky Tests

### Explicit Waits

```ts
// Bad:  await page.waitForTimeout(2000);
// Good: await expect(page.getByText("Data loaded")).toBeVisible();
```

### Network-Aware Waits

```ts
const resp = page.waitForResponse("**/api/users");
await page.click("[data-testid=load]");
expect((await resp).status()).toBe(200);
```

### Flakiness Sources

Animations (disable via `--disable-gpu`), race conditions (wait for specific responses), shared state (isolate each test), time-dependent logic (mock `Date.now()`), third-party services (always intercept and mock).

## Authentication

Save storage state once in global-setup, reuse across all tests:

```ts
await page.context().storageState({ path: "auth/user.json" });
// playwright.config.ts
projects: [
  { name: "authenticated", use: { storageState: "auth/user.json" } },
  { name: "unauthenticated", use: { storageState: { cookies: [], origins: [] } } },
]
```

## API Mocking

Mock in CI smoke tests and for third-party services. Use real backend in staging.

```ts
await page.route("**/api/checkout", (route) =>
  route.fulfill({ status: 500, body: "Server Error" })
);
```

## CI Optimization

Shard across parallel workers: `npx playwright test --shard=1/4`. Filter by tag: `--grep @smoke` or `--grep-invert @slow`. Set `workers: process.env.CI ? 4 : undefined` and `fullyParallel: true`. Cache browser binaries via `actions/cache` keyed on lockfile hash.

## Debugging

```ts
use: { trace: "on-first-retry", screenshot: "only-on-failure", video: "retain-on-failure" }
```

Run `npx playwright show-trace trace.zip` for timeline debugging.

## Migration Path

1. Identify 3-5 critical journeys
2. Set up Playwright with page objects
3. Write smoke tests, add to CI
4. Expand one journey per PR -- E2E is a safety net, not a blanket
