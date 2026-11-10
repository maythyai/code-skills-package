---
name: csp-property-based-testing
description: >
  Property-based testing (PBT) with Hypothesis (Python), fast-check (JS/TS),
  jqwik (Java), Kotest Property (Kotlin), proptest (Rust), gopter (Go). Generates
  random inputs, shrinks failures to minimal counterexamples, and supports stateful
  machine testing. Use when example-based tests miss edge cases, when algorithms have
  clear invariants (parsers, serializers, sorters), or when you need metamorphic
  relations for systems without an oracle.
version: 0.1.0
layer: 3
category: patterns
phase: verify
domain: testing
role: specialist
scope: implementation
tools: [Read, Write, Edit, Bash, Glob, Grep]
related_skills:
  - [[csp-test-case-design]]
  - [[csp-test-methodology]]
  - [[csp-python-testing]]
  - [[csp-typescript-testing]]
  - [[csp-rust-testing]]
  - [[csp-java-testing]]
  - [[csp-fuzz-testing]]
  - [[csp-differential-testing]]
anti_rationalizations:
  "例子测试已经够了": "例子只覆盖你想到的输入；property 生成你想不到的边界，并自动 shrink 到最小反例"
  "PBT 太慢不适合 CI": "默认 100 次迭代 < 1s；用 example database 缓存失败种子，CI 跑回归而非探索"
  "我们的代码没有不变量": "roundtrip(encode∘decode=id)、幂等、单调、守恒——绝大多数纯函数都有可表达的不变量"
---

# Property-Based Testing

Describe *invariants* instead of examples. The framework generates hundreds of random inputs, finds the ones that break your invariant, and shrinks the failure to the smallest readable counterexample.

## When to Activate

- Algorithms with clear invariants: parsers, serializers, encoders, sorters, caches, CRDTs
- High combinatorial input space where example tests only scratch the surface
- You found a bug that unit tests missed — turn it into a property + regression seed
- State machines (cart, workflow, protocol) where command sequences matter
- Metamorphic relations: no oracle, but you know how output *should change* when input changes
- Differential testing against a reference implementation (pair with [[csp-differential-testing]])

## PBT vs Example vs Fuzz

| Dimension | Example test | Property test | Fuzz test |
|---|---|---|---|
| Input source | Hand-written | Generated + shrunk | Generated (coverage-guided) |
| Oracle | Exact assertion | Invariant | Crash / sanitizer |
| Failure output | The example | Minimal counterexample | Crashing bytes |
| Speed | ms | ms–s (100–1000 iters) | minutes–hours |
| Catches | Known paths | Logic bugs, edge cases | Memory safety, panics |
| Regression | Re-run same example | Re-run saved seed (`@reproduce_failure`) | Re-run corpus entry |

> PBT and fuzz are complementary: PBT asserts *correctness invariants*, fuzz asserts *no crash*. See [[csp-fuzz-testing]] for the fuzzing side.

## Tool Matrix by Ecosystem

| Language | Tool | Install | Default iters |
|---|---|---|---|
| Python | Hypothesis 6.x | `pip install hypothesis` | 100 |
| JS/TS | fast-check 3.x/4.x | `npm i -D fast-check` | 100 |
| Java | jqwik 1.9.x | `testImplementation("net.jqwik:jqwik:1.9.1")` | 1000 |
| Kotlin | Kotest Property 6.x | `testImplementation("io.kotest:kotest-property:6.2.0")` | 1000 |
| Rust | proptest 1.x | `cargo add --dev proptest` | 256 |
| Rust (alt) | quickcheck 1.x | `cargo add --dev quickcheck` | 100 |
| Go | gopter | `go get github.com/leanovate/gopter` | 100 |
| Go (stdlib) | testing/quick | built-in | 100 |
| Swift | SwiftCheck | SPM dep | 500 |

## Core Concepts

- **Property**: an invariant that must hold for *all* inputs (`sort(xs)` is idempotent, `encode∘decode = id`).
- **Strategy / Arbitrary / Generator**: produces random inputs of a type (`st.integers()`, `fc.string()`, `Arb.string()`).
- **Shrinking**: on failure, automatically reduces the input to the smallest counterexample (e.g., `[1,2,3,4,5]` → `[0]`).
- **Assumption**: `assume(x > 0)` filters invalid inputs post-generation; prefer constrained strategies over assumptions.
- **Stateful PBT**: model a system as a state machine, generate command sequences, assert invariants after each step.
- **Metamorphic relation**: when you can't compute the expected output, assert how output *changes* under input transformation (`f(2x) ≈ 2f(x)` for linear).
- **Example database**: Hypothesis/fast-check persist failing seeds to `.hypothesis/` or `.fast-check/` so CI replays them deterministically.

## Pattern 1: Roundtrip Property (Hypothesis / Python)

```python
from hypothesis import given, settings, strategies as st, reproduce_failure
import json

@given(st.dictionaries(st.text(), st.integers() | st.text() | st.floats(allow_nan=False)))
@settings(max_examples=200)
def test_json_roundtrip(d):
    """encode ∘ decode = id for all JSON-serializable dicts."""
    assert json.loads(json.dumps(d)) == d

# When CI finds a failure, pin it as a regression:
@reproduce_failure(b"6.100.x", b"\x00\x01...")  # auto-generated seed
@given(st.dictionaries(st.text(), st.integers()))
def test_json_roundtrip_regression(d):
    assert json.loads(json.dumps(d)) == d
```

Commit `.hypothesis/` to git (or configure `database=DirectoryBasedExampleDatabase(".hypothesis")`) so failing seeds replay in CI.

## Pattern 2: Stateful Machine (Hypothesis RuleBasedStateMachine)

```python
from hypothesis.stateful import RuleBasedStateMachine, rule, initialize, invariant
from hypothesis import strategies as st

class CartMachine(RuleBasedStateMachine):
    """Model-based test: real cart vs simple list model."""

    def __init__(self):
        super().__init__()
        self.cart = Cart()          # system under test
        self.model = []             # reference model

    @rule(item=st.text(min_size=1, max_size=20))
    def add_item(self, item):
        self.cart.add(item)
        self.model.append(item)

    @rule()
    def remove_last(self):
        if self.model:
            expected = self.model.pop()
            actual = self.cart.remove_last()
            assert actual == expected

    @invariant()
    def length_matches(self):
        assert len(self.cart) == len(self.model)

    @invariant()
    def total_is_non_negative(self):
        assert self.cart.total() >= 0

TestCart = CartMachine.TestCase
```

Stateful PBT catches bugs that only appear after specific command sequences (add→remove→add) — impossible to enumerate by hand.

## Pattern 3: fast-check (JS/TS) with Model-Based Testing

```typescript
import fc from "fast-check";
import { describe, it, expect } from "vitest";

describe("sorted list", () => {
  it("is idempotent", () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (xs) => {
        const once = sort(xs);
        const twice = sort(once);
        expect(twice).toEqual(once);
      }),
      { numRuns: 500 }
    );
  });

  it("preserves multiset", () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (xs) => {
        const sorted = sort(xs);
        expect([...sorted].sort((a, b) => a - b)).toEqual([...xs].sort((a, b) => a - b));
      })
    );
  });
});

// Model-based: command sequence against a reference
fc.assert(
  fc.property(fc.commands([...]), (cmds) => {
    const real = new RealSystem();
    const model = new ModelSystem();
    fc.modelRun(() => ({ real, model }), cmds);
  })
);
```

fast-check v4 (2024) rewrote arbitraries for smaller memory footprint and added first-class Vitest support.

## Pattern 4: jqwik (Java) + Kotest Property (Kotlin)

```java
// jqwik
@Property(tries = 1000)
void sortIsIdempotent(@ForAll List<Integer> xs) {
    var once = Sorter.sort(xs);
    var twice = Sorter.sort(once);
    assertThat(twice).isEqualTo(once);
}

@Property
void roundtrip(@ForAll @StringLength(max = 100) String s) {
    assertThat(Codec.decode(Codec.encode(s))).isEqualTo(s);
}
```

```kotlin
// Kotest Property
class CodecTest : FunSpec({
    test("roundtrip for all strings") {
        checkAll(Arb.string(0..100)) { s ->
            Codec.decode(Codec.encode(s)) shouldBe s
        }
    }
    test("sort preserves multiset") {
        checkAll(Arb.list(Arb.int())) { xs ->
            val sorted = xs.sorted()
            sorted.groupingBy { it }.eachCount() shouldBe xs.groupingBy { it }.eachCount()
        }
    }
})
```

## Pattern 5: proptest (Rust) with Persistent Failure Files

```rust
proptest! {
    #![proptest_config(ProptestConfig::default())]

    #[test]
    fn roundtrip(s in ".*") {
        let encoded = encode(&s);
        let decoded = decode(&encoded).unwrap();
        prop_assert_eq!(decoded, s);
    }

    #[test]
    fn sort_idempotent(mut xs in prop::collection::vec(any::<i32>(), 0..100)) {
        let once = sort(&xs);
        let twice = sort(&once);
        prop_assert_eq!(once, twice);
    }
}
```

proptest writes failing cases to `proptest-regressions/<test>.txt` — commit this file so CI replays the exact seed.

## Metamorphic Testing (no oracle needed)

When you can't compute the expected output, assert *relations*:

```python
@given(st.lists(st.floats(allow_nan=False, allow_infinity=False), min_size=1))
def test_mean_shift_invariance(xs):
    """mean(xs + c) == mean(xs) + c for any constant c."""
    c = 42.0
    assert abs(mean([x + c for x in xs]) - (mean(xs) + c)) < 1e-9

@given(st.text())
def test_search_monotonic(query):
    """Adding a matching row can only increase result count."""
    base = search(query)
    add_matching_row(query)
    after = search(query)
    assert len(after) >= len(base)
```

Metamorphic relations are the go-to for ML models, search engines, and compilers where exact output is unknowable.

## CI Integration

```yaml
# Keep CI fast: cap iterations, rely on example database for regression
- run: pytest --hypothesis-profile=ci
  env:
    HYPOTHESIS_PROFILE: ci
```

```python
# conftest.py
from hypothesis import settings, HealthCheck
settings.register_profile("ci", max_examples=100, suppress_health_check=[HealthCheck.too_slow])
settings.register_profile("dev", max_examples=2000)
settings.load_profile(os.getenv("HYPOTHESIS_PROFILE", "dev"))
```

Nightly job runs `max_examples=10000` for deep exploration; PR gate runs 100 for speed. Commit the example database so failing seeds always replay.

## Anti-Patterns

- **Tautological property** — `assert sort(xs) == sort(xs)` restates the implementation. Properties must be *independent* of the SUT (use a reference model or mathematical invariant).
- **No shrinking** — Giant unreadable counterexamples. Always use the framework's built-in shrinker; never hand-roll random input generation.
- **PBT on I/O-heavy code without a model** — Network/DB calls make properties non-deterministic. Either inject a fake (see [[csp-mock-strategies]]) or use stateful PBT with a model.
- **`max_examples=10_000` in CI without example database** — Flaky and slow. Cap CI at 100–500, run deep exploration nightly.
- **Missing `@reproduce_failure` regression seeds** — A bug found once and never pinned will regress. Always commit the seed.
- **Assumption-heavy properties** — `assume(x > 0 and x < 100 and ...)` filters 99% of generated inputs → effectively no testing. Use constrained strategies (`st.integers(min_value=1, max_value=99)`) instead.
- **Property that duplicates an example test** — If you can write the exact assertion, write an example test. PBT shines when the input space is too large to enumerate.

## Related Skills

- [[csp-test-case-design]] — Example-based case enumeration; PBT is the complement when enumeration is infeasible
- [[csp-test-methodology]] — L1 method selection; PBT fills the "edge case / combinatorial input" blind spot
- [[csp-fuzz-testing]] — Fuzz finds crashes, PBT finds logic bugs; use both on parsers/deserializers
- [[csp-differential-testing]] — Property-based differential: generate inputs, feed two implementations, assert equality
- [[csp-python-testing]] / [[csp-typescript-testing]] / [[csp-rust-testing]] / [[csp-java-testing]] — Language-specific test setup that hosts PBT
