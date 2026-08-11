# Reference: Defect-Mining Method Templates

Per-method how-to for `csp-defect-mining`. Each entry: what it does, when to
reach for it, the concrete recipe (command / generator / template), and the bug
class it uniquely surfaces.

---

## Layer 1 — Basic (establishes baseline; plateaus fast)

### Unit tests
- **Recipe**: one test file per module; happy path + explicit edges. TDD if greenfield.
- **Plateau signal**: 2 consecutive rounds find 0 new bugs → descend to Layer 2.

### Boundary-value analysis (BVA)
- **Recipe**: for every comparison operator (`>`, `>=`, `<`, `<=`), test N-1, N, N+1.
  E.g. `if discount > 0.05` → test 0.049, 0.05, 0.051.
- **Finds**: off-by-one at thresholds the developer named.

### Equivalence classes
- **Recipe**: partition input space; one representative per class + one invalid-class test.
- **Finds**: reduces unit sprawl; catches the obvious invalid-input class.

---

## Layer 2 — Structural (measures test QUALITY, not coverage)

### Mutation testing
- **What**: mutate the source one operator at a time; if NO test fails, the test
  suite has a blind spot at that line. Surviving (non-equivalent) mutants = real
  blind spots.
- **Manual recipe (no tooling)**: pick 5 key functions. For each, create 3-5
  mutants — flip `>`↔`>=`, `+`↔`-`, drop a `!`, swap `&&`↔`||`, hardcode a
  return. Run the suite. Any mutant that survives = a missing assertion.
- **Tools**: `stryker` (JS/TS), `mutmut` (Python), `cargo-mutants` (Rust),
  `stryker-net` (.NET), `mull` (C++).
- **Bug class uniquely found**: test-blind-spots. (Empirically: exposed a
  comparator-helper bug where `JSON.stringify` dropped `undefined`, making
  `{a:undefined}` equal `{}` — the TEST TOOL itself had the bug.)
- **Pitfall**: equivalent mutants (performance-equal / output-identical)
  can't be killed — triage manually, don't trust raw survival %.

### Error-path enumeration
- **What**: every silent fallback is an untested failure path. Force each to fire.
- **Recipe**:
  ```bash
  # find every silent fallback in the codebase
  grep -rnE 'catch\s*\{\s*\}|catch\s*\([^)]*\)\s*\{\s*\}|\?\?\s|\\|\\|\s*0|\?\.' src/
  ```
  For each hit, write a test that forces the fallback (bad input, missing field,
  thrown dependency) and ASSERTS the behavior — not just "doesn't crash".
- **Bug class uniquely found**: silent-zero / silent-empty bugs. (Empirically:
  `Number(x) || 0` turned "missing tariff rate" into "duty-free" and "missing
  price" into "free goods" — a financial + compliance hole in cross-border e-comm.)

### Type-tightening
- **What**: crank the type-checker to expose hidden `undefined`.
- **Recipe** (TS): `tsc --noUncheckedIndexedAccess --noErrorTruncation`. Triage
  the report for real bugs (array access that can actually be undefined); ignore
  the false positives (`db.returning()` / `.count()` always return rows).
- **Bug class uniquely found**: possible-undefined access the loose types hid.
- **Pitfall**: high false-positive rate — fix locally, don't enable globally.

---

## Layer 3 — Adversarial (developer blind spots)

### Fuzz testing
- **What**: pathological input. Targets parsers' string-literal / escape handling.
- **Generator scaffold** (JS):
  ```js
  function adversarialInputs(seed) {
    const rng = mulberry32(seed); // seeded PRNG for reproducibility
    const cases = [
      '{"a":1,"__proto__":{"admin":true}}',        // prototype pollution
      '{"a":"\\"}',                                 // embedded escape
      '{"a":"\\"' + 'x'.repeat(50000) + '\\"}',     // 50k-char unbalanced
      '{' + '"k":1,'.repeat(200) + '}',             // deep/wide nesting
    ];
    for (let i = 0; i < 200; i++) cases.push(randomJson(rng)); // randoms
    return cases;
  }
  ```
  Assert: the parser NEVER throws uncaught, NEVER returns a non-object, and
  returns the FULL array when `allowArray` (not the first inner object).
- **Bug class uniquely found**: parser short-circuits. (Empirically:
  `parseLlmJson(allowArray)` returned the first inner object, not the array —
  object-extraction short-circuited array-extraction.)
- **Key rule**: round-1 fuzz calibrates; rounds 2-3 with adjusted seeds
  (deeper nesting, embedded escapes) find the real bugs.

### Property-based testing
- **What**: seeded PRNG, assert INVARIANTS across N random inputs (not specific values).
- **Property templates**:
  - `∀ input: parse(input) never throws` (robustness)
  - `∀ input: total(reserve, confirm, release) >= 0` (non-negative invariant)
  - `∀ input: roundTrip(serialize(x)) === x` (monotonicity / round-trip)
  - `∀ input: f(x) === f(canonicalize(x))` (canonicalization)
- **Tools**: `fast-check` (JS/TS), `hypothesis` (Python), `proptest` (Rust),
  `kotest-property` (Kotlin), `jqwik` (Java).
- **Bug class uniquely found**: invariant violations unit tests can't enumerate.

### State-transition testing
- **What**: assert the state machine rejects illegal transitions.
- **Template**:
  ```
  states = [draft, review, published, archived]
  legal = [(draft→review), (review→published-via-publishNow), (published→archived)]
  illegal = [(draft→published), (review→archived), (archived→published)]
  for each illegal (a→b):
    assert PATCH(status=b) on a-state entity REJECTS (not silently accepts)
  ```
- **Bug class uniquely found**: forged-terminal-state. (Empirically: `updatePost`
  allowed PATCH directly to `published`, bypassing `publishNow` → forge "already
  published" without the publish flow. 5 state-machine bugs in one round.)
- **Why unit tests miss it**: developers test the happy path (`publishNow`) and
  never PATCH the terminal status directly.

---

## Layer 4 — System-level

### Bootstrap / DI test
- **What**: instantiate the root module (AppModule / composition root); verify
  all modules wire.
- **Recipe**: `const app = await AppModule.create(); expect(app.orders).toBeDefined()`
  for every expected provider. No mocks.
- **Bug class uniquely found**: forgotten imports, circular deps, env-parse bugs.

### Cross-module invariants (stateful pseudo-DB)
- **What**: reserve→confirm→release round-trip; reconcile totals.
- **Recipe**: run the full sequence against a REAL or stateful-pseudo DB; assert
  `sum(reserved) − sum(confirmed) − sum(released) === 0` and `entity.total === sum(line_items)`.
- **Bug class uniquely found**: stateful accounting bugs that mocks erase.
- **Key rule**: don't mock the DB for this layer — mocks delete the stateful bugs.

### Concurrency / race
- **What**: simulate concurrent reserve on the same inventory/seat.
- **Recipe**: spawn N concurrent `reserve(item, qty=1)`; assert `sum(succeeded) ≤ stock`.
- **Bug class uniquely found**: atomicity assumptions (non-locked updates oversell).

### Contract test
- **What**: mock shape vs real API doc shape.
- **Recipe**: parse the OpenAPI/schema; for each endpoint, assert the mock's
  response shape matches the documented shape field-by-field.
- **Bug class uniquely found**: field-mapping drift after an API version bump.

---

## Method-selection cheat sheet (by code shape)

| Code shape | Reach for first |
|------------|----------------|
| Pure function (math, format, transform) | Property-based + BVA |
| Parser (JSON/SQL/DSL/template) | Fuzz + error-path enumeration |
| State machine (status workflow, lifecycle) | State-transition |
| Financial / numeric (rates, totals, rounding) | Mutation + error-path (silent-zero!) + property |
| Authz / permissions | State-transition + error-path |
| Module wiring / DI | Bootstrap + cross-module invariant |
| Concurrency / inventory | Concurrency/race + cross-module invariant |

---

## Anti-hallucination: every finding must reproduce

A reported bug is only real if it has a **failing test** that reproduces it.
After mining, convert each finding into a regression test BEFORE fixing. The
defect-mining report lists: method → finding → repro test → fix → the mutant/
input/state that surfaced it.
