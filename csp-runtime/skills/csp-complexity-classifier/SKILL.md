---
name: csp-complexity-classifier
description: >
  Heuristic task complexity classifier. Analyzes user input to classify
  tasks as simple/medium/complex, influencing skill loading strategy
  and model selection. Use automatically before task execution.
layer: 4
category: runtime
---

# CSP Complexity Classifier

启发式任务复杂度分类器。在任务执行前自动分析用户输入，将任务分为 simple / medium / complex 三级，影响 skill 加载策略和模型选择。

## When to Use

- **自动触发**：每次收到用户任务时，在 csp-router 路由前执行分类
- **手动触发**：`/csp-complexity` 查看当前任务的分类结果
- **覆盖分类**：`/csp-complexity set {simple|medium|complex}` 强制指定级别

## When NOT to Use

- 纯对话/问答（无代码变更意图）
- 已经由用户显式指定了模型或 skill 组合
- 会话恢复（resume）场景

## 三级复杂度模型

| 级别 | 信号 | 典型场景 |
|------|------|---------|
| **simple** | 单文件、明确指令、<100行变更 | typo修复、添加注释、简单配置、重命名变量 |
| **medium** | 多文件、需要理解上下文、100-500行变更 | bug修复、功能增强、测试编写、API端点添加 |
| **complex** | 跨模块、架构决策、>500行变更 | 新功能开发、重构、技术迁移、性能优化 |

## 启发式信号

分类基于四个维度的信号评估，每个维度归一化到 [0, 1] 区间：

### 1. 文件数量信号 (file_signal)

| 涉及文件数 | 分值 | 说明 |
|-----------|------|------|
| 1 | 0.0 | 单文件操作 |
| 2-3 | 0.4 | 少量关联文件 |
| 4-5 | 0.6 | 多文件协调 |
| 6-10 | 0.8 | 大范围修改 |
| >10 | 1.0 | 系统性变更 |

### 2. 关键词信号 (keyword_signal)

从用户输入中匹配关键词，取最高匹配级别的分值：

| 级别 | 英文关键词 | 中文关键词 | 分值 |
|------|-----------|-----------|------|
| simple | fix typo, add comment, rename, update config, change text, bump version | 修复拼写、加注释、改名、改配置、换文案、升版本 | 0.0-0.2 |
| medium | implement, build, add feature, fix bug, write test, create endpoint, integrate | 实现、开发、新增功能、修bug、写测试、创建接口、集成 | 0.3-0.6 |
| complex | redesign, migrate, refactor, restructure, optimize, overhaul, deprecate, architect | 重新设计、迁移、重构、改造、优化、大改、废弃、架构 | 0.7-1.0 |

完整关键词词典见 [references/classification-rules.md](references/classification-rules.md)。

### 3. 上下文深度信号 (context_signal)

| 深度 | 分值 | 判断依据 |
|------|------|---------|
| none | 0.0 | 无需理解现有代码，纯机械操作 |
| partial | 0.5 | 需理解局部上下文（单个函数/类/模块） |
| full | 1.0 | 需全面理解系统架构、数据流、依赖关系 |

### 4. 影响范围信号 (impact_signal)

| 范围 | 分值 | 判断依据 |
|------|------|---------|
| local | 0.0 | 仅影响当前文件/函数内部 |
| module | 0.5 | 影响一个模块/包的公共接口 |
| system | 1.0 | 影响多个模块、数据库schema、外部API契约 |

## 评分公式

```
score = file_signal * 0.3 + keyword_signal * 0.25 + context_signal * 0.25 + impact_signal * 0.2

if score < 0.33:    → simple
elif score < 0.66:  → medium
else:               → complex
```

权重设计理由：
- **文件数量 (0.3)**：最客观、最容易准确判断的信号
- **关键词 (0.25)**：用户意图的直接表达，但可能有歧义
- **上下文深度 (0.25)**：决定认知负荷，直接影响模型能力需求
- **影响范围 (0.2)**：风险指标，高影响需要更强的推理能力

## 与 csp-budget-enforcer 的集成

分类结果直接影响模型选择策略，与预算状态联合决策：

| 复杂度 | 预算 OK | 预算 WARNING | 预算 SOFT_LIMIT |
|--------|---------|-------------|-----------------|
| simple | haiku | haiku | haiku |
| medium | sonnet | sonnet | haiku |
| complex | opus | sonnet | sonnet (降级警告) |

规则：
- **simple** → 优先使用 haiku（节省预算，简单任务不需要强推理）
- **medium** → sonnet（平衡质量和成本）
- **complex** → opus（质量优先，复杂任务需要最强推理能力）
- 预算紧张时逐级降级，但 complex + SOFT_LIMIT 至少保持 sonnet

## 与 csp-router 的集成

分类结果注入路由上下文，影响 skill 加载策略：

### simple 任务

- **跳过**: csp-brainstorming, csp-plan, writing-plans, deep-research
- **启用**: 直接执行，最小 skill 集合
- **验证**: 基础验证（语法检查、lint）

### medium 任务

- **跳过**: csp-brainstorming（除非用户明确要求）
- **启用**: csp-tdd, requesting-code-review, verification
- **验证**: 标准验证（测试 + lint + type check）

### complex 任务

- **跳过**: 无
- **启用**: csp-brainstorming, csp-plan, csp-tdd, verification, requesting-code-review
- **验证**: 完整验证（测试 + lint + type check + integration test + security scan）

## 输出格式

分类器输出 JSON 结构，供下游 skill 消费：

```json
{
  "complexity": "medium",
  "score": 0.52,
  "signals": {
    "files": 3,
    "keywords": ["implement", "feature"],
    "context_depth": "partial",
    "impact": "module"
  },
  "recommendations": {
    "model": "sonnet",
    "skip_skills": ["csp-brainstorming"],
    "enable_skills": ["csp-tdd"]
  }
}
```

## 用户覆盖

用户可以通过命令强制指定复杂度级别，覆盖自动分类结果：

```
/csp-complexity set simple     # 强制标记为简单
/csp-complexity set medium     # 强制标记为中等
/csp-complexity set complex    # 强制标记为复杂
/csp-complexity                # 显示当前分类结果
```

覆盖后：
- 分类结果中标记 `"overridden": true`
- 后续同会话内的类似任务参考用户偏好进行微调
- 记录到 `.csp/intel/skill-feedback.md` 作为 skill-optimizer 的输入

## Edge Cases

| 场景 | 处理方式 |
|------|---------|
| 无法判断文件数量 | 默认 file_signal = 0.5 (medium) |
| 关键词冲突（同时出现 simple 和 complex 词） | 取较高级别 |
| 用户输入极短（<10字符） | 默认 medium，避免误判 |
| 多任务混合输入 | 按最高复杂度任务分类 |
| 已有 PR/Issue 链接 | 从链接内容提取信号，不只看用户文本 |

详细边界情况处理见 [references/classification-rules.md](references/classification-rules.md)。

## Anti-Patterns

- **DO NOT** 在纯对话/问答场景运行分类器
- **DO NOT** 让分类延迟超过 200ms — 这是预过滤器，不是深度分析
- **DO NOT** 缓存跨会话的分类结果 — 每次任务独立评估
- **DO NOT** 用分类结果替代用户的显式指令 — 用户覆盖永远优先
- **DO NOT** 在 HARD_LIMIT 预算状态下运行分类器 — 直接走 essential 路径

## Related Skills

- [[csp-budget-enforcer]] — 预算状态联合决策模型选择
- [[csp-router]] — 分类结果注入路由上下文
- [[skill-optimizer]] — 收集分类准确性反馈
- [[csp-learning-loop]] — 分类偏好持久化到 intel store
