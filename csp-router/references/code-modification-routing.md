# Code Modification Intent Routing — Technical Reference

`csp-router/SKILL.md` 中"改码类意图路由决策（最高优先级）"段的技术补充。详述信号检测算法、回退规则、边界用例与输出格式。

## Overview

改码类意图（"修改代码 / 实现需求"）的路由不依赖通用置信度评分，而是基于**显式信号**——用户是否提供了 PRD/链接、是否指定了设计模式、是否明确极简、是否提及 loop。此路由优先级最高，命中后不再走通用关键词匹配。

## Signal Detection Algorithms

### PRD Detection

判定"用户提供了需求输入"的条件（任一命中即视为 PRD 已提供）：

- **URL 模式**：`https?://\S+\.(md|doc|docx|pdf|html)` 或任意 `https?://` 链接
- **文件路径模式**：`[\w/.-]+\.(md|docx?|pdf)` 指向本地需求文档
- **显式短语**："这是 PRD""这是需求""需求文档""requirement doc""spec link""这是需求链接"
- **内联长文本**：用户粘贴 > 200 字的需求描述 → 视为内联 PRD

**边界**：用户说"我想要个登录功能"（短描述）≠ PRD，是极简输入。

### Design Mode Detection

判定"用户指定了设计模式"的条件：

- **模式关键词**：标准设计 / detailed / 概要设计 / summary / 极速 / rapid / 本地极速 / local-rapid / 重新生成 / regenerate
- **组合判定**：
  - 有 PRD + 指定模式 → `csp-design-hub` 对应模式
  - 指定模式但无 PRD → 询问需求来源；或用 rapid 模式快速出设计
  - "不用设计""不用 PRD" → 不是模式指定，是极简信号（负向）

### Minimal Mode Detection

判定"极简模式"的条件：

- **显式**：极简模式 / 简单模式 / 直接改码 / 无PRD / 快速改 / simple dev / minimal / 不用设计 / 不用 PRD
- **隐式**：无 PRD + 无模式 + 改动描述简短（< 50 字）+ 未提及架构/多模块/接口变更

**边界**：隐式极简仍路由到 `csp-simple-dev`，但 `csp-simple-dev` 内部会做 scope 自检，超出 3 文件或架构变更时升级。

### Loop Detection

判定"研发 Loop"的条件：

- **关键词**：loop / 研发loop / autopilot / 自动驾驶 / 全自动 / auto pilot / 端到端 / 全流程自动
- **消歧**："loop" 作为变量名/循环语句（如 "for loop""event loop"）≠ 研发 Loop。需结合上下文：含"启动""开始""跑""启动研发"等动词修饰时才算。

### Specialized Code-Modification Branches

改码意图除 loop/PRD/模式/极简四主信号外，设四个**专项改码分支**。命中后优先于通用置信度路由，路由到对应专项 skill，避免穿透到通用层选错 skill。

| 分支 | 检测信号（任一命中） | 路由到 | 复合判定 |
|------|---------------------|--------|---------|
| **hotfix** | hotfix / 紧急 / 线上 / 生产故障 / P0 / urgent / emergency / production issue | `csp-hotfix` + `csp-systematic-debugging` | 含"线上"且"重构"→ 先 hotfix 止血 |
| **重构** | 重构 / 技术债 / 代码异味 / refactor / tech debt / code smell | `csp-refactorer` | 大规模→`csp-refactoring-strategies`；盘点→`csp-tech-debt-paydown` |
| **迁移** | 迁移 / 升级 / 移植 / 遗留系统 / migrate / modernize / legacy / port to | `csp-legacy-modernization` | 含废弃→`csp-deprecation-and-migration` |
| **性能** | 性能 / 慢 / 瓶颈 / 延迟 / optimize / latency / bottleneck | `csp-performance-optimizer` | 前端→`csp-web-performance-auditor` |

**边界**：分支互斥优先级 = "线上/紧急" 修饰时 hotfix 先于重构；"迁移"+"性能"→ 迁移为纲（迁移本身常含性能权衡）。

## Fallback Rules (Priority Order)

信号冲突时按优先级从高到低判定：

1. **显式模式指定**（最高）— 用户明确说某设计模式 → `csp-design-hub`
2. **PRD / 链接提供** — 有需求输入 → `csp-design-hub`
3. **专项改码分支**（hotfix / 重构 / 迁移 / 性能） — 命中专项信号 → 对应专项 skill；内部互斥：紧急修饰→hotfix 优先，迁移+性能→迁移为纲
4. **明确极简** — 用户说极简/简单/直接改 → `csp-simple-dev`
5. **隐式极简** — 无 PRD + 无模式 + 短描述 → `csp-simple-dev`
6. **Loop 请求** — 提及 loop → `csp-autopilot` + `csp-lifecycle-orchestrator`
7. **通用置信度路由**（最低）— 上述都不命中，回落到 `csp-router` 的关键词+意图+上下文评分

> 注：Loop 与极简/设计/专项改码互斥——Loop 是"全自动全流程"，其余是"人介入单步"。如同时出现，以更具体的为准（如"启动 loop 但先用极简改这个"→ 优先极简单步，loop 作为后续）。专项改码分支不高于显式 PRD（如"按这个 PRD 做迁移"→ 走 `csp-design-hub`，迁移语义作为设计输入）。

## Scope-Based Escalation

路由到 `csp-simple-dev` 后，该技能内部做 scope 自检，触发升级：

| 信号 | 升级到 |
|------|--------|
| 改动涉及 3+ 文件 | `csp-implementation-phase` |
| 改动涉及架构/接口变更 | `csp-design-hub` |
| 改动涉及公共 API/数据模型 | `csp-implementation-phase` + `csp-spec-contract` |
| 改动后测试大面积失败 | `csp-systematic-debugging` |
| 需求其实不止一句话 | `csp-interview-me` → 完整流程 |

降级路径：路由到 `csp-design-hub` 但用户说"不用设计了直接改" → 降级 `csp-simple-dev`。

## Boundary Cases

### Case: "帮我改个 bug"（无 PRD、无模式、短）
→ 隐式极简 → `csp-simple-dev` → 内部判定是否分发到 `csp-hotfix`（若含"线上/紧急"信号）

### Case: "按这个 PRD 做个概要设计"（PRD + 模式）
→ PRD + mode=summary → `csp-design-hub`（summary 模式）

### Case: "直接改，不用设计"（明确极简）
→ 明确极简 → `csp-simple-dev` → scope 自检，若触 5 文件则建议升级 `csp-design-hub`

### Case: "启动 autopilot"（loop）
→ loop → `csp-autopilot` + `csp-lifecycle-orchestrator`

### Case: "用极速模式帮我出个设计"（模式，无 PRD）
→ 指定模式（rapid）+ 无 PRD → `csp-design-hub`（rapid 模式，本技能直接生成轻量设计）

### Case: "这个设计过时了，帮我同步检查"（同步意图）
→ `csp-design-hub` 同步检查模式（非新设计，是设计-实现同步）

## Routing Output Format

改码类意图路由命中后，输出格式：

```yaml
code_modification_routing:
  detected_signals:
    prd_provided: true|false
    prd_source: "url|file_path|inline|explicit_phrase|none"
    mode_specified: "summary|detailed|rapid|local-rapid|regenerate|none"
    minimal_mode: "explicit|implicit|none"
    loop_requested: true|false
  routed_to: "csp-simple-dev|csp-design-hub|csp-autopilot"
  routing_reason: "..."
  fallback_used: false
  escalation_hint: "csp-design-hub"   # 如 scope 可能超极简，预置升级提示
```

未命中改码类意图时，不输出此块，回落到通用置信度路由的既有输出格式。
