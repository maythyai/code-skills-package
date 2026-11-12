---
name: csp-e2e-deep-audit
description: "Deep E2E product audit — full route sweep, button-level click audit, orphan route detection, hidden backend functionality audit, structural health checks (schema drift, type check, mock debt), and IA rationality review. Use for pre-release comprehensive health check, not daily PR feedback (too heavy)."
version: "1.0.0"
layer: 3
category: patterns
phase: verify
domain: quality
scope: testing
role: specialist
tools: [Read, Write, Edit, Bash, Glob, Grep]
triggers:
  - "E2E 深度审计"
  - "全路由扫描"
  - "按钮点击审计"
  - "孤儿路由"
  - "结构健康检查"
  - "deep audit"
  - "route sweep"
  - "发布前体检"
related_skills: [csp-e2e-testing, csp-codebase-audit, csp-browser-testing-with-devtools, csp-audit]
anti_rationalizations:
  "E2E 太慢了不跑": "深度审计按需触发（发布前/大重构后），不进日常 PR CI"
---

# E2E Deep Audit

深度端到端产品审计——全路由 sweep、按钮级点击审计、孤儿路由检测、隐藏后端功能审计、结构健康核查、IA 合理性评审。用于版本发布前/大重构后全量体检，不进日常 PR 反馈。

## Audit Modes

| Mode | Purpose | When |
|------|---------|------|
| M1 | 交互验证+修复 | 改完想确认 → 证据→失败签名→最小修复→回归 |
| M2 | 建套件/补 flaky/接 CI | POM+fixture+mock+sharding 工程化 |
| M3 | 只截图取证 | 不改项目代码，输出 FIX_SUGGESTION |
| M4 | 深度产品审计 | 发布前/大重构后全量体检 |

## M4 Deep Audit Layers

### L1 — 存量套件
Run existing E2E test suite. Delegate to `csp-e2e-testing`.

### L2 — 全路由 Sweep
Auto-discover all routes from file system (e.g. `src/app/**/page.tsx`), assert each route renders without error. Dynamic route segments (`[slug]`/`[id]`) must resolve internal config tables.

### L3 — 按钮级点击审计
Enumerate all visible buttons per route, click each, record: NET(method+path+status) / DIALOG / TOAST / NAV / NONE. Maintain deny-list for destructive actions (delete/reset/logout/pay).

### L4 — 结构审计
- **Orphan routes**: all routes × navigation sources cross-reference
- **Hidden backend functionality**: all backend route registrations × frontend call sites cross-reference
- **Dead buttons**: static scan for no-onClick / href="#" / bare disabled

### L5 — 结构健康核查
- **Schema drift**: ORM metadata × information_schema full diff
- **Type check**: `tsc --noEmit` full scan
- **Mock debt**: detect fixtures/mocks that no longer match real exports; repair tests without a fallback that hides missing symbols

## Outputs

- `.csp/artifacts/verify/ui-test-report.md` — execution summary (or the project's mapped existing report path)
- `.csp/artifacts/verify/evidence/` — screenshots/network logs referenced by the summary
- `.csp/gap-analysis/GAP-REPORT-*.md` — structural gaps; preserve finding ID and links to evidence

## Execution Constraints

- Real execution only: `ran: <cmd> exit 0`, no not-run/grep substitution
- Button audit is heavy — default NOT in CI smoke, nightly or on-demand
- Destructive or externally visible actions are not clicked merely because a label is absent from a deny-list; inspect the action's effect and require explicit authorization or use an isolated test environment. Record untested paths as not-run, not passing.