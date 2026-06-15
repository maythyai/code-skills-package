---
name: csp-react-version-patterns
description: >
  React version-specific patterns and migration guide. Covers React 18 batching,
  concurrent features, Suspense, and React 19 Server Components, Actions, use() hook.
  Includes migration recipes from class components, Enzyme→RTL, and legacy Context.
  Use when upgrading React versions or adopting version-specific features.
metadata:
  origin: CSP
  source: awesome-copilot/skills/react18-*,react19-*,react-*
  globs: ["**/*.{tsx,jsx}", "**/react*"]
---

# React Version-Specific Patterns & Migration

## When to Use

- Upgrading React 17→18 or 18→19, or adopting version-specific features
- Migrating deprecated APIs: Enzyme, string refs, legacy Context, class lifecycles
- Auditing React codebases for version compatibility or peer dep conflicts

## React 18 vs 19: Key Differences

| Area | React 18 | React 19 |
|---|---|---|
| Root API | `createRoot()` replaces `ReactDOM.render()` | Same |
| Batching | Automatic everywhere | Same |
| String refs | Warn | **Removed** |
| Legacy Context | Warn | **Removed** |
| `forwardRef` | Required | Ref is direct prop — deprecated |
| `defaultProps` (FC) | Works | **Removed** — use ES6 defaults |
| `useRef()` | No-arg allowed | Requires `useRef(null)` |
| `act` import | `react-dom/test-utils` | `react` |
| `Simulate` | Deprecated | **Removed** — use RTL `fireEvent` |
| Server Components | Experimental | **Stable** |
| Actions / `useActionState` | N/A | **New** |
| `use()` hook | N/A | **New** — promises + context |
| Document metadata | N/A | **New** — `<title>`/`<meta>` in components |

## Feature Adoption Matrix

| Feature | Ver | Effort | Adopt When |
|---|---|---|---|
| Automatic Batching | 18 | Zero | Immediate — no code changes |
| `useTransition` | 18 | Low | Search/filter UIs needing responsive input |
| `useDeferredValue` | 18 | Low | Defer expensive re-renders |
| `useId` | 18 | Low | SSR-safe accessibility IDs |
| Server Components | 19 | High | Data-heavy pages, new features |
| Actions + `useActionState` | 19 | Medium | New forms and mutation flows |
| `use()` hook | 19 | Low | Replacing useEffect data fetches |
| `useOptimistic` | 19 | Low | Chat, toggle, optimistic UI |

## Migration Priority

**React 17 → 18.3.1:**
1. `ReactDOM.render()` → `createRoot()`, upgrade deps
2. Audit async class methods for batching regressions
3. Upgrade RTL ≥14.0.0; replace Enzyme (no R18 adapter exists)
4. Migrate UNSAFE_ lifecycle methods

**React 18.3.1 → 19:**
1. Scan deprecated APIs (commands below), migrate string refs + legacy Context
2. Fix tests: `act` import, remove `Simulate`, adjust StrictMode counts
3. Upgrade deps; remove `forwardRef`; replace FC `defaultProps` with ES6 defaults
4. **After stabilization**: adopt Server Components, Actions, `use()`

## Dependency Compatibility

| Package | R18 Min | R19 Min | | Package | R18 Min | R19 Min |
|---|---|---|---|---|---|---|
| `@testing-library/react` | 14.0.0 | 16.0.0 | | `@emotion/react` | 11.10.0 | 11.13.0 |
| `react-redux` | 8.0.0 | 9.0.0 | | `react-router-dom` | v6.0.0 | v6.8.0 |
| `@apollo/client` | 3.8.0 | 3.11.0 | | `@tanstack/react-query` | 4.0.0 | 5.0.0 |

## Audit Scan Commands

```bash
grep -rn 'ref="' src/ --include="*.{js,jsx,tsx}" | grep -v "\.test\."        # string refs
grep -rn "childContextTypes\|getChildContext\|contextTypes" src/              # legacy Context
grep -rn "componentWillMount\|componentWillReceiveProps\|componentWillUpdate" \
  src/ --include="*.{js,jsx,tsx}" | grep -v "UNSAFE_"                         # unsafe lifecycles
grep -rn "react-dom/test-utils" src/ --include="*.{test,spec}.*"              # removed test utils
grep -rn "forwardRef\|\.defaultProps" src/ --include="*.{js,jsx,tsx}"        # R19 deprecated
grep -rn "useTransition\|useDeferredValue\|startTransition" src/              # don't touch during migration
```

## Safety Rules

1. Never use `UNSAFE_` prefix as permanent fix — R19 removes methods entirely
2. Never touch concurrent APIs during migration
3. Migrate Context provider AND all consumers together — partial = runtime failure
4. Measure StrictMode call counts from test output — R19 changes double-invoke behavior
5. Keep `propTypes` — standalone package still works; R19 only drops built-in validation
6. Document every `--legacy-peer-deps` usage

## Reference Files

| File | Contents |
|---|---|
| [react18-patterns.md](reference/react18-patterns.md) | Batching, `useId`, `useTransition`, `useDeferredValue`, Suspense |
| [react19-patterns.md](reference/react19-patterns.md) | Server Components, Actions, `use()`, ref callbacks, metadata |
| [migration-recipes.md](reference/migration-recipes.md) | Enzyme→RTL, Class→Hooks, Legacy Context, String refs, Container/Presentation |
