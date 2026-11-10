---
name: csp-contract-testing
description: >
  Consumer-driven contract testing across microservice boundaries. Pact v3/v4
  for HTTP, Spring Cloud Contract for JVM, Schemathesis for OpenAPI property-based
  contract checks, buf breaking for gRPC/Protobuf compatibility gates. Use when
  two teams deploy independently, when E2E suites are too brittle to catch version
  drift, or when you need a pre-deploy compatibility gate (can-i-deploy).
version: 0.1.0
layer: 3
category: patterns
phase: verify
domain: testing
role: specialist
scope: implementation
tools: [Read, Write, Edit, Bash, Glob, Grep]
related_skills:
  - [[csp-api-tester]]
  - [[csp-mock-strategies]]
  - [[csp-cross-layer-testing]]
  - [[csp-api-governance]]
  - [[csp-e2e-testing]]
  - [[csp-test-methodology]]
anti_rationalizations:
  "E2E 覆盖了就够了": "E2E 慢且脆，跑一次几分钟；契约测试在 consumer 侧秒级反馈版本漂移，且能在 CI 里做 can-i-deploy 门禁"
  "OpenAPI 就是契约": "OpenAPI 描述的是 provider 想暴露什么，契约描述的是 consumer 实际用什么；两者的差集正是线上事故来源"
  "我们服务少不需要": "只要有两个独立部署的服务 + 一个共享 API，契约漂移就是时间问题；越早建 broker 越便宜"
---

# Contract Testing (Consumer-Driven Contracts)

Encode what each consumer *actually uses* from a provider API, verify the provider still satisfies it before deploy, and gate releases with a compatibility matrix.

## When to Activate

- Two or more services deploy independently and share an HTTP/gRPC/message API
- You've been bitten by a "works on my machine" integration bug after a provider release
- E2E suites are too slow/brittle to catch field-level version drift
- You need a pre-deploy gate answering "can consumer X v1.2.3 talk to provider Y v4.5.6?"
- Adopting gRPC where protobuf field-number discipline matters
- Migrating from spec-first (OpenAPI-only) testing to consumer-driven reality

## Contract Testing Taxonomy

| Style | Who writes | What it encodes | Tool | Blind spot |
|---|---|---|---|---|
| **Consumer-driven (CDC)** | Consumer team | Exactly the fields/paths the consumer calls | Pact, Spring Cloud Contract | Provider features nobody consumes |
| **Provider-first (spec)** | Provider team | Full API surface | OpenAPI + Schemathesis, Dredd | Whether consumers actually use it |
| **Bi-directional** | Both | Pact ↔ OpenAPI overlap | PactFlow (commercial) | Setup complexity |
| **Schema compatibility** | Provider | Wire-format breaking changes | `buf breaking`, `openapi-diff` | Runtime semantics |
| **Message contract** | Consumer | Async event shape (Kafka/SQS) | Pact message, AsyncAPI | Ordering/delivery guarantees |

> CDC is the default for HTTP sync APIs. Use `buf breaking` as a *supplement* for gRPC, and Schemathesis as a *supplement* for OpenAPI conformance — they answer different questions.

## Tool Matrix by Ecosystem

| Language | Consumer lib | Provider verifier | Install |
|---|---|---|---|
| JS/TS | `@pact-foundation/pact` v13+ (PactV4) | `pact-provider-verifier` CLI | `npm i -D @pact-foundation/pact @pact-foundation/pact-cli` |
| Java/Kotlin | `au.com.dius.pact.consumer:junit5` | `pact-jvm-provider-junit5` | Gradle/Maven dep |
| Python | `pact-python` v2+ (pytest-native) | `pact-verifier` CLI | `pip install pact-python` |
| Go | `pact-go` v2 (Ruby FFI) | `pact-go verify` | `go get github.com/pact-foundation/pact-go/v2` |
| Spring (JVM) | Spring Cloud Contract 4.2.x Groovy/YAML DSL | auto-generated WireMock stubs | `spring-cloud-contract-gradle-plugin` |
| OpenAPI (any) | — | Schemathesis 4.x | `uv tool install schemathesis` |
| gRPC/Protobuf | — | `buf breaking` v2 | `brew install bufbuild/buf/buf` |

## Setup & Canonical Commands

```bash
# 1. Consumer writes pact, publishes to broker
npm i -D @pact-foundation/pact @pact-foundation/pact-cli
npx pact-broker publish ./pacts \
  --consumer-app-version=$GIT_SHA \
  --branch=$GIT_BRANCH \
  --broker-base-url=$PACT_BROKER_URL

# 2. Provider verifies against broker (CI)
npx pact-provider-verifier \
  --provider=OrderAPI \
  --provider-base-url=http://localhost:8080 \
  --broker-base-url=$PACT_BROKER_URL \
  --publish-verification-results \
  --provider-app-version=$GIT_SHA

# 3. Pre-deploy gate
npx pact-broker can-i-deploy \
  --pacticipant=OrderUI --version=$GIT_SHA \
  --to-environment=production

# OpenAPI conformance (supplement)
uvx schemathesis run https://staging.example.com/openapi.json --checks all

# gRPC breaking-change gate
buf breaking --against '.git#branch=main' --config buf.yaml
```

## Pattern 1: Pact v4 Consumer Test (JS/TS)

```typescript
// tests/contracts/order.consumer.test.ts
import { PactV4 } from "@pact-foundation/pact";

const provider = new PactV4({
  consumer: "OrderUI",
  provider: "OrderAPI",
  dir: "./pacts",
});

test("fetches an order by id", async () => {
  await provider
    .given("order 42 exists")                       // provider state
    .uponReceiving("GET /orders/42")
    .withRequest("GET", "/orders/42", (b) =>
      b.headers({ Accept: "application/json" })
    )
    .willRespondWith(200, (b) =>
      b.jsonBody({ id: 42, total: 19.99, currency: "USD" })
    )
    .executeTest(async (mock) => {
      const res = await fetch(`${mock.url}/orders/42`).then((r) => r.json());
      expect(res.total).toBe(19.99);
      expect(res.currency).toBe("USD");
    });
});
```

Key discipline: the pact encodes **only what the consumer reads**. If the UI never renders `order.internalNote`, don't put it in the pact — otherwise you couple the provider to a field the consumer doesn't need.

## Pattern 2: Provider Verification with State Handlers (JVM)

```kotlin
@Provider("OrderAPI")
@PactBroker(url = "\${PACT_BROKER_URL}")
class OrderApiPactTest {
    @BeforeEach
    fun setup(mockServer: MockServer) { /* start Spring context */ }

    @State("order 42 exists")
    fun seedOrder42() {
        orderRepo.save(Order(id = 42, total = 19.99, currency = "USD"))
    }

    @Test
    @PactVerify("GET /orders/42")
    fun verifyGetOrder() { /* auto-wired by pact-jvm */ }
}
```

Provider states are the #1 source of flaky contract tests. Make them **idempotent** (truncate + reseed) and **deterministic** (fixed IDs, frozen timestamps).

## Pattern 3: Schemathesis Stateful OpenAPI Test (Python)

```python
# tests/contract/test_openapi.py
import schemathesis

schema = schemathesis.from_url("http://localhost:8080/openapi.json")

@schema.parametrize()
def test_api_conformance(case):
    response = case.call()
    case.validate_response(response, checks=[
        schemathesis.Checks.not_a_server_error,
        schemathesis.Checks.status_code_conformance,
        schemathesis.Checks.content_type_conformance,
        schemathesis.Checks.response_schema_conformance,
    ])

# Stateful: chain create → read → delete
state_machine = schema.as_state_machine()
state_machine.run(checks=schemathesis.DEFAULT_CHECKS)
```

Schemathesis is **property-based contract testing** — it generates inputs from the OpenAPI spec and asserts the server honors its own contract. Pair it with Pact (which asserts the server honors the *consumer's* contract).

## Pattern 4: buf breaking for gRPC

```yaml
# buf.yaml (v2)
version: v2
breaking:
  use:
    - WIRE_JSON          # catches field-number reuse, type changes
    - PACKAGE            # catches rename/move across packages
```

```bash
buf breaking --against '.git#branch=main'
# CI gate: fails if any wire-incompatible change vs main
```

`WIRE` catches binary-incompatible changes; `WIRE_JSON` catches JSON-mapping changes (important for gRPC-Gateway). Run in every PR touching `*.proto`.

## Pattern 5: WIP + Pending Pacts (avoid blocking provider main)

```bash
# Provider CI: verify only "pending" pacts (known-good consumers)
npx pact-provider-verifier \
  --provider=OrderAPI \
  --broker-base-url=$URL \
  --enable-pending \
  --include-wip-pacts-since=2026-01-01
```

- **Pending pacts**: new consumer expectations that haven't been verified yet → failures don't break provider build.
- **WIP pacts**: in-development consumer pacts → same isolation.
- Once a pact passes verification, it graduates to "accepted" and failures become blocking.

Without pending/WIP, every new consumer pact breaks provider `main` until the provider implements it — teams quickly disable contract testing out of frustration.

## CI Integration

```yaml
# .github/workflows/contract.yml
jobs:
  consumer-pact:
    steps:
      - run: npm test -- tests/contracts
      - run: npx pact-broker publish ./pacts
          --consumer-app-version=${{ github.sha }}
          --branch=${{ github.ref_name }}

  provider-verify:
    needs: consumer-pact
    steps:
      - run: ./start-provider.sh &
      - run: npx pact-provider-verifier --provider=OrderAPI ...

  can-i-deploy:
    needs: provider-verify
    steps:
      - run: npx pact-broker can-i-deploy
          --pacticipant=OrderUI --version=${{ github.sha }}
          --to-environment=production --retry-while-unknown=6
```

Gate deploy on `can-i-deploy`. Retry-while-unknown handles async verification results.

## Anti-Patterns

- **Treating pacts as full API specs** — Pacts encode what consumers *use*, not what providers *offer*. A provider can have 50 endpoints; if consumers only call 5, the pact covers 5.
- **Provider tests hitting real DBs without deterministic states** — Flaky provider states = flaky contract tests = team disables them. Use truncate+reseed or Testcontainers.
- **Publishing pacts without branch/tag** — `can-i-deploy` becomes useless; you can't answer "is this SHA compatible with prod?"
- **Ignoring WIP/pending flags** — New consumer pacts block provider `main` on day one. Teams rage-quit contract testing.
- **Dredd-style spec-is-truth without examples** — Dredd is effectively unmaintained since 2022. Prefer Schemathesis with `--examples` or stateful machines.
- **Contract tests that re-implement the consumer** — The pact test should call the *real* consumer client code against the mock, not a hand-rolled fetch. Otherwise you're testing the test.
- **No message contracts for async** — Kafka/SQS events drift silently. Use Pact message contracts or AsyncAPI + `asyncapi-diff`.

## Related Skills

- [[csp-api-tester]] — Functional/perf/security API testing; contract testing is the compatibility layer beneath it
- [[csp-mock-strategies]] — Pact consumer tests use a generated mock server; MSW is the frontend-side complement
- [[csp-cross-layer-testing]] — Contract verifies wire shape; cross-layer verifies runtime data flows through 4 layers
- [[csp-api-governance]] — API versioning policy, deprecation windows; contract tests enforce the policy
- [[csp-e2e-testing]] — E2E catches environment/routing issues contracts can't; use both, not either
- [[csp-test-methodology]] — L1 method selection; contract testing is the "version drift" blind-spot filler
