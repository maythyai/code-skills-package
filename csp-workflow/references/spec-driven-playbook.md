# Spec-Driven Development Playbook

> 蒸馏自 SDD 实践复盘（《5 人 7 天干完 20 人数周的活：Spec-Driven Development
> 如何重新定义 AI 编程》）与 GitHub Spec Kit 设计，落地为 CSP 的流程规范。
>
> 本文是 `csp-spec-driven-development` / `csp-spec-contract` 两个 meta 技能的
> 深层参考。日常执行看技能本身；遇「粒度拿捏、循环何时停、漂移怎么防、何时
> 该 bypass 流程」等判断题时回到本 playbook。

## 1. 一句话定义与核心倒置

> **Spec-Driven Development：将规格说明（Specification）作为唯一真实来源
> （Single Source of Truth），代码作为其派生产物。**

传统开发里 Spec 服务于代码、写完即弃；SDD 倒置权力结构——**代码服务于 Spec**。
人定义 **WHAT**，AI 实现 **HOW**。AI 不会追问「这个边界怎么处理」，它只按上下文
尽力推断：推断对了是运气，推断错了是 Bug。Spec 的作用是**消除 AI 的猜测空间**。

在 AI 编程时代，Spec 写得好不好**直接决定代码质量**，而不只是影响沟通效率。
这是 SDD 与传统「写文档」的本质差异。

## 2. 四阶段模型

```
Specify（规格定义）→ Plan（方案规划）→ Implement（代码实现）→ Validate（验证确认）
```

| 阶段 | 主导者 | 核心产出 | 关键动作 | CSP 映射 |
|------|--------|----------|----------|----------|
| Specify | 人 | spec.md | 定义问题、边界、成功标准 | 01 PRD → 02 拆解 → 03 全栈 Spec |
| Plan | 人+AI | plan.md | 架构选型、模块划分、接口定义 | 03 技术方案（design.md + ADR） |
| Implement | AI | 代码+测试 | 按 plan 逐任务实现 | 05 并行开发（一 task 一 commit） |
| Validate | 人+AI | 测试报告 | 自动化测试 + 人工 Review | 06 质量门控 + 审查 + 对账 |

**关键**：Specify↔Plan 之间多轮迭代，Implement↔Validate 之间持续循环——不是线性瀑布。
CSP 的 PMS/CMS/TMS 三说明书 + lifecycle-state 让这四阶段跨迭代 living。

## 3. 三文件 + 宪法体系

### 3.1 三文件

| 文件 | 回答 | CSP 产物 |
|------|------|----------|
| **spec.md**（需求规格，唯一真实来源） | 做什么、为什么 | `.csp/specs/SPEC-F-*.md`（delta：ADDED/MODIFIED/REMOVED + Scenario） |
| **plan.md**（架构方案，AI 起草人审） | 怎么做 | `.csp/tech-design/` + `.csp/tech-decisions/ADR/` |
| **tasks.md**（任务清单，可独立验证） | 拆成什么 | `.csp/tasks/`（WBS + task 卡 + 依赖 DAG） |

CSP 把三文件拆得更细：proposal（why+scope）/ spec（delta 需求）/ design（how+
decisions）/ tasks（checkbox）/ constitution（宪法）。粒度更精确，但映射关系不变。

### 3.2 constitution.md — 项目宪法（跨 spec 的「潜意识」）

> 参见模板 `csp-workflow/templates/change-artifacts/constitution.md`。

宪法定义**全员适用、长期不变**的不可违背约束（API 规范、安全基线、代码质量、
基础设施）。它的价值：把团队技术决策固化为 AI 的潜意识——没有它，每个 spec 都要
重复声明「要用参数化查询」「要写单元测试」这些基线。

**继承规则**：spec 的 Constraints 只写「本 Feature 的外部限制」（如「必须兼容
现有 OAuth2.0 流程」），不重复宪法基线；design 若需偏离宪法，必须显式记录「宪法
例外 + 理由 + 豁免范围」。初始化在 00 知识中枢阶段，落到 `.csp/CONSTITUTION.md`。

## 4. 好 Spec 的六要素

| 要素 | 作用 | CSP 落点 |
|------|------|----------|
| Problem Statement | 定义「为什么做」 | proposal `## Why` |
| Success Metrics | 定义「做到什么程度算完」（可测试） | spec NFR / proposal 目标 |
| User Stories | 定义「谁在什么场景下用」 | spec requirements |
| Acceptance Criteria | 定义「怎么验证」（可证伪） | spec `#### Scenario`（Given/When/Then） |
| Non-Goals | 定义「什么不做」 | design `## Non-Goals` + spec boundaries |
| Constraints | 定义「技术约束」（外部限制，非方案） | spec NFR / design context |

**好 Spec vs 坏 Spec 的本质差异**：

- 坏：「系统需要**快速**的搜索功能，结果应该**相关**且**准确**。」
  → 模糊（快速多快？）、遗漏边界（搜什么？）、缺理由、混入 HOW（界面美观）。
- 好：「`## Problem Statement` 用户反馈在 10,000+ 文档库中找目标文档平均 3 分钟，
  目标缩短到 10 秒内。`## Success Metrics` 搜索 API P95 < 200ms；Top-5 相关性
  准确率 > 85%（人工标注测试集）；支持中英文混合。`## Non-Goals` 不实现语义搜索
  （本期仅关键词+分词）；不搜附件内容。」

> **核心判据：好 Spec 是可测试的，坏 Spec 是可解释的。**
> 「系统应该很快」给 AI 无限解释空间；「P95 < 200ms」是硬约束，AI 必须满足否则 fail。

## 5. 粒度检验标准（防过度规格化）

Spec 粒度最难拿捏：太粗，AI 自作主张填补细节；太细，本质是写伪代码，失去 SDD 价值。

> **Litmus test：用不同技术栈实现这个 Spec，Spec 是否仍然有效？**

- ✗ Spec 写「使用 Redis ZSET 存储排行榜」→ 只对 Redis 方案有效，换 PostgreSQL 失效。
  → 把 HOW 混进了 WHAT，**过度规格化**。
- ✓ Spec 写「排行榜需支持实时更新，延迟 ≤1s，支持 Top-100 查询」→ 无论 Redis /
  PostgreSQL / 自研存储都成立。→ 正确粒度。

**注意**：Constraints 可出现技术约束，但那是「外部限制」（「必须用现有 PostgreSQL
实例」），不是「实现方案」（「用 Redis ZSET」）。区分二者是粒度门的核心。

CSP 的 `csp-spec-contract` falsification pass 已检查「should/might/could」；
本 litmus test 是其补充——专门防 HOW 入侵 WHAT。

## 6. Spec↔Plan 精炼循环（3-5 轮）

> 这是 SDD 与瀑布模型最关键的区别：Spec 是活的，不是一次性写死。

第一版 Spec 通常问题百出（遗漏边界、AC 模糊、Non-Goals 不明）。**让 AI 基于
v1 Spec 生成 Plan，再回头审视 Spec**，能暴露大量盲点。循环：

```
Spec v1 → 生成 Plan → 对照 Plan 审 Spec（暴露盲点）→ 改 Spec → 重生成 Plan
        ↑                                                              │
        └──────────── 直到收敛 ←──────────────────────────────────────────┘
```

**收敛判据（任一满足即可出 Spec）**：
1. 一轮 Spec→Plan 后，Spec 无新增 Non-Goal、无补 AC、无收紧措辞 → 盲点已清。
2. Plan 对 Spec 的每条 AC 都能映射到具体任务，无「Plan 里出现 Spec 未定义的行为」。
3. 粒度 litmus test 通过（§5）+ falsification pass 通过（无 should/might/could）。

**典型轮次**：3-5 轮。把「开发到一半发现需求有问题」的代价前移到成本最低的阶段
——改一行 Spec 远低于改一百行代码。

CSP 落地：03 全栈 Spec（Specify）与 03 技术方案（Plan）同在 tech-designer 阶段，
天然适合内嵌此循环；Stage 4 方案评审是循环外的独立复核，不等同于精炼循环——
循环在 Spec 作者侧自迭代，评审是独立第三方 gate。两者叠加。

## 7. 五大陷阱与缓解

| 陷阱 | 症状 | 后果 | 缓解 |
|------|------|------|------|
| **过度规格化** | Spec 比代码还长，每细节规定死 | 退化为「自然语言伪代码」，失去 WHAT/HOW 分工 | §5 粒度 litmus test；HOW 入侵 WHAT 即重写 |
| **规格腐烂**（Spec Rot） | 代码迭代十几版，Spec 还停 V1 | Spec 与代码脱节，AI 增量开发基于过时 Spec 必冲突 | 「发现需求/BUG 立即写增量 Spec」；delta（ADDED/MODIFIED/REMOVED）与代码变更同步；ship 时 fold 回 canonical |
| **规格官僚化**（Spec Bureaucracy） | 改个按钮颜色也走全流程 | 团队绕过流程直接改代码，SDD 名存实亡 | 区分重大/微小变更（§8）；纯局部修改直接改 |
| **虚假信心**（False Confidence） | 有详尽 Spec 就放松对 AI 代码审查 | Spec 只定义「做什么」，不保证实现正确/安全/高效 | Spec 替代需求文档，不替代 Code Review；06 Validate 是最后安全网 |
| **工具复杂性**（Tool Overhead） | 为「做好 SDD」堆砌 Spec Kit+CI+Linter | 配置工具时间 > 写 Spec 时间 | 从最简方案开始：一个 spec.md + 已用 Agent 即够；不为本流程而本流程 |

## 8. 何时 bypass 流程（防规格官僚化的操作判据）

不是所有变更都需完整 Spec 流程。判断标准：

- **需 Spec**：变更**可能影响其他模块行为**（接口契约变、数据模型变、跨模块副作用）。
- **可 bypass**：**纯局部修改**（改文案、调样式、内部重构无外部行为变化）→ 直接改 +
  commit，事后若引发问题再补 Spec。

CSP 对应：bypass 走 05 的「快路径」（单 commit，不建 SPEC-F），但必须在 commit message
标注 `local-only` 并由 06 审查确认无跨模块影响。一旦审查发现副作用 → 回退补 Spec。

## 9. L1/L2/L3 成熟度光谱

SDD 沿三级光谱演进，CSP 按团队成熟度渐进采用：

| 级 | 名称 | 特征 | CSP 现状 | 下一步 |
|----|------|------|----------|--------|
| **L1** | Spec-First | 编码前写 Spec，但 Spec 可能漂移 | 默认基线（01→03→05→06） | 补防漂移机制（→L2） |
| **L2** | Spec-Anchored | Spec 与代码持续同步，**测试强制执行一致性** | TMS 已从 Spec AC 种测试（Stage 5/9） | 加 CI merge gate：AC→生成的测试必须过，否则拒绝合并 |
| **L3** | Spec-as-Source | 人只编辑 Spec，代码完全由 AI 生成维护 | 06 Fix Loop 近似雏形（delta→dev-lead→re-verify） | 打顺 BUG→delta Spec→自动修复 PR 循环 |

### 9.1 L2 防漂移门（Spec-Anchored）

核心思路：用自动化测试锚定 Spec 与代码一致性——「Spec 测试」防 Spec 漂移，如同
类型系统防类型错误。

```
Spec 的 Acceptance Criteria  →  自动生成测试用例  →  CI merge gate
                                                       │
代码变了但测试（=Spec 的自动化映射）没跟上 → CI 拒绝合并
```

CSP 落地：TMS 追溯矩阵（每条 PRD AC 至少 1 测试用例）已是 L2 基础；强化点是把
「AC→测试映射」纳入 06 质量门控的硬 gate——未映射的 AC 视为功能缺口（TMS 规范
已要求），进一步把「测试通过」升级为「对应 AC 的测试存在且通过」。

### 9.2 L3 雏形（Spec-as-Source）

```
发现 BUG → 写增量 Spec（delta）→ AI 自动修复代码并提 PR → 人 Review 合并
```

CSP 的 06 Fix Loop 已是此循环：release-manager 报 S6/S7 未过 → 按根因 spawn
dev-lead（实现缺陷）或 tech-designer（Spec 缺口）修 delta → re-verify。L3 愿景
是把这个循环打顺到「秒级」并覆盖全面。

## 10. Vibe Coding vs SDD：混合策略

Vibe Coding（Karpathy 2025.2）：不读代码、不理解、自然语言描述 + 报错扔给 AI。
快但不可持续——「三个月墙」：兴奋期（1-3 月高产出）→ 平台期（4-9 月停滞）→
衰退期（10-15 月崩溃重写）。根因：零上下文编程，项目膨胀后 AI 上下文窗口装不下
全貌，基于局部信息决策而与其他模块冲突。

**SDD 的解法**：Spec 是代码的压缩表示——10 万行代码的项目，Spec 体系可能仅几千
行，AI 可读完理解全局约束再动手。

**务实混合策略**（非非此即彼）：
1. **探索阶段用 Vibe**——快速试错，验证可行性。
2. **一旦决定要做，立刻补 Spec**——把探索发现固化为规格。
3. **正式开发严格 SDD**——所有变更先改 Spec 再改代码。

CSP 落地：探索期可走 05 快路径（不建 SPEC）；一旦进入 roadmap/01 正式流程，强制
SDD。判断「何时从 Vibe 切 SDD」：项目预期生命周期 > 一次性脚本 + 变更可能影响
多模块 → 切 SDD。

## 11. 速查：本流程的红线与自检

- [ ] Spec 可测试（成功标准有硬指标，非「应该很快」）
- [ ] Non-Goals 明确（告诉 AI「这些不做」）
- [ ] Constraints 是外部限制，非实现方案（粒度 litmus test 过）
- [ ] Spec↔Plan 精炼循环跑到收敛判据（典型 3-5 轮）
- [ ] 增量变更走 delta（ADDED/MODIFIED/REMOVED），ship 时 fold 回 canonical
- [ ] 微小局部修改可 bypass，但标注 `local-only` + 06 确认无跨模块影响
- [ ] 有 Spec 不等于免 Review——06 Validate 仍是安全网
- [ ] 工具从简：一个 spec.md + 已用 Agent 即够，不为本流程而本流程
- [ ] **默认不估时**：排期/并行由依赖 DAG + Wave + 关键路径决定，不靠工时；
      `csp-effort-estimation` 仅按需调用，不进默认输出（见下）

## 12. 默认不估时（AI 编程下的工时原则）

> **人天/工时估算在 AI 编程下不可靠，CSP 默认不产估时。**

**为什么**：AI 写代码是机器速度，工时方差极大（同一任务，AI 顺时几分钟、卡住时数
小时），且随模型/上下文/技术栈剧烈漂移——估算比代码腐烂得更快。「5人7天」案例本身
就说明传统工时估算在 AI 开发下失效。强行估时给的是**虚假信心**（SDD 五大陷阱之一）。

**怎么排期不靠工时**：
- **依赖 DAG + Wave** 决定顺序与并行——这是可计算、不腐烂的结构。
- **关键路径** = DAG 上零 slack 的串行链，决定最短可交付序列（不附工时）。
- **里程碑按 Wave 序号定**（M1=Wave1 出口…），不绑日历。
- **粒度判据是原子性**（一任务一提交、文件可数、单一职责），不是「≤4h」。

**`csp-effort-estimation` 的定位**：降为**按需可选** skill——团队确有外部工时/资源/预算
需求时显式调用，不在 task-breakdown / plan-phase 的默认流里，不进 completion_signal 的
`recommended`，不进 `ready_for`。涉及估时的产物（`EFFORT-ESTIMATION.md`）标可选输入。

**涉及文件**：`csp-tech-task-breakdown`（去 estimate 字段/小时表/总工时）、`csp-plan-phase`
（去估时列/Day-W 周计划/燃尽图工时/total_hours/estimated_weeks）、`csp-lifecycle-orchestrator`
S4 计划模板（去估时列、里程碑按 Wave 不绑日历）。
