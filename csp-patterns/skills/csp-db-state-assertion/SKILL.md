---
name: csp-db-state-assertion
description: >
  Assert database state before and after a single user action, and correlate the changed rows
  with the API call that triggered the write using a trace id or time window. Use when an
  integration test must prove "this click persisted exactly the expected rows and did not
  break an invariant", when debugging "API returned 200 but the wrong rows landed in the DB",
  when checking that a write had no unintended side effects, or when seeding/rolling back test
  data for a round-trip test. Bridges the database layer into cross-layer testing.
version: 0.1.0
layer: 3
category: patterns
phase: verify
domain: database
scope: testing
role: expert
triggers:
  - "数据库断言"
  - "DB 状态断言"
  - "落库验证"
  - "行级 diff"
  - "pre post 快照"
  - "trace id 对齐"
  - "数据库副作用"
  - "不变量断言"
related_skills: [csp-cross-layer-testing, csp-linked-test-runner, csp-db-migration, csp-db-performance]
anti_rationalizations:
  "接口 200 就算写库成功": "200 只代表请求被接受；必须查库断言行真的落了、字段值正确，否则无法发现'接口成功但事务回滚/落错表'的缺陷"
  "查一下总数变了就行": "总数变化不等于正确——必须行级断言具体字段值与不变量，否则会漏掉'多写一行+少写一行'的对冲错误"
  "用例间共享数据没事": "共享可变状态是 flaky 之首；联动 DB 断言必须事务隔离或独立 seed，否则并行跑必然互相污染"
  "直接连生产库查一下": "只读优先、禁生产写；即使只读也应优先连 test 库(环境变量参数化)，绝不硬编码生产连接串"
---

# Database State Assertion

> 在一次 UI 动作的**前后**对数据库做快照，断言行级变化，并用 trace_id/时间窗把"DB 这次变化"
> 与"触发它的那次 API 调用"对齐——把数据库层纳入跨层联动的同一断言集。

与现有 DB skill 的分工：

| 需要的 | 选择 |
|--------|------|
| 运行期 pre/post 行级断言、trace_id 对齐 | **本技能** |
| 库设计、索引、连接池、慢查询调优 | `csp-db-performance` |
| schema 迁移、reset/reseed 脚本 | `csp-db-migration` |
| 设计跨层用例契约 | `csp-cross-layer-testing` |
| 一条命令串起 UI→API→DB→UI | `csp-linked-test-runner` |

## 1. 核心机制

| 机制 | 说明 |
|------|------|
| **pre/post 配对** | 动作前取基线，动作后断言变化；只有 post 没有 pre 无法证明"变化由本次动作导致" |
| **行级断言** | 断言具体行的字段值，而非总数；总数变化会漏掉"多写一行+少写一行"的对冲错误 |
| **不变量断言** | 声明不应被破坏的约束（如库存≥0、账户余额不变），断言它们的 delta |
| **trace_id 对齐** | 用 trace_id 列把 DB 行与触发它的网络请求强绑定；无此列则降级到时间窗(弱因果) |
| **事务隔离** | 用例包在事务里 ROLLBACK，或用独立 test 库 reset+seed，零污染 |

## 2. 工作流

```
1. 取对齐键 —— 从 UI 动作/网络证据拿到 trace_id(请求头)，作为本次因果锚点
2. pre  快照 —— 动作前查目标表/不变量表，记录基线值
3. 触发动作 —— 由 csp-playwright-ui-test 执行点击(本技能只管查库)
4. post 快照 —— 动作后(在 window_ms 内)再查，得到行级 diff
5. 对齐  判定 —— 用 trace_id 或时间窗确认 diff 由本次动作导致
6. 断言  裁决 —— 字段值/不变量 delta 是否符合预期；不符则报告 broken_at: db
```

## 3. pre/post 行级断言

### 3.1 总数 vs 行级

```sql
-- ❌ 弱：只看总数，漏掉对冲错误
SELECT count(*) FROM orders WHERE user_id = :uid;   -- 0 -> 1，但可能错插一行+误删一行

-- ✅ 强：行级断言具体字段值
SELECT id, status, total, created_at
FROM orders
WHERE user_id = :uid
ORDER BY id DESC LIMIT 1;                           -- 断言 status='pending' 且 total>0
```

### 3.2 diff 采集

最稳妥的方式：pre 快照主键集合，post 取差集，再对新增行断言字段。

```typescript
// 伪代码：用任意支持参数化查询的驱动(pgp/pg, mysql2, knex, prisma)
async function assertRoundTrip(pool, uid, pid, traceId) {
  // pre
  const preOrders = await pool.query(
    "SELECT id FROM orders WHERE user_id = $1", [uid]
  );
  const preStock = await pool.query(
    "SELECT stock FROM products WHERE id = $1", [pid]
  );

  // --- 此处由 playwright-ui-test 触发点击，等 network 里的 POST /api/orders ---

  // post：在 window_ms 内查库
  const postOrders = await pool.query(
    "SELECT id, status, trace_id, total FROM orders WHERE user_id = $1 ORDER BY id DESC LIMIT 1",
    [uid]
  );

  // 断言：新增了一行
  assert(postOrders.rows.length === 1, "orders 应新增 1 行");
  const row = postOrders.rows[0];
  assert(row.status === "pending", `status 应为 pending，实为 ${row.status}`);
  assert(row.total > 0, "total 应 > 0");

  // 因果对齐：trace_id 必须等于本次请求的 trace_id(强因果)
  assert(row.trace_id === traceId,
    `trace_id 不匹配：DB=${row.trace_id} 请求=${traceId} -> 无法证明此行由本次动作写入`);

  // 不变量：库存减 1
  const postStock = await pool.query(
    "SELECT stock FROM products WHERE id = $1", [pid]
  );
  assert(postStock.rows[0].stock === preStock.rows[0].stock - 1,
    `库存应减 1：pre=${preStock.rows[0].stock} post=${postStock.rows[0].stock}`);
}
```

## 4. trace_id 对齐（强因果 vs 弱因果）

### 4.1 强因果：trace_id 列

应用层在写库时把请求的 trace_id 落到行上（建议给所有写路径表加 `trace_id` 列）。这样 DB 行与网络请求**可证明**是同一因果链：

```sql
-- 应用层：POST /api/orders 时把 trace_id 一并写入
INSERT INTO orders (user_id, status, total, trace_id)
VALUES (:uid, 'pending', :total, :traceId);
```

断言时直接比 trace_id，因果强度最高。

### 4.2 弱因果：时间窗 + 内容匹配

没有 trace_id 列时，以 UI 动作时间戳为锚点，取 `[t0, t0 + window_ms]` 内的新行，并用内容（user_id、金额等）匹配。在裁决里标注"因果强度: 弱(时间窗)"，因为无法排除别的并发写正好落在窗口内。

## 5. 不变量与副作用

联动测试要断言"**该变的变了，不该变的没变**"：

```yaml
db:
  post:
    - query: "SELECT status FROM orders WHERE id = :new_order_id"
      expect: "pending"                  # 该变的：新订单状态
  invariants:
    - query: "SELECT stock FROM products WHERE id = :pid"
      delta: -1                          # 该变的(派生)：库存 -1
    - query: "SELECT balance FROM accounts WHERE user_id = :uid"
      delta: 0                           # 不该变的：账户余额(此处不应动)
      # delta: 0 即"无副作用"断言
```

**无副作用断言**：对断言中未涉及的表也做 pre/post 快照 diff，diff 为空才通过——能抓"误写日志表/误清缓存"这类隐蔽副作用。

## 6. 隔离策略

| 策略 | 实现 | 适用 |
|------|------|------|
| `transaction` | 用例全程在一个事务里，结尾 ROLLBACK | 支持事务的库，首选 |
| `seed-reset` | 动作前 `db:reset && db:seed:test`，用例间不共享 | 跨进程/无事务 |
| `none` | 只读断言，不写库 | 仅验证读取 |

```typescript
// 事务隔离：用例包在事务里，断言完直接回滚，零污染
async function runInTransaction(pool, fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await fn(client);
  } finally {
    await client.query("ROLLBACK");
    client.release();
  }
}
```

铁律：

- **只读优先**：本技能默认只查不写；写库动作由被测应用本身完成。
- **禁止连生产库**：连接串一律用环境变量 `TEST_DB_URL` 参数化，绝不硬编码。
- **不共享可变状态**：用例间隔离，否则并行跑必然 flaky。

## 7. 裁决输出

```markdown
# DB 层裁决 — ORD-001
verdict: pass | fail
broken_at: db | none
causal_strength: strong(trace_id) | weak(time-window)

## 断言结果
| 断言 | pre | post | 期望 | 结果 |
|------|-----|------|------|------|
| orders 新增 1 行 status=pending | 0 行 | 1 行 pending | 新增 pending | ✅ |
| products.stock delta=-1 | 10 | 9 | -1 | ✅ |
| accounts.balance delta=0(无副作用) | 500 | 500 | 0 | ✅ |

## 因果对齐
- trace_id: DB=abc123 == 请求=abc123 -> 强因果 ✅
- 时间窗: 动作后 2000ms 内的行变化

## 失败时(示例)
- broken_at: db
- 不变量 products.stock 未扣减：pre=10 post=10(预期 9) -> 库存扣减逻辑缺失
```

## 8. 反模式

- **只查总数不查行级** —— 漏掉对冲错误；务必断言具体字段值。
- **只有 post 没有 pre** —— 无法证明变化来源；必须成对。
- **无 trace_id 又不设时间窗** —— 因果无法对齐，等于没联动。
- **用例共享可变数据** —— flaky 之首；事务隔离或独立 seed。
- **连生产库做断言** —— 只读优先、用 test 库、连接串参数化。
- **断言里跑带副作用的写 SQL** —— 本技能只查；写动作归被测应用。

## 9. 参考文档索引

| 文档 | 内容 |
|------|------|
| `csp-cross-layer-testing` | 可追溯用例契约、证据矩阵、金字塔定位 |
| `csp-linked-test-runner` | 串起 UI→API→DB→UI 的编排 |
| `csp-db-migration` | reset/reseed 脚本 |
| `csp-db-performance` | 慢查询/索引诊断(非运行期断言) |
| [references/db-diff-tool.mjs](references/db-diff-tool.mjs) | 可运行 DB 断言工具(零依赖 ESM)：行级 diff、trace_id 对齐、不变量 delta、无副作用、禁生产写。`node references/db-diff-tool.mjs` 跑内置自测 |
