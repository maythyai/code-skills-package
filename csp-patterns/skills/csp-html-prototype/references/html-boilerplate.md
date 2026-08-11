# HTML Boilerplate 基础模板

生成 HTML 原型时统一使用此模板作为起点。根据 device 和 fidelity 参数选择对应变体。

---

## 高保真 - 移动端（默认模板）

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>{{PAGE_TITLE}}</title>
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
  <style>
    :root {
      --theme-color: {{THEME_COLOR}};
      --theme-light: {{THEME_LIGHT}};
      --bg-color: #f5f7fa;
      --card-bg: #ffffff;
      --text-primary: #1a1a1a;
      --text-secondary: #666666;
      --text-tertiary: #999999;
      --border-color: #f0f0f0;
      --spacing-xs: 4px;
      --spacing-sm: 8px;
      --spacing-md: 12px;
      --spacing-lg: 16px;
      --spacing-xl: 24px;
      --spacing-xxl: 40px;
      --radius-sm: 8px;
      --radius-md: 12px;
      --radius-lg: 16px;
      --radius-full: 50%;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
      background: var(--bg-color);
      color: var(--text-primary);
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }

    .app-container {
      max-width: 375px;
      margin: 0 auto;
      min-height: 100vh;
      background: var(--bg-color);
      position: relative;
      overflow-x: hidden;
    }

    /* === Toast 工具 === */
    .toast {
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      padding: 12px 24px; background: rgba(0,0,0,0.75); color: #fff;
      border-radius: var(--radius-sm); font-size: 14px; z-index: 9999;
      opacity: 0; transition: opacity 0.3s; pointer-events: none;
    }
    .toast.show { opacity: 1; }
  </style>
</head>
<body>
  <div class="app-container">
    <!-- 页面内容在此处展开 -->
  </div>

  <div class="toast" id="toast"></div>
  <script>
    function showToast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2000);
    }
  </script>
</body>
</html>
```

---

## 高保真 - 桌面端

将以下 CSS 变量替换：
```css
.app-container {
  max-width: 1440px;
  margin: 0 auto;
  min-height: 100vh;
  padding: 0 40px;
}
```

---

## 高保真 - 平板端

```css
.app-container {
  max-width: 768px;
  margin: 0 auto;
  min-height: 100vh;
  padding: 0 24px;
}
```

---

## 低保真 - 移动端

在高保真模板基础上，替换 `:root` 变量：

```css
:root {
  --theme-color: #333333;
  --theme-light: #f5f5f5;
  --bg-color: #ffffff;
  --card-bg: #ffffff;
  --text-primary: #333333;
  --text-secondary: #666666;
  --text-tertiary: #999999;
  --border-color: #cccccc;
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-lg: 16px;
  --spacing-xl: 24px;
  --spacing-xxl: 40px;
  --radius-sm: 0px;
  --radius-md: 0px;
  --radius-lg: 0px;
  --radius-full: 50%;
}
```

并添加低保真专用样式：

```css
/* 低保真覆盖 */
* { box-shadow: none !important; }
[class*="card"], [class*="btn"], [class*="input"] {
  border: 2px dashed var(--border-color) !important;
  background: #fff !important;
}
img, [class*="avatar"], [class*="banner"] {
  background: #e8e8e8 !important;
  border: 2px dashed #ccc !important;
}
```

可选手绘风格字体（在 `<head>` 中添加）：
```html
<link href="https://fonts.googleapis.com/css2?family=Comic+Neue:wght@400;700&display=swap" rel="stylesheet">
<style>body { font-family: 'Comic Neue', cursive; }</style>
```

---

## 通用规则

1. **CSS 变量优先**：所有颜色、间距、圆角用 CSS 变量，方便全局调整
2. **`{{占位符}}` 说明**：
   - `{{PAGE_TITLE}}`：替换为实际页面标题
   - `{{THEME_COLOR}}`：替换为主题色，默认 `#1677FF`
   - `{{THEME_LIGHT}}`：替换为主题色浅色版（用于背景），默认 `#f0f5ff`
3. **Material Icons 用法**：`<span class="material-icons">icon_name</span>`，图标名查阅 https://fonts.google.com/icons
4. **占位图片**：不使用 `<img src>`，改用带图标的色块容器：
```html
<div style="width:100%;height:180px;background:linear-gradient(135deg,var(--theme-color),var(--theme-light));
  display:flex;align-items:center;justify-content:center;border-radius:var(--radius-md);">
  <span class="material-icons" style="font-size:48px;color:rgba(255,255,255,0.6)">image</span>
</div>
```
