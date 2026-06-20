# Advanced UI Patterns

Premium frontend UI craftsmanship, component architecture, and migration audit automation.

## 1. Visual Identity Archetypes

Before writing layout code, commit to a strong visual direction:

| Archetype | Characteristics |
|-----------|----------------|
| Editorial Brutalism | High-contrast monochrome, oversized type, sharp edges, raw grids |
| Organic Fluidity | Soft gradients, deep rounding, glassmorphism, spring physics |
| Cyber/Technical | Dark mode, neon accents, monospace type, staggered reveals |
| Cinematic Pacing | Full-viewport imagery, slow cross-fades, negative space, scroll storytelling |

Avoid generic, unopinionated output. Every CSS choice should reinforce the chosen identity.

## 2. Structural Layers

### Entry Sequence
- Never show a blank screen. Generate a lightweight preloader that resolves fonts, images, and 3D assets.
- Transition the preloader away with a split-door reveal, scale-up zoom, or staggered text sweep.

### Hero Architecture
- Use full-bleed containers (`100vh` / `100dvh`).
- Break headlines into word/character spans for cascading entrance animations.
- Add depth with floating elements or background clipping paths.

### Contextual Navigation
- Sticky headers that react to scroll direction (hide on scroll down, reveal on scroll up).
- Hover states that reveal rich content (mega-menus with image previews).

## 3. Motion Design System

### Scroll-Driven Narratives
- **Pinned containers**: Sections lock into viewport while secondary content flows past.
- **Horizontal journeys**: Translate vertical scroll into horizontal movement for galleries.
- **Parallax mapping**: Assign varying scroll speeds to background, midground, and foreground layers.

### Micro-Interactions
- **Magnetic components**: Calculate distance between cursor and button, pulling the button toward the pointer.
- **Custom cursors**: Follow mouse with lerp interpolation for smooth drag effect.
- **Dimensional hover**: Use `scale`, `rotateX`, `translate3d` for tactile feedback.

## 4. Typography and Visual Texture

- **Scale contrast**: Headlines use `clamp()` up to `12vw`; body copy stays crisp at `16-18px` minimum.
- **Variable fonts**: Prefer premium variable typefaces over system defaults.
- **Atmospheric grain**: CSS/SVG noise overlays (`mix-blend-mode: overlay`, opacity `0.02-0.05`).
- **Frosted glass**: `backdrop-filter: blur(x)` with ultra-thin semi-transparent borders.

## 5. Performance Guardrails

| Rule | Reason |
|------|--------|
| Animate only `transform` and `opacity` | Avoids layout recalculation |
| Apply `will-change: transform` during animation, remove after | Conserves memory |
| Wrap cursor logic in `@media (hover: hover) and (pointer: fine)` | Touch device performance |
| Wrap heavy animations in `@media (prefers-reduced-motion: no-preference)` | Accessibility |

### Recommended Libraries

| Target | Libraries |
|--------|-----------|
| React / Next.js | Framer Motion, Lenis (`@studio-freight/lenis`), React Three Fiber |
| Vanilla / Astro | GSAP, vanilla Lenis, SplitType |

## 6. Container/Presentation Pattern

Separate data/logic from rendering to improve testability and reuse.

### Classification

| Type | Directory | Contains |
|------|-----------|----------|
| `ui` | `src/components/ui/<Name>` | Pure presentation, no state or side effects |
| `features` | `src/components/features/<Name>` | State management, async logic, context updates |

### File Structure

**ui component**:
```
index.tsx
index.module.scss
index.stories.tsx
```

**features component**:
```
index.tsx              # Container: data fetching, state, side effects
use<Name>.tsx          # Custom hook encapsulating logic
presentation.tsx       # Pure presentational component
types.ts               # Shared type definitions
presentation.module.scss
presentation.stories.tsx
```

### Reclassification Rule

If a `ui` component grows to include state management, side effects, async processing, or business logic, reclassify it as `features`. Confirm with the user before proceeding.

## 7. React Audit Grep Patterns

Automated scan commands for React 18.3.1 and React 19 migration audits.

### Base Flags

```bash
# Source files only (exclude tests)
SRC_FLAGS='--include="*.js" --include="*.jsx"'
EXCLUDE_TESTS='grep -v "\.test\.\|\.spec\.\|__tests__"'

# Test files only
TEST_FLAGS='--include="*.test.js" --include="*.test.jsx" --include="*.spec.js" --include="*.spec.jsx"'
```

### Common Flags Reference

| Flag | Purpose |
|------|---------|
| `-r` | Recursive search |
| `-n` | Show line numbers |
| `-l` | Show filenames only (for counting affected files) |
| `--include="*.js"` | Limit to JS/JSX files |
| `2>/dev/null` | Suppress "no files found" errors |

### Usage

- **React 18 audit**: Scan for deprecated APIs, removed APIs, unsafe lifecycle methods, batching vulnerabilities.
- **React 19 audit**: Scan for React 19-specific removals, test file issues, dependency conflicts.
- **Dependency scans**: Check for peer dependency conflicts and version mismatches.

Always use verified grep patterns from reference files rather than relying on memory, especially for multi-line async `setState` patterns which require context flags.

## Related

- [react-patterns SKILL.md](../SKILL.md) -- core React 18/19 patterns
- [frontend-patterns](../../csp-frontend-patterns/SKILL.md) -- cross-framework UI concerns
- [accessibility](../../accessibility/SKILL.md) -- WCAG criteria and pattern libraries
- [react-testing](../../csp-react-testing/SKILL.md) -- component testing with axe
