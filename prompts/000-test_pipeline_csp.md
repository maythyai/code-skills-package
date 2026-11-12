使用 CSP 测试能力完成全链路测试（依据→设计→分层实施→门控→上线验证），产出可直接嵌入 `[[prompts/000-develop_pipeline_csp.md]]` 06 质量门控的测试证据。

> 测试不是"代码写完了跑一下"——是从 PRD 出发、到上线后验证的完整闭环。本文件贯通测试依据→用例设计→分层实施→质量门控→上线验证全链路。

## 测试全流程

```
PRD Features + AC + Spec 可测试性点 ──→ 测试依据提取 ──→ 用例设计（7 种技术）
                                          │
                                          ↓
                          ┌─── 单元测试（业务逻辑/纯函数）
                          ├─── API/集成测试（接口契约/跨服务）
                          ├─── E2E 测试（关键用户旅程）
                          ├─── 视觉回归（UI 一致性）
                          ├─── 性能测试（负载/压力）
                          ├─── 安全测试（鉴权/注入/越权）
                          └─── 专项测试（无障碍/国际化/混沌/模糊）
                                          │
                                          ↓
                                    质量门控 ──→ 上线验证
```

---

## Phase TB：测试依据提取（Test Basis）

> **强制前置**：在写任何测试用例之前，先明确"测什么"和"凭什么判过"。

### TB.1 从 Spec 提取测试基线

读取 `[[prompts/000-product-planning_csp.md]]` 产出的 PRD SPEC（`docs/prd/PRD-{version-slug}.md`）+ `[[prompts/000-develop_pipeline_csp.md]]` S3 产出的全栈 Spec（`.csp/specs/`），提取测试依据：

- **功能清单**（来自 PRD §3 详细功能设计）：每个功能模块即为一个测试单元
- **AC 清单**（来自 PRD §6 验收标准）：每条 Given-When-Then 对应至少一条测试用例
- **业务规则**（来自 PRD §3 关键业务规则）：每条规则对应边界/等价类用例
- **接口契约**（来自 Spec）：每个端点/请求-响应对 → 对应 ≥1 条 API 测试用例
- **数据模型**（来自 Spec）：每个 entity/字段/约束 → 对应边界值/等价类用例
- **DB Schema 对齐**（来自 Spec DDL）：每个 PRD feature 涉及的数据字段在 DB 中是否有对应列？字段类型/长度/默认值/约束是否与 Spec 一致？→ DB 字段完整性检查
- **错误场景**（来自 Spec）：每个错误码/异常路径 → 对应 negative 用例
- **状态机**（来自 Spec）：每个合法/非法迁移 → 对应状态迁移用例
- **非功能需求**（来自 PRD §7）：性能/安全/可用性约束 → 对应非功能测试
- **风险与依赖**（来自 PRD §8）：前置依赖未就绪 → 标记测试阻塞项

> Spec 中的可测试性点是 Phase TD 用例设计的直接输入——Spec 定义了什么要测、TD 设计怎么测、05 同步产出测试代码。不等到 05 开发完才开始想怎么测。

调用 `[[skill:csp-product-capability]]`（PRD→SRS）补充约束、不变量、接口契约——这些输入直接决定 API 测试和契约测试的范围。

### TB.2 识别测试关联维度

对每个 feature 从多维度分析"谁在依赖它、它依赖谁、出问题影响谁"：

| 关联类型 | 判断方法 | 测试策略 |
|---------|---------|---------|
| **纯后端功能**（无 UI 入口，仅被 API/其他服务调用） | 从 PRD/CMS 入口点判断：有 API 端点但无路由/页面入口 | 重点测 API 契约/边界/性能；不需要前端 E2E |
| **前端功能**（有 UI 入口/按钮/模块） | 有路由/页面/组件引用 | 必须做前端交互测试 + E2E + 视觉回归 |
| **前后端关联功能**（UI 触发 → API 调用 → DB 写入） | 一个用户操作跨 UI/API/DB 三层 | 跨层往返测试（UI→API→DB 状态前后一致） |
| **依赖外部服务**（第三方 API/消息队列/文件存储） | PRD §8 依赖列表 | 契约测试/Mock 测试/超时重试 |
| **共享数据/状态**（多模块读写同一实体） | 同一 DB 表/缓存 key 被多模块引用 | 并发测试/状态一致性测试 |

### TB.3 测试依据输出

产出测试依据表（每功能一行，直接作为 Phase TD 用例设计的输入）：

```
| Feature ID | 功能 | 关联 AC | 关联类型 | 关键业务规则 | 依赖 | 测试风险 |
|------------|------|---------|---------|-------------|------|---------|
| F-001      | 用户注册 | AC-01~05 | 前后端关联 | 密码 8-20 位/邮箱唯一/验证码 60s 过期 | 邮件服务 | 验证码超时边界 |
| F-002      | 数据导出 | AC-12~14 | 后端功能 | 最大 10 万行/CSV 格式/异步任务 | 对象存储 | 大文件 OOM |
```

产物：`docs/analysis/test-basis-{version}.md`（测试依据表 + 关联维度分析）。

---

## Phase TD：测试用例设计（Test Case Design）

> 从测试依据到可执行的用例，走 7 种黑盒技术系统化枚举——不靠记忆、不靠"想到的就写"。

调用 `[[skill:csp-test-case-design]]`（等价类/边界值/判定表/状态迁移/因果图/Pairwise/场景法）+ `[[skill:csp-qa-test-engineering]]`（测试金字塔分层/策略/计划）+ `[[skill:csp-test-engineer]]`（测试策略/编写/覆盖率分析）+ `[[skill:csp-test-spec]]`（TMS 每模块测试基线，从需求生成测试说明书）。

### TD.1 用例设计路由

按 feature 特征选择主技术 + 必补技术：

| 需求特征 | 主技术 | 用例量级 |
|---------|--------|---------|
| 范围/长度/日期约束 | 边界值分析 | 每输入维度 6-9 条 |
| 枚举/下拉/必填项 | 等价类划分 | 有效类合并 1-2 条 + 每无效类 1 条 |
| ≥3 条件决定一个输出 | 判定表 | 合并后 4-12 条 |
| status/state 生命周期 | 状态迁移 | 迁移数 + 非法迁移数 |
| 用户流程叙事 | 场景法 | 基本流 1 + 备选流 N + 异常流 M |

**硬约束**：
- 每条 AC 至少 1 条用例（P0/P1 的 AC 必须覆盖正常+边界+异常三类）
- 每个无效等价类单独一条用例（不可合并——合并后第一个校验短路，其余分支零覆盖）
- 每个状态迁移必须覆盖 on-switch + 非法迁移（断言"被拒绝 + 状态不变"）
- 每条用例填满 8 字段：ID/标题/前置条件/输入/步骤/预期结果/优先级/关联AC

### TD.2 前端交互用例专项

前端功能的用例必须覆盖用户实际操作路径——不只是"API 返回正确"，而是"用户在页面上点击后看到什么"：

- **按钮/操作可达性**：每个按钮/操作在何种状态下可点/不可点？hover/focus/active/disabled 各态是否正确？
- **模块间联动**：A 模块操作后 B 模块是否同步更新？不刷新页面数据是否一致？
- **前端校验 vs 后端校验**：前端校验通过但后端拒绝 → 用户看到什么？前端校验拦截但绕过 → 后端是否独立校验？
- **异步操作状态**：提交中按钮是否禁用？失败是否有可操作提示（非裸报错栈）？成功后数据是否刷新？
- **浏览器兼容**：Chrome/Firefox/Safari 核心交互是否一致？（可选，按项目要求）

### TD.3 后端功能用例专项

后端功能的用例关注接口行为而非界面：

- **API 契约**：请求参数类型/必填/默认值/边界；响应结构/状态码/错误码是否与 Spec 一致？
- **幂等性**：同一请求发送两次，结果一致且无副作用（扣款/发券类尤其关键）
- **数据完整性**：写入 DB 的数据是否完整？字段类型/长度/约束是否正确？失败是否回滚？
- **并发安全**：并发写同一数据是否产生脏数据？乐观锁/悲观锁是否正确？
- **异步任务**：任务是否被正确投递/执行/重试？失败是否有告警？

### TD.4 用例输出

- `docs/analysis/test-cases-{feature}.md`（完整用例集，表格式）
- `docs/analysis/traceability-{feature}.md`（AC 双向追溯矩阵：AC→用例 + 用例→AC）

---

## Phase TU：单元测试

> 测纯业务逻辑、数据变换、校验函数、工具方法——隔离、快速、大量。

### TU.1 单元测试策略

| 被测对象 | 技术框 | CSP Skill |
|---------|--------|-----------|
| Python 业务逻辑 | pytest | `[[skill:csp-python-testing]]` |
| TypeScript/JavaScript | Vitest/Jest | `[[skill:csp-typescript-testing]]` |
| Java | JUnit 5 + AssertJ + Mockito | `[[skill:csp-java-testing]]` |
| Go | testing + testify | `[[skill:csp-golang-testing]]` |
| C++ | GoogleTest/CTest | `[[skill:csp-cpp-testing]]` |
| Rust | cargo test | `[[skill:csp-rust-testing]]` |
| React 组件 | Testing Library | `[[skill:csp-react-testing]]` |

调用 `[[meta:csp-tdd]]` 保证先写测试再写实现。

**覆盖目标**：业务逻辑 ≥80%，纯函数/工具方法 ≥90%。

---

## Phase TI：API 与集成测试

> 测服务边界——API 契约、DB 交互、跨服务通信。

调用 `[[skill:csp-api-tester]]`（功能验证/性能/安全）+ `[[skill:csp-cross-layer-testing]]`（UI→API→DB 往返 traceable）+ `[[skill:csp-contract-testing]]`（跨服务契约验证）。

### TI.1 API 测试维度

| 维度 | 测什么 | 怎么判过 |
|------|--------|---------|
| 功能正确性 | 有效输入→正确响应+DB 写入 | 响应结构/状态码/字段值与 Spec 一致 |
| 参数校验 | 边界/无效/缺失参数→明确错误码 | 错误码与 Spec 一致，不泄漏敏感信息 |
| 认证授权 | 无 token/过期/权限不足→401/403 | 未授权不可访问，RBAC 边界正确 |
| 数据一致性 | 操作前后 DB 状态一致 | DB 行数/字段/关联正确，失败回滚完整 |
| 幂等性 | 同请求两次→结果一致 | 无重复扣款/重复创建 |

### TI.2 跨层往返测试

对每个"前后端关联"功能，跑一次完整的 UI→API→DB 往返验证：

调用 `[[skill:csp-cross-layer-testing]]` — 在一个 traceable 的用例中串联三层断言：
1. 前端触发操作（点击/输入/提交）
2. 验证 API 响应（状态码/返回体/错误码）
3. 验证 DB 状态变化（行数/字段值/关联表/事务）

调用 `[[skill:csp-linked-test-runner]]` — 编排一个 feature 的全链路：seed DB → 驱动 UI 动作 → 验证 API → 验证 DB → 清理。

调用 `[[skill:csp-db-state-assertion]]` — 断言一个用户动作前后的 DB 状态变化（哪些行变了、变成什么），并通过 trace id 关联到 API 调用。

---

## Phase TE：端到端测试

> 测真实用户旅程——关键路径、跨页面流程、浏览器真机。

调用 `[[skill:csp-e2e-testing]]`（Playwright/Cypress/Selenium）+ `[[skill:csp-browser-testing-with-devtools]]`（Chrome DevTools 实机调试）+ `[[skill:csp-e2e-case-automation]]`（E2E 用例自动生成）。

### TE.1 E2E 测试范围

按用户影响面选择 E2E 覆盖路径：

| 路径类型 | 示例 | 覆盖要求 |
|---------|------|---------|
| 核心转化路径 | 注册→激活→首次使用→付费 | 全流程 must-pass |
| 高频操作路径 | 登录→搜索→查看→下单 | 全流程 must-pass |
| 数据变更路径 | 创建→编辑→发布→删除 | 全流程 + 每步后状态校验 |
| 异常恢复路径 | 支付失败→重试 / 网络断开→重连 | 每个异常分支 1 条 |

### TE.2 前端交互验证要点

E2E 测试必须覆盖前端真实交互——不仅仅验证"页面打开展示了"，还要验证：

- **按钮触发链路**：点击按钮 → API 调用 → 响应处理 → UI 更新，整条链完整
- **模块间数据联动**：A 页面操作 → 切换到 B 页面 → B 页面数据已更新
- **前后端校验各司其职**：前端校验拦截的给 UI 反馈、绕过前端直接调 API 的后端必须独立校验
- **状态流转可见**：loading→success→data display 或 loading→error→retry→success，用户在每个状态都有明确反馈
- **边界交互**：快速双击提交（防重复）、后退/前进（表单状态保留）、窗口失焦再回来

产物：`verify/ui-test-report.md`（E2E 测试报告，含截图/网络日志/console 日志）。

---

## Phase TV：视觉与 UI 一致性测试

> 测 UI 是否偏离设计——截图对比、视觉回归、无障碍验证。

调用 `[[skill:csp-visual-regression]]`（截图 vs 基线 diff）+ `[[skill:csp-visual-regression-review]]`（Figma/原型 vs 实现对照）+ `[[skill:csp-visual-verdict]]`（结构化视觉 QA 裁决）+ `[[skill:csp-ui-alignment-review]]`（Figma 对齐审查）。

### TV.1 视觉测试场景

| 场景 | 触发条件 | 工具 |
|------|---------|------|
| 新页面/组件上线 | 首次实现 | 截图→存为基线 |
| UI 改动 | 修改了组件/样式/布局 | 截图→对比基线→diff |
| 设计还原验证 | Figma/原型已定稿 | 实现 vs Figma 逐像素对比 |
| 响应式断点 | 移动/平板/桌面 | 多视口截图对比 |
| 暗色模式 | 有暗色主题 | 明暗双模对比 |

---

## Phase TA：系统审计（Test 之外的另一维——结构健康 × 可用性 × 可追溯）

> 测试回答"代码做对了吗"，审计回答"系统健康吗/可用吗/结构干净吗"。两者互补——功能测试全绿 ≠ 系统没问题。

### TA.1 审计与测试的区别

| 维度 | 测试 (TB–TQ) | 审计 (TA) |
|------|-------------|----------|
| 核心问题 | 功能是否符合 Spec | 系统是否健康、可用、可追溯 |
| 切入点 | PRD AC / 用例 / 边界值 | 模块结构 / 调用链 / 路由 / 代码健康 |
| 典型发现 | "注册表单缺邮箱格式校验" | "3 个模块重复实现了同一逻辑 / 4 个路由无导航入口" |
| 证据类型 | pass/fail + 断言输出 | finding + file:line + 严重度 + 影响分析 |
| 频率 | 每个版本 | 里程碑/大重构后/按需触发 |

### TA.2 审计入口

根据审计目标选择入口：

| 审计类型 | 触发场景 | CSP Skill | 输出 |
|---------|---------|-----------|------|
| **模块化审计 + 可用性审查** | 全面体检：模块健康/联动/Nielsen 10/裁决报告 | `[[skill:csp-audit]]` | `.csp/audit/AUDIT-VERDICT + AUDIT-FINDINGS.json` |
| **E2E 深度审计** | 发布前全量体检：全路由 sweep/按钮级点击/孤儿路由/结构健康 | `[[skill:csp-e2e-deep-audit]]` | `verify/ui-test-report.md + gap-analysis/GAP-REPORT` |
| **代码库审计** | 多维度代码扫描：安全/性能/可观测/架构 | `[[skill:csp-codebase-audit]]` | 各维度 finding 清单 |
| **结构审计**（轻量） | 迭代间快速扫描：死代码/重复/命名/依赖性 | `[[skill:csp-code-simplification]]` | 清理建议 |

### TA.3 审计覆盖维度

每个维度独立审查，finding 带 `file:line` + 严重度 + 修复建议：

| 维度 | 审什么 | 典型问题 |
|------|--------|---------|
| **模块化** | 模块边界/职责/依赖 | 循环依赖/职责重叠/贫血模块/god file |
| **需求可追溯** | 每条需求是否有测试覆盖 | 未覆盖 AC / 单层 happy path 覆盖（视同缺口）/ 孤儿测试 |
| **可用性（Nielsen 10）** | 系统状态可见性/用户控制/一致性/错误预防… | 操作无反馈/无撤销/不一致交互/无键盘可达 |
| **跨层集成** | UI→API→DB 往返是否一致 | 接口 200 但 DB 未落库 / trace_id 断裂 / 回路不闭合 |
| **代码健康** | 死代码/重复实现/命名/类型安全 | 死代码/重复逻辑/类型漂移/import 路径混乱 |
| **安全** | OWASP Top 10/依赖 CVE/权限矩阵 | 注入/越权/敏感数据泄漏/无速率限制 |
| **性能** | N+1 查询/慢 SQL/缓存缺失/首屏 | 热路径无索引/无连接池/首屏 >3s |
| **可观测** | 日志/指标/链路/告警 | 无结构化日志/无 trace_id/无告警 |
| **结构健康** | schema drift/类型检查/mock 债务/孤儿路由 | migration 说 head≠物理 schema / 类型检查失败 |

### TA.4 审计与测试的协作

```
测试 Pipeline                        审计 Pipeline
─────────────                        ─────────────
TB 测试依据（从 PRD + Spec）         TA 模块化拆解 + 可追溯缺口
TD 用例设计（从 Spec 可测试性点）    TA 需求→测试方法映射审计
TU/TI/TE 分层实施 ──→ 测试证据 ──→  TA 跨层集成验证（四层断言）
                                       TA 可用性审查（Nielsen 10）
TQ 质量门控 ←── 测试证据 + 审计 findings ──→ 裁决报告
```

- **测试找功能缺陷** → TB–TQ 分层覆盖
- **审计找结构/可用性/健康问题** → TA 多维度扫描
- **06 门控消费两者**：测试 exit 0 + 审计无 CRITICAL → 放行

产出：审计 findings 前缀 `AUDIT-F-NN`，与测试 findings 前缀不同。P0 findings 标 `快速修复=true` 直发 04→05→06。

**审计强制覆盖**（非可选——按条件全选必查）：
- 有 DB 变更 → DB schema 对齐 + migration chain + 性能影响评估
- 有新 API 端点 → 每端点鉴权/越权 + 前端消费者检查 + OpenAPI 同步
- 有 UI 变更 → visual regression + 设计系统一致性 + 响应式断点
- 有新增依赖 → 依赖审计 + license 检查
- 有测试代码变更 → conftest/fixture 加载验证
- **findings 闭合门控**：P0 finding 必须 closed（附 fix commit），不得 open/deferred 进 release。3 条以上 P1 同 P0 阻断。新端点无前端消费者 → P1 或标注"有意开放供外部调用"
- **审计发现不能降级为"已知"**：一个 finding 发现了就是发现了——"已知问题/之前就这样/任务级非 bug"不是继续遗留的理由。要么 06 前修了（closed），要么标 BLOCKED（附具体阻塞点+谁解除+预期版本），要么 deferred（附解除条件）。**禁止"📋 已知"作为 status**——那不是状态，是把问题晾着
- **审计发现路由**：审计 finding 反映的若是规划级缺口（如"需要前端页面建设"）→ 不作为 audit deferred 积压，而是升为 Planning Phase 2.5 审视候选——由产品规划决定要不要做、排哪个版本。审计不替规划做决策，但审计必须把发现推给规划

---

## Phase TP：性能与专项测试

> 测系统的非功能质量——性能、负载、稳定性、混沌。

### TP.1 性能测试

调用 `[[skill:csp-load-testing]]`（k6/Locust/JMeter）做负载测试：

- **基准测试**：建立性能基线（P50/P95/P99 响应时间、吞吐量、错误率）
- **负载测试**：预期负载下系统是否稳定？P95 是否在 SLA 内？
- **压力测试**：超过预期负载的 1.5×/2×，系统降级还是崩溃？恢复能力？
- **浸泡测试**：长时间运行，内存泄漏？连接池耗尽？

有后端时调用 `[[skill:csp-backend-performance]]` 做慢查询索引/N+1/缓存策略/连接池专项分析。
有前端时调用 `[[skill:csp-frontend-performance]]` 做 bundle 分析/代码分割/CWV 诊断。

### TP.2 专项测试矩阵

| 测试类型 | CSP Skill | 适用场景 |
|---------|-----------|---------|
| 属性测试 | `[[skill:csp-property-based-testing]]` | 纯函数/序列化/编解码/数据变换 |
| 变异测试 | `[[skill:csp-mutation-testing]]` | 单元测试质量评估——测试用例能否捕获人为注入的缺陷 |
| 模糊测试 | `[[skill:csp-fuzz-testing]]` | 解析器/文件上传/外部输入接口 |
| 混沌测试 | `[[skill:csp-chaos-testing]]` | 分布式系统/微服务——注入故障看系统行为 |
| 差分测试 | `[[skill:csp-differential-testing]]` | 多实现对比（新旧系统迁移/多版本 API） |
| 并发测试 | `[[skill:csp-concurrency-testing]]` | 多线程/多请求竞争资源/共享状态 |
| 无障碍测试 | `[[skill:csp-a11y-testing]]` | WCAG 2.2 AA——jest-axe/Cypress axe/Lighthouse |
| 国际化测试 | `[[skill:csp-i18n-testing]]` | 多语言/多时区/多币种/RTL 布局 |
| 可观测测试 | `[[skill:csp-observability-testing]]` | 断言日志/指标/链路在生产中到位 |
| DB 迁移测试 | `[[skill:csp-db-migration-testing]]` | Schema 变更正向/回滚/数据完整性/零停机 |
| AI 盲点回归 | `[[skill:csp-ai-regression-testing]]` | AI 生成代码的已知缺陷模式回归 |
| 移动设备测试 | `[[skill:csp-mobile-device-testing]]` | Android/iOS 真机 ADB/XCUITest |
| 缺陷挖掘 | `[[skill:csp-defect-mining]]` | 测试套件达到平台期时，换方法挖掘新缺陷 |
| 视觉回归（H5） | `[[skill:csp-h5-visual-testing]]` | H5/移动端批量截图验证 |

---

## Phase TSEC：安全测试

> 测系统安全边界——鉴权、注入、越权、敏感数据。

调用 `[[skill:csp-security-review]]`（鉴权/越权/注入/XSS/CSRF/敏感数据脱敏/依赖漏洞）+ `[[skill:csp-api-tester]]` 的安全测试模式（OWASP API Top 10）。

### TSEC.1 安全测试清单

| 类别 | 测试点 | 方法 |
|------|--------|------|
| 认证 | 弱密码/token 过期/会话固定/多设备登录 | 手动 + 自动化 |
| 授权 | 水平越权（访问他人数据）/垂直越权（低权限访问高权限） | 每角色每端点验证 |
| 注入 | SQL/XSS/命令/模板注入 | 自动化扫描 + 边界输入 |
| 数据保护 | 敏感数据加密存储/传输/脱敏显示/日志不泄露 | 读代码 + 读日志 |
| CSRF | 状态变更操作是否有 CSRF token | 自动化验证 |
| 依赖漏洞 | npm/pip/cargo audit | 自动化扫描 |

---

## Phase TQ：质量门控与上线验证

> 所有测试跑完后，过门控——决定能不能上线。

调用 `[[workflow:csp-verify-phase]]`（AC 验证/测试全绿）+ `[[workflow:csp-release-manager]]`（完整质量门控）+ `[[skill:csp-ultraqa]]`（QA 循环工作流：测试→验证→修复→重复直到目标达成）。

### TQ.1 质量门控矩阵

| Gate | 条件 | 不通过→ |
|------|------|---------|
| **代码门控** | Lint + TypeCheck + Build exit 0 | 阻塞 merge，回 05 |
| **单元测试门控** | 业务逻辑 ≥80%，工具函数 ≥90%，exit 0 | 阻塞 merge，补测 |
| **API 测试门控** | 全部端点覆盖 + 边界/错误码/幂等 exit 0 | 阻塞 merge |
| **E2E 测试门控** | 核心路径 all-pass + 新 feature 关联路径 all-pass | 阻塞 merge |
| **视觉回归门控** | 截图 diff = 0（排除已知预期变更） | 若为意外变更→回 05 |
| **性能门控** | P95 ≤ SLA，无退化 >15% | WARNING（不阻塞，记入下版本优化） |
| **安全门控** | 无 CRITICAL/HIGH 漏洞；依赖 audit exit 0 | 阻塞 merge（CRITICAL/HIGH） |
| **AC 验收门控** | 每条 AC 有对应用例且用例通过 → [[workflow:csp-verify-phase]] | 阻塞 release |
| **跨层一致性** | UI→API→DB 往返验证通过 → [[skill:csp-cross-layer-testing]] | 阻塞 release |
| **上线冒烟** | 生产环境关键路径通过（post-deploy smoke） | 触发回滚 |

### TQ.2 上线验证

部署后跑确认：

- **冒烟测试**：生产环境核心路径自动化验证（登录/注册/核心购买流程）
- **DB 迁移确认**：Schema 变更是否在生产正确执行？数据完整性？
- **可观测确认**：关键指标/日志/告警在生产中是否正常产出？→ `[[skill:csp-observability-testing]]`
- **功能开关确认**：新功能是否按预期开启/关闭？灰度比例是否正确？

### TQ.3 测试复盘

调用 `[[skill:csp-defect-mining]]` — 测试套件达到平台期时换方法挖掘新缺陷。
调用 `[[pattern:csp-ai-regression-testing]]` — AI 生成代码的已知缺陷模式回归。

输出 `docs/analysis/test-retro-{version}.md`（测试覆盖率/漏测分析/下版本改进）。

---

## CSP Skill 路径速查

### 测试依据与策略

| 阶段 | CSP Skill |
|------|-----------|
| 测试工程（全生命周期） | `[[skill:csp-qa-test-engineering]]`（需求分析→测试计划→策略→用例→执行→生产调查） |
| 测试用例设计 | `[[skill:csp-test-case-design]]`（7 种黑盒技术/AC 双向追溯/优先级裁剪） |
| 测试说明书（TMS） | `[[skill:csp-test-spec]]`（每模块测试基线，从需求生成 stock + 增量用例） |
| 测试工程师 | `[[skill:csp-test-engineer]]`（测试策略/编写/覆盖率分析） |
| TDD 方法论 | `[[meta:csp-tdd]]`（先写测试再写实现） |
| 测试方法论（盲点互补） | `[[meta:csp-test-methodology]]`（方法谱系：契约/属性/变异/模糊/混沌/差分/并发/无障碍/国际化/可观测/后端 mock/DB 迁移/Kotlin） |
| 缺陷挖掘 | `[[skill:csp-defect-mining]]`（测试套件平台期→换方法挖掘新缺陷） |

### 分层测试实施

| 层级 | CSP Skill |
|------|-----------|
| 单元测试（Python） | `[[skill:csp-python-testing]]`（pytest/fixtures/parametrize/mock） |
| 单元测试（TypeScript） | `[[skill:csp-typescript-testing]]`（Vitest/Jest/AAA/mock/fake-timers） |
| 单元测试（Java） | `[[skill:csp-java-testing]]`（JUnit 5/AssertJ/Mockito/Testcontainers） |
| 单元测试（Go） | `[[skill:csp-golang-testing]]`（testing/testify/mock/table-driven） |
| 单元测试（C++） | `[[skill:csp-cpp-testing]]`（GoogleTest/CTest/fixture/mock） |
| 单元测试（Rust） | `[[skill:csp-rust-testing]]`（cargo test/proptest/mock） |
| React 组件测试 | `[[skill:csp-react-testing]]`（Testing Library/Vitest/MSW） |
| API 测试 | `[[skill:csp-api-tester]]`（功能/性能/安全 OWASP API Top 10） |
| 跨层往返测试 | `[[skill:csp-cross-layer-testing]]`（UI→API→DB 一个用例串联三层断言） |
| 全链路编排测试 | `[[skill:csp-linked-test-runner]]`（seed DB→驱动 UI→验证 API→验证 DB→清理） |
| DB 状态断言 | `[[skill:csp-db-state-assertion]]`（一个动作前后 DB 变化/关联 API 调用 trace） |
| 契约测试 | `[[skill:csp-contract-testing]]`（跨服务契约/OpenAPI 校验） |
| E2E 测试 | `[[skill:csp-e2e-testing]]`（Playwright/Cypress/Selenium/全路由 sweep） |
| E2E 用例自动化 | `[[skill:csp-e2e-case-automation]]`（E2E 用例模板/自动生成） |
| 浏览器真机测试 | `[[skill:csp-browser-testing-with-devtools]]`（Chrome DevTools 实机调试） |

### UI/视觉测试

| 阶段 | CSP Skill |
|------|-----------|
| 视觉回归 | `[[skill:csp-visual-regression]]`（截图 vs 基线 diff） |
| 视觉审查 | `[[skill:csp-visual-regression-review]]`（Figma/原型 vs 实现） |
| 视觉裁决 | `[[skill:csp-visual-verdict]]`（结构化 QA 裁决） |
| UI 对齐审查 | `[[skill:csp-ui-alignment-review]]`（Figma 对齐审查） |
| H5 视觉测试 | `[[skill:csp-h5-visual-testing]]`（H5/移动端批量截图/暗色模式/交互录制） |
| Playwright UI 测试 | `[[skill:csp-playwright-ui-test]]`（DOM/network/console/screenshot/Fast Path） |

### 专项测试

| 测试类型 | CSP Skill |
|---------|-----------|
| 属性测试 | `[[skill:csp-property-based-testing]]`（随机输入验证不变量） |
| 变异测试 | `[[skill:csp-mutation-testing]]`（人为注入缺陷检验测质量） |
| 模糊测试 | `[[skill:csp-fuzz-testing]]`（随机/半随机输入找崩溃） |
| 混沌测试 | `[[skill:csp-chaos-testing]]`（注入故障观察系统行为） |
| 差分测试 | `[[skill:csp-differential-testing]]`（多实现对比找差异） |
| 并发测试 | `[[skill:csp-concurrency-testing]]`（多线程竞争/死锁/数据竞争） |
| 无障碍测试 | `[[skill:csp-a11y-testing]]`（WCAG 2.2 AA/jest-axe/Cypress axe/Lighthouse） |
| 国际化测试 | `[[skill:csp-i18n-testing]]`（多语言/时区/币种/RTL/复数） |
| 可观测测试 | `[[skill:csp-observability-testing]]`（日志/指标/链路在生产中验证） |
| DB 迁移测试 | `[[skill:csp-db-migration-testing]]`（Schema 变更正向/回滚/完整性） |
| 负载测试 | `[[skill:csp-load-testing]]`（k6/Locust/JMeter/SLA 百分位） |
| 移动设备测试 | `[[skill:csp-mobile-device-testing]]`（ADB/XCUITest/跨平台） |
| AI 盲点回归 | `[[skill:csp-ai-regression-testing]]`（AI 生成代码已知缺陷模式回归） |

### 质量门控与上线

| 阶段 | CSP Skill |
|------|-----------|
| 质量门控 | `[[workflow:csp-verify-phase]]`（AC 验证/测试全绿/门控过） |
| QA 循环工作流 | `[[skill:csp-ultraqa]]`（测试→验证→修复→重复，直到目标达成） |
| 发布管理 | `[[workflow:csp-release-manager]]`（完整质量门控+上线流程） |
| 安全审查 | `[[skill:csp-security-review]]`（鉴权/越权/注入/XSS/CSRF/依赖漏洞） |
| 设计还原审查 | `[[skill:csp-qa]]`（设计还原度/发布裁决 Pass/Warning/Fail） |

### 系统审计（Phase TA — 测试之外的互补维度）

| 审计类型 | CSP Skill | 适用场景 |
|---------|-----------|---------|
| 模块化审计 + 可用性审查 | `[[skill:csp-audit]]`（模块拆解/四层联动/Nielsen 10/裁决报告/版本 bump） | 全面体检 |
| E2E 深度审计 | `[[skill:csp-e2e-deep-audit]]`（全路由 sweep/按钮级点击/孤儿路由/结构健康/IA 评审） | 发布前全量 |
| 代码库审计 | `[[skill:csp-codebase-audit]]`（多维度并行扫描：安全/性能/可观测/架构） | 迭代间 |
| 结构审计（轻量） | `[[skill:csp-code-simplification]]`（死代码/重复/命名/类型漂移） | 每个版本 |
| 可用性测试 | `[[skill:csp-test]]`（Nielsen 10 启发式评估/用户测试 Mode A/B） | 里程碑后 |
| 无障碍审计 | `[[skill:csp-access]]`（WCAG 2.1 AA/axe/Playwright/Lighthouse 扫描） | 前端项目 |
| 需求可追溯审计 | `[[skill:csp-prd-traceability]]`（AC→测试方法映射/缺口识别/孤儿用例检测） | 每个版本 |
| 技术债评估 | `[[skill:csp-tech-debt-assessment]]`（债规模/利息/偿还优先级） | 里程碑后 |
| 缺陷挖掘 | `[[skill:csp-defect-mining]]`（测试套件平台期→换方法挖掘/4 层递进） | 测试 plateau |
| AI 盲点回归 | `[[skill:csp-ai-regression-testing]]`（AI 生成代码已知缺陷模式回归） | 每个版本 |
| 跨层集成审查 | `[[skill:csp-integration-review]]`（11 场景全栈契约审查） | 每版本 |
| UI 对齐审查 | `[[skill:csp-ui-alignment-review]]`（Figma/原型 vs 实现对齐） | 前端改动时 |
| 设计还原审查 | `[[skill:csp-qa]]`（设计还原度/发布裁决 Pass/Warning/Fail） | 发布前 |
| 代码审查（多审） | `[[skill:csp-multi-review]]`（分层评审/置信度门控/去重合并） | 每个 PR |
| 代码审查（标准） | `[[skill:csp-code-review]]`（正确性/复用/简化/效率） | 每个 PR |
| 安全审查 | `[[skill:csp-security-review]]`（鉴权/越权/注入/依赖 CVE） | 每个版本 |
| 后端性能 | `[[skill:csp-backend-performance]]`（API P95/慢查询/N+1/缓存/连接池） | 有后端时 |
| 前端性能审计 | `[[skill:csp-web-performance-auditor]]`（CWV 审计/加载/渲染/网络） | 前端项目 |
| 前端性能优化 | `[[skill:csp-frontend-performance]]`（bundle 分析/代码分割/缓存策略） | 前端项目 |
| 可观测审计 | `[[skill:csp-observability-and-instrumentation]]` + `[[skill:csp-monitoring-alerting]]`（日志/指标/链路/告警） | 每个版本 |
| 全栈集成审计 | `[[skill:csp-e2e-deep-audit]]` + `[[skill:csp-cross-layer-testing]]`：跨前端/后端/DB 三层一致性扫描——端点→消费者映射、接口→实现对齐、DB schema→代码 model 对齐 | 里程碑后 |
| 重构策略 | `[[skill:csp-refactoring-strategies]]`（Strangler Fig/并行运行/分支抽象） | 需要时 |

---

## 反模式速查

| 反模式 | 症状 | 正确做法 |
|--------|------|---------|
| 测试后补 | 代码写完再补测试 | TDD——先有测试依据→用例设计→测试代码→实现代码 |
| happy path 全覆盖 | 只测正常流程 | 每个无效等价类独立用例；每个非法迁移单独验证 |
| 测试与 PRD 脱节 | 测了但不知道测的是哪个 AC | AC 双向追溯：AC→用例 + 用例→AC |
| 前端只测 API | 只验证接口返回，不验证 UI 实际渲染 | E2E + 视觉回归 + 联动验证 |
| 后端不测前端关联 | 认为"API 正确=前端正确" | 跨层往返：UI→API→DB 三层断言一致 |
| E2E 替代分层 | 全写 E2E 不写单元测试 | 测试金字塔：单元 60% + 集成 25% + E2E 5-10% |
| 只看覆盖率数字 | 80% 覆盖率但全是 happy path | 覆盖率+等价类/边界/迁移覆盖率 |
| 不测 DB 状态 | 只断言 API 响应 | DB 前后状态断言 + 事务回滚验证 |
| 上线不冒烟 | 部署完就算上线 | 生产环境关键路径冒烟 + DB 迁移确认 |
| 漏测不补回归 | 线上 bug 修完不加回归测试 | 每个线上 bug → 至少 1 条回归用例 |
| 只测不审 | 功能测试全绿就当系统没问题 | 审计（TA）独立于测试——结构健康/可用性/模块化/可追溯缺一不可 |
| 📋 已知但不修 | finding 标"已知/之前就这样/任务级非 bug"然后留着 | 要么 closed（修了）、要么 BLOCKED（附阻塞点+解除人）、要么 deferred（附解除条件）。没有"📋 已知"这个状态 |

---

## 产物路径

```
项目根/
├── docs/analysis/
│   ├── test-basis-{version}.md           # 测试依据表（从 PRD 提取）
│   ├── test-cases-{feature}.md            # 完整用例集
│   ├── traceability-{feature}.md          # AC 双向追溯矩阵
│   └── test-retro-{version}.md            # 测试复盘（覆盖率/漏测分析）
├── verify/
│   ├── ui-test-report.md                  # E2E 测试报告
│   └── visual-diff/                       # 视觉回归截图对比
└── .csp/
    ├── TMS/                               # Test Module Spec 产物
    ├── test-spec/
    └── manifest.json                       # 回写测试产物索引
```

---

## 与 Pipeline 的衔接

本测试流程产出直接嵌入 `[[prompts/000-develop_pipeline_csp.md]]` S6 质量门控：

```
Pipeline S6 质量门控                   测试流程对应 Phase
──────────────────                    ─────────────────
Check 1: 测试 (verify-phase)    ←───  Phase TU + TI + TE（全部测试跑通）
Check 1.5: Backend API 测试     ←───  Phase TI（API 测试全绿）
Check 5: AC 逐条演示             ←───  Phase TD 追溯矩阵（AC→用例→通过）
Check 5.5a: 无障碍审计          ←───  Phase TP（a11y-testing）
Check 5.5b: 前端性能            ←───  Phase TP（frontend-performance）
Check 5.5c: 跨层契约             ←───  Phase TI（cross-layer-testing）
Check 5.6: E2E 测试              ←───  Phase TE（e2e-testing）
Check 5.7: 视觉回归              ←───  Phase TV（visual-regression）
Check 5.8: DB 迁移验证           ←───  Phase TP（db-migration-testing）
Check 5.9: 安全审查              ←───  Phase TSEC（security-review）
Check 5.10: 后端性能             ←───  Phase TP（backend-performance + load-testing）

审计 findings（Phase TA）独立于测试门控——无 CRITICAL 审计 finding 是放行的必要条件之一。
审计前缀 AUDIT-F-NN，与测试 findings（GAP-F/UI-F/CRITIC-F）可并存去重。
P0 审计 finding → 标 快速修复=true → 直发 04→05→06，不等下一轮 roadmap。
```

---

按依据提取 → 用例设计 → 分层实施 → 系统审计 → 质量门控 → 上线验证链执行。

**协作时序**：S3 Spec（含可测试性点）→ Test Pipeline TB 提取依据 + TD 设计用例 → 05 TDD 同步产出测试代码 → 06 门控验证。

**缺口报告**：执行过程中若发现本说明未覆盖的测试维度、或引用的 CSP skill 不包含所需测试方法论（测试类型缺失/深度不足），**立即指出缺口**——不跳过、不假装覆盖、不用「可以了」糊过。

AI 自主完成，每个阶段按进度条播报，全部完成后输出总测试报告，交棒 pipeline 06 门控。

---

## 三文档协作关系

本文件是 CSP 三件套之一（测试段），与另外两个文件配合使用：

```
000-product-planning_csp.md
  │  产出：PRD SPECs（含 AC/功能清单/业务规则）
  │
  ├──→ 000-test_pipeline_csp.md（本文件）
  │       │  测试 Pipeline：TB→TD→TU→TI→TE→TV→TP→TSEC→TQ
  │       │  TB 从 PRD SPEC 提取测试依据 → TD 设计用例 → 分层实施
  │       │
  │       └──→ 嵌入 000-develop_pipeline_csp.md
  │              开发 Pipeline S6 质量门控（Check 1–5.10）
  │              TQ 产出测试证据 → 消费 S6 各 Check
  │
  └──→ 000-develop_pipeline_csp.md
         开发 Pipeline：01 PRD→02 拆解→...→06 门控→07 复盘
```

- **上游输入** = `000-product-planning_csp.md` 产出的 PRD SPECs（TB 提取测试依据）+ ROADMAP（确定测试版本范围）
- **本文件职责** = 测试全链路：依据→设计→分层实施→门控→上线验证
- **下游输出** = 测试证据嵌入 `000-develop_pipeline_csp.md` S6 质量门控各 Check
- **项目治理** = `[[prompts/000-project-governance_csp.md]]` 定义产物路径/版本管理/文档边界——本文档产物落盘遵循 G2.1 约定