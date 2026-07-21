---
name: csp-graph-impact
description: "Graph-powered change impact analysis. Use when a diff or PR is ready and you need to understand blast radius, affected execution flows, and downstream dependents before reviewing. Covers change detection, weighted BFS traversal, flow tracing, and risk scoring."
layer: 2
category: workflow
version: 1.0.0
phase: review
domain: quality
role: specialist
scope: analysis
tools: [Bash, Read, Grep, Glob]
triggers:
  keywords: ["blast radius", "impact analysis", "what does this affect", "change impact", "affected files", "downstream impact", "flow tracing"]
  intents: ["user wants to understand what a change affects", "user wants blast radius before review"]
  patterns: ["detect_changes", "get_impact_radius", "get_affected_flows"]
dependencies:
  skills: [csp-code-graph, csp-graph-build]
related_skills: [csp-graph-review, csp-graph-architecture, csp-code-review]
anti_rationalizations:
  "It's just a one-line change": "One-line changes in hub functions can cascade to 50+ dependents. Check the graph."
  "I know nothing else uses this": "The graph knows better — it tracks all callers, including dynamic references and test coverage."
---

# Graph-Powered Impact Analysis

Given a set of changes (diff, PR, or file list), compute the **blast radius** — every function, class, test, and execution flow affected by the change. This is the critical step between "I have a diff" and "I'm ready to review": it tells you where to focus review attention.

## When to Use

- A PR or branch diff is ready for review
- Before merging, to verify no unexpected downstream breakage
- When a "small" change touches a shared utility or base class
- To identify which tests should run for a given change
- To trace how a bug fix propagates through execution flows

## Phase 1: Change Detection

Map raw git diffs to affected graph nodes with risk scoring:

```bash
# Detect changes with risk scores
code-review-graph detect-changes --brief

# Against a specific base
code-review-graph detect-changes --base main

# For a PR
code-review-graph detect-changes --pr 142
```

### Output Structure

```
Changed nodes (risk-sorted):
  [HIGH]   src/auth/token.py::validate_token     (hub: 23 callers, 3 flows)
  [MEDIUM] src/auth/token.py::refresh_token      (4 callers, 1 flow)
  [LOW]    src/utils/format.py::format_date      (2 callers, 0 flows)

Risk factors:
  - validate_token: security-relevant (auth), high fan-in, on critical flow
  - refresh_token: moderate fan-in, touches session state
  - format_date: leaf function, no security relevance
```

### Risk Scoring Formula

```
risk = base_weight
     + fan_in_factor (callers × 0.1)
     + flow_factor (on_critical_flow × 0.3)
     + security_factor (security_keyword × 0.4)
     + test_gap_factor (untested × 0.2)
     + community_bridge_factor (crosses_community × 0.2)
```

## Phase 2: Blast Radius (Weighted BFS)

From each changed node, traverse the graph outward to find all affected nodes:

```bash
# Get impact radius for changed nodes
code-review-graph impact-radius --depth 2

# For a specific function
code-review-graph impact-radius --node "src/auth/token.py::validate_token"
```

### Algorithm

1. **Seed** — all qualified names in changed files
2. **Forward BFS** — what does this node affect? (callers, dependents)
3. **Reverse BFS** — what depends on this node? (callees that might break)
4. **Weighted traversal** — edge weights × depth decay (0.6 per hop)
5. **Cutoff** — stop when accumulated weight < threshold (default 0.1)

### Depth Semantics

| Depth | Meaning | Use when |
|-------|---------|----------|
| 1 | Direct callers/importers only | Quick sanity check |
| 2 | Callers of callers (default) | Standard review |
| 3 | Full cascade | Critical infrastructure changes |

### Output

```
Blast radius for validate_token (depth=2):
  Direct (depth 1): 23 nodes
    - src/api/middleware.py::auth_middleware [CALLS, w=1.0]
    - src/api/routes.py::protected_route [CALLS, w=1.0]
    - tests/test_auth.py::test_valid_token [TESTED_BY, w=0.7]
    ...
  Indirect (depth 2): 41 nodes
    - src/api/handlers.py::user_profile [CALLS←auth_middleware, w=0.6]
    - src/api/handlers.py::settings [CALLS←auth_middleware, w=0.6]
    ...
  Total impacted: 64 nodes across 12 files
  Affected tests: 8 (run these!)
  Affected flows: 3 (auth-flow, user-profile-flow, settings-flow)
```

## Phase 3: Execution Flow Tracing

Identify which end-to-end execution flows pass through the changed code:

```bash
# List all flows affected by changes
code-review-graph affected-flows

# Trace a specific flow
code-review-graph flow get auth-flow

# List all known flows with criticality
code-review-graph flows list
```

### Flow Criticality Scoring

Flows are scored by:
- **Security keywords** in path (auth, payment, permission) → +0.4
- **Test coverage** of flow nodes → -0.2 if fully covered, +0.3 if uncovered
- **Depth** — longer flows are more fragile → +0.05 per hop
- **Fan-out** — flows that branch widely are harder to verify → +0.1 per branch

### Output

```
Affected flows (criticality-sorted):
  [0.92] auth-flow: login → validate_token → issue_session → set_cookie
         ⚠ validate_token changed, 2/4 nodes tested
  [0.61] user-profile-flow: auth_middleware → get_user → render_profile
         ⚠ auth_middleware depends on changed validate_token
  [0.34] health-check-flow: ping → status → respond
         ✓ No direct impact, indirect via shared middleware
```

## Phase 4: Test Gap Analysis

Cross-reference blast radius with test coverage:

```bash
# Which impacted nodes lack test coverage?
code-review-graph impact-radius --show-test-gaps
```

### Output

```
Test gaps in blast radius:
  UNTESTED: src/auth/token.py::refresh_token (4 callers, on auth-flow)
  UNTESTED: src/api/middleware.py::rate_limit_check (12 callers)
  COVERED:  src/auth/token.py::validate_token (3 tests)
  STALE:    tests/test_auth.py::test_valid_token (tests old signature)

Recommendation: Add tests for refresh_token before merge (HIGH risk, untested, on critical flow)
```

## Phase 5: Impact Summary for Review

Assemble the impact analysis into a review-ready brief:

```markdown
## Impact Analysis Summary

**Changes:** 3 files, 2 functions modified, 1 added
**Blast radius:** 64 nodes, 12 files, depth 2
**Affected flows:** 3 (1 critical: auth-flow)
**Test coverage:** 6/8 impacted tests exist, 2 gaps (refresh_token, rate_limit_check)
**Risk level:** HIGH (security-relevant hub function modified)

### Review Focus Areas
1. `validate_token` — 23 callers depend on its contract; verify backward compat
2. `auth_middleware` — passes new params; check all 12 route handlers still work
3. Missing tests for `refresh_token` — blocking for merge

### Suggested Test Command
pytest tests/test_auth.py tests/test_middleware.py -v
```

## Integration Points

- **Upstream:** `csp-graph-build` (graph must be fresh)
- **Downstream:** `csp-graph-review` (impact brief feeds review context)
- **Parallel:** `csp-graph-architecture` (community context explains why blast radius crosses boundaries)
