# Skills, Agents & Scripts 综合索引

> 生成时间：2026-06-20
> 版本：v0.7.0 — 状态感知路由 + 置信度评分 + SKILL.md v2 规范
> 状态：578 个技能分布于 5 个层级，支持状态感知和置信度路由

---

## 概览统计

| 项目 | Skills | Agents | Commands/Workflows | Hooks/Scripts | 定位 |
|------|:------:|:------:|:------------------:|:-------------:|------|
| **ECC** | ~75（含 39 Cursor Rules + 10 Examples） | 64 | 84 cmds + 多平台分发 | ~389 + 5 hooks | 全平台 skill 库（claude/kiro/cursor/agents） |
| **get-shit-done (GSD)** | — | 33 | 67 cmds + 93 workflows | ~703 + 14 hooks | 项目管理框架（plan→execute→verify） |
| **oh-my-claudecode (OMC)** | 41 | 19 | 28 | ~116 + MCP server + benchmark | Claude Code 增强运行时 |
| **superpowers (SP)** | 14 | — | — | ~38 + hooks | 核心元技能（meta-skills） |
| **spec-kit** | 1 | — | — | — | 规范驱动开发工具 |
| **awesome-copilot** | ~40 | ~2 | — | — | GitHub Copilot skills & agents |
| **CSP 总计** | 578 | — | — | — | 5 层架构（L0-L4），状态感知路由 |

---

## 跨项目重叠分析

### 重叠热力图

| 功能类别 | ECC | GSD  **Runtime** | SP | 重叠度 | 合并建议 |
|----------|:---:|:---:|:---:|:---:|:------:|----------|
| **代码审查** | 5 | 3 | 3 | 2 | 🔴 高 | 统一为一个 code-review skill + 语言专项 reviewer agents |
| **调试 Debug** | 2 | 3 | 3 | 1 | 🔴 高 | 保留 GSD debug-session-manager 架构 + ECC 内省调试 |
| **测试/TDD** | 12+ | 2 | 2 | 1 | 🔴 高 | ECC 语言专项测试 + SP TDD 方法论合并 |
| **规划 Planning** | 2 | 5 | 3 | 2 | 🔴 高 | GSD plan-phase 为主干 + SP writing-plans 方法论 |
| **规范驱动 Spec-Driven** | — | — | — | 1(SK) | 🟡 中 | CSP spec-driven-development + GSD spec-phase 统一 |
| **研究 Research** | 4 | 5 | 3 | — | 🟡 中 | GSD researcher agents 为骨架 + ECC deep-research 能力 |
| **验证 Verify** | 2 | 4 | 3 | 1 | 🔴 高 | 合并为统一 verification-loop + CSP 三维度验证（completeness/correctness/coherence） |
| **安全 Security** | 5 | 2 | 1 | — | 🟡 中 | ECC security-review 为主 + 框架专项 security skills |
| **自主执行** | 3 | 2 | 5 | 1 | 🔴 高 | Runtime autopilot/ralph + GSD autonomous 合并 |
| **Agent 编排** | 4 | 3 | 4 | 2 | 🔴 高 | 统一 orchestration 层 |
| **文档处理** | 3 | 5 | 2 | — | 🟡 中 | GSD doc pipeline 为主 + ECC documentation-lookup |
| **UI/前端** | 4 | 5 | 1 | — | 🟡 中 | GSD ui-phase 流程 + ECC frontend-patterns |
| **Git/分支** | — | 1 | 1 | 1 | 🟢 低 | 合并为一个 git-workflow skill |
| **内容/营销** | 7 | — | 1 | — | 🟢 低 | ECC 独有，保留 |
| **项目管理** | — | 20+ | 2 | — | 🟢 低 | GSD 独有核心，保留 |
| **运行时/工具** | 4 | — | 8 | 1 | 🟡 中 | 运行时 skills 统一 |

---

## 详细分类索引

### 1. 代码审查 (Code Review)

| 名称 | 来源 | 类型 | 描述 | V2 | 合并建议 |
|------|------|------|------|----|----------|
| `code-reviewer` | ECC/agents | Agent | 通用代码审查 | — | ✅ 保留为主 agent |
| `code-reviewer`  **Runtime/agents** | Agent | 严重度评级审查 | — | 🔀 合并入 ECC code-reviewer |
| `gsd-code-reviewer` | GSD/agents | Agent | 生成 REVIEW.md | — | 🔀 合并，保留 REVIEW.md 输出格式 |
| `code-simplifier` | ECC/agents | Agent | 代码简化 | — | ✅ 保留 |
| `code-simplifier`  **Runtime/agents** | Agent | 代码简化 | — | 🔀 与 ECC 合并 |
| `code-review` | GSD | Workflow | 审查+修复流程 | — | ✅ 保留为主 workflow |
| `code-review-fix` | GSD | Workflow | 修复审查发现 | — | ✅ 保留 |
| `requesting-code-review` | SP | Skill | 请求审查方法论 | — | ✅ 保留为元技能 |
| `receiving-code-review` | SP | Skill | 接收审查反馈方法论 | — | ✅ 保留为元技能 |
| `cpp-reviewer` | ECC/agents | Agent | C++ 专项 | — | ✅ 保留 |
| `csharp-reviewer` | ECC/agents | Agent | C# 专项 | — | ✅ 保留 |
| `django-reviewer` | ECC/agents | Agent | Django 专项 | — | ✅ 保留 |
| `fastapi-reviewer` | ECC/agents | Agent | FastAPI 专项 | — | ✅ 保留 |
| `flutter-reviewer` | ECC/agents | Agent | Flutter 专项 | — | ✅ 保留 |
| `fsharp-reviewer` | ECC/agents | Agent | F# 专项 | — | ✅ 保留 |
| `go-reviewer` | ECC/agents | Agent | Go 专项 | — | ✅ 保留 |
| `java-reviewer` | ECC/agents | Agent | Java 专项 | — | ✅ 保留 |
| `kotlin-reviewer` | ECC/agents | Agent | Kotlin 专项 | — | ✅ 保留 |
| `python-reviewer` | ECC/agents | Agent | Python 专项 | — | ✅ 保留 |
| `react-reviewer` | ECC/agents | Agent | React 专项 | — | ✅ 保留 |
| `rust-reviewer` | ECC/agents | Agent | Rust 专项 | — | ✅ 保留 |
| `swift-reviewer` | ECC/agents | Agent | Swift 专项 | — | ✅ 保留 |
| `typescript-reviewer` | ECC/agents | Agent | TypeScript 专项 | — | ✅ 保留 |
| `php-reviewer` | ECC/agents | Agent | PHP 专项 | — | ✅ 保留 |
| `security-reviewer` | ECC/agents | Agent | 安全审查 | — | ✅ 保留 |
| `security-reviewer`  **Runtime/agents** | Agent | 安全审查 | — | 🔀 合并入 ECC security-reviewer |
| `critic`  **Runtime/agents** | Agent | 多角度审查 | — | 🔀 功能与 code-reviewer 重叠 |
| `comment-analyzer` | ECC/agents | Agent | 注释分析 | — | ✅ 保留（独特） |
| `silent-failure-hunter` | ECC/agents | Agent | 静默失败检测 | — | ✅ 保留（独特） |

### 2. 调试 (Debug)

| 名称 | 来源 | 类型 | 描述 | V2 | 合并建议 |
|------|------|------|------|----|----------|
| `agent-introspection-debugging` | ECC/.agents | Skill | Agent 自省调试 | — | ✅ 保留（独特） |
| `debugger`  **Runtime/agents** | Agent | 根因分析 | — | 🔀 与 GSD debugger 合并 |
| `gsd-debugger` | GSD/agents | Agent | 科学方法调试 | — | ✅ 保留为主 agent |
| `gsd-debug-session-manager` | GSD/agents | Agent | 多轮调试管理 | — | ✅ 保留（独特架构） |
| `debug`  **Runtime** | Skill+Cmd | 会话调试 | — | 🔀 合并入统一 debug workflow |
| `trace`  **Runtime** | Skill | 证据驱动追踪 | — | 🔀 与 GSD forensics 合并 |
| `tracer`  **Runtime/agents** | Agent | 因果追踪 | — | 🔀 与 trace skill 合并 |
| `systematic-debugging` | SP | Skill | 系统化调试方法论 | — | ✅ 保留为元技能 |
| `debug` | GSD | Workflow+Cmd | 调试流程 | — | ✅ 保留为主 workflow |
| `diagnose-issues` | GSD | Workflow | 问题诊断 | — | 🔀 与 debug 合并 |
| `forensics` | GSD | Workflow | 取证分析 | — | ✅ 保留（独特） |

### 3. 测试 / TDD

| 名称 | 来源 | 类型 | 描述 | V2 | 合并建议 |
|------|------|------|------|----|----------|
| `tdd-workflow` | ECC/.kiro+.agents | Skill | TDD 工作流 | — | 🔀 与 SP TDD 合并 |
| `test-driven-development` | SP | Skill | TDD 方法论 | — | ✅ 保留为元技能 |
| `tdd-guide` | ECC/agents | Agent | TDD 指导 | — | 🔀 与 tdd-workflow 合并 |
| `test-engineer`  **Runtime/agents** | Agent | 测试策略 | — | 🔀 合并入 ECC tdd-guide |
| `qa-tester`  **Runtime/agents** | Agent | CLI 交互测试 | — | ✅ 保留（独特 tmux 方式） |
| `e2e-testing` | ECC/.kiro | Skill | E2E 测试 | — | ✅ 保留 |
| `e2e-runner` | ECC/agents | Agent | E2E 运行 | — | ✅ 保留 |
| `cpp-testing` | ECC/.kiro | Skill | C++ 测试 | — | ✅ 保留 |
| `csp-golang-testing` | ECC/.kiro | Skill | Go 测试 | — | ✅ 保留 |
| `csp-kotlin-testing` | ECC/.kiro | Skill | Kotlin 测试 | — | ✅ 保留 |
| `csp-python-testing` | ECC/.kiro | Skill | Python 测试 | — | ✅ 保留 |
| `react-testing` | ECC/.kiro | Skill | React 测试 | — | ✅ 保留 |
| `rust-testing` | ECC/.kiro | Skill | Rust 测试 | — | ✅ 保留 |
| `add-tests` | GSD | Workflow | 添加测试 | — | ✅ 保留（GSD 集成） |
| `ultraqa`  **Runtime** | Skill | QA 循环 | — | ✅ 保留（独特循环模式） |

### 4. 规划 (Planning)

| 名称 | 来源 | 类型 | 描述 | V2 | 合并建议 |
|------|------|------|------|----|----------|
| `gsd-planner` | GSD/agents | Agent | 阶段规划 | — | ✅ 保留为主 agent |
| `gsd-plan-checker` | GSD/agents | Agent | 计划验证 | — | ✅ 保留 |
| `gsd-roadmapper` | GSD/agents | Agent | 路线图生成 | — | ✅ 保留（独特） |
| `plan-phase` | GSD | Workflow+Cmd | 规划阶段 | — | ✅ 保留（GSD 核心） |
| `plan`  **Runtime** | Skill | 策略规划+访谈 | — | 🔀 方法论合并入 GSD |
| `ralplan`  **Runtime** | Skill | 共识规划入口 | — | 🔀 模糊请求拦截合并 |
| `planner`  **Runtime/agents** | Agent | 策略规划顾问 | — | 🔀 与 GSD planner 合并 |
| `analyst`  **Runtime/agents** | Agent | 需求分析 | — | 🔀 与 GSD assumptions-analyzer 合并 |
| `writing-plans` | SP | Skill | 计划撰写方法论 | — | ✅ 保留为元技能 |
| `executing-plans` | SP | Skill | 计划执行方法论 | — | ✅ 保留为元技能 |
| `sketch` | GSD | Workflow+Cmd | 快速草图 | — | ✅ 保留（独特） |
| `spike` | GSD | Workflow+Cmd | 技术探查 | — | ✅ 保留（独特） |
| `ultraplan-phase` | GSD | Workflow | 超级规划 | — | ✅ 保留 |
| `discuss-phase` | GSD | Workflow | 讨论阶段 | — | ✅ 保留（独特） |

### 5. 研究 (Research)

| 名称 | 来源 | 类型 | 描述 | V2 | 合并建议 |
|------|------|------|------|----|----------|
| `deep-research` | ECC/.kiro+.agents | Skill | 多源深度研究 | — | ✅ 保留（firecrawl+exa） |
| `exa-search` | ECC/.agents | Skill | Exa 神经搜索 | — | ✅ 保留 |
| `search-first` | ECC/.kiro | Skill | 搜索优先策略 | — | ✅ 保留 |
| `gsd-project-researcher` | GSD/agents | Agent | 项目生态研究 | — | ✅ 保留（GSD 集成） |
| `gsd-phase-researcher` | GSD/agents | Agent | 阶段实施研究 | — | ✅ 保留 |
| `gsd-ai-researcher` | GSD/agents | Agent | AI 框架研究 | — | ✅ 保留 |
| `gsd-domain-researcher` | GSD/agents | Agent | 业务领域研究 | — | ✅ 保留 |
| `gsd-research-synthesizer` | GSD/agents | Agent | 研究综合 | — | ✅ 保留 |
| `gsd-advisor-researcher` | GSD/agents | Agent | 灰色决策研究 | — | ✅ 保留 |
| `autoresearch`  **Runtime** | Skill | 状态化改进循环 | — | ✅ 保留（独特循环模式） |
| `deep-dive`  **Runtime** | Skill | 因果调查+需求结晶 | — | 🔀 调查部分与 forensics 合并 |
| `deep-interview`  **Runtime** | Skill | 苏格拉底访谈 | — | ✅ 保留（独特） |
| `external-context`  **Runtime** | Skill | 并行文档搜索 | — | 🔀 与 ECC documentation-lookup 合并 |
| `document-specialist`  **Runtime/agents** | Agent | 外部文档专家 | — | 🔀 与 ECC docs-lookup 合并 |

### 6. 验证 (Verification)

| 名称 | 来源 | 类型 | 描述 | V2 | 合并建议 |
|------|------|------|------|----|----------|
| `verification-loop` | ECC/.kiro+.agents | Skill | 综合验证系统 | — | 🔀 合并为统一验证层 |
| `verification-before-completion` | SP | Skill | 完成前验证方法论 | — | ✅ 保留为元技能 |
| `gsd-verifier` | GSD/agents | Agent | 目标回溯验证 | — | ✅ 保留（GSD 集成） |
| `gsd-integration-checker` | GSD/agents | Agent | 跨阶段集成验证 | — | ✅ 保留 |
| `gsd-nyquist-auditor` | GSD/agents | Agent | 覆盖率填充 | — | ✅ 保留（独特） |
| `verify-work` | GSD | Workflow+Cmd | 工作验证 | — | ✅ 保留 |
| `validate-phase` | GSD | Workflow+Cmd | 阶段验证 | — | ✅ 保留 |
| `verify-phase` | GSD | Workflow | 阶段验证 | — | 🔀 与 validate-phase 合并 |
| `verify`  **Runtime** | Skill | 变更验证 | — | 🔀 合并入统一验证层 |
| `visual-verdict`  **Runtime** | Skill | 视觉 QA | — | ✅ 保留（独特） |
| `verifier`  **Runtime/agents** | Agent | 验证策略 | — | 🔀 与 GSD verifier 合并 |

### 7. 安全 (Security)

| 名称 | 来源 | 类型 | 描述 | V2 | 合并建议 |
|------|------|------|------|----|----------|
| `security-review` | ECC/.kiro+.agents | Skill | 安全审查 | — | ✅ 保留为主 skill |
| `security-reviewer` | ECC/agents | Agent | 安全审查 agent | — | ✅ 保留 |
| `django-security` | ECC/.kiro | Skill | Django 安全 | — | ✅ 保留 |
| `springboot-security` | ECC/.kiro | Skill | Spring Boot 安全 | — | ✅ 保留 |
| `gsd-security-auditor` | GSD/agents | Agent | 安全审计 | — | ✅ 保留（GSD 集成） |
| `secure-phase` | GSD | Workflow+Cmd | 安全阶段 | — | ✅ 保留 |
| `security-reviewer`  **Runtime/agents** | Agent | 安全漏洞检测 | — | 🔀 合并入 ECC security-reviewer |

### 8. 自主执行 & Agent 编排

| 名称 | 来源 | 类型 | 描述 | V2 | 合并建议 |
|------|------|------|------|----|----------|
| `autonomous-loops` | ECC/.kiro | Skill | 自主循环架构 | — | ✅ 保留（参考文档） |
| `loop-operator` | ECC/agents | Agent | 自主循环运行 | — | ✅ 保留 |
| `dmux-workflows` | ECC/.agents | Skill | 多 agent tmux 编排 | — | ✅ 保留（独特） |
| `gsd-executor` | GSD/agents | Agent | 计划执行器 | — | ✅ 保留（GSD 核心） |
| `autonomous` | GSD | Workflow+Cmd | 自主执行 | — | ✅ 保留 |
| `autopilot`  **Runtime** | Skill | 全自动执行 | — | ✅ 保留（独特 UI） |
| `ralph`  **Runtime** | Skill | 自指循环到完成 | — | ✅ 保留（独特） |
| `ultrawork`  **Runtime** | Skill | 并行执行引擎 | — | ✅ 保留 |
| `team`  **Runtime** | Skill | N agent 协调 | — | ✅ 保留 |
| `cli-teams`  **Runtime** | Skill | tmux 团队运行时 | — | 🔀 与 dmux-workflows 合并 |
| `scicli`  **Runtime** | Skill | 并行科学家 agents | — | 🔀 与 team 合并 |
| `dispatching-parallel-agents` | SP | Skill | 并行 agent 调度方法论 | — | ✅ 保留为元技能 |
| `subagent-driven-development` | SP | Skill | 子 agent 驱动开发 | — | ✅ 保留为元技能 |
| `executor`  **Runtime/agents** | Agent | 任务执行 | — | 🔀 与 GSD executor 合并 |
| `chief-of-staff` | ECC/agents | Agent | 通信参谋 | — | ✅ 保留（独特） |

### 9. 文档处理

| 名称 | 来源 | 类型 | 描述 | V2 | 合并建议 |
|------|------|------|------|----|----------|
| `documentation-lookup` | ECC/.cursor+.agents | Skill | Context7 文档查询 | ✅ 保留 |
| `docs-lookup` | ECC/agents | Agent | 文档查询 agent | 🔀 与 documentation-lookup 合并 |
| `doc-updater` | ECC/agents | Agent | 文档更新 | ✅ 保留 |
| `gsd-doc-classifier` | GSD/agents | Agent | 文档分类 | ✅ 保留（GSD 集成） |
| `gsd-doc-synthesizer` | GSD/agents | Agent | 文档综合 | ✅ 保留 |
| `gsd-doc-verifier` | GSD/agents | Agent | 文档验证 | ✅ 保留 |
| `gsd-doc-writer` | GSD/agents | Agent | 文档撰写 | ✅ 保留 |
| `docs-update` | GSD | Workflow | 文档更新流程 | ✅ 保留 |
| `ingest-docs` | GSD | Workflow+Cmd | 文档摄入 | ✅ 保留 |
| `remember`  **Runtime** | Skill | 项目知识管理 | ✅ 保留（独特） |
| `wiki`  **Runtime** | Skill | 持久知识库 | ✅ 保留（独特） |
| `csp-learning-loop` | CSP-native | Skill | 自动会话边界学习编排器，5 维度知识积累 | ✅ | ✅ 保留（独特） |
| `writer`  **Runtime/agents** | Agent | 技术文档撰写 | 🔀 与 GSD doc-writer 合并 |

### 10. UI/前端

| 名称 | 来源 | 类型 | 描述 | V2 | 合并建议 |
|------|------|------|------|----|----------|
| `frontend-patterns` | ECC/.kiro+.agents | Skill | 前端模式 (React 内容已分离至 react-patterns) | ✅ 保留 |
| `frontend-slides` | ECC/.cursor+.agents | Skill | HTML 演示 | ✅ 保留（独特） |
| `react-patterns` | ECC/.kiro | Skill | React 模式 | ✅ 保留 |
| `nextjs-turbopack` | ECC/.kiro+.cursor+.agents | Skill | Next.js+Turbo | ✅ 保留 |
| `gsd-ui-researcher` | GSD/agents | Agent | UI 设计合约 | ✅ 保留 |
| `gsd-ui-checker` | GSD/agents | Agent | UI 合约验证 | ✅ 保留 |
| `gsd-ui-auditor` | GSD/agents | Agent | UI 6维审计 | ✅ 保留 |
| `ui-phase` | GSD | Workflow+Cmd | UI 阶段 | ✅ 保留 |
| `ui-review` | GSD | Workflow+Cmd | UI 审查 | ✅ 保留 |
| `designer`  **Runtime/agents** | Agent | UI/UX 设计 | ✅ 保留（独特） |
| `a11y-architect` | ECC/agents | Agent | 无障碍架构 | ✅ 保留（独特） |

### 11. 后端/框架 Patterns（ECC 独有，全部保留）

| 名称 | 来源 | 描述 |
|------|------|------|
| `backend-patterns` | ECC/.kiro+.agents | 后端架构 (含 api-design 合并) |
| `django-patterns` | ECC/.kiro | Django |
| `fastapi-patterns` | ECC/.kiro | FastAPI |
| `nestjs-patterns` | ECC/.kiro | NestJS |
| `springboot-patterns` | ECC/.kiro | Spring Boot |
| `csp-kotlin-patterns` | ECC/.kiro | Kotlin |
| `rust-patterns` | ECC/.kiro | Rust |
| `csp-python-patterns` | ECC/.kiro | Python |
| `csp-golang-patterns` | ECC/.kiro | Go |
| `postgres-patterns` | ECC/.kiro | PostgreSQL |
| `jpa-patterns` | ECC/.kiro | JPA/Hibernate |
| `pytorch-patterns` | ECC/.kiro | PyTorch |
| `docker-patterns` | ECC/.kiro | Docker |
| `deployment-patterns` | ECC/.kiro | 部署 |
| `mcp-server-patterns` | ECC/.kiro+.cursor+.agents | MCP 服务器 |
| `database-migrations` | ECC/.kiro | 数据库迁移 |
| `api-design` | ECC/.kiro+.agents | ❌ 已合并入 `backend-patterns` |
| `coding-standards` | ECC/.kiro+.agents | 通用编码标准 |
| `cpp-coding-standards` | ECC/.kiro | C++ 标准 |
| `java-coding-standards` | ECC/.kiro | Java 标准 |
| `swift-actor-persistence` | ECC/.kiro | Swift Actor |
| `swift-protocol-di-testing` | ECC/.kiro | Swift DI |

### 12. 内容/营销（ECC 独有，全部保留）

| 名称 | 来源 | 描述 |
|------|------|------|
| `article-writing` | ECC/.cursor+.agents | 文章撰写 |
| `brand-voice` | ECC/.agents | 品牌声音 |
| `content-engine` | ECC/.cursor+.agents | 内容引擎 |
| `crosspost` | ECC/.agents | 跨平台发布 |
| `investor-materials` | ECC/.cursor+.agents | 投资人材料 |
| `investor-outreach` | ECC/.cursor+.agents | 投资人联络 |
| `market-research` | ECC/.cursor+.agents | 市场研究 |
| `x-api` | ECC/.agents | X/Twitter API |
| `video-editing` | ECC/.agents | 视频编辑 |
| `fal-ai-media` | ECC/.agents | AI 媒体生成 |
| `marketing-agent` | ECC/agents | 营销策略师 |
| `seo-specialist` | ECC/agents | SEO 专家 |

### 13. 运行时/工具链

| 名称 | 来源 | 描述 | 合并建议 |
|------|------|------|----------|
| `bun-runtime` | ECC/.cursor+.agents | Bun 运行时 | ✅ 保留 |
| `strategic-compact` | ECC/.kiro+.agents | 上下文压缩 | ✅ 保留 |
| `everything-claude-code` | ECC/.claude+.agents | Claude Code 百科 | ✅ 保留 |
| `mle-workflow` | ECC/.kiro+.agents | ML 工程 | ✅ 保留 |
| `eval-harness` | ECC/.agents | 评估框架 | ✅ 保留 |
| `deepinit`  **Runtime** | 深度初始化 | ✅ 保留 |
| `cli-doctor`  **Runtime** | 安装诊断 | ✅ 保留 |
| `cli-setup`  **Runtime** | 安装设置 | ✅ 保留 |
| `mcp-setup`  **Runtime** | MCP 配置 | ✅ 保留 |
| `configure-notifications`  **Runtime** | 通知配置 | ✅ 保留 |
| `hud`  **Runtime** | HUD 配置 | ✅ 保留 |
| `skill` (Runtime) | 技能管理 | ✅ 保留 |
| `skillify`  **Runtime** | 技能化 | ✅ 保留 |
| `learner`  **Runtime** | 学习提取 | ✅ 保留 |
| `ai-slop-cleaner`  **Runtime** | AI 代码清理 | ✅ 保留（独特） |
| `self-improve`  **Runtime** | 自我改进 | ✅ 保留（独特） |
| `writing-skills` | SP | 技能撰写方法论 | ✅ 保留 |
| `csp-workflow-schema` | CSP-Native | 声明式 JSON 工作流引擎 | ✅ v0.7.0 新增 |
| `csp-budget-enforcer` | CSP-Native | 四级 Token 预算降级管理 | ✅ v0.7.0 新增 |
| `csp-parallel-worktree` | CSP-Native | 并行任务自动 worktree 分配 | ✅ v0.7.0 新增 |
| `csp-complexity-classifier` | CSP-Native | 启发式任务复杂度分类 | ✅ v0.7.0 新增 |
| `csp-model-selector` | CSP-Native | 复杂度→模型自动映射 | ✅ v0.7.0 新增 |

### 14. 项目管理（GSD 核心，全部保留）

| 名称 | 类型 | 描述 |
|------|------|------|
| `new-project` | Workflow+Cmd | 新建项目 |
| `new-milestone` | Workflow+Cmd | 新建里程碑 |
| `complete-milestone` | Workflow+Cmd | 完成里程碑 |
| `execute-phase` | Workflow+Cmd | 执行阶段 |
| `progress` | Workflow+Cmd | 进度查看 |
| `stats` | Workflow+Cmd | 统计 |
| `health` | Workflow | 健康检查 |
| `ship` | Workflow+Cmd | 发布 |
| `cleanup` | Workflow | 清理 |
| `inbox` | Workflow+Cmd | 收件箱 |
| `manager` | Workflow+Cmd | 管理器 |
| `thread` | Workflow+Cmd | 线程 |
| `capture` | Workflow+Cmd | 捕获 |
| `note` | Workflow | 笔记 |
| `update` | Workflow+Cmd | 更新 |
| `undo` | Workflow+Cmd | 撤销 |
| `settings` | Workflow+Cmd | 设置 |
| `workspace` | Workflow+Cmd | 工作空间 |
| `explore` | Workflow+Cmd | 探索 |
| `import` | Workflow+Cmd | 导入 |
| `map-codebase` | Workflow+Cmd | 代码库映射 |
| `profile-user` | Workflow | 用户画像 |
| `extract-learnings` | Workflow | 提取教训 |
| `pr-branch` | Workflow+Cmd | PR 分支 |
| `pause-work` / `resume-work` | Workflow+Cmd | 暂停/恢复 |
| `audit-fix` / `audit-milestone` / `audit-uat` | Workflow+Cmd | 审计系列 |
| `fast` / `quick` | Workflow+Cmd | 快速模式 |
| `mvp-phase` | Workflow | MVP 阶段 |
| `spec-phase` | Workflow | 规格阶段 |
| `ai-integration-phase` | Workflow+Cmd | AI 集成 |
| `eval-review` | Workflow+Cmd | 评估审查 |
| `milestone-summary` | Workflow+Cmd | 里程碑摘要 |
| `plan-review-convergence` | Workflow+Cmd | 计划收敛 |
| `add-backlog` / `add-phase` / `add-todo` | Workflow | 添加系列 |
| `edit-phase` / `insert-phase` / `remove-phase` | Workflow | 阶段编辑 |
| `new-workspace` / `list-workspaces` / `remove-workspace` | Workflow | 工作空间管理 |
| `do` / `next` / `transition` | Workflow | 任务流转 |
| `session-report` / `sync-skills` / `scan` | Workflow | 会话/同步/扫描 |
| `graduation` / `plant-seed` / `node-repair` | Workflow | 毕业/种子/修复 |

### 15. 特殊/独特功能

| 名称 | 来源 | 描述 | 合并建议 |
|------|------|------|----------|
| `gan-planner/generator/evaluator` | ECC/agents | GAN 三段式 | ✅ 保留（独特架构） |
| `opensource-forker/sanitizer/packager` | ECC/agents | 开源流水线 | ✅ 保留（独特） |
| `homelab-architect` | ECC/agents | 家庭网络 | ✅ 保留（独特） |
| `network-architect/troubleshooter/config-reviewer` | ECC/agents | 网络系列 | ✅ 保留（独特） |
| `healthcare-reviewer` | ECC/agents | 医疗审查 | ✅ 保留（独特） |
| `harness-optimizer` | ECC/agents | 运行时优化 | ✅ 保留（独特） |
| `conversation-analyzer` | ECC/agents | 对话分析 | ✅ 保留（独特） |
| `type-design-analyzer` | ECC/agents | 类型设计 | ✅ 保留（独特） |
| `pr-test-analyzer` | ECC/agents | PR 测试分析 | ✅ 保留（独特） |
| `refactor-cleaner` | ECC/agents | 死代码清理 | ✅ 保留（独特） |
| `build-error-resolver` + 9 种语言系列 | ECC/agents | 构建错误修复 | ✅ 保留 |
| ↳ `cpp-build-resolver` | ECC/agents | C++/CMake 构建修复 | ✅ |
| ↳ `dart-build-resolver` | ECC/agents | Dart/Flutter 构建修复 | ✅ |
| ↳ `django-build-resolver` | ECC/agents | Django 迁移/依赖修复 | ✅ |
| ↳ `go-build-resolver` | ECC/agents | Go build/vet 修复 | ✅ |
| ↳ `java-build-resolver` | ECC/agents | Maven/Gradle 构建修复 | ✅ |
| ↳ `kotlin-build-resolver` | ECC/agents | Kotlin/Gradle 构建修复 | ✅ |
| ↳ `pytorch-build-resolver` | ECC/agents | PyTorch/CUDA 训练修复 | ✅ |
| ↳ `react-build-resolver` | ECC/agents | React/Vite/Next 构建修复 | ✅ |
| ↳ `rust-build-resolver` | ECC/agents | Cargo 编译修复 | ✅ |
| ↳ `swift-build-resolver` | ECC/agents | Swift/Xcode 构建修复 | ✅ |
| `architect` | ECC/agents | 软件架构专家（系统设计/可扩展性）model:opus | ✅ 保留 |
| `code-architect` | ECC/agents | 特性架构设计（代码模式分析→蓝图）model:sonnet | ✅ 保留 |
| `code-explorer` | ECC/agents | 深度代码库分析（执行路径追踪/依赖映射） | ✅ 保留 |
| `database-reviewer` | ECC/agents | PostgreSQL 专家（查询优化/RLS/Supabase） | ✅ 保留（独特） |
| `performance-optimizer` | ECC/agents | 性能优化专家（profiling/内存/渲染/算法） | ✅ 保留（独特） |
| `planner` | ECC/agents | 复杂特性规划专家 model:opus | 🔀 与 GSD planner 协同 |
| `harmonyos-app-resolver` | ECC/agents | HarmonyOS | ✅ 保留（独特） |
| `product-capability` | ECC/.agents | PRD→SRS | ✅ 保留（独特） |
| `project-session-manager`  **Runtime** | worktree 环境管理 | ✅ 保留 |
| `ultragoal`  **Runtime** | 持久多目标工作流 | ✅ 保留（独特） |
| `ccg`  **Runtime** | 三模型编排 | ✅ 保留（独特） |
| `scientist`  **Runtime/agents** | 数据分析 | ✅ 保留（独特） |
| `git-master`  **Runtime/agents** | Git 专家 | ✅ 保留 |
| `using-git-worktrees` | SP | Git worktree 方法论 | ✅ 保留为元技能 |
| `finishing-a-development-branch` | SP | 分支完成方法论 | ✅ 保留为元技能 |
| `brainstorming` | SP | 头脑风暴方法论 | ✅ 保留为元技能 |
| `spec-kit / add-community-extension` | spec-kit | 社区扩展 | ✅ 保留（独特） |

### 16. 规范驱动开发 (Spec-Driven Development)

| 名称 | 来源 | 类型 | 描述 | V2 | 合并建议 |
|------|------|------|------|----|----------|
| `csp-spec-driven-development` | CSP/meta | Skill | 规范驱动方法论 + delta specs + 工件 DAG | ✅ | ✅ 保留（核心方法论） |
| `csp-spec-contract` | CSP/meta | Skill | 输入 → SPEC 契约生成 | ✅ | ✅ 保留 |
| `csp-spec-phase` | GSD/workflow | Workflow | 苏格拉底访谈 + 模糊度评分 → CSPEC.md | ✅ | ✅ 保留（需求澄清） |
| `csp-planning-phase` | GSD/workflow | Command | 规划阶段：PRD + 用户故事 + SPEC | ✅ | ✅ 保留 |
| `csp-execute-phase` | GSD/workflow | Workflow | 按计划执行任务 | ✅ | ✅ 保留 |
| `csp-verify-phase` | GSD/workflow | Workflow | 目标反向 + 三维度验证 | ✅ | ✅ 保留 |
| `csp-hotfix` | CSP/workflow | Workflow | 热修复流程（跳过设计，直接修复+验证） | ✅ | ✅ 保留 |
| `csp-tweak` | CSP/workflow | Workflow | 微调流程（轻量级小改动，简化验证） | ✅ | ✅ 保留 |
| `csp-doc-lifecycle-manager` | CSP/workflow | Workflow | 文档生命周期管理：归类→归档→索引→裁剪的 5 步工作流 | ✅ | ✅ 保留（文档治理） |
| `csp-project-doc-architect` | CSP/workflow | Workflow | 文档架构设计：标准目录树、命名规范、索引要求、卫生规则 | ✅ | ✅ 保留（文档治理） |
| `csp-session-knowledge-extractor` | CSP/workflow | Workflow | 会话知识提炼：从开发会话中提取可复用知识并路由到文档 | ✅ | ✅ 保留（文档治理） |
| `artifact-verification.md` | CSP/workflow | Reference | completeness/correctness/coherence | ✅ 保留 |
| `change-artifacts/` templates | CSP/workflow | Templates | proposal/spec/design/tasks | ✅ 保留 |
| Delta Specs | CSP 概念 | 模式 | ADDED/MODIFIED/REMOVED 增量合并 | ✅ 保留（brownfield） |
| Artifact DAG | CSP 概念 | 架构 | proposal → CSPEC → design → tasks | ✅ 并入 GSD 阶段链 |

### 17. AI 工程 (AI/LLM Engineering)

| 名称 | 来源 | 类型 | 描述 | V2 | 合并建议 |
|------|------|------|------|----|----------|
| `csp-rag-architecture` | csp-patterns/skills | Skill | RAG 架构模式（chunking、embedding、向量数据库、hybrid search、reranking、evaluation） | ✅ | ✅ 保留（独特） |
| `csp-llm-app-development` | csp-patterns/skills | Skill | LLM 应用开发（prompt 管理、function calling、streaming、multi-model routing、guardrails） | ✅ | ✅ 保留（独特） |
| `csp-vllm-serving` | csp-patterns/skills | Skill | vLLM 推理部署（Docker 部署、continuous batching、tensor parallelism、量化、K8s 扩展） | ✅ | ✅ 保留（独特） |
| `csp-prompt-engineering` | csp-patterns/skills | Skill | Prompt 工程化（模板管理、版本控制、评测、prompt 模式库、安全护栏） | ✅ | ✅ 保留（独特） |
| `csp-rag-architect` | csp-patterns/agents | Agent | RAG 架构设计审查 | ✅ | ✅ 保留（独特） |
| `csp-llm-app-reviewer` | csp-patterns/agents | Agent | LLM 应用代码审查 | ✅ | ✅ 保留（独特） |

### 18. DevOps/基础设施 (Infrastructure & Data)

| 名称 | 来源 | 类型 | 描述 | V2 | 合并建议 |
|------|------|------|------|----|----------|
| `csp-data-pipeline-patterns` | csp-patterns/skills | Skill | 数据管道（Airflow、dbt、数据质量检查、ODPS/MaxCompute、CDC） | ✅ | ✅ 保留（独特） |
| `csp-cicd-pipelines` | csp-patterns/skills | Skill | CI/CD 管道（GitHub Actions、GitLab CI、matrix builds、caching、monorepo） | ✅ | ✅ 保留（独特） |
| `csp-infrastructure-as-code` | csp-patterns/skills | Skill | 基础设施即代码（Terraform、Pulumi、GitOps、secrets 管理） | ✅ | ✅ 保留（独特） |
| `csp-kubernetes-patterns` | csp-patterns/skills | Skill | Kubernetes（Deployment/Service/Ingress、HPA/VPA、Helm、Kustomize、多集群） | ✅ | ✅ 保留（独特） |
| `csp-cloud-platform-patterns` | csp-patterns/skills | Skill | 云平台模式（AWS/GCP/Azure serverless、managed DB、CDN、成本优化） | ✅ | ✅ 保留（独特） |
| `csp-data-pipeline-reviewer` | csp-patterns/agents | Agent | 数据管道审查 | ✅ | ✅ 保留（独特） |

### 19. 重构/遗留系统 (Refactoring & Legacy)

| 名称 | 来源 | 类型 | 描述 | V2 | 合并建议 |
|------|------|------|------|----|----------|
| `csp-refactoring-strategies` | csp-patterns/skills | Skill | 大规模重构策略（Strangler Fig、Branch by Abstraction、Parallel Run） | ✅ | ✅ 保留（独特） |
| `csp-tech-debt-assessment` | csp-patterns/skills | Skill | 技术债务评估（代码异味、复杂度度量、依赖健康度、优先级排序） | ✅ | ✅ 保留（独特） |
| `csp-legacy-modernization` | csp-workflow/skills | Workflow | 遗留系统现代化工作流（评估→规划→分阶段迁移→验证） | ✅ | ✅ 保留（独特） |

### 20. 移动端 (Mobile Development)

| 名称 | 来源 | 类型 | 描述 | V2 | 合并建议 |
|------|------|------|------|----|----------|
| `csp-react-native-patterns` | csp-patterns/skills | Skill | React Native（导航、状态管理、原生桥接、新架构、Expo） | ✅ | ✅ 保留（独特） |
| `csp-mobile-performance` | csp-patterns/skills | Skill | 移动端性能优化（启动优化、内存管理、滚动性能、包体积、电量） | ✅ | ✅ 保留（独特） |
| `csp-cross-platform-strategy` | csp-patterns/skills | Skill | 跨平台策略（RN vs Flutter vs Native 选型、代码共享、平台适配） | ✅ | ✅ 保留（独特） |
| `csp-react-native-build-resolver` | csp-patterns/agents | Agent | React Native 构建错误修复 | ✅ 保留（独特） |
| `csp-react-native-reviewer` | csp-patterns/agents | Agent | React Native 代码审查 | ✅ 保留（独特） |
| `csp-mobile-performance-auditor` | csp-patterns/agents | Agent | 移动端性能审计 | ✅ 保留（独特） |

### 21. awesome-copilot 融入 (v0.5.0 新增)

> 来源：[awesome-copilot](https://github.com/github/awesome-copilot/skills) — 356 个 skills 中精选 TIER 1/2/3 共 ~40 个融入 CSP
> 设计原则：核心内容进 SKILL.md（80-120 行），细节知识进 `reference/` 子目录按需加载

#### 21.1 新建 Skills（8 个）

| 名称 | 来源 awesome-copilot | 描述 | Reference 文件 |
|------|---------------------|------|---------------|
| `csp-refactorer` | refactor, refactor-plan, refactor-method-complexity-reduce, review-and-refactor | 外科式重构 agent：规划→复杂度降低→执行→验证 | ✅ | `refactor-workflows.md`, `complexity-reduction.md` |
| `csp-sql-reviewer` | sql-code-review, sql-optimization | SQL 查询和 schema 审查 | ✅ | `sql-review-checklist.md`, `sql-optimization-patterns.md` |
| `csp-postgres-optimizer` | postgresql-code-review, postgresql-optimization | PostgreSQL 性能调优（EXPLAIN、索引、分区、vacuum） | ✅ | `pg-optimization-deep-dive.md`, `pg-query-tuning.md` |
| `csp-ruff-fixer` | ruff-recursive-fix | Python Ruff 迭代式 lint 修复（safe→unsafe→manual + noqa 决策） | ✅ | `ruff-rules-reference.md` |
| `csp-codeql-analyst` | codeql, secret-scanning | CodeQL 静态分析 + 密钥扫描 + SARIF 解释 | ✅ | `codeql-queries.md`, `secret-scanning-patterns.md` |
| `csp-react-version-patterns` | react18-*, react19-*, react-*（12 个） | React 18/19 版本特性 + 迁移指南（Enzyme→RTL、Class→Hooks） | ✅ | `react18-patterns.md`, `react19-patterns.md`, `migration-recipes.md` |
| `csp-git-conventions` | conventional-commit, conventional-branch, git-commit | Git 工作流约定（提交消息、分支命名、PR 卫生） | ✅ | — |
| `csp-spec-adr` | create-specification, create-implementation-plan, create-architectural-decision-record, prd | 轻量级 spec/ADR/impl-plan/PRD 编写器 | ✅ | `templates.md` |
| `csp-code-tour-guide` | code-tour, mentoring-juniors, add-educational-comments | VS Code CodeTour + 苏格拉底式辅导（20 个 persona） | ✅ | `tour-personas.md` |
| `csp-api-codegen` | openapi-to-application-code, typespec-create-api-plugin, typespec-api-operations | OpenAPI/TypeSpec → 应用代码生成 | ✅ | `openapi-codegen.md`, `typespec-patterns.md` |
| `csp-webapp-testing` | webapp-testing | 端到端 Web 应用测试（Cypress/Playwright/Puppeteer） | `e2e-strategies.md` |

#### 21.2 新建 Agents（2 个）

| 名称 | 来源 awesome-copilot | 描述 | Reference 文件 |
|------|---------------------|------|---------------|
| `csp-springboot-reviewer` | java-junit, java-springboot, kotlin-springboot, spring-boot-testing | Java/Kotlin Spring Boot 审查 agent | ✅ | `junit-patterns.md`, `spring-testing.md`, `kotlin-spring.md` |
| `csp-incident-response` | data-breach-blast-radius | 安全事件响应（泄露影响评估、合规、事后分析） | ✅ | `data-breach-response.md` |

#### 21.3 Skills/Agents（11 个）

| 名称 | 增强内容 | Reference 新增 |
|------|---------|---------------|
| `csp-security-reviewer` | 增加 STRIDE-A 威胁建模 + 数据泄露影响评估章节 | ✅ | — |
| `csp-csharp-reviewer` | 转为目录结构，增加 4 个 reference 文件 | ✅ | `async-patterns.md`, `testing-frameworks.md`, `ef-core-patterns.md`, `dotnet-best-practices.md` |
| `csp-mcp-builder` | 增加 9 语言 MCP server 模板 + .NET/PHP/Copilot Studio + 部署指南 | ✅ | `language-templates.md`, `additional-languages.md` |
| `csp-project-standards-reviewer` | 转为目录结构，增加标准提取 + 代码典范识别 | ✅ | `standards-extraction.md`, `code-exemplars.md` |
| `csp-incident-commander` | 增加数据泄露响应章节 | ✅ | `data-breach-response.md` |
| `csp-e2e-runner` | 增加 Playwright 代码片段 | `playwright-snippets.md` |
| `react-patterns` | 增加高级 UI patterns（premium/container-presentation/audit grep） | `advanced-ui-patterns.md` |
| `csp-python-testing` | 增加 pytest 覆盖率深度指南 | `pytest-coverage-deep-dive.md` |
| `react-testing` | 增加 Jest 高级模式 | `jest-advanced-patterns.md` |
| `csp-cicd-pipelines` | 增加 GitHub Actions 规范 + CI/CD 最佳实践 | ✅ | `github-actions-specification.md`, `cicd-best-practices.md` |
| `csp-project-standards-reviewer` | 从现有代码提炼规范 + 代码典范识别 | `standards-extraction.md`, `code-exemplars.md` |

---

## Hooks & Scripts 索引

### GSD Hooks（14 个）

| 文件 | 功能 |
|------|------|
| `gsd-check-update-worker.js` | 更新检查 worker |
| `gsd-check-update.js` | 更新检查 |
| `gsd-context-monitor.js` | 上下文监控 |
| `gsd-graphify-update.sh` | 图谱更新 |
| `gsd-phase-boundary.sh` | 阶段边界 |
| `gsd-prompt-guard.js` | 提示防护 |
| `gsd-read-guard.js` | 读取防护 |
| `gsd-read-injection-scanner.js` | 注入扫描 |
| `gsd-session-state.sh` | 会话状态 |
| `gsd-statusline.js` | 状态栏 |
| `gsd-update-banner.js` | 更新横幅 |
| `gsd-validate-commit.sh` | 提交验证 |
| `gsd-workflow-guard.js` | 工作流防护 |
| `lib/` | 共享库 |

### SP Hooks

| 文件 | 功能 |
|------|------|
| `hooks.json` | Claude Code hooks 配置 |
| `hooks-cursor.json` | Cursor hooks 配置 |
| `run-hook.cmd` | hook 运行器 |
| `session-start/` | 会话启动脚本 |

### Runtime Hooks

| 文件 | 功能 |
|------|------|
| `hooks.json` | hooks 配置 |

### ECC Cursor Rules（39 个规则文件,7 种语言 × 5 维度）

ECC 在 `.cursor/rules/` 下提供按语言/维度组织的 Cursor 规则集,是跨工具共享的知识库。

**维度（每语言 5 个）:** `coding-style`, `hooks`, `patterns`, `security`, `testing`

| 语言前缀 | 合并建议 |
|---------|----------|
| `common-*` (9 个通用规则: agents/style/workflow/git/hooks/patterns/perf/security/testing) | ✅ 保留为跨语言基线 |
| `golang-*` (5) | ✅ 与 ECC `csp-golang-patterns` 协同 |
| `kotlin-*` (5) | ✅ 与 ECC `csp-kotlin-patterns` 协同 |
| `php-*` (5) | ✅ 与 ECC `php-reviewer` 协同 |
| `python-*` (5) | ✅ 与 ECC `csp-python-patterns` 协同 |
| `swift-*` (5) | ✅ 与 ECC swift 系列协同 |
| `typescript-*` (5) | ✅ 与 ECC `typescript-reviewer` 协同 |

### ECC Hooks 系统(详细)

ECC 在 `hooks/hooks.json` 中注册了一套 Claude Code PreToolUse 钩子,覆盖质量、治理、学习三大类。

| Hook ID | 触发器 | 功能 |
|---------|--------|------|
| `pre:bash:dispatcher` | Bash | 统一 Bash preflight(质量/tmux/push/GateGuard) |
| `pre:write:doc-file-warning` | Write | 非标准文档文件警告 |
| `pre:edit-write:suggest-compact` | Edit\|Write | 逻辑断点处建议 compact |
| `pre:observe:continuous-learning` | * | 工具使用观察捕获(异步) |
| `pre:governance-capture` | Bash\|Write\|Edit\|MultiEdit | 治理事件捕获(密钥/策略/审批),需 `ECC_GOVERNANCE_CAPTURE=1` |

**memory-persistence/** — 会话记忆持久化钩子(见 `hooks/memory-persistence/`)。

### ECC Examples(CLAUDE.md 模板库,未在原索引中列出)

`examples/` 目录提供真实项目级 CLAUDE.md 模板,可作为新项目的起点。

| 文件 | 用途 |
|------|------|
| `CLAUDE.md` | 通用模板 |
| `django-api-CLAUDE.md` | Django REST API |
| `go-microservice-CLAUDE.md` | Go 微服务 |
| `harmonyos-app-CLAUDE.md` | HarmonyOS 应用 |
| `laravel-api-CLAUDE.md` | Laravel API |
| `rust-api-CLAUDE.md` | Rust API |
| `saas-nextjs-CLAUDE.md` | SaaS Next.js |
| `user-CLAUDE.md` | 用户级配置 |
| `gan-harness/` | GAN harness 示例 |
| `evaluator-rag-prototype/` | RAG 评估原型 |
| `hud-status-contract.json` / `statusline.json` | HUD/状态栏合约 |

### Runtime 独特基础设施(未在原索引中列出)

| 名称 | 路径 | 描述 | 合并建议 |
|------|------|------|----------|
| Benchmark 系统 | `benchmark/` | Runtime vs vanilla Claude 对比评测(Docker+Python) | ✅ 保留(独特) |
| Multi-agent Bridge | `bridge/` | `team.js` + `team-bridge.cjs` + `team-mcp.cjs` 多 agent 协作 | ✅ 与 dmux-workflows 协同 |
| 内建 MCP Server | `mcp-server.cjs` | 运行时内建的 MCP 服务端 | ✅ 保留 |
| GSD SDK | `gsd-sdk.js` | GSD 框架 SDK 集成 | ✅ 保留(跨项目集成) |
| Missions 系统 | `missions/` | 任务导向改进系统(4 个任务: enhance/optimize/performance/reliability) | ✅ 保留(独特) |
| Compact 命令 | `commands/compact.md` | Claude Code `/compact` 上下文交接准备 | ✅ 保留(独特) |
| PSM 命令 | `commands/psm.md` | Project Session Manager 别名 | 🔀 与 project-session-manager 合并 |

### GSD Agents 完整列表(33 个)

> 注:原索引已列出全部 33 个,此处仅做完整性核对确认。

`gsd-advisor-researcher`, `gsd-ai-researcher`, `gsd-assumptions-analyzer`, `gsd-code-fixer`, `gsd-code-reviewer`, `gsd-codebase-mapper`, `gsd-debug-session-manager`, `gsd-debugger`, `gsd-doc-classifier`, `gsd-doc-synthesizer`, `gsd-doc-verifier`, `gsd-doc-writer`, `gsd-domain-researcher`, `gsd-eval-auditor`, `gsd-eval-planner`, `gsd-executor`, `gsd-framework-selector`, `gsd-integration-checker`, `gsd-intel-updater`, `gsd-nyquist-auditor`, `gsd-pattern-mapper`, `gsd-phase-researcher`, `gsd-plan-checker`, `gsd-planner`, `gsd-project-researcher`, `gsd-research-synthesizer`, `gsd-roadmapper`, `gsd-security-auditor`, `gsd-ui-auditor`, `gsd-ui-checker`, `gsd-ui-researcher`, `gsd-user-profiler`, `gsd-verifier`

### ECC Agents 完整列表(64 个)

`a11y-architect`, `architect` ⭐, `build-error-resolver`, `chief-of-staff`, `code-architect` ⭐, `code-explorer` ⭐, `code-reviewer`, `code-simplifier`, `comment-analyzer`, `conversation-analyzer`, `cpp-build-resolver`, `cpp-reviewer`, `csharp-reviewer`, `dart-build-resolver`, `database-reviewer` ⭐, `django-build-resolver`, `django-reviewer`, `doc-updater`, `docs-lookup`, `e2e-runner`, `fastapi-reviewer`, `flutter-reviewer`, `fsharp-reviewer`, `gan-evaluator`, `gan-generator`, `gan-planner`, `go-build-resolver`, `go-reviewer`, `harmonyos-app-resolver`, `harness-optimizer`, `healthcare-reviewer`, `homelab-architect`, `java-build-resolver`, `java-reviewer`, `kotlin-build-resolver`, `kotlin-reviewer`, `loop-operator`, `marketing-agent`, `mle-reviewer`, `network-architect`, `network-config-reviewer`, `network-troubleshooter`, `opensource-forker`, `opensource-packager`, `opensource-sanitizer`, `performance-optimizer` ⭐, `php-reviewer`, `planner` ⭐, `pr-test-analyzer`, `python-reviewer`, `pytorch-build-resolver`, `react-build-resolver`, `react-reviewer`, `refactor-cleaner`, `rust-build-resolver`, `rust-reviewer`, `security-reviewer`, `seo-specialist`, `silent-failure-hunter`, `swift-build-resolver`, `swift-reviewer`, `tdd-guide`, `type-design-analyzer`, `typescript-reviewer`

> ⭐ = 本次新增(原 SKILL-INDEX.md 中遗漏)

---

## 合并策略建议

### 第一层：元技能层（保留 SP 全部 14 个）

superpowers 的 skills 是方法论级别的"元技能"，不含具体实现，应全部保留作为整合后的基础层。

### 第二层：项目管理框架（保留 GSD 核心）

GSD 的 93 个 workflows + 33 个 agents + 67 个 commands 构成完整的项目管理框架，是整合后的骨架。

### 第三层：技能库（ECC 为主，去重）

ECC 的 ~55 个 skills + 64 个 agents 是内容最丰富的技能库。合并策略：
- **语言专项**（reviewer/tester/build-resolver）：全部保留，无重叠
- **通用功能**（code-review, debug, verify）：与 Runtime 同类合并，ECC 版本为主
- **内容/营销**：ECC 独有，全部保留

### 第四层：运行时增强

运行时独特能力保留：
- `autopilot`, `ralph`, `ultrawork`, `team` — 自主执行模式
- `deepinit`, `deep-interview`, `deep-dive` — 深度分析
- `remember`, `wiki` — 知识管理
- `ai-slop-cleaner`, `self-improve` — 自我改进
- `project-session-manager` — 环境管理

### 规范驱动（已并入 Layer 1 Meta + Layer 2 Workflow）

规范驱动不再是独立层：
- **方法论** → `csp-meta/skills/csp-spec-driven-development/`
- **契约生成** → `csp-meta/skills/csp-spec-contract/`
- **阶段工作流** → `spec-phase` → `discuss-phase` → `plan-phase` → `execute-phase` → `verify-phase`
- **工件模板** → `csp-workflow/templates/change-artifacts/`
- **Delta Specs** → ADDED/MODIFIED/REMOVED 增量规范（brownfield）
- **三维度验证** → `artifact-verification.md`（completeness / correctness / coherence）

与 GSD 协同：
- `ingest-docs` 文档摄入 → `spec-contract` 规范化
- `spec-phase` 澄清需求 → `plan-phase` 规划 → `execute-phase` 执行
- `verify-phase` 验证 → `ship` 归档

