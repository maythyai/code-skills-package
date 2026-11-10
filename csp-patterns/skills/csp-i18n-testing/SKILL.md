---
name: csp-i18n-testing
description: >
  Testing internationalization and localization: FormatJS CLI extract-diff for
  translation completeness CI gates, eslint-plugin-formatjs for ICU MessageFormat
  validation, Playwright multi-locale context for locale/timezone/RTL rendering,
  pseudo-localization (qps-ploc) to surface hardcoded strings without waiting for
  translations, and plural-rule/snapshot tests for date/number/currency formatting.
  Unlike csp-i18n-frameworks (setup) and csp-locale-management (formatting patterns),
  this skill wires i18n correctness into the automated test pipeline.
version: 0.1.0
layer: 3
category: patterns
phase: verify
domain: testing
role: specialist
scope: implementation
tools: [Read, Write, Edit, Bash, Glob, Grep]
related_skills:
  - [[csp-i18n-frameworks]]
  - [[csp-locale-management]]
  - [[csp-playwright-ui-test]]
  - [[csp-e2e-testing]]
  - [[csp-react-testing]]
  - [[csp-test-methodology]]
  - [[csp-visual-regression]]
anti_rationalizations:
  "我们只支持中文不需要 i18n 测试": "即使单语言，ICU 复数规则、日期/数字格式、RTL 预留位、字符串拼接都会出错；i18n 测试本质是*文案健壮性*测试"
  "翻译外包了不用测": "外包翻译质量不可控；completeness gate + pseudo-localization 能在翻译到位前就抓住硬编码字符串和截断问题"
  "跑一遍 en-US 就够了": "ICU 语法错误、CJK 截断、RTL 布局、复数规则差异只在非英语 locale 暴露；至少测 en/de/ja/ar/qps-ploc 五个"
---

# i18n / l10n Testing

Prove your product renders correctly, completely, and idiomatically across locales — before users (or regulators) find the bugs.

## When to Activate

- Product launches in 2+ locales
- You have a translation vendor and want to catch regressions when new strings ship
- Legal requirement (EU accessibility/localization directives, Quebec Bill 96, Japan APPI)
- Design system with i18n primitives (needs contract tests for ICU messages)
- Recent incident: hardcoded string, broken plural, RTL layout overflow
- Pre-release: translation completeness gate

## Boundary with Sibling Skills

| Skill | Scope | Output |
|---|---|---|
| [[csp-i18n-frameworks]] | Framework selection + setup (react-intl, i18next, FormatJS) | Configured i18n runtime |
| [[csp-locale-management]] | Locale data, Intl API, timezone, RTL, pluralization *patterns* | Formatting code |
| **csp-i18n-testing (this)** | *Assertions* that the above work correctly across locales | Test failures, CI gates |

> Setup skills tell you *how to build* i18n; this skill tells you *how to prove it works*.

## i18n Bug Taxonomy

| Bug class | Example | How to catch |
|---|---|---|
| Hardcoded string | `"Hello " + name` in JSX | Pseudo-localization (qps-ploc) surfaces it instantly |
| String concatenation | `"You have " + n + " items"` breaks word order in Japanese | eslint-plugin-formatjs `enforce-placeholders` |
| ICU syntax error | `{count, plural, one {# item} other {# items}` (missing brace) | `formatjs compile` fails; eslint `no-invalid-icu` |
| Missing translation | Key exists in en.json, absent in de.json | FormatJS extract-diff CI gate |
| Plural rule mismatch | English `one/other` vs Polish `one/few/many/other` vs Arabic `zero/one/two/few/many/other` | Locale matrix test with CLDR plural counts |
| RTL layout overflow | Arabic text overflows fixed-width button | Playwright `dir="rtl"` + visual regression |
| CJK truncation | Japanese string 2× longer than English, clipped by `text-overflow: ellipsis` | Playwright multi-locale screenshot diff |
| Date/number format | `12/11/2026` is Dec 11 in US, Nov 12 in EU | Snapshot test `Intl.DateTimeFormat` per locale |
| Timezone bug | "Midnight" means different UTC instants per locale | Playwright `timezoneId` context option |
| Locale fallback chain | `de-CH` → `de` → `en` not configured, user sees raw key | Unit test fallback resolution |

## Tool Matrix

| Domain | Tool | Install | Use |
|---|---|---|---|
| Message extraction | FormatJS CLI 3.x | `npm i -D @formatjs/cli` | `formatjs extract "src/**/*.{ts,tsx}" --out-file lang/en.json` |
| ICU lint | eslint-plugin-formatjs | `npm i -D eslint-plugin-formatjs` | Rules: `enforce-placeholders`, `enforce-default-message`, `no-invalid-icu`, `enforce-id` |
| ICU validation | @formatjs/icu-messageformat-parser | bundled with FormatJS | Parse-time syntax check |
| i18next extraction | i18next-parser | `npm i -D i18next-parser` | `i18next "src/**/*"` |
| Translation completeness | i18n-tasks (Ruby/Rails) | `gem install i18n-tasks` | `i18n-tasks missing`, `i18n-tasks health` |
| Translation completeness | translate-toolkit | `pip install translate-toolkit` | `pocount`, `pomerge`, custom diff scripts |
| Multi-locale E2E | Playwright | `npm i -D @playwright/test` | `browser.newContext({ locale, timezoneId, geolocation })` |
| Pseudo-localization | qps-ploc (QA pseudo-locale) | built into Windows/Android; custom for web | Expands strings ~30%, replaces ASCII with accented chars |
| Pseudo-localization | i18next-pseudo | `npm i i18next-pseudo` | `[!! Ťéšţ !!]` markers |
| RTL testing | Playwright + CSS logical properties | — | `page.emulateMedia`, `dir="rtl"` assertion |
| CLDR data | @unicode-cldr/cldr-localenames-modern | `npm i @unicode-cldr/...` | Plural rules, locale names |

## Pattern 1: FormatJS Extract-Diff CI Gate (translation completeness)

```bash
# 1. Extract current messages from source
formatjs extract "src/**/*.{ts,tsx}" \
  --out-file /tmp/extracted.json \
  --id-interpolation-pattern "[sha512:contenthash:base64:6]"

# 2. Diff against committed en.json (CI gate)
diff <(jq -S 'keys' lang/en.json) <(jq -S 'keys' /tmp/extracted.json)
# exits non-zero if keys diverged

# 3. Check every locale has every key
for locale in de ja ar fr es; do
  missing=$(jq -r --slurpfile en lang/en.json \
    '($en[0] | keys) - (keys) | .[]' lang/$locale.json)
  if [ -n "$missing" ]; then
    echo "❌ $locale missing keys:"
    echo "$missing"
    exit 1
  fi
done

# 4. Compile (catches ICU syntax errors)
formatjs compile lang/*.json --out-dir compiled/
```

Wire into CI as a required check. Any PR that adds a `<FormattedMessage>` without updating all locale files fails the gate.

## Pattern 2: eslint-plugin-formatjs (authoring-time prevention)

```javascript
// eslint.config.js
import formatjs from "eslint-plugin-formatjs";

export default [
  {
    plugins: { formatjs },
    rules: {
      "formatjs/enforce-default-message": ["error", "literal"],
      "formatjs/enforce-placeholders": "error",
      "formatjs/no-invalid-icu": "error",
      "formatjs/enforce-id": ["error", { idInterpolationPattern: "[sha512:contenthash:base64:6]" }],
      "formatjs/no-complex-selectors": "error",
      "formatjs/prefer-pill": "warn",
    },
  },
];
```

Catches at authoring time:
- String concatenation (`"Hello " + name` → must use `{name}` placeholder)
- Invalid ICU syntax (missing braces, unknown plural category)
- Missing default message (untranslatable string)
- Unstable IDs (rename → translation orphaned)

## Pattern 3: Playwright Multi-Locale Matrix

```typescript
// e2e/i18n/locale-matrix.spec.ts
import { test, expect } from "@playwright/test";

const LOCALES = [
  { locale: "en-US", timezoneId: "America/New_York", dir: "ltr" },
  { locale: "de-DE", timezoneId: "Europe/Berlin", dir: "ltr" },
  { locale: "ja-JP", timezoneId: "Asia/Tokyo", dir: "ltr" },
  { locale: "ar-SA", timezoneId: "Asia/Riyadh", dir: "rtl" },
  { locale: "he-IL", timezoneId: "Asia/Jerusalem", dir: "rtl" },
  { locale: "qps-ploc", timezoneId: "UTC", dir: "ltr" },  // pseudo
];

for (const { locale, timezoneId, dir } of LOCALES) {
  test.describe(`locale=${locale}`, () => {
    test.use({ locale, timezoneId });

    test("checkout renders without overflow", async ({ page }) => {
      await page.goto("/checkout");
      // RTL assertion
      if (dir === "rtl") {
        await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
      }
      // No text overflow (CJK truncation guard)
      const overflowCount = await page.evaluate(() =>
        Array.from(document.querySelectorAll("*")).filter((el) => {
          const style = getComputedStyle(el);
          return el.scrollWidth > el.clientWidth &&
                 style.overflow !== "auto" && style.overflow !== "scroll" &&
                 style.textOverflow !== "ellipsis";
        }).length
      );
      expect(overflowCount).toBe(0);
      // Visual regression per locale
      await expect(page).toHaveScreenshot(`checkout-${locale}.png`, {
        maxDiffPixelRatio: 0.02,
      });
    });

    test("dates and numbers format correctly", async ({ page }) => {
      await page.goto("/orders/123");
      const dateText = await page.getByTestId("order-date").textContent();
      // Snapshot per locale — don't hardcode format
      expect(dateText).toMatchSnapshot(`order-date-${locale}.txt`);
    });

    test("plural forms render correctly", async ({ page }) => {
      await page.goto("/cart?items=0");
      await expect(page.getByTestId("cart-count")).toContainText(/no items|0 items|keine Artikel|商品なし|لا توجد عناصر/);
      await page.goto("/cart?items=1");
      await expect(page.getByTestId("cart-count")).toContainText(/1 item|1 Artikel|1点の商品|عنصر واحد/);
      await page.goto("/cart?items=5");
      await expect(page.getByTestId("cart-count")).toContainText(/5 items|5 Artikel|5点の商品|5 عناصر/);
    });
  });
}
```

Minimum locale set for CI: `en-US` (baseline), one CJK (`ja-JP` — truncation risk), one RTL (`ar-SA` — layout flip), one European with long strings (`de-DE` — ~30% expansion), `qps-ploc` (pseudo — hardcoded string detector).

## Pattern 4: Pseudo-Localization (qps-ploc)

Pseudo-localization replaces every ASCII character with an accented variant and expands the string ~30%. It surfaces:
- Hardcoded strings (they stay in English while everything else is `[!! Ťéšţ !!]`)
- Truncation (expanded strings overflow fixed-width containers)
- Encoding issues (accented chars break if UTF-8 isn't end-to-end)
- Concatenation (word order breaks visibly)

```typescript
// Custom pseudo-locale generator (if qps-ploc unavailable)
function pseudoLocalize(s: string): string {
  const ACCENTS: Record<string, string> = {
    a: "àáâãäå", b: "ƀɓ", c: "çćĉ", d: "ðď", e: "èéêëē",
    // ... full map
  };
  let out = "";
  for (const ch of s) {
    const lower = ch.toLowerCase();
    if (ACCENTS[lower]) {
      const variants = ACCENTS[lower];
      out += variants[Math.floor(Math.random() * variants.length)];
    } else {
      out += ch;
    }
  }
  // Expand ~30%
  return `[!! ${out}${"~".repeat(Math.floor(s.length * 0.3))} !!]`;
}

// Generate lang/qps-ploc.json from lang/en.json
const en = require("./lang/en.json");
const pseudo = Object.fromEntries(
  Object.entries(en).map(([k, v]) => [k, pseudoLocalize(v as string)])
);
require("fs").writeFileSync("lang/qps-ploc.json", JSON.stringify(pseudo, null, 2));
```

Run the full Playwright suite against `qps-ploc` in CI. Any English text visible in screenshots = hardcoded string = bug.

## Pattern 5: ICU Plural Rule Unit Tests

```typescript
// src/i18n/__tests__/plurals.test.ts
import { IntlMessageFormat } from "intl-messageformat";
import messages from "../../../lang/en.json";
import deMessages from "../../../lang/de.json";
import arMessages from "../../../lang/ar.json";
import plMessages from "../../../lang/pl.json";

const LOCALE_PLURAL_COUNTS: Record<string, number[]> = {
  en: [0, 1, 2, 5, 100],          // one, other
  de: [0, 1, 2, 5, 100],          // one, other
  ar: [0, 1, 2, 3, 11, 100],      // zero, one, two, few, many, other
  pl: [0, 1, 2, 5, 22, 25, 100],  // one, few, many, other
  ja: [0, 1, 5, 100],             // other only
};

describe("plural rules", () => {
  for (const [locale, counts] of Object.entries(LOCALE_PLURAL_COUNTS)) {
    const msgs = { en: messages, de: deMessages, ar: arMessages, pl: plMessages }[locale]!;
    test.each(counts)(`${locale}: count=%i renders without error`, (count) => {
      const fmt = new IntlMessageFormat(msgs["cart.itemCount"], locale);
      const result = fmt.format({ count });
      expect(result).toBeTruthy();
      expect(result).not.toContain("{");  // no unresolved ICU tokens
      expect(result).not.toContain("}");
    });
  }
});

test("every locale has every plural category", () => {
  for (const [locale, msgs] of Object.entries({ en: messages, de: deMessages, ar: arMessages, pl: plMessages })) {
    const mf = new IntlMessageFormat(msgs["cart.itemCount"], locale);
    // Extract required plural categories from the ICU message
    const required = getPluralCategories(locale);  // from CLDR
    for (const cat of required) {
      expect(mf.format({ count: categoryToCount(cat, locale) })).toBeTruthy();
    }
  }
});
```

Plural rules are the #1 i18n bug class. English `one/other` is trivial; Arabic has six categories; Polish has four with non-obvious boundaries (22 → few, 25 → many).

## Pattern 6: RTL Layout Testing

```typescript
// e2e/i18n/rtl.spec.ts
test("RTL layout mirrors correctly", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => document.documentElement.setAttribute("dir", "rtl"));

  // Assert logical properties, not physical
  const nav = page.locator("nav");
  const navBox = await nav.boundingBox();
  const logo = page.locator("[data-testid=logo]");
  const logoBox = await logo.boundingBox();

  // In RTL, logo should be on the RIGHT (higher x)
  expect(logoBox!.x).toBeGreaterThan(navBox!.x + navBox!.width / 2);

  // No horizontal overflow
  const hasOverflow = await page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  expect(hasOverflow).toBe(false);

  // Visual regression
  await expect(page).toHaveScreenshot("home-rtl.png");
});
```

CSS discipline: use **logical properties** (`margin-inline-start`, `padding-block-end`, `border-inline-start`) instead of physical (`margin-left`, `padding-bottom`). Lint with `eslint-plugin-logical-properties` or Stylelint.

## CI Integration

| Gate | Tool | Scope | Failure action |
|---|---|---|---|
| Lint | eslint-plugin-formatjs | All source | Block merge |
| Extract-diff | FormatJS CLI + jq | `lang/*.json` vs source | Block merge if keys diverge |
| Completeness | custom jq script | Every locale has every key | Block merge |
| ICU compile | `formatjs compile` | All locale files | Block merge on syntax error |
| Plural unit | vitest/jest + intl-messageformat | CLDR plural counts per locale | Block merge |
| Multi-locale E2E | Playwright (en/de/ja/ar/qps-ploc) | Critical flows | Block merge |
| Visual regression | Playwright screenshots per locale | Critical pages | Block merge on diff |
| Pseudo-localization | qps-ploc Playwright run | Full app | Warn (ratchet to block) |

## Anti-Patterns

- **String concatenation in UI** (`"Hello " + name`) — Breaks word order in Japanese/Korean/Arabic. Always use ICU placeholders.
- **Testing only `en-US`** — You'll miss ICU errors, RTL, CJK truncation, plural rules. Minimum: en + de + ja + ar + qps-ploc.
- **No CI gate on translation completeness** — Strings ship untranslated; users see raw keys. Extract-diff gate is mandatory.
- **Snapshot tests without locale pinning** — Dates/numbers change between runs if locale isn't fixed in the test context.
- **Ignoring plural rules** — English `one/other` vs Polish `one/few/many/other` vs Arabic `zero/one/two/few/many/other`. Test every CLDR category for every supported locale.
- **Hardcoded pixel widths for text containers** — German expands ~30%, Japanese ~50% vertically. Use `min-width`, `flex`, or `ch` units.
- **Treating pseudo-localization as optional** — It's the cheapest hardcoded-string detector you have. Run it in CI from day one.
- **RTL as an afterthought** — Retrofitting RTL costs 10× more than building with logical properties from the start.

## Related Skills

- [[csp-i18n-frameworks]] — Framework selection and setup (react-intl, i18next, FormatJS); this skill tests the result
- [[csp-locale-management]] — Intl API, timezone, RTL, pluralization *patterns*; this skill asserts they work
- [[csp-playwright-ui-test]] — Playwright harness hosting multi-locale E2E tests
- [[csp-e2e-testing]] — E2E suite structure; i18n specs slot in as a parallel directory
- [[csp-react-testing]] — Component tests hosting ICU plural/format assertions
- [[csp-test-methodology]] — L1 method selection; i18n fills the "locale correctness" blind spot
- [[csp-visual-regression]] — Per-locale screenshot diffs catch truncation/overflow/RTL layout bugs
