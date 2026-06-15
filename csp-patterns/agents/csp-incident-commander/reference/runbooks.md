# Incident Commander — Runbook & Template Reference

## Runbook Template

```markdown
# Runbook: [Service/Failure Scenario]

## Quick Reference
- **Service**: [service name and repo link]
- **Owner Team**: [team name, Slack channel]
- **On-Call**: [PagerDuty schedule link]
- **Dashboards**: [Grafana/Datadog links]
- **Last Tested**: [date]

## Detection
- **Alert**: [Alert name and monitoring tool]
- **Symptoms**: [What users/metrics look like during this failure]
- **False Positive Check**: [How to confirm this is real]

## Diagnosis
1. Check service health: `kubectl get pods -n <namespace> | grep <service>`
2. Review error rates: [Dashboard link]
3. Check recent deployments: `kubectl rollout history deployment/<service>`
4. Review dependency health: [Dependency status page links]

## Remediation

### Option A: Rollback (preferred if deploy-related)
kubectl rollout undo deployment/<service> -n production
kubectl rollout status deployment/<service> -n production

### Option B: Restart (if state corruption suspected)
kubectl rollout restart deployment/<service> -n production

### Option C: Scale up (if capacity-related)
kubectl scale deployment/<service> -n production --replicas=<target>

## Verification
- [ ] Error rate returned to baseline
- [ ] Latency p99 within SLO
- [ ] No new alerts firing for 10 minutes
- [ ] User-facing functionality manually verified
```

## Post-Mortem Template

```markdown
# Post-Mortem: [Incident Title]
**Date**: YYYY-MM-DD | **Severity**: SEV[1-4] | **Duration**: [start] – [end]

## Executive Summary
[2-3 sentences: what happened, who was affected, how it was resolved]

## Impact
- Users affected: [number or %]
- Revenue impact: [estimated or N/A]
- SLO budget consumed: [X% of monthly error budget]

## Timeline (UTC)
| Time | Event |
|------|-------|
| 14:02 | Monitoring alert fires |
| 14:05 | On-call acknowledges page |
| 14:08 | Incident declared SEV2, IC assigned |
| 14:18 | Rollback initiated |
| 14:30 | Incident resolved |

## Root Cause Analysis
### 5 Whys
1. Why did the service go down? → [answer]
2. Why did [1] happen? → [answer]
3. Why did [2] happen? → [answer]
4. Why did [3] happen? → [answer]
5. Why did [4] happen? → [root systemic issue]

## Action Items
| ID | Action | Owner | Priority | Due Date | Status |
|----|--------|-------|----------|----------|--------|
```

## SLO/SLI Definition Framework

```yaml
service: checkout-api
owner: payments-team
slis:
  availability:
    metric: "sum(rate(http_requests_total{status!~'5..'}[5m])) / sum(rate(http_requests_total[5m]))"
    good_event: "HTTP status < 500"
  latency:
    metric: "histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))"
    threshold: "400ms at p99"
slos:
  - sli: availability
    target: 99.95%
    error_budget: "21.6 minutes/month"
    burn_rate_alerts:
      - severity: page
        short_window: 5m
        burn_rate: 14.4x
  - sli: latency
    target: 99.0%
error_budget_policy:
  above_50pct: "Normal feature development"
  25_to_50pct: "Feature freeze review"
  below_25pct: "All hands on reliability work"
  exhausted: "Freeze all non-critical deploys"
```

## On-Call Rotation Configuration

```yaml
schedule:
  rotation_type: "weekly"
  handoff_time: "10:00"  # Business hours, never midnight
  participants:
    min_rotation_size: 4
    max_consecutive_weeks: 2
    shadow_period: 2_weeks
  escalation_policy:
    - level: 1
      target: "on-call-primary"
      timeout: 5_minutes
    - level: 2
      target: "on-call-secondary"
      timeout: 10_minutes
    - level: 3
      target: "engineering-manager"
      timeout: 15_minutes
  compensation:
    on_call_stipend: true
    post_incident_time_off: true
  health_metrics:
    alert_if_pages_exceed: 5  # per week = noisy alerts
```

## Stakeholder Communication Templates

**SEV1 Initial (within 10 min)**:
> [SEV1] [Service] — [Brief Impact]
> Status: Investigating. Impact: [X]% users experiencing [symptom]. Next update: 15 min.

**SEV1 Status Update (every 15 min)**:
> [SEV1 UPDATE] [Service]
> Status: [Investigating/Identified/Mitigating/Resolved]. Actions taken: [...]. Next update: 15 min.

**Resolved**:
> [RESOLVED] [Service]. Duration: [start] to [end]. Follow-up: Post-mortem scheduled [date].
