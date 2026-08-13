# Playwright 截图脚本模板

完整的可运行脚本，适用于 React/Vue + Ice.js/Vite 项目。

## 基础模板

```javascript
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// ===== 配置区域 =====
const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = './screenshots';

// 常用设备参数：
// | 设备                | viewport   | DPR | 说明              |
// |---------------------|------------|-----|-------------------|
// | iPhone SE/6/7/8     | 375×667    | 2   | 小屏 iPhone       |
// | iPhone X/12/13/14   | 375×812    | 3   | 主流 iPhone       |
// | iPhone 14 Pro Max   | 430×932    | 3   | 大屏 iPhone       |
// | 设计稿标准（750px） | 750×1334   | 2   | 按设计稿 1:1 截图 |
// | Android 通用        | 360×800    | 3   | 中端 Android      |
// | iPad Mini           | 768×1024   | 2   | 平板              |
//
// 选择指南：
// - 日常截图 / 视觉验证：375×812, DPR=2（最贴近真实用户）
// - 设计稿比对：750×1334, DPR=2（截图像素与设计稿 1:1 对应）← 默认
// - 兼容性测试：分别用小屏（375×667）和大屏（430×932）各截一组
const VIEWPORT = { width: 750, height: 1334 }; // 设计稿标准（默认）
const DPR = 2;

// Tab 列表（根据实际项目修改）
const TABS = [
  { name: 'home', path: '/' },
  { name: 'category', path: '/category' },
  { name: 'cart', path: '/cart' },
  { name: 'profile', path: '/profile' },
];

// Mock 数据（从项目 mock 文件提取）
const MOCK_DATA = {
  'mtop.navigation.get': {
    tabs: [
      { id: 1, name: '首页', path: '/' },
      { id: 2, name: '分类', path: '/category' },
    ],
  },
  'mtop.products.list': {
    items: [
      { id: 1, title: '商品1', price: 99.9 },
      { id: 2, title: '商品2', price: 199.9 },
    ],
  },
};

// ===== 主流程 =====
(async () => {
  // 确保截图目录存在
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ 
    headless: false, // 调试时设为 false，CI 环境设为 true
    slowMo: 100 // 放慢操作便于观察
  });

  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: DPR,
    locale: 'zh-CN',
  });

  const page = await context.newPage();

  // 注入 Mock 数据（在页面加载前）
  await page.addInitScript((mockData) => {
    // 拦截 window.mtopRequest（阿里系 H5 常用）
    const originalMtop = window.mtopRequest;
    window.mtopRequest = async function(api, params) {
      console.log(`[Mock] Intercepted: ${api}`, params);
      if (mockData[api]) {
        return { data: mockData[api], ret: ['SUCCESS::调用成功'] };
      }
      return originalMtop ? originalMtop.call(this, api, params) : {};
    };

    // 拦截 fetch 请求
    const originalFetch = window.fetch;
    window.fetch = async function(url, options) {
      const apiName = typeof url === 'string' ? url : url.toString();
      for (const [key, value] of Object.entries(mockData)) {
        if (apiName.includes(key)) {
          console.log(`[Mock] Fetch intercepted: ${apiName}`);
          return new Response(JSON.stringify({ data: value }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }
      return originalFetch.call(this, url, options);
    };
  }, MOCK_DATA);

  // 遍历每个 Tab
  for (const tab of TABS) {
    console.log(`\n📸 Processing: ${tab.name} (${tab.path})`);

    // 导航到页面
    await page.goto(`${BASE_URL}${tab.path}`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // 等待关键元素渲染（根据实际项目修改选择器）
    try {
      await page.waitForSelector('.main-content, #app, [data-page]', {
        timeout: 5000,
      });
    } catch (e) {
      console.warn(`⚠️  Main content selector not found for ${tab.name}, continuing...`);
    }

    // 额外等待确保动画完成
    await page.waitForTimeout(1000);

    // 浅色模式截图
    const lightPath = path.join(SCREENSHOT_DIR, `${tab.name}-light.png`);
    await page.screenshot({
      path: lightPath,
      fullPage: true,
    });
    console.log(`✅ Light: ${lightPath}`);

    // 切换到深色模式
    await page.evaluate(() => {
      // 方式 A: data-theme 属性
      document.documentElement.setAttribute('data-theme', 'dark');
      
      // 方式 B: CSS 变量（取消注释使用）
      // document.documentElement.style.setProperty('--color-scheme', 'dark');
      
      // 方式 C: class 切换（取消注释使用）
      // document.body.classList.add('dark-mode');
    });

    // 等待主题切换动画完成
    await page.waitForTimeout(500);

    // 深色模式截图
    const darkPath = path.join(SCREENSHOT_DIR, `${tab.name}-dark.png`);
    await page.screenshot({
      path: darkPath,
      fullPage: true,
    });
    console.log(`✅ Dark: ${darkPath}`);

    // 切换回浅色模式（为下一个 Tab 准备）
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
    });
    await page.waitForTimeout(300);
  }

  await browser.close();
  console.log('\n🎉 All screenshots completed!');
})();
```

## 处理懒加载内容

如果页面有懒加载图片或其他内容，需要先滚动到底部：

```javascript
// 在截图前滚动到底部，触发懒加载
await page.evaluate(async () => {
  await new Promise((resolve) => {
    let totalHeight = 0;
    const distance = 100;
    const timer = setInterval(() => {
      const scrollHeight = document.body.scrollHeight;
      window.scrollBy(0, distance);
      totalHeight += distance;
      if (totalHeight >= scrollHeight) {
        clearInterval(timer);
        resolve();
      }
    }, 100);
  });
  // 滚动回顶部
  window.scrollTo(0, 0);
});
```

## 冻结动态内容

对于轮播图、倒计时等动态元素，可以在截图前冻结：

```javascript
await page.evaluate(() => {
  // 暂停所有 CSS 动画
  const style = document.createElement('style');
  style.textContent = `
    *, *::before, *::after {
      animation-duration: 0s !important;
      transition-duration: 0s !important;
    }
  `;
  document.head.appendChild(style);

  // 冻结 Date 对象（可选，影响较大）
  // const fixedDate = new Date('2026-01-01T00:00:00Z');
  // window.Date = class extends Date { constructor(...args) { return args.length ? super(...args) : fixedDate; } };
});
```

## 处理登录态

如果页面需要登录态，可以在启动时注入 Cookie：

```javascript
const context = await browser.newContext({
  viewport: VIEWPORT,
  storageState: {
    cookies: [
      {
        name: 'session_id',
        value: 'mock_session_123',
        domain: 'localhost',
        path: '/',
      },
    ],
  },
});
```

## 常见问题排查

### 截图白屏

- 检查开发服务器是否启动成功
- 检查 `BASE_URL` 是否正确
- 增加 `waitForTimeout` 时间

### Mock 数据未生效

- 确认 `addInitScript` 在 `page.goto` 之前调用
- 检查 mock 拦截的 API 名称是否与项目实际使用的一致
- 在浏览器控制台查看 `[Mock]` 日志

### 主题切换无效

- 检查项目的主题实现方式（data-theme / CSS 变量 / class）
- 确认 CSS 中是否有 `[data-theme="dark"]` 等选择器
- 检查是否有 CSS 优先级问题

### 截图不完整

- 确认使用了 `fullPage: true`
- 检查页面是否有 `overflow: hidden` 样式
- 对于 iframe 内容，需要切换到 iframe 后截图
