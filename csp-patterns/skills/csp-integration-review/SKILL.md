---
name: csp-integration-review
description: >
  Full-stack integration review across 11 scenarios — API URL consistency,
  change impact analysis, API constant management, naming consistency,
  full-chain DB→API→FE alignment, OpenAPI vs implementation, error handling,
  cross-layer causality, API versioning, mock data consistency,
  auth/authorization chains. Self-contained (zero skill dependency) but
  wraps the prompts/integration-review.md methodology as a CSP skill.
version: 1.0.0
layer: 3
category: patterns
phase: verify
domain: testing
role: reviewer
scope: review
tools: [Read, Write, Edit, Bash, Glob, Grep]
related_skills:
  - [[pattern:csp-cross-layer-testing]]
  - [[workflow:csp-code-review]]
  - [[pattern:csp-db-state-assertion]]
  - [[pattern:csp-api-governance]]

anti_rationalizations:
  "The backend and frontend are separate repos, integration is their problem": "Integration is always your problem. A field rename on the backend silently breaks the frontend unless verified."
  "I'll check integration manually after deploy": "Manual integration checks after deploy find problems that should have been caught in review. Run the 11-scenario review BEFORE merge."
  "The API contract hasn't changed, no need to review": "Static contracts are not runtime truth. DB schema drifts, ORM aliases, and FE type staleness happen without contract changes."
---

# Integration Review — 11-Scenario Full-Stack Verification

Systematic cross-layer contract verification across frontend, API, and database boundaries. This skill wraps the methodology from `prompts/integration-review.md` as a first-class CSP skill.

## 11 Review Scenarios

| # | Scenario | What It Catches |
|---|----------|----------------|
| 1 | API URL & method consistency | FE request path/method ≠ BE route |
| 2 | Change impact analysis | git diff detects one-end change that breaks the other |
| 3 | API constant centralization | Hardcoded URLs, non-standard naming, duplicates |
| 4 | Naming consistency | BE `user_name` vs FE `userName` |
| 5 | Full-chain DB→API→FE alignment | Column → DTO → TypeScript type drift |
| 5A | Runtime DB vs ORM type validation | `information_schema` cross-check (NEW) |
| 5B | FE TypeScript vs API runtime validation | Zod schema validation of live API responses (NEW) |
| 6 | OpenAPI vs implementation | Doc declares X, code returns Y |
| 7 | Error handling consistency | Unified error format, FE covers all status codes |
| 8 | Cross-layer causality (UI→API→DB→UI) | trace_id alignment across 4 layers |
| 9 | API versioning & backward compat | Deprecated endpoints still in use |
| 10 | Mock data vs real API consistency | MSW handlers ≠ real response shapes |
| 11 | Auth/authorization chain consistency | Token format, refresh, RBAC role name alignment |

## Process

### Step 1: Scope Detection
Detect project structure — monorepo vs separate FE/BE, REST vs GraphQL, language stack. Determine which scenarios apply.

### Step 2: Per-Scenario Execution
For each applicable scenario, run the review procedure from `prompts/integration-review.md`. Each scenario produces a findings table with `file:line` evidence.

### Step 3: Severity Classification
- **CRITICAL**: Runtime breakage (route mismatch, type incompatibility, missing field)
- **HIGH**: Silent data loss risk (unhandled error status, missing rollback)
- **MEDIUM**: Drift risk (naming inconsistency, mock stale, schema misalignment)
- **LOW**: Convention violation (hardcoded URL, non-standard naming)

### Step 4: Consolidated Report
Output to `.csp/review/INTEGRATION-REVIEW-{date}.md` with:
- Findings table sorted by severity
- Per-finding file:line evidence on BOTH sides
- Fix priority (P0/P1/P2)
- Schema drift heatmap (which entities have cross-layer inconsistencies)

## Full-Chain Alignment (Scene 5)

The most important scenario. Three-layer comparison:

```
DB Column → ORM Model Field → API Response Field → Frontend Type
   type        type annotation      JSON type        TypeScript type
   nullable    nullable?             required?        optional?
   default     default               —                —
```

Check type consistency, naming consistency, and constraint consistency across all four layers.

### Runtime Validation (5A + 5B)
- **5A**: Query `information_schema.columns` → compare against ORM field types
- **5B**: Zod schema → validate live API response → fail if type mismatch

## Evidence Requirements

Every finding must cite:
- **Frontend side**: file:line of the FE code (fetch call, type definition, component)
- **Backend side**: file:line of the BE code (route handler, DTO, ORM model)
- **Database side**: table.column for schema-level issues

## Related Skills

- [[pattern:csp-cross-layer-testing]] — Runtime evidence matrix (UI→API→DB→UI)
- [[workflow:csp-code-review]] — Dimension 8 cross-layer field alignment
- [[pattern:csp-db-state-assertion]] — Pre/post row-level DB assertions
- [[pattern:csp-api-governance]] — API contract and version management