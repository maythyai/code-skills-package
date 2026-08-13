# 报告生成、附件与截图复验

## 生成 HTML 报告（必须执行）

```bash
npx playwright test --reporter=html
npx playwright show-report      # 自动打开浏览器查看
```

> 报告生成是流程最后一步，不可跳过。未生成时检查：
> ① `npm list @playwright/test` ② `ls tests/*.spec.js` ③ `ls h5-test-output/playwright-report/`

官方 HTML reporter 自动包含：用例状态、失败堆栈与代码片段、耗时/Worker/重试、
`test.info().attach()` 附加的截图与视频、每个 step 的耗时明细。

## 截图与视频必须始终附加（无论通过与否）

```javascript
// playwright.config.js
module.exports = {
  use: {
    screenshot: 'on',   // ✅ 每个测试结束都截图
    video: 'on',        // ✅ 每个测试都录视频
  },
};
```

| 配置项 | 值 | 说明 |
|--------|-----|------|
| `screenshot` | `'on'` | ✅ 通过/失败都有截图，可做视觉验证 |
| `screenshot` | `'only-on-failure'` | ❌ 通过的测试没截图，无法验证渲染效果 |
| `video` | `'on'` | ✅ 全量录视频 |
| `video` | `'retain-on-failure'` | ❌ 无法回溯通过用例的交互过程 |

> ⚠️ H5 自动化截图的核心目的是视觉验证，通过的测试同样需要截图/视频作为渲染正确的证据。

## 完整 playwright.config.js

```javascript
module.exports = {
  // 统一输出目录（固定位置，不要频繁变更）
  outputDir: 'src/__tests__/h5-test-output/test-results',
  reporter: [['html', { open: 'never', outputFolder: 'src/__tests__/h5-test-output/playwright-report' }]],
  use: {
    viewport: { width: 750, height: 1334 },
    deviceScaleFactor: 2,
    screenshot: 'on',
    video: 'on',
    trace: 'retain-on-failure',   // 失败时记录 trace，可在 Trace Viewer 回放
  },
};
```

## 附加自定义内容：截图、错误日志

```javascript
test('页面截图 + 错误收集', async ({ page }) => {
  const errors = [];
  const failedRequests = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push({ text: msg.text(), location: msg.location() });
  });
  page.on('requestfailed', (request) => {
    failedRequests.push({
      url: request.url(),
      failure: request.failure()?.errorText,
      resourceType: request.resourceType(),
    });
  });
  page.on('pageerror', (error) => {
    errors.push({ text: error.message, type: 'pageerror' });
  });

  await page.goto(`${BASE_URL}/`);
  await page.waitForLoadState('networkidle');

  await test.info().attach('screenshot', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });

  const errorReport = analyzeErrors(errors, failedRequests);
  if (errorReport.content) {
    await test.info().attach('error-analysis', {
      body: Buffer.from(errorReport.content),
      contentType: 'text/plain',
    });
  }
});
```

## 错误分析函数

```javascript
function analyzeErrors(errors, failedRequests) {
  const critical = [];
  const warnings = [];

  for (const err of errors) {
    if (err.text.includes('Uncaught') || err.text.includes('TypeError') ||
        err.text.includes('ReferenceError')) {
      critical.push(err);
    } else {
      warnings.push(err);
    }
  }
  for (const req of failedRequests) {
    if (['script', 'stylesheet', 'font'].includes(req.resourceType)) {
      critical.push(req);
    } else {
      warnings.push(req);
    }
  }

  if (critical.length === 0 && warnings.length === 0) return { content: null };

  const content = [
    `=== 错误日志分析 ===`, ``,
    `🔴 严重 (${critical.length}):`,
    ...critical.map(e => `  - ${e.text || e.url}`), ``,
    `🟡 警告 (${warnings.length}):`,
    ...warnings.map(e => `  - ${e.text || e.url}`), ``,
    `📊 影响评估:`,
    critical.length > 0
      ? `  ⚠️ 存在严重错误，可能影响页面功能或渲染，建议修复后再验收`
      : `  ✅ 无严重错误，页面功能正常`,
  ].join('\n');
  return { content };
}
```

### 错误影响分类

| 类型 | 判定标准 | 影响 |
|------|---------|------|
| 🔴 严重 | JS 运行时错误、关键资源加载失败 | 页面功能异常，必须修复 |
| 🟡 警告 | 非关键资源 404、埋点请求失败 | 不影响核心功能，可后续处理 |
| ⚪ 忽略 | CORS 预检失败、第三方脚本错误 | 通常不影响业务 |

## 截图完整性检查

1. **文件数量**：`ls h5-test-output/screenshots/*.png | wc -l` = 页面数（深浅色 ×2）
2. **文件大小**：`find h5-test-output/screenshots/ -size 0` 应返回空
3. **命名规范**：`{page-name}.png` 或 `{page-name}-{light|dark}.png`

## 内容复验（必须逐张执行）

检查项：

- ❌ **错误页**：显示 "404"、"网络错误"、"加载失败"
- ❌ **空白页**：白色/黑色区域超过 50%
- ❌ **未渲染**：骨架屏、loading、占位符未替换
- ❌ **数据缺失**：列表为空、裂图
- ✅ **正常渲染**：导航、列表、图片正确显示

```bash
ls -lh h5-test-output/screenshots/*.png
find h5-test-output/screenshots/ -name "*.png" -size -50k     # 可疑小文件
open h5-test-output/screenshots/*.png                          # macOS 逐张查看
```

发现问题按类型处理：

| 问题类型 | 处理方式 | 可以直接修改？ |
|----------|----------|----------------|
| Mock 数据缺失 | 补充 mock，重新截图 | ✅（测试配置） |
| 接口未拦截到 | 调整拦截规则 | ✅（测试配置） |
| 等待时间不足 | 调整 waitForTimeout / waitForSelector | ✅（测试脚本） |
| **业务代码逻辑/样式/功能问题** | **生成 FIX_SUGGESTION.md 等用户确认** | ❌ **禁止直接改** |

> ⚠️ 关键区分：测试脚本（`*.spec.js`）与 mock 数据是测试配置，可改；
> `src/` 下的业务代码禁止直接修改。流程见
> [failure-suggestion-flow.md](failure-suggestion-flow.md)。
