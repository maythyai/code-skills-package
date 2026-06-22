---
name: csp-frontend-patterns
description: >
  Framework-agnostic frontend patterns for component composition, state management,
  performance, accessibility, forms, and data fetching. Use as the cross-framework
  entry point; React-specific patterns live in csp-react-patterns.
metadata:
  origin: CSP
layer: 4
category: patterns
---

# Frontend Patterns (Framework-Agnostic)

> This is the **framework-agnostic entry point** for frontend work. The patterns
> here apply whether you use React, Vue, Svelte, Solid, Angular, or vanilla JS.
> For React 18/19 specifics (hooks, Suspense, RSC, server actions), jump to
> [csp-react-patterns](../csp-react-patterns/SKILL.md).

## Core Concepts

| Concept | Why It Matters |
|---------|----------------|
| Composition | Build UIs from small, single-responsibility components |
| State colocation | Keep state as close to where it is used as possible |
| Unidirectional data flow | Predictable updates: state → view → event → state |
| Derived state | Compute from source state instead of duplicating it |
| Virtualization | Render only visible items in long lists |
| Code splitting | Ship only the JS a route/feature needs |
| Progressive enhancement | Work without JS, enhance when available |

## Component Composition

Favor composition over configuration. A component that accepts 12 boolean props
is usually three components wearing a trench coat.

- **Slot/children passing** — let parents inject content rather than enumerating
  every variant with props. (`<Card>{children}</Card>` over `<Card variant="x" />`)
- **Compound components** — group related parts that share implicit state
  (`<Tabs>`, `<Tabs.List>`, `<Tabs.Panel>`). Each framework expresses this via its
  context/provide-inject mechanism.
- **Render delegation** — when a parent must hand data to the rendered output, use
  render props (React), scoped slots (Vue), or `let:` bindings (Svelte).
- **Container vs. presentation** — separate data-fetching/stateful containers from
  pure presentational components. Presentational components are trivial to test and
  reuse.

**Rule of thumb:** if you cannot describe a component's job in one sentence without
"and", split it.

## State Management Patterns

Choose the narrowest scope that works. Reaching for a global store on day one is
the most common over-engineering mistake in frontend code.

### Local State

State owned by a single component (form input, toggle, hover). Use the framework
primitive (`useState`, `ref`, `$state`, signals). Never lift it until a sibling
actually needs it.

### Shared/Global State

Cross-cutting concerns: auth/session, theme, feature flags, cart. Options:

| Approach | When |
|----------|------|
| Context/provide-inject | Low-frequency updates, small consumer tree |
| Atom-based (Jotai/Zustand/Nanostores) | Fine-grained subscriptions, avoids re-render cascades |
| Reactive stores (Pinia/Svelte stores/signals) | Framework-native, ergonomic |
| Redux-style reducer | Complex state machines, time-travel debugging, large teams |

**Split contexts by update frequency** — a fast-changing context (notifications)
mixed with a slow one (theme) forces every consumer to re-render on either change.

### Server State

Data that lives on the server and is *cached* on the client (lists, entities,
search results). This is fundamentally different from client state — it can go
stale, needs revalidation, dedup, and retry.

- Use a dedicated cache layer: **TanStack Query**, **SWR**, **RTK Query**, or the
  framework's loader system.
- Do **not** model server data with plain global state — you reinvent caching,
  invalidation, and loading flags badly.
- Key by query inputs so identical requests dedupe automatically.

### URL State

Filters, pagination, selected tab, search query. Put it in the URL (query params)
so the view is shareable, bookmarkable, and back-button friendly.

## Performance Patterns

Measure before optimizing. Most "slow" UIs are slow because of too much state, too
many re-renders, or oversized bundles — not algorithmic cost.

### Code Splitting & Lazy Loading

- Split at **route boundaries** first — the biggest, cheapest win.
- Lazy-load heavy, below-the-fold, or rarely-used widgets (charts, editors, maps).
- Preload on intent (hover/focus of a link) to hide latency.
- Lazy-load images with `loading="lazy"` and reserve space (`width`/`height` or
  `aspect-ratio`) to avoid layout shift.

### Virtualization

For long lists/tables (>~50 non-trivial rows), render only the visible window with
`@tanstack/virtual`, `react-window`, `vue-virtual-scroller`, or equivalent. Provide
stable keys (entity id, never array index).

### Memoization

Cache expensive derived values and stable callbacks — but only when there is a
measured cost. Memoization adds an equality check and memory; on cheap renders it
is net-negative. Memoize when (1) the computation is expensive, **and** (2) inputs
are stable across most renders.

### Avoiding Render Cascades

- Push state down to the smallest subtree that needs it.
- Subscribe to slices of a store, not the whole store.
- Keep object/array identities stable across renders for memoized children.

## Accessibility (a11y)

Accessibility is a correctness requirement, not a finishing touch.

- **Semantic HTML first** — `<button>`, `<a href>`, `<nav>`, `<main>`, `<label>`
  before any `role` attribute. The native element gives you keyboard, focus, and
  screen-reader behavior for free.
- **Keyboard navigation** — every interactive element must be reachable and
  operable with Tab/Enter/Space/Arrow keys. Never trap focus except in modals
  (where you trap it intentionally and restore on close).
- **ARIA only to fill gaps** — `aria-label`, `aria-describedby`, `aria-expanded`,
  `aria-live` for dynamic regions. Wrong ARIA is worse than none.
- **Focus management** — move focus to new content on route change and modal open;
  return focus to the trigger on close.
- **Visible focus indicators** — never `outline: none` without a replacement.
- **Color contrast** — meet WCAG AA (4.5:1 text, 3:1 large text/UI).
- Test with `axe`/`jest-axe` in component tests and tab through with the keyboard.

## Form Handling

- **Controlled vs. uncontrolled** — controlled inputs give instant validation and
  derived UI; uncontrolled inputs (read on submit) are simpler and faster for large
  forms. Mix deliberately.
- **Validate on the right event** — validate on blur or submit, not on every
  keystroke, to avoid yelling at users mid-typing. Re-validate on change once a
  field has errored.
- **Schema validation** — define one schema (Zod/Yup/Valibot) and share it between
  client and server so rules never drift.
- **Surface errors accessibly** — associate messages with inputs via
  `aria-describedby` and mark invalid fields with `aria-invalid`.
- **Disable submit while pending** and show optimistic or pending state; prevent
  double-submits.
- Libraries: React Hook Form, Formik, VeeValidate, Felte, Superforms.

## Data Fetching Patterns

| Need | Approach |
|------|----------|
| Per-request server data | Framework loader / RSC / SSR fetch |
| Client cache + mutations + invalidation | TanStack Query / SWR / RTK Query |
| Real-time updates | WebSocket, Server-Sent Events, or lib subscription API |
| One-off action result | `fetch()` in the event handler |

Principles:

- Avoid the `useEffect` + `fetch` anti-pattern for application data — it has race
  conditions, no cache, no retry, no dedup, and no Suspense integration.
- Handle the full state machine: `idle → loading → success → error`, plus empty
  results. Never render only the happy path.
- Show skeletons for layout-stable loading; debounce search inputs before firing
  requests; cancel stale requests (AbortController).

## Anti-Patterns

| Anti-Pattern | Do Instead |
|--------------|-----------|
| Mutating state in place | Create new objects/arrays; treat state as immutable |
| Global store for everything | Colocate; reserve global for true cross-cutting state |
| Modeling server data as client state | Use a query/cache library |
| `useEffect` + `fetch` for app data | Use a data-fetching library or loader |
| Array index as list key | Use a stable entity id |
| `<div onClick>` for actions | Use `<button>` (keyboard + a11y for free) |
| Premature memoization everywhere | Memoize only measured hotspots |
| Inline styles for complex styling | CSS modules, utility classes, or CSS-in-JS |
| Ignoring loading/error/empty states | Render the full state machine |
| `outline: none` with no replacement | Provide a visible focus style |

**Remember**: Modern frontend patterns enable maintainable, performant, accessible
user interfaces. Pick the narrowest pattern that solves the problem and let
framework-specific skills layer on top.

## References

- **React project?** See [csp-react-patterns](../csp-react-patterns/SKILL.md) for
  React 18/19 specifics: hooks discipline, Suspense, RSC/SSR, server actions.
- [references/css-patterns.md](references/css-patterns.md) — Framer Motion
  animations and CSS styling approaches.
