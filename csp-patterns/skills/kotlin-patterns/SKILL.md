---
name: csp-kotlin-patterns
description: Idiomatic Kotlin patterns, best practices, and conventions for building robust, efficient, and maintainable Kotlin applications with coroutines, null safety, and DSL builders.
origin: CSP
layer: 4
category: patterns
---

| Pattern | Usage |
|---------|-------|
| `val` over `var` | Prefer immutable variables |
| `data class` | For value objects with equals/hashCode/copy |
| `sealed class/interface` | For restricted type hierarchies |
| `value class` | For type-safe wrappers with zero overhead |
| Expression `when` | Exhaustive pattern matching |
| Safe call `?.` | Null-safe member access |
| Elvis `?:` | Default value for nullables |
| `let`/`apply`/`also`/`run`/`with` | Scope functions for clean code |
| Extension functions | Add behavior without inheritance |
| `copy()` | Immutable updates on data classes |
| `require`/`check` | Precondition assertions |
| Coroutine `async`/`await` | Structured concurrent execution |
| `Flow` | Cold reactive streams |
| `sequence` | Lazy evaluation |
| Delegation `by` | Reuse implementation without inheritance |

## Anti-Patterns to Avoid

- Force-unwrapping nullable types (`!!`)
- Mutable data classes (`var` instead of `val`)
- Using exceptions for control flow
- `GlobalScope.launch` instead of structured concurrency
- Deeply nested scope functions instead of safe-call chains
- Platform type leakage from Java without null handling

**Remember**: Kotlin code should be concise but readable. Leverage the type system for safety, prefer immutability, and use coroutines for concurrency. When in doubt, let the compiler help you.

## References

- [references/coroutines-patterns.md](references/coroutines-patterns.md) — Structured concurrency, cancellation, delegation, DSL builders, sequences, error handling, collections, Gradle DSL
- [references/flow-patterns.md](references/flow-patterns.md) — Flow reactive streams and Flow operators
- [references/compose-patterns.md](references/compose-patterns.md) — Sealed classes, scope functions, extension functions, null safety, immutability, data classes
