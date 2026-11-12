# 文档组织关系与定位（README.md · docs/ · .csp/）

> 本文件描述**本 CSP 仓库**的文档分层。消费 CSP 的项目先遵循自己的运行入口、发布访问策略和现有路径；通用四层入场/新鲜度约定见 `csp-knowledge-hub/references/project-entry-contract.md`。这里的目录是默认示例，不是跨仓库的删除或迁移授权。

## 一、三层定位

| 层 | 位置 | 面向 | 定位 | 内容边界 |
|---|---|---|---|---|
| **门面** | `README.md`（项目根） | 所有人：新用户/贡献者/agent | 电梯演讲 + 路标 | 一句话定位、核心特性、Quick Start（最短可运行路径）、指向 `docs/` 的链接表。**不堆细节**——细节进 `docs/`。 |
| **人读项目文档** | `docs/` | 使用者/贡献者/评审者 | 给人读的原文与入口 | 安装、使用、架构、分析、战略与仍被阶段使用的 PRD 原文。是否公开由发布配置决定；可作为流水线输入。 |
| **对内 agent 产物库** | `.csp/` | AI agent / CI / 工程系统 | 编程管理事实源（agent 黑板） | `AGENTS.md`/`manifest.json`/`lifecycle-state.json` + PMS/CMS/TMS + `specs`/`tasks`/`tech-design`/`traceability`/`artifacts`/`ship`/`ops`/`review`/`audit`/`milestones` + `planning`/`spark`/`writer-memory`/`intel`。**人不直接读**——要看就看 `docs/` 摘要。 |

## 二、关系

- `README.md` → 引用 `docs/` 深入文档；一句话提 `.csp/`（agent 自治区，人不干预）。
- `.csp/` 工程蒸馏通过 `original_ref`/`sources` 指向人读原文；manifest 登记 source_id、raw_path 与 output_path。仓库内部供评审的 docs 可以引用 `.csp/` 作追溯；实际公开页面不得链接到不可访问的内部资料或暴露敏感信息。
- **棕地整合**：先区分活跃原文、派生工程资料和可重建中间物；仍供 01/TB 使用的 PRD、设计资产、测试证据保持可访问。不因归类、大小或日期删除源文件。确需迁移时先核对消费者、入站链接、manifest 与保留要求，给出 old→new 与回退方案，获授权后执行。
- **边界**：Agent 工程产物默认 `.csp/`，人读原文默认 `docs/`，根 README 为入口。既有 `verify/`、`spark-output/`、`.planning/` 等若仍有生产者/消费者，不按名字自动搬迁；先建立映射与验证方案。

## 三、docs/ 目录索引（本仓库）

本仓库是 CSP 技能包源码，`docs/` 是「如何安装/使用/编写技能」的对外文档。按分类组织：

| 目录 | 内容 | 入口 |
|------|------|------|
| `architecture/` | 架构设计、系统地图、衔接标准 | [INDEX](architecture/INDEX.md) |
| `guides/` | 安装、使用、更新、贡献、技能编写指南 | [INDEX](guides/INDEX.md) |
| `reference/` | 技能索引、技能规范、版本管理规则 | [INDEX](reference/INDEX.md) |
| `reports/` | 项目审查、功能矩阵、案例分析 | [INDEX](reports/INDEX.md) |
| `analysis/` | 能力地图、对齐检查清单 | [INDEX](analysis/INDEX.md) |
| `archive/` | 历史版本文档快照 | [INDEX](archive/INDEX.md) |

> 根 `docs/INDEX.md` 是文档导航中枢。每个分类目录下的 `INDEX.md` 列出该分类的所有文件及状态。
> **消费者项目额外**：使用 CSP 的业务项目在 `docs/` 下还会有 `design/`（设计稿）、`strategy/`（roadmap/战略）、`prototypes/`（HTML 原型）。

## 棕地项目文档整合（先辨来源，后提迁移）

| 资产 | 保留/蒸馏原则 | 修改前核对 |
|---|---|---|
| 活跃 `docs/prd/PRD-*.md`、战略和设计原文 | 留在现有可读取路径；PMS/Spec 引用原文，不替代原文 | 下一版 01/TB/评审及站点发布引用 |
| `.csp/` 的 PMS/CMS/TMS 与测试、审计产物 | 使用唯一 manifest 定位工程资料与原始来源 | `source_id`、output_path、status、证据链接 |
| docs 中确属工程中间物的文件 | 可建立蒸馏视图；原文是否归档取决于实际读者与保留策略 | 入站引用、CI/工具写入者、授权、迁移回滚 |
| 已完成里程碑和视觉基线 | 未关闭 finding、回归或发布仍引用时保留可访问路径 | 下游验收、法规/审计保留义务 |

消重时保留唯一事实源和可重建的索引，避免无依据的双副本；不要把 Git 历史当作仍在消费的文件路径的替代品。

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
