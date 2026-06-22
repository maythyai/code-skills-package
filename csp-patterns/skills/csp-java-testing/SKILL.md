---
name: csp-java-testing
description: >
  Java testing best practices using JUnit 5 (Jupiter), AssertJ fluent assertions,
  Mockito (mock/spy/verify/ArgumentCaptor), and Testcontainers for integration tests
  against real dependencies. Covers parameterized and nested tests, lifecycle hooks,
  Spring Boot test slices (@WebMvcTest, @DataJpaTest), test naming conventions, and
  JaCoCo coverage. Use when writing or improving tests for Java 17+ services.
metadata:
  origin: CSP
  globs: ["**/*Test.java", "**/*Tests.java", "**/src/test/**/*.java"]
layer: 4
category: patterns
phase: verify
domain: testing
---

# Java Testing

> Comprehensive testing patterns for Java 17+ services using JUnit 5, AssertJ,
> Mockito, and Testcontainers. Aligns with `csp-java-coding-standards`
> (constructor injection, immutability, domain exceptions) and complements
> framework-specific testing in `csp-springboot-patterns`.

## When to Use

- Writing new unit, slice, or integration tests for Java services
- Improving coverage or replacing brittle, sleep-based, or order-dependent tests
- Mocking collaborators with Mockito or verifying interactions
- Standing up real dependencies (Postgres, Kafka, Redis) with Testcontainers
- Setting up JaCoCo coverage gates in Maven or Gradle
- Reviewing test pull requests for naming, isolation, and assertion quality

## Testing Stack

| Concern              | Tool                          | Notes                                   |
|----------------------|-------------------------------|-----------------------------------------|
| Test runner          | JUnit 5 (Jupiter)             | `@Test`, `@ParameterizedTest`, `@Nested`|
| Assertions           | AssertJ                       | Fluent `assertThat(...)` chains         |
| Mocking              | Mockito (+ `mockito-junit-jupiter`) | `@Mock`, `@Spy`, `@InjectMocks`   |
| Integration deps     | Testcontainers                | Real DB/broker in Docker                |
| Spring slices        | spring-boot-starter-test      | `@WebMvcTest`, `@DataJpaTest`           |
| Coverage             | JaCoCo                        | Line/branch gates in build              |

Prefer JUnit 5 + AssertJ + Mockito for unit tests. Reserve Testcontainers and
Spring slices for tests that genuinely need the framework or a real dependency.

## JUnit 5 Basics

### Test Structure (Arrange-Act-Assert)

```java
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class MoneyTest {

    @Test
    void addsTwoAmountsOfSameCurrency() {
        // Arrange
        var ten = Money.of("10.00", "USD");
        var five = Money.of("5.00", "USD");

        // Act
        Money sum = ten.plus(five);

        // Assert
        assertThat(sum).isEqualTo(Money.of("15.00", "USD"));
    }
}
```

### Lifecycle Hooks

```java
import org.junit.jupiter.api.*;

@TestInstance(TestInstance.Lifecycle.PER_CLASS) // allows non-static @BeforeAll
class OrderServiceTest {

    @BeforeAll
    void initExpensiveResource() { /* once before all tests */ }

    @BeforeEach
    void setUp() { /* before each test — fresh state */ }

    @AfterEach
    void tearDown() { /* after each test — release per-test resources */ }

    @AfterAll
    void cleanUp() { /* once after all tests */ }
}
```

By default JUnit 5 creates a new test instance **per method**, keeping tests
isolated. Use `@BeforeEach` for setup rather than constructors so failures report
cleanly.

### Nested Tests

Group related cases and share context with `@Nested`:

```java
class CartTest {

    Cart cart;

    @BeforeEach
    void setUp() { cart = new Cart(); }

    @Nested
    @DisplayName("when empty")
    class WhenEmpty {
        @Test
        void totalIsZero() {
            assertThat(cart.total()).isEqualTo(Money.zero("USD"));
        }

        @Test
        void checkoutThrows() {
            assertThatThrownBy(cart::checkout)
                .isInstanceOf(EmptyCartException.class);
        }
    }

    @Nested
    @DisplayName("with one item")
    class WithOneItem {
        @BeforeEach
        void addItem() { cart.add(new Item("sku-1", Money.of("9.99", "USD"))); }

        @Test
        void totalEqualsItemPrice() {
            assertThat(cart.total()).isEqualTo(Money.of("9.99", "USD"));
        }
    }
}
```

### Conditional and Disabled Tests

```java
@Disabled("flaky until clock injection lands — JIRA-1234")
@Test
void scheduledJobFiresAtMidnight() { }

@EnabledOnOs(OS.LINUX)
@Test
void usesEpollOnLinux() { }

@EnabledIfEnvironmentVariable(named = "RUN_SLOW", matches = "true")
@Test
void processesLargeDataset() { }
```

## Parameterized Tests

Replace copy-pasted cases with `@ParameterizedTest`:

```java
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;

class EmailValidatorTest {

    @ParameterizedTest(name = "{0} is valid={1}")
    @CsvSource({
        "user@example.com, true",
        "invalid-email,    false",
        "user@,            false",
        "@example.com,     false"
    })
    void validatesEmail(String input, boolean expected) {
        assertThat(EmailValidator.isValid(input)).isEqualTo(expected);
    }

    @ParameterizedTest
    @ValueSource(ints = {-1, 0, Integer.MIN_VALUE})
    void rejectsNonPositiveQuantity(int qty) {
        assertThatThrownBy(() -> new LineItem("sku", qty))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @ParameterizedTest
    @EnumSource(OrderStatus.class)
    void everyStatusHasDisplayLabel(OrderStatus status) {
        assertThat(status.label()).isNotBlank();
    }

    @ParameterizedTest
    @MethodSource("discountCases")
    void appliesDiscount(Money price, int pct, Money expected) {
        assertThat(price.discount(pct)).isEqualTo(expected);
    }

    static Stream<Arguments> discountCases() {
        return Stream.of(
            Arguments.of(Money.of("100.00", "USD"), 10, Money.of("90.00", "USD")),
            Arguments.of(Money.of("50.00", "USD"),  0,  Money.of("50.00", "USD"))
        );
    }
}
```

## AssertJ Fluent Assertions

Prefer AssertJ over JUnit's `assertEquals` for readability and rich failure
messages.

```java
import static org.assertj.core.api.Assertions.*;

// Objects and chaining
assertThat(user)
    .isNotNull()
    .extracting(User::name, User::active)
    .containsExactly("Alice", true);

// Strings
assertThat(slug).startsWith("market-").doesNotContain(" ").hasSize(13);

// Collections
assertThat(orders)
    .hasSize(3)
    .extracting(Order::status)
    .containsExactlyInAnyOrder(PAID, PAID, REFUNDED);

assertThat(names).containsExactly("Alice", "Bob");      // order matters
assertThat(names).containsExactlyInAnyOrder("Bob", "Alice");

// Exceptions
assertThatThrownBy(() -> service.get("missing"))
    .isInstanceOf(EntityNotFoundException.class)
    .hasMessageContaining("missing");

assertThatNoException().isThrownBy(() -> service.get("exists"));

// Optional
assertThat(repository.findBySlug("x")).isPresent().contains(expectedMarket);
assertThat(repository.findBySlug("none")).isEmpty();

// Numbers and soft assertions (report all failures, not just the first)
assertThat(total).isCloseTo(99.9, within(0.01));

var softly = new org.assertj.core.api.SoftAssertions();
softly.assertThat(dto.id()).isEqualTo(1L);
softly.assertThat(dto.name()).isEqualTo("Alice");
softly.assertAll();
```

## Mockito

Enable annotation-based mocks with the JUnit 5 extension:

```java
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock OrderRepository orderRepository;
    @Mock PaymentGateway paymentGateway;
    @InjectMocks OrderService orderService;   // ctor-injects the mocks above

    @Test
    void placesOrderAndCharges() {
        var req = new OrderRequest("sku-1", 2);
        when(orderRepository.save(any(Order.class)))
            .thenAnswer(inv -> inv.getArgument(0));
        when(paymentGateway.charge(any())).thenReturn(PaymentResult.ok("txn-1"));

        Order order = orderService.place(req);

        assertThat(order.status()).isEqualTo(PAID);
        verify(paymentGateway).charge(any(ChargeRequest.class));
        verify(orderRepository).save(any(Order.class));
        verifyNoMoreInteractions(paymentGateway);
    }
}
```

### Stubbing Behaviour

```java
when(repo.findById(1L)).thenReturn(Optional.of(user));
when(repo.findById(99L)).thenReturn(Optional.empty());
when(gateway.charge(any())).thenThrow(new GatewayTimeoutException());

// void methods
doNothing().when(mailer).send(any());
doThrow(new IllegalStateException()).when(mailer).send(null);

// consistent stubbing for spies / real-object guards
doReturn(42).when(spyService).expensiveCompute();
```

### Verifying Interactions

```java
verify(repo).save(user);                 // exactly once (default)
verify(repo, times(2)).save(any());
verify(repo, never()).delete(any());
verify(mailer, atLeastOnce()).send(any());
verifyNoInteractions(auditLog);
```

### Spies

Wrap a real object and override selectively:

```java
List<String> spy = spy(new ArrayList<>());
spy.add("one");
verify(spy).add("one");
when(spy.size()).thenReturn(100);        // override one method, rest are real
```

### ArgumentCaptor

Capture and assert on arguments passed to a mock:

```java
@Captor ArgumentCaptor<Order> orderCaptor;

@Test
void persistsOrderWithComputedTotal() {
    orderService.place(new OrderRequest("sku-1", 3));

    verify(orderRepository).save(orderCaptor.capture());
    Order saved = orderCaptor.getValue();
    assertThat(saved.total()).isEqualTo(Money.of("29.97", "USD"));
    assertThat(saved.status()).isEqualTo(PENDING);
}
```

Use `ArgumentMatchers` (`any()`, `eq()`, `argThat(...)`) for stubbing; use
`ArgumentCaptor` when you need to assert on the actual value after the call.

## Testcontainers — Integration Tests Against Real Dependencies

Unit tests should mock collaborators. For data-layer and end-to-end behaviour,
test against a **real** containerized dependency instead of an in-memory
substitute that drifts from production.

```java
import org.junit.jupiter.api.*;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.*;

@Testcontainers
class OrderRepositoryIntegrationTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES =
        new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("appdb")
            .withUsername("test")
            .withPassword("test");

    DataSource dataSource;

    @BeforeEach
    void setUp() {
        dataSource = buildDataSource(
            POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        Flyway.configure().dataSource(dataSource).load().migrate();
    }

    @Test
    void savesAndReadsBackOrder() {
        var repo = new JdbcOrderRepository(dataSource);
        var saved = repo.save(new Order("sku-1", 2));

        assertThat(repo.findById(saved.id())).isPresent();
    }
}
```

A `static` `@Container` is started once per class (shared across methods); a
non-static `@Container` restarts per test method. Reuse static containers for
speed unless a test needs a pristine database.

### Spring Boot + Testcontainers

Wire container properties into the Spring context with
`@DynamicPropertySource` (or `@ServiceConnection` on Spring Boot 3.1+):

```java
@DynamicPropertySource
static void datasourceProps(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
    registry.add("spring.datasource.username", POSTGRES::getUsername);
    registry.add("spring.datasource.password", POSTGRES::getPassword);
}
```

## Spring Boot Test Slices

Slice annotations boot only part of the context for fast, focused tests. This
section is a summary — see `csp-springboot-patterns` for full framework details.

```java
// Web layer only — MockMvc, no DB, no services beyond what you mock
@WebMvcTest(MarketController.class)
class MarketControllerTest {

    @Autowired MockMvc mockMvc;
    @MockBean MarketService marketService;   // replace the real bean

    @Test
    void returns404WhenMarketMissing() throws Exception {
        when(marketService.findBySlug("missing"))
            .thenThrow(new MarketNotFoundException("missing"));

        mockMvc.perform(get("/markets/missing"))
            .andExpect(status().isNotFound());
    }
}

// JPA layer only — in-memory or Testcontainers DB, repositories + EntityManager
@DataJpaTest
class MarketRepositoryTest {

    @Autowired MarketRepository marketRepository;

    @Test
    void findsBySlug() {
        marketRepository.save(new Market("acme", ACTIVE));
        assertThat(marketRepository.findBySlug("acme")).isPresent();
    }
}
```

Use `@SpringBootTest` only for true full-context integration tests; it is the
slowest option. Prefer slices and plain unit tests.

## Test Naming Conventions

- **Files**: mirror the production class — `OrderService` → `OrderServiceTest`.
  Use `*Tests` or `*IT` (integration) consistently with your build config
  (Surefire runs `*Test`; Failsafe runs `*IT`).
- **Methods**: describe behaviour, not implementation. Pick one style per
  codebase and keep it consistent:
  - `methodUnderTest_condition_expectedResult` — e.g.
    `place_emptyCart_throwsEmptyCartException`
  - plain sentence camelCase — e.g. `returns404WhenMarketMissing`
- Use `@DisplayName("...")` for human-readable reports when method names get long.
- One behaviour per test; the name should let a failure be understood without
  reading the body.

## Coverage with JaCoCo

### Maven

```xml
<plugin>
  <groupId>org.jacoco</groupId>
  <artifactId>jacoco-maven-plugin</artifactId>
  <version>0.8.12</version>
  <executions>
    <execution>
      <goals><goal>prepare-agent</goal></goals>
    </execution>
    <execution>
      <id>report</id>
      <phase>test</phase>
      <goals><goal>report</goal></goals>
    </execution>
    <execution>
      <id>check</id>
      <goals><goal>check</goal></goals>
      <configuration>
        <rules>
          <rule>
            <element>BUNDLE</element>
            <limits>
              <limit>
                <counter>LINE</counter>
                <value>COVEREDRATIO</value>
                <minimum>0.80</minimum>
              </limit>
            </limits>
          </rule>
        </rules>
      </configuration>
    </execution>
  </executions>
</plugin>
```

```bash
mvn test            # runs tests + writes target/site/jacoco/index.html
mvn verify          # also enforces the coverage check rule
```

### Gradle

```kotlin
plugins { jacoco }

tasks.test { finalizedBy(tasks.jacocoTestReport) }
tasks.jacocoTestReport { dependsOn(tasks.test) }

tasks.jacocoTestCoverageVerification {
    violationRules {
        rule { limit { minimum = "0.80".toBigDecimal() } }
    }
}
tasks.check { dependsOn(tasks.jacocoTestCoverageVerification) }
```

Treat coverage as a floor, not a goal: 80% line coverage with meaningful
assertions beats 100% coverage that never asserts behaviour.

## Anti-Patterns

| Anti-Pattern | Why It's Bad | Do This Instead |
|--------------|--------------|-----------------|
| `Thread.sleep()` to wait for async work | Slow and flaky | Use Awaitility, `CompletableFuture.get`, or deterministic clocks |
| Tests depending on execution order | Hidden shared state breaks in isolation | Fresh state in `@BeforeEach`; no static mutable fields |
| Asserting on logs or `System.out` | Brittle, couples test to formatting | Assert on return values and observable state |
| Mocking value objects / DTOs | Adds noise, tests the mock not the code | Construct real instances |
| Over-mocking (mocking everything) | Tests verify wiring, not behaviour | Mock only external collaborators (DB, HTTP, clock) |
| One giant test with many asserts | First failure hides the rest | One behaviour per test, or SoftAssertions |
| `@SpringBootTest` for a single class | Boots whole context, very slow | Use the narrowest slice or a plain unit test |
| In-memory DB standing in for prod DB | Dialect drift masks real bugs | Testcontainers with the real engine |
| Catching exceptions to assert manually | Misses the "no throw" case | `assertThatThrownBy` / `assertThatNoException` |
| Ignoring `@Disabled` tests forever | Dead coverage, false confidence | Track with a ticket and a deadline, or delete |

## Best Practices

1. Arrange-Act-Assert structure in every test.
2. Test behaviour through the public API, not private internals.
3. Mock only what you do not own (external systems); use real domain objects.
4. Keep tests deterministic — inject `Clock`, seed randomness, no sleeps.
5. Prefer parameterized tests over copy-pasted near-duplicates.
6. Name tests so a CI failure is self-explanatory.
7. Use the fastest test that proves the point: unit > slice > full integration.
8. Run integration tests (`*IT`) in a separate phase (Failsafe) so unit feedback stays fast.

## Related Skills

- [[csp-java-coding-standards]]
- [[csp-springboot-patterns]]
- [[csp-db-migration]]
