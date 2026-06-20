---
name: csp-frontend-patterns
description: >
  Frontend development patterns for state management, performance optimization, accessibility, and UI best practices across frameworks.
metadata:
  origin: CSP
layer: 4
category: patterns
---

| Concept | Why It Matters |
|---------|----------------|
| Composition | Build UIs from small, reusable components |
| Virtualization | Render only visible items in long lists |
| Signals/Stores | Framework-agnostic reactive state management |

## Anti-Patterns

- Mutating state directly (always create new objects)
- Ignoring accessibility (keyboard nav, ARIA, focus management)
- Inline styles for complex styling (use CSS modules or styled-components)

**Remember**: Modern frontend patterns enable maintainable, performant user interfaces. Choose patterns that fit your project complexity.

## References

- **React project?** See [csp-react-patterns](../csp-react-patterns/SKILL.md) for React 18/19 specific patterns: hooks, Suspense, SSR/CSR
- [references/vue-patterns.md](references/vue-patterns.md) — Vue.js component patterns (reserved for future expansion)
- [references/css-patterns.md](references/css-patterns.md) — Framer Motion animations and CSS styling approaches
