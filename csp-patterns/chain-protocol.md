# Chain Protocol — 产品设计套件链式上下文协议

> 版本 v2.0.0 · 适用于 csp-frame / csp-brief / csp-scope / csp-probe / csp-bench / csp-signal / csp-journey / csp-sitemap / csp-stories / csp-board / csp-flow-web / csp-flow-mobile / csp-edge / csp-chart / csp-avatar / csp-pitch / csp-motion-plan / csp-motion-apply / csp-check / csp-access / csp-test / csp-metric / csp-qa / csp-prd / csp-retro / csp-extract / csp-audit（共 27 个设计链 Skill）。
>
> 本协议定义这 27 个 Skill 之间**如何交接上下文**：上一个 Skill 的产出如何被下一个 Skill 读取、面板如何自动更新、下游建议如何生成。所有引用本协议段的 SKILL.md 以本文件为准。

---

## 一、协议总则

1. **上下文是链的第一公民**：每个 Skill 的执行不依赖对话记忆，而依赖 `.csp/spark/context/*.json` 写盘文件 + 会话内 marker。上游 Skill 必须写盘，下游 Skill 必须读盘。
2. **双通道冗余**：每个 Skill 的产出同时走「文件通道」（`.csp/spark/context/<skill>.json`）和「会话通道」（`<!-- spark-context:<skill> -->` marker），任一条通道存活都能接上链。
3. **顺序不可颠倒**：§2.1.3 的 Step 1→6 是硬约束，先写盘、后自检、再渲染，任何 Skill 不得跳过写盘直接渲染或 handoff。
4. **失败不阻断**：链路面板（dashboard）更新失败、模板缺失等，均不得阻断 Skill 本体完成——按 §九 的降级路径告知用户后继续。

---

## 二、链式上下文协议

### 2.1 双通道规则（v1.1 智能适配规则）

每个 Skill 在「上游读取」和「下游输出」两个方向都走双通道：

**上游读取（Step 0）**，按顺序尝试：

1. 扫描会话中的 `<!-- spark-context:* -->` marker（`brief` / `flow-web` / `flow-mobile` / `check` / `sitemap` / `stories` / `frame` / `motion-plan` / `avatar` 等，视各 Skill 声明而定）
2. 读取项目目录 `.csp/spark/context/*.json`（同名 JSON 文件）
3. 都没有 → 按该 Skill 的 Step 1 询问所需目标（不得编造上游上下文）

**v1.1 智能适配**：读到上下文后，先尝试用上游字段做智能推荐（如 motion-plan 用 `brief.user` 推荐 Personality 候选、用 `flow-*.elements[]` 锁定 target_elements），但**需要用户拍板的决策仍必须显式确认**——上游信号只能作为推荐候选，不能静默定案。

**下游输出（末步）**，同时做两件事：

1. 写盘：`Write` 把完整 JSON 写到 `.csp/spark/context/<skill>.json`（目录不存在先创建）
2. 会话内输出 marker 块（裸 JSON 或摘要，schema 见各 Skill frontmatter 声明）：
   ```
   <!-- spark-context:<skill> -->
   ...
   <!-- /spark-context:<skill> -->
   ```

### 2.1.2 JSON 安全

写盘前的**强制检查**：

- 写入前**必须检查所有字符串值中的引号字符**。用户原文中的中文弯引号 `""`（U+201C / U+201D）必须替换为 `「」`，否则会被存储为 ASCII `"` 破坏 JSON 结构，导致下游全链路（Dashboard 更新 + 下游 Skill 读取）解析失败。
- 写盘后用 `python3 -c "import json; json.load(open('.csp/spark/context/<skill>.json'))"` 自检（或等价的 `node -e` JSON.parse）。
- 自检失败必须当场修复重写，不得带着坏 JSON 进入 handoff。

### 2.1.3 Step 1→6 执行顺序（v1.1.1）

下游输出必须严格按以下顺序执行，不得颠倒、不得跳过：

1. **先写盘**：`Write` 工具把完整 JSON 写到 `.csp/spark/context/<skill>.json`
2. **输出自检行**：`✅ <skill>.json 已写盘到 .csp/spark/context/<skill>.json`
3. **渲染报告**：输出本 Skill 的主交付物（Markdown 报告 / 规格 / 走查清单）
4. **输出紧凑 marker**：会话内 `<!-- spark-context:<skill> -->` 块
5. **Handoff 引导**：按 §八 的算法输出下游候选（见 `_shared/next-skill.md` 模板）
6. **更新链路面板**：按 §九 刷新 `.csp/spark/dashboard.html` 并独立段落告知用户

### 2.1.4 统一交接字段（v2.0 新增）

基于 [`docs/CONNECTIVITY-STANDARD.md`](../../docs/CONNECTIVITY-STANDARD.md) §二，每个 Skill 写入 `.csp/spark/context/<skill>.json` 的 JSON **除原有字段外，必须包含以下统一交接字段**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `handoff_version` | semver | 固定 `"1.0.0"` |
| `target_subsystem` | string | 固定 `"design_suite"` |
| `status` | enum | `"complete"` / `"partial"` / `"blocked"` |
| `warnings` | string[] | 警告列表（无则为 `[]`） |
| `context_digest` | object | 关键字段摘要（≥3 个 key） |
| `entry_conditions_met` | boolean | 入条件是否满足 |
| `exit_conditions_met` | boolean | 出条件是否满足 |

**示例**（`brief.json` 尾部追加）：
```json
{
  "...原有字段...": "...",
  "handoff_version": "1.0.0",
  "target_subsystem": "design_suite",
  "status": "complete",
  "warnings": [],
  "context_digest": {
    "business_goal": "Streamline procurement workflow",
    "user_persona": "procurement_manager",
    "design_criteria": ["simple", "fast", "mobile-first"]
  },
  "entry_conditions_met": true,
  "exit_conditions_met": true
}
```

> 这些字段不影响现有下游 Skill 的读取逻辑 —— 它们是**追加字段**。下游 Skill 如果不认识这些字段，会安全忽略。新编写或更新的 Skill 应当读取 `status` 和 `warnings` 来判断上游健康状态。

---

## 三、会话 marker 规范

- 每个 Skill 的 marker 名固定为 `spark-context:<skill>`，如 `<!-- spark-context:brief -->`。
- marker 块内放**紧凑 JSON 或单行摘要**（含 `ref=".csp/spark/context/<skill>.json"` 指向写盘文件时，正文可从简）。
- marker 是给「同一会话内连续调用多个 Skill」的通道——换会话后靠文件通道恢复。

---

## 四、写盘规范

- 目录：`.csp/spark/context/`（项目根下，不存在先创建）。
- 文件名：`<skill>.json`（如 `brief.json`、`flow-web.json`）。
- 内容：该 Skill 声明 schema 的完整 JSON，字段名与各 Skill「字段流向下游」节一致。
- 幂等：同一 Skill 重复执行时覆盖同名文件，不产生版本副本。

---

## 五、自检行

- 每次写盘后立即输出一行自检（§2.1.3 Step 2），格式：`✅ <skill>.json 已写盘到 .csp/spark/context/<skill>.json`。
- 自检行必须在渲染报告**之前**输出——它同时是用户可见的进度锚点，也是面板状态聚合的信号。
- 自检失败（JSON 解析不过）不得静默跳过，按 §2.1.2 修复重写。

---

## 六、渲染报告

- 自检行之后渲染本 Skill 主交付物。渲染内容不得依赖「写盘是否成功」——写盘失败但渲染成功也是坏的输出（违反 Step 顺序）。
- 报告内引用其他 Skill 产出的字段时，必须注明来源（如 `brief.design_criteria`），下游才能溯源。

---

## 七、Handoff 规范

- 按 [`_shared/next-skill.md`](_shared/next-skill.md) 的三层结构模板输出（首行完成摘要 → 候选清单 → 红线约束）。
- 候选由 `_shared/skill-graph.json` 的依赖图算法**实时计算**（§八），任何 SKILL.md 内**禁止硬编码候选清单**。
- 与「更新链路面板」段必须各自独立成段，中间空一行；候选清单行即使为空（终端节点）也必须输出。

---

## 八、next_hint 与依赖图算法

依赖图数据源：`_shared/skill-graph.json`（`skills[id="<skill>"].next_hint` 字段）。

候选排序算法：

1. **done ⊆ ready**：已完成的 Skill（done）不可再作为候选；候选集 = 依赖已满足且未完成的节点。
2. **preferred 优先**：`next_hint.preferred` 未完成时排第一。
3. **alternatives 其次**：按 `next_hint.alternatives` 数组顺序。
4. **同阶段补充**：候选不足 5 个时，补同 `phase` 的其他未完成节点。
5. **anchor 优先**：同阶段内 anchor 节点（套件入口：frame / scope / audit）排在 fan-out 节点之前。
6. **fan-out 兜底**：再不足则按图拓扑补下游节点，直到凑满 5 个候选。

> 各 Skill 的 `next_hint` 值**以 skill-graph.json 为准**，SKILL.md 内的展示仅为只读副本，禁止在 SKILL.md 内覆盖。

---

## 九、面板自动生成约定

每个 Skill 在 Handoff 之前执行「更新链路面板」，**告知用户的提示必须作为独立段落输出，禁止折叠进 Handoff 末尾、禁止静默跳过**。

1. **找模板**：定位 `_shared/dashboard-template.html`（依次：相对套件根 → `glob dashboard-template.html` 搜套件安装目录 → 三轮都失败时，**用独立段落醒目告知用户**：`⚠️ 链路面板模板未找到（套件安装可能不完整，建议重装）。本 Skill 已正常完成，下游链路不受影响。` 然后跳过本步、继续 Handoff，**不阻断 Skill 完成**）。
2. **聚合 STATE**：扫 `.csp/spark/context/*.json`，聚合为 `{"project":"<brief.project_name 或 frame.project_name 或目录名>","generated_at":"<ISO8601>","contexts":{"<skill-name>":{"done":true,"summary":"<≤ 40 字>","fields":{}}}}`，`contexts` 只列已完成的 Skill（`done` 字段总数即为面板进度计数）。
3. **克隆模板**到 `.csp/spark/dashboard.html`（覆盖），用正则 `/\/\*__SPARK_STATE_INJECT__\*\/null/` 替换为 `/*__SPARK_STATE_INJECT__*/<JSON.stringify(STATE)>`。
4. **独立段落告知用户**（强提示，单独成段，与 Handoff 之间空一行；根据 `Object.keys(STATE.contexts).length`（记作 `done`）选模板）：
   - **`done === 1`（本项目第一次生成 dashboard）输出长版**：
     ```
     📊 链路控制台已生成：.csp/spark/dashboard.html（双击在浏览器打开）

     这是本套件给你的「设计全链进度看板」——5 个阶段 × 27 个 Skill 节点，亮起的代表已完成的步骤，灰色的是后续可调用的节点。每跑完一个 Skill 都会自动更新，建议钉在浏览器一个标签页里随时回看，能看清「现在在哪一步、下游还差什么、链路是否健康」。
     ```
   - **`done > 1`（后续更新）输出短版**：
     ```
     📊 链路面板已更新 · 进度 [done]/27 · .csp/spark/dashboard.html
     ```
5. **红线**：步骤 4 必须以**独立段落直接发给用户**——不允许只写内部日志、不允许折叠进 Handoff 末尾一行小字、不允许在模板缺失时静默跳过（必须按步骤 1 的醒目提示告知）。

---

## 十、红线汇总

1. **顺序红线**：Step 1→6 不得颠倒（先写盘 → 自检行 → 渲染报告 → marker → handoff → 刷新面板）。
2. **JSON 红线**：中文弯引号未替换就写盘 = 违规；写盘后不跑 JSON 自检 = 违规。
3. **硬编码红线**：SKILL.md 内硬编码下游候选清单（如「进入 X / Y / Z」）= 违规；按「文档类 / 视觉类 / 决策类」再分类候选 = 违规。
4. **面板红线**：面板更新提示折叠进 Handoff 末尾 = 违规；模板缺失时静默跳过 = 违规。
5. **阻断红线**：面板/模板问题不得阻断 Skill 本体完成——协议要求降级告知后继续。
6. **越权红线**：下游建议是「建议」，用户永远可以选择其他候选或终止链——任何 Skill 不得强制推进链。
7. **跨子系统桥接**（v2.0 新增）：设计套件 Skill 需检查 `.csp/handoff/` 目录——如果存在工作流移交文件，作为上游上下文补充读取。设计 Skill 检测到工作流工件（`.csp/decomposition/` 或 `.csp/specs/`）时，读取为补充上下文。
8. **JSON 损坏恢复**（v2.0 新增）：当 `json.load()` 失败时必须执行恢复路径，不得静默丢弃。

## 十一、JSON 损坏恢复路径（v2.0 新增）

当 `.csp/spark/context/<skill>.json` 解析失败时，下游 Skill 必须执行以下恢复流程：

```
Step R1 — 读取原始文本
  Read 原始文件为 UTF-8 文本（忽略 JSON 解析错误）

Step R2 — 尝试自动修复
  a) 替换中文弯引号 ""／'' 为「」／''
  b) 修复尾随逗号（},] 前的多余逗号）
  c) 移除 UTF-8 BOM（﻿）
  d) 尝试 Python json.load() 重新解析

Step R3 — 判断修复结果
  修复成功：
    ✅ 重写干净的 JSON
    ✅ 发出 warning: ["context_repaired_from_corruption: <skill>.json"]
    ✅ 继续正常流程
  修复失败：
    ⚠️  重命名损坏文件为 <skill>.json.corrupt.<ISO8601-timestamp>
    ⚠️  写入 <skill>.json.recovery 文件：
        {
          "status": "corrupt",
          "corrupt_file": "<skill>.json.corrupt.<timestamp>",
          "error": "<json.load() 的原始异常消息>",
          "recovered_at": "<ISO8601>"
        }
    ⚠️  发出 warning: ["recovered_context_incomplete: <skill>.json is corrupt"]
    ⚠️  以降级模式继续（向用户询问最低必要输入）

Step R4 — 下游 Skill 的恢复感知
  下游 Skill 在 Step 0 读取上游上下文时：
  a) 先检查是否存在 <skill>.json.recovery 文件
  b) 如果 .recovery 存在 → 对应上游 Skill 被视为 partial/blocked
  c) 告知用户："上游 Skill X 的上下文已损坏，将以降级模式运行"
```

## 十二、跨子系统桥接（v2.0 新增）

设计套件 Skill 在以下场景需要与其他 CSP 子系统交互：

### 12.1 接收工作流系统的上下文

当设计套件 Skill 执行 Step 0（读取上游）时：
1. **额外检查** `.csp/handoff/` 目录是否存在
2. 如果存在 `design-to-workflow.json`（或其他 handoff JSON），读取其 `context_digest` 作为补充上下文
3. 如果检测到工作流工件（`.csp/decomposition/` 或 `.csp/specs/` 目录），读取为补充上下文

### 12.2 向工作流系统移交上下文

当设计链终端节点（如 `csp-prd`）完成后，如果用户选择进入开发：
1. 设计 Skill 告知用户：「设计阶段已完成，可从工作流 S1 或 S2 开始开发」
2. 用户可运行 `csp-design-to-workflow-bridge` 将设计上下文翻译为工作流格式
3. 桥接 Skill 读取 `.csp/spark/context/*.json` → 写入 `.csp/handoff/design-to-workflow.json`

### 12.3 与提示词链的互操作

设计套件 Skill 和提示词链（prompts/00-07）使用不同的阶段编号系统：
- 设计套件使用 skill-graph.json 的阶段（define/plan/build/verify/review）
- 提示词链使用 00-07 编号

当需要对照时，参考 [`docs/CONNECTIVITY-STANDARD.md`](../../docs/CONNECTIVITY-STANDARD.md) §三的统一阶段词汇映射。

---

> **协议版本历史**：v1.0 → v1.1（智能适配规则）→ v1.1.1（Step 顺序修正）→ v2.0（统一交接字段 + 跨子系统桥接 + JSON 损坏恢复）
