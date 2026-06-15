---
name: csp-springboot-reviewer
description: >
  Spring Boot code reviewer for Java and Kotlin. Covers JUnit 5 testing, Spring Boot Test,
  MockMvc, TestContainers, and Kotlin-specific Spring patterns. Use for all Spring Boot
  applications in Java or Kotlin.
metadata:
  origin: CSP
  source: awesome-copilot/skills/java-*,kotlin-springboot,spring-boot-testing
  globs: ["**/*.{java,kt}", "**/application*.yml", "**/application*.properties"]
---

# Spring Boot Reviewer

Review Spring Boot code for correctness, idiomatic patterns, test quality, and security.
Applies to Java and Kotlin projects using Spring Boot 2.x through 4.x.

## When to Apply

- Any `*.java` or `*.kt` file in a Spring Boot module
- Configuration files (`application.yml`, `application.properties`)
- Test classes using JUnit 5, Spring Boot Test, or MockMvc
- Build files (`pom.xml`, `build.gradle`) with Spring dependencies

## Review Checklist

### Architecture & Structure
- Package by feature/domain, not by layer (`com.app.order` not `com.app.controller`)
- Constructor injection for all required dependencies; no field injection
- Dependencies declared `final` (Java) or `private val` (Kotlin)
- DTOs used at API boundaries; JPA entities never exposed directly

### Web Layer
- `@RestController` with clear RESTful resource naming
- `@Valid` on request DTOs; Bean Validation annotations present
- Global `@ControllerAdvice` for consistent error responses
- No business logic in controllers; delegate to `@Service`

### Service Layer
- `@Transactional` applied at service method level, not class-wide by default
- Services are stateless; no mutable instance state
- Business rules encapsulated; no HTTP or persistence concerns leaking in

### Data Layer
- `JpaRepository` / `CrudRepository` for standard operations
- `@Query` or Criteria API for complex queries; no string concatenation for SQL
- DTO projections used to fetch only required columns

### Configuration
- `@ConfigurationProperties` with a strongly-typed class (Java record or Kotlin `data class`)
- Profiles for environment-specific config; no hardcoded secrets
- YAML preferred for hierarchical clarity

### Security
- Spring Security for authn/authz; BCrypt for password encoding
- Parameterized queries everywhere; no string concatenation in SQL
- Output encoding to prevent XSS

### Testing
- Follow the test pyramid: unit > slice > integration
- Use the narrowest slice that gives confidence (see decision tree below)
- AssertJ for fluent assertions; avoid raw JUnit assertions for complex checks
- Testcontainers for real-database integration tests

## Test Slice Decision Tree

```
Controller endpoint?        -> @WebMvcTest + MockMvc / MockMvcTester
Repository query?           -> @DataJpaTest + Testcontainers
Service business logic?     -> Plain JUnit 5 + Mockito (no Spring context)
External REST client?       -> @RestClientTest + MockRestServiceServer
JSON serialization?         -> @JsonTest
Full integration?           -> @SpringBootTest (minimal context config)
```

## Spring Boot 4 Highlights

- `@MockitoBean` replaces deprecated `@MockBean`
- `MockMvcTester` provides AssertJ-style web assertions (3.2+)
- `RestTestClient` replaces `TestRestTemplate` for modern HTTP testing
- Context pausing: cached contexts auto-pause (Spring Framework 7)
- Modular test starters: `spring-boot-starter-webmvc-test`, etc.

## Reference Files

- [reference/junit-patterns.md](reference/junit-patterns.md) -- JUnit 5 conventions and data-driven tests
- [reference/spring-testing.md](reference/spring-testing.md) -- Spring Boot Test slices, Testcontainers, coverage
- [reference/kotlin-spring.md](reference/kotlin-spring.md) -- Kotlin-specific Spring Boot patterns

## Review Output Format

For each finding, report:
1. **Severity**: blocker / suggestion / nit
2. **Location**: file path and line/method
3. **Issue**: what is wrong or suboptimal
4. **Fix**: concrete code change or pattern to apply
