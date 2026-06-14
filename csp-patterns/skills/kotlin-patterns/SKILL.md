---
name: kotlin-patterns
description: Idiomatic Kotlin patterns, best practices, and conventions for building robust, efficient, and maintainable Kotlin applications with coroutines, null safety, and DSL builders.
origin: CSP
---

# Kotlin Development Patterns

Idiomatic Kotlin patterns and best practices for building robust, efficient, and maintainable applications.

## When to Use

- Writing new Kotlin code
- Reviewing Kotlin code
- Refactoring existing Kotlin code
- Designing Kotlin modules or libraries
- Configuring Gradle Kotlin DSL builds

## How It Works

This skill enforces idiomatic Kotlin conventions across seven key areas: null safety using the type system and safe-call operators, immutability via `val` and `copy()` on data classes, sealed classes and interfaces for exhaustive type hierarchies, structured concurrency with coroutines and `Flow`, extension functions for adding behaviour without inheritance, type-safe DSL builders using `@DslMarker` and lambda receivers, and Gradle Kotlin DSL for build configuration.

## Quick Reference: Kotlin Idioms

| Idiom | Description |
|-------|-------------|
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
