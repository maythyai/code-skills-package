# Cognitive Complexity Reduction

Techniques for analyzing and reducing cognitive complexity in methods. Load this
file when tackling deeply nested logic, high-complexity methods, or when you
need systematic extraction strategies.

---

## What Cognitive Complexity Measures

Cognitive complexity scores how hard code is for a human to understand. It
increases with:

- **Nesting depth.** Each level of if/for/while/try nesting adds to the score.
- **Structural breaks.** Every if, else if, else, switch case, ternary, catch,
  and loop increments the counter.
- **Nesting multiplier.** Breaks inside nesting get an additional penalty equal
  to their depth.

Boolean operators (`&&`, `||`) typically add +1 each but do not multiply by
nesting depth.

### Scoring Example

```typescript
function process(items: Item[]) {
  for (const item of items) {            // +1 (loop)
    if (item.isActive) {                 // +2 (if, nesting=1)
      if (item.priority > 5) {           // +3 (if, nesting=2)
        if (item.assigned) {             // +4 (if, nesting=3)
          handle(item);
        } else {                         // +1 (else, nesting=3, no multiplier)
          queue(item);
        }
      }
    } else {                             // +1 (else)
      skip(item);
    }
  }
  // Total: 1 + 2 + 3 + 4 + 1 + 1 = 12
}
```

Flattening this with guard clauses and extraction drops the score dramatically.

---

## Analysis Process

Before refactoring, inspect the target method systematically:

1. **Identify nesting hotspots.** Count the deepest nesting level. Any block
   nested 3+ levels deep is a primary target.
2. **Catalog structural breaks.** List every if, else, switch, loop, catch, and
   ternary. Count them.
3. **Find repeated patterns.** Look for duplicated validation, type-specific
   handling, or transformation blocks that appear more than once.
4. **Spot extraction candidates.** Any block of 5+ lines that does one thing
   (validate, transform, format, dispatch) is a candidate for a helper method.

---

## Reduction Techniques

### 1. Guard Clauses and Early Returns

Replace nested if/else pyramids with flat, sequential guards. This is the
single highest-impact technique for most codebases.

```typescript
// Before: complexity 12
function process(item: Item | null) {
  if (item) {
    if (item.isActive) {
      if (item.priority > 5) {
        return handle(item);
      } else {
        return queue(item);
      }
    } else {
      return skip(item);
    }
  }
  return null;
}

// After: complexity 3
function process(item: Item | null) {
  if (!item) return null;
  if (!item.isActive) return skip(item);
  if (item.priority <= 5) return queue(item);
  return handle(item);
}
```

Each guard handles one invalid or special case and exits immediately. The happy
path falls through to the end with no nesting.

### 2. Extract Validation into Dedicated Methods

Pull all precondition checks into a `validate` function. The main method
assumes valid input.

```typescript
// Before: validation mixed with logic
function processOrder(order: Order) {
  if (!order) throw new Error('No order');
  if (!order.items.length) throw new Error('Empty order');
  if (order.total < 0) throw new Error('Negative total');
  if (!order.user) throw new Error('No user');
  if (!order.user.isActive) throw new Error('Inactive user');
  // ... 40 lines of processing
}

// After
function validateOrder(order: Order): void {
  if (!order) throw new Error('No order');
  if (!order.items.length) throw new Error('Empty order');
  if (order.total < 0) throw new Error('Negative total');
  if (!order.user) throw new Error('No user');
  if (!order.user.isActive) throw new Error('Inactive user');
}

function processOrder(order: Order) {
  validateOrder(order);
  // ... 40 lines of processing, no nesting
}
```

### 3. Extract Type-Specific or Case-Specific Handlers

Replace switch/if-else chains over a type code with dedicated handler methods.

```typescript
// Before: one big switch
function calculatePrice(item: Item): number {
  switch (item.type) {
    case 'standard': return item.base * 1.0;
    case 'premium': return item.base * 1.5 + calculatePremiumSurcharge(item);
    case 'bulk':
      if (item.quantity > 100) return item.base * 0.8;
      if (item.quantity > 50) return item.base * 0.9;
      return item.base * 0.95;
    default: throw new Error(`Unknown type: ${item.type}`);
  }
}

// After: each case is a named method
function calculatePrice(item: Item): number {
  const calculators: Record<string, (item: Item) => number> = {
    standard: calcStandard,
    premium: calcPremium,
    bulk: calcBulk,
  };
  const calc = calculators[item.type];
  if (!calc) throw new Error(`Unknown type: ${item.type}`);
  return calc(item);
}
```

### 4. Decompose Complex Boolean Expressions

Extract compound conditions into named variables or predicate functions.

```typescript
// Before
if (user.isActive && user.membership !== 'free' &&
    (user.accountAge > 365 || user.referralCount > 10)) {
  grantBonus(user);
}

// After
const isPaidMember = user.isActive && user.membership !== 'free';
const isEstablished = user.accountAge > 365 || user.referralCount > 10;

if (isPaidMember && isEstablished) {
  grantBonus(user);
}

// Or as a reusable predicate
function isEligibleForBonus(user: User): boolean {
  return isPaidMember(user) && isEstablished(user);
}
```

### 5. Flatten Nested Loops with Extracted Methods

When loops contain conditionals, extract the inner logic into a handler.

```typescript
// Before: nested loop + conditionals
function processMatrix(matrix: number[][]) {
  for (const row of matrix) {
    for (const cell of row) {
      if (cell > 0) {
        if (cell % 2 === 0) handleEvenPositive(cell);
        else handleOddPositive(cell);
      }
    }
  }
}

// After: extracted inner handler
function processMatrix(matrix: number[][]) {
  for (const row of matrix) {
    row.forEach(processCell);
  }
}

function processCell(cell: number) {
  if (cell <= 0) return;
  if (cell % 2 === 0) return handleEvenPositive(cell);
  handleOddPositive(cell);
}
```

### 6. Replace Nested Tries with Sequential Operations

```typescript
// Before: nested try/catch
function process() {
  try {
    const data = parse(input);
    try {
      const result = transform(data);
      try { save(result); } catch (e) { /* save error */ }
    } catch (e) { /* transform error */ }
  } catch (e) { /* parse error */ }
}

// After: sequential with early returns
function process() {
  const data = tryParse(input);
  if (!data) return;
  const result = tryTransform(data);
  if (!result) return;
  trySave(result);
}
```

---

## Helper Method Design Guidelines

When extracting helper methods, follow these rules to keep the result clean:

1. **Single responsibility.** Each helper does exactly one thing. If you need
   "and" to describe it, split further.
2. **Descriptive names.** The name should describe what the method does at a
   glance: `validateEmailFormat`, `calculateBulkDiscount`, `formatUserReport`.
3. **Static when possible.** If the helper does not access instance state, make
   it static. This signals no side effects and simplifies testing.
4. **Minimal parameters.** Pass only what the helper needs. If it needs more
   than 3 parameters, consider a parameter object.
5. **Guard clauses first.** Start each helper with early returns for invalid
   input, then proceed with the happy path.
6. **Keep helpers close.** Place extracted methods near the method that calls
   them, grouped logically.
7. **Preserve error semantics.** Keep the same exception types, error messages,
   and return types as the original code.

---

## Extraction Decision Framework

Use this checklist to decide what to extract:

| Signal | Extract As |
|--------|-----------|
| Block of 5+ lines doing one thing | Named helper method |
| Validation checks at method start | `validate*` method |
| Type-specific switch/if chain | Strategy map or polymorphism |
| Complex boolean expression | Named variable or predicate function |
| Nested loop with inner logic | Inner-loop handler method |
| Repeated code in 2+ places | Shared utility function |
| Deeply nested try/catch | Sequential try-or-return operations |

---

## Validation Protocol

After every complexity reduction refactor, complete this protocol:

### Step 1: Compile Check

Ensure the code compiles with no new errors. In typed languages, verify that
type inference still works and no implicit `any` was introduced.

### Step 2: Test Verification

Run all tests related to the refactored method and its surrounding
functionality. **Mandatory: read the actual test output.** Confirm the summary
shows `failed=0`. Never assume tests passed based on exit code alone.

If any test fails, state how many failed, analyze each failure to identify
what broke (common causes: null handling, empty collections, condition logic
errors during flattening), fix the regression, re-run, and re-verify.

### Step 3: Complexity Measurement

Re-measure cognitive complexity and confirm it meets the target threshold. If
not, identify remaining hotspots and apply another reduction pass.

### Step 4: Behavior Confirmation

Walk through the refactored code with representative inputs: happy path, empty
or null input, and invalid input that triggers each guard clause. Verify output
matches the original behavior for each case.

---

## Common Pitfalls

- **Over-extraction.** Creating a helper for a single line of code adds
  indirection without clarity. Only extract when the name adds information or
  the block has multiple lines.
- **Lost context.** Extracted methods that need 5+ parameters may indicate the
  extraction boundary is wrong. Try a different split.
- **Changed error types.** Accidentally replacing a specific exception with a
  generic one breaks callers that catch by type. Preserve all exception types.
- **Altered evaluation order.** Guard clauses execute top-to-bottom. Make sure
  the order of checks does not change which error is thrown first.
- **Forgotten else branches.** When converting nested if/else to guard clauses,
  verify that every original else path is covered by an early return.