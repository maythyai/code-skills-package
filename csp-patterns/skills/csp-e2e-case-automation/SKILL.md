---
name: csp-e2e-case-automation
description: >
  从自然语言/JSON 测试用例自动生成并执行 Playwright 端到端测试：解析用例步骤 → 自愈式
  元素定位（经验学习 > 动态探测 > ID > 邻近 > 语义 > 属性 > CSS）→ 执行并采集证据 →
  通过后生成确定性 TypeScript 测试脚本。支持登录态复用、增量执行（跳过已存在脚本）、
  业务术语库与经验库持续学习。当用户提供 JSON 测试用例并要求执行/生成 E2E 脚本，或需要
  把自然语言用例沉淀为可维护 Playwright 脚本时使用。务必在「用例 → 可执行脚本」转化场景
  使用此 skill，而不是手写 .spec.ts 后再调试。
version: 0.1.0
layer: 3
category: patterns
phase: verify
domain: testing
scope: testing
role: expert
tools: [Read, Write, Edit, Bash, Glob, Grep]
triggers:
  - "JSON测试用例"
  - "测试用例执行"
  - "生成测试脚本"
  - "E2E用例"
  - "端到端用例"
  - "Playwright脚本生成"
  - "自愈定位"
  - "经验学习"
  - "自然语言用例"
  - "用例转脚本"
  - "增量测试"
  - "case.json"
related_skills: [csp-e2e-testing, csp-playwright-ui-test, csp-h5-visual-testing, csp-visual-regression, csp-mock-strategies]
anti_rationalizations:
  "用例步骤太模糊先跑跑看": "步骤必须满足动作明确/目标具体/数据清晰/验证完整四标准，模糊步骤先补全再执行"
  "定位失败直接用 CSS 兜底": "CSS 类名随构建哈希变化最不稳定，仅在语义/ID/邻近全部失败后才兜底"
  "经验库过期了删掉重跑": "先合并更新成功率加权，盲目删除会丢失稳定策略；页面结构确实变了才重新探测"
  "生成的脚本带调试日志也无所谓": "生产脚本必须移除 console.log/思考注释/尝试代码，只保留确定性操作"
  "登录步骤也写进脚本": "登录由 auth.setup 统一处理，生成脚本时必须过滤掉登录相关步骤"
---

# E2E 用例自动化执行与脚本生成

> 把**自然语言/JSON 测试用例**变成**可运行的 Playwright 脚本**：解析步骤 → 自愈式定位 →
> 执行取证 → 通过后沉淀为确定性 TypeScript `.spec.ts`。定位失败不靠盲试，靠**经验学习 +
> 动态探测**的多策略降级。

**核心硬约束**：生成的 `.spec.ts` 必须是**最终确定性脚本**——移除一切调试日志、思考注释、
尝试性代码；登录由 `auth.setup` 统一处理，脚本中过滤掉所有登录步骤；验证/校验类步骤必须用
`expect` 强校验。详见 [references/production-code-standards.md](references/production-code-standards.md)。

## 与相关技能的分工

| 场景 | 选择 |
|------|------|
| JSON/自然语言用例 → 执行 + 生成可维护 TS 脚本（自愈定位 + 经验学习） | **本技能** |
| 交互式功能验证、按失败签名迭代修复直至 complete | `csp-playwright-ui-test` |
| H5/移动端批量视觉走查、截图取证（只取证不改码） | `csp-h5-visual-testing` |
| E2E 套件架构设计、POM/fixture/CI 集成 | `csp-e2e-testing` |
| 像素级视觉回归断言（toHaveScreenshot） | `csp-visual-regression` |

本技能产出**持久化的测试脚本**（工程资产），`csp-playwright-ui-test` 产出**当次验证结论**
（不落脚本）；两者都基于 Playwright，但目标产物不同。

## 核心机制

| 机制 | 说明 |
|------|------|
| **JSON 用例解析** | 标准格式：`email/password/baseUrl/testCases[].steps[]`；步骤是自然语言描述 |
| **自愈式定位** | 优先级：经验学习 > 动态探测 > ID > 邻近元素 > 语义化(role/text/label) > 属性 > CSS |
| **动态探测** | 为同一元素生成多种定位策略，多轮稳定性测试排序，取最稳的执行 |
| **经验学习** | 成功定位写入 `locator-experiences.json`，后续用例按相似度复用，持续提升准确率 |
| **业务术语库** | `terminology/business-terms.json` 把行业术语映射到别名/场景，辅助定位 |
| **登录态复用** | 检测登录 URL → 执行 `auth.setup`，生成脚本时自动过滤登录步骤 |
| **增量执行** | `tests/{file}/{case}.spec.ts` 已存在则跳过，只处理新用例 |
| **脚本生成** | 用例通过后用 `templates/production-template.ts` 沉淀为确定性 `.spec.ts` |

**前置**：Node.js + Playwright（`npm install -D @playwright/test && npx playwright install chromium`）。
**约束**：JSON 用例需提供 `baseUrl` 与可达的测试环境；登录账号用环境变量 `TEST_EMAIL`/`TEST_PASSWORD`，不硬编码。

## 代码生产生命周期中的定位

本技能覆盖「测试编写 → 测试执行 → 测试沉淀」环节，是 TDD/验收测试在 E2E 层的落地：

```
需求/PRD → 验收用例(JSON) ──→ 本技能 ──→ 可执行 .spec.ts ──→ 并入 E2E 套件(csp-e2e-testing) ──→ CI 门禁
              ↑                            |  ↑
              └── 经验库/术语库持续学习 ────┘  └── 失败时回到 csp-playwright-ui-test 交互修复
```

## 工作流总览

```
1. 用例解析  ── 校验 JSON 格式与字段；步骤质量筛查（动作/目标/数据/验证四要素）
2. 增量检查  ── 已存在 .spec.ts 的 testCase 跳过
3. 环境初始化 ── 启动浏览器；检测登录需求 → auth.setup 获取并复用登录态
4. 智能定位  ── 经验预加载 → 动态探测生成多策略 → 稳定性排序
5. 执行+学习 ── 取最佳策略执行；成功写经验库，失败按备选策略降级
6. 脚本生成  ── 用例通过后，用 production-template 沉淀为确定性 .spec.ts（过滤登录）
7. 验证      ── 重跑生成的脚本确认确定性可过；截图归档
8. 收尾      ── 执行统计 + 经验库持久化 + 术语库更新提示
```

## 步骤要点与行为准则（Agent 参考规范）

### 1. 用例解析与质量筛查

读取 JSON 用例，校验 `email/password/baseUrl/testCases` 四个必填根字段；
每个 testCase 校验 `name/description/url/steps`。格式规范见
[references/case-format-spec.md](references/case-format-spec.md)。

**步骤质量四标准（不达标先补全再执行，不要"先跑跑看"）**：

| 维度 | 要求 | 反例 |
|------|------|------|
| 动作明确 | 用"点击/输入/选择/验证/截图"等动词 | "操作某个按钮" |
| 目标具体 | 准确描述 UI 元素（含可见文案/标签） | "那个输入框" |
| 数据清晰 | 明确输入的具体值 | "输入一些数据" |
| 验证完整 | 关键操作后有结果验证步骤 | 只有操作没有验证 |

> 行为准则：`name` 用 kebab-case；`description` 中文简述；步骤中文、动词开头。模糊步骤
> **先回补用例**，不要带着模糊步骤进入定位阶段——否则定位阶段会用错误策略浪费经验库。

### 2. 增量检查（跳过已存在脚本）

执行前先扫 `tests/{filename}/{testCase.name}.spec.ts`：存在则跳过该 testCase，
输出 `⏭️ 跳过已存在的测试: {name}`；只对不存在脚本的用例执行+生成。
逻辑与目录映射见 [references/case-format-spec.md](references/case-format-spec.md) 的「文件组织」节。

> 行为准则：默认 `skipExisting=true`；需要重生成时显式 `--force` 并先备份旧脚本
>（`{case}.spec.ts.backup.{ts}`），不直接覆盖——已存在脚本可能已被人工维护。

### 3. 环境初始化与登录态

启动浏览器、配置超时。检测 `baseUrl`/当前 URL 含 `login`/`auth`/`sso` 时执行
`tests/auth.setup.ts`（或等价 setup）获取登录态，并保存到 `playwright/.auth/user.json` 复用。
策略、模板与备用登录检测见 [references/auth-setup.md](references/auth-setup.md)。

> 行为准则：账号密码一律走环境变量 `TEST_EMAIL`/`TEST_PASSWORD`，**禁止写入用例 JSON 或脚本**；
> 登录态文件不入 git（加入 `.gitignore`）；登录态过期（>24h）自动重登。

### 4. 智能定位（自愈核心）

为每个步骤的动作生成多种定位策略，按稳定性排序后取最佳执行：

```
经验学习策略（历史成功）→ 动态探测策略 → ID → 邻近元素 → 语义化 → 属性 → CSS（最后兜底）
```

- **经验预加载**：按动作描述+域名+动作类型相似度查 `locator-experiences.json`，命中则优先用历史成功策略
- **动态探测**：基于动作类型（click/fill/select）生成针对性策略组，多轮测试成功率+响应时间排序
- **稳定性分数**：`successScore*0.7 + speedScore*0.2 + priorityScore*0.1`

策略生成、稳定性测试、容错执行见 [references/dynamic-detection-strategies.md](references/dynamic-detection-strategies.md)；
各类定位器详解见 [references/locator-strategies.md](references/locator-strategies.md)。

> 行为准则：**定位优先级不可跳级**——只有高级策略全部失败才降级；CSS 兜底要说明前序策略为何失败。
> 多元素场景默认 `.first()`；文本匹配统一用忽略字间空格的正则（见
> [references/text-matching-strategies.md](references/text-matching-strategies.md)）。

#### 各定位策略参考

| 场景 | 参考文档 |
|------|----------|
| 综合：role/text/label/邻近/多元素/等待/容错 | [locator-strategies.md](references/locator-strategies.md) |
| ID 优先、智能 ID 检测、动态 ID 处理 | [id-locator-strategies.md](references/id-locator-strategies.md) |
| 标签→邻近元素（相邻/兄弟/父容器/表格） | [adjacent-locator-strategies.md](references/adjacent-locator-strategies.md) |
| Ant Design 表单行级定位（ant-/ant4- 类名） | [antd-form-locator-strategies.md](references/antd-form-locator-strategies.md) |
| 动作前快照 + 元素匹配度评分选最佳 | [snapshot-analysis-strategies.md](references/snapshot-analysis-strategies.md) |
| 操作前强制可见性检查（5s 超时 + safeClick/safeFill） | [visibility-check-strategies.md](references/visibility-check-strategies.md) |

### 5. 执行与经验学习

```
查询历史经验 → 合并动态策略 → 稳定性排序 → 取 Top-3 依次执行 → 成功则写经验库
```

失败时按备选策略降级；全部失败才报错并保存失败快照供排查。经验数据结构、收集/存储/查询/合并、
框架与 UI 库探测见 [references/experience-learning-system.md](references/experience-learning-system.md)。

> 行为准则：**经验库是累加的，不是覆盖的**——同一动作+URL 命中已有经验时走合并路径
>（更新成功率加权、usageCount+1），不要直接替换。页面结构确实变化（旧策略全部失败）时才
> 重新探测并标注失败策略。定期清理过时记录，但删除前先验证是否仍有页面在用。

### 6. 脚本生成（确定性产物）

用例通过后，用 [templates/production-template.ts](templates/production-template.ts) 沉淀为
`tests/{filename}/{case.name}.spec.ts`：

- **过滤登录步骤**：`LoginActionFilter` 移除登录相关操作，脚本只含业务步骤
- **强校验**：含"验证/校验/检查"关键词的步骤必须生成 `expect` 断言
- **确定性代码**：移除 console.log/思考注释/尝试代码/性能监控，只留 `waitFor(visible,5s)`+操作+断言+截图
- **忽略空格**：所有文本匹配用 `createSpaceIgnorePattern` 生成正则

清洁标准、对照示例见 [references/production-code-standards.md](references/production-code-standards.md)。

> 行为准则：**执行时可详尽，生成时必须简洁**。执行过程的日志是给人看的，不进文件；写入
> `.spec.ts` 的代码必须是"复制即可运行"的最终态。生成后**重跑一次**确认确定性可过，再标记完成。

### 7. 验证与收尾

- 重跑生成的 `.spec.ts`，确认无需动态探测逻辑也能稳定通过
- 截图归档到 `.csp/artifacts/verify/evidence/{filename}/{case.name}-results/`
- 输出执行统计（跳过/执行/总计）+ 经验库持久化 + 术语库更新建议
- 错误处理与重试见 [references/error-handling.md](references/error-handling.md)

## Output Format

所有产物按 JSON 文件名分目录组织（项目相对路径，不写绝对路径）：

```
project/
├── case.json                         # JSON 测试用例
├── tests/
│   ├── auth.setup.ts                 # 登录认证脚本（复用）
│   └── case/                         # {filename}/
│       ├── user-search.spec.ts       # {testCase.name}.spec.ts
│       └── data-edit.spec.ts
├── .csp/artifacts/verify/evidence/
│   └── case/
│       ├── user-search-results/      # {case}-results/
│       └── data-edit-results/
├── playwright/
│   └── .auth/user.json               # 登录态（gitignore）
└── locator-experiences.json          # 经验库（可入库，团队共享）
```

**路径规则**（固定，不要频繁变更）：
- JSON：`{filename}.json`（项目根）
- 脚本：`tests/{filename}/{testCase.name}.spec.ts`
- 截图：`.csp/artifacts/verify/evidence/{filename}/{testCase.name}-results/`
- 经验库：`locator-experiences.json`（项目根，团队可共享）
- 术语库：`terminology/business-terms.json`（随 skill 维护）

## 常见陷阱

- **断言只验证操作不验证业务**：只断言"点击执行了"，不断言"结果出现"→ 假阳性通过。
  验证步骤必须落到业务结果（Toast 可见、列表新增行、URL 跳转等）
- **CSS 类名兜底过早**：Ant Design / 框架的 class 含构建哈希，版本变动即失效，必须最后用
- **经验库覆盖而非合并**：新经验直接覆盖旧记录会丢失历史稳定策略，必须走合并+加权
- **登录步骤泄进脚本**：生成脚本未过滤登录 → 脚本每次跑都重登，浪费且不稳；必须 `LoginActionFilter`
- **动态 ID 当稳定 ID 用**：含时间戳/随机数的 ID 不能直接 `#id`，用 `[id^="prefix"]` 前缀匹配
- **Ant Select 的 role=combobox 被判 hidden**：Playwright 的 visible 检测会把 antd Select 的
  `[role="combobox"]` 判为隐藏，应点击外层 `.ant-select-selection` 容器，等待用 `attached` 而非 `visible`
- **静态下拉 vs 搜索下拉混用**：静态 Select 直接 `click()`→选 option；搜索 Select 必须
  `fill(关键词)`→等候选→点 option，少一步则值不生效
- **生成脚本带动态探测调用**：生产脚本不应依赖 `executeWithDynamicDetection` 运行时，
  应内联为确定性的 `getByRole/getByLabel` 调用

## 错误处理与降级

| 错误类型 | 降级方案 |
|----------|----------|
| 元素定位失败 | 多策略备选链 → 失败截图 → 写失败策略到经验库 |
| 网络超时/导航失败 | `navigateWithRetry`（3 次）+ `networkidle` 验证 |
| 断言失败 | 软断言重试（3 次，1s 间隔）→ 仍失败则记录实际值 |
| 只读输入框 | `removeAttribute('readonly')` + 设值 + 触发 input/change 事件 |
| 异步竞态 | `waitForAnyCondition` 多条件竞速，避免固定 timeout |

详细模式见 [references/error-handling.md](references/error-handling.md)。

## 参考文档索引

| 文档 | 内容 |
|------|------|
| [references/case-format-spec.md](references/case-format-spec.md) | JSON 用例格式、字段说明、步骤规范、文件组织、增量检查逻辑 |
| [references/locator-strategies.md](references/locator-strategies.md) | 定位优先级、语义化/邻近/多元素、等待策略、容错 |
| [references/id-locator-strategies.md](references/id-locator-strategies.md) | ID 优先、智能 ID 检测、动态 ID 前缀匹配 |
| [references/adjacent-locator-strategies.md](references/adjacent-locator-strategies.md) | 标签→邻近元素、表格内定位、多步骤邻近 |
| [references/antd-form-locator-strategies.md](references/antd-form-locator-strategies.md) | Ant Design 表单行级定位、Select/Checkbox 处理 |
| [references/text-matching-strategies.md](references/text-matching-strategies.md) | 忽略字间空格正则、多层级文本容错 |
| [references/visibility-check-strategies.md](references/visibility-check-strategies.md) | 强制可见性检查、safeClick/safeFill、条件等待 |
| [references/snapshot-analysis-strategies.md](references/snapshot-analysis-strategies.md) | 动作前快照、元素匹配度评分、备选元素切换 |
| [references/dynamic-detection-strategies.md](references/dynamic-detection-strategies.md) | 动态策略生成、稳定性测试排序、容错执行 |
| [references/experience-learning-system.md](references/experience-learning-system.md) | 经验数据模型、收集/存储/查询/合并、框架探测 |
| [references/auth-setup.md](references/auth-setup.md) | 登录检测、auth.setup 模板、登录步骤过滤器 |
| [references/error-handling.md](references/error-handling.md) | 定位/网络/断言/表单/异步错误处理 |
| [references/production-code-standards.md](references/production-code-standards.md) | 生产脚本清洁标准、生成流程、质量清单 |
| [templates/production-template.ts](templates/production-template.ts) | 确定性脚本模板（过滤登录 + 强校验） |
| [templates/test-script-template.ts](templates/test-script-template.ts) | 最小测试脚本骨架 |
| [terminology/business-terms.json](terminology/business-terms.json) | 业务术语库（别名/场景，按项目扩充） |
| [terminology/README.md](terminology/README.md) | 术语库使用与维护指南 |
