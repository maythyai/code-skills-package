---
name: csp-e2e-testing
description: >
  Design, implement, and maintain end-to-end test suites for web applications using
  Playwright, Cypress, or Selenium. Use when building test automation from scratch,
  reducing flaky tests, or integrating E2E tests into CI pipelines.
version: 0.1.0
layer: 3
category: patterns
phase: build
domain: patterns
---

# End-to-End Testing Engineering

Patterns for building reliable, maintainable end-to-end test suites that validate real user workflows across the full application stack.

## When to Activate

- Setting up E2E testing for a new web application
- Existing E2E suite has a high flaky test rate (>5%)
- Need to integrate E2E tests into CI/CD pipelines
- Deciding between Playwright, Cypress, and Selenium for a new project
- Authentication or test data setup is blocking test authoring
- Test execution time is too long for PR feedback loops

## Framework Comparison

| Feature | Playwright | Cypress | Selenium |
|---|---|---|---|
| Multi-browser | Chromium, Firefox, WebKit | Chromium (others experimental) | All via WebDriver |
| Language | JS/TS, Python, Java, C# | JS/TS only | Many (Java, Python, JS) |
| Auto-wait | Built-in | Built-in | Manual (explicit waits) |
| Network mocking | Native (route.fulfill) | Native (cy.intercept) | Requires proxy |
| Parallel execution | Built-in sharding | Paid (Cypress Cloud) or OSS plugin | Grid or third-party |
| Mobile emulation | Device presets + viewport | Viewport only | Real devices via Appium |
| Tab/multi-page | Full support | Limited | Full support |
| **Recommendation** | Best default for new projects | Good for small teams, quick start | Legacy projects, broad browser needs |

### Decision Matrix

Choose **Playwright** when:
- Multi-browser coverage is required
- You need multi-tab or iframe testing
- Your team uses TypeScript, Python, Java, or C#
- You want built-in parallel sharding in CI

Choose **Cypress** when:
- Your app is a single-page application
- Your team is JavaScript-only and wants fast setup
- Time-travel debugging is a priority
- You have budget for Cypress Cloud for parallelization

Choose **Selenium** when:
- You must test on real browsers (not automated Chromium)
- You have an existing Selenium Grid infrastructure
- You need to test on real mobile devices via Appium

## Playwright Deep Dive

### Project Structure

```
tests/
  e2e/
    fixtures/          # Custom test fixtures
      auth.ts
      api.ts
    pages/             # Page Object Models
      login.page.ts
      dashboard.page.ts
      settings.page.ts
    specs/             # Test files
      auth.spec.ts
      dashboard.spec.ts
      checkout.spec.ts
    utils/             # Helpers and test data
      test-data.ts
      factories.ts
  playwright.config.ts
```

### Page Object Model

```typescript
// pages/login.page.ts
import { type Page, type Locator, expect } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel("Email");
    this.passwordInput = page.getByLabel("Password");
    this.submitButton = page.getByRole("button", { name: "Sign in" });
    this.errorMessage = page.getByRole("alert");
  }

  async goto() {
    await this.page.goto("/login");
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectError(message: string) {
    await expect(this.errorMessage).toContainText(message);
  }
}
```

```typescript
// specs/auth.spec.ts
import { test, expect } from "../fixtures/auth";

test.describe("Login", () => {
  test("successful login redirects to dashboard", async ({ page, loginPage }) => {
    await loginPage.goto();
    await loginPage.login("user@example.com", "password123");
    await expect(page).toHaveURL("/dashboard");
  });

  test("invalid password shows error", async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.login("user@example.com", "wrong");
    await loginPage.expectError("Invalid credentials");
  });
});
```

### Custom Test Fixtures

```typescript
// fixtures/auth.ts
import { test as base, expect, type Page } from "@playwright/test";
import { LoginPage } from "../pages/login.page";
import { DashboardPage } from "../pages/dashboard.page";

type AuthFixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  authenticatedPage: Page;
};

export const test = base.extend<AuthFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  // Pre-authenticated page — bypasses login UI
  authenticatedPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: "tests/.auth/user.json",
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect };
```

### API Mocking in Tests

```typescript
// Mock API responses to test edge cases without backend dependencies
test("shows empty state when no orders exist", async ({ page }) => {
  await page.route("**/api/orders", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [], nextCursor: null }),
    })
  );

  await page.goto("/orders");
  await expect(page.getByText("No orders yet")).toBeVisible();
});

test("handles API error gracefully", async ({ page }) => {
  await page.route("**/api/orders", (route) =>
    route.fulfill({ status: 500, body: "Internal Server Error" })
  );

  await page.goto("/orders");
  await expect(page.getByText("Something went wrong")).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
});
```

## Test Architecture

### Test Pyramid Placement

```
          /  \
         / E2E \         <- 5-10% of tests: critical user journeys
        /--------\
       / Integration \   <- 20-30%: API contracts, component interactions
      /----------------\
     /    Unit Tests     \  <- 60-70%: business logic, utilities
    /----------------------\
```

### What to E2E Test vs Unit Test

| Scenario | Layer | Rationale |
|---|---|---|
| User login flow | E2E | Tests real auth + cookies + redirect |
| Password validation rules | Unit | Pure logic, no UI needed |
| Checkout completes payment | E2E | Cross-system integration |
| Cart total calculation | Unit | Pure math |
| Form submission creates record | Integration | API + DB, no UI needed |
| Navigation between pages | E2E | Tests routing + rendering |
| Permission-based visibility | Integration or E2E | Depends on complexity |

## Test Data Management

### Factory Pattern

```typescript
// utils/factories.ts
import { faker } from "@faker-js/faker";

interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user" | "viewer";
}

export function createUser(overrides: Partial<User> = {}): User {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    name: faker.person.fullName(),
    role: "user",
    ...overrides,
  };
}

export function createOrder(overrides = {}) {
  return {
    id: faker.string.uuid(),
    status: "pending",
    total: faker.number.float({ min: 10, max: 500, fractionDigits: 2 }),
    items: [],
    createdAt: faker.date.recent(),
    ...overrides,
  };
}
```

### Database Reset Between Tests

```typescript
// playwright.config.ts — global setup for database reset
import { execSync } from "child_process";

async function globalSetup() {
  // Reset database to known state
  execSync("npm run db:seed:test", { stdio: "inherit" });

  // Generate auth state for authenticated tests
  execSync("npx playwright test tests/e2e/auth.setup.ts", { stdio: "inherit" });
}

export default globalSetup;
```

```bash
# scripts/seed-test-db.sh
#!/usr/bin/env bash
set -euo pipefail

# Drop and recreate test database
psql -d postgres -c "DROP DATABASE IF EXISTS app_test;"
psql -d postgres -c "CREATE DATABASE app_test;"

# Run migrations
DATABASE_URL=postgresql://localhost:5432/app_test npm run db:migrate

# Seed with deterministic test data
DATABASE_URL=postgresql://localhost:5432/app_test npm run db:seed:test
```

## Flaky Test Governance

### Quarantine Strategy

```typescript
// Tag flaky tests instead of deleting them
test("checkout with coupon code @flaky", async ({ page }) => {
  // This test is known to be flaky — tracked in JIRA-1234
  test.fixme();  // marks as expected to fail without breaking CI
  // ... test body
});
```

```typescript
// playwright.config.ts — retry configuration
export default defineConfig({
  retries: process.env.CI ? 2 : 0,   // retry twice in CI, never locally
  workers: process.env.CI ? 4 : undefined,  // parallel in CI
  reporter: [
    ["html"],
    ["json", { outputFile: "test-results/results.json" }],
  ],
});
```

### Root Cause Analysis Checklist

When a test flakes, check these in order:

1. **Race conditions** — Is the test waiting for the right condition? Use `waitForResponse` or `waitForLoadState` instead of arbitrary timeouts.
2. **Test data conflicts** — Are tests sharing data? Each test should create its own isolated data.
3. **Animation timing** — Are animations completing before assertions? Use `waitForAnimation` or disable animations in test config.
4. **Network variability** — Does the test depend on real API responses? Mock external APIs.
5. **Environment differences** — Does it only fail in CI? Check resource limits, concurrency, and timing differences.

## CI Integration

### Parallel Sharding

```yaml
# .github/workflows/e2e.yml
name: E2E Tests
on: [pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shard: [1/4, 2/4, 3/4, 4/4]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npx playwright install --with-deps chromium
      - run: npm run db:seed:test
      - run: npx playwright test --shard=${{ matrix.shard }}
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: test-results-${{ strategy.job-index }}
          path: |
            test-results/
            playwright-report/
          retention-days: 7
```

### Failure Screenshots and Traces

```typescript
// playwright.config.ts — capture artifacts on failure
export default defineConfig({
  use: {
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
});
```

## Authentication Handling

### Bypass Login via API

```typescript
// tests/e2e/auth.setup.ts — generate auth state once
import { test as setup, expect } from "@playwright/test";

const AUTH_FILE = "tests/.auth/user.json";

setup("authenticate as regular user", async ({ request }) => {
  // Login via API (faster than UI login)
  const response = await request.post("/api/auth/login", {
    data: { email: "test@example.com", password: "test-password" },
  });
  expect(response.ok()).toBeTruthy();

  // Save auth state for reuse across all tests
  await request.storageState({ path: AUTH_FILE });
});
```

```typescript
// playwright.config.ts — use saved auth in all test projects
export default defineConfig({
  projects: [
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: "authenticated tests",
      dependencies: ["setup"],
      use: { storageState: "tests/.auth/user.json" },
    },
    {
      name: "unauthenticated tests",
      use: { storageState: { cookies: [], origins: [] } },
    },
  ],
});
```

## Mobile and Responsive Testing

```typescript
// playwright.config.ts — device matrix
import { devices } from "@playwright/test";

export default defineConfig({
  projects: [
    {
      name: "Desktop Chrome",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 14"] },
    },
    {
      name: "Mobile Android",
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "Tablet",
      use: { ...devices["iPad Pro 11"] },
    },
  ],
});
```

```typescript
// Test responsive behavior
test("navigation collapses to hamburger on mobile", async ({ page }) => {
  await page.goto("/dashboard");

  // Desktop: nav links visible
  const navLinks = page.getByRole("navigation").getByRole("link");

  if (page.viewportSize()!.width >= 768) {
    await expect(navLinks).toHaveCount(5);
  } else {
    // Mobile: hamburger menu
    await expect(navLinks).toBeHidden();
    await page.getByRole("button", { name: "Menu" }).click();
    await expect(navLinks).toHaveCount(5);
  }
});
```

## Visual Testing Integration

```typescript
// Basic screenshot comparison with Playwright
test("homepage looks correct", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveScreenshot("homepage.png", {
    maxDiffPixelRatio: 0.01,       // allow 1% difference
    threshold: 0.2,                // per-pixel color threshold
    animations: "disabled",        // freeze CSS animations
  });
});

// Component-level screenshot
test("button variants", async ({ page }) => {
  await page.goto("/storybook/button");
  const button = page.locator("#primary-button");
  await expect(button).toHaveScreenshot("primary-button.png");
});
```

## Performance Testing Within E2E

```typescript
test("page load time is acceptable", async ({ page }) => {
  // Measure navigation timing
  const response = await page.goto("/dashboard");
  expect(response?.status()).toBe(200);

  // Wait for network to settle
  await page.waitForLoadState("networkidle");

  // Assert on performance metrics
  const timing = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    return {
      domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
      loadComplete: nav.loadEventEnd - nav.startTime,
      ttfb: nav.responseStart - nav.requestStart,
    };
  });

  expect(timing.domContentLoaded).toBeLessThan(3000);
  expect(timing.loadComplete).toBeLessThan(5000);
  expect(timing.ttfb).toBeLessThan(500);
});
```

## Deep Audit Suites (Route Sweep + Button Audit + Cross-Reference)

Beyond critical-journey specs, maintain two **audit specs** for release-gate / nightly runs (not PR feedback — too heavy):

### Route Sweep Spec (auto-discover, no manual list)

Discover routes from the **filesystem**, not a hand-maintained list, so new pages are auto-covered:

```typescript
// tests/e2e/page_sweep.spec.ts — Next.js app router example
import { test, expect } from "@playwright/test";
import { readdirSync } from "fs";
import { join, relative } from "path";

const PAGE_GLOB = "src/app";                    // adapt to framework
const SKIP = /\/(api|login|\(auth\)|\[)/;       // skip api/dynamic/auth

function discoverRoutes(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.name === "page.tsx") {
        const route = "/" + relative(PAGE_GLOB, dir).replace(/\\/g, "/")
          .replace(/^\(.*?\)\//, "");           // strip route groups
        if (!SKIP.test(route)) out.push(route || "/");
      }
    }
  };
  walk(PAGE_GLOB);
  return [...new Set(out)];
}

for (const route of discoverRoutes()) {
  test(`sweep ${route}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("console", m => m.type() === "error" && errors.push(m.text()));
    await page.goto(route, { waitUntil: "domcontentloaded" });
    // max-over-mains: nested layouts can render multiple <main>
    await expect.poll(async () => page.locator("main").count(), { timeout: 30_000 })
      .toBeGreaterThanOrEqual(1);
    await expect.poll(
      async () => page.locator("main").last().locator("h1, button").first().isVisible(),
      { timeout: 30_000 }                       // Turbopack cold compile up to 15s+
    ).toBe(true);
    expect(errors.filter(e => !e.includes("hydration"))).toEqual([]);  // non-benign errors
  });
}
```

Rules learned in production:
- Use `expect.poll` with timeout — one-shot checks race against shell nav text rendering first.
- One independent `page` + error probe **per route** — a shared probe can't attribute errors to a route.
- `max-over-mains`: nested layouts render multiple `<main>`; `.last()`/`.first()` both misjudge — assert "at least one main with visible heading/button".
- Skip `api/`, dynamic `[param]` segments, `(auth)` route groups.

### Button Audit Spec (click every visible button, stream JSONL)

```typescript
// tests/e2e/button_audit.spec.ts
import { test } from "@playwright/test";
import { appendFileSync } from "fs";

const DENY = /删除|移除|退出登录|注销|清空|重置|退订|支付|购买|立即发布|授权|绑定|停用|丢弃|
             delete|remove|logout|reset|dissolve|pay|purchase|revoke/i;
const AUDIT_TAG = process.env.AUDIT_TAG ?? "";
const OUT = `/tmp/button_audit${AUDIT_TAG}.jsonl`;

test("button audit", async ({ page }) => {
  page.on("dialog", d => d.dismiss());          // prevent native dialog hang
  page.on("filechooser", () => {});             // intercept file pickers
  page.on("popup", p => p.close());             // close popups
  for (const route of ROUTES) {
    await page.goto(route);
    const btns = await page.locator("main button:visible").all();
    for (let i = 0; i < Math.min(btns.length, 50); i++) {   // cap per route, SKIPPED(cap) beyond
      const btn = btns[i];
      const label = (await btn.innerText()).trim();
      if (DENY.test(label)) { appendFileSync(OUT, JSON.stringify({ route, i, label, react: "SKIPPED" })+"\n"); continue; }
      const before = Date.now();
      const reactions: string[] = [];
      const reqs: string[] = [];
      const onReq = (r: any) => reqs.push(`${r.method()} ${r.url()} ${r.status()}`);
      page.on("response", onReq);
      await btn.click({ timeout: 2000 }).catch(() => reactions.push("CLICK_FAIL"));
      await page.waitForTimeout(300);           // observation window (see attribution caveat)
      if (reqs.length) reactions.push("NET:" + reqs.join(","));
      if (await page.locator("[role=dialog]").count()) reactions.push("DIALOG");
      if (await page.locator("[data-sonner-toast]").count()) reactions.push("TOAST");
      if (reactions.length === 0) reactions.push("NONE");   // dead-button CANDIDATE
      appendFileSync(OUT, JSON.stringify({ route, i, label, react: reactions.join("|") })+"\n");
      page.off("response", onReq);
    }
  }
});
```

Rules:
- **DENY-LIST is mandatory** — destructive/payment buttons are only recorded as `SKIPPED`, never clicked.
- `NONE` is a dead-button **candidate**, not a verdict: `router.push` RSC submit is slower than the observation window, so `NONE`/`NET` can bleed into the next button. Confirm by reading the source handler + cross-referencing the static scan.
- Stream JSONL to `/tmp` for **resume-on-failure**; shard with `--shard=i/N` + `AUDIT_TAG=_s$i`.
- Default **off** the PR smoke suite; run nightly or on demand.

### Cross-Reference Audit (static, parallelizable)

Three static passes (can be parallel sub-agents):

1. **Orphan routes** — all routes × all nav sources (sidebar config / settings groups / user-center nav / ⌘K palette / shortcuts / hub in-page links / deprecated-redirect middleware). Classify: true orphan / redirect alias / intentionally hidden (ops/skeleton/duplicate page).
2. **Hidden backend features** — all backend router registrations (e.g. `include_router`) × frontend call sites. An SDK-generated function existing ≠ being called. Classify `WIRED`/`PARTIAL`/`ORPHAN`; for `PARTIAL` list the exact missing endpoints; flag "backend ready but UI says coming-soon" drift.
3. **Dead-button static scan** — buttons with no `onClick` / non-submit form buttons / `href="#"` / `()=>{}` / bare `disabled` with no enable path / placeholder toast"coming soon" (honest placeholders listed separately, low severity). Exclude false positives (Radix `DialogClose` cancel, `Link`-wrapped `Button`, icon SVGs).

### Honesty Tier for Dead UI (fix priority)

When audit finds dead/unwired CTAs, resolve in this order — **never leave a lying CTA**:

1. **Wire it** if the backend contract already exists (e.g. `PATCH materials_json`, hidden `LLMSettings`).
2. **Disable + honest title** for features needing real platform/large work — `disabled` + `title` stating what's missing.
3. **Label demo data** on the UI ("演示数据") when data is illustrative.
4. **Forbidden**: a dead CTA that implies working functionality.

### Assert-Staleness Before Fixing

When an `assert` fails, first check whether the **expectation is stale** (not the page is wrong):
- `git log` the relevant area — product decisions (codename removal, lazy-load refactor) may have made the spec/`waitForResponse` obsolete.
- Aligning the test to a decided product change is **not** loosening the assertion.
- Only after confirming the expectation is current should you treat it as a page defect.

## Anti-Patterns

- **Testing everything via E2E** — E2E tests are slow and brittle. Use them only for critical user journeys. Business logic belongs in unit tests; API contracts in integration tests.
- **Relying on `waitForTimeout`** — Hard-coded waits are the #1 cause of flaky tests. Use `waitForResponse`, `waitForSelector`, or `expect().toBeVisible()` instead.
- **Sharing test data between tests** — Tests that depend on shared state fail unpredictably when run in parallel. Each test should create and clean up its own data.
- **Skipping authentication setup** — Running login UI before every test wastes time. Use API-level auth and save storage state to skip the login flow.
- **Ignoring flaky tests** — A flaky test that is retried silently still hides a real bug. Quarantine, investigate, and fix the root cause.
- **Running all E2E tests on every commit** — Use sharding and only run affected tests for PR builds. Reserve the full suite for nightly or main-branch runs.

## Related Skills

- [[csp-visual-regression]]
- [[csp-mock-strategies]]
- [[csp-react-testing]]
- [[csp-cicd-pipelines]]
- [[csp-browser-testing-with-devtools]]
