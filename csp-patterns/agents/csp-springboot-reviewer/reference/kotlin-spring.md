# Kotlin Spring Boot Patterns

## Dependency Injection

Use the primary constructor for all required dependencies. Declare them `private val`.

```kotlin
@Service
class OrderService(
    private val repository: OrderRepository,
    private val paymentClient: PaymentClient,
) {
    fun process(request: CreateOrderRequest): OrderResponse { ... }
}
```

Never use field injection (`@Autowired` on properties). Prefer constructor parameters.

## Configuration Properties

Use `data class` with `@ConfigurationProperties` for immutable, type-safe config.

```kotlin
@ConfigurationProperties("app.orders")
data class OrderProperties(
    val maxItems: Int = 10,
    val defaultCurrency: String = "USD",
    val discount: DiscountProperties = DiscountProperties(),
)

data class DiscountProperties(
    val vipRate: BigDecimal = BigDecimal("0.10"),
    val enabled: Boolean = true,
)
```

## DTOs and Validation

Use `data class` for DTOs. Apply Bean Validation annotations with `@field:` use-site target.

```kotlin
data class CreateOrderRequest(
    @field:NotBlank val item: String,
    @field:Min(1) val quantity: Int,
    @field:Email val customerEmail: String,
)
```

## JPA Entities

Enable the `kotlin-jpa` compiler plugin to avoid manual `open` declarations. Leverage Kotlin null safety (`?`) to express optional vs required fields at the type level.

```kotlin
@Entity
@Table(name = "orders")
class Order(
    @Column(nullable = false) var item: String,
    var quantity: Int = 0,
    @Id @GeneratedValue val id: Long? = null,
)
```

## Logging

Declare the logger in a companion object. Use parameterized messages for performance.

```kotlin
companion object {
    private val logger = LoggerFactory.getLogger(OrderService::class.java)
}
```

## Coroutines in Spring

For non-blocking endpoints, use `suspend` functions. Spring Boot has native coroutine support. Use `coroutineScope` or `supervisorScope` to manage concurrent child operations.

```kotlin
@GetMapping("/{id}")
suspend fun getOrder(@PathVariable id: Long): OrderResponse =
    service.findById(id)
```

## Kotlin-Specific Testing

- JUnit 5 works seamlessly; use it as the default test framework.
- Use **MockK** instead of Mockito for idiomatic Kotlin mocking:
  ```kotlin
  val service = mockk<OrderService>()
  every { service.process(any()) } returns expectedResponse
  verify { service.process(match { it.quantity > 0 }) }
  ```
- Use **Kotest** assertions for fluent, readable tests:
  ```kotlin
  response.id shouldNotBe null
  response.items shouldHaveSize 3
  response.total shouldBe BigDecimal("29.97")
  ```
- Test slices (`@WebMvcTest`, `@DataJpaTest`) work the same as in Java.
- Testcontainers integration is identical to the Java setup.
