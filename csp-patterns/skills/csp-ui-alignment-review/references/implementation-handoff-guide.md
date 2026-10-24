# 实现交接指南

## 目标

让 UI 对齐审查对设计师和前端工程师可重复执行。最好的交接给审查者一张清晰的地图：设计参考 → 实现路由 → 稳定数据 → 期望视口 → 验收标准。

## 设计师交接清单

提供：

- 每个目标屏幕的 Figma frame URL 或导出 PNG
- 屏幕名与状态名（如 `checkout-error-mobile`）
- 预期视口尺寸与 device scale
- 主题/模式：light、dark、high contrast、compact、dense 等
- 必需内容状态：default、loading、empty、error、success、permission denied
- 占位 vs 真实数据的预期
- 应忽略或掩码的动态区域
- 必须复用的组件
- 已知的有意偏差
- 最终签字的设计 owner 或评审者

## 前端交接清单

提供：

- app URL 或本地路由
- 自动化启动应用所需的启动命令
- readiness URL 与等待 selector
- 确定性数据 fixture 或种子
- 需要的认证状态设置
- 重要对齐锚点的稳定 selector（优先 `data-testid`）
- 组件源文件与 Storybook stories
- 变更文件或 PR 说明
- 已知实现约束

## 推荐对齐配置映射

```yaml
screens:
  - name: checkout-error-mobile
    mode: conformance
    expected:
      type: figma
      figma:
        url: https://www.figma.com/design/{FILE_KEY}/name?node-id=12-345
        format: png
        scale: 1
    app:
      url: /checkout?fixture=error
      viewport:
        width: 390
        height: 844
      deviceScaleFactor: 1
      fullPage: true
      waitUntil: networkidle
      waitForSelector: '[data-testid="checkout-page"]'
      freezeDate: "2026-01-01T00:00:00Z"
    compare:
      maxDiffPixelRatio: 0.02
      maxDiffPixels: 5000
      threshold: 0.2
      masks:
        - selector: '[data-testid="user-avatar"]'
      ignoreSelectors:
        - '[data-testid="timestamp"]'
    uiAlignment:
      anchors:
        - name: primary cta
          selector: '[data-testid="submit-order"]'
          expected:
            minHeight: 44
            height:
              value: 48
              tolerance: 1
            css:
              borderRadius: 12px
              fontWeight: "600"
```

## 全局 UI 对齐配置

```yaml
uiAlignment:
  runVisualComparison: true
  runComponentAudit: true
  runDebtAudit: true
  runA11yAudit: false
  defaultTolerancePx: 6
  anchors:
    - name: main heading
      selector: '[data-testid="page-heading"]'
      expected:
        css:
          fontSize: 48px
          lineHeight: 56px
```

全局锚点用于反复出现的 app shell 目标；屏幕级锚点用于页面专属目标。

## 稳定 selector 指南

优先：

```html
<h1 data-testid="page-heading">...</h1>
<button data-testid="primary-cta">...</button>
<section data-testid="pricing-card">...</section>
```

避免脆弱的 selector：

```text
body > div:nth-child(2) > div > div:nth-child(4)
```

## 验收工作流

1. 前端用设计系统组件与 token 实现。
2. 自动化导出参考、截取实际 UI。
3. UI 对齐审查产出 must-fix / should-fix / polish / acceptable-difference / needs-design-decision 清单。
4. 前端修复 must-fix 与高价值 should-fix。
5. 设计师审查可接受差异，决定改设计还是改实现。
6. 基线/参考只在设计批准后更新。
7. 视觉测试留在 CI 中做回归保护。

## 常见团队约定

约定好：

- 哪些 diff 阻断发布
- 按屏幕关键度的最大 diff 阈值
- 允许掩码哪些动态区域
- 全页截图还是视口截图为准
- 真实内容长于 Figma 占位文本时怎么处理
- Figma/浏览器字体渲染差异怎么处理
- 设计决策怎么记录
- 谁可以批准基线更新

## Ticket-ready finding 字段

```yaml
title:
category:
severity:
screen:
route:
reference:
selector:
files:
evidence:
observed:
expected:
likelyCause:
frontendFix:
designerDecisionNeeded:
verification:
```

## Definition of Done

UI 对齐任务完成的标准：

- 视觉比对通过，或剩余差异已记录
- 重要对齐锚点匹配期望 computed style 或已批准容差
- 组件使用已批准原语与 variant
- 未引入新的硬编码视觉值
- 响应式视口已检查
- 设计 owner 接受有意差异
- 基线仅在实现状态成为新批准参考后更新
