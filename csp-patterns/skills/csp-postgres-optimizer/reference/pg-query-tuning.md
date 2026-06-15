# PostgreSQL Query Tuning

Practical query tuning patterns with EXPLAIN ANALYZE interpretation, plan node analysis, and step-by-step optimization workflows.

## EXPLAIN ANALYZE Reading Guide

### Basic Syntax

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT ...;
```

Flags:
- `ANALYZE` -- actually execute the query (not just estimate)
- `BUFFERS` -- show buffer cache hit/miss/dirty counts
- `FORMAT TEXT` -- human-readable (alternatives: JSON, YAML, XML)

### Understanding Cost Estimates

```
Seq Scan on orders  (cost=0.00..15234.56 rows=450000 width=120)
  Filter: (created_at > '2024-01-01'::timestamp with time zone)
  Rows Removed by Filter: 550000
```

- `cost=0.00..15234.56` -- startup cost..total cost (arbitrary units, not milliseconds)
- `rows=450000` -- estimated rows returned by this node
- `width=120` -- estimated average row width in bytes
- `Rows Removed by Filter` -- actual rows scanned but discarded

**Key insight:** Compare estimated `rows=` with actual `rows=` (shown when ANALYZE is used). Large discrepancies indicate stale statistics.

```sql
-- Refresh statistics when estimates are wrong
ANALYZE orders;
```

### Reading Plan Trees

Plans are trees. Indentation shows parent-child relationships. Read from the bottom up:

```
Hash Join  (actual time=15.2..45.8 rows=12000 loops=1)
  Hash Cond: (o.user_id = u.id)
  ->  Seq Scan on orders o  (actual time=0.5..12.3 rows=50000 loops=1)
  ->  Hash  (actual time=2.1..2.1 rows=8000 loops=1)
        ->  Seq Scan on users u  (actual time=0.3..1.5 rows=8000 loops=1)
```

Execution order:
1. `Seq Scan on users` (innermost, runs first)
2. `Hash` builds hash table from users
3. `Seq Scan on orders` (outer, runs second)
4. `Hash Join` probes hash table for each order row

### Actual Time vs Cost

- `actual time=15.2..45.8` -- startup..total in milliseconds
- `loops=1` -- how many times this node executed
- Total wall time for a node = actual time * loops

```
Nested Loop  (actual time=0.5..2500.0 rows=50000 loops=1)
  ->  Index Scan on orders  (actual time=0.3..5.0 rows=50000 loops=1)
  ->  Index Scan on users  (actual time=0.02..0.03 rows=1 loops=50000)
```

Here the inner Index Scan runs 50000 times (loops=50000). Total inner time = 0.03ms * 50000 = 1500ms. This is the bottleneck.

### Buffer Analysis

```
Buffers: shared hit=1250 read=3200 dirtied=50
```

- `shared hit` -- pages found in shared_buffers (fast)
- `shared read` -- pages read from disk (slow)
- `shared dirtied` -- pages modified (will be written to disk later)

**Hit ratio:** `hit / (hit + read)`. Target: > 95% for hot data.

```sql
-- If read is high, consider:
-- 1. Increase shared_buffers
-- 2. Pre-warm the cache
CREATE EXTENSION IF NOT EXISTS pg_prewarm;
SELECT pg_prewarm('orders', 'buffer');
```

## Common Plan Nodes and Fixes

### Sequential Scan on Large Table

```
Seq Scan on orders  (actual time=0.5..1200.0 rows=450000 loops=1)
  Filter: (user_id = 42)
  Rows Removed by Filter: 9999550
```

**Problem:** Scanning 10M rows to find 450K matching rows.

**Fix:** Add an index.

```sql
CREATE INDEX idx_orders_user_id ON orders(user_id);
-- Re-run: should now show Index Scan with actual time ~5ms
```

### Sort with Disk Spill

```
Sort  (actual time=500.0..600.0 rows=2000000 loops=1)
  Sort Key: created_at DESC
  Sort Method: external merge  Disk: 245000kB
```

**Problem:** Sort does not fit in `work_mem`, spilling 245MB to disk.

**Fix:** Increase work_mem for this query.

```sql
SET LOCAL work_mem = '512MB';
-- Re-run: should show "Sort Method: quicksort  Memory: 245000kB"
```

### Hash Join with Batches

```
Hash Join  (actual time=50.0..800.0 rows=100000 loops=1)
  Hash Cond: (o.customer_id = c.id)
  ->  Seq Scan on orders o
  ->  Hash  (actual time=10.0..10.0 rows=50000 loops=1)
        Buckets: 65536  Batches: 4  Memory Usage: 2048kB
```

**Problem:** Hash table overflows `work_mem`, split into 4 batches (disk I/O).

**Fix:** Increase work_mem so the hash fits in one batch.

```sql
SET LOCAL work_mem = '64MB';
-- Target: Batches: 1
```

### Nested Loop with High Loop Count

```
Nested Loop  (actual time=0.5..5000.0 rows=100000 loops=1)
  ->  Seq Scan on products  (actual time=0.3..5.0 rows=1000 loops=1)
  ->  Index Scan on inventory  (actual time=0.02..4.5 rows=100 loops=1000)
```

**Problem:** Inner scan runs 1000 times, each taking 4.5ms. Total: 4500ms.

**Fix options:**
1. Add a composite index to reduce per-iteration cost
2. Rewrite as Hash Join (let planner choose)
3. Pre-aggregate the inner query

```sql
-- Option 2: force hash join via query rewrite
SELECT p.*, i.total_qty
FROM products p
JOIN (
    SELECT product_id, SUM(qty) AS total_qty
    FROM inventory GROUP BY product_id
) i ON p.id = i.product_id;
```

## Step-by-Step Optimization Workflow

### Step 1: Identify the Slow Query

```sql
-- Top queries by total execution time
SELECT query, calls,
       round(total_time::numeric, 2) AS total_ms,
       round(mean_time::numeric, 2) AS avg_ms,
       round((100.0 * shared_blks_hit / NULLIF(shared_blks_hit + shared_blks_read, 0))::numeric, 1) AS hit_pct
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;
```

### Step 2: Get the Full Plan

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
<the slow query>;
```

### Step 3: Identify the Bottleneck Node

Look for the node with the highest `actual time` or the most `loops`. This is where time is spent.

### Step 4: Classify the Bottleneck

| Symptom | Cause | Fix |
|---------|-------|-----|
| Seq Scan + high rows removed | Missing index | CREATE INDEX |
| Sort + Disk spill | work_mem too low | SET LOCAL work_mem |
| Hash + Batches > 1 | work_mem too low | SET LOCAL work_mem |
| Nested Loop + high loops | Wrong join strategy | Rewrite query or add index |
| Index Scan + low hit ratio | Cold cache or small shared_buffers | Increase shared_buffers |
| High rows discrepancy | Stale statistics | ANALYZE table |

### Step 5: Apply Fix and Verify

Re-run EXPLAIN ANALYZE after each change. Compare:
- Total execution time (before vs after)
- Bottleneck node eliminated?
- Buffer hit ratio improved?

### Step 6: Regression Test

Run the optimized query with different parameter values to ensure the plan is stable across the parameter space.

## Query Rewriting Patterns

### CTE Materialization Control

```sql
-- Force inlining (PostgreSQL 12+)
WITH active_users AS NOT MATERIALIZED (
    SELECT * FROM users WHERE status = 'active'
)
SELECT au.name, o.total
FROM active_users au
JOIN orders o ON au.id = o.user_id;

-- Force materialization when CTE result is reused
WITH monthly_stats AS MATERIALIZED (
    SELECT user_id, date_trunc('month', created_at) AS month, COUNT(*) AS cnt
    FROM orders GROUP BY 1, 2
)
SELECT * FROM monthly_stats WHERE month = '2024-01-01'
UNION ALL
SELECT * FROM monthly_stats WHERE month = '2024-02-01';
```

### LATERAL Join for Top-N Per Group

```sql
-- Get the 3 most recent orders per user
SELECT u.id, u.name, o.id AS order_id, o.created_at, o.total
FROM users u
CROSS JOIN LATERAL (
    SELECT id, created_at, total
    FROM orders
    WHERE user_id = u.id
    ORDER BY created_at DESC
    LIMIT 3
) o
WHERE u.status = 'active';

-- Requires index for efficiency
CREATE INDEX idx_orders_user_created ON orders(user_id, created_at DESC);
```

### Recursive CTE for Hierarchical Data

```sql
-- Category tree with depth
WITH RECURSIVE tree AS (
    SELECT id, name, parent_id, 1 AS depth, ARRAY[name] AS path
    FROM categories WHERE parent_id IS NULL

    UNION ALL

    SELECT c.id, c.name, c.parent_id, t.depth + 1, t.path || c.name
    FROM categories c
    JOIN tree t ON c.parent_id = t.id
)
SELECT * FROM tree ORDER BY path;

-- Prevent infinite loops on cyclic data
WITH RECURSIVE tree AS (
    SELECT id, name, parent_id, 1 AS depth, ARRAY[id] AS visited
    FROM categories WHERE parent_id IS NULL

    UNION ALL

    SELECT c.id, c.name, c.parent_id, t.depth + 1, t.visited || c.id
    FROM categories c
    JOIN tree t ON c.parent_id = t.id
    WHERE NOT c.id = ANY(t.visited)  -- cycle detection
)
SELECT * FROM tree;
```

### Window Function for Running Aggregates

```sql
-- Running total and moving average
SELECT
    order_date,
    amount,
    SUM(amount) OVER (ORDER BY order_date) AS running_total,
    AVG(amount) OVER (
        ORDER BY order_date
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) AS moving_avg_7day,
    LAG(amount, 7) OVER (ORDER BY order_date) AS same_day_last_week
FROM daily_sales;
```

## Partitioning for Query Performance

### When to Partition

- Table exceeds 100M rows or 100GB
- Queries consistently filter on a time range or category
- Need to purge old data efficiently (DROP PARTITION vs DELETE)

### Declarative Partitioning

```sql
CREATE TABLE events (
    id BIGSERIAL,
    created_at TIMESTAMPTZ NOT NULL,
    event_type TEXT,
    data JSONB
) PARTITION BY RANGE (created_at);

-- Monthly partitions
CREATE TABLE events_2024_01 PARTITION OF events
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE events_2024_02 PARTITION OF events
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
-- ...

-- Partition automatically prunes irrelevant partitions
SELECT * FROM events WHERE created_at >= '2024-06-01' AND created_at < '2024-07-01';
```

### Partition Maintenance

```sql
-- Detach old partitions for archival or cheaper storage
ALTER TABLE events DETACH PARTITION events_2023_01;

-- Drop old partitions instantly
DROP TABLE events_2022_01;
```
