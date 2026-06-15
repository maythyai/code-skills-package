# Playwright Snippets

Reference snippets for the `csp-e2e-runner` agent. Covers test generation,
site exploration, form automation, and the most common reliability patterns.

---

## 1. Project Setup

```bash
npm init -y
npm i -D @playwright/test
npx playwright install chromium
```

`playwright.config.ts`:

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: [["html"], ["junit", { outputFile: "results/junit.xml" }]],
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-safari", use: { ...devices["iPhone 14"] } },
  ],
});
```

---

## 2. Test Generation Workflow (MCP-assisted)

Follow these steps in order — never emit a test before exploring the page.

1. **Open** the target URL.
2. **Snapshot** to get accessible elements with refs.
3. **Interact** (click, fill, select) step by step, snapshotting after each action.
4. **Assert** key outcomes after each interaction.
5. **Emit** the TypeScript test using `@playwright/test` based on the recorded steps.
6. **Save** in `tests/<journey>.spec.ts`.
7. **Run** with `npx playwright test <journey>` and iterate until green.

---

## 3. Site Exploration Recipe

Goal: identify 3–5 core features before writing any tests.

```typescript
import { test, expect } from "@playwright/test";

test("explore site and map core flows", async ({ page }) => {
  await page.goto("/");

  // 1. Snapshot the landing — what primary CTAs exist?
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // 2. Identify core navigation links
  const navLinks = page.getByRole("link");
  await expect(navLinks).toHaveCount(await navLinks.count()); // sanity

  // 3. Visit each primary section and note the user flows
  for (const href of ["/products", "/pricing", "/docs"]) {
    await page.goto(href);
    await expect(page).toHaveTitle(/.+/);
  }

  // 4. Document locators for the top 3-5 interactions discovered
  //    (login, search, checkout, submit form, etc.)
});
```

---

## 4. Form Automation

```typescript
import { test, expect } from "@playwright/test";

test("fill multi-field form without submitting", async ({ page }) => {
  await page.goto("/forms/new");

  await page.getByLabel("Show").selectOption("live");
  await page.getByLabel("Date").fill("15 July");
  await page.getByLabel("Time").fill("1:00 AM");
  await page.getByLabel("Topic").fill("Playwright Live — latest updates");

  // File upload
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles("./fixtures/image.png");

  // Verify before submit — never submit without user confirmation
  await expect(page.getByLabel("Topic")).toHaveValue("Playwright Live — latest updates");
  await expect(page.getByRole("button", { name: "Submit" })).toBeEnabled();
});
```

For live-mode demos, append `page.pause()` to open the Playwright Inspector.

---

## 5. Locator Strategy

Priority order (best → worst):

| Priority | Locator                                           | Why                                         |
|----------|---------------------------------------------------|---------------------------------------------|
| 1        | `getByRole("button", { name: "Submit" })`         | Accessibility-first, resilient to rewrites  |
| 2        | `getByTestId("checkout-cta")`                     | Stable, explicit                            |
| 3        | `getByLabel("Email")`                             | Tied to form semantics                      |
| 4        | `getByText("Welcome")`                            | Good for assertions, brittle for actions    |
| 5        | `locator("[data-cy=...]")`                        | App-specific fallback                       |
| 6        | CSS `#id` / `.class`                              | Last resort                                   |

---

## 6. Waiting Correctly

```typescript
// GOOD — wait for a network response
await page.waitForResponse((r) => r.url().includes("/api/items") && r.status() === 200);

// GOOD — wait for a specific element state
await expect(page.getByTestId("result")).toBeVisible();

// GOOD — wait for navigation
await page.waitForURL(/\/dashboard$/);

// BAD — arbitrary sleep
// await page.waitForTimeout(2000);   // never do this
```

---

## 7. Flaky Test Quarantine

```typescript
import { test } from "@playwright/test";

test("flaky: marketplace search", async ({ page }) => {
  test.fixme(true, "Flaky — tracked in #123");
  // ... test body
});
```

Diagnose flakiness:

```bash
npx playwright test flaky-test.spec.ts --repeat-each=10
npx playwright test flaky-test.spec.ts --trace on
```

Common root causes:

- Race conditions → use `waitForResponse` or auto-waiting locators.
- Animation timing → wait for `networkidle` only as a last resort.
- Third-party scripts → block with `page.route("**/*.ads.com/**", (r) => r.abort())`.

---

## 8. Page Object Model

```typescript
// pages/LoginPage.ts
import { Page } from "@playwright/test";

export class LoginPage {
  constructor(private page: Page) {}
  async goto() { await this.page.goto("/login"); }
  async login(email: string, password: string) {
    await this.page.getByLabel("Email").fill(email);
    await this.page.getByLabel("Password").fill(password);
    await this.page.getByRole("button", { name: "Sign in" }).click();
  }
  async expectLoggedIn() {
    await this.page.waitForURL("/dashboard");
  }
}
```

```typescript
// tests/auth.spec.ts
import { test } from "@playwright/test";
import { LoginPage } from "../pages/LoginPage";

test("successful login", async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.login("user@example.com", "pw");
  await login.expectLoggedIn();
});
```

---

## 9. Artifact Capture

```typescript
test.use({
  screenshot: "only-on-failure",
  video: "retain-on-failure",
  trace: "on-first-retry",
});

test("checkout flow", async ({ page }) => {
  await page.goto("/checkout");
  // ... actions and assertions
  // Artifacts auto-captured on failure at test-results/
});
```

Upload to CI:

```yaml
# GitHub Actions
- uses: actions/upload-artifact@v4
  if: always()
  with:
    name: playwright-report
    path: |
      playwright-report/
      test-results/
```

---

## 10. CI Recipe

```yaml
# .github/workflows/e2e.yml
name: E2E
on: [push, pull_request]
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: report, path: playwright-report/ }
```

---

## 11. Debugging Cheat Sheet

| Need                               | Command / Tool                                        |
|------------------------------------|-------------------------------------------------------|
| Step through test                  | `npx playwright test --debug`                         |
| See browser while running          | `npx playwright test --headed`                        |
| Record a test interactively        | `npx playwright codegen https://example.com`          |
| Open last HTML report              | `npx playwright show-report`                          |
| View trace of a failed CI run      | Download `trace.zip` → `npx playwright show-trace`    |
| Inspect live page                  | `npx playwright open https://example.com`             |

---

## 12. Anti-Patterns

- `waitForTimeout(n)` — always prefer conditions.
- CSS selectors tied to implementation details — use roles or test ids.
- Shared state between tests — each test must be independent.
- Hard-coded base URLs — read from `BASE_URL` env var.
- Skipping trace/video in CI — you will regret it when a flake hits main.
- Committing credentials into tests — use `process.env.TEST_USER_*`.
