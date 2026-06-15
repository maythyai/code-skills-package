# C# Async/Await Patterns — Review Reference

Use this guide when reviewing async code. Covers TAP, cancellation, ValueTask, and common pitfalls.

## Naming and Return Types

- Suffix async methods with `Async` (e.g., `GetDataAsync` for `GetData`).
- Return `Task<T>` when producing a value; `Task` for void operations.
- Use `ValueTask<T>` only on hot paths where synchronous completion is common — it adds complexity.
- Never return `void` from async methods except event handlers.

```csharp
// Correct
public async Task<User> GetUserAsync(int id, CancellationToken ct = default) { ... }

// Wrong — async void swallows exceptions outside event handlers
public async void LoadData() { ... }
```

## Cancellation Tokens

- Every public async API should accept `CancellationToken` as the last parameter.
- Propagate tokens through the call chain; do not create new `CancellationTokenSource` unless orchestrating.
- Use `ct.ThrowIfCancellationRequested()` for synchronous checkpoints inside long loops.

```csharp
public async Task<List<Order>> GetOrdersAsync(CancellationToken ct = default)
{
    await using var connection = new SqlConnection(_connStr);
    await connection.OpenAsync(ct);
    return await connection.QueryAsync<Order>(sql, token: ct);
}
```

## ConfigureAwait

- Library code: always use `.ConfigureAwait(false)` to avoid capturing SynchronizationContext.
- Application code (ASP.NET Core, console): `ConfigureAwait(false)` is optional but harmless.
- UI code (WPF, WinForms, MAUI): omit `ConfigureAwait(false)` when the continuation must touch UI.

## Parallel Execution and Coordination

- `Task.WhenAll(tasks)` — run independent operations concurrently; a single failure fails the group.
- `Task.WhenAny(tasks)` — implement timeouts, first-wins races, or progressive rendering.
- Prefer `await foreach` with `IAsyncEnumerable<T>` over buffering into `List<T>`.

```csharp
var userTask = userService.GetUserAsync(id, ct);
var ordersTask = orderService.GetOrdersAsync(id, ct);
await Task.WhenAll(userTask, ordersTask);
var (user, orders) = (userTask.Result, ordersTask.Result);
```

## Error Handling in Async Code

- Wrap `await` calls in try/catch; exceptions re-emerge on the await side.
- Use `Task.FromException<T>(ex)` to return a faulted task from synchronous validation paths.
- Never `throw` before returning a `Task` from a non-async `Task`-returning method — use `Task.FromException`.

```csharp
// Synchronous validation, async return
public Task<Report> GenerateAsync(Config config)
{
    if (config is null) return Task.FromException<Report>(new ArgumentNullException(nameof(config)));
    return GenerateCoreAsync(config);
}
```

## Avoiding Sync-Over-Async

These calls deadlock on UI or legacy ASP.NET contexts and defeat the purpose of async:

| Anti-pattern | Fix |
|---|---|
| `task.Result` | `await task` |
| `task.Wait()` | `await task` |
| `task.GetAwaiter().GetResult()` | `await task` |
| `Parallel.ForEach(items, async x => ...)` | `await Parallel.ForEachAsync(items, async (x, ct) => ...)` (.NET 6+) |

## IAsyncEnumerable and Async Streams

- Use `IAsyncEnumerable<T>` for producer/consumer pipelines and streaming responses.
- Always accept and pass `CancellationToken` to `GetAsyncEnumerator(ct)` via `WithCancellation(ct)`.
- Use `ConfigureAwait(false)` in library enumerators: `await foreach (var item in source.ConfigureAwait(false))`.

```csharp
public async IAsyncEnumerable<Event> StreamEventsAsync(
    [EnumeratorCancellation] CancellationToken ct = default)
{
    while (!ct.IsCancellationRequested)
    {
        yield return await _channel.Reader.ReadAsync(ct);
    }
}
```

## Review Checklist

- [ ] Async methods suffixed with `Async`
- [ ] `CancellationToken` parameter on public async methods
- [ ] No `.Result`, `.Wait()`, or `async void` (outside event handlers)
- [ ] Library code uses `ConfigureAwait(false)`
- [ ] `ValueTask<T>` only justified with a comment on the hot path
- [ ] Exceptions handled on `await`, not swallowed
- [ ] No unnecessary `async`/`await` passthrough — return the task directly
