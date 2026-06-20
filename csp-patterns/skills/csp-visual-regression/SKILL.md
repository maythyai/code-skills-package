---
name: csp-visual-regression
description: >
  Implement visual regression testing and UI change detection using Chromatic,
  Percy, Playwright screenshots, or BackstopJS. Use when UI changes need automated
  review, design system components need snapshot coverage, or visual diffs must
  block unapproved changes in CI.
version: 0.1.0
layer: 4
category: patterns
---

# Visual Regression Testing

Patterns for detecting unintended UI changes through automated screenshot comparison, baseline management, and review workflows integrated into CI pipelines.

## When to Activate

- Setting up visual testing for a component library or design system
- Unintended UI regressions are reaching production undetected
- Manual QA is spending excessive time on visual spot-checks
- Cross-browser visual consistency needs to be enforced
- PRs need automated visual diff reviews before merge
- Migrating from manual screenshot processes to automated tooling

## Tool Comparison

| Feature | Chromatic | Percy | Playwright Screenshots | BackstopJS |
|---|---|---|---|---|
| Approach | Storybook snapshots | DOM-based snapshots | Full page/component screenshots | Page-level screenshots |
| CI Integration | Native (GitHub, GitLab, Bitbucket) | Native (GitHub, GitLab) | Manual (via CI scripts) | Manual (via CLI) |
| Review UI | Built-in web dashboard | Built-in web dashboard | None (file-based diffs) | Built-in local server |
| Cross-browser | Chrome, Firefox, Safari | Chrome, Firefox, Safari, Edge, IE | Chromium, Firefox, WebKit | Chromium only |
| Component-level | Yes (Storybook-based) | Yes (via SDK) | Yes (locator screenshots) | No (page-level only) |
| Dynamic masking | Yes (auto + manual) | Yes (percy-css) | Yes (mask option) | Yes (hideSelectors) |
| Pricing | Free tier (5K snapshots/mo) | Free tier (5K snapshots/mo) | Free (open source) | Free (open source) |
| **Best For** | Storybook-based design systems | Full-page visual testing | Teams already using Playwright | Budget-conscious, simple setups |

### Decision Matrix

| If your project... | Use... |
|---|---|
| Has a Storybook component library | **Chromatic** |
| Needs full-page testing across breakpoints | **Percy** or **Playwright** |
| Already uses Playwright for E2E | **Playwright** built-in screenshots |
| Has zero budget and wants simplicity | **BackstopJS** or **Playwright** |
| Needs cross-browser comparison | **Chromatic** or **Percy** |

## Chromatic Integration

### Setup with Storybook

```bash
# Install Chromatic
npm install --save-dev chromatic

# Add to package.json scripts
# "chromatic": "chromatic --project-token=<your-token>"
```

```yaml
# .github/workflows/chromatic.yml
name: Chromatic Visual Tests
on: [pull_request]

jobs:
  chromatic:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Chromatic needs full git history

      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci

      - name: Publish to Chromatic
        uses: chromaui/action@latest
        with:
          projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
          buildScriptName: build-storybook
          onlyChanged: true        # only test changed stories
          autoAcceptChanges: main  # auto-accept on main branch
```

### Storybook Configuration for Visual Testing

```typescript
// .storybook/preview.ts
export const parameters = {
  // Disable animations for consistent snapshots
  chromatic: {
    delay: 200,             // wait for rendering to settle
    pauseAnimationAtEnd: true,
  },
};

// Disable chromatic for specific stories that are inherently dynamic
export const DynamicStory = {
  parameters: {
    chromatic: { disableSnapshot: true },
  },
};
```

## Percy Integration

### Full-Page Snapshot Testing

```typescript
// Using @percy/playwright
import percySnapshot from "@percy/playwright";
import { test } from "@playwright/test";

test("homepage visual regression", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // Full page snapshot at multiple breakpoints
  await percySnapshot(page, "Homepage", {
    widths: [375, 768, 1280],
    minHeight: 1024,
  });
});

test("dashboard with data", async ({ page }) => {
  await page.goto("/dashboard");
  await page.waitForSelector("[data-testid='chart-loaded']");

  // Mask dynamic content
  await percySnapshot(page, "Dashboard", {
    widths: [1280],
    percyCSS: `
      /* Hide timestamps and dynamic numbers */
      .timestamp, .live-counter, .random-avatar {
        visibility: hidden !important;
      }
    `,
  });
});
```

### Percy with Responsive Breakpoints

```typescript
// Shared breakpoint configuration
const BREAKPOINTS = {
  mobile: [375],
  tablet: [768],
  desktop: [1280],
  wide: [1920],
  all: [375, 768, 1280, 1920],
};

// Percy config file (.percy.yml)
// version: 2
// snapshot:
//   widths:
//     - 375
//     - 1280
//   minHeight: 1024
//   percyCSS: |
//     .no-snapshot { visibility: hidden !important; }
```

## Playwright Built-In Screenshots

### Basic Visual Comparison

```typescript
import { test, expect } from "@playwright/test";

test("login page visual snapshot", async ({ page }) => {
  await page.goto("/login");

  await expect(page).toHaveScreenshot("login-page.png", {
    maxDiffPixelRatio: 0.01,
    threshold: 0.2,
    animations: "disabled",
  });
});

// Component-level snapshot
test("button variants look correct", async ({ page }) => {
  await page.goto("/components/buttons");

  const primaryButton = page.locator('[data-testid="btn-primary"]');
  await expect(primaryButton).toHaveScreenshot("btn-primary.png", {
    threshold: 0.1,
  });

  const buttonGroup = page.locator('[data-testid="button-group"]');
  await expect(buttonGroup).toHaveScreenshot("button-group.png");
});
```

### Threshold Configuration

```typescript
// playwright.config.ts
export default defineConfig({
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,   // 1% of pixels can differ
      threshold: 0.2,            // color difference threshold (0-1)
      animations: "disabled",    // disable CSS animations
    },
  },
});
```

### Updating Baselines

```bash
# Update all snapshots (run after intentional UI changes)
npx playwright test --update-snapshots

# Update a specific test file
npx playwright test login.spec.ts --update-snapshots

# Review diffs before updating — check playwright-report/ first
npx playwright show-report
```

## Dynamic Content Handling

### Masking Strategies

```typescript
// Playwright — mask dynamic elements
await expect(page).toHaveScreenshot("dashboard.png", {
  mask: [
    page.locator(".timestamp"),
    page.locator(".live-counter"),
    page.locator(".user-avatar img"),
    page.locator("[data-testid='random-chart']"),
  ],
  maskColor: "#FF00FF",  // high-visibility mask color
});
```

```typescript
// Stabilize dynamic content before snapshot
test("feed with stable content", async ({ page }) => {
  // Intercept API and return deterministic data
  await page.route("**/api/feed", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(feedFixture),  // deterministic data
    })
  );

  // Mock Date.now() for consistent timestamps
  await page.addInitScript(() => {
    Date.now = () => new Date("2024-06-01T12:00:00Z").getTime();
  });

  await page.goto("/feed");
  await page.waitForLoadState("networkidle");

  await expect(page).toHaveScreenshot("feed-stable.png");
});
```

### Common Dynamic Content Sources

| Source | Strategy |
|---|---|
| Timestamps / relative dates | Mock `Date.now()` or `Intl.DateTimeFormat` |
| Random avatars / images | Mock API response with fixed image URLs |
| Live counters / metrics | Mock API response with fixed values |
| Animations / transitions | Disable with CSS (`animation: none !important`) |
| Charts / graphs | Mock data API + disable chart animations |
| Carousels / sliders | Pause at specific slide before snapshot |
| Fonts loading | Use `font-display: block` or wait for `document.fonts.ready` |

## Review Workflow

### PR-Based Review with GitHub Actions

```yaml
# Block PR on unapproved visual changes
name: Visual Review Gate
on: [pull_request]

jobs:
  visual-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx playwright install chromium
      - run: npx playwright test --project="Desktop Chrome"

      - name: Upload visual diffs
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: visual-diffs
          path: |
            test-results/**/*.png
            playwright-report/

      - name: Comment PR with diff summary
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: 'Visual regression detected. Check the [artifact](link) for diffs.'
            });
```

### Baseline Management Strategy

| Branch | Behavior |
|---|---|
| `main` / `develop` | Auto-accept new baselines |
| Feature PRs | Compare against `main` baseline, require approval |
| Design system PRs | Require manual review from design team |
| Dependency updates | Compare, auto-approve if no visual diff |

## Threshold Tuning

### Pixel Diff vs Perceptual Diff

| Method | How It Works | Best For |
|---|---|---|
| **Pixel diff** | Counts pixels with color difference > threshold | Sharp UI elements, text, borders |
| **Perceptual diff** | Uses structural similarity (SSIM) | Gradients, images, anti-aliased content |
| **Anti-aliasing handling** | Ignores sub-pixel rendering differences | Cross-OS/browser font rendering |

```typescript
// Recommended thresholds by content type
const thresholds = {
  // Sharp UI: buttons, inputs, text
  crisp: { threshold: 0.1, maxDiffPixelRatio: 0.005 },
  // Smooth content: gradients, images
  smooth: { threshold: 0.3, maxDiffPixelRatio: 0.02 },
  // Full page with mixed content
  mixed: { threshold: 0.2, maxDiffPixelRatio: 0.01 },
};
```

## Cross-Browser Visual Testing

```typescript
// playwright.config.ts — multi-browser visual projects
import { devices } from "@playwright/test";

export default defineConfig({
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],
});
```

```bash
# Run visual tests across all browsers
npx playwright test --update-snapshots  # update baselines per browser

# Each browser maintains separate baselines:
# login-page-chromium.png
# login-page-firefox.png
# login-page-webkit.png
```

### Handling Cross-Browser Differences

Some rendering differences are expected and should be tolerated:
- Font rendering (anti-aliasing varies by OS/browser)
- Scrollbar styling
- Default form element appearance
- Sub-pixel rounding

Use higher thresholds or mask these elements rather than maintaining separate baselines for every minor difference.

## Component-Level vs Page-Level Testing

| Aspect | Component-Level | Page-Level |
|---|---|---|
| Scope | Individual component in isolation | Full rendered page |
| Speed | Fast (no routing, no API calls) | Slower (full page load) |
| Stability | High (controlled props) | Lower (real data, real layout) |
| Coverage | Component API surface | User-facing experience |
| Tool | Chromatic (Storybook) | Playwright / Percy |
| **When** | Design system, shared components | Critical pages, layouts |

### Recommended Mix

```typescript
// Component-level: test all component variants
// stories/Button.stories.tsx
export const AllVariants = {
  render: () => (
    <div style={{ display: "flex", gap: 8 }}>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="primary" disabled>Disabled</Button>
    </div>
  ),
};

// Page-level: test key pages with realistic data
test("pricing page", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page).toHaveScreenshot("pricing-page.png", {
    fullPage: true,
  });
});
```

## Cost Optimization for Solo Developers

### Free Tier Strategies

| Tool | Free Tier | Maximize By |
|---|---|---|
| Chromatic | 5,000 snapshots/month | Use `onlyChanged` flag, disable non-critical stories |
| Percy | 5,000 snapshots/month | Snapshot only changed pages, reduce breakpoint count |
| Playwright | Unlimited (local) | Store baselines in git, review diffs locally |
| BackstopJS | Unlimited (local) | Run locally, export HTML report |

```typescript
// Reduce snapshot count with conditional testing
const CRITICAL_PAGES = ["/", "/login", "/pricing", "/dashboard"];
const SECONDARY_PAGES = ["/about", "/blog", "/docs", "/settings"];

// Always snapshot critical pages
for (const path of CRITICAL_PAGES) {
  test(`critical page: ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveScreenshot(`${path.replace(/\//g, "-")}.png`);
  });
}

// Only snapshot secondary pages when related files change
// (use CI path filtering to decide)
```

```bash
# GitHub Actions: only run visual tests when UI files change
# Use dorny/paths-filter action
# filters: |
#   ui:
#     - 'src/components/**'
#     - 'src/pages/**'
#     - 'src/styles/**'
#     - 'tailwind.config.*'
```

## Anti-Patterns

- **Snapshotting everything** — Not every page or component needs visual testing. Focus on design system components and critical user-facing pages.
- **Auto-accepting all changes** — Blindly approving visual diffs defeats the purpose. Review each diff and understand why it changed.
- **Ignoring dynamic content** — Timestamps, random data, and animations cause false positives. Always stabilize content before taking snapshots.
- **Using overly strict thresholds** — A threshold of 0 produces false positives from anti-aliasing and sub-pixel rendering. Use 0.1-0.2 with a low `maxDiffPixelRatio`.
- **Storing baselines outside git** — Baselines should be versioned with code. Store them in the repository so every developer and CI runner uses the same reference.
- **Skipping cross-browser checks** — If your users are on Safari or Firefox, test there too. Chromium-only snapshots miss real visual bugs.

## Related Skills

- [[csp-e2e-testing]]
- [[csp-mock-strategies]]
- [[csp-react-testing]]
- [[csp-cicd-pipelines]]
- [[csp-frontend-performance]]
