# Ant Design 表单定位策略

## 问题分析

在 Ant Design 表单中，label 和 input 元素的关系比较复杂，不是简单的相邻关系。典型结构如下：

```html
<div class="ant4-row ant4-form-item-row">
  <div class="ant4-col ant4-form-item-label">
    <label for="advanced_search_product_name" title="商品名称：">商品名称：</label>
  </div>
  <div class="ant4-col ant4-form-item-control">
    <div class="ant4-form-item-control-input">
      <div class="ant4-form-item-control-input-content">
        <input id="product_name" placeholder="请输入" class="ant4-input" type="text" value="">
      </div>
    </div>
  </div>
</div>
```

## 核心定位策略

### 1. getByLabel 优先策略

```typescript
/**
 * 优先使用 getByLabel 方法
 * 适用于有正确 for 属性关联的 label
 */
async function fillByLabel(page: Page, labelText: string, value: string) {
  try {
    // 方法1：直接使用 getByLabel（最优）
    const input = page.getByLabel(createSpaceIgnorePattern(labelText));
    await input.waitFor({ state: 'visible', timeout: 5000 });
    await input.fill(value);
    console.log(`✅ getByLabel 定位成功: ${labelText}`);
    return;
  } catch (error) {
    console.log(`❌ getByLabel 定位失败: ${error.message}`);
    // 继续尝试其他策略
  }
  
  // 备选策略...
}
```

### 2. 表单行级定位策略

```typescript
/**
 * 通过表单行定位 - 适用于 Ant Design 表单结构
 * 先找到包含 label 的行，再在该行内找 input
 */
async function fillAntdFormField(page: Page, labelText: string, value: string) {
  const strategies = [
    // 策略1：getByLabel（最优）
    () => page.getByLabel(createSpaceIgnorePattern(labelText)),
    
    // 策略2：通过表单行定位
    () => {
      const formRow = page.locator('.ant4-form-item-row, .ant-form-item-row')
        .filter({ hasText: createSpaceIgnorePattern(labelText) });
      return formRow.locator('input, textarea, .ant4-select, .ant-select').first();
    },
    
    // 策略3：通过 label 的 for 属性
    () => {
      const label = page.locator('label').filter({ hasText: createSpaceIgnorePattern(labelText) });
      return label.evaluate(el => el.getAttribute('for'))
        .then(forId => forId ? page.locator(`#${forId}`) : null);
    },
    
    // 策略4：通过父容器定位
    () => {
      const container = page.locator('.ant4-form-item, .ant-form-item')
        .filter({ hasText: createSpaceIgnorePattern(labelText) });
      return container.locator('input, textarea, .ant4-select, .ant-select').first();
    },
    
    // 策略5：通过 label 的最近共同祖先
    () => {
      const label = page.locator('label').filter({ hasText: createSpaceIgnorePattern(labelText) });
      return label.locator('xpath=ancestor::*[contains(@class, "form-item")]//input | ancestor::*[contains(@class, "form-item")]//textarea').first();
    }
  ];

  for (const [index, getLocator] of strategies.entries()) {
    try {
      const locator = await getLocator();
      if (!locator) continue;
      
      await locator.waitFor({ state: 'visible', timeout: 5000 });
      await locator.fill(value);
      console.log(`✅ Ant Design 表单定位成功 - 策略${index + 1}: ${labelText}`);
      return;
    } catch (error) {
      console.log(`❌ 策略${index + 1}失败: ${error.message}`);
    }
  }
  
  throw new Error(`无法在 Ant Design 表单中定位字段: ${labelText}`);
}
```

### 3. 智能表单字段定位器

```typescript
/**
 * 智能 Ant Design 表单字段定位器
 * 自动识别表单类型和结构
 */
class AntdFormLocator {
  constructor(private page: Page) {}

  /**
   * 填写表单字段
   */
  async fillField(labelText: string, value: string): Promise<void> {
    // 先尝试标准方法
    if (await this.tryStandardMethods(labelText, value)) {
      return;
    }
    
    // 再尝试 Ant Design 特定方法
    if (await this.tryAntdMethods(labelText, value)) {
      return;
    }
    
    throw new Error(`无法定位表单字段: ${labelText}`);
  }

  /**
   * 尝试标准定位方法
   */
  private async tryStandardMethods(labelText: string, value: string): Promise<boolean> {
    const methods = [
      // 1. getByLabel（最优）
      async () => {
        const input = this.page.getByLabel(createSpaceIgnorePattern(labelText));
        await input.fill(value);
        return true;
      },
      
      // 2. 通过 label 的 for 属性
      async () => {
        const label = this.page.locator('label').filter({ hasText: createSpaceIgnorePattern(labelText) });
        const forId = await label.getAttribute('for');
        if (forId) {
          await this.page.locator(`#${forId}`).fill(value);
          return true;
        }
        return false;
      }
    ];

    for (const method of methods) {
      try {
        if (await method()) {
          console.log(`✅ 标准方法定位成功: ${labelText}`);
          return true;
        }
      } catch (error) {
        continue;
      }
    }
    
    return false;
  }

  /**
   * 尝试 Ant Design 特定方法
   */
  private async tryAntdMethods(labelText: string, value: string): Promise<boolean> {
    const methods = [
      // 1. 表单行级定位
      async () => {
        const formRow = this.page.locator('.ant4-form-item-row, .ant-form-item-row')
          .filter({ hasText: createSpaceIgnorePattern(labelText) });
        const input = formRow.locator('input, textarea').first();
        await input.fill(value);
        return true;
      },
      
      // 2. 表单项级定位
      async () => {
        const formItem = this.page.locator('.ant4-form-item, .ant-form-item')
          .filter({ hasText: createSpaceIgnorePattern(labelText) });
        const input = formItem.locator('input, textarea').first();
        await input.fill(value);
        return true;
      },
      
      // 3. 通过 label 的祖先元素定位
      async () => {
        const label = this.page.locator('label').filter({ hasText: createSpaceIgnorePattern(labelText) });
        const input = label.locator('xpath=ancestor::*[contains(@class, "form-item")]//input').first();
        await input.fill(value);
        return true;
      }
    ];

    for (const [index, method] of methods.entries()) {
      try {
        if (await method()) {
          console.log(`✅ Ant Design 方法定位成功 - 策略${index + 1}: ${labelText}`);
          return true;
        }
      } catch (error) {
        console.log(`❌ Ant Design 策略${index + 1}失败: ${error.message}`);
        continue;
      }
    }
    
    return false;
  }

  /**
   * 选择下拉框选项
   */
  async selectOption(labelText: string, optionValue: string): Promise<void> {
    const strategies = [
      // 1. getByLabel + selectOption
      async () => {
        const select = this.page.getByLabel(createSpaceIgnorePattern(labelText));
        await select.selectOption(optionValue);
      },
      
      // 2. Ant Design Select 组件
      async () => {
        const formRow = this.page.locator('.ant4-form-item-row, .ant-form-item-row')
          .filter({ hasText: createSpaceIgnorePattern(labelText) });
        const select = formRow.locator('.ant4-select, .ant-select').first();
        await select.click();
        await this.page.getByText(createSpaceIgnorePattern(optionValue)).click();
      },
      
      // 3. 原生 select 元素
      async () => {
        const formRow = this.page.locator('.ant4-form-item-row, .ant-form-item-row')
          .filter({ hasText: createSpaceIgnorePattern(labelText) });
        const select = formRow.locator('select').first();
        await select.selectOption(optionValue);
      }
    ];

    for (const [index, strategy] of strategies.entries()) {
      try {
        await strategy();
        console.log(`✅ 下拉框选择成功 - 策略${index + 1}: ${labelText} = ${optionValue}`);
        return;
      } catch (error) {
        console.log(`❌ 下拉框策略${index + 1}失败: ${error.message}`);
      }
    }
    
    throw new Error(`无法选择下拉框选项: ${labelText} = ${optionValue}`);
  }

  /**
   * 设置复选框状态
   */
  async setCheckbox(labelText: string, checked: boolean = true): Promise<void> {
    const strategies = [
      // 1. getByLabel
      async () => {
        const checkbox = this.page.getByLabel(createSpaceIgnorePattern(labelText));
        await checkbox.setChecked(checked);
      },
      
      // 2. Ant Design Checkbox
      async () => {
        const formRow = this.page.locator('.ant4-form-item-row, .ant-form-item-row')
          .filter({ hasText: createSpaceIgnorePattern(labelText) });
        const checkbox = formRow.locator('.ant4-checkbox, .ant-checkbox').first();
        await checkbox.setChecked(checked);
      },
      
      // 3. 原生 checkbox
      async () => {
        const formRow = this.page.locator('.ant4-form-item-row, .ant-form-item-row')
          .filter({ hasText: createSpaceIgnorePattern(labelText) });
        const checkbox = formRow.locator('input[type="checkbox"]').first();
        await checkbox.setChecked(checked);
      }
    ];

    for (const [index, strategy] of strategies.entries()) {
      try {
        await strategy();
        console.log(`✅ 复选框设置成功 - 策略${index + 1}: ${labelText} = ${checked}`);
        return;
      } catch (error) {
        console.log(`❌ 复选框策略${index + 1}失败: ${error.message}`);
      }
    }
    
    throw new Error(`无法设置复选框状态: ${labelText} = ${checked}`);
  }
}
```

## 实际应用示例

### 1. 基础表单填写

```typescript
// 用户说："在商品名称输入框中输入测试商品"
// HTML: <label title="商品名称：">商品名称：</label>...<input id="product_name">

test('填写 Ant Design 表单', async ({ page }) => {
  const formLocator = new AntdFormLocator(page);
  
  // 方法1：使用专用定位器
  await formLocator.fillField('商品名称：', '测试商品');
  
  // 方法2：使用通用函数
  await fillAntdFormField(page, '商品名称：', '测试商品');
  
  // 方法3：直接使用 getByLabel（如果可用）
  await page.getByLabel(/^\s*商\s*品\s*名\s*称\s*：\s*$/).fill('测试商品');
});
```

### 2. 复杂表单操作

```typescript
test('复杂 Ant Design 表单操作', async ({ page }) => {
  const formLocator = new AntdFormLocator(page);
  
  // 填写文本字段
  await formLocator.fillField('用户名', 'admin');
  await formLocator.fillField('邮箱地址', 'admin@example.com');
  
  // 选择下拉框
  await formLocator.selectOption('用户类型', '管理员');
  await formLocator.selectOption('所属部门', '技术部');
  
  // 设置复选框
  await formLocator.setCheckbox('启用用户', true);
  await formLocator.setCheckbox('发送通知', false);
});
```

### 3. 调试和错误处理

```typescript
/**
 * 调试 Ant Design 表单定位
 */
async function debugAntdForm(page: Page, labelText: string) {
  console.log(`🔍 调试 Ant Design 表单字段: "${labelText}"`);
  
  // 检查 label 元素
  const labels = await page.locator('label').filter({ hasText: createSpaceIgnorePattern(labelText) }).all();
  console.log(`📊 找到 ${labels.length} 个匹配的 label`);
  
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];
    const labelText = await label.textContent();
    const forAttr = await label.getAttribute('for');
    const title = await label.getAttribute('title');
    
    console.log(`  ${i + 1}. Label 信息:`);
    console.log(`     文本: "${labelText}"`);
    console.log(`     for 属性: "${forAttr}"`);
    console.log(`     title 属性: "${title}"`);
    
    // 检查关联的 input
    if (forAttr) {
      const input = page.locator(`#${forAttr}`);
      const inputExists = await input.count() > 0;
      console.log(`     关联 input (#${forAttr}): ${inputExists ? '存在' : '不存在'}`);
    }
    
    // 检查表单行内的 input
    const formRow = label.locator('xpath=ancestor::*[contains(@class, "form-item")]');
    const rowInputs = await formRow.locator('input, textarea').count();
    console.log(`     表单行内 input 数量: ${rowInputs}`);
  }
}
```

## 最佳实践

### 1. 定位优先级

```typescript
// Ant Design 表单字段定位优先级：
// 1. getByLabel（如果 label 有正确的 for 属性）
await page.getByLabel(/^\s*商\s*品\s*名\s*称\s*：\s*$/).fill('测试商品');

// 2. 通过表单行定位
const formRow = page.locator('.ant4-form-item-row').filter({ hasText: /^\s*商\s*品\s*名\s*称\s*：\s*$/ });
await formRow.locator('input').fill('测试商品');

// 3. 通过 label 的 for 属性
const label = page.locator('label').filter({ hasText: /^\s*商\s*品\s*名\s*称\s*：\s*$/ });
const forId = await label.getAttribute('for');
await page.locator(`#${forId}`).fill('测试商品');

// 4. 通过表单项容器定位
const formItem = page.locator('.ant4-form-item').filter({ hasText: /^\s*商\s*品\s*名\s*称\s*：\s*$/ });
await formItem.locator('input').fill('测试商品');
```

### 2. 错误处理

```typescript
async function robustAntdFill(page: Page, labelText: string, value: string) {
  const maxRetries = 3;
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await fillAntdFormField(page, labelText, value);
      console.log(`✅ 第${attempt}次尝试成功: ${labelText}`);
      return;
    } catch (error) {
      lastError = error;
      console.log(`❌ 第${attempt}次尝试失败: ${error.message}`);
      
      if (attempt < maxRetries) {
        await page.waitForTimeout(1000); // 等待 1 秒后重试
      }
    }
  }
  
  // 所有尝试都失败，进行调试
  await debugAntdForm(page, labelText);
  throw new Error(`${maxRetries}次尝试后仍无法定位字段"${labelText}": ${lastError.message}`);
}
```

### 3. 性能优化

```typescript
/**
 * 缓存 Ant Design 表单定位器
 */
class CachedAntdFormLocator {
  private locatorCache = new Map<string, Locator>();
  
  constructor(private page: Page) {}
  
  private getCachedFormRow(labelText: string): Locator {
    const key = `form-row-${labelText}`;
    if (!this.locatorCache.has(key)) {
      const formRow = this.page.locator('.ant4-form-item-row, .ant-form-item-row')
        .filter({ hasText: createSpaceIgnorePattern(labelText) });
      this.locatorCache.set(key, formRow);
    }
    return this.locatorCache.get(key)!;
  }
  
  async fillField(labelText: string, value: string): Promise<void> {
    const formRow = this.getCachedFormRow(labelText);
    const input = formRow.locator('input, textarea').first();
    await input.fill(value);
  }
}
```

## 工具函数

```typescript
/**
 * 创建忽略字间空格的正则表达式
 */
function createSpaceIgnorePattern(text: string): RegExp {
  const escapedText = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = escapedText.split('').join('\\s*');
  return new RegExp(`^\\s*${pattern}\\s*$`);
}

/**
 * 通用 Ant Design 表单字段填写函数
 */
async function fillAntdField(page: Page, labelText: string, value: string): Promise<void> {
  const locator = new AntdFormLocator(page);
  await locator.fillField(labelText, value);
}

/**
 * 批量填写 Ant Design 表单
 */
async function fillAntdForm(page: Page, formData: Record<string, string>): Promise<void> {
  const locator = new AntdFormLocator(page);
  
  for (const [labelText, value] of Object.entries(formData)) {
    await locator.fillField(labelText, value);
    console.log(`✅ 已填写: ${labelText} = ${value}`);
  }
}
```

## 注意事项

1. **版本兼容性**：Ant Design 不同版本的 CSS 类名可能不同（`ant4-` vs `ant-`），定位器需同时覆盖两种前缀
2. **动态表单**：对于动态生成的表单，需要等待元素加载完成
3. **自定义组件**：某些自定义的 Ant Design 组件可能需要特殊处理
4. **国际化**：标签文本可能因语言设置而变化

## 总结

针对 Ant Design 表单的复杂结构，采用多层级定位策略：
1. **优先使用 getByLabel**：如果 label 有正确的 for 属性关联
2. **表单行级定位**：通过包含 label 的表单行定位 input
3. **容器级定位**：通过表单容器定位内部元素
4. **属性关联定位**：通过 label 的 for 属性找到对应 input

这种策略确保了在各种 Ant Design 表单结构中都能准确定位到目标元素。
