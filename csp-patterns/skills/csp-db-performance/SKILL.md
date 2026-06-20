---
name: csp-db-performance
description: >
  Diagnose and tune database performance using index strategies, query analysis,
  connection pooling, partitioning, and replication. Use when queries are slow,
  connections are exhausted, or database metrics indicate resource contention.
version: 0.1.0
layer: 4
category: patterns
---

# Database Performance Tuning

Systematic patterns for diagnosing and optimizing database performance across indexing, query execution, connection management, and infrastructure scaling.

## When to Activate

- Queries exceed latency targets (e.g., p99 > 50 ms for OLTP queries)
- Connection pool exhaustion causes request timeouts
- `pg_stat_statements` shows high-cost queries dominating runtime
- Replication lag between primary and replicas exceeds acceptable thresholds
- Table bloat from dead tuples degrades sequential scan performance
- Storage I/O or CPU metrics spike during peak traffic

## Index Strategy Decision Tree

### Choosing the Right Index Type

| Index Type | Best For | Avoid When |
|---|---|---|
| **B-tree** (default) | Equality, range, sorting | Full-text search, geometric data |
| **GIN** | Full-text search, JSONB containment, arrays | Simple equality on scalar columns |
| **GiST** | Geometric, range types, nearest-neighbor | High-write tables (large index overhead) |
| **BRIN** | Sequential data (timestamps, IDs) on large tables | Random access patterns, small tables |
| **Hash** | Simple equality only (rare) | Almost always prefer B-tree |
| **Partial** | Queries that always filter on a condition | When the condition varies per query |

```sql
-- B-tree: standard lookups and range queries
CREATE INDEX idx_orders_user_date
  ON orders (user_id, created_at DESC);

-- GIN: full-text search
CREATE INDEX idx_products_search
  ON products USING gin(to_tsvector('english', name || ' ' || description));

-- GIN: JSONB containment queries
CREATE INDEX idx_events_payload
  ON events USING gin(payload jsonb_path_ops);

-- BRIN: large tables with naturally ordered data
CREATE INDEX idx_logs_created
  ON logs USING brin(created_at)
  WITH (pages_per_range = 32);

-- Partial index: only active records
CREATE INDEX idx_orders_active
  ON orders (user_id)
  WHERE status = 'active';

-- Covering index: avoid heap lookups entirely
CREATE INDEX idx_users_email_name
  ON users (email) INCLUDE (name, avatar_url);
```

### Composite Index Column Ordering

Place columns in this order within the index:
1. **Equality columns** first (most selective equality condition)
2. **Range column** next (only one range condition is efficient per index)
3. **ORDER BY column** last (if it matches the query sort)

```sql
-- Query: WHERE tenant_id = ? AND status = 'active' AND created_at > ? ORDER BY created_at
-- Optimal index order:
CREATE INDEX idx_tenant_active_created
  ON orders (tenant_id, status, created_at);
-- tenant_id (equality) → status (equality) → created_at (range + sort)
```

## Query Analysis with EXPLAIN

### Reading EXPLAIN ANALYZE Output

```sql
EXPLAIN (ANALYZE, BUFFERS, TIMING, FORMAT TEXT)
SELECT o.id, o.total, u.name
FROM orders o
JOIN users u ON u.id = o.user_id
WHERE o.status = 'pending'
  AND o.created_at > '2024-01-01'
ORDER BY o.created_at DESC
LIMIT 25;
```

Key fields to inspect:

| Field | Meaning | Red Flag |
|---|---|---|
| `actual time` | Real execution time per node | Much higher than `cost` estimate |
| `rows` | Actual rows returned vs estimated | Large mismatch → stale statistics |
| `Buffers: shared hit` | Pages read from shared buffer cache | Low hit ratio → increase `shared_buffers` |
| `Buffers: shared read` | Pages read from disk | High reads → check indexing or cache size |
| `Seq Scan` on large table | Full table scan | Missing index or unselective filter |
| `Sort` with `external merge` | Disk-based sort | Increase `work_mem` for this query |
| `Nested Loop` with high rows | O(n*m) join strategy | Consider hash join or add index |

### Common Fixes from EXPLAIN

```sql
-- Problem: Seq Scan on orders (millions of rows)
-- Fix: Add index matching the WHERE clause
CREATE INDEX idx_orders_status_created
  ON orders (status, created_at DESC);

-- Problem: Sort → external merge (disk spill)
-- Fix: Increase work_mem for this session
SET work_mem = '64MB';
-- Or for specific queries in application code

-- Problem: Nested Loop join with 100K rows
-- Fix: Ensure the inner table has an index on the join column
CREATE INDEX idx_users_id ON users (id); -- usually PK, but check
```

## Connection Pooling with PgBouncer

### Configuration

```ini
; pgbouncer.ini
[databases]
myapp = host=db-primary port=5432 dbname=myapp

[pgbouncer]
pool_mode = transaction      ; recommended for most web apps
max_client_conn = 1000       ; max client connections accepted
default_pool_size = 25       ; server connections per user/db pair
min_pool_size = 5            ; keep warm connections ready
reserve_pool_size = 5        ; burst capacity
reserve_pool_timeout = 3     ; seconds before using reserve
server_lifetime = 3600       ; recycle server connections hourly
server_idle_timeout = 600    ; close idle servers after 10 min
```

### Pool Sizing Formula

```
total_pool_size = (max_client_connections / avg_query_duration_ms) * overhead_factor

Example:
- 200 concurrent users
- Average query takes 5ms
- Overhead factor: 1.5
- Pool size = (200 / 5) * 1.5 = 60 connections to PostgreSQL

Rule of thumb: PostgreSQL handles ~200-300 active connections well.
Beyond that, add PgBouncer or read replicas.
```

### Transaction vs Session Mode

| Mode | Behavior | Use When |
|---|---|---|
| `transaction` | Connection returned after each transaction | Most web apps, no `SET` or `LISTEN` |
| `session` | Connection held until client disconnects | Apps using `LISTEN/NOTIFY`, temp tables, `SET` |
| `statement` | Connection returned after each statement | Legacy apps, simple single-statement queries |

## Slow Query Detection

```sql
-- Enable pg_stat_statements
-- postgresql.conf: shared_preload_libraries = 'pg_stat_statements'

-- Top 10 queries by total execution time
SELECT
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  rows
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;

-- Top 10 queries by mean execution time (slow individual queries)
SELECT
  query,
  calls,
  mean_exec_time,
  stddev_exec_time
FROM pg_stat_statements
WHERE calls > 100  -- filter out one-off queries
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Queries with high temp file usage (memory pressure)
SELECT query, temp_blks_read, temp_blks_written
FROM pg_stat_statements
WHERE temp_blks_read > 0
ORDER BY temp_blks_read DESC
LIMIT 5;
```

### Logging Configuration

```sql
-- postgresql.conf — log slow queries
log_min_duration_statement = 500    -- log queries taking > 500ms
log_statement = 'none'              -- don't log every statement
log_line_prefix = '%t [%p]: [%l-1] db=%d,user=%u '
log_checkpoints = on
log_lock_waits = on
log_temp_files = 0                  -- log all temp file usage
```

## Read/Write Splitting

### Primary-Replica Architecture

```typescript
// Application-level read/write splitting
import { Pool } from "pg";

const primary = new Pool({
  host: "db-primary.internal",
  max: 20,
});

const replicas = [
  new Pool({ host: "db-replica-1.internal", max: 20 }),
  new Pool({ host: "db-replica-2.internal", max: 20 }),
];

let replicaIndex = 0;

function getReadPool(): Pool {
  const pool = replicas[replicaIndex % replicas.length];
  replicaIndex++;
  return pool;
}

// Route reads to replicas, writes to primary
async function readQuery<T>(sql: string, params: unknown[]): Promise<T[]> {
  const result = await getReadPool().query(sql, params);
  return result.rows;
}

async function writeQuery<T>(sql: string, params: unknown[]): Promise<T[]> {
  const result = await primary.query(sql, params);
  return result.rows;
}
```

### Handling Replication Lag

```typescript
// After a write, route subsequent reads to primary for consistency
const WRITE_AFFINITY_TTL = 5000; // 5 seconds
const userWriteTimestamps = new Map<string, number>();

function shouldReadFromPrimary(userId: string): boolean {
  const lastWrite = userWriteTimestamps.get(userId);
  if (!lastWrite) return false;
  return Date.now() - lastWrite < WRITE_AFFINITY_TTL;
}

async function updateUser(userId: string, data: Partial<User>) {
  const result = await writeQuery("UPDATE users SET ... WHERE id = $1", [userId]);
  userWriteTimestamps.set(userId, Date.now());
  return result;
}

async function getUser(userId: string) {
  const pool = shouldReadFromPrimary(userId) ? primary : getReadPool();
  const result = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
  return result.rows[0];
}
```

## Table Partitioning

### When to Partition

| Signal | Threshold |
|---|---|
| Table size | > 100 GB or > 100M rows |
| Query pattern | Always filters on partition key (date, tenant) |
| Maintenance | VACUUM takes too long on full table |
| Data lifecycle | Old data is archived or deleted regularly |

### Range Partitioning (Time-Based)

```sql
-- Partition orders by month
CREATE TABLE orders (
  id BIGSERIAL,
  user_id BIGINT NOT NULL,
  total NUMERIC(12, 2),
  created_at TIMESTAMPTZ NOT NULL
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE orders_2024_01 PARTITION OF orders
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE orders_2024_02 PARTITION OF orders
  FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Auto-create future partitions with pg_partman
SELECT partman.create_parent(
  'public.orders',
  'created_at',
  'native',
  'monthly',
  p_premake := 3
);
```

### List Partitioning (Tenant-Based)

```sql
-- Partition by tenant for multi-tenant isolation
CREATE TABLE events (
  id BIGSERIAL,
  tenant_id TEXT NOT NULL,
  event_type TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ
) PARTITION BY LIST (tenant_id);

CREATE TABLE events_tenant_a PARTITION OF events FOR VALUES IN ('tenant_a');
CREATE TABLE events_tenant_b PARTITION OF events FOR VALUES IN ('tenant_b');
```

## Vacuum and Maintenance

### Autovacuum Tuning

```sql
-- postgresql.conf — aggressive autovacuum for high-write tables
autovacuum_max_workers = 4                  # default 3, increase for busy systems
autovacuum_naptime = 30s                    # check more frequently
autovacuum_vacuum_threshold = 50            # base rows before trigger
autovacuum_vacuum_scale_factor = 0.05       # 5% of table (default 20%)
autovacuum_analyze_threshold = 50
autovacuum_analyze_scale_factor = 0.05

-- Per-table settings for very large tables
ALTER TABLE orders SET (
  autovacuum_vacuum_scale_factor = 0.01,    -- vacuum after 1% changes
  autovacuum_analyze_scale_factor = 0.01,
  autovacuum_vacuum_cost_delay = 0          -- don't throttle vacuum
);
```

### Manual Maintenance

```sql
-- Check table bloat
SELECT
  schemaname,
  relname,
  n_dead_tup,
  n_live_tup,
  ROUND(n_dead_tup::numeric / NULLIF(n_live_tup + n_dead_tup, 0) * 100, 2) AS dead_pct,
  last_vacuum,
  last_autovacuum
FROM pg_stat_user_tables
WHERE n_dead_tup > 10000
ORDER BY n_dead_tup DESC;

-- Manual vacuum with verbose output
VACUUM (VERBOSE, ANALYZE) orders;

-- Rebuild bloated indexes
REINDEX INDEX CONCURRENTLY idx_orders_user_date;
```

## PostgreSQL-Specific Tuning

### Memory Configuration

```ini
# postgresql.conf — memory settings for a 32 GB server
shared_buffers = 8GB              # 25% of total RAM
effective_cache_size = 24GB       # 75% of total RAM (planner hint, not allocation)
work_mem = 64MB                   # per-sort/hash operation — careful with concurrency
maintenance_work_mem = 1GB        # for VACUUM, CREATE INDEX
huge_pages = try                  # use OS huge pages when available
```

### Parallel Query Configuration

```ini
# postgresql.conf — enable parallel queries
max_parallel_workers_per_gather = 4
max_parallel_workers = 8
max_parallel_maintenance_workers = 4
parallel_tuple_cost = 0.001       # reduce to encourage parallel plans
parallel_setup_cost = 100         # reduce to encourage parallel plans
min_parallel_table_scan_size = 1MB
min_parallel_index_scan_size = 256kB
```

```sql
-- Force parallel execution for analysis queries
SET force_parallel_mode = on;
SET max_parallel_workers_per_gather = 8;

-- Check if a query uses parallel workers
EXPLAIN (ANALYZE, VERBOSE)
SELECT date_trunc('day', created_at), COUNT(*), SUM(total)
FROM orders
WHERE created_at > '2024-01-01'
GROUP BY 1;
-- Look for: Workers Planned, Workers Launched, Parallel Seq Scan
```

## MySQL-Specific Patterns

```sql
-- InnoDB buffer pool — set to 70-80% of available RAM
-- my.cnf
-- innodb_buffer_pool_size = 24G
-- innodb_buffer_pool_instances = 8

-- Slow query log
-- slow_query_log = 1
-- long_query_time = 1
-- log_queries_not_using_indexes = 1

-- Analyze a slow query
EXPLAIN ANALYZE
SELECT o.*, u.name
FROM orders o
JOIN users u ON u.id = o.user_id
WHERE o.status = 'pending'
ORDER BY o.created_at DESC
LIMIT 25;

-- Check InnoDB buffer pool hit ratio
SHOW STATUS LIKE 'Innodb_buffer_pool_read%';
-- Ratio: Innodb_buffer_pool_reads / Innodb_buffer_pool_read_requests
-- Target: > 99% (reads from memory vs disk)
```

## Monitoring Key Metrics

| Metric | Healthy Range | Alert When |
|---|---|---|
| Active connections | < 80% of `max_connections` | > 90% for 5 minutes |
| Cache hit ratio | > 99% | < 95% sustained |
| Replication lag | < 1 second | > 5 seconds |
| Deadlocks | 0 per minute | > 0 recurring |
| Seq scans on large tables | Rare | Frequent on tables > 1M rows |
| Long-running transactions | < 1 minute | > 5 minutes |
| Table bloat (dead tuples) | < 10% | > 20% |

```sql
-- Quick health check query
SELECT
  (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') AS active_connections,
  (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') AS max_connections,
  (SELECT ROUND(100.0 * sum(blks_hit) / NULLIF(sum(blks_hit) + sum(blks_read), 0), 2)
   FROM pg_stat_database) AS cache_hit_pct,
  (SELECT count(*) FROM pg_stat_activity
   WHERE state = 'active' AND now() - query_start > interval '30 seconds') AS long_queries;
```

## Anti-Patterns

- **Adding indexes blindly** — Every index slows writes. Only index columns that appear in WHERE, JOIN, or ORDER BY clauses of actual slow queries.
- **Ignoring autovacuum** — Disabling or under-tuning autovacuum leads to table bloat, which degrades all query performance. Tune it aggressively for write-heavy tables.
- **Using `SELECT *` in production** — Fetching unnecessary columns wastes memory, network, and prevents index-only scans. Always specify needed columns.
- **Oversized connection pools** — Too many connections cause PostgreSQL context-switching overhead. Use PgBouncer and size pools with the formula above.
- **Running large transactions** — Long transactions hold locks and prevent vacuum from reclaiming dead tuples. Break bulk operations into batches of 1000-5000 rows.
- **Skipping EXPLAIN ANALYZE** — Guessing why a query is slow wastes time. Always look at the actual execution plan before adding indexes or rewriting queries.

## Related Skills

- [[csp-backend-performance]]
- [[csp-frontend-performance]]
- [[csp-postgres-patterns]]
- [[csp-db-migration]]
- [[csp-monitoring-alerting]]
