---
name: csp-backend-mock-strategies
description: >
  Server-side test doubles and dependency mocking: Testcontainers for real
  databases/brokers/cloud services in Docker, WireMock 3.x and MockServer for
  HTTP stubbing with fault injection, Hoverfly for record/replay, LocalStack for
  AWS, Azurite for Azure, GCS emulator, smtp4dev, bufconn for in-process gRPC,
  and Toxiproxy for network chaos. Unlike csp-mock-strategies which is
  frontend/MSW-biased, this skill covers the backend/server-side mocking stack
  where fidelity to real dependency behavior matters more than speed.
version: 0.1.0
layer: 3
category: patterns
phase: build
domain: testing
role: specialist
scope: implementation
tools: [Read, Write, Edit, Bash, Glob, Grep]
related_skills:
  - [[csp-mock-strategies]]
  - [[csp-docker-patterns]]
  - [[csp-java-testing]]
  - [[csp-golang-testing]]
  - [[csp-python-testing]]
  - [[csp-typescript-testing]]
  - [[csp-api-tester]]
  - [[csp-cross-layer-testing]]
  - [[csp-chaos-testing]]
anti_rationalizations:
  "前端有 MSW 就够了": "MSW 拦截 fetch/XHR，测不到服务间 gRPC/Kafka/DB/云存储行为；后端要 Testcontainers + WireMock + LocalStack"
  "用 docker-compose 起依赖就行": "docker-compose 是手工编排、端口冲突、清理不干净；Testcontainers 给你生命周期管理 + 动态端口 + 自动清理"
  "mock 掉外部服务测不到真行为": "对——所以核心路径用 Testcontainers 起真依赖，边缘路径用 WireMock 注入故障；两层互补"
---

# Backend Mock Strategies

Server-side test doubles: when to use a *real* dependency in a container, when to stub it over HTTP, when to fake it in-process, and how to inject faults to prove your retry/timeout/circuit-breaker logic actually works.

## When to Activate

- Service calls 3+ external dependencies (DB, cache, queue, cloud storage, third-party API)
- You need deterministic CI without cloud credentials or shared staging
- Testing retry/circuit-breaker/timeout logic requires fault injection
- Local dev needs to run the full stack without a cloud account
- Integration tests are flaky because of shared mutable state in a staging environment
- You're adopting Testcontainers and need a migration path from hand-rolled docker-compose

## Boundary with csp-mock-strategies

| Dimension | csp-mock-strategies (frontend) | csp-backend-mock-strategies (this) |
|---|---|---|
| Primary tool | MSW (intercepts fetch/XHR) | Testcontainers, WireMock, LocalStack |
| Runs in | Browser / Node (jsdom) | JVM / Go / Python / Node server process |
| Fidelity | HTTP-level interception | Real binary in Docker (Postgres, Kafka) or high-fidelity HTTP stub |
| Speed priority | Fastest (ms) | Balanced (s for containers, ms for stubs) |
| Fault injection | `delay()`, status codes | Toxics, WireMock faults, Chaos Mesh |
| State | In-memory handlers | Container lifecycle, volume mounts, record/replay |

> Frontend mocks the *network boundary*; backend mocks (or containerizes) the *dependency itself*.

## Backend Test Double Decision Matrix

| Dependency | Real (Testcontainers) | Stub (WireMock/MockServer) | Fake (in-process) | Chaos (Toxiproxy) |
|---|---|---|---|---|
| PostgreSQL / MySQL | ✅ Default for integration | ❌ | ⚠️ SQLite (limited fidelity) | ✅ Latency/partition |
| Redis | ✅ | ❌ | ✅ in-memory map (simple cases) | ✅ |
| Kafka / RabbitMQ | ✅ Testcontainers module | ❌ | ✅ embedded broker (limited) | ✅ |
| Third-party HTTP API | ❌ (can't) | ✅ WireMock record/replay | ✅ Hand-rolled fake | ✅ |
| AWS S3 / SQS / Lambda | ✅ LocalStack (Pro for Lambda) | ✅ WireMock + AWS SDK stub | ✅ fake-gcs-server (GCS) | ✅ |
| gRPC service | ✅ bufconn (in-process) | ⚠️ WireMock gRPC (beta) | ✅ Hand-rolled fake | ✅ |
| SMTP | ✅ smtp4dev / MailHog | ✅ WireMock | ✅ in-memory sink | ✅ |
| Elasticsearch | ✅ Testcontainers module | ❌ | ⚠️ Limited | ✅ |

**Rule of thumb**: real for things you *own* (DB, cache, queue), stub for things you *don't* (third-party APIs), fake for simple deterministic cases, chaos for resilience validation.

## Tool Matrix by Ecosystem

| Tool | Languages | Install | Notes |
|---|---|---|---|
| Testcontainers 1.20.x / 10.x / 0.34 / 4.x | Java, JS/TS, Go, Python, .NET, Rust | `org.testcontainers:*` / `npm i -D testcontainers` / `go get testcontainers-go` / `pip install testcontainers` | Modules for Postgres, MySQL, Redis, Kafka, RabbitMQ, MongoDB, ES, LocalStack, WireMock, Jaeger |
| WireMock 3.x | Any (HTTP) | `docker run wiremock/wiremock:3.9.1` or `org.testcontainers:wiremock` | Scenarios (stateful), fault injection, record/replay, gRPC (beta) |
| MockServer 5.15+ | Any (HTTP) | `docker run mockserver/mockserver` | Expectation DSL, better for complex request matching |
| Hoverfly 1.5+ | Any (HTTP/gRPC) | `docker run spectolabs/hoverfly` | Capture/replay + simulation modes |
| LocalStack 3.x | Any (AWS) | `docker run localstack/localstack:3` | Community: S3, SQS, SNS, DynamoDB. Pro: Lambda, Step Functions, IAM parity |
| Azurite | Any (Azure) | `docker run mcr.microsoft.com/azure-storage/azurite` | Blob, Queue, Table |
| fake-gcs-server | Any (GCP) | `docker run fsouza/fake-gcs-server` | GCS, Pub/Sub (partial) |
| smtp4dev / MailHog | Any (SMTP) | `docker run rnwood/smtp4dev` | Capture + inspect emails |
| bufconn | Go (gRPC) | `google.golang.org/grpc/test/bufconn` | In-process gRPC, no network, no ports |
| Toxiproxy 2.13 | Any (TCP) | `docker run ghcr.io/shopify/toxiproxy` | Latency, bandwidth, slow_close, timeout, reset_peer toxics |

## Pattern 1: Testcontainers (Java, Spring Boot 3.4+ @ServiceConnection)

```java
@SpringBootTest
@Testcontainers
class OrderRepositoryIT {
    @Container
    @ServiceConnection  // Spring Boot 3.3+: auto-wires DataSource from container
    static PostgreSQLContainer<?> pg = new PostgreSQLContainer<>("postgres:16-alpine")
        .withDatabaseName("orders_test")
        .withReuse(true);  // reuse across test classes (dev only; CI should not reuse)

    @Container
    @ServiceConnection
    static KafkaContainer kafka = new KafkaContainer(DockerImageName.parse("confluentinc/cp-kafka:7.6.0"));

    @Autowired OrderRepository repo;
    @Autowired KafkaTemplate<String, OrderEvent> kafkaTemplate;

    @Test
    void saves_order_and_publishes_event() {
        Order order = new Order(UUID.randomUUID(), "user-1", BigDecimal.valueOf(42));
        repo.save(order);

        assertThat(repo.findById(order.id())).isPresent();

        // Assert Kafka event published
        try (KafkaTestUtils.Record<String, OrderEvent> record =
                 KafkaTestUtils.getSingleRecord(consumerFactory, "order-events")) {
            assertThat(record.value().orderId()).isEqualTo(order.id());
        }
    }
}
```

`@ServiceConnection` (Spring Boot 3.3+) eliminates manual `@DynamicPropertySource` wiring. `withReuse(true)` speeds up local dev; **never** enable in CI (state leaks between runs).

## Pattern 2: Testcontainers (Node/TS)

```typescript
// integration-tests/setup.ts
import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { KafkaContainer, StartedKafkaContainer } from "@testcontainers/kafka";
import { beforeAll, afterAll } from "vitest";

let pg: StartedPostgreSqlContainer;
let kafka: StartedKafkaContainer;

beforeAll(async () => {
  pg = await new PostgreSqlContainer("postgres:16-alpine")
    .withDatabase("orders_test")
    .start();
  kafka = await new KafkaContainer("confluentinc/cp-kafka:7.6.0").start();

  process.env.DATABASE_URL = pg.getConnectionUri();
  process.env.KAFKA_BROKERS = kafka.getBrokers();

  await runMigrations(pg.getConnectionUri());
}, 60_000);

afterAll(async () => {
  await kafka?.stop();
  await pg?.stop();
});
```

## Pattern 3: Testcontainers (Go)

```go
// integration_test.go
func TestOrderRepo(t *testing.T) {
    ctx := context.Background()
    pg, err := postgres.Run(ctx, "postgres:16-alpine",
        postgres.WithDatabase("orders_test"),
        postgres.WithUsername("test"),
        postgres.WithPassword("test"),
    )
    if err != nil { t.Fatal(err) }
    defer pg.Terminate(ctx)

    connStr, _ := pg.ConnectionString(ctx)
    db, _ := sql.Open("pgx", connStr)
    defer db.Close()

    repo := NewOrderRepo(db)
    order := Order{ID: uuid.New(), UserID: "u1", Total: 42.0}
    if err := repo.Save(ctx, order); err != nil { t.Fatal(err) }

    got, err := repo.FindByID(ctx, order.ID)
    if err != nil { t.Fatal(err) }
    if got.Total != order.Total { t.Errorf("total mismatch: %v != %v", got.Total, order.Total) }
}
```

## Pattern 4: WireMock Fault Injection (retry/timeout validation)

```java
@Testcontainers
class PaymentClientIT {
    @Container
    static WireMockContainer wm = new WireMockContainer("wiremock/wiremock:3.9.1");

    @Test
    void retries_on_503_with_exponential_backoff() {
        // First 2 calls: 503. Third: success.
        wm.stubFor(post(urlEqualTo("/charge"))
            .inScenario("retry")
            .whenScenarioStateIs(Scenario.STARTED)
            .willReturn(aResponse().withStatus(503))
            .willSetStateTo("first-retry"));

        wm.stubFor(post(urlEqualTo("/charge"))
            .inScenario("retry")
            .whenScenarioStateIs("first-retry")
            .willReturn(aResponse().withStatus(503))
            .willSetStateTo("second-retry"));

        wm.stubFor(post(urlEqualTo("/charge"))
            .inScenario("retry")
            .whenScenarioStateIs("second-retry")
            .willReturn(aResponse().withStatus(200).withBody("{\"status\":\"ok\"}")));

        PaymentClient client = new PaymentClient(wm.getBaseUrl(), RetryPolicy.exponential(3));
        ChargeResult result = client.charge(100);

        assertThat(result.status()).isEqualTo("ok");
        wm.verify(3, postRequestedFor(urlEqualTo("/charge")));
    }

    @Test
    void times_out_on_slow_response() {
        wm.stubFor(post(urlEqualTo("/charge"))
            .willReturn(aResponse().withStatus(200).withFixedDelay(5000)));

        PaymentClient client = new PaymentClient(wm.getBaseUrl(),
            TimeoutPolicy.of(Duration.ofMillis(500)));

        assertThatThrownBy(() -> client.charge(100))
            .isInstanceOf(PaymentTimeout.class);
    }

    @Test
    void handles_malformed_response() {
        wm.stubFor(post(urlEqualTo("/charge"))
            .willReturn(aResponse().withFault(Fault.MALFORMED_RESPONSE_CHUNK)));

        assertThatThrownBy(() -> client.charge(100))
            .isInstanceOf(PaymentProtocolError.class);
    }
}
```

WireMock scenarios give you *stateful* fault sequences (fail→fail→succeed) — essential for testing retry logic. `Fault.MALFORMED_RESPONSE_CHUNK`, `CONNECTION_RESET_BY_PEER`, `EMPTY_RESPONSE`, `RANDOM_DATA_THEN_CLOSE` cover the protocol-level failure modes.

## Pattern 5: WireMock Record/Replay (capture real third-party behavior)

```bash
# 1. Start WireMock in proxy+record mode against the real API
docker run -p 8080:8080 -v $PWD/stubs:/home/wiremock wiremock/wiremock:3.9.1 \
  --proxy-all="https://api.stripe.com" --record-mappings

# 2. Exercise your app against the WireMock proxy (it forwards + records)
curl http://localhost:8080/v1/charges -H "Authorization: Bearer sk_test_..."

# 3. Stop WireMock. Stubs are in ./stubs/mappings/ and ./stubs/__files/
# 4. Commit stubs (REDACT SECRETS FIRST), replay in CI without network
docker run -p 8080:8080 -v $PWD/stubs:/home/wiremock wiremock/wiremock:3.9.1
```

Record/replay gives you high-fidelity third-party stubs without maintaining them by hand. **Always redact secrets** from recorded stubs before committing.

## Pattern 6: LocalStack (AWS services in CI)

```java
@Testcontainers
class S3StorageIT {
    @Container
    static LocalStackContainer localstack = new LocalStackContainer("localstack/localstack:3")
        .withServices(LocalStackContainer.Service.S3, LocalStackContainer.Service.SQS);

    @Test
    void uploads_to_s3_and_sends_sqs_notification() {
        S3Client s3 = S3Client.builder()
            .endpointOverride(localstack.getEndpoint())
            .credentialsProvider(localstack.getDefaultCredentialsProvider())
            .region(localstack.getRegion())
            .build();

        s3.createBucket(b -> b.bucket("uploads"));
        s3.putObject(b -> b.bucket("uploads").key("file.txt"),
                     RequestBody.fromString("hello"));

        S3Object obj = s3.getObject(b -> b.bucket("uploads").key("file.txt"));
        assertThat(new String(obj.readAllBytes())).isEqualTo("hello");
    }
}
```

LocalStack Community covers S3, SQS, SNS, DynamoDB, CloudWatch. **Pro** is required for Lambda, Step Functions, ECS, and full IAM parity. Budget accordingly.

## Pattern 7: bufconn (in-process gRPC, Go)

```go
// service_test.go
func TestOrderService_CreateOrder(t *testing.T) {
    lis := bufconn.Listen(1024 * 1024)
    s := grpc.NewServer()
    pb.RegisterOrderServiceServer(s, &fakeOrderServer{})
    go s.Serve(lis)
    defer s.Stop()

    conn, _ := grpc.DialContext(context.Background(), "bufnet",
        grpc.WithContextDialer(func(ctx context.Context, addr string) (net.Conn, error) {
            return lis.Dial()
        }),
        grpc.WithTransportCredentials(insecure.NewCredentials()))
    defer conn.Close()

    client := pb.NewOrderServiceClient(conn)
    resp, err := client.CreateOrder(context.Background(), &pb.CreateOrderRequest{
        UserId: "u1", Total: 42.0,
    })
    if err != nil { t.Fatal(err) }
    if resp.OrderId == "" { t.Error("expected order id") }
}
```

bufconn gives you gRPC testing with **zero network, zero ports, zero Docker** — fastest possible gRPC test. Use it for unit/integration; reserve Testcontainers + real gRPC server for E2E.

## Pattern 8: Toxiproxy Sidecar (network chaos in integration tests)

```yaml
# docker-compose.test.yml
services:
  toxiproxy:
    image: ghcr.io/shopify/toxiproxy:2.13.0
    ports: ["8474:8474"]
  postgres:
    image: postgres:16-alpine
  app:
    depends_on: [toxiproxy, postgres]
    environment:
      DATABASE_URL: postgresql://test:test@toxiproxy:15432/app_test
```

```bash
# Create proxy: app → toxiproxy:15432 → postgres:5432
curl -X POST localhost:8474/proxies \
  -d '{"name":"pg","listen":"0.0.0.0:15432","upstream":"postgres:5432"}'

# Inject 500ms latency + 100ms jitter
curl -X POST localhost:8474/proxies/pg/toxics \
  -d '{"name":"lag","type":"latency","attributes":{"latency":500,"jitter":100}}'

# Run integration tests against the degraded path
DATABASE_URL=postgresql://test:test@localhost:15432/app_test npm run test:integration

# Remove toxic, verify recovery
curl -X DELETE localhost:8474/proxies/pg/toxics/lag
```

Toxiproxy is deterministic chaos for CI — unlike pod-kill roulette. Pair with [[csp-chaos-testing]] for Kubernetes-scale experiments.

## Test Isolation & Cleanup

```java
// Per-test isolation: each test gets a clean DB state
@BeforeEach
void cleanDb(@Autowired JdbcTemplate jdbc) {
    jdbc.execute("TRUNCATE orders, order_items, users RESTART IDENTITY CASCADE");
}

// Container reuse (dev only): skip recreate if same image+config
@Testcontainers
class ReusableIT {
    @Container
    static PostgreSQLContainer<?> pg = new PostgreSQLContainer<>("postgres:16-alpine")
        .withReuse(true);  // requires ~/.testcontainers.properties: testcontainers.reuse.enable=true
}
```

- **CI**: never reuse containers. State leaks = flaky tests = lost trust.
- **Local dev**: `withReuse(true)` cuts startup from 30s to 2s. Document the `.testcontainers.properties` requirement.
- **Cleanup**: `TRUNCATE ... CASCADE` between tests, or use `@Transactional` + rollback (Spring).

## Anti-Patterns

- **Mocking everything** — You never learn how real Postgres/Kafka behaves (lock contention, rebalancing, fsync latency). Use real dependencies for core paths.
- **Shared mutable stubs across tests** — Use `@BeforeEach wm.resetAll()` or per-test WireMock instances. Cross-test stub leakage is the #1 source of "passes alone, fails in suite."
- **No fault injection** — Happy-path mocks hide retry/timeout/circuit-breaker bugs. Every external dependency test should include at least one fault scenario.
- **LocalStack Community for advanced AWS** — Lambda, Step Functions, ECS need Pro. Budget or use real AWS with a sandbox account.
- **Hardcoded ports** — Use `container.getMappedPort(5432)` / `pg.getConnectionUri()`. Hardcoded ports break in parallel CI.
- **Committing recorded stubs with secrets** — Record/replay captures auth headers, API keys, tokens. Redact before commit; audit regularly.
- **Testcontainers without Docker availability check** — `@Testcontainers(disabledWithoutDocker = true)` or `DockerClientFactory.instance().isDockerAvailable()`. Fail fast with a clear message, not a timeout.

## Related Skills

- [[csp-mock-strategies]] — Frontend/MSW mocking; this skill is the server-side complement
- [[csp-docker-patterns]] — Docker/Docker Compose fundamentals that Testcontainers builds on
- [[csp-java-testing]] / [[csp-golang-testing]] / [[csp-python-testing]] / [[csp-typescript-testing]] — Language harnesses hosting Testcontainers/WireMock
- [[csp-api-tester]] — API functional/perf/security testing; backend mocks provide the dependency layer
- [[csp-cross-layer-testing]] — Cross-layer verifies UI→API→DB→UI; backend mocks make the DB/API layers deterministic
- [[csp-chaos-testing]] — Toxiproxy is deterministic chaos for CI; Chaos Mesh is Kubernetes-scale
