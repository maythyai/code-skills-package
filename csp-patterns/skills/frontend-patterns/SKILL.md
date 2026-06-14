---
name: frontend-patterns
description: >
  Frontend development patterns for React, Next.js, state management, performance optimization, and UI best practices.
metadata:
  origin: CSP
---

# Frontend Development Patterns

Modern frontend patterns for React, Next.js, and performant user interfaces.

## When to Activate

- Building React components (composition, props, rendering)
- Managing state (useState, useReducer, Zustand, Context)
- Implementing data fetching (SWR, React Query, server components)
- Optimizing performance (memoization, virtualization, code splitting)
- Working with forms (validation, controlled inputs, Zod schemas)
- Handling client-side routing and navigation
- Building accessible, responsive UI patterns

## Core Principles

1. **Composition over inheritance** — Build complex UIs by composing small, focused components
2. **Unidirectional data flow** — State flows down, events flow up
3. **Memoization where needed** — `useMemo`, `useCallback`, `React.memo` for expensive operations
4. **Lazy loading** — Code split heavy components with `lazy()` and `Suspense`
5. **Accessibility first** — Keyboard navigation, focus management, ARIA attributes

## Quick Reference

| Pattern | Description |
|---------|-------------|
| Composition | Build UIs from small, reusable components |
| Compound Components | Context-based component communication |
| Custom Hooks | Extract reusable stateful logic |
| Context + Reducer | Centralized state management |
| Memoization | Optimize expensive renders and computations |
| Code Splitting | Lazy load heavy components |
| Virtualization | Render only visible items in long lists |
| Error Boundaries | Catch and handle render errors gracefully |

## Anti-Patterns

- Prop drilling through many component levels (use Context or composition)
- Mutating state directly (always create new objects)
- Missing dependency arrays in `useEffect`
- Overusing `useMemo`/`useCallback` (premature optimization)
- Ignoring accessibility (keyboard nav, ARIA, focus management)
- Inline styles for complex styling (use CSS modules or styled-components)

**Remember**: Modern frontend patterns enable maintainable, performant user interfaces. Choose patterns that fit your project complexity.

## References

- [references/react-patterns.md](references/react-patterns.md) — Component composition, hooks, state management, performance, forms, error boundaries, accessibility
- [references/vue-patterns.md](references/vue-patterns.md) — Vue.js component patterns (reserved for future expansion)
- [references/css-patterns.md](references/css-patterns.md) — Framer Motion animations and CSS styling approaches
