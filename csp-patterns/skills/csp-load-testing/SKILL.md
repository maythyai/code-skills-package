---
name: csp-load-testing
description: "Design and run load, stress, spike and soak tests. Tool selection (k6 / Locust / JMeter), SLA percentile thresholds, CI gating, capacity planning, and bottleneck attribution from flamegraphs. Use when you need to know how much traffic a service survives, or validate an SLA."
version: 0.1.0
layer: 3
category: patterns
phase: verify
domain: quality
scope: testing
tools: [Read, Write, Edit, Glob, Grep, Bash]
related_skills: [csp-backend-performance, csp-qa-test-engineering, csp-web-performance-auditor, csp-frontend-performance, csp-observability-and-instrumentation, csp-api-tester]
role: specialist
---

# Load Testing

A load test answers one question: **how much traffic does this survive, and what breaks first?**
A test that does not produce a number and a failure mode is a demo, not a test.

## When to Use

- Before launch or before a traffic event (campaign, migration, seasonal peak)
- Validating an SLA claim ("p95 < 500 ms at 1,000 rps")
- Sizing infrastructure: how many instances for the projected load
- Gating a release in CI on performance regression
- Reproducing a production incident's load pattern to find the root cause
- Verifying a fix actually raised the ceiling

## When NOT to Use

- Functional API correctness → `csp-api-tester`
- The service is already known-slow and you want to find the hot path → `csp-backend-performance` first; load testing tells you *that* it breaks, profiling tells you *why*
- Frontend rendering / Core Web Vitals → `csp-web-performance-auditor`

---

## Step 1 — Choose the Load Model

Four models, four different questions. Picking the wrong one produces a confident wrong answer.

| Model | Question it answers | Curve shape | Typical duration | Pass condition |
|---|---|---|---|---|
| **Load** | Does it meet the SLA at the *expected* peak? | Ramp 1–5 min → hold steady at target → ramp down | 15–30 min hold | p95/p99 and error rate inside SLA for the whole hold |
| **Stress** | Where is the ceiling, and how does it fail? | Step up in increments (e.g. +25% every 3–5 min) until errors or latency blow the budget | Until failure | N/A — the *result* is the failure point and the failure mode |
| **Spike** | Does it recover from a sudden surge? | Near-vertical jump to 5–10× baseline, hold 1–5 min, drop back to baseline | 10–15 min total | No crash; latency returns to within 10% of pre-spike baseline within a defined recovery window |
| **Soak / endurance** | Does it degrade over time (leaks, fragmentation, connection exhaustion)? | Constant moderate load (50–70% of the known ceiling) | 4–72 h | No monotonic drift in latency, RSS, or handle/connection counts |

**Run them in this order.** Load establishes the baseline, stress finds the ceiling that spike and
soak need as a reference, spike tests elasticity, soak tests durability. Running soak before you
know the ceiling means you picked the load level by guessing.

### Derived numbers you need before writing a script

| Number | How to get it |
|---|---|
| Target rps | Peak production rps × growth factor (usually 1.5–3× for headroom) |
| Think time | Real user session timing from analytics; a 0 ms think time is not a user, it is an attack |
| Ramp rate | Fast enough to matter, slow enough that the autoscaler is not the thing under test (unless it is) |
| SLA | p50 / p95 / p99 latency, max error rate, min throughput — from the product owner, not invented |

## Step 2 — Pick the Tool

| Tool | Choose when | Avoid when |
|---|---|---|
| **k6** | Script-first, CI-native, JS/TS, thresholds as code, low resource use per VU, you want the test versioned next to the app | You need a GUI for non-engineers, or complex protocol support beyond HTTP/WS/gRPC |
| **Locust** | Python shops, custom or stateful user behaviour, complex ramp-up shapes, distributed workers you control | You want a single binary with zero dependencies |
| **JMeter** | Non-engineer-authored plans, protocol coverage (JDBC, JMS, LDAP, FTP), existing .jmx corpus | You want the test readable in code review — XML plans diff badly |

## Step 3 — Write the Test

### k6

```bash
# Simple load: 50 VUs for 1 minute
k6 run -u 50 -d 1m script.js

# With an SLA threshold — a breach makes k6 exit non-zero
k6 run -u 50 -d 1m --threshold "http_req_duration:p(95)<500" script.js

# Tag-scoped threshold (only successful requests count toward the SLA)
k6 run -u 100 -d 5m --threshold "http_req_duration{status:200}:p(95)<500" script.js
```

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    load: {
      executor: 'ramping-vus',
      stages: [
        { duration: '2m', target: 50 },   // ramp
        { duration: '15m', target: 50 },  // steady state — this is what the SLA applies to
        { duration: '2m', target: 0 },    // ramp down: observe recovery
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1200'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const res = http.get('https://staging.example.com/api/orders', {
    headers: { Authorization: `Bearer ${__ENV.API_TOKEN}` },
  });
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1 + Math.random() * 2); // think time — without this you are DDoS-ing yourself
}
```

Executors for the other models:

```javascript
// Stress — step up until it breaks
{ executor: 'ramping-arrival-rate', startRate: 50, timeUnit: '1s',
  stages: [{ duration: '5m', target: 50 }, { duration: '5m', target: 100 },
           { duration: '5m', target: 200 }, { duration: '5m', target: 400 }],
  preAllocatedVUs: 500, maxVUs: 2000 }

// Spike — near-vertical jump
{ executor: 'ramping-vus',
  stages: [{ duration: '30s', target: 500 }, { duration: '2m', target: 500 },
           { duration: '30s', target: 50 }, { duration: '5m', target: 50 }] }

// Soak — long constant
{ executor: 'constant-vus', vus: 100, duration: '8h' }
```

**Network flakiness:** transient failures are not findings. Retry at the client level
(`{ retries: 3 }` on the request, or a wrapper) and record the retry count separately — a test
that needs 3 retries to succeed is telling you something even when it passes.

**Debugging a script:** `k6 run --verbose script.js` for request-level logging. Never debug with a
full-scale run; use `-u 1 -d 10s`.

### Locust

```bash
locust -f locustfile.py --users 100 --spawn-rate 10 --run-time 15m --headless
locust -f locustfile.py --users 200 --spawn-rate 10 --run-time 10m --headless \
       --csv results  # writes results_stats.csv for the report
```

```python
from locust import HttpUser, task, between

class Buyer(HttpUser):
    wait_time = between(1, 3)          # think time

    @task(3)                            # relative weight
    def browse(self):
        self.client.get("/api/products")

    @task(1)
    def purchase(self):
        with self.client.post("/api/orders", json={"sku": "A-1"}, catch_response=True) as r:
            if r.status_code != 201:
                r.failure(f"expected 201, got {r.status_code}")
```

Distributed: one `--master` plus N `--worker` nodes when a single machine cannot generate the
target load.

### JMeter

```bash
# Always non-GUI for an actual run — the GUI is for authoring only and skews results
jmeter -n -t test_plan.jmx -l results.jtl -e -o report/
```

Configure the Thread Group with the VU count and loop count; use a Constant Throughput Timer to
hold a target rps rather than relying on VU count alone. Parse failures from the `.jtl`:

```bash
grep -c "false" results.jtl            # assertion/sampler failures
grep "Assertion failure" results.jtl | head -20
```

### Distributed generation

One load generator saturates its own CPU well before it saturates your service. Symptoms: the
generator's CPU is pinned, measured latency rises, but the service under test is idle.

- k6: `k6 cloud`, or split VUs across machines and aggregate the JSON output.
- Locust: built-in master/worker.
- JMeter: `jmeter -R host1,host2 -n -t plan.jmx`.

Rule: **monitor the generator.** If its CPU exceeds ~80%, add machines or your numbers are
measuring the load tool.

## Step 4 — Judge the Result

### Percentiles, never averages

An average hides the tail. Report and gate on:

| Metric | Use |
|---|---|
| p50 | Typical experience — rarely the SLA |
| **p95** | The standard SLA percentile |
| p99 | What your worst-served users experience; matters for anything user-facing |
| error rate | `http_req_failed` — must be judged *with* latency, not instead of it |
| throughput | Achieved rps. If it plateaus while VUs rise, you found the ceiling |

A result is only a pass if latency, error rate **and** throughput all hold. A service returning
`503` in 4 ms has excellent latency.

### Read the shape, not just the numbers

| Observation | Diagnosis |
|---|---|
| Latency flat, then knee, then vertical | A saturating resource — find it (pool, thread, connection, CPU) |
| Throughput plateaus while VUs climb | You are at the ceiling; extra VUs only add queueing |
| Latency rises linearly from the start | Unbounded queue somewhere; no backpressure |
| Errors only at ramp start | Cold start / connection pool warm-up / autoscaler lag |
| Errors only at ramp end | Resource exhaustion, timeout cascade, or the downstream gave up |
| Latency drifts upward over hours | Soak finding: leak, fragmentation, or an unbounded cache |

### Attribute the bottleneck

Correlate the load window against:
1. **CPU flamegraph** of the service (see `csp-backend-performance` for capture commands) — flat
   top = CPU-bound; a single wide frame = a hot path.
2. **Memory / RSS** trend — monotonic rise during a steady load is a leak, not load.
3. **DB** — slow query log, lock waits, connection pool saturation. Pool exhaustion looks
   identical to app slowness from the client side.
4. **Downstream** — third-party latency often dominates and is the thing you cannot fix.

Never conclude "the app is slow" without one of these four. The client-side number tells you
*that*; the server-side evidence tells you *where*.

## Step 5 — Capacity Planning

The arithmetic, written out:

```
required_rps      = peak_rps × growth_factor × safety_factor
per_instance_rps  = measured ceiling rps per instance × 0.7      # never plan at 100%
instances_needed  = ceil(required_rps / per_instance_rps)
instances_final   = instances_needed + N_plus_redundancy          # survive one AZ/instance loss
```

Worked example: peak 800 rps, growth 2×, safety 1.25 → required 2,000 rps. Stress test shows one
instance sustains 500 rps before p95 breaches SLA → plan at 350 rps → `ceil(2000/350) = 6`, plus
one for redundancy → **7 instances**.

**Common mistakes:**
- Planning at the measured ceiling instead of 70% of it — leaves no room for a retry storm or a
  noisy neighbour, and the ceiling was measured on a quiet day with an empty cache.
- Using average latency to derive the ceiling. Use the p95-breach point.
- Forgetting the non-horizontal resources: DB connections, file descriptors, downstream rate
  limits. These do not scale when you add instances — they scale *worse*.
- Ignoring cold start. Autoscaling to 7 instances is only useful if the traffic can wait for them.
- Testing a staging environment that is 10× smaller and extrapolating linearly. Bottlenecks are
  not linear; a component that is never saturated at 1/10 scale can be the sole limiter at full scale.

## Step 6 — Gate in CI

Trigger on changes to the hot path, not on every commit — a full load test is minutes to hours.

```yaml
- name: Performance gate
  run: k6 run --summary-export=k6-summary.json loadtest.js
  # k6 exits non-zero on threshold breach — the step fails without extra scripting
```

- Baseline the previous run's p95 and fail on a regression beyond a set band (e.g. +10%).
- Store the summary JSON as an artifact and trend it; a slow 2% drift per release is invisible
  per-run and obvious per-quarter.
- Export to Prometheus for dashboards:

```bash
k6 run --out json=k6-results.json loadtest.js
# or: k6 run --out experimental-prometheus-rw loadtest.js
```

- Tag every run with the git SHA so a regression points at a commit.
- **Never run a load test against production** without an explicit decision, a traffic-isolation
  strategy, and someone from operations awake. Default to a production-like staging environment
  with production-shaped data volume — an empty table has different query plans than a full one.

## Report Template

```markdown
# Load Test — {service} @ {git sha} — {date}

**Model**: load | **Target**: 500 rps for 15 min | **Tool**: k6 0.x | **Env**: staging (data volume: 12M rows)

## Result
| Metric | Target | Measured | Verdict |
|---|---|---|---|
| p50 | — | 84 ms | |
| p95 | < 500 ms | 412 ms | PASS |
| p99 | < 1200 ms | 1,930 ms | **FAIL** |
| error rate | < 1% | 0.02% | PASS |
| achieved rps | 500 | 498 | PASS |

## Ceiling (from stress run)
Single instance sustained **420 rps** before p95 > 500 ms. Failure mode: DB connection pool
exhaustion (`pool_size=20`, saturation at ~90% util).

## Capacity plan
required 2,000 rps → plan 350 rps/instance → 6 + 1 redundancy = **7 instances**.

## Bottleneck evidence
- Flamegraph: 38% of samples in `pg.connect` wait
- Pool metrics: 20/20 active from 11:04 onward
- CPU: 41% — not CPU-bound

## Recommendations
1. Raise `pool_size` to 32 and re-test (trivial)
2. Add a read replica for the report queries (medium)
```

## Key Principles

- **Model before script** — the four curves answer different questions; picking wrong wastes the run.
- **Judge on p95 + error rate + throughput together** — any one alone can be gamed by failure.
- **Monitor the generator** — a saturated load tool measures itself.
- **Plan at 70% of the measured ceiling** — the ceiling was found on a good day.
- **Every result names a failure mode** — "it passed" without "here is what breaks next" is half a test.
- **Think time is mandatory** — a script with `sleep(0)` models an attacker, not a user.

## Anti-Patterns

| Anti-pattern | Consequence | Instead |
|---|---|---|
| Testing with zero think time | VU count ≠ user count; you measure a DDoS | Derive think time from real session analytics |
| Reporting averages | A 3 s p99 hides inside a 90 ms mean | p50/p95/p99 always |
| Running the GUI JMeter for a real test | The GUI consumes the generator's CPU | `-n` non-GUI, always |
| Soak test at 100% of ceiling | Everything fails at once; no signal about slow degradation | Soak at 50–70% of the ceiling |
| Extrapolating linearly from small staging | Non-horizontal resources (DB conns, FDs, rate limits) don't scale with instances | Production-shaped data volume; re-measure at scale |
| Concluding "slow" without server-side evidence | You fix the wrong layer | Flamegraph + memory + DB + downstream |
| Load-testing production by accident | Real outage, real users | Staging by default; production only by explicit decision |
| A pass with no failure mode recorded | Next quarter someone asks "how much headroom?" and nobody knows | Always run stress to find the ceiling |
| One-off tests, never trended | 2% drift per release compounds invisibly | Store summary JSON, gate on regression vs. baseline |
| Retrying transient failures silently | A flaky network becomes a false pass | Count retries separately and report them |
