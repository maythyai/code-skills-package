# Migration Recipes

## 1. Enzyme to React Testing Library

Enzyme has no React 18+ adapter. All tests must be rewritten using RTL.

**Philosophy shift:** Enzyme tests implementation details. RTL tests user-visible behavior. No 1:1 API translation — rewrite the test intent.

```jsx
// Enzyme: expect(wrapper.state('count')).toBe(3);
// RTL: expect(screen.getByText('Count: 3')).toBeInTheDocument();
```

### Core Template

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

it('submits the form', async () => {
  render(<MyComponent onSubmit={mockFn} />);
  await userEvent.setup().type(screen.getByRole('textbox', { name: /name/i }), 'Alice');
  await userEvent.setup().click(screen.getByRole('button', { name: /submit/i }));
  expect(mockFn).toHaveBeenCalledWith({ name: 'Alice' });
});
```

### API Mapping

| Enzyme | RTL |
|---|---|
| `shallow()` / `mount()` | `render()` |
| `wrapper.find('.btn')` | `screen.getByRole('button')` |
| `wrapper.simulate('click')` | `fireEvent.click()` / `userEvent.click()` |
| `wrapper.prop('disabled')` | `expect(el).toBeDisabled()` |
| `wrapper.state('count')` | Assert visible: `screen.getByText('Count: 3')` |
| `wrapper.instance().method()` | Remove — test behavior, not methods |
| `wrapper.setProps({ x: 1 })` | `rerender(<C x={1} />)` |

**Query priority:** `getByRole` → `getByLabelText` → `getByText` → `getByTestId` (last resort).

### Providers

```jsx
function customRender(ui, options = {}) {
  return render(<ThemeProvider><AuthProvider>{ui}</AuthProvider></ThemeProvider>, options);
}
export { customRender as render };
```

### Async

```jsx
await waitFor(() => expect(screen.getByText('Loaded!')).toBeInTheDocument());
const item = await screen.findByText('Async Item'); // getBy + waitFor
```

---

## 2. Class Components to Hooks

### componentWillMount

| What it does | Move to |
|---|---|
| Sets initial state | Constructor / `useState` initial |
| Side effect | `componentDidMount` / `useEffect` |
| Derives state from props | Constructor with props |

### componentWillReceiveProps

| What it does | Move to |
|---|---|
| Side effect on prop change | `componentDidUpdate` / `useEffect` with deps |
| Pure state derivation | `getDerivedStateFromProps` / `useMemo` |

**Trap:** `getDerivedStateFromProps` runs every render. Compare prev props:

```jsx
static getDerivedStateFromProps(nextProps, prevState) {
  if (nextProps.userId !== prevState.prevUserId) {
    return { userData: null, prevUserId: nextProps.userId };
  }
  return null;
}
```

### componentWillUpdate

| What it does | Move to |
|---|---|
| Reads DOM before update | `getSnapshotBeforeUpdate` |
| Cancels requests | `componentDidUpdate` with prev comparison |

### Full Conversion

```jsx
// Before:
class UserProfile extends React.Component {
  state = { user: null, loading: true };
  async componentDidMount() {
    const user = await fetchUser(this.props.userId);
    this.setState({ user, loading: false });
  }
  async componentDidUpdate(prevProps) {
    if (prevProps.userId !== this.props.userId) {
      this.setState({ loading: true });
      const user = await fetchUser(this.props.userId);
      this.setState({ user, loading: false });
    }
  }
  render() { return this.state.loading ? <Spinner /> : <div>{this.state.user.name}</div>; }
}

// After:
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchUser(userId).then(u => { if (!cancelled) { setUser(u); setLoading(false); } });
    return () => { cancelled = true; };
  }, [userId]);
  return loading ? <Spinner /> : <div>{user.name}</div>;
}
```

**UNSAFE_ prefix:** Never permanent fix. React 19 removes these entirely. Mark with TODO.

---

## 3. Legacy Context to Modern Context

Legacy context removed in React 19. Always cross-file migration — provider AND all consumers must update together.

### Steps

1. Find provider (`childContextTypes` + `getChildContext`)
2. Find ALL consumers (`contextTypes`)
3. Create context file
4. Update provider and each consumer
5. Verify — no warnings remain

```bash
grep -rn "childContextTypes\|getChildContext\|contextTypes" src/ --include="*.{js,jsx,tsx}"
```

### Before and After

```jsx
// BEFORE:
class ThemeProvider extends React.Component {
  static childContextTypes = { theme: PropTypes.string };
  getChildContext() { return { theme: this.state.theme }; }
  render() { return this.props.children; }
}
class ThemedButton extends React.Component {
  static contextTypes = { theme: PropTypes.string };
  render() { return <button className={this.context.theme}>Click</button>; }
}

// AFTER:
// ThemeContext.js
export const ThemeContext = createContext('light');
export const useTheme = () => useContext(ThemeContext);

// Provider
function ThemeProvider({ children }) {
  const [theme] = useState('dark');
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

// Function consumer
function ThemedButton() {
  const theme = useTheme();
  return <button className={theme}>Click</button>;
}

// Class consumer
class ThemedButton extends React.Component {
  static contextType = ThemeContext;
  render() { return <button className={this.context}>Click</button>; }
}
```

**Critical:** Missing any consumer causes runtime failure (reads `undefined`).

---

## 4. String Refs to createRef / useRef

String refs removed in React 19.

### Migration Rule

1. Add `refName = React.createRef()` (class) or `const refName = useRef(null)` (function)
2. Replace `ref="refName"` with `ref={this.refName}` / `ref={refName}`
3. Replace `this.refs.refName` with `this.refName.current` / `refName.current`

### Examples

```jsx
// Before:
class Form extends React.Component {
  focusInput() { this.refs.myInput.focus(); }
  render() { return <input ref="myInput" />; }
}

// After (class):
class Form extends React.Component {
  myInput = React.createRef();
  focusInput() { this.myInput.current.focus(); }
  render() { return <input ref={this.myInput} />; }
}

// After (function):
function Form() {
  const myInput = useRef(null);
  return <input ref={myInput} />;
}
```

### Multiple Refs

```jsx
class MultiRef extends React.Component {
  firstName = React.createRef();
  lastName = React.createRef();
  render() { return <div><input ref={this.firstName} /><input ref={this.lastName} /></div>; }
}
```

### Refs in Lists

```jsx
class ItemList extends React.Component {
  itemRefs = {};
  render() {
    return this.props.items.map(item => (
      <div ref={el => { this.itemRefs[item.id] = el; }} key={item.id}>{item.name}</div>
    ));
  }
}
```

```bash
grep -rn 'ref="' src/ --include="*.{js,jsx,tsx}" | grep -v "\.test\."
grep -rn "this\.refs\." src/ --include="*.{js,jsx,tsx}" | grep -v "\.test\."
```

---

## 5. Container / Presentation Pattern

Separate data/logic (container) from rendering (presentation).

### Structure

```
features/UserProfile/
  index.tsx          ← Container (state, effects)
  presentation.tsx   ← Presentation (pure render)
  useUserProfile.ts  ← Custom hook
  types.ts

ui/Button/
  index.tsx          ← Pure UI (no state, no effects)
```

### Container

```tsx
export function UserProfile({ userId }: { userId: string }) {
  const { user, loading, error, onRefresh } = useUserProfile(userId);
  return <UserProfilePresentation user={user} loading={loading} error={error} onRefresh={onRefresh} />;
}
```

### Presentation

```tsx
export function UserProfilePresentation({ user, loading, error, onRefresh }: UserProfileProps) {
  if (loading) return <Skeleton />;
  if (error) return <ErrorBanner message={error} />;
  return <div><h1>{user.name}</h1><button onClick={onRefresh}>Refresh</button></div>;
}
```

**Classification:** `ui` = pure render, no state/effects/async. `features` = has state, effects, async, context. Reclassify `ui` to `features` if it grows state.

---

## 6. Premium Frontend UI Principles

### Performance

- Only animate `transform` and `opacity` — never `width`, `height`, `top`, `margin`
- Apply `will-change: transform` on active animations, remove after
- Wrap in `@media (prefers-reduced-motion: no-preference)` and `@media (hover: hover)`

### Architecture

- **Entry sequence**: preloader with fluid exit animation
- **Hero**: full-viewport (`100dvh`), character-level entrances
- **Scroll-driven**: pinned containers, horizontal scroll, parallax
- **Micro-interactions**: magnetic buttons, dimensional hover (`scale`, `rotateX`, `translate3d`)

### Libraries

- **Framer Motion** for layout transitions
- **Lenis** for smooth scroll
- **React Three Fiber** for WebGL/3D
- **GSAP ScrollTrigger** for scroll animations

### Typography

- `clamp(2rem, 5vw, 6rem)` for fluid scales
- Variable fonts over system defaults
- CSS noise overlays (`mix-blend-mode: overlay`, opacity 0.02–0.05)
- `backdrop-filter: blur()` with thin borders for glassmorphism
