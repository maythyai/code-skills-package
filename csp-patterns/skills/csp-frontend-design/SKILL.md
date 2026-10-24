---
name: csp-frontend-design
description: "Create distinctive, production-grade frontend interfaces with high design quality. Use when building web components, pages, artifacts, posters, or applications — websites, landing pages, dashboards, React components, HTML/CSS layouts, or styling any web UI."
version: 0.1.0
layer: 3
category: patterns
phase: plan
domain: patterns
scope: design
tools: [Read, Write, Edit, Glob, Grep]
related_skills: []
role: specialist
---

This skill guides creation of distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics. Implement real working code with exceptional attention to aesthetic details and creative choices.

The user provides frontend requirements: a component, page, application, or interface to build. They may include context about the purpose, audience, or technical constraints.

## Design Thinking

Before coding, understand the context and commit to a BOLD aesthetic direction:
- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick an extreme: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian, etc. There are so many flavors to choose from. Use these for inspiration but design one that is true to the aesthetic direction.
- **Constraints**: Technical requirements (framework, performance, accessibility).
- **Differentiation**: What makes this UNFORGETTABLE? What's the one thing someone will remember?

**CRITICAL**: Choose a clear conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work - the key is intentionality, not intensity.

Then implement working code (HTML/CSS/JS, React, Vue, etc.) that is:
- Production-grade and functional
- Visually striking and memorable
- Cohesive with a clear aesthetic point-of-view
- Meticulously refined in every detail

## Frontend Aesthetics Guidelines

Focus on:
- **Typography**: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt instead for distinctive choices that elevate the frontend's aesthetics; unexpected, characterful font choices. Pair a distinctive display font with a refined body font.
- **Color & Theme**: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes.
- **Motion**: Use animations for effects and micro-interactions. Prioritize CSS-only solutions for HTML. Use Motion library for React when available. Focus on high-impact moments: one well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions. Use scroll-triggering and hover states that surprise.
- **Spatial Composition**: Unexpected layouts. Asymmetry. Overlap. Diagonal flow. Grid-breaking elements. Generous negative space OR controlled density.
- **Backgrounds & Visual Details**: Create atmosphere and depth rather than defaulting to solid colors. Add contextual effects and textures that match the overall aesthetic. Apply creative forms like gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows, decorative borders, custom cursors, and grain overlays.

## Design Language Library

When the project has no established design language, select ONE from this library and commit
to it fully. Mixing languages produces incoherent UI.

| Language | Signature Traits | Best For |
|----------|-----------------|----------|
| Material You (M3) | Tonal palettes from seed color, 12–16px radii, filled/tonal buttons, dynamic color | Android-first, personalized consumer apps |
| Fluent 2 | Acrylic translucency, reveal highlight, 4px radii, elevation-based depth | Windows/enterprise, dense productivity |
| Apple HIG | SF fonts, vibrancy, large titles, 10–12px radii, minimal chrome | iOS/macOS, premium consumer |
| Ant Design | 4px base radius, enterprise forms, dense data tables | B2B admin, data-heavy SaaS |
| Carbon (IBM) | 2px radii, Plex type, cool-gray scale, strict grid, technical feel | Developer tools, data platforms |
| Shopify Polaris | Clean commerce patterns, clear status hierarchy | e-commerce admin |
| Atlassian | Friendly blues, badge-based status color system | Dev collaboration tools |
| Neo-Brutalism | 2–3px black borders, hard offset shadows, raw colors, no gradients | Bold brands, dev portfolios, Gen-Z products |
| Neumorphism | Soft extruded shadows matching background | Niche accents only — contrast a11y risk |
| Glassmorphism | Frosted blur, translucent layers, gradient backdrop | Keynote/marketing heroes, not body UI |
| Claymorphism | Chunky soft 3D, inner+outer shadows, playful pastels | Playful/kids products |
| Skeuomorphism | Real-world textures and metaphors | Retro products, specific metaphors |
| Swiss/International | Strict grid, Helvetica, red/black/white, generous whitespace | Editorial, minimal brands |
| Minimalism | Whitespace, single accent, hairline borders | Luxury, docs, developer tools |
| Retro-futurism | Neon, scanlines, monospace type | Gaming, crypto, music |
| Editorial/Magazine | Serif display, drop caps, column layouts | Media, publishing |

Selection rules:
- Match the platform: mobile → HIG/Material; enterprise → Fluent/Ant/Carbon.
- Aesthetic languages with contrast risk (Neumorphism, Glassmorphism) require WCAG AA fallbacks — never rely on blur or shadow alone to separate layers.
- One language per product; per-page experiments are allowed only in explicit exploratory prototypes.

## Design Tokens & Theming

Implement every aesthetic through tokens, never scattered hard-coded values:

- **Semantic naming**: `--bg`, `--surface`, `--text`, `--muted`, `--border`, `--accent`,
  `--danger` (or `primary`/`on-primary`/`canvas`/`ink`). Raw names (`--blue-500`) only inside
  a scale layer, mapped to semantic roles.
- **Light/dark pairs defined together**: every color token gets both modes in one place; no
  theme-scattered hex values.
- **Full state coverage per token**: hover / focus / active / disabled for every interactive token.
- **One focus ring**: a single, consistent `--focus-ring` token across all interactive elements.
- **Scales, not guesses**: spacing on a 4px base; 2–3 radius steps (unless Neo-Brutalism);
  type scale at 1.25 or 1.333 ratio; contrast ≥ 4.5:1 body text, ≥ 3:1 large text.
- **Verify by rendering**: theme tokens only count when they hold up in both modes and all states.

NEVER use generic AI-generated aesthetics like overused font families (Inter, Roboto, Arial, system fonts), cliched color schemes (particularly purple gradients on white backgrounds), predictable layouts and component patterns, and cookie-cutter design that lacks context-specific character.

Interpret creatively and make unexpected choices that feel genuinely designed for the context. No design should be the same. Vary between light and dark themes, different fonts, different aesthetics. NEVER converge on common choices (Space Grotesk, for example) across generations.

**IMPORTANT**: Match implementation complexity to the aesthetic vision. Maximalist designs need elaborate code with extensive animations and effects. Minimalist or refined designs need restraint, precision, and careful attention to spacing, typography, and subtle details. Elegance comes from executing the vision well.

Remember: Claude is capable of extraordinary creative work. Don't hold back, show what can truly be created when thinking outside the box and committing fully to a distinctive vision.
