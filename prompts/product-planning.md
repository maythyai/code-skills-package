使用 CSP 产品规划能力从零到一完成产品规划全链路（调研 → 战略 → 路线图 → 版本规划 → PRD SPEC），产出可直接交棒给 [[prompts/develop_pipeline_csp.md]] 的版本队列。

## 规划流程

### Phase R：市场调研与竞品分析
市场调研 + 竞品深潜 + 客户洞察 + 商业验算，AI 自主完成多路搜索：
- **行业扫描**：赛道规模、增长率、政策环境、技术拐点
- **竞品深潜**：扫 `开源项目参考/` + GitHub/网络同类项目，逐项目分析功能矩阵
- **客户洞察**：典型用户画像、核心场景、未被满足需求
- **经济模型**：变现路径、成本结构、单位经济
- **方向可行性**："能不能做""有没有人在做""市场多大"

使用 `[[skill:csp-product-research]]` 或 `prompts/product-critic-review.md`（7 视角产品审查）辅助调研。

产物：`docs/analysis/MARKET-RESEARCH-{date}.md`（五面各一节，证据带出处，缺口标 `[TBD]`）。

### Phase 0：战略锚点
基于调研结论提炼 Rumelt kernel，产出 `docs/strategy/STRATEGY.md`：
- **诊断**：产品解决什么核心问题？痛点/不对称在哪？
- **指导方针**：我们的差异化选择是什么？为什么是现在？
- **为谁**：目标用户/角色/核心场景
- **北极星指标**：成功怎么看
- **投资主线**：3-5 条方向性主题
- **明确不做什么**：聚焦的代价

使用 `[[agent:csp-pm]]`（用户故事/验收标准）+ `[[agent:csp-analyst]]`（商业模型/SWOT）。

### Phase 1：路线图 + 版本序列
规划长周期多版本结构化路线，产出 `docs/strategy/ROADMAP.md`：
- **版本号规则**：SemVer（X.Y.Z），MAJOR=breaking / MINOR=additive / PATCH=fix
- **版本序列**：v1.0（MVP）→ v1.1 → v1.2 ... 每版本主题 + 3-5 关键功能 + 价值描述
- **攒批原则**：同模块功能聚合到一个版本；feat 批（MINOR）与 fix 批（PATCH）分轨
- **远期路径**：战略主题演进 + 里程碑

使用 `[[agent:csp-roadmap-planner]]` 生成版本序列，`prompts/roadmap.md` 提供完整方法论。

### Phase 1.5：集成必要性审视（self-critique gate）
**强制**：对每个版本功能过审视（精简优先，默认砍不是留）：
1. 定位契合度 → 是否服务 STRATEGY 锚点？
2. 场景必要性 → 核心用户真需要？
3. 与现有能力重叠 → 是否已做？
4. 集成成本 vs 价值
5. 依赖可行性
6. 攒批合理性
7. 核心场景聚焦度 → 是否落在核心业务场景？

裁决：纳入 / 降级（defer 到后续版本）/ 剔除（移出版本序列+记原因）/ 合并（归入同模块其他版本）

使用 `[[agent:csp-product-lens-reviewer]]`（前提挑战/战略后果/目标-需求对齐）。

产物：`docs/analysis/INTEGRATION-NECESSITY-{date}.md` + 回写净版 ROADMAP + FEATURES.md。

### Phase 2：产品架构收敛审查
版本队列产出后，跑架构收敛审查：
- 定位对齐：功能清单是否服务同一产品定位
- 导航准入：信息架构/模块边界是否合理
- 系统卫生：技术债/冗余/死代码评估

使用 `[[csp-product-design-convergence]]`（功能架构收敛+核心取舍+IA 方向）。

产物：`.csp/convergence/CONVERGED-FEATURE-PLAN.md`（收敛后功能清单）。

### Phase 3：每版本规划级 PRD SPEC
为净版序列每个版本产出一份规划级 PRD SPEC：
- `docs/prd/PRD-{version-slug}.md`，`status: Draft`，`prd_depth: planning`
- 复用 `prompts/01-prd.md` 的 8 段结构大纲级填写（背景/目标/功能/验收骨架/风险）
- 工程级细节（穷举规则/完整 AC/埋点）留给 01 PRD 升级模式补全

使用 `[[workflow:csp-prd-generation]]`（PM 视角）或 `[[pattern:csp-prd]]`（设计师视角）。

产物：每版本一份 SPEC + 登记 `docs/prd/PRD-INDEX.md`。

---

## 自决策授权
调研方向、竞品取舍、版本主题与 feature 拆分、优先级排序、跨版本依赖排布、集成必要性裁决——你自己拍板，记入 DEV-LOG/ROADMAP，不打断我。打断条件仅 3 类：战略根本模糊 / 无法 auto-resolve 的报错 / 破坏性操作。

---

## 交棒 pipeline
规划完成输出摘要后，交棒给 `[[prompts/develop_pipeline_csp.md]]`——pipeline 读取 ROADMAP 版本队列 + PRD SPECs 启动 01→06 连续交付。

```
产品规划                              开发 Pipeline
───────────                          ──────────────
Phase R 调研
  └→ Phase 0 战略锚点
      └→ Phase 1 路线图+版本序列 ──→ 01 PRD（规划级 SPEC → 工程级升级）
          └→ Phase 1.5 集成审视   ──→ 02 需求拆解
              └→ Phase 2 收敛审查  ──→ 03 技术方案+Spec
                  └→ Phase 3 PRD SPEC  ──→ 04 任务拆解
                                          ──→ 05 实施
                                          ──→ 06 质量门控+发布
                                          ──→ 07 复盘→findings 回流规划
```

---

## CSP Skill 路径速查

### 调研与战略

| 阶段 | CSP Skill |
|------|-----------|
| 产品研究 | `[[skill:csp-product-research]]`（创业方向/行业扫描/竞品深潜/经济模型） |
| 竞品分析 | `[[skill:csp-competitive-analysis]]`（功能差距/差异化/借鉴） |
| 产品管理（PM） | `[[agent:csp-pm]]`（用户故事/验收标准/优先级/RICE） |
| 商业分析 | `[[agent:csp-analyst]]`（SWOT/五力/商业模型画布/成本收益） |

### 规划与路线图

| 阶段 | CSP Skill |
|------|-----------|
| 产品透镜审查 | `[[agent:csp-product-lens-reviewer]]`（前提挑战/战略后果/目标-需求对齐） |
| Roadmap 规划 | `[[workflow:csp-roadmap-planner]]`（版本序列/战略锚点/集成必要性审视） |
| 产品架构收敛 | `[[csp-product-design-convergence]]`（定位对齐/导航准入/系统卫生） |
| 产品审查（7 视角） | `prompts/product-critic-review.md`（定位/竞品/用户/商业/技术/体验/演进） |
| 产品审计→路线图 | `prompts/product-audit-to-roadmap.md`（巡检→多维审查→交棒 roadmap） |
| 路线图方法论 | `prompts/roadmap.md`（战略规划+版本序列+审视 gate+PRD SPEC 产出） |

### PRD 与需求

| 阶段 | CSP Skill |
|------|-----------|
| PRD 生成（PM 视角） | `[[workflow:csp-prd-generation]]` |
| PRD（设计师视角） | `[[pattern:csp-prd]]` |
| PRD 预设检查清单 | `prompts/prd-preset-checklist.md`（11 项关键模式） |
| 产品能力翻译 | `[[skill:csp-product-capability]]`（PRD→SRS，约束/不变量/接口） |
| 需求优先级 | `[[workflow:csp-requirement-prioritization]]`（RICE/卡诺/用户故事映射） |
| 用户反馈分析 | `[[skill:csp-user-feedback-analysis]]` |
| 产品指标审查 | `[[skill:csp-product-metrics-review]]` |

### 设计衔接（规划→设计阶段）

| 阶段 | CSP Skill |
|------|-----------|
| 用户体验设计 | `[[agent:csp-ux-designer]]`（用户流/线框/可用性启发式） |
| 前端设计系统 | `[[skill:csp-frontend-design]]`（设计语言库/Token/主题） |
| Web 多屏流程 | `[[skill:csp-flow-web]]`（16 场景/Spark-Ant-shadcn 三路径） |
| 信息架构 | `[[skill:csp-sitemap]]`（站点地图/导航结构） |

---

## 产物路径

```
项目根/
├── docs/strategy/
│   ├── STRATEGY.md                  # 战略锚点
│   └── ROADMAP.md                   # 版本号规则 + 版本序列路径
├── docs/FEATURES.md                 # 功能列表（版本×模块×功能×状态）
├── docs/prd/
│   ├── PRD-{version-slug}.md         # 每版本规划级 PRD SPEC
│   └── PRD-INDEX.md                  # PRD 索引
├── docs/analysis/
│   ├── MARKET-RESEARCH-{date}.md     # 市场调研报告
│   ├── COMPETITIVE-REFERENCE.md      # 竞品借鉴清单
│   └── INTEGRATION-NECESSITY-{date}.md # 集成必要性审视表
└── .csp/manifest.json               # 产物回写索引
```

---

按调研 → 战略 → 路线图 → 审视 → 收敛 → PRD SPEC 六步链执行，AI 自主完成，不打断我。每个阶段按进度条播报，全部完成后输出总摘要，交棒 pipeline 启动交付。