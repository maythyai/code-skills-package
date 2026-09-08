import { test, expect } from '@playwright/test';

// 生产脚本模板：用例通过后沉淀为确定性 .spec.ts
// 生成规则：
//   1. 过滤所有登录相关步骤（登录由 tests/auth.setup 统一处理）
//   2. 验证/校验类步骤必须生成 expect 强校验
//   3. 移除 console.log / 思考注释 / 尝试性代码 / 性能监控
//   4. 文本匹配统一用忽略字间空格的正则
//   5. 每个操作前 waitFor({ state: 'visible', timeout: 5000 })

test('{{testName}}', async ({ page }) => {
  // 注意：此脚本已自动移除登录相关操作
  // 登录认证通过 tests/auth.setup 处理

  await page.goto('{{baseUrl}}{{url}}');
  await page.waitForLoadState('domcontentloaded');

  // ── 测试步骤（确定性，不依赖运行时动态探测） ──
  // 示例（按实际用例步骤替换）：
  //
  // const searchInput = page.getByLabel(/^\s*搜\s*索\s*关\s*键\s*词\s*$/);
  // await searchInput.waitFor({ state: 'visible', timeout: 5000 });
  // await searchInput.fill('testuser');
  //
  // const searchButton = page.getByRole('button', { name: /^\s*搜\s*索\s*$/ });
  // await searchButton.waitFor({ state: 'visible', timeout: 5000 });
  // await searchButton.click();
  //
  // await expect(page.getByText(/^\s*testuser\s*$/)).toBeVisible({ timeout: 5000 });

  await page.screenshot({
    path: '.csp/artifacts/verify/evidence/{{filename}}/{{testName}}-results/success.png',
    fullPage: true
  });
});
