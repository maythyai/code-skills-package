---
name: csp-chaos-testing
description: >
  Chaos engineering: inject faults into a running system to validate that
  timeouts, retries, circuit breakers, and degradation paths actually work.
  Chaos Mesh and LitmusChaos for Kubernetes, AWS Fault Injection Service for
  cloud, Toxiproxy and Pumba for local/Docker. Use when you have SLAs and an
  on-call rotation, when a recent incident revealed a resilience gap, or when
  you need proof that your retry/circuit-breaker configuration is correct
  before launch.
version: 0.1.0
layer: 3
category: patterns
phase: verify
domain: testing
role: specialist
scope: implementation
tools: [Read, Write, Edit, Bash, Glob, Grep]
related_skills:
  - [[csp-load-testing]]
  - [[csp-observability-and-instrumentation]]
  - [[csp-observability-testing]]
  - [[csp-kubernetes-patterns]]
  - [[csp-docker-patterns]]
  - [[csp-test-methodology]]
  - [[csp-cross-layer-testing]]
  - [[csp-solo-oncall]]
  - [[csp-monitoring-alerting]]
anti_rationalizations:
  "生产太重要不能炸": "先在 staging 镜像炸；不炸就永远不知道 timeout/retry/circuit-breaker 配置对不对——事故时才发现代价更大"
  "我们有监控就够了": "监控告诉你出事了；chaos 告诉你出事时系统*会怎样*——降级路径没跑过等于没有"
  "chaos 就是随机杀 pod": "没有 steady-state 假设和 blast radius 控制的随机杀 pod 是 chaos theatre，不是工程"
---

# Chaos Testing

Inject controlled faults into a running system, measure whether a pre-defined steady-state hypothesis holds, and learn what breaks *before* production teaches you.

## When to Activate

- Distributed system with SLAs and an on-call rotation
- A recent incident revealed a resilience gap (retry storm, cascade failure, missing timeout)
- Pre-launch hardening for a new service or a major dependency change
- Validating timeout/retry/circuit-breaker/bulkhead configuration
- Game day: coordinated resilience exercise with humans on standby
- Migrating infra (new DB, new cloud region, new mesh) and you need proof of graceful degradation

## Chaos Engineering Vocabulary

| Term | Definition | Example |
|---|---|---|
| **Steady-state hypothesis** | A measurable business metric that should hold during chaos | p99 latency < 500ms, order-success rate > 99.5% |
| **Blast radius** | Scope of impact — always start smallest | Single pod → namespace → AZ → region |
| **Game day** | Scheduled, coordinated exercise with humans on standby | Quarterly, 2h window, war room |
| **Chaos-as-code** | YAML/Terraform fault definitions versioned with the app | `chaos/network-delay.yaml` in git |
| **Nemesis** | The fault injector (Jepsen terminology) | Partition, clock skew, node kill |
| **Halt condition** | Automatic abort if steady-state breaks beyond threshold | Error rate > 5% → stop experiment |
| **Observation window** | Time to let the system respond before measuring | 2min injection + 5min recovery |

## Fault Category Matrix

| Category | Faults | Tool support | What it validates |
|---|---|---|---|
| **Pod** | kill, failure, container-kill | Chaos Mesh PodChaos, Litmus pod-delete | Replica self-healing, graceful shutdown |
| **Network** | delay, loss, duplicate, corrupt, partition, bandwidth | Chaos Mesh NetworkChaos, Toxiproxy | Timeouts, retries, circuit breakers |
| **DNS** | error, random, delay | Chaos Mesh DNSChaos | DNS fallback, cache TTL |
| **IO** | latency, fault, attr modification | Chaos Mesh IOChaos | Disk pressure handling, fsync errors |
| **Stress** | CPU, memory | Chaos Mesh StressChaos, Litmus node-cpu-hog | Autoscaling, OOM behavior, load shedding |
| **Time** | clock skew | Chaos Mesh TimeChaos | Cert validation, token expiry, distributed locks |
| **HTTP** | abort, delay, replace body | Chaos Mesh HTTPChaos, Toxiproxy | Retry logic, fallback content, error pages |
| **JVM** | exception, GC, latency injection | Chaos Mesh JVMChaos, Litmus | Exception handling, GC pauses |
| **Kernel** | panic, module | Chaos Mesh KernelChaos | Node failover, pod eviction |
| **Block** | disk throttle, delay | Chaos Mesh BlockChaos (2.8+) | IO-bound degradation |

## Tool Matrix by Environment

| Environment | Tool | Install | Notes |
|---|---|---|---|
| Kubernetes | Chaos Mesh 2.8.x (CNCF Incubating) | `helm install chaos-mesh chaos-mesh/chaos-mesh` | CRD-based, Workflow orchestrator, Dashboard UI |
| Kubernetes | LitmusChaos 4.x (CNCF Incubating) | `helm install litmus litmuschaos/litmus` | ChaosHub + ChaosCenter, GitOps-native |
| AWS | Fault Injection Service (FIS) | AWS console / Terraform | Cross-account, cross-region, IAM-scoped |
| Azure | Chaos Studio | Azure portal | Managed, integrates with App Insights |
| GCP | Fault Injection | gcloud | Limited scope |
| Local/Docker | Toxiproxy 2.13 | `docker run ghcr.io/shopify/toxiproxy` | TCP proxy with latency/bandwidth/slow_close toxics |
| Local/Docker | Pumba | `docker run gaiaadm/pumba` | Docker chaos (kill, pause, netem) |
| Commercial | Gremlin, Steadybit, Harness Chaos | SaaS | Managed, RBAC, compliance reporting |
| Legacy | Chaos Monkey / Simian Army | — | Effectively retired; use Chaos Mesh or FIT |

## Setup & Canonical Commands

```bash
# Chaos Mesh install (containerd runtime)
helm repo add chaos-mesh https://charts.chaos-mesh.org
helm install chaos-mesh chaos-mesh/chaos-mesh \
  -n chaos-mesh --create-namespace \
  --set chaosDaemon.runtime=containerd \
  --set chaosDaemon.socketPath=/run/containerd/containerd.sock

# Apply a chaos experiment
kubectl apply -f chaos/network-delay.yaml
kubectl get networkchaos -n chaos-mesh
kubectl describe networkchaos checkout-delay -n chaos-mesh

# Toxiproxy (local dev / integration tests)
docker run -d -p 8474:8474 -p 1234:1234 ghcr.io/shopify/toxiproxy:2.13.0
# Create proxy
curl -X POST localhost:8474/proxies \
  -d '{"name":"mysql","listen":"0.0.0.0:1234","upstream":"mysql:3306"}'
# Inject latency toxic
curl -X POST localhost:8474/proxies/mysql/toxics \
  -d '{"name":"lag","type":"latency","attributes":{"latency":500,"jitter":100}}'
# Remove toxic
curl -X DELETE localhost:8474/proxies/mysql/toxics/lag

# LitmusChaos
helm repo add litmuschaos https://litmuschaos.github.io/litmus-helm/
helm install litmus litmuschaos/litmus -n litmus --create-namespace
kubectl apply -f chaosengine.yaml
```

## Pattern 1: Chaos Mesh NetworkChaos (delay + partition)

```yaml
# chaos/network-delay.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: checkout-delay
  namespace: chaos-mesh
spec:
  action: delay
  mode: all                          # or "one", "fixed", "fixed-percent"
  selector:
    namespaces: [prod]
    labelSelectors:
      app: checkout
  delay:
    latency: "300ms"
    jitter: "50ms"
    correlation: "100"
  duration: "2m"
---
# chaos/network-partition.yaml — split checkout from payment
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: checkout-payment-partition
spec:
  action: partition
  mode: all
  selector:
    labelSelectors: { app: checkout }
  direction: to
  target:
    mode: all
    selector:
      labelSelectors: { app: payment }
  duration: "5m"
```

Partition is the highest-signal network fault: it validates that checkout degrades gracefully (queue, circuit-break, user-facing message) rather than hanging or cascading.

## Pattern 2: Chaos Mesh Workflow (multi-step experiment)

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: Workflow
metadata:
  name: resilience-game-day
spec:
  entry: the-entry
  templates:
    - name: the-entry
      templateType: Serial
      deadline: 30m
      children:
        - baseline-measure
        - inject-delay
        - observe
        - inject-partition
        - observe-2
        - cleanup

    - name: baseline-measure
      templateType: Schedule
      schedule:
        type: PodChaos
        schedule: "*/1 * * * * *"
        podChaos:
          action: pod-failure
          mode: one
          selector: { labelSelectors: { app: canary } }

    - name: inject-delay
      templateType: NetworkChaos
      networkChaos:
        action: delay
        mode: all
        selector: { labelSelectors: { app: checkout } }
        delay: { latency: "500ms", jitter: "100ms" }
        duration: "3m"

    - name: observe
      templateType: Suspend
      suspend: { duration: "5m" }    # let steady-state metrics settle

    - name: cleanup
      templateType: Suspend
      suspend: { duration: "1m" }
```

Workflows encode the full game-day script: baseline → inject → observe → escalate → cleanup. Version them in git alongside the app.

## Pattern 3: Toxiproxy in Integration Tests (deterministic chaos)

```typescript
// integration-tests/chaos/payment-timeout.test.ts
import { Toxiproxy } from "toxiproxy-node-client";
import { PostgreSqlContainer } from "@testcontainers/postgresql";

const toxi = new Toxiproxy("http://localhost:8474");

test("payment client retries on 503 with exponential backoff", async () => {
  const pg = await new PostgreSqlContainer().start();
  const proxy = await toxi.createProxy({
    name: "payment-db",
    listen: "0.0.0.0:15432",
    upstream: `${pg.getHost()}:${pg.getPort()}`,
  });

  // Inject: first 2 requests timeout, then succeed
  await proxy.addToxic({
    name: "timeout-first",
    type: "timeout",
    attributes: { timeout: 0 },       // 0 = immediate close
    toxicity: 1.0,
  });

  const client = new PaymentClient({ dbUrl: "postgres://localhost:15432", retries: 3 });
  await expect(client.charge(100)).rejects.toThrow(/timeout/);

  // Remove toxic, verify recovery
  await proxy.removeToxic("timeout-first");
  await expect(client.charge(100)).resolves.toBeDefined();
});
```

Toxiproxy gives you *deterministic*, *repeatable* chaos in CI — unlike pod-kill roulette. Use it for retry/timeout/circuit-breaker unit-of-work tests.

## Pattern 4: AWS FIS Template (Terraform)

```hcl
resource "aws_fis_experiment_template" "az_failover" {
  description = "Validate cross-AZ failover for checkout service"

  target {
    name = "ec2-instances"
    resource_type = "aws:ec2:instance"
    selection_mode = "COUNT(2)"
    filter {
      path = "Tag:Environment"
      values = ["staging"]
    }
    filter {
      path = "Tag:Service"
      values = ["checkout"]
    }
  }

  action {
    name = "terminate-instances"
    action_id = "aws:ec2:terminate-instances"
    target { name = "ec2-instances" }
  }

  stop_condition {
    source = "aws:cloudwatch:alarm"
    value = "arn:aws:cloudwatch:us-east-1:123456789012:alarm:CheckoutErrorRateHigh"
  }

  logging {
    log_configuration { log_schema_version = 2 }
  }
}
```

`stop_condition` wired to a CloudWatch alarm is the automatic halt — if error rate exceeds threshold, FIS aborts the experiment. Never run chaos without a halt condition.

## Pattern 5: Steady-State Hypothesis + Prometheus Query

```yaml
# chaos/steady-state.yaml — define the hypothesis as a PromQL query
hypothesis:
  name: checkout-success-rate
  query: |
    sum(rate(http_requests_total{service="checkout",status=~"2.."}[5m]))
    /
    sum(rate(http_requests_total{service="checkout"}[5m]))
  threshold: ">= 0.995"
  violation_action: halt

  name: checkout-p99-latency
  query: |
    histogram_quantile(0.99,
      sum(rate(http_request_duration_seconds_bucket{service="checkout"}[5m])) by (le))
  threshold: "<= 0.5"
  violation_action: halt
```

Wire this into a sidecar that polls Prometheus during the experiment and calls `kubectl delete networkchaos <name>` on violation. Chaos Mesh 2.8+ has built-in `statusCheck` for this; LitmusChaos uses ChaosCenter probes.

## Game Day Runbook

```markdown
## Game Day: Checkout Resilience (2026-Q4)

**Window**: Friday 14:00-16:00 UTC
**Participants**: on-call eng, SRE, product owner
**Blast radius**: staging namespace `staging-checkout`, 10% traffic mirror

### Pre-flight (T-1d)
- [ ] Steady-state dashboards pinned (Grafana: checkout-success-rate, p99)
- [ ] Halt conditions wired (Prometheus alert → FIS stop_condition)
- [ ] Rollback script tested (`kubectl delete -f chaos/`)
- [ ] War room bridge open, scribe assigned

### Execution
1. T+0: Baseline measurement (10min, no chaos)
2. T+10: Inject network delay 300ms on checkout→payment (2min)
3. T+15: Observe. Did circuit breaker open? Did p99 stay < 500ms?
4. T+20: Escalate to partition (5min)
5. T+30: Observe. Did checkout queue orders? Did users see a friendly message?
6. T+40: Inject pod-kill on payment (1 of 3 replicas)
7. T+50: Cleanup, restore, measure recovery time

### Post-mortem (T+1d)
- Steady-state held? Y/N per hypothesis
- Surprises: what broke that we didn't expect?
- Action items: timeout tuning, retry budget, circuit-breaker threshold
- File issues, link to chaos YAML in git
```

## Anti-Patterns

- **Running chaos in prod without steady-state metric or automatic halt** — You're not doing engineering, you're gambling. Always define the hypothesis and wire the stop condition.
- **Random pod-kills without hypothesis ("chaos theatre")** — If you can't articulate what you're testing, you're not testing anything. Every experiment needs a question.
- **Skipping staging** — Always rehearse in a mirror environment first. Prod chaos is for validated experiments, not exploration.
- **Ignoring dependency graph** — Killing service A when B/C/D call it synchronously with no timeout → cascade. Map dependencies before choosing targets.
- **Not integrating with alerting** — If on-call doesn't get paged during the experiment, the exercise proves nothing about your detection capability.
- **No cleanup automation** — Experiments that outlive their window become incidents. `duration:` field + cleanup step in Workflow.
- **Chaos without observation window** — Inject for 2min, observe for 5min. Systems need time to respond (circuit breaker open, retry budget exhaust, autoscaler react).

## Related Skills

- [[csp-load-testing]] — Load proves capacity; chaos proves resilience under fault. Run both before launch.
- [[csp-observability-and-instrumentation]] — Chaos without telemetry is blind; instrument first, then inject
- [[csp-observability-testing]] — Assert that alerts fire and traces capture the fault during chaos
- [[csp-kubernetes-patterns]] — Pod/namespace/service topology that chaos targets
- [[csp-docker-patterns]] — Local chaos via Toxiproxy/Pumba in integration tests
- [[csp-test-methodology]] — L1 method selection; chaos fills the "fault tolerance" blind spot
- [[csp-cross-layer-testing]] — Chaos at one layer (network) validates cross-layer degradation
- [[csp-solo-oncall]] / [[csp-monitoring-alerting]] — On-call runbooks and alert wiring that chaos validates
