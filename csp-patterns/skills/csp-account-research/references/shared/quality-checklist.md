# Quality Checklist（质量自检清单）

本清单在每个 Phase 结束时由 Agent 自动执行，并将检查结果写入 `progress.json` 的对应 Phase 节点。任一必检项未通过则不得标记该 Phase 为 confirmed=true。

## Phase 0 自检

- [ ] brief.json 已生成，5 项必填输入齐备（行业边界 / 初始公司池来源 / 我方产品列表 / 调研目标 / 术语表）
- [ ] 行业 IT 架构分层表已产出
- [ ] 行业信息源优先级评估已产出
- [ ] 行业保密文化评估已产出
- [ ] 行业 vs 通用企业 5 维差异画像已产出
- [ ] 市场进入壁垒五层评估已产出（参见 [市场进入壁垒五层](./market-entry-barriers.md)）
- [ ] 差异化定位三支点自检通过（参见 [差异化定位三支点](./differentiation-positioning.md)）
- [ ] 行业类型识别完成（A/B/C/D 型，参见 [行业类型适配](./industry-type-adaptation.md)）
- [ ] brief.json 校验通过：运行 `python account_research_toolkit.py validate-config --config <brief.json>` 输出 PASS

## Phase 0.5 自检（首次进入新行业必检）

- [ ] 验证样本 3-5 家覆盖大/中/小规模与不同细分
- [ ] 5 项有效性指标全部计算并记录
- [ ] 至少 4 项指标合格（信号命中率 ≥ 70%、核心维度获取率 ≥ 60% 等）
- [ ] 5 项调整决策已产出（维度增删 / 权重修正 / 搜索策略 / 阈值校准 / 时间预估）
- [ ] 问题根因已分类（输入端 / 方法论 / 行业结构性 / 工具端）
- [ ] 用户已确认验证报告并拍板"方法论可用"

## Phase 1 自检

- [ ] L1_pool.csv 字段完整（公司名称、业务规模指标、地域、成立时间等）
- [ ] 工商名称校验完成，不可定位条目已剔除并记录
- [ ] 快筛规则按 brief.json 中硬门槛执行
- [ ] TAM/SAM 初步估算已产出（参见 [市场规模分解](./market-sizing-tam-sam-som.md)）

## Phase 2 自检

- [ ] 全量公司均完成 L2 信号扫描
- [ ] A/B/C 分层判定标注证据来源
- [ ] 信息缺失公司已标注 `[信息缺失]`，未以推测填充
- [ ] 批次间评分一致性检查通过（参见 [批量评分一致性](./batch-scoring-consistency.md)）
- [ ] 用户已确认分层结果
- [ ] 证据标签配比达标：运行 `python account_research_toolkit.py stats-evidence --file <分层报告>` [E]≤20%
- [ ] 时间窗口合规：运行 `python account_research_toolkit.py check-temporal --file <分层报告> --config <brief.json>` 输出 PASS

## Phase 3 自检

- [ ] A 层 + B 层全部完成 L3 轻度调研
- [ ] 升降层判定记录"信号来源 + 判定时间"
- [ ] 初步产品匹配与竞对关系初判已产出
- [ ] 信息源覆盖 ≥ 3 类（招聘 / 技术博客 / 采购公告 / 行业媒体等）
- [ ] 用户已确认升降层结果

## Phase 4 自检

- [ ] 最终 A 层全部完成 L4 深度调研
- [ ] 决策链识别覆盖关键岗位
- [ ] 采购周期与攻坚路径有证据支撑
- [ ] 证据强度标签（[F]/[I]/[A]/[E]）填充率 ≥ 80%
- [ ] 第一梯队 TOP 5-8 家与其余 A 层均覆盖
- [ ] 用户已确认 TOP 名单
- [ ] 跨文档去重检查：运行 `python account_research_toolkit.py check-dedup --dir <交付物目录>` 输出 PASS

### L4 深度调研抽检验证

每家 L4 画像完成后，从 20 维度画像中随机抽取 3 条 [F] 标签信息，重新独立搜索确认存在性：

| 检查项 | 通过条件 |
|--------|---------|
| 抽检验证已执行 | 至少 3 条 [F] 信息经独立搜索确认存在 |
| 引用断链为零 | 抽检中无"搜索不到"的 [F] 信息（若有，须补搜后修正）|

## Phase 5 自检

- [ ] 作战手册、高管摘要、产品匹配矩阵三件齐备
- [ ] 所有结论可追溯到具体证据
- [ ] 产品名称合规性检查通过（无禁用模糊称谓）
- [ ] 跨 Phase 数据版本一致（参见 [跨 Skill 数据传递](./cross-skill-data-handoff.md)）

## 全流程通用自检（每 Phase 末尾运行）

- [ ] progress.json 已更新当前 Phase 状态
- [ ] 当前 Phase 产物路径在 progress.json 中正确登记
- [ ] 未触发任何反模式（参见 [Anti-patterns](./anti-patterns.md)）
- [ ] 异常情况（API 限流 / 名单错误 / 信息缺失）已记录在 `progress.json.issues[]`

### 脚本辅助自检（可选）

以下命令可辅助上述手动自检，环境可用时推荐执行：

| Phase | 推荐命令 |
|-------|---------|
| Phase 0 | `account_research_toolkit.py validate-brief --path ...` |
| Phase 2 | `account_research_toolkit.py tally-layers --csv ... --threshold-a ... --threshold-b ...` |
| Phase 2-5 | `account_research_toolkit.py gate-check --progress ... --target-phase ...` |
| Phase 3-4 | `account_research_toolkit.py evidence-ratio --file <L3/L4报告.md>` |
| Phase 3-4 | `account_research_toolkit.py dual-source-check --file <L3/L4报告.md>` |
| Phase 5 | `account_research_toolkit.py check-consistency --workspace ...` |
| Phase 5 | `account_research_toolkit.py check-naming --workspace ... --brief ...` |
| Phase 5 | `account_research_toolkit.py dedup-check --file <D1/D2/D4等交付物.md>` |
| 每 Phase | `account_research_toolkit.py update-progress --progress ... --phase ... --status ... --products ...` |
| 每 Phase | `account_research_toolkit.py changelog-append --changelog ... --phase ... --name ... --products ...` |

脚本校验仅覆盖结构性问题（字段缺失 / 数字不一致 / 名称违规），内容质量（证据可靠性 / 分析合理性）仍需 Agent 按上方 checkbox 自检。
