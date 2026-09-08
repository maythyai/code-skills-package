# 页面快照分析定位策略

## 核心理念

**智能快照分析**：在执行每个动作之前，先保存当前页面快照，然后对页面元素进行深度分析，
选择最匹配的元素再执行动作，从而大幅提升元素定位的准确性和稳定性。

## 快照分析工作流程

### 第 1 步：动作前快照保存

```typescript
// 标准快照保存函数
async function saveActionSnapshot(page: Page, actionName: string, stepIndex: number): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const snapshotPath = `.csp/artifacts/verify/evidence/{{filename}}/{{testName}}-snapshots/step-${stepIndex}-${actionName}-${timestamp}.png`;
  
  await page.screenshot({
    path: snapshotPath,
    fullPage: true
  });
  
  console.log(`📸 快照已保存: ${snapshotPath}`);
  return snapshotPath;
}

// 使用示例
await saveActionSnapshot(page, 'before-click-search', 1);
```

### 第 2 步：页面元素分析

```typescript
// 页面元素深度分析函数
async function analyzePageElements(page: Page, targetAction: string): Promise<ElementAnalysis[]> {
  console.log(`🔍 开始分析页面元素，目标动作: ${targetAction}`);
  
  // 获取所有可交互元素
  const interactiveElements = await page.locator('button, input, select, textarea, a, [role="button"], [role="link"], [role="textbox"]').all();
  
  const analysis: ElementAnalysis[] = [];
  
  for (let i = 0; i < interactiveElements.length; i++) {
    const element = interactiveElements[i];
    
    try {
      // 检查元素可见性
      const isVisible = await element.isVisible();
      if (!isVisible) continue;
      
      // 获取元素属性
      const elementInfo = {
        index: i,
        tagName: await element.evaluate(el => el.tagName.toLowerCase()),
        id: await element.getAttribute('id') || '',
        className: await element.getAttribute('class') || '',
        text: await element.textContent() || '',
        placeholder: await element.getAttribute('placeholder') || '',
        title: await element.getAttribute('title') || '',
        role: await element.getAttribute('role') || '',
        type: await element.getAttribute('type') || '',
        name: await element.getAttribute('name') || '',
        testId: await element.getAttribute('data-testid') || '',
        ariaLabel: await element.getAttribute('aria-label') || '',
        boundingBox: await element.boundingBox()
      };
      
      // 计算匹配度分数
      const matchScore = calculateMatchScore(elementInfo, targetAction);
      
      analysis.push({
        element,
        info: elementInfo,
        matchScore,
        locatorStrategies: generateLocatorStrategies(elementInfo)
      });
      
    } catch (error) {
      console.log(`⚠️ 分析元素 ${i} 时出错: ${error.message}`);
    }
  }
  
  // 按匹配度排序
  analysis.sort((a, b) => b.matchScore - a.matchScore);
  
  console.log(`✅ 页面元素分析完成，找到 ${analysis.length} 个可交互元素`);
  return analysis;
}

interface ElementAnalysis {
  element: Locator;
  info: ElementInfo;
  matchScore: number;
  locatorStrategies: string[];
}

interface ElementInfo {
  index: number;
  tagName: string;
  id: string;
  className: string;
  text: string;
  placeholder: string;
  title: string;
  role: string;
  type: string;
  name: string;
  testId: string;
  ariaLabel: string;
  boundingBox: any;
}
```

### 第 3 步：智能匹配度计算

```typescript
// 智能匹配度计算算法
function calculateMatchScore(elementInfo: ElementInfo, targetAction: string): number {
  let score = 0;
  const action = targetAction.toLowerCase();
  
  // ID 匹配（最高权重：50 分）
  if (elementInfo.id) {
    if (action.includes(elementInfo.id.toLowerCase())) score += 50;
    if (elementInfo.id.toLowerCase().includes(extractKeyword(action))) score += 30;
  }
  
  // 文本内容匹配（高权重：40 分）
  if (elementInfo.text) {
    const text = elementInfo.text.toLowerCase().replace(/\s+/g, '');
    const actionText = action.replace(/\s+/g, '');
    if (text.includes(actionText) || actionText.includes(text)) score += 40;
    
    // 关键词匹配
    const keywords = extractKeywords(action);
    keywords.forEach(keyword => {
      if (text.includes(keyword)) score += 15;
    });
  }
  
  // TestId 匹配（高权重：35 分）
  if (elementInfo.testId) {
    if (action.includes(elementInfo.testId.toLowerCase())) score += 35;
  }
  
  // Placeholder 匹配（中权重：25 分）
  if (elementInfo.placeholder) {
    const placeholder = elementInfo.placeholder.toLowerCase();
    if (placeholder.includes(extractKeyword(action))) score += 25;
  }
  
  // Title 匹配（中权重：20 分）
  if (elementInfo.title) {
    const title = elementInfo.title.toLowerCase();
    if (title.includes(extractKeyword(action))) score += 20;
  }
  
  // AriaLabel 匹配（中权重：20 分）
  if (elementInfo.ariaLabel) {
    const ariaLabel = elementInfo.ariaLabel.toLowerCase();
    if (ariaLabel.includes(extractKeyword(action))) score += 20;
  }
  
  // 元素类型匹配（低权重：10 分）
  if (action.includes('点击') || action.includes('click')) {
    if (['button', 'a'].includes(elementInfo.tagName)) score += 10;
    if (elementInfo.role === 'button' || elementInfo.role === 'link') score += 10;
  }
  
  if (action.includes('输入') || action.includes('填写') || action.includes('input')) {
    if (['input', 'textarea'].includes(elementInfo.tagName)) score += 10;
    if (elementInfo.role === 'textbox') score += 10;
  }
  
  if (action.includes('选择') || action.includes('select')) {
    if (elementInfo.tagName === 'select') score += 10;
    if (elementInfo.role === 'combobox') score += 10;
  }
  
  // 位置权重（可见元素优先：5 分）
  if (elementInfo.boundingBox) score += 5;
  
  return score;
}

// 关键词提取函数
function extractKeyword(action: string): string {
  const keywords = action.match(/[一-龥]+|[a-zA-Z]+/g) || [];
  return keywords.join('').toLowerCase();
}

function extractKeywords(action: string): string[] {
  return action.match(/[一-龥]+|[a-zA-Z]+/g) || [];
}
```

### 第 4 步：最优元素选择与执行

```typescript
// 智能元素选择与执行
async function executeActionWithAnalysis(
  page: Page, 
  actionName: string, 
  actionType: 'click' | 'fill' | 'select',
  value?: string,
  stepIndex: number = 0
): Promise<void> {
  
  // 1. 保存动作前快照
  await saveActionSnapshot(page, `before-${actionName}`, stepIndex);
  
  // 2. 分析页面元素
  const analysis = await analyzePageElements(page, actionName);
  
  if (analysis.length === 0) {
    throw new Error(`❌ 未找到与动作"${actionName}"匹配的元素`);
  }
  
  // 3. 选择最佳匹配元素
  const bestMatch = analysis[0];
  console.log(`🎯 选择最佳匹配元素 (得分: ${bestMatch.matchScore})`);
  console.log(`   - 标签: ${bestMatch.info.tagName}`);
  console.log(`   - ID: ${bestMatch.info.id}`);
  console.log(`   - 文本: ${bestMatch.info.text}`);
  console.log(`   - 类名: ${bestMatch.info.className}`);
  
  // 4. 执行动作前等待元素可见
  await bestMatch.element.waitFor({ state: 'visible', timeout: 5000 });
  
  // 5. 执行具体动作
  try {
    switch (actionType) {
      case 'click':
        await bestMatch.element.click();
        console.log(`✅ 点击动作执行成功: ${actionName}`);
        break;
        
      case 'fill':
        if (!value) throw new Error('填写动作需要提供值');
        await bestMatch.element.fill(value);
        console.log(`✅ 填写动作执行成功: ${actionName} = ${value}`);
        break;
        
      case 'select':
        if (!value) throw new Error('选择动作需要提供值');
        await bestMatch.element.selectOption(value);
        console.log(`✅ 选择动作执行成功: ${actionName} = ${value}`);
        break;
    }
    
    // 6. 保存动作后快照
    await saveActionSnapshot(page, `after-${actionName}`, stepIndex);
    
    // 7. 等待页面稳定
    await page.waitForTimeout(500);
    
  } catch (error) {
    console.error(`❌ 执行动作失败: ${actionName}`);
    
    // 尝试备选元素
    if (analysis.length > 1) {
      console.log(`🔄 尝试备选元素 (得分: ${analysis[1].matchScore})`);
      const fallbackElement = analysis[1];
      
      await fallbackElement.element.waitFor({ state: 'visible', timeout: 5000 });
      
      switch (actionType) {
        case 'click':
          await fallbackElement.element.click();
          break;
        case 'fill':
          await fallbackElement.element.fill(value!);
          break;
        case 'select':
          await fallbackElement.element.selectOption(value!);
          break;
      }
      
      console.log(`✅ 备选元素执行成功: ${actionName}`);
      await saveActionSnapshot(page, `after-${actionName}-fallback`, stepIndex);
    } else {
      throw error;
    }
  }
}

// 使用示例
await executeActionWithAnalysis(page, '搜索按钮', 'click', undefined, 1);
await executeActionWithAnalysis(page, '用户名输入框', 'fill', 'admin', 2);
await executeActionWithAnalysis(page, '用户类型下拉框', 'select', '管理员', 3);
```

## 快照分析优势

### 🎯 精准定位
- 通过多维度分析提高元素匹配准确性
- 智能评分系统选择最佳匹配元素
- 支持备选元素自动切换

### 📸 可视化调试
- 每个动作前后都有完整的页面快照
- 便于问题排查和测试结果验证
- 提供详细的元素分析日志

### 🔄 自适应能力
- 动态适应页面结构变化
- 智能处理元素属性变更
- 支持多种定位策略组合

### 🛡️ 容错机制
- 主要元素失败时自动尝试备选元素
- 完整的错误处理和日志记录
- 确保测试执行的稳定性

## 集成到测试流程

```typescript
// 完整的测试步骤示例
test('用户搜索功能测试', async ({ page }) => {
  await page.goto('{{baseUrl}}{{url}}');
  await page.waitForLoadState('domcontentloaded');
  
  // 步骤1：填写搜索输入框
  await executeActionWithAnalysis(page, '搜索输入框', 'fill', '测试用户', 1);
  
  // 步骤2：点击搜索按钮
  await executeActionWithAnalysis(page, '搜索按钮', 'click', undefined, 2);
  
  // 步骤3：验证搜索结果
  await saveActionSnapshot(page, 'search-results', 3);
  await expect(page.getByText('搜索结果')).toBeVisible({ timeout: 5000 });
  
  // 最终成功快照
  await page.screenshot({
    path: `.csp/artifacts/verify/evidence/{{filename}}/{{testName}}-results/final-success.png`,
    fullPage: true
  });
});
```

## 最佳实践

### 1. 快照命名规范
- 使用描述性的动作名称
- 包含步骤序号便于排序
- 区分动作前后的快照

### 2. 元素分析优化
- 优先分析可见的交互元素
- 结合业务术语库提高匹配准确性
- 记录详细的分析过程便于调试

### 3. 性能考虑
- 合理控制快照保存频率
- 优化元素分析算法性能
- 设置合适的超时时间

### 4. 错误处理
- 提供完整的备选方案
- 记录详细的错误信息
- 保存失败时的页面状态
