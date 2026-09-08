# 元素可见性检查策略

## 核心原则

**每次操作前必须先检查元素是否可见，等待 5 秒，超时则认为失败。**

## 标准等待模式

### 1. 基础可见性检查

```typescript
/**
 * 标准的元素可见性等待函数
 * @param locator - Playwright 定位器
 * @param timeout - 超时时间（默认 5 秒）
 */
async function waitForElementVisible(locator: Locator, timeout = 5000): Promise<void> {
    try {
        console.log('⏳ 等待元素可见...');
        await locator.waitFor({ 
            state: 'visible', 
            timeout 
        });
        console.log('✅ 元素已可见，可以进行操作');
    } catch (error) {
        console.error(`❌ 元素在${timeout}ms内未出现，操作失败`);
        throw new Error(`元素在${timeout}ms内未变为可见状态: ${error.message}`);
    }
}
```

### 2. 安全操作封装

```typescript
/**
 * 安全点击 - 先等待可见再点击
 */
async function safeClick(locator: Locator, elementName?: string): Promise<void> {
    const name = elementName || '元素';
    console.log(`⏳ 等待${name}可见并准备点击`);
    
    await locator.waitFor({ state: 'visible', timeout: 5000 });
    await locator.click();
    
    console.log(`✅ ${name}点击成功`);
}

/**
 * 安全填写 - 先等待可见再填写
 */
async function safeFill(locator: Locator, value: string, fieldName?: string): Promise<void> {
    const name = fieldName || '输入框';
    console.log(`⏳ 等待${name}可见并准备填写: ${value}`);
    
    await locator.waitFor({ state: 'visible', timeout: 5000 });
    await locator.fill(value);
    
    console.log(`✅ ${name}填写成功: ${value}`);
}

/**
 * 安全验证 - 等待文本可见
 */
async function safeExpect(locator: Locator, expectedText?: string): Promise<void> {
    const text = expectedText || '预期内容';
    console.log(`⏳ 等待验证${text}出现`);
    
    await expect(locator).toBeVisible({ timeout: 5000 });
    
    console.log(`✅ 验证成功: ${text}已出现`);
}
```

## 实际应用模式

### 1. 按钮操作

```typescript
// 标准按钮点击流程
async function clickButton(page: Page, buttonText: string) {
    console.log(`开始点击按钮: ${buttonText}`);
    
    // 1. 定位按钮（忽略空格）
    const button = page.getByRole('button', { name: new RegExp(`^\\s*${buttonText}\\s*$`) });
    
    // 2. 等待按钮可见（5 秒超时）
    await button.waitFor({ state: 'visible', timeout: 5000 });
    
    // 3. 执行点击
    await button.click();
    
    console.log(`✅ 按钮点击完成: ${buttonText}`);
}

// 使用示例
await clickButton(page, '搜索');
await clickButton(page, '提交');
await clickButton(page, '保存');
```

### 2. 表单填写

```typescript
// 标准表单填写流程
async function fillForm(page: Page, formData: Record<string, string>) {
    console.log('开始填写表单');
    
    for (const [fieldName, value] of Object.entries(formData)) {
        console.log(`⏳ 处理字段: ${fieldName}`);
        
        // 1. 定位输入框（忽略空格）
        const input = page.getByLabel(new RegExp(`^\\s*${fieldName}\\s*$`));
        
        // 2. 等待输入框可见（5 秒超时）
        await input.waitFor({ state: 'visible', timeout: 5000 });
        
        // 3. 填写内容
        await input.fill(value);
        
        console.log(`✅ 字段填写完成: ${fieldName} = ${value}`);
    }
    
    console.log('✅ 表单填写完成');
}

// 使用示例
await fillForm(page, {
    '用户名': 'admin',
    '密码': 'password123',
    '确认密码': 'password123'
});
```

### 3. 导航操作

```typescript
// 标准导航点击流程
async function navigateToPage(page: Page, linkText: string, expectedTitle?: string) {
    console.log(`开始导航到: ${linkText}`);
    
    // 1. 定位导航链接（忽略空格）
    const link = page.getByRole('link', { name: new RegExp(`^\\s*${linkText}\\s*$`) });
    
    // 2. 等待链接可见（5 秒超时）
    await link.waitFor({ state: 'visible', timeout: 5000 });
    
    // 3. 点击导航
    await link.click();
    
    // 4. 验证页面标题（如果提供）
    if (expectedTitle) {
        console.log(`⏳ 等待页面标题出现: ${expectedTitle}`);
        const heading = page.getByRole('heading', { name: new RegExp(`^\\s*${expectedTitle}\\s*$`) });
        await heading.waitFor({ state: 'visible', timeout: 5000 });
        console.log(`✅ 页面标题验证成功: ${expectedTitle}`);
    }
    
    console.log(`✅ 导航完成: ${linkText}`);
}

// 使用示例
await navigateToPage(page, '用户管理', '用户管理');
await navigateToPage(page, '系统设置');
```

### 4. 结果验证

```typescript
// 标准结果验证流程
async function verifyResult(page: Page, expectedTexts: string[]) {
    console.log('开始验证操作结果');
    
    for (const text of expectedTexts) {
        console.log(`⏳ 等待验证文本: ${text}`);
        
        // 1. 定位文本（忽略空格）
        const textElement = page.getByText(new RegExp(`^\\s*${text}\\s*$`));
        
        // 2. 等待文本可见（5 秒超时）
        await expect(textElement).toBeVisible({ timeout: 5000 });
        
        console.log(`✅ 文本验证成功: ${text}`);
    }
    
    console.log('✅ 所有结果验证完成');
}

// 使用示例
await verifyResult(page, [
    '操作成功',
    '数据保存完成',
    '用户创建成功'
]);
```

## 高级等待策略

### 1. 条件等待

```typescript
/**
 * 等待多个条件中的任意一个满足
 */
async function waitForAnyCondition(page: Page, conditions: Array<() => Locator>, timeout = 5000) {
    console.log('⏳ 等待任意条件满足...');
    
    const promises = conditions.map(async (getLocator, index) => {
        try {
            const locator = getLocator();
            await locator.waitFor({ state: 'visible', timeout });
            return { success: true, index, locator };
        } catch (error) {
            return { success: false, index, error };
        }
    });
    
    const results = await Promise.allSettled(promises);
    const successResult = results.find(result => 
        result.status === 'fulfilled' && result.value.success
    );
    
    if (successResult && successResult.status === 'fulfilled') {
        console.log(`✅ 条件${successResult.value.index + 1}满足`);
        return successResult.value.locator;
    }
    
    throw new Error(`所有条件在${timeout}ms内都未满足`);
}

// 使用示例：等待成功或错误消息
const resultLocator = await waitForAnyCondition(page, [
    () => page.getByText(/^\s*操作成功\s*$/),
    () => page.getByText(/^\s*操作失败\s*$/),
    () => page.getByText(/^\s*网络错误\s*$/)
]);
```

### 2. 重试等待

```typescript
/**
 * 带重试的元素等待
 */
async function waitWithRetry(locator: Locator, maxRetries = 3, retryDelay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            console.log(`⏳ 尝试等待元素 (第${i + 1}次)`);
            await locator.waitFor({ state: 'visible', timeout: 5000 });
            console.log(`✅ 元素等待成功 (第${i + 1}次尝试)`);
            return;
        } catch (error) {
            console.log(`❌ 第${i + 1}次等待失败: ${error.message}`);
            
            if (i === maxRetries - 1) {
                throw new Error(`元素在${maxRetries}次重试后仍未出现`);
            }
            
            console.log(`⏳ ${retryDelay}ms后重试...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
    }
}
```

## 错误处理和日志

### 1. 详细的错误信息

```typescript
async function safeOperation(locator: Locator, operation: () => Promise<void>, operationName: string) {
    try {
        console.log(`🚀 开始执行: ${operationName}`);
        
        // 等待元素可见
        console.log(`⏳ 等待元素可见...`);
        await locator.waitFor({ state: 'visible', timeout: 5000 });
        
        // 执行操作
        console.log(`⚡ 执行操作: ${operationName}`);
        await operation();
        
        console.log(`✅ 操作成功: ${operationName}`);
        
    } catch (error) {
        console.error(`❌ 操作失败: ${operationName}`);
        console.error(`   错误详情: ${error.message}`);
        
        // 截图保存错误状态
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        await locator.page().screenshot({ 
            path: `.csp/artifacts/verify/evidence/error-${operationName}-${timestamp}.png`,
            fullPage: true 
        });
        
        throw new Error(`${operationName}失败: ${error.message}`);
    }
}
```

### 2. 性能监控

```typescript
async function monitoredWait(locator: Locator, operationName: string) {
    const startTime = Date.now();
    
    try {
        await locator.waitFor({ state: 'visible', timeout: 5000 });
        const duration = Date.now() - startTime;
        console.log(`⏱️ ${operationName}等待耗时: ${duration}ms`);
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`⏱️ ${operationName}等待超时: ${duration}ms`);
        throw error;
    }
}
```

## 最佳实践总结

1. **强制等待**: 每个操作前都必须等待元素可见
2. **5 秒超时**: 统一使用 5 秒作为等待超时时间
3. **详细日志**: 记录每个等待和操作的详细过程
4. **错误处理**: 提供清晰的错误信息和截图
5. **性能监控**: 记录等待时间，便于性能分析
6. **空格忽略**: 结合正则表达式忽略文本空格
7. **操作封装**: 将等待逻辑封装到安全操作函数中
