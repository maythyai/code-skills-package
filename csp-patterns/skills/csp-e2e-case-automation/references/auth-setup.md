# 登录设置（auth.setup）策略

## 核心理念

**外部登录设置**：当检测到 URL 含登录特征（`login`/`auth`/`sso`）时，自动执行预设的
`tests/auth.setup.ts` 脚本获取登录态，而不是在测试用例中直接处理登录。生成最终测试脚本时，
自动过滤掉所有登录相关操作，确保脚本专注于业务逻辑验证。

## 登录设置工作流程

### 第 1 步：登录检测与 setup 执行

```typescript
// 智能登录检测和 setup 执行
async function detectAndExecuteAuthSetup(page: Page, baseUrl: string): Promise<void> {
  console.log('🔐 开始检测登录需求');
  
  // 1. 检查 URL 是否含登录特征（login / auth / sso）
  const needsAuth = /login|\/auth\/|sso/i.test(baseUrl) || /login|\/auth\/|sso/i.test(page.url());
  
  if (!needsAuth) {
    console.log('✅ 当前页面无需登录认证');
    return;
  }
  
  console.log('🔍 检测到需要登录认证的页面，执行 auth.setup');
  await executeAuthSetup(page);
  console.log('✅ 登录设置完成');
}

// 执行 auth.setup 脚本
async function executeAuthSetup(page: Page): Promise<void> {
  try {
    console.log('🚀 开始执行 tests/auth.setup.ts');
    const authSetupPath = './tests/auth.setup.ts';
    
    if (!await fileExists(authSetupPath)) {
      console.log('⚠️ auth.setup.ts 文件不存在，跳过登录设置');
      return;
    }
    
    // 动态导入并执行 auth.setup.ts
    const authSetup = await import(authSetupPath);
    if (typeof authSetup.setup === 'function') {
      await authSetup.setup(page);
      console.log('✅ auth.setup.ts 执行成功');
    } else if (typeof authSetup.default === 'function') {
      await authSetup.default(page);
      console.log('✅ auth.setup.ts (default export) 执行成功');
    } else {
      console.log('⚠️ auth.setup.ts 中未找到有效的 setup 函数');
    }
  } catch (error) {
    console.error(`❌ 执行 auth.setup.ts 失败: ${error.message}`);
    await fallbackLoginDetection(page);
  }
}

// 备用登录检测（当 auth.setup 不可用时）
async function fallbackLoginDetection(page: Page): Promise<void> {
  console.log('🔄 尝试备用登录检测');
  try {
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    const isLoggedIn = await verifyLoginStatus(page);
    if (isLoggedIn) {
      console.log('✅ 检测到已登录状态');
      return;
    }
    
    console.log('⚠️ 检测到未登录状态，但 auth.setup.ts 不可用');
    console.log('💡 建议：请确保 tests/auth.setup.ts 存在并包含正确的登录逻辑');
  } catch (error) {
    console.log(`❌ 备用登录检测失败: ${error.message}`);
  }
}

// 验证登录状态
async function verifyLoginStatus(page: Page): Promise<boolean> {
  try {
    // 未登录指示器：登录页元素可见则未登录
    const loginIndicators = [
      () => page.locator('input[type="email"], input[name="email"], input[placeholder*="邮箱"]').isVisible(),
      () => page.locator('input[type="password"], input[name="password"], input[placeholder*="密码"]').isVisible(),
      () => page.getByText(/登录|Login|Sign In/i).isVisible(),
      () => page.getByRole('button', { name: /登录|Login|Sign In/i }).isVisible()
    ];
    
    for (const indicator of loginIndicators) {
      try {
        if (await indicator()) {
          console.log('🔍 检测到登录页面元素，判断为未登录状态');
          return false;
        }
      } catch (error) { /* 忽略单个检查错误 */ }
    }
    
    // 已登录指示器：用户信息元素可见则已登录
    const userIndicators = [
      () => page.locator('[data-testid*="user"], [class*="user"], [id*="user"]').isVisible(),
      () => page.getByText(/个人中心|Profile|User/i).isVisible(),
      () => page.locator('nav, .navbar, .header').getByText(/退出|Logout|Sign Out/i).isVisible()
    ];
    
    for (const indicator of userIndicators) {
      try {
        if (await indicator()) {
          console.log('✅ 检测到用户信息元素，判断为已登录状态');
          return true;
        }
      } catch (error) { /* 忽略 */ }
    }
    
    // URL 已跳转离开登录页则视为已登录
    const currentUrl = page.url();
    if (!/login|\/auth\/|sso/i.test(currentUrl)) {
      console.log('✅ URL 已跳转离开登录页面，判断为已登录状态');
      return true;
    }
    
    console.log('⚠️ 无法明确判断登录状态，默认为未登录');
    return false;
  } catch (error) {
    console.log(`❌ 验证登录状态时出错: ${error.message}`);
    return false;
  }
}
```

### 第 2 步：auth.setup 标准模板

```typescript
// tests/auth.setup.ts 标准模板
import { Page } from '@playwright/test';

/**
 * 登录设置函数：检测到需要登录的页面时自动调用
 */
export async function setup(page: Page): Promise<void> {
  console.log('🔐 开始执行登录设置');
  try {
    // 1. 检查是否已有保存的认证状态
    if (await checkStoredAuth(page)) {
      console.log('✅ 使用已保存的认证状态');
      return;
    }
    // 2. 执行登录流程
    await performLogin(page);
    // 3. 保存认证状态
    await saveAuthState(page);
    console.log('✅ 登录设置完成');
  } catch (error) {
    console.error(`❌ 登录设置失败: ${error.message}`);
    throw error;
  }
}

// 检查已保存的认证状态（24h 内有效）
async function checkStoredAuth(page: Page): Promise<boolean> {
  try {
    const authFile = './playwright/.auth/user.json';
    if (!await fileExists(authFile)) return false;
    
    const authData = JSON.parse(await fs.readFile(authFile, 'utf-8'));
    
    // 检查认证是否过期（24 小时）
    if (authData.timestamp) {
      const hoursDiff = (Date.now() - new Date(authData.timestamp).getTime()) / (1000 * 60 * 60);
      if (hoursDiff > 24) {
        console.log('⚠️ 认证状态已过期');
        return false;
      }
    }
    
    if (authData.cookies) await page.context().addCookies(authData.cookies);
    if (authData.localStorage) {
      await page.evaluate((storage) => {
        for (const [key, value] of Object.entries(storage)) localStorage.setItem(key, value as string);
      }, authData.localStorage);
    }
    if (authData.sessionStorage) {
      await page.evaluate((storage) => {
        for (const [key, value] of Object.entries(storage)) sessionStorage.setItem(key, value as string);
      }, authData.sessionStorage);
    }
    
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    return await verifyLoginStatus(page);
  } catch (error) {
    console.log(`⚠️ 检查认证状态失败: ${error.message}`);
    return false;
  }
}

// 执行登录流程（账号走环境变量，不硬编码）
async function performLogin(page: Page): Promise<void> {
  console.log('🔑 开始执行登录流程');
  await page.waitForLoadState('domcontentloaded');
  
  const email = process.env.TEST_EMAIL || 'test@example.com';
  const password = process.env.TEST_PASSWORD || 'password123';
  
  // 用动态探测填写邮箱/密码/点击登录
  await executeWithDynamicDetection(page, '邮箱输入框', 'fill', email, 1);
  await executeWithDynamicDetection(page, '密码输入框', 'fill', password, 2);
  await executeWithDynamicDetection(page, '登录按钮', 'click', undefined, 3);
  
  await waitForLoginComplete(page);
  console.log('✅ 登录流程完成');
}

// 等待登录完成
async function waitForLoginComplete(page: Page): Promise<void> {
  try {
    await Promise.race([
      page.waitForURL(url => !/login|\/auth\/|sso/i.test(url.toString()), { timeout: 15000 }),
      page.waitForFunction(() => {
        const loginElements = document.querySelectorAll('input[type="password"], button:has-text("登录"), button:has-text("Login")');
        return loginElements.length === 0;
      }, { timeout: 15000 }),
      page.waitForSelector('[data-testid*="user"], .user-info, .profile', { timeout: 15000 })
    ]);
    await page.waitForTimeout(2000);
  } catch (error) {
    console.log('⚠️ 登录完成检测超时，继续执行');
  }
}

// 保存认证状态
async function saveAuthState(page: Page): Promise<void> {
  try {
    console.log('💾 保存认证状态');
    const authDir = './playwright/.auth';
    await fs.mkdir(authDir, { recursive: true });
    
    const authData = {
      cookies: await page.context().cookies(),
      localStorage: await page.evaluate(() => {
        const storage = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) storage[key] = localStorage.getItem(key);
        }
        return storage;
      }),
      sessionStorage: await page.evaluate(() => {
        const storage = {};
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key) storage[key] = sessionStorage.getItem(key);
        }
        return storage;
      }),
      timestamp: new Date().toISOString(),
      url: page.url()
    };
    
    await fs.writeFile('./playwright/.auth/user.json', JSON.stringify(authData, null, 2));
    console.log('✅ 认证状态已保存');
  } catch (error) {
    console.log(`⚠️ 保存认证状态失败: ${error.message}`);
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try { await fs.access(filePath); return true; } catch { return false; }
}

export default setup;
```

> **安全**：`playwright/.auth/user.json` 含登录态，必须加入 `.gitignore`，不入库；
> 账号密码一律走环境变量 `TEST_EMAIL`/`TEST_PASSWORD`，不写进用例 JSON 或脚本。

### 第 3 步：登录操作过滤器（生成脚本时移除登录步骤）

```typescript
// 脚本生成时的登录操作过滤器
class LoginActionFilter {
  private loginRelatedKeywords: Set<string> = new Set([
    // 中文
    '登录', '用户名', '密码', '邮箱', '验证码', '登录按钮',
    '用户名输入框', '密码输入框', '邮箱输入框', '验证码输入框',
    // 英文
    'login', 'signin', 'sign in', 'username', 'password', 'email',
    'login button', 'signin button', 'username input', 'password input',
    'email input', 'auth', 'authentication', 'sso',
    // 通用
    'captcha', 'verification', 'code'
  ]);
  
  isLoginRelatedAction(actionDescription: string): boolean {
    const lowerDesc = actionDescription.toLowerCase();
    for (const keyword of this.loginRelatedKeywords) {
      if (lowerDesc.includes(keyword.toLowerCase())) return true;
    }
    if (lowerDesc.includes('sso') || lowerDesc.includes('auth') || lowerDesc.includes('login')) return true;
    return false;
  }
  
  // 过滤测试步骤，移除登录相关操作
  filterTestSteps(testSteps: TestStep[]): TestStep[] {
    const filteredSteps = testSteps.filter(step => {
      const isLoginAction = this.isLoginRelatedAction(step.description);
      if (isLoginAction) {
        console.log(`🚫 过滤登录相关操作: ${step.description}`);
        return false;
      }
      return true;
    });
    
    console.log(`✅ 过滤完成，保留 ${filteredSteps.length} 个业务操作步骤`);
    return filteredSteps;
  }
  
  generateAuthComment(): string {
    return `  // 注意：此脚本已自动移除登录相关操作
  // 登录认证通过 tests/auth.setup.ts 处理
  // 执行前请确保 auth.setup.ts 文件存在并包含正确的登录逻辑`;
  }
}

interface TestStep {
  description: string;
  action: string;
  value?: string;
  stepIndex: number;
}
```

## 集成到测试流程

```typescript
// 集成 auth.setup 的测试执行
async function executeTestWithAuthSetup(page: Page, testCase: TestCase, baseUrl: string): Promise<void> {
  console.log(`🚀 开始执行测试: ${testCase.name}`);
  
  await page.goto(testCase.url);
  await page.waitForLoadState('domcontentloaded');
  
  // 检测登录需求并执行 auth.setup
  await detectAndExecuteAuthSetup(page, testCase.url);
  
  // 执行业务测试步骤（过滤掉登录操作）
  const loginFilter = new LoginActionFilter();
  const businessSteps = loginFilter.filterTestSteps(testCase.steps);
  
  for (const step of businessSteps) {
    await executeWithDynamicDetection(page, step.description, step.action as any, step.value, step.stepIndex);
  }
  
  console.log(`✅ 测试执行完成: ${testCase.name}`);
}

// 生成最终脚本（不包含登录操作）
function generateProductionScript(testCase: TestCase): string {
  const loginFilter = new LoginActionFilter();
  const businessSteps = loginFilter.filterTestSteps(testCase.steps);
  
  let script = `import { test, expect } from '@playwright/test';

test('${testCase.name}', async ({ page }) => {
${loginFilter.generateAuthComment()}
  
  await page.goto('${testCase.url}');
  await page.waitForLoadState('domcontentloaded');
  
`;
  
  businessSteps.forEach((step, index) => {
    script += `  // 步骤${index + 1}: ${step.description}\n`;
    script += `  await executeWithDynamicDetection(page, '${step.description}', '${step.action}', ${step.value ? `'${step.value}'` : 'undefined'}, ${index + 1});\n\n`;
  });
  
  script += `  await page.screenshot({
    path: '.csp/artifacts/verify/evidence/${testCase.name}-results/success.png',
    fullPage: true
  });
});`;
  
  return script;
}
```

## 最佳实践

### 1. auth.setup 设计原则
- 保持登录逻辑的独立性和可重用性
- 支持认证状态的缓存和复用（24h 有效期）
- 提供完整的错误处理和日志记录
- 使用环境变量管理敏感信息

### 2. 登录检测优化
- 智能判断登录需求，避免不必要的执行
- 支持多种登录状态验证方式
- 提供备用检测机制确保稳定性

### 3. 脚本生成优化
- 智能过滤登录相关操作
- 保持业务逻辑的完整性
- 添加清晰的认证依赖说明

### 4. 维护和扩展
- 定期更新登录关键词库
- 支持不同项目的登录流程定制
- 提供登录状态的监控和诊断工具
