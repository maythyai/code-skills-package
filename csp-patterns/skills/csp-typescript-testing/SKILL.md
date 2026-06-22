---
name: csp-typescript-testing
description: >
  TypeScript testing best practices for TypeScript 5.x: choosing between Vitest
  and Jest, the Arrange-Act-Assert structure, type-level testing with
  expectTypeOf and tsd, mocking with vi.mock / jest.mock and module mocks,
  async testing, coverage with v8 (c8) or istanbul, and pointers to component
  and E2E testing. Use when writing or improving TypeScript tests, setting up a
  test runner, or asserting on types.
metadata:
  origin: CSP
  globs:
    ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts", "**/*.test.ts", "**/*.spec.ts"]
layer: 4
category: patterns
phase: verify
domain: testing
---

# TypeScript Testing

> This skill provides comprehensive TypeScript testing patterns for
> TypeScript 5.x, covering both runtime behavior and type-level correctness.

## Choosing a Framework: Vitest vs Jest

Both are capable. The decision usually comes down to tooling and speed.

| Concern | Vitest | Jest |
|---|---|---|
| ESM / TS support | Native, zero-config | Needs ts-jest or Babel + ESM config |
| Speed | Very fast (Vite/esbuild, parallel) | Slower, especially with ts-jest |
| Vite/Vitest config reuse | Shares `vite.config.ts` | Separate config |
| Watch mode | Instant HMR-style reruns | Solid but slower |
| API compatibility | Jest-compatible (`describe`/`it`/`expect`) | The de-facto standard |
| Maturity / ecosystem | Newer, fast-growing | Huge, battle-tested |
| Type-level assertions | Built-in `expectTypeOf` | Needs `tsd` / `expect-type` |

**Guidance for 2026 projects:** default to **Vitest** for new TypeScript and
Vite-based projects — native ESM/TS, faster, and built-in type testing. Stay on
**Jest** when an existing codebase, monorepo tooling, or React Native preset is
already standardized on it. The test-authoring API is nearly identical, so most
examples below work in either runner (swap `vi` for `jest`).

### Minimal Vitest setup

```bash
npm i -D vitest @vitest/coverage-v8
```

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true, // describe/it/expect without imports
    environment: "node", // or "jsdom" / "happy-dom" for DOM tests
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      thresholds: { lines: 80, functions: 80, branches: 75 },
    },
  },
});
```

## Test Structure: Arrange-Act-Assert

Keep each test in three clear phases. Name tests by behavior, not implementation.

```typescript
import { describe, it, expect } from "vitest";
import { calculateTotal } from "../src/cart.js";

describe("calculateTotal", () => {
  it("sums line items and applies the discount", () => {
    // Arrange
    const items = [
      { price: 100, qty: 2 },
      { price: 50, qty: 1 },
    ];
    const discount = 0.1;

    // Act
    const total = calculateTotal(items, discount);

    // Assert
    expect(total).toBe(225); // (200 + 50) * 0.9
  });

  it("returns 0 for an empty cart", () => {
    expect(calculateTotal([], 0)).toBe(0);
  });
});
```

### Parameterized tests

```typescript
import { it, expect } from "vitest";
import { isValidEmail } from "../src/validate.js";

it.each([
  ["user@example.com", true],
  ["invalid-email", false],
  ["", false],
  ["user@", false],
])("isValidEmail(%s) -> %s", (input, expected) => {
  expect(isValidEmail(input)).toBe(expected);
});
```

## Type-Level Testing

A unique strength of TypeScript: assert that your **types** are correct, not
just your runtime values. A type test "passes" by compiling without error.

### With Vitest's `expectTypeOf`

```typescript
import { expectTypeOf, it } from "vitest";
import type { Result } from "../src/result.js";

it("Result narrows correctly", () => {
  type R = Result<number, string>;

  expectTypeOf<R>().toMatchTypeOf<
    { ok: true; value: number } | { ok: false; error: string }
  >();

  expectTypeOf(parseNumber("42")).returns.toEqualTypeOf<Result<number, string>>();
});

expectTypeOf<string>().not.toEqualTypeOf<number>();
expectTypeOf({ a: 1 }).toHaveProperty("a");
```

### With `tsd` (standalone, for published libraries)

```typescript
// test-d/index.test-d.ts
import { expectType, expectError } from "tsd";
import { createUser } from "../src/index.js";

expectType<Promise<{ id: string }>>(createUser({ name: "Alice" }));

// Assert that a misuse is a compile error
expectError(createUser({ name: 123 }));
```

```bash
npx tsd   # type-checks the test-d/ files against your published types
```

## Mocking

### Mocking functions and spies

```typescript
import { vi, it, expect } from "vitest";

it("calls the logger once", () => {
  const logger = { info: vi.fn() };
  doWork(logger);
  expect(logger.info).toHaveBeenCalledOnce();
  expect(logger.info).toHaveBeenCalledWith("done");
});

it("spies on an existing method", () => {
  const spy = vi.spyOn(Math, "random").mockReturnValue(0.5);
  expect(rollDice()).toBe(4);
  spy.mockRestore();
});
```

### Module mocks

`vi.mock` (Vitest) and `jest.mock` (Jest) are hoisted to the top of the file,
so they can replace a module before it is imported.

```typescript
import { vi, it, expect, beforeEach } from "vitest";
import { sendWelcome } from "../src/onboarding.js";
import { sendEmail } from "../src/email.js";

vi.mock("../src/email.js", () => ({
  sendEmail: vi.fn().mockResolvedValue({ id: "msg_1" }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

it("sends a welcome email", async () => {
  await sendWelcome("alice@example.com");
  expect(sendEmail).toHaveBeenCalledWith(
    "alice@example.com",
    expect.stringContaining("Welcome"),
  );
});
```

Type-safe access to a mocked function:

```typescript
import { vi } from "vitest";
const mockedSendEmail = vi.mocked(sendEmail); // typed as a Mock
mockedSendEmail.mockResolvedValueOnce({ id: "msg_2" });
```

### Faking timers

```typescript
import { vi, it, expect, afterEach } from "vitest";

afterEach(() => vi.useRealTimers());

it("debounces calls", () => {
  vi.useFakeTimers();
  const fn = vi.fn();
  const debounced = debounce(fn, 200);

  debounced();
  debounced();
  vi.advanceTimersByTime(200);

  expect(fn).toHaveBeenCalledOnce();
});
```

## Async Testing

Always `await` the assertion or return the promise — a forgotten `await` makes
a test pass even when it should fail.

```typescript
import { it, expect } from "vitest";

it("resolves with the user", async () => {
  const user = await fetchUser("1");
  expect(user.name).toBe("Alice");
});

it("rejects on missing user", async () => {
  await expect(fetchUser("999")).rejects.toThrow("Not found");
});

it("resolves to a matching shape", async () => {
  await expect(fetchUser("1")).resolves.toMatchObject({ id: "1" });
});
```

## Coverage

Vitest supports two providers: **v8** (built on the V8/c8 engine — fast, no
instrumentation) and **istanbul** (instrumentation-based, slightly more precise
branch data). Jest uses istanbul via babel.

```bash
# Vitest
npx vitest run --coverage

# v8 provider is the default with @vitest/coverage-v8 installed;
# switch to istanbul with @vitest/coverage-istanbul
```

```typescript
// vitest.config.ts — fail the build below thresholds
export default defineConfig({
  test: {
    coverage: {
      provider: "v8", // or "istanbul"
      reporter: ["text", "lcov"],
      exclude: ["**/*.test.ts", "**/types.ts", "dist/**"],
      thresholds: { lines: 80, branches: 75, functions: 80, statements: 80 },
    },
  },
});
```

Use coverage to find untested branches, not as a goal in itself — 100% line
coverage with weak assertions still hides bugs.

## Testing React Components

For component tests, use **Vitest (or Jest) + React Testing Library** with a
`jsdom`/`happy-dom` environment, querying by accessible role and asserting on
user-visible behavior rather than implementation details.

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Counter } from "../src/Counter.js";

it("increments on click", async () => {
  render(<Counter />);
  await userEvent.click(screen.getByRole("button", { name: /increment/i }));
  expect(screen.getByText("Count: 1")).toBeInTheDocument();
});
```

For the full component testing workflow (providers, hooks, async UI, MSW), see
**csp-react-testing**.

## End-to-End Testing

Unit and component tests do not replace E2E coverage of critical user flows.
Use **Playwright** to drive a real browser across the whole stack:

```typescript
import { test, expect } from "@playwright/test";

test("user can log in", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("alice@example.com");
  await page.getByLabel("Password").fill("secret");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/dashboard");
});
```

For the complete E2E strategy (fixtures, auth state, CI sharding, trace
viewer), see **csp-e2e-testing**.

## Anti-Patterns

| Anti-pattern | Why it hurts | Do instead |
|---|---|---|
| Forgetting `await` on async assertions | Test passes even on failure | `await expect(...).rejects/.resolves` |
| Testing implementation details | Brittle; breaks on refactor | Assert on observable behavior / output |
| Over-mocking (mocking what you test) | Tests pass while code is broken | Mock only external boundaries |
| Shared mutable state between tests | Order-dependent, flaky tests | Reset in `beforeEach`; keep tests isolated |
| Asserting on snapshots of everything | Snapshots rot, get rubber-stamped | Targeted assertions; small focused snapshots |
| `as any` to satisfy mock types | Hides type drift in mocks | `vi.mocked()` / typed mock factories |
| No type tests for a published API | Type regressions ship silently | `expectTypeOf` / `tsd` for the public surface |
| Catching errors just to assert no throw | Swallows real failures | Let it throw, or `expect(fn).not.toThrow()` |

## When to Use This Skill

- Setting up Vitest or Jest in a TypeScript project
- Writing unit tests with strong typing
- Asserting on types with `expectTypeOf` or `tsd`
- Mocking modules, functions, and timers safely
- Testing async code without flakiness
- Configuring and interpreting coverage reports
