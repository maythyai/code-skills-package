# JUnit 5 Patterns

## Project Setup

- Place tests in `src/test/java` (Java) or `src/test/kotlin` (Kotlin).
- Include `junit-jupiter-api`, `junit-jupiter-engine`, `junit-jupiter-params`.
- Run with `mvn test` or `gradle test`.

## Test Structure

- Test class name: `<ClassName>Test` (e.g., `OrderServiceTest`).
- Method naming: `methodName_should_expectedBehavior_when_scenario`.
- Follow Arrange-Act-Assert (AAA) in every test method.
- Use `@DisplayName` for human-readable test descriptions:
  ```java
  @DisplayName("Should calculate discount for VIP customer")
  void shouldCalculateDiscountForVipCustomer() { }
  ```

## Lifecycle Callbacks

| Annotation      | Scope       | Method Requirement |
|-----------------|-------------|--------------------|
| `@BeforeEach`   | Per test    | instance method    |
| `@AfterEach`    | Per test    | instance method    |
| `@BeforeAll`    | Per class   | static (or `@TestInstance(PER_CLASS)`) |
| `@AfterAll`     | Per class   | static (or `@TestInstance(PER_CLASS)`) |

## Core Principles

- One behavior per test method. Do not assert multiple unrelated conditions.
- Tests must be independent and idempotent; no shared mutable state.
- Avoid `@Order` unless strictly necessary; prefer `@TestMethodOrder(OrderAnnotation.class)` only for integration tests with setup dependencies.
- Use `@Disabled("reason")` to skip tests temporarily, always with a reason string.
- Group related tests with `@Nested` inner classes for better organization.

## Assertions

- Prefer AssertJ for fluent, readable assertions:
  ```java
  assertThat(order.getTotal()).isEqualByComparingTo(new BigDecimal("99.99"));
  assertThat(order.getItems()).hasSize(3).extracting(Item::getName).contains("Widget");
  ```
- Use `assertThrows` / `assertDoesNotThrow` for exception testing:
  ```java
  assertThatThrownBy(() -> service.process(invalid))
      .isInstanceOf(BusinessException.class)
      .hasMessageContaining("Invalid order");
  ```
- Use `assertAll` to group related assertions so all are checked before failure.

## Parameterized (Data-Driven) Tests

Use `@ParameterizedTest` with the appropriate source:

| Source           | Use Case                                      |
|------------------|-----------------------------------------------|
| `@ValueSource`   | Simple literals (strings, ints, booleans)     |
| `@MethodSource`  | Factory method returning `Stream`/`Collection`|
| `@CsvSource`     | Inline CSV rows for multi-arg scenarios       |
| `@CsvFileSource` | External CSV file on classpath                |
| `@EnumSource`    | All or selected enum constants                |

Example:
```java
@ParameterizedTest
@CsvSource({
    "100, VIP,   90.00",
    "100, REGULAR, 100.00",
    "0,   VIP,   0.00"
})
void shouldApplyDiscountBasedOnCustomerType(double subtotal, String type, double expected) {
    assertThat(service.calculateFinal(subtotal, type)).isEqualByComparingTo(expected);
}
```

## Mocking with Mockito

- Use `@Mock` for dependencies and `@InjectMocks` for the class under test.
- Prefer `when(...).thenReturn(...)` for stubbing; `verify(...)` for interaction checks.
- Keep mocks at unit-test boundaries; use real collaborators in slice/integration tests.

## Nested Test Organization

Use `@Nested` to group tests by scenario or precondition:

```java
@Nested
@DisplayName("When customer is VIP")
class VipCustomerTests {

    @BeforeEach
    void setUpVipCustomer() { /* shared VIP setup */ }

    @Test void shouldApplyDiscount() { }
    @Test void shouldAllowBackorder() { }
}
```

## Test Data Generation

- For simple objects, use constructors or builder patterns directly.
- For complex objects with 3+ properties, consider **Instancio**:
  ```java
  Order vipOrder = Instancio.of(Order.class)
      .set(field(Order::getCustomerType), "VIP")
      .create();
  ```

## Common Anti-Patterns to Avoid

- **Assertion-free tests**: tests that call code but never assert; they catch only crashes.
- **Over-mocking**: mocking the class under test or its value objects obscures real behavior.
- **Shared mutable fixtures**: static fields or `@BeforeAll` that mutate across tests cause ordering bugs.
- **Giant test methods**: if a test exceeds 30 lines, split by scenario using `@Nested`.
- **Ignoring failures**: `try/catch` that swallows exceptions inside a test masks real defects.

## Test Organization

- Group by feature or component using packages.
- Use `@Tag("fast")`, `@Tag("integration")` for filtering in CI pipelines.
- Run tagged groups selectively: `mvn test -Dgroups=integration`.
