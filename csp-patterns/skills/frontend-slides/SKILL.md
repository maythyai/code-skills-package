---
name: frontend-slides
description: Create stunning, animation-rich HTML presentations from scratch or by converting PowerPoint files. Use when the user wants to build a presentation, convert a PPT/PPTX to web, or create slides for a talk/pitch. Helps non-designers discover their aesthetic through visual exploration rather than abstract choices.
layer: 4
category: patterns
---

| Slide Type | Content Budget |
|------------|----------------|
| Title | 1 heading + 1 subtitle + optional tagline |
| Content | 1 heading + 4-6 bullets or 2 short paragraphs |
| Feature grid | 6 cards max |
| Code | 8-10 lines max |
| Quote | 1 quote + attribution |
| Image | 1 image constrained by viewport |

## Anti-Patterns

- generic startup gradients with no visual identity
- system-font decks unless intentionally editorial
- long bullet walls
- code blocks that need scrolling
- fixed-height content boxes that break on short screens
- invalid negated CSS functions like `-clamp(...)`

## Related CSP Skills

- `frontend-patterns` for component and interaction patterns around the deck
- `liquid-glass-design` when a presentation intentionally borrows Apple glass aesthetics
- `e2e-testing` if you need automated browser verification for the final deck

## Deliverable Checklist

- presentation runs from a local file in a browser
- every slide fits the viewport without scrolling
- style is distinctive and intentional
- animation is meaningful, not noisy
- reduced motion is respected
- file paths and customization points are explained at handoff
