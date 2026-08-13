# Mock 注入：三种方式与数据要求

> Mock 是必须的，不能放弃。方式 A 失败试 B，B 失败试 C。**不允许直接放弃 mock。**

## 方式 A：使用项目已有的 mock 框架（优先）

检查项目是否有 `mock.json`、`mock/` 目录或 mock 配置：

```bash
find . -name "mock.json" -o -name "mockData.*" -o -path "*/mock/*" | head -20
```

如果有 mock 框架（ice.js mock、umi mock 等），直接在对应文件中补充接口数据：

```javascript
// mock/api.ts 或 mock.json
export default {
  'GET /api/navigation': {
    tabs: [{ id: 1, name: '首页' }, { id: 2, name: '分类' }],
  },
  'GET /api/products': {
    items: [
      { id: 1, title: '测试商品1', price: 99.9, image: '...' },
      { id: 2, title: '测试商品2', price: 199.9, image: '...' },
    ],
  },
};
```

> ⚠️ 修改项目 mock 文件属于改项目文件，必须遵守
> [cleanup-safety.md](cleanup-safety.md) 的备份/标记/复原规则。

## 方式 B：Playwright 脚本内注入（零副作用，推荐）

### B1：page.route 拦截（最佳，不改任何项目文件）

```javascript
await page.route('**/api/products', (route) =>
  route.fulfill({ status: 200, json: { items: [{ id: 1, title: '测试商品1' }] } })
);
```

测试结束后 route 自动失效，零副作用。

### B2：addInitScript 注入全局 mock

```javascript
const MOCK_DATA = {
  '/api/navigation': {
    tabs: [
      { id: 1, name: '首页', path: '/', icon: 'home' },
      { id: 2, name: '分类', path: '/category', icon: 'category' },
    ],
  },
  '/api/products': {
    items: Array(10).fill(null).map((_, i) => ({
      id: i + 1,
      title: `测试商品 ${i + 1}`,
      price: (i + 1) * 99.9,
      image: `https://via.placeholder.com/300x300?text=Product${i + 1}`,
    })),
  },
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript((data) => { window.__MOCK__ = data; }, MOCK_DATA);
});
```

> `addInitScript` 必须在 `page.goto` **之前**调用，否则拦不到首次请求。

MTOP JSONP、fetch/XHR 劫持的具体代码模式见
[playwright-mock-patterns.md](playwright-mock-patterns.md)。

## 方式 C：项目代码硬编码（保底方案）

接口难以拦截时，允许直接改项目代码硬编码 mock，**必须用特殊注释标记**：

```javascript
// src/services/product.ts
export async function getProducts() {
  // [H5-TEST-MOCK-START]
  return [
    { id: 1, title: '测试商品1', price: 99.9 },
    { id: 2, title: '测试商品2', price: 199.9 },
  ];
  // [H5-TEST-MOCK-END]

  // 原有代码
  return await fetch('/api/products').then(r => r.json());
}
```

测试完成后自动清理并确认无残留：

```bash
find src/ -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" \) | \
  xargs sed -i '' '/\[H5-TEST-MOCK-START\]/,/\[H5-TEST-MOCK-END\]/d'
grep -r "H5-TEST-MOCK" src/ || echo "✓ 清理完成"
```

> ⚠️ 方式 C 是保底方案，不是放弃的理由。三条铁律：
> 1. 必须用 `[H5-TEST-MOCK-START]` / `[H5-TEST-MOCK-END]` 标记
> 2. 测试完成后必须立即清理
> 3. 清理后用 `grep -r "H5-TEST-MOCK"` 确认无残留

## Mock 数据要求

| 数据类型 | 要求 |
|----------|------|
| 导航列表 | 如有 Tab，至少覆盖所有需要截图的 Tab |
| 商品/内容列表 | 至少 3-5 条，避免页面空白 |
| 图片 URL | 可访问的占位图或真实图片链接 |
| 用户信息 | 个人中心页需要昵称、头像等 |

## 拦截不生效时的排查顺序

1. 控制台是否有 `[Mock]` 日志（没有 → 拦截规则没匹配上，检查 URL pattern）
2. 页面空白/加载态 → mock 数据字段缺失，补齐
3. 页面报错/结构不匹配 → 对照真实接口返回修正 mock 结构
4. MTOP 接口 → 检查 JSONP callback 包裹（见 playwright-mock-patterns.md）
