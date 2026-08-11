---
name: csp-defect-mining
description: "Systematic defect discovery via DIVERSE test methodologies — when a test suite has plateaued (more unit tests find 0 bugs), switch methods, not add quantity. Layers: basic (unit/BVA) → structural (mutation / error-path enumeration / type-tightening) → adversarial (fuzz / property-based / state-transition) → system (bootstrap/DI / cross-module invariants / concurrency). Use when auditing a project's test effectiveness, hunting bugs in parsers/state-machines/financial code, or breaking out of a '0 new bugs' plateau."
version: 1.0.0
layer: 2
category: workflow
phase: verify
domain: testing
scope: testing
tools: [Read, Write, Edit, Bash, Glob, Grep]
related_skills:
  - csp-codebase-audit
  - csp-test-coverage
  - csp-test-engineer
  - csp-systematic-debugging
  - csp-adversarial-reviewer
anti_rationalizations:
  "Just add more unit tests": "Unit tests verify logic the developer THOUGHT of — they plateau at 0 new bugs. Bugs live in paths the developer didn't think of."
  "Coverage is 90%, tests are fine": "Coverage measures execution, not assertion strength or methodology diversity. 90% coverage with only happy-path unit tests still hides state-machine + parser + silent-fallback bugs."
  "Mutation testing is too expensive": "Even MANUAL mutation (flip one operator, see if any test fails) on 5 key functions exposes blind spots in minutes. The cost is per-function, not per-project."
  "Fuzz found nothing on round 1, skip it": "Round-1 fuzz calibrates the generator. Rounds 2-3 with adjusted seeds (deeper nesting, embedded escapes) find the parser short-circuits."
  "These are equivalent mutants, ignore": "Equivalent mutants are noise — triage them manually, don't blindly trust 'survived = weak tests'. But the NON-equivalent survivors are real blind spots."
  "noUncheckedIndexedAccess is too noisy": "It reports many false positives (.returning()/.count() always return rows). Triage for real bugs, fix locally — don't enable globally and drown in noise."
---

# Defect Mining

**Core thesis: methodology diversity > test quantity.** Each new method targets
paths the developer didn't think of, so introducing a new method finds bug
classes the previous methods structurally cannot. When a method plateaus
(consecutive rounds find 0 bugs), switch methods — don't add more of the same.

This skill is the generalizable methodology extracted from a 5-round
defect-mining engagement where:
- Rounds 1-3 (unit tests) found bugs then plateaued at 0 by round 3.
- Round 4 (mutation + error-path enumeration) immediately found silent-zero
  financial bugs the unit tests couldn't see.
- Round 5 (fuzz + state-transition) found parser short-circuits + 5
  state-machine integrity bugs.

## When to Use

- A test suite has plateaued — adding unit tests finds nothing new.
- Auditing a project's test EFFECTIVENESS (not just coverage %).
- Hunting bugs in: parsers (JSON/SQL/DSL), state machines (workflow/publish
  status), financial/numeric code (rates/rounding/totals), permission/authz.
- Before a release on code with real-world consequences (money, security,
  data integrity).
- As the **engineering-quality deepener** for `csp-codebase-audit` dim ⑤.

## When NOT to Use

- Greenfield with no tests yet — write baseline unit tests first (Layer 1).
- Pure functions with trivially small input space — BVA covers it.
- Prototypes / throwaway scripts where bugs are cheap to tolerate.

## The 4-Layer Methodology (by discovery rate)

| Layer | Method | What it does | What it finds that others can't |
|-------|--------|-------------|---------------------------------|
| **1. Basic** (plateaus fast) | Unit | Verify developer-thought-of logic + explicit edges | Obvious bugs only |
| 1 | Boundary-value (BVA) | N-1/N/N+1 per comparison operator | Off-by-one at known thresholds |
| 1 | Equivalence classes | One representative per input class | Reduces unit sprawl |
| **2. Structural** (measures test quality) | Mutation | Mutate source (`>`→`>=`, `+`→`-`, drop `!`), check if tests kill the mutant | **Test blind spots** — mutants that survive = tests that don't really test |
| 2 | Error-path enumeration | grep every `catch{}`/`??`/`|| 0`/`?.`, force each fallback to fire | **Silent-failure bugs** — `Number(x)||0` turns "missing tariff" into "duty-free" |
| 2 | Type-tightening | `tsc --noUncheckedIndexedAccess`, triage real bugs | **Possible-undefined access** the types hid |
| **3. Adversarial** (developer blind spots) | Fuzz | Pathological input: prototype pollution, embedded escapes, 50k-char imbalance, 200 adversarial randoms | **Parser short-circuits** — `parseLlmJson(allowArray)` returning first inner object not array |
| 3 | Property-based | Seeded PRNG, assert invariants (never throws, non-negative, monotonic) across N random inputs | **Invariant violations** unit tests can't enumerate |
| 3 | State-transition | Assert state machine rejects illegal transitions (draft→published direct) | **Forged-terminal-state bugs** — PATCH to `published` bypasses publish flow |
| **4. System-level** | Bootstrap/DI | Instantiate the root module, verify all wiring | Forgotten imports, circular deps, env-parse bugs |
| 4 | Cross-module invariants | reserve→confirm→release round-trip, reconcile numbers | **Stateful accounting bugs** mock-DBs erase |
| 4 | Concurrency/race | Concurrent reserve simulation | Atomicity assumptions |
| 4 | Contract | Mock shape vs real API doc shape | Field-mapping drift |

> Detailed per-method templates (how to run each, grep patterns, generator
> scaffolds, property/state-machine templates) are in `references/methods.md`.

## The Workflow

```
1. Unit-test each module (establish baseline)          → obvious bugs
2. Property-test pure functions (invariants)           → lock math correctness
3. Mutation-test key functions (test STRENGTH)         → expose test blind spots
4. Error-path enumerate (grep silent fallbacks)        → mine silent-failure bugs
5. Fuzz parsers (pathological input)                   → mine string/escape bugs
6. State-transition test state machines                → mine illegal-transition bugs
7. Bootstrap + cross-module invariants                 → mine wiring/reconciliation bugs
```

**Plateau rule:** when a layer yields 0 new bugs for 2 consecutive rounds,
descend to the next layer. Bugs don't hide in already-tested code — they hide
in methodology blind spots.

## Key Empirical Rules

1. **Diversity > quantity.** Going 92→699 tests found bugs via the QUANTITY,
   but the real unlock was P18→P19 (0→continuous output) by switching METHOD.
2. **Bugs live in un-thought-of paths.** Unit tests verify thought-of logic →
   0 new bugs is the norm after baseline. Mutation/Fuzz/State target the rest.
3. **The comparator itself has bugs.** Mutation testing exposed a test-helper
   bug (`JSON.stringify` drops `undefined`, so `{a:undefined}` equaled `{}`).
   Test tooling must itself be tested.
4. **Equivalent mutants are noise.** Mutation reports "equivalent" (performance-
   equal, output-identical) mutants that can't be killed — triage manually,
   don't blindly trust survival reports.
5. **Type-tightening is double-edged.** `noUncheckedIndexedAccess` flags many
   false positives (`.returning()`/`.count()` always return rows). Triage for
   real bugs and fix locally; don't enable globally and drown in build noise.

## How to Run Each Layer (quick start)

- **Layer 1**: write unit tests per module; BVA every comparison operator.
- **Layer 2**:
  - Mutation: pick 5 key functions; manually flip one operator per mutant;
    run the suite; any mutant that survives = a blind spot. (Or use a tool:
    `stryker` for JS/TS, `mutmut` for Python, `cargo-mutants` for Rust.)
  - Error-path: `grep -rnE 'catch\s*\{\s*\}|\?\?|\\|\\| 0|\?\.'` — for each
    fallback, write a test that forces it to fire and asserts the behavior.
  - Type-tightening: `tsc --noUncheckedIndexedAccess`; triage the report.
- **Layer 3**: see `references/methods.md` for fuzz/property/state templates.
- **Layer 4**: instantiate the root AppModule; run reserve→confirm→release
  against a REAL (or stateful pseudo) DB and reconcile totals.

## Verification (skill output acceptance)

- A **defect-mining report** (e.g. `docs/analysis/defect-mining-{date}.md`)
  listing: methods applied, bugs found per method, kill-rate for mutants,
  the plateau point, and recommended next layer.
- Every finding has `file:line` + repro + the method that surfaced it.
- Anti-hallucination: each reported bug must reproduce as a failing test.

## Pitfalls

- Don't skip Layer 1 — mutation/fuzz on a module with no tests is meaningless.
- Don't chase 100% mutation kill-rate — equivalent mutants make it unreachable.
  Target the NON-equivalent survivors on key (financial/security/parser) functions.
- Don't mock the DB for Layer 4 — mocks erase the stateful bugs Layer 4 finds.
- Don't run all layers at once — each layer's findings inform the next.
