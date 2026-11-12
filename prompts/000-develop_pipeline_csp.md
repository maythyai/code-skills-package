使用 [[workflow:csp-lifecycle-orchestrator]] 从当前 .csp/lifecycle-state.json 续跑，连续推进所有待交付版本（待交付 = ROADMAP 中 status planned/in-progress；deferred 版本不并入活跃队列，待解除条件满足才并入），版本间不停：每个版本 06 done（push origin、已打 tag、已出 Release、已归档）后，自动读 docs/strategy/ROADMAP.md 取下一个未交付版本，回 01 开启下一轮，直到队列清空。ROADMAP 须已过集成必要性审视；若未过或过期，先 spawn [[workflow:csp-roadmap-planner]] 净化版本队列再续跑；若净化产生新增/重排的版本批次，先过 [[csp-product-design-convergence]] 收敛审查（定位对齐/导航准入/系统卫生），收敛后功能清单才是 01 的合法输入。仅当我说"只做某个版本"时才单版本停。

每轮 01 前置四读（缺一不可）：
① 读 .csp/agent-conventions/ 全部规范（ai-coding-guardrails.md 的 G-01~G-08、VERIFICATION-DISCIPLINE.md 等），05 开发逐条遵守；
② 读 .csp/{audit,ui-review,critic,gap-analysis}/ 最新批次 findings，把与本版本主题对应的 findings 并入入口清单作为验收项；
③ 对账 .csp/lifecycle-state.json 与 docs/strategy/ROADMAP.md（前者为运行时真相、后者为规划真相），漂移则按授权修复并记 DEV-LOG；
④ 检查既有 BLOCKED 项解除条件，满足者并入本版本入口清单。

先有完整 PRD 和详细技术 Spec，Spec 齐全后才进开发（05），不写无 Spec 的代码：
- PRD：[[workflow:csp-prd-generation]]（PM 视角）或 [[pattern:csp-prd]]（设计师视角）
- 需求拆解：[[workflow:csp-requirement-decomposition]]（S1）
- 技术选型：[[workflow:csp-tech-stack-advisor]]（S2）
- 数据库选型：`[[workflow:csp-tech-stack-advisor]]` 覆盖存储层决策（PostgreSQL/MySQL/SQLite/NoSQL），产出 ADR
- 技术方案设计：[[workflow:csp-tech-solution-design]]（S2.5）
- 设计评审：[[workflow:csp-tech-design-review]]（S2.6）
- 全栈 Spec：[[workflow:csp-fullstack-spec-generator]]（S3）
- 任务拆解：[[workflow:csp-tech-task-breakdown]]（S3.5）
- 实施规划：[[workflow:csp-plan-phase]]（S4）

Spec 验收门：PRD 含背景/目标/功能清单/Given-When-Then 验收标准；Spec 含技术方案/接口契约/测试计划/风险，关键改动带 file:line 证据。quick-fix 类版本走轻量 Spec 一页纸（改动点+证据+验证方式），主题版本走完整 Spec。

**Spec 产出可测试性点**（S3 Spec 生成时同步产出，供 Test Pipeline TD 用例设计消费）：
- **接口契约** → 每个端点/请求-响应对 → 对应 ≥1 条 API 测试用例
- **数据模型** → 每个 entity/字段/约束 → 对应用例；同步产出 DDL，逐字段与 PRD 功能需求对齐
- **业务规则** → 每条规则 → 对应正常+异常+边界用例
- **错误场景** → 每个错误码/异常路径 → 对应 negative 用例
- **状态机** → 每个合法/非法迁移 → 对应状态迁移用例
- S3 Spec 产出后，`[[prompts/000-test_pipeline_csp.md]]` Phase TD 从 Spec 提取可测试性点设计用例

开发阶段（05）使用 [[workflow:csp-implementation-phase]]，遵循 TDD 流程 [[meta:csp-tdd]]，coding agent 遵守 [[pattern:csp-coding-standards]] 的全部命名/安全/跨层对齐规则。

**TDD 执行纪律**（05 开发期）：先写测试 → 实现 → 重构，测试与源码同 commit 提交：
- **单元测试**：与源码同目录 co-locate（`src/xxx.ts` ↔ `tests/unit/xxx.test.ts`），05 agent 在写实现代码前先写测试
- **API 测试**：在 `tests/integration/` 下，与 API 实现同步产出
- **E2E 测试**：核心路径用例在 05 开发期同步编写（非等 06 门控前补）
- 测试代码与实现代码在同一 commit，不拆"先提交实现、下个 commit 补测试"

**05 产出包括测试代码**：05 done = 源码 + 测试代码 + 测试通过（单元 + API），E2E 核心路径至少骨架就位。

**全栈开发模式**（05 开发期间引导各层实现）：
- 前端：`[[skill:csp-frontend-patterns]]`（组合/状态/性能/表单/数据获取，框架无关）
- 后端：`[[skill:csp-backend-patterns]]`（API 设计/分层架构/错误处理/幂等/分页）
- 数据库：`[[skill:csp-postgres-patterns]]`（Schema 设计/索引/查询优化）+ `[[skill:csp-db-migration]]`（Schema 变更/数据迁移/回滚/零停机）

**数据库开发保障**（05 开发期间）：
- Schema 设计：从 Spec 数据模型生成 DDL，与 PRD 功能需求逐字段对齐
- SQL 审查：`[[skill:csp-sql-reviewer]]` — 每条新增/变更 SQL 过审
- DB 性能：`[[skill:csp-db-performance]]` — 热路径 SQL 索引/查询优化
- 数据完整性：`[[skill:csp-db-state-assertion]]` — 写操作前后 DB 状态验证
- API 治理：`[[skill:csp-api-governance]]`（契约/版本管理/限流/认证授权模式）

**代码质量保障**（05 开发期间并行）：
- 编码规范：`[[pattern:csp-coding-standards]]`（通用跨语言规范）+ 语言专精（`[[skill:csp-python-coding-standards]]` / `[[skill:csp-java-coding-standards]]` / `[[skill:csp-cpp-coding-standards]]`）
- 关键日志：`[[skill:csp-observability-and-instrumentation]]`（关键路径日志/结构化日志/trace_id，不遗漏也不冗余）
- DRY 与复用：`[[skill:csp-code-simplification]]`（死代码清理/AI 冗余消除/重复逻辑合并）+ `[[skill:csp-refactoring-strategies]]`（重构路径规划）
- 最小改动：`[[skill:csp-minimal-change-engineer]]`（只修该修的，拒绝 scope creep）

**测试嵌入**：开发期间测试并行推进——`[[prompts/000-test_pipeline_csp.md]]` 从当前版本的 PRD SPEC 提取测试依据→设计用例→分层实施，产出测试证据直接嵌入 S6 质量门控。

自决策授权（默认自己拍板，不问我）：范围/优先级、Spec 歧义、Wave 排序、fix 路由（05 实现缺陷 / 03 Spec 缺口）、可逆整改（归档 re-point、版本漂移 bump）、CMS re-align——这些你自己定，定了记入 DEV-LOG 即可，不打断我。**deferred 禁止自决策**：任何 deferred 项必须在 DEV-LOG 中注明解除条件 + 预期版本——不是"下轮再说"的万能兜底。

循环收敛：06 未过按根因回 05/03 修 delta 重验，循环到全绿；超 5 轮再报我。跨版本熔断：连续 3 个版本因同一根因失败，暂停并报我，附根因证据链。

06 done 硬定义（由 [[workflow:csp-release-manager]] 执行全流程，详见 prompts/06-verify-ship.md，任一不满足即 06 未过）：
- S6 质量门控全 ran（附命令+exit code 证据，禁止 not-run 降级）：
  Check 1: 测试 → [[workflow:csp-verify-phase]] Check 1
  Check 1.5: Backend API 测试（必检，不可跳过）→ tests/backend/api/ 全绿
  Check 2: Lint → ran: <lint cmd> exit 0
  Check 3: Build → ran: <build cmd> exit 0
  Check 4: TypeCheck → ran: <tsc/mypy> exit 0
  Check 5: AC 逐条演示
  Check 5.5: 前端专项（前端项目必检，纯后端 skip）：
    Check 5.5a: 无障碍审计 → [[agent:csp-a11y-architect]]（WCAG 2.2 AA 合规）
    Check 5.5b: 前端性能 → [[agent:csp-web-performance-auditor]]（CWV 不劣化）或 [[skill:csp-frontend-performance]]（bundle/缓存优化）
    Check 5.5c: 跨层契约验证 → [[skill:csp-cross-layer-testing]]（前后端接口契约一致性，UI→API→DB 往返 traceable）
  Check 5.6: E2E 测试（有 UI 的项目必检）→ [[skill:csp-e2e-testing]]（全路由 sweep + 关键路径冒烟，Playwright/Cypress，exit 0）
  Check 5.7: 视觉回归测试（有 UI 且改动了界面时必检）→ [[skill:csp-visual-regression]]（截图 vs 基线 diff，无意外变更）
  Check 5.8: DB 迁移验证（有 DB schema 变更时必检）→ [[skill:csp-db-migration]]（正向/回滚 ran，数据完整性验证，exit 0）
  Check 5.8a: SQL 审查（有 DB 时必检）→ [[skill:csp-sql-reviewer]]（新增/变更 SQL 全量过审——性能/索引/安全）
  Check 5.8b: DB 状态断言（有 DB 写操作时必检）→ [[skill:csp-db-state-assertion]]（写前后 DB 行数/字段/关联正确，无遗漏字段）
  Check 5.9: 安全审查 → [[skill:csp-security-review]]（鉴权/越权/注入/XSS/CSRF/敏感数据脱敏/依赖漏洞）
  Check 5.10: 后端性能 → [[skill:csp-backend-performance]]（API P95/慢查询索引/N+1/缓存策略/连接池，有后端时选做）
  （工具链不可用 = BLOCKED，不得用 grep/review 替代动态门控）
- S7 审查无 CRITICAL → [[workflow:csp-code-review]] + [[pattern:csp-santa-method]]（关键模块双审）
- 跨层集成验证 → [[pattern:csp-integration-review]]（11 场景全栈契约审查）
- 7.6 对账 reconciled=true（含 findings 闭合闸门 exit 0）
  → `python3 prompts/scripts/findings_closure_check.py --baseline .csp/findings-baseline.json`
- 版本对齐（版本完整性闸门全部通过）
  → `python3 prompts/scripts/version_integrity_check.py --baseline .csp/version-baseline.json`
  T1 多 tag 同 commit（零违规）/ T2 空 tag / T3 六处同步 / T4 CHANGELOG / T5 tag 领先 / T6 发布缺失
- 归档完成 → [[workflow:csp-ship]] + 里程碑归档
- 文档结构维护 → [[workflow:csp-documentation-governance]]（对外/对内文档分界 + 更新触发规则）
- C-01 批量交付 S6 完整性格栅：batch_evidence_map 不得缺失
- Phase 0.6 发布复发检测：WARNING/BLOCKED 按阈值处理
- deferred 审视 gate：06 done 前逐条审视 deferred 列表——不可 deferred 的升为 done/BLOCKED，可 deferred 的确认解除条件有效，超 3 条或跨版本 deferred 减速报用户

留尾纪律：剩余项只能 done / BLOCKED（附阻塞+谁解除）/ deferred（附解除条件并计入 Release notes），禁止"下轮再补/gate 全绿就交差"。deferred 项不阻塞当前版本发布，但要自动并入下一版本 01 的入口清单。

**deferred 纪律（防积压）**：
- **不可 deferred**：本版本 Spec 明确列出的功能点、AC 覆盖的验收项、已发现的 P0/P1 缺陷——这些是本版本的"已承诺范围"，要么 done 要么 BLOCKED，不准 deferred
- **可 deferred**：本版本 Spec 未列入的非承诺项、用户口头提到的"顺便看看"、发现但 P2/P3 的问题——这些可 deferred，但必须附解除条件（触发版本/依赖就绪/用户确认）
- **deferred 上限**：每个版本 deferred 项不超过 3 条（超过 → Agent 必须在 06 done 前 review 并合并/升级/eliminate，减速报用户）
- **deferred 不得跨版本：同一项连续 2 个版本出现在 deferred 列表中 → 必须升级为 BLOCKED（标注阻塞原因）或降级为 WONTFIX（明确不做）——禁止"永远 deferred"项
- **06 done 前 deferred 审视**：发布前逐条过——这个真的本版本做不了？还是"懒得做/忘了做/没规划好"？
  - "本版本做不了" → 保留 deferred + 明确的解除条件
  - "懒得做" → 升为 done（立即做，不拖延）
  - "忘了做" → 升为 BLOCKED（标注阻塞原因）
  - "没规划好" → 回 01/03 补 Spec

收尾必做：
- commit（Conventional Commits、原子提交；遵循 [[pattern:csp-git-conventions]] §3 Commit Workflow）
- CHANGELOG.md 追加
- tag（遵循 prompts/version-management.md §五 Tag 规则：v 前缀 + annotated + 不可变 + 一 commit 一 tag）
- 六处版本同步 → `python3 prompts/scripts/version_integrity_check.py`
- push origin → Release → 归档
- CI/CD 管道验证 → [[skill:csp-cicd-pipelines]]（构建/测试/部署管道通过，GitHub Actions/Jenkins 绿）
- 部署 → [[skill:csp-deployment]]（健康检查/回滚策略/灰度/蓝绿，无 downtime）
- 可观测投产 → [[skill:csp-monitoring-alerting]] + [[skill:csp-observability-and-instrumentation]]（关键指标/日志/链路/告警规则已就绪）

findings 回写契约：仅对"本版本真实修复且已验证"的 findings 回写；fixed_in 必须真实存在（tag/commit）+ verification 证据（file:line / ran+exit / 实机截图）。预关闭 → exit 1。

版本与门禁条款：
- 纯文档 commit 禁打版本 tag（[[pattern:csp-git-conventions]] §6 Tag Discipline）
- 一 commit 一 tag，禁多 tag 同 commit
- guardrail 脚本落盘 + CI 接线，未接 CI 不得声称 enforcement

每版本 checkpoint 落盘：更新 .csp/lifecycle-state.json + DEV-LOG 追加本轮决策摘要，保证会话中断可无损续跑。

gate 即授权，全自动推进。打断条件（仅 6 类）：战略根本模糊 / PRD Rejected / 真破坏操作 / 多 tag 不明 / 无法 auto-resolve 的报错 / deferred 堆积（单版本 >3 条或同项跨 2 版本 deferred）。07 复盘默认自动触发（[[pattern:csp-retro]]），lessons 并入下一版本 01 入口清单。质量自评可选用 [[pattern:csp-agent-self-evaluation]] 做 5 轴结构性复盘。

**缺口报告**：执行过程中若发现本说明未覆盖的维度、或引用的 CSP skill 不包含所需方法论（功能缺失/深度不足），**立即指出缺口**——不跳过、不假装覆盖、不用「可以了」糊过。

迭代间代码健康维护（版本间隙或 07 复盘发现代码债时触发）：
- 重构 → `[[skill:csp-refactoring-strategies]]`（Strangler Fig / Branch by Abstraction / 并行运行，大规模架构演进）
- 代码整洁 → `[[skill:csp-code-simplification]]`（死代码清理/简化 AI 生成冗余/移除未使用依赖）

完成每个版本按进度条格式播报，全部版本清空后输出总发布摘要再停。

---

## CSP Skill 路径速查

| 阶段 | CSP Skill |
|------|-----------|
| 全生命周期编排 | `[[workflow:csp-lifecycle-orchestrator]]` |
| Roadmap 规划 | `[[workflow:csp-roadmap-planner]]` |
| 架构收敛审查 | `[[csp-product-design-convergence]]` |
| 产品管理（PM 视角） | `[[agent:csp-pm]]`（用户故事/验收标准/优先级） + `[[agent:csp-analyst]]`（商业模型/成本收益/SWOT） |
| 产品透镜审查 | `[[agent:csp-product-lens-reviewer]]`（前提挑战/战略后果/目标-需求对齐） |
| PRD 生成（PM 视角） | `[[workflow:csp-prd-generation]]` |
| PRD（设计师视角） | `[[pattern:csp-prd]]` |
| 需求拆解（S1） | `[[workflow:csp-requirement-decomposition]]` |
| 技术选型（S2） | `[[workflow:csp-tech-stack-advisor]]` |
| 技术方案设计（S2.5） | `[[workflow:csp-tech-solution-design]]` |
| 设计评审（S2.6） | `[[workflow:csp-tech-design-review]]` |
| 全栈 Spec（S3） | `[[workflow:csp-fullstack-spec-generator]]` |
| 用户体验设计 | `[[agent:csp-ux-designer]]`（用户流/线框/可用性启发式） |
| 前端设计 | `[[skill:csp-frontend-design]]`（设计语言库/Token/主题） + `[[skill:csp-flow-web]]`（16 场景多屏流程） |
| 任务拆解（S3.5） | `[[workflow:csp-tech-task-breakdown]]` |
| 实施规划（S4） | `[[workflow:csp-plan-phase]]` |
| 设计→开发桥接 | `[[workflow:csp-design-to-workflow-bridge]]` |
| 并行开发（S5） | `[[workflow:csp-implementation-phase]]` |
| TDD | `[[meta:csp-tdd]]` |
| 测试方法论 → 专项测试 skill 分派 | `[[meta:csp-test-methodology]]`（契约/属性/变异/模糊/混沌/差分/并发/无障碍/国际化/可观测/后端 mock/DB 迁移/Kotlin） |
| 编码规范 | `[[pattern:csp-coding-standards]]` |
| 前端开发模式 | `[[skill:csp-frontend-patterns]]`（组合/状态/性能/表单/数据获取/无障碍，框架无关） |
| 后端开发模式 | `[[skill:csp-backend-patterns]]`（API 设计/分层架构/错误处理/幂等/分页）+ `[[skill:csp-postgres-patterns]]`（Schema 设计/索引/查询优化） |
| 数据库迁移 | `[[skill:csp-db-migration]]`（Schema 变更/数据迁移/回滚/零停机） |
| SQL 审查 | `[[skill:csp-sql-reviewer]]`（查询性能/索引使用/安全/注入防护） |
| DB 性能 | `[[skill:csp-db-performance]]`（慢查询/索引优化/连接池/锁竞争） |
| DB 状态断言 | `[[skill:csp-db-state-assertion]]`（写操作前后 DB 状态验证/字段完整性） |
| API 治理 | `[[skill:csp-api-governance]]`（契约/版本管理/限流/认证授权模式） |
| 代码整洁 | `[[skill:csp-code-simplification]]`（死代码清理/AI 冗余消除/重复合并）+ `[[skill:csp-refactoring-strategies]]`（大规模重构路径） |
| 最小改动工程 | `[[skill:csp-minimal-change-engineer]]`（只修该修的，拒绝 scope creep） |
| 可观测与日志 | `[[skill:csp-observability-and-instrumentation]]`（关键路径日志/结构化日志/trace_id/指标） |
| 质量门控（S6） | `[[workflow:csp-release-manager]]`（全流程）或 `[[workflow:csp-verify-phase]]`（单独验证） |
| 审查（S7） | `[[workflow:csp-code-review]]` |
| 双审对抗验证 | `[[pattern:csp-santa-method]]` |
| 跨层集成审查 | `[[pattern:csp-integration-review]]` |
| 安全审查（S7 必检） | `[[skill:csp-security-review]]`（鉴权/越权/注入/XSS/CSRF/敏感数据脱敏/依赖漏洞） |
| 后端性能 | `[[skill:csp-backend-performance]]`（API P95/慢查询索引/N+1/缓存策略/连接池） |
| 无障碍审计 | `[[agent:csp-a11y-architect]]`（WCAG 2.2/语义化/焦点管理） |
| 前端性能 | `[[agent:csp-web-performance-auditor]]`（CWV 审计）或 `[[skill:csp-frontend-performance]]`（bundle/缓存优化） |
| 跨层契约测试 | `[[skill:csp-cross-layer-testing]]`（前后端契约验证/UI→API→DB 往返 traceable） |
| E2E 测试 | `[[skill:csp-e2e-testing]]`（全路由 sweep/关键路径冒烟/浏览器自动化，Check 5.6） |
| 视觉回归测试 | `[[skill:csp-visual-regression]]`（截图 vs 基线 diff，UI 意外变更检测，Check 5.7） |
| 负载测试 | `[[skill:csp-load-testing]]`（k6/Locust，SLA 百分位/并发模型/瓶颈定位，选做） |
| 四声部决策 | `[[pattern:csp-council]]`（架构/怀疑/务实/批评） |
| AI 盲点回归测试 | `[[pattern:csp-ai-regression-testing]]` |
| 任务自评 | `[[pattern:csp-agent-self-evaluation]]`（5 轴结构性复盘） |
| Agent 治理 | `[[workflow:csp-agent-governance]]`（4 级安全护栏） |
| 发布（S8） | `[[workflow:csp-ship]]` |
| CI/CD 管道 | `[[skill:csp-cicd-pipelines]]`（构建/测试/部署管道，GitHub Actions） |
| 部署策略 | `[[skill:csp-deployment]]`（健康检查/回滚/灰度/蓝绿/零 downtime） |
| 可观测 | `[[skill:csp-monitoring-alerting]]` + `[[skill:csp-observability-and-instrumentation]]`（关键指标/日志/链路/告警） |
| Git 规范 | `[[pattern:csp-git-conventions]]` |
| 版本管理 | prompts/version-management.md（规则参考文档） |
| 复盘（S10） | `[[pattern:csp-retro]]` |
| 重构策略 | `[[skill:csp-refactoring-strategies]]`（Strangler Fig/Branch by Abstraction/并行运行，大规模架构演进） |
| 代码整洁 | `[[skill:csp-code-simplification]]`（死代码清理/简化 AI 冗余/移除未使用依赖） |
| 文档治理 | `[[workflow:csp-documentation-governance]]` |
| 文档生命周期 | `[[workflow:csp-doc-lifecycle-manager]]` |
| 用户体系设计 | `[[pattern:csp-user-system-design]]`（账号/RBAC/认证/数据模型） |
| GDPR 隐私合规 | `[[pattern:csp-privacy-compliance]]`（含 GDPR 工程参考） |
| 前端开发 | `[[skill:csp-frontend-patterns]]`（CSP 原生前端模式入口）或 prompts/frontend-development.md（零依赖独立 prompt） |

---

## 三文档协作关系

本文件是 CSP 三件套之一（开发段），与另外两个文件配合使用：

```
000-product-planning_csp.md
  │  产出：ROADMAP + PRD SPECs + FEATURES
  │
  └──→ 000-develop_pipeline_csp.md（本文件）
          │  开发 Pipeline：01→02→03→04→05→06→07→08→10
          │  每版本 01 从 PRD SPEC 升级模式启动
          │
          ├──← 06 质量门控消费测试证据
          │       │
000-test_pipeline_csp.md ←──┘
  │  测试 Pipeline：TB→TD→TU→TI→TE→TV→TP→TSEC→TQ
  │  从 PRD SPEC 提取测试依据 → 分层实施 → 嵌入 S6 门控
```

- **上游输入** = `000-product-planning_csp.md` 产出的 PRD SPECs + ROADMAP
- **本文件职责** = 版本交付：Spec→开发→质量门控→发布→复盘
- **测试嵌入** = `000-test_pipeline_csp.md` 提供测试依据/设计/实施/证据，嵌入 S6 门控
- **项目治理** = `[[prompts/000-project-governance_csp.md]]` 定义产物路径/版本管理/文档边界——本文档产物落盘遵循 G2.1 约定

---

继续完成所有版本的任务开发，多agent并行（限制最多4个并发），在你的自决授权范围内，要自己定方案并解决，你要自己规划任务，充分思考方案细节不能偏差出错，没有完成就继续完成任务，直到所有任务完成。需要决策的你要能自我驱动给出最合理的决策，实在不敢自己定夺的时候要询问我。先不用worktree的方式开发。
