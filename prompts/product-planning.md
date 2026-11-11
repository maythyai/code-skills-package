使用 CSP 产品规划能力从零到一完成产品规划全链路（调研 → 战略 → 路线图 → 审视 → 收敛 → PRD SPEC），产出可直接交棒给 [[prompts/develop_pipeline_csp.md]] 的版本队列。

## 规划流程

### Phase 0：项目上下文探测（强制前置）
规划前先读清现状，读到即停：
1. 既有规划：`docs/strategy/STRATEGY.md` + `ROADMAP.md` 是否存在 → 决定首次/增量更新
2. 已发布版本：`git tag --list 'v*'` → 基线，规划续编
3. 07 复盘 findings：`.csp/review/REVIEW-FINDINGS-*.json`（open/deferred）→ 回流输入
4. 参考文件夹：`开源项目参考/`/`references/`/`竞品/` 等 → 若有，做竞品借鉴（Phase 0.5）

输出"规划就绪卡"：既有规划（有/无）→ 已发布版本列表 → 07 回流 finding 数 → 参考项目 → 本次定位（首次/增量）。

### Phase R：市场调研与竞品分析
AI 自主完成全部桌面调研（多路并行搜索，证据带出处，缺口标 `[TBD]`），调用 `[[skill:csp-product-research]]`（创业方向/行业扫描/竞品深潜/经济模型）+ `[[skill:csp-competitive-analysis]]`（功能差距/差异化）：

**调研五面**：
1. **行业扫描**：赛道规模、增长率、政策环境、技术拐点
2. **竞品深潜**：本地参考文件夹 + GitHub/网络同类项目，逐项目分析功能矩阵，输出功能对照表
3. **客户洞察**：典型用户画像、核心场景、未被满足需求
4. **经济模型**：变现路径、成本结构、单位经济、商业验算
5. **方向可行性**："能不能做""有没有人在做""市场多大""机会窗口"

**产品审查视角**（调用 `[[agent:csp-product-lens-reviewer]]` 做前提挑战 + 战略后果审视，再补充以下维度做全视角审查）：
- 定位审查：产品核心价值主张是否清晰？与竞品的差异化是否成立？
- 竞品审查：功能差距表 + 差异化机会
- 用户审查：核心场景穿透率、用户反馈聚类（辅助 `[[skill:csp-user-feedback-analysis]]`）
- 商业审查：变现合理性、成本结构、单位经济
- 技术审查：既有架构是否支撑规划方向
- 体验审查：关键路径可用性、信息架构
- 演进审查：版本序列与市场节奏是否匹配

产物：`docs/analysis/MARKET-RESEARCH-{date}.md`（五面 + 七视角结论，每面独立成节）。

### Phase 0.5：竞品借鉴（有参考文件夹时触发）
若探测发现参考文件夹，逐项目提炼：
- **feature 借鉴**：扫参考项目的 features/README/skills/PRD/CHANGELOG，提炼可借鉴的功能模式，标注来源+路径
- **差异化判断**：对比参考项目定位，识别本产品差异化机会
- **版本映射**：借鉴的 feature 映射到 ROADMAP 版本主题，不照抄

红线：借鉴非复制、标来源可追溯、开源协议兼容（MIT/Apache 可借鉴，GPL 审慎避免传染）。

产物：`docs/analysis/COMPETITIVE-REFERENCE.md`（`来源项目 | feature | 借鉴点 | 差异化 | 拟纳入版本`）。

### Phase 1：战略锚点
基于调研结论，调用 `[[agent:csp-pm]]`（用户故事/验收标准/优先级/RICE）+ `[[agent:csp-analyst]]`（SWOT/五力/商业模型画布/成本收益），按 Rumelt kernel 提炼 `docs/strategy/STRATEGY.md`：

1. **诊断**：产品解决什么核心问题？现状的痛点/不对称在哪？
2. **指导方针**：我们的差异化选择是什么？为什么是现在做？与竞品的核心差异是什么？
3. **为谁**：目标用户/角色/核心场景（不是"所有用户"）
4. **北极星指标**：成功怎么看 + 2-3 子指标，未定标 `[TBD]`
5. **投资主线**：3-5 条方向性主题（如"核心体验"/"平台化"/"生态"），每条一句话
6. **明确不做什么**：聚焦的代价

STRATEGY.md 短而硬——anchor，不扩成 feature list。下游 PRD 读它 ground。

### Phase 2：路线图 + 版本序列
调用 `[[workflow:csp-roadmap-planner]]` 生成长周期多版本结构化路线，产出 `docs/strategy/ROADMAP.md`。

**版本号规则（默认 SemVer X.Y.Z）**：
- **MAJOR (X)**：不兼容的 API/架构变更、移除已弃用能力——**仅在 06 发布时验证到实际 breaking 变更才 bump**
- **MINOR (Y)**：向后兼容的功能新增/主题交付，每版本通常 MINOR+1
- **PATCH (Z)**：向后兼容 bug 修复/小补丁；允许跳号
- **pre**：`alpha.N`（功能未完）/ `beta.N`（功能完）/ `rc.N`（发布候选）
- **战略主题号 ≠ SemVer 发布号**：roadmap 的"v2.0=平台化"是叙事愿景，实际 tag 从上一已发 tag 增量续编（additive→MINOR+1），只在真实 breaking 时才到达 MAJOR 战略号
- **不跳 MINOR/MAJOR**：版本号是顺序计数器，不是"宏大程度"指示器；v1.105.269 完全正常
- **默认不用日期形式**：AI 产出节奏与日历无关，按年/季/月/日定版本无意义

**攒批原则**（以模块为单位聚合）：
- 同模块功能打包到一个版本（每版本 3-5 条摘要级功能是常态），不"一个 feature 开一个版本"
- 不同模块/主题方向不同/体量过大 → 拆成下一版本
- **feat/fix 分轨**：feat 批（MINOR+1）与 fix 批（PATCH+1）不混合；同迭代既有 feat 又有 fix → 拆两个 tag

**版本序列格式**（每版本摘要级，不写详细 PRD）：
```
vX.Y.Z — {主题名} — status: planned
- 目标：一句话
- 关键功能（3-5 条摘要）：不写详细 AC，只点明做什么；同步落 FEATURES.md
- 用户场景/竞品差距：本版本对应解决什么（引 Phase R 调研节）
- 价值：用户价值 + 业务价值
- 前置依赖：依赖版本/外部能力
- PRD SPEC：docs/prd/PRD-{slug}.md（Phase 5 产出）
```

v1.0 = MVP：聚焦 3-5 核心功能验证问题假设；后续版本按投资主线推进。

### Phase 2.5：集成必要性审视（强制 self-critique gate）
**强制**：版本序列产出后立即审视——已规划 ≠ 必要。默认姿态是「砍」不是「留」。

调用 `[[agent:csp-product-lens-reviewer]]` 做前提挑战 + 战略后果审视，再逐功能过 7 维 self-critique：

| 维度 | 问什么 | 不通过 → |
|------|--------|----------|
| 定位契合度 | 功能是否服务 STRATEGY 锚点？ | 降级或剔除 |
| 场景必要性 | 核心用户/场景真需要？ | 剔除（无场景支撑） |
| 与现有能力重叠 | 是否已做/同批次重叠？ | 合并或剔除 |
| 集成成本 vs 价值 | 实现成本 vs 用户/业务价值？ | 降级到远期或剔除 |
| 依赖可行性 | 前置依赖是否可达？ | defer 到依赖就绪 |
| 攒批合理性 | 是否该并入同模块其他版本？ | 合并 |
| 核心场景聚焦度 | 是否落在核心业务场景？边缘场景/凑数 → | 剔除或 defer |

**裁决**（每功能四选一，必记依据可追溯）：
- `纳入`：必要，留本版本
- `降级`：移到后续版本，标 `deferred` + 解除条件
- `剔除`：移出版本序列，记入 Not working on + 原因（不静默删）
- `合并`：并入同模块另一版本

**产出**：`docs/analysis/INTEGRATION-NECESSITY-{date}.md`（审视表 `版本→功能→裁决→依据→去向`）+ 回写净版 ROADMAP + FEATURES.md。

红线：已规划不等于必要（审视可剔除已列功能），剔除/降级必须记原因，self-critique 只过滤功能层不动战略锚点，明显重叠/偏离锚点直接裁决不打断。

### Phase 3：产品架构收敛审查
调用 `[[csp-product-design-convergence]]` 做收敛审查：
- 定位对齐：功能清单是否服务同一产品定位
- 导航准入：信息架构/模块边界是否合理
- 系统卫生：技术债/冗余/死代码评估
- 迭代优先级：功能排序与依赖链路

产物：`.csp/convergence/CONVERGED-FEATURE-PLAN.md`（收敛后功能清单，下游 PRD 功能以此为唯一事实源）。

### Phase 4：设计衔接（规划→设计过渡）
规划产出后，调用以下 CSP 设计技能为后续 Spec 阶段铺路：

| 阶段 | 技能 | 产出 |
|------|------|------|
| 用户体验设计 | `[[agent:csp-ux-designer]]` | 用户流/线框/可用性启发式 |
| 前端设计系统 | `[[skill:csp-frontend-design]]` | 设计语言库/Token/主题 |
| Web 多屏流程 | `[[skill:csp-flow-web]]` | 16 场景多屏 IA + 产出代码 |
| 信息架构 | `[[skill:csp-sitemap]]` | 站点地图/导航结构 |

### Phase 5：每版本规划级 PRD SPEC
调用 `[[workflow:csp-prd-generation]]`（PM 视角）或 `[[pattern:csp-prd]]`（设计师视角）为净版序列每个版本产出规划级 PRD SPEC：

- 路径：`docs/prd/PRD-{version-slug}.md`，`status: Draft`，`prd_depth: planning`
- 结构：8 段大纲级填写——背景/目标/功能模块/用户故事/优先级（P0/P1/P2）/关键业务规则要点（3-5 条）/AC 骨架（每模块 1-2 条 Given-When-Then 锚点）/风险与依赖
- 深度边界：规划级只写大纲级要点，不写工程级细节；功能清单以 `CONVERGED-FEATURE-PLAN.md` 为唯一事实源，SPEC 与 ROADMAP/FEATURES 三者功能清单一致
- 红线：只为净版留存功能产 SPEC（剔除/降级不进），绝不写 HOW（技术选型/数据库/框架禁止），不确定处标 `[TBD]` 留给内环 01 升级

内环 01 跑到该版本时探测到同 `target_version` 的 `prd_depth: planning` Draft → **升级模式**：原文件上 delta 补全为工程级（穷举规则/完整 AC/异常流/埋点），不新建文件。

产物：每版本一份 SPEC + 登记 `docs/prd/PRD-INDEX.md`。

---

## 自决策授权
调研方向、竞品取舍、版本主题与 feature 拆分、优先级排序、跨版本依赖排布、集成必要性裁决、SPEC 结构取舍——你自己拍板，记入 DEV-LOG/ROADMAP，不打断我。打断条件仅 3 类：战略根本模糊 / 无法 auto-resolve 的报错 / 破坏性操作。

**默认优先**：可逆/非破坏决策自动执行，不过度问人。明显重叠/偏离锚点/依赖悬空 → 直接裁决。

---

## 交棒 pipeline
规划完成输出摘要后，交棒给 `[[prompts/develop_pipeline_csp.md]]`——pipeline 读取 ROADMAP 版本队列 + PRD SPECs 启动 01→06 连续交付。

```
产品规划                              开发 Pipeline
───────────                          ──────────────
Phase 0 上下文探测
  └→ Phase R 调研
      └→ Phase 1 战略锚点
          └→ Phase 2 路线图+版本序列 ──→ 01 PRD（规划级 SPEC → 工程级升级）
              └→ Phase 2.5 集成审视   ──→ 02 需求拆解
                  └→ Phase 3 收敛审查  ──→ 03 技术方案+Spec
                      └→ Phase 4 设计衔接 ──→ 04 任务拆解
                          └→ Phase 5 PRD SPEC ──→ 05 实施
                                                  ──→ 06 质量门控+发布
                                                  ──→ 07 复盘（findings 回流规划）
```

---

## CSP Skill 路径速查

### 调研与战略

| 阶段 | CSP Skill |
|------|-----------|
| 产品研究（五面调研） | `[[skill:csp-product-research]]`（创业方向/行业扫描/竞品深潜/客户洞察/经济模型/可行性） |
| 竞品分析 | `[[skill:csp-competitive-analysis]]`（功能差距/差异化/借鉴） |
| 产品管理（PM） | `[[agent:csp-pm]]`（用户故事/验收标准/优先级/RICE 评分/用户旅程） |
| 商业分析 | `[[agent:csp-analyst]]`（SWOT/五力/商业模型画布/成本收益分析） |
| 用户反馈分析 | `[[skill:csp-user-feedback-analysis]]`（反馈聚类/高频诉求） |
| 产品指标审查 | `[[skill:csp-product-metrics-review]]`（北极星子指标短板/增长杠杆） |

### 规划与路线图

| 阶段 | CSP Skill |
|------|-----------|
| 产品透镜审查 | `[[agent:csp-product-lens-reviewer]]`（前提挑战/战略后果/目标-需求对齐，Phase 2.5 集成审视核心） |
| Roadmap 规划 | `[[workflow:csp-roadmap-planner]]`（版本序列/战略锚点/版本号规则/SemVer 增量续编） |
| 产品架构收敛 | `[[csp-product-design-convergence]]`（定位对齐/导航准入/系统卫生/迭代优先级） |
| 需求优先级 | `[[workflow:csp-requirement-prioritization]]`（RICE/卡诺/用户故事映射） |

### PRD 与需求

| 阶段 | CSP Skill |
|------|-----------|
| PRD 生成（PM 视角） | `[[workflow:csp-prd-generation]]`（8 段结构/背景/目标/功能/AC/风险，Phase 5 规划级 SPEC） |
| PRD（设计师视角） | `[[pattern:csp-prd]]`（设计资产整合/8 段工程交底） |
| 产品能力翻译 | `[[skill:csp-product-capability]]`（PRD→SRS，约束/不变量/接口） |

### 设计衔接（规划→设计过渡）

| 阶段 | CSP Skill |
|------|-----------|
| 用户体验设计 | `[[agent:csp-ux-designer]]`（用户流/线框/可用性启发式） |
| 前端设计系统 | `[[skill:csp-frontend-design]]`（设计语言库/Token/主题/16 风格矩阵） |
| Web 多屏流程 | `[[skill:csp-flow-web]]`（16 场景/Spark-Ant-shadcn 三路径/IA 骨架） |
| 信息架构 | `[[skill:csp-sitemap]]`（站点地图/导航结构/页面层级） |

---

## 产物路径

```
项目根/
├── docs/strategy/
│   ├── STRATEGY.md                  # 战略锚点（诊断/方针/为谁/指标/主线/不做）
│   └── ROADMAP.md                   # 版本号规则 + 净版版本序列（审视后）
├── docs/FEATURES.md                 # 功能列表（版本×模块×功能×状态）
├── docs/prd/
│   ├── PRD-{version-slug}.md         # 每版本规划级 PRD SPEC
│   └── PRD-INDEX.md                  # PRD 索引
├── docs/analysis/
│   ├── MARKET-RESEARCH-{date}.md     # 市场调研（五面+七视角）
│   ├── COMPETITIVE-REFERENCE.md      # 竞品借鉴清单
│   └── INTEGRATION-NECESSITY-{date}.md # 集成必要性审视表
├── .csp/
│   ├── convergence/
│   │   └── CONVERGED-FEATURE-PLAN.md  # 收敛后功能清单
│   └── manifest.json                  # 产物回写索引
```

---

## 反模式速查

| 反模式 | 症状 | 正确做法 |
|---|---|---|
| 规划=feature list | 列功能无战略锚点 | Anchor not plan；战略是 what/why |
| 战略主题号当 SemVer 打 tag | 起步标 v2.0.0（MAJOR）但无 breaking | 战略号≠SemVer；additive→MINOR 增量 |
| 规划完不审视 | 已规划即保留，堆功能不过滤 | Phase 2.5 强制 7 维 self-critique，默认砍 |
| 审视静默删 | 剔除/降级不留原因 | 剔除必记依据，可追溯 |
| 功能发散堆砌 | 为"完整感"堆边缘场景 | 精简聚焦核心业务场景 |
| 跳过调研拍脑袋 | 版本主题无事实输入 | Phase R 先调研，锚点基于结论 |
| 规划止步 ROADMAP | 有版本表无 PRD SPEC | Phase 5 每版本一份规划级 SPEC |
| 臆造指标 | 编 DAU/收入目标 | 未定标 `[TBD]`，留给 01 确认 |
| 规划=排期 | Gantt 化堆日期 | 路线图示方向不示日期 |
| 过度问人 | 每节反复确认 | 默认优先，仅战略模糊时人工澄清 |

---

按调研 → 战略 → 路线图 → 审视 → 收敛 → 设计衔接 → PRD SPEC 七步链执行，AI 自主完成，不打断我。每个阶段按进度条播报，全部完成后输出总摘要，交棒 pipeline 启动交付。