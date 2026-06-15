---
name: csp-postgres-optimizer
description: >
  PostgreSQL-specific performance tuning agent. Covers EXPLAIN ANALYZE interpretation,
  index strategy (B-tree, GIN, GiST, BRIN), query plan optimization, connection pooling,
  partitioning, and vacuum tuning. Use when PostgreSQL queries are slow or need optimization.
metadata:
  origin: CSP
  source: awesome-copilot/skills/postgresql-*
  globs: ["**/*.sql", "**/migrations/**"]
---

# PostgreSQL Performance Optimizer

Diagnose slow queries, design index strategies, and optimize PostgreSQL configuration.

## Diagnostic Workflow

1. **Capture** -- `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)` on the slow query
2. **Classify** -- identify the bottleneck node (Seq Scan, Sort, Hash, etc.)
3. **Index** -- design the right index type for the access pattern
4. **Rewrite** -- restructure the query if indexes alone cannot fix the plan
5. **Configure** -- tune `postgresql.conf` for the workload profile
6. **Verify** -- re-run EXPLAIN and compare

## EXPLAIN ANALYZE Key Nodes

| Node | Meaning | Fix |
|------|---------|-----|
| Seq Scan | Full table scan | Add WHERE-selective index |
| Nested Loop | O(n*m) join | Add index or use Hash/Merge |
| Sort (external merge) | Disk spill | Increase `work_mem` |
| Hash (Batches: N>1) | Hash overflow | Increase `work_mem` |

## Index Strategy

| Type | Best For | Example |
|------|----------|---------|
| B-tree | Equality, range | `CREATE INDEX idx ON orders(user_id, order_date)` |
| GIN | JSONB, arrays, full-text | `CREATE INDEX idx ON events USING gin(data)` |
| GiST | Ranges, geometry, kNN | `CREATE INDEX idx ON locations USING gist(coords)` |
| BRIN | Naturally ordered large tables | `CREATE INDEX idx ON events USING brin(created_at)` |

Partial and expression indexes:
```sql
CREATE INDEX idx_orders_active ON orders(created_at)
WHERE status IN ('pending', 'processing');
CREATE INDEX idx_users_lower_email ON users(lower(email));
```

## Query Rewriting Patterns

```sql
-- Correlated subquery to window function
-- SLOW: SELECT p.name, (SELECT AVG(price) FROM products p2
--   WHERE p2.category_id = p.category_id) FROM products p;
-- FAST:
SELECT name, AVG(price) OVER (PARTITION BY category_id) FROM products;

-- OFFSET to keyset pagination
-- SLOW: SELECT * FROM products ORDER BY id OFFSET 10000 LIMIT 20;
-- FAST:
SELECT * FROM products WHERE id > :last_id ORDER BY id LIMIT 20;

-- OR to UNION ALL (when OR spans different columns)
SELECT * FROM products WHERE category = 'electronics' AND price < 1000
UNION ALL
SELECT * FROM products WHERE category = 'books' AND price < 50;
```

## Configuration Quick Reference

| Parameter | OLTP | OLAP |
|-----------|------|------|
| `shared_buffers` | 25% RAM | 25-40% RAM |
| `work_mem` | 4 MB | 64-256 MB |
| `maintenance_work_mem` | 64 MB | 512 MB-2 GB |
| `effective_cache_size` | 50-75% RAM | 75% RAM |
| `random_page_cost` | 4.0 | 1.1 (SSD) |

## Partitioning & Vacuum

Declarative range partitioning for tables exceeding ~100M rows:
```sql
CREATE TABLE events (...) PARTITION BY RANGE (created_at);
CREATE TABLE events_2024 PARTITION OF events
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
```

Tune autovacuum for high-write tables:
```sql
ALTER TABLE orders SET (
    autovacuum_vacuum_scale_factor = 0.01,
    autovacuum_analyze_scale_factor = 0.005
);
```

## Reference Files

- `reference/pg-optimization-deep-dive.md` -- index internals, WAL, memory, connection pooling
- `reference/pg-query-tuning.md` -- EXPLAIN reading guide and rewrite patterns
