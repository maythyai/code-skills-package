# 功能列表（版本 × 模块 × 功能 × 集成状态）

> 本文件是 CSP 的**产品功能总账**：以版本为纵轴、功能模块为横轴，记录每个功能"在哪个版本集成、
> 集成了没有"。与 [CHANGELOG.md](../CHANGELOG.md)（发布流水账，每版一次性变更叙述）和
> `.csp/ship/VERSION-REGISTRY.md`（版本生命周期台账，planned→released→prod-verified）互补——
> 本文件回答"产品现在有哪些功能、分别从哪个版本起有、还有哪些没集成"。

## 维护契约（谁在何时更新）

| 阶段 | 动作 | 状态 |
|------|------|------|
| **roadmap**（外环） | 新版本规划时，为该版本每个规划功能新增一行，状态 `📋规划中` | 📋 |
| **01 PRD** | PRD 评审通过的功能点落入对应版本行（如 roadmap 未覆盖则补行） | 📋 |
| **05 实施** | 开发中的功能行状态改 `⏳开发中` | ⏳ |
| **06 发布** | 发布时已交付功能改 `✅已集成` 并填"交付证据"（tag/commit/PRD）；延后改 `⏭️延后` + 下一版本行；砍单改 `❌砍单` + 原因 | ✅/⏭️/❌ |
| **07/audit 复盘** | 回填 planned-vs-delivered 差异：规划了但没交付的标 `⏭️延后`，交付了但未规划的补行标 `✅已集成(计划外)` | — |

> **落点**：本文件在 `docs/`（人读产品文档），不进 `.csp/`（工程产物）。roadmap 定义结构，06 维护
> 集成状态，07 校准漂移。**不手改已发布版本的 ✅ 行**（以 git tag + CHANGELOG 为准），只续写新版本
> 与未结功能。

## 状态图例

| 标记 | 含义 |
|------|------|
| ✅ | 已集成（已发布版本中交付，有 tag/commit 证据） |
| ⏳ | 开发中（当前迭代在写，未发布） |
| 📋 | 规划中（roadmap 已排期，未开工） |
| ⏭️ | 延后（规划过但未交付，推迟到后续版本） |
| ❌ | 砍单（descoped，不做了） |

---

## 版本功能矩阵

> 列：**版本 | 功能模块 | 功能名称 | 功能描述 | 集成状态 | 交付证据 | 备注**
> 已发布版本（v0.2.0–v0.10.0）功能均为 ✅已集成；证据指向 CHANGELOG 段或 skill 路径。

### v0.10.0 — 2026-08-26（改码路由 / 技术方案链路 / 更新自动化）

| 功能模块 | 功能名称 | 功能描述 | 状态 | 证据 | 备注 |
|---|---|---|---|---|---|
| 路由 | 改码类意图路由 | 按"是否提供 PRD/链接、是否指定设计模式、是否极简、是否 loop"四信号路由到 design-hub/simple-dev/autopilot | ✅ | CHANGELOG [0.10.0] | csp-router 最高优先级路由 |
| 改码 | csp-simple-dev | 无 PRD/无设计模式时一句话需求快速实现入口，统一 hotfix/tweak/minimal-change | ✅ | `csp-patterns/...` | 极简模式直接改码 |
| 代码理解 | csp-code-understanding | 自动生成结构化代码理解文档（依赖图/执行路径/数据流/调用关系），持久化 .csp/code-understanding/ | ✅ | CHANGELOG [0.10.0] | csp-explore 的持久化版 |
| 设计 | csp-design-hub | 五模式（summary/detailed/rapid/local-rapid/regenerate）设计方案生成 + 设计-实现漂移检测 | ✅ | CHANGELOG [0.10.0] | 控制器/引擎分离 |
| 技术方案 | PRD→方案→任务链路（10 技能） | tech-solution-design / tech-design-review / tech-task-breakdown / tech-risk-assessment / prd-traceability / prd-parser / effort-estimation / integration-design / domain-driven-design / prd-change-impact | ✅ | CHANGELOG [0.10.0] | 覆盖"PRD→技术拆解→方案设计"完整链路 |
| 规划 | csp-plan-phase | 实施规划阶段引擎：里程碑/资源/并行/风险缓冲/进度跟踪 | ✅ | CHANGELOG [0.10.0] | — |
| 生命周期 | lifecycle-orchestrator 集成 | 新增 S2.5/S2.6/S3.5 三阶段 + 动态路由 | ✅ | CHANGELOG [0.10.0] | — |
| 更新 | 更新自动化打通（install.sh 原生） | check-latest-version.cjs + detect-custom-files，三个更新 workflow 去插件依赖 | ✅ | `bin/check-latest-version.cjs` | — |
| 更新 | install.sh --update | 检测已装→查 npm 最新→备份自定义→覆盖安装 | ✅ | CHANGELOG [0.10.0] | — |
| 治理 | 内容卫生永久规则 | CLAUDE.md/CONTRIBUTING 禁作者信息/LICENSE/origin/内部 URL/构建产物 | ✅ | CHANGELOG [0.10.0] Added(governance) | — |

### v0.8.0 / v0.9.0 — 2026-08-11（审计 / 安全 / 平台扩展 / 技术图）

| 功能模块 | 功能名称 | 功能描述 | 状态 | 证据 | 备注 |
|---|---|---|---|---|---|
| 审计 | csp-defect-mining | 多方法缺陷挖掘（mutation/fuzz/property/state-transition），方法论多样性 > 数量 | ✅ | CHANGELOG [0.8.0] | — |
| 审计 | csp-codebase-audit | 多维代码库审计：并行 Explore per 维度 + 实机核验 + 单一决策源报告 | ✅ | CHANGELOG [0.8.0] | — |
| 安全 | install.sh CSP_BRANCH 白名单 | 正则白名单校验分支名，修复 $()/反引号 RCE | ✅ | CHANGELOG [0.8.0] Security | curl\|bash RCE 修复 |
| 安全 | install.sh CSP_SHA256 完整性 pin | 下载归档哈希校验，mismatch 拒绝 | ✅ | CHANGELOG [0.8.0] Security | — |
| 平台 | IDE 覆盖 18→22 | 新增 JetBrains/Cline/Roo Code/Neovim 平台适配 | ✅ | CHANGELOG [0.8.0] | 修复 6 平台缺 bootstrap 的遗留 bug |
| 平台 | skill-loading-protocol | 缺原生 Skill 工具平台的路由契约（兼容层） | ✅ | `shared/references/skill-loading-protocol.md` | — |
| 重构 | install.sh 拆分 | 1514→930 行，抽 lib/platforms.sh + lib/bootstrap.sh | ✅ | CHANGELOG [0.8.0] Refactored | — |
| 重构 | 统一 YAML 解析器 | shared/scripts/lib/yaml.mjs 单一 frontmatter 解析器 | ✅ | CHANGELOG [0.8.0] Refactored | 三份 ad-hoc 副本移除 |
| 工具 | validate-registry + csp-invariants 测试 | registry schema 校验 + 20 不变量测试，入 npm test | ✅ | CHANGELOG [0.8.0] Tooling | — |
| 工具 | csp-sdk init-skill | 脚手架生成合规格 SKILL.md | ✅ | CHANGELOG [0.8.0] Tooling | — |
| 规范 | V2 frontmatter 回填 | 171 skills 推断 phase/domain，V2 率 6.5%→92.2% | ✅ | CHANGELOG [0.8.0] Refactored | — |
| 技术图 | csp-tech-diagram | 确定性技术图引擎（14+ 图类型/几何校验/12 风格/GIF/离线 HTML） | ✅ | CHANGELOG [0.8.0] 新增 | — |

### v0.7.1 — 2026-07-04（文档治理 / 场景扩充）

| 功能模块 | 功能名称 | 功能描述 | 状态 | 证据 | 备注 |
|---|---|---|---|---|---|
| 文档 | csp-doc-lifecycle-manager | 文档生命周期 5 步（审计→分类→归档→修剪→索引） | ✅ | CHANGELOG v0.7.1 | — |
| 文档 | csp-project-doc-architect | 项目文档架构标准（目录树/命名/索引/卫生） | ✅ | CHANGELOG v0.7.1 | — |
| 知识 | csp-session-knowledge-extractor | 会话知识提炼，路由到文档存储 | ✅ | CHANGELOG v0.7.1 | — |
| 场景 | 31 个独立开发者场景 skill | 部署/商业化/性能/i18n/monorepo 等方向 | ✅ | CHANGELOG v0.7.1 | — |
| 增强 | 核心 skill 扩充 | writing-skills/spec-contract/implementation-phase/verify-phase/explore 从 stub 扩至完整流程 | ✅ | CHANGELOG v0.7.1 | — |
| 基础设施 | install.sh no-sudo + mirror fallback | 无 sudo 前缀安装 + registry-mirror fallback | ✅ | CHANGELOG v0.7.1 | — |
| 基础设施 | validate-skills.yml GitHub Actions | skill 校验 CI 工作流 | ✅ | CHANGELOG v0.7.1 | — |

### v0.7.0 — 2026-06-19（状态路由 / SKPG / v2 规范 / 首发 npm）

| 功能模块 | 功能名称 | 功能描述 | 状态 | 证据 | 备注 |
|---|---|---|---|---|---|
| 路由 | state-detector + confidence-router | 状态感知前置 hook + 三信号加权置信度路由 | ✅ | CHANGELOG v0.7.0 | — |
| 路由 | SDD 状态感知路由 | csp-router 基于 .csp/artifacts/ 判断开发阶段并路由 | ✅ | CHANGELOG v0.7.0 | — |
| 规范 | SKILL.md v2 规范 | phase/domain/role/model_rules/anti_rationalizations 结构化字段 | ✅ | CHANGELOG v0.7.0 | — |
| 元数据 | skill-metadata.yaml | V2 元数据集中注册表，供路由器快查 | ✅ | `csp-router/skill-metadata.yaml` | — |
| 图谱 | SKPG 知识图谱 | 轻量 JSON 图谱建模技能关系/触发词/阶段/分类 + build-skpg | ✅ | `csp-router/skpg/graph.json` | — |
| 验证 | validate-skill-v2 | SKILL.md v2 格式验证器 | ✅ | CHANGELOG v0.7.0 | — |
| 工作流 | csp-workflow-schema | 声明式 JSON 工作流引擎（阶段/条件/失败策略/artifact 传递） | ✅ | CHANGELOG v0.7.0 | — |
| 预算 | csp-budget-enforcer | 四级 token 预算降级（OK→WARNING→SOFT→HARD）+ 自动模型降级 | ✅ | CHANGELOG v0.7.0 | — |
| 并行 | csp-parallel-worktree | 并行任务 worktree 分配/冲突检测/并发控制/自动合并 | ✅ | CHANGELOG v0.7.0 | — |
| 复杂度 | csp-complexity-classifier + model-selector | 启发式复杂度分类 + 复杂度→模型映射 | ✅ | CHANGELOG v0.7.0 | — |
| 发布 | 首次 npm 发布 | npm install -g code-skills-package（2026-06-21） | ✅ | CHANGELOG v0.7.0 发布 | — |

### v0.6.0 — 2026-06-18（持续学习引擎）

| 功能模块 | 功能名称 | 功能描述 | 状态 | 证据 | 备注 |
|---|---|---|---|---|---|
| 学习 | csp-learning-loop | 会话边界自动知识提取，5 维度积累（项目/需求/开发者/长期记忆/技能反馈） | ✅ | CHANGELOG [0.6.0] | — |
| 存储 | .csp/intel/ | 结构化智能存储目录（5 维度文件 + 元数据 + 审计日志） | ✅ | CHANGELOG [0.6.0] | — |
| Hooks | 3 个学习 hook | Stop/PreCompact/SessionEnd 自动触发学习循环 | ✅ | CHANGELOG [0.6.0] | — |

### v0.5.0 — 2026-06-15（awesome-copilot 融入）

| 功能模块 | 功能名称 | 功能描述 | 状态 | 证据 | 备注 |
|---|---|---|---|---|---|
| 外部融入 | awesome-copilot ~40 skills | 从 356 个中精选 TIER 1/2/3 融入，核心 SKILL+reference 按需加载 | ✅ | CHANGELOG [0.5.0] | ~8000+ 行 |
| 重构 | csp-refactorer / SQL reviewer / ruff-fixer / CodeQL | 外科式重构 + SQL/PG 审查 + Ruff 修复 + CodeQL 静态分析 | ✅ | CHANGELOG [0.5.0] | — |
| 代码生成 | csp-api-codegen | OpenAPI/TypeSpec → 应用代码生成 | ✅ | CHANGELOG [0.5.0] | — |
| 测试 | webapp-testing | 端到端 Web 应用测试（Cypress/Playwright/Puppeteer） | ✅ | CHANGELOG [0.5.0] | — |
| Agents | csp-springboot-reviewer / csp-incident-response | Spring Boot 审查 + 安全事件响应 | ✅ | CHANGELOG [0.5.0] | — |
| 增强 | 11 现有 skill + 46 reference | security/csharp/mcp/project-standards/e2e/react/python/cicd 等增强 | ✅ | CHANGELOG [0.5.0] | — |

### v0.4.0 — 2026-06-14（质量巩固 / 工程化）

| 功能模块 | 功能名称 | 功能描述 | 状态 | 证据 | 备注 |
|---|---|---|---|---|---|
| 安装器 | --stacks / --layers / --minimal / --dry-run | 按技术栈/层级过滤安装 + 预览 | ✅ | CHANGELOG v0.4.0 Phase 3 | 20+ 选项 |
| 创作工具 | csp-skill-creator + 模板 + 指南 | 交互式 skill 创建向导 + SKILL-TEMPLATE + CONTRIBUTING/SKILL-AUTHORING | ✅ | CHANGELOG v0.4.0 Phase 4 | — |
| 治理 | registry 一致性审计 + frontmatter 标准化 | 30 未注册 skill 入 registry + 145 frontmatter 统一 + OMC 依赖清理 | ✅ | CHANGELOG v0.4.0 Phase 2 | 99.3% compliance |
| 重叠合并 | 11 组 skill 重叠处理 | 7 组迁移期处理 + 5 deprecated | ✅ | CHANGELOG v0.4.0 Phase 1 | — |

### v0.3.0 — 2026-06-14（领域扩展）

| 功能模块 | 功能名称 | 功能描述 | 状态 | 证据 | 备注 |
|---|---|---|---|---|---|
| AI 工程 | RAG/LLM/数据管线/提示工程 | 5 skills + 3 agents | ✅ | CHANGELOG [0.3.0] | — |
| DevOps | CI/CD/IaC/K8s/云平台 | 4 skills | ✅ | CHANGELOG [0.3.0] | — |
| 重构/遗留 | refactoring-strategies/tech-debt/legacy-modernization | 2 skills + 1 workflow | ✅ | CHANGELOG [0.3.0] | — |
| 移动端 | RN/性能/跨平台 | 3 skills + 3 agents | ✅ | CHANGELOG [0.3.0] | — |
| 元技能 | csp-skill-optimizer | skill 自优化元技能，反馈收集+缺口分析+PR 回上游 | ✅ | CHANGELOG [0.3.0] | — |
| 工程 | 全层审计 + 跨模块去重 + 描述补齐 | 89 skill 描述 + 27 command 描述补齐 | ✅ | CHANGELOG [0.3.0] | — |
| 拆分 | 8 个 500+行 skill 拆分 | 精简 SKILL + references/，初始 token 降 91% | ✅ | CHANGELOG [0.3.0] Changed | — |

### v0.2.0 — 2026-06-11（初始五层架构）

| 功能模块 | 功能名称 | 功能描述 | 状态 | 证据 | 备注 |
|---|---|---|---|---|---|
| 架构 | 五层分层架构（L0-L4） | token 优化分片加载 | ✅ | CHANGELOG [0.2.0] | 基础 |
| 路由 | csp-router | 509-skill registry + 多信号触发匹配 | ✅ | CHANGELOG [0.2.0] | — |
| 元技能 | csp-meta | 14 个元技能（TDD/debugging/planning/brainstorming） | ✅ | CHANGELOG [0.2.0] | — |
| 工作流 | csp-workflow | 94 个 GSD 工作流覆盖全项目生命周期 | ✅ | CHANGELOG [0.2.0] | — |
| 模式 | csp-patterns | ~200 skills（reviewers/build-resolvers/15+ 语言） | ✅ | CHANGELOG [0.2.0] | — |
| 运行时 | csp-runtime | 19 agents + 28 commands（autopilot/wiki/remember/self-improve） | ✅ | CHANGELOG [0.2.0] | — |
| 文档 | SKILL-INDEX/ARCHITECTURE/MIGRATION/USER-GUIDE/CLAUDE.md | 全套项目文档 | ✅ | CHANGELOG [0.2.0] | — |

### Unreleased（下一版本）

| 功能模块 | 功能名称 | 功能描述 | 状态 | 证据 | 备注 |
|---|---|---|---|---|---|
| 路径治理 | 产物路径全仓库统一到 .csp/ | .planning→.csp/planning、spark-output→.csp/spark 等，消除散落根 | ⏳ | CHANGELOG Unreleased | 含 .cursor/.claude 镜像同步 |
| 发布 | release-manager 增量质量铁律 | gate 邻接增量项不当轮延后，deferred 计入缺口 K | ⏳ | CHANGELOG Unreleased | 06 硬边界 11 |

---

## 汇总

| 版本 | 日期 | 集成功能数 | 状态 |
|------|------|-----------|------|
| v0.2.0 | 2026-06-11 | 7 | ✅ 已发布 |
| v0.3.0 | 2026-06-14 | 7 | ✅ 已发布 |
| v0.4.0 | 2026-06-14 | 4 | ✅ 已发布 |
| v0.5.0 | 2026-06-15 | 6 | ✅ 已发布 |
| v0.6.0 | 2026-06-18 | 3 | ✅ 已发布 |
| v0.7.0 | 2026-06-19 | 11 | ✅ 已发布 |
| v0.7.1 | 2026-07-04 | 7 | ✅ 已发布 |
| v0.8.0 | 2026-08-11 | 12 | ✅ 已发布 |
| v0.9.0/0.10.0 | 2026-08-26 | 10 | ✅ 已发布 |
| Unreleased | — | 2 | ⏳ 开发中 |

> **集成率**：已发布版本功能均为 ✅（以 git tag + CHANGELOG 为准）；Unreleased 2 项开发中。
> 历史无 ⏭️延后 / ❌砍单 记录（如出现请按维护契约补行并填原因）。
