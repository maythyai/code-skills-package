---
name: backend-patterns
description: >
  Backend architecture patterns, API design, database optimization, and server-side best practices for Node.js, Express, and Next.js API routes.
metadata:
  origin: CSP
layer: 4
category: patterns
---

| Pattern | Purpose |
|---------|---------|
| Repository | Abstract data access logic |
| Service Layer | Business logic separation |
| Middleware | Request/response pipeline |
| Cache-Aside | Redis caching for hot data |
| N+1 Prevention | Batch fetch related entities |
| JWT Auth | Token-based authentication |
| RBAC | Role-based access control |
| Rate Limiting | Protect APIs from abuse |
| Job Queue | Async background processing |
| Structured Logging | JSON logs with context |

## Anti-Patterns

- Business logic in route handlers (use service layer)
- Selecting all columns when only a few are needed
- N+1 queries in loops (batch fetch instead)
- Swallowing errors silently (log and propagate)
- No rate limiting on public APIs
- Inline error handling without centralized handler

**Remember**: Backend patterns enable scalable, maintainable server-side applications. Choose patterns that fit your complexity level.

## References

- [references/api-patterns.md](references/api-patterns.md) — REST API design, repository, service layer, middleware, database, caching, error handling, logging
- [references/api-design.md](references/api-design.md) — REST API design: resource naming, status codes, pagination, filtering, versioning, rate limiting, response envelopes
- [references/auth-patterns.md](references/auth-patterns.md) — JWT validation, role-based access control, and rate limiting
- [references/queue-patterns.md](references/queue-patterns.md) — Background jobs and simple queue implementations
