---
name: csp-spec-contract
description: Transform ideas, requirements, or discussions into CSP SPEC contracts with traceable requirements and acceptance criteria. Use when formalizing requirements, generating CSPEC inputs, or validating spec completeness. Triggers on "spec", "specification", "contract", "formalize requirements".
layer: 1
category: meta
phase: define
domain: quality
scope: design
tools: [Read, Write, Edit, Glob, Grep]
related_skills: [csp-product-discovery-orchestrator]
---

| Criterion | Rule |
|-----------|------|
| Completeness | All sections present; boundaries non-empty |
| Testability | Every FR has ≥1 AC; no "should/might/could" in requirements |
| Consistency | No contradictions between FR and boundaries |
| Traceability | Each requirement maps to a source |
| Feasibility | Constraints achievable with stated stack |

## Templates

`csp-workflow/templates/change-artifacts/`: `proposal.md`, `spec.md`, `design.md`, `tasks.md`,
`constitution.md`（项目级宪法，00 初始化，所有 spec 继承）

## Good Spec 六要素 → CSP 落点

写绿地 spec 前对照下表，任一要素缺失即 spec 不完整（坏 Spec 的四个致命问题：模糊、
遗漏边界、缺理由、混入 HOW）。**核心判据：好 Spec 是可测试的，坏 Spec 是可解释的。**

| 要素 | 作用 | CSP 落点 | 自检 |
|------|------|----------|------|
| Problem Statement | 为什么做 | proposal `## Why` | 有量化现状（「平均 3 分钟」），非「需要快速」 |
| Success Metrics | 做到什么程度算完 | spec NFR / proposal 目标 | 硬指标可测（「P95 < 200ms」），非「应该很快」 |
| User Stories | 谁在什么场景用 | spec requirements | 有角色+场景，非「所有用户」泛化 |
| Acceptance Criteria | 怎么验证 | spec `#### Scenario`（Given/When/Then） | 可证伪，每 FR ≥1 AC |
| Non-Goals | 什么不做 | design `## Non-Goals` + spec boundaries | 显式列出，沉默 ≠ out-of-scope |
| Constraints | 技术约束（外部限制，非方案） | spec NFR / design context | 是「必须用现有 PG 实例」而非「用 Redis ZSET」 |

> 深层参考：`csp-workflow/references/spec-driven-playbook.md` §4-§5

## Constitution 继承（防重复声明）

spec 的 Constraints 只写「本 Feature 的外部限制」，**不重复** `.csp/CONSTITUTION.md`
已声明的基线（参数化查询、单测覆盖率 ≥80%、结构化日志等）——那些是 AI 的「潜意识」。
若 design 需偏离宪法，必须在 `## Decisions` 显式记录「宪法例外 + 理由 + 豁免范围」，
无记录即违规。宪法不存在时提示先在 00 知识中枢初始化。

## 粒度检验门（Litmus Test）

falsification pass 之外，对每条需求追加一道粒度检验——**防 HOW 入侵 WHAT
（过度规格化）**：

> 用不同技术栈实现这条需求，Spec 是否仍然有效？
> - ✗ 「使用 Redis ZSET 存储排行榜」→ 只对 Redis 有效 → HOW 混入 WHAT，重写。
> - ✓ 「排行榜实时更新延迟 ≤1s，支持 Top-100」→ 任何存储都成立 → 正确粒度。

注意：Constraints 可含技术约束，但那是「外部限制」（「必须用现有 PostgreSQL」），
不是「实现方案」（「用 Redis ZSET」）。区分二者是本门核心。详见 playbook §5。

## Integration

- **Router triggers:** `spec`, `specification`, `contract`, `formalize`
- **Downstream:** `/csp-spec-phase` → `/csp-discuss-phase` → `/csp-plan-phase`
- **Review:** `csp-party-mode`, `csp-review-adversarial`, `csp-review-edge-case`
- **Inherits:** `.csp/CONSTITUTION.md`（项目宪法基线，不重复声明）
- **Deep reference:** `csp-workflow/references/spec-driven-playbook.md`（四阶段模型、
  Spec↔Plan 精炼循环、五大陷阱、L1/L2/L3 光谱）

## Red Flags

- Specs without explicit boundaries
- Acceptance criteria requiring human judgment ("nice UX")
- Copying input verbatim without falsification pass
- SPEC files outside `.csp/planning/` with no phase linkage

## 五大陷阱诊断（Spec 编写侧）

spec 出现下列症状时按对应缓解处理，详见 playbook §7：

| 陷阱 | 症状信号（编写侧） | 缓解动作 |
|------|---------------------|----------|
| 过度规格化 | spec 比预期代码还长、每细节规定死、出现具体实现技术 | 跑粒度 litmus test；HOW 入侵 WHAT 即重写为 WHAT |
| 规格腐烂 | 代码已迭代多版但 spec 仍 V1、delta 未 fold 回 canonical | 增量走 delta（ADDED/MODIFIED/REMOVED），ship 时 fold |
| 规格官僚化 | 纯局部修改（文案/样式）也被迫走全 spec 流程 | 标 `local-only` 走 05 快路径，06 确认无跨模块影响 |
| 虚假信心 | 因 spec 详尽就跳过 AC 证伪或 Review | spec 不替代 Code Review；06 Validate 仍是安全网 |
| 工具复杂性 | 为 spec 引入超出需求的工具链 | 从简：spec.md + 已用 Agent 即够 |

## Process

1. **Extract requirements:** Parse the input (idea, discussion, doc) into discrete functional requirements (FRs). Each FR must be a single, testable statement — no compound "and/or" requirements.
2. **Define boundaries:** For each FR, state explicitly what is in scope and what is out of scope. Boundaries prevent scope creep and rationalization ("we'll handle that later").
3. **Write acceptance criteria:** Attach 1+ falsifiable AC to each FR. Use Given/When/Then or assertion format. If you can't write a test for it, the requirement is too vague — refine it.
4. **Map traceability:** Link each FR back to its source (stakeholder quote, ticket, design decision). Untraceable requirements are assumptions — flag them.
5. **Run falsification pass:** Re-read every requirement and ask: "Could a reasonable person argue this is NOT satisfied?" If yes, tighten the wording. Eliminate "should", "might", "could", "approximately".

## Template

```markdown
# Spec Contract: [Feature Name]

## Context
- **Source:** [link or reference to originating discussion/ticket]
- **Stakeholders:** [who cares about this]
- **Date:** [YYYY-MM-DD]

## Functional Requirements

### FR-1: [Short name]
- **Description:** [Single testable statement]
- **Source:** [traceability link]
- **Acceptance Criteria:**
  - [ ] Given X, when Y, then Z
  - [ ] [Additional AC]
- **Boundaries:**
  - In scope: [what this covers]
  - Out of scope: [what this explicitly does NOT cover]

## Non-Functional Constraints
- **Stack:** [technology constraints]
- **Performance:** [measurable targets, e.g. p99 < 200ms]

## Open Questions
- [ ] [Unresolved items that block finalization]
```

## Verification

Before handing off the spec, run this checklist:

- [ ] Every FR has at least one acceptance criterion
- [ ] No FR contains "should", "might", "could", or "approximately"
- [ ] Boundaries section is non-empty for every FR
- [ ] Every FR maps to a traceable source
- [ ] No contradictions between FRs and boundary statements
- [ ] Open questions are listed and assigned, not silently ignored
- [ ] 粒度 litmus test：换技术栈实现，每条需求仍成立（无 HOW 入侵 WHAT）
- [ ] 六要素齐备：Problem / Success Metrics / User Stories / AC / Non-Goals / Constraints
- [ ] Constraints 未重复 `.csp/CONSTITUTION.md` 基线（或显式记录宪法例外）
