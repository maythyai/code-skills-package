---
name: csp-refactoring-strategies
description: >
  Large-scale refactoring strategies including Strangler Fig, Branch by Abstraction,
  Parallel Run, Feature Toggle migration, and classic refactoring patterns. Covers safety
  practices, characterization tests, code smell taxonomy, and incremental migration techniques.
  Use when planning or executing significant refactoring across a codebase.
metadata:
  origin: CSP
---

# Refactoring Strategies

Systematic approaches to large-scale refactoring that reduce risk, preserve behavior, and enable incremental delivery. Covers strategic patterns for legacy replacement, tactical patterns for code improvement, and the safety infrastructure required to refactor with confidence.

## When to Activate

- Planning a major refactoring effort across multiple modules or services
- Replacing a legacy system incrementally without a big-bang rewrite
- Introducing abstractions to decouple tightly-bound components
- Migrating from one implementation to another with zero-downtime requirements
- Cleaning up accumulated code smells across a codebase
- Preparing a codebase for new features by reducing structural friction
- During code review when structural improvements are needed

**When NOT to activate:**
- Simple bug fixes or small local cleanups (use `csp-code-simplification` instead)
- Greenfield projects with no existing code
- Performance optimization (use profiling-driven approaches instead)
- When the team lacks test coverage infrastructure to verify refactoring safety

## Core Principles

### 1. Characterize Before You Change

Never refactor code you cannot verify. Before touching any code:

```
1. Write characterization tests that capture CURRENT behavior (even if it seems wrong)
2. Run tests to establish a green baseline
3. Refactor in small, verified steps
4. Run tests after EACH step
5. If tests fail, revert the last step — do not push through
```

Characterization tests document what the code DOES, not what it SHOULD do. They are your safety net.

### 2. Small Steps, Continuous Integration

- Each refactoring step should be small enough to review in under 10 minutes
- Commit after each successful step with a descriptive message
- Never combine refactoring with feature changes in the same commit
- CI must be green before and after every refactoring step

### 3. Separate Concerns

- Refactoring changes go in separate commits from feature changes
- Refactoring PRs should be reviewed independently from feature PRs
- Never refactor code you are about to delete

## Strategic Refactoring Patterns

### Strangler Fig Pattern

Incrementally replace a legacy system piece by piece. Named after the fig tree that grows around a host tree and eventually replaces it.

```
                    ┌─────────────────┐
                    │   Router/Proxy  │
                    └────┬────────┬───┘
                         │        │
              ┌──────────▼──┐  ┌──▼──────────┐
              │   Legacy     │  │    New       │
              │   System     │  │    System    │
              │   (shrinking)│  │   (growing)  │
              └─────────────┘  └──────────────┘
```

**Implementation steps:**

1. **Place a proxy/router** in front of the legacy system
2. **Identify a bounded slice** of functionality to extract first
3. **Build the new implementation** of that slice
4. **Route traffic** for that slice to the new system
5. **Verify** the new system handles the slice correctly
6. **Remove** the slice from the legacy system
7. **Repeat** until the legacy system is empty, then decommission it

**When to use:**
- Legacy monolith that must remain operational during migration
- Team cannot afford a big-bang rewrite
- System has clear functional boundaries that can be extracted independently

**Example — Extracting user authentication from a monolith:**

```typescript
// Step 1: Proxy routes all auth traffic to legacy
app.use('/auth/*', legacyAuthProxy);

// Step 2: Build new auth service
// new-auth-service/src/index.ts
export class AuthService {
  async login(credentials: Credentials): Promise<Session> { /* ... */ }
  async logout(sessionId: string): Promise<void> { /* ... */ }
  async validate(token: string): Promise<User> { /* ... */ }
}

// Step 3: Route login to new service, keep rest on legacy
app.use('/auth/login', newAuthHandler);
app.use('/auth/*', legacyAuthProxy); // everything else still legacy

// Step 4: Gradually migrate remaining endpoints
app.use('/auth/logout', newAuthHandler);
app.use('/auth/validate', newAuthHandler);
// Eventually: remove legacyAuthProxy entirely
```

**Risks and mitigations:**

| Risk | Mitigation |
|------|-----------|
| Proxy becomes a bottleneck | Keep proxy logic minimal; no business logic |
| Data inconsistency between old and new | Use shared database or sync mechanism during transition |
| Partial migration state | Feature toggles to route per-user or per-request |
| Legacy system has hidden dependencies | Map all dependencies before extracting each slice |

### Branch by Abstraction

Introduce an abstraction layer between consumers and an implementation, then swap the implementation behind the abstraction.

```
Before:                         After:
┌──────────┐                   ┌──────────┐
│ Consumer │                   │ Consumer │
└────┬─────┘                   └────┬─────┘
     │ direct                       │ abstraction
     │ dependency                   │
┌────▼─────┐                   ┌────▼──────────┐
│  Old     │                   │  Abstraction   │
│  Impl    │                   │  (interface)   │
└──────────┘                   └────┬───────┬───┘
                                    │       │
                               ┌────▼──┐ ┌──▼────┐
                               │  Old  │ │  New  │
                               │  Impl │ │  Impl │
                               └───────┘ └───────┘
```

**Implementation steps:**

1. **Identify the seam** — find the boundary where the old implementation is consumed
2. **Extract an interface** — define the abstraction that consumers will depend on
3. **Make the old implementation conform** to the interface
4. **Redirect consumers** to depend on the abstraction (not the concrete class)
5. **Build the new implementation** behind the same interface
6. **Swap** the implementation via dependency injection or factory
7. **Remove** the old implementation and the abstraction if no longer needed

**Example — Replacing a payment gateway:**

```python
# Step 1: Extract interface
from abc import ABC, abstractmethod

class PaymentGateway(ABC):
    @abstractmethod
    def charge(self, amount: Decimal, currency: str, customer_id: str) -> ChargeResult:
        pass

    @abstractmethod
    def refund(self, charge_id: str) -> RefundResult:
        pass

# Step 2: Wrap old implementation
class LegacyStripeGateway(PaymentGateway):
    def __init__(self, legacy_client: LegacyStripeClient):
        self._client = legacy_client

    def charge(self, amount, currency, customer_id):
        # Adapt old API to new interface
        result = self._client.create_charge(
            amount_cents=int(amount * 100),
            currency_code=currency,
            customer=customer_id
        )
        return ChargeResult(id=result.charge_id, status=result.status)

    def refund(self, charge_id):
        result = self._client.create_refund(charge_id)
        return RefundResult(id=result.refund_id, status=result.status)

# Step 3: Build new implementation
class ModernStripeGateway(PaymentGateway):
    def __init__(self, api_key: str):
        self._stripe = stripe.StripeClient(api_key)

    def charge(self, amount, currency, customer_id):
        payment = self._stripe.payments.create(
            amount=amount, currency=currency, customer=customer_id
        )
        return ChargeResult(id=payment.id, status=payment.status)

    def refund(self, charge_id):
        refund = self._stripe.refunds.create(payment_intent=charge_id)
        return RefundResult(id=refund.id, status=refund.status)

# Step 4: Swap via configuration
def create_payment_gateway(config: AppConfig) -> PaymentGateway:
    if config.use_modern_stripe:
        return ModernStripeGateway(config.stripe_api_key)
    return LegacyStripeGateway(LegacyStripeClient(config.legacy_config))
```

### Parallel Run

Run old and new systems simultaneously, comparing outputs to verify correctness before fully switching.

```
                    ┌──────────┐
         ┌─────────►│  Old     │──────────┐
         │          │  System  │          │
Input ───┤          └──────────┘          ├──► Compare ──► Log diffs
         │          ┌──────────┐          │
         └─────────►│  New     │──────────┘
                    │  System  │
                    └──────────┘
```

**Implementation steps:**

1. **Duplicate input** to both old and new systems
2. **Collect outputs** from both
3. **Compare outputs** using an equivalence function
4. **Log differences** for analysis
5. **Run in parallel** until diff rate is acceptably low
6. **Switch** to new system as the authoritative source
7. **Remove** old system

**Example — Parallel run for a pricing engine:**

```typescript
class PricingRouter {
  constructor(
    private legacyEngine: LegacyPricingEngine,
    private newEngine: NewPricingEngine,
    private comparator: PriceComparator,
    private metrics: MetricsCollector,
  ) {}

  async calculatePrice(request: PricingRequest): Promise<PricingResult> {
    // Always use legacy as authoritative during parallel run
    const legacyResult = await this.legacyEngine.calculate(request);

    // Run new engine in parallel (fire-and-forget comparison)
    this.newEngine.calculate(request)
      .then(newResult => {
        const diff = this.comparator.compare(legacyResult, newResult);
        if (diff.hasDifferences) {
          this.metrics.increment('pricing.parallel.diff');
          this.logDiff(request, diff);
        } else {
          this.metrics.increment('pricing.parallel.match');
        }
      })
      .catch(err => {
        this.metrics.increment('pricing.parallel.error');
        this.logError(request, err);
      });

    // Return legacy result — it's still authoritative
    return legacyResult;
  }
}
```

**Key considerations:**
- The old system's output is authoritative until you fully switch
- Parallel runs add latency and cost — use for critical paths only
- Define an acceptable diff rate before starting (e.g., < 0.01%)
- Differences may reveal bugs in EITHER system — investigate both sides

### Feature Toggle Migration

Use feature flags to gradually roll out a new implementation to a subset of users.

```typescript
interface FeatureToggleConfig {
  newCheckoutEnabled: boolean;
  newCheckoutRolloutPercentage: number;
  newCheckoutAllowedUsers: string[];
}

class CheckoutRouter {
  async handleCheckout(request: CheckoutRequest): Promise<CheckoutResult> {
    const toggle = await this.featureToggles.get('new-checkout');

    if (this.shouldUseNewCheckout(request.user, toggle)) {
      return this.newCheckoutService.process(request);
    }
    return this.legacyCheckoutService.process(request);
  }

  private shouldUseNewCheckout(user: User, toggle: FeatureToggle): boolean {
    // Stage 1: Internal testing
    if (toggle.allowedUsers.includes(user.id)) return true;

    // Stage 2: Percentage rollout
    if (toggle.rolloutPercentage > 0) {
      const userBucket = hash(user.id) % 100;
      return userBucket < toggle.rolloutPercentage;
    }

    // Stage 3: Full rollout
    return toggle.enabled;
  }
}
```

**Rollout stages:**

| Stage | Audience | Purpose |
|-------|----------|---------|
| Internal | Team members only | Smoke test in production |
| Canary | 1-5% of users | Detect obvious issues |
| Gradual | 5% → 25% → 50% → 100% | Progressive confidence |
| Full | All users | Complete migration |
| Cleanup | N/A | Remove toggle and legacy code |

**Critical rule:** Always have a cleanup plan. Feature toggles that persist become technical debt. Set a removal date when creating each toggle.

## Tactical Refactoring Patterns

### Extract Method / Function

Extract a block of code into a named function when:
- The block has a clear, describable purpose
- The block is deeply nested (3+ levels)
- The block is duplicated
- Naming the block improves readability

```typescript
// Before: 40-line function with mixed concerns
async function processOrder(order: Order): Promise<void> {
  // ... 10 lines of validation ...
  // ... 15 lines of inventory check ...
  // ... 15 lines of payment processing ...
}

// After: Clear intent revealed through extraction
async function processOrder(order: Order): Promise<void> {
  validateOrder(order);
  await reserveInventory(order.items);
  await processPayment(order.payment);
}
```

### Extract Class / Module

Extract when a class or module has multiple reasons to change:

```python
# Before: God class
class UserManager:
    def create_user(self, data): ...
    def send_welcome_email(self, user): ...
    def generate_report(self, users): ...
    def export_to_csv(self, users): ...

# After: Single responsibility
class UserRepository:
    def create(self, data): ...

class UserEmailService:
    def send_welcome(self, user): ...

class UserReportGenerator:
    def generate(self, users): ...
    def export_csv(self, users): ...
```

### Replace Conditional with Polymorphism

Replace complex switch/if-else chains with polymorphic dispatch:

```typescript
// Before: Conditional sprawl
function calculateShipping(order: Order): number {
  switch (order.shippingMethod) {
    case 'standard':
      return order.weight * 0.5 + 5.0;
    case 'express':
      return order.weight * 0.8 + 15.0;
    case 'overnight':
      return order.weight * 1.2 + 25.0;
    default:
      throw new Error(`Unknown method: ${order.shippingMethod}`);
  }
}

// After: Polymorphic
interface ShippingCalculator {
  calculate(order: Order): number;
}

class StandardShipping implements ShippingCalculator {
  calculate(order: Order): number {
    return order.weight * 0.5 + 5.0;
  }
}

class ExpressShipping implements ShippingCalculator {
  calculate(order: Order): number {
    return order.weight * 0.8 + 15.0;
  }
}

class OvernightShipping implements ShippingCalculator {
  calculate(order: Order): number {
    return order.weight * 1.2 + 25.0;
  }
}

// Registry for lookup
const shippingCalculators: Record<string, ShippingCalculator> = {
  standard: new StandardShipping(),
  express: new ExpressShipping(),
  overnight: new OvernightShipping(),
};

function calculateShipping(order: Order): number {
  const calculator = shippingCalculators[order.shippingMethod];
  if (!calculator) throw new Error(`Unknown method: ${order.shippingMethod}`);
  return calculator.calculate(order);
}
```

### Introduce Parameter Object

Replace long parameter lists with a structured object:

```typescript
// Before: Parameter list sprawl
function searchUsers(
  name: string,
  email: string,
  minAge: number,
  maxAge: number,
  sortBy: string,
  sortOrder: string,
  page: number,
  pageSize: number
): User[] { /* ... */ }

// After: Parameter object
interface UserSearchCriteria {
  name?: string;
  email?: string;
  ageRange?: { min: number; max: number };
}

interface SearchPagination {
  page: number;
  pageSize: number;
  sortBy: keyof User;
  sortOrder: 'asc' | 'desc';
}

function searchUsers(
  criteria: UserSearchCriteria,
  pagination: SearchPagination
): User[] { /* ... */ }
```

### Move Field / Move Method

Move data and behavior to the class that uses it most:

```python
# Before: Misplaced responsibility
class Order:
    def __init__(self, customer, items):
        self.customer = customer
        self.items = items

    def calculate_customer_discount(self):
        # This logic belongs on Customer, not Order
        if self.customer.loyalty_tier == 'gold':
            return 0.10
        elif self.customer.loyalty_tier == 'platinum':
            return 0.20
        return 0.0

# After: Method moved to where it belongs
class Customer:
    def __init__(self, loyalty_tier):
        self.loyalty_tier = loyalty_tier

    @property
    def discount_rate(self) -> float:
        rates = {'gold': 0.10, 'platinum': 0.20}
        return rates.get(self.loyalty_tier, 0.0)

class Order:
    def __init__(self, customer, items):
        self.customer = customer
        self.items = items

    @property
    def discount(self) -> float:
        return self.customer.discount_rate
```

## Code Smell Taxonomy

### Bloaters

| Smell | Description | Refactoring |
|-------|-------------|-------------|
| Long Method | Method does too many things | Extract Method |
| Large Class | Class has too many responsibilities | Extract Class |
| Primitive Obsession | Using primitives instead of domain types | Replace Primitive with Value Object |
| Long Parameter List | Too many parameters | Introduce Parameter Object |
| Data Clumps | Same group of variables appearing together | Extract Class |

### Object-Orientation Abusers

| Smell | Description | Refactoring |
|-------|-------------|-------------|
| Switch/Conditional | Type-code switching | Replace with Polymorphism |
| Temporary Field | Field only used in some contexts | Extract Class |
| Refused Bequest | Subclass ignores parent methods | Replace Inheritance with Delegation |
| Alternative Classes with Different Interfaces | Similar classes, different APIs | Extract Superclass |

### Change Preventers

| Smell | Description | Refactoring |
|-------|-------------|-------------|
| Divergent Change | One class changes for many reasons | Extract Class per reason |
| Shotgun Surgery | One change requires many small edits | Move to single class |
| Parallel Inheritance | Two hierarchies that must change together | Merge or use delegation |

### Dispensables

| Smell | Description | Refactoring |
|-------|-------------|-------------|
| Dead Code | Code that is never executed | Remove |
| Duplicate Code | Same logic in multiple places | Extract shared function |
| Speculative Generality | Unused abstractions "for the future" | Remove (YAGNI) |
| Middle Man | Class that only delegates | Inline / Remove |

## Safety Infrastructure

### Characterization Test Workflow

```bash
# 1. Identify the code to refactor
# 2. Write tests that assert CURRENT behavior (even bugs)
# 3. Use golden master / snapshot testing for complex outputs

# Example: Characterization test for a legacy pricing function
describe('LegacyPricingEngine (characterization)', () => {
  it('calculates price for standard order', () => {
    const engine = new LegacyPricingEngine();
    const result = engine.calculate({
      items: [{ sku: 'A', qty: 2, price: 10.00 }],
      region: 'US',
      coupon: null,
    });
    // Assert exact current output — even if the number seems wrong
    expect(result).toMatchSnapshot();
  });

  it('handles edge case: empty cart', () => {
    const engine = new LegacyPricingEngine();
    const result = engine.calculate({ items: [], region: 'US', coupon: null });
    expect(result).toMatchSnapshot();
  });

  it('handles edge case: negative quantity (current behavior)', () => {
    const engine = new LegacyPricingEngine();
    // Current behavior: does NOT validate, returns negative total
    const result = engine.calculate({
      items: [{ sku: 'A', qty: -1, price: 10.00 }],
      region: 'US',
      coupon: null,
    });
    expect(result.total).toBe(-10.00); // Document current behavior
  });
});
```

### Mutation Testing

After characterization tests, use mutation testing to verify test quality:

```bash
npx stryker run                    # JavaScript/TypeScript
pip install mutmut && mutmut run   # Python
```

If mutation score is below 80%, add more characterization tests before refactoring.

### Refactoring Commit Discipline

```
# Good: Small, focused, descriptive
git commit -m "refactor: extract validateOrder from processOrder"
git commit -m "refactor: move shipping calculation to ShippingCalculator"
git commit -m "refactor: replace conditional with polymorphism in discount logic"

# Bad: Large, vague, mixed with features
git commit -m "refactored everything and added new search feature"
```

## Refactoring Readiness Checklist

Before starting any large-scale refactoring:

- [ ] Characterization tests exist for the code being refactored
- [ ] CI pipeline is green and runs in under 10 minutes
- [ ] Team agrees on the refactoring scope and approach
- [ ] No concurrent feature branches that will conflict
- [ ] Rollback plan is documented
- [ ] Feature toggles are in place for gradual rollout (if applicable)
- [ ] Monitoring and alerting are configured to detect regressions
- [ ] Definition of done includes "all tests pass without modification"

## Related Skills

- `csp-tech-debt-assessment` — Identify and prioritize what to refactor
- `csp-legacy-modernization` — End-to-end modernization workflow
- `csp-code-simplification` — Local simplification and dead code removal
- `csp-code-review` — Review refactored code for quality
- `csp-tdd` — Test-driven development for safe refactoring
