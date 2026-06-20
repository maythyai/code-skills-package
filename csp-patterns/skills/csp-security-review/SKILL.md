---
name: csp-security-review
description: >
  Use this skill when adding authentication, handling user input, working with secrets, creating API endpoints, or implementing payment/sensitive features. Provides comprehensive security checklist and patterns.
metadata:
  origin: CSP
layer: 4
category: patterns
phase: review
domain: security
scope: review
tools: [Read, Grep, Glob]
---

**Remember**: Security is not optional. One vulnerability can compromise the entire platform. When in doubt, err on the side of caution.

---

## STRIDE 威胁建模快速表 (agent-skills 增强)

> 来源: agent-skills/security-and-hardening

在加固之前,先花 5 分钟像攻击者一样思考:

### 1. 映射信任边界

不信任数据从哪里进入系统?HTTP 请求、表单字段、文件上传、webhook、第三方 API、消息队列、**LLM 输出**。每个边界都是攻击面。

### 2. 命名资产

什么值得偷或破坏?凭证、PII、支付数据、管理员操作、资金流动。

### 3. 对每个边界运行 STRIDE

| 威胁 | 问自己 | 典型缓解措施 |
|------|--------|--------------|
| **S**poofing (仿冒) | 谁能假装是别人? | 强认证、MFA、证书固定 |
| **T**ampering (篡改) | 数据能在传输中被改吗? | TLS、签名、完整性校验 |
| **R**epudiation (抵赖) | 用户能否认操作吗? | 审计日志、数字签名 |
| **I**nformation Disclosure (信息泄露) | 谁能看到不该看的数据? | 加密、访问控制、数据脱敏 |
| **D**enial of Service (拒绝服务) | 什么能压垮系统? | 限流、队列、自动扩缩容 |
| **E**levation of Privilege (提权) | 普通用户能成为管理员吗? | 最小权限、输入验证、沙箱 |

### 威胁建模输出模板

```markdown
## 威胁模型: [功能名称]

### 信任边界
- [ ] HTTP 请求 → 应用层
- [ ] 用户输入 → 数据库
- [ ] 第三方 API → 内部服务

### 资产
- [ ] 用户凭证
- [ ] 个人身份信息 (PII)
- [ ] 支付数据

### STRIDE 分析
| 威胁 | 风险等级 | 缓解措施 | 状态 |
|------|----------|----------|------|
| Spoofing | 高 | OAuth 2.0 + MFA | ✅ 已实现 |
| Tampering | 中 | TLS 1.3 + HMAC | ✅ 已实现 |
| ... | ... | ... | ... |
```
