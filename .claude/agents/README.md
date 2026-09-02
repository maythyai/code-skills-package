# 多智能体交付团队（Claude Code Subagents）

本目录是把 `prompts/` 的 9 份系统提示词落地为 **Claude Code 项目级子 agent** 的产物。每个 `.md` = 一个 agent，frontmatter（name/description/tools/model）+ 正文（system prompt）。主 agent 用 `Agent` 工具 `subagent_type` 调用，或用户 `/agents` 选。

## 一、agent 清单

| agent | 阶段 | tools | model | 触发 |
|---|---|---|---|---|
| `roadmap-planner` | 外环 | Read,Write,Edit,Glob,Grep,WebFetch,AskUserQuestion | opus | 长期规划/路线图/版本规划 |
| `knowledge-hub` | 00 | Read,Write,Edit,Glob,Grep,Bash | sonnet | 知识中枢/知识库初始化 |
| `prd-writer` | 01 | Read,Write,Edit,Glob,Grep,AskUserQuestion,Agent | sonnet | 写 PRD/需求文档 |
| `decomposer` | 02 | Read,Write,Edit,Glob,Grep | sonnet | 需求拆解/feature 分解 |
| `tech-designer` | 03 | Read,Write,Edit,Glob,Grep,Bash | opus | 技术方案/架构/全栈 spec |
| `task-breaker` | 04 | Read,Write,Edit,Glob,Grep | sonnet | 任务拆解/拆 task/WAVE |
| `dev-lead` | 05 | Read,Write,Edit,Bash,Glob,Grep,Agent,Worktree | opus | 开发/实现/并行开发 |
| `release-manager` | 06 | Read,Write,Edit,Bash,Glob,Grep | sonnet | 测试/审查/发布/上线 |
| `reviewer` | 07 | Read,Glob,Grep,Bash,Write,Edit,Agent | opus | 整体复盘/架构审计/下一迭代 |
| `lifecycle-orchestrator` | 主调度 | Read,Bash,Agent,AskUserQuestion,Write,Edit | opus | 跑流程/从 00 开始/推进 |
| `backend-engineer` | 05 角色 | Read,Write,Edit,Bash,Glob,Grep | sonnet | 由 dev-lead spawn |
| `frontend-engineer` | 05 角色 | Read,Write,Edit,Bash,Glob,Grep | sonnet | 由 dev-lead spawn |
| `db-engineer` | 05 角色 | Read,Write,Edit,Bash,Glob,Grep | sonnet | 由 dev-lead spawn |
| `qa-engineer` | 05 角色 | Read,Write,Edit,Bash,Glob,Grep | sonnet | 由 dev-lead spawn |

## 二、全流程

```
外环 roadmap-planner（跑一次：战略+版本号规则+1/3年路径）
   │
   ▼
内环（每版本迭代）：
  00 knowledge-hub → 01 prd-writer → 02 decomposer → 03 tech-designer
    → 04 task-breaker → 05 dev-lead（spawn 角色 sub-agent + worktree 并行）
    → 06 release-manager（verify→re-align CMS→push+GitHub Release）
    → 07 reviewer（可选：产品+技术复盘，findings 回流 roadmap）
   │
   └─ 07 findings → 回 roadmap-planner 增量更新 → 下一轮 01
```

## 三、共享黑板，不靠 agent 间直接通信

**核心设计**：子 agent 上下文互不共享、不继承主 agent 历史。靠 `.csp/` 文件系统当"黑板"传递上下文：

```
┌──────────────────────────────────────────────────────────┐
│  .csp/  （共享黑板，所有 agent 读写）                      │
│                                                          │
│  lifecycle-state.json  ← 调度信号：现在第几步/下一步谁     │
│  manifest.json         ← 产物索引：有哪些知识产物          │
│  AGENTS.md             ← 路由契约                         │
│  product-spec/ (PMS)   ← 模块边界                         │
│  code-spec/ (CMS)      ← 代码地图                         │
│  test-spec/ (TMS)      ← 测试基线                         │
│  specs/ decomposition/ tasks/ tech-design/ review/ ...   │
│  milestones/{m}/        ← 归档快照                         │
│                                                          │
│  front-matter 互链字段：                                  │
│   roadmap_ref / prd_ref / related_decomposition          │
│   related_specs / related_tasks / adopted_by            │
└──────────────────────────────────────────────────────────┘
        ▲ 写                  ▲ 读                  ▲ 写
        │                     │                     │
  ┌─────┴─────┐         ┌─────┴─────┐         ┌─────┴─────┐
  │ agent A   │         │ orchestr  │         │ agent B   │
  │ (01 PRD)  │ ─done──▶│ -ator     │──spawn─▶│ (02 拆解) │
  └───────────┘         │ 读 state  │         └───────────┘
                        │ 派 next   │
                        └───────────┘
```

- **A 不直接喊 B**：A 完成后写 `lifecycle-state`（done）+ 产物；orchestrator 读 state → spawn B，B 读 A 的产物重建上下文。
- spawn 时只传一句："读 `.csp/AGENTS.md`+`lifecycle-state.json` 重建上下文，执行本阶段，完成写 lifecycle+产物+manifest。" 不复述历史。
- 产物 front-matter 互链（`prd_ref`→`related_specs`→`related_tasks`→`adopted_by`）让下游可追溯到上游。

## 四、何时自动跑 / 何时问用户

| 自动跑（不打断） | 问用户（仅这些） |
|---|---|
| 前置 done → 自动 spawn next | 战略根本模糊（roadmap 定位/北极星无法 auto-resolve） |
| gate 通过 → 自动推进/发布（gate 即授权） | PRD Rejected（需求根本问题） |
| 可逆整改（归档 re-point/版本 bump） | 真破坏（删 source/删业务文档） |
| 上游缺漏 → 自动路由回补 | 多 tag/canonical 不明 |
| CMS re-align（verify 通过） | stage 报错且无法 auto-resolve |
| Git 发布（audit+对账通过） | 07 复盘是否触发（可选） |

**绝不问**：schema 模式、PRD Approved（无 Critical）、Git 发布、CMS re-align、初始化/更新范围（非删）。

## 五、05 并行（dev-lead 自编排）

orchestrator 只 spawn `dev-lead` 一次；dev-lead 内部按 Wave + 文件无重叠 spawn 角色 sub-agent（backend/frontend/db/qa），每个独立 git worktree 隔离并行，集成后 Wave 间全量测试。db-engineer 共享资源 → 串行优先。

## 六、用法

### 自动端到端
```
你说："跑流程" / "从 00 开始" / "推进到下一步"
→ 主 agent 调 lifecycle-orchestrator（或直接 spawn 对应 stage agent）
→ orchestrator 读 lifecycle-state → 按链路 spawn → 全自动推进到 06 发布
→ 仅遇上方"问用户"场景才打断你
```

### 手动单阶段
```
你说："写 PRD" → spawn prd-writer
你说："拆 task" → spawn task-breaker
你说："发版" → spawn release-manager
```

### 07 复盘（可选，里程碑后）
```
你说："整体复盘" / "找下一迭代方向" → spawn reviewer
→ findings 写 .csp/review/，回流 roadmap 下一版本主题
```

## 七、新建项目首跑顺序

1. `roadmap-planner`（战略锚点 + 版本号规则 + 1/3 年路径，跑一次）
2. `knowledge-hub`（建 AGENTS.md/manifest/lifecycle-state，棕地蒸馏 CMS，整改既有文档）
3. → 内环 01-06 每版本迭代
4. → `reviewer` 复盘（可选）→ 回 roadmap → 下一轮

## 八、提示词源

本目录 agent 正文来自 `prompts/`（roadmap.md + 00-07 + README）。若改了 prompts/，重新生成 agent（`cp prompts/X.md 内容到 .claude/agents/<name>.md` 的正文部分，保留 frontmatter）。

## 九、迁移到其他项目

本目录可整目录 `cp -r` 到任意项目的 `.claude/agents/`，agent 自包含（共享约定在本 README，全流程定位在每个 agent 顶部），不依赖 prompts/。
