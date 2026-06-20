---
name: csp-database-migrations
description: >
  Database migration best practices for schema changes, data migrations, rollbacks,
  and zero-downtime deployments across PostgreSQL, MySQL, and common ORMs (Prisma,
  Drizzle, Django, TypeORM, golang-migrate). Use when planning or implementing
  database schema changes.
metadata:
  origin: CSP
layer: 4
category: patterns
---

| Anti-Pattern | Why It's Bad | Do This Instead |
|--------------|--------------|-----------------|
| Manual SQL in production | No audit trail, unrepeatable | Always use migration files |
| Editing deployed migrations | Causes drift between environments | Create new migration instead |
| NOT NULL without default | Locks table, rewrites all rows | Add nullable, backfill, then add constraint |
| Inline index on large table | Blocks writes during build | CREATE INDEX CONCURRENTLY |
| Schema + data in one migration | Hard to rollback, long transactions | Separate migrations |
| Dropping column before removing code | Application errors on missing column | Remove code first, drop column next deploy |

## When to Use This Skill

- Planning database schema changes
- Implementing zero-downtime migrations
- Setting up migration tooling
- Troubleshooting migration issues
- Reviewing migration pull requests
