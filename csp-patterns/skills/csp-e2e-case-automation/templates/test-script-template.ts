import { test, expect } from '@playwright/test';

// 最小测试脚本骨架：新建用例时先用此骨架，再逐步填充步骤

test('{{testName}}', async ({ page }) => {
  await page.goto('{{baseUrl}}{{url}}');
  await page.waitForLoadState('domcontentloaded');

  // 根据实际测试步骤替换以下内容

  // 截图保存
  await page.screenshot({
    path: `.csp/artifacts/verify/evidence/{{filename}}/{{testName}}-results/success.png`,
    fullPage: true
  });
});
