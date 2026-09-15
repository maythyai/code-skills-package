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
phase: build
domain: patterns
---

| 维度 | 简单工作流 | 完整工作流 |
|------|-----------|-----------|
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
| `.csp/AGENTS.md` 不存在 | 不跳过——先跑 `csp-knowledge-hub`(S0) 初始化中枢，未初始化不进 P1 |
| `.csp/specs/`+`.csp/tasks/` 已存在（orchestrator 产出） | P0, P1, P2, P3 → 从 P4 起，读 specs/tasks 为输入（spec-aware 串联形态） |
| 已有 PRD/spec 文件 | P0, P1 |
| 已有技术设计文档 | P2 |
| 已有实现计划 | P3 |
| 简单 bug 修复 | P0, P1, P2, P3 → 直接 P4 |
| PATCH/MINOR 增量且 PRD 已足够详细 | P0,P2,P3 轻量可跳，**硬门控**：跳 02 须 PRD 含 Feature 拆解清单 + 每 Feature ≥1 AC；跳 03 须 PRD 含数据模型 + API 契约；否则 02/03 必跑（防"PRD→code 直连断裂"）；lifecycle-state 标 `skipped_stages` + 理由 |
| 无前端变更 | P4 前端 subagent |
| 无需部署 | P7 |

## 内环对齐与产物边界

> csp-full 是 `.csp/` 内环的**执行车道**，不是独立王国。它与内环（00-07 prompts / S0-S9 lifecycle 契约）共享 `manifest.json`/`lifecycle-state.json`/`AGENTS.md`。完整对齐表、handoff 契约、更新时机见 `references/inner-loop-alignment.md`——**必读**。要点：

**三种运行形态（由版本复杂度自动判定，不由人指定）：**
| 形态 | 触发 | 起始 | 产物落点 |
|---|---|---|---|
| 串联（spec-aware） | `.csp/specs/`+`.csp/tasks/` 已存在 | P4 | 全进内环产物体系 |
| 独立全流程 | 全新项目、无 specs | P0 | PRD→`docs/prd/`、spec/tasks→`.csp/`、执行态→`.csp/full/` |
| 轻量增量 | PATCH/MINOR、PRD 已足够详细 | P1(精简)/P4 | `skipped_stages` 诚实标注 |

**产物边界（违反即断裂追溯链）：**
- PRD 正本 → `docs/prd/PRD-{slug}.md`（人读、永久）；PMS 蒸馏 → `.csp/product-spec/`。**禁止**写 `.csp/full/PRD.md` 第三副本。
- spec → `.csp/specs/`；tech-design/THREAT-MODEL → `.csp/tech-design/`；task → `.csp/tasks/`；plan → `.csp/plan/`；CMS → `.csp/code-spec/`；review → `.csp/review/`；ship → `.csp/ship/`；ops → `.csp/ops/`。
- `.csp/full/` 只保留执行过程态：`intake.md`、里程碑归档快照。里程碑归档 canonical 在 `.csp/milestones/{m}/`。

**更新时机（强制，对齐内环 00 约定）：**
- **manifest.json**：每阶段产出实质页后立即回写 `source_id`/`source_type`/`content_hash`(git blob)/`build_status`。P1=doc+pms、P2=spec、P3=doc+feature、P4=cms(每次原子 commit)、P6=doc、P7=archive、P8=doc。
- **lifecycle-state.json**：启动 step 0.5 读（`.csp/AGENTS.md` 缺则先 S0 init，不静默进 P1）；每阶段末写 `status=done`+`current_stage`+`progress`+`reconciled=false`；**P7 双写 `milestone` 与 `version`(SemVer tag) + `latest_release`**；轻量跳过写 `skipped_stages`+理由。
- **AGENTS.md**：P7 ship 时自动更新版本号/里程碑/三说明书定位表，不靠手填。

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
4. 产出 `docs/prd/PRD-{slug}.md`（人读正本）+ `.csp/product-spec/`（PMS 蒸馏）

**独立开发者模式：**
1. 自助 PRD 生成（精简版）
2. 核心要素：用户故事、验收标准、MVP 范围
3. 产出 `docs/prd/PRD-{slug}.md` + `.csp/product-spec/`（PMS 蒸馏）

> **边界**：PRD 正本落 `docs/prd/`（不落 `.csp/full/`）；PRD↔PMS 映射由 `manifest.json` 承载。串联形态下若 `docs/prd/PRD-{slug}.md` 已存在则跳过 P1。
> **骨架先行禁令**：PRD 未产出/未 Approved 前禁止写生产代码骨架——PRD 是规格不是事后记录（历史迭代暴露的反模式：骨架先行致 PRD 降级为历史记录）。极小改动用 `csp-simple-dev`。
> **回写**：P1 末回写 `manifest.json`（PRD item `source_type=doc`、PMS item `source_type=pms`、`build_status=built`）+ `lifecycle-state`（P1 done，`current_stage` 推进）。

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
4. 产出 `.csp/tech-design/`（ARCHITECTURE/DATA/INTERFACE + THREAT-MODEL）+ `.csp/specs/`（每 Feature Spec）

**独立开发者模式：**
1. 轻量架构设计
2. 关键技术决策记录
3. 产出 `.csp/tech-design/` + `.csp/specs/`（精简 Spec）

> **边界**：THREAT-MODEL 落 `.csp/tech-design/THREAT-MODEL.md`（不落 `.csp/full/`）。串联形态下若 `.csp/specs/` 已存在则跳过 P2，改读为 P4 输入。
> **回写**：P2 末回写 `manifest.json`（spec/tech-design item `source_type=spec`、`build_status=built`）+ `lifecycle-state`（P2 done）。

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
4. 产出 `.csp/tasks/`（WBS + DEPENDENCY-DAG + TASK-CARDS）+ `.csp/plan/IMPLEMENTATION-PLAN.md`

**独立开发者模式：**
1. 自助任务分解
2. 依赖关系标记
3. 产出 `.csp/tasks/` + `.csp/plan/IMPLEMENTATION-PLAN.md`（精简）

> **边界**：任务落 `.csp/tasks/`（不落 `.csp/full/`）。串联形态下若 `.csp/tasks/` 已存在则跳过 P3。
> **回写**：P3 末回写 `manifest.json`（task item `source_type=doc`+`kind=feature`、`build_status=built`）+ `lifecycle-state`（P3 done，`current_stage` 推进至 P4）。

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

> **回写**：P4 每个原子 commit 后增量回写 `.csp/code-spec/`(CMS delta) + `manifest.json`（CMS item `source_type=cms`、`build_status=built`）。P4 完成时写 `lifecycle-state`（P4 done，`current_stage` 推进至 P5）。

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

> **回写**：P5 末回写 `.csp/artifacts/verify/` 证据 + `manifest.json`（verify item `source_type=doc`、`build_status=built`）+ `lifecycle-state`（P5 done，`current_stage` 推进至 P6）。

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

> **回写**：P6 末回写 `.csp/review/REVIEW-FINDINGS.md` + `manifest.json`（review item `source_type=doc`、`build_status=built`）+ `lifecycle-state`（P6 done，`current_stage` 推进至 P7）。

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

> **产物边界**：ship 产物落 `.csp/ship/`（含 `VERSION-REGISTRY.md`）；里程碑归档落 `.csp/milestones/{milestone}/`（canonical，与内环共享），不落 `.csp/full/milestones/`。
> **回写（P7 是闭环关键）**：
> - `manifest.json`：归档快照 item `source_type=archive`、`build_status=built`；CMS re-align 后更新 `content_hash`。
> - `lifecycle-state.json`：**双写 `milestone` 与 `version`(SemVer tag) + `latest_release`**；prod-verified 后写 `prod_version`；`reconciled=false`（待对账）。
> - `ROADMAP.md`：同步 `docs/strategy/ROADMAP.md` 本版本行 status=`released` + 回填 `实际交付`；回写 manifest item `source_type=doc`。
> - `AGENTS.md`：自动更新「项目概览」版本号 + 里程碑 + 三说明书定位表（CMS 已建则去"未建"标注），不靠手填。
> - P7 done 后 `current_stage` 推进至 P8。

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

> **回写**：P8 末回写 `.csp/ops/` 配置 + `manifest.json`（ops item `source_type=doc`、`build_status=built`）+ `lifecycle-state`（P8 done，`current_stage` 推进至下一迭代或 `milestone-archive`）。

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

每个里程碑的产出物归档到 `.csp/milestones/{milestone}/`（canonical，与内环共享；`.csp/full/milestones/` 为兼容旧路径）。归档含 specs/plan/test-results/review/release-notes 快照 + `lifecycle-state.json` 对账后快照。

## 执行流程

```
0. 启动探测（step 0.5）：
   a. 读 .csp/lifecycle-state.json 定位"现在第几步、下一步谁"
   b. 若 .csp/AGENTS.md 不存在 → 先跑 csp-knowledge-hub(S0) 初始化中枢，不静默进 P1
   c. 探测 .csp/specs/+.csp/tasks/ 是否已存在（orchestrator 产出）→ 串联形态，跳 P0-P3 从 P4 起
1. 解析参数 (--mode, --milestones, 等)
2. 评估输入复杂度 → 确定起始阶段与运行形态（串联/独立/轻量）
3. 按 DAG 顺序执行各阶段
4. 每个阶段完成后：
   a. 验证产出物存在
   b. 回写 manifest.json（source_id/source_type/content_hash/build_status）
   c. 写 lifecycle-state.json（status=done + current_stage + progress + reconciled=false）
   d. 检查门控条件
   e. 通过后 → 下一阶段
   f. 失败 → 进入 handle_blocker
5. 里程碑完成后：
   a. 归档产出物到 .csp/milestones/{milestone}/（canonical）
   b. P7 双写 lifecycle milestone+version，更新 AGENTS.md
   c. 如 --auto-iterate → 进入下一里程碑
   d. 否则 → 报告完成
```

## 阻塞处理（Handle Blocker）

任何阶段失败时，提供 3 个选项：

1. **修复并重试** — 针对当前阶段重试
2. **跳过此阶段** — 标记为 skipped，继续下一阶段；**必须在 `lifecycle-state.json` 写 `skipped_stages` + 跳过理由，不假装走了全流程**
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
- `references/inner-loop-alignment.md` — **csp-full ↔ 内环对齐表 + handoff 契约 + 更新时机（必读）**
- `references/enterprise-mode.md` — 企业角色定义、审批门控和合规检查清单
- `references/solo-mode.md` — Solo 模式精简策略、快速通道和成本优化
- `references/skill-orchestration.md` — Subagent 编排模式和错误处理策略

## 成功标准

- [ ] 所有非跳过的阶段均产出有效产物；跳过的阶段在 `lifecycle-state.json` 标 `skipped_stages` + 理由
- [ ] PRD 包含至少 1 个 falsifiable 验收标准；PRD 正本落 `docs/prd/`（不落 `.csp/full/`）
- [ ] 技术设计包含关键技术决策记录；spec/tech-design 落 `.csp/specs/`+`.csp/tech-design/`
- [ ] 实施计划包含依赖分析和并行策略；task/plan 落 `.csp/tasks/`+`.csp/plan/`
- [ ] QA 所有 CRITICAL 测试通过
- [ ] 代码审查无 CRITICAL 问题
- [ ] PRD 对齐验证通过率 ≥ 90%
- [ ] 发布产物（RELEASE.md, CHANGELOG, tag）完整；ship 落 `.csp/ship/`
- [ ] **manifest.json 已回写**本里程碑全部产物（source_id/content_hash/build_status）
- [ ] **lifecycle-state.json 已写**：milestone 与 version 双写、`reconciled=false`、`current_stage` 推进
- [ ] **AGENTS.md 版本/里程碑已更新**（P7 自动）
- [ ] 用户收到完成报告和下一步建议
