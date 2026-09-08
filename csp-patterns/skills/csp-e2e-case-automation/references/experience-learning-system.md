# 经验学习积累系统

## 核心理念

**智能经验学习**：每次测试执行成功后，系统会自动总结元素定位经验，包括成功的定位策略、
页面上下文、稳定性数据等，形成知识库供后续测试用例学习参考，持续提升定位准确性。

> 经验库与 [terminology/business-terms.json](../terminology/business-terms.json) 互补：
> 术语库是"语义"知识（术语→别名/场景），经验库是"实证"知识（动作+页面→成功定位器）。

## 经验数据结构

### 核心数据模型

```typescript
interface LocatorExperience {
  // 基础信息
  id: string;                          // 经验唯一标识
  actionDescription: string;           // 动作描述
  actionType: 'click' | 'fill' | 'select'; // 动作类型
  
  // 页面上下文
  pageContext: {
    url: string;                       // 页面 URL
    title: string;                     // 页面标题
    domain: string;                    // 域名
    framework?: string;                // 前端框架 (React, Vue, Angular 等)
    uiLibrary?: string;               // UI 库 (Ant Design, Element UI 等)
  };
  
  // 成功策略
  successfulStrategies: SuccessfulStrategy[];
  
  // 失败策略
  failedStrategies: FailedStrategy[];
  
  // 元数据
  metadata: {
    createdAt: Date;                   // 创建时间
    lastUsed: Date;                    // 最后使用时间
    usageCount: number;                // 使用次数
    successRate: number;               // 总体成功率
    tags: string[];                    // 标签
    notes?: string;                    // 备注
  };
  
  // 关联信息
  relatedTerms: string[];              // 相关业务术语
  similarExperiences: string[];        // 相似经验 ID
}

interface SuccessfulStrategy {
  name: string;                        // 策略名称
  locatorCode: string;                 // 定位器代码
  type: string;                        // 策略类型
  priority: number;                    // 优先级
  stabilityScore: number;              // 稳定性分数
  avgResponseTime: number;             // 平均响应时间
  successRate: number;                 // 成功率
  lastSuccessTime: Date;               // 最后成功时间
  usageCount: number;                  // 使用次数
}

interface FailedStrategy {
  name: string;                        // 策略名称
  locatorCode: string;                 // 定位器代码
  type: string;                        // 策略类型
  failureReasons: string[];            // 失败原因
  failureCount: number;                // 失败次数
  lastFailureTime: Date;               // 最后失败时间
}
```

## 经验学习流程

### 第 1 步：经验收集

```typescript
// 收集执行经验
async function collectExecutionExperience(
  actionDescription: string,
  actionType: 'click' | 'fill' | 'select',
  page: Page,
  executionResult: ExecutionResult
): Promise<LocatorExperience> {
  
  console.log(`📝 开始收集执行经验: ${actionDescription}`);
  
  // 1. 收集页面上下文
  const pageContext = await collectPageContext(page);
  
  // 2. 分析成功和失败的策略
  const { successfulStrategies, failedStrategies } = analyzeStrategyResults(executionResult.allTestedStrategies);
  
  // 3. 提取相关术语
  const relatedTerms = await extractRelatedTerms(actionDescription, pageContext);
  
  // 4. 生成经验记录
  const experience: LocatorExperience = {
    id: generateExperienceId(actionDescription, pageContext.url),
    actionDescription,
    actionType,
    pageContext,
    successfulStrategies,
    failedStrategies,
    metadata: {
      createdAt: new Date(),
      lastUsed: new Date(),
      usageCount: 1,
      successRate: executionResult.success ? 1.0 : 0.0,
      tags: generateTags(actionDescription, pageContext),
      notes: `自动生成于${new Date().toLocaleString()}`
    },
    relatedTerms,
    similarExperiences: []
  };
  
  console.log(`✅ 经验收集完成，包含 ${successfulStrategies.length} 个成功策略，${failedStrategies.length} 个失败策略`);
  return experience;
}

// 收集页面上下文
async function collectPageContext(page: Page): Promise<PageContext> {
  const url = page.url();
  const title = await page.title();
  const domain = new URL(url).hostname;
  
  // 检测前端框架
  const framework = await detectFramework(page);
  
  // 检测 UI 库
  const uiLibrary = await detectUILibrary(page);
  
  return { url, title, domain, framework, uiLibrary };
}

// 检测前端框架
async function detectFramework(page: Page): Promise<string | undefined> {
  try {
    const frameworks = await page.evaluate(() => {
      const detectedFrameworks = [];
      
      // 检测 React
      if (window.React || document.querySelector('[data-reactroot]') || document.querySelector('div[id="root"]')) {
        detectedFrameworks.push('React');
      }
      
      // 检测 Vue
      if (window.Vue || document.querySelector('[data-v-]') || document.querySelector('div[id="app"]')) {
        detectedFrameworks.push('Vue');
      }
      
      // 检测 Angular
      if (window.ng || document.querySelector('[ng-app]') || document.querySelector('app-root')) {
        detectedFrameworks.push('Angular');
      }
      
      return detectedFrameworks;
    });
    
    return frameworks.length > 0 ? frameworks[0] : undefined;
  } catch (error) {
    return undefined;
  }
}

// 检测 UI 库
async function detectUILibrary(page: Page): Promise<string | undefined> {
  try {
    const uiLibraries = await page.evaluate(() => {
      const detectedLibraries = [];
      
      // 检测 Ant Design
      if (document.querySelector('.ant-btn, .ant4-btn, .antd-btn')) {
        detectedLibraries.push('Ant Design');
      }
      
      // 检测 Element UI
      if (document.querySelector('.el-button, .el-input, .el-form')) {
        detectedLibraries.push('Element UI');
      }
      
      // 检测 Material UI
      if (document.querySelector('.MuiButton-root, .MuiTextField-root')) {
        detectedLibraries.push('Material UI');
      }
      
      return detectedLibraries;
    });
    
    return uiLibraries.length > 0 ? uiLibraries[0] : undefined;
  } catch (error) {
    return undefined;
  }
}
```

### 第 2 步：经验存储

```typescript
// 经验存储管理器
class ExperienceStorageManager {
  private experienceFile = './locator-experiences.json';
  private experiences: Map<string, LocatorExperience> = new Map();
  
  // 加载经验库
  async loadExperiences(): Promise<void> {
    try {
      if (await this.fileExists(this.experienceFile)) {
        const data = await fs.readFile(this.experienceFile, 'utf-8');
        const experienceArray = JSON.parse(data);
        
        experienceArray.forEach((exp: LocatorExperience) => {
          this.experiences.set(exp.id, exp);
        });
        
        console.log(`📚 加载了 ${this.experiences.size} 条历史经验`);
      }
    } catch (error) {
      console.log(`⚠️ 加载经验库失败: ${error.message}`);
    }
  }
  
  // 保存经验（命中相似经验时走合并，不覆盖）
  async saveExperience(experience: LocatorExperience): Promise<void> {
    const existingExperience = await this.findSimilarExperience(experience);
    
    if (existingExperience) {
      // 合并经验：更新成功率加权、usageCount+1，不丢失历史策略
      const mergedExperience = this.mergeExperiences(existingExperience, experience);
      this.experiences.set(mergedExperience.id, mergedExperience);
      console.log(`🔄 合并经验: ${experience.actionDescription}`);
    } else {
      // 新增经验
      this.experiences.set(experience.id, experience);
      console.log(`➕ 新增经验: ${experience.actionDescription}`);
    }
    
    await this.persistToFile();
  }
  
  // 查询经验（按动作描述+域名+动作类型相似度）
  async queryExperiences(
    actionDescription: string, 
    pageUrl: string, 
    actionType?: string
  ): Promise<LocatorExperience[]> {
    
    const results = [];
    const domain = new URL(pageUrl).hostname;
    
    for (const experience of this.experiences.values()) {
      let score = 0;
      
      // 动作描述相似度（Jaccard）
      const descSimilarity = calculateTextSimilarity(actionDescription, experience.actionDescription);
      score += descSimilarity * 0.4;
      
      // 页面域名匹配
      if (experience.pageContext.domain === domain) {
        score += 0.3;
      }
      
      // 动作类型匹配
      if (actionType && experience.actionType === actionType) {
        score += 0.2;
      }
      
      // 最近使用时间（30 天内加分）
      const daysSinceLastUse = (Date.now() - new Date(experience.metadata.lastUsed).getTime()) / (1000 * 60 * 60 * 24);
      const recencyScore = Math.max(0, 1 - daysSinceLastUse / 30);
      score += recencyScore * 0.1;
      
      if (score > 0.3) { // 相似度阈值
        results.push({ experience, similarity: score });
      }
    }
    
    results.sort((a, b) => b.similarity - a.similarity);
    
    console.log(`🔍 找到 ${results.length} 条相关经验`);
    return results.slice(0, 10).map(r => r.experience); // 返回前 10 条
  }
  
  // 合并经验（累加而非覆盖）
  private mergeExperiences(existing: LocatorExperience, newExp: LocatorExperience): LocatorExperience {
    const mergedSuccessful = this.mergeSuccessfulStrategies(existing.successfulStrategies, newExp.successfulStrategies);
    const mergedFailed = this.mergeFailedStrategies(existing.failedStrategies, newExp.failedStrategies);
    
    const updatedMetadata = {
      ...existing.metadata,
      lastUsed: new Date(),
      usageCount: existing.metadata.usageCount + 1,
      successRate: (existing.metadata.successRate * existing.metadata.usageCount + newExp.metadata.successRate) / (existing.metadata.usageCount + 1)
    };
    
    return {
      ...existing,
      successfulStrategies: mergedSuccessful,
      failedStrategies: mergedFailed,
      metadata: updatedMetadata,
      relatedTerms: [...new Set([...existing.relatedTerms, ...newExp.relatedTerms])]
    };
  }
  
  private async persistToFile(): Promise<void> {
    try {
      const experienceArray = Array.from(this.experiences.values());
      await fs.writeFile(this.experienceFile, JSON.stringify(experienceArray, null, 2));
      console.log(`💾 经验库已保存，共 ${experienceArray.length} 条记录`);
    } catch (error) {
      console.error(`❌ 保存经验库失败: ${error.message}`);
    }
  }
}
```

### 第 3 步：经验学习与应用

```typescript
class ExperienceLearningApplier {
  private storageManager: ExperienceStorageManager;
  
  constructor() {
    this.storageManager = new ExperienceStorageManager();
  }
  
  async initialize(): Promise<void> {
    await this.storageManager.loadExperiences();
  }
  
  // 基于历史经验生成策略（优先级最高）
  async generateStrategiesFromExperience(
    actionDescription: string,
    pageUrl: string,
    actionType: 'click' | 'fill' | 'select'
  ): Promise<LocatorStrategy[]> {
    
    console.log(`🧠 基于历史经验生成策略: ${actionDescription}`);
    
    const relevantExperiences = await this.storageManager.queryExperiences(actionDescription, pageUrl, actionType);
    const strategies: LocatorStrategy[] = [];
    
    relevantExperiences.forEach((experience, expIndex) => {
      experience.successfulStrategies.forEach((successStrategy, stratIndex) => {
        strategies.push({
          name: `经验策略-${expIndex + 1}-${stratIndex + 1}`,
          getLocator: () => this.createLocatorFromCode(successStrategy.locatorCode),
          priority: this.calculateExperiencePriority(successStrategy, experience),
          type: 'experience',
          metadata: {
            sourceExperience: experience.id,
            originalStrategy: successStrategy,
            similarity: this.calculateSimilarity(actionDescription, experience.actionDescription)
          }
        });
      });
    });
    
    strategies.sort((a, b) => b.priority - a.priority);
    
    console.log(`✅ 从历史经验生成了 ${strategies.length} 个策略`);
    return strategies;
  }
  
  // 计算经验策略优先级
  private calculateExperiencePriority(strategy: SuccessfulStrategy, experience: LocatorExperience): number {
    let priority = strategy.priority;
    priority += strategy.successRate * 20;        // 成功率加权
    priority += strategy.stabilityScore * 0.3;    // 稳定性加权
    priority += Math.log(strategy.usageCount + 1) * 5; // 使用频率加权
    priority += experience.metadata.successRate * 10;  // 经验整体成功率
    const daysSinceLastUse = (Date.now() - new Date(experience.metadata.lastUsed).getTime()) / (1000 * 60 * 60 * 24);
    priority += Math.max(0, 10 - daysSinceLastUse);    // 最近使用加权
    return priority;
  }
  
  // 保存新的执行经验
  async saveExecutionExperience(
    actionDescription: string,
    actionType: 'click' | 'fill' | 'select',
    page: Page,
    executionResult: ExecutionResult
  ): Promise<void> {
    const experience = await collectExecutionExperience(actionDescription, actionType, page, executionResult);
    await this.storageManager.saveExperience(experience);
  }
}

const experienceLearner = new ExperienceLearningApplier();
```

## 工具函数

```typescript
// 文本相似度（Jaccard）
function calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = new Set(extractKeywords(text1));
  const words2 = new Set(extractKeywords(text2));
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  return intersection.size / union.size;
}

function extractKeywords(text: string): string[] {
  const chineseWords = text.match(/[一-龥]+/g) || [];
  const englishWords = text.match(/[a-zA-Z]+/g) || [];
  const numbers = text.match(/\d+/g) || [];
  return [...chineseWords, ...englishWords, ...numbers].filter(w => w.length > 0);
}

function generateExperienceId(actionDescription: string, url: string): string {
  const hash = require('crypto').createHash('md5');
  hash.update(actionDescription + url + Date.now());
  return hash.digest('hex').substring(0, 16);
}

function generateTags(actionDescription: string, pageContext: PageContext): string[] {
  const tags = [...extractKeywords(actionDescription)];
  if (pageContext.framework) tags.push(pageContext.framework);
  if (pageContext.uiLibrary) tags.push(pageContext.uiLibrary);
  tags.push(pageContext.domain);
  return [...new Set(tags)];
}
```

## 最佳实践

1. **经验质量控制**：定期清理过时记录；验证有效性；合并重复相似经验
2. **学习策略优化**：按成功率动态调整权重；考虑页面变化影响；平衡探索与利用
3. **存储性能优化**：用索引加速查询；定期压缩归档；增量更新
4. **经验共享**：经验库可入库 git，团队共享；建立评级与推荐机制

---

## 项目实战经验条目示例

> 以下是经验库中典型条目的形态示例（替换为你的项目实际页面）。经验条目应记录"通用规律 +
> 失败策略"，而非具体页面截图。

### 示例 1：优先使用业务语义类名定位表单字段

**适用场景**：某些后台页面表单字段使用 `col-{field}` / `{field}-col` 等业务语义类名作为容器

**背景**：当表单字段容器带有业务语义类名时，比 `.ant-form-item` + 文本过滤的组合更稳定精确。

**探测方法**：
```typescript
// 用 eval 探测字段的业务类名
await page.evaluate("document.querySelector('[class*=\"productName\"]')?.className");
```

**成功策略**：
```typescript
// ✅ 点击外层 .ant-select-selection 容器，并用 attached 替代 visible
// 原因：Ant Design Select 的 [role="combobox"] 被 Playwright 判定为 hidden，
// 但外层 .ant-select-selection 容器是真正可交互的元素
const selector = page.locator('.col-productName .ant-select-selection');
await selector.waitFor({ state: 'attached', timeout: 5000 });
await selector.click();
```

**失败策略（避免使用）**：
```typescript
// ❌ 失败：ant-form-item 过滤器无法匹配该页面的表单容器
page.locator('.ant-form-item').filter({ hasText: /商品名称/ }).locator('[role="combobox"]')
```

**⚠️ Ant Design Select 特别注意**：
- `[role="combobox"]` 元素虽存在于 DOM，但 Playwright 的 `visible` 检测会判其为 hidden
- 正确做法：定位并点击外层 `.ant-select-selection` 容器
- 等待状态用 `{ state: 'attached' }` 而非 `{ state: 'visible' }`

### 示例 2：区分两类下拉组件的操作方式

**背景**：页面中常存在两种不同下拉组件，操作方式不同，混用会导致选项无法选中。

| 组件类型 | 典型字段 | 特征 | 正确操作方式 |
|----------|----------|------|-------------|
| **静态下拉**（Select） | 用户类型 | 点击后直接展开全部选项 | `click()` → `getByRole('option', { name: '...' }).click()` |
| **搜索下拉**（Select with Search） | 创建人/处理人 | 需输入关键词触发异步搜索，再从候选项中选择 | `fill('关键词')` → 等待候选项 → `getByRole('option', { name: '...' }).click()` |

**搜索下拉的正确写法**：
```typescript
// ✅ 搜索下拉：先输入，等待候选项出现，再点击选择
const ownerInput = page.locator('.col-owner input');
await ownerInput.fill('zhangsan');
await page.getByRole('option', { name: 'zhangsan' }).waitFor({ state: 'visible', timeout: 5000 });
await page.getByRole('option', { name: 'zhangsan' }).click();
```

**失败策略（避免使用）**：
```typescript
// ❌ 失败：搜索下拉不能只用 fill，没有后续的选项点击步骤
await ownerInput.fill('zhangsan');
// 缺少等待候选项并点击的步骤，值不会真正被选中
```
