# Distillation & Alignment Strategy (代码蒸馏/对齐策略)

> CMS 如何从代码库蒸馏知识、如何增量对齐、如何防幻觉。配合 `csp-code-spec`。
> 行为准则见 `../../references/module-spec-lifecycle-norms.md`。

## 1. 蒸馏分层策略

蒸馏按"速度优先"四层递降，先快后慢（与 `csp-qa-cr-review` 的 diff 提取策略同源）：

| 层 | 方式 | 适用 | 速度 |
|----|------|------|------|
| 1 | `git ls-files` + `grep` 入口信号 | 全库入口点扫描 | 极快 |
| 2 | 静态 import / 引用解析 | 调用链追溯 | 快 |
| 3 | Agent 走读关键文件 | 约定 / drift 识别 | 中 |
| 4 | 实机核验 | 高危结论（死代码/无鉴权） | 慢 |

**原则**：能用 1-2 层的不用 3-4 层；高危结论必须到第 4 层。

## 2. 调用链追溯算法

```
for each entry in entry-points:
    queue = [entry]
    while queue:
        node = queue.pop()
        callers = grep_references(node.symbol)        # 层 2
        for c in callers:
            edge = {from: c, to: node, file:line}
            if c not in visited: queue.push(c)
    # 终止：DB / 外部 API / IO 叶子
```

输出 `knowledge-graph.json`：
```json
{
  "nodes": [{"id":"FeatureService.create","file":"src/features/service.py","line":"58"}],
  "edges": [{"from":"FeatureRouter.post","to":"FeatureService.create","file":"src/features/router.py","line":"42"}]
}
```

## 3. 防幻觉三铁律

1. **grep 即真理**：未在 git 可见文件中 grep 命到的符号/引用，不写入 knowledge-graph。
2. **推断标 [TBD]**：业务场景、owner 等 grep 不出的推断，标 `[TBD]`，绝不编造。
3. **高危必核验**：以下结论必须实机核验，不可直接采信：

| 高危结论 | 核验方法 |
|---------|---------|
| "从未被调用" | grep 注册点（router 注册 / import / startup hook） |
| "死代码" | grep 全库引用 + import |
| "无鉴权" | 读具体行确认 fallback / 中间件 |
| "类不可实例化" | 实例化测试 |
| "无 migration" | `find` migration 目录 + git log |
| "脚本不存在" | `ls` 实际路径 |

核验后标注 `【已实机核验】` 或 `【核验推翻：实际情况为…】`。

## 4. 环境陷阱（Pitfalls）

- **src-layout**：Python `src/` 布局须 `PYTHONPATH=src` 或 `pip install -e .` 才能 import。
- **虚拟环境**：优先 `.venv/bin/python`，不用系统 python。
- **Node monorepo**：检查 pnpm workspace / turbo 配置，build 顺序有依赖。
- **端口冲突**：冒烟前 `lsof -i :PORT`。
- **管道 exit code**：`cmd | tail; echo $?` 测的是 tail 退出码 —— 用 `cmd > /tmp/o 2>&1; echo $?` 或 `${PIPESTATUS[0]}`。
- **大 monorepo**：`find`/`grep` 排除 `node_modules/.git/__pycache__/dist/`。

## 5. 增量对齐算法

```
prev = read .csp/code-spec/{app}/CODE-MODULE-SPEC.md baseline SHA
diff  = git diff --name-only <prev>..HEAD
if diff empty: zero delta (幂等通过)
else:
  re-run entrypoints + 调用链 only on touched files + 其 callers
  emit delta: ADDED / MODIFIED / REMOVED
  update baseline SHA = HEAD
```

**幂等铁律**：对未变更的源重跑必须产生零 delta。若产生非零 delta，说明旧基线腐化
（手工改过、或上次对齐出错）→ 触发全量重蒸馏并记录告警。

## 6. 蒸馏与 CR 的协同

`csp-qa-cr-review` 在 Step 2-A 维度 1（影响范围）调用本 skill：

- `lookup-distillation <app> <关键词>` → grep `knowledge-graph.json` edges 追溯 callers。
- `entry-points.jsonl` → 确认外部入口。
- 增量用例入口维度 = 本 skill 的入口点 × TMS 状态组合（见 `csp-test-spec`）。

## 7. 全量 vs 增量决策

| 触发 | 模式 |
|------|------|
| 首次 / `.csp/code-spec/{app}/` 不存在 | 全量蒸馏（Step 2-5） |
| ship 后 / 基线 SHA 可用 | 增量对齐（Step 6） |
| 增量产出非零 delta 但源未变（幂等失败） | 全量重蒸馏 + 告警 |
| 重大重构 / 模块大迁移 | 全量重蒸馏（重置基线） |

## 8. 大库蒸馏：并行与负载控制

> 借鉴 `csp-qa-cr-review` 的"性能与负载控制" + `csp-codebase-audit` 的并行维度审查。
> 单一上下文装不下大库；按维度/子树并行蒸馏，控制单轮负载。

### 并行蒸馏

- 按模块子树或入口域切分，每个切片派 1 个 Agent 蒸馏，全部并行（单条消息多个 Agent 调用）。
- **不要一次派超过 6 个 Agent** —— 结果收集困难、上下文暴涨。
- 每个 Agent prompt 必须含：①"只做研究，不写代码" ② 项目背景段 ③ 5-8 个编号调查问题 ④ 输出格式（`file:line + 证据 + 后果`）⑤ thoroughness。
- 主线汇总：提取各切片入口点/调用链 → 合并 `knowledge-graph.json`（去重节点/边）。
- 高危结论仍由**主线实机核验**（Agent 会臆造不存在的引用）。

### 负载控制

| 规则 | 阈值 |
|------|------|
| 单次模型输入 | 不超过上下文 60% |
| 单文件 diff/源 >300 行 | 首尾各 150 行截断，标注 `[truncated]` |
| 大库 find/grep | 排除 `node_modules/.git/__pycache__/dist/` |
| 连续负载高 | 暂停 10s，逐文件提交 |
| 节点/边去重 | 合并时按 `file:line` 去重，避免幽灵边 |

### 并行 vs 串行决策

| 场景 | 模式 |
|------|------|
| 小库（<50 源文件） | 串行（Step 2-4 顺序即可） |
| 中库（50-500） | 按模块子树并行 2-4 片 |
| 大库（>500） | 按入口域并行 4-6 片 + 主线汇总 + 实机核验 |
| 单体巨型 monorepo | 先 `git ls-files` 分域切片，再并行，避免单 Agent 过载 |

## 9. 平台中立实现

`scripts/code_spec.sh` 是纯 shell（`git` + `grep` + `find` + `sed`/`awk`），零运行时依赖，
任何有 git 的环境都能跑。远程协作通过 `CSP_GIT_REMOTE`（默认 `github.com`）clone/fetch，
不依赖任何专有代码平台 API。

## 10. 断点续跑与大库长流程（disk-as-truth）

大库蒸馏/对齐可能跨多会话。**磁盘为真相源**，详见 `../../references/module-spec-operational-protocol.md`。CMS 专属要点：

- **Checkpoint**：`.csp/code-spec/{app}/checkpoint.json`，记 baseline SHA + cursor（phase + scope + item）+ history。**写时机**：baseline 探测完、entrypoints 扫完、每调用链块完、对齐 delta 产出、任意失败（**先写 lastError+cursor 再抛错**）。
- **续跑漂移校验**（resume 前必做）：

| 校验 | 失败处理 |
|------|---------|
| baseline SHA 仍可达（`git cat-file -e`） | 询问重建/中断 |
| `localProjectPath` 仍是可读 git 仓库 | 重新解析；与 checkpoint 不一致 → 确认更新 |
| 本地分支 == checkpoint 记录 | 询问沿用/切回/跳过 |
| 调用链块状态匹配上游 | 已外部变更 → 询问跳过 |

- **幂等矩阵**（决定续跑动作）：

| CMS 阶段 | 幂等? | 续跑动作 |
|---------|-------|---------|
| baseline 蒸馏 | 否 | SHA 存在 → 跳过；否则询问重建 |
| entrypoints/调用链 | 是 | 对账；缺失只补不删 |
| 约定/drift 识别 | 否 | 逐项查状态：完成跳过/进行中询问/未开始跑 |
| auto-align delta | 是 | 直接续跑（对未变更源必出零 delta） |

- **原子单元 + 退出码**：大库按模块子树切原子单元，一进程一单元；退出码 `0=pending/100=complete/2=blocked/1=error`，stderr 输出 `##CSP-SPEC STATUS/NEXT/CKPT` 供外层 loop 解析。软暂停（≥max-units / 单工具输出>30K / pre-compact）→ 写 checkpoint+handoff 后**立即停手**，不"再跑一个"。

## 11. 异常处理矩阵（CMS 专属）

| 场景 | 处理 |
|------|------|
| 必填输入缺失 | 一次性追问全部缺失项，不猜测 |
| 当前分支是 master/main | 中断 + 提示切 feature 分支 |
| 占位符号（`_TBD*`/`_NEW*`） | 蒸馏后即预检；命中拒绝进入调用链追溯 |
| grep 调用链断链 | 标 `[unresolved]`，不臆造路径 |
| 高危结论（死代码/无鉴权） | **必须实机核验**，不直接采信 Agent |
| 单模块蒸馏失败 | 跳过该模块继续兄弟模块；收尾汇总 |
| 全部模块失败 | 整体中断，输出错误清单 |
| 路径漂移 | 重新解析；不一致 → 确认更新 checkpoint |
| 增量产出非零 delta 但源未变 | 基线腐化 → 全量重蒸馏 + 告警 |
| 合同/CLI NPE 类内部错 | **不允许本地占位绕过**，3 次重试后中断 |

## 12. handoff.md（人类可读交接，5 块）

软暂停/阻塞/完成时额外写一份给人看（与机器 checkpoint.json 区分），**带 file:line + why 而非 what**：

1. 目标 + 验收（本应用 CMS 跑通的判定）
2. 状态快照（per-phase ✅/⏳/⏸ + 阻塞项）
3. 关键决策 + Why（非显然选择的原因）
4. 不可复现产物（入口 `file:line`、占位常量、已知 fixture）
5. 下一步明确动作（编号 + 可执行命令/路径）
