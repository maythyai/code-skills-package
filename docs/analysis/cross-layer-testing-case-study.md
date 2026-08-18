# 跨层联动测试落地案例：下单扣库存

> 以"用户下单后订单落库、库存扣减、界面反映最新库存"这条写路径为例，演示从需求→方法选择
> （联想）→契约→seed→联动裁决→断点定位→修复→回归的完整闭环。串联
> [[csp-test-methodology]] → [[csp-cross-layer-testing]] → [[csp-db-state-assertion]] →
> [[csp-linked-test-runner]] 四个 skill。

日期：2026-08-15

## 0. 背景：割裂测试为什么漏 bug

下单功能拆成三个功能点分别测试，全都绿：

- `placeOrder()` 单测：参数正确返回 orderId ✓
- `decrementStock()` 单测：库存正确 -1 ✓
- `POST /api/orders` 接口测：200 + 响应体 ✓

上线后线上事故：**高并发下库存扣了但订单事务回滚，出现"扣库存无订单"的脏数据**。
原因正是割裂测试——三段单测各自绿，但没人测"一次动作在四层是否自洽"。

## 1. 用联想方法选择测试组合（[[csp-test-methodology]] §5 组合拳）

按下单写路径的功能原型选最小互补集：

| 风险维度 | 选的方法 | 盲点补位 |
|----------|----------|----------|
| 纯逻辑 | unit | 已有 ✓ |
| 写路径数据一致性 | **跨层联动** | 补集成断链盲点 |
| 并发 | property(不变量) | 补边界/并发盲点 |
| 错误路径 | negative | 补 happy path 盲点 |
| 上线门禁 | smoke + sanity | 广度+窄准 |

**关键补位**：缺一条跨层联动用例，证明"下单动作→orders 落库→products.stock -1→界面反映"四层自洽。

## 2. 写跨层联动契约（[[csp-cross-layer-testing]] §3）

`tests/linked/orders-create.linked.yaml`：

```yaml
test_id: ORD-001
requirement: 用户下单后订单落库且库存扣减且界面反映最新库存
risk: high
isolation: transaction
window_ms: 2000
layers:
  ui_action:
    page: "/products"
    login_state: "tests/.auth/user.json"
    steps: ["snapshot", "click e{checkout-btn}"]
  api:
    expect:
      method: POST
      path: "^/api/orders"
      status: 200
      body_assert: "body.orderId != null && body.status === 'pending'"
  db:
    pre:
      - query: "SELECT count(*) AS n FROM orders WHERE user_id = :uid"
        expect: { n: 0 }
      - query: "SELECT stock AS s FROM products WHERE id = :pid"
        expect: { s: 10 }
    post:
      - query: "SELECT status, trace_id FROM orders WHERE user_id = :uid ORDER BY id DESC LIMIT 1"
        expect: { status: "pending" }
    invariants:
      - query: "SELECT stock AS s FROM products WHERE id = :pid"
        delta: -1
        name: "库存扣减"
    no_side_effects: true
  ui_effect:
    expect:
      - "locator '.toast' 文本包含 '下单成功'"
      - "locator '.stock-{pid}' 文本不等于 10"
correlation:
  key: trace_id
  header: x-trace-id
```

前置工作：应用层在写库时把请求 `x-trace-id` 落到 `orders.trace_id` 列——这是做强因果对齐的前提（见 [[csp-db-state-assertion]] §4）。

## 3. 校验契约

```bash
node csp-patterns/skills/csp-cross-layer-testing/references/contract-validator.mjs \
     tests/linked/orders-create.linked.yaml
# ✅ ORD-001: contract valid
```

校验器确认：四层齐全、invariants 有对应 pre 基线、correlation.key 存在、ui_effect 非纯走过场。

## 4. 跑联动裁决（[[csp-linked-test-runner]]）

先 dry-run 验编排，再接真实 stack：

```bash
# dry-run：内存 mock 跑完整链路
node csp-runtime/skills/csp-linked-test-runner/references/runner.mjs \
     --contract tests/linked/orders-create.linked.yaml --dry-run

# live：接入真实 playwright-cli + test DB（实现 driveUiAction / queryRows 两个适配器）
TEST_DB_URL=postgresql://localhost:5432/app_test \
node csp-runtime/skills/csp-linked-test-runner/references/runner.mjs \
     --contract tests/linked/orders-create.linked.yaml --target http://localhost:3000
```

## 5. 联动裁决与断点定位

复现线上事故的裁决（stock 未扣减）：

```markdown
# 联动裁决 — ORD-001 「用户下单」
verdict: fail
broken_at: db

## 链路
✅ ui_action: 点击已执行，DOM 已变
✅ api: POST /api/orders 200  trace_id=abc123
❌ db: orders 行已插(status=pending)，但 products.stock delta=0（预期 -1，不变量破坏）
⏸ ui_effect: 暂缓——DB 层失败

## 因果对齐
trace_id: orders.trace_id=abc123 == 请求 abc123 → 强因果 ✅
断点：库存扣减未在订单创建事务内执行

## 证据
- UI:  evidence/ORD-001-action.png
- API: linked-evidence.json#network[0]
- DB:  pre=stock:10 / post=stock:10（预期 9）
```

**价值**：裁决直接点名断点在 `db` 层（库存扣减逻辑未与订单创建同事务），修复直指根因，
而非"重跑试试"。这正是单测看不见的集成断链。

## 6. 修复与回归

根因：`decrementStock()` 被放在订单事务外调用。修复——把扣库存并入订单创建事务：

```typescript
async function placeOrder(uid, pid) {
  return db.tx(async (t) => {
    const order = await t.one('INSERT INTO orders(...) VALUES(...) RETURNING *', {...});
    await t.none('UPDATE products SET stock = stock - 1 WHERE id = $1', pid);  // 同事务
    return order;
  });
}
```

回归：重跑联动用例 → verdict pass；同时跑相邻写路径（退款、取消）联动用例防回归。
失败签名机制（[[csp-playwright-ui-test]] §6）确保同签名只修一次。

## 7. 联想补位：还差什么

联动裁决 pass 后，回到 [[csp-test-methodology]] §4 缺口分析，确认相邻需求也补了：

| 需求 | 方法 | 状态 |
|------|------|------|
| R1 下单扣库存 | 跨层联动 ORD-001 | ✅ pass |
| R2 并发不超卖 | property(并发不变量) | 待补 |
| R3 支付失败回滚 | 跨层联动(回滚→DB 一致) | 待补 |
| R4 库存不足拦截 | negative | 待补 |

R2/R3/R4 是当前缺口——绿了 R1 不能掩盖它们未测，这就是反割裂。

## 8. 小结

- **割裂测试漏 bug**：三段单测绿，但联动时脏数据，因为没人测四层自洽。
- **联想补位**：写路径补跨层联动；并发补 property；错误路径补 negative；上线补 smoke/sanity。
- **断点裁决**：联动裁决点名 `broken_at: db`，修复直指根因。
- **缺口即风险**：需求追溯找未测功能，绿 R1 不掩盖 R2-R4 缺口。

这套链路把"测一个功能点"升级为"测一次动作在四层上自洽，且每条需求都有方法覆盖"——
从单层 PASS 走向全链路一致。
