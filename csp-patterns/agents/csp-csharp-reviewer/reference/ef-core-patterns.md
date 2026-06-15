# Entity Framework Core Patterns — Review Reference

Use this guide when reviewing EF Core data access code. Covers DbContext design, querying, migrations, and performance.

## DbContext Design

- Keep DbContext focused — one context per bounded context or database.
- Inject `DbContextOptions<T>` via constructor; never `new` a DbContext in production code.
- Override `OnModelCreating` for Fluent API; prefer `IEntityTypeConfiguration<T>` per entity for large models.
- Use `IDbContextFactory<T>` in console apps, background services, and Blazor Server — scoped lifetime is wrong there.

```csharp
public sealed class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Order> Orders => Set<Order>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        mb.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
```

## Entity Design

- Prefer surrogate keys (`int Id` or `Guid Id`) for simplicity; use natural keys only when domain demands it.
- Map relationships explicitly with Fluent API — do not rely on convention for anything non-trivial.
- Use owned entity types (`OwnsOne`) for value objects embedded in an aggregate.
- Keep navigation properties virtual only when lazy loading is intentionally enabled (it usually should not be).

## Querying for Performance

### Read-Only Queries — Always AsNoTracking

```csharp
var orders = await _db.Orders
    .AsNoTracking()
    .Where(o => o.CustomerId == id)
    .ToListAsync(ct);
```

### Eager Loading — Include Related Data Upfront

Avoid N+1 by loading related entities in the same query:

```csharp
var order = await _db.Orders
    .AsNoTracking()
    .Include(o => o.Items).ThenInclude(i => i.Product)
    .FirstOrDefaultAsync(o => o.Id == orderId, ct);
```

### Projection — Select Only What You Need

```csharp
var summaries = await _db.Orders
    .AsNoTracking()
    .Where(o => o.Status == Status.Open)
    .Select(o => new OrderSummary(o.Id, o.Total, o.Customer.Name))
    .ToListAsync(ct);
```

Projection avoids materializing full entities and bypasses change tracking overhead.

### Pagination

Never return unbounded result sets from user-facing endpoints:

```csharp
var page = await _db.Products
    .AsNoTracking()
    .OrderBy(p => p.Name)
    .Skip((request.Page - 1) * request.PageSize)
    .Take(request.PageSize)
    .ToListAsync(ct);
```

## N+1 and Lazy Loading Pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| Hundreds of SELECT statements per request | Lazy loading in loops | `Include`/`ThenInclude` or projection |
| Tracking overhead on reads | Missing `AsNoTracking()` | Add `AsNoTracking()` for read-only queries |
| Slow count checks | `Count()` materializes entities | Use `Any()` for existence, `LongCountAsync()` for counts |

## Migrations

- Keep migrations small and focused — one concern per migration.
- Name migrations descriptively: `AddOrderStatusIndex`, not `Update3`.
- Review generated SQL with `dotnet ef migrations script` before applying to production.
- Use migration bundles (`dotnet ef migrations bundle`) for CI/CD deployment.
- Seed reference data inside migrations, not via `HasData` for large tables — `HasData` embeds data in the model snapshot.

## Change Tracking and Saving

- Batch `SaveChangesAsync()` calls — do not save per entity in a loop.
- Use `ExecuteUpdateAsync` / `ExecuteDeleteAsync` (EF Core 7+) for bulk operations that do not need change tracking.
- Configure concurrency tokens (`[ConcurrencyCheck]` or `.IsRowVersion()`) for multi-user write scenarios.
- Use explicit transactions (`BeginTransactionAsync`) only when multiple `SaveChanges` must be atomic.
- DbContext lifetime in web apps: **scoped** per request. Never singleton.

## Compiled Queries

For queries executed thousands of times per second, compile once:

```csharp
private static readonly Func<AppDbContext, int, Task<Order?>> _getOrder =
    EF.CompileAsyncQuery((AppDbContext db, int id) =>
        db.Orders.FirstOrDefault(o => o.Id == id));

public Task<Order?> GetOrderAsync(int id) => _getOrder(_db, id);
```

## Security

- Never concatenate user input into raw SQL — use `FromSqlInterpolated` or parameterized `FromSqlRaw`.
- Avoid `FromSqlRaw` with string interpolation; prefer `FromSqlInterpolated` which parameterizes automatically.
- Restrict database user permissions to only what the app needs (no DDL in production connections).

```csharp
// Safe — interpolated and parameterized
var users = await _db.Users
    .FromSqlInterpolated($"SELECT * FROM Users WHERE Email = {email}")
    .ToListAsync(ct);
```

## Testing EF Core

| Strategy | When to Use | Trade-offs |
|---|---|---|
| `InMemory` provider | Simple unit tests | No relational behavior; false positives |
| SQLite in-memory | Integration tests | Real SQL, limited features (no sequences) |
| Testcontainers (Postgres/SQL Server) | Full integration tests | Real database, slower startup |
| Mock `DbSet<T>` | Isolated unit tests | Cannot test LINQ-to-SQL translation |

Prefer SQLite in-memory for most integration tests; use Testcontainers when testing provider-specific SQL.

## Review Checklist

- [ ] `AsNoTracking()` on all read-only queries
- [ ] `Include`/`ThenInclude` or projection to prevent N+1
- [ ] Pagination on user-facing list endpoints
- [ ] `CancellationToken` passed to all async EF calls
- [ ] No raw SQL with string concatenation
- [ ] DbContext scoped per request (not singleton, not transient)
- [ ] Migrations reviewed for SQL correctness before deployment
