---
name: csp-i18n-frameworks
description: >
  Select, configure, and integrate internationalization frameworks for React,
  Next.js, and Vue applications. Use when setting up i18n for a new project,
  migrating between i18n libraries, or building a translation workflow pipeline.
version: 0.1.0
layer: 4
category: patterns
---

# Internationalization Framework Selection and Integration

Guide to choosing and configuring i18n frameworks for modern web applications, with translation workflow automation.

## When to Activate

- Starting a new project that requires multi-language support
- Migrating from one i18n library to another
- Setting up a translation extraction and deployment pipeline
- Evaluating which i18n framework fits the current tech stack
- Integrating with translation management platforms (Crowdin, Lokalise, Weblate)
- Implementing AI-assisted translation workflows with human review

## Framework Comparison Matrix

| Feature | next-intl | i18next | vue-i18n | react-intl |
|---|---|---|---|---|
| **Framework** | Next.js App Router | React, universal | Vue 3 | React |
| **Bundle** | ~15 kB | ~12 kB | ~18 kB | ~20 kB |
| **Routing** | Middleware-based | Manual | Manual | Manual |
| **RSC support** | Native | Via wrapper | N/A | N/A |
| **ICU format** | Yes | Plugin | Yes | Yes (native) |
| **Lazy loading** | Per-namespace | Per-namespace | Per-locale | Per-locale |
| **Type safety** | Generated types | Resources-for | Generated | Generated |
| **Best for** | Next.js | Universal | Vue 3 | ICU-heavy React |

### Decision Tree

```
Next.js App Router? -> next-intl
Vue 3?             -> vue-i18n
Need ICU/FormatJS? -> react-intl
Otherwise          -> react-i18next (most flexible, largest ecosystem)
```

## next-intl Setup (Next.js App Router)

```typescript
// src/i18n/routing.ts
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "ja", "de", "fr"],
  defaultLocale: "en",
  localePrefix: "as-needed", // Omit prefix for default locale
});
```

```typescript
// src/i18n/request.ts
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";
import { hasLocale } from "next-intl";

export default getRequestConfig(async ({ requestLocale }) => {
  let requested = await requestLocale;
  if (!hasLocale(routing.locales, requested)) {
    requested = routing.defaultLocale;
  }
  return {
    locale: requested,
    messages: (await import(`../messages/${requested}.json`)).default,
  };
});
```

```typescript
// src/middleware.ts
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
export default createMiddleware(routing);
export const config = { matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"] };
```

### Using Translations

```tsx
// Server Component
import { getTranslations } from "next-intl/server";
export default async function Home() {
  const t = await getTranslations("home");
  return <h1>{t("title")}</h1>;
}

// Client Component
"use client";
import { useTranslations } from "next-intl";
export function CartButton() {
  const t = useTranslations("cart");
  return <button>{t("addToCart")}</button>;
}
```

## react-i18next Setup

```typescript
// src/i18n/config.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import HttpBackend from "i18next-http-backend";

i18n.use(LanguageDetector).use(HttpBackend).use(initReactI18next).init({
  fallbackLng: "en",
  supportedLngs: ["en", "ja", "de", "fr"],
  ns: ["common", "auth", "dashboard"],
  defaultNS: "common",
  backend: { loadPath: "/locales/{{lng}}/{{ns}}.json" },
  interpolation: { escapeValue: false },
  detection: { order: ["path", "cookie", "navigator"], caches: ["cookie"] },
});
```

### Type Safety

```typescript
// src/i18n/types.d.ts
import "i18next";
import common from "../locales/en/common.json";
import auth from "../locales/en/auth.json";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: { common: typeof common; auth: typeof auth };
  }
}
// t("auth:login.title") -> now autocompleted
```

## vue-i18n Setup

```typescript
// src/i18n/index.ts
import { createI18n } from "vue-i18n";
import en from "./messages/en.json";

export const i18n = createI18n({
  legacy: false, // Composition API mode
  locale: "en", fallbackLocale: "en", messages: { en },
});

export async function loadLocale(locale: string) {
  if (i18n.global.availableLocales.includes(locale)) return;
  const messages = await import(`./messages/${locale}.json`);
  i18n.global.setLocaleMessage(locale, messages.default);
  i18n.global.locale.value = locale;
}
```

## Translation Workflow Pipeline

```
Source Code -> Extract Keys -> Push to TMS -> Translate -> Review -> Pull -> Deploy
```

```yaml
# .github/workflows/i18n.yml
name: Translation Pipeline
on:
  push: { branches: [main], paths: ["src/messages/en.json"] }

jobs:
  extract-and-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "22" }
      - run: npx next-intl extract
      - uses: crowdin/github-action@v2
        with:
          upload_sources: true
          download_translations: true
          localization_branch_name: l10n_main
          create_pull_request: true
        env:
          CROWDIN_PROJECT_ID: ${{ secrets.CROWDIN_PROJECT_ID }}
          CROWDIN_PERSONAL_TOKEN: ${{ secrets.CROWDIN_TOKEN }}
```

### Translation File Format Comparison

| Format | Pros | Cons | Best For |
|---|---|---|---|
| **JSON** | Universal, nested keys | No metadata | Web apps |
| **YAML** | Readable, comments | Slow parse | Config-heavy projects |
| **PO/POT** | Plurals, context | Verbose | gettext/Django |
| **XLIFF** | Industry standard | XML complexity | Enterprise |

## TMS Integration

### Crowdin

```yaml
# crowdin.yml
project_id: "12345"
api_token_env: CROWDIN_PERSONAL_TOKEN
files:
  - source: /src/messages/en.json
    translation: /src/messages/%two_letters_code%.json
    type: json
```

### Lokalise

```bash
lokalise2 file upload --token $TOKEN --project-id $ID --file src/messages/en.json --lang-iso en
lokalise2 file download --token $TOKEN --project-id $ID --format json --dest src/messages/
```

## AI-Assisted Translation

```typescript
async function translateWithLLM(text: string, target: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o", temperature: 0.3,
      messages: [
        { role: "system", content: `Translate to ${target}. Preserve ICU syntax and placeholders. Return only the translation.` },
        { role: "user", content: text },
      ],
    }),
  });
  return (await res.json()).choices[0].message.content;
}

// Workflow: AI generates initial translations -> push to TMS with "needs_review" flag
// -> human reviewers approve/edit -> CI pulls only approved translations
```

## Build-Time vs Runtime Translation

| Aspect | Build-Time (Static) | Runtime (Dynamic) |
|---|---|---|
| **Approach** | Pre-render all locale variants | Load translations on demand |
| **Bundle** | Larger (all locales) | Smaller (lazy loaded) |
| **Update** | Requires rebuild | Instant updates |
| **Best for** | SSG, marketing | SaaS, dynamic content |

```typescript
// Build-time: next-intl static generation
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// Runtime: i18next HTTP backend loads from CDN
i18n.init({ backend: { loadPath: "https://cdn.example.com/locales/{{lng}}/{{ns}}.json" } });
```

## Anti-Patterns

- **Hardcoding locale strings in components**: Always use translation keys; hardcoded strings bypass the i18n pipeline entirely.
- **Loading all translations upfront**: Importing every locale inflates load time by 200-500 kB for 10+ languages; use lazy loading per namespace.
- **Using array indices as keys**: Keys like `t[0]` break when translations reorder; always use stable semantic keys like `auth.loginButton`.
- **Skipping pseudo-localization**: Without `[!!!original text!!!]` testing, untranslated strings go undetected until production.
- **Storing translated content alongside source in the database**: Makes it hard to track stale translations; use a separate translation store or CMS.
- **Ignoring ICU plural rules**: `count > 1 ? "items" : "item"` ignores languages with complex plurals (Arabic has 6 forms); always use ICU `{count, plural, ...}` syntax.

## Related Skills

- [[csp-locale-management]] -- Locale data formatting, timezone handling, and RTL support
- [[csp-frontend-patterns]] -- Frontend architecture patterns that integrate with i18n
- [[csp-nextjs-turbopack]] -- Next.js-specific patterns including i18n routing optimization
- [[csp-seo-engineering]] -- Hreflang tags, locale-aware sitemaps, and search indexing
- [[csp-cicd-pipelines]] -- CI/CD integration for automated translation pipelines
