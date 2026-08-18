---
name: csp-test-methodology
description: >
  Choose and combine testing methods so no requirement falls through the cracks. Use when
  planning test strategy for a feature, when single-layer tests pass but the feature breaks
  end-to-end, when deciding smoke vs sanity vs E2E vs integration vs contract vs property vs
  fuzz vs mutation vs exploratory vs chaos vs load vs a11y vs security testing, when mapping
  requirements to test methods to find untested functionality, or when preventing fragmented
  ("割裂") testing that validates one function in isolation and misses linked effects. Provides
  the full testing-method taxonomy, a blind-spot complementarity matrix, and requirement
  traceability gap analysis. The methodology layer above csp-cross-layer-testing.
version: 0.1.0
layer: 1
category: meta
phase: define
domain: testing
scope: design
role: architect
triggers:
  - "测试策略"
  - "测试方法选择"
  - "测试方法论"
  - "联想测试"
  - "割裂测试"
  - "盲点互补"
  - "smoke vs sanity"
  - "测试组合拳"
  - "覆盖矩阵"
  - "未测功能"
  - "测试金字塔"
  - "mutation testing"
  - "property based"
  - "metamorphic testing"
related_skills: [csp-cross-layer-testing, csp-tdd, csp-e2e-testing, csp-api-tester, csp-test-engineer, csp-webapp-testing, csp-brainstorming, csp-verification]
anti_rationalizations:
  "单测过了功能就没问题": "单测只证明纯逻辑对；集成断链、跨层不一致、UI 退化它全看不见——必须按盲点互补再叠一层"
  "E2E 覆盖了关键路径就够了": "E2E 慢且少，过不了边界数据/并发/错误路径；它有盲点，需 property/fuzz/negative 补位"
  "我测了下单这个功能点": "测一个功能点≠测了联动效果——割裂测试正是漏 bug 的主因；见 [[csp-cross-layer-testing]]"
  "测试方法越多越好全上": "联想不是堆砌；按需求风险选最小互补集，广而快的在前，慢而深的在后"
---

# Test Methodology — 测试方法谱系与联想覆盖

> **联想测试**的本意：每种测试方法都有盲点，单测发现不了集成断链、E2E 发现不了边界数据、
> smoke 发现不了深层逻辑——按"盲点互补"把方法组合起来，让并集覆盖任何单一方法看不见的缺陷；
> 再用需求可追溯把每条需求绑到至少一种方法，未映射的需求 = 潜在功能缺失。

## 1. 反割裂：为什么单一方法不够

割裂测试的典型失败：每个功能点单测都绿，但联动时崩——下单单测绿、库存单测绿、付款单测绿，
组合起来"扣库存却没回滚订单"。**只测功能点而不测联动效果**，是漏 bug 的主因。

| 你以为 | 实际盲点 | 该叠什么方法 |
|--------|----------|--------------|
| 单测过了=功能对 | 集成断链、跨层不一致 | 集成 + 跨层联动 |
| E2E 过了关键路径 | 边界数据、并发、错误路径 | property / fuzz / negative |
| smoke 绿=能上线 | 只验"活着"，不验正确性 | sanity + 关键集成 |
| API 契约测了=前后端兼容 | 运行期数据一致性 | 跨层联动(DB 断言) |

## 2. 测试方法完整谱系

### 2.1 按粒度（金字塔/钻石）

| 方法 | 范围 | 速度 | 抓什么 bug | 盲点 |
|------|------|------|-----------|------|
| **Unit** | 纯函数/模块 | 极快 | 逻辑错误、边界 | 集成、IO、跨层 |
| **Component/Integration** | 模块间、API+DB | 快 | 接口契约、组件交互 | 真 UI、跨部署 |
| **Contract (CDC)** | 服务间契约 | 快 | 版本兼容、字段漂移 | 运行期数据状态 |
| **Cross-layer/round-trip** | UI→API→DB→UI 因果 | 快-中 | 数据不一致、副作用、走过场 | 跨部署、并发 |
| **E2E** | 全部署栈真实旅程 | 慢 | 真实用户流、路由、环境 | 边界、并发、深层 |
| **Smoke** | 广度：能跑+关键路径 | 极快 | 构建是否活着、是否基本可用 | 正确性、深度 |
| **Sanity** | 窄：一个断言 | 极快 | 上线后该改的改没改 | 覆盖面 |

> smoke vs sanity 的区别：smoke 验"系统活着且关键路径能走"，广而不深；sanity 验"我刚改的这一个东西对不对"，窄而准。部署后两件事都要做。

### 2.2 按意图（挖 bug 能力）

| 方法 | 抓什么 bug | 盲点 |
|------|-----------|------|
| **Regression** | 防止回归已修缺陷 | 只覆盖已知回归点 |
| **Property-based** | 生成输入证不变量，挖边界/等价类 | 需可表达的不变量；UI 退化弱 |
| **Mutation** | 注入变异测"测试本身"质量 | 不直接测产品，测测试 |
| **Fuzz** | 随机/畸形输入致崩/安全 | 不证正确，只找崩溃 |
| **Exploratory** | 人按 charter 探索，挖剧本外 | 不可重复、不可规模化 |
| **Negative** | 错误路径、非法输入 | 不验 happy path 深度 |
| **Boundary/Equivalence** | 边界值、等价类划分 | 设计技术，非执行类型 |
| **Decision-table/State-transition/Pairwise** | 组合覆盖、状态机 | 多状态系统才适用 |
| **Metamorphic** | 无预言时验输出关系 | 需找到 metamorphic 关系 |
| **Snapshot/Golden-master** | 稳定输出回归 | 基线漂移需人审 |

### 2.3 按质量维度（非功能）

| 维度 | 方法 | 抓什么 |
|------|------|--------|
| 性能 | load/stress/spike/soak/endurance | 延迟、吞吐、内存泄漏、耐久 |
| 韧性 | chaos/fault-injection | 故障下行为、降级、恢复 |
| 视觉 | visual-regression | 像素/结构退化 |
| 无障碍 | a11y | 屏读、对比度、键盘 |
| 安全 | SAST/DAST/pentest/OWASP | 注入、越权、泄密 |
| 合规 | conformance/compliance | 标符合规 |
| 国际化 | i18n/l10n | 文案长度、布局、复数 |
| 可观测 | telemetry/observability | 是否能诊断生产问题 |

### 2.4 按生命周期/位置

| 方法 | 何时 | 抓什么 |
|------|------|--------|
| Pre-merge CI gate | 合并前 | 阻断回归，快反馈 |
| Nightly/full | 夜间 | 全量慢套件 |
| Canary/dark-launch/feature-flag | 生产小流量 | 真实流量下的回归 |
| A/B | 灰度对比 | 行为/指标差异 |

## 3. 联想覆盖矩阵：盲点互补

按"盲点"配对，每个盲点给出补位方法。这是"联想"的运作方式——**不是堆砌，是补位**。

| 盲点 | 补位方法 | 组合示例 |
|------|----------|----------|
| 单测看不见集成断链 | 跨层联动([[csp-cross-layer-testing]]) | 单测 + 跨层联动 |
| E2E 看不见边界数据 | property-based + boundary | E2E + property |
| happy path 看不见错误路径 | negative + fuzz | 集成 + fuzz |
| 自动化看不见剧本外 | exploratory | 全自动套件 + 人探索 |
| 绿测试可能没覆盖需求 | 需求可追溯缺口分析(§4) | 追溯矩阵 + 缺口清单 |
| 通过≠没副作用 | 无副作用断言([[csp-db-state-assertion]]) | 跨层联动含 no_side_effects |
| 测过≠测对 | mutation testing | 给关键模块跑 mutation |

## 4. 需求可追溯缺口分析（找未测功能）

**这是发掘"潜在功能缺失"的核心手法**：把每条需求/验收标准映射到至少一种测试方法，
没有映射的需求 = 没被任何测试覆盖的功能 = 潜在缺失。

```
requirement ──maps──▶ [test method(s)]
   R1 下单扣库存       → unit(扣减逻辑) + cross-layer(下单→DB stock delta)
   R2 余额不足拦截      → unit(校验) + negative(负数余额)
   R3 并发下单不超卖    → property(并发不变量) + integration(锁)
   R4 支付失败回滚订单  → cross-layer(回滚→DB 一致)  ← 若缺这条联动测试，R4 是"未测功能"
```

缺口即风险清单：

```markdown
## 未覆盖需求缺口
- R4 支付失败回滚：无任何测试覆盖 → 高风险，补一条跨层联动用例
- R7 国际化复数：仅手动验过 → 中风险，补 i18n 自动化
- R9 故障降级：无 chaos 测试 → 中风险，补 fault-injection
```

## 5. 组合拳（按功能原型推荐最小互补集）

不是每个功能都上全套；按风险选最小互补集，广而快的在前，慢而深的在后。

| 功能原型 | 风险 | 推荐组合拳 |
|----------|------|-----------|
| 纯计算工具 | 低 | unit + property |
| CRUD 写路径 | 高 | unit + 跨层联动(UI→API→DB→UI) + negative |
| 跨服务集成 | 高 | contract(CDC) + 跨层联动 + exploratory |
| 高并发/资金 | 极高 | unit + property(并发不变量) + 跨层联动 + chaos + canary |
| UI/设计系统 | 中 | 组件测 + visual-regression + a11y |
| 安全敏感 | 极高 | unit + security(DAST) + fuzz + negative + 跨层联动 |
| 数据迁移 | 高 | unit + 差分测试(differential) + 跨层联动 |

## 6. 测试钻石（不只是金字塔）

经典金字塔把 E2E 压到 5-10%，但**写路径功能**需要在"集成层"加厚——这正是跨层联动的位置。
把金字塔中间加宽成"钻石"：

```
        / E2E \           少而关键
       /--------\
      / 跨层联动 \          写路径每个一例(钻石中间)
     /------------\
    / Integration  \       API 契约 + 组件
   /----------------\
  /    Unit + Property \   广覆盖、快反馈
 /----------------------\
        / Smoke \          广度门禁
```

## 7. 反割裂铁律

1. **测了功能点 ≠ 测了联动效果**——写路径必须有跨层联动一例，证明四层自洽。
2. **绿测试 ≠ 覆盖了需求**——用追溯矩阵找缺口，未映射需求即风险。
3. **每种方法都有盲点**——按盲点互补选组合，而非按"方法多"选。
4. **广而快在前，慢而深在后**——smoke/property/contract 先行阻断，E2E/exploratory 收尾。
5. **通过 ≠ 无副作用**——跨层联动带 no_side_effects 断言。
6. **测过 ≠ 测对**——关键模块跑 mutation 验测试质量。

## 8. 与新联动 skill 的关系

本技能是方法论层(选方法、找缺口)；落地执行交给下层：

- 选了"跨层联动"这个方法 → 用 `csp-cross-layer-testing` 设计契约
- 要跑 DB 断言 → 用 `csp-db-state-assertion`
- 要一条命令出联动裁决 → 用 `csp-linked-test-runner`
- 选了 E2E → 用 `csp-e2e-testing`；API → `csp-api-tester`；UI 退化 → `csp-visual-regression`

## 9. 与开发流程结合

| CSP 阶段 | 本技能补什么 |
|----------|--------------|
| brainstorming/spec | 列需求→方法的追溯矩阵，先找缺口 |
| TDD (csp-tdd) | 按组合拳先写可执行规约(含跨层契约) |
| build | 让请求/落库带 trace_id 以支持跨层对齐 |
| verify (csp-verification) | 跑组合拳出多方法裁决 |
| ship | smoke/sanity 门禁 + canary 灰度 |

## 10. 反模式

- **只上 E2E**——慢、少、有盲点；用 property/fuzz/negative 补。
- **只上单测**——看不见集成与跨层；写路径补跨层联动。
- **堆砌方法不讲互补**——联想是补位，不是越多越好。
- **不做需求追溯**——绿测试掩盖未测需求，功能缺失难发现。
- **smoke 当正确性测试**——smoke 只验"活着"，正确性要 sanity/集成。
- **exploratory 不可重复就放弃**——它的价值正是发现剧本外的缺陷。

## 11. 参考文档索引

| 文档 | 内容 |
|------|------|
| `csp-cross-layer-testing` | 跨层联动用例契约、证据矩阵、金字塔定位 |
| `csp-tdd` | 先写测试的可执行规约 |
| `csp-e2e-testing` | E2E 套件建设、flaky 治理 |
| `csp-api-tester` | API 功能/性能/安全/契约 |
| `csp-test-engineer` | 用例设计、覆盖率分析 |
| `csp-brainstorming` | 需求拆解 |
| `csp-verification` | 验收门禁 |
