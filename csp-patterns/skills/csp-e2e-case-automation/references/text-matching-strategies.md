# 文本匹配策略 - 忽略空格处理

## 核心原则

在进行按钮、链接等 UI 元素的文本匹配时，**忽略前后空格以及字与字之间的所有空格**，
只关注文字内容的一致性。这是中文 UI 中抗排版变化最有效的策略。

## 正则表达式模式

### 1. 基础忽略空格模式

```typescript
// 模式：/^\s*目标文本\s*$/
// 解释：^ 开始，\s* 任意空格，目标文本，\s* 任意空格，$ 结束

// 示例
await page.getByRole('button', { name: /^\s*搜索\s*$/ }).click();
await page.getByText(/^\s*用户管理\s*$/).click();
await page.getByRole('link', { name: /^\s*返回首页\s*$/ }).click();
```

### 2. 字间空格处理模式

```typescript
// 对于可能包含字间空格的文本，在每个字符间添加可选空格匹配
// 模式：/^\s*文\s*字\s*内\s*容\s*$/

// 示例：处理"用 户 管 理"、"用户管理"、" 用 户 管 理 "等各种空格变体
await page.getByText(/^\s*用\s*户\s*管\s*理\s*$/).click();

// 更通用的字间空格忽略函数
function createSpaceIgnorePattern(text: string): RegExp {
  const pattern = text.split('').join('\\s*');
  return new RegExp(`^\\s*${pattern}\\s*$`);
}

// 使用示例
await page.getByText(createSpaceIgnorePattern('用户管理')).click();
```

### 3. 多选项匹配模式

```typescript
// 匹配多个可能的文本选项
await page.getByRole('button', { name: /^\s*(提交|确认|保存)\s*$/ }).click();
await page.getByRole('button', { name: /^\s*(取消|关闭|返回)\s*$/ }).click();
```

## 实际应用示例

### 按钮定位

```typescript
// 原始方式（可能因空格失败）
await page.getByRole('button', { name: '搜索' }).click();

// 推荐方式（忽略空格）
await page.getByRole('button', { name: /^\s*搜索\s*$/ }).click();

// 处理可能的变体
await page.getByRole('button', { name: /^\s*(搜索|查询|检索)\s*$/ }).click();
```

### 链接定位

```typescript
// 导航链接（忽略空格）
await page.getByRole('link', { name: /^\s*用户管理\s*$/ }).click();
await page.getByRole('link', { name: /^\s*系统设置\s*$/ }).click();

// 面包屑导航
await page.getByRole('link', { name: /^\s*首页\s*$/ }).click();
```

### 文本验证

```typescript
// 验证提示信息（忽略空格）
await expect(page.getByText(/^\s*操作成功\s*$/)).toBeVisible();
await expect(page.getByText(/^\s*数据保存成功\s*$/)).toBeVisible();

// 验证页面标题
await expect(page.getByRole('heading', { name: /^\s*用户管理\s*$/ })).toBeVisible();
```

### 表单标签

```typescript
// 表单字段标签（忽略空格）
await page.getByLabel(/^\s*用户名\s*$/).fill('admin');
await page.getByLabel(/^\s*密码\s*$/).fill('password123');
await page.getByLabel(/^\s*确认密码\s*$/).fill('password123');
```

## 容错策略

### 多层级匹配

```typescript
async function clickButtonWithSpaceTolerance(page: Page, buttonText: string) {
  const patterns = [
    // 1. 精确匹配（无空格）
    { name: buttonText, exact: true },
    
    // 2. 忽略前后空格
    { name: new RegExp(`^\\s*${buttonText}\\s*$`) },
    
    // 3. 部分匹配（包含该文本即可）
    { name: new RegExp(buttonText) },
    
    // 4. 忽略字间所有空格（最强容错）
    { name: new RegExp(`^\\s*${buttonText.split('').join('\\s*')}\\s*$`) }
  ];
  
  for (const pattern of patterns) {
    try {
      await page.getByRole('button', pattern).click({ timeout: 2000 });
      console.log(`✅ 按钮点击成功，使用模式: ${JSON.stringify(pattern)}`);
      return;
    } catch (error) {
      console.log(`❌ 模式失败: ${JSON.stringify(pattern)}`);
    }
  }
  
  throw new Error(`无法找到按钮: ${buttonText}`);
}

// 使用示例
await clickButtonWithSpaceTolerance(page, '搜索');
```

### 智能文本匹配函数

```typescript
/**
 * 创建忽略字间空格的文本匹配正则表达式
 */
function createSpaceIgnoreRegex(text: string): RegExp {
  // 转义特殊字符并在每个字符间添加可选空格匹配
  const escapedText = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const spaceIgnorePattern = escapedText.split('').join('\\s*');
  return new RegExp(`^\\s*${spaceIgnorePattern}\\s*$`);
}

// 使用示例
await page.getByRole('button', { name: createSpaceIgnoreRegex('用户管理') }).click();
await page.getByText(createSpaceIgnoreRegex('操作成功')).waitFor();
```

## 最佳实践

### 1. 优先级策略

```typescript
// 推荐的匹配优先级：
// 1. 语义化定位 + 忽略空格
await page.getByRole('button', { name: /^\s*搜索\s*$/ }).click();

// 2. 文本定位 + 忽略空格
await page.getByText(/^\s*用户管理\s*$/).click();

// 3. 部分匹配（最后备选）
await page.getByText(/搜索/).click();
```

### 2. 常用模式封装

```typescript
class SpaceIgnoreLocators {
  constructor(private page: Page) {}
  
  // 创建忽略字间空格的正则表达式
  private createPattern(text: string): RegExp {
    const escapedText = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = escapedText.split('').join('\\s*');
    return new RegExp(`^\\s*${pattern}\\s*$`);
  }
  
  async clickButton(text: string) {
    return this.page.getByRole('button', { name: this.createPattern(text) }).click();
  }
  
  async clickLink(text: string) {
    return this.page.getByRole('link', { name: this.createPattern(text) }).click();
  }
  
  async fillInput(label: string, value: string) {
    return this.page.getByLabel(this.createPattern(label)).fill(value);
  }
  
  async expectText(text: string) {
    return expect(this.page.getByText(this.createPattern(text))).toBeVisible();
  }
}

// 使用示例
const locators = new SpaceIgnoreLocators(page);
await locators.clickButton('搜索');
await locators.fillInput('用户名', 'admin');
await locators.expectText('操作成功');
```

### 3. 调试和日志

```typescript
async function debugTextMatch(page: Page, selector: string, expectedText: string) {
  const elements = await page.locator(selector).all();
  
  console.log(`🔍 查找文本: "${expectedText}"`);
  console.log(`📍 选择器: ${selector}`);
  console.log(`📊 找到 ${elements.length} 个元素:`);
  
  for (let i = 0; i < elements.length; i++) {
    const text = await elements[i].textContent();
    const trimmedText = text?.trim();
    console.log(`  ${i + 1}. 原始文本: "${text}"`);
    console.log(`     清理后: "${trimmedText}"`);
    console.log(`     匹配: ${trimmedText === expectedText ? '✅' : '❌'}`);
  }
}

// 使用示例
await debugTextMatch(page, 'button', '搜索');
```

## 注意事项

1. **性能考虑**：正则表达式匹配比精确匹配稍慢，但提高了稳定性
2. **特殊字符**：如果文本包含正则特殊字符，需要进行转义
3. **国际化**：考虑不同语言的空格处理方式
4. **调试友好**：在测试失败时，输出实际获取到的文本内容便于调试

## 模板更新

在测试脚本模板中，所有文本匹配都应该使用忽略字间空格的模式：

```typescript
// 更新后的模板示例 - 忽略字间空格
await page.getByRole('button', { name: /^\s*搜\s*索\s*$/ }).click();
await expect(page.getByText(/^\s*操\s*作\s*成\s*功\s*$/)).toBeVisible();
await page.getByRole('link', { name: /^\s*用\s*户\s*管\s*理\s*$/ }).click();

// 或使用工具函数
function createSpaceIgnorePattern(text: string): RegExp {
  const pattern = text.split('').join('\\s*');
  return new RegExp(`^\\s*${pattern}\\s*$`);
}

await page.getByRole('button', { name: createSpaceIgnorePattern('搜索') }).click();
await expect(page.getByText(createSpaceIgnorePattern('操作成功'))).toBeVisible();
```
