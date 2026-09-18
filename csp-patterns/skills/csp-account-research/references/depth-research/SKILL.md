---
name: depth-research
description: 深度调研单家或少数 B2B 目标客户并产出画像与攻坚路径。在需要验证 L2 分层判定或为重点客户生成完整技术采购画像时使用——支持 L3 轻度（10-15 分钟/家，初步产品匹配与竞对关系判定）和 L4 深度（30-60 分钟/家，生成 20 维度画像、决策链、攻坚路径）两种模式，统一采用 [F]/[I]/[A]/[E] 四级证据强度标签。通常由 account-research orchestrator 调用，也可单独对特定公司执行。触发：'深入调研这家公司'、'轻度调研'、'deep research on company X'、'L3'、'L4'。
---

# depth-research — L3 / L4 深度调研

## 角色定义

你是一位资深行业调研分析师，擅长从公开信息中构建完整的企业技术画像，并判断其与特定产品/服务的匹配程度。所有结论必须可追溯到证据，并按 [F]/[I]/[A]/[E] 四级标签标注证据强度。

## When to use

- 已完成 L2 分层（A/B/C），需要对 A 层（必须）和 B 层（建议）做 L3 验证 → **L3 模式**
- 需要为重点目标公司生成完整技术采购画像、决策链、攻坚路径 → **L4 模式**
- 由 account-research orchestrator 调度作为 Phase 3（L3）/ Phase 4（L4）执行

## When NOT to use

- 数十到数百家公司的批量信号扫描（用 signal-scan）
- 还未确定公司池来源（先用 account-research orchestrator 做 Phase 0/1）
- 仅做战略框架/竞对单点分析（用 csp-strategy）
- 信息透明度极低且无可类比基座的公司（先在 L2 标记，不做 L4）
- orchestrator agent 自行模拟本 skill 的画像产出（跳过 L3 五问模板 / L4 二十维模板、矛盾信号仲裁、证据强度配比检查 [F]+[I]+[A]≥80%）

## 两种模式概览

| 维度 | L3 轻度 | L4 深度 |
|------|---------|---------|
| 目标 | 验证 L2 分层准确性 + 初步产品匹配 + 竞对关系 | 完整 20 维画像 + 决策链 + 攻坚路径 |
| 深度 | 10-15 分钟/家搜索量 | 30-60 分钟/家搜索量 |
| 输入 | L2_全量信号扫描.csv 中的 A/B 层公司 | L3 升层 + 重点 A 层公司 |
| 输出 | 升/降/维持判定 + 初步产品匹配 + 竞对关系 + 信息可靠性 | 20 维画像 + 决策链 + 竞对深度 + 攻坚路径 + 横向对比 |
| 模板 | [l3-template.md](./references/l3-template.md) | [l4-template.md](./references/l4-template.md) |

## Required Inputs

1. 目标公司清单（L3：A/B 层；L4：L3 升层 + 优先级 A 层）
2. 上游 L2 评分 + L3 判定（如执行 L4）
3. 产品列表（用户提供，用于产品匹配判定）
4. 业务规模指标的行业口径（AUM / ARR / 营收 / 装机量 / 用户数，在 brief.json 中确认）
5. 行业类型（A/B/C/D 型，影响调研侧重——参见 account-research orchestrator 的 industry-type-adaptation.md）

## 启动前校验门（brief.json）

执行任何 L3/L4 动作之前，必须先读取上游 `.csp/account-research/state/<industry-slug>/brief.json` 并校验：

- 文件不存在 → 拒绝执行，提示用户：「请先调用 account-research orchestrator Phase 0 完成任务定义」
- 任一必填字段为空或为默认占位词 → 拒绝执行，退回 account-research orchestrator Phase 0
- `products` 字段为空或未经用户确认（缺 `source` / `core_scenarios`）→ 退回产品资料消化环节（产品匹配判定依赖此字段，缺失时直接拒绝执行）
- 未检测到用户「确认」启动确认单的记录 → 退回启动确认单环节

**必填字段清单**：`user_role` / `audience` / `depth` / `industry_name` / `products` / `execution_path`

校验通过后才允许进入下方执行流程。校验失败时不要尝试用默认值/行业常识自行补齐——这是反模式。

## 执行流程总览

### L3 流程

| 步骤 | 动作 | 引用文档 |
|------|------|---------|
| 1 | 读取 L2 分层结果，确认 A/B 层名单 | — |
| 2 | 按 L3 五问模板逐公司调研 | [l3-template.md](./references/l3-template.md) |
| 3 | 竞对关系判定（四选二硬证据法） | [l3-template.md](./references/l3-template.md) |
| 4 | 升降层判定 + 证据标签 | [evidence-system.md](./references/evidence-system.md) |
| 5 | 输出 L3 报告 + 自检 | [quality-checklist.md](./references/quality-checklist.md) |

### L4 流程

| 步骤 | 动作 | 引用文档 |
|------|------|---------|
| 1 | 读取 L3 升层 + 优先级 A 层公司 | — |
| 2 | 按 20 维度模板逐公司画像 | [l4-template.md](./references/l4-template.md) |
| 3 | 矛盾信号识别 + 多源仲裁 | [contradictory-signals.md](./references/contradictory-signals.md) |
| 4 | 间接推断（信息缺失时） | [indirect-inference.md](./references/indirect-inference.md) |
| 5 | 组织变化采购窗口判定 | [organizational-window.md](./references/organizational-window.md) |
| 6 | 横向对比 + 定性画像 + 架构分类 | [l4-cross-comparison.md](./references/l4-cross-comparison.md) |
| 7 | 输出 L4 报告 + 自检 | [quality-checklist.md](./references/quality-checklist.md) |

## 核心方法论模块

按需查阅。Agent 在对应场景必须读取相关模块。

| 模块 | 用途 | 触发场景 |
|-----|------|---------|
| [L3 五问模板](./references/l3-template.md) | L3 调研骨架 + 竞对四选二硬证据 | L3 模式启动时必读 |
| [L4 二十维画像模板](./references/l4-template.md) | L4 调研骨架 + 质量门槛 | L4 模式启动时必读 |
| [证据强度标签体系](./references/evidence-system.md) | [F]/[I]/[A]/[E] 四级标签 + 强制配比 | 全流程必读 |
| [间接推断方法](./references/indirect-inference.md) | 信息缺失时的四层推断架构 | 信息透明度低时 |
| [矛盾信号处理](./references/contradictory-signals.md) | 多源信息冲突时的仲裁规则 | 出现矛盾证据时 |
| [组织变化采购窗口](./references/organizational-window.md) | 高管变动 + CTO 三分类窗口判断 | L4 决策链分析时 |
| [L4 横向对比 / 架构分类](./references/l4-cross-comparison.md) | 横向对比四步法 + 定性画像 + 架构 4 分类 | 多家 L4 完成后 |
| [Anti-patterns](./references/anti-patterns.md) | DR-1 到 DR-12 反模式（必读） | 全流程 |
| [Quality Checklist](./references/quality-checklist.md) | L3 / L4 自检清单 | 每家完成时 |

## 质量规范

1. **每个维度评分/结论必须标注证据标签**：[F] / [I] / [A] / [E]，详见 [evidence-system.md](./references/evidence-system.md)
2. **强制配比**：[F]+[I]+[A] 合计 ≥ 80%，[E] ≤ 20%
3. **[A] 类比推断不得单独作为升层主依据**，必须配合至少一个 [F] 或 [I]
4. **重要判定至少需要 2 条独立来源支撑**：涉及 A/B/C 分层变动、竞对深度绑定判定时，单条 [I] 不足以作为主依据，必须有 ≥2 条来源独立的 [F] 或 [I] 证据交叉印证（来源独立 = 来源机构不同且报道角度不同，同一新闻被多家媒体转引不算独立）
5. **所有证据必须标注查阅时间或发布时间**（参见 signal-scan/info-decay.md 时效矩阵）
6. **L4 必须使用至少 5 类独立信息源**（招聘、技术博客、官方公告、媒体报道、行业访谈等）
7. **矛盾信号必须显式记录**，不得静默选边——按 [contradictory-signals.md](./references/contradictory-signals.md) 仲裁
8. **L4 横向对比必须输出架构分类**（参见 [l4-cross-comparison.md](./references/l4-cross-comparison.md)）
9. **主动对抗性验证（过程动作，不进交付物）**：L4 深度调研中每条标 [F] 的关键论断（涵盖竞对深度绑定、技术栈替换意向、决策人采购态度、产品能力边界等）写完后，必须执行一轮反方关键词搜索。过程产物落到 `docs/account-research/process-archive/adversarial_check_<date>.md`，仅供溯源。对最终客户画像 / 作战手册 / 对外交付物的唯一影响为论断升降级或事实性矛盾点补充，禁止出现"已做反方核验"、"经对抗验证"、"反方搜索未发现反例"等过程性表述。详细规则见 [contradictory-signals.md](./references/contradictory-signals.md) 的"主动对抗性验证"章节。
10. **可选增强：跨 skill 方法论调用**：
    - L4 横向对比阶段可调用 csp-strategy（咨询框架：MECE / Issue Tree / Hypothesis Tree / Pyramid / SCQA）增强结构化拆解
    - 公司公开信号矛盾密集或决策链推断证据弱时，可调用 csp-paper-reader（批判性思维 / 对比矩阵 / 逆向思维）强化论证
    - 调用流程按 `../shared/cross-skill-fallback.md` 的四步流程执行
11. **搜索落盘即释放**：每搜完一家公司全部维度后，立即将搜索关键词+返回摘要+关键片段写入`L4_搜索过程_<company>.md`并落盘。落盘确认后，上下文中的搜索原文可以安全释放（后续如需回看，用Read工具读取该文件）。这确保了搜索证据持久化的同时，避免上下文因累积多家公司的原始搜索结果而膨胀。

## 厂商列表与业务规模指标说明

- **竞对厂商**：默认值为空（由 brief.json 配置竞对厂商），可在 brief.json 中配置覆盖。全局竞对列表变更需用户确认；单家公司层面如果搜索到不在列表中的竞对厂商，直接在该公司画像中如实记录
- **我方厂商**：默认值为空（由 brief.json 配置我方产品），可在 brief.json 中配置覆盖
- **业务规模指标**：默认 5 选 1——AUM（量化私募/资管）、ARR（SaaS）、营收（通用企业）、装机量（制造业）、用户数 DAU/MAU（互联网）；也支持用户自定义填写其他口径。在 brief.json 中确认后代入 L3/L4 模板对应字段。若 agent 在搜索中发现更合适的指标，必须向用户提议并等待确认后才能切换——确认后写入当前任务的 brief.json，不影响其他任务

## State management

> **CSV 编码强制**：本 skill 所有 CSV 产物（L3 升降层判定.csv / L4_对比分析_批次N.csv 等）必须使用 `utf-8-sig`（UTF-8 with BOM），读入也用 `utf-8-sig`。详细规则见 根 SKILL.md「CSV 输出全局硬约束」段。

- 输入：
  - L3：上游 `docs/account-research/process-archive/L2_全量信号扫描.csv`（A/B 层）
  - L4：L3 升层名单 + L2 优先级 A 层
- 搜索过程（强制落盘——不可省略）：
  - `docs/account-research/process-archive/L3_搜索过程_<company>.md`（每家公司的搜索关键词 + 搜索引擎返回摘要 + 关键原文片段）
  - `docs/account-research/process-archive/L4_搜索过程_<company>.md`（同上，L4阶段更详细，包含每个维度的搜索记录）
  > 落盘后可从上下文中清除搜索原文，后续需要时用Read工具读取对应文件即可。这既确保溯源可追踪，又降低上下文占用。
- 输出：
  - `docs/account-research/process-archive/L3_A层轻度调研.md`（含升降层结论 + 证据标签）
  - `docs/account-research/process-archive/L3_B层轻度调研.md`
  - `docs/account-research/process-archive/L3_C层轻度调研.md`
  - `docs/account-research/process-archive/L3_升降层判定.md`
  - `docs/account-research/battle-handbook/A层深度调研报告.md`（L4 完成后汇总的面向销售版）
  - `docs/account-research/process-archive/L4_对比分析_批次N.md`（多家 L4 完成后）
  - `docs/account-research/process-archive/L4_对比分析_批次N.csv`
- Phase 完成后：追加一条记录到 `CHANGELOG.md`

## Agent 必读流程

0. **启动前校验门**：读取并校验 `.csp/account-research/state/<industry-slug>/brief.json`（见上文「启动前校验门」段），任一项不通过立即退回 account-research orchestrator
1. 启动时先读本文件 + [evidence-system.md](./references/evidence-system.md) + [anti-patterns.md](./references/anti-patterns.md)
2. L3 模式：读 [l3-template.md](./references/l3-template.md)，逐公司套五问模板
3. L4 模式：读 [l4-template.md](./references/l4-template.md)，逐公司套 20 维模板
4. 信息缺失/矛盾时：读 [indirect-inference.md](./references/indirect-inference.md) / [contradictory-signals.md](./references/contradictory-signals.md)
5. L4 完成 ≥ 4 家后：读 [l4-cross-comparison.md](./references/l4-cross-comparison.md)，做横向对比和架构分类
6. 每家完成时：执行 [quality-checklist.md](./references/quality-checklist.md)
7. 全部L4画像完成后，执行溯源验证：`python <skill_dir>/../shared/account_research_toolkit.py claim-trace --report <L4深度调研报告路径> --evidence-dir docs/account-research/process-archive/`。输出WARN时对未溯源声明补搜或标注[信息缺失]后再进入下一步。
