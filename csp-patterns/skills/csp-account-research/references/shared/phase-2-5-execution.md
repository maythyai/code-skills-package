# Phase 2-5：执行规则与编排约束

主编排在 Phase 0/0.5/1 完成后，按本文规则调度子 skill 完成 L2-L5 的批量执行。

## Phase 2：L2 信号扫描（调用 signal-scan）

### Phase 2 启动规则提醒（进入执行前必须输出）

Agent 在开始 L2 扫描前，必须在对话中输出以下提醒（无需用户确认）：

```
[Phase 2 规则提醒]
1. 评分持久化：每家评完立即 append-score 落盘，不积压内存
2. 逐家隔离：不引用前序公司搜索原文
3. 批次快照：每批完成后 save-batch-snapshot
4. 反向证伪：A/B 边界公司必须搜索竞对绑定/自研证据
开始执行 Phase 2。
```

- **执行范围**：L1 池中所有通过快筛的公司
- **执行方式**：结构化信号搜索（招聘信号、技术博客、采购公告、合作新闻、专利等）
- **输出要求**：每家公司的信号评分 + A/B/C 分层判定
  - A 层：高价值高成熟度，优先攻坚
  - B 层：有潜力待验证
  - C 层：信号弱或不匹配，暂搁置
- **公司名校正**：当目标公司搜索结果不命中或跨源不一致时，不仅执行 OCR 纠错（同音/形近字），还需检查是否为「名称合并误用」——即输入的公司名是由两家不同公司的名字拼合而成或张冠李戴（如将公募经理名+另一家私募名合成一个不存在的客户名）。发现名称错误时：① 标题改为正确公司名并备注原名；② 保留原始画像数据不擅自删除；③ 在卡片末尾加 `⚠️ 名称校正说明` 行注明纠错依据

### 评分持久化（推荐执行，非强制）

每家公司 L2 评分完成后，立即调用脚本写盘，避免评分积压在内存中：

```bash
python <skill_dir>/references/account_research_toolkit.py append-score \
  --csv .csp/account-research/state/<slug>/docs/account-research/process-archive/L2_全量信号扫描.csv \
  --company "<公司名>" --score <分数> --layer <A/B/C> \
  --batch <批次号> --evidence "<证据摘要>"
```

全量 L2 完成后，执行统计命令获取分层数字（用于人工确认展示）：

```bash
python <skill_dir>/references/account_research_toolkit.py tally-layers \
  --csv .csp/account-research/state/<slug>/docs/account-research/process-archive/L2_全量信号扫描.csv \
  --threshold-a <A层阈值> --threshold-b <B层阈值>
```

输出的 JSON 数字直接用于分层报告和后续 D2/D4 引用，确保全局数字一致。
若 Python 环境不可用，Agent 手动维护 CSV 并人工计数。

### 批次快照保存（推荐执行，非强制）

每个批次的 L2 评分全部完成后，调用脚本保存批次快照：

```bash
python <skill_dir>/references/account_research_toolkit.py save-batch-snapshot \
  --csv .csp/account-research/state/<slug>/docs/account-research/process-archive/L2_全量信号扫描.csv \
  --batch <当前批次号> \
  --output .csp/account-research/state/<slug>/docs/account-research/process-archive/batch_snapshots/batch_<N>_snapshot.json
```

下一批次开始前，调用漂移检测：

```bash
python <skill_dir>/references/account_research_toolkit.py check-batch-drift \
  --prev-snapshot .csp/account-research/state/<slug>/docs/account-research/process-archive/batch_snapshots/batch_<上批次号>_snapshot.json \
  --curr-csv .csp/account-research/state/<slug>/docs/account-research/process-archive/L2_全量信号扫描.csv \
  --tolerance 1.0
```

- 输出 PASS → 继续执行
- 输出 WARN → 标注"偏差已知"继续执行，在分层报告中注明
- 输出 FAIL → 暂停执行，向用户报告漂移情况，等待指示

若 Python 环境不可用，跳过自动化检测，退回第 1-3 层人工对标机制。

### 批次后期强制减速（L1 池 ≥ 30 家时生效）

当 L2 扫描的公司数量 ≥ 30 家时，为防止批量处理后期的注意力退化和评分标准松弛，执行以下减速规则：

**减速触发点**：第 20 家之后，每完成 5 家暂停一次（即第 25、30、35... 家后暂停）

**暂停时执行内容**：
1. 回顾标准样本（从 batch_snapshots 中读取第 1 批次的 calibration_samples）
2. 对标准样本重新快速评估核心维度（仅用已有知识，不重新搜索）
3. 对比当前评分感觉与标准样本的分数是否一致
4. 如发现"如果现在重打这家标准样本，会给不同分数"→ 触发漂移预警，暂停后续执行，向用户报告

**暂停输出格式**：
```
批次减速检查点（已完成 N 家）：
- 标准样本回顾：<样本公司名> 原分 X 分 / 当前感觉 Y 分
- 一致性判定：一致 / 轻微偏差 / 显著偏差
- 操作：继续执行 / 暂停等待用户指示
```

**与批次快照的配合**：
- 减速暂停时同步保存当前批次快照（save-batch-snapshot）
- 如触发漂移预警，同时运行 check-batch-drift 获取量化偏差数据

若 L1 池 < 30 家，此规则不触发（小规模扫描注意力退化风险低）。

### 搜索结果落盘与逐家隔离（防幻觉强制规则）

**搜索结果落盘**：L2 扫描中每次 WebSearch/WebFetch 调用返回后，将原始片段以 JSON 追加到：
`.csp/account-research/state/<slug>/docs/account-research/process-archive/search_evidence/L2_batch<N>_<公司名>.json`

格式：
```json
{
  "company": "<公司名>",
  "dimension": "<评分维度>",
  "search_query": "<搜索词>",
  "timestamp": "<搜索时间>",
  "results": [{"title": "...", "snippet": "<前200字>", "url": "...", "date": "..."}]
}
```

**逐家上下文隔离**：每完成一家公司的评分并通过 append-score 落盘后，后续公司的搜索中不得引用前序公司的搜索原文。目的是防止跨公司信息串台。
- 可引用：brief.json（配置）、已落盘的 CSV 评分结论、标准样本
- 不可引用：其他公司的 search_evidence 原始片段

- **强制人工确认节点**：分层结果预览，用户确认后进入 Phase 3
- **产物**：`L2_scan/全量信号扫描.csv`、`L2_scan/分层分析报告.md`

### 安全阈值流水线（Phase 2→3 加速机制）

当 L1 池规模 ≥ 30 家时，启用安全阈值流水线，允许"硬 A"公司提前进入 L3：

**硬 A 定义**：L2 评分 ≥ A 层阈值 + 2 分（默认阈值 20 分，则硬 A ≥ 22 分）

**执行流程**：

1. L2 按批次（7-8 家/批）顺序执行
2. 每批完成后，识别该批中的"硬 A"公司（≥22 分）
3. 当累计硬 A 公司 ≥ 3 家时，向用户发起**中间确认**：
   - 展示硬 A 公司列表 + 各自分数
   - 说明："这几家公司得分远超分层阈值，建议先行启动轻度调研以节约总体时间。剩余公司的 L2 扫描同步继续。"
   - 用户确认后，这些公司立即进入 L3 轻度调研
4. L2 剩余批次继续执行，每批新产生的硬 A 公司自动加入 L3 队列（无需再次确认）
5. 全量 L2 完成后，执行标准分层确认（含边界公司分类），剩余 A/B 层公司进入 L3

**边界公司处理**：
- 得分在 A 层阈值 ± 2 分范围内（18-22 分）的公司为"边界公司"
- 边界公司必须等全量 L2 完成 + 全局一致性校验通过后，才做最终分层判定
- 禁止将边界公司提前推入 L3

**不启用条件**：
- L1 池规模 < 30 家时，不启用流水线（串行代价可接受，无需引入复杂度）
- 用户在中间确认时可选"不提前，等全部做完再说"——此时退回标准串行模式

**进度记录**：
- progress.json 中增加 `phase_2.pipeline_enabled: true/false`
- progress.json 中增加 `phase_2.early_l3_companies: ["公司A", "公司B", ...]`
 早期进入 L3 的公司在其 L3 报告中标注 `[基于 L2 批次 N，非全量完成]`

### 批次评分基准提醒（防止长会话规则遗忘）

L2 扫描超过 3 批时，每个新批次开始前，Agent 必须先输出一段**评分基准提醒**（不超过 300 字），内容包括：

1. 本次调研的 A 层阈值（从 brief.json 读取，不要硬编码）
2. 证据标签体系一句话版：[F]=官方直接证据 / [I]=间接推断 / [A]=类比推断 / [E]=信息缺失
3. 当前标准样本的核心打分理由（从第 1 批锁定的标准样本中提取 2-3 条关键判定）
4. 上一批次的均分和 A 层命中数（用于自检是否出现漂移）

**执行方式**：Agent 在开始新批次搜索前，先在对话中输出这段提醒（无需用户确认），然后立即进入搜索。这确保评分标准始终处于上下文的"新鲜区域"。

**不适用场景**：L2 总批次 ≤ 3 时不强制输出（上下文尚未拥挤）。

## Phase 3：L3 轻度调研（调用 depth-research，模式=轻度）

### Phase 3 启动规则提醒（进入执行前必须输出）

```
[Phase 3 规则提醒]
1. 升降层信号识别：发现触发词必须执行升降层判定
2. 证据标签配比：[F]+[I]+[A] ≥ 80%，[E] ≤ 20%
3. 搜索结果落盘：每次搜索立即写入 search_evidence/
4. L3 五问必须逐问回答，不可跳问
开始执行 Phase 3。
```

- **执行范围**：A 层 + B 层公司（若启用了安全阈值流水线，硬 A 公司可能已在 Phase 2 过程中提前开始 L3）
- **执行策略**：按业务规模指标（AUM/ARR/营收/装机量等，按行业代入）从大到小排序，分批并行（每批 7-8 家）
- **输出要求**：升降层判定（B→A、A→B、A→C 等）、初步产品匹配、竞对关系初判
- **强制人工确认节点**：升降层结果，用户确认后进入 Phase 4
- **产物**：`L3_research/A层轻度调研.md`、`L3_research/B层轻度调研.md`、`L3_research/升降层判定.md`

## Phase 4：L4 深度调研（调用 depth-research，模式=深度）

### Phase 4 启动规则提醒（进入执行前必须输出）

```
[Phase 4 规则提醒]
1. 20 维度画像填充率 ≥ 80%（至少 16 维度有实质内容）
2. [E] 标签 ≤ 20%，超标必须补搜
3. 联系方式反编造：按 contact-whitelist 四级白名单采集，搜不到标 [需人工核实]
4. 搜索结果逐条落盘至 search_evidence/
开始执行 Phase 4。
```

- **执行范围**：仅最终 A 层公司
- **执行策略**：两线并行
  - 第一梯队（TOP 5-8 家）先行深度挖掘
  - 其余 A 层公司分批跟进
- **输出要求**：完整技术栈画像、决策链识别、采购周期、攻坚路径
- **强制人工确认节点**：TOP 名单确认
- **产物**：`L4_deep/深度调研报告.md`、`L4_deep/对比分析.md`

## Phase 5：交付物生成（调用 deliverable）

### Phase 5 启动规则提醒（进入执行前必须输出）

```
[Phase 5 规则提醒]
1. 交付准备度自检：先检查 L4 覆盖率/必含模块数据/联系方式，展示给用户确认
2. 必含章节不可跳过：第〇部分（使用须知）+ 第一部分（行业速览+产品匹配）为硬性必含
3. 术语净化：01/02 目录交付物禁止内部过程术语（L2总分/Phase编号/升层等）
4. 先出大纲后写正文：生成前输出章节大纲供用户确认
开始执行 Phase 5。
```

- **执行范围**：基于前四层全部数据
- **输出要求**：作战手册、高管摘要、产品匹配矩阵等 D1-D8 交付物
- **调用方式**：通过 Skill 工具调用 deliverable。若自行生成，需逐项自检 12 条目录/格式/内容规范（含七块使用须知、CSV BOM 编码、CHANGELOG 自动更新、跨文档一致性等），预计额外耗时与返工风险远高于直接调用 skill
- **产物**：`docs/account-research/battle-handbook/客户攻坚作战手册.md`、`docs/account-research/battle-handbook/supporting/公司全景表.csv`、`docs/account-research/decision-support/高管摘要.md`、`docs/account-research/decision-support/supporting/产品场景匹配矩阵.md`、`docs/account-research/decision-support/supporting/行业市场洞察.md`、`docs/account-research/decision-support/supporting/高潜力客户特征模型.md`、`docs/account-research/decision-support/supporting/风险矩阵与核心假设.md`、`docs/account-research/decision-support/supporting/行动路线图.md`、`CHANGELOG.md`、`README.md`

### 交付准备度自检（进入 deliverable 前强制执行）

调用 deliverable 前，orchestrator 必须自动完成以下 3 项检查并向用户展示结果，用户确认"继续生成"后才正式调用：

**检查 1：L4 覆盖率**
- 读取 progress.json 中 Phase 4 的 `completed_companies` 列表
- 对照 TOP 攻坚名单，列出已完成/未完成 L4 的公司
- 展示格式：`L4 覆盖率：X/Y 家已完成（列出未完成的公司名）`

**检查 2：必含模块数据充分度**
- 行业速览：检查是否存在 D4 行业市场洞察文件，或过程档案中有行业 TAM/SAM 相关搜索结果
- 产品匹配：检查 brief.json 中 `products` 字段每个产品是否有 `core_scenarios`
- 客户分层：检查 L2 分层 CSV 是否存在且非空
- 展示格式：逐项标注"已就绪"或"缺失——需要补充 XXX"

**检查 3：联系方式覆盖率**
- 检查 TOP 名单中各公司是否已有联系方式数据（从 L4 画像或 contact-whitelist 采集结果中查找）
- 展示格式：`联系方式覆盖：X/Y 家已有基础联系信息`

**展示后等待用户确认**：
```
交付准备度检查完成：
- L4 覆盖率：X/Y
- 必含模块数据：行业速览[已就绪/缺失] / 产品匹配[已就绪/缺失] / 分层数据[已就绪/缺失]
- 联系方式：X/Y

是否继续生成交付物？（如有缺失项，生成后对应章节将标注"数据不完整"）
```

用户确认后，调用 deliverable 执行 Phase 5。

## 编排核心规则

1. **进度留痕**：每个 Phase 完成后更新 `.csp/account-research/state/<industry-slug>/progress.json`，记录完成时间、产物路径、人工确认状态
2. **严格依赖**：Phase 之间不可跳步——L3 依赖 L2 分层结果，L4 依赖 L3 升降层结果，L5 依赖 L4 深度数据
3. **Phase 内并行**：L3 分批执行、L4 两线并行，提升执行效率
4. **质量关卡**：每层输出必须通过证据链检查，无证据的结论一律标注 `[信息缺失]` 或 `[待验证]`，不得以推测填充
5. **暂时性故障重试**：搜索超时、API 限流、网络中断等暂时性故障，执行以下重试策略后才可标注 [E]：
   - 第 1 次失败：等待 5 秒后换关键词变体重试
   - 第 2 次失败：等待 15 秒后切换搜索引擎/数据源重试
   - 第 3 次失败：标注 `[E-暂时性故障]` 并记录失败原因，该维度不参与本批次总分计算
   - 注意：此规则仅适用于"搜索工具本身报错"的情况。如果搜索正常返回但未找到相关信息，直接标注 `[E]` 并计 0 分——信息缺失就是信息缺失，不重试

## Phase 前置条件门禁（Gate）

每个 Phase 启动前必须通过以下门禁校验，任一未通过则不得进入该 Phase。

| Phase | 门禁条件 | 校验方式 |
|-------|---------|---------|
| Phase 0.5 | brief.json 已写入且通过用户确认；行业快速画像 4 项产物齐备 | 文件存在 + progress.json 中 phase_0.confirmed=true |
| Phase 1 | 方法论验证报告通过且合格指标≥4 项 | progress.json 中 phase_0.5.passed=true |
| Phase 2 | L1_pool.csv 存在且工商名称校验完成；剔除条目占比记录在案 | 文件存在 + 字段完整 + progress.json 中 phase_1.name_verified=true |
| Phase 3 | L2 分层结果用户已确认；A 层与 B 层数量记录在案 | progress.json 中 phase_2.confirmed=true |
| Phase 4 | L3 升降层判定用户已确认；最终 A 层名单冻结 | progress.json 中 phase_3.confirmed=true |
| Phase 5 | L4 深度调研产物齐备；TOP 名单用户已确认 | progress.json 中 phase_4.confirmed=true |

**脚本辅助门禁**（推荐执行，非强制）：
每个 Phase 启动前可执行自动门禁校验：
```bash
python <skill_dir>/references/account_research_toolkit.py gate-check \
  --progress .csp/account-research/state/<slug>/progress.json --target-phase <目标Phase编号>
```
脚本会按上表规则逐项检查 progress.json，输出 PASS 或 FAIL + 未满足条件。若环境不可用，Agent 按表格手动检查。

**门禁失败处置**：在主对话中明确告知用户缺失项，**不得**绕过门禁继续执行。

## Resume from intermediate（从中间产物恢复）

支持任务在任意 Phase 中断后从最近的产物恢复执行。

**恢复触发**：用户口令"继续上次的调研"、"resume" 或主动指定行业 slug。

**恢复流程**：

1. 读取 `.csp/account-research/state/<industry-slug>/progress.json`，定位最近完成的 Phase
2. 校验该 Phase 的产物完整性（文件存在、字段完整、记录数与计数器一致）
3. 列出"已完成 Phase / 待执行 Phase / 异常项"三块状态供用户审阅
4. 用户确认后从下一个未完成 Phase 启动；若校验失败则提示需要先修复或重做该 Phase
5. 恢复执行时不得重置已通过的人工确认节点

**异常情况处置**：

| 情况 | 处置 |
|-----|------|
| progress.json 缺失 | 提示用户重新启动 Phase 0，或人工补齐 progress.json |
| 某 Phase 标记完成但产物缺失 | 视为该 Phase 未完成，回退状态后重新执行 |
| 产物存在但格式不符合下游要求 | 触发上游 Phase 重做，不得让下游"带伤前进" |
