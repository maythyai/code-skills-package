# Workflow Architect — Templates & Discovery Reference

## Discovery Audit Checklist

```markdown
# Workflow Discovery Audit — [Project Name]

## Entry Points Scanned
- [ ] All API route files (REST, GraphQL, gRPC)
- [ ] All background worker / job processor files
- [ ] All scheduled job / cron definitions
- [ ] All event listeners / message consumers
- [ ] All webhook endpoints

## Infrastructure Scanned
- [ ] Service orchestration config (docker-compose, k8s manifests)
- [ ] Infrastructure-as-code modules (Terraform, CloudFormation)
- [ ] CI/CD pipeline definitions
- [ ] Cloud-init / bootstrap scripts

## Data Layer Scanned
- [ ] All database migrations (schema implies lifecycle)
- [ ] All state machine definitions or status enums
- [ ] All foreign key relationships (implying ordering constraints)

## Findings
| # | Discovered workflow | Has spec? | Severity of gap | Notes |
```

## Discovery Commands

```bash
# Find all route entry points
grep -rn "router\.\(post\|put\|delete\|get\|patch\)" src/routes/ --include="*.ts"
grep -rn "@app\.\(route\|get\|post\|put\|delete\)" src/ --include="*.py"

# Find all background workers
find src/ -type f -name "*worker*" -o -name "*job*" -o -name "*consumer*"

# Find all state transitions
grep -rn "status.*=\|\.status\s*=\|state.*=" src/ --include="*.ts" --include="*.py"

# Find all scheduled jobs
grep -rn "cron\|schedule\|setInterval\|@Scheduled" src/

# Find all migrations
find . -path "*/migrations/*" -type f
```

## Handoff Contract Template

```
HANDOFF: [From] -> [To]
  ENDPOINT: POST /path
  PAYLOAD: { field: type — description }
  SUCCESS RESPONSE: { field: type }
  FAILURE RESPONSE: { error: string, code: string, retryable: bool }
  TIMEOUT: Xs — treated as FAILURE
  ON FAILURE: [recovery action]
```

## Agent Collaboration Protocol

- **Reality Checker** — after every draft spec, verify: does code implement these steps? Are there steps in code I missed? Are documented failure modes actual failure modes?
- **Backend Architect** — when spec reveals implementation gaps (e.g., missing retry logic)
- **Security Engineer** — mandatory for any workflow that passes secrets, creates credentials, or exposes unauthenticated endpoints
- **API Tester** — after spec is Approved; every branch in the workflow tree = one test case
- **DevOps Automator** — when workflow reveals infrastructure gaps (e.g., IaC destroy order mismatches cleanup inventory)

## Registry File Structure

```
docs/workflows/
  REGISTRY.md                         # The 4-view registry
  WORKFLOW-user-signup.md
  WORKFLOW-order-checkout.md
  WORKFLOW-payment-processing.md
```

Naming: `WORKFLOW-[kebab-case-name].md`

## Spec vs Reality Audit Log

Updated whenever code changes or a failure reveals a gap:

| Date | Finding | Action taken |
|------|---------|-------------|
| YYYY-MM-DD | Initial spec created | — |
| YYYY-MM-DD | Code diverged: added retry not in spec | Updated spec v0.2 |
| YYYY-MM-DD | Failure revealed unhandled branch | Added to spec + test case |
