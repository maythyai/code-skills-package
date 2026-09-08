# 生产代码标准

## 核心原则

生成的 `.spec.ts` 文件必须是**最终确定性可行的脚本**，不包含任何思考过程、尝试过程或开发痕迹。

## 代码清洁标准

### 1. 移除开发痕迹

**禁止包含的内容**：
- 调试日志和 console.log 语句
- 思考过程的注释
- 尝试性代码和备选方案
- 错误处理的详细日志
- 性能监控代码
- 开发时的临时变量

**示例对比**：

```typescript
// ❌ 开发版本（包含思考过程）
async function clickButton(page: Page, buttonText: string) {
    console.log(`开始点击按钮: ${buttonText}`); // 调试日志
    
    // 1. 定位按钮（忽略空格） - 思考注释
    const button = page.getByRole('button', { name: new RegExp(`^\\s*${buttonText}\\s*$`) });
    
    // 2. 等待按钮可见（5秒超时） - 过程说明
    console.log(`⏳ 等待按钮可见: ${buttonText}`); // 调试日志
    await button.waitFor({ state: 'visible', timeout: 5000 });
    
    // 3. 执行点击 - 步骤说明
    await button.click();
    
    console.log(`✅ 按钮点击完成: ${buttonText}`); // 成功日志
}

// ✅ 生产版本（最终确定性代码）
async function clickButton(page: Page, buttonText: string) {
    const button = page.getByRole('button', { name: new RegExp(`^\\s*${buttonText}\\s*$`) });
    await button.waitFor({ state: 'visible', timeout: 5000 });
    await button.click();
}
```

### 2. 简洁的测试结构

**标准生产模板**：

```typescript
import { test, expect } from '@playwright/test';

test('user-search', async ({ page }) => {
  await page.goto('https://example.com/#/system/user-management');
  await page.waitForLoadState('domcontentloaded');
  
  const searchInput = page.getByLabel(/^\s*搜索关键词\s*$/);
  await searchInput.waitFor({ state: 'visible', timeout: 5000 });
  await searchInput.fill('testuser');
  
  const searchButton = page.getByRole('button', { name: /^\s*搜索\s*$/ });
  await searchButton.waitFor({ state: 'visible', timeout: 5000 });
  await searchButton.click();
  
  await expect(page.getByText(/^\s*testuser\s*$/)).toBeVisible({ timeout: 5000 });
  
  await page.screenshot({ 
    path: '.csp/artifacts/verify/evidence/case/user-search-results/success.png',
    fullPage: true 
  });
});
```

### 3. 必要的错误处理

**最小化错误处理**：

```typescript
// ✅ 生产版本 - 简洁的错误处理
test('data-edit', async ({ page }) => {
  await page.goto('https://example.com/#/system/data-management');
  await page.waitForLoadState('domcontentloaded');
  
  try {
    const addButton = page.getByRole('button', { name: /^\s*新增数据\s*$/ });
    await addButton.waitFor({ state: 'visible', timeout: 5000 });
    await addButton.click();
    
    const nameInput = page.getByLabel(/^\s*数据名称\s*$/);
    await nameInput.waitFor({ state: 'visible', timeout: 5000 });
    await nameInput.fill('测试数据001');
    
    const saveButton = page.getByRole('button', { name: /^\s*保存\s*$/ });
    await saveButton.waitFor({ state: 'visible', timeout: 5000 });
    await saveButton.click();
    
    await expect(page.getByText(/^\s*数据保存成功\s*$/)).toBeVisible({ timeout: 5000 });
    
    await page.screenshot({ 
      path: '.csp/artifacts/verify/evidence/case/data-edit-results/success.png',
      fullPage: true 
    });
  } catch (error) {
    await page.screenshot({ 
      path: '.csp/artifacts/verify/evidence/case/data-edit-results/error.png',
      fullPage: true 
    });
    throw error;
  }
});
```

## 代码生成流程

### 1. 执行阶段（内部处理）

在测试执行过程中，可以包含详细的日志和调试信息：

```typescript
// 内部执行时的详细日志（不写入文件）
console.log('⏳ 等待搜索按钮可见');
console.log('✅ 搜索按钮点击成功');
console.log('❌ 元素定位失败，尝试备用策略');
```

### 2. 脚本生成阶段（写入文件）

生成最终脚本时，移除所有开发痕迹：

```typescript
// 最终写入 .spec.ts 文件的代码
const searchButton = page.getByRole('button', { name: /^\s*搜索\s*$/ });
await searchButton.waitFor({ state: 'visible', timeout: 5000 });
await searchButton.click();
```

## 文件结构标准

### 1. 导入声明

```typescript
import { test, expect } from '@playwright/test';
```

### 2. 测试用例结构

```typescript
test('{{testName}}', async ({ page }) => {
  // 页面导航
  await page.goto('{{baseUrl}}{{url}}');
  await page.waitForLoadState('domcontentloaded');
  
  // 测试步骤（简洁明了）
  
  // 截图保存
  await page.screenshot({ 
    path: `.csp/artifacts/verify/evidence/{{filename}}/{{testName}}-results/success.png`,
    fullPage: true 
  });
});
```

### 3. 错误处理（可选）

```typescript
test('{{testName}}', async ({ page }) => {
  try {
    // 测试步骤
  } catch (error) {
    await page.screenshot({ 
      path: `.csp/artifacts/verify/evidence/{{filename}}/{{testName}}-results/error.png`,
      fullPage: true 
    });
    throw error;
  }
});
```

## 质量检查清单

### ✅ 必须包含
- [ ] 基本的导入声明
- [ ] 页面导航和加载等待
- [ ] 元素可见性检查（5 秒超时）
- [ ] 核心测试操作
- [ ] 结果验证
- [ ] 截图保存

### ❌ 必须移除
- [ ] 调试日志（console.log）
- [ ] 思考过程注释
- [ ] 尝试性代码
- [ ] 详细的错误日志
- [ ] 性能监控代码
- [ ] 开发时的临时变量
- [ ] 多余的注释说明

### 🔧 代码优化
- [ ] 变量命名简洁明了
- [ ] 操作步骤逻辑清晰
- [ ] 等待时间统一（5 秒）
- [ ] 正则表达式忽略空格
- [ ] 错误处理最小化

## 示例对比

### 开发版本（不写入文件）
```typescript
test('user-login', async ({ page }) => {
  console.log('🚀 开始执行用户登录测试');
  
  try {
    // 步骤1：导航到登录页面
    console.log('步骤1：导航到登录页面');
    await page.goto('https://example.com/login');
    await page.waitForLoadState('domcontentloaded');
    console.log('✅ 页面导航成功');
    
    // 步骤2：填写用户名（先等待可见）
    console.log('步骤2：填写用户名');
    const usernameInput = page.getByLabel(/^\s*用户名\s*$/);
    console.log('⏳ 等待用户名输入框可见');
    await usernameInput.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✅ 用户名输入框已可见');
    await usernameInput.fill('admin');
    console.log('✅ 用户名填写完成');
    
    // 更多详细步骤...
    
  } catch (error) {
    console.error('❌ 测试执行失败：', error.message);
    throw error;
  }
});
```

### 生产版本（写入文件）
```typescript
import { test, expect } from '@playwright/test';

test('user-login', async ({ page }) => {
  await page.goto('https://example.com/login');
  await page.waitForLoadState('domcontentloaded');
  
  const usernameInput = page.getByLabel(/^\s*用户名\s*$/);
  await usernameInput.waitFor({ state: 'visible', timeout: 5000 });
  await usernameInput.fill('admin');
  
  const passwordInput = page.getByLabel(/^\s*密码\s*$/);
  await passwordInput.waitFor({ state: 'visible', timeout: 5000 });
  await passwordInput.fill('password123');
  
  const loginButton = page.getByRole('button', { name: /^\s*登录\s*$/ });
  await loginButton.waitFor({ state: 'visible', timeout: 5000 });
  await loginButton.click();
  
  await expect(page.getByText(/^\s*登录成功\s*$/)).toBeVisible({ timeout: 5000 });
  
  await page.screenshot({ 
    path: '.csp/artifacts/verify/evidence/case/user-login-results/success.png',
    fullPage: true 
  });
});
```

> 注意：生产脚本中的登录步骤应已被 `LoginActionFilter` 过滤——登录由 `auth.setup` 统一处理，
> 生成的 `.spec.ts` 只保留业务步骤。上方示例仅为清洁代码形态示意。

## 最佳实践

1. **执行时详细，生成时简洁**：执行过程可以有详细日志，但生成的文件必须简洁
2. **一次性正确**：生成的代码应该是经过验证的，可以直接运行的
3. **最小化依赖**：只包含必要的导入和操作
4. **标准化结构**：所有测试文件使用相同的结构模式
5. **清晰的意图**：代码应该清楚地表达测试意图，无需额外说明
