# React 19 Patterns Reference

## 1. forwardRef Removal

Ref is now a regular prop:

```jsx
// Before: const Input = forwardRef((props, ref) => <input ref={ref} {...props} />);
// After:
function Input({ ref, ...props }) { return <input ref={ref} {...props} />; }

// With useImperativeHandle:
function FancyInput({ ref, ...props }) {
  const inputRef = useRef(null);
  useImperativeHandle(ref, () => ({ focus: () => inputRef.current.focus() }));
  return <input ref={inputRef} {...props} />;
}
```

---

## 2. defaultProps on Function Components

Use ES6 defaults: `function Button({ label, variant = 'primary' }) { ... }`. Still works on class components.

---

## 3. useRef Requires Explicit Initial Value

`const ref = useRef(null);` (not `useRef()`).

---

## 4. propTypes

No longer validated at runtime. Keep for documentation with comment.

---

## 5. Removed APIs

| API | Replacement |
|---|---|
| `ReactDOM.render` | `createRoot().render()` |
| `ReactDOM.hydrate` | `hydrateRoot()` |
| `unmountComponentAtNode` | `root.unmount()` |
| `ReactDOM.findDOMNode` | Direct ref |
| String refs | `useRef()` / `createRef()` |
| Legacy Context | `createContext()` / `useContext()` |
| `react-dom/test-utils` | RTL equivalents |

---

## 6. Server Components

Run on server, zero bundle size. Use for data fetching, non-interactive content, keeping deps server-only.

```jsx
async function BlogPost({ slug }) {
  const post = await db.posts.findOne({ slug });
  return <article><h1>{post.title}</h1><MarkdownRenderer content={post.body} /></article>;
}
```

Client components marked `'use client'`. **Rules:** No hooks, no browser APIs, no event handlers. Can `await` at top level. Server imports Client, not vice versa.

---

## 7. Actions

### useActionState

```jsx
async function updateProfile(prev, formData) {
  const name = formData.get('name');
  if (!name) return { errors: { name: 'Required' } };
  await api.updateProfile({ name });
  return { success: true, errors: {} };
}

function ProfileForm() {
  const [state, action, isPending] = useActionState(updateProfile, { errors: {} });
  return (
    <form action={action}>
      <input name="name" />
      {state.errors.name && <span>{state.errors.name}</span>}
      <button disabled={isPending}>{isPending ? 'Saving...' : 'Save'}</button>
    </form>
  );
}
```

### useFormStatus

Must be inside `<form>`:

```jsx
function SubmitButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending}>{pending ? 'Submitting...' : 'Submit'}</button>;
}
```

---

## 8. use() Hook

Reads promises (suspends) or context (conditionally):

```jsx
function Comments({ commentsPromise }) {
  const comments = use(commentsPromise);
  return <ul>{comments.map(c => <li key={c.id}>{c.text}</li>)}</ul>;
}
// Wrap in <Suspense>. Can be in if/for/after returns. Not in class components.
```

---

## 9. useOptimistic

```jsx
function MessageList({ messages, onSend }) {
  const [optimistic, addOptimistic] = useOptimistic(messages, (s, msg) => [...s, { text: msg, sending: true }]);
  async function handleSend(formData) {
    addOptimistic(formData.get('message'));
    await onSend(formData.get('message'));
  }
  return (
    <div>
      {optimistic.map((m, i) => <p key={i} style={{ opacity: m.sending ? 0.5 : 1 }}>{m.text}</p>)}
      <form action={handleSend}><input name="message" /></form>
    </div>
  );
}
```

---

## 10. Ref Callbacks with Cleanup

```jsx
<div ref={(node) => {
  if (node) {
    const observer = new ResizeObserver(() => { /* ... */ });
    observer.observe(node);
    return () => observer.disconnect();
  }
}}>{label}</div>
```

---

## 11. Document Metadata

Components render `<title>`, `<meta>`, `<link>`. React hoists to `<head>`:

```jsx
function BlogPost({ post }) {
  return (
    <article>
      <title>{post.title} | My Blog</title>
      <meta name="description" content={post.summary} />
      <h1>{post.title}</h1>
    </article>
  );
}
```

Deduplicated by React. Works with SSR. Replace `react-helmet` on R19.

---

## 12. Test Migration

### act Import

`import { act } from 'react';` (not `react-dom/test-utils`).

### Simulate → fireEvent

`fireEvent.click(button);` (not `Simulate.click(button);`).

### API Map

| Old | Replacement |
|---|---|
| `act` | `import { act } from 'react'` |
| `Simulate.*` | `fireEvent.*` from RTL |
| `renderIntoDocument` | `render` from RTL |
| `findRenderedDOMComponentWithTag` | `getByRole` / `getByTestId` |

### StrictMode Call Counts

```jsx
// R18: expect(mockFn).toHaveBeenCalledTimes(2);  // effects double-invoked
// R19: expect(mockFn).toHaveBeenCalledTimes(1);  // effects run once
// Render-phase: expect(renderSpy).toHaveBeenCalledTimes(2); // unchanged
```

Measure actual counts from test output.
