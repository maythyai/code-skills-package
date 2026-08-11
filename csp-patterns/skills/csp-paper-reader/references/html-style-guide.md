# HTML 样式规范

本文件定义全方位论文阅读报告的视觉风格和交互规范。生成 HTML 时必须遵循以下规则。

## 字体与排版

```css
:root {
  --font-serif: 'Source Serif 4', 'Noto Serif SC', 'Georgia', serif;
  --font-sans: 'Inter', 'Noto Sans SC', 'Helvetica Neue', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  --color-bg: #ffffff;
  --color-text: #1a1a1a;
  --color-muted: #6b7280;
  --color-accent: #2563eb;       /* 强调色：学术蓝 */
  --color-border: #e5e7eb;
  --color-code-bg: #f8f9fa;
  --sidebar-width: 280px;
}
```

- 正文使用衬线字体，字号 16px，行高 1.8。
- 标题使用无衬线字体，h1 28px / h2 22px / h3 18px。
- 代码块使用等宽字体，背景 `--color-code-bg`，圆角 6px，内边距 16px。

## 布局结构

```
┌──────────────┬─────────────────────────────┐
│              │                             │
│   Sidebar    │        Main Content         │
│   (fixed)    │        (scrollable)         │
│   280px      │                             │
│              │                             │
│   TOC Nav    │   Paper Title               │
│   - Abstract │   Authors / Date            │
│   - Related  │   ─────────────────         │
│   - Contrib  │   [Analysis Sections]       │
│   - Method   │                             │
│   - Experiments                            │
│   - Apps     │                             │
│   - Limits   │                             │
│              │                             │
└──────────────┴─────────────────────────────┘
```

- 侧边栏固定定位，高度 100vh，overflow-y auto。
- 主内容区 margin-left = sidebar-width + 40px gap。
- 移动端（<768px）侧边栏隐藏，顶部显示汉堡菜单按钮切换显示。

## 目录导航

- 每个分析维度对应一个 TOC 条目。
- 当前阅读章节在 TOC 中高亮（通过 IntersectionObserver 实现）。
- 点击 TOC 条目平滑滚动到对应章节：`scroll-behavior: smooth`。

## 折叠/展开交互

每个分析维度章节默认展开，用户可点击章节标题旁的箭头图标切换折叠状态：

```html
<section class="analysis-section" id="method">
  <h2 class="section-toggle" onclick="toggleSection(this)">
    <span class="toggle-icon">▼</span> 核心方法
  </h2>
  <div class="section-content">
    <!-- 分析内容 -->
  </div>
</section>
```

```javascript
function toggleSection(header) {
  const content = header.nextElementSibling;
  const icon = header.querySelector('.toggle-icon');
  content.classList.toggle('collapsed');
  icon.textContent = content.classList.contains('collapsed') ? '▶' : '▼';
}
```

- 折叠时内容 `max-height: 0; overflow: hidden; transition: max-height 0.3s ease`。
- 展开时 `max-height: none`。

## 图片展示

```html
<figure class="paper-figure">
  <img src="data:image/png;base64,..." alt="Figure caption" loading="lazy">
  <figcaption>Figure 3: 核心方法架构示意图。左侧为编码器模块...</figcaption>
</figure>
```

- 图片最大宽度 100%，居中显示。
- figcaption 使用斜体、灰色文字、字号 14px。
- 图片间间距 24px。

## 代码块

```html
<pre class="code-block"><code class="language-python">
<span class="kw">def</span> <span class="fn">attention</span>(q, k, v):
    scores = torch.matmul(q, k.transpose(-<span class="num">2</span>, -<span class="num">1</span>))
    ...
</code></pre>
```

使用纯 CSS 语法高亮类名：
- `.kw` → 关键字（蓝色加粗）
- `.fn` → 函数名（紫色）
- `.str` → 字符串（绿色）
- `.num` → 数字（橙色）
- `.cmt` → 注释（灰色斜体）
- `.cls` → 类名（深蓝色）

不引入任何外部 JS/CSS 库。

## 引用格式

文中引用论文时使用上标数字链接到参考文献列表：

```html
<p>该方法在 ImageNet 上达到了 SOTA 性能<sup><a href="#ref-1">[1]</a></sup>。</p>
```

参考文献列表放在报告末尾，格式：`[编号] 作者. 标题. 会议/期刊, 年份.`

## 响应式断点

| 断点 | 行为 |
|------|------|
| ≥1024px | 完整双栏布局 |
| 768-1023px | 侧边栏收窄至 220px |
| <768px | 侧边栏隐藏，汉堡菜单切换 |

## 打印适配

```css
@media print {
  .sidebar, .toggle-icon, .hamburger { display: none; }
  .main-content { margin-left: 0; }
  .section-content { max-height: none !important; }
}
```
