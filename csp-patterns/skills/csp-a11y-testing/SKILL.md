---
name: csp-a11y-testing
description: >
  Test-time accessibility assertions integrated into unit, component, and E2E
  suites. jest-axe / vitest-axe for component tests, @axe-core/playwright for
  E2E, Pa11y and Lighthouse CI for site-wide gates, eslint-plugin-jsx-a11y for
  lint-time prevention. WCAG 2.2 AA baseline. Unlike csp-access which performs
  design-time heuristic audits, this skill wires a11y assertions into the
  automated test pipeline so regressions are caught at PR time, not at audit time.
version: 0.1.0
layer: 3
category: patterns
phase: verify
domain: testing
role: specialist
scope: implementation
tools: [Read, Write, Edit, Bash, Glob, Grep]
related_skills:
  - [[csp-access]]
  - [[csp-react-testing]]
  - [[csp-playwright-ui-test]]
  - [[csp-e2e-testing]]
  - [[csp-browser-testing-with-devtools]]
  - [[csp-test-methodology]]
  - [[csp-frontend-patterns]]
  - [[csp-visual-regression]]
anti_rationalizations:
  "设计稿已经过 csp-access 审计了": "设计审计抓静态问题（对比度、语义结构）；测试时断言抓的是*实现退化*——组件重构后 aria-label 丢了、focus trap 坏了，审计看不见"
  "无障碍是少数用户需求": "WCAG 2.2 AA 在欧盟/美国/加拿大是法律要求；政府/医疗/金融项目有 VPAT/ACR 合规义务"
  "axe 跑一遍没违规就够了": "自动化只抓 ~40% 的 WCAG 违规（WebAIM Million 研究）；键盘陷阱、焦点顺序、屏读语义仍需人工 + E2E 补位"
---

# Accessibility Testing (Test-Time)

Wire WCAG assertions into the automated test pipeline so a11y regressions fail CI at PR time — not at the next quarterly audit.

## When to Activate

- Public-facing web app, especially government/healthcare/finance (legal exposure)
- Design system component library (a11y is a contract with consumers)
- Any product with a VPAT/ACR requirement
- Post-audit: turn findings into regression tests so they don't recur
- Component refactor or UI framework migration (React 17→19, MUI v5→v6)
- You want a11y assertions running on every PR, not just before release

## Boundary with csp-access

| Dimension | csp-access (design audit) | csp-a11y-testing (this skill) |
|---|---|---|
| When | Design phase, pre-implementation | Test phase, every PR |
| Input | Design mockup, HTML, Figma | Rendered component, live page |
| Method | Heuristic review, WCAG checklist, manual inspection | Automated axe-core assertions, Playwright E2E, CI gates |
| Output | Audit report with severity ratings | Test failures, CI blocks |
| Catches | Static design flaws (contrast, semantics, IA) | Implementation regressions (lost aria-label, broken focus trap) |
| Coverage | ~100% of WCAG criteria (human review) | ~40% (automated) + manual E2E for the rest |

> Use both: `csp-access` before implementation to catch design flaws; `csp-a11y-testing` during implementation to catch regressions. Neither replaces the other.

## Tool Matrix by Layer

| Layer | Tool | Install | Catches |
|---|---|---|---|
| Lint (pre-render) | eslint-plugin-jsx-a11y 6.9+ | `npm i -D eslint-plugin-jsx-a11y` | Missing alt, aria props, label association, click handlers on non-interactive elements |
| Unit/Component | jest-axe 9+ / vitest-axe | `npm i -D jest-axe` or `npm i -D vitest-axe` | axe-core rules on rendered DOM (jsdom) |
| E2E (real browser) | @axe-core/playwright | `npm i -D @axe-core/playwright` | Full axe-core incl. color-contrast (needs real rendering) |
| Site-wide CI | Pa11y 8 | `npm i -g pa11y` | Crawl + assert WCAG2AA on every page |
| Site-wide CI | Lighthouse CI | `npm i -g @lhci/cli` | a11y score + specific audit assertions |
| Manual/assisted | WAVE, Tenon, Accessibility Insights | browser ext / API | Issues automated tools miss |
| Native mobile | Accessibility Insights (Android), XCUITest `accessibilityAudit()` (iOS 17+) | platform SDK | Touch targets, dynamic type, VoiceOver/TalkBack |

## WCAG 2.2 AA — What's New Over 2.1

WCAG 2.2 became a W3C Recommendation in Oct 2023. Nine new success criteria over 2.1:

| SC | Name | Test implication |
|---|---|---|
| 2.4.11 | Focus Not Obscured (Minimum) | Focus indicator must not be fully hidden by sticky headers/footers |
| 2.4.12 | Focus Not Obscured (Enhanced) | AAA: focus indicator not hidden at all |
| 2.4.13 | Focus Appearance | Focus indicator area ≥ 2× perimeter of unfocused state |
| 2.5.7 | Dragging Movements | Any drag must have a single-pointer alternative (button, slider) |
| 2.5.8 | Target Size (Minimum) | Interactive targets ≥ 24×24 CSS px (or spacing exception) |
| 3.2.6 | Consistent Help | Help mechanisms (contact, FAQ) in same relative order across pages |
| 3.3.7 | Redundant Entry | User info entered once must auto-populate or be selectable in same process |
| 3.3.8 | Accessible Authentication (Minimum) | No cognitive function test (memorize/transcribe) without alternative |
| 3.3.9 | Accessible Authentication (Enhanced) | AAA: no cognitive test at all |

axe-core 4.8+ added the `wcag22aa` tag. Configure your axe runs to include it:

```typescript
const results = await axe(container, {
  runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] },
});
```

## Pattern 1: vitest-axe + React Testing Library (component test)

```typescript
// src/components/__tests__/SignupForm.a11y.test.tsx
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import * as matchers from "vitest-axe/matchers";
import { expect, test, describe } from "vitest";
import { SignupForm } from "../SignupForm";

expect.extend(matchers);

describe("SignupForm a11y", () => {
  test("has no WCAG 2.2 AA violations", async () => {
    const { container } = render(<SignupForm />);
    const results = await axe(container, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag22aa"] },
      rules: {
        // jsdom can't compute color — disable here, test in Playwright instead
        "color-contrast": { enabled: false },
      },
    });
    expect(results).toHaveNoViolations();
  });

  test("error state also passes", async () => {
    const { container } = render(<SignupForm initialErrors={{ email: "Invalid email" }} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test("disabled state also passes", async () => {
    const { container } = render(<SignupForm disabled />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

Test **every state**: default, error, disabled, loading, empty. A11y violations cluster in non-happy paths.

## Pattern 2: @axe-core/playwright (E2E, real browser)

```typescript
// e2e/a11y/checkout.spec.ts
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Checkout flow a11y", () => {
  test("cart page has no violations", async ({ page }) => {
    await page.goto("/checkout/cart");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("payment page has no violations", async ({ page }) => {
    await page.goto("/checkout/payment");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
      .exclude(".third-party-widget")  // scoped exclusion, documented
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("keyboard navigation order is logical", async ({ page }) => {
    await page.goto("/checkout/cart");
    const focusOrder: string[] = [];
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press("Tab");
      const focused = await page.evaluate(() => ({
        tag: document.activeElement?.tagName,
        label: document.activeElement?.getAttribute("aria-label")
            || document.activeElement?.textContent?.trim().slice(0, 40),
      }));
      focusOrder.push(`${focused.tag}:${focused.label}`);
    }
    // Assert logical order: skip → nav → cart items → quantity → remove → subtotal → continue
    expect(focusOrder.join(" → ")).toMatchSnapshot();
  });

  test("modal traps focus correctly", async ({ page }) => {
    await page.goto("/checkout/cart");
    await page.getByRole("button", { name: /remove/i }).first().click();
    // Focus should be inside modal
    const inModal = await page.evaluate(() =>
      document.activeElement?.closest('[role="dialog"]') !== null
    );
    expect(inModal).toBe(true);
    // Tab should cycle within modal, not escape
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press("Tab");
      const stillInModal = await page.evaluate(() =>
        document.activeElement?.closest('[role="dialog"]') !== null
      );
      expect(stillInModal).toBe(true);
    }
  });
});
```

Playwright runs axe in a **real browser**, so `color-contrast` works here (unlike jsdom). Always test keyboard nav and focus traps manually in E2E — axe doesn't catch them.

## Pattern 3: Pa11y Site-Wide CI Gate

```javascript
// pa11y-ci.config.js
module.exports = {
  defaults: {
    standard: "WCAG2AA",
    runners: ["axe", "htmlcs"],
    timeout: 30000,
    screenCapture: "./pa11y-ci/screenshots/${name}.png",
    ignore: [
      // Documented, with owner + expiry
      // "WCAG2AA.Principle1.Guideline1_4.1_4_3.G18.Fail" // #owner:design-system, expires:2026-12-31
    ],
  },
  urls: [
    { url: "http://localhost:3000/", name: "home" },
    { url: "http://localhost:3000/checkout", name: "checkout" },
    { url: "http://localhost:3000/settings", name: "settings", actions: [
      "set field #email to test@example.com",
      "click element button[type=submit]",
      "wait for path to be /settings/saved",
    ]},
  ],
};
```

```bash
npm i -g pa11y-ci
pa11y-ci --config pa11y-ci.config.js --threshold 0
# exits non-zero on any violation
```

`--threshold 0` means zero tolerance. For legacy apps, start with a documented threshold and ratchet down.

## Pattern 4: Lighthouse CI a11y Assertions

```javascript
// lighthouserc.js
module.exports = {
  ci: {
    collect: { url: ["http://localhost:3000/"], numberOfRuns: 3 },
    assert: {
      assertions: {
        "categories:accessibility": ["error", { minScore: 0.95 }],
        "color-contrast": "error",
        "label": "error",
        "image-alt": "error",
        "link-name": "error",
        "button-name": "error",
        "html-has-lang": "error",
        "meta-viewport": "error",
      },
    },
    upload: { target: "temporary-public-storage" },
  },
};
```

```bash
npm i -g @lhci/cli
lhci autorun
```

Lighthouse a11y score is a *summary*; the individual audit assertions are the gate. Never rely on score alone — a 0.95 score can hide a critical `label` violation.

## Pattern 5: eslint-plugin-jsx-a11y (lint-time prevention)

```javascript
// eslint.config.js (flat config)
import jsxA11y from "eslint-plugin-jsx-a11y";

export default [
  {
    ...jsxA11y.flatConfigs.recommended,
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      "jsx-a11y/alt-text": "error",
      "jsx-a11y/aria-role": "error",
      "jsx-a11y/aria-props": "error",
      "jsx-a11y/aria-proptypes": "error",
      "jsx-a11y/label-has-associated-control": ["error", { assert: "both" }],
      "jsx-a11y/no-noninteractive-element-interactions": "error",
      "jsx-a11y/click-events-have-key-events": "error",
      "jsx-a11y/no-static-element-interactions": "error",
      "jsx-a11y/anchor-is-valid": "error",
      "jsx-a11y/tabindex-no-positive": "error",
    },
  },
];
```

Lint catches ~30% of a11y issues at authoring time — the cheapest place to fix them. Pair with component/E2E tests for the rest.

## What Automated Tools Miss (~60% of WCAG)

axe-core + Lighthouse + Pa11y catch roughly 40% of WCAG violations (WebAIM Million study). The rest require manual or semi-automated testing:

| WCAG area | Why automated misses it | How to test |
|---|---|---|
| Keyboard traps | Requires sequential Tab navigation + state awareness | Playwright keyboard test (Pattern 2) |
| Focus order logic | "Logical" is semantic, not structural | Snapshot focus order, human review |
| Screen reader semantics | NVDA/JAWS/VoiceOver announce differently than DOM | Manual SR testing, or `@axe-core/playwright` + SR simulation |
| Cognitive load | "Understandable" is subjective | Expert review ([[csp-access]] Mode B) |
| Timing/animation | Vestibular triggers, flashing | Manual review, `prefers-reduced-motion` test |
| Content alternatives | Alt text *quality* (not just presence) | Human review |
| Responsive reflow | 400% zoom, mobile viewport | Playwright viewport matrix + visual regression |

Always pair automated gates with a manual pass before release. See [[csp-access]] for the full heuristic review protocol.

## CI Integration

| Gate | Tool | Scope | Threshold | Frequency |
|---|---|---|---|---|
| Lint | eslint-plugin-jsx-a11y | All JSX/TSX | 0 errors | Every PR |
| Component | vitest-axe / jest-axe | Changed components | 0 violations | Every PR |
| E2E | @axe-core/playwright | Critical flows (checkout, signup, settings) | 0 violations | Every PR |
| Site-wide | Pa11y CI / Lighthouse CI | All public pages | 0 violations (or documented threshold) | Nightly + pre-release |
| Manual | NVDA/JAWS/VoiceOver + keyboard | Full app | Expert checklist | Pre-release, quarterly |

## Anti-Patterns

- **Treating `toHaveNoViolations()` as sufficient** — It misses keyboard traps, focus order, screen-reader semantics, cognitive load. Automated = 40% coverage.
- **Disabling `color-contrast` globally instead of only in jsdom** — Playwright runs it fine. Scope the disable to jsdom tests with a comment.
- **Testing only the happy path** — Error states, empty states, modals, toasts, loading spinners all need a11y assertions. Violations cluster in non-happy paths.
- **Ignoring `incomplete` results** — axe returns `incomplete` for items needing human review (contrast on images, complex ARIA). Triage them, don't discard.
- **No CI gate on new violations** — Use `--threshold 0` or Lighthouse `assert` with `error` level. A "warn" gate is a no-op gate.
- **Snapshot testing focus order without review** — Snapshots catch *changes*, not *correctness*. Review the baseline once, then let snapshots guard regressions.
- **Relying on overlay widgets ("accessibility fix-it" toolbars)** — They violate WCAG themselves and create legal exposure. Fix the source.

## Related Skills

- [[csp-access]] — Design-time WCAG audit (Mode A real-user / Mode B heuristic); this skill is the test-time complement
- [[csp-react-testing]] — React Testing Library hosts vitest-axe/jest-axe component assertions
- [[csp-playwright-ui-test]] — Playwright harness that hosts @axe-core/playwright E2E assertions
- [[csp-e2e-testing]] — E2E suite structure; a11y specs slot in as a parallel test directory
- [[csp-browser-testing-with-devtools]] — DevTools MCP for manual a11y inspection during dev
- [[csp-test-methodology]] — L1 method selection; a11y fills the "accessibility regression" blind spot
- [[csp-frontend-patterns]] — Semantic HTML, ARIA usage patterns that a11y tests validate
- [[csp-visual-regression]] — Visual diffs catch layout shifts that break target-size (WCAG 2.5.8)
