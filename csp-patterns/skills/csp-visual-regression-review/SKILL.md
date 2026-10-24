---
name: csp-visual-regression-review
description: "Compares UI screenshots against approved baselines, Figma exports, prototype images, or reference screenshots. Covers regression mode (current UI vs last approved baseline) and conformance mode (current UI vs design reference), threshold tuning, and baseline update policy."
version: "1.0.0"
layer: 3
category: design
phase: verify
domain: patterns
scope: review
role: specialist
tools: [Read, Write, Edit, Glob, Grep, Bash]
triggers:
  - "视觉回归"
  - "截图比对"
  - "UI 还原度比对"
  - "Figma 对比"
  - "设计稿对比"
  - "diff 分析"
  - "基线更新"
  - "visual regression"
  - "screenshot diff"
  - "pixel diff"
---

# 视觉回归审查

> 你是视觉回归审查专家。用截图证据发现**有意义的视觉差异**——但永远记住：像素 diff 是探测器，不是最终裁决。本 Skill 回答"哪里变了、变的是不是问题"，而"这个问题该修什么、谁来修"交给 `csp-ui-alignment-review`。

## Skill 契约

本 Skill 支持两种相关但不同的工作流：

- **回归模式（regression）**：当前 UI 截图 vs 上一次已批准的 UI 基线。用于 PR 视觉回归、防止意外的 CSS/布局变更。
- **符合性模式（conformance）**：当前 UI 截图 vs 设计师持有的参考（Figma 导出、原型图、交付截图）。用于实现 vs 设计稿比对、AI 生成 UI 验收。

不要等价于"1:1 比对 = 0 像素差异"。目标是**设计信心**：检出有意义差异、过滤预期噪声、解释什么该修。符合性模式下，两端图像必须代表**同一路由、同一状态、同一视口、同一主题、同一内容**；任一侧缺失、过期、裁剪错误、加载中或被错误视口截取，先上报 setup 问题，再解释视觉差异。

## 使用时机

- 当前 UI 截图与基线截图比对（回归）
- 实现与 Figma / 原型 / 参考图比对（符合性）
- PR 视觉变更审查
- 判断截图 diff 是否可接受
- 调 masks / thresholds / 视口 / 截图采集协议
- 为 `csp-ui-alignment-review` 提供原始视觉证据

## 不使用时

- 需要设计师/前端对齐结论、修复责任人与实现任务 → `csp-ui-alignment-review`
- 需要跨视觉/a11y/组件/设计债的整体发布裁决 → `csp-qa`
- 需要设计系统产出 → `csp-design-system-capture`
- 只做无障碍 → `csp-access`
- 没有实现截图或参考图的纯主观视觉探索

## 证据分层

优先使用最强证据：

1. 已批准的参考图：Figma 导出、原型截图、已批准基线截图
2. 采集协议配置（视口、deviceScaleFactor、mask、阈值、冻结时间/数据）
3. 确定性自动化产物：`.csp/design-qa/reports/visual-comparison.json`
4. `.csp/design-qa/expected/*.png`、`.csp/design-qa/actual/*.png`、`.csp/design-qa/diff/*.png`
5. 源代码、DOM/computed-style 证据（解释差异原因时）

只凭记忆、路径或主观印象下视觉结论是被禁止的。

## 输入物

- 设计参考来源（Figma file key + node ID，或 Figma URL）
- `.csp/design-qa/expected/`、`.csp/design-qa/actual/`、`.csp/design-qa/diff/`
- `.csp/design-qa/reports/visual-comparison.json`
- app 路由 / 预览 URL / 本地 base URL
- 视口宽高 + deviceScaleFactor
- 动态区域 masks、阈值设置
- 冻结时间/数据、字体、动画、环境的说明

## 模式选择

- 期望图来自**已批准的应用截图** → 回归模式（更严格：两张图应来自同一渲染管线）
- 期望图来自**设计师持有来源**（Figma / 原型 / 交付稿）→ 符合性模式（需要解释性判断：设计工具与浏览器渲染方式不同）
- 期望图来源不明 → 标记 `unknown`，声明批准置信度有限

## 比对协议

1. **验证参考权威性**：期望图已批准且最新；Figma node 与目标屏幕状态匹配；不是过期 mock 或陈旧基线。
2. **归一化环境**：一致视口与 deviceScaleFactor；相同字体（或记录 fallback 差异）；禁用动画、隐藏光标；冻结时间 + 确定性种子数据；等待网络空闲/UI 稳定后截图；确认两端代表同一路由、内容、状态、主题与断点。
3. **掩码动态区域**：头像、个性化名称、时间戳、实时指标、广告、随机插图、含实时数据的图表、骨架屏 shimmer 通常应掩码。**绝不掩码布局关键区域**来让比对通过。
4. **执行比对**：记录 diff 像素数、diff 比例、图像尺寸、阈值与 masks；保存 expected/actual/diff 三张图。可用 Playwright 截图 + 任意像素 diff 工具（如 ImageMagick `compare`），或注入 `pixelmatch` 类逻辑完成。
5. **按区域解读**：区分布局 / 排版 / 颜色 / 间距 / 资源 / 状态 / 数据差异；只在代码、DOM 或视觉证据支持时解释原因；全屏 diff 看不清细节时做焦点区域检查（排版、间距节奏、颜色/token、图片/icon/资源保真、产品文案）。

## 常见误报（先排除再报设计 bug）

- 亚像素抗锯齿 / OS/浏览器字体渲染差异
- 真实数据长度不同导致的换行
- 图片压缩差异
- 未掩码的动态内容
- 仅一个环境出现滚动条
- Figma 特效（blur/shadow/gradient/blend mode）浏览器渲染不同
- 真实内容超出 mock 数据长度

误报要记为"可接受差异"或"环境限制"，不能当作通过证据。

## 必须上报的失败模式

- 缺失或多余可见元素
- 层级错误或 CTA 强调错误
- 语义色 / 状态色错误
- 布局偏移、对齐错误、溢出、内容被裁
- 影响可读性的排版 scale 不匹配
- 改变感知分组的间距/密度不匹配
- 资源错误：icon 尺寸、图片裁剪、宽高比
- 设计稿要求真实素材（logo/图标/真实图片）却被 CSS/SVG 手工替代
- 产品文案漂移、prompt 泄漏、占位文本
- hover/focus/disabled/loading/error/empty 态未实现
- 配置视口下响应式布局偏离设计意图

## 阈值指南

阈值是护栏，不是设计真相。参考区间（配合人工抽查）：

| diff 比例 | 含义 |
| --- | --- |
| 0–0.5% | 大概率可接受，抽查高影响区域 |
| 0.5–2% | 检查布局、排版、颜色、资源区域 |
| 2–5% | 除非有已知动态内容解释，否则大概率 major |
| >5% | 稳定回归场景大概率 blocker；符合性场景先查数据/内容差异是否主导 |

- 稳定基线的回归比对用更严阈值；Figma 符合性因字体/特效/数据差异可放宽。
- 优先加 masks 和确定性数据，而不是简单抬高阈值。
- 任何阈值变更必须说明它过滤什么噪声、为什么不掩盖真实问题。

## 核心审查标准

每个视觉差异在定级前先归类：

- **参考权威性**：期望图是否最新且已批准？
- **模式**：应用基线回归还是 Figma/参考符合性？
- **区域影响**：diff 落在主 CTA、导航、表单、内容，还是仅装饰/动态区域？
- **差异类型**：布局 / 间距 / 排版 / 颜色 / 资源 / 状态 / 数据 / 渲染噪声？
- **mask/阈值质量**：动态区域被掩码且未掩盖真实布局问题？
- **保真面**：排版、间距/布局、颜色/token、图片/资源、文案是否逐一检查过（不只看像素比例）？
- **用户/设计影响**：差异是否改变理解、层级、任务完成或品牌一致性？

## Finding 格式

```markdown
### [severity] <screen>: <visual issue>
- Mode: <regression | conformance>
- Expected image:
- Actual image:
- Diff image:
- Diff metric:
- Affected region:
- Observed:
- Expected:
- Likely cause:
- Recommended fix:
- Verification:
```

## 修补策略

修复视觉差异时：

- 优先 token 与组件修复，而非局部 CSS 覆盖
- 布局修复后检查响应式行为
- 保留无障碍状态与命中目标
- 仅在新 UI 被有意批准后才更新基线
- 绝不通过加宽 masks 或抬高阈值掩盖真实不匹配

## 产物目录约定

所有截图与报告统一落 `.csp/design-qa/`：

```text
.csp/design-qa/expected/*.png    # 已批准参考图
.csp/design-qa/actual/*.png      # 实现截图
.csp/design-qa/diff/*.png        # 差异图
.csp/design-qa/reports/visual-comparison.json
.csp/design-qa/VISUAL_COMPARISON_REPORT.md
```

禁止散落到项目根目录。

## 触发测试

本 Skill 应触发：

- "把当前页面截图和 Figma 原型图做 1:1 比对。"
- "这个 diff.png 是不是视觉回归？"
- "帮我调 visual regression 的 masks 和 threshold。"
- "PR 改了 CSS，跑截图回归并解释差异。"
- "截图对比一下实现和设计稿，告诉我哪里不一样。"

应转交：

- 需要设计师/前端可执行的对齐问题清单 → `csp-ui-alignment-review`
- 需要跨视觉/a11y/组件/设计债的发布裁决 → `csp-qa`
- 批量多页面截图取证（不解释 diff）→ `csp-h5-visual-testing`

## Detailed references

- `references/visual-comparison-guide.md` — 模式、Figma 符合性、掩码策略、阈值、误报、基线更新政策的详细版。
