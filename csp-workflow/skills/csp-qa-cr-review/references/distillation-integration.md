# 蒸馏增强 — 调用链追溯

## 数据源

| 层 | 文件 | 用于增强维度 |
|----|------|-------------|
| L1 entry-points | entry-points.jsonl | 维度 1 影响范围（入口点清单） |
| L1 edges | edges.jsonl | 维度 1 调用链追溯 |
| L3 business | layer3-business.json | 变更方法的业务子域归属 |
| L4 side-effects | layer4-side-effects.json | 维度 1 下游影响评估 |
| L4 risks | layer4-risks.json | 风险等级预判 |
| glossary | glossary.md | 业务术语上下文 |

## 增量蒸馏触发

| 条件 | 动作 |
|------|------|
| 蒸馏存在 + 有 source branch | 调用 code-distillation 增量模式 |
| 蒸馏不存在 + 有 source branch | 先全量蒸馏 target，再增量 source |
| 蒸馏存在 + 无分支信息 | 直接使用现有产物 |
| 蒸馏不存在 + 无分支信息 | 走普通模式 |

增量蒸馏参数：
- `feature_branch` = CR source branch
- `base_branch` = CR target branch
- `repo_path` = 本地仓库路径
- `baseline_bundle_path` = 蒸馏产物目录

> 增量蒸馏失败时不阻塞主流程，降级使用现有产物并标注。

## 维度 1 增强命令（必须执行）

蒸馏模式的核心价值：发现**不在 diff 中但受变更影响的调用方**。

### 步骤

1. 从 diff 提取变更**方法名**列表

2. grep edges.jsonl 追溯所有 callers：
   ```bash
   grep -i "methodA\|methodB\|methodC" distillation/{app}/edges.jsonl | head -40
   ```
   `from` 字段的 node_id = 调用方

3. 查 entry-points.jsonl 确认外部入口：
   ```bash
   grep -E '"n12345"|"n67890"' distillation/{app}/entry-points.jsonl
   ```
   匹配到的 = HSF/HTTP/MQ/SchedulerX 外部入口

4. 识别不在 diff 中的 caller：
   - 将步骤 2 的 caller 文件路径与 `git diff --name-only` 对比
   - 不在 diff 中的 = 潜在遗漏适配点
   - 用 `git show` 或 grep 验证调用方式

5. 查 layer4-side-effects.json 获取下游副作用：
   ```bash
   grep -i "methodName" distillation/{app}/layer4-side-effects.json | head -10
   ```

6. 将蒸馏追溯发现的额外入口补充到功能入口清单，标注"蒸馏追溯发现"

> grep 无结果时降级到普通模式手工追溯。

## 大 CR 模式增强（Step 2-B）

- 用 L4 risks 的 risk_score 辅助判断文件风险等级
- 用 L3 business-modules 的 risk_level 标注子域风险

## 报告增强列

在输出报告的"变更点"表格中增加：
- **入口点**: 从 L1 entry-points 匹配的外部入口
- **业务影响**: 从 L3 business 获取的子域+中文名称
- **副作用**: 从 L4 side-effects 获取的 db-write/mq/throws 列表

## 比较指标

| 指标 | 普通模式 | 蒸馏模式 |
|------|---------|---------|
| 入口点发现数 | 手工追溯数 | L1 edges 追溯数 |
| 异步链路发现 | grep MQ consumer 数 | L1 edges MQ 数 |
| 影响范围准确度 | 人工判断 | 图谱确认+人工复核 |
| 评审总 token | 记录 | 记录 |
