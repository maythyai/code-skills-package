---
name: csp-spec-driven-development
description: CSP-native spec-driven methodology integrated with CSP phase workflows. Use when formalizing requirements before implementation, managing brownfield requirement deltas, or verifying artifact-to-code alignment. Triggers on "spec-driven", "规范驱动", "write spec before code", "delta requirements".
layer: 1
category: meta
phase: build
domain: patterns
scope: implementation
tools: [Read, Write, Edit, Bash, Glob, Grep]
---

| Phase | Command | Artifact |
|-------|---------|----------|
| Clarify what to build | `/csp-spec-phase` | `{phase}-CSPEC.md` |
| Discuss how to build | `/csp-discuss-phase` | Discussion notes → PLAN inputs |
| Plan implementation | `/csp-plan-phase` | `{phase}-PLAN.md` + tasks |
| Execute tasks | `/csp-execute-phase` | Code + `{plan}-SUMMARY.md` |
| Verify alignment | `/csp-verify-phase` | `VERIFICATION.md` |
| Ship / archive | `/csp-ship` | PR + milestone archive |

**Quick change path** (single feature, no full milestone):

```
/csp-planning-phase  →  proposal + requirements in .csp/planning/
/csp-solutioning-phase  →  design + task breakdown
/csp-implementation-phase  →  implement with checkbox tracking
/csp-verify-phase  →  three-dimension check
/csp-ship
```

Templates: `csp-workflow/templates/change-artifacts/`

## Artifact Dependency Graph

Create artifacts in dependency order:

```
Constitution (项目宪法，00 初始化，跨 spec 继承的基线)
    ↓ inherits
Proposal (why + scope)
    ↓
Requirements / CSPEC (what — falsifiable)
    ↓ ⇄⇄ 精炼循环（3-5 轮，见下）
Design (how — decisions + trade-offs) ←──┐
    ↓                                   │ 对照 Plan 审 Spec
Tasks (ordered checkboxes)               │ 暴露盲点 → 改 Spec → 重 Plan
    ↓                                   │
Implementation                          │
    ↓                                   │
Verification (evidence-backed) ──────────┘
```

**Rule:** Never skip a layer for non-trivial work. If design is trivial, write a one-paragraph design stub — don't omit the file.

## Spec↔Plan 精炼循环（3-5 轮）

> Spec 是活的，不是一次性写死。第一版 Spec 通常问题百出；让 AI 基于 v1 Spec
> 生成 Plan，再回头审视 Spec，能暴露大量盲点。

```
Spec v1 → 生成 Plan → 对照 Plan 审 Spec（盲点暴露）→ 改 Spec → 重生成 Plan
        ↑                                                              │
        └──────────── 直到收敛 ←──────────────────────────────────────────┘
```

**收敛判据（任一满足即可出 Spec，典型 3-5 轮）**：
1. 一轮 Spec→Plan 后，Spec 无新增 Non-Goal、无补 AC、无收紧措辞 → 盲点已清。
2. Plan 对 Spec 每条 AC 都能映射到具体任务，无「Plan 出现 Spec 未定义的行为」。
3. 粒度 litmus test + falsification pass 双通过（见 `csp-spec-contract`）。

把「开发到一半发现需求有问题」的代价前移到成本最低的阶段：改一行 Spec 远低于
改一百行代码。CSP 落地：03 全栈 Spec（Specify）与 03 技术方案（Plan）同在
tech-designer 阶段，天然内嵌此循环；Stage 4 方案评审是循环外的独立第三方 gate，
不等同于精炼循环（循环在作者侧自迭代，评审是独立复核）——两者叠加。

## Constitution（项目宪法）接入

`.csp/CONSTITUTION.md` 定义全员适用、长期不变的不可违背约束（API 规范、安全基线、
代码质量、基础设施），在 00 知识中枢初始化。所有 spec 继承宪法基线——
- spec Constraints 只写本 Feature 的外部限制，不重复宪法基线（如「参数化查询」）。
- design 若偏离宪法，必须在 `## Decisions` 显式记录「宪法例外 + 理由 + 豁免范围」。
- 模板：`csp-workflow/templates/change-artifacts/constitution.md`。

## L1/L2/L3 成熟度光谱

CSP 按团队成熟度渐进采用，避免一步到位的工具负担：

| 级 | 名称 | 特征 | CSP 现状 | 下一步 |
|----|------|------|----------|--------|
| L1 | Spec-First | 编码前写 Spec，但 Spec 可能漂移 | 默认基线 | 补防漂移机制 |
| L2 | Spec-Anchored | Spec 与代码持续同步，测试强制一致性 | TMS 已从 AC 种测试 | AC→测试纳入 06 硬 gate |
| L3 | Spec-as-Source | 人只编辑 Spec，代码全由 AI 生成维护 | 06 Fix Loop 近雏形 | 打顺 BUG→delta→自动修复循环 |

### L2 防漂移门（Spec-Anchored）

用自动化测试锚定 Spec 与代码一致性——「Spec 测试」防 Spec 漂移，如同类型系统防
类型错误。CSP 的 TMS 追溯矩阵（每条 PRD AC ≥1 测试用例）已是 L2 基础；强化点：
把「对应 AC 的测试存在且通过」纳入 06 质量门控硬 gate，未映射的 AC = 功能缺口。

## Vibe Coding vs SDD：混合决策

不是所有工作都需完整 Spec 流程。判断「何时切 SDD」：

- **可 bypass（Vibe / 快路径）**：纯局部修改（改文案、调样式、内部重构无外部行为
  变化）、一次性脚本、探索期原型 → 直接改 + commit，标注 `local-only`，06 确认
  无跨模块影响；一旦引发副作用回退补 Spec。
- **需 SDD**：变更可能影响其他模块行为（接口契约变、数据模型变、跨模块副作用）、
  项目预期生命周期 > 一次性脚本 → 先改 Spec 再改代码。

> 「三个月墙」警示：Vibe Coding 在项目膨胀后（几万行/几十模块/几百接口）必撞墙
> ——AI 上下文装不下全貌，基于局部决策而与其他模块冲突。Spec 是代码的压缩表示，
> AI 读完 Spec 体系即理解全局约束。详见 playbook §10。

## Deep Reference

`csp-workflow/references/spec-driven-playbook.md` — 四阶段模型、三文件+宪法体系、
好 Spec 六要素、粒度检验标准、Spec↔Plan 精炼循环、五大陷阱与缓解、L1/L2/L3 光谱、
Vibe-vs-SDD 混合策略的完整蒸馏。遇判断题（粒度、循环何时停、漂移怎么防、何时
bypass）回到此参考。

## Delta Requirements (Brownfield)

When modifying existing behavior, use **delta sections** in spec files:

```markdown
## ADDED Requirements
### Requirement: User can export data
...

## MODIFIED Requirements
### Requirement: Login session timeout
(full updated requirement block — copy entire original, then edit)

## REMOVED Requirements
### Requirement: Legacy export endpoint
**Reason:** Replaced by v2 API
**Migration:** Use POST /api/v2/export
```

**Merge discipline:**

1. Locate canonical requirement in `.csp/planning/specs/` or phase CSPEC
2. For MODIFIED: paste **full** requirement block before editing
3. After phase ships, fold deltas into canonical spec during milestone archive

## Three-Dimension Verification

Use alongside goal-backward verification in `/csp-verify-phase`:

| Dimension | Question | Evidence |
|-----------|----------|----------|
| **Completeness** | Every requirement and task addressed? | Checkbox audit, requirement trace matrix |
| **Correctness** | Implementation matches spec intent? | Code search, test results, scenario walkthrough |
| **Coherence** | Design decisions reflected consistently? | Pattern scan, no contradictory approaches |

Severity: **CRITICAL** (blocks ship) / **WARNING** (document) / **SUGGESTION** (optional).

See `csp-workflow/references/artifact-verification.md`.

## Integration

| Skill | Role |
|-------|------|
| `csp-spec-contract` | Generate formal SPEC documents from raw input |
| `csp-source-driven-development` | Ground implementation in official docs after spec is locked |
| `csp-interview-me` | Extract intent when requirements are underspecified |
| `csp-brainstorming` | Explore options before locking CSPEC |
| `csp-party-mode` | Multi-agent review of specs before planning |

## Red Flags

- Writing code before any written requirement exists
- MODIFIED requirements with partial content
- Subjective acceptance criteria
- Spec artifacts disconnected from `.csp/planning/` phase files
- **过度规格化**：Spec 出现具体实现技术（Redis ZSET）而非 WHAT（延迟 ≤1s）
- **规格腐烂**：delta 未 fold 回 canonical，代码迭代多版但 Spec 停 V1
- **规格官僚化**：纯局部修改也走全流程（应标 `local-only` 走快路径）
- **虚假信心**：因 Spec 详尽就跳过 06 Validate（Spec 不替代 Code Review）
- **工具复杂性**：为 SDD 堆砌超出需求的工具链（一个 spec.md + 已用 Agent 即够）
- Spec 重复声明 `.csp/CONSTITUTION.md` 已覆盖的基线约束

## Verification Checklist

- [ ] Requirements are falsifiable (pass/fail acceptance criteria)
- [ ] Boundaries explicit: in-scope vs out-of-scope lists
- [ ] Tasks use `- [ ]` checkbox format
- [ ] Three-dimension verification run with evidence cited
- [ ] Delta specs merged into canonical location if brownfield change
- [ ] Spec↔Plan 精炼循环跑到收敛判据（典型 3-5 轮，无新增盲点）
- [ ] 粒度 litmus test 过（换技术栈实现，Spec 仍有效）
- [ ] Constraints 未重复宪法基线（或显式记录宪法例外）
- [ ] 六要素齐备（Problem / Success Metrics / User Stories / AC / Non-Goals / Constraints）
- [ ] 微小局部修改走 bypass 标 `local-only`，未误走全流程
