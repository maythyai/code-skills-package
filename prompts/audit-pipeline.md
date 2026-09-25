# 任务指示词：全链路审计 pipeline

> 串联五个审查提示词，按"体检 → 实机验证 → 产品批评 → 缺口补强 → 演进交棒"顺序推进，互不重复劳动。
>
> **提示词路径**（任一项目可经 `.claude/prompts/` symlink 读取；canonical 在 `code-skills-package/prompts/`）：
> `audit.md` / `e2e-deep-audit.md` / `product-critic-review.md` / `feature-gap-analysis.md` / `product-audit-to-roadmap.md`

---

对当前项目跑一次全链路审计 pipeline，串联五个审查提示词，按"体检 → 实机验证 → 产品批评 → 缺口补强 → 演进交棒"顺序推进，互不重复劳动。

## 调用顺序与去重归属

### Step 1 — 工程结构体检（主跑：Nielsen 可用性 + 四层测试 + 模块化）
调用 `prompts/audit.md`，跑全量审计 Phase 0–7。
产出：`.csp/audit/MODULE-LIST` / `USABILITY-REPORT` / `AUDIT-VERDICT` / `AUDIT-FINDINGS.json`（前缀 `AUDIT-F-NN`）。
主跑项（后续步骤引用、不重跑）：
- Nielsen 10 可用性 Mode A/B + 状态覆盖（Step 3 critic 镜头 F/G 引用，不重跑）
- 模块化 + 联动四层测试（裁决报告）
- 结构审计只标"疑似"孤儿路由/隐藏后端/死按钮，交 Step 2 实机确认（不据静态扫描直接报数）

### Step 2 — 实机验证（主跑：结构审计实机 + E2E 全页面）
调用 `prompts/e2e-deep-audit.md`，走 M4 深度产品审计。
入口：消费 Step 1 audit 标的"疑似孤儿/隐藏后端/死按钮"线索 → 在此实机确认后才成 finding。
主跑项（后续步骤引用、不重跑）：
- 全路由 sweep + 按钮级点击审计 + 孤儿路由 + 隐藏后端功能（Step 3 critic 镜头 B / Step 4 gap Phase 4 均引用此结构 findings，不自行做按钮级/路由级实机审计）
- 结构健康核查（schema drift / tsc / mock 债务）
产出：`verify/ui-test-report.md` + `gap-analysis/GAP-REPORT` + 证据。

### Step 3 — 产品总监批评性审查（主跑：重复/散乱/定位挑刺 + 跨模块聚合）
调用 `prompts/product-critic-review.md`，逐模块过七镜头 A–G + 跨模块聚合。
去重契约（不重跑）：
- 镜头 F/G 可用性违例 → 引用 Step 1 audit 的 `AUDIT-F`，不重跑 Nielsen；本流程专注重复/散乱/定位（audit 不做）
- 镜头 C/D 视觉交互一致性 → 引用 Step 4 gap 的 recon M 命中、不重跑逐模块 M；只做跨模块一致性批次聚合（若 Step 4 未跑则自行跑 M）
- 镜头 B IA → 引用 Step 2 e2e 结构 findings，不自行做实机审计
产出：`.csp/critic/PRODUCT-CRITIC-REPORT` + `CRITIC-FINDINGS.json`（前缀 `CRITIC-F-NN`）+ `CROSS-MODULE`。

### Step 4 — 单模块缺口与增强深潜（主跑：逐模块 M1–M8 + 缺口增强目录）
调用 `prompts/feature-gap-analysis.md`，全界面自动巡检，逐模块深潜。
去重契约（不重跑）：
- U1–U7 + M1–M8 逐模块命中 → 本流程主跑；Step 3 critic 镜头 C/D 引用此 recon、不重跑
- F2/F5 状态覆盖/a11y → 引用 Step 1 audit 结论、不重跑 Mode A/B；本流程专注"还缺什么/能加什么"
- Phase 4 联动检查 → 引用 Step 2 e2e 结构 findings，不自行做实机审计
产出：`.csp/gap-analysis/GAP-REPORT-{slug}` + `GAP-FINDINGS-{slug}.json`（前缀 `GAP-F-NN`）+ `CROSS-MODULE-UI`。

### Step 5 — 产品演进交棒（聚合全部 findings → roadmap）
调用 `prompts/product-audit-to-roadmap.md`，多角度审查 + 主题候选提炼 + 交棒 roadmap。
输入：聚合 Step 1–4 全部 findings（`AUDIT-F` / `CRITIC-F` / `GAP-F` 前缀不同，可并存去重，按前缀路由来源）。
产出：`docs/audit/PRODUCT-AUDIT` + `docs/analysis/AUDIT-TO-ROADMAP` 交棒清单 → `csp-roadmap-update` / `roadmap-planner`（过 Phase 2.5 集成必要性审视）。

## 全局纪律
- **证据先于断言**：每条 finding 带 `file:line` / 截图 / 路由 / 命令输出；"应该/大概/看着"即停。
- **去重即契约**：上述每处主跑归属不可越界重跑；引用上游结论时附 finding ID 指针。
- **禁止降级审计**：工具/浏览器不可用 → 报 BLOCKED + 停手 + 重试，不产出降级报告；预算耗尽标"未验证-预算不足"出部分报告，剩余显式列出未审。
- **不改代码不发版**：五步均只产审计 + 建议；P0 findings 标 `快速修复=true` 直发 04 拆 fix task → 05 → 06（quick-fix 通道只跳 roadmap/01，不跳 04/05/06）。
- **留尾纪律**：findings 只能 `open` / `BLOCKED`（附阻塞+谁解除）/ `deferred`（附解除条件）；禁止"下轮再补/性价比延后/目录式凑数/纯审美占高优"。
- **gate 即授权**：顺序、范围、去重归属、严重度校准、P0–P3 分级、deferred 取舍自己拍板，记 DEV-LOG，不逐步问我；仅在审查清单真模糊且问询后仍不明 / 基线全缺且无法限定降级 / 真破坏操作（改代码删文档）/ 无法 auto-resolve 的报错 这几类才打断我。

## 进度播报
每完成一步按进度条播报：
`📊 pipeline [Step i/5 {slug}] [就绪✓][主跑✓][去重引用✓][findings✓][交棒✓]`
五步全跑完，输出总 findings 清单（按 `AUDIT-F` / `CRITIC-F` / `GAP-F` + 跨模块重组批次分组，附产物路径），再停。

## 并行优化
audit（Step 1，静态扫）与 e2e（Step 2，实机跑）互不阻塞，可并行起跑；critic（Step 3）与 gap（Step 4）须等前两者 barrier 后跑，二者之间 critic 的镜头 C/D 依赖 gap 的 recon M 命中，故 gap 先于或并行 critic 时 critic 引用其 recon。

## 自动发现
未指定范围时：从路由表 + `.csp/product-spec/` 模块清单 + `.csp/code-spec/entry-points.jsonl` + `docs/FEATURES.md` 枚举全部页面/功能模块，按"核心路径优先 + P0 高危模块优先 + 高频反馈模块优先"排序，写入各自 `SCAN-LIST` 后即开始，不等我确认。
