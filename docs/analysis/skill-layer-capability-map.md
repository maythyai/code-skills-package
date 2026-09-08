# Skill 层能力地图：跨 IDE 的产物管理、闭环与组合

> 回答三个问题（撇开 `.claude/agents/` B 层，单看 skill 层）：
> 1. 产物管理（版本/结构/应用）能否跨 IDE 全流程一致？
> 2. 能否闭环执行整个产品功能的全流程全周期全细节？
> 3. skill 间的关联、前后调用、按需组合是否灵活达到要求？
>
> 结论一句话：**产物管理 ✅ 一致；闭环逻辑 ✅ 自洽；关联组合 ✅ 灵活——但都停在「规格层」，
> 缺一个把规格变成运行时强制执行的驱动链。本文记录该缺口及已落地的 `csp-sdk drive.*` 补齐。**

## 分层判定标准

每个能力分两档判定：
- **规格层 ✅**：能力以 IDE 无关的文件/契约/Markdown 编码，任何 IDE 的 agent 读写即得同一形状。
- **执行层 ⚠️/✅**：能力是否被运行时**强制**保证（不是靠 agent 自觉）。

## 1. 产物管理（版本 / 结构 / 应用）— 规格层 ✅ 执行层 ✅

| 机制 | 载体 | 跨 IDE 一致 | 强制 |
|---|---|---|---|
| 唯一索引 | `.csp/manifest.json`（`source_id` + `content_hash` git blob + `build_status`） | ✅ 文件 | `csp-sdk doctor` |
| 页面元数据 | YAML frontmatter 内联（禁止侧车 `.meta.json`） | ✅ 文件 | `validate:skill-v2` |
| 路由契约 | `.csp/AGENTS.md`（6 节 + 操作路由表） | ✅ 文件 | `doctor` |
| 变更检测 | `hub_manifest.sh`（纯 git+grep，零依赖） | ✅ 脚本 | 脚本强制 |
| schema 校验 | `npm run validate:all` + `npm test`（27 不变量） | ✅ CLI | CI gate |

承载 skill：`csp-knowledge-hub`（layer 2）显式 **platform-decoupled**——"replaces platform-hosted
knowledge interaction with local markdown + git + AGENTS.md routing + sole manifest index"。
`anti_rationalizations` 禁止平台耦合、mtime 判变、侧车元数据。

**判定：产物管理跨 IDE 全流程一致，且由 CLI/脚本强制，不依赖 agent 自觉。** ✅✅

## 2. 闭环逻辑（全流程全周期）— 规格层 ✅ 执行层 ⚠️→✅（已补）

### 规格层（一直就在）

`csp-lifecycle-orchestrator` skill（layer 2，**不是 agent**）是完整的编排引擎规格：
S0→S9 全链路 + 每阶段 输入/输出/**门控**/**跳过条件**/重试上限 + 动态路由
（`input_assessment`→起始阶段、`gate_failure`→回退重试）+ 治理旁路（PMS/CMS/TMS
`read_at`/`write_back_at`/`gate`）+ 迭代归档 + 执行伪代码。

**问题**：这些规则是写给 agent 的**散文 + 伪代码**，不是机器可读、可强制的状态机。
agent 可以跳过阶段、忽略门控、不写回 state——没有运行时拦住它。**这就是「建议性 handoff」
vs「运行时强制」的缝。**

### 执行层缺口（本次补齐）

| 缺什么 | 现状 | 补法 |
|---|---|---|
| 机器可读的 stage/gate 契约 | 只在 skill 散文里 | 新建 `csp-workflow/references/lifecycle-contract.json`：S0-S9 + 每阶段 `skill`/`gate.artifacts`/`gate.commands`/`mode_in`/`skip_if`/`max_retries`/`next` + `governance`（PMS/CMS/TMS 的 `gate_at`/`gate_spec`） |
| 运行时状态机 | 无 lifecycle state 文件 | 新建 `.csp/lifecycle-state.json`（`current_stage` + 每阶段 `status`/`retries` + `gate_overrides`）+ `csp-sdk drive.*` 读写 |
| 强制推进 | agent 自觉写 state | `drive.advance` **gate 不过则拒推进** + 重试计数 + 重指向当前 skill |
| 依赖加载 | router 建议「csp-tdd 依赖 csp-spec-contract」但不强制加载 | `drive.next` 从 `registry.json skills[].deps` 解析**传递闭包**，输出 `load_order` |
| 治理 gate（PMS/CMS/TMS 覆盖率/对齐） | 契约声明了但没检 | `checkGate` 扩展：按 `gate_at` 在 S1/S5/S6/S7/S8 跑 PMS/CMS/TMS 检查器，**治理 gate 也成硬门** |
| S6 质量门开箱命令 | 默认 `npm test`，非 JS 项目坏掉 | `drive.init` 调 `detectTechStack` 预填 `gate_overrides.S6.commands`（python→pytest, go→go test, rust→cargo test…） |

### `csp-sdk drive.*` 驱动链（已实现）

| 子命令 | 作用 | 强制性 |
|---|---|---|
| `drive.contract` | 打印状态机契约 | — |
| `drive.init [--mode <m>]` | 初始化 lifecycle-state（full/lightweight/spec-only/extend） | — |
| `drive.status` | 当前阶段/skill/重试/下一阶段 | 读真实 state |
| `drive.next` | 现在该跑哪个 skill + 依赖闭包 load_order + gate 检查 | 输出有序加载表 |
| `drive.gate [stage]` | 检 gate（artifacts 存在 + commands 退出 0）不推进 | — |
| **`drive.advance`** | **强制器**：gate 全过才 `current_stage:=next`；否则 `blocked` + 不动 state + 重指向 | **运行时强制** |
| `drive.plan [mode]` | 全模式有序 skill 序列（依赖解析） | — |
| `drive.goto <stage>` | 逃生口：手动设 current_stage（阻塞/重试耗尽时） | — |

**强制模型**：`drive.advance` 读真实 artifact 文件判 gate，不读 agent 的自述。agent 跳过阶段
→ gate 不过 → `current_stage` 不动 → `drive.next` 仍指向原阶段 → agent 被重指向。
**状态机不说谎，建议性 handoff 升级为运行时强制 handoff。**

**治理 gate（PMS/CMS/TMS）已接入为硬门**：`checkGate` 在 `gate_at` 标记的阶段（PMS@S1/S8、
CMS@S5/S7、TMS@S6/S7）跑解析器，判据不再是「文件存不存在」而是真质量——

| 治理 gate | 判据（机器解析真实 Module Spec） | 拦住的失败 |
|---|---|---|
| TMS `requirement_coverage_gap==0` | 解析 `.csp/test-spec/{module}/requirement-matrix.md`：每条需求有方法列 + 缺口清单为空 | 需求有、测试没 → S6/S7 不让过 |
| PMS `prd_to_module_coverage==100%` | 解析 `PRODUCT-MODULE-SPEC.md`：≥1 `MOD-*` 声明 + 覆盖率 100% | 需求在拆解中被丢 → S1/S8 拦 |
| CMS `cms_idempotent_align`（弱版） | 解析 `CODE-MODULE-SPEC.md`：文件存在 + 无「未对齐/unaligned」drift 标记 | 代码说明书脱节 → S5/S7 拦（强版待 re-distill 能力） |

`drive.init` 调 `detectTechStack` 预填 `gate_overrides.S6.commands`，质量门开箱即对（非 JS 项目不再 day-1 坏）。

测试：`test/csp-invariants.test.mjs` 现 **12 项 drive 契约测试**（5 项基础 + 7 项治理/预填：
TMS 缺口阻塞/无缺口通过、PMS 无模块阻塞/有模块通过、CMS drift 阻塞、python/go 预填、
治理失败阻塞 advance），全过。

**判定：闭环逻辑现在规格层 ✅ 执行层 ✅（跨 IDE，CLI 强制，不靠 agent 自觉）。** 仍缺并行与
每阶段上下文隔离（那是 B 层 Claude Code 专有，不在 skill 层范畴）。

## 3. 关联 / 前后调用 / 按需组合 — 规格层 ✅ 执行层 ⚠️→✅（组合已强，调用已补）

### 关联（规格层 ✅）

`.csp/skpg/graph.json`：4686 边、4 种关系——`depends_on`(988 硬依赖) / `related_to`(871 软关联)
/ `triggers`(1919 路由) / `contains`(908 层级)。可查询（`query-skpg.mjs`）。结构化、跨 IDE 一致。

### 前后调用（规格层 ✅ 执行层 ⚠️→✅）

- **规格层**：orchestrator 的 `Skill("...")` 伪调用 + 产物流转图 + frontmatter `context`
  （生命周期位置）+ `dependencies.skills`（硬前置）+ `.csp/` 黑板传递状态——完整、IDE 无关。
- **执行层原缺口**：`Skill("X")` 是写给 agent 的指令，非运行时调用；是否真调下一 skill 取决于
  agent 是否遵守，无强制。
- **补齐**：`drive.next` 输出当前阶段该跑的 skill + 依赖闭包 `load_order`（明确顺序）；
  `drive.advance` gate 强制阶段间推进——**调用的「顺序」与「推进」现在被 CLI 强制**，
  agent 只需在每个阶段按 `load_order` 加载并执行。剩余的非强制项：单 IDE 是否一次加载多 skill
  （取决于该 IDE 的 skill 加载能力，CSP 无法也不应越俎代庖）。

### 按需组合（规格层 ✅ 执行层 ✅）

多轴真实选择，router 输出候选组合：

| 轴 | 机制 |
|---|---|
| 置信度 | `keyword×0.4 + intent×0.3 + context×0.3`；>80% 直路由 / 50-80% top3 确认 / <50% 访谈 |
| 组合路由 | 信号检测表一次路由多 skill（如 `csp-autopilot + csp-lifecycle-orchestrator`） |
| 模式伸缩 | orchestrator 四模式（full/lightweight/spec-only/extend）+ `drive.plan` 输出该模式有序序列 |
| SDD 状态感知 | 看 `.csp/artifacts/` 有什么 → 推下一阶段 |
| 技术栈过滤 | 安装时 + 路由时 `stack_rules` |
| 升降级 | simple 改 3+ 文件 → design-hub；design-hub "不用设计" → simple |
| SKPG 依赖补全 | 激活 X 提示其 `depends_on` |
| 信号优先级 | 显式指令 > 高置信 > 上下文 > 技术栈 > 历史偏好 |

**判定：关联 ✅ 组合 ✅；前后调用从 ⚠️ 升 ✅（顺序与推进由 `drive.*` 强制）。**

## 缺口收敛：三块都指向同一刀

三轮分析（产物管理 / 闭环 / 关联组合）的执行层缺口，**不是三个独立问题，是同一个根因**：

> CSP 的 skill 层把**选择、顺序、门控、依赖、状态传递**都写成了 IDE 无关的规格
> （图 + router + orchestrator 伪代码 + frontmatter + manifest），缺一个**把规格
> 变成运行时强制执行的 enforcer**。

本次落地的 `csp-sdk drive.*` + `lifecycle-contract.json` 就是这个 enforcer 的第一版：

```
规格层（IDE 无关，一直在）             执行层 enforcer（本次补）
┌──────────────────────────┐         ┌──────────────────────────┐
│ lifecycle-orchestrator    │  ──→    │ csp-sdk drive.*          │
│ skill（S0-S9 散文+伪代码）│  固化   │ + lifecycle-contract.json│
│ frontmatter deps/context  │  ──→    │ + .csp/lifecycle-state   │
│ skpg graph (4686 边)      │  解析   │ drive.next (依赖闭包)     │
│ router (置信度+模式)      │         │ drive.advance (gate强制)  │
└──────────────────────────┘         └──────────────────────────┘
```

## 现状总表

| 能力 | 规格层 | 执行层 | 备注 |
|---|---|---|---|
| 产物版本/结构/应用一致 | ✅ | ✅ | knowledge-hub + manifest + doctor |
| 闭环逻辑（S0→S9） | ✅ | ✅ | drive.advance gate 强制，跨 IDE |
| 治理 gate（PMS/CMS/TMS 覆盖率/对齐） | ✅ | ✅ | checkGate 按 gate_at 解析真实 Module Spec |
| S6 质量门开箱命令 | ✅ | ✅ | drive.init 按技术栈预填 gate_overrides |
| 并行 + 上下文隔离 | ✅（规格） | ❌（B 层专有） | 不在 skill 层范畴 |
| skill 关联 | ✅ | ✅ | skpg 图可查询 |
| 前后调用 | ✅ | ✅ | drive.next load_order + drive.advance |
| 按需组合 | ✅ | ✅ | router 多轴 + drive.plan |
| 依赖加载强制 | ✅ | ⚠️ | drive.next 给闭包；多 skill 同时加载仍赖 IDE |

## 已知遗留（后续）

1. **CMS 强版 gate**：当前是弱版（检文件存在 + drift 标记），未做 re-distill+diff 的真幂等对齐。需 CMS 蒸馏脚本可被 CLI 调用后升级。
2. **多 skill 同时加载**：`drive.next` 输出 `load_order`，但是否一次全加载取决于 IDE；这是
   IDE 能力边界，非 CSP 应越界处。
3. **并行与上下文隔离**：仍是 B 层（Claude Code Agent/Worktree）专有，skill 层不覆盖。
4. **gate_overrides 的非 S6 阶段**：目前只预填 S6；其他阶段的 commands（如 S8 的 `git rev-parse`）仍走契约默认，按需可扩展。

## 关联文件

- `csp-workflow/references/lifecycle-contract.json` — 状态机契约（S0-S9 + 治理旁路 gate_at）
- `bin/csp-sdk.mjs` — `drive.*` 子命令实现（`drive.init/status/next/gate/advance/plan/goto/contract`）+ PMS/CMS/TMS 治理 gate 检查器 + S6 技术栈预填
- `test/csp-invariants.test.mjs` — 12 项 drive 契约测试（基础 5 + 治理/预填 7）
- `csp-workflow/references/spec-driven-playbook.md` — SDD 方法论 playbook（前序工作）
- `csp-workflow/templates/change-artifacts/constitution.md` — 项目宪法模板（前序工作）
