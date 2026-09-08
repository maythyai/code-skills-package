# 邻近元素定位策略指南

## 核心原则

当页面中存在标签文本和相关输入元素时，**先定位标签文本，再定位其邻近的目标元素**，
这种方式比直接通过 placeholder 或其他属性定位更加稳定和精确。

## 邻近定位优势

### 1. 更高的稳定性
- 标签文本通常比 placeholder 更稳定
- 不受输入框属性变化影响
- 适应各种 UI 框架的布局方式

### 2. 更强的语义化
- 基于用户可见的标签文本进行定位
- 符合用户的操作习惯和思维模式
- 提高测试脚本的可读性

### 3. 更好的兼容性
- 适应不同的表单布局（水平、垂直、网格等）
- 兼容各种 UI 组件库的实现方式
- 支持动态生成的表单结构

## 邻近定位语法

### 1. 基础邻近定位

```typescript
// 模式：先找标签，再找相邻输入框
// 适用于：<label>商品名称</label><input>

// 方法1：使用 CSS 相邻选择器
await page.locator('text=商品名称 + input').fill('测试商品');

// 方法2：使用 getByText + locator 组合
await page.getByText(/^\s*商\s*品\s*名\s*称\s*$/).locator('+ input').fill('测试商品');

// 方法3：使用父容器定位
const container = page.locator(':has-text("商品名称")');
await container.locator('input').fill('测试商品');
```

### 2. 复杂布局邻近定位

```typescript
// 垂直布局：标签在上，输入框在下
await page.getByText(/^\s*用\s*户\s*名\s*$/).locator('~ input').first().fill('admin');

// 表格布局：标签在左，输入框在右
await page.locator('tr:has-text("邮箱地址") input').fill('user@example.com');

// 嵌套布局：标签和输入框在同一容器内
await page.locator('div:has-text("密码") input[type="password"]').fill('123456');
```

### 3. 多层级邻近定位

```typescript
// 复杂表单：通过标签定位到表单组，再定位输入框
const formGroup = page.locator('.form-group:has-text("个人信息")');
await formGroup.getByLabel(/^\s*姓\s*名\s*$/).fill('张三');
await formGroup.getByLabel(/^\s*年\s*龄\s*$/).fill('25');

// 卡片布局：先定位卡片标题，再定位内部元素
const card = page.locator('.card:has-text("基本设置")');
await card.getByRole('textbox', { name: /^\s*昵\s*称\s*$/ }).fill('小明');
```

## 实际应用场景

### 1. 表单填写场景

```typescript
/**
 * 场景：用户说"请在商品名称处输入 xxx"
 * 支持多种页面结构：简单相邻、Ant Design 表单等
 */
async function fillFieldByLabel(page: Page, labelText: string, value: string) {
  // 策略1：getByLabel（最优 - 适用于正确关联的 label）
  try {
    const input = page.getByLabel(createSpaceIgnorePattern(labelText));
    await input.waitFor({ state: 'visible', timeout: 5000 });
    await input.fill(value);
    console.log(`✅ getByLabel 定位成功: ${labelText}`);
    return;
  } catch (error) {
    console.log(`❌ getByLabel 定位失败: ${error.message}`);
  }

  // 策略2：Ant Design 表单行级定位
  try {
    const formRow = page.locator('.ant4-form-item-row, .ant-form-item-row, .ant4-form-item, .ant-form-item')
      .filter({ hasText: createSpaceIgnorePattern(labelText) });
    const input = formRow.locator('input, textarea').first();
    await input.waitFor({ state: 'visible', timeout: 5000 });
    await input.fill(value);
    console.log(`✅ Ant Design 表单行定位成功: ${labelText}`);
    return;
  } catch (error) {
    console.log(`❌ Ant Design 表单行定位失败: ${error.message}`);
  }

  // 策略3：通过 label 的 for 属性定位
  try {
    const label = page.locator('label').filter({ hasText: createSpaceIgnorePattern(labelText) });
    const forId = await label.getAttribute('for');
    if (forId) {
      const input = page.locator(`#${forId}`);
      await input.waitFor({ state: 'visible', timeout: 5000 });
      await input.fill(value);
      console.log(`✅ for 属性定位成功: ${labelText} -> #${forId}`);
      return;
    }
  } catch (error) {
    console.log(`❌ for 属性定位失败: ${error.message}`);
  }

  // 策略4：直接相邻定位（适用于简单结构）
  try {
    const labelPattern = createSpaceIgnorePattern(labelText);
    await page.getByText(labelPattern).locator('+ input').fill(value);
    console.log(`✅ 直接相邻定位成功: ${labelText}`);
    return;
  } catch (error) {
    console.log(`❌ 直接相邻定位失败: ${error.message}`);
  }

  // 策略5：同级兄弟元素定位
  try {
    const labelPattern = createSpaceIgnorePattern(labelText);
    await page.getByText(labelPattern).locator('~ input').first().fill(value);
    console.log(`✅ 兄弟元素定位成功: ${labelText}`);
    return;
  } catch (error) {
    console.log(`❌ 兄弟元素定位失败: ${error.message}`);
  }

  // 策略6：父容器内定位（最后备选）
  try {
    const container = page.locator(`:has-text("${labelText}")`);
    await container.locator('input').first().fill(value);
    console.log(`✅ 父容器定位成功: ${labelText}`);
    return;
  } catch (error) {
    console.log(`❌ 父容器定位失败: ${error.message}`);
  }

  throw new Error(`无法通过标签"${labelText}"定位到输入框`);
}

// 使用示例
await fillFieldByLabel(page, '商品名称', '测试商品');   // 支持 Ant Design
await fillFieldByLabel(page, '用户名', 'admin');         // 支持简单表单
await fillFieldByLabel(page, '邮箱地址', 'user@example.com');
```

### 2. 下拉框选择场景

```typescript
/**
 * 场景：用户说"请在用户类型处选择管理员"
 * 页面结构：<label>用户类型</label><select>...</select>
 */
async function selectByLabel(page: Page, labelText: string, optionValue: string) {
  const strategies = [
    // 1. 直接相邻定位
    () => page.getByText(createSpaceIgnorePattern(labelText)).locator('+ select'),
    
    // 2. 兄弟元素定位
    () => page.getByText(createSpaceIgnorePattern(labelText)).locator('~ select').first(),
    
    // 3. 父容器定位
    () => page.locator(`:has-text("${labelText}") select`),
    
    // 4. 表单组定位
    () => page.locator('.form-group:has-text("' + labelText + '") select'),
    
    // 5. 自定义下拉组件
    () => page.locator(`:has-text("${labelText}") [role="combobox"]`)
  ];

  for (const [index, getLocator] of strategies.entries()) {
    try {
      const locator = getLocator();
      await locator.waitFor({ state: 'visible', timeout: 5000 });
      
      // 尝试标准 select 操作
      try {
        await locator.selectOption(optionValue);
        console.log(`✅ 策略${index + 1}成功: 标准 select 选择`);
        return;
      } catch (selectError) {
        // 尝试自定义下拉组件操作
        await locator.click();
        await page.getByText(createSpaceIgnorePattern(optionValue)).click();
        console.log(`✅ 策略${index + 1}成功: 自定义下拉选择`);
        return;
      }
    } catch (error) {
      console.log(`❌ 策略${index + 1}失败: ${error.message}`);
    }
  }

  throw new Error(`无法通过标签"${labelText}"定位到下拉框`);
}

// 使用示例
await selectByLabel(page, '用户类型', '管理员');
await selectByLabel(page, '所属部门', '技术部');
```

### 3. 复选框和单选框场景

```typescript
/**
 * 场景：用户说"请勾选同意协议"
 * 页面结构：<input type="checkbox"><label>同意用户协议</label>
 */
async function checkByLabel(page: Page, labelText: string, checked: boolean = true) {
  const strategies = [
    // 1. 标准 label 关联
    () => page.getByLabel(createSpaceIgnorePattern(labelText)),
    
    // 2. 文本前的 checkbox
    () => page.getByText(createSpaceIgnorePattern(labelText)).locator('input[type="checkbox"]'),
    
    // 3. 相邻 checkbox
    () => page.locator(`input[type="checkbox"] + :text("${labelText}")`).locator('input'),
    
    // 4. 父容器内 checkbox
    () => page.locator(`:has-text("${labelText}") input[type="checkbox"]`)
  ];

  for (const [index, getLocator] of strategies.entries()) {
    try {
      const locator = getLocator();
      await locator.waitFor({ state: 'visible', timeout: 5000 });
      await locator.setChecked(checked);
      console.log(`✅ 策略${index + 1}成功: 复选框操作`);
      return;
    } catch (error) {
      console.log(`❌ 策略${index + 1}失败: ${error.message}`);
    }
  }

  throw new Error(`无法通过标签"${labelText}"定位到复选框`);
}

// 使用示例
await checkByLabel(page, '同意用户协议', true);
await checkByLabel(page, '记住密码', false);
```

## 高级邻近定位技巧

### 1. 动态标签匹配

```typescript
/**
 * 处理动态生成的标签文本
 */
async function fillDynamicField(page: Page, labelPattern: RegExp, value: string) {
  // 先找到所有匹配的标签
  const labels = await page.getByText(labelPattern).all();
  
  for (const label of labels) {
    try {
      // 尝试找到相邻的输入框
      const input = label.locator('+ input, ~ input').first();
      await input.waitFor({ state: 'visible', timeout: 2000 });
      await input.fill(value);
      
      const labelText = await label.textContent();
      console.log(`✅ 动态标签匹配成功: "${labelText}"`);
      return;
    } catch (error) {
      continue;
    }
  }
  
  throw new Error(`无法找到匹配模式的输入框: ${labelPattern}`);
}

// 使用示例
await fillDynamicField(page, /^\s*用\s*户\s*I\s*D\s*\d*\s*$/, '12345');
```

### 2. 表格内定位

```typescript
/**
 * 在表格中通过行标签定位到特定列的输入框
 */
async function fillTableCell(page: Page, rowLabel: string, columnIndex: number, value: string) {
  const row = page.getByRole('row').filter({ hasText: createSpaceIgnorePattern(rowLabel) });
  const cell = row.locator('td').nth(columnIndex);
  const input = cell.locator('input, select, textarea').first();
  
  await input.waitFor({ state: 'visible', timeout: 5000 });
  await input.fill(value);
  
  console.log(`✅ 表格定位成功: 行"${rowLabel}" 列${columnIndex}`);
}

// 使用示例
await fillTableCell(page, '基本信息', 1, '张三');
await fillTableCell(page, '联系方式', 2, '13800138000');
```

### 3. 多步骤邻近定位

```typescript
/**
 * 复杂表单的多步骤定位
 */
class AdjacentLocator {
  constructor(private page: Page) {}

  async fillBySteps(steps: Array<{type: 'section' | 'field', text: string, value?: string}>) {
    let currentContext = this.page;
    
    for (const step of steps) {
      if (step.type === 'section') {
        // 定位到表单区域
        currentContext = this.page.locator(`:has-text("${step.text}")`);
        await currentContext.waitFor({ state: 'visible', timeout: 5000 });
        console.log(`📍 定位到区域: ${step.text}`);
      } else if (step.type === 'field' && step.value) {
        // 在当前区域内定位字段
        const field = currentContext.getByText(createSpaceIgnorePattern(step.text));
        const input = field.locator('+ input, ~ input, input').first();
        await input.waitFor({ state: 'visible', timeout: 5000 });
        await input.fill(step.value);
        console.log(`✅ 填写字段: ${step.text} = ${step.value}`);
      }
    }
  }
}

// 使用示例
const locator = new AdjacentLocator(page);
await locator.fillBySteps([
  { type: 'section', text: '个人信息' },
  { type: 'field', text: '姓名', value: '张三' },
  { type: 'field', text: '年龄', value: '25' },
  { type: 'section', text: '联系信息' },
  { type: 'field', text: '邮箱', value: 'zhangsan@example.com' }
]);
```

## 工具函数库

### 1. 通用邻近定位函数

```typescript
/**
 * 通用的邻近元素定位器
 */
class UniversalAdjacentLocator {
  constructor(private page: Page) {}

  /**
   * 通过标签文本定位输入框并填写
   */
  async fillInput(labelText: string, value: string): Promise<void> {
    const strategies = [
      () => this.page.getByText(createSpaceIgnorePattern(labelText)).locator('+ input'),
      () => this.page.getByText(createSpaceIgnorePattern(labelText)).locator('~ input').first(),
      () => this.page.locator(`:has-text("${labelText}") input`),
      () => this.page.getByLabel(createSpaceIgnorePattern(labelText))
    ];

    await this.executeStrategies(strategies, async (locator) => {
      await locator.fill(value);
    }, `填写输入框: ${labelText}`);
  }

  /**
   * 通过标签文本定位下拉框并选择
   */
  async selectOption(labelText: string, optionValue: string): Promise<void> {
    const strategies = [
      () => this.page.getByText(createSpaceIgnorePattern(labelText)).locator('+ select'),
      () => this.page.getByText(createSpaceIgnorePattern(labelText)).locator('~ select').first(),
      () => this.page.locator(`:has-text("${labelText}") select`),
      () => this.page.locator(`:has-text("${labelText}") [role="combobox"]`)
    ];

    await this.executeStrategies(strategies, async (locator) => {
      try {
        await locator.selectOption(optionValue);
      } catch (error) {
        // 尝试自定义下拉组件
        await locator.click();
        await this.page.getByText(createSpaceIgnorePattern(optionValue)).click();
      }
    }, `选择下拉框: ${labelText}`);
  }

  /**
   * 通过标签文本定位复选框并设置状态
   */
  async setCheckbox(labelText: string, checked: boolean = true): Promise<void> {
    const strategies = [
      () => this.page.getByLabel(createSpaceIgnorePattern(labelText)),
      () => this.page.locator(`:has-text("${labelText}") input[type="checkbox"]`),
      () => this.page.getByText(createSpaceIgnorePattern(labelText)).locator('input[type="checkbox"]')
    ];

    await this.executeStrategies(strategies, async (locator) => {
      await locator.setChecked(checked);
    }, `设置复选框: ${labelText}`);
  }

  /**
   * 执行多种定位策略
   */
  private async executeStrategies(
    strategies: Array<() => Locator>,
    action: (locator: Locator) => Promise<void>,
    description: string
  ): Promise<void> {
    for (const [index, getLocator] of strategies.entries()) {
      try {
        const locator = getLocator();
        await locator.waitFor({ state: 'visible', timeout: 5000 });
        await action(locator);
        console.log(`✅ ${description} - 策略${index + 1}成功`);
        return;
      } catch (error) {
        console.log(`❌ ${description} - 策略${index + 1}失败: ${error.message}`);
      }
    }
    throw new Error(`${description} - 所有策略都失败了`);
  }
}
```

### 2. 字间空格忽略工具函数

```typescript
/**
 * 创建忽略字间空格的正则表达式
 */
function createSpaceIgnorePattern(text: string): RegExp {
  const escapedText = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = escapedText.split('').join('\\s*');
  return new RegExp(`^\\s*${pattern}\\s*$`);
}
```

## 最佳实践

### 1. 定位优先级

```typescript
// 推荐的邻近定位优先级：
// 1. 标准 label 关联（最稳定）
await page.getByLabel(createSpaceIgnorePattern('商品名称')).fill('测试商品');

// 2. 直接相邻定位（次优）
await page.getByText(createSpaceIgnorePattern('商品名称')).locator('+ input').fill('测试商品');

// 3. 兄弟元素定位（备选）
await page.getByText(createSpaceIgnorePattern('商品名称')).locator('~ input').first().fill('测试商品');

// 4. 父容器定位（最后备选）
await page.locator(':has-text("商品名称") input').fill('测试商品');
```

### 2. 错误处理和调试

```typescript
async function debugAdjacentLocating(page: Page, labelText: string) {
  console.log(`🔍 调试邻近定位: "${labelText}"`);
  
  // 检查标签是否存在
  const labels = await page.getByText(createSpaceIgnorePattern(labelText)).all();
  console.log(`📊 找到 ${labels.length} 个匹配的标签`);
  
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];
    const labelContent = await label.textContent();
    console.log(`  ${i + 1}. 标签文本: "${labelContent}"`);
    
    // 检查相邻元素
    const adjacentInputs = await label.locator('+ input, ~ input').all();
    console.log(`     相邻输入框数量: ${adjacentInputs.length}`);
    
    // 检查父容器内的输入框
    const containerInputs = await label.locator('.. input').all();
    console.log(`     容器内输入框数量: ${containerInputs.length}`);
  }
}
```

### 3. 性能优化

```typescript
// 缓存常用的定位器
class CachedAdjacentLocator {
  private locatorCache = new Map<string, Locator>();
  
  constructor(private page: Page) {}
  
  private getCachedLocator(key: string, factory: () => Locator): Locator {
    if (!this.locatorCache.has(key)) {
      this.locatorCache.set(key, factory());
    }
    return this.locatorCache.get(key)!;
  }
  
  async fillInput(labelText: string, value: string): Promise<void> {
    const locator = this.getCachedLocator(
      `input-${labelText}`,
      () => this.page.getByText(createSpaceIgnorePattern(labelText)).locator('+ input')
    );
    
    await locator.fill(value);
  }
}
```

## 注意事项

1. **布局兼容性**：不同 UI 框架的布局方式可能不同，需要准备多种定位策略
2. **性能考虑**：邻近定位比直接定位稍慢，但稳定性更高
3. **动态内容**：对于动态生成的表单，需要使用更灵活的定位方式
4. **国际化支持**：标签文本可能因语言不同而变化，需要考虑多语言场景

## 总结

邻近元素定位策略通过"先找标签，再找元素"的方式，大大提升了定位的精准性和稳定性。这种方法
更符合用户的操作习惯，使测试脚本更加直观和可维护。结合字间空格忽略策略，可以处理各种复杂的
UI 场景，确保测试的稳定执行。
