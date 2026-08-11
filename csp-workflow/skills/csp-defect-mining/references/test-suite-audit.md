# Reference: Test-Suite Audit for Diversity Blind Spots

How to assess whether an existing test suite is **effective** (finds bugs) vs
merely **present** (high coverage %, low discovery). This is the `csp-defect-mining`
companion to `csp-codebase-audit`'s engineering-quality dimension — it deepens
the "test quality" finding into actionable methodology gaps.

---

## The Diversity Audit (5 checks)

### Check 1 — Method census (is only one method present?)

Count test files by method. A healthy suite has tests from ≥3 layers of the
[4-layer methodology](./methods.md).

```bash
# rough census by signal in test file names + content
echo "unit/bva:       $(find test -name '*.test.*' | wc -l)"
echo "property:      $(grep -rlE 'property|fast-check|hypothesis|proptest|jqwik' test 2>/dev/null | wc -l)"
echo "fuzz:          $(grep -rlE 'fuzz|adversarial|50k|prototype' test 2>/dev/null | wc -l)"
echo "mutation:      $(ls .stryker* mutmut* .mutmut* 2>/dev/null | wc -l)"
echo "state-machine: $(grep -rlE 'state.machine|transition|illegal.*transition' test 2>/dev/null | wc -l)"
echo "e2e/bootstrap: $(find test -name '*.e2e.*' -o -name '*.integration.*' | wc -l)"
```

**Smell**: if >90% of tests are unit and 0 are property/fuzz/mutation, the suite
has a **diversity blind spot** — it will plateau at 0 new bugs and miss
parser/state-machine/silent-fallback bugs.

### Check 2 — Mutation kill-rate on key functions

Pick the 5 highest-risk functions (financial calc, parser entry, authz gate,
state-machine transition, serializer). Run mutation testing (or manual mutants)
on just those 5.

- **Kill-rate ≥ 80%** on key functions → suite is strong there.
- **Kill-rate < 50%** on a key function → the tests don't actually assert its
  behavior; treat as untested.
- **Equivalent mutants** — triage manually, exclude from the denominator.

### Check 3 — Silent-fallback coverage

```bash
# enumerate every silent fallback in non-test code
grep -rnE 'catch\s*\{\s*\}|\?\?\s|\\|\\|\s*0|\?\.' src --include='*.ts' --include='*.js'
```

For each hit, grep the test suite for a test that forces that fallback:
```bash
for hit in $(grep -rnE 'catch\s*\{\s*\}' src | cut -d: -f1); do
  echo "$hit fallback tested? $(grep -rl "$(basename $hit)" test | wc -l)"
done
```

**Smell**: silent fallbacks with 0 forcing-tests = silent-failure bugs waiting
to happen (the `Number(x) || 0` → "duty-free" pattern).

### Check 4 — Happy-path bias in state machines

For every status/state field with a workflow (draft/review/published/archived):

1. Find the canonical transition function (e.g. `publishNow`).
2. Check: is there a test that PATCHes the status field DIRECTLY to a terminal
   value (bypassing the transition function)?
   - **No such test** → the suite has happy-path bias; the illegal-transition
     bug class is untested (and likely present in the code).

### Check 5 — Comparator/tooling self-test

The test HELPERS (custom equality matchers, serializers, mock factories) are
themselves code. Are they tested?

- A custom `deepEqual` that drops `undefined` is a bug in the TOOL that masks
  bugs in the code under test.
- **Check**: are test helpers covered by their own unit tests? If a helper
  compares with `JSON.stringify`, mutation-test THAT too.

---

## Plateau Detection (when to switch methods)

Track bugs-found-per-round per method. The signal to switch:

| Round | Method | Bugs found | Action |
|-------|--------|-----------|--------|
| 1 | unit | 4 | continue |
| 2 | unit | 2 | continue |
| 3 | unit | 0 | **switch** → mutation |
| 4 | mutation + error-path | 3 | continue |
| 5 | fuzz + state-transition | 6 | continue |
| 6 | … | 0 | switch → system-level |

**Rule**: 2 consecutive 0-yield rounds on a method → descend a layer. Don't
write a 4th unit-test round hoping for output — the bugs aren't there.

---

## The Test-Suite Audit Report (output)

`docs/analysis/test-suite-audit-{date}.md`:

```markdown
# Test-Suite Audit ({project}, {date})

## Method census
| Method | Files | % | Verdict |
|--------|------|---|---------|
| unit   | 120  | 89% | over-weighted |
| property | 2 | 1% | gap |
| fuzz | 0 | 0% | gap |
| mutation | 0 | - | gap |
| state-machine | 1 | 1% | gap |

## Key-function mutation kill-rate
| Function | Mutants | Killed | Kill-rate | Verdict |
|----------|---------|--------|-----------|---------|
| parseLlmJson | 18 | 9 | 50% | weak — tests miss array branch |
| reserveStock | 12 | 11 | 92% | strong |
| updatePost | 15 | 4 | 27% | critical — PATCH status path untested |

## Silent-fallback coverage
- 47 silent fallbacks in src/
- 9 have forcing-tests (19%) → 38 untested fallbacks (silent-failure risk)

## Happy-path bias
- `Post.status` workflow: publishNow tested; direct PATCH to published UNTESTED
  → likely bug (forge "already published")

## Plateau signal
- Last 2 unit-test rounds: 0 bugs → switch to mutation/fuzz/state-transition.

## Recommendations (prioritized)
1. P0: add state-transition tests for Post.status (5 likely bugs).
2. P0: add forcing-tests for the 12 financial silent-fallbacks (silent-zero risk).
3. P1: mutation-test the 5 key functions; raise kill-rate >80%.
4. P1: add property tests for the 3 pure financial functions.
5. P2: add a fuzz harness for parseLlmJson.
```

---

## How this plugs into `csp-codebase-audit`

When auditing dimension ⑤ (engineering quality) and the suite has high coverage
but low diversity, invoke `csp-defect-mining` to:
1. Run the 5 diversity checks above.
2. Produce the test-suite-audit report.
3. Feed the prioritized recommendations into the audit's upgrade plan (P0/P1).
```
