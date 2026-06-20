---
name: csp-backend-performance
description: >
  Diagnose and optimize backend application performance using profiling, caching
  layers, async processing, and scaling patterns. Use when APIs are slow, database
  queries bottleneck throughput, or services need to handle higher concurrency.
version: 0.1.0
layer: 4
category: patterns
---

# Backend Performance Optimization

Systematic patterns for profiling, caching, async processing, and scaling backend services to reduce latency and increase throughput.

## When to Activate

- API response times exceed SLA targets (e.g., p95 > 200 ms)
- Database connection pools are exhausted under load
- CPU or memory usage spikes correlate with request volume
- Job queues are backing up with unprocessed tasks
- Horizontal scaling is needed but the service has stateful bottlenecks
- CI performance regression tests are failing

## Performance Profiling

### Node.js Profiling

```bash
# clinic.js — flamegraphs, bubbleprof, doctor
npx clinic doctor -- node server.js
npx clinic flame -- node server.js
npx clinic bubbleprof -- node server.js

# 0x — single-command flamegraph generation
npx 0x server.js
# Produces a flamegraph HTML file after Ctrl+C

# Node.js built-in profiler
node --prof server.js
node --prof-process isolate-*.log > profile.txt
```

```typescript
// Adding custom performance marks in Node.js
import { performance, PerformanceObserver } from "perf_hooks";

const obs = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log(`${entry.name}: ${entry.duration.toFixed(2)}ms`);
  }
});
obs.observe({ entryTypes: ["measure"] });

async function handleRequest(req, res) {
  performance.mark("start");
  const data = await fetchData();
  performance.mark("fetched");
  const result = transformData(data);
  performance.mark("transformed");

  performance.measure("fetch", "start", "fetched");
  performance.measure("transform", "fetched", "transformed");
  performance.measure("total", "start", "transformed");

  res.json(result);
}
```

### Python Profiling

```bash
# cProfile — built-in deterministic profiler
python -m cProfile -s cumtime app.py

# py-spy — sampling profiler, no code changes needed
py-spy record -o profile.svg -- python app.py
py-spy top -- python app.py

# pyinstrument — low-overhead statistical profiler
pip install pyinstrument
pyinstrument app.py
```

```python
# Targeted profiling of specific functions
import cProfile
import pstats

def profile_function(func, *args, **kwargs):
    profiler = cProfile.Profile()
    profiler.enable()
    result = func(*args, **kwargs)
    profiler.disable()

    stats = pstats.Stats(profiler)
    stats.sort_stats("cumulative")
    stats.print_stats(20)  # top 20 functions
    return result
```

### Go Profiling

```go
// net/http/pprof — register profiling endpoints
import _ "net/http/pprof"

func main() {
    go func() {
        http.ListenAndServe(":6060", nil)
    }()
    // ... your server
}
```

```bash
# Capture and analyze CPU profile
go tool pprof http://localhost:6060/debug/pprof/profile?seconds=30

# Memory profile
go tool pprof http://localhost:6060/debug/pprof/heap

# Visualize as flamegraph
go tool pprof -http=:8080 profile.pb.gz
```

## Connection Pooling

### Database Connection Pool Sizing

The standard formula: `pool_size = (core_count * 2) + effective_spindle_count`

For most web apps with SSD storage: start with 10-20 connections per pool.

```typescript
// Node.js — pg pool configuration
import { Pool } from "pg";

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  max: 20,              // max connections in pool
  min: 5,               // min idle connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000, // fail fast if pool exhausted
});

// Always release connections back to the pool
async function query(sql: string, params: unknown[]) {
  const client = await pool.connect();
  try {
    return await client.query(sql, params);
  } finally {
    client.release();
  }
}
```

```python
# Python — SQLAlchemy pool configuration
from sqlalchemy import create_engine

engine = create_engine(
    "postgresql://user:pass@host/db",
    pool_size=20,
    max_overflow=10,       # allow burst up to 30
    pool_timeout=5,        # seconds to wait for connection
    pool_pre_ping=True,    # verify connection before use
    pool_recycle=3600,     # recycle connections after 1 hour
)
```

### HTTP Client Pool Configuration

```typescript
// Node.js — undici pool for outbound HTTP
import { Pool } from "undici";

const apiPool = new Pool("https://api.example.com", {
  connections: 50,
  pipelining: 1,
  keepAliveTimeout: 30000,
  keepAliveMaxTimeout: 600000,
});

// Reuse the pool across requests instead of creating new connections
async function callExternalAPI(path: string) {
  const { statusCode, body } = await apiPool.request({ path, method: "GET" });
  return body.json();
}
```

## Caching Layers Decision Tree

```
Request arrives
  |
  v
[CDN / Edge Cache] -- HIT? --> Return cached response
  | MISS
  v
[HTTP Cache Headers] -- Conditional request? --> 304 Not Modified
  |
  v
[Application Cache (In-Memory)] -- HIT? --> Return cached value
  | MISS
  v
[Redis Cache] -- HIT? --> Return cached value, populate app cache
  | MISS
  v
[Database] -- Query result --> Populate Redis + App cache, return
```

### In-Memory Application Cache

```typescript
// LRU cache with bounded size
import { LRUCache } from "lru-cache";

const cache = new LRUCache<string, User>({
  max: 500,
  ttl: 1000 * 60 * 5,  // 5 minutes
  updateAgeOnGet: true,  // refresh TTL on access
});

async function getUser(id: string): Promise<User> {
  const cached = cache.get(id);
  if (cached) return cached;

  const user = await db.users.findById(id);
  if (user) cache.set(id, user);
  return user;
}

// Invalidate on update
async function updateUser(id: string, data: Partial<User>) {
  const updated = await db.users.update(id, data);
  cache.delete(id);  // delete rather than update to avoid stale data
  return updated;
}
```

### Redis Caching Patterns

```typescript
// Cache-Aside: read path checks cache first
async function getProduct(id: string): Promise<Product> {
  const cached = await redis.get(`product:${id}`);
  if (cached) return JSON.parse(cached);

  const product = await db.products.findById(id);
  await redis.set(`product:${id}`, JSON.stringify(product), "EX", 300);
  return product;
}

// Write-Through: write updates both cache and DB
async function updateProduct(id: string, data: Partial<Product>) {
  const updated = await db.products.update(id, data);
  await redis.set(`product:${id}`, JSON.stringify(updated), "EX", 300);
  return updated;
}

// Write-Behind: write to cache immediately, async flush to DB
async function incrementViewCount(id: string) {
  await redis.incr(`views:${id}`);
  // Background job syncs to DB periodically
}
```

```python
# Redis caching with python — cache-aside pattern
import json
import redis

r = redis.Redis(decode_responses=True)

def get_user(user_id: str) -> dict:
    cache_key = f"user:{user_id}"
    cached = r.get(cache_key)
    if cached:
        return json.loads(cached)

    user = db.query("SELECT * FROM users WHERE id = %s", (user_id,))
    if user:
        r.setex(cache_key, 300, json.dumps(user))
    return user
```

### HTTP Cache Headers

```typescript
// Express.js — setting appropriate cache headers
app.get("/api/products/:id", async (req, res) => {
  const product = await getProduct(req.params.id);

  // ETag for conditional requests
  const etag = `"${hash(JSON.stringify(product))}"`;
  res.setHeader("ETag", etag);

  if (req.headers["if-none-match"] === etag) {
    return res.status(304).end();
  }

  // Public cache with revalidation
  res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  res.json(product);
});
```

## Async Processing

### Job Queue with BullMQ

```typescript
import { Queue, Worker } from "bullmq";

// Define the queue
const emailQueue = new Queue("email-sending", {
  connection: { host: "localhost", port: 6379 },
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: { age: 7 * 24 * 3600 },
  },
});

// Enqueue jobs
async function sendWelcomeEmail(userId: string) {
  await emailQueue.add("welcome", { userId }, {
    priority: 1,  // high priority
  });
}

// Process jobs
const worker = new Worker(
  "email-sending",
  async (job) => {
    const user = await getUser(job.data.userId);
    await emailService.send(user.email, "welcome", { name: user.name });
  },
  {
    connection: { host: "localhost", port: 6379 },
    concurrency: 10,
  }
);
```

### Python with Celery

```python
from celery import Celery

app = Celery("tasks", broker="redis://localhost:6379/0")

@app.task(bind=True, max_retries=3, default_retry_delay=60)
def generate_report(self, report_id: str):
    try:
        data = fetch_report_data(report_id)
        pdf = render_pdf(data)
        store_pdf(report_id, pdf)
        notify_user(report_id, "ready")
    except TemporaryError as exc:
        self.retry(exc=exc)
```

## Database Query Optimization

### N+1 Detection and Fix

```typescript
// BAD: N+1 — one query per user
const orders = await db.orders.findAll({ where: { status: "active" } });
for (const order of orders) {
  order.user = await db.users.findById(order.userId);  // N additional queries
}

// GOOD: Eager loading — single query with JOIN
const orders = await db.orders.findAll({
  where: { status: "active" },
  include: [{ model: User, as: "user" }],
});

// GOOD: Batch loading with DataLoader
import DataLoader from "dataloader";

const userLoader = new DataLoader(async (userIds: readonly string[]) => {
  const users = await db.users.findByIds([...userIds]);
  const userMap = new Map(users.map((u) => [u.id, u]));
  return userIds.map((id) => userMap.get(id) ?? null);
});

// Use in resolvers or handlers
const orders = await db.orders.findAll();
const users = await Promise.all(orders.map((o) => userLoader.load(o.userId)));
```

### Query Analysis

```sql
-- Always prefix with EXPLAIN ANALYZE to see actual execution
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT o.*, u.name
FROM orders o
JOIN users u ON u.id = o.user_id
WHERE o.status = 'active'
  AND o.created_at > now() - interval '30 days'
ORDER BY o.created_at DESC
LIMIT 50;

-- Look for:
-- Seq Scan on large tables → add index
-- Nested Loop with high row count → consider hash join
-- Sort → consider adding index for ORDER BY columns
-- High Buffers shared hit vs read → cache efficiency
```

## API Response Optimization

### Pagination and Field Selection

```typescript
// Cursor-based pagination for consistent results
async function listProducts(cursor?: string, limit = 20) {
  const where = cursor ? { id: { gt: cursor } } : {};

  const products = await db.products.findMany({
    where,
    take: limit + 1, // fetch one extra to determine hasMore
    orderBy: { id: "asc" },
  });

  const hasMore = products.length > limit;
  if (hasMore) products.pop();

  return {
    data: products,
    nextCursor: hasMore ? products[products.length - 1].id : null,
  };
}

// Field selection — let clients request only what they need
app.get("/api/products", (req, res) => {
  const fields = (req.query.fields as string)?.split(",") ?? ["id", "name", "price"];
  const allowed = fields.filter((f) => ALLOWED_FIELDS.has(f));

  const products = await db.products.findMany({
    select: Object.fromEntries(allowed.map((f) => [f, true])),
  });

  res.json(products);
});
```

### Response Compression

```typescript
// Express compression middleware
import compression from "compression";

app.use(
  compression({
    level: 6,            // balance speed vs ratio
    threshold: 1024,     // skip tiny responses
    filter: (req, res) => {
      // Compress JSON and text, skip already-compressed formats
      if (req.headers["x-no-compression"]) return false;
      return compression.filter(req, res);
    },
  })
);
```

## Horizontal Scaling

### Stateless Design Principles

| Principle | Why | How |
|---|---|---|
| No local session state | Any server can handle any request | Store sessions in Redis |
| Shared nothing on disk | Files must be accessible everywhere | Use S3 or shared storage |
| Idempotent operations | Requests can be retried safely | Use idempotency keys |
| Health check endpoints | Load balancer needs liveness probes | `GET /health` returning 200 |

### Load Balancer Configuration

```nginx
# Nginx — upstream with health checks
upstream api_servers {
    least_conn;  # route to server with fewest active connections

    server api-1:3000 weight=5;
    server api-2:3000 weight=5;
    server api-3:3000 weight=3 backup;

    keepalive 32;  # persistent connections to backends
}

server {
    location /api/ {
        proxy_pass http://api_servers;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Request-ID $request_id;
    }
}
```

## Performance Budgeting in CI

```yaml
# .github/workflows/performance-budget.yml
name: Performance Budget
on: [pull_request]

jobs:
  latency-budget:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run performance tests
        run: |
          npm run build
          npm start &
          sleep 5
          # Run k6 load test and check p95 latency
          k6 run --threshold 'http_req_duration{scenario:api}:p(95)<200' \
                 --threshold 'http_req_failed{scenario:api}<0.01' \
                 tests/perf/api-load.js

      - name: Check bundle size
        run: |
          npx bundlesize
        env:
          BUNDLESIZE_GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

```javascript
// bundlesize.config.js
module.exports = {
  files: [
    { path: "./dist/js/main-*.js", maxSize: "80 kB" },
    { path: "./dist/js/vendor-*.js", maxSize: "120 kB" },
    { path: "./dist/css/main-*.css", maxSize: "15 kB" },
  ],
};
```

## Anti-Patterns

- **Caching everything without invalidation** — Stale cache is worse than no cache. Every cache entry needs a clear invalidation strategy and TTL.
- **Premature horizontal scaling** — Profile and optimize the single-node path first. Scaling a slow service just gives you more slow instances.
- **Synchronous external calls in request path** — Move non-critical side effects (email, analytics, logging) to async job queues.
- **Unbounded caches** — Always set max size on in-memory caches (LRU) and TTL on Redis keys. Unbounded caches cause OOM crashes.
- **Ignoring connection pool exhaustion** — A full pool blocks all requests. Monitor pool utilization and set `connectionTimeoutMillis` to fail fast rather than hang.
- **N+1 queries hidden by ORMs** — Always log queries in development. Use `eager loading` or `DataLoader` to batch related queries.

## Related Skills

- [[csp-frontend-performance]]
- [[csp-db-performance]]
- [[csp-api-governance]]
- [[csp-monitoring-alerting]]
- [[csp-docker-patterns]]
