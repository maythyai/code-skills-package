---
name: csp-concurrency-testing
description: >
  Testing concurrent and parallel code: Go race detector (`go test -race`),
  jcstress for JVM memory model edge cases, ThreadSanitizer (TSan) for C/C++/Rust/Swift,
  Rust loom for exhaustive interleaving exploration of lock-free data structures,
  miri for undefined behavior and data race detection, pytest-asyncio and Hypothesis
  for Python async, Kotlin coroutines test, and Jepsen/Porcupine for linearizability
  checking of distributed systems. Use when writing lock-free/atomic code, async
  runtimes, distributed consensus, financial ledgers, caches, or any code where
  "it works on my machine" correlates with CPU count.
version: 0.1.0
layer: 3
category: patterns
phase: verify
domain: testing
role: specialist
scope: implementation
tools: [Read, Write, Edit, Bash, Glob, Grep]
related_skills:
  - [[csp-golang-testing]]
  - [[csp-rust-testing]]
  - [[csp-java-testing]]
  - [[csp-kotlin-testing]]
  - [[csp-python-testing]]
  - [[csp-load-testing]]
  - [[csp-test-methodology]]
  - [[csp-property-based-testing]]
  - [[csp-cross-layer-testing]]
anti_rationalizations:
  "单测过了并发就没问题": "单测覆盖 ~0.001% 的交错；race detector + loom + jcstress 才能穷举 interleaving"
  "我们用了 mutex/atomic 就安全了": "用对了原语 ≠ 用对了地方；ABA、lost update、deadlock、memory ordering 仍需专项测试"
  "并发 bug 不可复现所以不测": "不可复现 = 没有工具；loom/miri/jcstress 把非确定性变确定性穷举"
---

# Concurrency Testing

Prove your concurrent code is correct under *all* interleavings, not just the one your laptop happened to schedule today.

## When to Activate

- Lock-free / atomic data structures (queues, counters, caches, CRDTs)
- Async runtimes (Tokio, asyncio, kotlinx.coroutines, Go scheduler)
- Distributed consensus (Raft, Paxos implementations)
- Financial ledgers, inventory systems, anything with "no double-spend" invariants
- Recent incident: heisenbug, flaky test that passes alone but fails in suite
- Pre-launch: code runs on multi-core prod but was developed on single-core laptop
- Adopting virtual threads (Java 21+, Kotlin coroutines) and you need proof of JMM correctness

## Concurrency Bug Taxonomy

| Bug class | Definition | Detection tool | Example |
|---|---|---|---|
| **Data race** | Unsynchronized access to shared memory from 2+ threads | Go race, TSan, miri | Two goroutines incrementing a non-atomic counter |
| **Race condition** | Logical bug from specific interleaving (even with correct synchronization) | loom, jcstress, Jepsen | Check-then-act on a mutex-protected map |
| **Deadlock** | Circular wait on locks | TSan (lock-order), loom | Lock A then B in one path, B then A in another |
| **Livelock** | Threads make progress but not toward the goal | Stress + timeout assertion | Two threads retrying the same conflicting operation |
| **Lost update** | Concurrent writes, one overwrites the other | Invariant stress test | Counter incremented 1000× reads 998 |
| **ABA** | Value changes A→B→A, CAS succeeds incorrectly | loom, jcstress | Lock-free stack pop with reused pointer |
| **Memory ordering** | Reordering visible across threads without proper fences | jcstress, TSan, miri | Non-volatile field read sees stale value |
| **Linearizability violation** | Distributed ops don't appear atomic | Jepsen, Porcupine, Elle | Concurrent get/put on a distributed KV returns stale |

> **Data race ≠ race condition.** A data race is unsynchronized memory access (detectable by TSan). A race condition is a logical bug from interleaving (needs model checking or exhaustive exploration). You can have a race condition with zero data races.

## Tool Matrix by Ecosystem

| Language | Tool | Install | Run | What it catches |
|---|---|---|---|---|
| Go | race detector (built-in) | — | `go test -race -count=10 ./...` | Data races |
| Go | `go vet -copylocks` | built-in | `go vet ./...` | Mutex copied by value |
| JVM | jcstress 0.17.x | Maven archetype | `mvn clean verify && java -jar target/jcstress.jar` | JMM edge cases, memory ordering |
| JVM | ThreadSanitizer (JNI/native) | `-fsanitize=thread` | compile + run | Data races in native code |
| C/C++ | ThreadSanitizer (TSan) | clang/gcc | `clang -fsanitize=thread -g -O1 app.c && ./a.out` | Data races, lock-order inversions |
| Rust | loom 0.7.x | `cargo add --dev loom` | `RUSTFLAGS="--cfg loom" cargo test --release` | Exhaustive interleaving (DPOR) |
| Rust | miri (nightly) | `rustup +nightly component add miri` | `cargo +nightly miri test` | UB, data races, Stacked Borrows |
| Python | pytest-asyncio 0.24+ | `pip install pytest-asyncio` | `pytest --asyncio-mode=auto` | Async correctness (not true races — GIL) |
| Python | Hypothesis (interleaving) | `pip install hypothesis` | property-based schedule generation | Logical race conditions |
| Kotlin | kotlinx-coroutines-test | Gradle dep | `runTest { }` | Coroutine scheduling, virtual time |
| Distributed | Jepsen | Clojure, lein | `lein run test --workload append --nemesis partition` | Linearizability, consistency |
| Distributed | Porcupine (Go) | `go get github.com/anishathalye/porcupine` | linearizability check on history | Linearizability |
| Distributed | Elle (Clojure) | Jepsen ecosystem | transactional consistency | Cycle detection in tx histories |

## Pattern 1: Go Race Detector + Invariant Stress

```go
// counter_test.go
func TestCounter_NoLostUpdates(t *testing.T) {
    for iter := 0; iter < 100; iter++ {
        var c atomic.Int64
        var wg sync.WaitGroup
        for j := 0; j < 1000; j++ {
            wg.Add(1)
            go func() { defer wg.Done(); c.Add(1) }()
        }
        wg.Wait()
        if got := c.Load(); got != 1000 {
            t.Fatalf("iter %d: lost updates: got %d, want 1000", iter, got)
        }
    }
}

// Run with race detector + stress:
// go test -race -count=10 -cpu=1,2,4,8 ./...
```

`-count=10` re-runs the test 10× to surface non-deterministic races. `-cpu=1,2,4,8` varies GOMAXPROCS. Always combine race detector with stress — a single run may not exercise the racy path.

```go
// Deadlock detection via lock-order inversion
func TestNoLockOrderInversion(t *testing.T) {
    var mu1, mu2 sync.Mutex
    // Path A: mu1 → mu2
    go func() { mu1.Lock(); mu2.Lock(); mu2.Unlock(); mu1.Unlock() }()
    // Path B: mu2 → mu1  ← inversion!
    go func() { mu2.Lock(); mu1.Lock(); mu1.Unlock(); mu2.Unlock() }()
    // With -race and enough iterations, TSan-equivalent detection fires
}
```

## Pattern 2: Rust loom (Exhaustive Interleaving)

```rust
// src/counter.rs — lock-free counter
use loom::sync::Arc;
use loom::sync::atomic::{AtomicUsize, Ordering};

pub struct Counter { inner: Arc<AtomicUsize> }

impl Counter {
    pub fn new() -> Self { Self { inner: Arc::new(AtomicUsize::new(0)) } }
    pub fn incr(&self) { self.inner.fetch_add(1, Ordering::SeqCst); }
    pub fn get(&self) -> usize { self.inner.load(Ordering::SeqCst) }
}

// tests/counter_loom.rs
use loom::thread;

#[test]
fn counter_no_lost_updates() {
    loom::model(|| {
        let c = Arc::new(Counter::new());
        let c1 = c.clone();
        let c2 = c.clone();

        let t1 = thread::spawn(move || { for _ in 0..3 { c1.incr(); } });
        let t2 = thread::spawn(move || { for _ in 0..3 { c2.incr(); } });

        t1.join().unwrap();
        t2.join().unwrap();

        assert_eq!(c.get(), 6);
    });
}
```

```toml
# Cargo.toml
[target.'cfg(loom)'.dev-dependencies]
loom = "0.7"
```

```bash
RUSTFLAGS="--cfg loom" cargo test --release --test counter_loom
```

loom explores **all** interleavings via dynamic partial order reduction (DPOR). A test that passes under loom is correct under *every* possible schedule — the gold standard for lock-free code. Limit: state space explodes beyond ~4 threads / ~10 operations.

## Pattern 3: Rust miri (UB + Data Race Detection)

```bash
rustup +nightly component add miri
cargo +nightly miri test
# Catches: undefined behavior, data races, Stacked Borrows violations,
# use-after-free, uninitialized memory, invalid transmutes
```

```rust
// miri will flag this:
#[test]
fn ub_example() {
    let mut x = 0u32;
    let p = &mut x as *mut u32;
    unsafe {
        *p = 1;           // write through raw pointer
        let y = *&mut x;  // miri: Stacked Borrows violation
    }
}
```

miri is an *interpreter*, not a fuzzer — it's slow (100–1000× native) but exhaustive for UB. Run on nightly CI for `unsafe` code, `no_std`, and FFI boundaries.

## Pattern 4: jcstress (JVM Memory Model)

```java
// src/test/java/com/example/CounterTest.java
import org.openjdk.jcstress.annotations.*;
import org.openjdk.jcstress.infra.results.II_Result;

@JCStressTest
@Outcome(id = "1, 1", expect = Expect.ACCEPTABLE, desc = "Both increments visible")
@Outcome(id = "1, 0", expect = Expect.ACCEPTABLE_INTERESTING, desc = "Lost update")
@Outcome(id = "0, 1", expect = Expect.ACCEPTABLE_INTERESTING, desc = "Lost update")
@Outcome(id = "0, 0", expect = Expect.FORBIDDEN, desc = "Both lost — impossible with atomics")
@State
public class CounterTest {
    private final AtomicLong counter = new AtomicLong(0);

    @Actor
    public void actor1(II_Result r) {
        r.r1 = (int) (counter.incrementAndGet() % 2);
    }

    @Actor
    public void actor2(II_Result r) {
        r.r2 = (int) (counter.incrementAndGet() % 2);
    }
}
```

```bash
mvn archetype:generate \
  -DarchetypeGroupId=org.openjdk.jcstress \
  -DarchetypeArtifactId=jcstress-java-test \
  -DarchetypeVersion=0.17
mvn clean verify
java -jar target/jcstress.jar
```

jcstress runs each `@Actor` pair millions of times across CPU configurations, reporting outcome frequencies. `ACCEPTABLE_INTERESTING` outcomes are the bugs — they occur rarely but are real. jcstress 0.17 supports JDK 21+ virtual threads.

## Pattern 5: Kotlin Coroutines Test (deterministic scheduling)

```kotlin
class OrderServiceTest : FunSpec({
    val dispatcher = StandardTestDispatcher()
    val scope = TestScope(dispatcher)
    val repo = mockk<OrderRepo>()
    val svc = OrderService(repo, dispatcher)

    test("concurrent orders don't lose updates") = scope.runTest {
        coEvery { repo.save(any()) } returns Unit

        val jobs = (1..100).map { id ->
            launch { svc.placeOrder(Order(id = id, total = 10.0)) }
        }
        jobs.forEach { it.join() }

        coVerify(exactly = 100) { repo.save(any()) }
    }

    test("timeout cancels slow operation") = scope.runTest {
        val result = withTimeoutOrNull(1000) {
            svc.slowOperation()  // internally delays 5000
        }
        result shouldBe null
        // Virtual time: runTest auto-skips delays, fails on uncaught exceptions
    }
})
```

`StandardTestDispatcher` queues coroutines (you control time via `advanceTimeBy` / `advanceUntilIdle`). `UnconfinedTestDispatcher` runs eagerly. **Pick one per test** — mixing them is the #1 source of flaky coroutine tests.

## Pattern 6: Python Asyncio + Hypothesis (interleaving generation)

```python
# tests/test_async_counter.py
import asyncio
import pytest
from hypothesis import given, settings, strategies as st

class AsyncCounter:
    def __init__(self):
        self._value = 0
        self._lock = asyncio.Lock()

    async def incr(self):
        async with self._lock:
            self._value += 1

    async def get(self):
        return self._value

@pytest.mark.asyncio
async def test_no_lost_updates():
    c = AsyncCounter()
    await asyncio.gather(*[c.incr() for _ in range(1000)])
    assert await c.get() == 1000

@pytest.mark.asyncio
@given(schedule=st.permutations(list(range(10))))
@settings(max_examples=50)
async def test_order_independent(schedule):
    """Counter result is independent of task scheduling order."""
    c = AsyncCounter()
    tasks = [asyncio.create_task(c.incr()) for _ in schedule]
    await asyncio.gather(*tasks)
    assert await c.get() == len(schedule)
```

Python's GIL prevents true data races on bytecode-level operations, but **logical race conditions** (check-then-act, await between read and write) are real. `asyncio.Lock` + Hypothesis schedule generation catches them.

## Pattern 7: Linearizability Checking (Porcupine, Go)

```go
// tests/linearizability_test.go
import "github.com/anishathalye/porcupine"

func TestRegisterLinearizable(t *testing.T) {
    // Model: a single register with read/write operations
    model := porcupine.Model{
        Init: func() interface{} { return 0 },
        Step: func(state, input, output interface{}) (bool, interface{}) {
            switch inp := input.(type) {
            case WriteOp:
                return true, inp.Value
            case ReadOp:
                return state == inp.Expected, state
            }
            return false, state
        },
    }

    // History: concurrent operations recorded from a real run
    history := []porcupine.Operation{
        {ClientId: 0, Input: WriteOp{1}, CallOrder: 0, ReturnOrder: 2},
        {ClientId: 1, Input: WriteOp{2}, CallOrder: 1, ReturnOrder: 3},
        {ClientId: 2, Input: ReadOp{Expected: 2}, CallOrder: 4, ReturnOrder: 5},
    }

    if !porcupine.CheckOperations(model, history) {
        t.Error("history is not linearizable")
    }
}
```

Porcupine (Go) and Elle (Clojure) check whether a recorded history of concurrent operations is consistent with *some* sequential order. This is the Jepsen-style verification, available as a library.

## CI Integration

| Gate | Tool | Scope | Frequency | Overhead |
|---|---|---|---|---|
| Race detector | `go test -race` | All Go packages | Every PR | 2–20× slowdown, 5–10× memory |
| TSan | `-fsanitize=thread` | C/C++/Rust FFI | Every PR | 5–15× slowdown |
| miri | `cargo +nightly miri test` | Rust `unsafe` / `no_std` | Nightly | 100–1000× slowdown |
| loom | `RUSTFLAGS="--cfg loom" cargo test` | Lock-free data structures | Every PR (scoped) | Exponential in thread count |
| jcstress | `java -jar jcstress.jar` | JMM-sensitive code | Nightly + pre-release | Minutes per test |
| Stress invariants | `-count=10 -cpu=1,2,4,8` | Concurrent code | Every PR | 10× test time |
| Linearizability | Porcupine / Elle | Distributed KV/registers | Pre-release | Depends on history size |
| Async correctness | pytest-asyncio + Hypothesis | Python async | Every PR | Property-test overhead |

## Anti-Patterns

- **Running `-race` only on happy-path tests** — The race detector needs concurrent execution paths *actually exercised*. A test that never spawns 2+ goroutines finds nothing.
- **`time.Sleep()` to "wait" for goroutines** — Use `sync.WaitGroup`, channels, or `require.Eventually`. Sleep is a flakiness generator.
- **Testing lock-free code without loom/miri** — Unit tests cover ~0.001% of interleavings. loom gives exhaustive coverage for small state spaces.
- **Ignoring TSan on release builds** — TSan requires `-O1` minimum and adds 5–15× overhead. Run it in CI, not in prod.
- **Jepsen-style tests without a nemesis** — You only prove happy-path correctness. Inject partitions, clock skew, node kills.
- **Mixing `StandardTestDispatcher` and `UnconfinedTestDispatcher` in one Kotlin test** — Pick one. Mixing is the #1 source of flaky coroutine tests.
- **`runBlocking` in Kotlin tests instead of `runTest`** — You lose virtual time; delays become real waits; tests become slow and flaky.
- **Assuming GIL makes Python "thread-safe"** — GIL prevents bytecode-level data races, not logical race conditions. `await` between read and write is a race.

## Related Skills

- [[csp-golang-testing]] — Go test harness hosting race detector + stress
- [[csp-rust-testing]] — Rust test harness hosting loom + miri
- [[csp-java-testing]] — JVM test harness hosting jcstress
- [[csp-kotlin-testing]] — Kotlin coroutines test (runTest, TestDispatcher, Turbine)
- [[csp-python-testing]] — pytest-asyncio + Hypothesis schedule generation
- [[csp-load-testing]] — Load proves throughput under concurrency; this skill proves *correctness* under concurrency
- [[csp-test-methodology]] — L1 method selection; concurrency fills the "interleaving / memory model" blind spot
- [[csp-property-based-testing]] — Hypothesis/fast-check generate schedules and interleavings
- [[csp-cross-layer-testing]] — Cross-layer verifies data flow; concurrency testing verifies the flow is correct under parallel execution
