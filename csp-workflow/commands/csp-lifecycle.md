# /csp-lifecycle — 产品全生命周期编排

## 触发方式

```
/csp-lifecycle [需求描述]
/csp-lifecycle --mode full|lightweight|spec-only|extend
/csp-lifecycle --resume    # 从上次中断处继续
/csp-lifecycle --status    # 查看当前进度
```

## 自然语言触发

以下表述会自动路由到本 workflow：
- "帮我从需求到上线做一个完整的XX系统"
- "我有个产品想法，帮我走完全流程"
- "把这个需求完整拆解并生成技术规格"
- "从需求分析到发布，自动化整个开发流程"
- "帮我做全生命周期编排"

## 执行流程

```
1. 解析输入 → 确定 mode 和 start_stage
2. 检查已有产物 → 确定可跳过的阶段
3. 按阶段顺序执行:
   S1: Skill("csp-requirement-decomposition")
   S2: Skill("csp-tech-stack-advisor")
   S3: Skill("csp-fullstack-spec-generator")
   S4: 内置规划逻辑 / Skill("csp-plan-phase")
   S5: Skill("csp-implementation-phase") / Skill("csp-full") P4
   S6: Skill("csp-tdd") + build 验证
   S7: Skill("csp-code-review") + Skill("csp-verify-phase")
   S8: Skill("csp-ship")
   S9: 内置运维建议
4. 每个阶段后执行门控检查
5. 需要用户审批的阶段暂停等待确认
6. 全部完成后输出 lifecycle-report.md
```

## 状态文件

进度持久化到 `.csp/lifecycle-state.json`：

```json
{
  "mode": "full",
  "current_stage": "S3",
  "completed_stages": ["S1", "S2"],
  "skipped_stages": [],
  "started_at": "2026-07-20T10:00:00Z",
  "last_updated": "2026-07-20T11:30:00Z",
  "artifacts": {
    "S1": ".csp/decomposition/",
    "S2": ".csp/tech-decisions/"
  },
  "gates_passed": ["S1→S2", "S2→S3"],
  "user_approvals": {
    "decomposition": true,
    "tech_stack": true
  }
}
```

## 中断与恢复

- 任何时候可以中断（Ctrl+C / 关闭会话）
- `/csp-lifecycle --resume` 从 `lifecycle-state.json` 恢复
- 已完成的阶段不会重复执行
- 当前阶段如果中断，从头重试该阶段

## 与 csp-full 的协作

csp-full 是执行车道，与 lifecycle 共享 `.csp/manifest.json`/`lifecycle-state.json`/`AGENTS.md`——**csp-full 不论哪种形态都回写这三个文件**，不"跳过"产物索引与状态机。完整双边契约与三形态对齐见 `csp-workflow/skills/csp-full/references/inner-loop-alignment.md`。

```
场景 A: 串联（spec-aware）— 需求模糊，需要深度拆解
  → csp-lifecycle S1-S4（产出 .csp/specs/+tasks/）→ csp-full P4-P8（读 specs/tasks 为输入，不重写正本）

场景 B: 独立全流程 — 需求明确，全新产品
  → csp-full P0-P8（不经 orchestrator 的 S1-S4，但全程回写 manifest/lifecycle-state/AGENTS.md）

场景 C: 只需要规格文档
  → csp-lifecycle --mode spec-only (S1-S4 后停止)

场景 D: 轻量增量 — PATCH/MINOR，PRD 已足够详细
  → csp-full P1(精简)/P4 起步，lifecycle-state 标 skipped_stages（不假装全流程），manifest 仍回写本版本增量
```
