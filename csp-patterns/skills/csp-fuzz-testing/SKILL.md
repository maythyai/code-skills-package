---
name: csp-fuzz-testing
description: >
  Coverage-guided fuzzing to find crashes, memory bugs, and invariant violations
  in parsers, deserializers, protocol handlers, and anything accepting untrusted
  bytes. AFL++ and libFuzzer for C/C++, cargo-fuzz for Rust, native `go test -fuzz`
  for Go 1.18+, Atheris for Python, Jazzer for JVM, OSS-Fuzz/ClusterFuzz for
  continuous infra. Use when you have a parser/deserializer, when a bug class
  repeats (buffer overrun, integer overflow), or when you need proof that
  untrusted input can't crash the service.
version: 0.1.0
layer: 3
category: patterns
phase: verify
domain: testing
role: specialist
scope: implementation
tools: [Read, Write, Edit, Bash, Glob, Grep]
related_skills:
  - [[csp-property-based-testing]]
  - [[csp-security-review]]
  - [[csp-test-methodology]]
  - [[csp-cpp-testing]]
  - [[csp-rust-testing]]
  - [[csp-golang-testing]]
  - [[csp-python-testing]]
  - [[csp-cicd-pipelines]]
anti_rationalizations:
  "我们输入都校验过了": "校验逻辑本身就是攻击面；fuzz 找的是校验绕过、解析器崩溃、整数溢出——正是校验没覆盖的路径"
  "fuzz 太慢不能进 CI": "60s smoke fuzz 进 PR 门禁，24h deep fuzz 进 nightly/OSS-Fuzz；两层互补"
  "Rust/Go 内存安全不需要 fuzz": "内存安全 ≠ 逻辑安全；panic、unwrap、整数溢出、死循环、协议状态机错乱照 fuzz 不误"
---

# Fuzz Testing

Feed randomly-generated (often mutated) bytes into a target function, instrument for coverage, and prioritize inputs that hit new branches. Find crashes, hangs, sanitizer violations, and invariant breaks that example tests and property tests miss.

## When to Activate

- Parsers, deserializers, encoders, decoders (JSON, XML, protobuf, custom binary)
- Protocol handlers (HTTP, gRPC, WebSocket, MQTT, custom TCP)
- Crypto, compression, image/font/media processing
- Anything accepting untrusted bytes from network/user/file
- A bug class repeats: buffer overrun, integer overflow, null deref, panic
- Pre-security-audit hardening
- You have a reference implementation and want differential fuzzing (pair with [[csp-differential-testing]])

## Fuzz vs Property vs Negative Testing

| Dimension | Negative test | Property test | Fuzz test |
|---|---|---|---|
| Input source | Hand-written bad inputs | Generated from typed strategies | Mutated bytes / coverage-guided |
| Oracle | Expected error/exception | Invariant assertion | Crash / sanitizer / hang |
| Coverage feedback | None | None | ✅ Instrumented — prioritizes new branches |
| Runtime | ms | ms–s | minutes–hours–days |
| Catches | Known error paths | Logic bugs, edge cases | Memory safety, panics, protocol desync |
| Corpus | N/A | N/A | Seed inputs + minimized crashers |

> Fuzz and property are complementary: property asserts *correctness*, fuzz asserts *no crash*. For a JSON parser, property says `decode(encode(x)) == x`; fuzz says "no input, however malformed, causes a segfault or OOM."

## Tool Matrix by Ecosystem

| Language | Tool | Install | Run | Sanitizers |
|---|---|---|---|---|
| C/C++ | AFL++ 4.x | `apt install afl++` / build from source | `afl-fuzz -i corpus -o findings -- ./target @@` | ASan, UBSan, MSan |
| C/C++ | libFuzzer (LLVM) | built into clang | `clang -fsanitize=fuzzer,address target.c && ./a.out corpus/` | ASan, UBSan |
| Rust | cargo-fuzz (libFuzzer) | `cargo install cargo-fuzz` | `cargo fuzz run <target> -- -max_len=1024` | ASan (built-in) |
| Rust | cargo-honggfuzz | `cargo install honggfuzz` | `cargo hfuzz run <target>` | ASan |
| Go 1.18+ | native `go test -fuzz` | built-in | `go test -fuzz=FuzzParse -fuzztime=60s` | race (with `-race`) |
| Python | Atheris (libFuzzer) | `pip install atheris` | `python fuzz_target.py -atheris_runs=100000` | ASan (via libFuzzer) |
| JVM | Jazzer | `pip install jazzer` or Bazel | `jazzer --cp=... --target_class=...` | JVM-level |
| Continuous | OSS-Fuzz | GitHub integration | auto | ASan, UBSan, MSan |
| Continuous | ClusterFuzz | self-hosted | auto | all |
| Coverage analysis | Fuzz Introspector | `pip install fuzz-introspector` | `fuzz-introspector --target=<bin>` | N/A |

## Core Concepts

- **Coverage-guided**: instrument the binary; when an input hits a new branch, add it to the corpus and mutate from there. This is what makes modern fuzzers effective vs. dumb random generation.
- **Corpus**: seed inputs. Quality seeds = faster convergence. Start with valid examples + known edge cases (empty, max-length, unicode, nested).
- **Crash triage**: minimize (`cargo fuzz cmin`, `afl-cmin`, `go test -fuzzminimizetime`), dedupe by stack hash, reproduce with the exact corpus entry.
- **Sanitizers**: ASan (heap/stack UAF, overflows), UBSan (undefined behavior: signed overflow, null deref, misalignment), MSan (uninitialized reads). Always compile fuzz targets with at least ASan.
- **Grammar-based fuzzing**: Nautilus, Grammarinator generate structurally-valid inputs from a grammar — essential for complex formats (SQL, JSON Schema, XML).
- **Persistent mode**: keep the target process alive across iterations (AFL++ `__AFL_LOOP`, libFuzzer `LLVMFuzzerTestOneInput`) — 100–1000× throughput vs. fork-per-input.
- **Fuzz Introspector**: analyzes which code paths the fuzzer *can't* reach, suggesting where to add seeds or refactor for fuzzability.

## Pattern 1: Go Native Fuzz (roundtrip invariant)

```go
package parser

import "testing"

func FuzzParseConfig(f *testing.F) {
    // Seed corpus: valid + edge cases
    f.Add([]byte(`{"host":"localhost","port":8080}`))
    f.Add([]byte(`{}`))
    f.Add([]byte(``))
    f.Add([]byte(`{"host":"` + string(make([]byte, 1024)) + `"}`))

    f.Fuzz(func(t *testing.T, data []byte) {
        cfg, err := Parse(data)
        if err != nil {
            return // parse errors are fine; crashes are not
        }
        // Invariant: roundtrip
        out, err := cfg.Marshal()
        if err != nil {
            t.Fatalf("marshal failed after successful parse: %v", err)
        }
        cfg2, err := Parse(out)
        if err != nil {
            t.Fatalf("re-parse failed: %v (input: %q)", err, out)
        }
        if !cfg.Equal(cfg2) {
            t.Fatalf("roundtrip mismatch:\n  orig=%+v\n  rt=%+v", cfg, cfg2)
        }
    })
}
```

```bash
go test -fuzz=FuzzParseConfig -fuzztime=60s
# failing inputs land in testdata/fuzz/FuzzParseConfig/<hash>
# reproduce: go test -run=FuzzParseConfig/<hash>
# minimize:  go test -fuzz=FuzzParseConfig -fuzzminimizetime=30s
```

Commit only the *failing* corpus entries to `testdata/fuzz/`. The working corpus lives in `$GOCACHE/fuzz` — never commit it.

## Pattern 2: Rust cargo-fuzz (libFuzzer + ASan)

```rust
// fuzz/fuzz_targets/parse_json.rs
#![no_main]
use libfuzzer_sys::fuzz_target;
use mycrate::parser::parse_json;

fuzz_target!(|data: &[u8]| {
    if let Ok(value) = parse_json(data) {
        // Invariant: re-serialize must parse back to the same value
        let s = value.to_string();
        let reparsed = parse_json(s.as_bytes()).expect("reparse failed");
        assert_eq!(value, reparsed, "roundtrip mismatch on input: {:?}", data);
    }
    // parse errors are OK; panics/aborts are caught by libFuzzer
});
```

```bash
cargo install cargo-fuzz
cargo fuzz add parse_json
cargo fuzz run parse_json -- -max_len=4096 -jobs=4
# minimize corpus
cargo fuzz cmin parse_json
# reproduce a specific crasher
cargo fuzz run parse_json fuzz/artifacts/parse_json/crash-<hash>
```

`cargo fuzz` compiles with ASan by default. Add `-s none` only if you have a reason.

## Pattern 3: Python Atheris (libFuzzer for Python)

```python
# fuzz_parse.py
import atheris
import sys
from mypackage.parser import parse_config

def TestOneInput(data: bytes):
    try:
        cfg = parse_config(data)
    except (ValueError, UnicodeDecodeError):
        return  # expected errors
    # Invariant: roundtrip
    try:
        out = cfg.serialize()
        cfg2 = parse_config(out.encode())
        assert cfg == cfg2, f"roundtrip mismatch on {data!r}"
    except Exception as e:
        raise AssertionError(f"invariant violated: {e}") from e

def main():
    atheris.instrument_all()
    atheris.Setup(sys.argv, TestOneInput)
    atheris.Fuzz()

if __name__ == "__main__":
    main()
```

```bash
pip install atheris
python fuzz_parse.py corpus/ -atheris_runs=100000
# or with ASan: ASAN_OPTIONS=detect_leaks=1 python fuzz_parse.py
```

Atheris is libFuzzer under the hood — it instruments Python bytecode for coverage feedback. Slow (~1000 exec/s vs. 100k for C), but effective for pure-Python parsers.

## Pattern 4: C/C++ libFuzzer + UBSan + ASan

```c
// fuzz_parser.c
#include <stdint.h>
#include <stdlib.h>
#include "parser.h"

int LLVMFuzzerTestOneInput(const uint8_t *data, size_t size) {
    ParseResult *r = parse(data, size);
    if (r) {
        // Invariant: parsed length <= input length
        if (r->consumed > size) __builtin_trap();
        // Invariant: re-parse of serialized form must succeed
        uint8_t buf[4096];
        size_t n = serialize(r, buf, sizeof(buf));
        ParseResult *r2 = parse(buf, n);
        if (!r2) __builtin_trap();
        free(r2);
        free(r);
    }
    return 0;
}
```

```bash
clang -fsanitize=fuzzer,address,undefined -g -O1 fuzz_parser.c parser.c -o fuzz_parser
mkdir -p corpus && echo -n '{"a":1}' > corpus/seed1
./fuzz_parser corpus/ -max_len=4096 -jobs=8 -workers=8
# crashers land in ./crash-<sha1>
# reproduce: ./fuzz_parser crash-abc123
```

Always combine `-fsanitize=fuzzer` with `address` and `undefined`. ASan alone misses signed-overflow and null-deref UB.

## Pattern 5: JVM Jazzer + JazzerJUnit

```java
// src/test/java/com/example/FuzzParserTest.java
import com.code_intelligence.jazzer.junit.FuzzTest;
import com.code_intelligence.jazzer.api.FuzzedDataProvider;

class FuzzParserTest {
    @FuzzTest(maxDuration = "60s")
    void parseNeverCrashes(FuzzedDataProvider data) {
        String input = data.consumeRemainingAsUnicodeString();
        try {
            Config cfg = Parser.parse(input);
            // Invariant: roundtrip
            String out = cfg.serialize();
            Config cfg2 = Parser.parse(out);
            if (!cfg.equals(cfg2)) throw new AssertionError("roundtrip mismatch");
        } catch (ParseException e) {
            // expected
        }
    }
}
```

```bash
# Gradle: id 'com.code-intelligence.jazzer' version '0.22.1'
./gradlew jazzerTest --tests FuzzParserTest
```

Jazzer instruments JVM bytecode for coverage. Works with any JVM language (Java, Kotlin, Scala, Clojure).

## Corpus Management

```
fuzz/
├── fuzz_targets/           # target code
├── corpus/                 # seed inputs (committed, small)
│   ├── seed_valid.json
│   ├── seed_empty
│   ├── seed_unicode_emoji
│   └── seed_nested_deep
├── artifacts/              # crashers (committed, minimized)
│   └── parse_json/
│       ├── crash-abc123
│       └── oom-def456
└── workdir/                # fuzzer working state (gitignored)
```

- **Seeds**: 10–50 high-quality inputs covering valid + edge cases. More seeds ≠ better; diversity matters.
- **Crashers**: commit minimized crashers as regression tests (`go test -run=FuzzX/<hash>`).
- **Workdir**: gitignore. CI caches it for warm-start fuzzing.

## CI Integration

| Gate | Duration | Scope | Failure action |
|---|---|---|---|
| PR smoke | 60s | Changed fuzz targets | Block merge |
| Nightly | 4–8h | All targets, parallel jobs | File issue on new crasher |
| OSS-Fuzz (OSS only) | Continuous | All targets | Auto-file issue + bisect |
| Pre-release | 24h | Critical targets | Block release |

```yaml
# PR smoke fuzz (Go example)
- name: Fuzz smoke (60s per target)
  run: |
    for t in $(grep -rl "func Fuzz" --include="*_test.go"); do
      go test -fuzz=Fuzz -fuzztime=60s "$t" || exit 1
    done
```

## Anti-Patterns

- **Fuzz targets touching network/filesystem/global state** — Non-deterministic, slow, pollutes corpus. Keep targets pure: `bytes in → assertion`.
- **No sanitizers** — ASan/UBSan/MSan are free bug multipliers. Never compile a C/C++ fuzz target without at least ASan.
- **Committing the entire generated corpus** — `$GOCACHE/fuzz`, `fuzz/workdir/` can be GBs. Commit only seeds + minimized crashers.
- **Fuzzing without a timeout** — Go's per-exec limit is 1s; slow targets get killed spuriously. Tune `-fuzztime` per target and optimize hot paths.
- **Treating any panic as a bug** — Many panics are legitimate input-validation paths. Assert *invariants*, not "no panic."
- **One-shot fuzzing without corpus persistence** — Each CI run starts cold. Cache the workdir between runs for warm-start.
- **Ignoring Fuzz Introspector** — It tells you which branches the fuzzer *can't* reach. That's where bugs hide.

## Related Skills

- [[csp-property-based-testing]] — Property asserts correctness invariants; fuzz asserts no-crash. Use both on parsers.
- [[csp-security-review]] — STRIDE/OWASP review finds design-level flaws; fuzz finds implementation-level crashes
- [[csp-test-methodology]] — L1 method selection; fuzz fills the "malformed input / crash" blind spot
- [[csp-cpp-testing]] / [[csp-rust-testing]] / [[csp-golang-testing]] / [[csp-python-testing]] — Language test harnesses that host fuzz targets
- [[csp-differential-testing]] — Differential fuzzing: same input to old + new implementation, assert equal output
- [[csp-cicd-pipelines]] — Where to wire smoke/nightly/OSS-Fuzz tiers
