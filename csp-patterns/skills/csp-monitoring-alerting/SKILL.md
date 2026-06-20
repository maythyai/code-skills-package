---
name: csp-monitoring-alerting
description: >
  Set up error tracking, uptime monitoring, APM, log aggregation, and alerting pipelines using free-tier and low-cost observability tools.
version: 0.1.0
layer: 4
category: patterns
---

# Monitoring and Alerting

Build a complete observability stack with error tracking, uptime monitoring, performance metrics, log aggregation, and alert routing on a solo-developer budget.

## When to Activate

- Adding error tracking to a new application (Sentry, Bugsnag)
- Setting up uptime monitoring and status pages
- Configuring alerting rules for production errors or downtime
- Implementing APM for request tracing and slow query detection
- Building dashboards for the four golden signals
- Defining SLOs and error budgets for a service

## Monitoring Stack Decision Tree

```
What is your primary concern?
  |
  +-> "My app throws errors I don't see" -> Error Tracking
  |     Budget $0?   -> Sentry (free: 5K errors/mo)
  |     Budget $29+? -> Sentry Team or Bugsnag
  |     Self-hosted? -> Sentry self-hosted (needs 4GB RAM)
  |
  +-> "Is my site up?" -> Uptime Monitoring
  |     Budget $0?   -> UptimeRobot (50 monitors) or Healthchecks.io (20 checks)
  |     Need status page? -> Better Stack (free: 10 monitors + status page)
  |
  +-> "Why is it slow?" -> APM / Tracing
  |     Budget $0?   -> Sentry Performance (free: 100K spans/mo)
  |     Need deep traces? -> Grafana Cloud Tempo (free: 50GB traces)
  |     Full-stack?  -> Datadog (free: 5 hosts)
  |
  +-> "Where are my logs?" -> Log Aggregation
  |     Budget $0?   -> Grafana Cloud Loki (free: 50GB logs)
  |     On AWS?      -> CloudWatch Logs (free: 5GB ingest/mo)
  |     Self-hosted? -> Loki + Grafana (Docker Compose)
  |
  +-> "How is my business doing?" -> Custom Metrics
        Budget $0?   -> Grafana Cloud Prometheus (free: metrics)
        Self-hosted? -> Prometheus + Grafana (Docker Compose)
```

## Platform Comparison

| Tool             | Type           | Free Tier                 | Best For           |
|------------------|----------------|---------------------------|--------------------|
| Sentry           | Error tracking | 5K errors, 100K spans/mo  | Full-stack errors  |
| Datadog          | Full APM       | 5 hosts, 1 day retention  | Enterprise-grade   |
| Grafana Cloud    | Logs+Metrics   | 50GB logs, 50GB traces    | DIY observability  |
| UptimeRobot      | Uptime         | 50 monitors, 5-min checks | Simple uptime      |
| Better Stack     | Uptime+Status  | 10 monitors + status page | Public status page |
| Healthchecks.io  | Cron monitor   | 20 checks                 | Cron job monitoring|
| PagerDuty        | Alert routing  | Free for 1 user           | On-call management |
| OpsGenie         | Alert routing  | Free for 5 users          | Team alerting      |

## Error Tracking with Sentry

### SDK Integration

```typescript
// Next.js — sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,          // 10% of transactions for performance
  replaysSessionSampleRate: 0.0,  // disabled on free tier
  replaysOnErrorSampleRate: 1.0,  // 100% on errors
  beforeSend(event) {
    // Scrub PII before sending
    if (event.request?.headers) {
      delete event.request.headers['Authorization'];
      delete event.request.headers['Cookie'];
    }
    return event;
  },
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
  ],
});
```

```python
# Python — sentry_sdk integration
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration
from sentry_sdk.integrations.celery import CeleryIntegration
from sentry_sdk.integrations.redis import RedisIntegration

sentry_sdk.init(
    dsn=os.environ["SENTRY_DSN"],
    environment=os.environ.get("ENVIRONMENT", "development"),
    integrations=[
        DjangoIntegration(),
        CeleryIntegration(),
        RedisIntegration(),
    ],
    traces_sample_rate=0.1,
    send_default_pii=False,
    before_send=scrub_pii,
)
```

### Source Maps and Release Tracking

```bash
# Upload source maps during CI/CD
npx @sentry/cli sourcemaps inject ./dist
npx @sentry/cli sourcemaps upload \
  --org my-org \
  --project my-app \
  --release "my-app@1.2.3" \
  ./dist

# Or with GitHub Actions
# .github/workflows/deploy.yml
- name: Upload Sentry source maps
  run: |
    npx @sentry/cli sourcemaps inject ./dist
    npx @sentry/cli sourcemaps upload --release "${{ github.sha }}" ./dist
  env:
    SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
```

### Sentry Alert Rules

```yaml
# Configure in Sentry UI or via API
# Rule: Alert on new issues in production
- name: "New production error"
  conditions:
    - first_seen: true
    - environment: production
  actions:
    - type: slack
      channel: "#alerts"
    - type: email
      target: dev@example.com

# Rule: Alert on high error rate
- name: "Error rate spike"
  conditions:
    - event_frequency: 50
      interval: 5m
    - environment: production
  actions:
    - type: pagerduty
```

## Uptime Monitoring

### Tool Comparison

| Feature             | UptimeRobot    | Better Stack   | Healthchecks.io |
|---------------------|----------------|----------------|-----------------|
| Monitors (free)     | 50             | 10             | 20              |
| Check interval      | 5 min          | 5 min          | 1 min           |
| Status page         | Paid add-on    | Included       | No              |
| Cron monitoring     | No             | Yes            | Yes (primary)   |
| SSL expiry alerts   | Yes            | Yes            | No              |
| API for config      | Yes            | Yes            | Yes             |
| Regions             | 6              | 12             | 3               |

### Healthchecks.io Cron Monitoring

```bash
# In your cron job, ping Healthchecks.io on success
# /etc/cron.d/myapp
0 2 * * * deploy /usr/local/bin/backup.sh && curl -fsS --retry 3 https://hc-ping.com/your-uuid-here > /dev/null

# Start ping (track duration)
0 */6 * * * deploy curl -fsS https://hc-ping.com/your-uuid-here/start && /usr/local/bin/sync-job.sh && curl -fsS https://hc-ping.com/your-uuid-here > /dev/null
```

### Better Stack Status Page

```yaml
# Better Stack status page configuration (via API)
monitors:
  - name: "API Health"
    url: "https://api.example.com/health"
    check_interval: 60
    regions: [us-east, eu-west]
    alert_contacts: ["slack:#status"]

  - name: "Website"
    url: "https://example.com"
    check_interval: 300
    keyword: "Welcome"
```

## Application Performance Monitoring

### Request Tracing with Sentry

```typescript
// Custom span for database query
import * as Sentry from "@sentry/node";

async function getUserOrders(userId: string) {
  return Sentry.startSpan(
    { op: "db.query", name: "getUserOrders" },
    async () => {
      const user = await db.users.findUnique({ where: { id: userId } });
      const orders = await db.orders.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      return { user, orders };
    }
  );
}
```

### Slow Query Detection (PostgreSQL)

```sql
-- Enable pg_stat_statements for query analysis
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Find slow queries
SELECT
  query,
  calls,
  mean_exec_time,
  total_exec_time,
  rows
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Log slow queries (> 500ms)
ALTER SYSTEM SET log_min_duration_statement = 500;
SELECT pg_reload_conf();
```

### Custom APM Middleware (Express)

```typescript
import { Request, Response, NextFunction } from 'express';

function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const labels = {
      method: req.method,
      path: req.route?.path || req.path,
      status: res.statusCode,
    };

    // Record to Prometheus (if using prom-client)
    httpRequestDuration.labels(labels).observe(duration / 1000);
    httpRequestsTotal.labels(labels).inc();

    // Alert on slow requests
    if (duration > 5000) {
      Sentry.captureMessage(`Slow request: ${req.method} ${req.path} took ${duration}ms`);
    }
  });

  next();
}
```

## Log Aggregation

### Grafana Cloud Loki (Self-Hosted)

```yaml
# docker-compose.yml — Loki + Grafana
version: "3"
services:
  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
    volumes:
      - loki-data:/loki
    command: -config.file=/etc/loki/local-config.yaml

  promtail:
    image: grafana/promtail:latest
    volumes:
      - /var/log:/var/log:ro
      - ./promtail-config.yml:/etc/promtail/config.yml
    command: -config.file=/etc/promtail/config.yml

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    volumes:
      - grafana-data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin

volumes:
  loki-data:
  grafana-data:
```

```yaml
# promtail-config.yml
server:
  http_listen_port: 9080

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: system
    static_configs:
      - targets: [localhost]
        labels:
          job: syslog
          __path__: /var/log/syslog

  - job_name: myapp
    static_configs:
      - targets: [localhost]
        labels:
          job: myapp
          __path__: /var/log/myapp/*.log
    pipeline_stages:
      - json:
          expressions:
            level: level
            message: message
      - labels:
          level:
```

### LogQL Query Examples

```bash
# All error logs from myapp in the last hour
{job="myapp", level="error"} |= "error" | last 1h

# Count errors per minute
count_over_time({job="myapp", level="error"}[1m])

# Parse JSON logs and filter
{job="myapp"} | json | status >= 500

# Rate of errors over 5 minutes
rate({job="myapp", level="error"}[5m])
```

## Custom Business Metrics

### StatsD / Prometheus Integration

```typescript
import { Registry, Counter, Histogram, Gauge } from 'prom-client';

const register = new Registry();

// Counter: total signups
export const signupCounter = new Counter({
  name: 'user_signups_total',
  help: 'Total number of user signups',
  labelNames: ['plan', 'source'],
  registers: [register],
});

// Histogram: payment processing time
export const paymentDuration = new Histogram({
  name: 'payment_processing_seconds',
  help: 'Payment processing duration',
  labelNames: ['provider', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [register],
});

// Gauge: active users
export const activeUsers = new Gauge({
  name: 'active_users_current',
  help: 'Number of currently active users',
  registers: [register],
});

// Usage in business logic
signupCounter.inc({ plan: 'pro', source: 'organic' });
paymentDuration.observe({ provider: 'stripe', status: 'success' }, 1.2);
```

### Exposing Metrics Endpoint

```typescript
import express from 'express';
import { register } from './metrics';

const app = express();

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

## Alert Routing

### Alert Pipeline Architecture

```
Application -> Error Tracker (Sentry) -> Alert Rule
                                            |
                                  +---------+---------+
                                  |                   |
                            Low severity        High severity
                                  |                   |
                              Slack #alerts     PagerDuty
                                                  |
                                           On-call rotation
```

### PagerDuty Integration

```typescript
// PagerDuty Events API v2
async function triggerAlert(summary: string, severity: 'critical' | 'error' | 'warning') {
  const response = await fetch('https://events.pagerduty.com/v2/enqueue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      routing_key: process.env.PAGERDUTY_INTEGRATION_KEY,
      event_action: 'trigger',
      payload: {
        summary,
        severity,
        source: 'myapp-production',
        component: 'api',
        group: 'backend',
      },
      dedup_key: `myapp-${Date.now()}`,
    }),
  });
  return response.json();
}
```

### Slack Alert Formatting

```typescript
async function sendSlackAlert(title: string, details: string, level: 'warning' | 'error') {
  const color = level === 'error' ? '#dc3545' : '#ffc107';

  await fetch(process.env.SLACK_WEBHOOK_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      attachments: [{
        color,
        title: `[${level.toUpperCase()}] ${title}`,
        text: details,
        fields: [
          { title: 'Environment', value: 'Production', short: true },
          { title: 'Service', value: 'API', short: true },
        ],
        footer: 'MyApp Alerts',
        ts: Math.floor(Date.now() / 1000),
      }],
    }),
  });
}
```

## Dashboard Design: The Four Golden Signals

### Signal Definitions

| Signal     | What It Measures                | How to Measure                         | Alert Threshold Example      |
|------------|--------------------------------|----------------------------------------|------------------------------|
| Latency    | Time to serve a request         | p50, p95, p99 response time            | p99 > 1s for 5 minutes       |
| Traffic    | Demand on the system            | Requests per second                    | > 2x baseline for 10 min     |
| Errors     | Rate of failed requests         | 5xx responses / total responses        | Error rate > 1% for 3 min    |
| Saturation | Resource utilization            | CPU %, memory %, disk %, connection pool | CPU > 80% for 15 minutes    |

### Grafana Dashboard Panels (PromQL)

```yaml
# Latency — p99 response time
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))

# Traffic — requests per second
sum(rate(http_requests_total[5m]))

# Errors — error rate percentage
sum(rate(http_requests_total{status=~"5.."}[5m]))
  / sum(rate(http_requests_total[5m])) * 100

# Saturation — CPU usage
100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
```

## SLO/SLI Definition and Error Budgets

### SLI/SLO Framework

```yaml
# Example SLO definitions
slos:
  - name: "API Availability"
    description: "Percentage of successful API requests"
    sli:
      type: availability
      good_events: http_requests_total{status=~"2..|3.."}
      total_events: http_requests_total
    target: 99.9
    window: 30d

  - name: "API Latency"
    description: "Percentage of requests served under 500ms"
    sli:
      type: latency
      good_events: http_request_duration_seconds_bucket{le="0.5"}
      total_events: http_request_duration_seconds_count
    target: 99.0
    window: 30d
```

### Error Budget Calculation

```python
# Error budget calculator
def error_budget(slo_target: float, window_days: int = 30):
    """Calculate error budget in minutes of allowed downtime."""
    total_minutes = window_days * 24 * 60
    allowed_failure_minutes = total_minutes * (1 - slo_target / 100)
    return {
        "total_minutes": total_minutes,
        "allowed_failure_minutes": round(allowed_failure_minutes, 1),
        "burn_rate_alert": {
            "fast_burn": allowed_failure_minutes * 14.4 / (window_days * 24),  # 1-hour window
            "slow_burn": allowed_failure_minutes * 6 / (window_days * 24),      # 6-hour window
        },
    }

# Example: 99.9% SLO over 30 days
budget = error_budget(99.9, 30)
# -> 43.2 minutes of allowed downtime per month
```

## Free Tier Optimization

### Maximizing $0 Observability

| Need             | Free Solution                          | Limits                        |
|------------------|----------------------------------------|-------------------------------|
| Error tracking   | Sentry                                 | 5K errors/mo                  |
| APM / Traces     | Sentry Performance                     | 100K spans/mo                 |
| Uptime           | UptimeRobot + Better Stack             | 50 + 10 monitors              |
| Cron monitoring  | Healthchecks.io                        | 20 checks                     |
| Log aggregation  | Grafana Cloud Loki                     | 50GB logs, 14-day retention   |
| Metrics          | Grafana Cloud Prometheus               | Unlimited series, 14-day      |
| Status page      | Better Stack                           | Included with uptime          |
| Alert routing    | PagerDuty (1 user) or OpsGenie (5 users) | Free tier                 |
| Dashboard        | Grafana Cloud                          | Unlimited dashboards          |

### Sample Rate Strategy

```typescript
// Dynamic sampling based on environment and error state
Sentry.init({
  tracesSampler: (context) => {
    // Always trace errors
    if (context.parentSampled === false) return 0;
    if (context.transactionContext?.name?.includes('error')) return 1.0;

    // Sample 1% of successful requests in production
    if (process.env.NODE_ENV === 'production') return 0.01;

    // 100% in development
    return 1.0;
  },
});
```

## Anti-Patterns

- **Alerting on everything**: Alert fatigue is the number one monitoring killer. Only alert on actionable issues that require human intervention. Use "warning" for investigation-needed and "critical" for page-worthy issues.
- **Ignoring the four golden signals**: Dashboards with 50 panels that exclude latency, traffic, errors, and saturation are useless in an incident. Start with the four signals and add domain-specific metrics only after.
- **Not setting SLOs**: Without an SLO, every blip feels like an emergency. Define clear targets (99.9% availability) so you know when to act and when the error budget allows you to relax.
- **Logging everything at INFO level**: High-volume INFO logs make it hard to find real issues. Use structured logging with appropriate levels: ERROR for failures, WARN for degraded states, INFO for key business events, DEBUG for development only.
- **Sending PII to monitoring tools**: Sentry, Datadog, and log aggregators may store sensitive data. Always scrub Authorization headers, passwords, tokens, and user PII in `beforeSend` hooks and log formatters.
- **Relying on a single monitoring tool**: Use defense in depth. Sentry catches application errors, UptimeRobot catches infrastructure failures, Healthchecks.io catches cron failures. No single tool covers everything.

## Related Skills

- [[csp-platform-deploy]]
- [[csp-vps-deploy]]
- [[csp-db-backup]]
