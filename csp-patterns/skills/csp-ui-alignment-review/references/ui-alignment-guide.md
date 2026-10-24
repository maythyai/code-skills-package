# UI 对齐指南

## 目的

UI 对齐审查回答一个实际问题：

> 实现出来的 UI 与已批准设计是否足够接近，让设计师和前端工程师能够接受、修复、或有意识地记录差异？

它比完整 Design QA 窄，比原始视觉回归丰富：组合截图比对、设计参考映射、组件使用、token 检查、DOM/computed-style 证据与实现建议。

## 术语

- **参考（Reference）**：已批准的 Figma frame、原型图、基线截图或设计 owner 截图。
- **实际（Actual）**：从运行中的应用、Storybook story、预览部署或本地路由截取的截图。
- **符合性模式（Conformance）**：实际 UI vs 设计参考。
- **回归模式（Regression）**：实际 UI vs 上一版已批准实现基线。
- **对齐锚点（Alignment target）**：应被测量或检查的具体 selector 或组件（hero 标题、主 CTA、卡片、导航、表单字段）。
- **可接受差异（Acceptable difference）**：被记录的有意、动态、数据驱动或设计 owner 批准的差异。

## 审查协议

### 1. 确认同一状态

比对前确认：

- 同一路由或 Storybook story
- 同一视口宽高
- 同一 deviceScaleFactor
- 同一主题/模式
- 同一 locale
- 同一应用状态
- 同一数据 fixture
- 同一 loading/error/empty 状态
- 同一认证状态
- 非全页截图时同一滚动位置

此处不匹配是 setup 问题，先于设计问题。

### 2. 归一化截图采集

- 浏览器与基线生成在同一环境
- 冻结时间、种子数据
- 禁用动画/过渡
- 隐藏光标
- reduced motion
- 确定性视口与 deviceScaleFactor
- 等待网络/UI 稳定
- 只掩码动态区域（头像照片、时间戳、广告、随机图表、实时指标、生成内容）
- sticky header/footer 或懒加载使比对噪声大时，避免全页截图

### 3. 比对视觉证据

从 expected/actual/diff 三图开始，按类别解读：

- 布局几何
- 间距节奏
- 排版
- 颜色/token
- 图片/icon/资源
- 边框/圆角/阴影/层级
- 组件 variant
- 状态行为
- 响应式行为
- 内容/数据差异
- 截图 setup 问题
- 浏览器/渲染噪声

不只看 diff 比例：主按钮颜色上 0.5% 的 diff 比被掩码轮播图里 5% 的 diff 更重要。

### 4. 用 DOM 与源证据解释原因

截图显示不匹配时检查：

- 关键元素的 bounding box
- computed `font-size`、`line-height`、`font-weight`、`letter-spacing`、color、background、border-radius、shadow、padding、margin、gap
- 组件 import 与 variant
- Tailwind 任意值
- inline styles
- CSS 变量与 token 使用
- 布局容器与断点规则

好 finding 同时说清"视觉上变什么了"和"开发者能在哪里修"。

## 对齐类别

### 布局几何

检查：

- frame 尺寸与视口对齐
- max-width 与容器对齐
- 栅格列与 gutter
- 卡片与 section 位置
- 垂直节奏
- sticky/fixed 元素
- 滚动与折叠位置
- 分组与视觉层级

常见原因：

- 容器 max-width 错误
- 缺 wrapper
- 意外的 padding/margin
- CSS reset 差异
- 图片宽高比不匹配
- 隐藏/多余内容
- 全页 vs 视口采集不匹配

### 排版

检查：

- 字体族与 fallback
- 字号
- 字重
- 行高
- 字距
- text transform
- 换行
- 截断
- line clamp
- 内容密度

常见原因：

- web font 未加载
- 浏览器 fallback 字体
- token 不匹配
- 组件默认值与设计不符
- 翻译或真实内容与设计 fixture 不同

### 颜色与视觉 token

检查：

- 语义角色（不只是 hex 精确值）
- 主题模式
- 透明度
- 边框颜色
- 背景层次
- 渐变方向/停点
- 层级/阴影
- 圆角
- disabled/hover/focus 状态

常见原因：

- 裸 hex 值
- 旧 token 别名
- 主题模式不匹配
- 局部覆盖
- 非 token 的 Tailwind 任意值

### 组件与 variant 对齐

检查：

- 共享 Button/Input/Card/Dialog/Table/Navigation 原语
- 已批准 variant
- hover/focus/active/disabled/loading/error 状态
- icon 位置与尺寸
- label/help/error 文本槽位
- 复合组件内部间距

常见原因：

- 裸 HTML 绕过
- 本地重复组件
- 设计系统缺 variant
- Figma 到代码的 prop 映射错误
- Storybook story 缺状态

### 响应式对齐

检查：

- 内容优先级与顺序
- 导航折叠行为
- 表单字段堆叠
- 点击目标尺寸
- 表格/卡片变换
- 主操作可见性
- 溢出与裁剪
- safe area 与 sticky CTA 行为

常见原因：

- 设计 frame 只覆盖桌面
- 路由缺移动端规格
- 断点不匹配
- 动态内容长于设计占位

## 严重度指南

### Must fix / blocker

- 主操作缺失、错位或视觉错误
- 必需内容/状态缺失
- 布局破坏主流程
- 导航或表单不可理解
- 截图 setup 揭示真实实现不匹配（非噪声）
- 重复不匹配说明设计系统 variant 是错的
- 设计 owner 无法合理批准该屏幕

### Should fix / major

- 可见的间距、排版、颜色或布局不匹配影响感知质量
- 元素层级与设计不符
- 组件 variant 不同但流程仍可用
- 移动/平板布局明显差于设计意图
- 重复的 token/组件漂移

### Polish / minor

- 小视觉对齐问题
- icon 或 label 位置微差
- 低影响的换行差异
- 不影响层级的小间距不匹配

### Acceptable difference / info

- 动态数据差异（有意掩码或记录）
- 设计用占位文案而实现用真实内容
- 浏览器字体渲染的细微抗锯齿差异
- 设计已接受的记录在案的技术约束
- 截图采集无法验证的问题

### Needs design decision

- 设计参考与 `DESIGN.md` 冲突
- 实现有合理替代方案但未获批
- 真实内容撑破设计占位，需要布局政策
- 需要未定义的组件 variant
- 审查后基线可能需要更新

## 反模式

避免：

- 抬高 `maxDiffPixelRatio` 直到测试通过
- 掩码整个 section 来掩盖真实不匹配
- 设计批准前更新基线
- 把所有浏览器渲染差异都当 bug
- 把 diff 比例当设计优先级
- 设计系统组件本身错误时，用一次性值修业务代码
- 桌面 diff 过了就忽略移动端
- 拿错误的 Figma frame 或状态审查屏幕

## 好 finding 示例

```markdown
### [major] Hero 标题桌面端行高过紧
- Category: typography
- Evidence: `.csp/design-qa/diff/home-desktop.png`；selector `[data-testid="hero-title"]`
- Observed: computed `font-size: 48px`，`line-height: 52px`；标题比参考高出 8px 换行。
- Expected: DESIGN.md display heading 为 48px / 56px。
- Likely cause: 页面级 class `leading-[52px]` 覆盖了 heading token。
- Recommended frontend fix: 用 display heading token 或共享 `Heading` 组件 variant 替换任意 line-height。
- Verification: 重跑对齐比对并检查 home-desktop diff。
```

## 坏 finding 示例

```markdown
这个页面不像。
```

坏示例不可执行：缺类别、证据、期望值、可能原因与验证。
