# 恢复与续跑

UI 测试迭代可能跨越会话中断（上下文耗尽、进程被杀、浏览器崩溃、用户中途离开）。本文档定义**进度持久化**与**断点续测**规则，保证任何中断后都能无损恢复，而不是从头重跑。

## 进度文件（单一事实来源）

每轮迭代在项目根维护一个进度文件 `.csp-ui-test/progress.json`（或用户指定位置），记录：

```json
{
  "target": "https://localhost:3000",
  "browser": "chrome",
  "mode": "full",
  "cases": [
    { "id": "login-01", "status": "pass", "evidence": ["evidence/login-01-done.png"] },
    { "id": "order-02", "status": "fail",
      "signature": "timing@order-list:loading-timeout",
      "attempt": 2,
      "evidence": ["evidence/order-02-submit-fail.png"] },
    { "id": "order-03", "status": "pending" }
  ],
  "lastUpdated": "2026-08-13T14:00:00+08:00"
}
```

规则：

1. **每个用例状态变化后立即写入**，不要攒到最后。
2. `status` 枚举：`pending` / `running` / `pass` / `fail` / `blocked` / `skipped`。
3. `fail` 必须带 `signature` 和 `attempt` 计数（用于判断"连续 3 轮无进展"）。
4. 恢复时先读进度文件，再决定从哪里继续。

## 恢复流程

中断后重新开始，按顺序执行：

```
1. 读 progress.json → 确定 pending / fail / running 用例
2. 检查浏览器会话是否还活着：playwright-cli list
   - 活着 → 直接 playwright-cli snapshot 确认页面状态后续跑
   - 死了 → 重新 open + state-load 恢复登录态
3. running 状态的用例视为未完成，重置为 pending 重跑
4. fail 用例从上次签名继续（不要清零 attempt）
5. 全部 pending/fail 处理完 → 全量冒烟回归
```

```bash
# 检查现有会话
playwright-cli list

# 会话存活：直接确认状态
playwright-cli snapshot

# 会话丢失：重开 + 恢复登录态
playwright-cli open https://localhost:3000
playwright-cli state-load auth.json
```

## 登录态与环境的持久化

- 用 `--persistent` profile 或 `state-save auth.json` 保存登录态，避免每次恢复重新登录。
- dev server 若由本会话启动，中断后需确认是否还在跑（`lsof -i :3000` 或重新 `npm run dev`）。
- mock/拦截规则（`route`）**不跨会话保留**，恢复后要重新设置。

## 何时续跑 vs 重跑

| 情况 | 策略 |
|------|------|
| 浏览器崩溃但进度文件在 | 续跑（恢复会话，从 pending/fail 继续） |
| 登录态过期 | 重新登录 + `state-save`，然后续跑 |
| 被测代码在会话间发生变化 | 已通过用例降级为待回归，重跑全量冒烟 |
| 进度文件丢失 | 重跑；但 `evidence/` 里已有截图可辅助判断哪些用例跑过 |
| 连续 3 轮同签名无进展 | 不再续跑该用例，标记 `blocked` 并写明原因 |

## 收尾

全部 complete 后：

1. 生成最终报告（见正文 §8.2 模板）
2. 清理：`playwright-cli close-all`，按需 `delete-data`
3. `progress.json` 保留至报告交付，交付后可删除
