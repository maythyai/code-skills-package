# 错误处理策略

## 常见错误类型及解决方案

### 1. 元素定位失败

#### 错误现象
```
Error: Locator.click: Target closed
Error: Locator.fill: Element is not visible
Error: Timeout 30000ms exceeded
```

#### 解决策略

**多层级定位备选方案**：
```typescript
async function clickElementWithFallback(page: Page, primarySelector: string, fallbackSelectors: string[]) {
  const selectors = [primarySelector, ...fallbackSelectors];
  
  for (const selector of selectors) {
    try {
      await page.locator(selector).click({ timeout: 5000 });
      console.log(`✅ 成功使用选择器: ${selector}`);
      return;
    } catch (error) {
      console.log(`❌ 选择器失败: ${selector}, 尝试下一个...`);
    }
  }
  
  throw new Error(`所有选择器都失败了: ${selectors.join(', ')}`);
}

// 使用示例
await clickElementWithFallback(page, 
  'button[data-testid="search-btn"]',
  [
    'button:has-text("搜索")',
    '.search-button',
    '[aria-label="搜索"]'
  ]
);
```

**智能等待策略**：
```typescript
async function waitForElementAndClick(page: Page, selector: string) {
  try {
    // 等待元素出现
    await page.waitForSelector(selector, { 
      state: 'visible', 
      timeout: 10000 
    });
    
    // 等待元素可交互
    await page.waitForSelector(selector, { 
      state: 'attached', 
      timeout: 5000 
    });
    
    // 执行点击
    await page.click(selector);
    
  } catch (error) {
    // 截图保存错误状态
    await page.screenshot({ 
      path: `.csp/artifacts/verify/evidence/error-${Date.now()}.png` 
    });
    
    throw new Error(`元素定位失败: ${selector}, 原因: ${error.message}`);
  }
}
```

### 2. 网络超时错误

#### 错误现象
```
Error: page.goto: Timeout 30000ms exceeded
Error: Navigation timeout of 30000 ms exceeded
```

#### 解决策略

**网络状态检查**：
```typescript
async function navigateWithRetry(page: Page, url: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`尝试导航到: ${url} (第${i + 1}次)`);
      
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      
      // 验证页面加载成功
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      
      console.log('✅ 页面导航成功');
      return;
      
    } catch (error) {
      console.log(`❌ 导航失败: ${error.message}`);
      
      if (i === maxRetries - 1) {
        throw new Error(`页面导航失败，已重试${maxRetries}次: ${url}`);
      }
      
      // 等待后重试
      await page.waitForTimeout(2000);
    }
  }
}
```

**请求拦截和监控**：
```typescript
async function monitorNetworkRequests(page: Page) {
  const failedRequests: string[] = [];
  
  page.on('requestfailed', request => {
    failedRequests.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`);
  });
  
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log(`❌ HTTP错误: ${response.status()} ${response.url()}`);
    }
  });
  
  return {
    getFailedRequests: () => failedRequests,
    clearFailedRequests: () => failedRequests.length = 0
  };
}
```

### 3. 断言失败

#### 错误现象
```
Error: expect(locator).toBeVisible()
Error: expect(locator).toHaveText()
Error: Timed out 5000ms waiting for expect(locator).toContainText()
```

#### 解决策略

**软断言和重试**：
```typescript
async function verifyTextWithRetry(page: Page, selector: string, expectedText: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await expect(page.locator(selector)).toContainText(expectedText, { timeout: 5000 });
      console.log(`✅ 文本验证成功: ${expectedText}`);
      return;
    } catch (error) {
      const actualText = await page.locator(selector).textContent();
      console.log(`❌ 文本验证失败 (第${i + 1}次): 期望"${expectedText}", 实际"${actualText}"`);
      
      if (i === maxRetries - 1) {
        throw error;
      }
      
      await page.waitForTimeout(1000);
    }
  }
}
```

**条件断言**：
```typescript
async function conditionalAssert(page: Page, condition: () => Promise<boolean>, errorMessage: string) {
  const maxAttempts = 5;
  const delay = 1000;
  
  for (let i = 0; i < maxAttempts; i++) {
    if (await condition()) {
      return true;
    }
    
    if (i < maxAttempts - 1) {
      await page.waitForTimeout(delay);
    }
  }
  
  throw new Error(errorMessage);
}

// 使用示例
await conditionalAssert(
  page,
  async () => {
    const text = await page.locator('.status').textContent();
    return text?.includes('成功');
  },
  '操作状态未显示成功'
);
```

### 4. 表单输入错误

#### 错误现象
```
Error: Element is not editable
Error: Element is read-only
Error: Input value not set correctly
```

#### 解决策略

**输入值验证**：
```typescript
async function fillInputWithValidation(page: Page, selector: string, value: string) {
  try {
    // 清空现有内容
    await page.locator(selector).clear();
    
    // 输入新值
    await page.locator(selector).fill(value);
    
    // 验证输入是否成功
    const actualValue = await page.locator(selector).inputValue();
    
    if (actualValue !== value) {
      // 尝试备用输入方法
      await page.locator(selector).click();
      await page.keyboard.press('Control+A');
      await page.keyboard.type(value);
      
      // 再次验证
      const retryValue = await page.locator(selector).inputValue();
      if (retryValue !== value) {
        throw new Error(`输入值验证失败: 期望"${value}", 实际"${retryValue}"`);
      }
    }
    
    console.log(`✅ 输入成功: ${selector} = "${value}"`);
    
  } catch (error) {
    throw new Error(`输入失败: ${selector}, 原因: ${error.message}`);
  }
}
```

**只读元素处理**：
```typescript
async function setReadonlyInput(page: Page, selector: string, value: string) {
  await page.locator(selector).evaluate((el: HTMLInputElement, val) => {
    // 移除只读属性
    el.removeAttribute('readonly');
    el.removeAttribute('disabled');
    
    // 设置值
    el.value = val;
    
    // 触发事件
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  
  console.log(`✅ 只读输入框设置成功: ${value}`);
}
```

### 5. 异步操作处理

#### 错误现象
```
Error: Test timeout of 30000ms exceeded
Error: Page closed
Error: Protocol error
```

#### 解决策略

**Promise 竞速处理**：
```typescript
async function waitForAnyCondition(page: Page, conditions: Array<() => Promise<boolean>>, timeout = 10000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    for (const condition of conditions) {
      try {
        if (await condition()) {
          return true;
        }
      } catch (error) {
        // 忽略单个条件的错误，继续检查其他条件
      }
    }
    
    await page.waitForTimeout(500);
  }
  
  throw new Error(`所有条件在${timeout}ms内都未满足`);
}

// 使用示例
await waitForAnyCondition(page, [
  async () => await page.locator('.success-message').isVisible(),
  async () => await page.locator('.error-message').isVisible(),
  async () => await page.locator('.loading').isHidden()
]);
```

## 全局错误处理

### 测试级别错误处理

```typescript
test('带错误处理的测试用例', async ({ page }) => {
  const errorHandler = new TestErrorHandler(page);
  
  try {
    await errorHandler.setup();
    await performTestSteps(page);
    
  } catch (error) {
    await errorHandler.handleError(error);
    throw error;
  } finally {
    await errorHandler.cleanup();
  }
});

class TestErrorHandler {
  constructor(private page: Page) {}
  
  async setup() {
    // 设置错误监听
    this.page.on('pageerror', error => {
      console.error('页面JavaScript错误:', error.message);
    });
    
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('控制台错误:', msg.text());
      }
    });
  }
  
  async handleError(error: Error) {
    console.error('测试执行错误:', error.message);
    
    // 截图保存错误状态
    await this.page.screenshot({ 
      path: `.csp/artifacts/verify/evidence/error-${Date.now()}.png`,
      fullPage: true 
    });
    
    // 保存页面 HTML
    const html = await this.page.content();
    require('fs').writeFileSync(`.csp/artifacts/verify/evidence/error-${Date.now()}.html`, html);
    
    // 记录网络状态
    const networkLogs = await this.page.evaluate(() => {
      return performance.getEntriesByType('navigation');
    });
    
    console.log('网络状态:', JSON.stringify(networkLogs, null, 2));
  }
  
  async cleanup() {
    this.page.removeAllListeners();
  }
}
```

### 重试机制配置

```typescript
// playwright.config.ts
export default {
  // 全局重试配置
  retries: process.env.CI ? 2 : 1,
  
  // 超时配置
  timeout: 30000,
  expect: {
    timeout: 10000
  },
  
  // 错误时的行为
  use: {
    // 失败时截图
    screenshot: 'only-on-failure',
    
    // 失败时录制视频
    video: 'retain-on-failure',
    
    // 失败时保存 trace
    trace: 'retain-on-failure'
  }
};
```

## 日志记录规范

### 结构化日志

```typescript
class TestLogger {
  private stepCounter = 0;
  
  logStep(description: string) {
    this.stepCounter++;
    console.log(`📋 步骤${this.stepCounter}: ${description}`);
  }
  
  logSuccess(message: string) {
    console.log(`✅ ${message}`);
  }
  
  logError(message: string, error?: Error) {
    console.error(`❌ ${message}`);
    if (error) {
      console.error(`   详细错误: ${error.message}`);
    }
  }
  
  logWarning(message: string) {
    console.warn(`⚠️  ${message}`);
  }
  
  logInfo(message: string) {
    console.log(`ℹ️  ${message}`);
  }
}

// 使用示例
const logger = new TestLogger();

logger.logStep('点击搜索按钮');
try {
  await page.getByRole('button', { name: '搜索' }).click();
  logger.logSuccess('搜索按钮点击成功');
} catch (error) {
  logger.logError('搜索按钮点击失败', error);
  throw error;
}
```

### 性能监控

```typescript
async function measurePerformance<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
  const startTime = Date.now();
  
  try {
    const result = await operation();
    const duration = Date.now() - startTime;
    console.log(`⏱️  ${operationName} 耗时: ${duration}ms`);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`⏱️  ${operationName} 失败，耗时: ${duration}ms`);
    throw error;
  }
}

// 使用示例
await measurePerformance(
  () => page.goto('https://example.com'),
  '页面导航'
);
```
