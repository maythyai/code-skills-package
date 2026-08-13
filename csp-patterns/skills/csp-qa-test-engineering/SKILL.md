---
name: csp-qa-test-engineering
description: "全生命周期 QA 测试工程技能。覆盖需求分析→测试计划→测试用例→自动化执行→生产问题调查完整流程。涉及测试规划、测试策略、用例生成、接口测试、回归测试、生产调试、事件分析等场景时使用。"
version: 0.2.0
layer: 3
category: patterns
phase: verify
domain: quality
scope: testing
role: expert
tools: [Read, Grep, Glob, Bash, Agent]
triggers:
  - "写测试计划"
  - "测试策略"
  - "生成测试用例"
  - "分析需求"
  - "自动化测试"
  - "线上问题分析"
  - "测试覆盖"
related_skills: [csp-qa-cr-review, csp-python-reviewer, python-testing, csp-e2e-testing, csp-ultraqa]
anti_rationalizations:
  "测试足够了": "检查测试金字塔分布和质量门禁是否满足"
  "这个不需要测试": "评估风险等级后再决定测试深度"
  "E2E 测试太慢就不写了": "下推到集成/单元层，不是放弃覆盖"
---

# QA Test Engineering

全生命周期质量保证 — 从需求分析到测试执行到生产问题调查。

## Helper Scripts

```bash
python scripts/scaffold_tests.py --help   # 生成标准化测试项目结构
```

## End-to-End Flow

```
1. Analyze Requirements  →  Test Point Matrix (with risk levels)
        ↓
2. Generate Test Plan    →  Strategy document (types, coverage, gates)
        ↓
3. Generate Test Cases   →  Given/When/Then cases grouped by layer
        ↓
4. Scaffold & Automate   →  Run scaffold_tests.py, then write test code
        ↓
5. Execute & Report      →  Run tests, feed results to report skill
        ↓
6. (If issues found)     →  Investigate, root cause, regression test
```

## Core Workflow

```
User Query → Identify Task Type(s)
    │
    ├─ "写测试计划/测试策略"
    │   → Read references/test-strategy-guide.md
    │   → Use templates/test-plan-template.md
    │
    ├─ "分析需求文档"
    │   → Read references/requirement-analysis-guide.md
    │   → Extract test points with risk levels
    │
    ├─ "生成测试用例"
    │   → Read references/test-case-patterns.md
    │   → Given/When/Then format by test type
    │
    ├─ "执行自动化测试"
    │   → Read references/automation-execution.md
    │   → Select framework → write → run
    │
    └─ "分析线上问题"
        → Read references/production-issue-analysis.md
        → Timeline → logs → root cause → regression test
```

## Test Pyramid

```
           /\
          /E2E\           5-10% — Critical user journeys
         /------\
        / Integr \        15-25% — API, DB, MQ
       /----------\
      / Component  \      20-30% — UI components, modules
     /--------------\
    /     Unit       \    40-60% — Business logic, pure functions
   /------------------\
  /  Static Analysis   \  Foundation — lint, typecheck, secrets scan
 /----------------------\
```

**原则**：测试尽量下推。能用单元测试覆盖的不用 E2E。

## Decision Tree: Test Approach

| 被测对象 | 测试类型 | 目标框架 |
|---------|---------|---------|
| 纯业务逻辑/数据变换 | Unit | pytest / Jest, AAA pattern |
| 单服务 API | Integration | pytest+httpx / Supertest |
| 跨服务通信 | Contract | Pact / OpenAPI validation |
| 性能敏感接口 | Performance | k6 / Locust |
| 单组件 UI | Component | Testing Library |
| 多页面用户旅程 | E2E | Playwright |
| 认证/授权 | Integration + Security | 有效/无效/过期/角色边界 |
| 数据变更（CRUD） | Integration + State verify | 验证 DB 前后状态 + 失败回滚 |

## Quick Reference: Test Types

| Type | Purpose | Coverage Target |
|------|---------|-----------------|
| Unit | 隔离逻辑验证 | 80%+ business logic |
| Integration | 服务边界验证 | 70%+ API endpoints |
| Contract | 跨服务兼容性 | All public APIs |
| E2E | 关键用户旅程 | 5-10 critical paths |
| Performance | 负载/压力/浸泡 | All perf-critical endpoints |
| Security | 漏洞扫描 | Auth + data mutation flows |

## Quality Gates

| Gate | Trigger | Tests | Block If |
|------|---------|-------|----------|
| Pre-commit | git commit | lint + typecheck + unit | Any failure |
| PR Gate | Pull request | unit + integration | Coverage < 80% or failure |
| Pre-deploy | Merge to main | unit + integration + E2E | Any failure |
| Post-deploy | After deployment | Smoke (critical paths) | Critical path failure |
| Scheduled | Nightly/weekly | Full + performance + security | Regression detected |

## Anti-Patterns

| Anti-Pattern | 问题 | 正确做法 |
|---|---|---|
| 测试实现细节 | 重构即破 | 测试可观测行为 |
| 共享可变测试状态 | 顺序依赖 flaky | 每个测试独立数据 |
| `sleep()` | 慢且不可靠 | 显式等待/事件 |
| 全部写 E2E | 慢、贵、flaky | 下推金字塔 |
| 覆盖率作为唯一 KPI | 注水无质量 | 关注关键路径覆盖 |
| 线上 bug 不补回归测试 | 同 bug 再发 | 每次修复必加测试 |

## References

| File | When to Read |
|------|-------------|
| `references/test-strategy-guide.md` | 生成测试计划、选择测试方法 |
| `references/requirement-analysis-guide.md` | 分析需求、提取测试点 |
| `references/test-case-patterns.md` | 编写测试用例（API/Unit/Integration/E2E 代码模式） |
| `references/automation-execution.md` | 框架搭建、CI/CD 流水线、运行测试 |
| `references/production-issue-analysis.md` | 调查事件、根因分析、日志分析 |

## Templates

| Template | Purpose |
|----------|---------|
| `templates/test-plan-template.md` | 结构化测试计划文档 |
| `templates/test-case-template.md` | 单个测试用例文档 |
| `templates/incident-report-template.md` | 生产事件报告 |
