# Style 13: Flat Engineering

Light, flat engineering-spec aesthetic — precise, objective, high data-ink ratio.
Resembles technical specification sheets and engineering drawings, NOT marketing pages.

## Hard Rules

- NO drop shadows
- NO gradients
- NO glassmorphism/blur
- NO rounded buttons or cards
- 1px or 2px solid borders for all structure
- White content blocks on light-gray outer background

## Colors

```
Outer background:  #f8fafc  (slate-50)
Canvas:            #ffffff  (white, 2px slate border)
Border:            #cbd5e1  (slate-300)
Text main:         #0f172a  (slate-900)
Text secondary:    #64748b  (slate-500)

Accent (sparingly): BLACK or ONE semantic color per diagram
  e.g. Red #dc2626 for error paths, Green #059669 for success — never both as decoration
```

Accent rule: monochrome base; a single semantic color may mark one category of elements
(error, hot path, deprecated). Multiple decorative colors = anti-pattern.

## Typography

- Headings / labels: sans-serif (`system-ui, -apple-system, 'Segoe UI', sans-serif`)
- Data / paths / code: monospace (`'SF Mono', Monaco, Consolas, monospace`)
- Subtitle in header: uppercase, letter-spacing 0.5px, small size, secondary color

## Layout

- Diagram contained in a bordered canvas box with padding
- Header: title + uppercase subtitle, separated by solid bottom border
- Everything strictly grid/flex aligned; snap to 8px grid; no free-floating elements
- Same-layer nodes aligned horizontally; layers stacked vertically with consistent gaps

## Elements

- Nodes: white fill, 1px slate border, 12–16px padding, 2px radius
- Connectors: thin straight or orthogonal lines; dashed lines for abstract relationships
- Badges: outlined or solid black/gray blocks, monospace 10px, uppercase
- Icons: simple stroke SVGs only (no fill, no complex detail)
- Labels: small monospace or uppercase sans, secondary color

## Background Grid (optional)

A subtle 8px or 16px grid pattern inside the canvas at ~4% opacity slate adds the
engineering-sheet feel without noise.

```xml
<defs>
  <pattern id="engrid" width="16" height="16" patternUnits="userSpaceOnUse">
    <path d="M 16 0 L 0 0 0 16" fill="none" stroke="#cbd5e1" stroke-opacity="0.25" stroke-width="1"/>
  </pattern>
</defs>
```

## Output Rules

- Complete self-contained SVG or HTML document; inline styles only; system fonts only (no CDN)
- Legends for 2+ arrow/line types; each legend entry monospace
- High data-ink ratio: every visual element carries information; remove pure decoration
