---
name: csp-tech-debt-assessment
description: >
  Technical debt identification, measurement, and prioritization. Covers code smells,
  architecture smells, dependency health, complexity metrics, debt quantification,
  and creating actionable debt reduction roadmaps. Use when assessing codebase health
  or planning debt reduction initiatives.
layer: 3
category: patterns
domain: patterns
phase: build
version: "1.0.0"
role: specialist
scope: implementation
tools: [Read, Write, Edit, Bash, Glob, Grep]
---

| Smell | Detection Rule | Tool |
|-------|----------------|------|
| **Complexity** | Cyclomatic complexity > 15, cognitive complexity > 20 | complexity-report, SonarQube |
| **Duplication** | Duplicated blocks > 10 lines | jscpd, SonarQube |
| **Dead code** | Unused exports, unreachable branches | knip, ts-prune, ts-unused-exports |
| **Long methods** | Functions > 50 lines | ESLint max-lines-per-function |
| **Deep nesting** | Indentation > 3 levels | ESLint max-depth |
| **Large files** | Files > 300 lines | ESLint max-lines, manual review |
| **God classes** | Classes with > 10 public methods | Manual review, SonarQube |
| **Feature envy** | Method uses more data from other classes | Manual review |

### Architecture Smells

**Detection approach:** Dependency analysis and manual review.

```bash
# Dependency analysis
npx madge --circular src/                  # Circular dependencies
npx dependency-cruiser src/                # Dependency graph analysis
npx arch-unit (Java) / pytest-arch (Python) # Architecture tests
```

| Smell | Description | Impact |
|-------|-------------|--------|
| **Circular dependencies** | Module A → B → C → A | Prevents independent deployment, causes build issues |
| **Layering violations** | Presentation layer directly accesses database | Breaks separation of concerns |
| **Scattered concerns** | Cross-cutting concern duplicated across modules | Changes require touching many files |
| **Unstable dependencies** | Stable module depends on unstable module | Changes propagate upward |
| **Ambiguous boundaries** | Unclear where one module ends and another begins | Duplicate logic, confusion |
| **Connector envy** | Modules communicate through shared state instead of interfaces | Tight coupling |

### Dependency Health

**Detection approach:** Audit installed packages for freshness, security, and maintenance status.

```bash
# Dependency health checks
npm audit                                   # Security vulnerabilities
npm outdated                                # Outdated packages
npx is-my-thing-maintained                  # Maintenance status
pip-audit                                   # Python security audit
bundle audit                                # Ruby security audit
```

**Dependency health matrix:**

| Signal | Tool | Threshold |
|--------|------|-----------|
| Known vulnerabilities | `npm audit` / `pip-audit` | Zero critical/high |
| Outdated major versions | `npm outdated` | No more than 2 major versions behind |
| Unmaintained packages | Last commit > 2 years | Flag for replacement |
| License compliance | `license-checker` | No incompatible licenses |
| Bundle size impact | `bundlephobia` | Flag packages > 100KB minified |
| Duplicate packages | `npm ls --depth=0` | Zero unintentional duplicates |

## Complexity Metrics

### Cyclomatic Complexity

Measures the number of linearly independent paths through code.

```
Complexity = Edges - Nodes + 2*ConnectedComponents

# Interpretation:
# 1-10:   Simple, low risk
# 11-20:  Moderate, manageable
# 21-30:  Complex, consider refactoring
# 31+:    Very complex, high risk — refactor urgently
```

**Tools:**
```bash
# JavaScript/TypeScript
npx complexity-report src/

# Python
pip install radon && radon cc src/ --min B

# Java
javancss or SonarQube

# General
sonar-scanner  # all languages
```

### Cognitive Complexity

Measures how difficult code is for a HUMAN to understand. Penalizes nesting more heavily than cyclomatic complexity.

```typescript
// Cyclomatic: 4 (four branches)
// Cognitive: 7 (nested branches are harder to follow)
function process(data: Data): Result {
  if (data.isValid) {                    // +1
    if (data.hasItems) {                 // +2 (nesting increment)
      for (const item of data.items) {   // +3 (loop + nesting)
        if (item.needsProcessing) {      // +4 (nesting increment)
          processItem(item);
        }
      }
    }
  }
  return defaultResult;
}
```

### Coupling and Cohesion

**Coupling** (lower is better): How much a module depends on other modules.
- **Afferent coupling (Ca):** How many other modules depend on this one
- **Efferent coupling (Ce):** How many modules this one depends on
- **Instability = Ce / (Ca + Ce):** 0 = stable, 1 = unstable

**Cohesion** (higher is better): How related the elements within a module are.
- **LCOM (Lack of Cohesion of Methods):** Lower is better
- High cohesion = module has a single, well-defined purpose

```bash
# Measure with dependency-cruiser
npx depcruise src/ --output-type dot | dot -T svg > deps.svg

# Architecture fitness functions
# Define and enforce coupling/cohesion thresholds in CI
```

## Design Debt (Frontend Visual Layer)

Code debt is invisible to users; design debt is the only debt category they can see. It
accumulates fastest in AI-generated UI, where every component is written from scratch with
fresh literal values instead of consuming the design system.

### The ten categories

| Category | What it looks like | Why it costs |
|---|---|---|
| `hard-coded-color` | `#3b82f6`, `rgb(59 130 246)` in a component | Rebranding becomes a grep-and-pray across hundreds of files |
| `arbitrary-tailwind` | `p-[13px]`, `text-[#444]`, `w-[calc(100%-7px)]` | Bypasses the scale; every arbitrary value is a one-off decision |
| `inline-style` | `style={{ marginTop: 8 }}` | Uncascadable, unthemeable, invisible to static analysis |
| `magic-number` | `padding: 13px`, `height: 47px` | Off-scale spacing destroys the visual rhythm |
| `non-token-shadow` | `box-shadow: 0 2px 7px rgba(0,0,0,.13)` | Elevation hierarchy becomes arbitrary |
| `non-token-radius` | `border-radius: 7px` | Corner treatment inconsistent across components |
| `typography-drift` | Six font sizes where the scale defines four | Text hierarchy loses meaning |
| `duplicate-component-pattern` | Two near-identical card implementations | Both must be fixed for every change |
| `mixed-library-style` | Tailwind + styled-components + raw CSS in one tree | Three mental models, three sources of specificity bugs |
| `undocumented-exception` | A deviation with no comment saying why | The next reader cannot tell if it is intentional |

### Severity

| Level | Meaning | Blocks merge? |
|---|---|---|
| `blocker` | Breaks theming or accessibility (e.g. hard-coded text colour on a themed surface) | Yes |
| `major` | Off-system value in a shared/reused component | Yes |
| `minor` | Off-system value in a leaf component | No — tracked |
| `debt` | Consistent deviation that should become a token | No — backlog |
| `info` | Style observation, no action required | No |

**Pass criterion: zero `blocker` and zero `major`.** Everything below is tracked, not gating.

### Detection

```bash
# Hard-coded colours — hex (3/4/6/8 digit), rgb(), hsl()
grep -rnE "#[0-9a-fA-F]{3,8}\b|\brgb[a]?\(|\bhsl[a]?\(" src/ --include="*.tsx" --include="*.css"

# Arbitrary Tailwind values
grep -rnE "\b[a-z-]+-\[[^]]+\]" src/ --include="*.tsx"

# Inline styles
grep -rn "style={{" src/ --include="*.tsx"

# Magic px numbers — 2px and above; 0 and 1px are exempt (hairlines and resets are legitimate)
grep -rnE "\b(?:[2-9]|[1-9][0-9]{1,3})px\b" src/ --include="*.css" --include="*.tsx"

# Non-token shadows
grep -rnE "box-shadow:|shadow-\[" src/
```

Rules that keep the signal clean:

1. **Skip token declaration lines.** A line matching `^\s*--[\w-]+\s*:` is *defining* the design
   system, not violating it. Exempt it.
2. **Apply an allowlist.** `allowedColorValues` — e.g. `transparent`, `currentColor`, `#fff` in a
   print stylesheet — suppresses findings for values that are legitimately literal.
3. **Compare against the token set.** Parse `DESIGN.md` frontmatter (or `tokens.css`) and diff:
   every literal in the codebase that is *not* in the token set is a finding. Literals that match
   a token value are still findings (`debt` level) — they should reference the token, not repeat it.
4. **Cap the report at 1000 findings.** Beyond that, the output is noise; group by category and
   report counts with representative locations instead.

### Exempt contexts

Do not flag these — they are supposed to hold literal values:

- Token and theme definition files (`tokens.css`, `theme.ts`, `DESIGN.md`)
- Component primitives / the design-system package itself
- CSS resets and normalizers
- Chart and canvas geometry (SVG coordinates, `d=` paths, plot math)
- Wrappers around third-party components whose API demands literal values

### Fix priority chain

Work down this list; stop at the first option that applies.

```
1. Use an existing token                     ← the vast majority of fixes
2. Use an existing component variant
3. Add a variant to an existing component
4. Introduce a new semantic token            ← needs a design decision, not just a rename
5. Document the exception inline with a reason
6. Encode the rule as a lint rule or codemod ← so it cannot regress
```

Step 6 is what makes the fix stick. A design-debt cleanup without a lint rule is a design-debt
cleanup that repeats next quarter.

### Drift prevention

| Control | Catches |
|---|---|
| ESLint / Stylelint rule banning literal colours and off-scale spacing | New violations at authoring time |
| CI design-debt scan on changed files only | Regressions in a PR without drowning in legacy findings |
| Token export sync check (Figma ↔ code) | The two sources diverging |
| Component-alignment check (raw HTML vs. design-system primitives) | Bypassed components |
| Visual regression baselines per component | Any visual change, intentional or not |

See `csp-design-system-capture` to build the token set this scan compares against.

## Debt Quantification

### The Debt Quadrant

Classify debt by intent and awareness:

```
                    Reckless              Prudent
              ┌─────────────────┬─────────────────┐
  Deliberate  │ "We don't have  │ "We know this is │
              │  time for tests" │  a shortcut and  │
              │                  │  will pay it back │
              │                  │  by Q3"           │
              ├─────────────────┼─────────────────┤
              │ "What's layering?"│ "We must ship    │
  Inadvertent │ "Just make it    │  for the demo —  │
              │  work"           │  we'll refactor   │
              │                  │  after validation"│
              └─────────────────┴─────────────────┘
```

**Prudent debt** has a repayment plan. **Reckless debt** accumulates silently.

### Cost of Delay Calculation

For each debt item, estimate:

```
Interest Rate = (Extra time per feature due to debt) × (Features per month)

Example:
- Legacy auth module adds 2 hours to every auth-related feature
- Team ships 4 auth-related features per month
- Interest = 2 hours × 4 features = 8 hours/month = 1 day/month

Principal = Estimated time to refactor the module
- Refactoring the auth module: 3 days

Break-even = Principal / Interest Rate = 3 days / 1 day/month = 3 months
→ If the module will be touched for more than 3 months, refactoring pays for itself
```

### Debt Item Scoring Template

For each debt item, score on a 1-5 scale:

| Dimension | 1 (Low) | 3 (Medium) | 5 (High) |
|-----------|---------|------------|----------|
| **Impact on velocity** | Negligible | Noticeable slowdown | Major blocker |
| **Incident frequency** | Never caused an incident | Occasional contributor | Frequent root cause |
| **Change frequency** | Rarely touched | Touched monthly | Touched weekly |
| **Risk of change** | Simple, well-tested | Moderate complexity | Complex, poorly tested |
| **Team knowledge** | Well-documented | Tribal knowledge | Only one person knows |

**Priority Score = Impact × Change Frequency × Risk**

## Prioritization Framework

### Step 1: Inventory

Create a comprehensive list of debt items:

```markdown
| ID | Category | Description | Location | Estimated Effort |
|----|----------|-------------|----------|-----------------|
| D-001 | Code | God class in order processing | src/orders/orderManager.ts | 3 days |
| D-002 | Deps | Legacy ORM (unmaintained) | src/database/ | 5 days |
| D-003 | Arch | Circular deps between auth and user | src/auth/, src/users/ | 2 days |
| D-004 | Test | No tests for payment flow | src/payments/ | 4 days |
```

### Step 2: Score and Rank

Apply the scoring template and rank by priority score:

```markdown
| ID | Velocity Impact | Incident Freq | Change Freq | Risk | Score | Rank |
|----|----------------|---------------|-------------|------|-------|------|
| D-004 | 4 | 5 | 4 | 5 | 80 | 1 |
| D-001 | 3 | 3 | 5 | 4 | 60 | 2 |
| D-003 | 3 | 2 | 3 | 3 | 27 | 3 |
| D-002 | 2 | 2 | 2 | 4 | 16 | 4 |
```

### Step 3: Create Reduction Roadmap

```markdown
## Q3 2026 Debt Reduction Roadmap

### Sprint 1-2: Payment Flow Test Coverage (D-004)
- Effort: 4 days
- Impact: Reduce payment-related incidents by ~60%
- Verification: 80%+ coverage on payment paths, zero payment incidents in Q4

### Sprint 3-4: Order Manager Decomposition (D-001)
- Effort: 3 days
- Impact: Reduce auth-related feature time by ~30%
- Verification: OrderManager split into 3 focused classes, all tests pass

### Sprint 5: Circular Dependency Resolution (D-003)
- Effort: 2 days
- Impact: Enable independent module deployment
- Verification: Zero circular dependencies in CI check
```

## Tooling Setup

### SonarQube Configuration

```yaml
# sonar-project.properties
sonar.projectKey=my-project
sonar.sources=src
sonar.tests=test
sonar.javascript.lcov.reportPaths=coverage/lcov.info
sonar.qualitygate.wait=true

# Quality gate thresholds
sonar.qualityGate.newCoverage=80
sonar.qualityGate.newDuplicatedLinesDensity=5
sonar.qualityGate.newMaintainabilityRating=A
```

### CI Integration

```yaml
# .github/workflows/debt-check.yml
name: csp-tech-debt-assessment
on: [pull_request]
jobs:
  debt-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Complexity check
        run: npx complexity-report src/ --max-complexity 15
      - name: Duplication check
        run: npx jscpd src/ --min-lines 10 --max-size 5%
      - name: Circular dependencies
        run: npx madge --circular src/ --exit-code 1
      - name: Unused code
        run: npx knip --no-progress
      - name: Dependency audit
        run: npm audit --audit-level=high
```

### Custom Debt Dashboard Script

```bash
#!/bin/bash
# debt-report.sh — Generate a debt summary

echo "=== Tech Debt Report ==="
echo ""

echo "Complexity violations (>15):"
npx complexity-report src/ --format json | jq '[.files[] | select(.aggregateComplexity > 15)] | length'

echo "Duplicated blocks:"
npx jscpd src/ --format json --output /dev/null 2>&1 | grep -c "clone"

echo "Circular dependencies:"
npx madge --circular src/ 2>/dev/null | grep -c "→"

echo "Security vulnerabilities:"
npm audit --json 2>/dev/null | jq '.metadata.vulnerabilities.high + .metadata.vulnerabilities.critical'

echo "Outdated major deps:"
npm outdated --json 2>/dev/null | jq '[to_entries[] | select(.value.wanted != .value.latest and (.value.latest | split(".")[0]) != (.value.current | split(".")[0]))] | length'

echo "Dead code (unused exports):"
npx ts-prune --error 2>/dev/null | wc -l
```

## Communicating Debt to Stakeholders

### The Executive Summary Template

```
Technical Debt Assessment — Q3 2026

Current State:
- Total estimated debt: 47 items across code, architecture, and dependencies
- High-priority items: 8 (estimated 23 days to address)
- Debt interest cost: ~15 engineering hours/month in extra feature work

Business Impact:
- Feature delivery 25% slower than benchmark due to code complexity
- 3 production incidents in Q2 traced to identified debt items
- 2 critical security vulnerabilities in unmaintained dependencies

Recommended Investment:
- Dedicate 20% of Q3 engineering capacity to debt reduction
- Expected ROI: 30% velocity improvement by Q4
- Risk reduction: Eliminate top 3 incident sources

Top 3 Actions:
1. Add test coverage to payment flow (4 days, prevents payment incidents)
2. Replace unmaintained ORM (5 days, eliminates security risk)
3. Decompose order processing module (3 days, unblocks feature team)
```

### Visualizing Debt Trends

Track these metrics over time to show progress or regression:

- Complexity violations per 1000 lines of code
- Duplication percentage
- Mean time to resolve (MTTR) for incidents
- Dependency freshness score
- Test coverage trend
- Debt items resolved vs. introduced per quarter

## Assessment Workflow

1. **Automated scan** — Run all detection tools and collect results
2. **Manual review** — Identify architecture smells and design debt that tools miss
3. **Score and rank** — Apply the prioritization framework
4. **Estimate effort** — Use team estimation (planning poker or T-shirt sizing)
5. **Create roadmap** — Map debt items to sprints/quarters
6. **Communicate** — Present to stakeholders using business impact language
7. **Track and review** — Monitor metrics monthly, reassess quarterly

## Related Skills

- `csp-refactoring-strategies` — Execute the refactoring to address identified debt
- `csp-legacy-modernization` — End-to-end workflow for legacy system modernization
- `csp-code-simplification` — Quick wins for code-level debt reduction
- `csp-code-review` — Prevent new debt from entering the codebase
- `csp-verification` — Verify that debt reduction did not introduce regressions
- `csp-design-system-capture` — Build the token set the design-debt scan compares against
- `csp-frontend-design` — Design language and token discipline that keeps visual debt from forming
