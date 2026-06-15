# PostgreSQL Optimization Deep Dive

Advanced PostgreSQL internals for performance tuning. Covers index internals, WAL behavior, memory configuration, and connection management.

## Index Internals

### B-tree Structure

PostgreSQL B-tree indexes are multi-level balanced trees. Each level contains pages with tuples pointing to child pages (internal nodes) or heap tuples (leaf nodes).

```sql
-- Inspect index structure
CREATE EXTENSION IF NOT EXISTS pageinspect;

-- Check index depth and page count
SELECT * FROM bt_metap('idx_orders_user_date');
-- Returns: level (tree depth), root page, fastroot, fastlevel

-- Check page statistics
SELECT * FROM bt_page_stats('idx_orders_user_date', 1);
-- Returns: type (r=root, i=internal, l=leaf), live_items, dead_items, avg_item_size
```

**When to REINDEX:**

- `bt_page_stats` shows high `dead_items` ratio
- Index size is much larger than expected for the data volume
- Query performance degraded despite index existence

```sql
-- REINDEX CONCURRENTLY (PostgreSQL 12+) does not lock the table
REINDEX INDEX CONCURRENTLY idx_orders_user_date;
```

**Index-Only Scan Requirements:**
1. Query references only columns in the index
2. Visibility map shows relevant heap pages are all-visible

```sql
-- Index supports index-only scan
CREATE INDEX idx_orders_covering ON orders(user_id, status) INCLUDE (total);

-- This query can use index-only scan
SELECT total FROM orders WHERE user_id = 42 AND status = 'shipped';

-- Check visibility map
CREATE EXTENSION IF NOT EXISTS pg_visibility;
SELECT * FROM pg_visibility_map('orders');
-- all_visible = true means index-only scan is possible for those pages
```

**Visibility map maintenance:** VACUUM updates the visibility map. If autovacuum is not keeping up, index-only scans degrade to regular index scans.

### GIN Index Internals

GIN (Generalized Inverted Index) stores a posting list for each distinct key. Ideal for JSONB, arrays, and full-text search.

```sql
-- GIN index on JSONB
CREATE INDEX idx_events_data ON events USING gin(data);

-- GIN supports these JSONB operators:
-- @>  containment
-- ?   key exists
-- ?|  any key exists
-- ?&  all keys exist

-- GIN does NOT support:
-- ->>, ->, #>, #>>  (path extraction operators)
-- For path queries, use a B-tree expression index instead
CREATE INDEX idx_events_user_id ON events((data->>'user_id'));
```

**GIN pending list:** GIN uses a pending list for fast inserts. Queries must check both the main index and the pending list. To force pending list cleanup:

```sql
-- Check pending list size
SELECT * FROM gin_metapage_info(get_raw_page('idx_events_data', 0));

-- Force cleanup
SET gin_pending_list_limit = 0;  -- disable pending list for this index
```

### GiST Index Internals

GiST (Generalized Search Tree) supports arbitrary indexing strategies via operator classes. Used for:

- Range types (`tstzrange`, `numrange`)
- Geometric types (`point`, `polygon`, `circle`)
- Exclusion constraints
- Nearest-neighbor searches (`ORDER BY <-> LIMIT k`)

```sql
-- Nearest-neighbor query with GiST
CREATE INDEX idx_locations_coords ON locations USING gist(coordinates);

SELECT name FROM locations
ORDER BY coordinates <-> point(40.7128, -74.0060)
LIMIT 10;
-- Uses GiST index for efficient kNN search
```

### BRIN Index Internals

BRIN (Block Range Index) stores min/max values for ranges of pages. Extremely small index size.

```sql
-- BRIN for naturally ordered data
CREATE INDEX idx_events_created ON events USING brin(created_at);

-- BRIN is typically 100-1000x smaller than B-tree

-- BRIN works well when:
-- 1. Physical row order correlates with column values
-- 2. Table is large (> 10M rows)
-- 3. Queries filter on ranges of the indexed column

-- Check correlation
SELECT correlation FROM pg_stats
WHERE tablename = 'events' AND attname = 'created_at';
-- Correlation close to 1.0 or -1.0 means BRIN is effective
```

## WAL and Write Performance

### Write-Ahead Log Basics

Every data modification is written to WAL before the data page is modified. This ensures crash recovery.

```sql
-- Check WAL generation rate
SELECT pg_size_pretty(pg_current_wal_lsn() - pg_stat_archiver_last_archived_lsn()) AS wal_since_last_archive;

-- Monitor WAL activity
SELECT * FROM pg_stat_wal;  -- PostgreSQL 14+
```

**WAL tuning:**

```sql
-- Increase WAL buffers for write-heavy workloads
ALTER SYSTEM SET wal_buffers = 64;  -- MB, default is -1 (auto)

-- Increase checkpoint intervals to reduce I/O spikes
ALTER SYSTEM SET checkpoint_timeout = '15min';  -- default 5min
ALTER SYSTEM SET max_wal_size = '4GB';          -- default 1GB
ALTER SYSTEM SET min_wal_size = '1GB';          -- default 80MB

-- Reduce checkpoint write pressure
ALTER SYSTEM SET checkpoint_completion_target = 0.9;  -- default 0.9
```

### Unlogged Tables

For ephemeral data that does not need crash recovery:

```sql
CREATE UNLOGGED TABLE temp_analytics (
    session_id TEXT,
    event_data JSONB
);
-- No WAL written, 3-5x faster writes
-- Data lost on crash, not replicated to standbys
-- Use for: session data, staging tables, cache tables
```

## Memory Configuration Deep Dive

### shared_buffers

PostgreSQL's primary data cache. All backends share this memory region.

```sql
-- Current setting
SHOW shared_buffers;

-- Guideline: 25% of system RAM for dedicated DB servers
-- For 32GB RAM: shared_buffers = 8GB
-- For 64GB RAM: shared_buffers = 16GB

-- Check buffer cache hit ratio
SELECT
    sum(heap_blks_read) AS disk_reads,
    sum(heap_blks_hit) AS cache_hits,
    CASE WHEN sum(heap_blks_hit) + sum(heap_blks_read) > 0
         THEN round(100.0 * sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)), 2)
         ELSE 0 END AS hit_ratio
FROM pg_statio_user_tables;
-- Target: > 99% for OLTP, > 95% for mixed workloads
```

### work_mem

Memory allocated per sort/hash operation per query. A single query can use multiple work_mem allocations.

```sql
-- Default: 4 MB
SHOW work_mem;

-- Check if queries are spilling to disk
-- In EXPLAIN ANALYZE, look for:
-- "Sort Method: external merge  Disk: 25000kB"  <-- spilling
-- "Hash Batches: 4"  <-- hash table overflow

-- Set work_mem per-session for expensive queries
SET LOCAL work_mem = '256MB';
SELECT ...;  -- complex query
-- work_mem reverts to default after transaction

-- Global tuning (be conservative)
-- OLTP (many concurrent queries): 4-16 MB
-- OLAP (few complex queries): 64-512 MB
-- Rule of thumb: total RAM / (max_connections * 2)
```

### maintenance_work_mem

Used by VACUUM, CREATE INDEX, ALTER TABLE ADD FOREIGN KEY.

```sql
-- Default: 64 MB
-- Recommendation: 512 MB to 2 GB for large databases
ALTER SYSTEM SET maintenance_work_mem = '1GB';

-- Speeds up:
-- CREATE INDEX (especially on large tables)
-- VACUUM (processes dead tuples faster)
-- autovacuum_worker_mem (per autovacuum worker)
```

### effective_cache_size

Estimate of total memory available for disk caching (OS page cache + shared_buffers). Does not allocate memory.

```sql
-- Default: 4 GB
-- Set to 50-75% of total RAM
ALTER SYSTEM SET effective_cache_size = '24GB';  -- for 32GB system

-- This influences the query planner's cost estimates
-- Higher value makes index scans look cheaper relative to seq scans
-- Too high: planner chooses index scans that turn out to be slow
-- Too low: planner avoids index scans even when they would be fast
```

## Connection Management

### Connection Overhead

Each PostgreSQL connection is a separate process. Typical overhead:

- Memory: 5-10 MB per connection (base)
- CPU: context switching increases with connection count
- Practical limit: 200-500 active connections before performance degrades

```sql
-- Check current connections
SELECT state, count(*)
FROM pg_stat_activity
GROUP BY state;
-- States: active, idle, idle in transaction, idle in transaction (aborted)

-- Find long-running idle connections
SELECT pid, usename, state, query,
       now() - state_change AS idle_duration
FROM pg_stat_activity
WHERE state = 'idle in transaction'
  AND now() - state_change > interval '10 minutes';
-- Kill: SELECT pg_terminate_backend(pid);
```

### Connection Pooling with PgBouncer

PgBouncer sits between the application and PostgreSQL, multiplexing connections.

```ini
; pgbouncer.ini
[databases]
mydb = host=localhost dbname=mydb

[pgbouncer]
pool_mode = transaction    ; recommended for most apps
max_client_conn = 1000     ; max application connections
default_pool_size = 25     ; server connections per database
min_pool_size = 5          ; keep-alive connections
reserve_pool_size = 5      ; burst connections
reserve_pool_timeout = 3   ; seconds before using reserve
```

**Pool modes:**

| Mode | Behavior | Use Case |
|------|----------|----------|
| session | One server connection per client session | Legacy apps, apps using LISTEN/NOTIFY |
| transaction | Server connection returned to pool after COMMIT | Most web applications (recommended) |
| statement | Server connection returned after each statement | Simple read-only queries only |

### Connection Limits

```sql
-- Per-database connection limit
ALTER DATABASE mydb CONNECTION LIMIT 100;

-- Per-role connection limit
ALTER ROLE app_user CONNECTION LIMIT 50;

-- Reserve connections for superusers
SHOW superuser_reserved_connections;  -- default: 3
-- These are available when max_connections is reached
```

## Autovacuum Tuning

### Per-Table Configuration

High-write tables need more aggressive autovacuum:

```sql
-- Check current autovacuum settings for a table
SELECT reloptions FROM pg_class WHERE relname = 'orders';

-- Tune for high-write table
ALTER TABLE orders SET (
    autovacuum_vacuum_threshold = 1000,        -- default: 50
    autovacuum_vacuum_scale_factor = 0.01,     -- default: 0.2 (20% of rows)
    autovacuum_analyze_threshold = 500,        -- default: 50
    autovacuum_analyze_scale_factor = 0.005,   -- default: 0.1 (10% of rows)
    autovacuum_vacuum_cost_delay = 2,          -- default: 2ms (0 = no delay)
    autovacuum_vacuum_cost_limit = 1000        -- default: -1 (uses global)
);
```

### Vacuum Monitoring

```sql
-- Tables needing vacuum
SELECT schemaname, relname, n_dead_tup, n_live_tup,
       last_autovacuum, last_autoanalyze
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC LIMIT 20;

-- Transaction ID wraparound risk (CRITICAL)
SELECT datname, age(datfrozenxid) AS xid_age,
       round(100.0 * age(datfrozenxid) / current_setting('autovacuum_freeze_max_age')::bigint, 1) AS pct
FROM pg_database ORDER BY age(datfrozenxid) DESC;
-- If pct > 80%, emergency vacuum is needed
```
