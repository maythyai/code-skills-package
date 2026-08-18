# Cross-Layer Test Contract Schema

> 跨层联动用例契约（`.linked.yaml`）的完整规范。`csp-linked-test-runner` 与
> `references/contract-validator.mjs` 都按此解析。契约是"可执行规约"——它把一个需求绑到
> UI 步骤 + API 期望 + DB pre/post + 不变量 + UI 反映，并声明对齐键。

## 顶层结构

```yaml
test_id: <string>            # 必填，唯一标识，如 ORD-001
requirement: <string>        # 必填，需求/意图一句话
risk: low | medium | high    # 可选，默认 medium；low 走 Fast Path
isolation: transaction | seed-reset | none  # 必填，DB 隔离策略
window_ms: <int>             # 可选，默认 2000；动作后取 DB 变化的时间窗
layers:                      # 必填
  ui_action: { ... }         # 必填
  api: { ... }               # 必填
  db: { ... }                 # 必填
  ui_effect: { ... }         # 必填
correlation:                  # 必填
  key: <string>              # 必填，对齐键名，如 trace_id
  header: <string>           # 可选，从哪个响应/请求头取值，默认 x-trace-id
```

## layers.ui_action

```yaml
ui_action:
  page: <url>                 # 必填，被测页面
  login_state: <path>         # 可选，playwright-cli storageState 文件
  steps:                      # 必填，有序操作序列
    - "snapshot"              # 取 ref
    - "click e{checkout-btn}" # 用 ref 操作
    - "fill e{qty} \"1\""
  evidence: [dom, network, console, screenshot]  # 可选，默认全采
```

## layers.api

```yaml
api:
  expect:
    method: POST | GET | PUT | PATCH | DELETE   # 必填
    path: <string | regex>                       # 必填，如 /api/orders 或 ^/api/orders
    status: <int>                                 # 必填，期望状态码
    body_assert: <js expression>                 # 可选，对 response body 的断言表达式
      # 用 body 引用响应体，如 "body.orderId != null && body.status === 'pending'"
    header_assert: <js expression>               # 可选，对响应头的断言
```

## layers.db

```yaml
db:
  pre:                          # 可选但强烈建议；动作前基线
    - query: <sql>             # 必填，参数化用 :name 占位
      expect: <value | object> # 期望值；对象则逐键比对
      vars: { uid: "$UID" }    # 可选，变量绑定
  post:                         # 动作后断言
    - query: <sql>
      expect: <value | object>
  invariants:                   # 不变量：声明 delta
    - query: <sql>
      delta: <int>             # 相对 pre 的变化量；0 表示无副作用
      name: <string>           # 可选，便于裁决
  no_side_effects: true         # 可选，对未列入的表做 pre/post 全 diff，diff 应为空
```

**配对规则**：每个 `post` 断言的表，原则上应有对应 `pre`（否则无法证明变化来源）。`invariants` 必须能在 `pre` 中取到同名查询的基线（validator 会检查）。

## layers.ui_effect

```yaml
ui_effect:
  expect:                       # 必填，断言由 DB 变化派生的界面状态
    - "locator '.toast' 文本包含 '下单成功'"
    - "locator '.stock-{pid}' 文本等于新库存值"
  screenshot: true              # 可选，默认 true，留取证截图
```

**反走过场规则**：至少一条 `expect` 必须断言"由 DB 变化派生的状态"（如新库存值、新订单号），而非与数据无关的静态文案。validator 只做软提示（无法静态判定哪条派生自 DB），在裁决里标 `[weak-ui]`。

## correlation

```yaml
correlation:
  key: trace_id                 # 必填，对齐键名
  header: x-trace-id            # 可选，取该请求/响应头的值作为本次因果锚点
  # 若应用未注入 trace_id：key 仍必填，但 runner 降级为时间窗弱因果
```

## 完整示例

```yaml
test_id: ORD-001
requirement: 用户下单后，订单落库且库存扣减且界面反映最新库存
risk: high
isolation: transaction
window_ms: 2000
layers:
  ui_action:
    page: "/products"
    login_state: "tests/.auth/user.json"
    steps:
      - "snapshot"
      - "click e{checkout-btn}"
    evidence: [dom, network, console, screenshot]
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
        vars: { uid: "$UID" }
      - query: "SELECT stock AS s FROM products WHERE id = :pid"
        expect: { s: 10 }
        vars: { pid: "$PID" }
    post:
      - query: "SELECT status, trace_id FROM orders WHERE user_id = :uid ORDER BY id DESC LIMIT 1"
        expect: { status: "pending" }
        vars: { uid: "$UID" }
    invariants:
      - query: "SELECT stock AS s FROM products WHERE id = :pid"
        delta: -1
        name: "库存扣减"
        vars: { pid: "$PID" }
    no_side_effects: true
  ui_effect:
    expect:
      - "locator '.toast' 文本包含 '下单成功'"
      - "locator '.stock-{pid}' 文本不等于 10"
    screenshot: true
correlation:
  key: trace_id
  header: x-trace-id
```

## 校验规则（validator 强制项）

1. `test_id`、`requirement`、`isolation`、`layers`、`correlation.key` 必填。
2. `layers` 四子节点（ui_action/api/db/ui_effect）必须齐全。
3. `api.expect` 必须含 method/path/status。
4. `db.post` 至少一条；每条 `post` 查询的表应在 `db.pre` 出现，否则 warn（无法证明变化来源）。
5. `db.invariants` 每条必须能在 `db.pre` 找到相同 query 的基线，否则 error（无基线无法算 delta）。
6. `correlation.key` 必填；缺则 error（无对齐键=无因果）。
7. `ui_effect.expect` 至少一条；全为静态文案则 warn（疑似走过场）。

运行：`node references/contract-validator.mjs path/to/x.linked.yaml`
