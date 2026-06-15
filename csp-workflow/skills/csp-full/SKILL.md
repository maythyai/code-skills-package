---
name: csp-full
description: |
  CSP Full — 全链路产品交付工作流，从想法到生产部署的端到端自动化。
  覆盖：需求澄清 → PRD → 技术设计 → 并行开发 → 测试 → 代码审查 → 发布 → 运维监控。
  支持企业协作模式（多角色、审批门控）和独立开发者模式（精简快速）。
  支持多轮里程碑迭代（MVP → v1 → v2）。
  当用户描述一个产品想法、想要从零构建一个应用、需要端到端全流程交付时使用。
  关键词：csp-full, "full workflow", "full pipeline", "端到端", "全流程",
  "从需求到发布", "从想法到产品", "从概念到上线",
  "build me a product", "build me an app", "build me a tool", "build me a platform",
  "ship a feature", "ship a product", "MVP to production", "from scratch to production",
  "complete pipeline", "end to end", "end-to-end delivery", "idea to product",
  "enterprise workflow", "product lifecycle", "多轮迭代", "完整交付", "全链路",
  "帮我做一个", "帮我搭建", "帮我构建", "帮我开发一个",
  "搭建一个完整的", "构建一个完整", "开发一个完整",
  "做一个产品", "做一个平台", "做一个系统",
  "从零开始", "从0到1", "从0开始", "从零搭建",
  "一站式", "新建一个应用", "新建一个产品", "create a complete", "build from scratch"。
  即使用户只说了一个模糊想法（如"帮我做一个习惯打卡 app"、"构建一个完整的博客系统"），只要涉及从零构建完整产品，就应使用此 skill。
  如果用户只是要求代码审查、bug 修复、解释概念或单文件修改，不要使用。
layer: 2
category: workflow
------|--------------|----------|
| 链路长度 | 需求 → 设计 → 代码 → QA → 审查 | 需求 → PRD → 技术设计 → 开发 → 测试 → 审查 → 验证 → 发布 → 运维 |
| 模式 | 单模式（自主构建） | 企业模式 / 独立开发者模式 |
| 迭代 | 单次任务 | 多里程碑自动推进（MVP → v1 → v2） |
| 产出 | 代码 | 代码 + PRD + 文档 + 部署 + 监控 |

## 模式选择

通过参数或自动判断：

```
--mode enterprise   # 企业协作模式：多角色分工、审批门控、合规检查
--mode solo         # 独立开发者模式：精简流程、最大化自动化
# 未指定时：检测项目是否有 >1 contributor 或 .csp/team.yaml → enterprise，否则 → solo
```

## 动态 DAG 路由

根据输入复杂度自动跳过或扩展阶段：

```
输入评估
  │
  ├── 极简/模糊（< 50 字，无具体锚点）
  │     └── P0 需求澄清 → brainstorming/interview
  │
  ├── 中等（有功能描述，无技术约束）
  │     └── P1 产品定义 → PRD（轻量版）
  │
  └── 详细（功能+约束+技术栈）
        └── 跳过 P0，直接进入 P1（完整版 PRD）
```

**阶段跳过规则：**
| 条件 | 跳过阶段 |
|------|---------|
| 已有 PRD/spec 文件 | P0, P1 |
| 已有技术设计文档 | P2 |
| 已有实现计划 | P3 |
| 简单 bug 修复 | P0, P1, P2, P3 → 直接 P4 |
| 无前端变更 | P4 前端 subagent |
| 无需部署 | P7 |

## 阶段定义

### Phase 0: 需求澄清（Intake & Clarification）

**目标：** 确保需求足够清晰可执行。

**企业模式：**
1. 检测 `.csp/team.yaml` 中的产品经理角色
2. 如果需求模糊，激活 PM subagent 进行 Socratic 访谈
3. 产出 `.csp/full/intake.md`

**独立开发者模式：**
1. 如果需求模糊 → `Skill(skill="csp-brainstorming")` 或 `Skill(skill="csp-interview-me")`
2. 自助澄清关键决策点
3. 产出 `.csp/full/intake.md`

**Intake 输出结构：**
```markdown
# Intake: [项目名称]
## 核心问题
- 要解决什么问题？
- 目标用户是谁？
- 成功标准是什么？

## 功能列表
| 功能 | 优先级 | 复杂度估计 |
|------|--------|-----------|

## 约束条件
- 技术栈：
- 时间线：
- 依赖：

## 开放问题
- [ ] 待澄清项
```

**门控：** 开放问题 > 3 个时，暂停并请求用户澄清。

### Phase 1: 产品定义（Product Definition / PRD）

**目标：** 产出正式的产品需求文档。

**企业模式：**
1. PM subagent 创建 PRD
2. 利益相关者审查（模拟 reviewer subagent）
3. 审批门控：PRD 需通过评审才可进入下一阶段
4. 产出 `.csp/full/PRD.md`

**独立开发者模式：**
1. 自助 PRD 生成（精简版）
2. 核心要素：用户故事、验收标准、MVP 范围
3. 产出 `.csp/full/PRD.md`

**PRD 输出结构：**
```markdown
# PRD: [产品名称]
## 问题陈述
## 目标用户
## 用户故事
### US-1: [标题]
- 作为 [角色]，我想 [行为]，以便 [价值]
- 验收标准：[falsifiable criteria]

## MVP 范围
### In Scope
### Out of Scope

## 成功指标
## 里程碑规划
### MVP
### v1
### v2

## 风险与缓解
```

**门控：** PRD 必须包含至少 1 个 falsifiable 验收标准。

### Phase 2: 技术设计（Technical Design）

**目标：** 将 PRD 转化为技术实现方案。

**企业模式：**
1. Architect subagent（Opus）：系统架构设计
2. Security subagent：威胁建模
3. 技术评审会议（模拟多角色审查）
4. 产出 `.csp/full/TECH-DESIGN.md` + `.csp/full/THREAT-MODEL.md`

**独立开发者模式：**
1. 轻量架构设计
2. 关键技术决策记录
3. 产出 `.csp/full/TECH-DESIGN.md`

**技术设计输出结构：**
```markdown
# Technical Design: [项目名称]
## 架构概览
## 技术栈选型及理由
## 数据模型
## API 契约
## 组件设计
## 关键技术决策 (ADRs)
### ADR-1: [决策] - [理由]
## 安全考量
## 性能考量
## 依赖与风险
```

### Phase 3: 实施规划（Implementation Planning）

**目标：** 将技术设计拆解为可并行执行的任务。

**企业模式：**
1. Tech Lead subagent 创建任务分解
2. 依赖分析 → DAG 构建
3. 任务优先级排序
4. 产出 `.csp/full/PLAN.md`

**独立开发者模式：**
1. 自助任务分解
2. 依赖关系标记
3. 产出 `.csp/full/PLAN.md`

**规划输出结构：**
```markdown
# Implementation Plan: [项目名称]
## 任务分解
### T1: [任务名] (P0, 依赖: 无)
### T2: [任务名] (P1, 依赖: T1)
...

## 执行顺序
T1 → T2,T3 → T4 → T5

## 并行策略
- 可并行组: [T2, T3]
- 串行链: [T1 → T4 → T5]

## 验收标准映射
T1 → US-1.AC-1, US-1.AC-2
```

### Phase 4: 并行执行（Parallel Execution）

**目标：** 按计划实现功能。

**执行策略：**
1. 读取 PLAN.md 中的并行组
2. 对每个并行组，spawn 对应的 specialist subagent：

| 任务类型 | Subagent | Model |
|---------|----------|-------|
| 后端 API | `ecc:architect` + executor | Opus/Sonnet |
| 前端 UI | `ecc:frontend-design-direction` + executor | Sonnet |
| 数据库迁移 | `ecc:database-reviewer` + executor | Sonnet |
| 基础设施 | executor | Haiku/Sonnet |
| 测试编写 | `ecc:tdd-guide` | Sonnet |

3. 每个 subagent 独立执行，完成后提交成果
4. 集成所有成果到主代码库

**企业模式特有：** 每个 subagent 产出独立 PR，需通过审查后合并。
**独立开发者模式：** 直接提交到主分支，减少 overhead。

### Phase 5: 质量保证（Quality Assurance）

**目标：** 确保代码质量和功能正确性。

**流程：**
1. **构建验证：** `Bash` 运行 build/lint
2. **测试执行：** `Skill(skill="csp-tdd")` 运行测试套件
3. **QA 循环：** 最多 5 轮修复
   - 失败 → 诊断 → 修复 → 重测
   - 同一错误重复 3 次 → 报告根本问题，停止循环
4. **性能基准：** 如有性能要求，运行基准测试

**独立开发者模式：** 跳过企业级合规检查，聚焦功能正确性。

**门控：** 所有 CRITICAL 测试必须通过才可进入下一阶段。

### Phase 6: 审查与验证（Review & Validation）

**目标：** 多视角审查成果，验证是否达到预期产出。

**企业模式：**
1. **代码审查：** `Skill(skill="csp-code-review")` + 语言专项 reviewer
2. **安全审查：** `ecc:security-reviewer`
3. **架构审查：** `ecc:architect` subagent
4. **PRD 对齐验证：** 每个验收标准逐一核对
5. **利益相关者演示：** 生成 demo 摘要
6. **合规检查：** 如适用（HIPAA, GDPR 等）

**独立开发者模式：**
1. **代码审查：** `Skill(skill="csp-code-review")`
2. **安全扫描：** `ecc:security-scan`
3. **PRD 对齐验证：** 核心功能检查

**审查输出：**
```markdown
# Review Summary: [项目名称]
## 代码审查
- 严重问题: N
- 建议: N

## 安全审查
- 漏洞: N
- 风险等级: LOW/MEDIUM/HIGH

## PRD 对齐
| 验收标准 | 状态 | 证据 |
|---------|------|------|

## 总体评级
- [ ] 通过 — 可发布
- [ ] 有条件通过 — 需修复 N 个问题
- [ ] 不通过 — 需重大修改
```

**门控：** 有条件通过时，自动进入修复循环（1 轮）。修复后重新验证。

### Phase 7: 发布与交付（Ship & Deliver）

**目标：** 将成果交付到生产环境。

**企业模式：**
1. **发布审批：** 模拟 release manager 审批
2. **部署：** 执行部署脚本或指南
3. **文档：** 生成 release notes, API docs, runbooks
4. **变更日志：** 更新 CHANGELOG.md
5. **标签：** 创建 git tag

**独立开发者模式：**
1. **部署：** 直接执行部署
2. **文档：** 生成简要 release notes
3. **标签：** 创建 git tag

**发布产物：**
- `RELEASE.md` — 发布说明
- `CHANGELOG.md` — 变更日志更新
- Git tag (v[milestone])
- 部署状态报告

### Phase 8: 运维监控（Post-Launch Operations）

**目标：** 建立监控和反馈机制。

**企业模式：**
1. 监控仪表板配置建议
2. 告警规则定义
3. 反馈收集机制
4. 下一里程碑规划

**独立开发者模式：**
1. 基础健康检查脚本
2. 反馈收集建议
3. 下一里程碑建议

**运维输出：**
```markdown
# Post-Launch: [项目名称]
## 监控建议
## 关键指标
## 已知问题
## 下一里程碑建议
```

## 多轮迭代（Multi-Milestone）

CSP Full 支持自动推进多个里程碑。

**迭代配置：**
```bash
--milestones MVP,v1,v2          # 指定里程碑序列
--milestone-file .csp/milestones.yaml  # 从文件读取
--auto-iterate                  # 完成后自动推进到下一里程碑
--pause-between                 # 里程碑间暂停，等待用户确认
```

**迭代流程：**
```
MVP 全流程 (P0→P8)
  │
  ├── 通过 → 自动进入 v1
  ├── 有条件通过 → 修复 → v1
  └── 不通过 → 报告 → 停止

v1 全流程 (复用 MVP 基础，增量开发)
  │
  └── ... 同上

v2 全流程
```

每个里程碑的产出物归档到 `.csp/full/milestones/v{N}/`。

## 执行流程

```
1. 解析参数 (--mode, --milestones, 等)
2. 评估输入复杂度 → 确定起始阶段
3. 按 DAG 顺序执行各阶段
4. 每个阶段完成后：
   a. 验证产出物存在
   b. 检查门控条件
   c. 通过后 → 下一阶段
   d. 失败 → 进入 handle_blocker
5. 里程碑完成后：
   a. 归档产出物
   b. 如 --auto-iterate → 进入下一里程碑
   c. 否则 → 报告完成
```

## 阻塞处理（Handle Blocker）

任何阶段失败时，提供 3 个选项：

1. **修复并重试** — 针对当前阶段重试
2. **跳过此阶段** — 标记为 skipped，继续下一阶段
3. **停止工作流** — 报告当前进度并退出

**自动重试策略：**
| 阶段 | 最大重试次数 | 策略 |
|------|------------|------|
| P0 需求澄清 | 2 | 提供更多引导问题 |
| P1 PRD | 1 | 使用默认模板填充 |
| P2 技术设计 | 2 | 简化设计方案 |
| P3 规划 | 1 | 减少任务粒度 |
| P4 执行 | 3 | 诊断并修复 |
| P5 QA | 5 | 同 QA 循环策略 |
| P6 审查 | 2 | 自动修复常见问题 |
| P7 发布 | 1 | 回滚并重试 |
| P8 运维 | 1 | 跳过非关键项 |

## 配置

可选配置在 `.csp/full-config.yaml` 或 `.claude/csp.jsonc`：

```yaml
csp-full:
  mode: auto-detect    # enterprise | solo | auto-detect
  max-milestones: 3    # 最大迭代里程碑数
  pause-gates:         # 需要用户确认的门控点
    - prd-approved
    - tech-design-approved
    - release
  skip-phases: []      # 强制跳过的阶段
  qa-max-cycles: 5     # QA 最大循环次数
  review-auto-fix: true # 审查后自动修复常见问题
```

## 参考文件

详细的子编排规则、企业模式配置和 Solo 模式优化指南请参考：

- `references/dag-routing.md` — 完整的 DAG 路由决策树和 Subagent 选择矩阵
- `references/enterprise-mode.md` — 企业角色定义、审批门控和合规检查清单
- `references/solo-mode.md` — Solo 模式精简策略、快速通道和成本优化
- `references/skill-orchestration.md` — Subagent 编排模式和错误处理策略

## 成功标准

- [ ] 所有非跳过的阶段均产出有效产物
- [ ] PRD 包含至少 1 个 falsifiable 验收标准
- [ ] 技术设计包含关键技术决策记录
- [ ] 实施计划包含依赖分析和并行策略
- [ ] QA 所有 CRITICAL 测试通过
- [ ] 代码审查无 CRITICAL 问题
- [ ] PRD 对齐验证通过率 ≥ 90%
- [ ] 发布产物（RELEASE.md, CHANGELOG, tag）完整
- [ ] 用户收到完成报告和下一步建议
