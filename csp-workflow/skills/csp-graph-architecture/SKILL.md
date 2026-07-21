---
name: csp-graph-architecture
description: "Codebase architecture analysis via knowledge graph. Use when onboarding to a codebase, understanding module boundaries, detecting coupling issues, identifying hub/bridge nodes, or generating architecture documentation. Covers community detection, centrality analysis, surprise scoring, and visualization."
layer: 2
category: workflow
version: 1.0.0
phase: define
domain: architecture
role: architect
scope: analysis
tools: [Bash, Read, Glob, Grep]
triggers:
  keywords: ["architecture", "codebase structure", "community detection", "coupling", "module boundaries", "hub detection", "who calls what", "onboarding"]
  intents: ["user wants to understand codebase architecture", "user is onboarding to new codebase", "user wants to detect architectural issues"]
  patterns: ["get_architecture_overview", "list_communities", "query_graph"]
dependencies:
  skills: [csp-code-graph, csp-graph-build]
related_skills: [csp-graph-impact, csp-graph-refactor, csp-code-review]
---

# Architecture Analysis via Code Graph

Understand codebase structure through the knowledge graph: detect natural module boundaries (communities), identify architectural hubs and bridges, measure coupling, score structural surprises, and generate architecture documentation. Essential for onboarding, refactoring planning, and architectural decision-making.

## When to Use

- Onboarding to an unfamiliar codebase
- Before a major refactoring (understand what's coupled to what)
- Detecting architectural drift (unexpected cross-module dependencies)
- Identifying single points of failure (hub nodes)
- Generating architecture documentation for the team
- Deciding where to draw module/service boundaries

## Phase 1: Architecture Overview

Get the high-level structural summary:

```bash
# Full architecture overview
code-review-graph architecture

# Summary stats only
code-review-graph architecture --brief
```

### Output

```
Architecture Overview:
  Nodes: 3,847 | Edges: 12,453 | Files: 342
  Communities: 14 (Leiden algorithm, resolution=1.0)
  Avg community size: 274 nodes
  Cross-community edges: 1,247 (10% of total)
  
  Top hubs (by betweenness centrality):
    1. src/core/event_bus.py::dispatch (0.342) — routes all events
    2. src/auth/middleware.py::authenticate (0.287) — gates all protected routes
    3. src/db/connection.py::get_session (0.231) — shared DB access
  
  Bridge nodes (cross-community connectors):
    - src/api/router.py::mount_routes — connects api-community ↔ auth-community
    - src/core/config.py::get_config — connects 8 communities (god object risk)
```

## Phase 2: Community Detection

Communities are clusters of tightly-coupled code that naturally belong together:

```bash
# List all communities with summaries
code-review-graph communities list

# Detail for a specific community
code-review-graph communities show auth-cluster

# Community membership for a file
code-review-graph communities membership src/auth/token.py
```

### Algorithm

- **Leiden algorithm** with edge weights (CALLS=1.0, INHERITS=0.9, etc.)
- Fixed random seed for reproducibility
- Auto-split oversized communities (> 25% of graph)
- File-based grouping fallback for small graphs

### Community Report

```
Community: auth-cluster (size: 47 nodes, 6 files)
  Core: validate_token, refresh_token, issue_session, revoke_session
  Periphery: format_token_response, parse_auth_header
  Tests: test_auth.py (12 tests), test_session.py (8 tests)
  
  Inbound edges (who depends on this community):
    - api-community: 23 edges (auth_middleware calls validate_token)
    - admin-community: 8 edges (admin routes check permissions)
  
  Outbound edges (what this community depends on):
    - db-community: 12 edges (session storage)
    - config-community: 4 edges (token expiry settings)
  
  Coupling score: 0.34 (moderate — acceptable for auth)
```

## Phase 3: Centrality & Hub Analysis

Identify structurally critical nodes:

```bash
# Hub detection (high fan-in + high betweenness)
code-review-graph analysis hubs

# Bridge detection (cross-community connectors)
code-review-graph analysis bridges

# Knowledge gaps (complex nodes with no tests)
code-review-graph analysis gaps
```

### Hub Classification

| Type | Signal | Risk | Action |
|------|--------|------|--------|
| **Fan-in hub** | > 20 callers | Change breaks many consumers | Stabilize interface, add contract tests |
| **Betweenness hub** | On many shortest paths | Single point of failure | Consider redundancy or decomposition |
| **Bridge node** | Connects 3+ communities | Coupling amplifier | Evaluate if boundary is correct |
| **God object** | High in all metrics | Architectural debt | Priority refactoring target |

### Knowledge Gap Detection

```
Knowledge gaps (complex + untested):
  [CRITICAL] src/core/event_bus.py::dispatch
    - Betweenness: 0.342 (top hub)
    - Callers: 89
    - Tests: 0
    - Recommendation: Add integration tests immediately
  
  [HIGH] src/payment/webhook.py::handle_callback
    - On payment-flow (criticality 0.95)
    - Callers: 3 (but high-traffic)
    - Tests: 1 (happy path only)
    - Recommendation: Add error/edge case tests
```

## Phase 4: Surprise Scoring

Detect unexpected structural relationships that violate architectural intent:

```bash
# Find surprising edges
code-review-graph analysis surprises
```

### Surprise Categories

| Category | Definition | Example |
|----------|-----------|---------|
| **Cross-community** | Edge between unrelated clusters | UI component directly calls DB layer |
| **Cross-language** | Unexpected polyglot coupling | Python service imports JS config |
| **Peripheral-to-hub** | Leaf node depends on critical hub | Test helper imports production auth |
| **Backward dependency** | Lower layer depends on higher | DB layer imports API types |

### Output

```
Surprises (severity-sorted):
  [HIGH] src/ui/components/UserCard.tsx → src/db/queries.py::get_user
    Type: cross-community (ui-community → db-community, skipping api-community)
    Suggestion: Route through API layer
  
  [MEDIUM] tests/helpers/mock_auth.py → src/auth/token.py::validate_token
    Type: peripheral-to-hub (test helper depends on production hub)
    Suggestion: Use interface/mock instead of real implementation
```

## Phase 5: Visualization

Generate interactive architecture diagrams:

```bash
# D3.js force-directed graph (self-contained HTML)
code-review-graph visualize --output architecture.html

# Community-colored view
code-review-graph visualize --color-by community

# Dependency direction view
code-review-graph visualize --layout hierarchical
```

### Wiki Generation

```bash
# Generate markdown wiki from community structure
code-review-graph wiki --output docs/architecture/
```

Produces per-community pages with: purpose, core nodes, dependencies, test coverage, and coupling metrics.

## Phase 6: Temporal Analysis (Graph Diffing)

Compare architecture over time:

```bash
# Snapshot current graph
code-review-graph snapshot --tag v2.1

# Compare with previous snapshot
code-review-graph diff v2.0 v2.1
```

### Output

```
Architecture drift v2.0 → v2.1:
  New nodes: +142 (mostly in api-community)
  Removed nodes: -23 (deprecated utils cleaned up)
  New edges: +387
  Community changes:
    - api-community grew 40% (possible split needed)
    - auth-community stable
    - NEW: notifications-community (emerged from api-community)
  Coupling trend: +12% cross-community edges (watch for drift)
```

## Integration Points

- **Onboarding:** Run architecture overview + community list → generate wiki → new team member reads wiki
- **Refactoring:** Identify hubs + surprises → plan decomposition → validate with `csp-graph-refactor`
- **Review:** Community context explains why a cross-boundary change is risky (feeds `csp-graph-review`)
- **Planning:** Temporal analysis shows architectural trends → inform roadmap decisions
