---
name: csp-qa-cr-review
description: "系统化 Code Review 评审工作流。覆盖影响范围、安全性、代码质量、测试覆盖、性能、可维护性六个维度，支持大 CR 并行模式、蒸馏增强调用链追溯、增量版本评审，以及自动生成 Aone TestHub xlsx 测试用例。"
version: 1.11.0
layer: 2
category: workflow
phase: review
domain: quality
scope: review
role: reviewer
tools: [Read, Grep, Glob, Bash, Agent]
triggers:
  - "CR 评审"
  - "代码评审"
  - "review 代码"
  - "code review"
  - "生成测试用例"
  - "CR 链接"
related_skills: [csp-code-review, csp-multi-review, csp-python-reviewer, csp-qa-test-engineering]
anti_rationalizations:
  "代码看着没问题": "六维度逐一检查，不凭第一印象下结论"
  "diff 太小不需要深入": "小 diff 可能在 hub 函数上，影响范围可能很大"
  "没有单元测试也行": "评估是否需要建议补充，而不是默认跳过"
---

# QA Code Review — 系统化六维评审

## 触发条件

用户提供 CR/MR 链接（代码托管平台），或要求对代码变更进行评审。

## CLI 脚本

数据提取与报告生成优先使用脚本，减少多轮工具调用：

```bash
SCRIPT=scripts/cr_review.py

# fetch-meta 需要环境变量 CR_API_BASE（代码平台 API 根地址，如 https://code.example.com）
# lookup-distillation 可用 DISTILLATION_BASE 指定蒸馏目录（默认 ./distillation）
python $SCRIPT parse-url <CR_URL>                       # 解析 URL → project_path/cr_id/app_name
python $SCRIPT fetch-meta <token> <project_id> <cr_id>  # API 获取元数据 JSON
python $SCRIPT parse-diff <page_text_file>              # 解析页面文本 → 结构化 diff
python $SCRIPT lookup-distillation <app> <关键词...>    # 蒸馏查询 → 入口点/调用链
python $SCRIPT gen-report <data.json> -o <out.md>       # 生成 MD 报告
```

## 工作流程

### 前置检查

| 检查项 | 条件 | 动作 |
|--------|------|------|
| 蒸馏数据 | `distillation/{app}/knowledge-graph.json` 存在 | 读取 `references/distillation-integration.md`，启用蒸馏增强 |
| 增量评审 | 多版本 CR（commits>20 / files>30 / 用户指定版本） | 走 push_records API 取增量 diff |
| 网络连通 | 首次 navigate 失败 | `curl --max-time 5` 探测，不通则告知用户 |

### Step 1: 提取 CR 内容

四层策略，按速度优先级递降（详见 `references/diff-extraction-strategy.md`）：

| 层级 | 方式 | 适用场景 |
|------|------|---------|
| 第一层 | Git 直连 | 本地有仓库 |
| 第二层 | API 元数据 | 补充标题/分支/作者 |
| 第三层 | 浏览器 get_page_text | 无本地仓库 |
| 第四层 | 逐文件 URL 导航 | 文件数多且点击不稳定 |

**提取后判断**：文件数 > 10 或变更行 > 500 → 进入 Step 2-B（并行模式）

### Step 2-A: 六维评审（常规 CR）

按以下维度依次分析，未发现问题可跳过该维度：

#### 维度 1: 影响范围评估

- 确定变更代码的工程角色（Controller / Service / DAO / 配置类 / 工具类）
- 向上追溯调用链至对外入口（HTTP / RPC / 定时任务 / MQ）
- 输出**功能入口清单**（入口类型 + 标识 + 业务场景）
- 评估数据安全（DB 记录兼容性、缓存同步）
- 评估替代方案（是否有影响面更小的方式）

**蒸馏增强**：grep edges.jsonl 追溯所有 callers → entry-points.jsonl 确认外部入口 → 补充不在 diff 中的受影响调用方（详见 `references/distillation-integration.md`）

#### 维度 2: 安全性审查

- XSS / SQL 注入 / 反序列化 / 敏感信息泄露 / 权限控制

#### 维度 3: 代码质量

- 边界条件（空值、负数、零值、并发）
- 日志准确性、不必要计算、框架最佳实践

#### 维度 4: 测试覆盖

- **逻辑变更点识别**：逐文件提炼变更点（类型 + 位置 + 行为差异）
- **业务测试用例推导**：正向 + 逆向 + 回归 + 关联场景
- 输出用例清单（编号 / 前置条件 / 操作步骤 / 预期结果）
- 单元测试检查（是否有新增/修改的 UT）

#### 维度 5: 性能影响

- 高频路径上的新增逻辑 / 额外 DB 查询 / 循环内重复计算

#### 维度 6: 可维护性

- 注释说明设计意图 / 魔法数字常量化 / 非常规手段说明

### Step 2-B: 大 CR 并行评审

详见内部流程：

1. **文件风险分级**（快速扫描）

| 风险等级 | 特征 | 评审深度 |
|---------|------|---------|
| 🔴 高 | Controller、Service、配置类、公共 DTO、工具类修改 | 完整六维 |
| 🟡 中 | DAO、普通组件、枚举/常量 | 维度 1/2/3/5 |
| 🟢 低 | CSS、纯文案、测试文件、格式调整 | 维度 2+3 快扫 |

2. **子任务并行**：每组 ≤5 文件且 ≤500 行，独立执行对应深度维度
3. **汇总结果**

### Step 3: 输出评审报告

固定输出区块：

```
CR 概览（表格：标题/仓库/分支/状态/变更/发起人/意图）
功能入口清单（入口类型/标识/业务场景/备注）
逻辑变更点与测试用例（每变更点：用例表格）
评审总览（六维度结论 + 问题数）
问题明细（严重度/维度/问题/描述与建议）
总结（1-2 句 + 是否可合入）
```

**严重度**：[严重] → [高] → [中] → [低]

### Step 4: 生成 MD 报告文件

```bash
python $SCRIPT gen-report <data.json> -o outputs/cr-review-{cr_id}.md
```

### Step 5: 生成测试用例（条件触发）

**触发**：用户要求"生成用例" → 直接生成；未提及 → 评审后询问

详细生成规则见 `references/testcase-generation.md`，核心原则：

| 规则 | 要求 |
|------|------|
| 矩阵式组织 | 入口×状态组合，非单枚举值枚举 |
| 命名规范 | 「前提：[场景]-[行为]，[预期]」完整叙事句 |
| 入口追溯 | grep callers 建入口维度（文件夹） |
| 状态组合 | 组合场景优先，单枚举仅用于特殊分支 |

输出格式：Aone TestHub xlsx（A~J 列），文件名 `{app}_{描述}_CR{cr_id}_测试用例.xlsx`

## 性能与负载控制

- 单次模型输入不超过上下文 60%
- 单文件 diff >300 行：首尾各 150 行截断
- 浏览器超时 30s → 降级下一层
- 连续负载高 → 暂停 10s，逐文件提交

## 经验速查表

详见 `references/cr-review-pitfalls.md`

| 模式 | 风险 | 建议 |
|------|------|------|
| 全局 Bean 替换 | 影响所有接口 | WebMvcConfigurer + 路径匹配 |
| `calculateXxx` 无兜底 | 负值穿透 | `Math.max(0, v)` |
| 日志文案与条件方向相反 | 误导排查 | 方向一致 |
| 修改公共 DTO/VO | 消费方未感知 | 排查所有调用方 |

## References

| 文件 | 内容 |
|------|------|
| `references/diff-extraction-strategy.md` | 四层 diff 提取策略、浏览器操作细节、错误处理 |
| `references/distillation-integration.md` | 蒸馏数据源、集成命令、增量蒸馏触发条件 |
| `references/testcase-generation.md` | 矩阵式用例组织、命名规范、xlsx 模板说明 |
| `references/cr-review-pitfalls.md` | 完整经验陷阱表、浏览器操作禁区 |
| `scripts/cr_review.py` | CLI 辅助脚本（parse-url / fetch-meta / parse-diff / lookup-distillation / gen-report） |
