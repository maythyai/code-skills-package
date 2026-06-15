# React 18 Patterns Reference

## 1. createRoot — New Root API

React 18 replaces `ReactDOM.render` with `createRoot` for concurrent features:

```jsx
import { createRoot } from 'react-dom/client';
const root = createRoot(document.getElementById('root'));
root.render(<App />);
root.unmount();

// Hydration:
import { hydrateRoot } from 'react-dom/client';
hydrateRoot(document.getElementById('root'), <App />);
```

---

## 2. Automatic Batching

React 18 batches all `setState` calls automatically — inside `setTimeout`, promises, `async/await`, and native event listeners. React 17 only batched within React event handlers.

| Location of setState | React 17 | React 18+ |
|---|---|---|
| React event handler | Batched | Batched (unchanged) |
| `setTimeout` / `setInterval` | Immediate re-render | **Batched** |
| `Promise.then()` / `.catch()` | Immediate re-render | **Batched** |
| `async` / `await` | Immediate re-render | **Batched** |
| Native `addEventListener` | Immediate re-render | **Batched** |

### Diagnosing Batching Bugs

**Decision tree:** Does code read `this.state` after `await`?
- **YES** → Silent state-read bug. Refactor to pass values explicitly.
- **NO, but user must see intermediate UI?** → Use `flushSync` (sparingly).
- **NO** → Safe, no changes needed.

```jsx
// BUG — this.state.count is stale after await (batched):
async handleClick() {
  this.setState({ count: this.state.count + 1 });
  await fetchData();
  if (this.state.count > 5) { this.setState({ showBanner: true }); } // reads old state!
}

// FIX — pass value explicitly:
async handleClick() {
  const newCount = this.state.count + 1;
  this.setState({ count: newCount });
  await fetchData();
  if (newCount > 5) { this.setState({ showBanner: true }); }
}
```

### flushSync (Use Sparingly)

Only when user must see intermediate state (spinners before async, wizard steps):

```jsx
import { flushSync } from 'react-dom';
flushSync(() => { this.setState({ step: 'validating' }); });
await validateForm();
flushSync(() => { this.setState({ step: 'submitting' }); });
```

Never as a default fix — bypasses concurrent scheduler, negates R18 performance gains.

---

## 3. useId — SSR-Safe Unique IDs

```jsx
function PasswordField() {
  const id = useId();
  return (
    <div>
      <label htmlFor={id}>Password</label>
      <input id={id} type="password" aria-describedby={`${id}-hint`} />
      <p id={`${id}-hint`}>Must be at least 8 characters.</p>
    </div>
  );
}
```

Do not use for list keys. Returns strings like `:r0:` — escape before using as CSS selectors.

---

## 4. useTransition — Mark Non-Urgent Updates

```jsx
function SearchResults() {
  const [isPending, startTransition] = useTransition();
  const [input, setInput] = useState('');
  const [results, setResults] = useState([]);

  function handleChange(e) {
    setInput(e.target.value);  // urgent
    startTransition(() => {
      setResults(filterExpensive(e.target.value));  // non-urgent
    });
  }

  return (
    <div>
      <input value={input} onChange={handleChange} />
      {isPending ? <Spinner /> : <ResultList items={results} />}
    </div>
  );
}
```

Use for filtering large lists, switching heavy tabs. Do NOT use for text input values or simple toggles.

---

## 5. useDeferredValue — Defer Expensive Renders

```jsx
function SearchPage({ query }) {
  const deferredQuery = useDeferredValue(query);
  const results = useMemo(() => expensiveSearch(deferredQuery), [deferredQuery]);

  return (
    <div>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      <ResultList items={results} />  {/* lags during fast typing */}
    </div>
  );
}
```

**useTransition vs useDeferredValue:** Use `useTransition` when you own the state update. Use `useDeferredValue` when you receive the value as a prop and want to defer downstream effects.

---

## 6. Suspense Improvements

### Code Splitting (Unchanged R18→R19)

```jsx
const LazyDashboard = React.lazy(() => import('./Dashboard'));
<Suspense fallback={<PageSkeleton />}>
  <LazyDashboard />
</Suspense>
```

### Nested Suspense

```jsx
<Suspense fallback={<FullPageLoader />}>
  <Layout>
    <Suspense fallback={<SidebarSkeleton />}>
      <Sidebar />
    </Suspense>
    <Suspense fallback={<ContentSkeleton />}>
      <MainContent />
    </Suspense>
  </Layout>
</Suspense>
```

### Suspense + startTransition for Navigation

```jsx
function Navigation() {
  const [isPending, startTransition] = useTransition();
  const [page, setPage] = useState('home');

  return (
    <div>
      <button onClick={() => startTransition(() => setPage('settings'))}>Settings</button>
      {isPending && <LoadingBar />}
      <Suspense fallback={<PageSkeleton />}>
        {page === 'home' ? <Home /> : <Settings />}
      </Suspense>
    </div>
  );
}
```

---

## 7. Concurrent Mode Safety in Class Components

React 18 concurrent features are opt-in via `createRoot`. Class components work unchanged, but some patterns are fragile:

**Unsafe (audit before R19):**
- `findDOMNode()` — removed in R19
- Reading `this.state` after async (batching bug)
- External stores without `useSyncExternalStore` — may tear
- `componentWillMount` / `componentWillReceiveProps` / `componentWillUpdate`

**Safe:**
- `componentDidMount`, `componentDidUpdate`, `componentWillUnmount`
- `getDerivedStateFromProps`, `getSnapshotBeforeUpdate`
- `React.createRef()`, callback refs, `React.memo`

---

## 8. StrictMode Behavior

React 18 StrictMode double-invokes (dev only): render functions, `useState`/`useReducer` initializers, `useEffect` (mount→unmount→mount).

```jsx
// R18 StrictMode: effect runs twice
expect(mockEffect).toHaveBeenCalledTimes(2);
// R19 StrictMode: effect runs once (changed!)
expect(mockEffect).toHaveBeenCalledTimes(1);
// Render-phase calls: still double-invoked in both R18 and R19
expect(renderSpy).toHaveBeenCalledTimes(2);
```
