---
name: csp-codebase-audit
description: "Multi-dimensional codebase audit: parallel Explore agents investigate one dimension each (functionality/architecture/data/frontend/engineering-quality), high-risk findings are verified on-machine, then assembled into a single decision-source document (problem report + design + upgrade plan). Trigger when the user asks for a full/multi-dimensional review, '项目体检', 'codebase audit', or a problem-report + technical-upgrade plan."
version: 1.0.0
layer: 2
category: workflow
phase: review
domain: architecture
scope: review
tools: [Read, Glob, Grep, Bash, WebFetch, WebSearch]
dependencies:
  skills: [csp-codebase-mapper]
related_skills:
  - csp-code-review
  - csp-verification
  - csp-architecture-review
  - csp-defect-mining
anti_rationalizations:
  "I'll just read the code myself": "One context can't hold a large codebase; parallel agents cover more dimensions than a single pass."
  "The agent's finding looks right, skip verification": "P0/P1 findings MUST be machine-verified — agents hallucinate dangling refs and missing files."
  "Skip the report, just tell the user": "The single decision-source doc is the deliverable; verbal summaries lose the upgrade plan's testable acceptance criteria."
---

# Codebase Multidim Audit

对大型代码库执行多维度全面审查，产出**单一决策源文档**（① 问题报告 ② 总体设计方案 ③ 技术升级方案）。

## When to Use

- 用户要求对一个项目做"全面审查 / 多维度 review / 项目体检 / codebase audit"
- 用户要求输出问题报告、总体设计方案、技术升级方案
- 用户指定了若干审查维度（功能模块、架构、数据、前端、工程质量、安全等）
- 接手一个不熟悉的大型代码库，需要系统性摸底

## When NOT to Use

- 单文件/单函数的 code review（直接看代码即可）→ 用 `csp-code-review`
- 仅跑 lint/test（直接执行命令）
- 已有明确 bug 要修（用调试流程）
- CSP 工作流内的 map-codebase（输出 .planning/ 规划文档）

## Phase 0: Context Loading（上下文装载）

主线先建立项目全貌，为代理 prompt 提供准确背景段。

1. **读项目约定文件**（按优先级）：`CLAUDE.md` / `MEMORY.md` / `.cursorrules` / `AGENTS.md` → `README.md` → `pyproject.toml` / `package.json` / `Cargo.toml` → `CHANGELOG.md` 前 100 行。
2. **确定审查基线**：`git log --oneline -5 && git tag --sort=-version:refname | head -5 && git rev-parse --short HEAD`。
3. **规模速览**：`find . -name "*.py" -not -path "*/node_modules/*" -not -path "*/.git/*" | wc -l` + 目录树。
4. **输出**：3-5 句项目背景摘要（技术栈 + 核心子系统 + 规模），后续所有代理 prompt 共用。

## Phase 1: Parallel Dimension Audit（并行多维审查）

### 核心 5 维（默认全开）

| # | 维度 | 审查焦点 |
|---|------|----------|
| ① | 功能模块完整性 | 各子系统实际实现 vs 宣称；半成品/脚手架识别；功能冗余；接口暴露面 |
| ② | 技术架构 | 分层与依赖方向；模块规模；抽象增殖；接口设计；错误处理策略 |
| ③ | 数据管理 | 存储清单；schema 版本化；migration；一致性；隔离与备份 |
| ④ | 前端设计与交互 | 路由盘点；信息架构；设计系统一致性；i18n；假控件与死交互 |
| ⑤ | 工程质量与安全 | 测试真实性 + 方法论多样性（覆盖率≠有效性，高覆盖率但只有 happy-path 单元测试时调用 `csp-defect-mining` 做深度套件审计）；CI 门禁；安全原语接线；密钥管理；依赖安全 |

### 扩展 6 维（按需开启）

⑥ 前后端联动与契约 ⑦ 运行时启动与部署 ⑧ 性能与资源热点 ⑨ 可观测性与韧性 ⑩ 打包发布与版本治理 ⑪ 合规与文档可用性

> 各维度的代理 prompt 模板与调查问题清单见 `references/dimensions.md`。

### 代理派发规则

- 每个维度派 **1 个 Explore 代理**（subagent_type="Explore"），全部并行发出（单条消息多个 Agent 调用）。
- 每个代理 prompt 必须含：① 角色声明（"只做研究，不写代码"）② 项目背景段 ③ 5-8 个编号调查问题 ④ 输出格式（P0/P1/P2/P3 分级，每条含 `file:line + 证据 + 后果`）⑤ thoroughness: "very thorough"。
- **不要一次派超过 6 个代理**——结果收集困难。
- 维度 ⑥⑦ 涉及真实运行时，**由主线自己执行冒烟测试**，不派代理（代理无法保持进程状态）。

### 代理结果收集

- 代理返回后，主线提取各维度 P0/P1 级 findings。
- 标记需要实机核验的结论（见 Phase 2 触发条件）。

## Phase 2: High-Risk Verification（高危结论实机核验）

### 触发条件（满足任一即必须核验，不可直接采信代理结论）

- 严重度 P0（安全红线）
- 结论为"不可用 / 无法实例化 / 从未被调用 / 死代码"
- 涉及核心路径的"缺失"判断（如"无鉴权"、"无 migration"、"脚本不存在"）

### 核验方法

| 方法 | 适用场景 |
|------|----------|
| 实例化测试 | "类无法使用"类结论 |
| 代码走读 | 安全逻辑判断（Read 具体行确认 fallback） |
| 挂载/接线核对 | "从未被调用"类结论（grep router 注册、import、startup hook） |
| 运行时冒烟 | 启动/部署类结论（真实启动服务、curl、看日志） |
| 测试执行 | "测试不存在/全 skip"类结论 |

### 环境陷阱（Pitfalls）

- **Python src-layout**：必须 `PYTHONPATH=src` 或 `pip install -e .` 后才能 import
- **虚拟环境**：优先用项目自带 `.venv/bin/python`，不要系统 python
- **Node monorepo**：检查 pnpm workspace / turbo 配置，build 顺序可能有依赖
- **端口冲突**：冒烟前先 `lsof -i :PORT`
- **后台进程**：冒烟启动的服务用完即杀
- **管道与 exit code**：`cmd | tail; echo $?` 测的是 tail 的退出码，不是 cmd 的——用 `cmd > /tmp/o 2>&1; echo $?` 或 `${PIPESTATUS[0]}`

### 核验结果标注

核验后的 finding 标注 `【已实机核验】` 或 `【核验推翻：实际情况为 ...】`。

## Phase 3: Report Assembly（汇总单一文档）

### 输出位置

写入项目内 `docs/analysis/project-review-{YYYY-MM}.md`（若 `docs/analysis/` 不存在则创建）。**写入前先 `ls docs/analysis/` 确认目录存在。**

### 文档结构

完整模板见 `references/dimensions.md` 第四节。三部分：

1. **问题报告**：总体评估（维度 × 成熟度 × 一句话结论 表格）+ P0 级问题 + 各维度问题（每条含 #/问题/位置/后果）
2. **总体设计方案**：目标架构 / 模块边界 / 数据流 / 关键设计决策
3. **技术升级方案**：P0（1-2 周安全修复+门禁恢复）/ P1（2-4 周核心债务清理）/ P2（1-2 月架构优化）/ P3（季度演进）—— 每阶段含任务列表 + **可测试的验收标准**

### 成熟度评级

| 等级 | 含义 |
|------|------|
| A | 生产就绪，可对外承诺 |
| B | 功能完整，有已知但可控的技术债 |
| C | 骨架可用，关键路径有缺口 |
| D | 名义存在，实际不可用或严重残缺 |

### 写作原则

- 每条 finding 必须有 **file:line 级定位**，禁止泛泛而谈
- "宣称 vs 实际"对比是高价值内容（README 说什么 vs 代码实际怎样）
- 系统性问题提炼为**结构性结论**（如"抽象增殖"、"门禁失效"、"安全门面 > 安全实效"）
- 升级方案的验收标准必须**可机器验证**（如"pytest 全绿"、"curl /health 返回 200"、"npm pack 不含 .bak"）

## Phase 4: Delivery Verification（交付验证）

1. **反幻觉检查**：grep 报告中出现的项目名/模块名/类名，确认拼写正确且真实存在
   `grep -oE '[A-Z][a-zA-Z]+' docs/analysis/project-review-*.md | sort -u | head -30`
2. **结构完整性**：确认三部分齐全、P0-P3 阶段都有验收标准
3. **文件行数**：`wc -l` 确认非空且合理（通常 300-800 行）
4. **向用户交付**：给出文件路径 + 3-5 句核心发现摘要

## Pitfalls（全局注意事项）

- 代理 prompt 必须写"只做研究，不写代码"——否则代理可能修改项目文件
- 代理的"未找到"结论要警惕——可能是搜索路径不对，高危结论必须主线复核
- 冒烟测试可能修改项目状态（生成 .db、写日志）——测试后 `git status` 检查，必要时清理
- 大型 monorepo 的 find/grep 要排除 node_modules/.git/__pycache__

## Verification

- 报告文件存在且三部分结构完整
- P0 findings 全部标注 `【已实机核验】` 或 `【核验推翻】`
- 升级方案每阶段有可测试的验收标准
- 反幻觉 grep 无错误项目名/模块名
