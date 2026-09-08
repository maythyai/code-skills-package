# 动态探测定位策略

## 核心理念

**智能动态探测**：在执行测试用例时，通过 Playwright 动态探测页面，为同一元素收集多种定位方式，
按稳定性排序后尝试定位。成功的定位方式将被保存到经验库中，供后续测试用例参考学习。

## 动态探测工作流程

### 1. 智能策略生成

```typescript
// 基于动作描述生成多种定位策略
async function generateDynamicStrategies(
  page: Page, 
  actionDescription: string, 
  actionType: 'click' | 'fill' | 'select'
): Promise<LocatorStrategy[]> {
  
  const strategies: LocatorStrategy[] = [];
  const keywords = extractKeywords(actionDescription);
  const mainKeyword = extractMainKeyword(actionDescription);
  
  // 1. ID 策略组（最高优先级）
  const possibleIds = generatePossibleIds(keywords);
  possibleIds.forEach(id => {
    strategies.push({
      name: `ID定位-${id}`,
      getLocator: () => page.locator(`#${id}`),
      priority: 100,
      type: 'id'
    });
  });
  
  // 2. 业务术语策略组
  const termInfo = await queryBusinessTerm(mainKeyword);
  if (termInfo) {
    const allTerms = [mainKeyword, ...(termInfo.aliases || [])];
    allTerms.forEach(term => {
      strategies.push({
        name: `术语定位-${term}`,
        getLocator: () => page.getByLabel(createSpaceIgnorePattern(term)),
        priority: 90,
        type: 'business-term'
      });
    });
  }
  
  // 3. 语义化策略组
  strategies.push(...generateRoleStrategies(actionDescription, actionType));
  
  // 4. 邻近元素策略组
  strategies.push(...generateAdjacentStrategies(actionDescription, actionType));
  
  // 5. 文本策略组
  strategies.push(...generateTextStrategies(actionDescription, keywords));
  
  return strategies.sort((a, b) => b.priority - a.priority);
}

interface LocatorStrategy {
  name: string;
  getLocator: () => Locator;
  priority: number;
  type: string;
}
```

### 2. 稳定性测试与排序

```typescript
// 测试策略稳定性并排序
async function testAndRankStrategies(
  strategies: LocatorStrategy[], 
  testRounds: number = 3
): Promise<StrategyResult[]> {
  
  const results: StrategyResult[] = [];
  
  for (const strategy of strategies) {
    let successCount = 0;
    let totalResponseTime = 0;
    
    // 多轮测试
    for (let round = 0; round < testRounds; round++) {
      try {
        const startTime = Date.now();
        const locator = strategy.getLocator();
        await locator.waitFor({ state: 'visible', timeout: 2000 });
        const endTime = Date.now();
        
        successCount++;
        totalResponseTime += (endTime - startTime);
      } catch (error) {
        // 记录失败
      }
    }
    
    const successRate = successCount / testRounds;
    const avgResponseTime = successCount > 0 ? totalResponseTime / successCount : Infinity;
    const stabilityScore = calculateStabilityScore(successRate, avgResponseTime, strategy.priority);
    
    results.push({
      strategy,
      successRate,
      avgResponseTime,
      stabilityScore
    });
  }
  
  return results.sort((a, b) => b.stabilityScore - a.stabilityScore);
}

interface StrategyResult {
  strategy: LocatorStrategy;
  successRate: number;
  avgResponseTime: number;
  stabilityScore: number;
}

// 计算稳定性分数
function calculateStabilityScore(
  successRate: number, 
  avgResponseTime: number, 
  basePriority: number
): number {
  const successScore = successRate * 100;
  const speedScore = Math.max(0, 100 - (avgResponseTime / 50));
  const priorityScore = (basePriority / 100) * 100;
  
  return (successScore * 0.7) + (speedScore * 0.2) + (priorityScore * 0.1);
}
```

### 3. 动态执行与容错

```typescript
// 使用动态探测执行动作
async function executeWithDynamicDetection(
  page: Page,
  actionDescription: string,
  actionType: 'click' | 'fill' | 'select',
  value?: string
): Promise<ExecutionResult> {
  
  // 1. 查询历史经验
  const historicalExperience = await queryLocatorExperience(actionDescription, page.url());
  
  // 2. 生成动态策略
  const dynamicStrategies = await generateDynamicStrategies(page, actionDescription, actionType);
  
  // 3. 合并策略
  const allStrategies = mergeStrategiesWithExperience(dynamicStrategies, historicalExperience);
  
  // 4. 测试策略稳定性
  const rankedStrategies = await testAndRankStrategies(allStrategies);
  
  // 5. 执行最佳策略
  const executionResult = await executeTopStrategy(rankedStrategies, actionType, value);
  
  // 6. 保存执行经验
  await saveExecutionExperience(actionDescription, page.url(), executionResult, rankedStrategies);
  
  return executionResult;
}

// 执行最佳策略
async function executeTopStrategy(
  rankedStrategies: StrategyResult[],
  actionType: 'click' | 'fill' | 'select',
  value?: string
): Promise<ExecutionResult> {
  
  const successfulStrategies = rankedStrategies.filter(r => r.successRate > 0);
  
  if (successfulStrategies.length === 0) {
    throw new Error('❌ 所有定位策略都失败了');
  }
  
  // 尝试前 3 个最佳策略
  for (let i = 0; i < Math.min(3, successfulStrategies.length); i++) {
    const strategyResult = successfulStrategies[i];
    const strategy = strategyResult.strategy;
    
    try {
      const locator = strategy.getLocator();
      await locator.waitFor({ state: 'visible', timeout: 5000 });
      
      // 执行具体动作
      switch (actionType) {
        case 'click':
          await locator.click();
          break;
        case 'fill':
          await locator.fill(value!);
          break;
        case 'select':
          await locator.selectOption(value!);
          break;
      }
      
      return {
        success: true,
        usedStrategy: strategy,
        executionTime: Date.now(),
        allTestedStrategies: rankedStrategies
      };
      
    } catch (error) {
      if (i === Math.min(3, successfulStrategies.length) - 1) {
        throw new Error(`所有备选策略都执行失败: ${error.message}`);
      }
    }
  }
}

interface ExecutionResult {
  success: boolean;
  usedStrategy: LocatorStrategy;
  executionTime: number;
  allTestedStrategies: StrategyResult[];
}
```

## 策略生成器

### 角色策略生成
```typescript
function generateRoleStrategies(actionDescription: string, actionType: string): LocatorStrategy[] {
  const strategies = [];
  const pattern = createSpaceIgnorePattern(actionDescription);

  if (actionType === 'click') {
    // 按钮角色定位
    strategies.push({
      name: '角色定位-button',
      getLocator: () => page.getByRole('button', { name: new RegExp(pattern) }),
      priority: 85,
      type: 'role'
    });

    // 通用可点击元素定位
    strategies.push({
      name: '通用点击-多元素类型',
      getLocator: () => page.locator('button, a, [onclick], [role="button"], span[onclick], div[onclick]').filter({ hasText: new RegExp(pattern) }),
      priority: 80,
      type: 'clickable-multi'
    });
  }
  
  if (actionType === 'fill') {
    strategies.push({
      name: '角色定位-textbox',
      getLocator: () => page.getByRole('textbox', { name: new RegExp(pattern) }),
      priority: 85,
      type: 'role'
    });
  }
  
  if (actionType === 'select') {
    strategies.push({
      name: '角色定位-combobox',
      getLocator: () => page.getByRole('combobox', { name: new RegExp(pattern) }),
      priority: 85,
      type: 'role'
    });
  }
  
  return strategies;
}
```

### 邻近元素策略生成
```typescript
function generateAdjacentStrategies(actionDescription: string, actionType: string): LocatorStrategy[] {
  const strategies = [];
  const pattern = createSpaceIgnorePattern(actionDescription);
  
  if (actionType === 'fill') {
    // 1. 父容器定位（最优）
    strategies.push({
      name: '邻近定位-父容器输入框',
      getLocator: () => page.locator(`:has-text("${actionDescription}") input, :has-text("${actionDescription}") textarea`).first(),
      priority: 85,
      type: 'adjacent-container'
    });
    
    // 2. Ant Design 表单行级定位
    strategies.push({
      name: '邻近定位-Ant表单行',
      getLocator: () => {
        const formRow = page.locator('.ant-form-item, .ant4-form-item')
          .filter({ hasText: new RegExp(pattern) });
        return formRow.locator('input, textarea').first();
      },
      priority: 82,
      type: 'adjacent-antd'
    });
  }
  
  if (actionType === 'select') {
    // 1. 父容器定位下拉框（最优）
    strategies.push({
      name: '邻近定位-父容器下拉框',
      getLocator: () => page.locator(`:has-text("${actionDescription}") select, :has-text("${actionDescription}") .ant-select`).first(),
      priority: 85,
      type: 'adjacent-container'
    });
    
    // 2. Ant Design 表单行级定位下拉框
    strategies.push({
      name: '邻近定位-Ant表单行下拉框',
      getLocator: () => {
        const formRow = page.locator('.ant-form-item, .ant4-form-item')
          .filter({ hasText: new RegExp(pattern) });
        return formRow.locator('select, .ant-select, [role="combobox"]').first();
      },
      priority: 82,
      type: 'adjacent-antd'
    });
  }
  
  return strategies;
}
```

## 工具函数

```typescript
// 提取关键词
function extractKeywords(text: string): string[] {
  const chineseWords = text.match(/[\u4e00-\u9fa5]+/g) || [];
  const englishWords = text.match(/[a-zA-Z]+/g) || [];
  const numbers = text.match(/\d+/g) || [];
  return [...chineseWords, ...englishWords, ...numbers].filter(word => word.length > 0);
}

// 提取主关键词
function extractMainKeyword(text: string): string {
  const keywords = extractKeywords(text);
  return keywords.reduce((longest, current) => 
    current.length > longest.length ? current : longest, '');
}

// 生成可能的 ID 值
function generatePossibleIds(keywords: string[]): string[] {
  const ids = [];
  keywords.forEach(keyword => {
    ids.push(keyword.toLowerCase());
    ids.push(`${keyword.toLowerCase()}-input`);
    ids.push(`${keyword.toLowerCase()}-button`);
    ids.push(`${keyword.toLowerCase()}-select`);
  });
  return [...new Set(ids)];
}

// 创建忽略空格的正则模式
function createSpaceIgnorePattern(text: string): string {
  return text.split('').join('\\s*').replace(/^\s*/, '^\\s*').replace(/\s*$/, '\\s*$');
}
```

## 最佳实践

1. **策略生成优化**：基于动作类型生成针对性策略
2. **稳定性测试**：多轮测试确保策略可靠性
3. **容错机制**：提供多个备选策略
4. **性能优化**：合理控制测试轮数，缓存成功策略
