---
name: csp-shipping-and-launch
description: Prepares production launches. Use when preparing to deploy to production. Use when you need a pre-launch checklist, when setting up monitoring, when planning a staged rollout, or when you need a rollback strategy.
layer: 2
category: workflow
phase: ship
domain: devops
scope: implementation
tools: [Read, Write, Edit, Bash, Glob, Grep]
---

| Metric | Green (OK) | Yellow (Monitor) | Red (Roll Back) |
|--------|------------|------------------|-----------------|
| Error rate | Within 10% of baseline | 10-100% above baseline | >2x baseline |
| P95 latency | Within 20% of baseline | 20-50% above baseline | >50% above baseline |
| Client JS errors | No new error types | New errors at <0.1% of sessions | New errors at >0.1% of sessions |
| Business metrics | Neutral or positive | Decline <5% (may be noise) | Decline >5% |

### When to Roll Back

Roll back immediately if:
- Error rate increases by more than 2x baseline
- P95 latency increases by more than 50%
- User-reported issues spike
- Data integrity issues detected
- Security vulnerability discovered

## Monitoring and Observability

### What to Monitor

```
Application metrics:
├── Error rate (total and by endpoint)
├── Response time (p50, p95, p99)
├── Request volume
├── Active users
└── Key business metrics (conversion, engagement)

Infrastructure metrics:
├── CPU and memory utilization
├── Database connection pool usage
├── Disk space
├── Network latency
└── Queue depth (if applicable)

Client metrics:
├── Core Web Vitals (LCP, INP, CLS)
├── JavaScript errors
├── API error rates from client perspective
└── Page load time
```

### Error Reporting

```typescript
// Set up error boundary with reporting
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Report to error tracking service
    reportError(error, {
      componentStack: info.componentStack,
      userId: getCurrentUser()?.id,
      page: window.location.pathname,
    });
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onRetry={() => this.setState({ hasError: false })} />;
    }
    return this.props.children;
  }
}

// Server-side error reporting
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  reportError(err, {
    method: req.method,
    url: req.url,
    userId: req.user?.id,
  });

  // Don't expose internals to users
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
  });
});
```

### Post-Launch Verification

In the first hour after launch:

```
1. Check health endpoint returns 200
2. Check error monitoring dashboard (no new error types)
3. Check latency dashboard (no regression)
4. Test the critical user flow manually
5. Verify logs are flowing and readable
6. Confirm rollback mechanism works (dry run if possible)
```

## Rollback Strategy

Every deployment needs a rollback plan before it happens:

```markdown
## Rollback Plan for [Feature/Release]

### Trigger Conditions
- Error rate > 2x baseline
- P95 latency > [X]ms
- User reports of [specific issue]

### Rollback Steps
1. Disable feature flag (if applicable)
   OR
1. Deploy previous version: `git revert <commit> && git push`
2. Verify rollback: health check, error monitoring
3. Communicate: notify team of rollback

### Database Considerations
- Migration [X] has a rollback: `npx prisma migrate rollback`
- Data inserted by new feature: [preserved / cleaned up]

### Time to Rollback
- Feature flag: < 1 minute
- Redeploy previous version: < 5 minutes
- Database rollback: < 15 minutes
```
## See Also

- For security pre-launch checks, see `references/security-checklist.md`
- For performance pre-launch checklist, see `references/performance-checklist.md`
- For accessibility verification before launch, see `references/accessibility-checklist.md`

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "It works in staging, it'll work in production" | Production has different data, traffic patterns, and edge cases. Monitor after deploy. |
| "We don't need feature flags for this" | Every feature benefits from a kill switch. Even "simple" changes can break things. |
| "Monitoring is overhead" | Not having monitoring means you discover problems from user complaints instead of dashboards. |
| "We'll add monitoring later" | Add it before launch. You can't debug what you can't see. |
| "Rolling back is admitting failure" | Rolling back is responsible engineering. Shipping a broken feature is the failure. |

## Red Flags

- Deploying without a rollback plan
- No monitoring or error reporting in production
- Big-bang releases (everything at once, no staging)
- Feature flags with no expiration or owner
- No one monitoring the deploy for the first hour
- Production environment configuration done by memory, not code
- "It's Friday afternoon, let's ship it"

## Verification

Before deploying:

- [ ] Pre-launch checklist completed (all sections green)
- [ ] Feature flag configured (if applicable)
- [ ] Rollback plan documented
- [ ] Monitoring dashboards set up
- [ ] Team notified of deployment

After deploying:

- [ ] Health check returns 200
- [ ] Error rate is normal
- [ ] Latency is normal
- [ ] Critical user flow works
- [ ] Logs are flowing
- [ ] Rollback tested or verified ready
