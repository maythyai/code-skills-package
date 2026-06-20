---
name: csp-implementation-phase
description: Implementation phase specialist for executing planned work with proper patterns, error handling, and code quality. Use when writing production code from a plan.
layer: 2
category: workflow
phase: build
domain: patterns
scope: implementation
tools: [Read, Write, Edit, Bash, Glob, Grep]
anti_rationalizations:
  "I'll refactor later": "Later never comes. Implement it right the first time."
  "This pattern is overkill": "Patterns exist for a reason. Follow established conventions."
---

# Implementation Phase

Execute the plan with quality:
1. Follow the approved design
2. Maintain consistency with existing codebase
3. Add proper error handling
4. Write tests alongside implementation
5. Document non-obvious decisions
