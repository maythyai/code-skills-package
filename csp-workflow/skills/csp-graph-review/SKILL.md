---
name: csp-graph-review
description: "Graph-powered code review with minimal context assembly and risk scoring. Use when reviewing a PR or diff with graph support — assembles only the code the reviewer needs, scores risk structurally, and runs pre-merge checks. Enhances csp-code-review with structural awareness."
layer: 2
category: workflow
version: 1.0.0
phase: review
domain: quality
role: reviewer
scope: review
tools: [Bash, Read, Grep, Glob, Agent]
triggers:
  keywords: ["graph review", "review with context", "pre-merge check", "PR review", "risk score", "review context"]
  intents: ["user wants to review a PR with structural context", "user wants pre-merge readiness check"]
  patterns: ["get_review_context", "pre_merge_check"]
dependencies:
  skills: [csp-code-graph, csp-graph-impact]
related_skills: [csp-code-review, csp-multi-review, csp-graph-build]
anti_rationalizations:
  "I'll just read the whole file": "The graph assembles exactly the functions you need — callers, callees, tests — in 1/80th the tokens."
  "Risk scoring is overkill for this PR": "Structural risk (hub modification, security path, test gap) catches what visual review misses."
---

# Graph-Powered Code Review

Assemble **minimal, structurally-aware review context** from the knowledge graph, then apply the six review dimensions (from `csp-code-review`) with full awareness of blast radius, execution flows, and test coverage. This skill bridges raw impact data and actionable review findings.

## When to Use

- Reviewing a PR with graph support available
- Running a pre-merge readiness check
- Assembling review context without reading entire files
- Scoring a change's structural risk before deep review
- Generating a review brief for human reviewers

## Phase 1: Context Assembly

The graph provides **minimal review context** — only the code that matters:

```bash
# Get review context for current changes
code-review-graph review-context

# For a specific PR
code-review-graph review-context --pr 142

# With expanded depth (include callers-of-callers)
code-review-graph review-context --depth 2
```

### Context Components

The assembled context includes (in priority order):

1. **Changed code** — the actual diff with surrounding function context
2. **Direct callers** — functions that call the changed code (contract dependents)
3. **Interface contracts** — type signatures, protocols, ABCs the code implements
4. **Test coverage** — existing tests for changed functions
5. **Flow context** — the execution flow(s) the change sits on
6. **Sibling patterns** — how similar functions in the same community handle the same concern

### Token Budget

| Context level | Tokens (typical) | Use when |
|---------------|-------------------|----------|
| Minimal (changed only) | ~500 | Quick sanity check |
| Standard (+ callers + tests) | ~2,000 | Normal review |
| Expanded (+ flows + siblings) | ~5,000 | Critical path review |
| Full (naive file read) | ~40,000+ | Fallback only |

## Phase 2: Structural Risk Scoring

Before deep review, compute a structural risk score:

```bash
# Risk assessment for current changes
code-review-graph risk-assess
```

### Risk Dimensions

| Dimension | Signal | Weight |
|-----------|--------|--------|
| **Fan-in** | Number of callers (hub = risky) | 0.25 |
| **Security path** | On auth/payment/permission flow | 0.25 |
| **Test gap** | Changed code lacks test coverage | 0.20 |
| **Cross-community** | Change spans multiple clusters | 0.15 |
| **Contract change** | Modifies public interface/signature | 0.15 |

### Risk Levels

| Score | Level | Review action |
|-------|-------|---------------|
| 0.0–0.3 | LOW | Standard review, single reviewer sufficient |
| 0.3–0.6 | MEDIUM | Thorough review, check all callers |
| 0.6–0.8 | HIGH | Multi-reviewer, require test coverage |
| 0.8–1.0 | CRITICAL | Full multi-review + manual sign-off |

## Phase 3: Graph-Enhanced Review

Apply the six review dimensions from `csp-code-review`, augmented with graph intelligence:

### 1. Correctness (graph-enhanced)

- Check changed function against **all callers** (from graph) — does the contract still hold?
- Verify **return type consumers** handle new edge cases
- Trace the **execution flow** end-to-end for the riskiest path
- Check **sibling functions** in the same community for consistency

### 2. Reuse (graph-enhanced)

- Query graph for **similar signatures** in the codebase
- Check if the new code **duplicates** an existing node's functionality
- Verify **import edges** — is the author importing something that already exists locally?

### 3. Simplification (graph-enhanced)

- Check **fan-out** — does this function call too many things? (complexity signal)
- Identify **dead edges** — are there callers that no longer exist?
- Detect **redundant paths** — multiple routes to the same outcome

### 4. Efficiency (graph-enhanced)

- Check if changed code is on a **hot flow** (high-traffic execution path)
- Identify **N+1 patterns** via call graph (function called in a loop)
- Verify **caching opportunities** — is this pure function called repeatedly?

### 5. Security (graph-enhanced)

- Is the change on a **security-critical flow**? (auth, payment, permission)
- Does it modify a **trust boundary** node? (middleware, validator, sanitizer)
- Are there **untested paths** in the security flow?

### 6. Testability (graph-enhanced)

- Which **existing tests** cover the changed code? (from TESTED_BY edges)
- What's the **test gap**? (impacted nodes without TESTED_BY edges)
- Are tests **stale**? (test references old signature)

## Phase 4: Pre-Merge Check

Final gate before merge:

```bash
# Pre-merge readiness check
code-review-graph pre-merge-check
```

### Checklist

```
Pre-Merge Readiness:
  [✓] Graph is fresh (updated 2 min ago)
  [✓] All changed functions have callers verified
  [!] Test gap: refresh_token has no test (HIGH risk)
  [✓] No contract-breaking signature changes
  [✓] No cross-community coupling introduced
  [!] Security: validate_token modified on auth-flow (needs security reviewer)
  [✓] No dead code introduced
  [✓] Execution flows intact (3/3 pass static trace)

Verdict: READY WITH CONDITIONS
  - Add test for refresh_token
  - Get security reviewer sign-off on validate_token
```

## Phase 5: Review Report Generation

Assemble findings into a structured report:

```markdown
## Graph-Powered Review Report

**PR:** #142 — Refactor token validation
**Risk Score:** 0.72 (HIGH)
**Blast Radius:** 64 nodes, 12 files, 3 flows
**Context Tokens:** 2,140 (vs ~45,000 naive = 21x savings)

### Structural Context
- Changed: validate_token (hub, 23 callers)
- Flow: auth-flow (criticality 0.92)
- Test coverage: 75% of impacted nodes

### Findings
| # | Severity | Dimension | Finding | Graph Evidence |
|---|----------|-----------|---------|----------------|
| 1 | blocking | Correctness | Return type changed, 3 callers expect old type | callers: middleware, route_handler, cli_auth |
| 2 | blocking | Security | Token expiry check removed from validate_token | on auth-flow, security-critical |
| 3 | suggestion | Reuse | Duplicates logic in verify_signature (same community) | community: auth-cluster |

### Pre-Merge Gate
- [ ] Fix blocking findings
- [ ] Add test for refresh_token
- [ ] Security reviewer sign-off
```

## Integration with csp-multi-review

When running multi-review, this skill provides **Stage 0** context:

1. Run impact analysis → feed blast radius into reviewer selection
2. Assemble minimal context → each reviewer gets only relevant code
3. Risk score → determines which reviewers are mandatory
4. Pre-merge check → final validation after all reviewers complete

## Fallback Behavior

If the graph is unavailable (not built, tool not installed):
- Fall back to `csp-code-review` for manual review methodology
- Use `git diff` + manual import tracing for scope
- Note in report: "Graph unavailable — review based on diff only, structural risk unknown"
