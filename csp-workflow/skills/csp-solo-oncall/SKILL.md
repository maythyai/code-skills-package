---
name: csp-solo-oncall
description: >
  Structured incident response workflow for solo developers and small teams.
  Use when a production issue is detected, when you're the only person on call,
  or when you need a calm, repeatable process for diagnosing and resolving live incidents.
version: 0.1.0
layer: 2
category: workflow
---

# Solo On-Call Response

A structured incident response process designed for solo developers who are their own ops team.

## When to Use

- A production alert fires and you're the only responder
- A user reports a critical bug in production
- A service is down or degraded and you need to triage fast
- You wake up to a PagerDuty/notification and need a clear head

## When NOT to Use

- You have a dedicated SRE or ops team (use their runbooks instead)
- The issue is non-urgent and can wait for normal working hours
- The fix requires a code review before deployment (use [[csp-hotfix]] for urgent code fixes)

## Process

### Phase 1: Assess (first 5 minutes)

1. **Confirm the incident** — Check monitoring dashboards, error logs, and user reports. Is this a real incident or a false alarm?
2. **Determine severity**:
   - **SEV1**: Service down, data loss, or revenue-impacting. Drop everything.
   - **SEV2**: Major feature broken, significant user impact. Respond within 15 minutes.
   - **SEV3**: Minor feature broken, workaround exists. Respond within 1 hour.
   - **SEV4**: Cosmetic issue, edge case. Schedule for next work session.
3. **Start a timeline** — Open a document or terminal and log every action with timestamps.

### Phase 2: Stabilize (5-30 minutes)

4. **Stop the bleeding** — Apply the fastest mitigation:
   - Rollback the last deployment if the incident started after a deploy
   - Restart the failing service
   - Enable a feature flag to disable the broken path
   - Scale up resources if it's a capacity issue
5. **Communicate** — If users are affected, post a status update (status page, in-app banner, or email). Template:
   > "We're aware of [issue] affecting [what]. We're investigating and will update in [timeframe]."
6. **Check your assumptions** — Before diving deep, list what you think is true and verify each one.

### Phase 3: Diagnose (15-60 minutes)

7. **Follow the logs**:
   ```bash
   # Recent errors
   journalctl -u <service> --since "1 hour ago" | grep -i error
   # Or check structured logs
   tail -f /var/log/<app>/app.log | jq 'select(.level == "error")'
   ```
8. **Check the usual suspects**:
   - Recent deployments (git log, CI/CD history)
   - Database connections and query performance
   - External service dependencies (API timeouts, rate limits)
   - Resource exhaustion (memory, disk, CPU, connection pools)
   - Certificate expirations
9. **Reproduce if possible** — Can you trigger the issue in a staging environment or with a specific request?

### Phase 4: Resolve

10. **Implement the fix**:
    - If it's a config change: apply, verify, document
    - If it's a code fix: use [[csp-hotfix]] workflow for minimal-change deployment
    - If it's an infrastructure issue: apply fix, verify, then automate prevention
11. **Verify the fix** — Confirm the original symptoms are gone. Check monitoring for 15 minutes.
12. **Communicate resolution** — Update status page and affected users.

### Phase 5: Learn (within 24 hours)

13. **Write a postmortem** — Even a brief one. Include:
    - Timeline of events
    - Root cause
    - What went well
    - What could be improved
    - Action items to prevent recurrence
14. **Add monitoring** — If the incident wasn't caught by existing alerts, add the missing check.
15. **Update runbooks** — If you discovered a new diagnostic step, add it to this process.

## Key Principles

- **Mitigate first, fix later** — Your first job is to restore service, not to understand the root cause.
- **Logs are your friend** — Structured logging pays for itself during incidents.
- **Communication buys time** — Telling users "we're working on it" reduces pressure and builds trust.
- **Postmortems prevent recurrence** — An incident without a postmortem is an incident that will happen again.

## Solo Developer Emergency Kit

Keep these ready before incidents happen:

- [ ] Rollback mechanism tested and documented
- [ ] SSH/console access to production verified
- [ ] Database backup restoration tested in last 30 days
- [ ] Status page or communication channel set up
- [ ] Key external service status pages bookmarked
- [ ] On-call alerting configured (PagerDuty, OpsGenie, or even SMS)

## Related Skills

- [[csp-hotfix]] — when the resolution requires a code change
- [[csp-monitoring-alerting]] — for setting up the alerts that catch incidents early
- [[csp-db-backup]] — when the incident involves data loss or corruption
