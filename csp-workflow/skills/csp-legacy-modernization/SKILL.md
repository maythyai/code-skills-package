---
name: csp-legacy-modernization
description: >
  End-to-end legacy modernization workflow covering assessment (codebase audit, dependency
  analysis, architecture review), planning (migration strategy, risk assessment, timeline),
  execution (incremental migration, strangler fig, parallel run), verification (regression
  testing, performance comparison, data integrity), and common migration scenarios.
  Use when modernizing a legacy system or planning a major migration.
metadata:
  origin: CSP
---

# Legacy Modernization Workflow

Structured workflow for modernizing legacy systems with minimal risk. Covers the full lifecycle from assessment through verification, with specific guidance for common migration scenarios and anti-patterns to avoid.

## When to Activate

- Planning a migration from a legacy system to a modern architecture
- Upgrading an old framework version that requires significant code changes
- Migrating from a monolith to microservices (or vice versa)
- Upgrading database technology or schema
- Modernizing API interfaces (REST versioning, GraphQL adoption)
- Replacing an end-of-life technology stack

**When NOT to activate:**
- Simple dependency version bumps (use standard upgrade procedures)
- Greenfield projects with no legacy code
- Performance optimization of an existing system (use profiling-driven approaches)
- When the business case for modernization has not been established

## Core Principles

### 1. Never Do a Big Bang Rewrite

Big bang rewrites fail at an alarming rate. They take longer than expected, introduce new bugs, and deliver no value until completion. Always prefer incremental migration.

### 2. Deliver Value Continuously

Every migration step should deliver tangible value — improved performance, new capabilities, reduced maintenance burden — not just "getting closer to the new system."

### 3. Keep the Old System Running

The legacy system must remain operational throughout the migration. Users should not notice the transition.

### 4. Verify Equivalence at Every Step

Each migration step must be verified against the legacy system's behavior. Characterization tests are your safety net.

## Phase 1: Assessment

### Codebase Audit

**Goal:** Understand what exists, how it works, and what state it is in.

```bash
# Size and structure analysis
find src/ -name '*.ts' -o -name '*.js' | xargs wc -l | sort -rn | head -20
cloc src/  # Lines of code by language

# Dependency analysis
npm outdated
npm audit
npx depcheck

# Complexity analysis
npx complexity-report src/

# Test coverage assessment
npm test -- --coverage
```

**Assessment checklist:**

| Area | What to Measure | Tool |
|------|----------------|------|
| **Code volume** | Total LOC, files, modules | cloc, find |
| **Complexity** | Cyclomatic complexity, cognitive complexity | complexity-report, radon |
| **Test coverage** | Line/branch coverage, missing critical paths | jest --coverage, istanbul |
| **Dead code** | Unused exports, unreachable branches | knip, ts-prune |
| **Documentation** | README quality, inline docs, API docs | Manual review |
| **Build system** | Build time, reliability, reproducibility | CI logs |
| **Deployment** | Deploy frequency, failure rate, rollback capability | Deploy logs |

### Dependency Analysis

Map all dependencies and their health:

```markdown
| Dependency | Version | Latest | Status | Criticality | Notes |
|-----------|---------|--------|--------|-------------|-------|
| express | 4.17.1 | 4.21.0 | Maintained | High | Core framework |
| sequelize | 5.22.0 | 6.37.0 | Maintained | High | Major version behind |
| moment | 2.29.1 | 2.30.1 | Maintenance | Medium | Replace with dayjs |
| request | 2.88.2 | N/A | Deprecated | High | Must replace |
| node-uuid | 1.4.8 | N/A | Abandoned | Low | Replace with uuid |
```

**Priority matrix for dependency issues:**

| Category | Action |
|----------|--------|
| Security vulnerability (critical/high) | Patch immediately |
| Deprecated package | Plan replacement in current sprint |
| Major version behind | Schedule upgrade in roadmap |
| Abandoned package | Replace in next quarter |
| Minor version behind | Batch upgrade monthly |

### Architecture Review

Document the current architecture:

```
Current Architecture:
┌──────────────────────────────────────┐
│           Monolith (Express.js)       │
├──────────┬───────────┬───────────────┤
│  Auth    │  Orders   │  Inventory    │
│  Module  │  Module   │  Module       │
├──────────┴───────────┴───────────────┤
│         Shared Database (PostgreSQL)  │
├──────────────────────────────────────┤
│         Redis Cache / Bull Queue      │
└──────────────────────────────────────┘

Pain points identified:
- Modules coupled through shared database tables
- No clear API boundaries between modules
- Single deployment unit causes risk
- Scaling requires scaling the entire monolith
```

**Architecture smell detection:**

| Smell | How to Detect | Impact |
|-------|--------------|--------|
| Circular module dependencies | `madge --circular` | Prevents independent deployment |
| Shared mutable state | Grep for global state access | Race conditions, debugging difficulty |
| No API boundaries | Imports across module directories | Tight coupling, change cascades |
| God modules | Module size > 10K LOC | Maintenance difficulty |
| Database as integration | Multiple modules querying same tables | Schema change risk |

### Stakeholder Interviews

Technical assessment is incomplete without understanding the human factors:

- **Developers:** What is most painful to work with? What takes the longest?
- **Operations:** What fails most often in production? What is hardest to deploy?
- **Product:** What features are blocked by technical limitations?
- **Users:** What is slow, confusing, or broken?

## Phase 2: Planning

### Migration Strategy Selection

| Strategy | When to Use | Risk | Duration |
|----------|-----------|------|----------|
| **Strangler Fig** | Clear module boundaries, must stay operational | Medium | Months |
| **Branch by Abstraction** | Replacing one component at a time | Low-Medium | Weeks-Months |
| **Parallel Run** | Critical systems, need high confidence | Medium | Weeks |
| **Lift and Shift** | Infrastructure migration only (e.g., cloud) | Low | Days-Weeks |
| **Rewrite** | Last resort, system is unmaintainable | High | Months-Years |

### Risk Assessment

For each migration step, assess risk:

```markdown
| Step | Risk Level | Blast Radius | Rollback Plan | Mitigation |
|------|-----------|-------------|---------------|------------|
| Extract auth module | Medium | Users can't log in | Feature toggle back to legacy | Parallel run for 1 week |
| Migrate orders API | High | Orders fail | Database replication to legacy | Canary rollout 5% → 100% |
| Replace database | Very High | Data loss | Point-in-time backup, dual-write | Shadow writes with comparison |
```

### Timeline Planning

**Rule of thumb:** If you think a migration step takes 1 week, plan for 2-3 weeks.

```
Q1: Assessment + Infrastructure Setup
├── Week 1-2: Codebase audit and dependency analysis
├── Week 3-4: Architecture review and stakeholder interviews
├── Week 5-6: Migration strategy selection and risk assessment
├── Week 7-8: CI/CD pipeline for new system
└── Week 9-10: Test infrastructure and monitoring setup

Q2: Incremental Migration
├── Week 1-3: Extract auth module (lowest risk, high value)
├── Week 4-6: Extract notification service
├── Week 7-9: Migrate inventory read paths
└── Week 10-12: Parallel run and verification

Q3: Complete Migration
├── Week 1-4: Migrate order processing (highest risk)
├── Week 5-8: Database migration
├── Week 9-10: Legacy system decommissioning
└── Week 11-12: Post-migration monitoring and optimization
```

## Phase 3: Execution

### Incremental Migration Workflow

For each migration step, follow this sequence:

```
1. Write characterization tests on legacy behavior
2. Build new implementation
3. Run in parallel (dual-write or parallel run)
4. Compare outputs and fix discrepancies
5. Route traffic to new implementation (via toggle)
6. Monitor for issues
7. Remove legacy implementation
8. Remove toggle and parallel infrastructure
```

### Strangler Fig Execution

```typescript
// Migration proxy — routes between legacy and new system
class MigrationRouter {
  constructor(
    private legacyService: LegacyOrderService,
    private newService: NewOrderService,
    private featureToggle: FeatureToggle,
    private metrics: Metrics,
  ) {}

  async getOrder(orderId: string): Promise<Order> {
    const useNew = await this.featureToggle.isEnabled('new-order-service');

    if (useNew) {
      try {
        const result = await this.newService.getOrder(orderId);
        this.metrics.increment('order.read.new');
        return result;
      } catch (error) {
        // Fallback to legacy on failure
        this.metrics.increment('order.read.new.fallback');
        return this.legacyService.getOrder(orderId);
      }
    }

    return this.legacyService.getOrder(orderId);
  }

  async createOrder(data: CreateOrderData): Promise<Order> {
    const useNew = await this.featureToggle.isEnabled('new-order-write');

    if (useNew) {
      // Dual-write: write to both, return new result
      const newResult = await this.newService.createOrder(data);
      // Async write to legacy for consistency during transition
      this.legacyService.createOrder(data).catch(err => {
        this.metrics.increment('order.write.legacy.sync-error');
        console.error('Legacy sync failed:', err);
      });
      return newResult;
    }

    return this.legacyService.createOrder(data);
  }
}
```

### Database Migration Patterns

**Dual-write with comparison:**

```typescript
class DualWriteRepository {
  constructor(
    private legacyDb: LegacyDatabase,
    private newDb: NewDatabase,
    private comparator: DataComparator,
  ) {}

  async write(entity: Entity): Promise<void> {
    // Write to primary (new) database
    await this.newDb.insert(entity);

    // Write to legacy database (async, non-blocking)
    this.legacyDb.insert(this.transformToLegacyFormat(entity))
      .catch(err => {
        // Log but don't fail — new DB is authoritative
        console.error('Legacy write failed:', err);
      });
  }

  async read(id: string): Promise<Entity> {
    const newResult = await this.newDb.findById(id);
    const legacyResult = await this.legacyDb.findById(id);

    // Compare in background
    const diff = this.comparator.compare(newResult, legacyResult);
    if (diff.hasDifferences) {
      console.warn('Data mismatch:', { id, diff });
    }

    return newResult; // New DB is authoritative
  }
}
```

### API Versioning During Migration

```typescript
// Maintain backward compatibility during migration
// Old API: GET /api/v1/orders (legacy format)
// New API: GET /api/v2/orders (new format)

app.get('/api/v1/orders', async (req, res) => {
  // Route to new service, transform response to legacy format
  const orders = await newOrderService.listOrders(req.query);
  res.json(transformToLegacyFormat(orders));
});

app.get('/api/v2/orders', async (req, res) => {
  // Route to new service, new format
  const orders = await newOrderService.listOrders(req.query);
  res.json(orders);
});

// Track which clients use which version
app.use('/api', (req, res, next) => {
  metrics.increment(`api.version.${req.path.split('/')[2]}`);
  next();
});
```

## Phase 4: Verification

### Regression Testing Strategy

```
Verification layers (inner to outer):
├── Unit tests — Verify individual function equivalence
├── Integration tests — Verify API contract compatibility
├── Contract tests — Verify service-to-service contracts
├── E2E tests — Verify user-facing behavior equivalence
├── Performance tests — Verify no regression in latency/throughput
└── Monitoring — Verify production behavior matches expectations
```

### Performance Comparison

```typescript
// Benchmark new vs legacy for critical paths
import { bench, describe } from 'vitest';

describe('Order creation performance', () => {
  bench('legacy order creation', async () => {
    await legacyService.createOrder(testData);
  });

  bench('new order creation', async () => {
    await newService.createOrder(testData);
  });
});

// Expected: new system should be equal or better
// Flag any regression > 10% for investigation
```

### Data Integrity Verification

```typescript
// Verify data migration completeness
async function verifyDataIntegrity() {
  const legacyCount = await legacyDb.count('orders');
  const newCount = await newDb.count('orders');

  if (legacyCount !== newCount) {
    throw new Error(`Count mismatch: legacy=${legacyCount}, new=${newCount}`);
  }

  // Spot-check: compare random samples
  const sampleIds = await legacyDb.randomSample('orders', 1000);
  for (const id of sampleIds) {
    const legacyRecord = await legacyDb.findById('orders', id);
    const newRecord = await newDb.findById('orders', id);
    const diff = compare(legacyRecord, newRecord);
    if (diff.hasDifferences) {
      reportMismatch(id, diff);
    }
  }

  console.log(`Data integrity verified: ${legacyCount} records match`);
}
```

### Go/No-Go Checklist

Before cutting over each migration step:

- [ ] Characterization tests pass on new system
- [ ] Parallel run shows < 0.01% discrepancy rate
- [ ] Performance benchmarks meet or exceed legacy
- [ ] Data integrity verified (count + sample comparison)
- [ ] Monitoring and alerting configured for new system
- [ ] Rollback procedure tested and documented
- [ ] On-call team trained on new system
- [ ] Feature toggle tested (on/off both work correctly)
- [ ] Stakeholders notified of cutover date

## Common Migration Scenarios

### Monolith to Microservices

**When to do it:**
- Team has grown beyond 2-pizza team size
- Modules have clear bounded contexts
- Different modules have different scaling needs
- Deployment coupling is causing delays

**When NOT to do it:**
- Small team (< 5 engineers)
- Simple domain with few modules
- Team lacks DevOps/infrastructure expertise
- Current monolith is well-structured

**Migration order:**
1. Extract the most independent module first (notifications, analytics)
2. Extract read-heavy services next (search, catalog)
3. Extract write-heavy services last (orders, payments)
4. Keep the hardest module (usually the core domain) for last

### Framework Upgrade

```
Example: Express 4 → Fastify migration

1. Set up Fastify alongside Express (both running)
2. Migrate one route at a time:
   a. Write Fastify handler
   b. Write characterization tests comparing responses
   c. Switch route via proxy/toggle
   d. Verify in production
   e. Remove Express handler
3. Migrate middleware (auth, logging, error handling)
4. Update build and deploy configuration
5. Remove Express dependency
```

### Database Migration

```
Example: PostgreSQL → PostgreSQL (schema migration)

1. New schema designed and reviewed
2. Dual-write: application writes to both old and new tables
3. Backfill: migrate existing data in batches
4. Read comparison: verify new schema returns same results
5. Switch reads: application reads from new schema
6. Stop dual-write: remove old table writes
7. Archive old tables (don't delete immediately)
```

### API Versioning

```
v1 (legacy) → v2 (new) migration:

1. Deploy v2 endpoints alongside v1
2. Internal clients migrate to v2 first
3. External clients migrate on their timeline
4. Monitor v1 usage metrics
5. When v1 usage drops below threshold:
   a. Announce deprecation date
   b. Add deprecation headers to v1 responses
   c. Set sunset date
   d. Remove v1 after sunset
```

## Anti-Patterns

### The Big Bang Rewrite

```
❌ "We'll rebuild everything from scratch in 6 months"

Reality:
- Takes 2-3x longer than estimated
- New system has new bugs the old system already fixed
- Business requirements change during the rewrite
- Team morale crashes as the rewrite drags on
- Old system still needs maintenance during the rewrite

✅ Instead: Strangler Fig — replace piece by piece while delivering value
```

### The Green Field Trap

```
❌ "Let's start fresh with the latest technology"

Reality:
- "Fresh" means losing years of bug fixes and edge case handling
- Latest technology may not be production-proven
- Team needs to learn new technology AND migrate simultaneously
- Business logic that seems simple hides deep complexity

✅ Instead: Understand why the legacy code is the way it is before changing it
```

### The Perfect Architecture Trap

```
❌ "Let's design the perfect architecture first, then migrate"

Reality:
- Perfect architecture doesn't exist
- Requirements will change before you finish designing
- Analysis paralysis delays migration indefinitely
- Over-engineered architecture creates new problems

✅ Instead: Start with a good-enough architecture and evolve it
```

### The Stealth Rewrite

```
❌ "We'll call it a refactor but actually rewrite everything"

Reality:
- Stakeholders don't understand the scope or risk
- No proper planning, testing, or rollback procedures
- Team underestimates complexity because "it's just a refactor"

✅ Instead: Be honest about the scope. Get proper planning and resources.
```

## Tooling for Modernization

### Migration Tracking

```yaml
# migration-tracker.yml
migrations:
  - id: auth-service
    status: completed
    started: 2026-01-15
    completed: 2026-02-28
    legacy_removed: 2026-03-15
    toggle: new-auth-service

  - id: order-service
    status: in-progress
    started: 2026-03-01
    phase: parallel-run  # assessment | building | parallel-run | cutover | cleanup
    toggle: new-order-service
    risk_level: high
    rollback_tested: true

  - id: inventory-service
    status: planned
    planned_start: 2026-05-01
    dependencies: [order-service]
```

### Automated Comparison

```typescript
// Traffic replay for comparing old vs new
class TrafficReplayer {
  async replayAndCompare(request: RecordedRequest) {
    const [legacyResponse, newResponse] = await Promise.all([
      this.sendToLegacy(request),
      this.sendToNew(request),
    ]);

    const comparison = {
      statusCodeMatch: legacyResponse.status === newResponse.status,
      bodyMatch: this.deepEqual(legacyResponse.body, newResponse.body),
      latencyDiff: newResponse.latency - legacyResponse.latency,
      headerDiff: this.compareHeaders(legacyResponse.headers, newResponse.headers),
    };

    if (!comparison.statusCodeMatch || !comparison.bodyMatch) {
      await this.reportMismatch(request, comparison);
    }

    return comparison;
  }
}
```

## Related Skills

- `csp-tech-debt-assessment` — Identify and quantify legacy debt before migration
- `csp-refactoring-strategies` — Specific refactoring patterns used during migration
- `csp-code-simplification` — Clean up code before and during migration
- `csp-verification` — Verify migration correctness
- `csp-ship` — Deploy migration steps safely to production
