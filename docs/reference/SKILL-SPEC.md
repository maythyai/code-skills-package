# SKILL.md V2 Specification

**Version:** 2.0.0
**Status:** Active (additive, backward compatible)

---

## Overview

SKILL.md v2 adds structured metadata to skill frontmatter, enabling:
- State-aware routing (phase/domain/role matching)
- Model selection optimization (cost vs. quality)
- Anti-rationalization enforcement (preventing agent shortcuts)
- Tool permission declaration (security boundary)
- Dependency tracking (SKPG integration)

## Backward Compatibility

All v2 fields are **optional**. Existing v1 skills continue to work unchanged.
The `name` and `description` fields remain required.

## New Frontmatter Fields

### Classification Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | string | No | Semver version of the skill |
| `phase` | enum | No | Lifecycle phase: `define`, `plan`, `build`, `verify`, `review`, `ship` |
| `domain` | enum | No | Domain: `language`, `quality`, `security`, `architecture`, `devops`, `database`, `testing`, `api`, `patterns`, `other` |
| `scope` | enum | No | Work scope: `implementation`, `review`, `analysis`, `design`, `testing` |

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
  agents: [csp-architect]        # Agent types this skill uses

related_skills:
  - csp-verification             # Complementary skills
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

## Complete V2 Example

```yaml
---
name: csp-tdd
description: >
  Enforces test-driven development workflow. Write tests first, then implement.
  Use when implementing new features, fixing bugs, or when the user mentions TDD.
version: "2.0.0"
layer: 1
category: meta

# V2 fields
phase: build
domain: testing
role: guardian
scope: implementation
tools: [Read, Write, Edit, Bash, Glob, Grep]

dependencies:
  skills: [csp-spec-contract]

related_skills: [csp-verification, csp-code-review]

anti_rationalizations:
  "I'll add tests later": "Later never comes. Write tests first."
  "This is too simple to test": "Simple code has bugs too."

triggers:
  keywords: ["TDD", "test first", "test driven"]
  intents: ["user wants to use TDD"]
---
```

## Migration Guide

1. **No rush** — v1 skills work indefinitely
2. **Priority order** for migration:
   - High-traffic skills (csp-router top 20 matches)
   - Skills with complex workflows (most benefit from role/phase)
   - New skills (always use v2)
3. **Run validation**: `node scripts/validate-skill-v2.mjs <skill-path>`