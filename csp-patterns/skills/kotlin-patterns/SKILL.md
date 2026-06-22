---
name: csp-kotlin-patterns
description: Idiomatic Kotlin patterns, best practices, and conventions for building robust, efficient, and maintainable Kotlin applications with coroutines, null safety, and DSL builders.
origin: CSP
layer: 4
category: patterns
---

# Kotlin Patterns

> This skill provides idiomatic Kotlin patterns: leverage the type system for
> safety, prefer immutability, and use structured concurrency for async work.

## Quick Reference

| Pattern | Usage |
|---------|-------|
| `val` over `var` | Prefer immutable variables |
| `data class` | Value objects with equals/hashCode/copy/toString |
| `sealed class/interface` | Restricted type hierarchies, exhaustive `when` |
| `value class` | Type-safe wrappers with zero runtime overhead |
| Expression `when` | Exhaustive pattern matching |
| Safe call `?.` | Null-safe member access |
| Elvis `?:` | Default value / early return for nullables |
| `let`/`apply`/`also`/`run`/`with` | Scope functions for clean code |
| Extension functions | Add behavior without inheritance |
| `copy()` | Immutable updates on data classes |
| `require`/`check` | Precondition / state assertions |
| Coroutine `async`/`await` | Structured concurrent execution |
| `Flow` | Cold reactive streams |
| `sequence` | Lazy evaluation of collections |
| Delegation `by` | Reuse implementation without inheritance |

## Data Classes

Use `data class` for value objects. You get `equals`, `hashCode`, `toString`,
`copy`, and destructuring for free.

```kotlin
data class User(
    val id: String,
    val name: String,
    val email: String,
    val tags: List<String> = emptyList(),
)

// Immutable update via copy()
val renamed = user.copy(name = "Alice")

// Destructuring
val (id, name) = user
```

**Guidelines:**
- Keep properties `val` — a data class with `var` defeats its value-semantics.
- Don't put behavior with side effects in a data class; keep it a data carrier.
- For domain identity that should not be confused with another `String`, wrap it in
  a `value class` (see below).

## Sealed Classes & Interfaces

Use `sealed` hierarchies to model a closed set of types. The compiler enforces
exhaustive `when`, so adding a case forces you to handle it everywhere.

```kotlin
sealed interface Result<out T> {
    data class Success<T>(val value: T) : Result<T>
    data class Failure(val error: Throwable) : Result<Nothing>
    data object Loading : Result<Nothing>
}

fun <T> render(result: Result<T>): String = when (result) {
    is Result.Success -> "ok: ${result.value}"
    is Result.Failure -> "error: ${result.error.message}"
    Result.Loading     -> "loading"
    // no else needed — compiler knows the set is closed
}
```

### Sealed Classes as State Machines

Sealed hierarchies are ideal for explicit state machines — illegal states become
unrepresentable.

```kotlin
sealed interface ConnectionState {
    data object Disconnected : ConnectionState
    data class Connecting(val attempt: Int) : ConnectionState
    data class Connected(val sessionId: String) : ConnectionState
    data class Failed(val reason: String) : ConnectionState
}

fun next(state: ConnectionState, event: Event): ConnectionState = when (state) {
    is ConnectionState.Disconnected ->
        if (event is Event.Connect) ConnectionState.Connecting(1) else state
    is ConnectionState.Connecting ->
        when (event) {
            is Event.Ack  -> ConnectionState.Connected(event.sessionId)
            is Event.Fail -> ConnectionState.Failed(event.reason)
            else          -> state
        }
    else -> state
}
```

## Value Classes

Wrap primitives for type safety with no allocation overhead at runtime.

```kotlin
@JvmInline
value class UserId(val raw: String)

@JvmInline
value class Email(val raw: String) {
    init { require("@" in raw) { "invalid email: $raw" } }
}

// Compiler prevents passing a UserId where an Email is expected
fun lookup(id: UserId): User? = TODO()
```

## Null Safety

Kotlin's type system distinguishes `T` from `T?`. Use it instead of defensive
checks.

```kotlin
// Safe call + Elvis: default value
val length = name?.length ?: 0

// Elvis for early return
fun process(input: String?) {
    val value = input ?: return
    // value is smart-cast to non-null String here
}

// let to run a block only when non-null
user?.let { sendWelcomeEmail(it.email) }

// Chained safe calls
val city = order?.customer?.address?.city
```

**Avoid `!!`** — the not-null assertion converts a compile-time guarantee into a
runtime crash. If you reach for `!!`, you usually want `?:`, `requireNotNull`, or a
smart cast after a null check.

For Java interop, treat **platform types** (`String!`) explicitly: annotate or
null-check at the boundary so platform nulls don't leak in.

## Scope Functions

Five scope functions, distinguished by (a) what the receiver is called (`this` vs
`it`) and (b) what they return (the receiver vs the lambda result).

| Function | Receiver | Returns | Typical use |
|----------|----------|---------|-------------|
| `let` | `it` | lambda result | Transform a nullable, scoped non-null block |
| `run` | `this` | lambda result | Compute a value using the receiver's members |
| `apply` | `this` | the receiver | Configure an object, then return it |
| `also` | `it` | the receiver | Side effects (logging) without breaking a chain |
| `with` | `this` | lambda result | Group operations on a non-null object |

```kotlin
// apply: object configuration (returns the receiver)
val request = Request().apply {
    method = "POST"
    headers["Content-Type"] = "application/json"
    body = payload
}

// let: transform a nullable
val displayName = user?.let { "${it.name} <${it.email}>" } ?: "anonymous"

// also: side effect inside a chain
val ids = users
    .filter { it.active }
    .also { log.debug("active users: ${it.size}") }
    .map { it.id }

// run: compute from receiver
val area = rectangle.run { width * height }

// with: group calls on one object
with(canvas) {
    drawLine(0, 0, 100, 100)
    drawText("hi", 10, 10)
}
```

**Don't nest scope functions deeply** — two levels of `it`/`this` and the reader
loses track of which receiver is which. Prefer a safe-call chain or a named local.

## Extension Functions

Add behavior to types you don't own, without inheritance or wrappers.

```kotlin
fun String.toSlug(): String =
    lowercase().replace(Regex("[^a-z0-9]+"), "-").trim('-')

fun <T> List<T>.second(): T = this[1]

// Extension property
val String.isPalindrome: Boolean
    get() = this == this.reversed()
```

**Guidelines:** keep extensions cohesive and discoverable (group in a file by the
type they extend); avoid extensions that secretly mutate global state.

## Coroutines

### Structured Concurrency

Launch coroutines inside a scope tied to a lifecycle. When the scope is cancelled,
all its children are cancelled — no leaks.

```kotlin
suspend fun loadDashboard(userId: String): Dashboard = coroutineScope {
    // Both run concurrently; coroutineScope waits for both and
    // cancels the sibling if one fails.
    val profile = async { fetchProfile(userId) }
    val orders  = async { fetchOrders(userId) }
    Dashboard(profile.await(), orders.await())
}
```

- Use `coroutineScope` (or `supervisorScope` when children should fail
  independently) instead of `GlobalScope`.
- Pass `suspend` functions down; don't capture a long-lived scope inside a function.
- Respect cancellation: cooperative suspension points check for it automatically;
  in long CPU loops call `ensureActive()` or `yield()`.
- Choose the right dispatcher: `Dispatchers.IO` for blocking I/O,
  `Dispatchers.Default` for CPU work.

### Flow

`Flow` is a cold, asynchronous stream — nothing runs until collected.

```kotlin
fun searchResults(query: StateFlow<String>): Flow<List<Hit>> =
    query
        .debounce(300)
        .distinctUntilChanged()
        .filter { it.length >= 2 }
        .mapLatest { search(it) }      // cancels prior search on new input
        .catch { emit(emptyList()) }   // handle errors in-stream

// Collection happens in a scope
scope.launch {
    searchResults(queryFlow).collect { hits -> render(hits) }
}
```

- Operators (`map`, `filter`, `debounce`, `flatMapLatest`) run on the upstream
  context; use `flowOn(Dispatchers.IO)` to shift upstream work off the collector.
- Use `StateFlow` for observable state (always has a current value) and
  `SharedFlow` for events.

## Delegated Properties

Reuse common property behavior via `by`.

```kotlin
class ViewModel {
    // Computed once, lazily, thread-safe by default
    val config: Config by lazy { loadConfig() }

    // Observe changes
    var count: Int by Delegates.observable(0) { _, old, new ->
        log.debug("count $old -> $new")
    }
}

// Class delegation: implement an interface by forwarding to a member
class LoggingList<T>(private val inner: MutableList<T>) : MutableList<T> by inner {
    override fun add(element: T): Boolean {
        log.debug("add $element")
        return inner.add(element)
    }
}
```

## DSL Builders

Use a typed builder with a receiver lambda (`@DslMarker` to prevent scope leakage)
to create readable, type-safe configuration.

```kotlin
@DslMarker
annotation class HtmlDsl

@HtmlDsl
class Tag(val name: String) {
    private val children = mutableListOf<Tag>()
    var text: String = ""
    fun tag(name: String, block: Tag.() -> Unit) {
        children += Tag(name).apply(block)
    }
    override fun toString(): String =
        "<$name>$text${children.joinToString("")}</$name>"
}

fun html(block: Tag.() -> Unit): Tag = Tag("html").apply(block)

// Usage reads like markup
val page = html {
    tag("body") {
        tag("h1") { text = "Hello" }
        tag("p")  { text = "World" }
    }
}
```

## Preconditions

Fail fast with intention-revealing checks.

```kotlin
fun transfer(amount: Int, from: Account, to: Account) {
    require(amount > 0) { "amount must be positive, was $amount" }   // IllegalArgumentException
    check(from.balance >= amount) { "insufficient funds" }           // IllegalStateException
    val recipient = requireNotNull(to.owner) { "recipient has no owner" }
    // ...
}
```

## Anti-Patterns to Avoid

| Anti-Pattern | Do Instead |
|--------------|-----------|
| Force-unwrapping with `!!` | `?:`, `requireNotNull`, smart cast after null check |
| Mutable data classes (`var` props) | Keep properties `val`; update with `copy()` |
| Exceptions for control flow | Return a sealed `Result` type |
| `GlobalScope.launch` | Structured concurrency via `coroutineScope`/lifecycle scope |
| Deeply nested scope functions | Safe-call chains or named locals |
| Platform type leakage from Java | Null-check / annotate at the boundary |
| `else ->` on a sealed `when` | Handle each case so new cases force a compile error |
| Blocking calls on `Dispatchers.Default` | Use `Dispatchers.IO` for blocking I/O |
| Collecting a `Flow` without a scope | Collect inside a lifecycle-bound scope |
| Primitive obsession for ids | Wrap in `@JvmInline value class` |

**Remember**: Kotlin code should be concise but readable. Leverage the type system
for safety, prefer immutability, and use coroutines for concurrency. When in doubt,
let the compiler help you.

## References

- [references/coroutines-patterns.md](references/coroutines-patterns.md) —
  Structured concurrency, cancellation, delegation, DSL builders, sequences, error
  handling, collections, Gradle DSL.
- [references/flow-patterns.md](references/flow-patterns.md) — Flow reactive streams
  and Flow operators.
- [references/compose-patterns.md](references/compose-patterns.md) — Sealed classes,
  scope functions, extension functions, null safety, immutability, data classes.
