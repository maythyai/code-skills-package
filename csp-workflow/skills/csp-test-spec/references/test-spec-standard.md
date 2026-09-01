# Test Module Spec Standard (TMS 说明书标准)

> TMS 的内容标准、存量/增量规则、矩阵组织与质量自检。配合 `csp-test-spec` SKILL.md。
> 行为准则见 `../../references/module-spec-lifecycle-norms.md`。

## 1. TMS 的"说明书"属性

| 属性 | 含义 |
|------|------|
| Branch of PMS | 继承 PMS 模块边界与验收形态，不发明模块 |
| Per-module | 每模块/功能区一份，目录 `.csp/test-spec/{module}/` |
| Living | 存量 + 增量 delta，里程碑折叠进 canonical |
| Stock + Incremental | 变更只产出 delta 新触及的增量用例 |
| Requirement-traceable | 需求→方法矩阵；缺口 = 未测功能 |
| Platform-neutral | git + `CSP_GIT_REMOTE`（默认 `github.com`） |

## 2. 需求→方法追溯矩阵

每条需求映射到 ≥1 测试方法（方法谱系见 `csp-test-methodology`）：

| 需求 | 方法 | 用例 |
|------|------|------|
| R1 下单扣库存 | unit + cross-layer | 前提：下单-扣库存，库存正确递减 |
| R2 余额不足拦截 | unit + negative | 前提：负数余额-下单，拦截并报错 |
| R3 并发不超卖 | property + integration | 前提：并发下单-扣库存，不超卖 |
| R4 支付失败回滚 | cross-layer | 前提：支付失败-回滚订单，DB 一致 |

**缺口清单**：未映射需求 = 风险，列高风险补联动用例。

## 3. 存量用例矩阵组织

存量 = 已有用例基线。**矩阵式**（入口 × 状态），非单枚举：

| 入口\状态 | 正常 | 余额不足 | 并发 | 支付失败 |
|----------|------|---------|------|---------|
| POST /order | case-1 | case-2 | case-3 | case-4 |
| POST /pay  | case-5 | — | case-6 | case-7 |

- **入口维度**来自 CMS `entry-points.jsonl`（与 CR 蒸馏一致）。
- **状态组合**优先；单枚举仅用于特殊分支。
- **命名**：`前提：[场景]-[行为]，[预期]` 完整叙事句。
- **形态**：Given/When/Then，可证伪。

## 4. 增量用例规则

变更落地时：

1. 读 `csp-prd-change-impact` 影响链 → 受影响需求/入口。
2. diff 当前需求矩阵 vs 旧矩阵 → 新触及的入口×状态组合。
3. **只为新组合生成用例**；存量未触及的不动。
4. delta 写入 `deltas/`，里程碑折叠进 canonical。
5. **增量命名**：`{module}_增量_{变更ID}_用例`。

**幂等铁律**：对未变更需求重跑 → 零增量。否则触发全量重建存量 + 告警。

## 5. 测试组合拳（最小互补集）

按功能原型选最小互补集（广而快在前）：

| 功能原型 | 风险 | 组合拳 |
|---------|------|--------|
| 纯计算工具 | 低 | unit + property |
| CRUD 写路径 | 高 | unit + cross-layer + negative |
| 跨服务集成 | 高 | contract + cross-layer + exploratory |
| 高并发/资金 | 极高 | unit + property + cross-layer + chaos + canary |
| 安全敏感 | 极高 | unit + security(DAST) + fuzz + negative + cross-layer |
| 数据迁移 | 高 | unit + differential + cross-layer |

## 6. 反割裂铁律

1. 测了功能点 ≠ 测了联动效果 —— 写路径必有跨层联动一例。
2. 绿测试 ≠ 覆盖了需求 —— 追溯矩阵找缺口。
3. 每种方法有盲点 —— 盲点互补，非堆砌。
4. 广而快在前，慢而深在后 —— smoke/property/contract 先行，E2E 收尾。
5. 通过 ≠ 无副作用 —— 跨层联动带 no_side_effects 断言。
6. 测过 ≠ 测对 —— 关键模块跑 mutation 验测试质量。

## 7. 质量门

```yaml
coverage_gate:
  requirement_to_method: 100%   # 每条需求映射 ≥1 方法
  write_path_cross_layer: true  # 写路径有跨层联动一例
  stock_matrix_organized: true  # 入口×状态矩阵 + 叙事句
  incremental_idempotent: true  # 未变更需求 → 零增量
  branch_of_pms: true           # 模块在 PMS 范围内
```

## 8. 质量自检表

| # | 检查项 | 通过标准 |
|---|--------|----------|
| 1 | PMS 分支 | 模块在 PMS 声明范围，验收形态继承 |
| 2 | 需求追溯 | 每需求映射 ≥1 方法 |
| 3 | 缺口清单 | 未映射需求已列 + 风险等级 |
| 4 | 矩阵组织 | 入口×状态 + 叙事句命名 |
| 5 | 反割裂 | 写路径有跨层联动一例 |
| 6 | 增量纪律 | 只覆盖 delta 新触及组合 |
| 7 | 增量幂等 | 未变更需求 → 零增量 |
| 8 | 可证伪 | Given/When/Then，无主观词 |
| 9 | 组合拳 | 按功能原型最小互补集，非堆砌 |
| 10 | 平台中立 | 无内部域名；git + CSP_GIT_REMOTE |

## 9. 与 PMS/CMS 的分支与协同

- **PMS → TMS**：TMS 继承 PMS 模块边界 + 验收形态；PMS 变更 → TMS 触发增量。
- **CMS → TMS**：增量用例入口维度 = CMS `entry-points.jsonl`；CR 读 CMS 追溯调用链。
- **TMS → CR**：CR 的"生成用例"读 TMS 存量，只输出增量（入口×状态新组合）。

## 10. 平台中立化

- 无内部域名 / 平台名 / 专有 API。
- 远程：`git` + `CSP_GIT_REMOTE`（默认 `github.com`）。
- 路径全部相对项目根，`CSP_PROJECT_ROOT` 参数化（默认 cwd）。
- 运行时纪律见 `../../references/module-spec-operational-protocol.md`。

## 11. 存量直通 vs 重新生成（存量/增量路由细化）

TMS 的"存量"有两种获取方式，**必须先判断**（不混用）：

| 输入形态 | 路由 | 行为 |
|---------|------|------|
| 命中已有页面/模块主干用例（TMS 直通） | **直通模式** | 搬运已沉淀的主干用例，**不重新走 LLM 生成**；交付时告知"这是已有主干用例"，避免误以为新生成 |
| 未命中主干 / 明确要新覆盖组合 | **生成模式** | 基于需求/设计 + CMS 入口维度，按入口×状态矩阵生成 |

- **判断准则**：先查 TMS 存量是否覆盖该入口×状态组合；命中 → 直通复用；未命中 → 增量生成。
- **禁止**把"直通主干"与"新生成"混为一谈 —— 直通不产增量，生成才产 delta。

## 12. 来源互斥（一次一个来源）

- 用例来源**互斥**：一次只接受一个来源（PRD / 设计文档 / 入口 / 页面描述），**禁止静默合并**。
- 多来源时先让用户选一个；后端一次只接受一个来源，静默合并可能执行错误目标。
- 环境配置（端型/平台/实验）不参与来源计数。

## 13. 知识库透传

- 若 `.csp/code-spec/{app}/knowledge-graph.json`（CMS 产物）存在且有效，用例生成/执行自动透传作为入口维度与调用链依据。
- 不存在或无效 → 静默跳过，不阻塞（退化为仅 PRD/设计驱动）。
- 透传的是 CMS 权威图，**不**让用例生成自己重新猜调用链。

## 14. 结构化失败与异步纪律

- 业务命令启用结构化错误：`errorCode` + `remediation` + `retryable`。
- **仅在 `retryable=true` 且 `remediation` 明确允许时**自动重试，**最多 1 次**。盲目重试可能产生重复用例/环境。
- **"已提交" ≠ "已完成"**：返回 `taskId` 时立即引导查询结果（`taskId` 异步），禁止把"已提交"表述为"已完成"。
- 失败/超时 → 展示脱敏失败摘要 + 可执行修复建议。

## 15. 输出契约（禁止二次加工）

- 工具已格式化的报告（含表格/链接/截图回放）→ **直接展示原文，禁止 LLM 重排**（重排破坏排版、丢字段）。
- 不向用户暴露命令名/参数名/token 等内部细节，只展示业务结果。
- 轮询退出码协议：`0=成功 / 2=失败 / 3=超时`；超时给环境链接让用户人工确认。
