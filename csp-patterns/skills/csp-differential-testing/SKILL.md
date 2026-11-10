---
name: csp-differential-testing
description: >
  Differential testing: run the same input through two or more implementations
  and compare outputs. Shadow traffic (GoReplay, tcpcopy, Envoy mirror), regression
  against a pinned reference, metamorphic relations, database migration diff
  (fresh vs migrated schema), API version diff (openapi-diff, oasdiff), and
  property-based differential (Hypothesis/fast-check + reference impl). Use when
  rewriting a service, upgrading a major dependency, migrating a database, or
  refactoring performance-sensitive code where you need proof of equivalence.
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
  - [[csp-db-migration]]
  - [[csp-db-migration-testing]]
  - [[csp-api-governance]]
  - [[csp-test-methodology]]
  - [[csp-cross-layer-testing]]
  - [[csp-ai-regression-testing]]
  - [[csp-db-state-assertion]]
anti_rationalizations:
  "重写后跑一遍 E2E 就够了": "E2E 只覆盖你想到的路径；差分测试用生产流量或 property 生成覆盖你想不到的输入空间"
  "新旧实现逻辑一样不需要对比": "'一样'是假设不是事实；差分测试把假设变成证据—— divergence 即 bug"
  "影子流量有 PII 风险": "用 redaction middleware 脱敏后再 replay；不脱敏直接 replay 才是风险"
---

# Differential Testing

Prove two implementations agree — or find exactly where they diverge. The "two implementations" can be old vs new, reference vs optimized, migrated vs fresh, v1 vs v2, or even the same code under two different inputs related by a metamorphic transformation.

## When to Activate

- Rewriting a service in another language (Java → Go, Python → Rust)
- Upgrading a major dependency (Postgres 14 → 16, React 17 → 19, Spring Boot 2 → 3)
- Database migration: prove migrated schema + data == fresh schema + data
- API version bump: prove v2 is backward-compatible with v1 consumers
- Performance-sensitive refactor: prove new impl is *correct* before proving it's *fast*
- AI-assisted rewrite: prove the AI-generated code matches the human original
- No oracle available, but you know how output *should change* under input transformation (metamorphic)

## Differential Testing Taxonomy

| Variant | What's compared | Input source | Tooling | Blind spot |
|---|---|---|---|---|
| **N-version** | 2+ independent implementations | Shared test suite | Custom harness | Common-mode bugs (same spec misread) |
| **Shadow traffic** | Prod impl vs candidate impl | Live prod requests (mirrored) | GoReplay, tcpcopy, Envoy mirror | Side effects, PII, non-determinism |
| **Reference regression** | New impl vs pinned "golden" impl | Property-generated or corpus | Hypothesis/fast-check + reference | Reference may itself be buggy |
| **Metamorphic** | Output relations under input transform | Property-generated | Hypothesis, fast-check | Finding the right MR is creative work |
| **Migration diff** | Fresh schema vs migrated schema | `information_schema` dump | pg_dump + apgdiff, Prisma migrate diff | Data-level divergence (not just schema) |
| **API version diff** | OpenAPI v1 vs v2 spec | Spec files | openapi-diff, oasdiff | Runtime behavior (spec may lie) |
| **Property-based differential** | impl_a(x) == impl_b(x) for all x | PBT generators | Hypothesis + two impls | Generator coverage |

## Tool Matrix

| Domain | Tool | Install | Use |
|---|---|---|---|
| Traffic capture/replay | GoReplay 1.3.x | `brew install goreplay` or binary | `gor --input-raw :8080 --output-http staging:8080` |
| Traffic mirror | tcpcopy | build from source | Kernel-level TCP replay |
| Traffic mirror | Envoy `request_mirror_policy` | Envoy 1.30+ | Weighted mirroring in VirtualHost |
| Traffic mirror | Nginx `mirror` module | nginx 1.13+ | `mirror /mirror; mirror_request_body on;` |
| OpenAPI diff | openapi-diff | `brew install openapi-diff` | `openapi-diff old.yaml new.yaml --fail-on-incompatible` |
| OpenAPI diff | oasdiff (Go, richer) | `brew install oasdiff` | `oasdiff breaking old.yaml new.yaml` |
| Postgres schema diff | pg_dump + apgdiff | `apt install apgdiff` | `apgdiff old.sql new.sql` |
| MySQL schema diff | skeema | `brew install skeema` | `skeema diff` |
| Prisma migration diff | `prisma migrate diff` | prisma 5+ | `prisma migrate diff --from-schema-datamodel ... --to-schema-datamodel ... --script` |
| gRPC/Protobuf diff | `buf breaking` | `brew install bufbuild/buf/buf` | `buf breaking --against '.git#branch=main'` |
| Property differential | Hypothesis / fast-check | see [[csp-property-based-testing]] | Generate input, feed both impls, assert equal |
| Sandbox environments | Signadot | SaaS | Ephemeral sandboxes with prod mirroring |

## Pattern 1: Property-Based Differential (Python, rewrite validation)

```python
# tests/differential/test_parser_rewrite.py
from hypothesis import given, settings, strategies as st, HealthCheck
import old_parser       # reference: the battle-tested Python impl
import new_parser       # candidate: the new Rust-backed impl (via PyO3)

# Generate inputs that exercise the full grammar
json_values = st.recursive(
    st.none() | st.booleans() | st.integers() | st.floats(allow_nan=False) | st.text(),
    lambda children: st.lists(children) | st.dictionaries(st.text(), children),
    max_leaves=20,
)

@given(json_values)
@settings(max_examples=5000, suppress_health_check=[HealthCheck.too_slow])
def test_new_parser_matches_reference(value):
    import json
    s = json.dumps(value)
    ref = old_parser.parse(s)
    new = new_parser.parse(s)
    assert ref == new, f"divergence on input {s!r}:\n  ref={ref}\n  new={new}"

@given(st.text(max_size=1000))
@settings(max_examples=5000)
def test_error_paths_also_match(s):
    """Both impls must agree on what's invalid."""
    ref_err = None
    new_err = None
    try: ref = old_parser.parse(s)
    except Exception as e: ref_err = type(e).__name__
    try: new = new_parser.parse(s)
    except Exception as e: new_err = type(e).__name__
    assert (ref_err is None) == (new_err is None), \
        f"error divergence on {s!r}: ref={ref_err} new={new_err}"
```

Key discipline: test **both** the happy path (equal outputs) and the error path (equal acceptance/rejection). A new impl that's "more lenient" silently changes the contract.

## Pattern 2: Shadow Traffic with GoReplay (staging validation)

```bash
# 1. Capture prod traffic (read-only, no response recording)
sudo gor --input-raw :8080 \
  --output-file "requests_%Y%m%d.gor" \
  --request-limit 100000 \
  --middleware ./redact_pii.sh

# 2. Replay to staging (candidate impl)
gor --input-file "requests_20261110.gor" \
  --output-http "http://staging-candidate:8080" \
  --output-http-track-response \
  --http-allow-header "User-Agent: .*" \
  --middleware ./redact_pii.sh

# 3. Compare responses (candidate vs baseline staging)
gor --input-file "requests_20261110.gor" \
  --output-http "http://staging-baseline:8080" \
  --output-file-responses baseline_responses.gor

# 4. Diff
./compare_responses.py baseline_responses.gor candidate_responses.gor \
  --ignore-fields "timestamp,request_id,trace_id" \
  --tolerance 0.001 \
  --report divergence_report.html
```

**Redaction middleware is mandatory**:

```bash
#!/bin/bash
# redact_pii.sh — GoReplay middleware
while read line; do
  echo "$line" | \
    sed -E 's/"email":"[^"]*"/"email":"REDACTED"/g' | \
    sed -E 's/"ssn":"[^"]*"/"ssn":"REDACTED"/g' | \
    sed -E 's/Authorization: Bearer [^\r\n]*/Authorization: Bearer REDACTED/g'
done
```

Shadow traffic must **never** hit real side effects. Point the candidate at a stub backend for writes, or use read-only replay (`--output-http-track-response` without committing).

## Pattern 3: Envoy Request Mirroring (weighted, in-mesh)

```yaml
# envoy-config.yaml — mirror 10% of prod traffic to candidate
route_config:
  virtual_hosts:
    - name: checkout
      domains: ["checkout.internal"]
      routes:
        - match: { prefix: "/" }
          route:
            cluster: checkout-v1
            timeout: 5s
          request_mirror_policies:
            - cluster: checkout-v2-candidate
              runtime_fraction:
                default_value: { numerator: 10, denominator: HUNDRED }
              trace_sampled: true
```

Candidate responses are **discarded** (mirrored requests don't return to the client). Compare via logs/metrics: emit a `mirror_divergence` counter when candidate response differs from baseline.

## Pattern 4: Database Migration Diff (schema + data)

```bash
# Schema diff: fresh DB vs migrated DB
createdb fresh && createdb migrated
psql fresh   -f schema_v2.sql                    # apply new schema from scratch
psql migrated -f schema_v1.sql                   # apply old schema
psql migrated -f migrations/001_add_email.sql    # apply migration

# Dump both schemas, normalize, diff
pg_dump --schema-only fresh   | grep -v '^--' | sort > fresh.sql
pg_dump --schema-only migrated | grep -v '^--' | sort > migrated.sql
diff fresh.sql migrated.sql && echo "✅ Schema equivalent" || echo "❌ Schema diverged"

# Data diff: row counts + checksums
for table in users orders products; do
  fresh_count=$(psql fresh -tAc "SELECT count(*) FROM $table")
  migrated_count=$(psql migrated -tAc "SELECT count(*) FROM $table")
  [ "$fresh_count" = "$migrated_count" ] || echo "❌ $table count mismatch: $fresh_count vs $migrated_count"

  fresh_sum=$(psql fresh -tAc "SELECT md5(string_agg(id::text || coalesce(email,''), ',' ORDER BY id)) FROM $table")
  migrated_sum=$(psql migrated -tAc "SELECT md5(string_agg(id::text || coalesce(email,''), ',' ORDER BY id)) FROM $table")
  [ "$fresh_sum" = "$migrated_sum" ] || echo "❌ $table checksum mismatch"
done
```

Pair with [[csp-db-migration-testing]] for the full migration verification story (rollback rehearsal, squawk lint, expand-contract gates).

## Pattern 5: OpenAPI Version Diff (breaking-change gate)

```bash
# oasdiff: richer output, severity levels
oasdiff breaking openapi-v1.yaml openapi-v2.yaml
# exits non-zero on breaking changes

# With changelog generation
oasdiff changelog openapi-v1.yaml openapi-v2.yaml --format markdown > CHANGELOG.md

# openapi-diff: HTML report for human review
docker run --rm -v $PWD:/specs openapitools/openapi-diff:latest \
  /specs/v1.yaml /specs/v2.yaml --html /specs/report.html --fail-on-incompatible

# CI gate
- name: API breaking-change check
  run: |
    git show origin/main:openapi.yaml > /tmp/v1.yaml
    oasdiff breaking /tmp/v1.yaml openapi.yaml --fail-on=breaking
```

`oasdiff` (2024+) overtook `openapi-diff` in features: changelog generation, breaking-change severity levels, GitHub PR comment integration.

## Pattern 6: Metamorphic Testing (no oracle needed)

When you can't compute the expected output, assert *relations* between outputs of related inputs:

```python
from hypothesis import given, strategies as st

@given(st.lists(st.floats(allow_nan=False, allow_infinity=False), min_size=1),
       st.floats(min_value=-1000, max_value=1000))
def test_mean_shift_invariance(xs, c):
    """MR: mean(xs + c) == mean(xs) + c"""
    assert abs(mean([x + c for x in xs]) - (mean(xs) + c)) < 1e-9

@given(st.text(alphabet=st.characters(whitelist_categories=("L", "N"))))
def test_search_case_insensitive(query):
    """MR: search(q) == search(q.upper()) for case-insensitive search"""
    assert search(query) == search(query.upper())

@given(st.lists(st.integers(), min_size=1))
def test_sort_permutation_invariance(xs):
    """MR: sort(shuffle(xs)) == sort(xs)"""
    import random
    shuffled = xs.copy()
    random.shuffle(shuffled)
    assert sort(shuffled) == sort(xs)
```

Metamorphic relations are the go-to for ML models, search engines, compilers, and numerical code where exact output is unknowable but *behavioral invariants* are.

## Normalization: Handling Non-Deterministic Outputs

Differential testing fails on non-determinism unless you normalize:

```python
NORMALIZE_FIELDS = {
    "timestamp": lambda _: "<TS>",
    "request_id": lambda _: "<REQ_ID>",
    "trace_id": lambda _: "<TRACE_ID>",
    "uuid": lambda v: "<UUID>" if is_uuid(v) else v,
    "duration_ms": lambda v: round(v, -1),  # bucket to 10ms
}

def normalize(obj, path=""):
    if isinstance(obj, dict):
        return {k: normalize(v, f"{path}.{k}") for k, v in obj.items()}
    if isinstance(obj, list):
        return [normalize(v, f"{path}[]") for v in obj]
    for field, fn in NORMALIZE_FIELDS.items():
        if path.endswith(field):
            return fn(obj)
    return obj
```

Apply normalization to both sides before diffing. Document every normalized field — each one is a place where divergence could hide.

## CI Integration

| Gate | Scope | Frequency | Failure action |
|---|---|---|---|
| PR | OpenAPI diff vs main | Every PR touching `openapi.yaml` | Block merge |
| PR | Property differential (500 examples) | Every PR touching rewrite module | Block merge |
| Pre-merge | Migration diff (fresh vs migrated) | Every PR touching `migrations/` | Block merge |
| Nightly | Shadow traffic replay (10k requests) | Daily | File issue on divergence |
| Pre-release | Full differential suite (50k examples + shadow) | Before tag | Block release |

## Anti-Patterns

- **Replaying prod traffic containing PII without redaction** — Legal exposure. Always run a redaction middleware; audit it regularly.
- **Diffing non-deterministic outputs without normalization** — Timestamps, UUIDs, ordering, durations. Normalize or the diff is noise.
- **Shadow traffic hitting real side effects** — Writes, emails, payments. Point shadow at a stub backend or use read-only replay.
- **Ignoring performance divergence** — New impl may be correct but 5× slower. Diff latency histograms alongside response bodies.
- **Not versioning the reference** — Pin by git SHA or Docker digest. "Latest main" is a moving target; you can't reproduce a divergence.
- **Differential test that re-implements the SUT** — If your "reference" is a copy of the new impl, you're testing nothing. The reference must be *independently derived*.
- **Treating any divergence as a bug** — Sometimes the new impl is *more correct*. Triage each divergence: bug in new, bug in old, or intentional improvement.

## Related Skills

- [[csp-property-based-testing]] — Property generators are the input source for differential tests
- [[csp-db-migration]] — Migration authoring; differential testing proves the migration is correct
- [[csp-db-migration-testing]] — Migration verification harness; differential is one technique within it
- [[csp-api-governance]] — API versioning policy; oasdiff/openapi-diff enforce it
- [[csp-test-methodology]] — L1 method selection; differential fills the "rewrite/upgrade equivalence" blind spot
- [[csp-cross-layer-testing]] — Cross-layer verifies data flow; differential verifies impl equivalence
- [[csp-ai-regression-testing]] — AI rewrites are exactly where differential testing earns its keep
- [[csp-db-state-assertion]] — Assert DB state after migration; differential asserts state *matches* fresh schema
