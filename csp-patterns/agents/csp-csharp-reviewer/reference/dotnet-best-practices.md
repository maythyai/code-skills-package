# .NET Best Practices — Review Reference

Use this guide when reviewing general .NET code quality, architecture, DI, design patterns, and documentation.

## Dependency Injection

- Use constructor injection exclusively — avoid `new`-ing services inside classes.
- Prefer primary constructor syntax for concise injection:

```csharp
public sealed class OrderService(IOrderRepository repo, ILogger<OrderService> logger)
{
    public async Task<Order> GetAsync(int id, CancellationToken ct) =>
        await repo.GetByIdAsync(id, ct) ?? throw new NotFoundException(id);
}
```

- Register services with correct lifetimes: `Singleton` (stateless/shared), `Scoped` (per-request), `Transient` (per-resolve).
- Never inject a `Scoped` service into a `Singleton` — it captures the scope and causes captive dependency bugs.
- Use `IOptions<T>` or `IOptionsSnapshot<T>` for configuration injection; never inject `IConfiguration` directly into business logic.

## Design Patterns

### Command Handler

Encapsulate operations in command objects with a generic handler base:

```csharp
public interface ICommandHandler<TCommand, TResult>
{
    Task<TResult> HandleAsync(TCommand command, CancellationToken ct);
}
```

Benefits: consistent validation pipeline, centralized error handling, easy testing.

### Repository

Abstract data access behind an interface. Inject it — do not let DbContext leak into domain logic:

```csharp
public interface IOrderRepository
{
    Task<Order?> GetByIdAsync(int id, CancellationToken ct);
    Task AddAsync(Order order, CancellationToken ct);
}
```

### Factory

Use for complex object creation that requires configuration or service-provider integration. Keep factories stateless and injectable.

### Provider

External service abstractions (database, AI, messaging). Define clear contracts, handle configuration and connection lifecycle internally.

## SOLID Compliance

| Principle | What to Check |
|---|---|
| Single Responsibility | Classes have one reason to change; no god classes |
| Open/Closed | Extend via interfaces/abstract classes, not modification |
| Liskov Substitution | Derived classes honor base class contracts |
| Interface Segregation | No fat interfaces — split by consumer needs |
| Dependency Inversion | Depend on abstractions, not concrete implementations |

## Configuration and Validation

- Use strongly-typed configuration classes with data annotations:

```csharp
public sealed class ApiSettings
{
    [Required, NotEmptyOrWhitespace] public string BaseUrl { get; init; } = "";
    [Range(1, 300)] public int TimeoutSeconds { get; init; } = 30;
}
```

- Validate at startup via `ValidateDataAnnotations()` in `AddOptions` — fail fast on bad config.
- Use `appsettings.json` + environment overrides; never hardcode connection strings or API keys.

## Error Handling and Logging

- Throw specific exceptions (`ArgumentException`, `InvalidOperationException`, custom domain exceptions).
- Never catch `Exception` generically and swallow — log context and rethrow or translate.
- Use structured logging with `ILogger<T>`; pass message templates, not string concatenation:

```csharp
logger.LogInformation("Order {OrderId} placed by user {UserId}", order.Id, order.UserId);
```

- Include correlation IDs and scoped context for distributed tracing.

## XML Documentation

Document all public APIs. Internal members: document when non-obvious.

| Element | Usage |
|---|---|
| `<summary>` | One-sentence description, present-tense third-person verb |
| `<param>` | Noun phrase describing the parameter |
| `<returns>` | Noun phrase describing the return value |
| `<exception cref>` | Condition under which the exception is thrown |
| `<remarks>` | Implementation notes, thread safety, side effects |
| `<inheritdoc/>` | Inherit docs from base class/interface — use unless behavior differs |

```csharp
/// <summary>Calculates the discounted total for an order.</summary>
/// <param name="order">The order to calculate for.</param>
/// <returns>The total after applying applicable discounts.</returns>
/// <exception cref="InvalidOperationException">Thrown when the order has no items.</exception>
public decimal CalculateTotal(Order order) { ... }
```

## Namespace and Project Structure

- Follow `{Layer}.{Feature}` conventions: `Core.Orders`, `Service.Orders`, `Api.Orders`.
- Separate Core (domain/interfaces) from infrastructure implementations.
- Keep project files lean — use Directory.Build.props for shared settings.

## Modern C# Features to Encourage

| Feature | Benefit |
|---|---|
| Primary constructors | Less boilerplate for DI |
| `record` / `record struct` | Value semantics for DTOs and domain values |
| Required members (`required` keyword) | Compile-time initialization guarantees |
| Collection expressions (`[1, 2, 3]`) | Cleaner collection initialization |
| `file`-scoped types | Hide internal helpers |
| Pattern matching (`is`, `switch` expressions) | Replace type-checking chains |
| Raw string literals (`"""..."""`) | JSON templates, SQL, regex without escaping |

## Performance and Security Reminders

- Use `sealed` on classes not designed for inheritance — enables devirtualization.
- Prefer `StringBuilder` or `string.Join` over `+` concatenation in loops.
- Use `ReadOnlySpan<char>` for parsing hot paths instead of `string.Substring`.
- Parameterize all database queries — no string interpolation in SQL.
- Use `Secret Manager` or environment variables for credentials; never commit secrets.

## Review Checklist

- [ ] Constructor injection used; no `new Service()` inside classes
- [ ] DI lifetimes correct; no captive dependencies
- [ ] Configuration strongly typed and validated at startup
- [ ] Structured logging with templates, not string concat
- [ ] Public APIs documented with XML comments
- [ ] No SOLID violations in new/changed code
- [ ] Modern C# idioms applied where they improve clarity
