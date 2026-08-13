---
name: csp-h5-visual-testing
description: >
  H5/移动端页面自动化视觉走查与截图取证：启动开发服务器、注入 mock 数据，用 Playwright
  执行批量截图、多 Tab 遍历、深浅色模式对比、交互录屏，生成标准 HTML 测试报告。
  本技能只取证不修码——发现问题一律输出 FIX_SUGGESTION.md 等用户确认，禁止直接改项目代码。
  当用户需要自动化截图、H5测试、H5截图、UI走查、视觉回归、深色模式截图、主题切换截图、
  Tab分支截图、交互录屏、页面渲染验证时使用。务必在涉及 H5/移动端页面批量视觉取证时使用
  此 skill，而不是手动起服务肉眼检查页面。
version: 1.15.3
layer: 3
category: patterns
phase: verify
domain: testing
scope: testing
role: expert
tools: [Read, Write, Edit, Bash, Glob, Grep]
triggers:
  - "自动化截图"
  - "H5测试"
  - "H5截图"
  - "深色模式截图"
  - "主题切换截图"
  - "Tab分支截图"
  - "UI走查"
  - "视觉回归"
  - "交互录屏"
  - "Playwright截图"
  - "前端测试截图"
  - "页面渲染验证"
related_skills: [csp-playwright-ui-test, csp-e2e-testing, csp-visual-regression, csp-webapp-testing]
anti_rationalizations:
  "页面看着没问题不用截图": "视觉验证必须以截图为证据，肉眼检查会漏掉空白页/错误页/数据缺失"
  "mock 太麻烦直接用真实数据": "mock 必须完成不可放弃，方式 A→B→C 依次降级尝试"
  "失败了我顺手把代码改了": "本技能只取证不修码，必须生成 FIX_SUGGESTION.md 等用户同意"
  "only-on-failure 截图更省事": "必须 screenshot/video 全开，通过的用例同样需要截图作为渲染正确的证据"
  "用 git checkout 恢复 mock 改动": "git checkout 会丢失用户测试期间的新改动，必须用备份文件恢复"
---

# H5 视觉走查与自动化截图

> 用 Playwright 对 H5/移动端页面做**批量视觉取证**：启动 dev server → 注入 mock →
> 截图 / 录屏 → HTML 报告。本技能**只取证、不修码**。

**🔴 全局硬约束：禁止直接修改项目源码。** 遇到测试失败/页面异常：① 先排除 mock 问题
→ ② 不是 mock 问题就停下 → ③ 会话中说明 + 生成 `FIX_SUGGESTION.md`（含 diff）
→ ④ **等用户回复「同意」后才能改代码**。详见 [references/failure-suggestion-flow.md](references/failure-suggestion-flow.md)。

## 与相关技能的分工

| 场景 | 选择 |
|------|------|
| 批量截图走查、深浅色对比、交互录屏、视觉证据收集（不改代码） | **本技能** |
| 交互式功能验证、按失败签名迭代修复直至 complete | `csp-playwright-ui-test` |
| 像素级视觉回归断言（toHaveScreenshot） | `csp-visual-regression` |
| 完整 E2E 套件建设与 CI 集成 | `csp-e2e-testing` |

## 核心能力

| 能力 | 说明 |
|------|------|
| **页面截图** | 单页/多页，设计稿标准尺寸、多设备视口 |
| **主题测试** | 浅色/深色模式切换对比截图 |
| **交互录屏** | 录制点击/滑动/表单填写链路，操作高亮 + 字幕 |
| **Mock 注入** | 拦截 API 注入测试数据，支持 MTOP JSONP / fetch / XHR |
| **测试报告** | Playwright 标准 HTML 报告，截图/视频可预览 |
| **断言验证** | `expect` 验证关键元素，避免截到空白页 |

**约束**：需要能本地启动开发服务器；页面依赖数据时必须能 mock（不可放弃）。
**前置**：Node.js + 全局 Playwright（`npm install -g @playwright/test && npx playwright install chromium`，不要项目级安装）。

## 工作流总览

```
1. 确认目标 ── 先自行分析形成方案 → 与用户确认（范围/深浅色/viewport）
2. 项目分析 ── 读路由（src/routes.ts、src/pages/）确定 URL 列表
3. 启动服务 ── 以 package.json scripts 为准；组件仓库自建 test-harness
4. 先跑一遍 ── 不加 mock 观察现状 → 按决策表判断 mock 范围
5. Mock 数据 ── 必须完成；方式 A→B→C 降级（references/mock-injection.md）
6. 写脚本 ──── @playwright/test + viewport（references/playwright-template.md）
7. Tab 遍历 ── 可选：循环 goto + fullPage 截图
8. 深浅色 ──── 可选：切换主题各截一组
9. 交互录屏 ── 可选：真实点击 + video.show.actions（references/recording-and-themes.md）
10. 报告 ───── 必须执行：--reporter=html，截图/视频全附加
11. 验证 ───── 完整性检查 + 逐张内容复验（references/report-and-verification.md）
```

## 步骤要点

### 1. 先分析后确认

自行分析项目结构形成初步方案，再提交用户确认：

- **截图范围**：按路由判断单页/多页，列出建议 Tab 列表
- **深浅色对比**：检查项目是否有主题切换实现
- **viewport**：按项目类型（移动端/PC）推荐视口

### 2. 启动开发服务器

```bash
cat package.json | grep -A 20 '"scripts"'   # 启动命令以项目为准
```

常见：Ice.js `npm start` / Vite `npm run dev` / Next.js `npm run dev` / Umi `npm start`。
等待就绪后确认地址（通常 `localhost:3000` 或 `localhost:5173`）。

**组件仓库（无独立入口）**：自建 HTML 容器（`test-harness/index.html` 挂载组件）+
Vite 起测试服务，详见 [references/playwright-template.md](references/playwright-template.md)。

### 3. 先运行，观察现状（再决定 mock）

```javascript
await page.goto(`${BASE_URL}/`);
await page.waitForLoadState('networkidle');
await page.screenshot({ path: 'h5-test-output/screenshots/home-initial.png', fullPage: true });
```

| 页面状态 | 是否需要 mock | 处理方式 |
|---------|-------------|----------|
| ✅ 数据正常渲染 | ❌ 不需要 | 直接继续 |
| ⚠️ 部分数据缺失 | 🔶 按需 | 只 mock 缺失接口 |
| ❌ 空白/错误页 | 🔴 需要 | 完整 mock 所有接口 |
| 🟡 显示真实线上数据 | 🔶 可选 | 按测试目的决定 |

### 4. Mock 数据（必须完成，不可跳过）

方式 A 失败试 B，B 失败试 C，**不允许放弃**：

| 方式 | 做法 | 适用 |
|------|------|------|
| A | 用项目已有 mock 框架（ice/umi mock、`mock/` 目录） | 项目自带 mock |
| B | Playwright 脚本内 `page.route()` / `addInitScript` 注入 | 无 mock 框架（**首选，零副作用**） |
| C | 项目代码硬编码 mock，用 `[H5-TEST-MOCK-START/END]` 标记，测完必须清理 | 保底方案 |

方式 C 涉及改项目文件，安全规则（备份恢复、禁 git checkout）见
[references/cleanup-safety.md](references/cleanup-safety.md)；
MTOP JSONP、fetch/XHR 劫持等代码模式见 [references/playwright-mock-patterns.md](references/playwright-mock-patterns.md)。

### 5. 编写脚本与 viewport

用 `@playwright/test` 编写（才能生成标准 HTML 报告）。关键配置：
`addInitScript` 须在 `page.goto` 之前；`waitForLoadState('networkidle')` 后再截图；
`fullPage: true` 截完整页面；`expect().toBeVisible()` 断言关键元素避免截到空白页。

| 设备 | viewport | DPR | 用途 |
|------|----------|-----|------|
| 设计稿标准（750px） | 750×1334 | 2 | **默认**，与设计稿 1:1 |
| iPhone X/12/13/14 | 375×812 | 3 | 最贴近真实用户 |
| iPhone SE/6/7/8 | 375×667 | 2 | 小屏兼容 |
| iPhone 14 Pro Max | 430×932 | 3 | 大屏兼容 |
| Android 通用 | 360×800 | 3 | 中端 Android |
| iPad Mini | 768×1024 | 2 | 平板 |

完整脚本模板见 [references/playwright-template.md](references/playwright-template.md)。

### 6. 可选场景（以用户确认为准）

- **Tab 遍历**：循环 `goto` 每个 Tab 路径 + fullPage 截图
- **深浅色对比**：每页先截浅色，`page.evaluate` 切换主题（`data-theme` / CSS 变量 /
  class，按项目实现），等 500ms 过渡动画后截深色
- **交互录屏**：必须用 Playwright API 触发真实点击/滑动（**禁止 goto 跳 URL 模拟交互**），
  推荐 `video.show.actions` 操作高亮，每步操作后 `waitForTimeout(1000+)`，
  关键步骤同时截图 attach 到报告。详见 [references/recording-and-themes.md](references/recording-and-themes.md)

### 7. 生成报告（必须执行）

```bash
npx playwright test --reporter=html
npx playwright show-report
```

`playwright.config.js` 必须设 **`screenshot: 'on'` 和 `video: 'on'`**（不要用
`only-on-failure` / `retain-on-failure`）——通过的用例同样需要截图/视频作为渲染正确的证据。
报告要求、attach 模式、错误日志分析见 [references/report-and-verification.md](references/report-and-verification.md)。

### 8. 验证截图

1. **完整性**：文件数 = 页面数（深浅色 ×2）；大小 > 0（`find -size -50k` 找可疑小文件）；
   命名符合规范
2. **内容复验（必须逐张）**：排除 ❌ 错误页（404/加载失败）、❌ 大面积空白（>50%）、
   ❌ 骨架屏未渲染、❌ 数据缺失/裂图

发现问题按类型处理：mock/脚本问题 → 直接修（属测试配置）；**业务代码问题 → 停下，
走 FIX_SUGGESTION 流程**（[references/failure-suggestion-flow.md](references/failure-suggestion-flow.md)）。

## Output Format

所有产物统一输出到项目内**固定目录** `src/__tests__/h5-test-output/`，不要频繁换目录：

```
src/__tests__/
├── *.spec.js                 # Playwright 测试脚本
├── playwright.config.js
└── h5-test-output/
    ├── screenshots/          # 截图：{page}.png 或 {page}-{light|dark}.png
    ├── videos/               # 交互录屏（Library 模式）
    ├── test-results/         # 测试结果（Test 模式，含视频）
    └── playwright-report/    # HTML 报告
```

用 `playwright.config.js` 控制路径，不要加 `--output` 参数（会与配置冲突）。

## 常见陷阱（精选）

- **断言必须验证业务目标**：不能只断言 `scrollTop === 149`（操作执行了），还要断言
  `Toast 可见`（业务达成），否则"测试通过但功能缺失"假阳性
- **MTOP JSONP**：`page.route` 拦截后必须解析 URL 的 `callback` 参数，响应包裹为
  `callback({...})`，直接返回 JSON 无效
- **移动端滚动容器**：H5 通常是内部容器滚动（`#pageScrollWrapper` 等），用容器
  `scrollTop/scrollBy`，不是 `window.scrollBy`
- **addInitScript 时机**：必须在 `page.goto` 之前调用，否则拦不到首次请求
- **懒加载**：`fullPage: true` 前先滚动到底触发加载
- **动态内容**：轮播/倒计时导致每次截图不同，冻结时间或隐藏动态区域
- **主题切换延迟**：CSS 过渡动画需 `waitForTimeout` 等待完成
- **Toast 模块导入**：`universal-toast` 等是模块导入不是 `window.Toast`，无法劫持，
  只能测真实行为或在报告中标注"需手动确认"
- **错误页混入**：mock 缺失会截到错误页，必须在 Verification 阶段逐张复验

## 错误处理与降级

| 场景 | 降级方案 |
|------|----------|
| dev server 启动超时（>60s） | 查端口占用（`lsof -i :3000`）→ 查日志 → `npm install` 重试 → 仍失败请用户手动启动 |
| mock 无法注入 | 换 `page.route()` → 方式 C 硬编码标记 → 接受真实数据并在报告标注"未 mock" |
| Playwright 报错/超时 | 看日志定位 → `timeout: 60000` → 先跑通基础截图再加功能 → 换浏览器 |
| 截图质量不达标 | 查 viewport/DPR → `networkidle` 后再截 → 懒加载先滚底 → 冻结动画 |

## CI/CD 要点

- Headless 必须；Linux 用 `npx playwright install chromium --with-deps`
- 后台起服务 + `npx wait-on http://localhost:3000` 等就绪再跑测试
- 截图/报告用 `actions/upload-artifact` 上传；缓存 `node_modules` 与浏览器
- Docker 用官方镜像 `mcr.microsoft.com/playwright:v1.x-jammy`

## 参考文档索引

| 文档 | 内容 |
|------|------|
| [references/mock-injection.md](references/mock-injection.md) | Mock 三种方式详解与数据要求 |
| [references/playwright-mock-patterns.md](references/playwright-mock-patterns.md) | MTOP/fetch/XHR 拦截、主题检测、等待策略代码模式 |
| [references/playwright-template.md](references/playwright-template.md) | 完整截图脚本模板、懒加载/动态冻结/登录态处理 |
| [references/recording-and-themes.md](references/recording-and-themes.md) | Tab 遍历、深浅色切换、交互录屏详解 |
| [references/report-and-verification.md](references/report-and-verification.md) | 报告配置、attach、错误分析、截图复验 |
| [references/failure-suggestion-flow.md](references/failure-suggestion-flow.md) | 测试失败处理规范 + FIX_SUGGESTION.md 模板 |
| [references/cleanup-safety.md](references/cleanup-safety.md) | mock 复原、备份恢复、禁用 git checkout、产物清理 |
| [references/flow.puml](references/flow.puml) | 完整流程图（PlantUML 源） |
