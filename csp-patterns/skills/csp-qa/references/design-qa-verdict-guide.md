# Design QA 裁决指南

Design QA 任务需要比 SKILL.md 核心规则更深细节时读本文件：七维审查、证据优先级、严重度指南、裁决规则、反越界、finding 格式。

## 范围

Design QA 回答一个发布问题：**这个实现是否足够尊重已批准的设计意图，达到设计师可接受的程度？**

组合七个维度：

1. `DESIGN.md` 契约符合性
2. 视觉符合性或回归
3. 组件库一致性
4. 响应式行为
5. 交互状态覆盖
6. 无障碍
7. 设计债与漂移风险

不要孤立地评判视觉品味。每条 finding 必须绑定到已批准契约、参考图、组件规则、无障碍期望、代码证据或明确标注的推断。

**禁止**仅凭实现代码、文件路径或记忆完成 QA 裁决。发布级裁决需要：同一状态/视口/主题/内容下的"设计源真相 + 渲染实现"两端。两端无法匹配时，先上报 blocker，再解释视觉差异。

## 证据优先级

证据冲突时按此顺序：

1. 当前设计师批准的系统文档：`DESIGN.md`、组件文档、Figma variables、token 文件
2. 当前屏幕级规格：`SCREEN_SPEC.md`、产品验收标准、用户提供的设计说明
3. 已批准参考图：Figma 导出、原型截图、已批准基线
4. 确定性自动化：截图 diff JSON、a11y 扫描报告、组件审计、设计债审计
5. 实现源码：组件 import、CSS/Tailwind/theme 配置、Storybook stories、测试
6. 渲染截图或用户截图
7. 从产品惯例推断（标注为推断）

参考图早于代码或产品规格时，不假设其权威，标记 `needs-design-decision`。

## 七个审查维度

### 1. DESIGN.md 契约符合性

- 语义色 token 而非任意裸值
- 排版层级与使用场景
- 间距节奏与密度
- 已批准圆角、阴影、层级、表面
- 组件使用规则
- 状态色与语义色规则
- Do/Don't 约束

偏差改变层级、品牌表达、无障碍或关键组件状态时 → `major` 或 `blocker`。

### 2. 视觉符合性或回归

- 主要布局位置与尺寸
- 页面层级与 CTA 强调
- 分组、对齐、间距、密度、锚点级 UI 对齐
- 字号、字重、行高、换行
- 颜色、对比度、表面、边框、阴影
- 图片裁剪、icon 尺寸、资源选择
- 配置视口下的响应式布局

像素 diff 是探测器，不是最终裁决。每个视觉符合性检查必须显式过一遍：**排版与字体、间距与布局节奏、颜色与 token 映射、图片/icon/logo/资源保真、文案与产品专属内容**。全屏截图不足以判断这些面时，做焦点区域检查。

### 3. 组件库一致性

- 常用 UI 原语来自项目设计系统
- 裸元素限于原语实现区或有理由的特例
- variant 集中定义，不在业务代码里临时编码
- 状态由组件支持，不在局部打补丁
- Storybook/测试覆盖重要 variant 与状态

### 4. 响应式行为

检查配置视口：mobile / tablet / desktop / wide desktop（相关时）。找溢出、内容裁剪、CTA 被隐藏、别扭换行、过密、层级丢失、fixed 定位损坏、滚动陷阱。

### 5. 交互状态覆盖

至少检查：default / hover / focus-visible / active / disabled / loading / empty / error / success-warning（相关时）/ selected-expanded-collapsed（相关时）。默认截图正确但缺 focus-visible、disabled、loading、error 态，仍是常见 Design QA 问题。

### 6. 无障碍

自动化违规 + 人工风险：对比度、可见焦点、键盘可达、可访问名称、表单 label 与错误关联、语义标题与地标、alt 文本与非文本内容、reduced motion、触控目标尺寸与间距。主路径上的无障碍问题是设计批准问题，不只是工程 bug。完整 WCAG 审计交给 `csp-access`。

### 7. 设计债

- 硬编码颜色
- 任意 Tailwind 值
- 业务代码 inline styles
- 非 token CSS 变量
- token 外的自定义阴影/圆角/排版
- 组件绕过
- 重复视觉模式
- 未批准 variant

债在重复出现、可见或可能通过生成 UI 扩散时按 `major` 处理。

## 严重度指南

### Blocker

阻止设计批准或安全发布：

- 主流程视觉或功能损坏
- 关键路径缺必需元素/状态
- 已批准参考区域的大面积视觉符合性失败
- 主路径无障碍障碍
- 响应式布局隐藏或破坏主操作
- 设计系统绕过导致发布关键面上状态/行为不一致

### Major

可见、重复或削弱系统：

- 明显的间距、排版、颜色、组件或层级不匹配
- 重复的 token/组件绕过
- 缺重要状态
- 影响常见使用的 a11y 问题
- 有 workaround 但有真实用户影响的响应式问题
- 可能扩散的漂移

### Minor

局部 polish 问题：

- 小对齐或间距不匹配
- 轻微排版或 icon 位置问题
- 低流程影响的局部文案或截断问题
- 单一非关键状态 polish 问题

### Debt

当前 UI 可能可接受，但实现增加漂移风险：

- 应成为 token 的硬编码值
- 应集中化的局部 variant
- 暗示缺原语的重复 class
- 不一致的 token 名或重复语义色

### Info / Needs Design Decision

`info`：上下文、局限或可接受差异。`needs-design-decision`：证据冲突或设计契约未定义预期行为。

## 裁决规则

- `Fail`：至少 1 个 blocker，或多个削弱设计意图的 major。
- `Pass with warnings`：无 blocker，但仍有 minor/major/debt 项且本次发布可接受。
- `Pass`：无阻断或实质问题，证据质量强。
- `Inconclusive`：参考、路由、截图或实现证据不足。

## 反越界

不要：

- 只因为裸 diff 比例高就 fail 一个屏幕
- 只因为裸 diff 比例低就 pass 一个屏幕
- 参考可能过期时仍称其权威
- 掩码真实布局问题让测试通过
- 无设计证据时发明 token 或组件 variant
- 把每个 px 值都转 token 而不考虑上下文
- 仅凭 axe 输出宣称 screen-reader 质量
- 设计源要求真实素材或特定视觉处理时，接受自定义 CSS 艺术、手工 SVG 替代、占位头像、假产品图
- 无源视觉目标时把宽泛的产品流程审计折叠进 Design QA

## Finding 格式

每条 finding：

```markdown
### [<severity>] <category>: <short title>
- ID: <稳定 id（如有），如 DQA-001>
- Screen/route:
- Component/selector:
- Evidence:
- Observed:
- Expected:
- Impact:
- Recommended fix:
- Verification:
- Owner: <design | frontend | design-system | content | unknown>
```

字段要求：

- **Evidence**：优先具体证据——文件路径与行号、selector 或组件名、expected/actual/diff 图路径、JSON 报告路径与 finding id、design token 或组件规则、Figma node/frame 名。"看起来不对"这类弱证据仅在无更强证据时可用，且必须标注为主观/手工判断。
- **Observed**：描述现状，不混入修复方案。好例：`主 CTA 在 src/app/checkout/CheckoutActions.tsx 使用 bg-[#1d4ed8] 与 6px 圆角`。
- **Expected**：绑定到最强的设计源。好例：`DESIGN.md 定义主按钮为 {colors.primary} + {radii.md}，focus-visible 使用 {colors.focus} outline`。
- **Impact**：解释为什么重要——设计批准风险、用户任务失败、无障碍障碍、组件系统漂移、未来维护成本、与已批准参考不符。
- **Recommended fix**：可执行——用特定 token、换共享组件、加组件 variant、更新状态 story/test、调整布局规则、设计签字后才更新基线。
- **Verification**：说明如何确认修复——重跑比对、检查截图/diff、键盘路径测试、检查 Storybook 状态、确认契约 lint 通过、请设计 owner 批准有意变更。

## Ticket 标签

转 ticket 时可用：`design-qa:blocker` / `design-qa:visual` / `design-qa:a11y` / `design-qa:components` / `design-qa:debt` / `design-qa:responsive` / `needs-design-decision`。

## 与兄弟技能的衔接

- 需要逐像素 diff 证据 → `csp-visual-regression-review`
- 需要设计师/前端对齐问题清单（具体屏幕 vs 参考图）→ `csp-ui-alignment-review`
- 需要完整 WCAG 合规审计 → `csp-access`
- 需要设计系统产出/更新 → `csp-design-system-capture`
- 需要硬编码样式债专项 → `csp-tech-debt-assessment`
