# Tab 遍历、深浅色切换与交互录屏

三个可选场景，以用户确认的结果为准。

## Tab 遍历截图

```javascript
const TABS = [
  { name: 'home', path: '/' },
  { name: 'category', path: '/category' },
  { name: 'cart', path: '/cart' },
];

for (const tab of TABS) {
  await page.goto(`${BASE_URL}${tab.path}`);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: `h5-test-output/screenshots/${tab.name}.png`, fullPage: true });
}
```

## 深浅色模式切换

```javascript
// 浅色模式截图
await page.screenshot({ path: 'h5-test-output/screenshots/home-light.png', fullPage: true });

// 切换深色模式（根据项目实现选择方式）
await page.evaluate(() => {
  document.documentElement.setAttribute('data-theme', 'dark');
  // 或 CSS 变量：document.documentElement.style.setProperty('--color-scheme', 'dark');
  // 或 class：document.body.classList.add('dark-mode');
});
await page.waitForTimeout(500); // 等待过渡动画

// 深色模式截图
await page.screenshot({ path: 'h5-test-output/screenshots/home-dark.png', fullPage: true });
```

先检测项目的主题实现方式（`data-theme` / CSS 变量 / class / `prefers-color-scheme`），
检测方法见 [playwright-mock-patterns.md](playwright-mock-patterns.md) 的「主题切换」节。

## 交互录屏

> ⚠️ **禁止直接操作 URL 路由来模拟跳转。** 必须用 Playwright API 触发真实点击/滑动：
>
> ```javascript
> // ❌ 错误 - 直接跳转 URL（无法验证真实交互路径，录屏也看不到点击）
> await page.goto('http://localhost:3000/product/123');
>
> // ✅ 正确 - 触发真实点击
> await page.click('.product-card');
> await page.waitForLoadState('networkidle');
> ```

### 官方方案：video.show.actions（推荐）

Playwright 内置操作可视化，自动在视频中高亮每个操作：

```javascript
// playwright.config.js
module.exports = {
  use: {
    video: {
      mode: 'on',  // 或 'retain-on-failure'
      size: { width: 750, height: 1334 },
      show: {
        actions: {           // 元素轮廓高亮 + 操作标题字幕
          duration: 500,     // 标注显示时长（毫秒）
          position: 'top-right',
          fontSize: 14,
        },
        test: {              // 可选：显示当前测试信息
          level: 'step',     // 'test' | 'step'
          position: 'top-left',
          fontSize: 12,
        },
      },
    },
  },
};
```

效果：🎯 操作元素轮廓高亮；📝 右上角操作字幕（click/fill/navigate）；⏱️ 标注到时自动消失。

### Playwright Test 模式示例

```javascript
test('购物车交互流程', async ({ page }) => {
  await page.goto('http://localhost:3000/product/123');
  await page.waitForTimeout(1500);              // 让用户看清当前页面

  await page.click('.add-to-cart-btn');         // 真实点击（禁止 goto 跳转）
  await page.waitForTimeout(1500);

  await page.fill('.quantity-input', '2');
  await page.waitForTimeout(1000);

  await page.click('.checkout-btn');
  await page.waitForTimeout(1500);

  // 录屏场景下，关键步骤也要截图附加到报告
  await test.info().attach('checkout-result', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
});
```

> 💡 **操作间隔**：每个操作后 `waitForTimeout(1000+)`，让回放视频看得清每一步。

### Playwright Library 模式示例

```javascript
const { chromium } = require('playwright');

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 750, height: 1334 },
  recordVideo: { dir: 'h5-test-output/videos/', size: { width: 750, height: 1334 } },
});

const page = await context.newPage();
await page.goto('http://localhost:3000/product/123');
await page.mouse.move(375, 400);        // 精细控制鼠标
await page.click('.add-to-cart-btn');

await context.close();                  // 关闭时保存视频
```

### 录屏场景下的关键截图（必须）

每个关键步骤都要截图并 `test.info().attach()` 到报告：

```javascript
await test.info().attach('step-1-product-detail', {
  body: await page.screenshot({ fullPage: true }),
  contentType: 'image/png',
});
```

> 💡 **为什么录屏还要截图？** 视频大、打开慢；截图小、报告中可直接预览；
> 关键步骤截图方便快速定位问题位置；截图 + 视频配合，全局流程与细节兼得。

### 补充方案：自定义鼠标指针（可选）

`show.actions` 不满足需求（如需始终显示鼠标指针）时注入自定义脚本：

```javascript
await page.addInitScript(() => {
  const cursor = document.createElement('div');
  cursor.style.cssText = `
    position: fixed; width: 20px; height: 20px; border-radius: 50%;
    background: rgba(255, 0, 0, 0.5); border: 2px solid red;
    pointer-events: none; z-index: 999999;
    transform: translate(-50%, -50%);
  `;
  document.body.appendChild(cursor);
  document.addEventListener('mousemove', (e) => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
  });
});
```

### 视频输出与适用场景

- 格式：WebM（Playwright 默认）；路径：`h5-test-output/videos/`
- 适用：购物车流程、表单提交、弹窗交互、滑动加载、动画效果验证
