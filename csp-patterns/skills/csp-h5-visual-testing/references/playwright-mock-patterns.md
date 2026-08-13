# Playwright Mock 注入模式

H5 自动化截图的核心代码模式参考。按需加载。

## 目录

1. [基础框架](#基础框架)
2. [MTOP 接口 Mock](#mtop-接口-mock)
3. [RESTful API Mock](#restful-api-mock)
4. [外部脚本拦截](#外部脚本拦截)
5. [主题切换](#主题切换)
6. [截图与等待策略](#截图与等待策略)

---

## 基础框架

```javascript
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  // 注入 mock（必须在 goto 之前）
  await page.addInitScript(() => {
    // mock 逻辑写在这里
  });

  await page.goto('http://localhost:3000');
  // ... 截图逻辑
  await browser.close();
})();
```

## MTOP 接口 Mock

MTOP 是阿里系移动端 RPC 框架，H5 页面通过 `lib.mtop` 或 `@ali/mtop` 调用。

### ⚠️ 核心要点：JSONP 格式

**MTOP SDK 默认使用 JSONP 而非普通 JSON**，必须构造回调函数包裹的响应：

```javascript
// ❌ 错误 - 普通 JSON 响应（页面会空白/报错）
{
  api: 'mtop.xxx',
  data: {...},
  ret: ['SUCCESS']
}

// ✅ 正确 - JSONP 格式
mtopjsonp1({
  api: 'mtop.xxx',
  data: {...},
  ret: ['SUCCESS::调用成功'],
  v: '1.0'
})
```

### 通用 Mock 函数

```javascript
// 构造 MTOP JSONP 响应
function mtopJsonpResponse(callback, api, data) {
  const body = `${callback}(${JSON.stringify({
    api,
    data,
    ret: ['SUCCESS::调用成功'],
    v: '1.0',
  })})`;
  return {
    status: 200,
    contentType: 'application/javascript',
    body,
  };
}
```

### 拦截规则（推荐方式）

```javascript
// 在 Playwright 中拦截 MTOP 请求
await page.route('**/h5api**', async (route) => {
  const url = route.request().url();

  // ⚠️ 排除 JS 静态资源（重要！否则会拦截 MTOP SDK 本身）
  if (url.includes('.js') && !url.includes('callback=')) {
    return route.continue();
  }

  // 从 URL 提取回调函数名
  const callbackMatch = url.match(/callback=(\w+)/);
  const callback = callbackMatch ? callbackMatch[1] : 'mtopjsonp1';

  // 提取 api 参数进行路由
  const apiMatch = url.match(/api=([^&]+)/);
  const apiName = apiMatch ? decodeURIComponent(apiMatch[1]).toLowerCase() : '';

  // 根据 apiName 返回对应 mock 数据
  const mockDataMap = {
    'mtop.taobao.detail.getdetail': {
      item: { title: '测试商品', price: '99.00' },
    },
    'mtop.taobao.social.feed.aggregate': {
      feeds: [{ id: 1, content: '测试内容' }],
    },
  };

  // 查找匹配的 mock 数据
  let data = {};
  for (const [key, value] of Object.entries(mockDataMap)) {
    if (apiName.includes(key.toLowerCase())) {
      data = value;
      break;
    }
  }

  // 返回 JSONP 格式响应
  return route.fulfill(mtopJsonpResponse(callback, apiName, data));
});
```

### 响应结构字段说明

```javascript
{
  api: '接口名',              // 必须与请求的 api 参数一致
  data: {...},                // 业务数据
  ret: ['SUCCESS::调用成功'],  // 状态码数组
  v: '1.0'                    // 版本号
}
```

### 常见问题排查

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 页面空白/报错 | Mock 返回普通 JSON，SDK 解析失败 | 使用 JSONP 格式（见上方） |
| MTOP SDK 未加载 | 拦截了 .js 文件 | 排除 JS 静态资源：`if (url.includes('.js') && !url.includes('callback=')) return route.continue()` |
| 数据不渲染 | data 字段结构不对 | 对照真实接口返回结构，确保字段名一致 |
| 回调函数未定义 | 回调名提取错误 | 从 URL 的 `callback=` 参数提取，默认 `mtopjsonp1` |

### 方式 A：拦截 window.lib.mtop（备用）

如果 `page.route` 方式不生效，可以在页面加载前劫持 `window.lib.mtop`：

```javascript
await page.addInitScript(() => {
  // 存储 mock 数据
  window.__MOCK_DATA__ = {
    'mtop.taobao.detail.getdetail': {
      item: { title: '测试商品', price: '99.00' },
    },
  };

  // 劫持 mtop 请求
  const originalMtop = window.lib?.mtop;
  if (window.lib && window.lib.mtop) {
    window.lib.mtop = {
      request: async (params) => {
        const api = params?.api?.toLowerCase();
        for (const [key, data] of Object.entries(window.__MOCK_DATA__)) {
          if (api.includes(key.toLowerCase())) {
            return { data, ret: ['SUCCESS::调用成功'] };
          }
        }
        return { data: {}, ret: ['SUCCESS::mock fallback'] };
      },
    };
  }
});
```

### 方式 B：拦截 fetch/XHR（通用方案）

```javascript
await page.addInitScript(() => {
  const MOCK_MAP = {
    '/h5/mtop.taobao.detail.getdetail': { item: { title: '测试商品' } },
    '/api/navigation': { tabs: [{ name: '首页' }, { name: '分类' }] },
  };

  // 拦截 fetch
  const originalFetch = window.fetch;
  window.fetch = async (url, opts) => {
    const urlStr = typeof url === 'string' ? url : url.url;
    for (const [pattern, data] of Object.entries(MOCK_MAP)) {
      if (urlStr.includes(pattern)) {
        return new Response(JSON.stringify({ data }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
    return originalFetch(url, opts);
  };

  // 拦截 XMLHttpRequest
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url) {
    this.__url = url;
    return originalOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function () {
    for (const [pattern, data] of Object.entries(MOCK_MAP)) {
      if (this.__url?.includes(pattern)) {
        setTimeout(() => {
          Object.defineProperty(this, 'responseText', { value: JSON.stringify({ data }) });
          Object.defineProperty(this, 'status', { value: 200 });
          this.dispatchEvent(new Event('load'));
          this.dispatchEvent(new Event('readystatechange'));
        }, 0);
        return;
      }
    }
    return originalSend.apply(this, arguments);
  };
});
```

## RESTful API Mock

对于标准 REST API 项目，使用 route interception：

```javascript
// Playwright 原生 route 拦截（在 addInitScript 之外）
await page.route('**/api/**', (route) => {
  const url = route.request().url();
  const mocks = {
    '/api/navigation': { tabs: [{ name: '首页', path: '/' }] },
    '/api/products': { items: [{ id: 1, name: '商品1', price: 99 }] },
    '/api/user': { nickname: '测试用户', avatar: '' },
  };
  for (const [pattern, data] of Object.entries(mocks)) {
    if (url.includes(pattern)) {
      return route.fulfill({ status: 200, json: data });
    }
  }
  return route.fulfill({ status: 200, json: {} });
});
```

## 外部脚本拦截

阻止埋点、监控、广告 SDK 的网络请求：

```javascript
await page.addInitScript(() => {
  // 拦截 goldlog（阿里埋点）
  window.goldlog = { record: () => {}, spm_ab: [] };

  // 拦截 JSTracker / ARMS 监控
  window.JSTracker2 = { log: () => {}, error: () => {} };
  window.__bl = { error: () => {}, api: () => {} };

  // 拦截 WindVane（客户端桥接）
  window.WindVane = { call: () => {}, call2: () => {} };

  // 阻止特定 script 标签加载
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.tagName === 'SCRIPT') {
          const src = node.src || '';
          if (src.includes('tracker') || src.includes('beacon') ||
              src.includes('goldlog') || src.includes('arms')) {
            node.remove();
          }
        }
      }
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
});
```

## 主题切换

### 检测项目主题实现方式

```javascript
// 在页面加载后检测
const themeMode = await page.evaluate(() => {
  // 检查 data-theme 属性
  if (document.documentElement.hasAttribute('data-theme')) return 'data-theme';
  // 检查 CSS 变量
  const styles = getComputedStyle(document.documentElement);
  if (styles.getPropertyValue('--color-scheme')) return 'css-var';
  // 检查 prefers-color-scheme 媒体查询
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'media-query';
  return 'unknown';
});
```

### 切换实现

```javascript
// data-theme 属性方式
async function setTheme(page, theme) {
  await page.evaluate((t) => {
    document.documentElement.setAttribute('data-theme', t);
  }, theme);
  await page.waitForTimeout(300); // 等待 CSS 过渡
}

// prefers-color-scheme 方式
async function setTheme(page, theme) {
  await page.emulateMedia({ colorScheme: theme === 'dark' ? 'dark' : 'light' });
  await page.reload(); // 媒体查询通常需要刷新
  await page.waitForLoadState('networkidle');
}
```

## 截图与等待策略

### 等待页面就绪

```javascript
// 策略 1：网络空闲（推荐）
await page.waitForLoadState('networkidle');

// 策略 2：关键元素出现
await page.waitForSelector('[data-testid="page-content"]', { timeout: 10000 });

// 策略 3：自定义渲染完成标记
await page.waitForFunction(() => window.__PAGE_READY__ === true, { timeout: 10000 });
```

### 处理懒加载图片

```javascript
// 滚动到底部触发懒加载
await page.evaluate(async () => {
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));
  const height = document.body.scrollHeight;
  for (let y = 0; y < height; y += 300) {
    window.scrollTo(0, y);
    await delay(100);
  }
  window.scrollTo(0, 0);
});
// 等待所有图片加载完成
await page.waitForFunction(() => {
  const imgs = document.querySelectorAll('img');
  return Array.from(imgs).every((img) => img.complete && img.naturalHeight > 0);
});
```

### 截图

```javascript
await page.screenshot({
  path: `h5-test-output/screenshots/${tabName}-${theme}.png`,
  fullPage: false, // false = 仅视口；true = 整页长截图
  type: 'png',
});
```
