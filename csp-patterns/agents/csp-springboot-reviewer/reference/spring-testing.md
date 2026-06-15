# Spring Boot Testing

## Test Pyramid

Unit (fast, many) > Slice (focused, moderate) > Integration (complete, few).
Use the narrowest slice that gives confidence for each scenario.

## Test Slices

| Annotation          | What It Loads                          | What It Stubs              |
|---------------------|----------------------------------------|----------------------------|
| `@WebMvcTest`       | Controllers, filters, advices          | `@Service`, `@Repository`  |
| `@DataJpaTest`      | JPA entities, repositories             | In-memory DB by default    |
| `@RestClientTest`   | `RestClient` / `RestTemplate` beans    | `MockRestServiceServer`    |
| `@JsonTest`         | `@JsonComponent`, Jackson config       | Everything else            |
| `@SpringBootTest`   | Full application context               | Nothing (real context)     |

### WebMvcTest Pattern

```java
@WebMvcTest(OrderController.class)
class OrderControllerTest {

    @Autowired MockMvc mockMvc;
    @MockitoBean OrderService service;

    @Test
    @DisplayName("POST /orders returns 201 with created order")
    void shouldCreateOrder() throws Exception {
        var dto = new CreateOrderRequest("Widget", 2);
        var result = new OrderResponse(1L, "Widget", 2, new BigDecimal("19.98"));
        when(service.create(dto)).thenReturn(result);

        mockMvc.perform(post("/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value(1L))
            .andExpect(jsonPath("$.total").value(19.98));
    }
}
```

### DataJpaTest with Testcontainers

```java
@DataJpaTest
@Testcontainers
class OrderRepositoryTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired OrderRepository repository;

    @Test
    void shouldFindByCustomerEmail() {
        repository.save(new Order("alice@example.com", "Widget", 1));
        var results = repository.findByCustomerEmail("alice@example.com");
        assertThat(results).hasSize(1).first().extracting(Order::getItem).isEqualTo("Widget");
    }
}
```

## Spring Boot 4 Modern APIs

### MockMvcTester (AssertJ-style, 3.2+)

```java
var mockMvcTester = MockMvcTester.of(mockMvc);
assertThat(mockMvcTester.get().uri("/orders/1"))
    .hasStatusOk()
    .body().jsonPath("$.id").isEqualTo(1);
```

### RestTestClient (replaces TestRestTemplate)

```java
@SpringBootTest(webEnvironment = RANDOM_PORT)
class OrderApiIntegrationTest {

    @Autowired RestTestClient restTestClient;

    @Test
    void shouldCreateAndRetrieveOrder() {
        var response = restTestClient.post()
            .uri("/orders")
            .body(new CreateOrderRequest("Widget", 2))
            .exchange()
            .expectStatus().isCreated()
            .expectBody(OrderResponse.class)
            .returnResult().getResponseBody();

        assertThat(response.id()).isNotNull();
    }
}
```

### @MockitoBean (replaces @MockBean)

```java
@WebMvcTest(OrderController.class)
class OrderControllerTest {
    @MockitoBean OrderService service;  // not @MockBean (deprecated)
}
```

## Coverage Guidelines

- Target 80% minimum; focus on meaningful assertions, not just execution.
- Prioritize: business-critical paths > complex algorithms > error handling > integration points.
- Use Jacoco for coverage reporting.
- When a method needs more than 5-7 test cases, recommend refactoring into smaller units before writing tests.

## Test Ordering

Structure each test class:
1. Happy path (main scenario)
2. Alternative valid paths and edge cases
3. Exception and error conditions

## Dependencies (Spring Boot 4)

```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-test</artifactId>
  <scope>test</scope>
</dependency>
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-testcontainers</artifactId>
  <scope>test</scope>
</dependency>
```
