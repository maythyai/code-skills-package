# CSP 全链路管道总览

> 本文档是 CSP 四份 pipeline 说明书的**元地图**——描述外环（战略规划）、内环（版本交付）、测试管道和治理规则如何协作形成持续迭代闭环。读完本文档后，按任务类型选择对应的 `prompts/000-*_csp.md` 执行。

**四份说明书**：
- `prompts/000-product-planning_csp.md` — 外环：调研→战略→路线图→PRD SPEC
- `prompts/000-develop_pipeline_csp.md` — 内环：01 PRD→...→06 发布→07 复盘
- `prompts/000-test_pipeline_csp.md` — 测试：TB→TD→TU→TI→TE→TA→TQ（贯穿 01-07）
- `prompts/000-project-governance_csp.md` — 治理：目录/产物/版本/文档生命周期

---

## 全管道总览

```
┌─────────────────────────────────────────────────────────────┐
│                      外环（低频，战略驱动）                    │
│                                                              │
│  Phase R      Phase 0       Phase 1-2      Phase 2.5   Phase 5│
│  调研 ────→ 战略锚点 ────→ 版本序列 ────→ 集成审视 ────→ PRD SPECs│
│  (五面调研)  (STRATEGY.md) (ROADMAP.md)  (过滤/剔除)   (每版本一份)│
│                                                │               │
└────────────────────────────────────────────────┼───────────────┘
                                                 │
                                ★ 收敛闸门 ★     │
                          csp-product-design-convergence       │
                                                 │
┌────────────────────────────────────────────────┼───────────────┐
│                      内环（每版本迭代，高频）   │               │
│                                                ▼               │
│  00 知识中枢 → 01 PRD → 02 拆解 → 03 方案 → 04 任务 → 05 开发  │
│      │            │          │         │          │            │
│      │       TB:测试依据  TD:设计  TU/TI/TE:实施              │
│      │                                                         │
│      └──→ 06 门控·发布 → 07 复盘                                │
│               │              │                                  │
│          S6:质量门控    findings回流                             │
│          S7:审查        → 外环 ROADMAP 更新                     │
│          S8:发布交付    → 下一轮 01                              │
└──────────────────────────────────────────────────────────────────┘
```

## 外环→内环衔接

| 步骤 | 产出 | 消费者 |
|------|------|--------|
| Planning Phase 0-2 | STRATEGY.md + ROADMAP.md | 外环自身 |
| Planning Phase 2.5 | 净版版本序列（剔除/降级/合并后） | 收敛闸门 |
| Planning Phase 5 | 规划级 PRD SPEC（prd_depth: planning） | Development 01（升级为 engineering） |
| 收敛闸门 | CONVERGED-FEATURE-PLAN.md | Development 01（功能清单唯一事实源） |
| Development 01 | 工程级 PRD（prd_depth: engineering） | Development 02 + Test TB |
| Development 03 | 全栈 Spec + 可测试性点 | Development 04 + Test TD |
| Development 05 | 代码 + 测试代码 | Development 06 |
| Development 06 | 测试证据 + 门控结果 | Development 07 |
| Development 07 | REVIEW-FINDINGS | 外环 ROADMAP（回流）→ 下一轮 Planning |

## 测试管道横切

测试不是独立阶段——TB 在 01 PRD 后、TD 在 03 Spec 后、TU/TI/TE 在 05 开发中、TV/TQ 在 06/07：

| 测试阶段 | 时机 | 输入 | 产出 |
|---------|------|------|------|
| TB 测试依据 | 01 PRD 后 | 工程级 PRD AC | test-basis-{version}.md |
| TD 用例设计 | 03 Spec 后 | Spec 可测试性点 | test-cases + traceability |
| TU 单元测试 | 05 开发中 | Spec + 代码 | tests/unit/（覆盖率 ≥80%） |
| TI 集成测试 | 05 开发中 | Spec + 契约 | tests/integration/ |
| TE E2E | 05/06 | 用户旅程 | 关键路径验证 |
| TA 审计 | 里程碑后 | 系统结构 | 审计 findings |
| TQ 复盘 | 07 | 测试缺口 | test-retro-{version}.md |

## 关键闭环

1. **需求→code→test 三基线**：PMS（产品）→ CMS（代码）→ TMS（测试），07 findings 回流 PMS
2. **审查→规划迭代**：07 open/deferred findings → ROADMAP Phase 2 增量 → Phase 2.5 重跑 → 下一轮 01
3. **Fix Loop（06 内）**：门控失败 → 回 05/03 修 delta → 重验 → 循环到全绿（超 3 轮 blocked）
4. **版本间连续交付**：lifecycle-orchestrator 读取 lifecycle-state → 逐个版本推进直到队列清空

## 版本策略

- **攒批发布**：同模块多功能打包一个 MINOR+1；feat/fix 分轨不混合
- **版本号不跳跃**：additive=MINOR+1 续编，breaking 才 MAJOR+1
- **战略主题号 ≠ 发布号**：ROADMAP "v2.0=平台化" 是愿景，实际 tag 按 SemVer 增量

## 阶段门控

| 阶段 | 不通过 → |
|------|---------|
| 外环→内环 | 收敛闸门不通过 → 回 Phase 2.5/5 |
| 00 | AGENTS.md 缺 6 节 / manifest 不完整 → 补 |
| 01 | PRD 有未解 Critical → 修→重审 |
| 03 | Spec 数 ≠ Feature 数 → 补 Spec |
| 06 S6 | gate not-run/失败 → Fix Loop 回 05/03 |
| 06 S7 | CRITICAL finding → 修→重审 |
| 06 S8 | 版本未对齐 / 未归档 → 补 |

## 反模式

| 反模式 | 纠正 |
|--------|------|
| 跳过外环直接进内环 | 先跑 roadmap → 收敛闸门 |
| 已规划=必要 | Phase 2.5 强制审视过滤 |
| 无 Spec 就写码 | 1 Feature = 1 Spec |
| 门控降级（grep 替代 typecheck） | 工具链坏 = BLOCKED |
| 带红发布 | Fix Loop 到全绿 |
| 逐功能发版 | 攒批：同模块打包 |
| 测试金字塔倒置（E2E 占 60%） | 单元 75% + 集成 20% + E2E 5% |

## 产物速查

| 阶段 | 人读 | Agent |
|------|------|-------|
| 外环 | `docs/strategy/` `docs/prd/` `docs/analysis/` | `.csp/manifest.json` |
| 01 | `docs/prd/PRD-{slug}.md` | `.csp/product-spec/` |
| 02 | — | `.csp/decomposition/` |
| 03 | `docs/analysis/test-cases-*.md` | `.csp/specs/` `.csp/test-spec/` |
| 05 | 源码 | `.csp/code-spec/` |
| 06 | `CHANGELOG.md` | `.csp/artifacts/verify/` `.csp/ship/` |
| 07 | `docs/analysis/test-retro-*.md` | `.csp/review/` |