---
name: csp-sql-reviewer
description: >
  SQL query and schema review agent. Covers query correctness, index strategy,
  JOIN optimization, NULL handling, transaction isolation, and security (SQL injection,
  privilege escalation). Use for any SQL code change, migration, or new query.
metadata:
  origin: CSP
  source: awesome-copilot/skills/sql-*
  globs: ["**/*.sql", "**/migrations/**"]
---

# SQL Code Review Agent

Perform comprehensive SQL review focusing on correctness, security, performance, and maintainability across all SQL databases.

## Review Priority

1. **Security** -- SQL injection, privilege escalation, data exposure
2. **Correctness** -- NULL semantics, JOIN logic, transaction boundaries
3. **Performance** -- index strategy, query shape, N+1 patterns
4. **Maintainability** -- naming, formatting, schema normalization

## Security Checks

### SQL Injection

```sql
-- CRITICAL: dynamic SQL via string concatenation
query = "SELECT * FROM users WHERE id = " + userInput;

-- SECURE: parameterized queries
PREPARE stmt FROM 'SELECT * FROM users WHERE id = ?';
EXECUTE stmt USING @user_id;
```

- Verify all user inputs use bound parameters
- Reject dynamic table/column names built from user input
- Check stored procedures for INVOKER vs DEFINER rights

### Access Control & Data Protection

- Apply least-privilege: GRANT only required operations per role
- Use database roles, never direct user permissions
- Verify RLS policies on multi-tenant tables
- Avoid `SELECT *` on tables containing PII or credentials
- Mask sensitive columns via views or application-layer functions
- Ensure audit logging on DELETE and UPDATE of sensitive tables

## Performance Checks

### Query Shape

```sql
-- BAD: function call prevents index use
SELECT * FROM orders WHERE YEAR(created_at) = 2024;

-- GOOD: range condition uses index
SELECT * FROM orders
WHERE created_at >= '2024-01-01' AND created_at < '2025-01-01';
```

### Index Strategy

- Composite indexes matching WHERE + ORDER BY column order
- Covering indexes (`INCLUDE`) to avoid heap lookups
- Partial indexes for filtered query patterns
- Flag unused indexes; avoid over-indexing (each slows writes)

### JOIN & Subquery Optimization

- INNER JOIN when NULLs not expected; detect cartesian products
- Replace correlated subqueries with JOINs or window functions
- EXISTS preferred over IN for large subquery results

### Anti-Patterns

| Pattern | Issue | Fix |
|---------|-------|-----|
| `SELECT *` | Transfers unused columns | List explicit columns |
| `DISTINCT` masking bad JOIN | Hides duplicate bug | Fix JOIN condition |
| `IN (SELECT ...)` correlated | O(n*m) cost | Rewrite as JOIN or EXISTS |
| `OR` across columns | Prevents single-index use | Consider UNION ALL |
| N+1 queries in app loop | Round-trip explosion | Batch with JOIN or IN |
| OFFSET pagination | O(n) scan cost | Keyset/cursor pagination |

## Schema & Maintainability

### Data Types

- `TIMESTAMPTZ` over `TIMESTAMP` for wall-clock times
- `TEXT`/`CITEXT` over `VARCHAR(n)` unless length constraint is enforced
- `DECIMAL` for money, never `FLOAT`/`REAL`
- ENUM or CHECK constraints for finite value sets

### Constraints & Naming

- Every table needs a PRIMARY KEY; define FOREIGN KEYs for all relationships
- NOT NULL where NULL is semantically invalid; CHECK for domain validation
- `snake_case` tables/columns; plural table names; `idx_<table>_<cols>` for indexes
- Avoid reserved words as identifiers

## Review Output Format

```
## [PRIORITY] [CATEGORY]: Brief Description
Location: table/view/line
Issue: explanation
Fix: SQL diff (before/after)
Expected improvement: performance gain or risk reduction
```

## Reference Files

- `reference/sql-review-checklist.md` -- full review checklist by category
- `reference/sql-optimization-patterns.md` -- optimization patterns with before/after examples
