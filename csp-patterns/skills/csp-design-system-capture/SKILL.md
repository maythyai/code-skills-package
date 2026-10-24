---
name: csp-design-system-capture
description: "Capture or update a design system from existing UI evidence: Figma variables, Tailwind config, CSS variables, screenshots, DOM/computed styles. Generates or refines DESIGN.md with confidence labels, reconciles source-of-truth conflicts, and identifies token/component drift."
version: 0.1.0
layer: 3
category: patterns
phase: review
domain: patterns
scope: design
tools: [Read, Write, Edit, Glob, Grep]
related_skills:
  - csp-board
  - csp-brief
  - csp-frontend-design
  - csp-responsive-design
  - csp-design-hub
role: specialist
---

# Design System Capture

Extract a reusable design system from product evidence. This is discovery, reconciliation,
and documentation — not inventing arbitrary visual style.

**Read-only by default.** Do not create or modify files (including `DESIGN.md`) unless the user
explicitly asks to "write / create / generate / update the file". In capture mode, output the
proposed DESIGN.md inline in the report and ask before writing.

## When to Use

- Create or update `DESIGN.md` from existing product UI
- Infer design tokens from Tailwind config, CSS variables, Figma Variables, components, screenshots, or Storybook
- Reconcile Figma tokens with code tokens (drift detection)
- Document a legacy UI before refactoring
- Prepare a product for design QA automation

## Source Priority

Use this priority unless the user states a different source of truth:

1. Explicit current design-system docs and designer-approved tokens
2. Figma Variables or token exports
3. Shared component library and theme implementation
4. Repeated patterns in production screens
5. One-off page styles
6. Screenshots without source metadata

When sources conflict, do NOT silently merge. Report the conflict and propose a decision.

## Capture Workflow

1. **Inventory sources** — list design docs, token files, CSS variables, Tailwind theme,
   components, stories, screenshots. Mark each as `authoritative / supporting / inferred / stale`.

2. **Extract candidate tokens**
   - Colors: surfaces, text, border, brand, semantic states (error/success/warning), chart/data colors
   - Typography: font families, sizes, line heights, weights, letter spacing, use cases
   - Spacing/layout: scale, containers, grids, gutters, section rhythm
   - Shape: radii by component size and hierarchy
   - Elevation: shadows, overlays, borders, blur, stacking
   - Motion: duration, easing, reduced-motion expectations

3. **Extract component patterns** — button, input, select, checkbox, radio, switch, card,
   dialog, popover, table, list, tabs, menu, alert, toast, badge, avatar, nav. For each:
   variants, sizes, states, accessibility expectations, implementation entry point.

4. **Deduplicate raw values** — cluster near-identical colors/sizes; prefer existing token
   names over invented ones; promote raw values to semantic roles only when usage evidence
   supports the role.

5. **Score confidence** — label every rule:
   - `confirmed`: backed by authoritative docs/tokens or repeated component usage
   - `likely`: repeated across surfaces but not formally documented
   - `tentative`: observed once or ambiguous
   - `conflict`: sources disagree

6. **Draft or update `DESIGN.md`** — tokens + rationale; confirmed vs inferred sections;
   Do/Don't rules that prevent future AI implementation mistakes; open decisions marked
   `needs-design-decision` instead of invented policy.

7. **Create drift-prevention rules** — lint rules, component-alignment checks, design-debt
   scans, Storybook coverage, visual baselines, token-export sync.

## DESIGN.md Frontmatter Schema

Frontmatter is the machine-readable design system. Standard top-level keys:

`version` · `name` · `description` · `colors` · `typography` · `rounded` · `spacing` · `components`

Minimum useful frontmatter for a small app:
- `colors`: 8–16 semantic roles when evidence exists, including literal `primary` and
  `on-primary`, text/ink, canvas/surface, border/hairline, muted text, and semantic
  error/success/warning roles. No brand hue? Alias `primary` to the main action color and
  explain in prose.
- `typography`: 6–12 named levels (`display-lg`, `heading-md`, `body-md`, `body-sm`,
  `caption`, `button-md`, `code-md`). Each level: `fontFamily`, `fontSize`, `fontWeight`,
  `lineHeight`, `letterSpacing` (a dimension like `0px`, never bare `0`).
- `rounded`: 4–8 scale entries (`none`, `xs`, `sm`, `md`, `lg`, `xl`, `full`); `none: 0px`.
- `spacing`: 6–10 scale entries (`xxs`, `xs`, `sm`, `md`, `lg`, `xl`, `xxl`, `section`).
- `components`: 8–20 entries for the real component surface, states as separate keys
  (`button-primary`, `button-primary-hover`, `button-primary-disabled`, `text-input`,
  `text-input-focused`, `table-row-selected`, `badge-error`).

Component entries reference tokens with `{path.to.token}` and use only these sub-tokens in
frontmatter: `backgroundColor`, `textColor`, `typography`, `rounded`, `padding`, `size`,
`height`, `width`. Extra details (border, shadow, gap, cursor, outline, overflow) go in the
markdown `## Components` section, not frontmatter.

```yaml
---
version: alpha
name: product-design-system
description: Design-system summary covering product feel, source coverage, key tokens, component families, known constraints.
colors:
  primary: "#000000"
  on-primary: "#ffffff"
  ink: "#111827"
  muted: "#6b7280"
  canvas: "#ffffff"
  surface-card: "#f9fafb"
  hairline: "#e5e7eb"
  danger: "#dc2626"
typography:
  display-lg:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: 48px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.02em
  body-md:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0px
  button-md:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: 0px
rounded:
  none: 0px
  sm: 6px
  md: 8px
  lg: 12px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  section: 64px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button-md}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
    height: 40px
  button-primary-disabled:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button-md}"
    rounded: "{rounded.md}"
  text-input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
---
```

Markdown body requirements:
- Stable `##` sections in order: Overview, Colors, Typography, Layout, Elevation & Depth,
  Shapes, Components, Do's and Don'ts, Responsive Behavior, Known Gaps.
- State requirements in `## Components` using component-token names from frontmatter.
- Unresolved issues in `## Known Gaps` / `## Open Decisions`, marked `needs-design-decision`.
- Token references in prose as `{colors.primary}`, `{typography.body-md}`, `{rounded.md}`,
  `{components.button-primary}` so readers can connect prose back to frontmatter.

## Naming Guidance

Semantic token names preferred:
- Good: `primary`, `primaryForeground`, `surface`, `surfaceElevated`, `mutedForeground`,
  `borderSubtle`, `danger`, `success`
- Weak: `blue500`, `gray100`, `color1`, `buttonColor`

Raw scale names only when part of an implementation scale, mapped to semantic roles in prose.

## Conflict Handling

```markdown
### Conflict: primary button radius
- Figma variable: 12px
- Tailwind theme: 8px
- Button component: 10px hard-coded
- Production screenshots: mostly 8px
- Recommendation: choose 8px if implementation is source of truth; update Button/theme to 12px if Figma is authoritative.
- Decision needed from: design owner
```

## Output Format (read-only capture mode)

```markdown
# Design System Capture Summary

## Sources Inspected
| Source | Status | Confidence | Notes |

## Confirmed Design Rules
## Inferred Patterns
## Token Candidates
## Component Candidates
## Conflicts and Open Decisions
## Proposed DESIGN.md Changes
(complete frontmatter + body, inline — not written to disk)

## Drift Prevention Rules
## Next Design QA Setup
- [ ] Update DESIGN.md
- [ ] Add component stories/snapshots
- [ ] Add token/debt scans to CI
```

## Key Principles

- **Evidence over taste**: capture what exists; never invent "better" tokens while documenting.
- **Confidence labels everywhere**: `confirmed / likely / tentative / conflict` on every rule.
- **Conflicts visible**: never silently merge Figma/code/component differences.
- **Agent safety**: output rules that prevent future AI-generated drift (Do/Don't).
- **Semantic over raw**: raw values become semantic roles only with usage evidence.

## Anti-Patterns

| Anti-Pattern | Symptom | Correct Approach |
|-------------|---------|------------------|
| Invented tokens | "I'll standardize to a nicer palette" while capturing | Document reality first; propose changes separately |
| Silent merging | Figma 12px vs code 8px recorded as one value | Report conflict + recommendation + decision owner |
| Confidence inflation | One-off style recorded as confirmed rule | tentative unless repeated or documented |
| Raw-value dumping | DESIGN.md full of `blue500`-style names | Semantic roles with usage evidence |
| Write without consent | Capture mode writes DESIGN.md to disk | Read-only by default; write only on explicit request |
