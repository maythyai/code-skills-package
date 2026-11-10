---
name: csp-kotlin-testing
description: Kotlin testing patterns with Kotest 6.x, MockK 1.13, kotlinx-coroutines-test, Turbine Flow testing, Kover coverage, Spring Boot 3.4+ @MockitoBean, and Ktor testApplication. Follows TDD methodology with idiomatic Kotlin practices.
layer: 3
category: patterns
phase: build
domain: patterns
version: "0.2.0"
role: specialist
scope: testing
tools: [Read, Write, Edit, Bash, Glob, Grep]
related_skills:
  - [[csp-java-testing]]
  - [[csp-concurrency-testing]]
  - [[csp-property-based-testing]]
  - [[csp-mock-strategies]]
  - [[csp-backend-mock-strategies]]
  - [[csp-test-methodology]]
  - [[csp-springboot-patterns]]
  - [[csp-tdd]]
---

| Topic | Coverage |
|-------|----------|
| Kotest spec styles | StringSpec, FunSpec, BehaviorSpec, DescribeSpec, ShouldSpec |
| Assertions | infix `shouldBe`/`shouldContain`/`shouldThrow`, collection & coroutine matchers |
| Mocking | MockK setup, `coEvery`/`coVerify`, `slot`, `spyk`, `mockkObject`, `confirmVerified` |
| Coroutine testing | `runTest`, StandardTestDispatcher vs UnconfinedTestDispatcher, `advanceUntilIdle` |
| Flow testing | Turbine `test { awaitItem() / awaitComplete() / awaitError() }` |
| Spring Boot | 3.4+ `@MockitoBean`/`@MockitoSpyBean`, MockMvc Kotlin DSL |
| Ktor | `testApplication { }` request/response assertions |
| Serialization | kotlinx.serialization round-trip tests |
| Property testing | Kotest Property `checkAll`, `Arb.*` generators |
| Coverage | Kover 0.9 configuration and verification rules |

## When to Activate

- Any Kotlin backend (Spring Boot, Ktor, Micronaut) needing idiomatic test patterns
- Android or server code with coroutines/`Flow` that must be tested deterministically
- You want Kotest's expressive DSL over JUnit 5 boilerplate
- Migrating off deprecated `@MockBean` to Spring Boot 3.4+ `@MockitoBean`

## Best Practices

**DO:**
- Write tests FIRST (TDD) — see [[csp-tdd]]
- Pick ONE Kotest spec style and use it consistently across the project
- Use MockK's `coEvery`/`coVerify` for suspend functions
- Use `runTest` (never `runBlocking`) for coroutine testing so virtual time auto-skips delays
- Choose StandardTestDispatcher (control time) OR UnconfinedTestDispatcher (eager) per test, not both
- Test behavior, not implementation
- Use Kotest Property for pure functions with clear invariants
- Use `data class` test fixtures for clarity
- End Turbine blocks with `cancelAndIgnoreRemainingEvents()` when the Flow never completes

**DON'T:**
- Mix testing frameworks (pick Kotest and stick with it)
- Mock data classes (use real instances)
- Use `Thread.sleep()` in coroutine tests (use `advanceTimeBy`)
- Use `relaxed = true` everywhere — it hides missing stubs
- Skip the RED phase in TDD
- Test private functions directly
- Keep using `@MockBean` on Spring Boot 3.4+ (deprecated; removal in 3.6)
- Ignore flaky tests

## Gradle Setup (Kotlin DSL)

```kotlin
plugins {
  kotlin("jvm") version "2.1.0"
  id("org.jetbrains.kotlinx.kover") version "0.9.0"
}

dependencies {
  testImplementation("io.kotest:kotest-runner-junit5:6.2.0")
  testImplementation("io.kotest:kotest-assertions-core:6.2.0")
  testImplementation("io.kotest:kotest-property:6.2.0")
  testImplementation("io.mockk:mockk:1.13.13")
  testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.11.0")
  testImplementation("app.cash.turbine:turbine:1.2.1")
  // Spring Boot brings @MockitoBean transitively
  testImplementation("org.springframework.boot:spring-boot-starter-test")
}

tasks.test { useJUnitPlatform() }

koverReport {
  verify { rule { minBound(80) } }
}
```

## Kotest Spec Styles

Pick one style project-wide. The five most common:

```kotlin
// StringSpec — most concise
class StringSpecExample : StringSpec({
  "addition is commutative" { 1 + 2 shouldBe 3 }
})

// FunSpec — explicit test() blocks
class FunSpecExample : FunSpec({
  test("empty list has size 0") { listOf<Int>().size shouldBe 0 }
})

// BehaviorSpec — given/when/then BDD
class BehaviorSpecExample : BehaviorSpec({
  given("a cart with one item") {
    `when`("we add another") {
      then("size is 2") { /* ... */ }
    }
  }
})

// DescribeSpec — describe/context/it (RSpec-like)
class DescribeSpecExample : DescribeSpec({
  describe("OrderService") {
    context("when the order is valid") {
      it("saves the order") { /* ... */ }
    }
  }
})

// ShouldSpec — should("name") { }
class ShouldSpecExample : ShouldSpec({
  should("return the total") { /* ... */ }
})
```

Kotest also ships ExpectSpec, WordSpec, FeatureSpec, FreeSpec, and AnnotationSpec. Assertions are infix: `shouldBe`, `shouldNotBe`, `shouldContain`, `shouldThrow<T> { }`, `shouldBeInstanceOf<T>()`, plus collection matchers (`shouldContainExactly`, `shouldHaveSize`) and map matchers (`shouldContainKey`, `shouldContainAll`).

## MockK

MockK is reflection-free (bytecode generation) and supports Kotlin-specific features: default args, extension functions, top-level functions, and object mocking.

```kotlin
// Basic stub + verify
val repo = mockk<OrderRepo>()
every { repo.find(1) } returns Order(1, total = 10)
verify(exactly = 1) { repo.find(1) }
confirmVerified(repo) // ensures no unexpected interactions

// Suspend functions use coEvery / coVerify
coEvery { repo.save(any()) } returns Unit
coVerify { repo.save(match { it.total > 0 }) }

// Argument capture with slot
val slot = slot<Order>()
coVerify { repo.save(capture(slot)) }
slot.captured.total shouldBe 15

// Spy — real calls unless stubbed
val spy = spyk(OrderService(repo))
every { spy.notify(any()) } just Runs
spy.run()

// Mock a Kotlin object / top-level functions
mockkObject(Clock)
every { Clock.now() } returns Instant.EPOCH

// Relaxed mock — returns defaults for unstubbed calls (use sparingly)
val relaxedRepo = mockk<OrderRepo>(relaxed = true)
```

## Coroutine Testing (kotlinx-coroutines-test)

```kotlin
class DispatcherTest : FunSpec({
  test("runTest auto-skips delays") {
    runTest {
      delay(10_000)          // virtual time — returns instantly
      val r = fetchData()
      r shouldBe "ok"
    }
  }

  test("StandardTestDispatcher queues until advanced") {
    val dispatcher = StandardTestDispatcher()
    runTest(dispatcher) {
      launch { emit() }
      advanceUntilIdle()     // nothing ran before this
    }
  }

  test("advanceTimeBy controls virtual clock") {
    runTest {
      launch { delay(1000); done = true }
      advanceTimeBy(999)
      done shouldBe false
      advanceTimeBy(1)
      runCurrent()
      done shouldBe true
    }
  }
})
```

For Android `viewModelScope`/`Dispatchers.Main`, install a test dispatcher:

```kotlin
@BeforeEach fun setup() { Dispatchers.setMain(StandardTestDispatcher()) }
@AfterEach  fun teardown() { Dispatchers.resetMain() }
```

StandardTestDispatcher queues coroutines so you control exactly when they run (best for asserting ordering); UnconfinedTestDispatcher runs eagerly like `Dispatchers.Unconfined` (best for simple "just run it" cases). Never mix both in one test.

## Flow Testing with Turbine

Turbine turns `Flow` testing into sequential assertions:

```kotlin
test("emits running total then completes") {
  coEvery { repo.save(any()) } returns Unit
  val order = Order(items = listOf(Item("a", 10), Item("b", 5)))

  svc.totals(order).test {          // Turbine
    awaitItem() shouldBe 0
    awaitItem() shouldBe 15
    awaitComplete()
  }

  val slot = slot<Order>()
  coVerify { repo.save(capture(slot)) }
  slot.captured.total shouldBe 15
}

test("surfaces upstream errors") {
  errorFlow().test {
    awaitError() shouldBe IllegalStateException("boom")
  }
}

test("hot flow that never completes") {
  ticker.test {
    awaitItem()
    awaitItem()
    cancelAndIgnoreRemainingEvents() // required — otherwise the test leaks
  }
}
```

## Spring Boot (3.4+) Testing

```kotlin
@SpringBootTest
class UserControllerTest {
  @Autowired lateinit var mockMvc: MockMvc

  // Spring Boot 3.4+ — replaces deprecated @MockBean
  @MockitoBean lateinit var userService: UserService
  @MockitoSpyBean  lateinit var clock: Clock   // replaces @SpyBean

  @Test
  fun `GET users returns 200`() {
    whenever(userService.list()).thenReturn(listOf(User("1", "Ann")))
    mockMvc.get("/users") {
      accept = APPLICATION_JSON
    }.andExpect {
      status { isOk() }
      jsonPath("$[0].name") { value("Ann") }
    }
  }
}
```

Notes: `@MockitoBean` is NOT supported on `@Configuration` classes — annotate test-class fields instead. `@MockBean`/`@SpyBean` are deprecated in Spring Framework 6.2 / Spring Boot 3.4 with removal planned for Spring Boot 3.6; migrate now. The `whenever(...)` helper comes from `org.mockito.kotlin`.

## Ktor testApplication

```kotlin
class RoutesTest : FunSpec({
  test("GET /health returns ok") {
    testApplication {
      application { module() }
      val response = client.get("/health")
      response.status shouldBe HttpStatusCode.OK
      response.bodyAsText() shouldContain "ok"
    }
  }
})
```

## kotlinx.serialization Round-Trip

```kotlin
test("Order survives JSON round-trip") {
  val order = Order(id = 1, items = listOf(Item("a", 10)), total = 10)
  val json = Json.encodeToString(order)
  Json.decodeFromString<Order>(json) shouldBe order
}
```

Round-trip (`encode ∘ decode = identity`) is a cheap, high-value property — pair it with Kotest Property for generated inputs.

## Property-Based Testing (Kotest Property)

```kotlin
class SortProperty : StringSpec({
  "sorting is idempotent" {
    checkAll(Arb.list(Arb.int())) { xs ->
      val once = xs.sorted()
      once.sorted() shouldBe once
    }
  }
})
```

Default iterations is 1000. Use `kotest-property-arbs` for domain generators. For deeper PBT methodology (shrinking, stateful machines, metamorphic relations) see [[csp-property-based-testing]].

## Coverage Targets

| Code Type | Target |
|-----------|--------|
| Critical business logic | 100% |
| Public APIs | 90%+ |
| General code | 80%+ |
| Generated / config code | Exclude |

Kover 0.9 produces JaCoCo-compatible XML/HTML and supports Gradle configuration cache. Enforce thresholds in CI with `koverReport { verify { rule { minBound(80) } } }`.

## Concurrency Testing Note

Kotlin coroutines and shared mutable state need race detection beyond unit tests. Use `kotlinx-coroutines-test` with a real multi-threaded dispatcher for stress cases, and consult [[csp-concurrency-testing]] for linearizability checks and jcstress-style JVM concurrency harnesses when testing lock-free data structures.

## Anti-Patterns

1. **Mixing dispatchers in one test** — StandardTestDispatcher and UnconfinedTestDispatcher have different scheduling; pick one per test.
2. **`runBlocking` instead of `runTest`** — you lose virtual time and delays become real wall-clock waits.
3. **`relaxed = true` everywhere** — unstubbed calls silently return defaults, hiding missing stubs.
4. **Turbine without `cancelAndIgnoreRemainingEvents()`** — infinite/hot flows leak and the test hangs.
5. **`@MockBean` on Spring Boot 3.4+** — deprecated, removal in 3.6; migrate to `@MockitoBean`.
6. **Mocking data classes** — they're value holders; construct real instances.
7. **Testing private functions directly** — test the public behavior instead.

**Remember**: Tests are documentation. They show how your Kotlin code is meant to be used. Use Kotest's expressive matchers to make tests readable and MockK for clean mocking of dependencies.

## References

- [references/mockk-patterns.md](references/mockk-patterns.md) — MockK basic mocking, coroutine mocking, argument capture, and spy patterns
- [references/coroutines-testing.md](references/coroutines-testing.md) — runTest, flow testing, and TestDispatcher patterns
- [references/compose-testing.md](references/compose-testing.md) — Kotest spec styles, matchers, TDD workflow, property testing, Kover, and Ktor testing

## Related Skills

- [[csp-java-testing]] — JVM testing patterns shared with Kotlin (JUnit 5, Testcontainers)
- [[csp-concurrency-testing]] — race/linearizability testing for coroutines and lock-free code
- [[csp-property-based-testing]] — deeper PBT methodology (shrinking, stateful, metamorphic)
- [[csp-mock-strategies]] — cross-language test-double taxonomy and MSW/Pact
- [[csp-backend-mock-strategies]] — Testcontainers/WireMock/LocalStack for backend integration
- [[csp-test-methodology]] — method selection and blind-spot coverage matrix
- [[csp-springboot-patterns]] — Spring Boot architecture and configuration patterns
- [[csp-tdd]] — test-first workflow
