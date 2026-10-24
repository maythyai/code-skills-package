# UI 对齐自动化指南

从对齐配置执行设计师/前端 UI 对齐工作流时使用本指南。所有产物统一落 `.csp/design-qa/`。

## 通用自动化流水线（无插件依赖）

本技能不绑定特定插件运行时。可用工具组合按以下步骤执行：

1. **导出参考图**
   - Figma：Figma REST API 导出 frame（`GET /v1/images/{file_key}`，需 `{FIGMA_TOKEN}` 环境变量），或让用户提供已导出的 PNG。
   - 基线：复制上一版已批准截图。
   - 落盘：`.csp/design-qa/expected/<screen>-<state>.png`

2. **截取实现截图**
   - 用 Playwright（MCP `browser_navigate` + `browser_take_screenshot` 或 CLI）打开 app 路由。
   - 按配置设置 viewport / deviceScaleFactor / fullPage / waitForSelector / freezeDate。
   - 落盘：`.csp/design-qa/actual/<screen>-<state>.png`

3. **像素比对**
   - ImageMagick：`compare -metric AE expected.png actual.png diff.png`
   - 或 Node 一次性脚本注入 `pixelmatch` 逻辑输出 diff 比例。
   - 落盘：`.csp/design-qa/diff/<screen>-<state>.png` + `reports/visual-comparison.json`

4. **锚点测量（可选但推荐）**
   - 用 Playwright `browser_evaluate` 对每个 anchor selector 采集 computed style（fontSize、lineHeight、fontWeight、color、borderRadius、padding、margin、gap、bounding box）。
   - 输出 `reports/ui-alignment.json`。

5. **生成报告**
   - 按 SKILL.md 输出格式生成 `.csp/design-qa/UI_ALIGNMENT_REPORT.md`。

自动化不可用或不合算时，手动执行同一审查协议并在报告中标注 manual。

## 产物

```text
.csp/design-qa/expected/*.png
.csp/design-qa/actual/*.png
.csp/design-qa/diff/*.png
.csp/design-qa/reports/figma-export.json
.csp/design-qa/reports/screenshots.json
.csp/design-qa/reports/visual-comparison.json
.csp/design-qa/reports/ui-alignment.json
.csp/design-qa/UI_ALIGNMENT_REPORT.md
```

## 配置

全局锚点用 `uiAlignment.anchors`（每个配置屏幕都检查）；屏幕级锚点用 `screens[].uiAlignment.anchors`。

```yaml
uiAlignment:
  runVisualComparison: true
  runComponentAudit: true
  runDebtAudit: true
  runA11yAudit: false
  measurementTolerancePx: 1
  anchors:
    - name: global nav
      selector: '[data-testid="global-nav"]'
      expected:
        height:
          value: 64
          tolerance: 2
        css:
          position: sticky

screens:
  - name: checkout-mobile
    app:
      url: /checkout
      viewport:
        width: 390
        height: 844
    uiAlignment:
      anchors:
        - name: primary cta
          selector: '[data-testid="primary-cta"]'
          severity: major
          expected:
            minHeight: 44
            height:
              value: 48
              tolerance: 1
            css:
              borderRadius: 12px
              fontWeight: "600"
```

## 解读限制

- 像素 diff 用来定位可疑区域，不是裁决。
- 锚点级 DOM + computed CSS 检查用来解释具体实现差距。
- 禁止放宽 masks 或阈值来掩盖真实设计不匹配。
- 每个关键屏幕优先加 5–12 个高价值锚点，而不是试图自动化所有元素。
- Playwright 截图受字体、GPU 渲染、滚动位置影响；跨环境比对前先归一化。
