---
name: csp-playwright-ui-test
description: >
  使用 playwright-cli 驱动真实浏览器执行自动化 UI 功能测试与迭代验证：采集 DOM 快照、
  过滤后的网络请求、控制台日志、截图四类证据，按失败签名持续最小修复与回归，直至
  complete 或真正 blocked；对低风险共享组件改动默认启用 Fast Path。
  当用户需要 UI 自动化测试、页面功能验证、交互回归测试、截图取证、浏览器自动化验证时使用；
  用户提到 Playwright、playwright-cli、页面走查、UI 验证、E2E 冒烟、表单/登录/弹窗等
  页面功能测试时也应触发。务必在涉及 UI 测试时使用此 skill，而不是仅靠读代码推断页面行为。
version: 0.1.0
layer: 3
category: patterns
phase: verify
domain: testing
scope: testing
role: expert
tools: [Read, Bash, Grep, Glob, Agent]
triggers:
  - "UI 自动化测试"
  - "UI 测试"
  - "页面功能验证"
  - "页面验证"
  - "回归测试"
  - "playwright"
  - "playwright-cli"
  - "浏览器自动化"
  - "截图验证"
  - "页面走查"
  - "e2e 冒烟"
  - "表单测试"
  - "登录测试"
related_skills: [csp-e2e-testing, csp-webapp-testing, csp-qa-test-engineering, csp-verify-phase, csp-react-testing, csp-h5-visual-testing, csp-cross-layer-testing, csp-linked-test-runner]
anti_rationalizations:
  "代码逻辑看起来没问题": "页面行为必须以浏览器实测证据为准，读代码不能替代跑页面"
  "这个改动很小不用测 UI": "共享组件的小改动可能影响所有使用方，按 Fast Path 快速验证而不是跳过"
  "偶发失败重跑就好了": "先提取失败签名定位根因，盲目重跑会掩盖时序/数据依赖问题"
  "环境起不来所以 blocked": "先排查端口/依赖/mock 降级，只有外部依赖确实不可用才算 blocked"
---

# Playwright UI 自动化测试与迭代验证

> 用 `playwright-cli` 驱动真实浏览器，对页面功能做自动化验证：采集证据 → 判定结果 →
> 按失败签名最小修复 → 回归，循环直至 **complete** 或 **真正 blocked**。

**安全约束（一句话）**：只在测试/开发环境操作，只读优先，禁止生产写操作、真实支付与真实凭证——完整规则见 [references/security-constraints.md](references/security-constraints.md)。

## 核心机制

| 机制 | 说明 |
|------|------|
| **四类证据** | DOM 快照（snapshot）、过滤后的网络请求、控制台日志、截图；每次判定必须引用证据，不凭感觉 |
| **失败签名** | 每个失败提取稳定签名（类型 + 位置 + 关键消息），同一签名只修一次，修后必回归 |
| **Fast Path** | 低风险共享组件改动默认启用：冒烟级用例 + 关键路径截图，快速放行；高风险走完整流程 |
| **最小修复** | 每轮只改与当前失败签名直接相关的最小范围，不顺手重构，避免引入新失败 |
| **终止条件** | 全部用例通过 = complete；只有环境/外部依赖确实无法恢复才算 blocked，并写明原因 |

## 工作流总览

```
┌─ 0. 风险评估 ──── 低风险共享组件改动 ──→ Fast Path（§3）
│        │ 其他
│        ▼
├─ 1. 环境准备 ──── dev server / 目标 URL / 登录态
├─ 2. 用例执行 ──── snapshot ref 驱动操作 + 四类证据采集（§5）
├─ 3. 结果判定 ──── 通过 → 记录；失败 → 提取失败签名（§6）
├─ 4. 最小修复 ──── 按签名修最小范围 → 回到 2 回归（§7）
└─ 5. 收尾 ──────── 测试报告 + 清理浏览器/临时数据（§8）
```

## 1. 前置条件

### 1.1 检测与安装 playwright-cli

```bash
# 优先本地版本
npx --no-install playwright-cli --version
# 本地不可用时全局安装
npm install -g @playwright/cli@latest
```

本地版本可用时，所有命令统一用 `npx playwright-cli` 前缀；否则用全局 `playwright-cli`。

### 1.2 确认被测目标

按优先级确定入口 URL：

1. 用户明确给出的 URL
2. 项目本地 dev server（先启动：`npm run dev` / `npm start`，等待就绪日志后取端口）
3. 已部署的测试/预发环境地址

> 拿不到可用入口时先问用户，不要猜测生产地址。

### 1.3 登录态（如需）

```bash
# 首次手工登录后保存
playwright-cli open https://test.example.com --persistent
# ... 完成登录 ...
playwright-cli state-save auth.json

# 后续会话直接复用
playwright-cli open https://test.example.com
playwright-cli state-load auth.json
```

登录态获取与复用策略详见 [references/storage-state.md](references/storage-state.md)。

## 2. 风险评估与 Fast Path

开始执行前先对被测改动做风险评估：

| 维度 | 低风险（Fast Path） | 高风险（完整流程） |
|------|--------------------|--------------------|
| 改动范围 | 共享组件的样式/文案/纯展示逻辑 | 交互逻辑、状态管理、数据流 |
| 影响面 | 使用方行为不变 | 多个使用方行为可能变化 |
| 数据依赖 | 无接口契约变化 | 接口字段/时序变化 |

**Fast Path 规则**：

1. 默认对低风险共享组件改动启用
2. 只跑冒烟用例：页面可打开 + 关键元素可见 + 主交互一次 + 前后截图对比
3. 任一冒烟项失败 → 立即退出 Fast Path，转完整流程
4. Fast Path 通过也要留下截图证据，报告中标注 `[fast-path]`

## 3. 环境准备

```bash
# 打开浏览器并导航（默认内存 profile，干净环境）
playwright-cli open https://localhost:3000

# 需要保留登录/缓存状态时用持久 profile
playwright-cli open https://localhost:3000 --persistent

# 指定浏览器
playwright-cli open https://localhost:3000 --browser=chrome
```

多会话并行（例如对比改动前后）用 `-s` 命名会话：

```bash
playwright-cli -s=before open https://old.example.com
playwright-cli -s=after  open https://new.example.com
```

## 4. 用例执行：snapshot ref 驱动

**核心循环**：先 `snapshot` 拿到元素 ref（如 `e15`），再用 ref 操作，操作后自动回显新快照。

```bash
playwright-cli snapshot          # 获取 ref
playwright-cli fill e5 "user@example.com" --submit
playwright-cli click e3
playwright-cli snapshot          # 验证操作后状态
```

ref 不可用时的降级定位（按顺序尝试）：

```bash
playwright-cli click "getByRole('button', { name: '提交' })"   # 语义化
playwright-cli click "getByTestId('submit-btn')"               # test id
playwright-cli click "#main > button.submit"                   # CSS（最后手段）
```

常用交互命令速查：

| 命令 | 用途 |
|------|------|
| `fill <ref> "text" [--submit]` | 填写输入框（--submit 填完按回车） |
| `click <ref>` / `dblclick <ref>` | 点击 / 双击 |
| `select <ref> "value"` | 下拉选择 |
| `check <ref>` / `uncheck <ref>` | 勾选 / 取消勾选 |
| `hover <ref>` | 悬停（触发浮层/菜单） |
| `press Enter` / `press Escape` | 按键 |
| `upload ./file.pdf` | 文件上传 |
| `dialog-accept` / `dialog-dismiss` | 处理系统弹窗 |
| `tab-new <url>` / `tab-select <n>` | 多标签页 |

完整命令参考见 [references/command-reference.md](references/command-reference.md)。

## 5. 四类证据采集

每次判定（通过或失败）都必须附证据。四类证据的采集方式：

### 5.1 DOM 快照

```bash
playwright-cli snapshot                          # 整页
playwright-cli snapshot "#result-panel"          # 只快照目标区域（大页面首选）
playwright-cli snapshot --depth=4                # 限制深度，降低输出量
```

### 5.2 过滤后的网络请求

**不要全量导出网络日志**，只过滤与用例相关的请求：

```bash
playwright-cli network                                   # 概览
playwright-cli --raw network | grep -i "api/order"       # 按接口过滤
playwright-cli --raw network | grep -E " 5[0-9]{2} "     # 只看 5xx
```

需要拦截/mock 接口时见 [references/request-mocking.md](references/request-mocking.md)。

### 5.3 控制台日志

```bash
playwright-cli console            # 全部
playwright-cli console error      # 只看 error
playwright-cli console warning    # 只看 warning
```

判定规则：`error` 级日志默认视为失败证据（除非能证明与用例无关）；`warning` 记录但不阻断。

### 5.4 截图

```bash
playwright-cli screenshot --filename=evidence/step3-result.png
playwright-cli screenshot e12 --filename=evidence/step3-toast.png   # 元素级截图
```

**命名规范**：`evidence/<用例ID>-<步骤>-<状态>.png`，例如 `evidence/login-01-submit-fail.png`。失败截图与通过截图都要保留，报告里成对引用。

## 6. 失败签名

失败发生时，先从证据中提取**失败签名**——一个稳定、可匹配的标识，格式：

```
<失败类型>@<位置>:<关键消息摘要>
```

| 失败类型 | 特征 | 典型根因 |
|----------|------|----------|
| `locator` | 找不到元素/ref 失效 | 结构变化、渲染时机、文案变化 |
| `timing` | 元素存在但不可交互/断言超时 | 动画、异步加载、竞态 |
| `data` | 接口返回与预期不符 | mock 缺失、字段变更、环境数据差异 |
| `assert` | 页面状态与断言不符 | 真实功能缺陷（改页面代码而不是改测试前，先确认预期是否正确） |
| `env` | 页面打不开/服务无响应 | dev server、端口、网络、依赖服务 |

**签名规则**：

1. 同一签名在一轮迭代中只修一次；修完立即回归该用例
2. 回归仍失败但签名变化 → 按新签名重新分类处理
3. 多个用例共享同一签名 → 修一次，全部相关用例回归
4. `assert` 类失败禁止通过放宽断言"修复"，除非用户确认预期有误

## 7. 最小修复与回归循环

```
失败签名 → 定位根因（读代码/补证据）→ 最小修复 → 回归失败用例 → 回归相邻用例
```

1. **最小修复**：只改与签名直接相关的代码/用例/mock；不顺手重构、不清理无关警告
2. **回归顺序**：先跑失败用例本身，再跑同页面/同组件的相邻用例，最后全量冒烟
3. **循环终止**：
   - 全部通过 → **complete**，进入 §8 收尾
   - 连续 3 轮同一签名无进展 → 换策略（换定位、加等待、补 mock）；仍无进展 → 评估 blocked
4. **blocked 的唯一合法理由**：外部环境/依赖确实不可用（如需要真实短信验证码、依赖服务宕机且无 mock）。写报告时必须注明：已尝试的手段 + 缺什么才能继续

工具输出过大（快照/网络日志刷屏）时按 [references/tool-output-throttling.md](references/tool-output-throttling.md) 限流；
会话中断或需要跨会话续跑时按 [references/recovery-resume.md](references/recovery-resume.md) 恢复。

## 8. 收尾与报告

### 8.1 清理

```bash
playwright-cli close          # 关闭当前会话浏览器
playwright-cli close-all      # 关闭所有浏览器
playwright-cli kill-all       # 进程残留时强制清理
```

持久 profile 含测试数据，交付前确认是否需要 `playwright-cli delete-data`。

### 8.2 测试报告模板

```markdown
# UI 测试报告 — <对象/页面>
- 结论：complete | blocked（原因：...）
- 模式：fast-path | full
- 环境：<URL> / <browser> / <时间>

## 用例结果
| 用例 | 结果 | 失败签名 | 证据 |
|------|------|----------|------|
| login-01 | ✅ | - | evidence/login-01-done.png |
| order-02 | ❌→✅ | timing@order-list:loading-timeout | evidence/order-02-*.png |

## 修复记录（每轮）
1. 签名 timing@order-list:loading-timeout → 根因：列表渲染无 loading 态 → 修复：<文件:行> → 回归通过

## blocked 说明（如有）
- 已尝试：...
- 缺失条件：...
```

## 9. 与现有 Playwright 测试工程协同

被测项目已有 `playwright.config.ts` / `tests/` 时：

1. **优先跑存量套件**：`PLAYWRIGHT_HTML_OPEN=never npx playwright test`（避免交互式报告卡住）
2. 失败的用例用 `--debug=cli` 模式挂 `playwright-cli` 会话调试
3. 手工验证稳定后，把操作序列沉淀为正式测试脚本（见 [references/test-generation.md](references/test-generation.md)）

详细命令见 [references/playwright-tests.md](references/playwright-tests.md)。

## 10. 与相关技能的分工

| 场景 | 选择 |
|------|------|
| 交互式功能验证、按失败签名迭代**修复**直至 complete | **本技能** |
| H5/移动端批量视觉走查、截图取证、交互录屏（**只取证不改码**） | `csp-h5-visual-testing` |
| 像素级视觉回归断言 | `csp-visual-regression` |
| E2E 套件建设与维护 | `csp-e2e-testing` |

用户要"截图走查 / 深色模式对比 / 录屏取证"时路由到 `csp-h5-visual-testing`；
要"验证功能并修好"时用本技能。两者都基于 Playwright，但修复权限模型不同：
本技能允许最小修复，后者禁止直接改项目代码（走 FIX_SUGGESTION 审批）。

## 11. 联动证据输出（供跨层测试消费）

当被 `csp-linked-test-runner` 编排做跨层联动测试时，本技能在执行 UI 动作的同时，
**额外产出一份 `linked-evidence.json`**，把"这次点击"的网络请求、时间戳、请求/响应体、DOM、截图
绑定成一组，供下游 `csp-db-state-assertion` 用 trace_id/时间窗与 DB 行变化对齐。

### 11.1 产出格式

```json
{
  "test_id": "ORD-001",
  "action": { "step": "click e15", "ts": 1730000000000 },
  "network": [
    {
      "method": "POST",
      "path": "/api/orders",
      "status": 200,
      "trace_id": "abc123",
      "request_body": { "productId": "p1", "qty": 1 },
      "response_body": { "orderId": "o9", "status": "pending" },
      "ts": 1730000000120
    }
  ],
  "ui_dom": "evidence/ORD-001-after.dom",
  "screenshot": "evidence/ORD-001-after.png",
  "console_errors": []
}
```

### 11.2 trace_id 从哪取

从请求响应头抓取（约定头名 `x-trace-id` / `traceparent`）；应用未注入时字段为 `null`，
下游自动降级为"时间窗弱因果"并在裁决里标注。**鼓励被测应用在写路径请求头与落库行上使用同一 trace_id**，
这是联动测试做强因果对齐的前提。

### 11.3 触发方式

仅在联动模式下输出；独立使用本技能时不产出，避免无谓落盘。判定联动模式：上层 `csp-linked-test-runner`
传入 `--linked-evidence` 或环境变量 `CSP_LINKED=1`。

相关方法论与契约见 `csp-cross-layer-testing`，DB 侧消费见 `csp-db-state-assertion`。

## 参考文档索引

| 文档 | 内容 |
|------|------|
| [references/command-reference.md](references/command-reference.md) | playwright-cli 完整命令参考 |
| [references/tool-output-throttling.md](references/tool-output-throttling.md) | 工具输出限流：大快照/网络日志/控制台输出的过滤与落盘 |
| [references/recovery-resume.md](references/recovery-resume.md) | 恢复与续跑：会话恢复、进度文件、断点续测 |
| [references/security-constraints.md](references/security-constraints.md) | 安全约束详细规则 |
| [references/playwright-tests.md](references/playwright-tests.md) | 运行与调试存量 Playwright 测试 |
| [references/request-mocking.md](references/request-mocking.md) | 请求拦截与 mock |
| [references/storage-state.md](references/storage-state.md) | 登录态/Cookie/Storage 管理 |
| [references/test-generation.md](references/test-generation.md) | 从操作序列生成测试脚本 |
| [references/session-management.md](references/session-management.md) | 多会话与浏览器生命周期 |
| [references/tracing.md](references/tracing.md) | Trace 录制与分析 |
| [references/video-recording.md](references/video-recording.md) | 视频录制 |
| [references/element-attributes.md](references/element-attributes.md) | 元素属性检查 |
| [references/running-code.md](references/running-code.md) | 直接执行 Playwright 代码片段 |
| [csp-cross-layer-testing](../../csp-patterns/skills/csp-cross-layer-testing/SKILL.md) | 跨层联动测试契约与证据矩阵 |
| [csp-linked-test-runner](../../csp-runtime/skills/csp-linked-test-runner/SKILL.md) | 联动编排器(消费 linked-evidence.json) |
