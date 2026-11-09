# PRD — [项目名] / [direction]

- **生成时间**：[ISO8601]
- **数据源**：[brief / stories / sitemap / flow-web / …] [N] 个上游 Skill
- **完整度**：strong / moderate / thin

> 这是**设计师视角的 PRD**（工程交付桥接），不是 PM 视角的 PRD。
> PM 的 PRD 论证「为什么做、做什么」；设计师的 PRD 告诉工程师「做什么、按什么标准做、参考哪些已生成的设计资产」。

---

## 1. Summary（一段话，60 秒读完）

一段散文（不要 bullet），覆盖 4 个要素：

- **做什么**（一句话）
- **给谁**（primary persona）
- **为什么是现在**（市场 / 业务原因）
- **成功长什么样**（一个可量化结果）

> 写作约束：stakeholder 只看这一段就要理解整个项目押注。

---

## 2. Background & Problem

- **问题**：从用户视角描述（用 persona 的措辞，不要从产品视角）
- **当前 workaround**：用户今天怎么解决？为什么不够好？
- **为什么是现在**：市场 / 用户行为 / 竞品格局有什么变化？
- **不解决什么**：明确 1-2 个相邻问题本 PRD 故意排除（来自 brief.out_of_scope）

---

## 3. Personas & User Segments

**Primary persona**：

```
姓名：[name]
身份：[description]
情境：[situation]
JTBD：当 [situation]，[name] 想 [motivation]，从而 [outcome]。
当前 workaround：[workaround]
痛点：[frustrations]
```

**Secondary persona**（如适用，同格式；常见于 B2B 买家 ≠ 使用者）。

**这个产品不为谁做**：一句话，防止「为所有人做」。

---

## 4. Goals & Success Metrics

- **产品目标**：一句话，outcome-framed 不是 feature-framed

| 指标 | 度量什么用户行为 | 目标值 | 时间窗 |
| --- | --- | --- | --- |
| [primary] | … | 具体数字 | 30/60/90 天 |
| [secondary] | … | … | … |
| [health] | … | … | … |

- **Anti-metrics（反指标）**：明确不优化什么（例：通知打开率虽好看但优化会破坏信任）。每个 PRD 至少 1 个。
- **关键假设**：一句话写出「如果错就意味做错产品」的假设。

---

## 5. Value Proposition

**对主用户**：
> “[persona name] 终于可以 [JTBD] 而不必 [当前阻力]，因为 [本产品做了什么不一样的事]。”

**对 buyer**（如不同于 user）：同模板。

**竞争差异化**：2-3 句，要具体（「更好的 UX」不算差异化）。对手做对了什么 / 留下什么空白 / 本产品填哪个空白。

---

## 6. Solution & Feature Scope（★ 最重要章节）

> 对 stories 中每个 Story，按 priority 降序（P0 在前）生成一节。

### [Story 标题]

**Persona**：[story.persona]
**Job**：[story.scenario] → [JTBD 动机]
**优先级**：P0 / P1 / P2
**关键假设标记**：⭐（仅当 critical_assumption=true）

**功能描述**（2-3 句，从用户视角，平实语言）：
[基于 story.scenario 和 story 主体生成]

**In Scope（这版要做的）**：
- [基于 story.acceptance_criteria 转译]
- […]

**Out of Scope（这版故意不做的）**：
- [基于 brief.out_of_scope + story.priority < p0 的部分]

**验收标准（Given / When / Then）**：
- Given [情境]，When [动作]，Then [可观察结果]
- Given [情境]，When [动作]，Then [可观察结果]
- 边缘情况：[X 出错时怎么办]
- 空状态：[没数据时用户看到什么]

**设计触点**（来自 story.design_touchpoints）：
- 涉及屏：[…]
- 涉及组件：[…]
- 涉及状态：[…]

**关联 Sitemap 页面**（来自 sitemap.pages）：
- [page.id]: [page.route] — [page.label]

**已生成的设计资产**（来自 flow-web/mobile.output_files；没有则标「待生成」）：
- `src/app/(xxx)/page.tsx` — [屏名]
- `src/components/[Xxx].tsx` — [组件名]

**待澄清问题**：
- [story 阶段未解决的决策项]

---

**未列入本版的 Stories**（P2 / 低优先级，备 Phase 2 引用）：
- [Story 标题 …]

---

## 7. Constraints & Risks

- **技术约束**：例「4 周交付」「Web 优先」「必须用 SparkDesign」
- **设计约束**：UX pattern / 无障碍要求等不可妥协项
- **数据 & 隐私**：涉及哪些个人数据？合规考虑（GDPR / CCPA / 国内法规）？

| 风险 | 可能性 | 影响 | 缓解措施 |
| --- | --- | --- | --- |
| [关键假设错] | High | High | [最便宜的测试] |
| [技术依赖失败] | M | M | [fallback 方案] |
| [用户不接受] | M | H | [灰度 / 测试方案] |

> 若上游有 check.findings，把其中未修复的 blocker / major 列入风险表。

---

## 8. Release Approach

- **推荐顺序**：哪个 Story 先发，为什么？优先发关键假设测试 Story
- **MVP 定义**：最小 Story 集合，能交付足够价值且验证核心假设（显式列 Story 标题）
- **Phase 2**（如适用）：故意延后到第二版的内容，为什么
- **上线考虑**：
  - 上线前需要通知谁？（stakeholders / 客服 / 法务）
  - 是否 soft launch / beta 降风险？
  - 上线后头 2 周监测什么？

---

> ⚠️ **薄弱章节提示**（如有）：
> [对 thin_sections 中每条说明缺什么、建议怎么补]
