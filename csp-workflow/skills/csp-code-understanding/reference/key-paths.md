# KEY-PATHS

> 代码理解文档 · 关键执行路径

核心业务流程的调用链追踪。每条路径从入口到出口，标注决策点、异步边界、错误处理。

## [路径名: 如"用户下单"]

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant Service
    participant DB
    participant Queue
    Client->>API: POST /orders
    API->>Service: create_order()
    Service->>DB: insert order
    Service->>Service: charge_payment()
    alt 支付成功
        Service->>Queue: enqueue notification
        Service-->>API: 201 Created
    else 支付失败
        Service-->>API: 402 Payment Required
    end
```

## 调用链

```
[入口] → [函数A] → [函数B] → [函数C] → [出口]
```

## 关键决策点

| 位置 | 决策 | 分支 |
|------|------|------|
| [函数:行] | [判断什么] | [成功/失败路径] |

## 异步边界

- [位置]: [异步操作]（[队列/定时任务/事件]）

## 错误处理路径

- [错误场景] → [处理函数] → [结果]

## 未测试段

- [路径中无测试覆盖的段]（图谱可用时从 TESTED_BY 边检测）
