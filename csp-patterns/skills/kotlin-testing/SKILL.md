---
name: kotlin-testing
description: Kotlin testing patterns with Kotest, MockK, coroutine testing, property-based testing, and Kover coverage. Follows TDD methodology with idiomatic Kotlin practices.
origin: CSP
---

# Kotlin Testing Patterns

Comprehensive Kotlin testing patterns for writing reliable, maintainable tests following TDD methodology with Kotest and MockK.

## When to Use

- Writing new Kotlin functions or classes
- Adding test coverage to existing Kotlin code
- Implementing property-based tests
- Following TDD workflow in Kotlin projects
- Configuring Kover for code coverage

## How It Works

1. **Identify target code** — Find the function, class, or module to test
2. **Write a Kotest spec** — Choose a spec style (StringSpec, FunSpec, BehaviorSpec) matching the test scope
3. **Mock dependencies** — Use MockK to isolate the unit under test
4. **Run tests (RED)** — Verify the test fails with the expected error
5. **Implement code (GREEN)** — Write minimal code to pass the test
6. **Refactor** — Improve the implementation while keeping tests green
7. **Check coverage** — Run `./gradlew koverHtmlReport` and verify 80%+ coverage

## Quick Reference

| Topic | Reference |
|-------|-----------|
| Kotest spec styles | StringSpec, FunSpec, BehaviorSpec, DescribeSpec |
| Mocking | MockK setup, coroutine mocking, argument capture, spy |
| Coroutine testing | runTest, TestDispatcher, flow testing |
| Property testing | Kotest Property, custom generators |
| Coverage | Kover configuration and commands |

## Best Practices

**DO:**
- Write tests FIRST (TDD)
- Use Kotest's spec styles consistently across the project
- Use MockK's `coEvery`/`coVerify` for suspend functions
- Use `runTest` for coroutine testing
- Test behavior, not implementation
- Use property-based testing for pure functions
- Use `data class` test fixtures for clarity

**DON'T:**
- Mix testing frameworks (pick Kotest and stick with it)
- Mock data classes (use real instances)
- Use `Thread.sleep()` in coroutine tests (use `advanceTimeBy`)
- Skip the RED phase in TDD
- Test private functions directly
- Ignore flaky tests

## Coverage Targets

| Code Type | Target |
|-----------|--------|
| Critical business logic | 100% |
| Public APIs | 90%+ |
| General code | 80%+ |
| Generated / config code | Exclude |

**Remember**: Tests are documentation. They show how your Kotlin code is meant to be used. Use Kotest's expressive matchers to make tests readable and MockK for clean mocking of dependencies.

## References

- [references/mockk-patterns.md](references/mockk-patterns.md) — MockK basic mocking, coroutine mocking, argument capture, and spy patterns
- [references/coroutines-testing.md](references/coroutines-testing.md) — runTest, flow testing, and TestDispatcher patterns
- [references/compose-testing.md](references/compose-testing.md) — Kotest spec styles, matchers, TDD workflow, property testing, Kover, and Ktor testing
