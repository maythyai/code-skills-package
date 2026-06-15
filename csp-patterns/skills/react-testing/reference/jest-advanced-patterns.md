# Jest Advanced Patterns

> Advanced Jest configuration, mock strategies, async testing, and snapshot best practices.

## Configuration

```ts
const config: Config = {
  testEnvironment: "jsdom",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.test.{ts,tsx}"],
  transform: { "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.test.json" }] },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "\\.(css|less|scss)$": "identity-obj-proxy",
  },
  setupFilesAfterSetup: ["<rootDir>/test/setup.ts"],
  collectCoverageFrom: ["src/**/*.{ts,tsx}", "!src/**/*.d.ts"],
  coverageThresholds: { global: { lines: 80, functions: 80, branches: 70 } },
};
```

Mirror `tsconfig.json` path aliases in `moduleNameMapper`.

## Mock Strategies

### Module Mocks

```ts
jest.mock("@services/api", () => ({ fetchUser: jest.fn() }));
beforeEach(() => jest.clearAllMocks());

test("loads user", async () => {
  (fetchUser as jest.Mock).mockResolvedValue({ id: "1", name: "Alice" });
  render(<UserPage id="1" />);
  expect(await screen.findByText("Alice")).toBeInTheDocument();
});
```

### Surgical Mocks

```ts
const spy = jest.spyOn(utils, "formatCurrency");
render(<PriceDisplay amount={100} />);
expect(spy).toHaveBeenCalledWith(100, "USD");
spy.mockRestore();
```

### Timer Mocks

```ts
jest.useFakeTimers();
userEvent.type(screen.getByRole("textbox"), "hello");
jest.advanceTimersByTime(300);
expect(onChange).toHaveBeenCalledWith("hello");
jest.useRealTimers();
```

### Reset Strategy

- `resetAllMocks()` -- clear calls + reset implementations (isolation default)
- `clearAllMocks()` -- clear calls only
- `restoreAllMocks()` -- restore spied methods

## Async Testing

### Promise Matchers

```ts
await expect(fetchUser("1")).resolves.toEqual({ id: "1", name: "Alice" });
await expect(fetchUser("")).rejects.toThrow("Invalid ID");
```

### waitFor

```ts
await waitFor(() => expect(screen.getByText("Loaded")).toBeInTheDocument(), { timeout: 3000 });
```

Never `setTimeout` + assertion -- use `waitFor`, `findBy*`, or `waitForElementToBeRemoved`.

## Snapshot Best Practices

### When to Use

- Pure data serialization: `expect(formatInvoice(data)).toMatchSnapshot()`
- Generated config output, stable small outputs

### When to Avoid

- Rendered DOM -- breaks on styling changes, tests implementation
- Large objects, timestamps, UUIDs

### Inline Snapshots

```ts
expect(formatCurrency(1234.5)).toMatchInlineSnapshot(`"$1,234.50"`);
```

### Hygiene

1. Review diffs before committing -- do not blindly `--updateSnapshot`
2. Delete orphan snapshots
3. Name descriptively: `it("renders empty state")` not `it("matches snapshot")`

## Custom Matchers

```ts
expect.extend({
  toBeValidEmail(received: string) {
    const pass = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(received);
    return { pass, message: () => `expected "${received}" to be valid` };
  },
});
```

## Performance

- **Selective**: `jest --testPathPattern="auth"`
- **CI sharding**: `jest --shard=1/3`
- **Workers**: `--maxWorkers=50%` in CI
