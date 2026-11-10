---
name: csp-observability-testing
description: >
  Assert that your telemetry (logs, metrics, traces) is correct, complete, and
  stable *inside the test suite* — not after an incident reveals it's missing.
  pytest caplog and pino/winston test sinks for structured log assertions,
  prom-client registry snapshots and Micrometer SimpleMeterRegistry for metric
  contracts, OpenTelemetry InMemorySpanExporter and pytest-opentelemetry for
  trace shape and parent/child propagation, cardinality guards, golden-file
  telemetry shapes, and dashboards-as-code testing with Grizzly/jsonnet. Unlike
  csp-observability-and-instrumentation which tells you how to *add* telemetry,
  this skill tells you how to *prove it works*.
version: 0.1.0
layer: 3
category: patterns
phase: verify
domain: testing
role: specialist
scope: implementation
tools: [Read, Write, Edit, Bash, Glob, Grep]
related_skills:
  - [[csp-observability-and-instrumentation]]
  - [[csp-monitoring-alerting]]
  - [[csp-cross-layer-testing]]
  - [[csp-test-methodology]]
  - [[csp-python-testing]]
  - [[csp-java-testing]]
  - [[csp-typescript-testing]]
  - [[csp-docker-patterns]]
anti_rationalizations:
  "上线后看 Grafana 就行": "上线后发现 telemetry 缺失 = 事故已经发生且无法诊断；测试时断言 log/metric/trace 形状是把可观测性左移"
  "日志是给人看的不用测": "结构化日志是给机器查的；字段名/类型/基数稳定性就是 API 契约，破坏它等于破坏下游告警和仪表盘"
  "trace 只要接了 OTel 就对了": "接了 ≠ 传播对了；parent/child 断链、span 命名漂移、属性缺失只有测试时断言才能抓"
---

# Observability Testing

Treat telemetry as a first-class output of your code — with the same contract stability, test coverage, and regression gates as your API responses.

## When to Activate

- Service has SLOs and an on-call rotation that depends on alerts
- A recent incident revealed missing/wrong telemetry (the "why couldn't we diagnose it?" post-mortem)
- Migrating log/metric/tracing vendors (Datadog → Grafana, Jaeger → Tempo)
- Adding OpenTelemetry instrumentation and you need proof spans propagate correctly
- Dashboard/alert rule changes need regression gates
- You want golden-file tests for telemetry shape (field names, types, cardinality)

## Boundary with csp-observability-and-instrumentation

| Dimension | csp-observability-and-instrumentation | csp-observability-testing (this) |
|---|---|---|
| Question | "How do I add logs/metrics/traces?" | "How do I prove they're correct?" |
| Output | Instrumented code | Test assertions, CI gates |
| When | Build phase | Verify phase |
| Concerns | Signal selection, structured logging, span naming, cardinality design | Field stability, propagation, golden shapes, alert rule tests |

> Instrument first, then test. This skill assumes telemetry exists and asks "does it actually work?"

## Telemetry Contract Model

Think of every log event, metric, and span as a **contract** with downstream consumers (alerts, dashboards, queries):

| Signal | Contract elements | What breaks it | Test approach |
|---|---|---|---|
| **Structured log** | Event name, field names, field types, required fields | Rename `user_id` → `userId`, change type string→int, drop required field | Golden-file JSON shape, field presence assertion |
| **Metric** | Name, type (counter/gauge/histogram), unit, label set, label cardinality | Rename metric, change type, add high-cardinality label (`user_id`), drop label | Registry snapshot diff, cardinality guard |
| **Trace/Span** | Span name, attributes, parent/child links, status code | Rename span, break propagation (missing `traceparent`), drop attributes | InMemorySpanExporter shape assertion, propagation test |
| **Alert rule** | PromQL/LogQL expression, threshold, duration, labels | Query returns no data after metric rename, threshold too sensitive | Rule unit test (promtool, grafana-cli) |
| **Dashboard** | Panel queries, variables, annotations | Query breaks after schema change, variable returns empty | Dashboards-as-code test (Grizzly, jsonnet lint) |

## Tool Matrix by Ecosystem

| Signal | Language | Tool | Install |
|---|---|---|---|
| Logs | Python | `pytest` `caplog` fixture | built-in |
| Logs | JS/TS | pino + custom test sink, or winston in-memory transport | `npm i -D pino` |
| Logs | Java | Logback `ListAppender`, Log4j2 `InMemoryAppender` | bundled with Spring Boot |
| Metrics | JS/TS | `prom-client` `Registry.getMetricsAsJSON()` | `npm i prom-client` |
| Metrics | Java | Micrometer `SimpleMeterRegistry` | `io.micrometer:micrometer-test` |
| Metrics | Python | `prometheus_client` `REGISTRY.collect()` | `pip install prometheus_client` |
| Traces | Python | OTel `InMemorySpanExporter` + `pytest-opentelemetry` | `pip install pytest-opentelemetry opentelemetry-sdk` |
| Traces | Java | OTel `InMemorySpanExporter` | `io.opentelemetry:opentelemetry-sdk-testing` |
| Traces | JS/TS | `@opentelemetry/sdk-trace-base` `InMemorySpanExporter` | `npm i -D @opentelemetry/sdk-trace-base` |
| Traces (E2E) | Any | Testcontainers + Jaeger | `org.testcontainers:jaeger` |
| Alert rules | Prometheus | `promtool test rules` | bundled with Prometheus |
| Alert rules | Grafana | `grafana-cli` / Grizzly `grr test` | `brew install grizzly` |
| Dashboards | Grafana | jsonnet + grafonnet, Grizzly | `brew install jsonnet grizzly` |
| Collector pipeline | OTel Collector | `logging` exporter + Testcontainers | `otel/opentelemetry-collector` image |

## Pattern 1: Structured Log Assertion (Python caplog)

```python
# tests/test_checkout_telemetry.py
import json
import pytest

def test_checkout_emits_expected_log_events(caplog):
    caplog.set_level("INFO")
    checkout(user_id="u123", amount=42.0, currency="USD")

    # Extract structured events (assume JSON formatter)
    events = [json.loads(r.message) for r in caplog.records if r.message.startswith("{")]

    # Contract: checkout.started event with required fields
    started = next((e for e in events if e["event"] == "checkout.started"), None)
    assert started is not None, "checkout.started event missing"
    assert started["user_id"] == "u123"
    assert started["amount"] == 42.0
    assert started["currency"] == "USD"
    assert "timestamp" in started
    assert "trace_id" in started  # correlation field required

    # Contract: checkout.completed event
    completed = next((e for e in events if e["event"] == "checkout.completed"), None)
    assert completed is not None
    assert completed["status"] in {"success", "failure"}
    assert completed["duration_ms"] >= 0

def test_no_pii_in_logs(caplog):
    caplog.set_level("DEBUG")
    checkout(user_id="u123", amount=42.0, card_number="4111111111111111")
    full_log = "\n".join(r.message for r in caplog.records)
    assert "4111111111111111" not in full_log, "PII leaked into logs"
    assert "card_number" not in full_log
```

Log contracts: event name stability, required field presence, type stability, PII absence. Test all four.

## Pattern 2: Metric Registry Snapshot (JS/TS prom-client)

```typescript
// src/telemetry/__tests__/metrics.test.ts
import { Registry, collectDefaultMetrics } from "prom-client";
import { describe, it, expect, beforeEach } from "vitest";
import { checkoutMetrics } from "../checkout-metrics";

describe("checkout metric contracts", () => {
  let registry: Registry;

  beforeEach(() => {
    registry = new Registry();
    checkoutMetrics.register(registry);
  });

  it("emits checkout_total counter with correct labels", async () => {
    await performCheckout({ userId: "u1", amount: 42, status: "success" });
    const metrics = await registry.getMetricsAsJSON();

    expect(metrics).toContain('# TYPE checkout_total counter');
    expect(metrics).toContain('# HELP checkout_total');
    expect(metrics).toMatch(/checkout_total\{status="success"\} 1/);
  });

  it("emits checkout_duration_seconds histogram with bounded buckets", async () => {
    await performCheckout({ userId: "u1", amount: 42, status: "success" });
    const metrics = await registry.getMetricsAsJSON();

    // Contract: histogram buckets must be bounded (no user_id label!)
    expect(metrics).toContain('# TYPE checkout_duration_seconds histogram');
    const labels = extractLabels(metrics, "checkout_duration_seconds_bucket");
    for (const labelSet of labels) {
      expect(labelSet).not.toHaveProperty("user_id");  // cardinality guard
      expect(labelSet).not.toHaveProperty("email");
      expect(Object.keys(labelSet).sort()).toEqual(["le", "status"]);
    }
  });

  it("golden snapshot of full registry shape", async () => {
    await performCheckout({ userId: "u1", amount: 42, status: "success" });
    const metrics = await registry.getMetricsAsJSON();
    // Normalize: strip timestamps, values; keep names + labels + types
    const shape = metrics
      .split("\n")
      .filter((l) => l.startsWith("# TYPE") || l.startsWith("# HELP"))
      .sort()
      .join("\n");
    expect(shape).toMatchSnapshot();
  });
});
```

Golden-file the *shape* (names, types, labels), not the *values*. Values change per run; shape is the contract.

## Pattern 3: OpenTelemetry Trace Assertion (Python InMemorySpanExporter)

```python
# tests/test_checkout_tracing.py
import pytest
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor, InMemorySpanExporter

@pytest.fixture
def spans():
    exp = InMemorySpanExporter()
    provider = TracerProvider()
    provider.add_span_processor(SimpleSpanProcessor(exp))
    trace.set_tracer_provider(provider)
    yield exp.get_finished_spans
    exp.clear()

def test_checkout_trace_shape(spans):
    checkout(user_id="u123", amount=42.0)

    all_spans = spans()
    names = [s.name for s in all_spans]

    # Contract: expected span hierarchy
    assert "checkout" in names
    assert "payment.charge" in names
    assert "inventory.reserve" in names

    # Contract: parent/child relationships
    checkout_span = next(s for s in all_spans if s.name == "checkout")
    payment_span = next(s for s in all_spans if s.name == "payment.charge")
    inventory_span = next(s for s in all_spans if s.name == "inventory.reserve")

    assert payment_span.parent.span_id == checkout_span.context.span_id
    assert inventory_span.parent.span_id == checkout_span.context.span_id
    assert payment_span.context.trace_id == checkout_span.context.trace_id

    # Contract: required attributes on checkout span
    attrs = dict(checkout_span.attributes)
    assert attrs["user.id"] == "u123"
    assert attrs["checkout.amount"] == 42.0
    assert attrs["checkout.currency"] == "USD"

    # Contract: no PII in span attributes
    for s in all_spans:
        for k, v in s.attributes.items():
            assert "card" not in k.lower(), f"PII in span attribute: {k}"
            assert "ssn" not in k.lower()

def test_trace_propagation_across_http(spans, httpserver):
    """Verify traceparent header flows to downstream service."""
    httpserver.expect_request("/downstream").respond_with_data("ok")
    call_downstream(httpserver.url_for("/downstream"))

    all_spans = spans()
    client_span = next(s for s in all_spans if s.name == "downstream.call")
    # The downstream service should have received a traceparent header
    # (assert via the server's captured headers or a second InMemorySpanExporter)
    assert client_span.attributes["http.trace_propagated"] is True
```

Trace contracts: span names, parent/child links, required attributes, PII absence, propagation. Test all five.

## Pattern 4: Cardinality Guard (prevent TSDB OOM)

```typescript
// src/telemetry/__tests__/cardinality.test.ts
import { describe, it, expect } from "vitest";
import { allMetricDefinitions } from "../registry";

const HIGH_CARDINALITY_PATTERNS = [
  /user[_-]?id/i, /email/i, /session[_-]?id/i, /request[_-]?id/i,
  /ip[_-]?addr/i, /token/i, /uuid/i, /order[_-]?id/i, /trace[_-]?id/i,
];

const MAX_LABEL_VALUES: Record<string, number> = {
  status: 10,
  method: 10,
  route: 100,
  country: 250,
  plan: 20,
};

describe("metric cardinality guards", () => {
  for (const metric of allMetricDefinitions) {
    it(`${metric.name} has no high-cardinality labels`, () => {
      for (const label of metric.labels) {
        for (const pattern of HIGH_CARDINALITY_PATTERNS) {
          expect(label).not.toMatch(pattern);
        }
      }
    });

    it(`${metric.name} label cardinality is bounded`, () => {
      for (const [label, max] of Object.entries(MAX_LABEL_VALUES)) {
        if (metric.labels.includes(label)) {
          const observed = metric.observedLabelValues?.[label]?.size ?? 0;
          expect(observed).toBeLessThanOrEqual(max);
        }
      }
    });
  }
});
```

A single `user_id` label on a Prometheus histogram with 1M users = 1M time series = TSDB OOM. Cardinality guards are the cheapest observability test you can write.

## Pattern 5: Alert Rule Unit Test (promtool)

```yaml
# alerts/checkout.rules.yaml
groups:
  - name: checkout
    rules:
      - alert: CheckoutErrorRateHigh
        expr: |
          sum(rate(checkout_total{status="failure"}[5m]))
          / sum(rate(checkout_total[5m])) > 0.05
        for: 2m
        labels: { severity: page }
        annotations:
          summary: "Checkout error rate above 5%"
```

```yaml
# alerts/checkout.rules.test.yaml
rule_files: [checkout.rules.yaml]
evaluation_interval: 1m
tests:
  - interval: 1m
    input_series:
      - series: 'checkout_total{status="success"}'
        values: "100 100 100 100 100"
      - series: 'checkout_total{status="failure"}'
        values: "1 1 1 20 20"   # spike at t=3m
    alert_rule_test:
      - eval_time: 5m
        alertname: CheckoutErrorRateHigh
        exp_alerts:
          - exp_labels: { severity: page }
            exp_annotations:
              summary: "Checkout error rate above 5%"
```

```bash
promtool test rules alerts/checkout.rules.test.yaml
# exits non-zero if alert doesn't fire when expected, or fires when it shouldn't
```

Alert rule tests are the difference between "the alert works" and "the alert works *when it should*."

## Pattern 6: Dashboards-as-Code Test (Grizzly + jsonnet)

```jsonnet
// dashboards/checkout.libsonnet
local grafana = import 'grafonnet/grafana.libsonnet';

{
  dashboard: grafana.dashboard.new('Checkout Overview')
    + grafana.dashboard.withUid('checkout-overview'),
  panels: [
    grafana.graphPanel.new(
      'Checkout Success Rate',
      datasource='Prometheus',
      targets=[{ expr: 'sum(rate(checkout_total{status="success"}[5m])) / sum(rate(checkout_total[5m]))' }],
      thresholds=[{ value: 0.95, colorMode: 'critical' }],
    ),
  ],
}
```

```bash
# Render jsonnet → JSON
jsonnet -J vendor dashboards/checkout.libsonnet > dashboards/checkout.json

# Lint with Grizzly
grr lint dashboards/checkout.json

# Test: apply to a Grafana test container, verify panels render
docker run -d -p 3000:3000 grafana/grafana:11.0.0
grr apply dashboards/checkout.json
curl -s http://localhost:3000/api/dashboards/uid/checkout-overview | jq '.dashboard.panels | length'
# assert panel count, query validity, no "No data" states
```

Dashboards-as-code turns "the dashboard looks right" into "the dashboard queries are valid and return data."

## CI Integration

| Gate | Scope | Tool | Frequency |
|---|---|---|---|
| Log shape golden | Changed modules emitting logs | pytest caplog / vitest snapshot | Every PR |
| Metric registry snapshot | Changed metric definitions | prom-client / Micrometer snapshot | Every PR |
| Cardinality guard | All metric definitions | Custom label-pattern test | Every PR |
| Trace shape + propagation | Changed instrumented code | InMemorySpanExporter | Every PR |
| Alert rule test | Changed `.rules.yaml` | `promtool test rules` | Every PR |
| Dashboard lint | Changed `.libsonnet` / `.json` | `grr lint` | Every PR |
| Full telemetry contract | All services | Combined suite | Nightly |
| Collector pipeline E2E | OTel Collector config | Testcontainers + logging exporter | Pre-release |

## Anti-Patterns

- **Asserting on human-readable log messages** — `"User u123 checked out"` is brittle. Assert on structured fields: `event == "checkout.completed" && user_id == "u123"`.
- **No cardinality limit test** — A `user_id` label on a Prometheus histogram will OOM your TSDB. Guard every label against high-cardinality patterns.
- **Skipping trace-propagation tests** — The #1 cause of broken distributed traces in prod. Assert `traceparent` flows and parent/child links hold.
- **Golden files without a diff tool** — Use `pytest-snapshot`, `jest --snapshot`, or `vitest` snapshots with `-u` for intentional updates. Never eyeball golden files.
- **Testing dashboards only visually** — "Looks right" is not a contract. Use Grizzly/jsonnet + `grr test` to validate queries return data.
- **Alert rules without unit tests** — An alert that never fires is worse than no alert. `promtool test rules` proves it fires when it should and stays silent when it shouldn't.
- **Telemetry as an afterthought** — If you instrument after the feature ships, you've already lost the ability to diagnose the first incident. Test telemetry contracts alongside feature contracts.

## Related Skills

- [[csp-observability-and-instrumentation]] — How to *add* logs/metrics/traces; this skill proves they work
- [[csp-monitoring-alerting]] — Alert design and on-call wiring; this skill unit-tests the alert rules
- [[csp-cross-layer-testing]] — Cross-layer verifies data flow; observability testing verifies the *telemetry* of that flow
- [[csp-test-methodology]] — L1 method selection; observability fills the "can we diagnose prod?" blind spot
- [[csp-python-testing]] / [[csp-java-testing]] / [[csp-typescript-testing]] — Language harnesses hosting telemetry assertions
- [[csp-docker-patterns]] — Testcontainers for Jaeger/Grafana/OTel Collector E2E tests
