# SQL Optimization Patterns

Database-agnostic optimization patterns with before/after examples. Each pattern targets a specific anti-class and provides a verified rewrite.

## 1. Function-in-WHERE Elimination

Applying functions to indexed columns in WHERE clauses prevents the query planner from using B-tree indexes.

### Pattern

```sql
-- SLOW: function wraps the indexed column
SELECT * FROM orders WHERE YEAR(created_at) = 2024;

-- FAST: range predicate uses index directly
SELECT * FROM orders
WHERE created_at >= '2024-01-01' AND created_at < '2025-01-01';
```

### More Examples

```sql
-- SLOW
SELECT * FROM users WHERE UPPER(email) = 'JOHN@EXAMPLE.COM';
-- FAST: store normalized value or use expression index
SELECT * FROM users WHERE email = 'john@example.com';
-- Or: CREATE INDEX idx_users_lower_email ON users(LOWER(email));

-- SLOW
SELECT * FROM events WHERE DATE(created_at) = '2024-06-15';
-- FAST
SELECT * FROM events
WHERE created_at >= '2024-06-15' AND created_at < '2024-06-16';
```

### When Expression Indexes Help

If the function call is unavoidable, create an expression index:

```sql
CREATE INDEX idx_orders_year ON orders(EXTRACT(YEAR FROM created_at));
SELECT * FROM orders WHERE EXTRACT(YEAR FROM created_at) = 2024;
```

## 2. Correlated Subquery to JOIN

Correlated subqueries execute once per outer row, producing O(n*m) cost.

### Scalar Subquery Rewrite

```sql
-- SLOW: subquery runs for each row in products
SELECT p.name, p.price,
       (SELECT AVG(price) FROM products p2 WHERE p2.category_id = p.category_id) AS avg_price
FROM products p;

-- FAST: window function, single scan
SELECT name, price,
       AVG(price) OVER (PARTITION BY category_id) AS avg_price
FROM products;
```

### EXISTS Subquery Rewrite

```sql
-- SLOW: IN with correlated subquery
SELECT * FROM customers c
WHERE c.id IN (SELECT o.customer_id FROM orders o WHERE o.total > 1000);

-- FAST: EXISTS with semi-join
SELECT * FROM customers c
WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id AND o.total > 1000);
```

### Derived Table Rewrite

```sql
-- SLOW: repeated scalar subqueries
SELECT user_id,
       (SELECT COUNT(*) FROM orders WHERE user_id = u.id) AS order_count,
       (SELECT SUM(total) FROM orders WHERE user_id = u.id) AS total_spent
FROM users u;

-- FAST: single JOIN with aggregation
SELECT u.id, COALESCE(o.order_count, 0), COALESCE(o.total_spent, 0)
FROM users u
LEFT JOIN (
    SELECT user_id, COUNT(*) AS order_count, SUM(total) AS total_spent
    FROM orders GROUP BY user_id
) o ON u.id = o.user_id;
```

## 3. OFFSET Pagination to Keyset Pagination

OFFSET requires the database to scan and discard N rows before returning results.

### Pattern

```sql
-- SLOW: scans 10020 rows, returns 20
SELECT * FROM products ORDER BY created_at DESC OFFSET 10000 LIMIT 20;

-- FAST: uses index seek from cursor position
SELECT * FROM products
WHERE created_at < :last_seen_created_at
ORDER BY created_at DESC
LIMIT 20;
```

### Composite Sort Key

When ordering by multiple columns, encode the cursor as a composite tuple:

```sql
-- Page 1
SELECT * FROM posts ORDER BY category, created_at DESC LIMIT 20;

-- Page N (cursor: last_category, last_created_at)
SELECT * FROM posts
WHERE (category, created_at) < (:last_category, :last_created_at)
ORDER BY category, created_at DESC
LIMIT 20;
```

### When OFFSET Is Acceptable

OFFSET is fine when the total result set is small (< 1000 rows) or when the user explicitly needs page numbers (admin dashboards with bounded data).

## 4. OR-to-UNION Transformation

Complex OR conditions across different columns prevent the optimizer from using any single index efficiently.

### Pattern

```sql
-- SLOW: OR across unrelated columns
SELECT * FROM products
WHERE (category = 'electronics' AND price < 1000)
   OR (category = 'books' AND price < 50);

-- FAST: each branch optimizes independently
SELECT * FROM products WHERE category = 'electronics' AND price < 1000
UNION ALL
SELECT * FROM products WHERE category = 'books' AND price < 50;
```

### Same-Column OR (Keep It)

When OR applies to the same column, the optimizer can use a single index:

```sql
-- This is fine: same-column OR
SELECT * FROM orders WHERE status = 'pending' OR status = 'processing';

-- Even better: IN clause
SELECT * FROM orders WHERE status IN ('pending', 'processing');
```

## 5. SELECT * Elimination

Selecting all columns transfers unnecessary data and prevents covering index usage.

### Pattern

```sql
-- SLOW: transfers all columns, prevents index-only scan
SELECT * FROM users u
JOIN orders o ON u.id = o.user_id
WHERE u.status = 'active';

-- FAST: explicit columns, enables covering indexes
SELECT u.id, u.name, u.email, o.id AS order_id, o.total
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE u.status = 'active';
```

## 6. N+1 Query Elimination

Application loops that issue one query per row cause N+1 round trips.

### Pattern (Application Layer)

```python
# SLOW: N+1 queries
users = db.query("SELECT * FROM users WHERE department = 'engineering'")
for user in users:
    user.orders = db.query("SELECT * FROM orders WHERE user_id = ?", user.id)

# FAST: 2 queries total
users = db.query("SELECT * FROM users WHERE department = 'engineering'")
user_ids = [u.id for u in users]
orders = db.query("SELECT * FROM orders WHERE user_id IN ?", user_ids)
# Group orders by user_id in application code
```

### Single JOIN Alternative

```sql
SELECT u.id, u.name, o.id AS order_id, o.total
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.department = 'engineering';
```

## 7. Conditional Aggregation

Multiple queries with different WHERE filters can be combined into a single scan.

### Pattern

```sql
-- SLOW: 3 separate scans
SELECT COUNT(*) FROM orders WHERE status = 'pending';
SELECT COUNT(*) FROM orders WHERE status = 'shipped';
SELECT COUNT(*) FROM orders WHERE status = 'delivered';

-- FAST: single scan with conditional aggregation
SELECT
    COUNT(*) FILTER (WHERE status = 'pending') AS pending,
    COUNT(*) FILTER (WHERE status = 'shipped') AS shipped,
    COUNT(*) FILTER (WHERE status = 'delivered') AS delivered
FROM orders;

-- Portable alternative (works on all SQL databases)
SELECT
    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
    SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END) AS shipped,
    SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS delivered
FROM orders;
```

## 8. Covering Index Design

A covering index includes all columns needed by a query, avoiding heap lookups entirely.

### Pattern

```sql
-- Query that needs: user_id (filter), created_at (sort), total, status (select)
-- Without covering index: Index Scan + Heap Fetch

CREATE INDEX idx_orders_covering
ON orders(user_id, created_at)
INCLUDE (total, status);  -- PostgreSQL 11+ / SQL Server syntax

-- Now the query can be served entirely from the index
SELECT total, status FROM orders
WHERE user_id = 42
ORDER BY created_at DESC
LIMIT 10;
```

### When to Use Covering Indexes

- High-frequency queries (called thousands of times per second)
- Tables with wide rows where heap fetch is expensive
- Read-heavy workloads where extra index size is acceptable

### When NOT to Use

- Tables with frequent INSERT/UPDATE (each write must update the index too)
- Queries that select most columns (the index becomes a copy of the table)
- Low-frequency admin or reporting queries

## 9. Batch Operations

Row-by-row DML is slow due to per-statement overhead and transaction log writes.

### Pattern

```sql
-- SLOW: N individual inserts
INSERT INTO products (name, price) VALUES ('A', 10.00);
INSERT INTO products (name, price) VALUES ('B', 15.00);
INSERT INTO products (name, price) VALUES ('C', 20.00);

-- FAST: single multi-row insert
INSERT INTO products (name, price) VALUES
    ('A', 10.00), ('B', 15.00), ('C', 20.00);
```

### Upsert Pattern

```sql
-- SLOW: SELECT then conditional INSERT/UPDATE
SELECT id FROM products WHERE sku = 'ABC';
-- app logic: if exists UPDATE else INSERT

-- FAST: single atomic upsert
INSERT INTO products (sku, name, price)
VALUES ('ABC', 'Widget', 9.99)
ON CONFLICT (sku) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;
```

### Bulk Update with FROM

```sql
-- SLOW: update one row at a time in a loop
UPDATE products SET price = 12.99 WHERE id = 1;
UPDATE products SET price = 15.99 WHERE id = 2;

-- FAST: bulk update via JOIN
UPDATE products p
SET price = upd.new_price
FROM (VALUES (1, 12.99), (2, 15.99)) AS upd(id, new_price)
WHERE p.id = upd.id;
```

## 10. DISTINCT Misuse

DISTINCT is often used to mask duplicate rows caused by incorrect JOINs.

### Pattern

```sql
-- BAD: DISTINCT hides a JOIN bug
SELECT DISTINCT u.name
FROM users u
JOIN orders o ON u.id = o.user_id;
-- This returns one row per unique name, but duplicates came from multiple orders

-- GOOD: understand what you actually want
-- If you want unique users who have orders:
SELECT u.name
FROM users u
WHERE EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id);

-- If you want user names with order counts:
SELECT u.name, COUNT(o.id) AS order_count
FROM users u
JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name;
```

### When DISTINCT Is Appropriate

- Deduplicating results from a UNION (without ALL)
- Getting unique values from a single column for dropdown lists
- Removing duplicates from a denormalized reporting view
