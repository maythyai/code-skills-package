---
name: csp-linked-test-runner
description: >
  Orchestrate a full cross-layer round-trip test for one feature: seed the DB, drive a UI action
  with Playwright, capture its API request, assert the resulting DB state, verify the UI
  reflects that state, and emit a single linked verdict that names the broken layer if any.
  Use when you need to verify a feature works across all layers at once, when single-layer tests
  pass but the feature is broken end-to-end, when reproducing a data/UI inconsistency, or as a
  release gate before shipping a write-path feature. Composes csp-playwright-ui-test,
  csp-db-state-assertion, and csp-visual-regression/visual-verdict.
version: 0.1.0
layer: 4
category: runtime
phase: verify
domain: testing
scope: testing
role: architect
tools: [Read, Bash, Grep, Glob, Agent]
triggers:
  - "联动测试"
  - "跨层验证"
  - "全链路跑一遍"
  - "linked test"
  - "round trip test"
  - "前端到数据库"
  - "点击到落库"
related_skills: [csp-cross-layer-testing, csp-db-state-assertion, csp-playwright-ui-test, csp-visual-verdict, csp-verify-phase, csp-ultraqa]
anti_rationalizations:
  "分层各自测过就行": "本技能的价值就是把四层串成一个裁决；各自测过≠链路一致，必须同动作对齐"
  "环境起不来就 blocked": "先排查端口/依赖/降级 mock，只有外部依赖确实不可用才算 blocked 并写明缺什么"
  "某层失败就停": "记录断点层后可继续后续非依赖层取证，但裁决以断点层为准；不要掩盖断点"
  "UI 截图对比靠肉眼": "视觉层用 csp-visual-verdict/csp-visual-regression 做结构化裁决，不靠人眼"
---

# Linked Test Runner — 跨层联动测试编排器

> 一条命令把一次功能动作串成完整链路：**seed DB → 驱动 UI 动作 → 抓 API 请求 → 断言 DB 变化 →
> 验证 UI 反映 → 出单一联动裁决**。裁决命名"断点在哪一层"，让修复直指根因。

## 0. 安全约束（一句话）

只在 test/dev 环境操作；DB 只读优先、禁生产写；UI 动作禁真实支付/真实凭证；连接串用环境变量参数化。

## 1. 它编排谁

```
csp-cross-layer-testing     ← 设计契约(可追溯用例对象 .linked.yaml)
        │
        ▼
本技能 csp-linked-test-runner (编排)
        │
        ├── csp-db-migration         → seed/reset test 库
        ├── csp-playwright-ui-test   → 驱动点击 + 采四类浏览器证据(含网络 trace_id)
        ├── csp-db-state-assertion   → pre/post 行级断言 + trace_id 对齐 + 不变量
        └── csp-visual-verdict /     → UI 反映是否与 DB 变化一致
            csp-visual-regression
        │
        ▼
   单一联动裁决(verdict + broken_at + 证据链接)
```

## 2. 输入：联动用例契约

接受 `csp-cross-layer-testing` 定义的 `.linked.yaml` 契约，或用户用自然语言描述的功能切片（此时先调 `csp-cross-layer-testing` 物化成契约再跑）。

最小契约示例见 `csp-cross-layer-testing` §3。

## 3. 执行流程

```
┌─ 0. 风险评估 ──── 高风险写路径 ──→ 完整流程；低风险共享组件 → Fast Path(冒烟+关键截图)
│        │
├─ 1. 环境准备 ──── test 库连接(TEST_DB_URL) / dev server / 登录态
├─ 2. seed ──────── db:reset && db:seed:test (csp-db-migration)，事务隔离标记
├─ 3. pre 快照 ──── csp-db-state-assertion 取基线(目标表 + 不变量表)
├─ 4. UI 动作 ────── csp-playwright-ui-test 执行点击，输出 linked-evidence.json
│                    (含网络请求 trace_id + 时间戳 + 请求体)
├─ 5. post 快照 ──── csp-db-state-assertion 在 window_ms 内查库，行级 diff
├─ 6. 对齐 ──────── 用 trace_id(强)或时间窗(弱)把 DB diff 与网络请求对齐
├─ 7. UI 反映 ────── csp-visual-verdict/visual-regression 断言 UI 反映 DB 变化
├─ 8. 裁决 ──────── 汇总四层 → 单一 verdict + broken_at + 证据链接
└─ 9. 收尾 ──────── 事务 ROLLBACK / 清理浏览器 / 落盘报告
```

## 4. linked-evidence.json（层间数据契约）

`csp-playwright-ui-test` 在第 4 步产出的联动证据，供 DB 层对齐消费：

```json
{
  "test_id": "ORD-001",
  "action": { "step": "click e{checkout-btn}", "ts": 1730000000000 },
  "network": [
    {
      "method": "POST",
      "path": "/api/orders",
      "status": 200,
      "trace_id": "abc123",
      "request_body": { "productId": "p1", "qty": 1 },
      "response_body": { "orderId": "o9", "status": "pending" },
      "ts": 1730000000120
    }
  ],
  "ui_dom": "evidence/ORD-001-after.dom",
  "screenshot": "evidence/ORD-001-after.png",
  "console_errors": []
}
```

DB 层用 `network[0].trace_id` 与 `network[0].ts` 做对齐锚点。

## 5. 单一联动裁决

```markdown
# 联动裁决 — ORD-001 「用户下单」
verdict: fail
broken_at: db
mode: full
env: http://localhost:3000 / test_db / chrome

## 链路
| 层 | 结果 | 关键证据 |
|----|------|----------|
| UI 动作 | ✅ pass | 点击已执行，DOM 已变 |
| API | ✅ pass | POST /api/orders 200 trace_id=abc123 |
| DB | ❌ FAIL | orders 行已插(status=pending)但 products.stock 未扣减(不变量破坏) |
| UI 反映 | ⏸ n/a | DB 层失败，UI 断言暂缓 |

## 因果对齐
- trace_id: DB orders.trace_id=abc123 == 请求 abc123 -> 强因果 ✅
- 断点：products.stock delta=0，预期 -1

## 证据
- UI:  evidence/ORD-001-action.png
- API: linked-evidence.json#network[0]
- DB:  pre=stock:10 / post=stock:10(预期 9)
- UI:  (暂缓)

## 修复指向
- 库存扣减逻辑缺失/未在订单创建事务内执行 -> 查 orders 服务的事务边界
```

裁决规则：

1. 任一层不符 = `fail`，并标 `broken_at` = 第一个失败层。
2. 断点层之后的非依赖层可继续取证(留 `n/a` 或 `⏸`)，但**不掩盖断点**。
3. 全部一致 = `pass`。
4. 外部依赖确实不可用 = `blocked`，写明已尝试手段 + 缺什么。

## 6. Fast Path（低风险共享组件）

| 维度 | Fast Path | 完整流程 |
|------|-----------|----------|
| 改动 | 共享组件样式/文案/纯展示 | 写路径、状态管理、数据流 |
| 跑法 | 冒烟:seed→点击→查 1 个 post 断言→1 张截图 | 全链四层+不变量+副作用 |
| 退出 | 任一冒烟项失败 → 立即转完整流程 | 跑完出完整裁决 |

Fast Path 通过也要留截图证据，报告中标 `[fast-path]`。

## 7. 失败签名与回归

沿用 `csp-playwright-ui-test` 的失败签名机制(`<类型>@<位置>:<消息>`)，扩展为四层签名：

```
broken_at_layer:db  signature:invariant@products.stock:delta-0-expected-(-1)
```

同一签名一轮只修一次，修完回归该用例 + 相邻写路径用例。

## 8. 与现有编排 skill 的分工

| 场景 | 选择 |
|------|------|
| 一次功能动作的 UI→API→DB→UI 联动验证 + 出断点裁决 | **本技能** |
| 单目标(tests/build/lint)循环到通过 | `csp-ultraqa` |
| 验收阶段全量门禁 | `csp-verify-phase` |
| 自主循环直到任务完成 | `csp-ralph` |

本技能是 `csp-verify-phase` 在"写路径功能"上的子工序：verify-phase 可调用本技能对高风险写路径逐个出联动裁决。

## 9. 状态与清理

- 状态落 `.csp/linked-test-state.json`（test_id / 当前层 / verdict / broken_at），完成后删除（同 ultraqa 清理规范）。
- 事务隔离用例结尾 ROLLBACK；seed-reset 用例结尾可选 `db:reset`。
- 关闭浏览器：`playwright-cli close` / `close-all`。

## 10. CLI 用法

```
# 跑一个契约
csp-linked-test-runner --contract tests/linked/orders-create.linked.yaml

# 自然语言切片(先物化成契约再跑)
csp-linked-test-runner --describe "用户下单后库存扣减且界面反映最新库存"

--fast-path            # 强制低风险共享组件 Fast Path
--target <url>         # 覆盖契约里的 page URL
--db-url $TEST_DB_URL  # test 库连接(必填，禁生产)
--max-retry 3          # 同一失败签名最多重试/回归次数
```

退出码：0=pass / 1=fail(broken_at 已标) / 2=blocked(写明缺什么)。

## 11. 参考文档索引

| 文档 | 内容 |
|------|------|
| `csp-cross-layer-testing` | 契约定义、证据矩阵、金字塔定位 |
| `csp-db-state-assertion` | DB pre/post 断言、trace_id 对齐、不变量 |
| `csp-playwright-ui-test` | 浏览器四类证据采集 + linked-evidence 输出 |
| `csp-visual-verdict` | UI 与参考的结构化视觉裁决 |
| `csp-verify-phase` | 验收阶段门禁 |
| [references/runner.mjs](references/runner.mjs) | 可执行编排骨架(零依赖 ESM)：`node references/runner.mjs --contract x.linked.yaml --dry-run` 用内存 mock 跑完整链路出联动裁决；接入真实 stack 时实现 `driveUiAction`/`queryRows` 两个适配器 |
