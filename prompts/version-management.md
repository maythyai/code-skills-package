# 版本号管理规范（独立参考文件）

> 本文件集中所有版本号管理规则，供 roadmap/06/05/README 引用。各提示词内仍保留各自相关内容，本文件是**汇总参考**。

## 一、默认 SemVer（X.Y.Z）

- `MAJOR.MINOR.PATCH[-pre.N]`
- **MAJOR**（X）：不兼容的 API/架构变更、移除已弃用能力、范式跃迁。**仅在 06 发布时验证到实际 breaking API 变更才 bump MAJOR**——新增模块/新端点/新功能是 additive（MINOR），不是 MAJOR，无论战略愿景多宏大。
- **MINOR**（Y）：向后兼容的功能新增/主题交付（roadmap 每个版本主题通常对应一次 MINOR 递增）。
- **PATCH**（Z）：向后兼容的 bug 修复/小补丁（不改主题、不加功能）。
- **pre**：`alpha.N`（功能未完内部测）/`beta.N`（功能完公开测）/`rc.N`（发布候选）。

## 二、顺序递增不跳跃

- **版本号是顺序计数器，不是"宏大程度"指示器**：v1.105.269 完全正常——做了 105 次 MINOR 递增、269 次 PATCH 修复是正常的迭代节奏；大数字≠大版本，只代表迭代次数多。
- **MINOR/MAJOR 不跳跃**：MINOR 从上一已发 tag +1 顺序递增，**不因"这版很重要/很大"跳 MINOR 或跳 MAJOR**。
- **不轻易跳 MAJOR**：MAJOR 只在**实际 breaking API 变更**时 +1。additive 永远 MINOR+1，哪怕 MINOR 已经是 105。
- **只有 PATCH 可以跳号**（如 v1.2.0 → v1.2.2，跳过 v1.2.1）。

## 三、战略主题号 ≠ SemVer 发布号

- roadmap 的 **战略主题**（如"平台化""生态开放"）是**叙事性愿景**，**不是 SemVer 发布号**——不能用战略主题号打 sprint 的发布 tag。
- **实际发布号**按 SemVer 从上一个已发 tag **增量续编**。
- roadmap 的 v2.0/v3.0 战略号只在**实际 breaking/范式跃迁真正发生时**才作为 SemVer 号使用；在那之前，版本号按 SemVer 增量续编（v1.4/v1.5/...），逐步逼近战略号。

## 四、CalVer（仅显式 opt-in）

- `vYYYY.M.DD[-alpha.N|-beta.N]`：取**发布日期**。
- **默认不用日期形式**。仅当用户明确要求日期版本（典型：每日构建的终端应用）才用。
- 即便用 CalVer，tag 取 **roadmap 规划的版本号**，不自动用今日日期打 tag——提前/延后交付不改 tag。

## 五、Tag 规则

- `v` 前缀 + annotated tag（`-a`）+ 不可变（已推送不移动/删除）。
- CI 触发 `tags: ['v*']`。
- tag 取 **roadmap 规划的版本号**，不以今日日期生成 tag。

## 六、预发布与质量分级

- `alpha`（功能未完内部测）/`beta`（功能完公开测）/`rc`（发布候选）。
- NPM dist-tags：`alpha`/`beta`/`latest`。
- 质量分级：`exploration → insider → stable`。

## 七、SemVer bump 验证（06 发布时）

不从 roadmap 战略主题号取版本号；按**实际交付量**从**上一已发 git tag 顺序 +1**：
- additive（新模块/新端点/无 breaking API 变更）→ **MINOR+1**（如 v1.3.0→v1.4.0）。
- breaking（移除 deprecated/改变响应语义/不兼容 API）→ **MAJOR+1**。
- bug fix → **PATCH+1**。
- **战略愿景宏大 ≠ MAJOR bump**。不跳跃 MINOR/MAJOR。大数字正常。

## 八、多平台版本同步（五方完全一致）

所有版本字符串必须**完全一致**（同一字符串）：
1. `git tag`
2. `package.json` version
3. `VERSION` 文件
4. GitHub Release tag_name + title
5. prod 健康端点报告的版本号
6. CHANGELOG 最新条目
7. Docker tag / `tauri.conf.json` / `pyproject.toml` / iOS `CURRENT_PROJECT_VERSION`

用脚本校验禁止人工同步。

## 九、版本注册表（VERSION-REGISTRY）

`.csp/ship/VERSION-REGISTRY.md`，每版本一行，记录全生命周期：

| SemVer | Tag | Status | Released | Deployed | Prod-Verified | Main Features（实际交付） | Breaking | Rollback | Roadmap 主题 |
|---|---|---|---|---|---|---|---|---|---|

**Status 流转**：
- `planned`（roadmap 规划）
- `released`（tag + GitHub Release 推送）
- `deployed`（灰度/全量部署到 prod）
- `prod-verified`（健康端点报告版本 == tag + 第一小时指标稳定）
- `rolled-back`（回滚 + 原因）

**released ≠ deployed ≠ prod-verified**——tag 推了不等于线上在跑。

## 十、版本对齐检查（发布后/部署后）

五方对齐（所有版本字符串必须完全一致）：
1. `git tag` == `package.json` == `VERSION` == GitHub Release tag_name + title
2. **prod 健康端点报告的版本号** == tag
3. CHANGELOG 最新条目 == tag
4. VERSION-REGISTRY 最新行 status == `prod-verified`

任一不一致 → 标 `misaligned`，不标 prod-verified。

## 十一、prod_version vs latest_release

- `lifecycle-state.prod_version`：线上实际在跑的版本（从 health endpoint 验证）。
- `lifecycle-state.latest_release`：最新推送的 tag。
- **两者不一致 = 线上落后于最新发布**——05 开始前检查此差异。
- prod-verified 后更新 `lifecycle-state.prod_version = <verified version>`。

## 十二、版本漂移自动校正

package.json / VERSION 与**已发布 git tag** 不一致 → 以 tag 为 canonical，自动 bump 到 tag 版本，不问；仅多 tag 冲突/canonical 不明才人工。

## 十三、实际交付回填

release 后从 `git log <prev-tag>..<tag> --oneline` + CHANGELOG 回填"Main Features"到 VERSION-REGISTRY + roadmap version-主题表（`实际交付` 字段），与规划对比标 `planned vs delivered` 差异。

## 十四、05 版本叠加检查

开始新版本开发前，检查：
1. 上一版 06 门控执行记录——若任一 gate 是 `not-run`（降级/跳过）→ 警告"代码叠在未验证地基上"。
2. VERSION-REGISTRY 最新行 status——若不是 `prod-verified` → 警告"线上版本与最新 tag 不对齐"。
3. `lifecycle-state.prod_version` vs `latest_release` 不一致 → 警告"线上落后于最新发布"。

## 十五、反模式

| 反模式 | 症状 | 正确做法 |
|---|---|---|
| 战略号当 SemVer 打 tag | sprint 做了起步标 v2.0.0（MAJOR）但无 breaking | additive→MINOR+1 递增；MAJOR 只在真实 breaking；大数字正常(v1.105.269) |
| 版本号跳跃 | 从 v1.4 直接 v2.0 无 breaking，或跳 MINOR | 从上一 tag 顺序+1，不跳 MINOR/MAJOR；PATCH 可跳 |
| 日期形式 tag | 不问用户就用 v2026.9.3 | 默认 SemVer；CalVer 仅显式 opt-in |
| released 当 deployed | tag 推了就以为线上在跑 | released≠deployed≠prod-verified；五方对齐 + prod health 验证 |
| 版本字符串不一致 | tag ≠ package.json ≠ Release title | 五方完全一致，脚本校验 |
| 不回填实际交付 | release 后"实际做了什么"没记录 | git log + CHANGELOG 回填 VERSION-REGISTRY + roadmap |
| 静默门控降级后 auto-release | 工具链坏→grep 替代→auto-proceed | not-run=BLOCKED=阻断发布，tag 标 -draft |
