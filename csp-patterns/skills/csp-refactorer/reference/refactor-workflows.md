# Refactor Workflows

Detailed planning templates, code smell catalog, design patterns, and the safe
refactoring process. Load this file when performing multi-file refactors or when
you need specific smell-to-fix guidance.

---

## Multi-File Refactor Plan Template

Use this template when a refactor touches more than one file. Output the plan,
stop, and ask for confirmation before editing code.

```markdown
## Refactor Plan: [title]

### Current State
[Brief description of how things work now]

### Target State
[Brief description of how things will work after]

### Affected Files
| File | Change Type | Dependencies |
|------|-------------|--------------|
| path/to/file | modify / create / delete | blocks X, blocked by Y |

### Execution Plan

#### Phase 1: Types and Interfaces
- [ ] Step 1.1: [action] in `file.ts`
- [ ] Verify: [how to check it worked]

#### Phase 2: Implementation
- [ ] Step 2.1: [action] in `file.ts`
- [ ] Verify: [how to check]

#### Phase 3: Callers
- [ ] Step 3.1: Update callers of the changed interface
- [ ] Verify: Run `npm test` / `cargo test` / equivalent

#### Phase 4: Tests and Cleanup
- [ ] Update or add tests for new structure
- [ ] Remove deprecated code
- [ ] Update documentation

### Rollback Plan
If something fails:
1. [Step to undo the riskiest change]
2. [Step to restore callers]

### Risks
- [Potential issue and its mitigation]
```

### Planning Rules

- Do not edit files while preparing the plan.
- Prefer contracts and types first, then implementations, then callers, then
  tests, then cleanup.
- Include verification steps between every phase and a final validation command.
- Include rollback steps for the riskiest phases.
- If the user already asked to implement, still produce the plan first and wait
  for confirmation unless they explicitly said to proceed without review.

---

## Code Smell Catalog

### Long Method

Symptom: a function exceeds ~50 lines or does more than one thing.

Fix: extract each logical block into a named helper. The original function
becomes a high-level orchestrator that reads like a table of contents.

```typescript
// Before
async function processOrder(orderId: string) {
  // 50 lines: fetch order
  // 30 lines: validate order
  // 40 lines: calculate pricing
  // 30 lines: update inventory
  // 20 lines: create shipment
  // 30 lines: send notifications
}

// After
async function processOrder(orderId: string) {
  const order = await fetchOrder(orderId);
  validateOrder(order);
  const pricing = calculatePricing(order);
  await updateInventory(order);
  const shipment = await createShipment(order);
  await sendNotifications(order, pricing, shipment);
  return { order, pricing, shipment };
}
```

### Duplicated Code

Symptom: the same logic appears in two or more places.

Fix: extract the shared logic into a single function or module. Callers pass
only the data that differs.

### God Class / Large Module

Symptom: a single class or module owns unrelated responsibilities.

Fix: split by responsibility. Each new class or module does one thing well.
Example: `UserManager` (50+ methods) becomes `UserService`, `EmailService`,
`ReportService`, `PaymentService`.

### Long Parameter List

Symptom: a function takes more than 3-4 parameters.

Fix: group related parameters into a typed object. For complex construction,
consider a builder pattern.

```typescript
// Before
function createUser(email, password, name, age, address, city, country, phone) {}

// After
interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  address?: Address;
  phone?: string;
}
function createUser(input: CreateUserInput) {}
```

### Feature Envy

Symptom: a method uses another object's data more than its own.

Fix: move the logic to the object that owns the data. The original method
delegates.

### Primitive Obsession

Symptom: domain concepts represented as raw strings or numbers.

Fix: introduce value objects (Email, PhoneNumber, Money) that carry validation
and behavior.

### Magic Numbers / Strings

Symptom: unexplained literals in logic.

Fix: replace with named constants that document intent.

```typescript
// Before
setTimeout(callback, 86400000);

// After
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
setTimeout(callback, ONE_DAY_MS);
```

### Nested Conditionals (Arrow Code)

Symptom: deeply nested if/else blocks.

Fix: replace with guard clauses and early returns. See
`complexity-reduction.md` for detailed techniques.

```typescript
// Before
function process(order) {
  if (order) {
    if (order.user) {
      if (order.user.isActive) {
        if (order.total > 0) {
          return processOrder(order);
        }
      }
    }
  }
}

// After
function process(order) {
  if (!order) return { error: 'No order' };
  if (!order.user) return { error: 'No user' };
  if (!order.user.isActive) return { error: 'User inactive' };
  if (order.total <= 0) return { error: 'Invalid total' };
  return processOrder(order);
}
```

### Dead Code

Symptom: unused functions, unreachable branches, commented-out code.

Fix: delete it. Git history preserves it if ever needed.

### Inappropriate Intimacy

Symptom: one class reaches deep into another's internals.

Fix: add an accessor method on the owning class. "Ask, don't tell."

---

## Design Patterns for Refactoring

### Strategy Pattern

Replace long if/else or switch chains with interchangeable strategy objects.

```typescript
interface ShippingStrategy {
  calculate(order: Order): number;
}

class StandardShipping implements ShippingStrategy {
  calculate(order: Order) { return order.total > 50 ? 0 : 5.99; }
}

class ExpressShipping implements ShippingStrategy {
  calculate(order: Order) { return order.total > 100 ? 9.99 : 14.99; }
}

function calculateShipping(order: Order, strategy: ShippingStrategy) {
  return strategy.calculate(order);
}
```

### Chain of Responsibility

Replace monolithic validation or processing functions with a chain of
single-responsibility handlers.

```typescript
abstract class Validator {
  private next?: Validator;
  setNext(v: Validator) { this.next = v; return v; }
  validate(user: User): string | null {
    const error = this.doValidate(user);
    if (error) return error;
    return this.next?.validate(user) ?? null;
  }
  protected abstract doValidate(user: User): string | null;
}
```

Use when: validation or processing steps are independent, reorderable, or
frequently added/removed.

---

## Safe Refactoring Process

```
1. PREPARE
   - Ensure tests exist (write them if missing)
   - Commit current state
   - Create a feature branch

2. IDENTIFY
   - Name the specific code smell to address
   - Understand what the code does today
   - Plan the target structure

3. REFACTOR (small steps)
   - Make one small change
   - Run tests
   - Commit if tests pass
   - Repeat

4. VERIFY
   - All tests pass
   - Performance unchanged or improved
   - No new lint warnings

5. CLEAN UP
   - Update comments that reference old structure
   - Update documentation
   - Final commit with a descriptive message
```

---

## Refactoring Checklist

### Code Quality
- [ ] Functions are small (< 50 lines)
- [ ] Functions do one thing
- [ ] No duplicated code
- [ ] Descriptive names for variables, functions, and classes
- [ ] No magic numbers or strings
- [ ] Dead code removed

### Structure
- [ ] Related code is grouped together
- [ ] Clear module boundaries
- [ ] Dependencies flow in one direction
- [ ] No circular dependencies

### Type Safety
- [ ] Types defined for all public APIs
- [ ] No unjustified `any` types
- [ ] Nullable types explicitly marked

### Testing
- [ ] Refactored code is covered by tests
- [ ] Edge cases are tested
- [ ] All tests pass with `failed=0` confirmed in output

---

| Replace Inheritance with Delegation | Inheritance tree too deep or inflexible |
