# Code Module Spec Standard (CMS 说明书标准)

> CMS 的内容标准、入口点识别规则、约定蒸馏与质量自检。配合 `csp-code-spec` SKILL.md。
> 行为准则见 `../../references/module-spec-lifecycle-norms.md`。

## 1. CMS 的"说明书"属性

| 属性 | 含义 |
|------|------|
| Per-app | 每个应用/仓库一份，目录 `.csp/code-spec/{app}/` |
| Living | ship 后 auto-align（delta），不推倒重来 |
| Ground-truth | 下游设计/拆分/生码/CR 基于它，而非想象 |
| Provenance | 每条结论 `file:line`；高危结论实机核验 |
| Platform-neutral | git + `CSP_GIT_REMOTE`（默认 `github.com`） |

## 2. 入口点识别规则

入口点是对外可触达的代码路径 —— 影响范围追溯的起点。用 `grep` 在 git 可见文件中识别。
**只列 grep 命中的**，未命中不写；业务场景推断不确定标 `[TBD]`。

| 类型 | grep 信号（示例，按语言适配） |
|------|------------------------------|
| HTTP | `@app\.(route\|get\|post)`, `@GetMapping\|@PostMapping`, `router\.(get\|post)`, `@RequestMapping` |
| RPC | `@RpcService`, `@grpc\.method`, `@Service` + export |
| CLI | `argparse`, `@click\.command`, `cobra\.Command`, `flag\.Parse`, `if __name__ == '__main__'` |
| 定时 | `@Scheduled`, `@cron`, `celery.*beat`, `@SchedulerLock` |
| 消息/事件 | `@KafkaListener`, `@RabbitListener`, `@EventListener`, `@Subscribe`, `consumer\.on` |
| 导出 API | `export ` (JS/TS public), `__all__`, `pub fn` (Rust) |

输出 `entry-points.jsonl`，每行：
```json
{"type":"HTTP","id":"POST /api/v1/features","file":"src/features/router.py","line":"42","scenario":"[TBD] create feature"}
```

## 3. 调用链追溯

从入口点向下追到叶子（DB / 外部 API / IO）：

- 静态：grep 函数/方法引用 + import 图。
- 输出 `knowledge-graph.json`：`{nodes:[{id,file,line}], edges:[{from,to,file,line}]}`。
- **边必须带 `file:line`**，否则不可信。

### 高危结论实机核验

以下结论必须实机核验，不可直接采信 Agent 蒸馏（详见共享行为准则）：

- "从未被调用" / "死代码" → grep 注册点（router 注册 / import / startup hook）
- "无鉴权" → 读具体行确认 fallback
- "类不可实例化" → 实例化测试
- 涉及核心路径的"缺失"判断 → 运行时冒烟

核验后标注 `【已实机核验】` 或 `【核验推翻：实际情况为…】`。

## 4. 约定蒸馏

| 层 | 职责 | 禁止 |
|----|------|------|
| Router / Controller | 参数校验、认证、调 Service | 业务逻辑、直接 DB |
| Service | 业务逻辑、事务编排、事件发布 | HTTP 概念、直接 SQL |
| Repository / DAO | 数据访问、查询构建 | 业务判断、HTTP 概念 |

蒸馏时记录实际约定，与上表对比 → drift 清单（每条 `file:line`）。

## 5. 模块边界对齐 PMS

- PMS 声明 `MOD-AUTH` → 代码侧应映射到 `auth/` 目录或包。
- drift = PMS 边界与代码实际归属不一致 —— 这是设计/CR 的高价值发现。
- drift 不自动修正，仅记录，交由设计/CR 裁决。

## 6. 增量对齐纪律

```bash
bash scripts/code_spec.sh diff-since <prev_sha>
```

- 新增入口/调用链 → `## ADDED`
- 路径变更 → `## MODIFIED`（粘贴**完整原文**再编辑）
- 删除/废弃 → `## REMOVED` + Reason + Migration
- **幂等铁律**：对未变更源重跑 → 零 delta。否则旧基线腐化，触发全量重蒸馏。

## 7. 质量自检表

| # | 检查项 | 通过标准 |
|---|--------|----------|
| 1 | 出处 | 每条结论有 `file:line` |
| 2 | 无臆造 | grep 不到的不写；推断标 `[TBD]` |
| 3 | 高危核验 | 死代码/未调用/无鉴权 已实机核验 |
| 4 | 边界对齐 | PMS 模块 ↔ 代码归属，drift 已记录 |
| 5 | 约定齐全 | 分层职责 + 禁止项 |
| 6 | delta 幂等 | 未变更源 → 零 delta |
| 7 | 平台中立 | 无内部域名；remote = git + CSP_GIT_REMOTE |
| 8 | 基线可复现 | baseline SHA/Tag 记录，可从 tag 复现 |
| 9 | 调用链完整 | 入口→叶子可追溯，无断链 |
| 10 | 当前性 | 上次 ship 后已 re-align |

## 8. 与 CR 的蒸馏增强集成

`csp-qa-cr-review` 的"蒸馏增强"直接消费本 skill 产出：

- grep `knowledge-graph.json` edges → 追溯 callers → 补充不在 diff 中的受影响调用方。
- `entry-points.jsonl` → 确认外部入口 → 影响"功能入口清单"维度。
- 增量用例：以入口点为矩阵维度之一（见 `csp-test-spec`）。

## 9. 平台中立化

- 无内部域名 / 平台名 / 专有 API。
- 远程：`git` + `CSP_GIT_REMOTE`（默认 `github.com`）。
- 所有路径相对项目根，`CSP_PROJECT_ROOT` 参数化（默认 cwd）。
- `scripts/code_spec.sh` 仅用 `git` + `grep` + `find`，零运行时依赖。
