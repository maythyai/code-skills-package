---
name: csp-cross-layer-testing
description: >
  Design and assert full-stack round-trip tests that correlate one user action across the UI,
  API, and database layers in a single traceable verdict. Use when a feature must be verified
  end-to-end — e.g. "click should persist a record and reflect it on screen", when single-layer
  tests pass but the integration is broken, when debugging a data inconsistency between what the
  API returns and what is stored, or when building traceable test contracts that bind a
  requirement to UI step + API expectation + DB expectation + UI assertion. Also covers
  vertical-slice integration testing that sits between unit and E2E in the test pyramid.
version: 0.1.0
layer: 3
category: patterns
phase: verify
domain: testing
scope: testing
role: architect
triggers:
  - "联动测试"
  - "跨层测试"
  - "全链路测试"
  - "端到端验证"
  - "round trip"
  - "vertical slice"
  - "前后端联动"
  - "数据库与界面一致"
  - "traceable test"
  - "cross layer"
related_skills: [csp-db-state-assertion, csp-linked-test-runner, csp-playwright-ui-test, csp-e2e-testing, csp-api-tester, csp-verify-phase]
anti_rationalizations:
  "单测和接口测试都过了，集成没问题": "各层 PASS 不等于链路一致——必须在同一动作下把 UI/API/DB 证据对齐，才能证明一致"
  "E2E 测过登录流就算联动了": "走过场≠断言因果；联动测试必须断言'动作导致了预期 DB 变化且 UI 反映该变化'，而不只是页面跳转"
  "DB 是后端的事，前端测试不碰库": "联动测试的核心就是把 DB 状态纳入同一断言集，否则无法发现'接口成功但落库错/界面读旧数据'的缺陷"
  "用例写了但没对齐 trace_id": "没有对齐键的跨层证据无法证明因果，只能证明'各自都发生了'，等价于没联动"
---

# Cross-Layer / Round-Trip Testing

> 把**一次用户动作**串成一条可追溯的因果链，并在同一裁决里对齐四层证据：
> UI 动作 → API 调用 → DB 状态变化 → UI 反映。任一层不符即判失败，并指出断点在哪一层。

与现有 skill 的分工：

| 需要的 | 选择 |
|--------|------|
| 设计跨层用例契约、定义证据矩阵、定位测试金字塔 | **本技能** |
| 跑 SQL 做 pre/post 行级断言、按 trace_id 对齐 | `csp-db-state-assertion` |
| 一条命令驱动 UI→API→DB→UI 并出联动裁决 | `csp-linked-test-runner` |
| 采集 DOM/网络/控制台/截图四类浏览器证据 | `csp-playwright-ui-test` |
| 建长期 E2E 套件、flaky 治理、CI 分片 | `csp-e2e-testing` |
| API 功能/性能/安全/契约 | `csp-api-tester` |

## 1. 核心命题：各层 PASS ≠ 链路一致

单层测试回答"这一层是否正确"，**联动测试回答"一次动作是否在四层上自洽"**。一个常见的缺陷形态：

```
点击下单 → POST /api/orders 返回 200 ✓ (接口层 PASS)
         → orders 表新增 1 行 ✓ (DB 层 PASS)
         → 但 products.stock 没扣减 ✗ (不变量被破坏)
         → 界面显示"下单成功"但库存仍为旧值 ✗ (UI 读到未更新数据)
```

只有把"这次点击"的网络请求、DB 行变化、UI 渲染**用对齐键绑到同一断言集**，才能暴露 stock 未扣减这个缺陷——单看任一层都是绿的。

## 2. 测试金字塔中的定位

```
          /  \
         / E2E \              <- 真·端到端，跨进程跨部署，慢、贵、易 flaky
        /--------\
       / 跨层联动  \            <- 本技能：同事务/同请求边界内的垂直切片，快、可追溯
      /------------\
     /  Integration \          <- API 契约 + DB 集成
    /----------------\
   /    Unit Tests     \       <- 纯逻辑
  /----------------------\
```

**垂直切片集成测试**的关键区别：它**不跨整个部署栈**（不像 E2E 要起全套服务），而是在"一个请求/一个事务"的边界内，断言 UI→API→DB→UI 的因果。它比 E2E 快一个数量级，比 unit 真——因为它真的碰到了库。

## 3. 可追溯用例契约（核心对象）

每个联动用例是一个可机器读、可追溯的对象，把需求绑到四层断言：

```yaml
# tests/linked/orders-create.linked.yaml
test_id: ORD-001
requirement: 用户下单后，订单落库且库存扣减且界面反映最新库存
risk: high                       # high -> 走完整流程；低风险共享组件可走 Fast Path
isolation: transaction          # transaction | seed-reset | none
layers:
  ui_action:
    page: "/products"
    steps:
      - "snapshot ref"          # 由 playwright-ui-test 提供
      - "click e{checkout-btn}"
    evidence: [dom, network, console, screenshot]
  api:
    expect:
      method: POST
      path: "/api/orders"
      status: 200
      body_assert: "body.orderId != null && body.status == 'pending'"
  db:
    pre:                        # 动作前基线
      - query: "SELECT count(*) AS n FROM orders WHERE user_id = :uid"
        expect: { n: 0 }
    post:                       # 动作后断言
      - query: "SELECT status FROM orders WHERE user_id = :uid ORDER BY id DESC LIMIT 1"
        expect: "pending"
    invariants:                  # 不变量：不应被破坏的约束
      - query: "SELECT stock FROM products WHERE id = :pid"
        delta: -1               # 相对 pre 减 1
  ui_effect:
    expect:
      - "locator '.toast' 文本包含 '下单成功'"
      - "locator '.stock-{pid}' 文本等于新库存值"
correlation:
  key: trace_id                # 网络请求头 / DB 行 / 应用日志 共用
  window_ms: 2000              # 动作后多少 ms 内的 DB 变化才算"由本次动作导致"
verdict: pending               # pending | pass | fail(broken_at: db)
```

字段约束：

- `correlation.key` **必填**——没有对齐键的证据无法证明因果，判用例无效。
- `db.pre` 与 `db.post`/`db.invariants` **成对出现**——只有 post 没有 pre 无法判断"变化是否由本次动作导致"。
- `ui_effect` 必须断言**由 DB 变化派生出的界面状态**（如新库存值），而非与数据无关的静态文案——否则只是 E2E 走过场。

## 4. 证据矩阵

每个用例采集并**对齐**以下证据，缺一项扣分：

| 层 | 证据 | 采集方 | 对齐键 |
|----|------|--------|--------|
| UI 动作 | 操作序列 + DOM 快照 | `csp-playwright-ui-test` | 时间戳 |
| API | 请求方法/路径/状态/体 | 同上(network 过滤) | trace_id 请求头 |
| DB | pre/post 行级 diff | `csp-db-state-assertion` | trace_id 列 / 时间窗 |
| UI 反映 | 渲染后 DOM/截图 | `csp-playwright-ui-test` | 时间戳 + trace_id |

**对齐规则**：以 UI 动作的时间戳为锚点，取 `[t0, t0 + window_ms]` 内的 DB 变化；若 DB 有 `trace_id` 列，则要求该列等于本次请求的 trace_id——这是最强的因果证据。没有 trace_id 列时降级到时间窗 + 行内容匹配，并在裁决里标注"因果强度: 弱(时间窗)"。

## 5. 隔离策略

| 策略 | 适用 | 说明 |
|------|------|------|
| `transaction` | 支持事务的库 | 用例包在一个事务里，断言后 ROLLBACK，零污染、最快；首选 |
| `seed-reset` | 跨进程/无事务 | 动作前 reset+seed 到已知态，用例间不共享数据 |
| `none` | 只读断言 | 仅断言读取结果，不写库；最安全 |

铁律：**联动测试只读优先，禁止对生产库写**。需写库时走 `transaction` 或独立的 test 库（用环境变量 `TEST_DB_URL` 参数化，绝不硬编码连接串）。

## 6. 失败诊断：定位断点在哪一层

联动测试的价值不仅是"过/不过"，而是**指出链路在哪一层断裂**：

```
verdict: fail
broken_at: db
chain:
  ui_action:  pass   (点击已执行，DOM 已变)
  api:        pass   (POST /api/orders 200)
  db:         FAIL   (orders 行已插入，但 products.stock 未扣减 -> 不变量破坏)
  ui_effect:  n/a    (因 DB 层失败，UI 断言暂缓)
evidence:
  - ui:   evidence/ORD-001-action.png
  - api:  POST /api/orders 200 trace_id=abc
  - db:   orders: +1 row(status=pending); products.stock: 0(预期 -1)
```

断点定位让修复直指根因，而不是"重跑试试"。

## 7. 与功能开发流程的结合（方法论落地）

| CSP 阶段 | 联动测试补什么 | 方法论对应 |
|----------|----------------|------------|
| brainstorming / spec | 写出垂直切片用例契约(§3) | 等价类划分 + 边界值，锁定"动作→数据→状态→展现"四要素 |
| TDD (csp-tdd) | 先写联动契约作为可执行规约 | 契约测试 / 消费者驱动契约(CDC) |
| build (patterns) | 让 API 写库带 trace_id，UI 请求带同一 id | 可观测性驱动测试 |
| verify (csp-verify-phase) | 跑 `csp-linked-test-runner` 出联动裁决 | 集成测试金字塔定位 + 可追溯性矩阵 |
| ship | 联动证据作为发布门禁 | 发布就绪判据 |

**一句话方法论**：你缺的不是某层的测试能力，而是把四层证据对齐到"同一动作"的追溯能力——这正是 round-trip / vertical-slice integration test 的本质。

## 8. 反模式

- **各层单独 PASS 就认为联动 OK** —— 必须在同一动作下对齐证据才算联动。
- **只写 post 不写 pre** —— 无法区分"变化由本次动作导致"还是"本来如此"。
- **无对齐键** —— 没有 trace_id/时间窗对齐的跨层证据只能证明"各自发生"，不能证明因果。
- **UI 断言与数据无关** —— 只断言"出现成功字样"是 E2E 走过场；必须断言由 DB 变化派生的状态。
- **联动测试直接写生产库** —— 只读优先，写库走事务/独立 test 库。
- **把所有用例都做成跨层联动** —— 联动测试有成本，只用于"动作→数据→状态→展现"确实跨层的核心路径；纯逻辑留 unit，纯契约留 API 测试。

## 9. 与 E2E 的边界

| 维度 | 跨层联动测试 | E2E (csp-e2e-testing) |
|------|--------------|----------------------|
| 范围 | 一个请求/事务边界内 | 跨整个部署栈 |
| 速度 | 快(秒级) | 慢(分钟级) |
| 成本 | 低 | 高 |
| 用途 | 因果一致性、数据正确性 | 关键用户旅程、跨页路由 |
| 数量 | 核心写路径每个一例 | 5-10% 关键旅程 |

两者互补，不互替。

## 10. 参考文档索引

| 文档 | 内容 |
|------|------|
| `csp-db-state-assertion` | DB pre/post 断言、行级 diff、trace_id 对齐的执行细节 |
| `csp-linked-test-runner` | 一条命令跑完整链路并出联动裁决 |
| `csp-playwright-ui-test` | 四类浏览器证据采集 |
| `csp-e2e-testing` | 套件建设、flaky 治理、CI 分片 |
| [references/contract-schema.md](references/contract-schema.md) | 联动用例契约 `.linked.yaml` 完整规范与校验规则 |
| [references/contract-validator.mjs](references/contract-validator.mjs) | 可运行契约校验器(零依赖 ESM)：`node references/contract-validator.mjs x.linked.yaml` |
