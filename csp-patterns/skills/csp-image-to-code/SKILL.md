---
name: csp-image-to-code
description: "Convert a screenshot, mockup, Figma export, or design image into faithful, self-contained HTML/CSS. Fidelity tolerances, design-token extraction, and five-state prototypes. Use when the user supplies an image and asks for HTML, a page rebuild, or D2C conversion."
version: 0.1.0
layer: 3
category: patterns
phase: build
domain: patterns
scope: implementation
tools: [Read, Write, Edit, Glob, Grep]
related_skills: [csp-frontend-design, csp-design-system-capture, csp-responsive-design, csp-html-prototype, csp-flow-web, csp-web-artifacts]
role: specialist
---

# Image to Code

Turn a design image into HTML/CSS that a designer would accept side-by-side with the original.
The failure mode of this task is not "wrong code" — it is **quietly averaged code**: roughly right
colours, roughly right spacing, one font, no interaction states. That output looks plausible and
fails review.

## When to Use

- The user provides a screenshot / mockup / Figma export and asks for HTML
- Rebuilding an existing page or component from a reference image
- Producing a high-fidelity clickable prototype from design comps
- Converting a set of design frames into a shared-token component library

## When NOT to Use

- No image, only a written brief → `csp-frontend-design` (design from intent, not from reference)
- The goal is to extract a *design system* document, not a page → `csp-design-system-capture`
- Wireframe-level fidelity is acceptable and speed matters more → `csp-html-prototype`
- The image is a diagram/chart to be reproduced as data viz → `csp-tech-diagram`, `csp-chart`

---

## The Cardinal Rule: One Image at a Time

**Process images serially. Never batch them.**

Batching collapses the per-image analysis step — you start pattern-matching "card grid, header,
CTA" and emit a template. Every image in a batch after the first gets a worse result than it would
alone, and the degradation is invisible until the outputs are compared against their sources.

If there are many images, run the sharded pipeline at the bottom of this skill, which parallelizes
*by image* — each shard still does one image end to end.

---

## Step 1 — Analyse the Image

Write the analysis down before writing any code. An unstated analysis becomes a guess.

| Dimension | What to record |
|---|---|
| **Layout hierarchy** | Outer-to-inner nesting: page → sections → containers → components. Note what is centred, what is full-bleed, what overlaps |
| **Grid system** | Column count, gutter, container max-width. Is it a grid (2D alignment) or a flow (1D)? Where does it break intentionally? |
| **Colours** | Every distinct colour as a **hex value**, grouped by role: background, surface, text primary/secondary, border, accent, semantic (success/warning/error). Note gradients as `type + stops + angle` |
| **Typography** | Font family *names*, and for each text level: size, weight, line-height, letter-spacing, case, colour. Count the distinct levels — usually 4–7 |
| **Spacing** | The scale actually in use (measure: is it 4/8/12/16/24/32, or 6/10/18?). Record padding and gap per container |
| **Shape & depth** | Border radius per element class, border widths and colours, shadow definitions (offset, blur, spread, colour+alpha), any backdrop blur |
| **Components** | Name each recurring component type and list its variants and states visible in the image |
| **Media & icons** | Aspect ratios, whether images are cover/contain, icon style (stroke weight, filled vs. outline) |
| **Responsive intent** | What would collapse at tablet and mobile? Which columns stack, which elements hide? |

### Font resolution

Identify the family by its distinguishing features (x-height, terminal shape, apertures, weight
range). Then:
1. Exact match available as a webfont → use it.
2. Not available → name the **closest** substitute *and* record the substitution in the deviation
   notes. Never silently fall back to a generic sans and call it done.
3. Never use a system-font stack and claim it matches a distinctive display face.

## Step 2 — Structure the HTML

- **Semantic HTML5** first: `header`, `nav`, `main`, `section`, `article`, `aside`, `footer`,
  `figure`, `time`. A `div` soup fails review even when it looks right.
- **BEM** (or the project's existing convention) for class names: `.card`, `.card__media`,
  `.card--featured`. No utility-class-only markup unless the project already uses Tailwind.
- Heading levels follow document structure, not visual size. An `<h3>` styled to look like an
  `<h1>` is correct; an `<h1>` used for body text is not.
- Lists use `ul`/`ol`. Tables use `table` with `th scope`. Buttons are `<button>`, links are `<a>`.
- Images get `alt`; decorative images get `alt=""`.
- Interactive elements are keyboard reachable, in a logical tab order.

## Step 3 — Style It

### Fidelity priority (when something must be approximated)

```
visual structure  >  proportions  >  exact colour  >  typography  >  spacing
```

Structure and proportion carry recognition. Colour is next because a wrong hue reads instantly as
"a different product". Typography and spacing have tolerance.

### Tolerances — measurable, not vibes

| Property | Tolerance | Rule |
|---|---|---|
| **Colour** | **0 — exact hex** | No "close enough". Sample the pixel, use the value. Round only to the nearest token if a token system exists |
| **Spacing** (padding, margin, gap) | **±2 px** | Snap to the discovered scale; if the scale is 8, 22 px becomes 24 |
| **Font size** | **±1 px** | Snap to the type scale |
| **Line-height** | ±0.05 (unitless) | |
| **Letter-spacing** | ±0.005 em | |
| **Border radius** | ±1 px | Except `full`/pill, which must be exact |
| **Border width** | 0 — exact | 1 px and 2 px are visually distinct |
| **Shadow** | match offset/blur within ±2 px and colour alpha within ±0.05 | |
| **Element position** | ±2 px | |

Anything outside tolerance goes in the deviation notes with the reason.

### CSS requirements

1. **Exact colour values**, declared as CSS custom properties in `:root` (or `tokens.css`) with
   **semantic names**: `--color-surface`, `--color-text-muted`, `--color-accent` — not `--blue`,
   not `--color-1`.
2. **The five typography properties** on every text level: `font-size`, `font-weight`,
   `line-height`, `letter-spacing`, `color`. Missing one is the most common source of "looks off".
3. **Spacing from a declared scale.** Define `--space-1 … --space-8` and use them. Hard-coded
   `13px` scattered through the file means the layout cannot be adjusted later.
4. **Shape and depth tokens**: `--radius-sm/md/lg`, `--shadow-1/2/3`.
5. **1D layout with Flexbox, 2D alignment with Grid.** Do not use flex-wrap hacks for a real grid.
6. **Overlays use `position` + a stacking context** (`z-index` from a declared scale), never margins.
7. **Every interactive element has `:hover`, `:focus-visible`, `:active`, and `:disabled`** — even
   when the image shows only the default state. Infer them from the design language.
8. **Transitions** on state changes: 200–350 ms, `ease-out` / `cubic-bezier(0.33, 1, 0.68, 1)`.
   Respect `@media (prefers-reduced-motion: reduce)`.
9. **A real theme layer.** Light/dark pairs defined together where the design implies dark mode.

### Token file shape

```css
:root {
  /* colour */
  --color-bg: #f7f7f5;
  --color-surface: #ffffff;
  --color-text: #141413;
  --color-text-muted: #6b6b66;
  --color-border: #e3e3df;
  --color-accent: #d64f2a;

  /* spacing — 4px base */
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px; --space-4: 16px;
  --space-6: 24px; --space-8: 32px; --space-12: 48px; --space-16: 64px;

  /* type — 1.25 ratio */
  --font-display: "Fraunces", Georgia, serif;
  --font-body: "Inter Tight", system-ui, sans-serif;
  --text-xs: 12px; --text-sm: 14px; --text-base: 16px;
  --text-lg: 20px; --text-xl: 25px; --text-2xl: 31px; --text-3xl: 39px;

  /* shape & depth */
  --radius-sm: 4px; --radius-md: 8px; --radius-lg: 16px; --radius-full: 9999px;
  --shadow-1: 0 1px 2px rgb(0 0 0 / 0.06);
  --shadow-2: 0 4px 12px rgb(0 0 0 / 0.08);

  /* stacking */
  --z-base: 0; --z-sticky: 100; --z-overlay: 200; --z-modal: 300;
}
```

## Step 4 — Verify

1. Render the output and place it beside the source image. Compare region by region, not at a glance.
2. Check every tolerance in the table above. Measure, do not eyeball.
3. Test all four breakpoints (mobile 375, tablet 768, laptop 1280, desktop 1920) if responsive
   behaviour was implied.
4. Exercise every interactive state: hover, focus (keyboard-only, with the mouse untouched),
   active, disabled.
5. Run an accessibility pass: contrast ≥ 4.5:1 for body text and ≥ 3:1 for large text, visible
   focus indicators, readable labels on inputs, meaningful alt text.
6. Write the deviation notes.

### Deviation notes (mandatory)

```markdown
## 还原度偏差说明
| # | 元素 | 原图 | 实现 | 原因 |
|---|---|---|---|---|
| 1 | 标题字体 | Söhne Breit | Inter Tight 700 | 原字体无 webfont 授权，取近似 |
| 2 | 卡片阴影 | 无法从位图精确取样 | 0 4px 12px rgb(0 0 0 / .08) | 位图无法反推 blur/spread，取视觉匹配 |
| 3 | 头像图 | 真实人像 | 占位数据 | 无素材；用逼真 mock 数据代替 |
```

Anything not listed here is a claim of exact fidelity. Do not pad the list with things that match.

---

## High-Fidelity Prototype Mode

When the user asks for a prototype rather than a page rebuild, add:

### Five states, always

Every non-trivial component is delivered in: **normal / empty / error / loading / disabled**.
A prototype that only shows the happy state cannot be evaluated — the empty and error states are
where design decisions actually live.

### Realistic mock data

- **No lorem ipsum.** Use plausible domain content: real-looking names, quantities, dates,
  currencies, error messages.
- Include the awkward cases: a 3-word name and a 40-character name, a 0-item list and a
  100-item list, a price with and without decimals.
- Data lives in one place (a JS object or JSON) so it can be swapped without touching markup.

### Interaction quality

| Requirement | Target |
|---|---|
| Input latency | < 200 ms to first visual feedback |
| Animation | 200–350 ms, `ease-out` family |
| Frame rate | 60 fps — animate `transform`/`opacity` only, never `top`/`left`/`width` |
| Focus | Visible `:focus-visible` ring on every interactive element |
| Keyboard | Every action reachable without a mouse |
| Screen reader | Labels on inputs, `aria-live` on dynamic regions, landmarks present |

### Delivery

Self-contained, offline-openable HTML: inline `<style>` and `<script>`, or one `tokens.css` plus
one file per screen with a relative link. No build step, no CDN dependency for anything required
to render. If a webfont is unavailable offline, the fallback stack must still look intentional.

---

## Sharded Pipeline (Many Images)

When converting a set of frames, do **not** do them in one pass. Shard by image so each gets a
full analysis:

1. **Strip tool-specific noise.** Remove any generator-injected markers, wrapper elements, or
   proprietary attribute prefixes from the exported assets before analysis — they are not part of
   the design.
2. **Extract shared tokens first, once.** Colours, type scale, spacing scale, radii, shadows from
   the *whole* set → one `tokens.css`. Doing this per-shard produces five slightly different
   `--color-text` values.
3. **Shard.** One image (or one tightly-related component family) per shard. Each shard receives:
   the source image, `tokens.css`, and the component inventory from step 2.
4. **Parallel convert.** Each shard runs Steps 1–4 independently, referencing tokens rather than
   redefining them.
5. **Aggregate.** Assemble the shards into the page/app shell, resolve duplicate component
   definitions (same component built twice with different class names), and unify naming.
6. **Final pass.** Cross-screen consistency check: does the same button look the same everywhere?
   Same input height? Same section rhythm? Then the deviation notes for the whole set.

Step 5 is where sharded pipelines fail. Budget real time for aggregation — it is not a
concatenation.

---

## Common Mistakes

| Mistake | Symptom | Fix |
|---|---|---|
| Silently substituting a generic font | Layout proportions shift; looks "AI-generated" | Name the closest real substitute and log it in deviations |
| Approximating colour from memory | Off-brand hue, visible side by side | Sample the pixel; exact hex |
| Losing shadows, borders, gradients | Flat, depthless output | Treat them as tokens, not afterthoughts |
| Unfaithful spacing | Everything slightly wrong, nothing obviously wrong | Snap to the discovered scale, ±2 px |
| Missing interaction states | Static, dead-feeling page | Infer and implement all four states |
| Placeholder data for dynamic content | Cannot evaluate the design with real strings | Realistic mock data in one place |
| Batch-processing multiple images | Later images degrade into a template | Serial per image, or the sharded pipeline |
| Absolute positioning everywhere | Breaks at any other viewport | Flex for 1D, Grid for 2D, `position` only for overlays |
| Hard-coded values instead of tokens | No theme, no dark mode, no adjustment | `:root` custom properties with semantic names |
| Skipping the side-by-side comparison | Confident output that does not match | Render and compare region by region |

## Key Principles

- **Analyse in writing before coding** — an unstated analysis becomes a guess.
- **One image at a time** — batching is the single largest quality killer in this task.
- **Exact colour, tolerated spacing** — the eye forgives 2 px and never forgives a wrong hue.
- **Tokens, not values** — a page built on tokens can be themed; a page built on literals cannot.
- **States are part of the design** — normal/empty/error/loading/disabled, even when the image shows one.
- **Deviations are declared** — an unlisted deviation is a false claim of fidelity.
