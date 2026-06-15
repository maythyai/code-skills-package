# SQL Review Checklist

Comprehensive checklist for reviewing SQL code across security, performance, correctness, and maintainability.

## Security

### SQL Injection Prevention

- [ ] All user inputs passed via parameterized queries or prepared statements
- [ ] No string concatenation used to build SQL from user input
- [ ] Dynamic SQL (if unavoidable) uses `quote_ident()` / `quote_literal()` or equivalent
- [ ] ORM query builders do not pass raw user input into `.raw()` / `.where()` strings
- [ ] Stored procedures use INVOKER rights when accessing user-scoped data
- [ ] Dynamic table/column names rejected at the application layer (allowlist only)

### Privilege & Access Control

- [ ] Application connects with a role that has only required GRANTs
- [ ] No `GRANT ALL PRIVILEGES` on schemas or databases to application roles
- [ ] SUPERUSER / DBA credentials never embedded in application code
- [ ] Row Level Security policies applied on multi-tenant tables
- [ ] SECURITY DEFINER functions validated for privilege escalation vectors
- [ ] Connection strings stored in secrets manager, not in source code

### Data Exposure

- [ ] `SELECT *` not used on tables containing PII, credentials, or tokens
- [ ] Sensitive columns (passwords, keys, SSN) excluded from application queries
- [ ] Audit logging enabled for DELETE and bulk UPDATE on sensitive tables
- [ ] Error messages do not leak schema details or query fragments to users
- [ ] Database backups encrypted at rest

## Correctness

### NULL Semantics

- [ ] `WHERE col = NULL` replaced with `WHERE col IS NULL`
- [ ] Three-valued logic understood: `NULL = NULL` evaluates to UNKNOWN, not TRUE
- [ ] `NOT IN (subquery)` guarded against NULL values (returns empty if any NULL present)
- [ ] Aggregate functions (`COUNT`, `SUM`) behavior with NULLs verified
- [ ] `COALESCE` or `NULLIF` used where NULL propagation is undesirable
- [ ] LEFT JOIN result columns checked for NULL before comparison

### JOIN Logic

- [ ] INNER JOIN used when unmatched rows should be excluded
- [ ] LEFT JOIN used only when NULLs from the right side are expected and handled
- [ ] All JOIN conditions specified (no accidental cartesian products)
- [ ] Self-joins have distinct aliases
- [ ] JOIN predicates in ON clause for outer joins, WHERE clause for inner joins
- [ ] Multi-table JOINs verified for row multiplication (fan-out)

### Transaction Boundaries

- [ ] Transactions are as short as possible (no long-held locks)
- [ ] Read-only transactions use `SET TRANSACTION READ ONLY`
- [ ] Isolation level appropriate: READ COMMITTED for most OLTP, SERIALIZABLE for financial
- [ ] Retry logic exists for serialization failures
- [ ] No DDL inside transactions that could cause extended locks
- [ ] Savepoints used for partial rollback within complex transactions

### Data Integrity

- [ ] FOREIGN KEY constraints defined for all parent-child relationships
- [ ] NOT NULL set on columns where NULL is semantically invalid
- [ ] CHECK constraints enforce domain rules (e.g., `price >= 0`)
- [ ] UNIQUE constraints applied where business logic demands uniqueness
- [ ] Cascading behavior reviewed: CASCADE vs SET NULL vs RESTRICT

## Performance

### Query Shape

- [ ] No `SELECT *` in production queries (list required columns)
- [ ] Functions on indexed columns avoided in WHERE (`WHERE YEAR(col)` blocks index)
- [ ] Implicit type casts in WHERE eliminated (e.g., VARCHAR compared to INT)
- [ ] `LIKE` patterns do not start with wildcard (`%suffix` cannot use B-tree)
- [ ] `DISTINCT` not used as a substitute for fixing JOIN duplicates
- [ ] `EXISTS` preferred over `IN (subquery)` for large result sets
- [ ] UNION ALL used instead of UNION when duplicate removal is unnecessary

### Index Strategy

- [ ] Indexes on columns used in WHERE, JOIN ON, ORDER BY, GROUP BY
- [ ] Composite index column order matches query filter and sort order
- [ ] Covering indexes (`INCLUDE`) used to avoid heap lookups for hot queries
- [ ] Partial indexes created for queries filtering on a constant subset
- [ ] Unused indexes identified and removed
- [ ] Index bloat monitored; REINDEX scheduled when needed
- [ ] Total index count per table reasonable (typically < 10 for OLTP)

### Subquery and CTE Patterns

- [ ] Correlated subqueries converted to JOINs where possible
- [ ] CTEs not used as optimization fences
- [ ] `NOT MATERIALIZED` hint used when CTE should be inlined (PostgreSQL 12+)
- [ ] Derived tables (subqueries in FROM) have aliases
- [ ] LATERAL joins used instead of correlated scalar subqueries for per-row lookups

### Pagination and Limits

- [ ] OFFSET replaced with keyset/cursor pagination for large tables
- [ ] LIMIT applied to all user-facing queries
- [ ] `SELECT COUNT(*)` for pagination total uses a filtered index when possible

### Batch and Bulk Operations

- [ ] Multi-row INSERT used instead of individual INSERTs in a loop
- [ ] `INSERT ... ON CONFLICT` (upsert) used instead of SELECT-then-INSERT/UPDATE
- [ ] Bulk UPDATE uses FROM clause or CTE instead of correlated subqueries
- [ ] COPY used for bulk data loading instead of INSERT statements
- [ ] Temporary tables used for complex multi-step transformations

## Maintainability

### Naming Conventions

- [ ] Tables and columns use `snake_case`
- [ ] Table names are plural (`users`, `order_items`)
- [ ] Boolean columns prefixed with `is_`, `has_`, `can_`
- [ ] Foreign key columns named `<singular_table>_id`
- [ ] Index names follow `idx_<table>_<columns>` pattern
- [ ] Constraint names follow `chk_<table>_<description>` pattern
- [ ] No reserved words used as identifiers

### Formatting

- [ ] SQL keywords in UPPERCASE
- [ ] Consistent indentation (2 or 4 spaces)
- [ ] Each major clause on its own line
- [ ] Complex queries broken into CTEs for readability
- [ ] Comments explain the "why", not the "what"

### Schema Design

- [ ] Appropriate normalization (3NF for OLTP, denormalized for OLAP)
- [ ] Surrogate keys used where natural keys are unstable
- [ ] Data types chosen for storage efficiency (SMALLINT vs INT vs BIGINT)
- [ ] `TIMESTAMPTZ` for wall-clock times, `DATE` for date-only
- [ ] `DECIMAL(p,s)` for monetary values, never FLOAT/REAL
- [ ] ENUM or CHECK for finite value sets

### Migration Safety

- [ ] Migrations are idempotent or have rollback scripts
- [ ] `CREATE INDEX CONCURRENTLY` used on production tables (PostgreSQL)
- [ ] `ADD COLUMN ... NOT NULL` includes a DEFAULT value
- [ ] Column renames done as add-backfill-switch-drop
- [ ] Large table DDL tested for lock duration
- [ ] No destructive operations without backup verification

## Testing & Validation

### Data Integrity Verification

- [ ] Referential integrity verified: no orphaned child rows
- [ ] Consistency checks pass: no negative quantities, invalid dates, etc.
- [ ] Boundary conditions tested: empty result sets, single row, max rows
- [ ] NULL handling verified in application layer for all nullable columns
- [ ] Concurrent access tested: race conditions on INSERT/UPDATE/DELETE

### Performance Testing

- [ ] Queries tested with production-scale data volumes
- [ ] Execution plans reviewed via EXPLAIN ANALYZE (or equivalent)
- [ ] Load testing performed for high-frequency queries
- [ ] Regression tests confirm optimizations do not break functionality
- [ ] Index usage verified: new indexes actually used by the query planner

### Error Handling

- [ ] Application handles database connection failures gracefully
- [ ] Deadlock retry logic implemented where applicable
- [ ] Constraint violation errors caught and translated to user-friendly messages
- [ ] Timeout configured for long-running queries
- [ ] Connection pool exhaustion handled with backoff

## Monitoring & Observability

### Query Performance Monitoring

- [ ] Slow query logging enabled (pg_stat_statements, slow_log, etc.)
- [ ] Alerts configured for queries exceeding latency thresholds
- [ ] Query performance trends tracked over time
- [ ] Index usage monitored; unused indexes flagged for removal
- [ ] Database size growth tracked and forecasted

### Operational Health

- [ ] Connection pool utilization monitored
- [ ] Autovacuum activity tracked for high-write tables
- [ ] Replication lag monitored (if applicable)
- [ ] Disk space alerts configured with sufficient lead time
- [ ] Backup success verified and restore tested periodically

### Logging

- [ ] Appropriate log verbosity: not too noisy, not too silent
- [ ] Query parameters logged separately from query text (no PII in logs)
- [ ] Error logs include query context (table, operation, user)
- [ ] Log rotation configured to prevent disk exhaustion
