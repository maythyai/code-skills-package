---
name: csp-code-graph
description: "Code knowledge graph methodology and lifecycle orchestration. Use when starting a code review session, exploring codebase structure, or deciding which graph-powered analysis to run. Routes to the correct lifecycle stage: build, impact, review, architecture, or refactor."
layer: 1
category: meta
version: 1.0.0
phase: review
domain: architecture
role: architect
scope: analysis
tools: [Read, Grep, Glob, Bash, Agent]
triggers:
  keywords: ["code graph", "knowledge graph", "graph review", "blast radius", "impact analysis", "code structure", "architecture overview"]
  intents: ["user wants graph-powered code review", "user wants to understand codebase structure", "user wants to assess change impact"]
  context: ["session_start"]
related_skills: [csp-graph-build, csp-graph-impact, csp-graph-review, csp-graph-architecture, csp-graph-refactor, csp-code-review, csp-multi-review]
anti_rationalizations:
  "I'll just grep the codebase": "Graph traversal finds structural relationships (callers, dependents, test coverage) that text search cannot. Use the graph first, grep as fallback."
  "The diff is small, no need for impact analysis": "Small diffs in hub functions can have massive blast radius. Always check impact before reviewing."
  "I already know this codebase": "Code evolves. The graph reflects current state, not your memory of it."
---

# Code Knowledge Graph — Methodology & Lifecycle

A structural knowledge graph of the codebase enables **token-efficient, context-aware** code reviews. Instead of re-reading entire files, the graph tells you exactly which functions, callers, dependents, and tests are affected by a change — achieving 38x–528x token reduction over naive file scanning.

## Core Principle

> **Read what matters, skip what doesn't.** The graph maps structural relationships (calls, imports, inheritance, tests) so review effort concentrates on the blast radius of changes rather than scanning the entire codebase.

## Graph Model

**Node types:** File, Class, Function, Type, Test

**Edge types (with traversal weights):**

| Edge | Weight | Meaning |
|------|--------|---------|
| CALLS | 1.0 | Function invokes another function |
| INHERITS | 0.9 | Class extends another |
| IMPLEMENTS | 0.9 | Class implements interface |
| INHERITS (cross-lang) | 0.8 | Cross-language inheritance |
| TESTED_BY | 0.7 | Function covered by test |
| DEPENDS_ON | 0.6 | General dependency |
| REFERENCES | 0.6 | Value-level reference (callbacks) |
| IMPORTS_FROM | 0.5 | File imports from module |
| TESTED_BY (indirect) | 0.4 | Indirect test coverage |
| CONTAINS | 0.3 | Structural containment |

**Confidence tiers:** EXTRACTED (from AST) > INFERRED (from heuristics) > AMBIGUOUS (uncertain)

## Lifecycle Stages

The code graph operates through a lifecycle. Route to the appropriate skill:

```
┌─────────────────────────────────────────────────────────────────┐
│                    CODE GRAPH LIFECYCLE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. BUILD ──────► 2. IMPACT ──────► 3. REVIEW ──────► 4. SHIP  │
│     │                 │                 │                │      │
│     ▼                 ▼                 ▼                ▼      │
│  Parse AST       Detect changes    Assemble context   Pre-merge │
│  Store graph     Blast radius      Risk scoring       check     │
│  Index FTS       Flow tracing      Structured review  Gate      │
│                                                                 │
│  5. ARCHITECTURE (ongoing)    6. REFACTOR (on demand)           │
│     Community detection          Rename preview                  │
│     Coupling analysis            Dead code detection             │
│     Visualization                Dependency-safe moves           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Stage Routing

| Situation | Route to | Skill |
|-----------|----------|-------|
| New repo / graph stale / after large merge | Build | `csp-graph-build` |
| PR opened / diff ready / "what does this change affect?" | Impact | `csp-graph-impact` |
| Reviewing code / assembling context / risk scoring | Review | `csp-graph-review` |
| Understanding structure / onboarding / "who calls what?" | Architecture | `csp-graph-architecture` |
| Renaming / moving / extracting / "is this dead code?" | Refactor | `csp-graph-refactor` |

## Token Efficiency Protocol

When the graph is available, **always prefer graph queries over file scanning**:

1. **Exploring code** → `semantic_search` or `query_graph` instead of Grep
2. **Understanding impact** → `get_impact_radius` instead of manually tracing imports
3. **Code review** → `detect_changes` + `get_review_context` instead of reading entire files
4. **Finding relationships** → `query_graph` (callers_of / callees_of / imports_of / tests_for)
5. **Architecture questions** → `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need (e.g., config files, prose docs, non-code assets).

## Graph Availability Check

At session start, determine graph status:

```bash
# Check if graph exists and is fresh
code-review-graph status 2>/dev/null || echo "NO_GRAPH"
```

- **Graph fresh** (< 5 min since last update) → proceed with graph tools
- **Graph stale** (> 5 min, files changed) → run incremental update first
- **No graph** → offer to build (routes to `csp-graph-build`)
- **No tool installed** → fall back to manual review (use `csp-code-review` directly)

## Integration with Existing Review Skills

This skill **enhances** existing review methodology, not replaces it:

- `csp-code-review` — the six review dimensions remain; the graph provides **structural context** for each dimension
- `csp-multi-review` — graph context feeds into Stage 1 (scope) and Stage 4 (reviewer selection)
- Language-specific reviewers — graph identifies which language patterns are in the blast radius

## When to Use This Skill

- Starting any code review session (routes to correct lifecycle stage)
- Onboarding to an unfamiliar codebase (architecture overview)
- Deciding whether a change is safe to merge (impact + risk)
- Planning a refactoring (dependency analysis)
- Debugging (trace execution flows to find failure points)
