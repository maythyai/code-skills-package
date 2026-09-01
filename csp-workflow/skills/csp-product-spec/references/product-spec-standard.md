# Product Module Spec Standard (PMS 说明书标准)

> PMS 的内容标准、模板与质量自检。配合 `csp-product-spec` SKILL.md 使用。
> 行为准则见 `../../references/module-spec-lifecycle-norms.md`。

## 1. PMS 的"说明书"属性

PMS 是 **living baseline**，不是一次性文档。它有三个不可妥协的属性：

1. **Source of truth** — 下游产物读它再产出；冲突时以 PMS 为准。
2. **Delta-driven** — 变更走 ADDED/MODIFIED/REMOVED，里程碑折叠进 canonical。
3. **Tech-agnostic** — 只描述 WHAT + 边界，零技术实现。

## 2. 模块定义模板

每个模块一个文件 `.csp/product-spec/modules/{MODULE}.md`：

```markdown
# {Module Name} ({MOD-ID})

## 职责
- **做什么**: 一句话
- **不做什么**: 显式排除项（边界）

## 对外能力
| 能力 ID | 名称 | 描述 | 优先级 |
|---------|------|------|--------|
| CAP-AUTH-1 | 用户注册 | ... | P0 |

## 依赖
| 依赖模块 | 依赖的能力 | 方向 |
|---------|-----------|------|
| MOD-NOTIFY-1 | 发送通知 | MOD-AUTH-1 → MOD-NOTIFY-1 |

## 角色 / Owner
- Owner: [TBD or name]
- 角色: 终端用户 / 管理员

## 验收形态约束
（本模块 PRD 的验收标准必须满足 PMS §5 的形态 + 以下模块特有约束）
- 业务规则必须穷举，禁止"等""其它"
- 异常场景 ≥2

## 变更历史
| 日期 | 变更类型 | 摘要 |
```

## 3. 验收标准形态（决定 PRD 质量）

这是 PMS 决定 PRD 质量的核心机制 —— 规定"验收标准长什么样"：

| 规则 | 要求 |
|------|------|
| 形态 | `Given [context], When [action], Then [verifiable result]` |
| 可证伪 | pass/fail 明确，禁止主观词（"体验良好""支持完善"） |
| 数量 | 每功能模块 ≥3 条；异常场景 ≥2 条 |
| 埋点 | 核心操作路径必须有 tracking event |
| 优先级 | P0/P1/P2 显式标注 |
| 禁止项 | 不写技术实现、不写 UI 细节、不写模糊量词 |

**PRD 质量门**（PMS 覆盖门控）：

```yaml
coverage_gate:
  prd_to_module: 100%       # 每个 PRD 条目落在某个 PMS 模块内
  module_to_owner: 100%     # 每个模块有 owner
  module_dependency_acyclic: true
  acceptance_falsifiable: 100%  # 每条 AC 可证伪
```

## 4. 边界冲突裁决

同一能力被两个模块声称时的裁决流程：

1. 标记冲突：`MOD-X` 与 `MOD-Y` 都声称拥有能力 `CAP-Z`。
2. 评估归属：按"职责更内聚"原则裁决（哪个模块不拥有它会更不内聚）。
3. 记录决策：在两边模块文件的"变更历史"记录裁决结果与理由。
4. 更新依赖图：确保无环。

## 5. 增量纪律

delta 必须遵守（详见共享行为准则 §Cross-Cutting Norms）：

- `## ADDED Module` — 完整模块定义
- `## MODIFIED Module` — 粘贴**完整原文**再编辑，禁止部分修改
- `## REMOVED Module` — 标注 Reason + Migration
- 里程碑归档：折叠 delta 进 canonical `PRODUCT-MODULE-SPEC.md`

## 6. 质量自检表

| # | 检查项 | 通过标准 |
|---|--------|----------|
| 1 | 无臆造 | 业务数据要么来自用户要么 `[TBD]` |
| 2 | 模块完整 | 每模块有职责+边界+能力+owner |
| 3 | 依赖无环 | 模块依赖图可拓扑排序 |
| 4 | 验收形态 | Given/When/Then + 可证伪 + 禁止项 |
| 5 | 覆盖门 | PRD→模块 100%；模块→owner 100% |
| 6 | delta 纪律 | ADDED/MODIFIED/REMOVED，非推倒重来 |
| 7 | 技术中立 | 无 DB/语言/框架/域名 |
| 8 | 边界裁决 | 无未裁决的边界冲突 |
| 9 | 幂等对齐 | 对未变更的源重跑产生零 delta |
| 10 | 追溯 | 每模块链上下游（PRD/spec/task） |

## 7. 与 TMS 的分支关系

TMS（测试说明书）是 PMS 的**分支**：

- TMS 继承 PMS 的模块边界与验收形态 —— 测试面不得发明 PMS 未声明的模块。
- PMS §5 的验收形态直接成为 TMS 需求可追溯矩阵的"需求侧"。
- PMS 模块变更 → TMS 触发增量用例生成（diff 需求矩阵）。

## 8. 平台中立化

- 无内部域名 / 平台名 / 专有 API。
- 远程协作：`git` + `CSP_GIT_REMOTE`（默认 `github.com`）。
- 路径全部相对项目根，`CSP_PROJECT_ROOT` 参数化（默认 cwd）。
- 运行时纪律（断点续跑、文件边界、双重门禁+判官、防臆造输入、原子单元）见 `../../references/module-spec-operational-protocol.md`。

## 9. Spec 类型约束与深度（决定 PRD 细节质量）

PMS 的验收形态之上，每个功能模块的 spec 按类型有结构约束（源自生产实践，通用化）：

| Spec 类型 | 格式 | 作用域 | 必含 |
|-----------|------|--------|------|
| **layout** | ASCII 布局图 + 区域映射表 + 视觉规格表 | 模块排布与视觉规格，**不涉业务逻辑** | 布局图(标注模块ID)、尺寸/颜色/字体/间距规格、交互状态样式差异(默认/悬停/选中/禁用/加载)、响应式断点 |
| **workflow** | EARS 模板 | 展示与交互逻辑，覆盖正常+异常路径 | Happy Path(`WHEN...THEN...AND`)、异常处理表(每个网络 Action)、埋点参数表(每个交互 Action)、状态流转描述 |
| **data** | API 文档风格 | 数据取用逻辑，关联具体 Action | URI+Method、请求参数(标用户输入 vs 系统生成)、响应结构(标字段→UI 映射)、调用链依赖 |
| **i18n** | 多语言 key 表 | 所有 UI 可见文本 | key 命名(`{module}.{element}.{variant}`)、至少 en 默认值、所有可见文本、RTL 适配、aria-label |
| **metrics** | 分层指标 + 埋点表 | 页面级指标与埋点 | 页面级(PV/UV/停留/跳出)、模块级(曝光/点击)、转化漏斗、埋点表(事件名 `{page}_{module}_{action}_{type}`) |

**EARS 形式**（workflow 的 Happy Path）：`WHEN [触发] THEN [系统行为] AND [后续约束]`。
异常路径**必须穷举**（异常场景 | 触发条件 | 系统行为 | 用户感知），禁止"等""其它"。

## 10. virtual_page（无独立 UI 的产品逻辑）

PMS 模块不都有 UI。**无独立 UI 的中台/基础服务逻辑**（会员基础服务、积分规则、风控、支付路由）按 virtual_page 处理：

- 判断准则：**有 URL → UI page；只有代码逻辑没 UI → virtual_page**。
- virtual_page 约束：节点扁平（无 children）；不挂 layout/i18n（无 UI 文本）；默认仅 workflow spec（产品视角业务规则，不写接口契约）；data 为可选不强校。
- 业务规则源头：至少 1 个代码库 git URL 或设计文档（对齐 CMS + PMS），缺则**必须停下来问**，不允许占位、不允许猜测。

## 11. 不改名 / 不臆造（防幻觉铁律）

- **productName 与用户原文完全一致**：用户说"收藏夹"就写"收藏夹"，禁止基于 URL/DOM/文案"理解"后重命名（如自作主张改成"买家收藏夹首页"）。
- **候选选项必须来自真实基线**：模块/产品归属选项必须查询真实基线候选，**禁止**看 URL 语义猜几个选项 —— 猜的选项不在真实树里，save 时归属反查失败、节点飘到顶层。
- 合同网络不通 → 让用户输入全名，**不**回退到语义猜。
