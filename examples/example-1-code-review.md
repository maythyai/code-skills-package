# Example 1: Code Review (csp-code-reviewer)

> 使用 CSP 技能包中的 `csp-code-reviewer` agent 对真实 TypeScript 测试文件进行代码审查。

---

## 使用的 Skill

- **Agent**: `csp-code-reviewer` (位于 `csp-runtime/agents/csp-code-reviewer.md`)
- **类型**: Agent — 代码审查专家，带严重度评级反馈
- **模型**: opus

## 审查目标

- **文件**: `开源项目参考/compound-engineering-plugin/tests/detect-tools.test.ts`
- **描述**: 用于检测已安装 CLI 配置目录的测试文件，使用 bun:test 框架
- **行数**: 187 行，10 个测试用例

## 提示词

```
You are the csp-code-reviewer agent. Perform a full code review on the following file:

/Users/cs/projects/code-skills-package/开源项目参考/compound-engineering-plugin/tests/detect-tools.test.ts

Context: This is a test file for a tool that detects installed CLI config directories.
It uses bun:test framework. The project conventions are documented in AGENTS.md.

Follow the code-reviewer protocol:
1. Read the file
2. Check for security issues, logic correctness, error handling, code quality
3. Rate issues by severity (CRITICAL/HIGH/MEDIUM/LOW) and confidence (LOW/MEDIUM/HIGH)
4. Include file:line references
5. Provide a verdict (APPROVE/REQUEST CHANGES/COMMENT)
6. Note positive observations

Report your findings in the structured Code Review Summary format.
```

## 审查结果

### Code Review Summary

**Files Reviewed:** 1 (test file + source file under test)

### By Severity
- CRITICAL: 0
- HIGH: 0
- MEDIUM: 3
- LOW: 2

### Issues 详情

| # | Severity | Confidence | 描述 | 位置 |
|---|----------|------------|------|------|
| 1 | MEDIUM | HIGH | 硬编码工具数量 `expect(results.length).toBe(8)` — 工具增减会导致测试漂移 | line 48 |
| 2 | MEDIUM | HIGH | 临时目录从未清理 (`fs.mkdtemp` 创建但无 `fs.rm`) — CI 资源泄漏 | 全部测试用例 |
| 3 | MEDIUM | HIGH | 缺少 `kiro` 和 `qwen` 工具的测试覆盖 | source lines 73-85 |
| 4 | LOW | MEDIUM | `opencode.detectPaths` 回调签名与 `DetectableTool` 类型不匹配 (缺少 options 参数) | source line 25 |
| 5 | LOW | HIGH | Copilot cwd-based 检测缺少 `home=undefined` 场景的测试 | line 144-158 |

### Positive Observations

- 每个测试使用独立的临时目录，防止测试间相互影响
- 环境变量保存/恢复模式 (`originalEnv` + `afterEach`) 正确
- 明确测试了负向场景 (`.github` 目录不会触发 copilot 检测)
- 覆盖了 `OPENCODE_CONFIG_DIR` 的两个分支 (检测到 + 未检测到)
- `getDetectedTargetNames` 有正向和空场景的测试

### Verdict

**COMMENT** — 测试文件有良好的基础覆盖，包括精心设计的边缘用例。但需要补充 `kiro`/`qwen` 覆盖、实现临时目录清理、避免硬编码工具数量。

## 学到的东西

1. **csp-code-reviewer 表现优秀**: 严格遵循了两阶段审查协议 (先验证 spec 合规性，再做代码质量审查)
2. **Severity 分级合理**: 没有发现 CRITICAL/HIGH 级别的问题，MEDIUM 都是实际可修复的维护性问题
3. **Positive Observations 有价值**: 不仅指出问题，还记录了好做法，有助于团队学习
