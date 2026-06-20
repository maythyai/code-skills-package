---
name: csp-mock-strategies
description: >
  Design and implement test doubles, API mocks, and fixture management across unit,
  integration, and E2E testing layers. Use when setting up MSW handlers, deciding
  between mock types, implementing contract tests, or building type-safe mock helpers.
version: 0.1.0
layer: 4
category: patterns
---

# Test Double and Mocking Strategies

Patterns for choosing, implementing, and managing test doubles across testing layers — from unit test stubs to full contract testing with external services.

## When to Activate

- Deciding what type of test double to use for a given testing scenario
- Setting up Mock Service Worker (MSW) handlers for API mocking
- Implementing contract tests between microservices
- Building type-safe mock factories for TypeScript projects
- Managing test fixtures and shared mock data
- Configuring integration test environments with real dependencies via Docker

## Test Double Taxonomy

| Type | Definition | Use When | Example |
|---|---|---|---|
| **Dummy** | Passed around but never used | Satisfying parameter requirements | A `User` object passed to a function that only uses the ID |
| **Stub** | Returns predetermined values | Providing indirect inputs to the SUT | A `getUser()` that always returns `{ role: "admin" }` |
| **Spy** | Records how it was called | Verifying indirect outputs | Checking that `sendEmail()` was called with specific args |
| **Mock** | Pre-programmed with expectations | Verifying exact call sequences | Expecting `log.error()` to be called exactly once |
| **Fake** | Working implementation, simplified | Replacing slow or external dependencies | In-memory database, fake message queue |

### Decision Flow

```
Need a test double?
  |
  ├─ Just need to fill a parameter? → Dummy
  |
  ├─ Need to control what the SUT reads? → Stub
  |    └─ "When X is called, return Y"
  |
  ├─ Need to verify the SUT wrote/triggered something? → Spy
  |    └─ "Verify that X was called with Y"
  |
  ├─ Need to verify exact call order or count? → Mock
  |    └─ "X must be called exactly once with Y, then Z"
  |
  └─ Need a real implementation for integration testing? → Fake
       └─ In-memory DB, fake SMTP server, in-process queue
```

## MSW (Mock Service Worker)

### Setup

```bash
npm install --save-dev msw
npx msw init public/  # for browser tests
```

### Handler Organization

```typescript
// mocks/handlers/auth.ts
import { http, HttpResponse, delay } from "msw";

export const authHandlers = [
  http.post("/api/auth/login", async ({ request }) => {
    const { email, password } = (await request.json()) as {
      email: string;
      password: string;
    };

    // Simulate validation
    if (password.length < 8) {
      return HttpResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Simulate network delay
    await delay(100);

    return HttpResponse.json({
      token: "mock-jwt-token",
      user: { id: "1", email, name: "Test User" },
    });
  }),

  http.get("/api/auth/me", ({ request }) => {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return HttpResponse.json({
      id: "1",
      email: "test@example.com",
      name: "Test User",
      role: "user",
    });
  }),
];
```

```typescript
// mocks/handlers/products.ts
import { http, HttpResponse } from "msw";
import { productFactory } from "../factories";

export const productHandlers = [
  http.get("/api/products", ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") ?? 1);
    const limit = Number(url.searchParams.get("limit") ?? 20);

    const products = productFactory.buildList(limit);
    return HttpResponse.json({
      data: products,
      meta: { page, limit, total: 100 },
    });
  }),

  http.get("/api/products/:id", ({ params }) => {
    const product = productFactory.build({ id: params.id as string });
    return HttpResponse.json(product);
  }),

  http.post("/api/products", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(
      { id: "new-id", ...body, createdAt: new Date().toISOString() },
      { status: 201 }
    );
  }),
];
```

### Scenario-Based Mocking

```typescript
// mocks/server.ts — setup once for all tests
import { setupServer } from "msw/node";
import { authHandlers } from "./handlers/auth";
import { productHandlers } from "./handlers/products";

export const server = setupServer(...authHandlers, ...productHandlers);

// test-setup.ts
import { beforeAll, afterEach, afterAll } from "vitest";
import { server } from "./mocks/server";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

```typescript
// In a specific test — override handlers for edge cases
import { http, HttpResponse } from "msw";
import { server } from "./mocks/server";

test("handles server error on product list", async () => {
  // Override just this handler for this test
  server.use(
    http.get("/api/products", () => {
      return HttpResponse.json({ error: "Internal Server Error" }, { status: 500 });
    })
  );

  // ... test the error handling UI
});

test("handles slow network gracefully", async () => {
  server.use(
    http.get("/api/products", async () => {
      await delay(5000); // 5 second delay
      return HttpResponse.json({ data: [] });
    })
  );

  // ... test loading state and timeout behavior
});
```

### Browser + Node Integration

```typescript
// Browser tests (e.g., Storybook, Cypress)
import { setupWorker } from "msw/browser";
import { authHandlers } from "./handlers/auth";
import { productHandlers } from "./handlers/products";

export const worker = setupWorker(...authHandlers, ...productHandlers);

// Start in development for local testing
if (process.env.NODE_ENV === "development") {
  worker.start({
    onUnhandledRequest: "bypass", // let real requests through in dev
  });
}
```

## API Mocking Layers

### Layer Comparison

| Layer | Tool | Isolation | Realism | Speed |
|---|---|---|---|---|
| **Network-level** | MSW | High (intercepts fetch/XHR) | High (real HTTP semantics) | Fast |
| **Client-level** | `jest.mock()` / `vi.mock()` | Medium (replaces module) | Low (no HTTP at all) | Fastest |
| **Integration-level** | Test server (Express, Fastify) | Low (real server) | Highest | Slowest |

### When to Use Each Layer

```typescript
// Client-level mock — fastest, least realistic
// Use for: unit tests of code that calls an API client
vi.mock("./api/client", () => ({
  apiClient: {
    getProducts: vi.fn().mockResolvedValue([mockProduct]),
    createProduct: vi.fn().mockResolvedValue(mockProduct),
  },
}));

// Network-level (MSW) — balanced
// Use for: component tests, integration tests of UI + data flow
// (see MSW section above)

// Integration-level — slowest, most realistic
// Use for: API endpoint tests, database interaction tests
import { createTestServer } from "./test-server";

const server = await createTestServer(); // real Express app with real DB
const response = await fetch(`${server.url}/api/products`);
```

## Contract Testing with Pact

### Consumer Test (API Client Side)

```typescript
// tests/contracts/product-api.consumer.test.ts
import { PactV3, MatchersV3 } from "@pact-foundation/pact";
import { ProductApiClient } from "../../src/api/product-client";

const { like, eachLike, regex } = MatchersV3;

const provider = new PactV3({
  consumer: "web-frontend",
  provider: "product-service",
});

describe("Product API", () => {
  it("retrieves a product by ID", async () => {
    // Define the expected interaction
    await provider
      .uponReceiving("a request for product by ID")
      .withRequest({
        method: "GET",
        path: "/api/products/abc-123",
        headers: { Accept: "application/json" },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: {
          id: like("abc-123"),
          name: like("Widget Pro"),
          price: like(29.99),
          currency: regex(/^\w{3}$/, "USD"),
          tags: eachLike("electronics"),
        },
      });

    // Run the consumer code against the mock
    await provider.executeTest(async (mockServer) => {
      const client = new ProductApiClient(mockServer.url);
      const product = await client.getProduct("abc-123");

      expect(product.id).toBe("abc-123");
      expect(product.name).toBeDefined();
      expect(product.price).toBeGreaterThan(0);
    });
  });
});
```

### Provider Verification (API Server Side)

```typescript
// tests/contracts/product-api.provider.test.ts
import { Verifier } from "@pact-foundation/pact";

describe("Product Service Pact Verification", () => {
  it("validates all consumer contracts", async () => {
    const opts = {
      provider: "product-service",
      providerBaseUrl: "http://localhost:3001",
      pactBrokerUrl: process.env.PACT_BROKER_URL,
      publishVerificationResult: true,
      providerVersion: process.env.GIT_SHA,
      stateHandlers: {
        "a product exists": async () => {
          await db.products.create({ id: "abc-123", name: "Widget Pro", price: 29.99 });
        },
      },
    };

    const verifier = new Verifier(opts);
    await verifier.verifyProvider();
  });
});
```

## Database Mocking

### In-Memory SQLite as a Fake

```typescript
// test-db.ts — use SQLite for fast integration tests
import { DataSource } from "typeorm";

export function createTestDatabase(): DataSource {
  return new DataSource({
    type: "sqlite",
    database: ":memory:",
    entities: [User, Order, Product],
    synchronize: true, // auto-create schema from entities
    logging: false,
  });
}

// In tests
let db: DataSource;

beforeAll(async () => {
  db = createTestDatabase();
  await db.initialize();
});

afterAll(async () => {
  await db.destroy();
});

beforeEach(async () => {
  // Clear all tables between tests
  for (const entity of db.entityMetadatas) {
    await db.getRepository(entity.target as any).clear();
  }
});
```

### Test Containers for Real Databases

```typescript
// jest.setup.ts — spin up a real PostgreSQL for integration tests
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";

let container: StartedPostgreSqlContainer;

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:16-alpine")
    .withDatabase("test_db")
    .withUsername("test")
    .withPassword("test")
    .start();

  process.env.DATABASE_URL = container.getConnectionUri();

  // Run migrations
  await runMigrations(container.getConnectionUri());
}, 30000);

afterAll(async () => {
  await container.stop();
});
```

### Factory Pattern for Test Data

```typescript
// factories/user.factory.ts
import { faker } from "@faker-js/faker";

interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user" | "viewer";
  createdAt: Date;
}

export const userFactory = {
  build(overrides: Partial<User> = {}): User {
    return {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      name: faker.person.fullName(),
      role: "user",
      createdAt: faker.date.past(),
      ...overrides,
    };
  },

  buildList(count: number, overrides: Partial<User> = {}): User[] {
    return Array.from({ length: count }, () => this.build(overrides));
  },
};
```

## External Service Mocking

### Time-Based Mocking

```typescript
// Mock time for testing scheduled tasks and expiration logic
import { vi } from "vitest";

test("expired tokens are rejected", () => {
  const now = new Date("2024-06-01T12:00:00Z");
  vi.setSystemTime(now);

  const token = createToken({ expiresAt: new Date("2024-06-01T11:00:00Z") });
  expect(validateToken(token)).toBe(false);

  vi.useRealTimers();
});

test("retry backoff uses exponential delay", async () => {
  vi.useFakeTimers();

  const promise = fetchWithRetry("/api/data", { maxRetries: 3 });

  await vi.advanceTimersByTimeAsync(1000);  // first retry at 1s
  await vi.advanceTimersByTimeAsync(2000);  // second retry at 2s
  await vi.advanceTimersByTimeAsync(4000);  // third retry at 4s

  const result = await promise;
  expect(result).toBeDefined();

  vi.useRealTimers();
});
```

### Fake Queue Implementation

```typescript
// fakes/fake-queue.ts — in-process fake for job queue testing
interface Job<T> {
  id: string;
  data: T;
  status: "pending" | "processing" | "completed" | "failed";
}

export class FakeQueue<T> {
  private jobs: Job<T>[] = [];
  private handler: ((data: T) => Promise<void>) | null = null;

  async add(data: T): Promise<string> {
    const id = crypto.randomUUID();
    this.jobs.push({ id, data, status: "pending" });
    return id;
  }

  process(handler: (data: T) => Promise<void>) {
    this.handler = handler;
  }

  async drain(): Promise<void> {
    if (!this.handler) throw new Error("No handler registered");
    for (const job of this.jobs.filter((j) => j.status === "pending")) {
      job.status = "processing";
      try {
        await this.handler(job.data);
        job.status = "completed";
      } catch {
        job.status = "failed";
      }
    }
  }

  getJobs(status?: Job<T>["status"]): Job<T>[] {
    return status ? this.jobs.filter((j) => j.status === status) : this.jobs;
  }
}
```

## Fixture Management

### Shared Fixtures with Per-Test Overrides

```typescript
// fixtures/index.ts
import { userFactory } from "../factories/user.factory";
import { productFactory } from "../factories/product.factory";

export const fixtures = {
  adminUser: userFactory.build({
    id: "admin-1",
    email: "admin@example.com",
    role: "admin",
  }),

  regularUser: userFactory.build({
    id: "user-1",
    email: "user@example.com",
    role: "user",
  }),

  sampleProducts: productFactory.buildList(5),

  emptyCart: { items: [], total: 0, currency: "USD" },

  fullCart: {
    items: [
      { productId: "p1", name: "Widget", quantity: 2, price: 10.0 },
      { productId: "p2", name: "Gadget", quantity: 1, price: 25.0 },
    ],
    total: 45.0,
    currency: "USD",
  },
};

// In tests — override specific fields
test("admin sees delete button", () => {
  const admin = { ...fixtures.adminUser, name: "Custom Name" };
  renderDashboard(admin);
  expect(screen.getByRole("button", { name: "Delete" })).toBeVisible();
});
```

### Snapshot Fixtures for API Responses

```typescript
// Snapshot test the shape of API mock responses
test("product API response matches snapshot", async () => {
  server.use(
    http.get("/api/products/123", () => {
      return HttpResponse.json(productFactory.build({ id: "123" }));
    })
  );

  const response = await fetch("/api/products/123");
  const data = await response.json();

  // Freeze dynamic fields before snapshot
  data.createdAt = "2024-01-01T00:00:00.000Z";

  expect(data).toMatchSnapshot();
});
```

## Mock vs Real Decision Framework

| Factor | Use Mock | Use Real |
|---|---|---|
| Speed matters | Unit/component tests | -- |
| External API not in your control | Third-party APIs (Stripe, Twilio) | -- |
| Database query correctness | -- | Integration tests |
| Network protocol behavior | -- | Contract tests |
| CI reliability | Flaky external services | Services you control |
| Test layer | Unit, Component | Integration, E2E |

### Rule of Thumb

- **Unit tests**: Always mock external dependencies. Speed is paramount.
- **Integration tests**: Use fakes (in-memory DB) or test containers (real DB). Mock external APIs via MSW.
- **E2E tests**: Use real services where possible. Mock only third-party services and non-deterministic data.

## TypeScript Type-Safe Mocking

```typescript
// utils/mock-helpers.ts — type-safe mock creation
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export function createMock<T>(defaults: T): (overrides?: DeepPartial<T>) => T {
  return (overrides = {}) => ({
    ...defaults,
    ...overrides,
  }) as T;
}

// Usage — full type safety
interface Order {
  id: string;
  userId: string;
  items: Array<{ productId: string; quantity: number; price: number }>;
  status: "pending" | "confirmed" | "shipped";
  total: number;
}

const mockOrder = createMock<Order>({
  id: "order-1",
  userId: "user-1",
  items: [{ productId: "p1", quantity: 1, price: 10 }],
  status: "pending",
  total: 10,
});

// Type-checked overrides — TypeScript catches typos and type mismatches
const shippedOrder = mockOrder({ status: "shipped", total: 50 });
// mockOrder({ status: "invalid" }); // TypeScript error!
```

### Mocking with Vitest Type Safety

```typescript
import { vi, type Mock } from "vitest";

// Type-safe mock function creation
function createMockFn<T extends (...args: any[]) => any>(
  implementation?: T
): Mock<T> {
  return vi.fn(implementation) as Mock<T>;
}

// Usage
const fetchUser = createMockFn<(id: string) => Promise<User>>();
fetchUser.mockResolvedValue(userFactory.build());

// TypeScript knows the parameter and return types
const user = await fetchUser("user-1");
```

## Integration Test Environments

### Docker Compose for Test Dependencies

```yaml
# docker-compose.test.yml
version: "3.8"

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: app_test
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    ports:
      - "5433:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U test"]
      interval: 2s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6380:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 2s
      timeout: 5s
      retries: 5
```

```bash
# Run integration tests with real dependencies
docker compose -f docker-compose.test.yml up -d --wait
DATABASE_URL=postgresql://test:test@localhost:5433/app_test \
REDIS_URL=redis://localhost:6380 \
  npm run test:integration
docker compose -f docker-compose.test.yml down -v
```

## Anti-Patterns

- **Mocking everything** — Over-mocking creates tests that pass regardless of real behavior. Mock only the boundaries you need to control; use real implementations where feasible.
- **Deep module mocks (`jest.mock` of internals)** — Mocking internal modules couples tests to implementation details. Prefer mocking at the network boundary (MSW) or injection boundary (constructor params).
- **Shared mutable fixtures** — Tests that modify shared fixtures create order-dependent failures. Always clone or re-create fixtures per test.
- **Ignoring MSW unhandled requests** — Set `onUnhandledRequest: "error"` so tests fail loudly when they make unexpected HTTP calls instead of silently hitting real APIs.
- **Hard-coded mock IDs** — Using `"id-1"` everywhere makes it impossible to test ID-based lookups with multiple records. Use factory-generated UUIDs or semantically distinct IDs.
- **Skipping contract tests** — Without contract tests, API changes in one service silently break consumers. Use Pact or similar to catch breaking changes before deployment.

## Related Skills

- [[csp-e2e-testing]]
- [[csp-visual-regression]]
- [[csp-react-testing]]
- [[csp-api-governance]]
- [[csp-docker-patterns]]
