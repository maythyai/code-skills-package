# 元素定位策略指南

## 定位方法优先级

### 1. ID 定位（最高优先级）
```typescript
// ID 定位（最稳定、最快速）
await page.locator('#user-search-input').fill('admin');
await page.locator('#submit-button').click();
```

### 2. 语义化定位（次优先）

#### getByRole()
```typescript
// 按钮定位（忽略字间空格）
await page.getByRole('button', { name: /^\s*搜\s*索\s*$/ }).click();

// 通用可点击元素定位（支持多种元素类型）
await page.locator('button, a, [onclick], [role="button"], span, div').filter({ hasText: /^\s*搜\s*索\s*$/ }).first().click();

// 输入框定位
await page.getByRole('textbox', { name: /^\s*用\s*户\s*名\s*$/ }).fill('admin');

// 下拉框定位
await page.getByRole('combobox', { name: /^\s*用户类型\s*$/ }).selectOption('管理员');
```

#### getByText()
```typescript
// 精确匹配（忽略空格）
await page.getByText(/^\s*用户管理\s*$/).click();

// 部分匹配
await page.getByText(/管理/).first().click();
```

#### getByLabel()
```typescript
// 通过 label 文本定位输入框
await page.getByLabel('用户名').fill('testuser');
await page.getByLabel(/邮箱|Email/).fill('test@example.com');
```

### 3. 邻近元素定位（推荐）

**核心策略**：先定位标签文本，再定位其邻近的目标元素。

**优先级顺序**：
1. **父容器定位**（最优）- 适用于复杂组件结构
2. **Ant Design 表单行定位**（次优）- 专门针对 Ant Design
3. **getByLabel 标准定位**（标准）- 适用于正确关联的 label
4. **直接相邻定位**（备选）- 传统的相邻元素定位

```typescript
// 输入框邻近定位
async function fillByLabel(page: Page, labelText: string, value: string) {
  const strategies = [
    // 1. 父容器定位（最优）
    () => page.locator(`:has-text("${labelText}") input, :has-text("${labelText}") textarea`).first(),
    
    // 2. Ant Design 表单行级定位（次优）
    () => {
      const formRow = page.locator('.ant-form-item, .ant4-form-item')
        .filter({ hasText: createSpaceIgnorePattern(labelText) });
      return formRow.locator('input, textarea').first();
    },
    
    // 3. getByLabel（标准）
    () => page.getByLabel(createSpaceIgnorePattern(labelText)),
    
    // 4. 直接相邻定位
    () => page.getByText(createSpaceIgnorePattern(labelText)).locator('+ input, + textarea')
  ];

  for (const [index, getLocator] of strategies.entries()) {
    try {
      const locator = await getLocator();
      if (!locator) continue;
      
      await locator.waitFor({ state: 'visible', timeout: 5000 });
      await locator.fill(value);
      console.log(`✅ 邻近定位成功 - 策略${index + 1}: ${labelText}`);
      return;
    } catch (error) {
      console.log(`❌ 策略${index + 1}失败: ${error.message}`);
    }
  }
  throw new Error(`无法通过标签"${labelText}"定位到输入框`);
}

// 下拉框邻近定位
async function selectByLabel(page: Page, labelText: string, optionValue: string) {
  const strategies = [
    // 1. 父容器定位（最优）
    () => page.locator(`:has-text("${labelText}") select, :has-text("${labelText}") .ant-select`).first(),
    
    // 2. Ant Design 表单行级定位
    () => {
      const formRow = page.locator('.ant-form-item, .ant4-form-item')
        .filter({ hasText: createSpaceIgnorePattern(labelText) });
      return formRow.locator('select, .ant-select, [role="combobox"]').first();
    },
    
    // 3. 角色定位
    () => page.getByRole('combobox', { name: new RegExp(createSpaceIgnorePattern(labelText)) })
  ];

  for (const [index, getLocator] of strategies.entries()) {
    try {
      const locator = await getLocator();
      if (!locator) continue;
      
      await locator.waitFor({ state: 'visible', timeout: 5000 });
      
      try {
        await locator.selectOption(optionValue);
        console.log(`✅ 下拉框选择成功 - 策略${index + 1}: ${labelText} = ${optionValue}`);
        return;
      } catch (error) {
        // 自定义下拉框处理
        await locator.click();
        await page.getByText(optionValue).click();
        console.log(`✅ 自定义下拉框选择成功 - 策略${index + 1}: ${labelText} = ${optionValue}`);
        return;
      }
    } catch (error) {
      console.log(`❌ 策略${index + 1}失败: ${error.message}`);
    }
  }
  throw new Error(`无法通过标签"${labelText}"定位到下拉框`);
}
```

> 邻近定位的完整变体（相邻/兄弟/父容器/表格/多步骤）见
> [adjacent-locator-strategies.md](adjacent-locator-strategies.md)；Ant Design 表单细节见
> [antd-form-locator-strategies.md](antd-form-locator-strategies.md)。

### 4. 特殊场景处理

#### 多元素处理
```typescript
// 默认取第一个元素
await page.getByRole('button', { name: /^\s*删\s*除\s*$/ }).first().click();

// 表格中多行相同操作
await page.getByRole('row').filter({ hasText: '待审核' }).first()
  .getByRole('button', { name: '审核' }).click();
```

#### 时间选择器
```typescript
// 移除 readonly 属性并直接设置值
await page.getByPlaceholder('选择开始时间').evaluate((el: HTMLInputElement) => {
    el.removeAttribute('readonly');
    el.value = '2026-02-24 00:00';
});
await page.getByPlaceholder('选择开始时间').dispatchEvent('change');
```

#### 表格操作
```typescript
// 基于内容定位表格行
const row = page.getByRole('row').filter({ hasText: 'testuser' });
await row.getByRole('button', { name: '编辑' }).click();
```

#### 弹窗和对话框
```typescript
// 模态对话框
await page.getByRole('dialog').getByRole('button', { name: /^\s*确认\s*$/ }).click();

// 确认弹窗
page.on('dialog', dialog => dialog.accept());
await page.getByRole('button', { name: /^\s*删除\s*$/ }).click();
```

## 等待策略

### 强制元素可见性检查
```typescript
// 标准等待模式（5 秒超时）
async function waitForElementVisible(page: Page, locator: Locator): Promise<void> {
    await locator.waitFor({
        state: 'visible',
        timeout: 5000
    });
}

// 安全操作封装
async function safeClick(page: Page, locator: Locator): Promise<void> {
    await waitForElementVisible(page, locator);
    await locator.click();
}
```

> 可见性检查的完整封装（safeClick/safeFill/safeExpect、条件等待、重试等待）见
> [visibility-check-strategies.md](visibility-check-strategies.md)。

### 智能等待
```typescript
// 等待元素可交互
await page.getByRole('button', { name: /^\s*提交\s*$/ }).waitFor({
    state: 'visible',
    timeout: 5000
});

// 等待文本内容更新
await expect(page.getByText(/^\s*加载完成\s*$/)).toBeVisible({ timeout: 5000 });
```

## 容错处理

### 多策略定位
```typescript
async function clickSearchButton(page: Page) {
    const strategies = [
        // 1. ID 定位
        () => page.locator('#search-button, #search-btn'),
        
        // 2. 语义化定位
        () => page.getByRole('button', { name: /^\s*搜\s*索\s*$/ }),
        
        // 3. 通用可点击元素定位
        () => page.locator('button, a, [onclick], span, div').filter({ hasText: /^\s*搜\s*索\s*$/ }).first(),
        
        // 4. 文本定位
        () => page.getByText(/^\s*搜\s*索\s*$/)
    ];

    for (const [index, getLocator] of strategies.entries()) {
        try {
            const locator = getLocator();
            await locator.waitFor({ state: 'visible', timeout: 5000 });
            await locator.click();
            console.log(`✅ 策略${index + 1}成功`);
            return;
        } catch (error) {
            console.log(`❌ 策略${index + 1}失败: ${error.message}`);
        }
    }
    throw new Error('所有定位策略都失败了');
}
```

## 工具函数

```typescript
// 创建忽略空格的正则模式
function createSpaceIgnorePattern(text: string): string {
  return text.split('').join('\\s*').replace(/^\s*/, '^\\s*').replace(/\s*$/, '\\s*$');
}

// 多元素处理
async function clickFirstMatch(page: Page, selector: string | Locator) {
  const locator = typeof selector === 'string' ? page.locator(selector) : selector;
  await locator.first().waitFor({ state: 'visible', timeout: 5000 });
  const count = await locator.count();
  console.log(`找到 ${count} 个匹配元素，点击第一个`);
  await locator.first().click();
}
```

> 文本匹配的完整策略（忽略字间空格、多层级容错、常用模式封装）见
> [text-matching-strategies.md](text-matching-strategies.md)。

## 最佳实践

1. **定位器组合使用**：组合多个条件提高精确性
2. **避免硬编码等待**：等待特定条件而非固定延时
3. **使用精确匹配**：避免模糊匹配导致误操作
4. **合理使用过滤器**：在多个相似元素中精确定位
