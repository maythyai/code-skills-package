# JSON 测试用例格式规范

## 标准格式结构

```json
{
    "email": "test@example.com",
    "password": "test123",
    "baseUrl": "<your-site-url>/",
    "testCases": [
        {
            "name": "test-case-name",
            "description": "测试用例描述",
            "url": "#/system/module-path",
            "steps": [
                "步骤1：具体操作描述",
                "步骤2：输入数据或点击操作",
                "步骤3：验证预期结果",
                "步骤4：截图保存"
            ]
        }
    ]
}
```

> 账号 `email`/`password` 也可由环境变量 `TEST_EMAIL`/`TEST_PASSWORD` 覆盖；
> 在脚本中不要硬编码真实凭证，优先用环境变量。`baseUrl` 指向可达的测试/预发环境。

## 字段说明

### 根级字段

| 字段名 | 类型 | 必需 | 说明 |
|--------|------|------|------|
| email | string | 是 | 测试账号（可被环境变量覆盖） |
| password | string | 是 | 测试密码（可被环境变量覆盖） |
| baseUrl | string | 是 | 应用基础 URL（测试/预发环境） |
| testCases | array | 是 | 测试用例数组 |

### testCases 字段

| 字段名 | 类型 | 必需 | 说明 |
|--------|------|------|------|
| name | string | 是 | 测试用例唯一标识符（kebab-case） |
| description | string | 是 | 测试用例中文描述 |
| url | string | 是 | 测试页面相对路径 |
| steps | array | 是 | 测试步骤数组（自然语言） |

## 测试步骤编写规范

### 操作类型

#### 1. 导航操作
```
"点击左侧导航栏中的'用户管理'"
"进入用户管理页面"
"切换到'权限设置'标签页"
```

#### 2. 输入操作
```
"在用户名输入框中输入：admin"
"在搜索框中输入关键词：testuser"
"选择开始时间：2026-02-24 00:00"
```

#### 3. 点击操作
```
"点击'搜索'按钮"
"点击列表中第一条记录"
"点击'保存'按钮确认操作"
```

#### 4. 验证操作
```
"验证页面标题显示为'用户管理'"
"验证搜索结果包含用户名为'testuser'的记录"
"验证操作成功提示信息显示"
```

#### 5. 截图操作
```
"截图保存当前页面状态"
"截图保存搜索结果"
"截图保存错误信息"
```

## 完整示例

### 示例1：用户搜索功能
```json
{
    "email": "test@example.com",
    "password": "test123",
    "baseUrl": "<your-site-url>/",
    "testCases": [
        {
            "name": "user-search",
            "description": "用户搜索功能测试",
            "url": "#/system/user-management",
            "steps": [
                "点击左侧导航栏中的'用户管理'",
                "进入用户管理页面，验证页面标题显示正确",
                "在搜索框中输入用户名：testuser",
                "点击'搜索'按钮执行查询",
                "验证搜索结果列表中包含用户名为'testuser'的记录",
                "点击搜索结果中的用户记录查看详情",
                "验证用户详情页面信息显示完整",
                "截图保存用户详情页面"
            ]
        }
    ]
}
```

### 示例2：数据编辑功能
```json
{
    "email": "admin@example.com",
    "password": "admin123",
    "baseUrl": "<your-site-url>/",
    "testCases": [
        {
            "name": "data-edit",
            "description": "数据编辑功能测试",
            "url": "#/system/data-management",
            "steps": [
                "导航到数据管理页面",
                "点击'新增数据'按钮",
                "在'数据名称'字段输入：测试数据001",
                "在'数据类型'下拉框选择：文本类型",
                "在'数据值'文本域输入：这是一条测试数据",
                "点击'保存'按钮提交数据",
                "验证成功提示信息：'数据保存成功'",
                "验证数据列表中新增了刚才创建的记录",
                "截图保存数据列表页面"
            ]
        }
    ]
}
```

## 最佳实践

### 步骤描述四标准

1. **动作明确**：使用"点击"、"输入"、"选择"等明确动词
2. **目标具体**：准确描述操作的 UI 元素（含可见文案/标签）
3. **数据清晰**：明确指定输入的具体数据
4. **验证完整**：每个关键操作后应有相应验证

### 常见错误避免

1. **模糊描述**：避免"操作某个按钮"这样的模糊表达
2. **缺少验证**：每个关键操作后应有相应验证
3. **步骤过粗**：避免将多个操作合并为一个步骤
4. **数据不明**：避免使用"输入一些数据"这样的表达

## 文件组织规则

**目录结构映射**：
- JSON 测试用例文件：`{filename}.json`（项目根）
- 测试脚本目录：`tests/{filename}/`
- 测试脚本文件：`tests/{filename}/{testCase.name}.spec.ts`
- 截图保存目录：`.csp/artifacts/verify/evidence/{filename}/{testCase.name}-results/`

**示例映射**：
```
case.json (包含 testCases: ["user-search", "data-edit"])
├── tests/case/
│   ├── user-search.spec.ts
│   └── data-edit.spec.ts
└── .csp/artifacts/verify/evidence/case/
    ├── user-search-results/
    └── data-edit-results/

order-management.json (包含 testCases: ["create-order", "cancel-order"])
├── tests/order-management/
│   ├── create-order.spec.ts
│   └── cancel-order.spec.ts
└── .csp/artifacts/verify/evidence/order-management/
    ├── create-order-results/
    └── cancel-order-results/
```

## 文件存在性检查与增量执行

### 检查流程

```typescript
// JSON 文件解析后，逐个 testCase 检查对应 spec 是否存在
async function checkExistingTests(jsonFilename: string, testCases: TestCase[]) {
  const baseDir = `tests/${jsonFilename}`;
  const toExecute: TestCase[] = [];
  const toSkip: TestCase[] = [];

  for (const testCase of testCases) {
    const specFilePath = `${baseDir}/${testCase.name}.spec.ts`;

    if (await fileExists(specFilePath)) {
      toSkip.push(testCase);
      console.log(`⏭️ 跳过已存在的测试: ${testCase.name}`);
    } else {
      toExecute.push(testCase);
      console.log(`📝 待执行测试: ${testCase.name}`);
    }
  }

  return { toExecute, toSkip };
}

// 执行前确保目录结构存在
async function ensureDirectoryStructure(jsonFilename: string, testCaseName: string) {
  const testDir = `tests/${jsonFilename}`;
  const screenshotDir = `.csp/artifacts/verify/evidence/${jsonFilename}/${testCaseName}-results`;
  if (!await directoryExists(testDir)) await createDirectory(testDir);
  if (!await directoryExists(screenshotDir)) await createDirectory(screenshotDir);
}
```

### 增量执行模式

1. **全量检查**：扫描所有 testCase，识别已存在的 spec 文件
2. **选择性执行**：只执行不存在 spec 文件的 testCase
3. **状态报告**：输出跳过和执行的测试用例统计

### 输出示例

```
🔍 检查测试文件存在性...
📋 JSON 文件: case.json (包含 3 个测试用例)

⏭️ 跳过已存在的测试: user-search (tests/case/user-search.spec.ts)
📝 待执行测试: data-edit
📝 待执行测试: order-create

📊 执行统计:
   - 跳过: 1 个
   - 执行: 2 个
   - 总计: 3 个

🚀 开始执行待处理的测试用例...
```

### 文件系统错误处理

```typescript
async function safeFileCheck(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile();
  } catch (error) {
    if (error.code === 'ENOENT') return false; // 文件不存在
    throw error; // 其他错误重新抛出
  }
}

async function safeDirectoryCreate(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error.code === 'EEXIST') return; // 目录已存在
    if (error.code === 'EACCES') throw new Error(`权限不足，无法创建目录: ${dirPath}`);
    throw error;
  }
}
```

### 强制重新生成选项

```typescript
interface ExecutionOptions {
  forceRegenerate?: boolean;  // 强制重新生成所有测试
  skipExisting?: boolean;     // 跳过已存在的测试（默认 true）
  backupExisting?: boolean;   // 备份已存在的测试文件
}

async function backupExistingTest(specFilePath: string): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${specFilePath}.backup.${timestamp}`;
  await fs.copyFile(specFilePath, backupPath);
  console.log(`💾 备份已存在的测试: ${backupPath}`);
  return backupPath;
}
```

> 最佳实践：检查在前、清晰反馈、目录预创建、错误恢复、统计报告。默认 `skipExisting=true`，
> 需要重生成时先备份旧脚本再覆盖，避免丢失人工维护的改动。

## 命名约定

- **name 字段**：kebab-case，如 `user-search`、`data-edit`
- **description 字段**：中文，简洁明了描述测试目的
- **步骤描述**：中文，动词开头，目标明确
