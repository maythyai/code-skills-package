# CSP System Connectivity Standard

> 版本 v1.0.0 · 2026-11-08
>
> 本文档是 CSP 所有子系统之间模块衔接与跳转设计的**唯一事实来源**。定义了统一的交叉引用格式、交接协议、阶段词汇映射、SKILL.md 强制章节规范、状态保持规则和边界场景处理规则。所有子系统（csp-patterns、csp-workflow、csp-meta、prompts）必须遵守。

---

## 一、统一交叉引用格式

### 1.1 强制格式：`[[skill-name]]`

所有 CSP 文件中的技能引用必须使用 `[[skill-name]]` wiki-link 格式。

**允许的格式：**

| 格式 | 示例 | 适用场景 |
|------|------|---------|
| 基本 wiki-link | `[[csp-tdd]]` | 同目录树内的技能引用 |
| 跨目录限定名 | `[[meta:csp-tdd]]` | 引用其他目录树的技能 |
| 跨目录限定名 | `[[workflow:csp-code-review]]` | 引用 worklflow 树的技能 |
| 跨目录限定名 | `[[pattern:csp-backend-patterns]]` | 引用 patterns 树的技能 |

**目录树前缀约定：**
- `meta:` → `csp-meta/skills/`
- `workflow:` → `csp-workflow/skills/`
- `pattern:` → `csp-patterns/skills/`
- `runtime:` → `csp-runtime/skills/`

**弃用的格式：**
- ❌ 裸文本：`csp-tdd`
- ❌ 反引号：`` `csp-tdd` ``
- ❌ YAML 原始字符串数组：`[csp-tdd, csp-code-review]` → 改用 `[[[csp-tdd]], [[csp-code-review]]]`

### 1.2 引用校验

- 所有引用在 registry.json 中必须有对应条目
- `scripts/validate-skill-refs.py` 定期扫描悬挂引用
- 新增/删除技能时同步更新所有引用

---

## 二、统一交接协议

### 2.1 交接 JSON Schema

任何两个模块之间的过渡必须生成以下最小交接 JSON：

```json
{
  "skill_name": "csp-brief",
  "skill_version": "1.0.0",
  "generated_at": "2026-11-08T10:00:00Z",
  "project_name": "my-project",
  "handoff_version": "1.0.0",
  "target_subsystem": "design_suite",
  "summary": "Brief completed: B2B SaaS, target SMB, 3 strategy dimensions",
  "output_files": [
    ".csp/spark/context/brief.json",
    ".csp/spark/brief/my-project.html"
  ],
  "context_digest": {
    "business_goal": "Streamline procurement workflow",
    "user_persona": "procurement_manager",
    "design_criteria": ["simple", "fast", "mobile-first"]
  },
  "status": "complete",
  "warnings": [],
  "next_recommended": ["csp-journey", "csp-stories"],
  "entry_conditions_met": true,
  "exit_conditions_met": true
}
```

### 2.2 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `skill_name` | string | ✅ | 生成此交接的技能名称 |
| `skill_version` | semver | ✅ | 技能版本号 |
| `generated_at` | ISO8601 | ✅ | 生成时间戳 |
| `project_name` | string | ✅ | 项目名称，跨所有过渡保持 |
| `handoff_version` | semver | ✅ | 交接协议版本（当前 1.0.0） |
| `target_subsystem` | enum | ✅ | 目标子系统：`design_suite` / `workflow` / `prompt_chain` |
| `summary` | string (≤140) | ✅ | 一句话摘要 |
| `output_files` | string[] | ✅ | 产出的文件路径列表 |
| `context_digest` | object | ✅ | 关键上下文字段摘要（下游快速消费） |
| `status` | enum | ✅ | `complete` / `partial` / `blocked` |
| `warnings` | string[] | ✅ | 警告列表（无则为 `[]`） |
| `next_recommended` | string[] | ✅ | 推荐的下游技能列表（终端节点可为 `[]`） |
| `entry_conditions_met` | boolean | ✅ | 入条件是否满足 |
| `exit_conditions_met` | boolean | ✅ | 出条件是否满足 |

### 2.3 子系统写入路径

| 来源子系统 | 写入路径 |
|-----------|---------|
| 设计套件 | `.csp/spark/context/<skill>.json`（继续使用现有路径）+ 包含统一字段 |
| 工作流系统 | `.csp/handoff/<stage>-handoff.json`（新路径） |
| 提示词链 | `.csp/handoff/<stage-id>-handoff.json`（新路径）+ 继续更新 `.csp/lifecycle-state.json` |

---

## 三、统一阶段词汇映射

> 此表是 S0-S10、P0-P8、D1-D5、00-07 四套阶段编号系统的唯一事实来源。任何新别名必须在此表中注册。

| 提示词 (00-07) | S-阶段 | P-阶段 | D-阶段 | 目的 |
|:---:|--------|--------|--------|------|
| 00 | S0 | — | — | 知识中枢初始化 |
| — | — | P0 (Intake) | — | 需求吸收与路由 |
| 01 | — | P1 (PRD) | — | PRD 生成 |
| 02 | S1 | — | — | 需求拆解 |
| — | — | P2 (Tech Design) | — | 技术设计 |
| 03 | S2, S2.5, S2.6, S3 | — | — | 技术选型 + 方案设计 + 设计评审 + 全栈规格 |
| 04 | S3.5, S4 | P3 (Plan) | — | 任务拆解 + 实施规划 |
| — | — | P4 (Execute) | — | 并行执行 |
| — | — | P5 (QA) | — | 质量门控 |
| 05 | S5 | — | — | 实现 |
| 06 (QA段) | S6 | — | — | 质量门控 |
| 06 (Review段) | S7 | P6 (Review) | — | 评审与验证 |
| 06 (Ship段) | S8 | P7 (Ship) | — | 发布交付 |
| 06 (Ops段) | S9 | P8 (Ops) | — | 发布后运维 |
| 07 | S10 | — | — | 复盘检查 |
| convergence | — | — | D1-D5 | 架构收敛门 |
| roadmap | — | — | — | 战略规划（外环） |

---

## 四、强制 SKILL.md 章节规范

### 4.1 每个 SKILL.md 必须包含以下章节

1. **Related Skills**（或 YAML frontmatter 中的 `related_skills`）
   - 格式：`[[skill-name]]` wiki-link
   - 最少 2 个，最多 20 个
   - 示例：`related_skills: [[[csp-brief]], [[csp-journey]], [[csp-stories]]]`

2. **Entry Conditions** — 技能可执行的前置条件
   - 必填条件（缺失则阻塞）
   - 可选条件（缺失则降级运行）
   - 当前状态检查方式

3. **Exit Conditions** — 技能完成后的产出验证
   - 必检查项（文件存在、JSON 有效、命令退出码）
   - 验证命令

4. **Downstream Handoff** — 交接描述
   - 产出什么上下文
   - 写入哪里
   - 自然的下游技能是什么

### 4.2 已有设计的技能的适配

- 设计链技能（27 个，已有 chain-protocol 交接段）：增加 Entry/Exit Conditions 段
- 工作流技能（68 个，已有 lifecycle-contract 门控）：从 lifecycle-contract.json 提取 Entry/Exit 条件到 SKILL.md

---

## 五、状态保持规则

### 5.1 必须保持的字段（跨任意过渡）

| 字段 | 保持方式 |
|------|---------|
| `project_name` | 每步交接 JSON 的顶层字段，禁止从目录名推断 |
| `generated_at` 时间戳 | 保留为 `upstream_contexts` 数组，每个上游技能一条记录 |
| `handoff_version` | 连同所有上游技能版本保留 |
| 用户决策 | 任何显式确认/拒绝/修改记录在 `context_digest.user_decisions` 中 |
| 约束覆盖 | 任何被用户修改的约束记录在 `context_digest.constraint_overrides` 中 |

### 5.2 跨子系统保持路径

| 过渡方向 | 机制 |
|---------|------|
| 设计套件 → 设计套件 | chain-protocol 双通道（JSON 文件 + 会话 marker） |
| 设计套件 → 工作流 | `.csp/spark/context/<skill>.json` 被工作流技能读取 |
| 工作流 → 工作流 | `.csp/` 目录工件 + `lifecycle-state.json` |
| 工作流 → 设计套件 | `.csp/handoff/` 统一交接文件 |
| 任意 → 提示词链 | `.csp/lifecycle-state.json` 阶段追踪 |
| 提示词链 → 任意 | `.csp/handoff/<stage>-handoff.json` |

---

## 六、边界场景处理规则

### 6.1 上游上下文缺失

```
1. 技能检查预期上游工件（文件存在 + JSON 有效）
2. 如果缺失：技能进入"独立模式"——直接向用户询问最低必要输入
3. 技能禁止伪造上游上下文
4. 技能必须在退出交接中输出 warnings: ["upstream_context_missing: <skill-name>"]
```

### 6.2 上游上下文损坏（JSON 解析失败）

```
1. 读取原始文件为文本
2. 尝试修复：替换未转义引号、修复尾逗号、移除 BOM
3. 修复成功 → 重写干净 JSON，发出 warning: ["context_repaired_from_corruption"]
4. 修复失败 → 重命名为 <skill>.json.corrupt.<timestamp>
   写入 <skill>.json.recovery 包含 { "status": "corrupt", "error": "..." }
   发出 warning: ["recovered_context_incomplete"]
5. 下游技能必须检查 .recovery 文件后再假设上游完成
```

### 6.3 多源上下文冲突

```
1. 两个上游技能提供同一字段的冲突值：
   a. 优先采用最近运行的上游（按 generated_at）
   b. 发出 warning: ["conflict_resolved: <field> from <newer-skill> over <older-skill>"]
2. 技能产出与用户输入冲突：
   a. 用户输入永远优先
   b. 发出 warning: ["user_override: <field>"]
```

### 6.4 不完整过渡

```
下游技能检测到 lifecycle-state.json 中标为 "in_progress" 的技能缺少退出工件：
1. 将上游阶段标记为 stale
2. 可选提供：重新运行不完整技能，或以降级上下文继续
```

### 6.5 子系统断连

```
1. 工作流技能被调用但无 .csp/AGENTS.md：先重定向到 S0/00
2. 设计套件技能在工作流中间被调用：检查 .csp/spark/ vs .csp/planning/ 冲突
3. 两者都存在：询问用户继续设计轨道还是工作流轨道
```

---

## 七、引用关系

- 本文件被 `csp-patterns/chain-protocol.md` 引用（交接字段标准）
- 本文件被 `csp-workflow/references/lifecycle-contract.json` 引用（阶段别名 + 桥接路径）
- 本文件被 `docs/CSP-SYSTEM-MAP.md` 引用（模块连接矩阵）
- 所有 SKILL.md 的 Entry/Exit Conditions 以此为格式标准