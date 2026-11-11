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
- 技术方案设计：[[workflow:csp-tech-solution-design]]（S2.5）
- 设计评审：[[workflow:csp-tech-design-review]]（S2.6）
- 全栈 Spec：[[workflow:csp-fullstack-spec-generator]]（S3）
- 任务拆解：[[workflow:csp-tech-task-breakdown]]（S3.5）
- 实施规划：[[workflow:csp-plan-phase]]（S4）

Spec 验收门：PRD 含背景/目标/功能清单/Given-When-Then 验收标准；Spec 含技术方案/接口契约/测试计划/风险，关键改动带 file:line 证据。quick-fix 类版本走轻量 Spec 一页纸（改动点+证据+验证方式），主题版本走完整 Spec。

开发阶段（05）使用 [[workflow:csp-implementation-phase]]，遵循 TDD 流程 [[meta:csp-tdd]]，coding agent 遵守 [[pattern:csp-coding-standards]] 的全部命名/安全/跨层对齐规则。

自决策授权（默认自己拍板，不问我）：范围/优先级、Spec 歧义、Wave 排序、fix 路由（05 实现缺陷 / 03 Spec 缺口）、可逆整改（归档 re-point、版本漂移 bump）、CMS re-align、deferred 取舍——这些你自己定，定了记入 DEV-LOG 即可，不打断我。

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

留尾纪律：剩余项只能 done / BLOCKED（附阻塞+谁解除）/ deferred（附解除条件并计入 Release notes），禁止"下轮再补/gate 全绿就交差"。deferred 项不阻塞当前版本发布，但要自动并入下一版本 01 的入口清单。

收尾必做：
- commit（Conventional Commits、原子提交；遵循 [[pattern:csp-git-conventions]] §3 Commit Workflow）
- CHANGELOG.md 追加
- tag（遵循 prompts/version-management.md §五 Tag 规则：v 前缀 + annotated + 不可变 + 一 commit 一 tag）
- 六处版本同步 → `python3 prompts/scripts/version_integrity_check.py`
- push origin → Release → 归档

findings 回写契约：仅对"本版本真实修复且已验证"的 findings 回写；fixed_in 必须真实存在（tag/commit）+ verification 证据（file:line / ran+exit / 实机截图）。预关闭 → exit 1。

版本与门禁条款：
- 纯文档 commit 禁打版本 tag（[[pattern:csp-git-conventions]] §6 Tag Discipline）
- 一 commit 一 tag，禁多 tag 同 commit
- guardrail 脚本落盘 + CI 接线，未接 CI 不得声称 enforcement

每版本 checkpoint 落盘：更新 .csp/lifecycle-state.json + DEV-LOG 追加本轮决策摘要，保证会话中断可无损续跑。

gate 即授权，全自动推进。打断条件（仅 5 类）：战略根本模糊 / PRD Rejected / 真破坏操作 / 多 tag 不明 / 无法 auto-resolve 的报错。07 复盘默认自动触发（[[pattern:csp-retro]]），lessons 并入下一版本 01 入口清单。质量自评可选用 [[pattern:csp-agent-self-evaluation]] 做 5 轴结构性复盘。

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
| 质量门控（S6） | `[[workflow:csp-release-manager]]`（全流程）或 `[[workflow:csp-verify-phase]]`（单独验证） |
| 审查（S7） | `[[workflow:csp-code-review]]` |
| 双审对抗验证 | `[[pattern:csp-santa-method]]` |
| 跨层集成审查 | `[[pattern:csp-integration-review]]` |
| 无障碍审计 | `[[agent:csp-a11y-architect]]`（WCAG 2.2/语义化/焦点管理） |
| 前端性能 | `[[agent:csp-web-performance-auditor]]`（CWV 审计）或 `[[skill:csp-frontend-performance]]`（bundle/缓存优化） |
| 跨层契约测试 | `[[skill:csp-cross-layer-testing]]`（前后端契约验证/UI→API→DB 往返 traceable） |
| 四声部决策 | `[[pattern:csp-council]]`（架构/怀疑/务实/批评） |
| AI 盲点回归测试 | `[[pattern:csp-ai-regression-testing]]` |
| 任务自评 | `[[pattern:csp-agent-self-evaluation]]`（5 轴结构性复盘） |
| Agent 治理 | `[[workflow:csp-agent-governance]]`（4 级安全护栏） |
| 发布（S8） | `[[workflow:csp-ship]]` |
| Git 规范 | `[[pattern:csp-git-conventions]]` |
| 版本管理 | prompts/version-management.md（规则参考文档） |
| 复盘（S10） | `[[pattern:csp-retro]]` |
| 文档治理 | `[[workflow:csp-documentation-governance]]` |
| 文档生命周期 | `[[workflow:csp-doc-lifecycle-manager]]` |
| 用户体系设计 | `[[pattern:csp-user-system-design]]`（账号/RBAC/认证/数据模型） |
| GDPR 隐私合规 | `[[pattern:csp-privacy-compliance]]`（含 GDPR 工程参考） |
| 前端开发 | `[[skill:csp-frontend-patterns]]`（CSP 原生前端模式入口）或 prompts/frontend-development.md（零依赖独立 prompt） |

---

继续完成所有版本的任务开发，多agent并行（最多3个），在你的自决授权范围内，要自己定方案并解决，你要自己规划任务，充分思考方案细节不能偏差出错，没有完成就继续完成任务，直到所有任务完成。需要决策的你要能自我驱动给出最合理的决策，实在不敢自己定夺的时候要询问我。先不用worktree的方式开发。