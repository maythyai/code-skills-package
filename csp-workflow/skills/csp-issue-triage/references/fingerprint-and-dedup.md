# 报错指纹与堆栈签名提取 + 判重操作手册

## 1. 为什么需要规范化签名

原始堆栈里充满**易变部分**：行号、内存地址、时间戳、请求 ID、UUID、用户/租户 ID、端口、临时文件名。带易变部分的签名意味着：

- 一次无关的格式化/插行提交让所有行号偏移 → **同一个 bug 被拆成几十个"不同"的单**；
- 每个请求 ID 都不同 → 自动判重永远命中不了；
- 不同机器地址不同 → 同一崩溃在不同实例上被当成两个问题。

签名的目标：**同一个根因的任何两次发生，规范化后字符串完全相等；不同根因尽量不相等。**

## 2. 提取规则（按序执行）

对一段报错文本/堆栈，依次做：

1. **提取异常/错误类型**：如 `NullPointerException`、`TimeoutError`、`SQLIntegrityConstraintViolationException`、HTTP 状态 + 错误码（`500 E_DOWNSTREAM`）。
2. **剥离易变 token**（正则见第 3 节）：行号、十六进制地址、时间戳、UUID、请求 ID、纯数字 ID、IP:端口。
3. **提取调用帧序列**：从栈顶开始，保留**前 3–5 帧**；**业务代码帧优先**——先收集属于本方代码包名前缀的帧（如 `com.example.`、`src/`、内部包名），不足 3 帧再补框架帧。全框架帧的堆栈（如纯容器超时）保留前 3 帧原样。
4. **拼接**：`{异常类型} @ {帧1} <- {帧2} <- {帧3}`，即签名。
5. 无堆栈的文本报告：取错误消息模板——把消息里的数字/ID/路径参数剥离后的剩余部分（如 `Failed to process order {id}` → `Failed to process order *`），作为弱签名，判重时权重降一档。

帧数取舍：3 帧够区分绝大多数根因；异步/回调重的代码栈（帧序列被调度器打断）放宽到 5 帧并优先取"业务帧连续段"。

## 3. 剥离易变部分的正则（常用集）

```text
十六进制地址      0x[0-9a-fA-F]+                       → *
行号（各语言）    \.(java|kt|py|go|ts|js):\d+           → .\1:N
                  line \d+ / at line \d+                → line N
时间戳            \d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?  → TS
ISO 短日期        \d{4}-\d{2}-\d{2}                     → DATE
UUID              [0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}   → UUID
请求/追踪 ID      (request|trace|correlation)[- _]?id[=: ]\S+          → REQID
IP:端口           \d{1,3}(\.\d{1,3}){3}(:\d+)?          → IP
长数字 ID         \b\d{6,}\b                            → ID
临时文件          /tmp/\S+ | /[Tt]emp/\S+               → TMPFILE
```

各语言帧格式识别（取"函数/方法标识"部分，丢弃其余）：

| 语言 | 原始帧示例 | 规范化后保留 |
|------|-----------|-------------|
| Java/Kotlin | `at com.example.order.OrderService.calc(OrderService.java:142)` | `OrderService.calc` |
| Python | `File "/app/order/service.py", line 142, in calc` | `order.service.calc` |
| Go | `example.com/order.(*Service).Calc(.../service.go:142 +0x1a4)` | `order.(*Service).Calc` |
| JS/TS | `at OrderService.calc (/app/dist/order/service.js:142:15)` | `OrderService.calc` |

## 4. 签名示例

原始（两单，同一 bug，行号不同）：

```text
单A: java.lang.NullPointerException
  at com.example.order.DiscountService.apply(DiscountService.java:88)
  at com.example.order.OrderService.calc(OrderService.java:142)
  at com.example.api.OrderController.create(OrderController.java:57)
  requestId=9f8a...b21, 2026-02-10T03:11:02Z

单B: java.lang.NullPointerException
  at com.example.order.DiscountService.apply(DiscountService.java:91)
  at com.example.order.OrderService.calc(OrderService.java:145)
  at com.example.api.OrderController.create(OrderController.java:57)
  requestId=1c3d...e44, 2026-02-11T09:40:55Z
```

规范化签名（两单相等 → 可合并）：

```text
NullPointerException @ DiscountService.apply <- OrderService.calc <- OrderController.create
```

## 5. 判重决策表

对候选单 X 与既有单 Y：

| 指纹 | 触发路径 | 版本区间 | 用户群 | 时间窗 | 决策 |
|------|---------|---------|--------|--------|------|
| 相同 | 相同或其一缺失 | 重叠 | 任意 | 任意 | **合并**（Y 为主单） |
| 相同 | 明显不同 | 重叠 | 明显不同 | 任意 | 标 `possible-duplicate`，观察 2–3 天，不合并（防"同报错不同根因"） |
| 不同（弱签名 vs 强签名） | 相同 | 重叠 | 相同 | 相同 | 人工复核：弱签名可能是同一堆栈的无栈表述 |
| 不同 | 相同 | 不重叠 | 任意 | 相隔一个发布周期以上 | 不合并，但互相链接（可能是同根因回归，回归本身是新信息） |
| 无指纹（纯文本描述） | 相似 | 任意 | 任意 | 任意 | 只允许人工判重，禁止自动合并 |

## 6. 合并操作清单

1. 选主单：信息最全 > 最早创建 > 讨论最多（按序比较）。
2. 副本打标：状态置为重复，字段 `duplicate-of: {主单号}`，保留双向链接；**不关闭删除**。
3. 信息并入主单（并集检查）：
   - [ ] 副本中主单没有的复现步骤（尤其不同环境下的）→ 追加到主单复现步骤节，注明来自副本号与环境；
   - [ ] 副本独有的附件/日志/堆栈 → 追加链接；
   - [ ] 副本的用户群/版本证据 → 更新主单"影响范围"（合并后影响面通常变大，**必须重新过一遍定级矩阵**）；
   - [ ] 副本报告者 → 加为主单订阅人。
4. 留痕：合并记录写明依据的信号（如"指纹相同 + 版本重叠，2026-02-14 合并 3 单"）。
5. 主单修复上线后，用**每个副本的原始环境**各验证一次（副本环境的差异可能就是触发条件）。

## 7. 拆单（合并错误的回滚）

触发条件：主单已修复上线，某副本场景仍复现。动作：从副本重建独立单（原始信息都在，因为没删）→ 新单注明"从 {主单号} 拆出，原合并依据：{信号}" → 复盘合并决策（通常是"触发路径明显不同仍合并"造成）→ 若是同报错不同根因，两个单都补充"根因区分说明"，防止下次再误合。
