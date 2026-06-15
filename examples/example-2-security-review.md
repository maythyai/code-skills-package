# Example 2: Security Review (csp-security-reviewer)

> 使用 CSP 技能包中的 `csp-security-reviewer` agent 对安装脚本进行安全审计。

---

## 使用的 Skill

- **Agent**: `csp-security-reviewer` (位于 `csp-patterns/agents/csp-security-reviewer.md`)
- **类型**: Agent — 安全漏洞检测与修复专家
- **模型**: sonnet

## 审查目标

- **文件**: `install.sh`
- **描述**: CSP 多平台安装脚本，支持 18 个 AI 编程工具
- **行数**: 1278 行 bash 脚本

## 提示词

```
You are the csp-security-reviewer agent. Perform a full security audit on the following file:

/Users/cs/projects/code-skills-package/install.sh

Context: This is the main installer script for a Code Skills Package. It handles file copying,
bootstrap generation, platform detection, and uninstall operations. It runs with user's shell
permissions and operates on both project directories and potentially the user's home directory.

Follow the security-reviewer protocol:
1. Check for hardcoded secrets, API keys, passwords, tokens
2. Check for shell injection vulnerabilities
3. Check for path traversal vulnerabilities
4. Check for unsafe file operations
5. Check for insecure command execution
6. Apply OWASP Top 10 thinking
7. Check trust boundaries
8. Rate issues by severity and confidence with file:line references

Report your findings in the structured Security Review format.
```

## 审计结果

### By Severity
- CRITICAL: 0
- HIGH: 0
- MEDIUM: 3
- LOW: 5

### Issues 详情

| # | Severity | Confidence | 描述 | 位置 |
|---|----------|------------|------|------|
| 1 | MEDIUM | HIGH | `sed` 变量扩展未转义 — 路径含 sed 元字符时会出错 | line 1217-1218 |
| 2 | MEDIUM | HIGH | `echo` 会解释转义序列 — bootstrap 内容可能损坏 | 8 处 (742, 747, 752, ...) |
| 3 | MEDIUM | HIGH | `rm -rf` 缺少路径校验 — 无 `base_dir=/` 防护 | line 797, 803 |
| 4 | LOW | HIGH | `echo` 存在 `-flag` 风险 | line 292, 295, 307 |
| 5 | LOW | MEDIUM | 卸载时可能删除用户已有文件 (匹配 CSP 标题即清理) | line 293, 305, 841 |
| 6 | LOW | HIGH | 无 `nullglob` 时 glob 展开异常 | line 243 |
| 7 | LOW | HIGH | `find | while read` 不处理文件名含换行符的情况 | line 262, 1211 |
| 8 | LOW | HIGH | 管道中 `while` 循环的子 shell 变量作用域丢失 | line 1254-1256 |

### 优点

- 白名单输入验证 (通过 `case` 语句) — 无 eval/backtick 注入风险
- 无硬编码密钥或凭证
- 良好的错误处理 (`set -eo pipefail`)
- 主目录安装防护 (line 1009)
- 提供 dry-run 预览模式

### 建议修复优先级

1. 添加 `base_dir` 校验 (拒绝 `/` 和空值)
2. 将所有 `echo "$bootstrap_content"` 替换为 `printf '%s\n'`
3. 用 bash 参数展开 `${skill_dir#$src/}` 替换 sed 路径处理
4. 在 `rm -rf` 前添加路径校验 (确认目标包含 `skills`)

### Overall Risk Level: **LOW-MEDIUM**

## OWASP Top 10 映射

| 类别 | 发现 | 严重度 |
|------|------|--------|
| A01: Broken Access Control | `rm -rf` 无路径校验 | MEDIUM |
| A03: Injection | sed 变量未转义 | MEDIUM |
| A04: Insecure Design | `echo` 解释转义序列 | MEDIUM |
| A05: Security Misconfiguration | 无 `base_dir=/` 校验 | MEDIUM |
| A08: Data Integrity | echo 导致的内容损坏 | MEDIUM |

## 学到的东西

1. **安全审查深度好**: 不仅找漏洞，还做了信任边界分析和 OWASP 映射
2. **Blast Radius 评估有用**: 每个问题都有影响范围评估，帮助判断优先级
3. **STRIDE 框架适用**: 虽然这个脚本没有网络交互，但文件操作层面的威胁建模很完整
