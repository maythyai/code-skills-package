---
name: csp-frontend-performance
description: >
  Diagnose and optimize frontend web application performance using Core Web Vitals,
  bundle analysis, code splitting, and framework-specific patterns. Use when pages
  feel slow, Lighthouse scores are low, or bundle sizes need reduction.
version: 0.1.0
layer: 4
category: patterns
---

# Frontend Performance Optimization

Systematic patterns for diagnosing and fixing frontend performance bottlenecks across the full rendering pipeline, from network delivery to runtime JavaScript execution.

## When to Activate

- Lighthouse or PageSpeed Insights reports show poor Core Web Vitals scores
- Users report sluggish interactions, slow page loads, or layout shifts
- Bundle size has grown beyond acceptable thresholds (e.g., >250 KB gzipped JS)
- Preparing for a major release and need to enforce performance budgets
- Migrating to a new framework and want to establish performance baselines
- CI performance budget checks are failing on pull requests

## Core Web Vitals Deep Dive

### Largest Contentful Paint (LCP)

LCP measures when the largest visible element finishes rendering. Target: under 2.5 seconds.

| Bottleneck | Symptom | Fix |
|---|---|---|
| Slow server response | High TTFB | Edge caching, SSR streaming, CDN |
| Render-blocking CSS/JS | Resources block first paint | Inline critical CSS, defer non-critical JS |
| Slow image load | Hero image loads late | Preload, fetchpriority="high", modern formats |
| Client-side rendering | Blank screen until JS runs | SSR/SSG, streaming, partial hydration |

```html
<!-- Preload the hero image with high fetch priority -->
<link
  rel="preload"
  as="image"
  href="/hero.webp"
  fetchpriority="high"
  type="image/webp"
/>

<!-- Preconnect to third-party origins early -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="dns-prefetch" href="https://analytics.example.com" />
```

### Interaction to Next Paint (INP)

INP captures responsiveness by measuring the latency of all interactions throughout the page lifecycle. Target: under 200 ms.

```typescript
// BAD: Heavy synchronous work in event handler
button.addEventListener("click", () => {
  const result = expensiveComputation(data); // blocks main thread
  renderResult(result);
});

// GOOD: Yield to the main thread before heavy work
button.addEventListener("click", async () => {
  // Let the browser paint the initial feedback
  await new Promise((r) => setTimeout(r, 0));

  // Use scheduler.yield() if available, otherwise setTimeout chunking
  const result = await yieldToMain(expensiveComputation, data);
  renderResult(result);
});

// Helper: break work into chunks that yield
async function yieldToMain<T>(fn: () => T, data: unknown): Promise<T> {
  if ("scheduler" in window && "yield" in (window as any).scheduler) {
    await (window as any).scheduler.yield();
  } else {
    await new Promise((r) => setTimeout(r, 0));
  }
  return fn();
}
```

### Cumulative Layout Shift (CLS)

CLS quantifies unexpected layout movement. Target: under 0.1.

```html
<!-- Always set explicit dimensions on images and videos -->
<img src="photo.webp" width="800" height="600" alt="..." />

<!-- Reserve space for ad slots -->
<div class="ad-slot" style="min-height: 250px;">
  <!-- Ad loads here -->
</div>

<!-- Use CSS contain for isolated widgets -->
<style>
  .chat-widget {
    contain: layout style;
  }
</style>
```

## Bundle Analysis

### Identifying Bloat

```bash
# Webpack: generate a stats file and analyze
npx webpack --profile --json > stats.json
npx webpack-bundle-analyzer stats.json

# Vite: built-in analysis via rollup plugin
npm install -D rollup-plugin-visualizer
# Add to vite.config.ts:
# plugins: [visualizer({ open: true, filename: 'dist/stats.html' })]

# Next.js: analyze both client and server bundles
npm install -D @next/bundle-analyzer
```

```typescript
// next.config.js with bundle analyzer
const withAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

module.exports = withAnalyzer({
  // ...your Next.js config
});
```

### Common Bloat Sources

| Package | Typical Size (gzipped) | Lighter Alternative |
|---|---|---|
| moment.js | 72 KB | dayjs (2 KB), date-fns (tree-shakeable) |
| lodash (full) | 25 KB | lodash-es (tree-shakeable) or native methods |
| axios | 13 KB | fetch API (0 KB), ky (3 KB) |
| underscore | 6 KB | native ES2020+ equivalents |

## Code Splitting Strategies

### Route-Based Splitting

```typescript
// React: lazy-load routes
import { lazy, Suspense } from "react";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Settings = lazy(() => import("./pages/Settings"));
const Admin = lazy(() => import("./pages/Admin"));

function App() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Suspense>
  );
}
```

### Component-Based Splitting

```typescript
// Split heavy components that are not above-the-fold
const HeavyChart = lazy(() => import("./components/HeavyChart"));
const RichTextEditor = lazy(() => import("./components/RichTextEditor"));

// Preload on hover for instant feel
function ChartButton({ onClick }: { onClick: () => void }) {
  const preload = () => import("./components/HeavyChart");

  return (
    <button onClick={onClick} onMouseEnter={preload} onFocus={preload}>
      View Chart
    </button>
  );
}
```

### Prefetching with Webpack

```typescript
// Webpack magic comments for prefetch/preload
const Module = lazy(() =>
  import(/* webpackPrefetch: true */ "./modules/Module")
);
```

## Image Optimization

### Format Selection Decision Tree

| Scenario | Recommended Format | Fallback |
|---|---|---|
| Photos, complex images | AVIF | WebP, JPEG |
| Screenshots, UI graphics | WebP | PNG |
| Logos, icons | SVG | -- |
| Animations | Animated WebP/AVIF | GIF |

```html
<!-- Responsive images with format negotiation -->
<picture>
  <source srcset="/hero.avif" type="image/avif" />
  <source srcset="/hero.webp" type="image/webp" />
  <img src="/hero.jpg" alt="Hero" width="1200" height="800" loading="lazy" decoding="async" />
</picture>
```

### Next.js Image Component

```tsx
import Image from "next/image";

// Automatic format negotiation, responsive sizes, lazy loading
<Image
  src="/hero.jpg"
  alt="Hero banner"
  width={1200}
  height={800}
  priority            // above-the-fold only
  placeholder="blur"  // blur placeholder from data URL
  sizes="(max-width: 768px) 100vw, 50vw"
/>
```

## Font Optimization

```html
<!-- Preload critical fonts -->
<link
  rel="preload"
  href="/fonts/Inter-Regular.woff2"
  as="font"
  type="font/woff2"
  crossorigin
/>

<style>
  @font-face {
    font-family: "Inter";
    src: url("/fonts/Inter-Variable.woff2") format("woff2-variations");
    font-weight: 100 900;
    font-display: swap; /* Show fallback immediately, swap when loaded */
  }
</style>
```

### font-display Decision Table

| Value | Behavior | Use When |
|---|---|---|
| `swap` | Brief invisible period, then swap | Body text, most cases |
| `optional` | Short block, then skip loading | Non-critical decorative fonts |
| `fallback` | Short block, swap, then skip | Icons that have fallback |

## JavaScript Performance

### Offloading to Web Workers

```typescript
// main.ts — offload heavy computation
const worker = new Worker(new URL("./heavy.worker.ts", import.meta.url));

worker.postMessage({ data: largeDataSet });
worker.onmessage = (event) => {
  updateUI(event.data.result);
};

// heavy.worker.ts
self.onmessage = (event) => {
  const result = expensiveTransform(event.data.data);
  self.postMessage({ result });
};
```

### requestIdleCallback for Non-Urgent Work

```typescript
// Schedule analytics and non-critical tracking
function scheduleIdleWork(tasks: Array<() => void>) {
  let index = 0;

  function runNext(deadline: IdleDeadline) {
    while (index < tasks.length && deadline.timeRemaining() > 1) {
      tasks[index]();
      index++;
    }
    if (index < tasks.length) {
      requestIdleCallback(runNext, { timeout: 2000 });
    }
  }

  requestIdleCallback(runNext, { timeout: 2000 });
}
```

## CSS Performance

### Critical CSS Extraction

```typescript
// Build-time critical CSS extraction with critters
// next.config.js or webpack config
const Critters = require("critters-webpack-plugin");

module.exports = {
  plugins: [
    new Critters({
      preload: "swap",
      pruneSource: true,
      reduceInlineStyles: true,
    }),
  ],
};
```

### CSS Containment

```css
/* Isolate layout recalculation to specific regions */
.sidebar {
  contain: layout style paint;
}

.card-grid {
  contain: content; /* shorthand for layout paint style */
}

/* content-visibility for offscreen content */
.below-fold-section {
  content-visibility: auto;
  contain-intrinsic-size: auto 500px;
}
```

## Caching Strategies

### Service Worker with Workbox

```typescript
// sw.ts — Workbox-powered service worker
import { precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";

// Precache app shell
precacheAndRoute(self.__WB_MANIFEST);

// Static assets: cache-first with 1 year expiry
registerRoute(
  ({ request }) => request.destination === "image",
  new CacheFirst({
    cacheName: "images",
    plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 365 * 24 * 60 * 60 })],
  })
);

// API responses: stale-while-revalidate
registerRoute(
  ({ url }) => url.pathname.startsWith("/api/"),
  new StaleWhileRevalidate({ cacheName: "api-cache" })
);

// Navigation: network-first for fresh HTML
registerRoute(
  ({ request }) => request.mode === "navigate",
  new NetworkFirst({ cacheName: "pages" })
);
```

### HTTP Cache Headers

```
# Immutable assets (hashed filenames)
Cache-Control: public, max-age=31536000, immutable

# HTML pages — always revalidate
Cache-Control: no-cache

# API responses — short cache with revalidation
Cache-Control: public, max-age=60, stale-while-revalidate=300
```

## React-Specific Performance

### Memoization Decision Tree

| Scenario | Tool | Rationale |
|---|---|---|
| Pure component, stable props | `React.memo` | Skip re-render when props are identical |
| Expensive computation | `useMemo` | Avoid recalculating on every render |
| Callback passed to memoized child | `useCallback` | Prevent child re-render from new ref |
| Simple value derivation | Nothing | Recalculate inline; memo overhead is worse |
| Context that changes often | Split context | Separate stable and changing values |

```tsx
// DO: memoize expensive list filtering
const filteredItems = useMemo(
  () => items.filter((item) => item.matches(query)),
  [items, query]
);

// DO: stabilize callbacks passed to memoized children
const handleDelete = useCallback(
  (id: string) => setItems((prev) => prev.filter((i) => i.id !== id)),
  []
);

// DON'T: memoize trivially cheap computations
// Bad — the useMemo overhead is more than just running it
// const count = useMemo(() => items.length, [items]);
// Good — just compute inline
const count = items.length;
```

### Virtualization for Long Lists

```tsx
import { useVirtualizer } from "@tanstack/react-virtual";

function VirtualList({ items }: { items: string[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 10,
  });

  return (
    <div ref={parentRef} style={{ height: "600px", overflow: "auto" }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}>
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            style={{
              position: "absolute",
              top: 0,
              transform: `translateY(${virtualRow.start}px)`,
              height: `${virtualRow.size}px`,
            }}
          >
            {items[virtualRow.index]}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Next.js-Specific Patterns

### Streaming SSR and Selective Hydration

```tsx
// app/dashboard/page.tsx — use Suspense boundaries for streaming
import { Suspense } from "react";

export default function DashboardPage() {
  return (
    <div>
      <DashboardHeader /> {/* Renders immediately */}
      <Suspense fallback={<ChartSkeleton />}>
        <SlowChartComponent /> {/* Streams in when data is ready */}
      </Suspense>
      <Suspense fallback={<TableSkeleton />}>
        <SlowDataTable /> {/* Streams in independently */}
      </Suspense>
    </div>
  );
}
```

### Parallel Routes for Independent Sections

```
app/
  @analytics/
    page.tsx        # Independent loading/error states
    loading.tsx
  @team/
    page.tsx
    loading.tsx
  layout.tsx        # Composes both slots
```

```tsx
// app/layout.tsx
export default function Layout({
  children,
  analytics,
  team,
}: {
  children: React.ReactNode;
  analytics: React.ReactNode;
  team: React.ReactNode;
}) {
  return (
    <div>
      {children}
      <div className="grid grid-cols-2">
        {analytics}
        {team}
      </div>
    </div>
  );
}
```

## Anti-Patterns

- **Premature optimization everywhere** — Profile first; most performance issues come from a few hot paths, not widespread micro-optimizations.
- **Memoizing everything by default** — `React.memo`, `useMemo`, and `useCallback` each carry overhead. Only use when profiling shows a benefit.
- **Ignoring Lighthouse in CI** — Performance budgets only work if enforced. Use `lighthouse-ci` to fail builds that regress Core Web Vitals.
- **Shipping unoptimized images** — Serving JPEG/PNG when WebP or AVIF is available wastes bandwidth. Always use format negotiation via `<picture>` or framework components.
- **Loading all fonts at once** — Preload only the weights and styles used above the fold; defer the rest with `font-display: swap`.
- **Synchronous blocking in event handlers** — Long tasks block the main thread and destroy INP. Always yield or chunk work that exceeds 50 ms.

## Related Skills

- [[csp-backend-performance]]
- [[csp-db-performance]]
- [[csp-react-patterns]]
- [[csp-nextjs-turbopack]]
- [[csp-monitoring-alerting]]
