# CSP Full 企业协作模式

## 角色定义

企业模式下，CSP Full 模拟以下角色：

| 角色 | 职责 | 阶段 | Agent 类型 |
|------|------|------|-----------|
| **Product Manager (PM)** | 需求澄清、PRD 撰写、利益相关者对齐 | P0, P1 | `general-purpose` (prompted as PM) |
| **Architect** | 系统设计、技术选型、ADR 撰写 | P2 | `ecc:architect` |
| **Tech Lead** | 任务分解、依赖分析、计划制定 | P3 | `ecc:planner` |
| **Backend Developer** | 后端 API、数据库逻辑实现 | P4 | 技术栈专项 reviewer |
| **Frontend Developer** | UI 组件、交互逻辑实现 | P4 | `ecc:react-reviewer` / `ecc:flutter-reviewer` |
| **QA Engineer** | 测试编写、缺陷修复 | P5 | `ecc:tdd-guide` |
| **Security Reviewer** | 漏洞扫描、威胁建模 | P6 | `ecc:security-reviewer` |
| **Release Manager** | 发布审批、部署执行 | P7 | `general-purpose` (prompted as RM) |
| **SRE** | 监控配置、告警规则、Runbook | P8 | `general-purpose` (prompted as SRE) |

## 审批门控（Approval Gates）

企业模式下，以下阶段需要审批才可继续：

### Gate 1: PRD 审批（P1 → P2）
```
1. PM subagent 提交 PRD
2. Architect 审查 PRD 技术可行性
3. Tech Lead 审查 PRD 实施可行性
4. 如有分歧，进入讨论轮次（最多 2 轮）
5. 双方通过后 → P2
```

**PRD 审批检查清单：**
- [ ] 用户故事是否清晰可执行？
- [ ] 验收标准是否 falsifiable？
- [ ] 技术可行性是否已评估？
- [ ] MVP 范围是否合理？
- [ ] 风险是否已识别？

### Gate 2: 技术设计审批（P2 → P3）
```
1. Architect 提交 TECH-DESIGN.md
2. Tech Lead 审查实施复杂度
3. Security Reviewer 审查威胁模型
4. 通过后 → P3
```

**技术设计审批检查清单：**
- [ ] 架构是否满足 PRD 需求？
- [ ] 技术选型是否合理？
- [ ] 数据模型是否完整？
- [ ] API 契约是否清晰？
- [ ] 安全考量是否覆盖？
- [ ] 性能是否有瓶颈？

### Gate 3: 发布审批（P6 → P7）
```
1. Review 结果汇总
2. Release Manager 审查：
   a. 所有 CRITICAL 问题已修复？
   b. PRD 对齐验证通过？
   c. 安全审查无 HIGH 漏洞？
   d. 测试覆盖率达标？
3. 通过后 → P7
```

**发布审批检查清单：**
- [ ] 代码审查通过（无 CRITICAL）
- [ ] 安全审查通过（无 HIGH 漏洞）
- [ ] PRD 对齐 ≥ 90%
- [ ] 测试覆盖率 ≥ 80%
- [ ] QA 所有 CRITICAL 测试通过
- [ ] 文档已更新

## 团队协作配置

### `.csp/team.yaml` 结构

```yaml
team:
  roles:
    - name: pm
      description: "产品经理，负责需求定义和优先级排序"
    - name: architect
      description: "架构师，负责系统设计和技术选型"
    - name: tech-lead
      description: "技术负责人，负责实施规划和代码审查"
    - name: developer
      description: "开发工程师，负责功能实现"
    - name: qa
      description: "测试工程师，负责质量保障"
    - name: security
      description: "安全工程师，负责安全审查"

  approval-gates:
    - prd-review    # P1 → P2 需要审批
    - tech-review   # P2 → P3 需要审批
    - release-review # P6 → P7 需要审批

  review-policy:
    min-reviewers: 1    # 每个变更最少审查者数
    auto-merge: false   # 是否自动合并
    branch-protection: true  # 是否启用分支保护
```

## 合规检查

### GDPR 合规
当检测到以下关键词时激活 GDPR 检查：
- 用户数据、个人数据、PII
- 欧洲用户、EU、GDPR
- 数据删除、数据导出、数据可携带

GDPR 检查清单：
- [ ] 数据收集有明确目的
- [ ] 数据存储有加密保护
- [ ] 用户可导出个人数据
- [ ] 用户可删除个人数据
- [ ] 数据传输使用 TLS

### HIPAA 合规
当检测到以下关键词时激活 HIPAA 检查：
- 医疗、健康、患者
- PHI、ePHI
- HIPAA、医疗记录

HIPAA 检查清单：
- [ ] PHI 加密存储
- [ ] 访问日志记录
- [ ] 最小权限原则
- [ ] 审计追踪

## 变更管理

### 变更请求流程
```
变更请求 → 影响分析 → PRD 更新 → 技术设计更新 → 实施 → 验证 → 发布
```

### 版本策略
- **Semantic Versioning**: MAJOR.MINOR.PATCH
- MVP → v1.0.0
- 新功能 → MINOR bump
- Bug 修复 → PATCH bump
- 破坏性变更 → MAJOR bump

## 文档要求

企业模式下，以下文档为必需产出：

| 文档 | 阶段 | 必需性 |
|------|------|--------|
| PRD.md | P1 | 必需 |
| TECH-DESIGN.md | P2 | 必需 |
| THREAT-MODEL.md | P2 | 必需 |
| PLAN.md | P3 | 必需 |
| TEST-REPORT.md | P5 | 必需 |
| REVIEW.md | P6 | 必需 |
| RELEASE.md | P7 | 必需 |
| RUNBOOK.md | P8 | 建议 |
