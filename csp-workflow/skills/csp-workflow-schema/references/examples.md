# Workflow Schema 示例

## 1. simple-review — 代码审查工作流

3 阶段：scan → review → report

```json
{
  "name": "simple-review",
  "description": "自动化代码审查：扫描 → 审查 → 生成报告",
  "stages": [
    {
      "name": "scan",
      "description": "静态分析和 lint 扫描，收集问题列表",
      "skills": ["csp-codeql-analyst", "csp-ruff-fixer"],
      "condition": null,
      "on_failure": "stop",
      "timeout": 300,
      "artifacts": [".csp/artifacts/scan/findings.md"]
    },
    {
      "name": "review",
      "description": "基于扫描结果进行深度代码审查",
      "skills": ["csp-code-review"],
      "condition": "scan.success && artifact_exists('.csp/artifacts/scan/findings.md')",
      "on_failure": "continue",
      "timeout": 600,
      "artifacts": [".csp/artifacts/review/comments.md"]
    },
    {
      "name": "report",
      "description": "汇总扫描和审查结果，生成最终报告",
      "skills": ["csp-document-generator"],
      "condition": "scan.success",
      "on_failure": "skip",
      "timeout": 120,
      "artifacts": [".csp/artifacts/report/summary.md"]
    }
  ],
  "defaults": {
    "on_failure": "stop",
    "timeout": 600
  }
}
```

**流程说明：**
- `scan` 无条件执行，失败则整个 workflow 停止
- `review` 仅在 scan 成功且产出文件存在时执行；review 失败不阻塞（标记 failed 但继续）
- `report` 只要 scan 成功就执行（即使 review 失败也能生成基础报告）；report 本身失败则跳过

---

## 2. tdd-cycle — TDD 开发循环

4 阶段：red → green → refactor → verify

```json
{
  "name": "tdd-cycle",
  "description": "TDD 开发循环：写失败测试 → 实现通过 → 重构 → 验证",
  "stages": [
    {
      "name": "red",
      "description": "编写失败的测试用例，定义期望行为",
      "skills": ["csp-tdd"],
      "condition": null,
      "on_failure": "stop",
      "timeout": 300,
      "artifacts": [".csp/artifacts/red/test-spec.md"]
    },
    {
      "name": "green",
      "description": "编写最小实现使测试通过",
      "skills": ["csp-tdd"],
      "condition": "red.success",
      "on_failure": "retry",
      "timeout": 600,
      "artifacts": [".csp/artifacts/green/implementation-notes.md"]
    },
    {
      "name": "refactor",
      "description": "在测试保护下重构代码，消除重复和改善设计",
      "skills": ["csp-refactorer", "csp-code-simplification"],
      "condition": "green.success",
      "on_failure": "continue",
      "timeout": 600,
      "artifacts": [".csp/artifacts/refactor/changes.md"]
    },
    {
      "name": "verify",
      "description": "运行完整测试套件确认无回归",
      "skills": ["csp-verify-phase"],
      "condition": "green.success",
      "on_failure": "stop",
      "timeout": 300,
      "artifacts": [".csp/artifacts/verify/test-results.md"]
    }
  ],
  "defaults": {
    "on_failure": "stop",
    "timeout": 600
  }
}
```

**流程说明：**
- `red` → `green` 是严格串行的核心循环，任一失败即停止
- `green` 使用 `retry` 策略：首次实现可能不完整，允许重试一次
- `refactor` 失败不阻塞：重构是改善而非必须，标记 failed 后继续验证
- `verify` 依赖 `green.success`（而非 refactor），确保即使重构失败也能验证功能正确性

---

## 3. migration — 系统迁移工作流

5 阶段：analyze → plan → execute → verify → cleanup

```json
{
  "name": "migration",
  "description": "系统迁移工作流：分析现状 → 制定计划 → 执行迁移 → 验证完整性 → 清理旧系统",
  "stages": [
    {
      "name": "analyze",
      "description": "分析现有系统结构、依赖和数据模型",
      "skills": ["csp-explore", "csp-map-codebase"],
      "condition": null,
      "on_failure": "stop",
      "timeout": 600,
      "artifacts": [
        ".csp/artifacts/analyze/system-map.md",
        ".csp/artifacts/analyze/dependencies.md"
      ]
    },
    {
      "name": "plan",
      "description": "基于分析结果制定迁移计划和回滚方案",
      "skills": ["csp-plan-phase", "csp-writing-plans"],
      "condition": "analyze.success",
      "on_failure": "stop",
      "timeout": 900,
      "artifacts": [
        ".csp/artifacts/plan/migration-plan.md",
        ".csp/artifacts/plan/rollback-plan.md"
      ]
    },
    {
      "name": "execute",
      "description": "按计划执行迁移操作",
      "skills": ["csp-executing-plans", "csp-database-migrations"],
      "condition": "plan.success && artifact_exists('.csp/artifacts/plan/migration-plan.md')",
      "on_failure": "stop",
      "timeout": 1800,
      "artifacts": [".csp/artifacts/execute/migration-log.md"]
    },
    {
      "name": "verify",
      "description": "验证迁移后系统功能完整性和数据一致性",
      "skills": ["csp-verify-phase", "csp-e2e-testing"],
      "condition": "execute.success",
      "on_failure": "stop",
      "timeout": 900,
      "artifacts": [".csp/artifacts/verify/verification-report.md"]
    },
    {
      "name": "cleanup",
      "description": "移除旧系统残留、更新文档和配置",
      "skills": ["csp-deprecation-and-migration"],
      "condition": "verify.success || verify.failed",
      "on_failure": "skip",
      "timeout": 300,
      "artifacts": [".csp/artifacts/cleanup/cleanup-log.md"]
    }
  ],
  "defaults": {
    "on_failure": "stop",
    "timeout": 600
  }
}
```

**流程说明：**
- `analyze` → `plan` → `execute` → `verify` 是严格的串行链，任何一环失败即停止
- `execute` 有最长超时（1800 秒 / 30 分钟），因为迁移操作通常耗时
- `cleanup` 的条件是 `verify.success || verify.failed`：无论验证是否通过都尝试清理
  - 验证通过：正常清理旧系统
  - 验证失败：清理临时文件和部分迁移产物
- `cleanup` 使用 `skip` 策略：清理是非关键操作，失败不影响整体状态
- `plan` 阶段要求同时满足 `plan.success` 和 artifact 存在，双重保障

---

## 模式总结

| 模式 | condition 用法 | on_failure 用法 | 典型场景 |
|------|---------------|----------------|---------|
| 严格串行 | `{prev}.success` | `stop` | 关键路径阶段 |
| 可选增强 | `{prev}.success` | `continue` / `skip` | lint、格式化、文档生成 |
| 容错执行 | 无条件或 artifact 检查 | `retry` | 网络操作、外部 API 调用 |
| 兜底清理 | `{prev}.success \|\| {prev}.failed` | `skip` | 资源回收、日志归档 |
| 并行汇聚 | `a.success && b.success` | `stop` | 多前置条件汇聚点 |
