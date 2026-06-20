---
name: csp-code-review
description: Comprehensive code review specialist for correctness, reuse, simplification, and efficiency. Use when reviewing code changes, before merging PRs, or when asked to audit code quality.
layer: 3
category: patterns
phase: review
domain: quality
scope: review
tools: [Read, Grep, Glob]
anti_rationalizations:
  "This code looks fine": "Looks can deceive. Review for correctness, reuse, and efficiency."
  "It works, let's move on": "Working code can still be wasteful or hard to maintain."
---

# Code Review

Comprehensive code review focusing on:
1. Correctness - bugs, edge cases, error handling
2. Reuse - existing patterns, DRY violations
3. Simplification - over-engineering, unnecessary complexity
4. Efficiency - performance bottlenecks, resource waste
