# CSP (Code Skills Package) Architecture Design

> Version: v0.7.1 | Date: 2026-07-04
> Status: State-aware routing + Confidence scoring + Skill Knowledge Graph enhancement

---

## 1. Project Positioning

**CSP** (Code Skills Package) is a unified programming skills package that integrates the essence of multiple open-source AI programming assistance projects into an integrated solution:

### Core Principles

1. **Merge Intersection, Preserve Unique** — Merge overlapping parts into a single implementation, preserve unique capabilities as-is
2. **Progressive Disclosure** — Users don't need to learn all skills at once, system loads on demand
3. **Token Conservation** — Index resident, content lazy loading, deep materials loaded on demand
4. **Automated Routing** — User describes task, system automatically selects the most suitable skill combination
5. **State Awareness** — Based on project state, development phase, technology stack to automatically adjust routing strategy
6. **Unified Namespace** — All skills and commands use only the `csp-` prefix

### Naming Convention

**Mandatory Rule**: There are no dual-entry compatibility or original prefix retention in CSP projects. All names use hyphens `-` for connection.

**Implementation Requirements**:
- When migrating, unify all skill filenames, directory names, and command names with the `csp-` prefix
- All connectors uniformly use hyphens `-`, not colons `:`
- Slash commands uniformly use `/csp-xxx` format
- Original project prefixes are not referenced in documentation and code comments

---

## 2. Five-Layer Architecture

```
┌─────────────────────────────────────────────────────┐
│  Layer 0: csp-router  (Resident, ~800 tokens)     │
│  ─ Task classification + skill selection + state awareness + context detection │
├─────────────────────────────────────────────────────┤
│  Layer 1: csp-meta    (SP + Specification-driven meta skills) │
│  ─ Methodologies: brainstorming, TDD, spec-driven... │
├─────────────────────────────────────────────────────┤
│  Layer 2: csp-workflow (GSD 93 workflows skeleton) │
│  ─ Project management: plan → execute → verify → ship │
├─────────────────────────────────────────────────────┤
│  Layer 3: csp-patterns (ECC technology library ~200 skills) │
│  ─ Language/framework patterns, reviewers, build-resolvers │
├─────────────────────────────────────────────────────┤
│  Layer 4: csp-runtime (Unique runtime capabilities ~20 skills) │
│  ─ autopilot, ralph, wiki, remember, self-improve │
└─────────────────────────────────────────────────────┘
```

### Layer Loading Strategy

| Layer | Loading Time | Token Cost |
|------|--------------|-----------|
| L0 router | **Permanently loaded at session start** | ~800 |
| L1 meta | Loaded when router identifies need for methodology | ~300/skill |
| L2 workflow | Loaded when user triggers project management process | ~500/skill |
| L3 patterns | Loaded after router identifies tech stack | ~200-600/skill |
| L4 runtime | Loaded when user requests autonomous execution/knowledge management | ~300/skill |

---

## 3. Skill Knowledge Graph (SKPG)

### 3.1 Overview

Skill Knowledge & Practice Graph is a graph structure representing relationships between skills, used for:
- Dependency analysis: Determine prerequisite dependencies between skills
- Impact analysis: When modifying a skill, analyze other affected skills
- Path finding: Find the best path from one skill to another
- Recommendation system: Recommend related skills based on current skill

### 3.2 Graph Structure

```json
{
  "nodes": {
    "csp-code-review": {
      "name": "csp-code-review",
      "type": "review",
      "domain": "code-quality",
      "dependencies": ["csp-tdd"],
      "dependsOn": ["csp-spec-contract"],
      "similar": ["csp-multi-review", "csp-security-review"]
    }
  },
  "edges": [
    {
      "from": "csp-code-review",
      "to": "csp-tdd",
      "type": "depends",
      "weight": 0.8
    }
  ]
}
```

### 3.3 Graph Applications

- **Dependency Checking**: Check if prerequisites are satisfied before activating skills
- **Smart Recommendations**: Recommend related skills based on graph structure
- **Conflict Detection**: Detect mutually exclusive skill combinations
- **Path Optimization**: Plan optimal skill execution paths for complex tasks

---

## 4. Skill Registry (registry.json)

Each skill has one record in the registry, which is the core data structure for router matching:

```
Reference: docs/SKILL-SPEC-v2.md
```

### Registry Field Descriptions

| Field | Purpose |
|------|---------|
| `name` | Unified name (no source prefix) |
| `description` | Short description (≤80 chars, goes into index) |
| `layer` | Belonging layer (0-5) |
| `category` | Functional classification (review/debug/test/plan/spec/pattern/runtime) |
| `triggers.keywords` | Trigger keyword list |
| `triggers.file_patterns` | File pattern triggers |
| `triggers.context` | Context triggers (such as post-commit) |
| `stack_detection` | Whether project tech stack needs detection |
| `path` | Relative path to SKILL.md |
| `deps` | Dependencies on other skills |
| `priority` | Priority within same category (lower number is higher priority) |

---

## 5. Auto Router (csp-router)

### 5.1 Workflow

```
User inputs task description
      │
      ▼
  ┌──────────┐
  │ Signal Extraction │  Keywords / File patterns / Context / Tech stack detection
  └────┬─────┘
       │
       ▼
  ┌─────────────┐
  │ State Detection │  git status / tech stack / current development phase
  └─────┬───────┘
        │
        ▼
  ┌─────────────┐
  │ Intent Classification │  Semantic matching + Regex pattern matching
  └─────┬───────┘
        │
        ▼
  ┌─────────────┐
  │ Confidence Scoring │  Multi-dimensional weighted scoring
  └─────┬───────┘
        │
        ▼
  ┌─────────────┐
  │ Routing Decision │  Decision based on confidence and state
  └─────────────┘
```

### 5.2 Signal Extraction

1. **Keyword Matching**: Extract words from `triggers.keywords` in user input
2. **File Pattern**: If user provides file paths, match `triggers.file_patterns`
3. **Context**: Detect scenarios like post-git commit, PR, etc.
4. **Tech Stack Detection**: When `stack_detection: true`, scan project root:
   - `package.json` → Node.js/frontend
   - `Cargo.toml` → Rust
   - `go.mod` → Go
   - `pyproject.toml` / `setup.py` → Python
   - `pom.xml` / `build.gradle` → Java/Kotlin
   - `*.xcodeproj` / `Package.swift` → Swift

### 5.3 State Detection (Pre-Router Hook)

`state-detector.mjs` automatically detects and injects context:

| Signal | Detection Method | Example Values |
|------|------------------|----------------|
| git_status | `git status --porcelain` | clean, dirty, conflict |
| tech_stack | Project file scanning | python, typescript, go |
| phase | Directory structure analysis | planning, building, testing |
| test_status | Test result files | passing, failing, unknown |

State is written to `.csp/state.json` for subsequent steps to use.

### 5.4 SDD State-Aware Routing

Based on files under `.csp/artifacts/` to automatically determine current development phase:

| Existing Artifact | Current Phase | Recommended Next |
|---------------|---------------|------------------|
| None | Initial | understand (codebase-mapper) |
| understand.md | Understanding complete | plan (writing-plans) |
| plan.md | Planning complete | spec (spec-contract) |
| spec.md | Specification complete | implement (tdd + executing-plans) |
| implement.md | Implementation complete | review (code-review) |
| review.md | Review complete | verify (verification) |

Routing rules defined in `triggers.yaml` under `sdd_state_routing` section.

### 5.5 Regex Pattern Matching Layer

Above keyword matching, add regex pattern matching to improve fuzzy intent hit rates:

- Support regex expressions (e.g. `re\\s*factor` matches "refactor", "re factor")
- Support multi-word combinations (e.g. `production.*issue`)
- Defined in `triggers.yaml` under `intent_patterns` section with `patterns:` field

Relationship with keyword matching:
1. Keyword exact match → confidence 0.9
2. Regex pattern match → confidence 0.7
3. Intent inference → confidence 0.5

### 5.6 Confidence Scoring

```
confidence = keyword_score × 0.4
           + intent_score × 0.3
           + context_score × 0.3
```

Context score considerations:
- Current phase matches skill phase → +0.2
- Tech stack matches skill domain → +0.15
- Git status (dirty →偏向 debug skills)

### 5.7 Routing Decision

| Confidence | Decision |
|------------|----------|
| > 80% | Direct routing to top skill |
| 50-80% | Show top 3, let user confirm |
| < 50% | Fall back to `/csp-interview-me` deep interview |

### 5.8 SKPG Enhancement (Optional)

Read `csp-router/skpg/graph.json` to perform:
- **Dependency Check**: Does activated skill have prerequisites?
- **Impact Analysis**: If modifying skill X, which other skills are affected?
- **Path Finding**: Shortest path from skill A to skill B

### 5.9 Tech Stack→Skill Mapping

```yaml
# triggers.yaml snippet

stack_rules:
  python:
    files: ["pyproject.toml", "setup.py", "requirements.txt", "Pipfile"]
    reviewers: ["csp-python-reviewer", "csp-django-reviewer", "csp-fastapi-reviewer"]
    testers: ["csp-python-testing"]
    build_resolvers: ["csp-django-build-resolver"]
    patterns: ["csp-python-patterns", "csp-django-patterns", "csp-fastapi-patterns"]

  rust:
    files: ["Cargo.toml"]
    reviewers: ["csp-rust-reviewer"]
    testers: ["csp-rust-testing"]
    build_resolvers: ["csp-rust-build-resolver"]
    patterns: ["csp-rust-patterns"]

  golang:
    files: ["go.mod"]
    reviewers: ["csp-go-reviewer"]
    testers: ["csp-golang-testing"]
    build_resolvers: ["csp-go-build-resolver"]
    patterns: ["csp-golang-patterns"]

  typescript:
    files: ["tsconfig.json", "package.json"]
    reviewers: ["csp-typescript-reviewer", "csp-react-reviewer"]
    testers: ["csp-react-testing"]
    build_resolvers: ["csp-react-build-resolver"]
    patterns: ["csp-react-patterns", "csp-nextjs-turbopack", "csp-frontend-patterns"]

  # ...more stacks
```

### 5.10 Router SKILL.md Example

```markdown
---
name: csp-router
description: >
  CSP task router — state-aware + confidence scoring + knowledge graph enhanced intelligent routing.
  Automatically identifies task type and loads suitable skill combinations.
layer: 0
category: router
phase: plan
domain: architecture
tools: [Read, Glob, Grep]
---

# CSP Router

State-aware + confidence scoring + knowledge graph enhanced intelligent routing system.

## Routing Process

### 1. State Detection (Pre-Router Hook)

`state-detector.mjs` automatically detects and injects context:

| Signal | Detection Method | Example Values |
|------|------------------|----------------|
| git_status | `git status --porcelain` | clean, dirty, conflict |
| tech_stack | Project file scanning | python, typescript, go |
| phase | Directory structure analysis | planning, building, testing |
| test_status | Test result files | passing, failing, unknown |

State is written to `.csp/state.json` for subsequent steps to use.

### 2. Keyword + Intent Matching

- **Keyword Matching**: `triggers.yaml` → Candidate skills
- **Intent Classification**: `intent_patterns` → Semantic matching
- **Tech Stack Matching**: `stack_rules` → Language/framework specific skills

### 3. SDD State-Aware Routing

Based on files under `.csp/artifacts/` to automatically determine current development phase:

| Existing Artifact | Current Phase | Recommended Next |
|---------------|---------------|------------------|
| None | Initial | understand (codebase-mapper) |
| understand.md | Understanding complete | plan (writing-plans) |
| plan.md | Planning complete | spec (spec-contract) |
| spec.md | Specification complete | implement (tdd + executing-plans) |
| implement.md | Implementation complete | review (code-review) |
| review.md | Review complete | verify (verification) |

Routing rules defined in `triggers.yaml` under `sdd_state_routing` section.

### 4. Regex Pattern Matching Layer

Above keyword matching, add regex pattern matching to improve fuzzy intent hit rates:

- Support regex expressions (e.g. `re\\s*factor` matches "refactor", "re factor")
- Support multi-word combinations (e.g. `production.*issue")
- Defined in `triggers.yaml` under `intent_patterns` section with `patterns:` field

Relationship with keyword matching:
1. Keyword exact match → confidence 0.9
2. Regex pattern match → confidence 0.7
3. Intent inference → confidence 0.5

### 5. Confidence Scoring

```
confidence = keyword_score × 0.4
           + intent_score × 0.3
           + context_score × 0.3
```

Context score considerations:
- Current phase matches skill phase → +0.2
- Tech stack matches skill domain → +0.15
- Git status (dirty →偏向 debug skills)

### 6. Routing Decision

| Confidence | Decision |
|------------|----------|
| > 80% | Direct routing to top skill |
| 50-80% | Show top 3, let user confirm |
| < 50% | Fall back to `/csp-interview-me` deep interview |

### 7. SKPG Enhancement (Optional)

Read `csp-router/skpg/graph.json` to perform:
- **Dependency Check**: Does activated skill have prerequisites?
- **Impact Analysis**: If modifying skill X, which other skills are affected?
- **Path Finding**: Shortest path from skill A to skill B

### 8. Output Format

```
## Routing Decision

**State**: git=clean | lang=python | phase=building

**Matching skills** (Confidence):
1. csp-tdd [build] — 78%
2. csp-implementation-phase [build] — 65%
3. csp-python-reviewer [review] — 35%

**Decision**: Top 3 candidates — Please confirm

**SKPG Hint**: csp-tdd depends on csp-spec-contract
```

## Signal Priority (from high to low)

1. **Explicit Instruction**: User says "use TDD approach" → Force load
2. **High Confidence Match**: >80% → Direct routing
3. **Context Enhancement**: State detection adjusts weights
4. **Tech Stack Detection**: Language/framework matching
5. **Historical Preference**: Previously used skill takes priority

## File References

| File | Purpose |
|------|---------|
| `triggers.yaml` | Keyword → skill mapping |
| `skill-metadata.yaml` | Metadata centralized registration |
| `registry.json` | Full skill registry |
| `csp-router/skpg/graph.json` | Skill knowledge graph |
| `.csp/state.json` | Current project state snapshot
```

---

## 6. csp-auto: Dynamic DAG Orchestration Engine

### 6.1 Design Philosophy

Static recipes cannot cover all programming scenarios. `csp-auto` is an **Intelligent DAG Orchestrator**:

```
User inputs task
      │
      ▼
  csp-auto (DAG Decision Agent)
      │
      │ Analyze task → Build DAG (Directed Acyclic Graph)
      │
      ▼
  ┌─────────────────────────────────────┐
  │  DAG Example: New Feature Development │
  │                                     │
  │  [understand] → [plan] → [spec]    │
  │                         │           │
  │                         ▼           │
  │                    [implement]      │
  │                    /        \       │
  │              [frontend]  [backend]  │
  │                    \        /       │
  │                     ▼               │
  │               [integrate]          │
  │                    │                │
  │                    ▼                │
  │              [test] → [review]     │
  │                        │            │
  │                        ▼            │
  │                   [verify] → [ship] │
  └─────────────────────────────────────┘
      │
      │ Execute node by node, each node dynamically selects skill
      │
      ▼
  Final Dynamic Skill Chain
```

**Core Difference:**
- **Static recipe**: Predefined sequence, one-size-fits-all
- **csp-auto DAG**: Task-driven, dynamic decision per node, supports branches/parallels/backtracking

### 6.2 DAG Node Definition

Each node is a **logical phase** (not specific skill), decided by csp-auto at runtime which skill to load:

```yaml
# csp-auto/nodes.yaml — Node type registry
# Each node corresponds to an index slice

nodes:
  understand:
    description: "Understanding requirements/codebase"
    shard: index-understand.json
    candidates:
      - csp-explore           # Explore codebase
      - csp-map-codebase      # Map architecture
      - csp-deep-interview    # Requirement clarification
      - csp-brainstorming     # Brainstorming
    decision_factors:
      - Does user understand existing code? → explore / map-codebase
      - Are requirements clear? → brainstorming / deep-interview

  plan:
    description: "Planning solution"
    shard: index-plan.json
    candidates:
      - csp-plan-phase        # Phase planning
      - csp-spike             # Technical investigation
      - csp-ultraplan-phase   # Deep planning
    decision_factors:
      - Solution complexity? High → ultraplan / Medium → plan-phase / Low → spike
      - Need technical validation? → spike

  spec:
    description: "Writing specifications"
    shard: index-spec.json
    candidates:
      - csp-spec-phase        # Clarify phase requirements (CSPEC.md)
      - csp-planning-phase    # Quick planning artifacts
      - skip                  # Skip for simple tasks
    decision_factors:
      - Need formal spec? → spec-phase / planning-phase
      - Is task simple enough? → skip

  implement:
    description: "Writing code"
    shard: index-implement.json
    candidates:
      - csp-implement         # General implementation
      - csp-tdd               # TDD approach
      - csp-executor          # Execute according to plan
    decision_factors:
      - User prefers TDD? → tdd
      - Existing plan? → executor
      - Default → implement

  test:
    description: "Testing verification"
    shard: index-test.json
    candidates:
      - csp-tdd               # Unit tests
      - csp-e2e-testing       # E2E tests
      - csp-python-testing    # Python tests
      - csp-react-testing     # React tests
      - csp-rust-testing      # Rust tests
    decision_factors:
      - Tech stack? → Corresponding language test skill
      - Need E2E? → e2e-testing
      - Default → tdd

  review:
    description: "Code review"
    shard: index-review.json
    candidates:
      - csp-code-review       # General review
      - csp-python-reviewer   # Python review
      - csp-go-reviewer       # Go review
      - csp-rust-reviewer     # Rust review
      - csp-react-reviewer    # React review
      - csp-security-review   # Security review
    decision_factors:
      - Tech stack? → Corresponding language reviewer
      - Involves security-sensitive code? → security-review
      - Default → code-review

  verify:
    description: "Verification result"
    shard: index-verify.json
    candidates:
      - csp-verify-phase      # Phase verification
      - csp-spec-contract   # SPEC contract generation
      - csp-nyquist-auditor   # Coverage verification
    decision_factors:
      - Has CSPEC? → verify-phase (three dimensions + goal-backward)
      - Need coverage? → nyquist-auditor
      - Default → verify-phase

  ship:
    description: "Release/deploy"
    shard: index-ship.json
    candidates:
      - csp-ship              # Release
      - csp-pr-branch         # Create PR
      - skip                  # No need to release
    decision_factors:
      - User requests release? → ship / pr-branch
      - Local changes only? → skip

  debug:
    description: "Debug/fix"
    shard: index-debug.json
    candidates:
      - csp-debug             # General debug
      - csp-debug-session     # Multi-round debug management
      - csp-forensics         # Forensic analysis
      - csp-build-error-fix   # Build error
    decision_factors:
      - Build error? → build-error-fix
      - Complex bug needing multiple rounds? → debug-session
      - Need historical analysis? → forensics
      - Default → debug

  parallel:
    description: "Parallel execution node (special type)"
    shard: null  # No skill loading, orchestration only
    behavior: Sub-nodes execute in parallel, merge after all complete
```

### 6.3 DAG Execution Flow

```
csp-auto receives task
  │
  ├─ 1. Task Analysis
  │     Input: User description + Project context
  │     Output: Task type, complexity, constraints
  │
  ├─ 2. DAG Construction
  │     Based on task type, select node subset and determine topology
  │     Output: nodes[] + edges[] (DAG definition)
  │
  ├─ 3. Execute node by node (topological sort traversal)
  │     for node in topological_sort(DAG):
  │       │
  │       ├─ 3a. Load node's corresponding index slice
  │       │      read(index-{node}.json)  ← Load only this slice
  │       │
  │       ├─ 3b. Agent decision: Select from candidate skills
  │       │      Consider: Tech stack, context, historical results, user preference
  │       │      Output: selected_skill
  │       │
  │       ├─ 3c. Load and execute skill
  │       │      read(selected_skill/SKILL.md)
  │       │      Execute skill logic
  │       │
  │       ├─ 3d. Collect output
  │       │      Write to .csp/artifacts/{node}-{timestamp}.yaml
  │       │
  │       └─ 3e. Dynamically adjust DAG (optional)
  │              If execution results deviate from expectation:
  │                - Add rollback nodes (e.g., verify failure → insert debug)
  │                - Skip subsequent optional nodes
  │                - Add new branches
  │
  └─ 4. Output final result
        Summarize all node artifacts
        Generate execution report
```

### 6.4 Index Slice Strategy

**Problem:** registry.json contains ~570 skills, full loading ~12K tokens

**Solution:** Slice by node type, load on demand

```
csp-router/
├── index-directory.json         # Main directory (resident, ~200 tokens)
│                                # List all slices + slice descriptions
│
├── index-understand.json        # "Understand" node candidate skills (~15 items)
├── index-plan.json              # "Plan" node candidate skills (~12 items)
├── index-spec.json              # "Spec" node candidate skills (~8 items)
├── index-implement.json         # "Implement" node candidate skills (~10 items)
├── index-test.json              # "Test" node candidate skills (~20 items)
├── index-review.json            # "Review" node candidate skills (~25 items)
├── index-verify.json            # "Verify" node candidate skills (~10 items)
├── index-ship.json              # "Ship" node candidate skills (~8 items)
├── index-debug.json             # "Debug" node candidate skills (~12 items)
├── index-stacks.json            # Tech stack related skills (~50 items, on demand)
└── index-content.json           # Content/marketing skills (~15 items, on demand)
```

**Main Directory Format (resident loading):**

```json
{
  "version": "1.0",
  "total_skills": 570,
  "shards": [
    {
      "name": "understand",
      "file": "index-understand.json",
      "description": "Codebase understanding, requirement clarification, architecture exploration",
      "skill_count": 15,
      "size_tokens": 900
    },
    {
      "name": "plan",
      "file": "index-plan.json",
      "description": "Task planning, technical investigation, solution design",
      "skill_count": 12,
      "size_tokens": 720
    },
    {
      "name": "spec",
      "file": "index-spec.json",
      "description": "Specification-driven, change proposal, artifact management",
      "skill_count": 8,
      "size_tokens": 480
    }
  ]
}
```

**Token Consumption Comparison:**

| Strategy | Resident Token | Per-task Token |
|----------|----------------|----------------|
| Full index | ~32,000 | ~32,000 (all loaded) |
| Slice loading | ~200 (directory only) | ~500-1,500 (relevant slices only) |
| **Savings Ratio** | **94%** | **87-96%** |

### 6.5 Slice Content Format

```json
{
  "shard": "review",
  "node": "review",
  "skills": [
    {
      "name": "csp-code-review",
      "description": "General code review: correctness, security, performance, maintainability",
      "path": "csp-patterns/skills/code-review/SKILL.md",
      "stacks": ["any"],
      "priority": 1,
      "modes": ["comprehensive", "quick", "architecture-analysis"]
    },
    {
      "name": "csp-python-reviewer",
      "description": "Python specialized review: PEP8, type hints, security, performance",
      "path": "csp-patterns/agents/csp-python-reviewer.md",
      "stacks": ["python"],
      "priority": 2,
      "triggers": { "file_ext": [".py"], "frameworks": ["django", "fastapi", "flask"] }
    },
    {
      "name": "csp-go-reviewer",
      "description": "Go specialized review: concurrency patterns, error handling, performance",
      "path": "csp-patterns/agents/csp-go-reviewer.md",
      "stacks": ["golang"],
      "priority": 2,
      "triggers": { "file_ext": [".go"], "frameworks": ["gin", "echo", "fiber"] }
    }
  ]
}
```

### 6.6 Node Decision Logic

Each node's skill selection follows this decision tree:

```
Node: review
  │
  ├─ Project tech stack?
  │   ├─ Python → csp-python-reviewer
  │   ├─ Go → csp-go-reviewer
  │   ├─ Rust → csp-rust-reviewer
  │   ├─ TypeScript + React → csp-react-reviewer
  │   └─ Other/Multi-stack → csp-code-review (general)
  │
  ├─ Involves security-sensitive code?
  │   ├─ Yes → Additional csp-security-review
  │   └─ No → Skip
  │
  ├─ Review mode?
  │   ├─ Comprehensive → mode: comprehensive
  │   ├─ Quick check → mode: quick
  │   └─ Architecture analysis → mode: architecture-analysis
  │
  └─ Output: selected_skills = [csp-python-reviewer(mode=comprehensive), csp-security-review]
```

### 6.7 DAG Dynamic Adjustment

csp-auto can dynamically modify DAG during execution based on results:

```yaml
adjustment_rules:
  # verify failed → insert debug + re-implement
  verify_failed:
    condition: "artifact.status == 'failed'"
    action:
      - insert_node: debug
        position: before_current
      - insert_node: implement
        position: after_debug
      - re_execute: verify
    max_retries: 3

  # test pass simple → Skip review
  test_pass_simple:
    condition: "artifact.all_passed && complexity < threshold"
    action:
      - skip_node: review

  # DB change detected during implementation → Insert migration node
  db_change_detected:
    condition: "artifact.outputs contains 'schema_change'"
    action:
      - insert_node: database-migration
        position: before_verify

  # User context approaching token limit → Compress remaining nodes
  token_pressure:
    condition: "context_usage > 80%"
    action:
      - merge_nodes: [test, review] → csp-verify-phase(mode=quick)
      - skip_optional: true
```

### 6.8 Relationship between csp-auto and csp-router

```
┌────────────────────────────────────────────┐
│              User inputs task              │
└─────────────┬──────────────────────────────┘
              │
              ▼
       ┌──────────────┐
       │  csp-router   │ ← L0 resident router
       │  (simple tasks) │    Keyword matching → Direct skill selection
       └──────┬───────┘
              │
         ┌────┴────┐
         │         │
    Simple task    Complex task
         │         │
         ▼         ▼
   Direct execution ┌──────────────┐
   Single skill     │   csp-auto    │ ← L0 intelligent orchestrator
                   │  (complex tasks) │    Build DAG → Node-by-node decision
                   └──────┬───────┘
                          │
                    ┌─────┴─────┐
                    ▼           ▼
               Load slice     Agent decision
               index-xxx    Select skill
                    │           │
                    └─────┬─────┘
                          ▼
                     Execute skill
                          │
                          ▼
                     Adjust DAG?
                      │      │
                     Yes     No → Next node
                      │
                      ▼
                 Modify DAG
                 Continue execution
```

**Routing Decision Rules:**
- **Simple task** (single action, clear skill) → csp-router handles directly
- **Complex task** (multi-step, needs planning, full pipeline) → Hand to csp-auto

### 6.9 Complete DAG Example: Take over unfamiliar project and add feature

```
User: "I just took over this Django project, need to add user permission management feature"

DAG built by csp-auto:

  [understand] ──────────────────────────────┐
  │                                          │
  ├─ Load index-understand.json slice         │
  ├─ Decision: csp-explore + csp-map-codebase │
  ├─ Execute: Explore project structure, map architecture │
  └─ Output: architecture-map.yaml           │
                                             │
  [plan] ←───────────────────────────────────┘
  │
  ├─ Load index-plan.json slice
  ├─ Decision: csp-plan-phase
  ├─ Input: architecture-map.yaml
  ├─ Execute: Develop permission management feature plan
  └─ Output: plan.yaml
       │
       ▼
  [spec]
  │
  ├─ Load index-spec.json slice
  ├─ Decision: csp-spec-phase (project has existing spec-driven process)
  ├─ Execute: Create change proposal
  └─ Output: proposal.yaml
       │
       ▼
  [implement]
  │
  ├─ Load index-implement.json slice
  ├─ Decision: csp-tdd (Django project, testing important)
  ├─ Also load index-stacks.json → csp-django-patterns
  ├─ Execute: Implement permission management in TDD manner
  └─ Output: implementation.yaml
       │
       │ ← Dynamic adjustment: Database change detected
       │
  [migrate] (dynamically inserted)
  │
  ├─ Load index-stacks.json → csp-database-migration
  ├─ Execute: Generate and test Django migration
  └─ Output: migration.yaml
       │
       ▼
  [test]
  │
  ├─ Load index-test.json slice
  ├─ Decision: csp-python-testing + csp-django-testing
  ├─ Execute: Unit tests + Integration tests
  └─ Output: test-results.yaml
       │
       ▼
  [review]
  │
  ├─ Load index-review.json slice
  ├─ Decision: csp-django-reviewer + csp-security-review
  │         (permission management involves security, additional security review)
  ├─ Execute: Django specialized review + Security review
  └─ Output: review-findings.yaml
       │
       │ ← Review finds security issues → Dynamic fix insertion
       │
  [fix-security] (dynamically inserted)
  │
  ├─ Execute: Fix security issues found in review
  └─ Output: fix.yaml
       │
       ▼
  [verify]
  │
  ├─ Load index-verify.json slice
  ├─ Decision: csp-verify-phase
  ├─ Execute: Verify all changes
  └─ Output: verification.yaml (status: passed)
       │
       ▼
  [ship]
  │
  ├─ Load index-ship.json slice
  ├─ Decision: csp-pr-branch (create PR instead of direct release)
  └─ Output: pr-url
```

**Slices loaded in this execution:**
- index-understand.json (900 tokens)
- index-plan.json (720 tokens)
- index-spec.json (480 tokens)
- index-implement.json (600 tokens)
- index-test.json (1,200 tokens)
- index-review.json (1,500 tokens)
- index-verify.json (600 tokens)
- index-ship.json (480 tokens)
- index-stacks.json (3,000 tokens, loaded 2 times)
- **Total: ~6,480 tokens** (vs full 12,000 tokens)

---

## 7. Skill Orchestration and Phase Transition

### 7.1 Problem: Why orchestration is needed

Single programming tasks often require multiple skills to collaborate:

**Example: Developing new feature**
```
brainstorming (L1) 
  → plan-phase (L2) 
    → propose (L3) 
      → implement + react-patterns (L4) 
        → tdd (L1) 
          → code-review (L4) 
            → verify (L2) 
              → ship (L2)
```

This is not activating 8 skills simultaneously, but **phased loading on demand**.

### 7.2 Phase Transition Protocol

After each skill completes, determine next step via **Phase Signals**:

```markdown
### 7.3 Skill Completion Signal Format

Each skill's SKILL.md should define completion signals at the end:

#### Completion Signals
- **Output**: plan.md (path to plan document)
- **Next Step**: 
  - Default: csp-spec-phase (create change proposal)
  - Alternative: csp-execute-phase (direct execution)
  - Skip: If user only wants to see plan
- **Status**: 
  - plan_path: {{output_path}}
  - phase: planning
  - ready_for: [propose, execute]
```

**Router automatically loads next skill based on completion signal:**

```
csp-plan-phase completes
  ↓ (outputs plan.md, signal: ready_for=propose)
csp-router reads signal
  ↓ (matches next=csp-spec-phase)
Load csp-spec-phase, pass in plan.md path
```

### 7.4 Skill Combination Templates

Pre-define skill sequences for common programming scenarios, stored in `csp-router/recipes.yaml`:

```yaml
recipes:
  # New feature development
  feature-development:
    description: "Develop new feature from scratch (with specs and tests)"
    triggers: ["new feature", "feature", "add feature", "implement XXX"]
    sequence:
      - skill: csp-brainstorming
        layer: 1
        optional: true  # Can skip if user has clear requirements
      - skill: csp-plan-phase
        layer: 2
        outputs: [plan_path]
      - skill: csp-spec-phase
        layer: 3
        inputs: [plan_path]
        outputs: [spec_path]
      - skill: csp-implement
        layer: 2
        inputs: [spec_path]
      - skill: csp-tdd
        layer: 1
        auto_select_stack: true
      - skill: csp-code-review
        layer: 4
        auto_select_stack: true
      - skill: csp-verify-phase
        layer: 2
      - skill: csp-ship
        layer: 2
        optional: true

  # Bug fix
  bug-fix:
    description: "Locate and fix bug"
    triggers: ["bug", "fix", "problem", "error"]
    sequence:
      - skill: csp-debug
        layer: 2
        outputs: [root_cause]
      - skill: csp-implement
        layer: 2
        inputs: [root_cause]
      - skill: csp-tdd
        layer: 1
        mode: regression-test  # Regression test mode
      - skill: csp-verify-phase
        layer: 2
        check: fix-confirmed

  # Code refactoring
  refactor:
    description: "Refactor existing code"
    triggers: ["refactor", "refactoring", "rewrite", "optimize structure"]
    sequence:
      - skill: csp-code-review
        layer: 4
        mode: architecture-analysis
        outputs: [refactor-plan]
      - skill: csp-plan-phase
        layer: 2
        inputs: [refactor-plan]
      - skill: csp-implement
        layer: 2
      - skill: csp-tdd
        layer: 1
        mode: ensure-no-regression
      - skill: csp-code-review
        layer: 4
        mode: verify-improvement

  # Quick fix (skip planning and specs)
  quick-fix:
    description: "Quick fix for small issues"
    triggers: ["quick fix", "small change", "simple fix"]
    sequence:
      - skill: csp-implement
        layer: 2
      - skill: csp-verify-phase
        layer: 2
        mode: quick-check
```

### 7.5 Dynamic Loading and Context Management

**Problem:** Early skills occupy context window during long sequence execution

**Solution: Phased Loading/Unloading**

```
Phase 1: Load csp-brainstorming (300 tokens)
  ↓ After execution, save output to brainstorm.md
  ↓ Unload csp-brainstorming (free 300 tokens)
  
Phase 2: Load csp-plan-phase (500 tokens)
  ↓ Read brainstorm.md as input
  ↓ After execution, save output to plan.md
  ↓ Unload csp-plan-phase (free 500 tokens)
  
Phase 3: Load csp-spec-phase (400 tokens)
  ↓ Read plan.md as input
  ...
```

**Context Budget Control:**
- Simultaneously active skills: ≤3
- Total token consumption per task: ≤10,000 tokens
- When budget exceeded: Prompt user to split task or select quick-fix mode

### 7.6 Feedback Loops and Error Recovery

**Non-linear execution: Allow backtracking**

```
csp-verify-phase fails
  ↓ (output: verification_failed, issues=[...])
csp-router reads failure reason
  ↓ (matches feedback_loop)
Roll back to csp-debug or csp-implement
  ↓ (pass in issues list)
Re-execute fix
  ↓
Again csp-verify-phase
```

**Maximum loop count: 3 times (prevent infinite loops)**

### 7.7 Data Exchange Format Between Skills

**Problem:** How do skills pass state and output to each other?

**Solution: Standardized Artifact Format**

Each skill's output is written to `.csp/artifacts/` directory, using unified format:

```yaml
# .csp/artifacts/plan-phase-2026-06-11.yaml
artifact:
  type: plan
  skill: csp-plan-phase
  timestamp: 2026-06-11T14:30:00Z
  status: completed
  
outputs:
  primary:
    path: ./plan.md
    format: markdown
    description: "Implementation plan document"
  
  metadata:
    estimated_effort: "2 hours"
    risk_level: medium
    dependencies: ["database-migration", "api-endpoint"]
    
next_skills:
  recommended: csp-spec-phase
  alternatives: [csp-execute-phase]
  
context:
  project_stack: [python, django, postgresql]
  related_files: [models.py, views.py, urls.py]
```

**Router reads artifact to decide next step:**

```python
# router pseudo-code
def route_after_skill_completion(artifact_path):
    artifact = load_yaml(artifact_path)
    
    # Prioritize user-specified next_skill
    if user_override:
        return user_override
    
    # Otherwise use recommended
    next_skill = artifact['next_skills']['recommended']
    
    # Pass outputs as input
    inputs = artifact['outputs']
    
    return load_skill(next_skill, inputs)
```

### 7.8 Programming Scenario Coverage Checklist

**Ensure common programming scenarios have corresponding recipes:**

| Scenario | Recipe Name | Key Skills |
|----------|-------------|------------|
| New feature development | `feature-development` | plan → propose → implement → tdd → review → verify |
| Bug fix | `bug-fix` | debug → implement → tdd → verify |
| Code refactoring | `refactor` | review(analysis) → plan → implement → tdd → review(verification) |
| Performance optimization | `performance-optimization` | profile → analyze → implement → benchmark → verify |
| Taking over unfamiliar project | `onboard-project` | explore → map-codebase → understand-architecture |
| Build error fix | `build-error-fix` | detect-error → resolve → verify-build |
| CI/CD failure | `ci-failure` | analyze-logs → debug → fix → verify-ci |
| Database migration | `database-migration` | plan-migration → generate → test → apply → verify |
| Dependency upgrade | `dependency-upgrade` | analyze-deps → plan-upgrade → test → verify |
| Security fix | `security-fix` | security-scan → analyze-vulnerability → fix → verify |
| Multi-stack project | `fullstack-feature` | plan → frontend-impl → backend-impl → integration-test |

### 7.9 User-Defined Recipe Extension

**Allow users to define their own skill combinations:**

Users can create `.csp/recipes.yaml` in project root:

```yaml
# .csp/recipes.yaml
recipes:
  # User-defined: Rapid prototyping
  rapid-prototype:
    description: "Rapid prototype, skip full tests and docs"
    triggers: ["prototype", "demo", "quick validation"]
    sequence:
      - skill: csp-brainstorming
        optional: true
      - skill: csp-implement
        layer: 2
      - skill: csp-verify-phase
        mode: basic-check  # Only check if it runs

  # User-defined: Hotfix
  hotfix:
    description: "Emergency production fix, minimal change"
    triggers: ["hotfix", "emergency", "production issue"]
    sequence:
      - skill: csp-debug
        layer: 2
      - skill: csp-implement
        mode: minimal-change
      - skill: csp-verify-phase
        mode: regression-only
      - skill: csp-ship
        auto: true  # Auto-release after verification passes
```

**Recipe Priority:**
1. User-defined recipes (`.csp/recipes.yaml`)
2. Built-in recipes (`csp-router/recipes.yaml`)
3. Router dynamic combination

### 7.10 Multi-Stack Project Handling Strategy

**Problem:** When developing both frontend and backend, how to select tech stack-related skills?

**Solution: Layered detection + Parallel activation**

```yaml
# Multi-stack project example
project_structure:
  frontend/
    package.json  # TypeScript + React
    tsconfig.json
  backend/
    pyproject.toml  # Python + Django
    manage.py
  shared/
    api-contracts.yaml  # OpenAPI specification

# Router detection strategy
stack_detection:
  strategy: directory-based  # Detect by directory separately
  
  zones:
    - path: frontend/
      stack: typescript-react
      skills: [react-reviewer, react-patterns, react-testing]
      
    - path: backend/
      stack: python-django
      skills: [csp-django-reviewer, csp-django-patterns, csp-python-testing]
      
    - path: shared/
      stack: api-contracts
      skills: [api-design, openapi-validation]
```

**Recipe handling multi-stack:**

```yaml
fullstack-feature:
  description: "Full-stack feature development (frontend+backend)"
  sequence:
    - skill: csp-plan-phase
      outputs: [frontend-plan, backend-plan, api-contract]
    
    - skill: csp-implement
      mode: parallel  # Parallel processing of frontend and backend
      zones:
        - path: backend/
          sub_recipe: [csp-spec-phase, csp-implement, csp-tdd]
          stack: python-django
        - path: frontend/
          sub_recipe: [csp-spec-phase, csp-implement, csp-tdd]
          stack: typescript-react
    
    - skill: csp-integration-test
      verify: api-contract-compliance
    
    - skill: csp-verify-phase
```

### 7.11 Automatic Error Signal Detection

**Router should automatically detect common error signals and trigger corresponding skills:**

```yaml
error_detection:
  # Build error
  build_error:
    triggers:
      - stderr_contains: ["error:", "Error:", "failed to compile", "build failed"]
      - exit_code: [1, 2]
      - file_patterns: ["*.log", "build.log"]
    auto_trigger: csp-build-error-fix
    context:
      capture: [stderr, exit_code, error_file]
  
  # Test failure
  test_failure:
    triggers:
      - stderr_contains: ["FAIL", "AssertionError", "test failed"]
      - exit_code: [1]
      - command_patterns: ["npm test", "pytest", "cargo test"]
    auto_trigger: csp-test-failure-debug
    context:
      capture: [test_output, failing_tests]
  
  # CI failure
  ci_failure:
    triggers:
      - file_patterns: [".github/workflows/*.yml", ".gitlab-ci.yml"]
      - context: ["post-push", "pr-check"]
    auto_trigger: csp-ci-failure
    context:
      capture: [ci_logs, failed_jobs]
  
  # Runtime error
  runtime_error:
    triggers:
      - stderr_contains: ["Exception", "Traceback", "panic:", "segmentation fault"]
      - exit_code: [1, 139]
    auto_trigger: csp-debug
    context:
      capture: [stack_trace, error_message]
```

**Detection timing:**
- After user executes bash command
- When user pastes error logs
- After Git push when CI fails (via hook detection)

### 7.12 Git Workflow Integration

**Deep integration with Git branches, PRs:**

```yaml
git_workflow:
  # Branch strategy
  branch_strategies:
    feature:
      pattern: "feature/*"
      recipe: feature-development
      auto_verify: true  # Auto-verify before commit
    
    hotfix:
      pattern: "hotfix/*"
      recipe: hotfix
      auto_verify: true
      auto_ship: true  # Auto-merge after verification passes
    
    refactor:
      pattern: "refactor/*"
      recipe: refactor
      auto_review: true  # Auto-trigger code review
  
  # Git Hook Integration
  hooks:
    pre-commit:
      - skill: csp-verify-phase
        mode: quick-check
        on_fail: abort-commit
    
    pre-push:
      - skill: csp-verify-phase
        mode: full-check
        on_fail: abort-push
    
    post-merge:
      - skill: csp-extract-learnings
        optional: true
  
  # PR Workflow
  pull_request:
    on_create:
      - skill: csp-code-review
        mode: comprehensive
      - skill: csp-verify-phase
        mode: ci-check
    
    on_review_comment:
      - skill: csp-implement
        mode: address-feedback
        context: [review_comments]
```

### 7.13 Test Strategy Matrix

**Test requirements for different scenarios:**

| Scenario | Unit Test | Integration Test | E2E Test | Performance Test |
|----------|-----------|------------------|----------|------------------|
| feature-development | ✅ Required | ✅ Required | ⚠️ Optional | ❌ Skip |
| bug-fix | ✅ Required (regression) | ✅ Required | ⚠️ Optional | ❌ Skip |
| refactor | ✅ Required (no regression) | ✅ Required | ✅ Required | ❌ Skip |
| performance-optimization | ⚠️ Optional | ⚠️ Optional | ❌ Skip | ✅ Required |
| hotfix | ✅ Required | ⚠️ Optional | ❌ Skip | ❌ Skip |
| database-migration | ❌ Skip | ✅ Required | ✅ Required | ❌ Skip |
| rapid-prototype | ❌ Skip | ❌ Skip | ❌ Skip | ❌ Skip |

**Test Skill Selection:**

```yaml
testing_strategy:
  unit_test:
    skills:
      python: [csp-python-testing, csp-pytest-patterns]
      typescript: [csp-react-testing, csp-jest-patterns]
      rust: [csp-rust-testing]
      go: [csp-golang-testing]
  
  integration_test:
    skills: [csp-integration-testing, csp-api-testing]
  
  e2e_test:
    skills: [csp-e2e-testing, csp-playwright-patterns]
  
  performance_test:
    skills: [csp-performance-testing, csp-benchmark-patterns]
```

### 7.14 Documentation Generation Integration

**When to generate docs, how to sync with code:**

```yaml
documentation_strategy:
  # Automatic doc generation timing
  auto_generate:
    on_feature_complete:
      - skill: csp-doc-writer
        mode: api-docs
        trigger: after csp-verify-phase succeeds
    
    on_refactor_complete:
      - skill: csp-doc-updater
        mode: update-architecture
        trigger: after csp-verify-phase succeeds
    
    on_api_change:
      - skill: csp-doc-writer
        mode: openapi-spec
        trigger: When API route changes detected
  
  # Doc type mapping
  doc_types:
    api_documentation:
      skill: csp-doc-writer
      format: [openapi, markdown]
      auto: true
    
    architecture_docs:
      skill: csp-doc-writer
      format: [mermaid, markdown]
      auto: false  # Manual trigger needed
    
    changelog:
      skill: csp-doc-writer
      mode: changelog
      trigger: After csp-ship succeeds
      auto: true
    
    inline_comments:
      skill: csp-code-review
      mode: suggest-comments
      auto: true  # Auto-suggest during code review
```

### 7.15 Configuration and Environment Management

**Handling of environment variables, config files:**

```yaml
config_management:
  # Environment awareness
  environment_detection:
    sources:
      - .env
      - .env.local
      - .env.production
      - config/
      - settings.py
      - application.yml
    
    skill_context:
      inject_env_vars: true  # Inject env vars into skill context
      mask_secrets: true     # Auto-mask sensitive info
  
  # Config file change detection
  config_change_detection:
    patterns:
      - "*.env*"
      - "config/**"
      - "settings.*"
      - "*.yml"
      - "*.yaml"
    
    auto_trigger:
      - skill: csp-verify-phase
        mode: config-validation
      - skill: csp-security-review
        mode: secret-scan
  
  # Database config
  database_config:
    detect_from:
      - DATABASE_URL
      - db_config.py
      - database.yml
    
    related_skills:
      - csp-database-migration
      - csp-database-reviewer
```

### 7.16 Skill Version Management and Updates

**How to manage skill versions and updates:**

```yaml
versioning:
  # Skill version format
  skill_version:
    format: semver  # major.minor.patch
    example: "1.2.3"
    
    compatibility:
      - major: breaking changes
      - minor: new features, backward compatible
      - patch: bug fixes
  
  # Update strategy
  update_strategy:
    check_interval: weekly  # Check updates weekly
    sources:
      - github: code-skills-package/skills
      - registry: csp-registry.example.com
    
    auto_update:
      patch: true   # Auto-update patch versions
      minor: false  # Minor versions need confirmation
      major: false  # Major versions need confirmation
  
  # Version locking
  version_lock:
    file: .csp/versions.lock
    format: |
      csp-plan-phase@1.2.3
      csp-code-review@2.0.1
      csp-debug@1.5.0
    
    update_command: /csp-update [--check] [--apply]
```

### 7.17 Conflict Handling and Priority

**Handling when multiple skill recommendations conflict:**

```yaml
conflict_resolution:
  # Conflict types
  conflict_types:
    # Multiple skills match same category
    same_category:
      strategy: priority-based
      rules:
        - user_explicit > auto_detected  # User specified priority
        - specific > general             # Specific before generic
        - higher_priority wins           # Sort by priority field
    
    # Mutually exclusive skills activated simultaneously
    mutually_exclusive:
      examples:
        - [csp-quick-fix, csp-feature-development]
        - [csp-rapid-prototype, csp-full-verification]
      strategy: ask_user  # Ask user to choose
    
    # Dependency conflicts
    dependency_conflict:
      strategy: resolve_or_skip
      rules:
        - Try to find compatible versions
        - Abort if cannot resolve, prompt user
  
  # Priority rules
  priority_rules:
    user_override: 1000      # User explicitly specified
    recipe_match: 100        # Recipe match
    trigger_exact: 50        # Exact trigger word
    trigger_fuzzy: 20        # Fuzzy trigger word
    stack_detection: 10      # Tech stack detection
    context_match: 5         # Context match
```

### 7.18 CSP Self-Debugging and Monitoring

**Debug mechanisms when router selects wrong skill or execution is abnormal:**

```yaml
self_debugging:
  # Execution logs
  execution_log:
    location: .csp/logs/
    format: jsonl
    retention: 30d
    
    fields:
      - timestamp
      - user_input
      - router_decision  # Skills router selected
      - confidence       # Confidence level
      - actual_skill     # Actually executed skill
      - duration
      - success
  
  # Debug commands
  debug_commands:
    /csp-why:
      description: "Explain why this skill was chosen"
      output: router_decision_trace
    
    /csp-debug-router:
      description: "Debug router decision process"
      output: detailed_matching_log
    
    /csp-stats:
      description: "View CSP usage statistics"
      output: |
        - Total executions
        - Success rate
        - Common skills
        - Average time
  
  # Performance monitoring
  performance_monitoring:
    metrics:
      - router_latency      # Router decision time
      - skill_load_time     # Skill loading time
      - total_execution_time # Total execution time
      - token_usage         # Token usage
    
    alerts:
      - router_latency > 2s
      - token_usage > 8000
      - success_rate < 80%
```

---

## 8. Skill Quick Search and Location

When users or routers need to reverse-lookup "which skill can handle X", sub-second location capability is needed, not traversing ~570 SKILL.md files. This section defines four-tier search strategies, escalating by cost from low to high.

### 8.1 Four-Tier Search Strategy

| Tier | Method | Tool | Latency | Use Case |
|------|--------|------|---------|----------|
| L1 Index Scan | Read `registry.json` matching name/description/triggers | jq / node | <50ms | Known keywords or skill name fragments |
| L2 Trigger Word Reverse Lookup | grep `triggers.yaml` keyword table | ripgrep | <20ms | Known user words, reverse skill lookup |
| L3 Full Text Semantic Search | grep concepts/terms in all SKILL.md | ripgrep + context | <200ms | Only remember concept ("CORS", "migration") |
| L4 Fuzzy Match | fzf / vector index (optional) | fzf / embedding | <500ms | Uncertain spelling or semantic fuzzy |

### 8.2 L1:registry.json Index Scan

**Resident Entry**: Router loads `registry.json` at startup, can directly use `jq` filtering:

```bash
# Fuzzy match by name
jq '.skills[] | select(.name | test("react"; "i"))' registry.json

# Match by trigger words
jq '.skills[] | select(.triggers.keywords | any(contains("review")))' registry.json

# Filter by tech stack
jq '.skills[] | select(.stack_detection == true and .stacks[] == "python")' registry.json

# Compound filter by layer + category
jq '.skills[] | select(.layer == 4 and .category == "reviewer")' registry.json
```

**Wrapper Script**: `shared/scripts/csp-search.sh`

```bash
#!/usr/bin/env bash
# Usage: csp-search <query> [--layer N] [--stack X] [--category Y]
query="$1"; shift
filters="true"
while [[ "$1" == --* ]]; do
  case "$1" in
    --layer)    filters="$filters and .layer == $2"; shift 2 ;;
    --stack)    filters="$filters and (.stacks // [] | any(. == \"$2\"))"; shift 2 ;;
    --category) filters="$filters and .category == \"$2\""; shift 2 ;;
  esac
done

jq -r --arg q "$query" \
  ".skills[] | select(
    ($filters) and
    ((.name | test(\$q; \"i\")) or
     (.description | test(\$q; \"i\")) or
     (.triggers.keywords // [] | any(test(\$q; \"i\"))))
  ) | \"\(.name)\t\(.layer)\t\(.description)\"" \
  csp-router/registry.json | column -t -s $'\t'
```

**Example**:

```bash
$ csp-search "review" --stack python --layer 4
csp-python-reviewer   4   Python specialized review: PEP8, type hints, security, performance
csp-django-reviewer   4   Django specialized review: ORM, DRF, migration security
csp-fastapi-reviewer  4   FastAPI specialized review: async, dependency injection, Pydantic
```

### 8.3 L2:Trigger Word Reverse Lookup (triggers.yaml grep)

When user says "help me do a CR", router needs to quickly locate code-review type skills. `triggers.yaml` is inverted index:

```yaml
# csp-router/triggers.yaml (snippet)
trigger_index:
  "review":
    skills: [csp-code-review, csp-requesting-code-review]
    weight: 50
  "CR":
    skills: [csp-code-review]
    weight: 40
  "debug":
    skills: [csp-debug, csp-systematic-debugging, csp-debug-session]
    weight: 50
  "bug":
    skills: [csp-debug]
    weight: 45
```

**Search Command**:

```bash
# Exact trigger word
rg -A2 '^  "review":' csp-router/triggers.yaml

# Fuzzy trigger word (supports Chinese/English)
rg -B1 -A3 'skills:.*csp-debug' csp-router/triggers.yaml
```

### 8.4 L3:SKILL.md Full Text Semantic Search

When user description is fuzzy ("that skill for handling CORS") or remembers only concept, full text search in all SKILL.md:

```bash
# Across all SKILL.md search concepts
rg -l "CORS" csp-*/skills/**/SKILL.md csp-*/agents/**/*.md

# View with context (-C 3 lines)
rg -C3 "CORS" csp-patterns/skills/csp-frontend-patterns/react-patterns.md

# Search frontmatter fields (name/description)
rg -g "**/SKILL.md" "^description:.*migration" -l

# Search specific API in code examples
rg -l "useEffect" csp-*/skills/**/*.md | head -5
```

**Wrapper Script**: `shared/scripts/csp-grep.sh`

```bash
#!/usr/bin/env bash
# Usage: csp-grep <pattern> [--type skill|agent|all] [--layer N]
pattern="$1"; shift
type="all"
layer=""
while [[ "$1" == --* ]]; do
  case "$1" in
    --type)  type="$2"; shift 2 ;;
    --layer) layer="$2"; shift 2 ;;
  esac
done

search_paths=()
[[ "$type" == "all" || "$type" == "skill" ]] && search_paths+=("csp-*/skills/**/SKILL.md")
[[ "$type" == "all" || "$type" == "agent" ]] && search_paths+=("csp-*/agents/**/*.md")

if [[ -n "$layer" ]]; then
  search_paths=("csp-layer${layer}-*/**/*.md")
fi

rg -l "$pattern" "${search_paths[@]}" | while read -r f; do
  name=$(grep -m1 "^name:" "$f" | sed 's/name: *//')
  echo "$name  →  $f"
done
```

### 8.5 L4:Fuzzy Match (fzf / Vector)

**fzf Interactive Mode**:

```bash
# Interactive skill selector
csp-search "" | fzf --preview 'jq ".skills[] | select(.name == \"{}\")" csp-router/registry.json'

# One-click load selected skill
csp-search "react" | fzf | awk '{print $1}' | xargs -I{} csp-load {}
```

**Vector Semantic Index (Optional Enhancement)**:

Generate embeddings for SKILL.md descriptions and triggers, store in `~/.csp/skill-index.faiss`, only enable when skills > 500 or semantic queries frequent, to avoid premature design.

### 8.6 Search Strategy Selection Decision Tree

```
User inputs query
  │
  ├─ Query is skill name fragment? ("react-rev")
  │   └─ L1: jq fuzzy match registry.json  ✅ <50ms
  │
  ├─ Query is trigger word? ("review"/"debug"/"plan")
  │   └─ L2: grep triggers.yaml  ✅ <20ms
  │
  ├─ Query is tech concept? ("CORS"/"migration"/"JWT")
  │   └─ L3: ripgrep all SKILL.md  ✅ <200ms
  │
  ├─ Query fuzzy or uncertain spelling? ("that concurrent one")
  │   ├─ Priority: L3 + keyword expansion
  │   └─ Fallback: L4 fzf interactive selection  ✅ <500ms
  │
  └─ Query needs semantic understanding? ("make website faster")
      └─ L4 vector index (if built)  ✅ <500ms
      └─ Or L3 synonym expansion ("performance|optimization|accelerate|slow")
```

### 8.7 Index Maintenance and Consistency

**Trigger Timing**:

| Event | Action |
|-------|--------|
| Add/delete skill | Auto-update `registry.json` + `triggers.yaml` |
| Modify SKILL.md frontmatter | Auto-sync `registry.json` |
| Modify SKILL.md content | No effect on index, no action needed |
| User executes `csp-update` | Rebuild all indexes |
| Manual trigger | `csp-reindex` command |

**Verification Command**:

```bash
csp-reindex --dry-run
# [OK]   csp-react-reviewer: registry ↔ SKILL.md consistent
# [WARN] csp-go-reviewer: SKILL.md modified, need to sync description
# [ERR]  csp-orphan-skill: SKILL.md exists but no record in registry

csp-reindex --apply   # Apply fixes
```

### 8.8 Cross-Platform Tool Compatibility

| Platform | grep Alternative | Install |
|----------|------------------|---------|
| macOS/Linux | ripgrep (`rg`) | `brew install ripgrep` / `apt install ripgrep` |
| Windows | ripgrep or `Select-String` | `scoop install ripgrep` |
| No ripgrep | Fall back to `grep -rE` | System built-in |
| No jq | Fall back to node/python parsing | `npm install -g node-jq` |

**Downgrade Strategy**:

```bash
if command -v rg &>/dev/null; then
  GREP_CMD="rg"
elif command -v grep &>/dev/null; then
  GREP_CMD="grep -rE"
else
  echo "ERROR: no grep tool found" >&2; exit 1
fi
```

---

## 9. Token Saving Strategy

### 9.1 Three-Level Loading

| Level | Content | Loading Time | Size |
|-------|---------|--------------|------|
| **Index** | registry.json entries | Session start | ~60 tokens/skill × ~570 skills = ~32K |
| **Content** | SKILL.md main body | After router match | ~200-600 tokens/skill |
| **Depth** | references/*, examples/* | On-demand during execution | Variable |

### 9.2 Index Optimization

The `description` field in registry.json is kept within 80 characters, only putting routing-needed info.
Complete skill documentation is in SKILL.md, loaded only after matching.

### 9.3 Context Budget

Token budget upper limit for skills activated in single task:

| Task Complexity | Max Activations | Token Budget |
|-----------------|-----------------|--------------|
| Simple (single skill) | 1-2 | ~1,200 |
| Medium (workflow + patterns) | 3-4 | ~3,000 |
| Complex (full pipeline plan→execute→verify) | 5 | ~5,000 |

---

## 10. Merge Strategy Detailed Rules

### 10.1 Overlapping Skill Merge Principles

When multiple sources have similar skills:

1. **Choose most complete version** as base
2. **Absorb unique points from other versions** as supplementary sections
3. **Unify naming**, remove source prefixes
4. **Record mapping in MIGRATION.md**

### 10.2 Specific Merge Cases

#### Code Review

| Source | Original Name | Processing |
|--------|---------------|------------|
| ECC | `code-reviewer` agent | ✅ As main agent |
| ECC | 14 language-specific reviewers | ✅ All retained |
| GSD | `gsd-code-reviewer` | 🔀 REVIEW.md output format merged into main agent |
| **Runtime** | `code-reviewer` | 🔀 Severity rating logic merged into main agent |
| **Runtime** | `critic` | 🔀 Multi-angle review logic merged |
| SP | `requesting-code-review` | ✅ Retained as meta skill |
| SP | `receiving-code-review` | ✅ Retained as meta skill |

Merge result:
- `csp-patterns/skills/code-review/SKILL.md` — Unified review process
- `csp-patterns/agents/code-reviewer.md` — Unified review agent (includes REVIEW.md output)
- `csp-patterns/skills/reviewers/<lang>-reviewer.md` — Language-specific (14 items)
- `csp-meta/skills/csp-requesting-code-review/SKILL.md` — Meta skill (how to request)
- `csp-meta/skills/csp-receiving-code-review/SKILL.md` — Meta skill (how to receive)

#### Debug

| Source | Original Name | Processing |
|--------|---------------|------------|
| GSD | `gsd-debug-session-manager` | ✅ Retained multi-round management architecture |
| GSD | `gsd-debugger` | ✅ Retained scientific method debugging |
| **Runtime** | `debugger` | 🔀 Root cause analysis merged |
| **Runtime** | `trace` + `tracer` | 🔀 Evidence tracking merged into GSD forensics |
| ECC | `agent-introspection-debugging` | ✅ Retained (Agent introspection unique) |
| SP | `systematic-debugging` | ✅ Retained as meta skill |

Merge result:
- `csp-workflow/commands/csp-debug.md` — Debug workflow entry
- `csp-workflow/agents/csp-debug-session-manager.md` — Multi-round management
- `csp-workflow/agents/csp-debugger.md` — Scientific debugging agent
- `csp-workflow/workflows/csp-forensics.md` — Forensic analysis (absorbed trace capabilities)
- `csp-patterns/skills/csp-agent-introspection-debugging/SKILL.md` — Agent introspection
- `csp-meta/skills/csp-systematic-debugging/SKILL.md` — Meta skill

---

## 11. User Onboarding Path

### 11.1 Installation

```bash
# Method 1: Direct copy
cp -r code-skills-package/ ~/.csp/
# Reference in CLAUDE.md

# Method 2: Claude Code Plugin
# (Future) claude plugin install csp
```

### 11.2 First Use

User only needs to add one line in CLAUDE.md:
```markdown
Use CSP (Code Skills Package) skills. When user gives task, route through csp-router first.
```

Then give Claude tasks normally, router will work automatically.

### 11.3 Progressive Learning

| Stage | User Action | System Behavior |
|-------|-------------|-----------------|
| **Newbie** | Directly describe task | Router auto-selects skill, user doesn't need to know skill names |
| **Intermediate** | Use slash commands (like `/csp-debug`) | Directly trigger specific workflows |
| **Advanced** | Read SKILL-INDEX.md to understand all capabilities | Manually specify skill combinations |
| **Expert** | Write custom skills | Extend according to SP's SKILL.md format |

### 11.4 Slash Commands

CSP provides unified slash command prefix `/csp-`, **does not retain** any original project prefixes:

```
/csp-plan          # Enter planning phase
/csp-debug         # Enter debugging workflow
/csp-review        # Code review
/csp-test          # Testing workflow
/csp-ship          # Release workflow
/csp-spec          # Specification-driven workflow
/csp-spec-phase    # Clarify phase requirements
/csp-execute-phase # Execute phase plan
/csp-verify-phase  # Verify implementation
/csp-search <query> # Search skill index
/csp-why           # Explain routing decision
/csp-stats         # View usage statistics
```

**Note**: No compatibility entry for original prefixes like `/gsd-`, `/csp-`, `/ecc-`.

---

## 12. Migration Plan

### Phase 1: Skeleton Setup (Completed ✅ 2026-06-11)
- [x] Project root directory creation
- [x] SKILL-INDEX.md generation
- [x] ARCHITECTURE.md finalization (includes thirteen core design principles)
- [x] SKILL-INDEX.md coverage audit (full verification of 5 reference projects, 2026-06-11)
- [x] CLAUDE.md main entry creation (routing instructions + installation guide)
- [x] Directory skeleton creation (csp-router/ csp-meta/ csp-workflow/ csp-meta/skills/csp-spec-driven-development/ csp-patterns/ csp-runtime/ shared/)
- [x] csp-router implementation (registry.json + triggers.yaml + SKILL.md)
- [x] MIGRATION.md source→CSP mapping table
- [x] ARCHITECTURE.md.bak cleanup (old backup)

### Phase 2: Meta Skills Migration (L1)
- [x] Copy SP 14 skills → csp-meta/skills/ (✅ 2026-06-14, actually 22 including later additions)
- [x] Verify frontmatter format consistency (✅ 2026-06-14, unified layer/name/description fields, 99.3% compliance)

### Phase 3: Workflow Migration (L2)
- [x] Copy GSD commands → csp-workflow/commands/ (✅ 2026-06-14, already exists)
- [x] Copy GSD agents → csp-workflow/agents/ (✅ 2026-06-14, already exists)
- [x] Handle GSD hooks dependencies (✅ 2026-06-14, hooks independent)
- [x] Handle path references (✅ 2026-06-14, paths consistent)

### Phase 4: Specification-Driven Integration (L3)
- [x] Specification-driven absorbed into csp-meta + csp-workflow
- [x] schemas → csp-meta/skills/csp-spec-driven-development/schemas/
- [x] Write CLI integration instructions

### Phase 5: Technology Library Migration (L3)
- [x] Copy ECC skills → csp-patterns/skills/ (✅ 2026-06-14, already exists)
- [x] Copy ECC agents → csp-patterns/agents/ (✅ 2026-06-14, already exists)
- [x] Merge overlapping items (code-review, debug, verify, etc.) (✅ Completed in Phase 1)
- [x] Generate registry.json (✅ Verified consistency, 0 missing paths)

### Phase 6: Runtime Migration (L4)
- [x] Select runtime unique skills → csp-runtime/skills/ (✅ 2026-06-14, already exists)
- [x] Verify independence (remove internal dependencies) (✅ 2026-06-14, internal references cleaned)

### Phase 7: Testing & Documentation
- [x] End-to-end testing: Given task→router→skill execution
- [x] Complete MIGRATION.md
- [x] Write user guide

---

## 13. Open Questions and Decision Records

### Decided

| # | Question | Decision | Reason |
|---|----------|----------|--------|
| 1 | registry.json scale and loading strategy | **Slice loading**: Slice by node type, skill names linked to task scenarios, router loads by trigger rules, csp-auto loads dynamically by DAG nodes | Full ~32K tokens, sliced single task only ~500-1,500 tokens, 87-96% savings |
| 2 | Specification-driven | **Absorbed into GSD workflow + meta skills**, no external CLI dependency |
| 3 | GSD hooks integration | **All migrated**, adjust paths and configs according to CSP project structure | Hooks are GSD core capability, ensure workflow protection complete |
| 4 | Version management and update sync | Write script to pull latest commits from source projects, record updated features, generate `update-plan-[date].md` for manual review | Semi-automatic process: script discovers changes, human decides whether to merge |
| 5 | Multi-platform support | **Full platform support**: Claude Code / Cursor / Windsurf / Kiro / Codex / Gemini CLI, provide one-click automated installation script | Maximize coverage, all platforms deployed via standardized installation script |
| 6 | State-aware routing | **Integrated state detection**: git status, tech stack, development phase, test status | Provide context-aware intelligent routing, improve accuracy |
| 7 | Skill Knowledge Graph | **Introduce SKPG**: Establish relationship graph between skills, support dependency analysis and path planning | Enhance skill discovery and recommendation capabilities |

### Installation Script Design (All Platforms)

```bash
# One-click installation (auto-detect platform)
curl -fsSL https://csp.dev/install.sh | bash

# Or manually specify platform
csp-install --platform claude-code   # Claude Code
csp-install --platform cursor        # Cursor
csp-install --platform windsurf      # Windsurf
csp-install --platform kiro          # Kiro
csp-install --platform codex         # Codex
csp-install --platform gemini        # Gemini CLI
```

Installation script responsible for:
1. Detect target platform config directory (like `~/.claude/`, `~/.cursor/`)
2. Copy CSP files to corresponding directory
3. Generate platform-specific config files (CLAUDE.md / .cursorrules / .windsurfrules, etc.)
4. Configure hooks and slash commands
5. Verify installation result

### Version Update Script Design

```bash
# Check and generate update plan
csp-update-check

# Output: update-plan-2026-06-11.md
# Content:
# - ECC: 3 new skills, 2 bug fixes since last sync
# - GSD: 1 new workflow, hook improvements
# - Runtime: no changes
# - SP: no changes
#
# Suggested operations:
# [ ] Merge ECC react-performance skill
# [ ] Merge GSD hook improvements

# Execute update (after manual review)
csp-update-apply --plan update-plan-2026-06-11.md
```

### Pending Discussion

(None)

---

## 14. Core Design Principles Explained

### 14.1 User Onboarding: Three-Tier Entry, Zero Learning Cost

CSP provides three usage methods, covering all user personas from beginner to expert:

| Entry Tier | Usage Method | Example | Target Users |
|------------|--------------|---------|--------------|
| **Natural Language** (recommended) | Directly describe task | "Help me do a code review" | All users |
| **Slash Commands** (intermediate) | `/csp-xxx` | `/csp-plan-phase` | Command-savvy users |
| **Direct Call** (expert) | Manually specify skill | Load `csp-react-reviewer` | Advanced users |

**Complete Natural Language Flow:**

```
User: "Help me do a code review"
  ↓
Router (L0 resident):
  1. Trigger word match: "code review" → csp-code-review type
  2. File detection: Project has .tsx → TypeScript + React
  3. State awareness: Current phase=building →偏向 build type skills
  4. Combination decision: Load csp-code-review + csp-react-reviewer + csp-tdd
  ↓
Execution: Output REVIEW.md
```

**Install and Use**: `./install.sh` one-click deployment to 18 platforms, no configuration needed.

---

### 14.2 Progressive Disclosure: Frequency-Driven Layered Loading

Current six-layer architecture disclosure strategy by usage frequency:

| Layer | Disclosure Timing | Token Cost | Usage Frequency |
|-------|-------------------|------------|-----------------|
| L0 router | Session start resident | ~800 | 100% (every session) |
| L1 meta | When methodology needed | ~300/skill | High (planning/debugging/TDD) |
| L2 workflow | Project management workflow | ~500/skill | High (plan/execute/verify) |
| L3 spec | Specification-driven | ~400/skill | Medium (large features) |
| L4 patterns | Tech stack identified | ~200-600/skill | Medium (specialized review) |
| L4 runtime | Autonomous execution/knowledge management | ~300/skill | Low (autopilot/ralph) |

**Enhanced Disclosure Strategy:**

1. **Scenario Template (Bundle)**: Pre-define skill combinations for common scenarios, load related skill collections in one go

   | Scenario Bundle | Includes Skills | Trigger Condition |
   |-----------------|-----------------|-------------------|
   | New feature development bundle | csp-plan-phase + csp-execute-phase + csp-verify-phase | "Develop a new feature" |
   | Bug fix bundle | csp-debug + csp-systematic-debugging + language reviewer | "Bug needs fixing" |
   | Code Review bundle | csp-code-review + language reviewer + csp-security-review | "Review this code" |
   | Security audit bundle | csp-security-review + csp-secure-phase + framework security skill | "Security review" |

2. **Context-Aware Loading:**
   - Detect `.planning/` directory exists → Auto-preload workflow-related skills
   - Detect `specs/` directory exists → Auto-preload spec-driven related skills
   - Detect git merge conflict → Auto-suggest conflict resolution skills

---

### 14.3 Token Saving: Four-Tier Optimization Strategy

**First Tier: Index Slicing (Designed)**

```
Full load 570 skills:  ~32,000 tokens
Sliced on-demand load:            ~2,000 tokens
Saving:                    94%
```

**Second Tier: Skill Summary Cache**

Router maintains single-line summary of each skill in `registry.json` (~30 tokens). Router only needs to read summary to determine if full SKILL.md needs loading.

```json
{
  "name": "csp-react-reviewer",
  "summary": "React/JSX specialized review: hook correctness, render performance, server/client boundary",
  "tokens": 25
}
```

Avoid repeated reading of already-used skill content. Expected gain: **-15% duplicate loading**.

**Third Tier: Dynamic Unloading**

After task completion, unload L4-L5 layer skill content, retain only L0-L2 core context.

```
Execute csp-react-reviewer complete
  → Unload L4 skill content (free ~400 tokens)
  → Retain execution result summary (~50 tokens)
```

Expected gain: **-30% long session token consumption**.

**Fourth Tier: Shared Context**

Multiple skills share `.planning/` and `.specs/` directories, avoid re-transmitting project context during cross-skill calls.

```
csp-plan-phase → Write .planning/PLAN.md
csp-execute-phase → Read .planning/PLAN.md (no need to re-pass project background)
csp-verify-phase → Read .planning/PLAN.md + .planning/VERIFICATION.md
```

Expected gain: **-20% cross-skill call overhead**.

**Combined Effect:**

| Optimization Tier | Strategy | Individual Gain | Combined Effect |
|-------------------|----------|-----------------|-----------------|
| First Tier | Index slicing | 94% | Baseline |
| Second Tier | Summary cache | -15% | Save additional 15% on baseline |
| Third Tier | Dynamic unloading | -30% | Significantly lower long session |
| Fourth Tier | Shared context | -20% | Multi-skill collaboration scenario |

---

### 14.4 Routing Strategy: Six-Layer Signal Fusion

Router uses six-layer signal fusion, by priority from high to low:

```
┌─────────────────────────────────────────────────┐
│  Signal Layer 1: Explicit Instruction (Highest Priority) │
│  ─ User says "use TDD approach" → Force csp-test-driven-development │
├─────────────────────────────────────────────────┤
│  Signal Layer 2: State Awareness (Weight 25%) │
│  ─ git=dirty →偏向 debug type │
│  ─ phase=review →偏向 review type │
│  ─ test=failing →偏向 debug type │
├─────────────────────────────────────────────────┤
│  Signal Layer 3: Trigger Word Match (Weight 30%) │
│  ─ "review" → code-review type │
│  ─ "debug"/"bug" → debug type │
│  ─ "plan"/"planning" → planning type │
├─────────────────────────────────────────────────┤
│  Signal Layer 4: File Type Detection (Weight 20%) │
│  ─ .py → Python reviewer │
│  ─ .tsx/.jsx → React reviewer │
│  ─ .rs → Rust reviewer │
│  ─ .go → Go reviewer │
├─────────────────────────────────────────────────┤
│  Signal Layer 5: Project Structure Detection (Weight 15%) │
│  ─ pyproject.toml / requirements.txt → Python tech stack │
│  ─ Cargo.toml → Rust tech stack │
│  ─ package.json + next.config.js → Next.js tech stack │
│  ─ go.mod → Go tech stack │
├─────────────────────────────────────────────────┤
│  Signal Layer 6: Historical Preference (Weight 10%) │
│  ─ User last used csp-django-reviewer → Prioritize recommendation next time │
│  ─ Record in ~/.csp/preferences.json │
└─────────────────────────────────────────────────┘
```

**Multi-Skill Combination Example:**

```
User: "Help me plan and implement user authentication feature"

Router decision process:
  Signal 1: No explicit instruction → Skip
  Signal 2: State detection: git=clean, phase=planning →偏向 plan type
  Signal 3: Trigger word match: "planning" → csp-plan-phase (L2) [Weight 50]
  Signal 4: No specific file type → Skip
  Signal 5: Detect Django project → csp-django-security (L4) [Weight 40]
  Signal 6: Historical preference → Skip

  Combined execution: plan → auth-patterns → django-security → verify
```

**Routing Decision Output Format:**

```markdown
## Routing Decision

**State**: git=clean | lang=python | phase=planning

**Matching skills** (Confidence):
1. csp-plan-phase [plan] — 78%
2. csp-auth-patterns [build] — 65%
3. csp-django-security [review] — 52%

**Decision**: Top 3 candidates — Please confirm

**SKPG Hint**: csp-plan-phase depends on csp-brainstorming
```

---

### 14.5 Architecture Enhancement Directions

#### A. Router Intent Classification (Lightweight)

Add four intent classification rules in router, only ~100 tokens rule definition:

| Intent | Trigger Pattern | Default Load Layer |
|--------|-----------------|--------------------|
| **Planning** | "planning/design/architecture" | L1(meta) + L2(workflow) |
| **Implementation** | "implement/add/create" | L4(patterns) |
| **Debugging** | "bug/debug/error/crash" | L1(meta) + L2(workflow) |
| **Review** | "review/check/security" | L4(patterns) |

Intent classification doesn't rely on external models, only uses trigger words + regex matching, keeping router lightweight.

#### B. Skill Dependency Graph

Declare dependency relationships for each skill in `registry.json`, router automatically loads prerequisite skills:

```json
{
  "name": "csp-django-reviewer",
  "layer": 4,
  "dependsOn": ["csp-python-reviewer", "csp-security-reviewer"],
  "summary": "Django specialized review: ORM correctness, DRF patterns, migration security"
}
```

**Loading Logic:**
```
Router selects csp-django-reviewer
  → Check dependsOn → Find csp-python-reviewer not loaded
  → Load csp-python-reviewer first (summary 30 tokens + content 350 tokens)
  → Then load csp-django-reviewer (content 400 tokens)
  → Two reviewers share context execution
```

**Dependency Types:**

| Type | Field | Semantics | Example |
|------|-------|-----------|---------|
| Hard dependency | `dependsOn` | Must load first | django-reviewer depends on python-reviewer |
| Soft dependency | `enhances` | Optional enhancement | security-review enhances code-review |
| Mutual exclusion | `conflicts` | Cannot load simultaneously | Different framework reviewers |

#### C. Session State Persistence

Persist session state in `~/.csp/` directory, reusable across sessions:

```
~/.csp/
├── session-state.json    # Currently loaded skill list for this session
├── preferences.json      # User preferences (common languages, preferred skills)
└── history.jsonl         # Historical task records (for recommendations)
```

**session-state.json Structure:**

```json
{
  "session_id": "2026-06-11-abc123",
  "loaded_skills": [
    {"name": "csp-plan-phase", "layer": 2, "loaded_at": "2026-06-11T10:00:00Z"},
    {"name": "csp-react-reviewer", "layer": 4, "loaded_at": "2026-06-11T10:05:00Z"}
  ],
  "project_context": {
    "languages": ["typescript", "python"],
    "frameworks": ["nextjs", "django"],
    "build_tools": ["vite", "poetry"]
  }
}
```

**preferences.json Structure:**

```json
{
  "preferred_languages": ["python", "typescript"],
  "preferred_reviewers": ["csp-python-reviewer", "csp-react-reviewer"],
  "auto_load_on_start": ["csp-code-review"],
  "last_used": "2026-06-11T10:30:00Z"
}
```

**Usage Scenarios:**
- At new session start, router reads `preferences.json`, prioritize recommended common skills
- After task completion, update `session-state.json` to record loaded skills
- When opening same project in next session, skip known tech stack detection steps
</content>