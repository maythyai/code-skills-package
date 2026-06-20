---
name: csp-locale-management
description: >
  Manage locale data, formatting, and layout patterns including Intl API usage,
  timezone handling, RTL support, pluralization rules, and locale-based routing.
  Use when implementing locale-specific formatting, content negotiation, or
  bidirectional text support in web applications.
version: 0.1.0
layer: 4
category: patterns
---

# Locale Data Management and Formatting Patterns

Practical patterns for locale-specific data formatting, layout direction, content negotiation, and i18n testing.

## When to Activate

- Implementing locale-aware date, number, or currency formatting
- Adding RTL (right-to-left) language support to a layout
- Building locale-based routing with fallback chains
- Handling timezone conversions and DST edge cases
- Setting up pseudo-localization or i18n testing infrastructure
- Managing user locale preferences across client and server

## Intl API Usage

### Date and Relative Time Formatting

```typescript
const date = new Date("2025-03-15T14:30:00Z");

new Intl.DateTimeFormat("en-US").format(date);       // "3/15/2025"
new Intl.DateTimeFormat("de-DE").format(date);        // "15.3.2025"
new Intl.DateTimeFormat("ja-JP").format(date);        // "2025/3/15"
new Intl.DateTimeFormat("ar-SA", { calendar: "islamic-umalqura" }).format(date);

function formatRelativeTime(date: Date, locale: string, now = new Date()): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const diffSec = Math.round((date.getTime() - now.getTime()) / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHr = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHr / 24);

  if (Math.abs(diffSec) < 60) return rtf.format(diffSec, "second");
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
  if (Math.abs(diffHr) < 24)  return rtf.format(diffHr, "hour");
  if (Math.abs(diffDay) < 30) return rtf.format(diffDay, "day");
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" }).format(date);
}

formatRelativeTime(new Date(Date.now() - 3600000), "en"); // "1 hour ago"
formatRelativeTime(new Date(Date.now() - 3600000), "ja"); // "1時間前"
```

### Number and Currency Formatting

```typescript
new Intl.NumberFormat("en-US").format(1234567.89);  // "1,234,567.89"
new Intl.NumberFormat("de-DE").format(1234567.89);   // "1.234.567,89"
new Intl.NumberFormat("hi-IN").format(1234567.89);   // "12,34,567.89" (Indian grouping)

function formatCurrency(amount: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency", currency, currencyDisplay: "symbol",
  }).format(amount);
}

formatCurrency(49.99, "USD", "en-US");  // "$49.99"
formatCurrency(49.99, "EUR", "de-DE");  // "49,99 €"
formatCurrency(49.99, "JPY", "ja-JP");  // "￥50" (no decimal for JPY)

// Accounting notation: ($49.99) instead of -$49.99
new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", currencySign: "accounting",
}).format(-49.99);
```

### List Formatting

```typescript
new Intl.ListFormat("en", { type: "conjunction" }).format(["Alice", "Bob", "Charlie"]);
// "Alice, Bob, and Charlie"
new Intl.ListFormat("de", { type: "conjunction" }).format(["Alice", "Bob", "Charlie"]);
// "Alice, Bob und Charlie"
new Intl.ListFormat("en", { type: "disjunction" }).format(["tea", "coffee"]);
// "tea or coffee"
```

## Timezone Handling

```typescript
const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

function displayInTimezone(date: Date, timezone: string, locale = "en"): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: timezone, year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", timeZoneName: "short",
  }).format(date);
}

// Check if a date falls in DST
function isDST(date: Date, timezone: string): boolean {
  const jan = new Date(date.getFullYear(), 0, 1);
  const jul = new Date(date.getFullYear(), 6, 1);
  const offsets = [jan, jul, date].map(d => getOffset(d, timezone));
  const stdOffset = Math.min(offsets[0], offsets[1]);
  return offsets[2] !== stdOffset;
}

// Always use IANA names ("America/New_York"), never abbreviations ("EST")
// Abbreviations are ambiguous and don't handle DST
```

## Pluralization Rules (CLDR)

```typescript
// CLDR categories: zero, one, two, few, many, other
// English: one (1), other (0, 2+)
// Arabic: zero, one, two, few (3-10), many (11-99), other (100+)
// Polish: one (1), few (2-4), many (5-21, 25-31), other
// Japanese: other (all numbers)

function pluralize(count: number, locale: string, messages: Record<string, string>): string {
  const rule = new Intl.PluralRules(locale).select(count);
  return messages[rule] ?? messages["other"];
}

// English (2 forms)
pluralize(1, "en", { one: "{count} item", other: "{count} items" });

// Polish (4 forms)
pluralize(3, "pl", {
  one: "{count} element", few: "{count} elementy",
  many: "{count} elementow", other: "{count} elementu",
});

// ICU MessageFormat in translation files:
// "items": "{count, plural, =0 {No items} one {# item} other {# items}}"
```

## RTL Layout Support

### CSS Logical Properties

```css
/* BAD: Physical properties break in RTL */
.sidebar { margin-left: 20px; }
.arrow   { right: 10px; }

/* GOOD: Logical properties adapt automatically */
.sidebar { margin-inline-start: 20px; }
.arrow   { inset-inline-end: 10px; }

.content {
  padding-inline-start: 1rem;   /* left in LTR, right in RTL */
  border-inline-start: 3px solid var(--accent);
  border-start-start-radius: 8px; /* top-left LTR, top-right RTL */
}
```

### Setting Document Direction

```typescript
const RTL_LOCALES = new Set(["ar", "he", "fa", "ur", "ps", "sd", "yi", "ckb"]);

function setDocumentDirection(locale: string): void {
  const dir = RTL_LOCALES.has(locale.split("-")[0]) ? "rtl" : "ltr";
  document.documentElement.dir = dir;
  document.documentElement.lang = locale;
}

// Use <bdi> for user-generated content that may be in different direction
// Use direction: ltr; unicode-bidi: embed; for code blocks (always LTR)
```

## Locale-Based Routing

### URL Pattern Strategies

| Strategy | Example | SEO | Complexity |
|---|---|---|---|
| **Path prefix** | `/en/about`, `/ja/about` | Best | Medium |
| **Subdomain** | `en.example.com` | Good | High |
| **Header-based** | `Accept-Language: ja` | Poor | Low |
| **Query param** | `/about?lang=ja` | Poor | Low |

### Content Negotiation

```typescript
function parseAcceptLanguage(header: string): { locale: string; quality: number }[] {
  return header.split(",").map(part => {
    const [locale, q] = part.trim().split(";q=");
    return { locale: locale.trim(), quality: q ? parseFloat(q) : 1.0 };
  }).sort((a, b) => b.quality - a.quality);
}

function resolveLocale(
  acceptLanguage: string | null, supported: string[], defaultLocale: string
): string {
  if (!acceptLanguage) return defaultLocale;
  for (const { locale } of parseAcceptLanguage(acceptLanguage)) {
    if (supported.includes(locale)) return locale;
    const lang = locale.split("-")[0];
    const match = supported.find(s => s === lang || s.startsWith(`${lang}-`));
    if (match) return match;
  }
  return defaultLocale;
}

// Resolution order: URL path > user profile > cookie > Accept-Language > default
```

## Locale Data Storage

```typescript
interface LocaleContext {
  locale: string;
  timezone: string;
  currency: string;
}

// Server-side: store in user profile
async function getUserLocaleContext(userId: string): Promise<LocaleContext> {
  const user = await db.users.findById(userId);
  return {
    locale: user?.locale ?? "en",
    timezone: user?.timezone ?? "UTC",
    currency: user?.currency ?? "USD",
  };
}

// Client-side: cookie fallback for anonymous users
function setLocaleCookie(locale: string): void {
  document.cookie = `locale=${locale};path=/;max-age=${365 * 86400};SameSite=Lax`;
}
```

## String Collation and Sorting

```typescript
// Locale-aware comparison (essential for non-Latin scripts)
const german = new Intl.Collator("de", { sensitivity: "base" });
["Muller", "Müller", "Maier"].sort(german.compare);
// "Maier", "Muller", "Müller" -- ü sorts near u in German

// Turkish: lowercase "I" is "ı" (dotless), not "i"
"Istanbul".toLocaleLowerCase("tr"); // "istanbul"

function localeIncludes(text: string, query: string, locale: string): boolean {
  return text.toLocaleLowerCase(locale).includes(query.toLocaleLowerCase(locale));
}
```

## Testing i18n

### Pseudo-Localization

```typescript
function pseudoLocalize(text: string): string {
  const map: Record<string, string> = {
    a: "ä", b: "ƀ", c: "ç", d: "ð", e: "é", f: "ƒ", g: "ĝ", h: "ĥ",
    i: "î", j: "ĵ", k: "ķ", l: "ļ", m: "ɱ", n: "ñ", o: "ö", p: "þ",
    r: "ŗ", s: "š", t: "ţ", u: "ü", v: "ṽ", w: "ŵ", y: "ý", z: "ž",
  };
  const transformed = text.replace(/[a-z]/gi, c => map[c.toLowerCase()] ?? c);
  return `[!!! ${transformed} !!!]`; // 30% padding tests layout overflow
}
// "Hello World" -> "[!!! Ĥéļļö Ŵöŗļð !!!]"
```

### Missing Translation Detection

```typescript
function findMissingTranslations(source: Record<string, string>, target: Record<string, string>): string[] {
  return Object.keys(source).filter(key => !(key in target) || target[key] === source[key]);
}

// Runtime warning in development
i18n.on("missingKey", (lng, ns, key) => {
  console.warn(`[i18n] Missing: ${ns}:${key} (${lng})`);
});
```

## Anti-Patterns

- **Using `toLocaleDateString()` without specifying locale**: In SSR, the server's locale may differ from the user's; always pass the locale explicitly.
- **Storing formatted dates/numbers in the database**: Store raw values (UTC timestamps, decimal amounts) and format at the presentation layer.
- **Hardcoding timezone abbreviations like "EST"**: These are ambiguous and don't handle DST; always use IANA names like "America/New_York".
- **Applying `direction: rtl` only to individual elements**: RTL must be set on `<html dir="rtl">` so all layouts, flex directions, and scrolling adapt.
- **Ignoring `few` and `many` plural categories**: English only uses `one`/`other`, but Arabic, Polish, and Russian need all six CLDR categories.
- **Sorting with `Array.prototype.sort()` without a collator**: Default sort uses UTF-16 code units, producing incorrect ordering for accented and non-Latin characters.

## Related Skills

- [[csp-i18n-frameworks]] -- Framework selection and integration for i18n libraries
- [[csp-frontend-patterns]] -- Frontend architecture patterns including locale-aware components
- [[csp-seo-engineering]] -- Hreflang tags and locale-aware search engine optimization
- [[csp-react-patterns]] -- React patterns that integrate with locale hooks and context
