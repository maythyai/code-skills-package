# 清理与安全复原

**测试完成后必须复原 mock 代码**，避免对后续开发产生影响。

## 原则：优先不改原文件

推荐做法（从安全到不安全）：

1. **最佳：Playwright route 拦截，不改项目文件**
   ```javascript
   await page.route('**/api/**', (route) =>
     route.fulfill({ status: 200, json: mockData })
   );
   ```
   测试结束后 route 自动失效，零副作用。

2. **次佳：独立临时文件写 mock，不改原有 mock 文件**
   ```javascript
   const TEMP_MOCK = { '/api/xxx': { ... } };
   await page.addInitScript((data) => { window.__MOCK__ = data; }, TEMP_MOCK);
   ```

3. **不得已：修改或新增项目文件时，标记 + 精确复原**（见下）

## 修改或新增项目文件时的安全复原

> ⚠️ **禁止使用 `git checkout` 恢复文件。** 用户可能在测试过程中有新提交或新改动，
> `git checkout` 会恢复到 HEAD，丢失用户的工作。

### 场景 A：修改了已有文件

```bash
# Step 1: 修改前备份
cp mock/api.ts mock/api.ts.bak-before-test

# Step 2: 测试完成后用备份精确恢复（不用 git checkout）
cp mock/api.ts.bak-before-test mock/api.ts

# Step 3: 清理备份
rm -f mock/api.ts.bak-before-test
```

### 场景 B：新增 mock 代码到已有文件

新增代码必须用特殊注释包裹：

```javascript
// [H5-TEST-MOCK-START]
export const mockProducts = [
  { id: 1, title: '测试商品1', price: 99.9 },
];
// [H5-TEST-MOCK-END]
```

或块注释形式：

```javascript
/* [H5-TEST-MOCK] */
export const mockProducts = [ ... ];
/* [/H5-TEST-MOCK] */
```

测试完成后自动删除并确认：

```bash
sed -i '' '/\[H5-TEST-MOCK-START\]/,/\[H5-TEST-MOCK-END\]/d' mock/api.ts
# 或块注释形式
sed -i '' '/\/\* \[H5-TEST-MOCK\] \*\//,/\/\* \[\/H5-TEST-MOCK\] \*\//d' mock/api.ts

grep -r "H5-TEST-MOCK" mock/ || echo "✓ 清理完成，无残留标记"
```

### 场景 C：新增了独立的 mock 文件

```bash
# Step 1: 测试前记录文件清单
find mock/ -type f > /tmp/mock-files-before.txt

# Step 2: 测试后对比找出新增文件
find mock/ -type f > /tmp/mock-files-after.txt
comm -13 <(sort /tmp/mock-files-before.txt) <(sort /tmp/mock-files-after.txt) > /tmp/mock-files-new.txt
cat /tmp/mock-files-new.txt

# Step 3: 删除新增文件
xargs rm -f < /tmp/mock-files-new.txt

# Step 4: 清理临时文件
rm -f /tmp/mock-files-before.txt /tmp/mock-files-after.txt /tmp/mock-files-new.txt
```

## 为什么不用 git checkout

| 操作 | 风险 |
|------|------|
| `git checkout mock/api.ts` | ❌ 恢复到 HEAD，丢失用户测试期间的新提交/新改动 |
| `cp xxx.bak-before-test xxx` | ✅ 精确恢复到修改前状态，不影响用户其他操作 |
| 手动删除新增代码 | ⚠️ 容易遗漏或误删，必须用特殊标记 |
| 特殊标记 + sed 删除 | ✅ 精确定位、自动清理、不会误删 |

> 💡 安全原则：
> 1. 优先 route 拦截或独立临时文件，不改项目文件
> 2. 必须修改时用备份文件恢复，不用 git checkout
> 3. 必须新增代码时用特殊注释标记，方便自动清理

## 清理产物目录

所有产物统一在 `src/__tests__/h5-test-output/`，清理只需删除这一个目录：

```bash
rm -rf src/__tests__/h5-test-output/
```

> 💡 是否清理由用户决定——若用户还要看报告/截图，先保留。
