---
name: csp-backend-patterns
description: >
  Language-agnostic backend patterns: layered architecture, dependency injection,
  repository pattern, error handling and retries, idempotency, rate limiting,
  caching, transaction boundaries, API design, and background jobs. Use for
  server-side design regardless of language or framework.
metadata:
  origin: CSP
layer: 4
category: patterns
---

# Backend Patterns (Language-Agnostic)

> This is the **language-agnostic entry point** for server-side design. The
> patterns apply whether you write Node.js, Go, Python, Java, Kotlin, or Rust.
> Language-specific idioms live in their own skills (python-patterns,
> golang-patterns, kotlin-patterns, etc.).

## Core Concepts

| Pattern | Purpose |
|---------|---------|
| Layered architecture | Separate transport, business logic, and data access |
| Dependency injection | Decouple components; make them testable |
| Repository | Abstract persistence behind a domain interface |
| Service layer | Hold business logic, orchestrate repositories |
| Idempotency | Make retried/duplicate requests safe |
| Cache-aside | Serve hot data from cache, fall back to source |
| Rate limiting | Protect APIs from abuse and overload |
| Circuit breaker | Stop hammering a failing dependency |
| Job queue | Move slow work off the request path |
| Transaction boundary | Define the unit of atomic work |

## Layered Architecture

Keep dependencies pointing inward: transport depends on services, services depend
on repositories, and the domain depends on nothing.

```
┌─────────────────────────────────────────┐
│ Transport (HTTP/gRPC/CLI handlers)        │  parse, validate, serialize
├─────────────────────────────────────────┤
│ Service layer (use cases / business logic)│  orchestrate, enforce rules
├─────────────────────────────────────────┤
│ Repository (data access interface)         │  persistence abstraction
├─────────────────────────────────────────┤
│ Infrastructure (DB, cache, queue, 3rd-party)│  concrete adapters
└─────────────────────────────────────────┘
```

- **Handlers stay thin**: parse input, call one service method, map the result to a
  response. No business logic, no SQL.
- **Services own the rules**: validation beyond shape, authorization decisions,
  orchestration across repositories.
- **The domain layer has no framework imports** — it should compile without knowing
  whether it runs behind HTTP or a queue worker.

## Dependency Injection

Pass dependencies in through constructors/factories instead of importing concrete
singletons. This makes wiring explicit and lets tests substitute fakes.

```
NewUserService(repo UserRepository, cache Cache, clock Clock, logger Logger)
```

- Depend on **interfaces/abstractions**, not concrete classes.
- Validate required dependencies at construction (fail fast on misconfiguration).
- Inject `Clock`, `IdGenerator`, and `Random` so time and randomness are
  controllable in tests.
- A DI container is optional — manual constructor wiring in a composition root
  (e.g. `main`) is often clearer for small/medium services.

## Repository Pattern

Define the data interface in terms of the **domain**, not the database.

```
interface UserRepository {
  findById(id): User | null
  findByEmail(email): User | null
  save(user): User
  delete(id): void
}
```

- The service depends on `UserRepository`; the concrete `PostgresUserRepository`
  (or `InMemoryUserRepository` in tests) implements it.
- Return domain objects, not raw rows or ORM entities that leak persistence
  concerns upward.
- Keep query methods intention-revealing (`findActiveSubscribers`) rather than
  exposing a generic query builder that lets callers write SQL through the seam.

## Error Handling & Retries

- **Distinguish error classes**: client errors (4xx — invalid input, not found),
  server errors (5xx — bugs, dependency failures), and transient errors (timeouts,
  503s) that are worth retrying.
- **Wrap, don't swallow**: attach context as errors propagate; never `catch` and
  ignore. Log once at the boundary, not at every layer.
- **Centralize error mapping**: one place translates domain errors to HTTP status
  codes / response envelopes.
- **Retry only idempotent, transient failures** with capped attempts and
  **exponential backoff + jitter** to avoid thundering herds.
- **Circuit breaker**: after N consecutive failures to a dependency, open the
  circuit and fail fast for a cooldown window instead of piling up requests.
- **Always set timeouts** on outbound calls (DB, HTTP, queue). A call with no
  timeout is a latent outage.

## Idempotency

Networks retry. Clients double-click. Queues deliver at-least-once. Design writes so
duplicates are safe.

- Accept a client-supplied **idempotency key**; store the key + result and return
  the cached result on replay.
- Use natural unique constraints (e.g. `UNIQUE(order_id, charge_id)`) so a duplicate
  insert fails cleanly instead of double-charging.
- Make operations naturally idempotent where possible (`SET status = 'paid'` rather
  than `increment balance`).
- For consumers, dedupe on a message id you persist before acting.

## Rate Limiting

- **Token bucket / leaky bucket** for smooth throughput with burst tolerance;
  **fixed/sliding window** for simple per-minute caps.
- Apply limits per API key / user / IP, and keep counters in a shared store (Redis)
  so limits hold across instances.
- Return `429` with `Retry-After`; expose `X-RateLimit-*` headers so clients can
  self-throttle.
- Protect expensive endpoints (auth, search, export) more tightly than cheap reads.

## Caching Strategies

| Strategy | How it works | Use when |
|----------|--------------|----------|
| Cache-aside (lazy) | App reads cache, misses fall back to DB and populate | General reads; most common |
| Write-through | Write updates cache and DB together | Read-heavy, freshness matters |
| Write-behind | Write to cache, async-flush to DB | Write-heavy, can tolerate lag |
| Read-through | Cache layer owns the DB fetch | Encapsulated cache library |

- Always set a **TTL**; unbounded caches become stale-data and memory problems.
- **Invalidate on write** for data that must be fresh; accept TTL staleness
  otherwise.
- Guard against **cache stampede** (many misses at once) with locks/single-flight or
  staggered TTLs.
- Cache keys must encode all inputs that change the result (tenant, version, params).

## Transaction Boundaries

- A transaction should wrap **one unit of business work** — not a whole request, not
  a single statement out of habit.
- Keep transactions **short**: do I/O (HTTP calls, queue publishes) *outside* the
  transaction; long-held locks kill throughput.
- For cross-service consistency, prefer the **outbox pattern** (write state + an
  event in the same transaction, publish the event asynchronously) or **sagas** over
  distributed transactions.
- Be explicit about isolation levels when correctness depends on it
  (e.g. `SERIALIZABLE` for balance transfers).

## API Design

- **Resource-oriented URLs**, plural nouns: `/users/{id}/orders`. Verbs live in the
  HTTP method, not the path.
- **Use status codes correctly**: 200/201/204, 400/401/403/404/409/422, 429, 5xx.
- **Paginate list endpoints** (cursor-based for large/active datasets, offset for
  small/static ones) — never return unbounded collections.
- **Version at the edge** (`/v1/`, or a header) and evolve additively; never break a
  field's meaning in place.
- **Consistent envelopes**: a predictable shape for data and for errors
  (`{ error: { code, message, details } }`).
- **Validate input at the boundary** and reject unknown fields when strictness
  matters.

## Background Tasks & Queues

Move anything slow, retryable, or non-critical-to-the-response off the request path:
email, image processing, webhooks, report generation.

- Use a durable queue (SQS, RabbitMQ, Redis Streams, a DB-backed queue) — jobs must
  survive a crash.
- Assume **at-least-once delivery**: make handlers idempotent.
- Configure **retries with backoff** and a **dead-letter queue** for poison
  messages; alert on DLQ growth.
- Make jobs **observable**: log job id, attempt count, and duration.
- Keep job payloads small (pass an id, re-fetch inside the worker) so they don't go
  stale or bloat the queue.

## Observability

- **Structured logs** (JSON) with a correlation/request id threaded through every
  layer.
- **Metrics**: request rate, error rate, latency percentiles (p50/p95/p99),
  queue depth, cache hit ratio.
- **Tracing** across service boundaries to find where latency accrues.
- Log at boundaries; avoid logging the same error at every catch.

## Anti-Patterns

| Anti-Pattern | Do Instead |
|--------------|-----------|
| Business logic in route handlers | Push it into the service layer |
| `SELECT *` when few columns are needed | Select only required columns |
| N+1 queries in a loop | Batch fetch / join / dataloader |
| Swallowing errors silently | Log once at the boundary and propagate |
| No timeouts on outbound calls | Always set timeouts + retries with backoff |
| Retrying non-idempotent writes | Add idempotency keys first |
| No rate limiting on public APIs | Token-bucket limit per key/user/IP |
| Long transactions doing I/O | Keep transactions short; do I/O outside |
| Unbounded list responses | Always paginate |
| Cache with no TTL / no invalidation | Set TTL and invalidate on write |
| Sync work that could be async | Offload to a durable job queue |
| Distributed transactions across services | Use outbox/saga patterns |

**Remember**: Backend patterns enable scalable, resilient, maintainable services.
Start with a clean layering and explicit dependencies; add caching, queues, and
breakers when load and failure modes justify them — not before.

## References

- [references/api-design.md](references/api-design.md) — REST API design: resource
  naming, status codes, pagination, filtering, versioning, rate limiting, response
  envelopes.
- [references/api-patterns.md](references/api-patterns.md) — Repository, service
  layer, middleware, database, caching, error handling, logging implementations.
- [references/auth-patterns.md](references/auth-patterns.md) — JWT validation,
  role-based access control, and rate limiting.
- [references/queue-patterns.md](references/queue-patterns.md) — Background jobs and
  simple queue implementations.
