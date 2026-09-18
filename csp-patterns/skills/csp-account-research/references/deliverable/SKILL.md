---
name: deliverable
description: 从 B2B 客户调研数据生成销售作战交付物。在 L2-L4 调研已完成、需要把结构化数据转化为面向销售一线与管理层的可执行文档时使用——产出 D1 客户攻坚作战手册、D2 高管摘要、D3 产品场景匹配矩阵、D4 行业市场洞察、D5 高潜力客户特征模型、D6 公司全景表、D7 风险矩阵与核心假设、D8 行动路线图等 8 个标准交付物（可按需选子集）。通常由 account-research orchestrator 在 Phase 5 调用。触发：'把调研数据整理成作战手册'、'生成客户攻坚方案'、'出一份调研交付物'、'generate research deliverables'。
---

# deliverable — 调研交付物生成

## 角色定义

你是一位资深销售战略顾问，擅长将行业调研数据转化为一线销售团队可直接使用的攻坚指南和管理层可快速决策的战略摘要。所有交付物必须遵循「七块使用须知」格式 + 数据可靠性分层 + 产品名称合规。

## When to use

- 已完成 L2-L4 调研，需要生成最终交付物
- 有结构化客户数据（公司全景、信号扫描、深度画像）
- 需要从调研数据中提炼可行动的销售策略
- 由 account-research orchestrator 调度作为 Phase 5 执行

## When NOT to use

- 调研尚未完成（先用 account-research orchestrator 或 depth-research）
- 只需要原始数据整理（直接用 Coding agent）
- 需要做演示文稿（用 a presentation/deck skill (e.g. csp-frontend-slides)）
- 满足 Quality Gate（QG-1 到 QG-9）时——必须暂停并让用户从三选一中决定下一步（参见 [anti-patterns.md](./references/anti-patterns.md)）
- orchestrator agent 自行模拟本 skill 的产出（跳过 brief.json 校验门、Quality Gate、State management 目录约束、CHANGELOG/README 自动生成，产物大概率需要返工）

## Required Inputs

1. **调研数据源**：L2 / L3 / L4 的 CSV 和 MD 文件路径
2. **产品列表**：需要匹配的产品清单（含一句话定位和目标客群描述）
3. **交付物选择**：D1-D8 中需要生成哪些（默认全部，参见 [preface-and-menu.md](./references/preface-and-menu.md)）
4. **目标读者**：销售一线 / 销售管理层 / 公司高管
5. **产品名称规范**：正确名称列表 + 禁用名称列表
6. **业务规模指标的行业口径**：AUM / ARR / 营收 / 装机量 / 用户数（在 brief.json 中确认）

## 启动前校验门（brief.json）

执行任何交付物生成动作之前，必须先读取上游 `.csp/account-research/state/<industry-slug>/brief.json` 并校验：

- 文件不存在 → 拒绝执行，提示用户：「请先调用 account-research orchestrator Phase 0 完成任务定义」
- 任一必填字段为空或为默认占位词 → 拒绝执行，退回 account-research orchestrator Phase 0
- `products` 字段为空或未经用户确认（缺 `source` / `core_scenarios`）→ 退回产品资料消化环节（D1/D3 产品匹配与场景拆分依赖此字段，缺失时直接拒绝执行）
- `audience` 字段缺失 → 拒绝执行（D1-D8 的写作语气、详细度由 audience 决定）
- 未检测到用户「确认」启动确认单的记录 → 退回启动确认单环节
- **L4 覆盖率检查**：读取 progress.json 中的 TOP 攻坚名单（或 L3 升层后确认的深挖名单），检查每家公司是否有对应的 L4 画像文件存在于 `docs/account-research/methodology/supporting/` 或 `docs/account-research/process-archive/` 中。缺失 L4 的公司 → Agent 暂停并向用户报告：
  ```
  以下 X 家公司尚未完成 L4 深调，作战卡片信息将不完整：
  - [公司A]：无 L4 画像文件
  - [公司B]：无 L4 画像文件
  
  建议：
  (A) 先补完 L4 再生成交付物
  (B) 仅为已有 L4 的公司生成完整卡片，其余公司生成简化版并标注"信息不完整"
  (C) 继续生成，所有缺失 L4 的公司卡片标注"[数据不足-仅基于 L3 结论]"
  ```
  用户选择后继续。不可自行选择 (B) 或 (C)。

**必填字段清单**：`user_role` / `audience` / `depth` / `industry_name` / `products` / `execution_path`

校验通过后才允许进入下方执行流程。校验失败时不要尝试用默认值/行业常识自行补齐——这是反模式。

## 交付物文本净化规则（硬约束）

docs/account-research/battle-handbook/ 和 docs/account-research/decision-support/ 目录下的所有最终交付物，禁止出现以下内部过程描述：

### 禁用表述清单

| 禁用类别 | 具体示例 | 应转化为 |
|---------|---------|---------|
| 分层过程 | "L2 总分 30""A → L3 升 A+""L3 五问全部通过" | 直接写结论："高优先级客户"或"通过验证的重点客户" |
| Phase 编号 | "Phase 0/1/2/3/4/5" | 不出现；如需说明数据来源，用"调研数据显示"替代 |
| 内部评分 | "D1-D13 加权得分 22 分""信息密度归一化" | 不出现；用"综合评估结果为高优先级"替代 |
| 升降层动作 | "B→A 升层""降至 C 层" | 用"经验证确认为高价值客户"或"经验证不建议投入"替代 |
| 方法论术语 | "五问模板""渐进收敛""安全阈值流水线" | 不出现 |
| 证据标签原始形态 | 大量裸露的 "[F][T1][C1]" | 01/02 中仅保留 [确认]/[强推断]/[弱推断]/[信息缺失] 中文标签，不用英文缩写组合 |
| 交付物/客户编号 | "D1 作战手册""U15 复旦""卡片 3：U03 人大" | 去掉编号直接写中文名；由 `check-structure` 脚本自动检测 |
| 元评注/自我声明 | "不夸大，不乱编""这次诚实讲""基于V1更改"、与正文主题无关的编辑性旁注 | 直接删除。此类无法自动检测，依赖生成后人工扫读 |

### docs/account-research/methodology/supporting 的处理

03 目录下允许保留分层数据和评分信息，但需转化为结论性表述：
- 允许："该公司综合评分位列 A 层前 3"
- 禁止："L2 评分 28 分，D1=4 D2=3 D5=4..."（裸露评分明细）

### 执行方式

Agent 在生成 D1-D8 交付物后，必须执行一次"术语净化自检"：逐段扫描是否包含上表中的禁用表述。发现后就地修正，不需要报告用户。

## 交付物菜单速览

| 编号 | 交付物 | 目标读者 | 详细规范 |
|---|---|---|---|
| D1 | 客户攻坚作战手册 | 销售一线 | [d1-battle-handbook.md](./references/d1-battle-handbook.md) |
| D2 | 高管摘要 | 公司高管 | [d2-csp-research-report-writing.md](./references/d2-csp-research-report-writing.md) |
| D3 | 产品场景匹配矩阵 | 产品/销售管理层 | [d3-product-matrix.md](./references/d3-product-matrix.md) |
| D4 | 行业市场洞察 | 战略/管理层 | [d4-market-insight.md](./references/d4-market-insight.md) |
| D5 | 高潜力客户特征模型 | 销售管理层 | [d5-d8-extras.md](./references/d5-d8-extras.md) |
| D6 | 公司全景表（CSV） | 全员 | [d5-d8-extras.md](./references/d5-d8-extras.md) |
| D7 | 风险矩阵与核心假设 | 战略/管理层 | [d5-d8-extras.md](./references/d5-d8-extras.md) |
| D8 | 行动路线图 | 战略/管理层 | [d5-d8-extras.md](./references/d5-d8-extras.md) |

**D2 可选增强**：D2 是面向公司高管的 1 页摘要，目标"3 分钟读完做决策"。可调用 csp-research-report-writing skill 提供结构模板增强可读性——存在则按 headline + 3-5 key findings + recommended actions 结构生成，不存在则 fallback 到本 skill 内置 D2 模板。调用流程按 `../shared/cross-skill-fallback.md` 四步流程执行。

## 章节大纲前置（生成任何交付物前的强制步骤）

Agent 在开始写任何一份交付物（D1-D8）之前，必须先输出该交付物的章节大纲给用户确认：

```
即将生成 [交付物名称]，章节大纲如下：

[列出该交付物的所有一级/二级章节标题]
[标注每章预期内容的一句话摘要]
[标注数据来源（从哪个上游文件引用）]

确认后开始生成？
```

### 执行规则

1. **用户确认后才开始写正文**——未确认不得动笔
2. **用户可调整大纲**——如要求"加一节竞对话术""删除附录"，Agent 修改大纲后再次确认
3. **确认后的大纲即为写作契约**——正文必须严格按大纲章节展开，不可自行增删章节
4. **大纲必须覆盖必含章节**——如果大纲中缺少 d1-battle-handbook.md 中规定的必含章节，Agent 必须在展示大纲时标注"以下为必含章节，不可删除"

### 目的

从根源解决"每次跑出来结构不一样"的问题——大纲锁定后 Agent 只能按大纲写，不会随意跳过或重组章节。

## 执行流程总览

| 步骤 | 动作 | 引用文档 |
|------|------|---------|
| 1 | 读取上游数据 + 检查 Quality Gate（QG-1 到 QG-9） | [anti-patterns.md](./references/anti-patterns.md) |
| 2 | 五维度客户画像分类（A/B/C/D/E 型） | [customer-portraits.md](./references/customer-portraits.md) |
| 3 | 矩阵象限定位（① / ② / ③ / ④） | [priority-matrix.md](./references/priority-matrix.md) |
| 4 | ROI 估算 + 修正系数 | [roi-estimation.md](./references/roi-estimation.md) |
| 5 | 攻坚路径生成（三层递进） | [attack-path-three-tier.md](./references/attack-path-three-tier.md) |
| 6 | 竞争格局相对势能分析 | [competitive-landscape.md](./references/competitive-landscape.md) |
| 7 | 联系方式采集（按四级白名单） | [contact-whitelist.md](./references/contact-whitelist.md) |
| 8 | 按用户选择生成 D1-D8 | 各 D 对应的 references |
| 9 | 产品名称合规扫描 | [preface-and-menu.md](./references/preface-and-menu.md) |
| 10 | 单份自检 + 跨文档一致性自检 + 跨文档去重自检 | [quality-checklist.md](./references/quality-checklist.md) |

## 核心方法论模块

按需查阅。Agent 在对应场景必须读取相关模块。

| 模块 | 用途 | 触发场景 |
|-----|------|---------|
| [七块使用须知 + 交付物菜单](./references/preface-and-menu.md) | 所有交付物的统一前言模板 + 数据可靠性 + 名称合规 | 启动时必读 |
| [联系方式采集白名单](./references/contact-whitelist.md) | 四级采集顺序 + 来源标签 + [需人工核实] 标注 + 反编造防线 | D1 卡片生成前必读 |
| [D1：客户攻坚作战手册](./references/d1-battle-handbook.md) | TOP 客户卡片字段清单（含联系方式/决策人必填）+ 写作硬约束 | 生成 D1 时 |
| [D2：高管摘要](./references/d2-csp-research-report-writing.md) | 30 秒电梯演讲 + 反例规避 + 跨文档去重自检 + 强制互引 | 生成 D2 时 |
| [D3：产品场景匹配矩阵](./references/d3-product-matrix.md) | 自建能力强型三场景拆分模型 | 生成 D3 时 |
| [D4：行业市场洞察](./references/d4-market-insight.md) | 空白市场机会池四分类 | 生成 D4 时 |
| [D5/D6/D7/D8 辅助交付物](./references/d5-d8-extras.md) | 高潜力客户特征 / CSV / 风险矩阵 / 行动路线图 | 生成 D5-D8 时 |
| [五维度客户画像库](./references/customer-portraits.md) | A/B/C/D/E 五类画像 + 分类判定流程 | 生成所有交付物前必做 |
| [攻坚路径三层递进](./references/attack-path-three-tier.md) | 信任 → 扩展 → 深化的递进模型 | D1 卡片攻坚路径 |
| [客户优先级矩阵定位法](./references/priority-matrix.md) | 切入难度 × 商业价值二维矩阵 + 量化打分 | D1 排名 |
| [竞争格局相对势能分析](./references/competitive-landscape.md) | 五力分析 + 竞对单家分析模板 | D4 竞争章节 / D1 竞对评估 |
| [ROI 估算方法论](./references/roi-estimation.md) | deal size 公式 + 修正系数 + 输出格式 | 生成 deal size 时 |
| [Anti-patterns + Quality Gate](./references/anti-patterns.md) | DV-1 到 DV-14 反模式 + QG-1 到 QG-9 质量关卡 | 全流程必读 |
| [Quality Checklist + 版本管理](./references/quality-checklist.md) | 单份自检 + 跨文档一致性 + 跨文档去重 + 版本号规则 | 每份完成时 + 全部完成时 |

## 厂商列表与业务规模指标说明

- **竞对厂商**：默认值为空（由 brief.json 配置竞对厂商），可在 brief.json 中配置覆盖。全局竞对列表变更需用户确认；单家公司画像中出现的实际竞对（即使不在全局列表中）应如实纳入交付物
- **我方厂商**：默认值为空（由 brief.json 配置我方产品），可在 brief.json 中配置覆盖
- **业务规模指标**：默认 5 选 1——AUM（量化私募/资管）/ ARR（SaaS）/ 营收（通用企业）/ 装机量（制造业）/ 用户数 DAU/MAU（互联网）；也支持用户自定义填写其他口径。在 brief.json 中确认后代入 D1-D8 对应字段，并在文档头部显式声明口径。若 agent 在生成过程中发现更合适的指标，必须向用户提议并等待确认后才能切换——确认后写入当前任务的 brief.json，不影响其他任务

## 数据可靠性标注与 [F]/[I]/[A]/[E] 映射

为与 depth-research 对齐，本 skill 的可靠性标签与证据强度标签一一映射：

| 交付物标签 | depth-research 标签 | 含义 |
|------------|------------------------|------|
| [确认] | [F] Fact | 直接公开证据 |
| [强推断] | [I] Inference | 多条间接证据支撑 |
| [弱推断] | [A] Analogy | 类比推断或单一弱证据 |
| [信息缺失] | [E] Empty | 无法获得相关信息 |

**强制配比**：[F]+[I]+[A] 合计 ≥ 80%，[E] ≤ 20%。

## State management

> **CSV 编码强制**：本 skill 所有 CSV 产物（D6 公司全景表.csv 等）必须使用 `utf-8-sig`（UTF-8 with BOM），读入也用 `utf-8-sig`。详细规则见 根 SKILL.md「CSV 输出全局硬约束」段。

- 输入：
  - L2：`docs/account-research/process-archive/L2_全量信号扫描.csv` + `docs/account-research/process-archive/L2_分层分析报告.md`
  - L3：`docs/account-research/process-archive/L3_*轻度调研.md`
  - L4：`docs/account-research/process-archive/L4_对比分析_*.md` + `docs/account-research/battle-handbook/A层深度调研报告.md`
- 输出（按读者目录分放，主交付物放根目录，支撑数据入 `supporting/` 子文件夹）：
  - `docs/account-research/battle-handbook/客户攻坚作战手册.md` ← D1（主交付物）
  - `docs/account-research/battle-handbook/supporting/公司全景表.csv` ← D6（UTF-8 with BOM）
  - `docs/account-research/decision-support/高管摘要.md` ← D2（主交付物）
  - `docs/account-research/decision-support/supporting/产品场景匹配矩阵.md` ← D3
  - `docs/account-research/decision-support/supporting/行业市场洞察.md` ← D4
  - `docs/account-research/decision-support/supporting/高潜力客户特征模型.md` ← D5
  - `docs/account-research/decision-support/supporting/风险矩阵与核心假设.md` ← D7
  - `docs/account-research/decision-support/supporting/行动路线图.md` ← D8
- Phase 完成后：
  - 追加一条记录到 `CHANGELOG.md`
  - 自动生成/更新 `README.md`（含按角色阅读路径）

## supporting落盘规范

Phase 5 所有交付物生成完毕后：

1. **回填**：将 `docs/account-research/process-archive/` 中适合作为支撑的完整文件复制到对应supporting目录（L4报告→01supporting、L2分层报告/方法论验证→03supporting）
2. **清空目录处理**：回填后仍为空的supporting目录直接删除，不保留空目录
3. **验证**：执行 `check-structure`，确认无空目录、无内部术语泄露

## Agent 必读流程

0. **启动前校验门**：读取并校验 `.csp/account-research/state/<industry-slug>/brief.json`（见上文「启动前校验门」段），任一项不通过立即退回 account-research orchestrator
1. 启动时先读本文件 + [preface-and-menu.md](./references/preface-and-menu.md) + [anti-patterns.md](./references/anti-patterns.md)
2. **检查 Quality Gate（QG-1 到 QG-9）**——任一触发则暂停、报告用户、等待三选一指令
3. 读 [customer-portraits.md](./references/customer-portraits.md)，对所有候选客户做五维度分类
4. 读 [priority-matrix.md](./references/priority-matrix.md)，做矩阵象限定位
5. 读 [roi-estimation.md](./references/roi-estimation.md)，按公式生成 deal size 区间
6. 读 [attack-path-three-tier.md](./references/attack-path-three-tier.md)，生成攻坚路径
7. 读 [contact-whitelist.md](./references/contact-whitelist.md)，按四级白名单采集每家 TOP 客户的联系方式
8. 按用户选择的 D1-D8 列表，依次读取对应 D 文档并生成
9. 生成后执行产品名称合规扫描 + [quality-checklist.md](./references/quality-checklist.md) 单份自检 + 跨文档去重自检
10. 全部完成后做跨文档一致性自检 + 版本号标注
11. 每份交付物生成后，对照 [output-quality-bar.md](./references/output-quality-bar.md) 执行质量基线自检
12. **脚本辅助校验**（推荐执行，非强制）：全部交付物生成后，执行以下两个命令进行机器校验：
    ```bash
    # 跨文档一致性（数字/公司名/竞对列表）
    python <skill_dir>/../shared/account_research_toolkit.py check-consistency --workspace .csp/account-research/state/<slug>/
    
    # 产品名称合规
    python <skill_dir>/../shared/account_research_toolkit.py check-naming --workspace .csp/account-research/state/<slug>/ --brief .csp/account-research/state/<slug>/brief.json
    
    # 声明溯源（D1中的事实性声明是否在上游调研数据中有对应）
    python <skill_dir>/../shared/account_research_toolkit.py claim-trace \
      --report .csp/account-research/state/<slug>/docs/account-research/battle-handbook/客户攻坚作战手册.md \
      --evidence-dir .csp/account-research/state/<slug>/docs/account-research/process-archive/

    # 目录结构合规性（文件放置是否正确、必要文件是否存在）
    python <skill_dir>/../shared/account_research_toolkit.py check-structure --workspace <项目根目录>

    # 时效性检查（交付物中的信息是否过期）
    python <skill_dir>/../shared/account_research_toolkit.py temporal-check \
      --file .csp/account-research/state/<slug>/docs/account-research/battle-handbook/客户攻坚作战手册.md \
      --run-date <当前日期YYYY-MM-DD>
    ```
    脚本输出 PASS 表示结构校验通过；输出 FAIL/WARN 时优先修复再标记完成。注意：结构校验通过不等于内容质量合格，仍需按上方 quality-checklist 完成内容自检。若环境不可用，按第 9-10 步手动执行。
