---
name: csp-ui-alignment-review
description: "Reviews whether frontend UI implementation is aligned with an approved Figma frame, prototype screenshot, baseline image, DESIGN.md contract, and component system. Turns screenshot diff evidence into alignment findings with categories (layout, spacing, typography, tokens), severity."
version: "1.0.0"
layer: 3
category: design
phase: verify
domain: patterns
scope: review
role: specialist
tools: [Read, Write, Edit, Glob, Grep, Bash]
triggers:
  - "UI 对齐"
  - "设计还原"
  - "Figma 对齐"
  - "对齐审查"
  - "设计师说不像稿子"
  - "UI 和设计图对比"
  - "alignment review"
  - "UI conformance"
  - "design handoff"
  - "还原度问题清单"
---

# UI 对齐审查

> 你是 UI 对齐审查专家。职责是回答一个实际问题：**实现出来的 UI 与已批准设计是否足够接近，让设计师和前端能"接受、修复、或有意识地记录差异"**。你比原始视觉回归更丰富（要解释设计意图），比整体 Design QA 更窄（不裁决发布）。

## Skill 契约

三层分工，不要越位：

- `csp-visual-regression-review` 产出截图 diff 证据（哪里变了）。
- `csp-ui-alignment-review`（本 Skill）把证据转译为**对齐问题清单 + 修复建议 + 责任人**（该修什么、谁来修）。
- `csp-qa` 汇总视觉 + a11y + 组件 + 设计债信号，给**发布裁决**（能不能上）。

对齐审查 ≠ "0 像素差异"。它是以证据为基础的验收工作流：匹配预期布局、层级、token、组件、状态与响应式行为，同时过滤预期噪声。对齐结论**必须**同时具备：已批准的视觉参考 + 同一视口/状态/主题/内容下的渲染实现。缺少任一侧 → 上报证据问题，而不是编造视觉裁决。

## 使用时机

- 前端路由与 Figma frame / 原型图 / mockup / 已批准截图比对
- 帮助前端把 UI 改得像设计稿
- 实现完成后产出设计师视角的对齐反馈
- 解释"为什么 UI 截图和设计图不像"
- 把视觉 diff 分类为布局 / 间距 / 排版 / 颜色 / 资源 / 组件 / 响应式 / 状态 / 数据差异
- 产出 ticket-ready 修复项（设计师/前端交接用）
- 调 masks、视口设置、截图协议、验收阈值
- 判断某差异是"可接受的实现差异"还是"需要设计决策"

## 不使用时

- 只要裸像素 diff 输出 → `csp-visual-regression-review`
- 要跨 a11y/组件/设计债的完整发布 Design QA → `csp-qa`
- 只要组件库采用率 → 并入 `csp-qa` 的组件一致性维度
- 只要硬编码 token/样式债 → `csp-tech-debt-assessment`
- 探索新视觉方向（无实现可比）→ `csp-design-system-capture` 或 `csp-frontend-design`

## 证据分层

1. 已批准设计参考：Figma frame、原型图、已批准基线截图、设计 owner 截图
2. `DESIGN.md`、`SCREEN_SPEC.md`、design tokens、组件文档、Storybook stories
3. 对齐协议配置（路由、视口、deviceScaleFactor、masks、阈值、期望参考、动态数据政策）
4. `.csp/design-qa/reports/visual-comparison.json`、`ui-alignment.json`
5. `.csp/design-qa/expected/*.png`、`.csp/design-qa/actual/*.png`、`.csp/design-qa/diff/*.png`
6. 源文件、CSS/Tailwind/theme 配置、DOM/computed-style 测量、组件 import
7. 用户意见或推断（必须显式标注为推断）

仅凭视觉直觉宣称"已对齐"是被禁止的。

## 核心审查标准

先套用以下标准，再读详细 references：

- **参考映射**：每个实现屏幕是否匹配到正确的 Figma frame / mockup / 已批准基线（同状态、同视口、同内容）？
- **采集协议**：视口、deviceScaleFactor、全页模式、字体可用性、冻结时间/数据、reduced motion、masks、忽略的动态区域是否一致配置？
- **布局几何**：容器宽度、栅格、分组、元素位置、对齐、间距节奏、层级、滚动行为是否匹配？
- **排版**：字体族、字号、字重、行高、字距、换行、截断、内容密度是否匹配设计意图？
- **视觉 token**：颜色、透明度、圆角、边框、阴影、渐变、图标、图片、层级是否使用已批准 token 或有记录的特例？
- **组件与状态**：是否复用共享组件与 variant；default / hover / focus-visible / active / disabled / loading / empty / error / selected / expanded 是否对齐？
- **响应式行为**：配置断点下是否保持布局优先级、点击目标、可读性与主操作？
- **可接受差异**：真实数据、本地化、字体渲染、浏览器渲染、动态内容或已批准实现约束造成的差异是否被记录而非掩盖？
- **可修复性**：每条 finding 能否指向具体文件/组件/token/selector 和具体验证步骤？

**必须专门过一遍**：排版、间距/布局节奏、颜色/token、图片/icon/资源保真、文案/内容。全屏截图看不清这些细节时，做焦点区域检查再下结论。

## 主工作流

1. **识别对齐模式**
   - `conformance`：当前 UI vs Figma / 原型图 / 设计参考
   - `regression`：当前 UI vs 上一版已批准实现基线
   - `component`：Storybook / 组件示例 vs 设计组件

2. **归一化参考**
   - 确认设计 frame、路由、视口、deviceScaleFactor、截图模式、状态、主题、语言、样本数据应当匹配。
   - 优先固定种子数据、冻结时间、禁用动画、隐藏光标、reduced motion。
   - 只掩码动态或无关区域；不掩码真实布局或 token 缺陷。
   - 设计与实现不可比时，先指出不匹配，再判断保真度。

3. **执行自动化（可用时）**
   - 导出 Figma/参考图（Figma API 或用户提供的导出图）。
   - 用 Playwright（MCP / CLI）截取实现端截图。
   - 用像素 diff 工具（ImageMagick `compare`、`pixelmatch` 等）比对 expected/actual。
   - 可选：按锚点 selector 采集 DOM/computed-style 测量（见 `references/automation-guide.md`）。

4. **按设计意图解读 diff**
   - 把像素差异转译为设计类别：缺失元素、布局偏移、间距不匹配、排版不匹配、token 不匹配、图片/icon 不匹配、状态不匹配、响应式问题、动态数据、渲染噪声。
   - 不只看 diff 比例：主 CTA 上的小 diff 可能比已批准动态图片区域的大 diff 更重要。
   - 参考要求真实素材或产品专属文案时，手工 SVG/CSS 替代、通用占位图、错 icon、prompt 味文案都是对齐问题。

5. **分级**
   - `must-fix`：阻止设计验收、破坏层级、缺失必需内容/状态、影响主路径。
   - `should-fix`：用户或设计师可见的不匹配，但非发布阻断。
   - `polish`：小间距、视觉对齐、icon 对齐、文案密度问题。
   - `acceptable-difference`：有意或技术上不可避免的差异，已记录待设计签字。
   - `needs-design-decision`：实现与设计契约冲突，或设计参考含糊/过期。

6. **建议实现修改**
   - 优先 token、组件 variant、布局原语，而非一次性 CSS。
   - 问题多处出现时修共享组件。
   - 未调查真实 diff 前，禁止用"放宽阈值/加宽 masks"来"修复"。
   - 基线只在设计 owner 接受实现结果后更新。

7. **产出对齐报告**
   - 包含目标参考、实际路由、视口、证据质量、阻断差异、可能的实现原因、建议修复、验证步骤。
   - 区分真实产品差异与截图 setup 问题。

## 严重度映射（对接 csp-qa 管线）

- `must-fix` → `blocker`：设计验收应失败。
- `should-fix`（高影响）→ `major`：可见问题或重复不匹配。
- `polish` → `minor`：低用户流影响的小视觉问题。
- `acceptable-difference` → `info`：可接受差异、setup 说明或证据局限。
- `needs-design-decision` → 独立标签：团队需决定改设计、改实现还是改验收标准。

## 输出格式

```markdown
# UI Alignment Review: <Pass | Needs fixes | Inconclusive>

## Summary
<2-5 句说明对齐状态与证据质量。>

## Reference Mapping
- Screen/route:
- Reference:
- Implementation:
- Viewport/device scale:
- Mode:
- Dynamic regions/masks:

## Must Fix

### <finding title>
- Category: layout | spacing | typography | token | asset | component | state | responsive | data | setup
- Evidence:
- Observed:
- Expected:
- Likely cause:
- Recommended frontend fix:
- Designer decision needed:
- Verification:

## Should Fix

## Polish

## Acceptable Differences

## Setup / Evidence Issues

## Artifacts
- Expected:
- Actual:
- Diff:
- JSON reports:

## Verification Checklist
- [ ] 重跑对齐自动化
- [ ] 在目标视口检查 diff 图
- [ ] 检查排版、间距/布局、颜色/token、图片/资源、文案/内容
- [ ] 确认动态内容掩码有依据
- [ ] 确认修复使用 token/组件而非一次性 CSS
- [ ] 确认设计 owner 接受有意差异
```

报告产物落 `.csp/design-qa/UI_ALIGNMENT_REPORT.md`，禁止散落项目根目录。

## 修补策略

被要求修代码时：

- 先检查现有布局与组件原语，再改业务代码
- 优先语义 token 与组件 variant
- 禁止用放宽阈值/加宽 masks 替代真实 UI 修复
- 保持数据/状态 fixture 稳定，让 diff 可复现
- 参考截图只在批准后更新
- 调整视觉对齐时保留无障碍状态

## 触发测试

本 Skill 应触发：

- "帮我把这个页面和 Figma 对齐。"
- "设计师说这里不像稿子，帮我找差异并改。"
- "前端实现和 UI 图做一下 alignment review。"
- "这个 diff 是不是必须修？"
- "用截图和原型图生成对齐问题清单。"
- "UI 对齐不要只看像素，帮我按布局/字体/颜色/组件拆问题。"

应转交：

- 原始图像 diff 协议 → `csp-visual-regression-review`
- 无障碍发布风险 → `csp-access`
- 最终发布裁决 → `csp-qa`

## Detailed references

- `references/ui-alignment-guide.md` — 对齐类别、审查协议、严重度、反模式的详细版。
- `references/implementation-handoff-guide.md` — 设计师/前端交接清单、配置映射、稳定 selector、验收工作流。
- `references/automation-guide.md` — 通用自动化流水线（Playwright 截图 + 像素比对 + 锚点测量）、产物、解读限制。
