---
name: django-patterns
description: Django architecture patterns, REST API design with DRF, ORM best practices, caching, signals, middleware, and production-grade Django apps.
origin: CSP
layer: 4
category: patterns
---

| Pattern | Purpose |
|---------|---------|
| Split settings | Separate dev/prod/test settings |
| Custom QuerySet | Reusable query methods |
| Service Layer | Business logic separation |
| ViewSet | REST API endpoints |
| Serializer validation | Request/response transformation |
| select_related | Foreign key optimization |
| prefetch_related | Many-to-many optimization |
| Cache first | Cache expensive operations |
| Signals | Event-driven actions |
| Middleware | Request/response processing |

## Anti-Patterns

- Putting all settings in one file
- N+1 queries without `select_related` or `prefetch_related`
- Business logic in views instead of service layer
- Using exceptions for control flow
- Ignoring database indexes on frequently queried fields
- Bulk operations without `bulk_create`/`bulk_update`

Remember: Django provides many shortcuts, but for production applications, structure and organization matter more than concise code. Build for maintainability.

## References

- [references/models-patterns.md](references/models-patterns.md) — Model design, QuerySet best practices, manager methods, signals, caching, and bulk operations
- [references/views-patterns.md](references/views-patterns.md) — DRF serializer patterns, ViewSet patterns, custom actions, and service layer
- [references/middleware-patterns.md](references/middleware-patterns.md) — Project layout, split settings, and custom middleware
