---
name: csp-db-migration
description: >
  Database migration best practices for schema changes, data migrations, rollbacks,
  and zero-downtime deployments across PostgreSQL and MySQL and common ORMs/tools
  (Prisma, Drizzle, TypeORM, Knex, Django, Alembic, Flyway, golang-migrate, Atlas).
  Execute zero-downtime migrations using expand-contract patterns, online schema
  changes, and safe CI/CD pipeline integration. Use when planning or implementing
  database schema changes.
version: 0.1.0
metadata:
  origin: CSP
layer: 4
category: patterns
---

# Database Migration Patterns

Execute schema and data migrations with zero downtime using the expand-contract pattern, online schema change tools, and safe CI/CD integration.

## When to Activate

- Adding, modifying, or removing database columns, tables, or indexes
- Performing data migrations or backfill operations on production data
- Renaming columns or changing column types without downtime
- Running migrations as part of a CI/CD deployment pipeline
- Migrating large tables (millions of rows) without locking
- Setting up multi-tenant migration across multiple databases

## Migration Tool Comparison

| Tool             | Language   | DB Support             | Approach          | Best For               |
|------------------|------------|------------------------|-------------------|------------------------|
| Prisma           | TypeScript | Postgres, MySQL, SQLite | Declarative (schema.prisma) | TypeScript full-stack |
| Drizzle          | TypeScript | Postgres, MySQL, SQLite | SQL-like (type-safe) | TypeScript with SQL control |
| TypeORM          | TypeScript | Postgres, MySQL, SQLite, MSSQL | Entity decorators + generated migrations | NestJS / decorator-based apps |
| Knex             | TypeScript | Postgres, MySQL, SQLite | Imperative (builder) | Legacy Node.js projects |
| Alembic          | Python     | PostgreSQL, MySQL, SQLite | Imperative (scripts) | Python/SQLAlchemy     |
| Django Migrations| Python     | Postgres, MySQL, SQLite | Auto-generated from models | Django projects (built-in) |
| Flyway           | Java/SQL   | Postgres, MySQL, Oracle, SQL Server | SQL file versioning | Java/JVM projects    |
| golang-migrate   | Go/SQL     | Postgres, MySQL, SQLite | SQL file versioning | Go projects            |
| Atlas            | Multi      | Postgres, MySQL, SQLite | Declarative + SQL  | Polyglot teams         |

### Tool Decision Tree

```
What language/framework?
  TypeScript/Node.js ->
    Using Prisma ORM?       -> Prisma Migrate
    Want SQL control?       -> Drizzle Kit
    Legacy project?         -> Knex
  Python ->
    Using SQLAlchemy?       -> Alembic
    Using Django?           -> Django Migrations (built-in)
  Go ->
    Want SQL files?         -> golang-migrate
    Want declarative?       -> Atlas
  Java/JVM ->
    SQL file versioning?    -> Flyway
    Spring Boot?            -> Flyway or Liquibase
```

### ORM/Tool Command Reference

```bash
# Prisma (declarative — edit schema.prisma, then)
npx prisma migrate dev --name add_handle    # create + apply in dev
npx prisma migrate deploy                    # apply pending in prod/CI

# Drizzle (SQL-like — edit schema.ts, then)
npx drizzle-kit generate                     # generate SQL migration
npx drizzle-kit migrate                      # apply migrations

# TypeORM (entity decorators)
npx typeorm migration:generate -d ds.ts src/migrations/AddHandle  # diff entities
npx typeorm migration:run -d ds.ts           # apply
npx typeorm migration:revert -d ds.ts        # roll back last

# Knex
npx knex migrate:make add_handle
npx knex migrate:latest
npx knex migrate:rollback

# Django (auto-generated from models)
python manage.py makemigrations
python manage.py migrate
python manage.py migrate app 0007            # roll back to a specific migration

# Alembic (Python/SQLAlchemy)
alembic revision --autogenerate -m "add handle"
alembic upgrade head
alembic downgrade -1

# golang-migrate (Go/SQL file versioning)
migrate create -ext sql -dir migrations -seq add_handle
migrate -path migrations -database "$DATABASE_URL" up
migrate -path migrations -database "$DATABASE_URL" down 1

# Flyway (Java/JVM, SQL file versioning)
flyway migrate
flyway info
flyway undo                                  # Teams edition

# Atlas (declarative + versioned, polyglot)
atlas migrate diff add_handle --env local
atlas migrate apply --env local
```

## Migration Types

### Schema Migrations

```sql
-- Add a new column (safe — no downtime)
ALTER TABLE users ADD COLUMN display_name VARCHAR(255);

-- Add an index concurrently (PostgreSQL — no lock)
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);

-- Add a table
CREATE TABLE IF NOT EXISTS user_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  theme VARCHAR(20) DEFAULT 'light',
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Data Migrations

```python
# Alembic data migration example
from alembic import op
import sqlalchemy as sa

def upgrade():
    # Add column first (schema migration)
    op.add_column('users', sa.Column('full_name', sa.String(255)))

    # Then backfill data
    op.execute("""
        UPDATE users
        SET full_name = first_name || ' ' || last_name
        WHERE full_name IS NULL
    """)

def downgrade():
    op.drop_column('users', 'full_name')
```

### Backfill Operations (Large Tables)

```python
# Batched backfill for large tables
import time

BATCH_SIZE = 1000
SLEEP_BETWEEN = 0.1  # seconds

def backfill_display_names():
    """Backfill display_name from first_name for all users."""
    last_id = 0
    total_updated = 0

    while True:
        result = db.execute("""
            UPDATE users
            SET display_name = first_name
            WHERE id IN (
                SELECT id FROM users
                WHERE id > %(last_id)s
                  AND display_name IS NULL
                ORDER BY id
                LIMIT %(batch_size)s
            )
            RETURNING id
        """, {"last_id": last_id, "batch_size": BATCH_SIZE})

        rows = result.fetchall()
        if not rows:
            break

        last_id = rows[-1][0]
        total_updated += len(rows)
        print(f"Updated {total_updated} rows (last_id: {last_id})")

        time.sleep(SLEEP_BETWEEN)

    print(f"Backfill complete: {total_updated} total rows updated")
```

## Zero-Downtime Migration Patterns

### Expand-Contract Pattern

The gold standard for zero-downtime schema changes. Five phases:

```
Phase 1: EXPAND    — Add new column/table (deploy code handles both old and new)
Phase 2: DUAL-WRITE — Write to both old and new columns
Phase 3: BACKFILL   — Copy existing data from old to new
Phase 4: SWITCH     — Read from new column only
Phase 5: CONTRACT   — Drop old column (after verifying no references remain)
```

#### Example: Renaming `username` to `handle`

```sql
-- Phase 1: EXPAND (deploy #1)
ALTER TABLE users ADD COLUMN handle VARCHAR(50);
CREATE INDEX CONCURRENTLY idx_users_handle ON users(handle);
```

```typescript
// Phase 1 application code — reads from old, writes to both
class UserRepository {
  async create(data: CreateUserInput) {
    return db.users.create({
      data: {
        ...data,
        username: data.handle,  // write to old
        handle: data.handle,    // write to new
      },
    });
  }

  async findById(id: number) {
    const user = await db.users.findUnique({ where: { id } });
    return {
      ...user,
      handle: user.handle || user.username,  // prefer new, fallback old
    };
  }
}
```

```sql
-- Phase 3: BACKFILL (run as data migration script)
UPDATE users SET handle = username WHERE handle IS NULL;
```

```typescript
// Phase 4: SWITCH (deploy #2) — read from new only
class UserRepository {
  async findById(id: number) {
    return db.users.findUnique({ where: { id } });
    // handle is now the single source of truth
  }
}
```

```sql
-- Phase 5: CONTRACT (deploy #3, after monitoring period)
ALTER TABLE users DROP COLUMN username;
DROP INDEX idx_users_username;
```

### Online Schema Changes (MySQL)

```sql
-- pt-online-schema-change for MySQL (no table locks)
-- Add a column to a large table
pt-online-schema-change \
  --alter "ADD COLUMN status ENUM('active','inactive') DEFAULT 'active'" \
  D=myapp,t=users \
  --execute

-- Rename a column
pt-online-schema-change \
  --alter "CHANGE username handle VARCHAR(50)" \
  D=myapp,t=users \
  --execute

-- Add an index
pt-online-schema-change \
  --alter "ADD INDEX idx_email (email)" \
  D=myapp,t=users \
  --execute
```

```bash
# gh-ost (GitHub's online schema migration tool)
gh-ost \
  --host=db.example.com \
  --database=myapp \
  --table=users \
  --alter="ADD COLUMN status VARCHAR(20) DEFAULT 'active'" \
  --execute \
  --throttle-query="SELECT COUNT(*) FROM users WHERE updated_at > NOW() - INTERVAL 1 SECOND"
```

### Non-Blocking Index Creation (PostgreSQL)

```sql
-- Always use CONCURRENTLY for production index creation
CREATE INDEX CONCURRENTLY idx_orders_user_id ON orders(user_id);

-- Monitor progress
SELECT
  indexrelid::regclass AS index_name,
  indisvalid,
  pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_index
WHERE indrelid = 'orders'::regclass;

-- If a concurrent index creation fails, it leaves an INVALID index
-- Drop it and retry
DROP INDEX CONCURRENTLY idx_orders_user_id;
```

## Dangerous Operations

### Operations Requiring the Expand-Contract Pattern

| Operation                    | Risk                     | Safe Approach                    |
|------------------------------|--------------------------|----------------------------------|
| Rename column                | Breaks running code      | Expand-contract (add, dual-write, migrate, switch, drop) |
| Change column type           | Locks table (MySQL)      | Add new column, dual-write with cast, backfill, switch |
| Add NOT NULL to existing col | Locks table + fails if nulls exist | Add nullable, backfill, add constraint |
| Rename table                 | Breaks all references    | Create new, dual-write, migrate, switch, drop |
| Drop column                  | Cannot undo              | Keep column, stop writing to it, drop after safety period |
| Add unique constraint        | Locks table for validation | Create index CONCURRENTLY, then add constraint |

### Adding NOT NULL to an Existing Column

```sql
-- WRONG: This locks the table and fails if any NULL values exist
ALTER TABLE users ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active';

-- RIGHT: Three-step process
-- Step 1: Add as nullable with default
ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'active';

-- Step 2: Backfill existing rows
UPDATE users SET status = 'active' WHERE status IS NULL;

-- Step 3: Add NOT NULL constraint (PostgreSQL 11+: no table rewrite needed with default)
ALTER TABLE users ALTER COLUMN status SET NOT NULL;
```

### Changing a Column Type

```sql
-- WRONG: Locks the table for the entire rewrite
ALTER TABLE orders ALTER COLUMN amount TYPE NUMERIC(10,2);

-- RIGHT: Expand-contract
-- 1. Add new column
ALTER TABLE orders ADD COLUMN amount_v2 NUMERIC(10,2);

-- 2. Dual-write (update application code to write both)
-- 3. Backfill in batches
UPDATE orders SET amount_v2 = amount::NUMERIC(10,2)
WHERE id IN (SELECT id FROM orders WHERE amount_v2 IS NULL LIMIT 1000);

-- 4. Switch reads (update application code)
-- 5. Drop old column
ALTER TABLE orders DROP COLUMN amount;
ALTER TABLE orders RENAME COLUMN amount_v2 TO amount;
```

## Migration Testing

### Dry-Run Against Production Clone

```bash
#!/bin/bash
# test-migration.sh — test migration against a production clone
set -euo pipefail

PROD_DB="myapp_production"
CLONE_DB="myapp_migration_test"
MIGRATION_DIR="./migrations"

echo "=== Migration Dry-Run ==="

# 1. Clone production schema + sample data
echo "Cloning production database..."
pg_dump -Fc "$PROD_DB" | pg_restore -d "$CLONE_DB" --clean --if-exists

# 2. Record pre-migration state
echo "Recording pre-migration state..."
psql -d "$CLONE_DB" -c "
  SELECT tablename, n_live_tup
  FROM pg_stat_user_tables
  ORDER BY tablename
" > /tmp/pre_migration_state.txt

# 3. Run migrations
echo "Running migrations..."
npm run migrate -- --database "$CLONE_DB"

# 4. Record post-migration state
echo "Recording post-migration state..."
psql -d "$CLONE_DB" -c "
  SELECT tablename, n_live_tup
  FROM pg_stat_user_tables
  ORDER BY tablename
" > /tmp/post_migration_state.txt

# 5. Run application smoke tests against clone
echo "Running smoke tests..."
DATABASE_URL="postgresql://localhost:5432/$CLONE_DB" npm run test:integration

# 6. Test rollback
echo "Testing rollback..."
npm run migrate:rollback -- --database "$CLONE_DB"

# 7. Cleanup
dropdb "$CLONE_DB"

echo "=== Migration Dry-Run Complete ==="
```

### Rollback Verification

```typescript
// migration file with both up and down
export async function up(db: Knex) {
  await db.schema.alterTable('users', (table) => {
    table.string('handle', 50);
    table.index('handle');
  });
}

export async function down(db: Knex) {
  await db.schema.alterTable('users', (table) => {
    table.dropIndex('handle');
    table.dropColumn('handle');
  });
}
```

## Large Table Migrations

### Batched Migration with Progress Tracking

```python
# large_table_migration.py
import time
import logging

logger = logging.getLogger(__name__)

BATCH_SIZE = 5000
THROTTLE_SECONDS = 0.5
MAX_RETRIES = 3

def migrate_large_table(db, table_name: str, source_col: str, target_col: str):
    """Migrate data from source_col to target_col in batches."""

    # Get total count for progress
    total = db.execute(f"SELECT count(*) FROM {table_name} WHERE {target_col} IS NULL").scalar()
    logger.info(f"Total rows to migrate: {total}")

    processed = 0
    batch_num = 0

    while processed < total:
        batch_num += 1

        for attempt in range(MAX_RETRIES):
            try:
                result = db.execute(f"""
                    UPDATE {table_name}
                    SET {target_col} = {source_col}
                    WHERE id IN (
                        SELECT id FROM {table_name}
                        WHERE {target_col} IS NULL
                        ORDER BY id
                        LIMIT :batch_size
                    )
                """, {"batch_size": BATCH_SIZE})

                rows_updated = result.rowcount
                processed += rows_updated
                progress = (processed / total) * 100

                logger.info(
                    f"Batch {batch_num}: {rows_updated} rows "
                    f"({processed}/{total}, {progress:.1f}%)"
                )

                break  # success, exit retry loop

            except Exception as e:
                logger.warning(f"Batch {batch_num} attempt {attempt + 1} failed: {e}")
                if attempt == MAX_RETRIES - 1:
                    raise
                time.sleep(2 ** attempt)  # exponential backoff

        if rows_updated == 0:
            break

        time.sleep(THROTTLE_SECONDS)

    logger.info(f"Migration complete: {processed} rows processed in {batch_num} batches")
```

### Throttling Based on Database Load

```python
import time
import psycopg2

def get_db_load(conn) -> float:
    """Get current database load as a percentage."""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT
              (SELECT count(*) FROM pg_stat_activity WHERE state = 'active')::float
              / (SELECT setting::int FROM pg_settings WHERE name = 'max_connections')
              * 100
        """)
        return cur.fetchone()[0]

def throttled_migration(conn, query: str, batch_size: int = 1000):
    """Run migration with adaptive throttling based on DB load."""
    cursor = conn.cursor()
    max_load = 50.0  # throttle if DB load exceeds 50%

    while True:
        # Check current load
        load = get_db_load(conn)

        if load > max_load:
            sleep_time = min(10, load / 10)  # adaptive sleep
            print(f"DB load at {load:.1f}%, sleeping {sleep_time:.1f}s")
            time.sleep(sleep_time)
            continue

        cursor.execute(query + " LIMIT %s", (batch_size,))
        if cursor.rowcount == 0:
            break

        conn.commit()
        print(f"Processed {cursor.rowcount} rows (DB load: {load:.1f}%)")
        time.sleep(0.2)
```

## Multi-Tenant Migration

### Running Migrations Across Tenant Databases

```python
# multi_tenant_migrate.py
import os
import subprocess

def get_tenant_databases():
    """Discover all tenant databases."""
    # Option 1: From a central registry database
    result = subprocess.run(
        ["psql", "-d", "registry", "-tAc",
         "SELECT database_url FROM tenants WHERE status = 'active'"],
        capture_output=True, text=True
    )
    return [url.strip() for url in result.stdout.strip().split('\n') if url.strip()]

    # Option 2: From environment/config
    # return json.loads(os.environ["TENANT_DATABASES"])

def migrate_all_tenants(migration_command: str):
    """Run migration across all tenant databases."""
    tenants = get_tenant_databases()
    results = {"success": [], "failed": []}

    for tenant_db in tenants:
        print(f"Migrating tenant: {tenant_db}")
        try:
            env = os.environ.copy()
            env["DATABASE_URL"] = tenant_db

            result = subprocess.run(
                migration_command.split(),
                env=env,
                capture_output=True,
                text=True,
                timeout=300,  # 5-minute timeout per tenant
            )

            if result.returncode == 0:
                results["success"].append(tenant_db)
                print(f"  OK: {tenant_db}")
            else:
                results["failed"].append((tenant_db, result.stderr))
                print(f"  FAILED: {tenant_db} — {result.stderr[:200]}")

        except subprocess.TimeoutExpired:
            results["failed"].append((tenant_db, "Timeout"))
            print(f"  TIMEOUT: {tenant_db}")

    print(f"\nResults: {len(results['success'])} success, {len(results['failed'])} failed")
    if results["failed"]:
        print("Failed tenants:")
        for db, error in results["failed"]:
            print(f"  {db}: {error}")

    return results
```

### Tenant Migration with Parallel Execution

```python
# parallel_tenant_migrate.py
from concurrent.futures import ThreadPoolExecutor, as_completed

def migrate_tenant(db_url: str) -> tuple[str, bool, str]:
    """Migrate a single tenant database."""
    try:
        result = subprocess.run(
            ["npm", "run", "migrate"],
            env={**os.environ, "DATABASE_URL": db_url},
            capture_output=True, text=True, timeout=300
        )
        return (db_url, result.returncode == 0, result.stderr[:200])
    except Exception as e:
        return (db_url, False, str(e))

def migrate_tenants_parallel(tenant_dbs: list[str], max_workers: int = 4):
    """Migrate tenant databases in parallel."""
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(migrate_tenant, db): db for db in tenant_dbs}

        for future in as_completed(futures):
            db_url, success, message = future.result()
            status = "OK" if success else f"FAILED: {message}"
            print(f"[{status}] {db_url}")
```

## CI/CD Integration

### GitHub Actions Migration Pipeline

```yaml
# .github/workflows/migrate.yml
name: Database Migration

on:
  push:
    branches: [main]
    paths:
      - 'migrations/**'

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Run migrations
        run: npm run migrate
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

      - name: Verify migration
        run: npm run migrate:status
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

### Safe Deployment Order

```yaml
# Two-phase deployment for zero-downtime migrations
# Phase 1: Run migration (expand)
deploy-migration:
  steps:
    - run: npm run migrate:up
      env:
        DATABASE_URL: ${{ secrets.DATABASE_URL }}

# Phase 2: Deploy new application code
deploy-app:
  needs: deploy-migration
  steps:
    - run: vercel deploy --prod

# Phase 3 (later): Run cleanup migration (contract)
# deploy-cleanup:
#   steps:
#     - run: npm run migrate:cleanup
```

### Prisma Migration in CI/CD

```yaml
# .github/workflows/prisma-migrate.yml
name: Prisma Migration

on:
  push:
    branches: [main]

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Prisma migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

      - name: Generate Prisma client
        run: npx prisma generate
```

## Anti-Patterns

### Quick Reference

| Anti-Pattern | Why It's Bad | Do This Instead |
|--------------|--------------|-----------------|
| Manual SQL in production | No audit trail, unrepeatable | Always use migration files |
| Editing deployed migrations | Causes drift between environments | Create a new migration instead |
| NOT NULL without default | Locks table, rewrites all rows | Add nullable, backfill, then add constraint |
| Inline index on large table | Blocks writes during build | `CREATE INDEX CONCURRENTLY` |
| Schema + data in one migration | Hard to rollback, long transactions | Separate migrations |
| Dropping column before removing code | Application errors on missing column | Remove code first, drop column next deploy |

### Detailed Guidance

- **Running destructive migrations without a rollback plan**: Every migration must have a tested `down()` function. Before deploying, verify the rollback works against a production clone. If a column might contain data you need later, drop it only after a safety period (7-30 days).
- **Renaming columns in a single deploy**: A direct `ALTER TABLE RENAME COLUMN` breaks all running application instances that reference the old name. Always use the expand-contract pattern across multiple deployments.
- **Running migrations during peak traffic**: Schedule migrations during low-traffic windows. Even non-locking operations (concurrent index creation) consume I/O and CPU that could affect query performance.
- **Not testing migrations against production-scale data**: A migration that runs in 2 seconds on a 100-row staging database might take hours on a 10-million-row production table. Always test against a production clone with realistic data volumes.
- **Skipping the backfill verification step**: After backfilling data, verify that no rows were missed. Run `SELECT count(*) FROM users WHERE new_column IS NULL` before proceeding to the switch phase.
- **Mixing schema migrations with data migrations in the same file**: Keep schema changes (DDL) and data transformations (DML) in separate migration files. This makes rollbacks cleaner and allows data migrations to be re-run independently.

## Related Skills

- [[csp-db-backup]]
- [[csp-platform-deploy]]
- [[csp-vps-deploy]]
