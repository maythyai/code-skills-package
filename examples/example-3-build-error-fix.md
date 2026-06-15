# Example 3: Build Error Fix (csp-build-error-resolver)

> 使用 CSP 技能包中的 build-error-resolver 方法论分析 TypeScript 类型错误。

---

## 使用的 Skill

- **Skill**: `csp-build-error-resolver` (位于 `csp-patterns/skills/build-resolvers/`)
- **类型**: Build resolver — 构建/类型错误分析与修复
- **场景**: TypeScript 项目类型错误

## 项目信息

- **路径**: `开源项目参考/compound-engineering-plugin/`
- **TypeScript 版本**: strict mode enabled
- **配置**: `tsconfig.json` with `"strict": true`

## 提示词

```
You are demonstrating the csp-build-error-resolver skill.

Context: We have a TypeScript project at /Users/cs/projects/code-skills-package/开源项目参考/compound-engineering-plugin/

Step 1: Run the type checker to find any real type errors
Step 2: If there are real type errors, analyze them using the build-error-resolver methodology
Step 3: If the project is clean, introduce a plausible TypeScript error and analyze it
Step 4: Document the complete workflow: error → root cause → fix → verification
```

## 执行结果

### Step 1: 类型检查

```bash
cd 开源项目参考/compound-engineering-plugin && npx tsc --noEmit
```

**结果**: 项目类型干净，零错误。`tsconfig.json` 启用了 `"strict": true`。

### Step 2: 引入模拟错误

场景：开发者在 OpenCode MCP Server 转换中添加 `timeout` 字段：

```typescript
// src/converters/claude-to-opencode.ts, convertMcp() 函数
{
  type: "local",
  command: [...],
  timeout: 30,  // <-- 新增的字段
}
```

### Step 3: 类型编译器报错

```
src/converters/claude-to-opencode.ts(165,9): error TS2353:
  Object literal may only specify known properties, and 'timeout' does not exist in type 'OpenCodeMcpServer'.

src/converters/claude-to-opencode.ts(175,9): error TS2353:
  Object literal may only specify known properties, and 'timeout' does not exist in type 'OpenCodeMcpServer'.
```

### Step 4: 根因分析

**错误代码**: `TS2353` — 对象字面量只能指定已知属性

**根因**: `OpenCodeMcpServer` 类型定义 (`src/types/opencode.ts`, lines 40-47) 不包含 `timeout` 属性：

```typescript
export type OpenCodeMcpServer = {
  type: "local" | "remote"
  command?: string[]
  url?: string
  environment?: Record<string, string>
  headers?: Record<string, string>
  enabled?: boolean
  // 缺少 timeout
}
```

**WHY 发生**: TypeScript strict mode 下的 excess property checking 防止将未声明的属性赋给对象字面量。这是一个**有意的设计保护** — `timeout` 字段在运行时会被 OpenCode 静默丢弃，编译器捕获了这个潜在 bug。

### Step 5: 修复方案

**方案 A (移除不支持的属性)**: 如果 OpenCode 不支持 `timeout`，移除该字段。

**方案 B (扩展类型定义)**: 如果 OpenCode 实际支持 `timeout`，更新类型定义：

```typescript
export type OpenCodeMcpServer = {
  type: "local" | "remote"
  command?: string[]
  url?: string
  environment?: Record<string, string>
  headers?: Record<string, string>
  enabled?: boolean
  timeout?: number  // 添加这行
}
```

### Step 6: 验证

修复后重新运行 `npx tsc --noEmit`，确认零错误。

## 学到的东西

1. **TS2353 是保护性错误**: 它防止了运行时静默丢弃属性的 bug
2. **修复前需要确认**: 不确定目标平台是否支持该属性时，应先查阅平台文档
3. **build-error-resolver 方法论有效**: 错误定位 → 根因分析 → 修复方案 → 验证 的闭环很清晰
