# CSP Router Pipeline — Technical Reference

## Overview

The CSP v2 router implements a 5-stage intelligent routing pipeline that combines state detection, keyword matching, intent classification, confidence scoring, and knowledge graph enhancement to route user tasks to the most appropriate skills.

## Pipeline Stages

### Stage 1: State Detection (Pre-Router Hook)

**File:** `shared/scripts/state-detector.mjs`  
**Output:** `.csp/state.json`

The state detector runs before routing and captures project context:

```javascript
// Run state detection
node shared/scripts/state-detector.mjs
```

**Detected signals:**

| Signal | Detection Method | Possible Values |
|--------|-----------------|-----------------|
| `git_status` | `git status --porcelain` | `clean`, `dirty`, `conflict` |
| `tech_stack` | Project file scanning | `python`, `typescript`, `go`, `rust`, `java`, etc. |
| `phase` | Directory structure analysis | `planning`, `building`, `testing`, `shipping` |
| `test_status` | Test result files | `passing`, `failing`, `unknown` |

**State JSON format:**
```json
{
  "git_status": "clean",
  "tech_stack": ["python", "typescript"],
  "phase": "building",
  "test_status": "passing",
  "timestamp": "2026-06-19T10:30:00Z"
}
```

This state is consumed by subsequent pipeline stages for context-aware routing.

---

### Stage 2: Keyword + Intent Matching

**Files:** `triggers.yaml`, `intent_patterns`, `stack_rules`

#### 2.1 Trigger Word Matching
Reads `triggers.yaml` to map user input keywords to candidate skills:

```yaml
"review":
  skills: [csp-code-reviewer]
  weight: 50
"审查":
  skills: [csp-code-reviewer]
  weight: 50
```

#### 2.2 Intent Classification
Semantic pattern matching identifies the user's intent:
- **build**: Implementation, feature development
- **debug**: Problem investigation, bug fixing
- **plan**: Architecture design, task breakdown
- **test**: Test writing, coverage improvement
- **review**: Code review, security audit

#### 2.3 Tech Stack Matching
Matches detected tech stack to language/framework-specific skills:
- `python` → `csp-python-patterns`, `csp-python-testing`
- `typescript` → `csp-react-patterns`, `csp-typescript-reviewer`
- `go` → `csp-golang-patterns`, `csp-golang-testing`

---

### Stage 3: Confidence Scoring

**File:** `shared/scripts/confidence-router.mjs`

Computes a weighted confidence score for each candidate skill:

```
confidence = keyword_score × 0.4
           + intent_score × 0.3
           + context_score × 0.3
```

**Context score adjustments:**

| Condition | Adjustment |
|-----------|------------|
| Current phase matches skill phase | +0.2 |
| Tech stack matches skill domain | +0.15 |
| Git dirty + debug skill | +0.1 |
| Git conflict + merge skill | +0.15 |

**Output format:**
```json
{
  "skill": "csp-tdd",
  "confidence": 0.78,
  "breakdown": {
    "keyword_score": 0.85,
    "intent_score": 0.72,
    "context_score": 0.75
  }
}
```

---

### Stage 4: Routing Decision

Based on the highest confidence score, the router makes one of three decisions:

| Confidence | Decision | Action |
|------------|----------|--------|
| > 80% | Direct route | Load top skill immediately |
| 50-80% | Confirm | Show top 3, ask user to confirm |
| < 50% | Interview | Fall back to `/csp-interview-me` |

**Output example:**
```
## 路由决策

**状态**: git=clean | lang=python | phase=building

**匹配 skills** (置信度):
1. csp-tdd [build] — 78%
2. csp-implementation-phase [build] — 65%
3. csp-python-reviewer [review] — 35%

**决策**: Top 3 候选 — 请确认
```

---

### Stage 5: SKPG Enhancement (Optional)

**File:** `.csp/skpg/graph.json`

The Skills Package Knowledge Graph (SKPG) provides dependency and impact analysis:

#### 5.1 Dependency Check
Verifies that activated skills have their prerequisites:
```
csp-tdd requires: [csp-spec-contract, csp-verification]
```

#### 5.2 Impact Analysis
Identifies which other skills are affected by changes:
```
Modifying csp-tdd affects: [csp-python-testing, csp-react-testing]
```

#### 5.3 Path Finding
Finds shortest path between skills for multi-skill workflows:
```
csp-brainstorming → csp-writing-plans → csp-executing-plans
```

---

## File Reference

| File | Purpose | Format |
|------|---------|--------|
| `triggers.yaml` | Trigger word → skill mapping | YAML |
| `skill-metadata.yaml` | V2 metadata registry | YAML |
| `registry.json` | Full skill registry | JSON |
| `.csp/state.json` | Current project state | JSON |
| `.csp/skpg/graph.json` | Skills knowledge graph | JSON |

---

## Execution Flow

```bash
# Step 1: Detect state
node shared/scripts/state-detector.mjs

# Step 2: Route with confidence scoring
node shared/scripts/confidence-router.mjs

# Output: routing decision with ranked skills
```

---

## Signal Priority

Signals are evaluated in priority order (highest first):

1. **Explicit instruction** — User says "use TDD" → force load skill
2. **High confidence match** — >80% → direct route
3. **Context enhancement** — State detection adjusts weights
4. **Tech stack detection** — Language/framework match
5. **Historical preference** — Previously used skill gets bonus

---

## Fallback Behavior

When no skill matches above 50% confidence:

1. Router activates `/csp-interview-me` mode
2. Deep interview extracts actual requirements
3. Interview results feed back into routing pipeline
4. Second routing attempt with clarified intent

---

## Version History

| Version | Change |
|---------|--------|
| 1.0.0 | Basic keyword + trigger routing |
| 2.0.0 | Added state detection, confidence scoring, SKPG enhancement |
