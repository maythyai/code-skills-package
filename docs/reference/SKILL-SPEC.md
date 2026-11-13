# SKILL.md V3 Specification

**Version:** 3.0.0
**Status:** Active (additive, backward compatible with v2)
**Based on:** TRL project engineering conventions + CSP best practices

---

## Overview

SKILL.md v3 extends v2 with **body structure requirements**, **quality tiers**, and **type-specific
section mandates**. All v2 frontmatter fields remain valid. New requirements apply only to the markdown body.

## Backward Compatibility

All v2 fields and body structures continue to work. v3 is additive:
- Existing v2 skills pass validation without changes
- New skills should target v3 quality tiers
- Body structure checks are advisory warnings by default, errors when `--strict` flag is used

---

## Part 1: Frontmatter Fields (v2, unchanged)

See the [v2 spec](#frontmatter-fields-reference) below for the complete field reference.
New in v3: `type` field for skill categorization.

### New v3 Frontmatter Field

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | enum | No | Skill type: `technique`, `pattern`, `reference`, `workflow`, `guardian`. Used to determine Required Sections. |

---

## Part 2: Body Structure Requirements (NEW in v3)

### 2.1 Quality Tiers

Skills are classified into three quality tiers based on body structure completeness:

| Tier | Name | Criteria | Token Budget |
|------|------|----------|-------------|
| **A** | Reference | All Required Sections present; tables, code examples, and verification checklist included | 300-800 |
| **B** | Standard | Core sections present (Purpose, When to Use, Process, Verification); code examples included | 200-500 |
| **C** | Basic | Minimum structure: Purpose, When to Use, Process | 100-300 |

### 2.2 Required Sections by Skill Type

Different skill types have different structural requirements. The table below defines which sections are Required (R), Recommended (r), or Optional (o) for each type.

| Section | technique | pattern | reference | workflow | guardian |
|---------|:---------:|:-------:|:---------:|:--------:|:--------:|
| **Purpose** (1-2 sentence overview) | R | R | R | R | R |
| **When to Use** (trigger conditions) | R | R | R | R | R |
| **When NOT to Use** (anti-conditions) | r | r | r | R | R |
| **Routing/Dispatch Logic** (分发逻辑) | o | o | o | R | R |
| **Process** (numbered steps) | R | R | r | R | R |
| **Key Principles** (3-5 core rules) | r | R | r | r | R |
| **Anti-Patterns** (common mistakes) | r | r | r | r | R |
| **Rationalization Defense** (借口反驳表) | o | o | o | o | R |
| **Verification Checklist** (completion checkboxes) | R | R | r | R | R |
| **Completion Signal** (handoff metadata) | o | o | o | R | o |
| **Examples** (1-2 concrete scenarios) | R | R | R | r | r |
| **Related Skills** (wiki-links with when-to-use) | r | r | r | R | r |

### 2.3 Section Quality Standards

Each section, when present, must meet these standards:

**Purpose**
- Good: "极简模式直接改码引擎 — 无 PRD、无设计模式时的一句话需求快速实现入口。"
- Bad: "This skill helps with development." (too vague)

**When to Use**
- Good: Uses ✅/❌ bullet format with specific, detectable conditions
- Bad: "Use when developing features" (too broad)
- MUST include explicit anti-conditions (when NOT to use)

**Process**
- Good: Numbered steps with estimated time, checkpoints, and red lines
- Bad: "Do the thing" (no structure)
- Each step MUST have a verifiable checkpoint

**Examples**
- Good: One excellent, concrete example with input/process/output
- Bad: Five mediocre examples in five different languages
- Rule: "One excellent example beats many mediocre ones" (TRL principle)

**Verification Checklist**
- Good: Checkbox items that can be objectively verified
- Bad: "Make sure it's good" (subjective)
- Minimum 3 items

### 2.4 Description Writing Standards

The `description` field in frontmatter is the primary discovery mechanism. Follow these rules:

1. **Start with "Use when..."** — describes triggering conditions, NOT what the skill does
   - Good: `Use when creating new skills, editing existing skills, or verifying skills work before release.`
   - Bad: `A skill that helps you write and test new CSP skills.` (describes what, not when)

2. **Include specific symptoms and contexts** — error messages, tool names, situations
   - Good: `Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes.`
   - Bad: `For debugging.`

3. **Add keyword coverage** — both English and Chinese keywords at end of description
   - Good: `...Keywords: debug, 调试, fix bug, 修复, troubleshooting, 排查.`

4. **Keep under 500 characters** — shorter descriptions load faster in routing context

### 2.5 Anti-Patterns to Avoid

| Anti-Pattern | Example | Fix |
|-------------|---------|-----|
| Narrative storytelling | "Alice wanted to add a button, so she..." | Direct instruction: "To add a button, do X." |
| Multi-language dilution | Same example in Python, JS, Go, Rust | One language, one excellent example |
| Code in flowcharts | Graphviz nodes containing code snippets | Code goes in markdown blocks |
| Generic labels | "step1", "helper2" | Semantic: "validate-input", "apply-fix" |
| "Keep as reference" | Untested code preserved for later | Delete it or test it |
| Author attribution | `author: Jane Smith` | No personal names in frontmatter or body |

---

## Part 3: Good/Bad Skill Comparison

### Bad Example (Tier C, missing sections)

```markdown
---
name: csp-my-skill
description: Helps with testing.
layer: 3
category: patterns
---

# My Skill

This skill helps you test code.

## How to Use

1. Write tests
2. Run tests
3. Fix bugs
```

**Problems:**
- Description doesn't say WHEN to use
- No Purpose section
- No When NOT to Use
- No checkpoints or red lines in Process
- No verification checklist
- No examples
- No anti-patterns

### Good Example (Tier A, all sections present)

```markdown
---
name: csp-test-guard
description: >
  Use when writing or reviewing tests for any code change.
  Ensures test coverage meets project standards and edge cases are covered.
  Triggers on "test", "coverage", "add tests", "测试", "覆盖率".
  Keywords: test, testing, coverage, 测试, 覆盖率, TDD, edge case.
version: "1.0.0"
layer: 3
category: patterns
type: guardian
phase: build
domain: testing
role: guardian
scope: implementation
tools: [Read, Write, Edit, Bash, Glob, Grep]
related_skills: [csp-tdd, csp-code-review]
anti_rationalizations:
  "This is too simple to test": "Simple code breaks silently. A 30-second test prevents hours of debugging."
---

# Test Guard

测试质量守护 — 确保代码变更有足够的测试覆盖和边界情况检查。

## When to Use

- ✅ Writing new code that needs tests
- ✅ Reviewing a PR with test changes
- ✅ Modifying logic that has existing tests
- ❌ Pure documentation changes
- ❌ Configuration-only changes
- ❌ When csp-tdd is already active (it enforces stricter standards)

## Process

### Step 1: Assess Coverage Gap（1 min）

Identify what changed and what tests exist. Check for untested paths.

**检查点**：List of changed functions/paths + their test status.

**红线**：
- New public function without a test → STOP, write test first
- Modified logic without updated test → STOP, update test first

### Step 2: Edge Case Scan（2 min）

For each changed function, verify these edge cases are covered:
- Null/undefined input
- Empty collections
- Boundary values
- Error paths

**检查点**：Each edge case either has a test or a documented reason for exclusion.

### Step 3: Coverage Verification

Run tests and verify coverage metrics.

```bash
npm run test:coverage
```

**红线**：Coverage below 80% on changed files → STOP, add tests.

## Anti-Patterns

| Anti-Pattern | Signal | Fix |
|-------------|--------|-----|
| Testing implementation details | Test breaks on internal refactor | Test behavior, not code structure |
| Brittle selectors | Test breaks on CSS change | Use semantic selectors |
| Tests depending on each other | Test passes alone but fails in suite | Each test sets up its own data |

## Verification Checklist

- [ ] Every new/changed public function has at least one test
- [ ] Edge cases covered: null, empty, boundary, error
- [ ] Coverage ≥ 80% on changed files
- [ ] Tests pass with pristine output (no warnings)
- [ ] Tests use real objects (mocks only for remote services)

## Related Skills

- [[csp-tdd]] — when implementing features with Red-Green-Refactor cycle
- [[csp-code-review]] — when reviewing PRs for merge readiness
```

---

## Part 4: Token Budget Guidelines

Effective skills load quickly. Follow these per-layer budgets:

| Layer | Directory | Target Tokens | When to Split |
|-------|-----------|---------------|---------------|
| L1 | csp-meta | 300-400 | Split heavy reference (>100 lines) to separate file |
| L2 | csp-workflow | 400-600 | Split detailed process guides to reference files |
| L3 | csp-patterns | 200-500 | Split language-specific reference to separate files |
| L4 | csp-runtime | 300-500 | Split agent-specific config to separate files |

**Token-saving techniques:**
- Use tables instead of narrative paragraphs for comparisons
- Use concise bullet lists instead of prose
- One excellent example > many generic ones
- Cross-reference other skills with wiki-links instead of duplicating content
- Move API references and comprehensive syntax guides to separate files

---

## Part 5: Frontmatter Fields Reference (v2, unchanged from here down)

### Classification Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | **Yes** | Skill slug: `csp-<name>` in kebab-case |
| `description` | string | **Yes** | One-line verb-first description with trigger conditions |
| `version` | string | No | Semver version of the skill |
| `layer` | int | **Yes** | 1-4 (or 0 for router) |
| `category` | string | **Yes** | meta, workflow, patterns, runtime, router |
| `phase` | enum | No | Lifecycle phase: `define`, `plan`, `build`, `verify`, `review`, `ship` |
| `domain` | enum | No | Domain: `language`, `quality`, `security`, `architecture`, `devops`, `database`, `testing`, `api`, `patterns`, `other` |
| `scope` | enum | No | Work scope: `implementation`, `review`, `analysis`, `design`, `testing` |
| `role` | enum | No | Role: `specialist`, `reviewer`, `guardian`, `orchestrator` |
| `type` | enum | No | **New in v3**: `technique`, `pattern`, `reference`, `workflow`, `guardian` |

### Tool Permissions

```yaml
tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
```

Permission tiers:
- **Read-only** (reviewers): `Read`, `Grep`, `Glob`
- **Research** (analysts): + `WebFetch`, `WebSearch`
- **Development** (implementers): + `Write`, `Edit`, `Bash`

### Dependencies & Relations

```yaml
dependencies:
  skills: [csp-spec-contract]    # Must be loaded before this skill

related_skills:
  - csp-verification             # Complementary skills (with when-to-use note)
  - csp-code-review
```

### Anti-Rationalization Table

Prevents agents from skipping critical steps:

```yaml
anti_rationalizations:
  "I'll add tests later": "Later never comes. Write tests first."
  "This is too simple to test": "Simple code has bugs too."
  "Tests slow me down": "Tests prevent debugging sessions that take longer."
```

### Trigger Enhancement

```yaml
triggers:
  keywords: ["debug", "fix bug", "error"]
  patterns:
    - "def test_.*\\(self\\):"    # Regex patterns
  intents:
    - "user wants to debug code"  # Natural language intents
  context:
    - "session_start"
    - "pre_compact"
```

## Complete V3 Example

See `shared/templates/SKILL-TEMPLATE-v3.md` for the canonical template.

## Migration Guide (v2 → v3)

1. **No rush** — v2 skills work indefinitely, v3 is additive
2. **Priority order** for migration:
   - L2 workflow skills (most benefit from structured Process and Completion Signal)
   - Guardian/discipline skills (most benefit from Rationalization Defense)
   - New skills (always use v3)
3. **Run validation**: `node scripts/validate-skill-v3.mjs <skill-path>` for body checks
4. **Quality target**: New skills should target Tier B (Standard) or Tier A (Reference)