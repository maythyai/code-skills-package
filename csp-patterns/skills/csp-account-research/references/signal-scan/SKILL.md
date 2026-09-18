---
name: signal-scan
description: 批量扫描 B2B 目标客户的公开信号并输出 A/B/C/信息缺失四级分层。在已有公司名单（数十到数百家）、需要为后续 L3 轻度调研锁定优先级范围时使用——按 13 维度（招聘、技术选型、高管动向、合作关系、增长态势等）逐家结构化评分，输出评分量表、分层分析报告与五层字段架构的 CSV。通常由 account-research orchestrator 调用，也可单独使用。触发：'扫描这批公司的 AI 采购信号'、'signal scan'、'信号扫描'。
---

# signal-scan — L2 信号扫描

## 角色定义

你是一位技术情报分析师，专注从公开信息中识别企业技术采购意图和 IT 投资信号。每个评分都必须有可追溯的证据来源。

## When to use

- 已有公司名单（数十到数百家），需要批量产出 A/B/C 分层
- 需要为后续 L3 轻度调研锁定优先级范围
- 由 account-research orchestrator 调度作为 Phase 2 执行

## When NOT to use

- 单家公司深度画像（用 depth-research）
- 还未确定行业边界 / 公司池来源（先用 account-research orchestrator 做 Phase 0）
- 仅做竞对单点分析（用 csp-strategy）
- orchestrator agent 自行模拟本 skill 的评分与分层（跳过五层字段架构 CSV、边界交叉校验、方法论自检，产物格式大概率不兼容下游）

## Required Inputs

1. 公司清单（名称列表 或 CSV）
2. 目标信号维度（默认用 13 维度标准模板）
3. 搜索语言（默认中英双语）
4. 分层阈值（默认：A ≥ 20，B = 12-19，C = 6-11，信息缺失 < 6）
5. 业务规模指标的行业口径（AUM / ARR / 营收 / 装机量 / 用户数，在 brief.json 中确认）

## 启动前校验门（brief.json）

执行任何搜索/评分动作之前，必须先读取上游 `.csp/account-research/state/<industry-slug>/brief.json` 并校验：

- 文件不存在 → 拒绝执行，提示用户：「请先调用 account-research orchestrator Phase 0 完成任务定义」
- 任一必填字段为空或为默认占位词 → 拒绝执行，退回 account-research orchestrator Phase 0
- `products` 字段为空或未经用户确认（缺 `source` / `core_scenarios`）→ 退回产品资料消化环节
- 未检测到用户「确认」启动确认单的记录 → 退回启动确认单环节

**必填字段清单**：`user_role` / `audience` / `depth` / `industry_name` / `products` / `execution_path`

校验通过后才允许进入下方执行流程。校验失败时不要尝试用默认值/行业常识自行补齐——这是反模式。

## 执行流程总览

| 步骤 | 动作 | 引用文档 |
|------|------|---------|
| 1 | 读取/校验公司名单（含工商名称校验） | [search-accuracy.md](./references/search-accuracy.md) |
| 2 | 按 13 维度模板逐公司搜索 | [signal-dimensions.md](./references/signal-dimensions.md) |
| 3 | 评分 + 边界公司交叉校验 | [scoring-and-ranking.md](./references/scoring-and-ranking.md) |
| 4 | 分层判定（A/B/C/信息缺失） | [scoring-and-ranking.md](./references/scoring-and-ranking.md) |
| 5 | 输出 CSV + Markdown 报告 | [data-schema-design.md](./references/data-schema-design.md) |
| 6 | 运行自检清单 | [quality-checklist.md](./references/quality-checklist.md) |

## 核心方法论模块

按需查阅。Agent 在对应场景必须读取相关模块。

| 模块 | 用途 | 触发场景 |
|-----|------|---------|
| [信号维度模板（13 维 + 8 子维度）](./references/signal-dimensions.md) | 评分骨架 + 矛盾信号解读 | 启动 L2 时必读 |
| [评分与分层规则](./references/scoring-and-ranking.md) | 总分计算、加权量化、因子权重排序 | 评分阶段 |
| [搜索准确性与异常名称处理](./references/search-accuracy.md) | 第 1/2 层搜索策略、跨信息源统一 | 搜索失败时 |
| [调研数据结构分层设计](./references/data-schema-design.md) | 五层字段架构 + CSV 输出规范 | 数据落盘前 |
| [反向验证完整协议](./references/reverse-validation.md) | 用 L4 实际结果校准权重 | 累积 10-20 家 L4 后 |
| [因子组合交叉分析](./references/factor-combination.md) | 多因子组合命中率、非线性效应 | 反向验证后 |
| [低透明度行业评估规范](./references/low-transparency-handling.md) | 双轨评估法 | 金融/军工等保密行业 |
| [信息时效性管理](./references/info-decay.md) | 信息有效期 + 时间戳标注 | 全流程 |
| [Anti-patterns](./references/anti-patterns.md) | SS-1 到 SS-10 反模式（必读） | 全流程 |
| [Quality Checklist](./references/quality-checklist.md) | L2 自检清单 | 每批完成时 |

## 质量规范

1. **每个维度评分必须有至少一条证据来源**（URL 或具体出处）
2. **未搜索到信息一律记 0 分**，不得推测（低透明度行业按双轨评估法处理）
3. **搜索必须覆盖中文 + 英文**
4. **同一公司的搜索时间窗口建议控制在近 2 年内**
5. **评分有争议时取保守值**
6. **所有证据必须标注查阅时间或发布时间**（参见 [info-decay.md](./references/info-decay.md)）
7. **每家公司至少使用 3 类独立信息源**
8. **边界公司（阈值 ±2 分）必须做二次搜索确认**
9. **重要判定至少需要 2 条独立来源支撑**：涉及 A/B/C 分层变动、竞对深度绑定判定时，单条 [I] 不足以作为主依据，必须有 ≥2 条来源独立的 [F] 或 [I] 证据交叉印证（来源独立 = 来源机构不同且报道角度不同，同一新闻被多家转引不算独立）

## 厂商列表与业务规模指标说明

- **竞对厂商**（D9）：默认值为空（由 brief.json 配置竞对厂商），可在 brief.json 中配置覆盖。全局竞对列表变更需用户确认；单家公司层面如果搜索到不在列表中的竞对厂商，直接如实记录，不需要修改全局列表
- **我方厂商**（D12）：默认值为空（由 brief.json 配置我方产品），可在 brief.json 中配置覆盖
- **业务规模指标**（D7、D7 子维度、信息时效矩阵）：默认 5 选 1——AUM（量化私募/资管）、ARR（SaaS）、营收（通用企业）、装机量（制造业）、用户数 DAU/MAU（互联网）；也支持用户自定义填写其他口径（如日单量、流水、策略容量等）。在 brief.json 中确认后写入。若 agent 在搜索中发现更合适的指标，必须向用户提议并等待确认后才能切换——确认后写入当前任务的 brief.json，不影响其他任务

## State management

> **CSV 编码强制**：本 skill 所有 CSV 产物（含 L2_全量信号扫描.csv）必须使用 `utf-8-sig`（UTF-8 with BOM），读入也用 `utf-8-sig`。详细规则见 根 SKILL.md「CSV 输出全局硬约束」段。

- 输入：上游 `docs/account-research/process-archive/L1_初始池.csv`（由 account-research orchestrator/Phase 1 产出）
- 中间产物：`docs/account-research/process-archive/L2_搜索过程_<batch>.md`（每批的搜索留痕）
- 输出：
  - `docs/account-research/process-archive/L2_全量信号扫描.csv`（按 [data-schema-design.md](./references/data-schema-design.md) 五层字段架构）
  - `docs/account-research/process-archive/L2_分层分析报告.md`
  - `docs/account-research/methodology/分层方法论评估.md`（方法论自检，输出到方法论目录）
- Phase 完成后：追加一条记录到 `CHANGELOG.md`

## Agent 必读流程

0. **启动前校验门**：读取并校验 `.csp/account-research/state/<industry-slug>/brief.json`（见上文「启动前校验门」段），任一项不通过立即退回 account-research orchestrator
1. 启动时先读本文件 + [signal-dimensions.md](./references/signal-dimensions.md) + [anti-patterns.md](./references/anti-patterns.md)
2. 搜索阶段遇到异常名称时读 [search-accuracy.md](./references/search-accuracy.md)
3. 评分阶段读 [scoring-and-ranking.md](./references/scoring-and-ranking.md)
4. 数据落盘前读 [data-schema-design.md](./references/data-schema-design.md)
5. 每批完成时执行 [quality-checklist.md](./references/quality-checklist.md)
