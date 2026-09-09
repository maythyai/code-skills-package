# 文档组织关系与定位（README.md · docs/ · .csp/）

> 本文件定义本仓库（及任何使用 CSP 的项目）文档与产物的组织关系，是**权威出处**。同步落码于根 `README.md`「Further Reading」、`CLAUDE.md`「文档边界」、`prompts/00-knowledge-hub.md`「文档管理边界」。

## 一、三层定位

| 层 | 位置 | 面向 | 定位 | 内容边界 |
|---|---|---|---|---|
| **门面** | `README.md`（项目根） | 所有人：新用户/贡献者/agent | 电梯演讲 + 路标 | 一句话定位、核心特性、Quick Start（最短可运行路径）、指向 `docs/` 的链接表。**不堆细节**——细节进 `docs/`。 |
| **对外人类文档** | `docs/` | 使用者/贡献者/评审者 | 给人读的项目文档 | 安装、使用、架构、技能索引/编写规范、分析报告、战略、PRD 人类原文。**非流水线驱动产物**。 |
| **对内 agent 产物库** | `.csp/` | AI agent / CI / 工程系统 | 编程管理事实源（agent 黑板） | `AGENTS.md`/`manifest.json`/`lifecycle-state.json` + PMS/CMS/TMS + `specs`/`tasks`/`tech-design`/`traceability`/`artifacts`/`ship`/`ops`/`review`/`audit`/`milestones` + `planning`/`spark`/`writer-memory`/`intel`。**人不直接读**——要看就看 `docs/` 摘要。 |

## 二、关系

- `README.md` → 引用 `docs/` 深入文档；一句话提 `.csp/`（agent 自治区，人不干预）。
- `docs/` → `.csp/` 引用**单向**：`.csp/` 工程蒸馏 front-matter `original_ref`/`prd_ref`/`sources` 单向锚定 `docs/` 原文（`.csp/` 易变/临时，`docs/` 沉淀精确——稳定文档作锚点，易变产物指回它）。**`docs/` 原文不内嵌 `.csp/` 引用**；`docs/`↔`.csp/` 双向映射由 `manifest` 集中承载（每 item `raw_path`+`output_path`）。
- **棕地整合**：棕地项目 onboarding 时，把 `docs/` 下**凡判定为"临时/工程产物"的文件**（PRD intake、specs、design、analysis findings、archived、research、solutions 工程详情——非长期人读成品）**蒸馏 + 索引**进 `.csp/` 对应子区（PMS/specs/tech-design/audit/review/milestones/intel）+ 从 `docs/` 删源；永久人读成品（README/usage/arch/strategy/产品介绍）留 `docs/`。`.csp/` 只存工程蒸馏 + manifest 索引（单向锚回原文→git 历史 blob），不复制全文。判定标准与映射表见下方「棕地项目文档整合」。
- **边界铁律**：编程管理产物 → `.csp/`；人类对外文档 → `docs/`；README 只做门面不堆细节。散落根目录裸目录（`evidence/`、`reports/`、`screenshots/`、`spark-output/`、`.planning/`、`.csp-*/` 等）→ `00-knowledge-hub` Phase 1.5 整改归位。详见 [[csp-artifact-path-convention]]。

## 三、docs/ 目录索引（本仓库）

本仓库是 CSP 技能包源码，`docs/` 是「如何安装/使用/编写技能」的对外文档：

| 文件 | 内容 |
|---|---|
| `INSTALL.md` / `INSTALL_zh.md` | 安装指南（22+ 平台） |
| `UPDATE.md` | 更新指南 |
| `VERSIONING.md` | 版本管理（X=arch, Y=feature, Z=fix） |
| `FEATURES.md` | 功能列表（版本×模块×功能×集成状态矩阵） |
| `USER-GUIDE.md` | 使用指南 |
| `ARCHITECTURE.md` / `ARCHITECTURE_zh.md` | 完整架构设计（DAG 编排 / SKPG / Token 策略） |
| `SKILL-INDEX.md` | 全部 skills/agents 索引 |
| `SKILL-AUTHORING.md` / `SKILL-AUTHORING_zh.md` | 技能编写最佳实践 |
| `SKILL-SPEC.md` | SKILL.md 规范 |
| `analysis/` | 审计与分析报告（项目评审、跨层测试案例） |
| `csp-page/` | 生成的技能浏览页（derived，勿手改） |

> **消费者项目额外**：使用 CSP 的业务项目在 `docs/` 下还会有 `prd/`（PRD 人类原文，工程形态 PMS 在 `.csp/product-spec/`）、`strategy/`（roadmap/战略，人类可读 + manifest 索引）、`solutions/`（人类可读摘要，链回 `.csp/` 全文）。

## 棕地项目文档整合（docs/ → .csp/ 蒸馏）

棕地项目 onboarding 时，把 `docs/` 下**临时/工程产物**（非长期人读成品）蒸馏 + 索引进 `.csp/`，从 `docs/` 删源；永久人读成品留 `docs/`。判定标准：流水线产物/intake/快照/机器消费 → 临时产物（归 `.csp/`）；给人长期读的成品（onboarding/usage/arch/strategy/产品介绍/CHANGELOG）→ 留 `docs/`。

| docs/ 临时产物 | → .csp/ 归纳 | 源处理 |
|---|---|---|
| `docs/prd/PRD-*.md` | `.csp/product-spec/`（PMS）+ docs/ 产品文档归并 | 蒸馏+归并→删源 |
| `docs/specs/`、`docs/features/` | `.csp/specs/`（SPEC-F-*） | 蒸馏→删源 |
| `docs/design/` | `.csp/tech-design/` + `.csp/tech-decisions/ADR/` | 蒸馏→删源 |
| `docs/analysis/*.md`（findings） | `.csp/audit/` 或 `.csp/review/` | 蒸馏→删源；curated 人读报告可留 |
| `docs/archived/` | `.csp/milestones/{m}/` | 移归档→删源 |
| `docs/research/`、`docs/competitive/` | `.csp/intel/research/` | 蒸馏→删源 |
| `docs/solutions/`（工程详情） | `.csp/specs/`/`.csp/review/` | 工程详情→删源；人读摘要可留 |
| `docs/strategy/ROADMAP.md` | `.csp/lifecycle-state` + `.csp/ship/VERSION-REGISTRY` | 版本蒸馏；**原文留（永久人读）** |

**铁律**：`.csp/` 不复制原文全文；`.csp/` 蒸馏 `original_ref` 单向锚回 `docs/` 原文；`docs/` 原文不内嵌 `.csp/` 引用（`.csp/` 易变/临时，`docs/` 沉淀精确）；**临时产物蒸馏后从 `docs/` 删源**（provenance 由 git 历史 blob + manifest 标 removed 承载）；永久人读成品留 `docs/`；双向映射由 `manifest` 承载。完整流程见「棕地项目文档整合 Agent」提示词。

## 四、根目录门面与发布元数据（不属 docs/）

根目录的 `README.md` / `README_zh.md`（门面）、`CHANGELOG.md`（发布历史）、`CONTRIBUTING.md`（贡献指南）、`LICENSE`（许可证）、`VERSION` / `package.json`（版本元数据）是项目门面与发布元数据，**不归 `docs/`**；`README.md` 的「Further Reading」是 `docs/` 的入口链接表。完整角色/范围/内容规范/结构见 `prompts/00-knowledge-hub.md` §十三「项目文档管理条约」。

## 五、判定决策树（放哪个文件）

```
这份内容是 agent/CI/工程系统消费的编程管理产物吗？
├─ 是 → .csp/<对应子区>/   （PMS/CMS/TMS/specs/tasks/artifacts/...）
└─ 否 → 给人读的吗？
   ├─ 是项目门面/发布元数据（定位/quick start/变更日志/许可证） → 根目录 README.md / CHANGELOG.md / LICENSE
   └─ 是深入的人类文档（安装/使用/架构/编写规范/分析/PRD 原文） → docs/<对应文件>/
```
