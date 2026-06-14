# CSP Full Subagent 编排指南

## 编排原则

1. **并行优先** — 独立任务并行执行
2. **依赖感知** — 有依赖的任务串行执行
3. **上下文隔离** — 每个 subagent 获得最小必要上下文
4. **结果聚合** — 主进程负责聚合所有 subagent 结果

## 编排模式

### 模式 1: 扇出-扇入（Fan-out / Fan-in）

```
                    ┌──→ Subagent A ──┐
Main ───→ Fan-out ──┼──→ Subagent B ───→ Fan-in ──→ Main
                    └──→ Subagent C ──┘
```

**适用场景：**
- P4 并行执行：多个独立功能同时开发
- P6 多视角审查：代码审查 + 安全审查 + 架构审查并行

**实现：**
```
Agent(description="实现后端 API", run_in_background=true, prompt="...")
Agent(description="实现前端 UI", run_in_background=true, prompt="...")
Agent(description="编写测试", run_in_background=true, prompt="...")
# 等待所有完成后聚合
```

### 模式 2: 流水线（Pipeline）

```
Main ──→ Subagent A ──→ Subagent B ──→ Subagent C ──→ Main
```

**适用场景：**
- P0 → P1 → P2 链式依赖
- PRD → 技术设计 → 实现计划

**实现：**
```
# 按顺序执行，每步依赖上一步输出
Skill(skill="csp-brainstorming")        # P0
# 基于 P0 输出 → PRD                      # P1
# 基于 PRD → 技术设计                      # P2
```

### 模式 3: 监督者（Supervisor）

```
Main (Supervisor)
  ├──→ Worker A
  ├──→ Worker B
  └──→ Worker C
        └── 结果报告给 Supervisor 审核
```

**适用场景：**
- P5 QA：主进程监督 QA 循环
- P6 审查：汇总所有审查结果做最终判断

**实现：**
```
# 主进程负责：
# 1. 分配任务给 subagent
# 2. 等待结果
# 3. 审核结果质量
# 4. 决定是否需要返工
```

### 模式 4: 委员会（Committee）

```
                    ┌──→ Reviewer A ──┐
Main ───→ Fan-out ──┼──→ Reviewer B ───→ Vote ──→ Decision
                    └──→ Reviewer C ──┘
```

**适用场景：**
- P6 企业模式审查：多角色投票决定可否发布
- P2 技术设计评审：多架构师评审方案

## 各阶段 Subagent 编排

### P0: 需求澄清

```
# Solo 模式
如果输入模糊:
  Skill(skill="csp-brainstorming") 或 Skill(skill="csp-interview-me")

# 企业模式
Agent(
  description="PM 角色：需求澄清",
  prompt="作为产品经理，分析以下需求并澄清关键问题: [用户输入]"
)
```

### P1: PRD

```
# Solo 模式
生成精简 PRD（内联）

# 企业模式
Agent(
  description="PM 角色：撰写 PRD",
  prompt="基于以下输入撰写产品需求文档: [P0 输出]"
)

# PRD 审批（企业模式）
Agent(
  description="Architect 审查 PRD",
  prompt="审查以下 PRD 的技术可行性: [PRD]"
)
Agent(
  description="Tech Lead 审查 PRD",
  prompt="审查以下 PRD 的实施可行性: [PRD]"
)
```

### P2: 技术设计

```
# Solo 模式
内联生成轻量设计

# 企业模式
Agent(
  description="系统架构设计",
  subagent_type="ecc:architect",
  prompt="设计系统架构: [PRD 输出]"
)
Agent(
  description="安全威胁建模",
  subagent_type="ecc:security-reviewer",
  prompt="进行威胁建模: [架构设计]"
)
```

### P3: 实施规划

```
# Solo 模式
内联生成任务列表

# 企业模式
Agent(
  description="任务分解和规划",
  subagent_type="ecc:planner",
  prompt="将技术设计拆解为可执行任务: [技术设计]"
)
```

### P4: 并行执行

```
# 根据 PLAN.md 中的并行策略
并行组 = [[T1, T2], [T3], [T4, T5]]

for 组 in 并行组:
  agents = []
  for 任务 in 组:
    agent = Agent(
      description="实现: {任务名称}",
      run_in_background=true,
      prompt="实现以下任务: {任务描述}\n技术栈: {检测到的技术栈}"
    )
    agents.append(agent)

  # 等待组内所有完成
  wait_for_all(agents)

  # 集成结果
  merge_changes(agents)
```

### P5: QA

```
# TDD 流程
Skill(skill="csp-tdd")

# QA 循环
max_cycles = 5
for cycle in 1..max_cycles:
  运行构建和测试
  if 全部通过:
    break
  if 同一错误重复 3 次:
    report("根本问题: [错误描述]")
    break
  诊断并修复
```

### P6: 审查

```
# Solo 模式
Skill(skill="csp-code-review")
Agent(description="安全扫描", subagent_type="ecc:security-reviewer")

# 企业模式
agents = [
  Agent(description="代码审查", subagent_type="ecc:code-reviewer"),
  Agent(description="安全审查", subagent_type="ecc:security-reviewer"),
  Agent(description="架构审查", subagent_type="ecc:architect"),
]
# 并行执行
wait_for_all(agents)
# 聚合结果
```

### P7: 发布

```
# 内联执行（无需 subagent）
1. 生成 RELEASE.md
2. 更新 CHANGELOG.md
3. 创建 git tag
4. 部署（如有部署配置）
```

### P8: 运维

```
# 内联执行（无需 subagent）
1. 生成健康检查脚本
2. 提供监控建议
3. 规划下一里程碑
```

## 错误处理

### Subagent 失败策略

```
try:
  result = Agent(...)
except TimeoutError:
  if retry_count < 2:
    retry with simpler prompt
  else:
    fallback to inline execution
except AgentError:
  if error is recoverable:
    fix and retry
  else:
    log error and skip this task
```

### 超时策略

| 阶段 | 超时时间 | 超时行为 |
|------|---------|---------|
| P0 | 5 min | 使用已有信息生成 intake |
| P1 | 10 min | 生成精简版 PRD |
| P2 | 15 min | 生成基础技术设计 |
| P3 | 5 min | 生成简化任务列表 |
| P4 | 30 min / 任务 | 标记未完成，继续 |
| P5 | 20 min | 报告 QA 状态 |
| P6 | 15 min | 使用已有审查结果 |
| P7 | 5 min | 跳过非关键步骤 |
| P8 | 5 min | 跳过运维设置 |
