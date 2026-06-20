---
name: csp-seo-engineering
description: >
  Engineers technical SEO for web applications including meta tags, structured data, sitemaps, Core Web Vitals optimization, and rendering strategy selection for maximum search visibility.
version: 0.1.0
layer: 4
category: patterns
---

# SEO Engineering

Technical SEO implementation patterns for modern web applications, covering structured data, meta tag management, sitemap generation, and rendering strategy optimization.

## When to Activate

- Building a new web application that needs search engine visibility
- Implementing structured data (JSON-LD) for rich search results
- Optimizing Core Web Vitals (LCP, INP, CLS) for ranking signals
- Choosing between SSR, SSG, and ISR for SEO-sensitive pages
- Generating and maintaining sitemaps for large sites
- Managing canonical URLs and hreflang for multi-language sites

## Meta Tags Implementation

### Next.js Metadata API (App Router)

```typescript
import type { Metadata } from "next";

// Static metadata per page
export const metadata: Metadata = {
  title: {
    default: "Acme Dashboard - Project Management",
    template: "%s | Acme Dashboard",
  },
  description:
    "Manage projects, track tasks, and collaborate with your team using Acme Dashboard.",
  openGraph: {
    title: "Acme Dashboard - Project Management",
    description: "Manage projects, track tasks, and collaborate with your team.",
    url: "https://acme.com/dashboard",
    siteName: "Acme",
    images: [
      {
        url: "https://acme.com/og/dashboard.png",
        width: 1200,
        height: 630,
        alt: "Acme Dashboard Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Acme Dashboard",
    description: "Project management for modern teams.",
    images: ["https://acme.com/og/dashboard.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://acme.com/dashboard",
    languages: {
      "en-US": "https://acme.com/en/dashboard",
      "de-DE": "https://acme.com/de/dashboard",
      "ja-JP": "https://acme.com/ja/dashboard",
    },
  },
};

// Dynamic metadata per page
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const post = await getBlogPost(params.slug);
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: [{ url: post.coverImage, width: 1200, height: 630 }],
      type: "article",
      publishedTime: post.publishedAt,
      authors: post.authors,
    },
  };
}
```

### Meta Tag Checklist

| Tag | Required | Purpose |
|-----|----------|---------|
| `<title>` | Always | Primary ranking signal, shown in SERPs |
| `<meta description>` | Always | SERP snippet, affects CTR |
| `og:title` | Social sharing | Facebook/LinkedIn preview title |
| `og:image` | Social sharing | Preview image (1200x630 min) |
| `og:description` | Social sharing | Preview text |
| `twitter:card` | Twitter sharing | Card type (summary_large_image) |
| `canonical` | Always | Prevents duplicate content issues |
| `hreflang` | Multi-language | Language/region targeting |
| `robots` | Conditional | Crawl/index directives |

## Structured Data (JSON-LD)

### Article Schema

```typescript
function articleJsonLd(post: BlogPost) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    image: [post.coverImage],
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: post.authors.map((a) => ({
      "@type": "Person",
      name: a.name,
      url: a.profileUrl,
    })),
    publisher: {
      "@type": "Organization",
      name: "Acme Inc",
      logo: {
        "@type": "ImageObject",
        url: "https://acme.com/logo.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": post.url,
    },
  };
}
```

### Product Schema

```typescript
function productJsonLd(product: Product) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images,
    brand: { "@type": "Brand", name: product.brand },
    sku: product.sku,
    offers: {
      "@type": "Offer",
      url: product.url,
      priceCurrency: product.currency,
      price: product.price,
      availability: product.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
    aggregateRating: product.reviewCount
      ? {
          "@type": "AggregateRating",
          ratingValue: product.avgRating,
          reviewCount: product.reviewCount,
        }
      : undefined,
  };
}
```

### FAQ Schema

```typescript
function faqJsonLd(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}
```

### BreadcrumbList Schema

```typescript
function breadcrumbJsonLd(
  items: { name: string; url: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
```

## Sitemap Generation

### Dynamic Sitemap with Next.js

```typescript
// app/sitemap.ts
import { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://acme.com";

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${baseUrl}/pricing`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  ];

  // Dynamic pages from database
  const posts = await db.posts.findMany({
    select: { slug: true, updatedAt: true },
    where: { published: true },
  });

  const postPages: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: post.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...postPages];
}
```

### Sitemap Index for Large Sites

```typescript
// app/sitemap.xml/route.ts
export async function GET() {
  const sitemaps = [
    { loc: "https://acme.com/sitemap/static.xml", lastmod: new Date().toISOString() },
    { loc: "https://acme.com/sitemap/blog.xml", lastmod: new Date().toISOString() },
    { loc: "https://acme.com/sitemap/products.xml", lastmod: new Date().toISOString() },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps
  .map(
    (s) => `  <sitemap>
    <loc>${s.loc}</loc>
    <lastmod>${s.lastmod}</lastmod>
  </sitemap>`
  )
  .join("\n")}
</sitemapindex>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml" },
  });
}
```

### lastmod Accuracy Rules

| Page Type | lastmod Source | Frequency |
|-----------|---------------|-----------|
| Blog posts | `updatedAt` from database | On every edit |
| Product pages | Last price/description change | On product update |
| Static pages | Last content deployment | On deploy |
| Category pages | Last item added/removed | On collection change |

**Critical**: Only set `lastmod` when content actually changed. Search engines penalize inaccurate lastmod values.

## robots.txt Configuration

```typescript
// app/robots.ts
import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/dashboard/", "/_next/", "/search?"],
      },
      {
        userAgent: "GPTBot",
        disallow: "/", // Block AI crawlers if desired
      },
    ],
    sitemap: "https://acme.com/sitemap.xml",
    host: "https://acme.com",
  };
}
```

## Core Web Vitals Optimization

### Measurement and Targets

| Metric | Good | Needs Improvement | Poor | Optimization Strategy |
|--------|------|-------------------|------|----------------------|
| LCP (Largest Contentful Paint) | < 2.5s | 2.5-4.0s | > 4.0s | Preload hero image, optimize server TTFB |
| INP (Interaction to Next Paint) | < 200ms | 200-500ms | > 500ms | Break up long tasks, use `requestIdleCallback` |
| CLS (Cumulative Layout Shift) | < 0.1 | 0.1-0.25 | > 0.25 | Set explicit image dimensions, reserve ad space |

### LCP Optimization

```typescript
// Preload critical hero image
export default function HomePage() {
  return (
    <>
      <Head>
        <link
          rel="preload"
          href="/hero.webp"
          as="image"
          type="image/webp"
          fetchPriority="high"
        />
      </Head>
      <img
        src="/hero.webp"
        alt="Hero"
        width={1200}
        height={630}
        fetchPriority="high"
        loading="eager"
        style={{ aspectRatio: "1200/630" }}
      />
    </>
  );
}
```

### CLS Prevention

```css
/* Always set explicit dimensions for media */
.article-image {
  aspect-ratio: 16 / 9;
  width: 100%;
  height: auto;
}

/* Reserve space for dynamic content */
.ad-container {
  min-height: 250px;
  contain: layout;
}

/* Font loading: use font-display: swap and preload */
@font-face {
  font-family: "Inter";
  src: url("/fonts/inter-var.woff2") format("woff2");
  font-display: swap;
}
```

### INP Optimization

```typescript
// Break up long-running work
async function processLargeDataset(data: Record<string, unknown>[]) {
  const CHUNK_SIZE = 50;
  const results: unknown[] = [];

  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    const chunk = data.slice(i, i + CHUNK_SIZE);
    results.push(...chunk.map(transform));

    // Yield to main thread between chunks
    if (i + CHUNK_SIZE < data.length) {
      await new Promise((resolve) => requestIdleCallback(resolve));
    }
  }

  return results;
}

// Use startTransition for non-urgent UI updates
import { startTransition } from "react";

function SearchResults({ query }: { query: string }) {
  const [results, setResults] = useState([]);

  useEffect(() => {
    startTransition(async () => {
      const data = await fetchResults(query);
      setResults(data);
    });
  }, [query]);
}
```

## SSR vs SSG vs ISR Decision Matrix

| Rendering | Best For | SEO Impact | Freshness | Complexity |
|-----------|---------|------------|-----------|------------|
| SSG (Static) | Blog posts, docs, landing pages | Best (fastest TTFB) | Stale until rebuild | Low |
| SSR (Server) | Dynamic dashboards, user-specific | Good (full HTML) | Real-time | Medium |
| ISR (Incremental) | Product pages, listings | Great (static + fresh) | Revalidated on interval | Medium |
| CSR (Client) | Authenticated apps, tools | Poor (no initial HTML) | Real-time | Low |

### ISR Implementation

```typescript
// Next.js App Router: ISR with revalidation
export const revalidate = 3600; // Revalidate every hour

export default async function ProductPage({
  params,
}: {
  params: { slug: string };
}) {
  const product = await fetch(
    `https://api.acme.com/products/${params.slug}`,
    { next: { revalidate: 3600 } }
  ).then((r) => r.json());

  return <ProductDetail product={product} />;
}

// On-demand revalidation via webhook
import { revalidatePath, revalidateTag } from "next/cache";

export async function POST(request: Request) {
  const { productSlug } = await request.json();
  revalidatePath(`/products/${productSlug}`);
  revalidateTag("products");
  return Response.json({ revalidated: true });
}
```

## Canonical URL and hreflang Management

```typescript
function buildCanonicalUrl(
  pathname: string,
  searchParams?: Record<string, string>
): string {
  const baseUrl = "https://acme.com";

  // Strip tracking params that create duplicate URLs
  const allowedParams = ["page", "sort", "filter"];
  const cleanParams = new URLSearchParams();

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (allowedParams.includes(key)) {
        cleanParams.set(key, value);
      }
    }
  }

  const queryString = cleanParams.toString();
  return queryString
    ? `${baseUrl}${pathname}?${queryString}`
    : `${baseUrl}${pathname}`;
}

// Hreflang for multi-language sites
interface HreflangConfig {
  defaultLocale: string;
  locales: { code: string; url: string }[];
}

function hreflangTags(config: HreflangConfig, currentPath: string) {
  return {
    alternates: {
      canonical: `${config.locales[0].url}${currentPath}`,
      languages: Object.fromEntries(
        config.locales.map((l) => [l.code, `${l.url}${currentPath}`])
      ),
      // x-default for unmatched locales
      "x-default": `${config.locales[0].url}${currentPath}`,
    },
  };
}
```

## Crawl Budget Optimization

For sites with 10,000+ pages, crawl budget matters:

1. **Internal linking**: Ensure every important page is reachable within 3 clicks from homepage
2. **XML sitemaps**: Keep updated, split into index sitemaps at 50,000 URL limit
3. **Avoid crawl traps**: Block faceted navigation, infinite calendar pages, session IDs
4. **Redirect chains**: Keep to maximum 1 hop (301 directly to final URL)
5. **Page speed**: Faster pages = more pages crawled per budget
6. **Log file analysis**: Monitor which URLs Googlebot actually crawls

```typescript
// Middleware to block crawl traps
import { NextResponse } from "next/server";

export function middleware(request: Request) {
  const url = new URL(request.url);
  const userAgent = request.headers.get("user-agent") ?? "";

  // Block known crawl trap patterns for bots
  if (userAgent.includes("Googlebot") || userAgent.includes("bingbot")) {
    const blockedPatterns = ["/filter?", "/sort?", "/session/", "/print/"];
    if (blockedPatterns.some((p) => url.pathname.includes(p))) {
      return new NextResponse(null, { status: 410 }); // Gone
    }
  }

  return NextResponse.next();
}
```

## Anti-Patterns

- **Rendering SEO-critical pages with client-side JavaScript only** -- search engine crawlers may not execute JavaScript. Use SSR, SSG, or ISR for pages that need indexing.
- **Setting lastmod to the current date on every sitemap update** -- search engines detect this and lose trust in your lastmod signals, potentially ignoring it entirely.
- **Missing canonical tags on paginated or filtered pages** -- without canonicals, each URL variant can be indexed separately, causing duplicate content dilution.
- **Blocking CSS/JS in robots.txt** -- Google needs to render pages to evaluate them. Blocking resources prevents proper rendering assessment.
- **Using `noindex` on pages linked from your main navigation** -- if a page is important enough to link from navigation, it should be indexable. Review your noindex strategy.
- **Ignoring image optimization for LCP** -- the largest contentful paint element is often an image. Serve WebP/AVIF, set explicit dimensions, and use `fetchPriority="high"`.

## Related Skills

- [[csp-frontend-performance]] -- Frontend performance optimization techniques
- [[csp-frontend-patterns]] -- Framework-specific rendering patterns
- [[csp-user-analytics]] -- Measuring SEO impact through organic traffic analytics
- [[csp-content-engine]] -- Content generation and management for SEO
