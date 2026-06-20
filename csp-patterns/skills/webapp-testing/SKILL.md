---
name: csp-webapp-testing
description: >
  End-to-end web application testing strategies. Covers Cypress, Playwright, and Puppeteer
  for integration and E2E tests. Use for testing full user flows in web applications.
metadata:
  origin: CSP
  source: awesome-copilot/skills/csp-webapp-testing
  globs: ["**/*.test.{js,ts,jsx,tsx}", "**/*.spec.{js,ts,jsx,tsx}", "**/cypress/**", "**/playwright/**"]
---

# Web Application Testing

> E2E testing for web apps using Playwright, Cypress, and Puppeteer.

## Framework Selection

| Framework | Best For | Tradeoff |
|---|---|---|
| **Playwright** | Cross-browser, parallel CI | Heavier setup |
| **Cypress** | DX, time-travel debug | No multi-tab |
| **Puppeteer** | CDP access | Chrome-centric |

Default to **Playwright** for new projects.

## When to Use

Reserve for: critical user journeys (signup, login, checkout), cross-page flows, frontend-backend integration.

Skip for: unit logic (Vitest/Jest), isolated components (RTL).

## Core Principles

1. **User-visible behavior** -- assert on what users see
2. **Deterministic** -- seed data, mock network
3. **Independent** -- each test owns setup/teardown
4. **Resilient selectors** -- `data-testid` or role-based
5. **Fail fast** -- short timeouts, explicit waits

## Page Object Model

```ts
export class LoginPage {
  constructor(private page: Page) {}
  readonly emailInput = this.page.getByLabel("Email");
  readonly submitBtn = this.page.getByRole("button", { name: "Sign in" });

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.page.getByLabel("Password").fill(password);
    await this.submitBtn.click();
  }
}
```

## Network Interception

```ts
// Playwright
await page.route("**/api/users", (route) =>
  route.fulfill({ json: [{ id: "1", name: "Alice" }] })
);

// Cypress
cy.intercept("GET", "/api/users", { body: [{ id: "1", name: "Alice" }] });
```

## Auth Persistence

Save storage state once, reuse across tests:

```ts
await page.context().storageState({ path: "auth.json" });
// config: use: { storageState: "auth.json" }
```

## CI

```yaml
- run: npx playwright test
  env: { CI: true }
- if: always()
  uses: actions/upload-artifact@v4
  with: { name: playwright-report, path: playwright-report/ }
```

## Best Practices

1. One assertion per test
2. Screenshot on failure -- `trace: "on-first-retry"`
3. Parallelize in CI -- `--workers=4`
4. Tag tests: `@smoke`, `@critical`
5. Never test what unit tests cover

## Related

- [react-testing](../csp-react-testing/SKILL.md)
- [e2e-strategies](./reference/e2e-strategies.md)
