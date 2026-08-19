# CSP 编程技能审查报告

> 审查范围:编程语言/框架相关技能(L3 `csp-patterns` 为主,兼顾 L0 router 与跨层一致性)
> 审查日期:2026-06-22 · 版本基线:v0.7.0
> 方法:磁盘清单核验 + 抽样质量检查 + 覆盖矩阵分析 + registry/文档对齐核验

---

## 〇、修复进展(2026-06-22 更新)

本次已通过子智能体协同完成以下修复(分支 `fix/skills-audit-v0.7.1`):

| 状态 | 事项 | 结果 |
|:---:|------|------|
| ✅ | 统一技能总数 | 全部对齐为 **570**(registry 为权威源);新增 `scripts/count-skills.mjs` 一致性校验脚本 |
| ✅ | CI 校验 | 新增 `.github/workflows/validate-skills.yml`:校验 frontmatter + registry 最新性 + 数字一致性 |
| ✅ | TS/JS 缺口 | 新增 `csp-typescript-patterns`(462行)、`csp-typescript-testing`(346行) |
| ✅ | 补 java-testing | 新增 `csp-java-testing`(548行),闭合 Java 测试缺口 |
| ✅ | 扩写骨架技能 | frontend(29→201)、backend(40→231)、kotlin(42→357)、code-review(21→155) |
| ✅ | db-migration 去重 | 删除骨架 `csp-database-migrations`,内容合并进 `csp-db-migration` |
| ✅ | 占位链接 | 删除 `vue-patterns.md` 孤儿 stub 及其 "reserved for future expansion" 链接 |
| ✅ | router 接入 | `triggers.yaml` 的 typescript/java stack_rules 接入新技能,确保可被路由 |

**两条原结论的修正(基于完整侦察)**:
- ❌→✅ **"registry 漏注册 29 个技能"是误判**:registry.json 本就由 `npm run build:registry` 从磁盘自动生成。原先 597 vs 568 的差异是口径不同 —— 597 = 219 源 `SKILL.md` + 189 `.claude` 镜像 + 189 `.cursor` 镜像,而 `.claude`/`.cursor` 是被 `.gitignore` 忽略的本地安装产物。
- ❌→✅ **"layer 字段污染路由权重"被高估**:registry 的 layer 按目录映射推导(`csp-patterns`→L3),不读 frontmatter 的 `layer` 字段。frontmatter 内 `layer:3`/`layer:4` 不一致仅是数据卫生问题,不影响路由。(此项仍建议后续统一,优先级降为 P3。)

以下为原始分析(保留供追溯)。

---

## 一、总体结论

CSP 的编程技能体系在**广度**上已经非常出色(119 个 patterns skill + 97 个 agent + 84 个 command),分层与路由设计思路先进。但当前存在三类系统性问题,按优先级排序:

1. **数据不一致(高危)** — 技能总数在不同文件中有 538 / 568 / 597 三个版本;registry 与磁盘数量不对齐;`layer` 字段与文档定义冲突。这直接影响 router 可信度和用户信任。
2. **质量严重不均衡(中危)** — 同为"语言 patterns",体量从 21 行到 676 行不等;部分核心技能仅为占位骨架。
3. **覆盖缺口与重复并存(中危)** — 主流语言(TS/JS、Ruby、C#)缺独立 patterns;同时 db-migration、performance、research 等主题存在职责重叠的多个技能。

---

## 二、数据一致性问题(优先修复)

### 2.1 技能总数三处打架

| 来源 | 声称数量 |
|------|---------|
| `CLAUDE.md` | **538** |
| `docs/SKILL-INDEX.md` (zh) | **538** |
| `README.md` / `README_zh.md`(徽章、正文、Dashboard 多处) | **568** |
| `csp-router/registry.json`(`"name"` 计数) | **568** |
| 磁盘实际 `SKILL.md` 文件数 | **597** |

**问题**:三个数字没有一个能对上磁盘。用户看 README 是 568,看 CLAUDE.md 是 538,而 router 实际加载的 registry 是 568,真实文件 597。
**建议**:确立"磁盘为唯一真相源",写一个 `scripts/count-skills.mjs` 在 CI 中校验所有文档/徽章/registry 与磁盘一致,数字不符直接 fail。

### 2.2 registry.json 与磁盘不对齐

- registry 注册 568 条,磁盘 597 个 `SKILL.md` + 171 个 agent `.md`。
- 说明有约 **29 个技能未进 registry**,router 永远不会路由到它们 —— 等于隐形失效。
**建议**:registry 应由脚本从磁盘自动生成,而非手工维护。

### 2.3 `layer` 字段与架构定义冲突

`CLAUDE.md` 定义 `L3 = csp-patterns`,但实际:

| 技能 | frontmatter `layer` |
|------|---------------------|
| `csp-code-review` | `layer: 3` ✓ |
| `python-patterns` | `layer: 4` ✗ |
| `csp-db-migration` | `layer: 4` ✗ |
| `csp-database-migrations` | `layer: 4` ✗ |

同一目录(`csp-patterns/skills/`)下的技能 layer 标注混乱(有 3 有 4)。router 的置信度评分依赖 phase/layer/domain 字段,字段脏会直接污染路由权重。
**建议**:统一 patterns 层 `layer` 值;在 CI 加 frontmatter schema 校验(参照 `docs/SKILL-SPEC.md`)。

### 2.4 目录名与 `name` 字段双轨制

存在两套命名规范并存:

- **无 `csp-` 前缀目录**:`python-patterns`、`golang-patterns`、`kotlin-patterns`、`python-testing`、`golang-testing`、`kotlin-testing`、`webapp-testing`、`cursor-rules`
- 但其 frontmatter `name` 又是 `csp-python-patterns`(目录 `python-patterns` ↔ name `csp-python-patterns`)
- 而同层其它技能目录名就带前缀(`csp-rust-patterns`、`csp-react-patterns`)

`cursor-rules` 甚至没有 `SKILL.md`,只是一堆 `*.md` 散文件(`python-patterns.md`、`golang-security.md`…),结构与其它 skill 完全不同。

**问题**:目录名 ≠ name 会让"按 name 反查目录""按目录扫描注册"两种逻辑都出错(2.2 的 29 个缺失很可能源于此)。
**建议**:统一目录名 = `name` 字段 = `csp-` 前缀;`cursor-rules` 要么补 `SKILL.md` 规范化,要么移出 skills 目录改作 reference 资源。

---

## 三、质量不均衡问题

抽样同类技能的体量(行数),差距悬殊:

| 技能 | 行数 | 评价 |
|------|------|------|
| `csp-db-migration` | 676 | 完整 |
| `csp-coding-standards` | 535 | 完整 |
| `python-testing` | 499 | 完整 |
| `python-patterns` | 431 | 完整 |
| `golang-testing` | 334 | 合格 |
| `golang-patterns` | 229 | 合格 |
| `csp-react-patterns` | 191 | 偏薄 |
| `kotlin-patterns` | **42** | 骨架 |
| `csp-backend-patterns` | **40** | 骨架 |
| `csp-database-migrations` | **29** | 骨架 |
| `csp-frontend-patterns` | **29** | 占位 |
| `csp-code-review` | **21** | 占位 |

### 典型问题

- **`csp-frontend-patterns`(29 行)**:正文只有一张 3 行小表 + 3 条 anti-pattern,且自带"reserved for future expansion""(reserved for future expansion)"的占位 reference。作为一个被路由器当作一等公民推荐的技能,内容不足以指导实际工作。
- **`kotlin-patterns`(42 行)** vs `python-patterns`(431 行):同为语言 patterns,深度差 10 倍。Kotlin 用户得到的指导远不如 Python 用户。
- **占位 reference 反模式**:`csp-frontend-patterns` 链接到 `vue-patterns.md (reserved for future expansion)` —— 指向不存在/空文件的链接,既误导用户也污染 router 的依赖图(SKPG)。

**建议**:
1. 设定**最低内容基线**(如语言 patterns ≥ 150 行、含 ≥5 个真实代码示例),低于基线的进"草稿"状态,不进 registry、不参与路由。
2. 移除所有 "reserved for future expansion" 占位链接。
3. 优先补齐被高频路由命中的薄技能(frontend/backend/kotlin)。

---

## 四、覆盖缺口

### 4.1 主流语言缺独立 patterns/testing

覆盖矩阵(patterns+testing skill 数 / reviewer-agent 数):

| 语言 | patterns/testing | reviewer agent | 缺口 |
|------|:---:|:---:|------|
| Python | 3 | ✓ | — |
| Go | 2 | ✓ | — |
| Rust | 2 | ✓ | — |
| Swift | 2 | ✓ | — |
| C++ | 2 | ✓ | — |
| Kotlin | 2(薄) | ✓ | patterns 太薄 |
| Java | 1 | ✓ | 缺 testing |
| **TypeScript/JS** | **0** | ✓(ts-reviewer) | **无 patterns/testing skill** |
| **Ruby** | **0** | **0** | **完全缺失** |
| **C#/.NET** | **0** | ✓(reviewer) | **无 patterns/testing** |
| **PHP** | **0** | ✓(reviewer) | **无 patterns/testing** |
| Dart | 0 | ✓(resolver) | 靠 Flutter 间接覆盖 |

**最刺眼的缺口:TypeScript/JavaScript**。这是 Web 生态第一语言,CSP 却只有 React/Next/NestJS 等框架级 patterns,**没有一个语言级 `typescript-patterns` / `typescript-testing`**(类型体操、tsconfig 严格模式、ESM/CJS、Vitest/Jest 等通用主题无处安放)。`cursor-rules` 下虽有 `typescript-patterns.md` 散文件,但它不是规范 skill、不被路由。

**建议(按 ROI 排序)**:
1. **新增 `csp-typescript-patterns` + `csp-typescript-testing`**(最高优先,覆盖面最广)
2. 补 `csp-java-testing`(已有 patterns 和 reviewer,缺 testing 闭环)
3. 视用户画像决定是否补 Ruby / C# / PHP 的 patterns(目前只有 reviewer,无 patterns,reviewer 无所依据)

### 4.2 横向工程主题缺口

现有技能偏"写代码"和"部署",以下高频工程主题缺失或薄弱:

- **并发/异步专题**:散落在各语言 patterns,无统一的并发反模式/竞态调试技能。
- **错误处理与日志规范**:有 `observability-and-instrumentation`,但缺语言无关的"错误分类/重试/降级"模式技能。
- **依赖与供应链安全**:有 security-review/codeql,但缺 `dependency-audit`(SCA、lockfile、CVE 响应)。
- **API 版本化/兼容**:有 `api-governance`、`api-codegen`,但向后兼容/废弃策略偏薄(`deprecation-and-migration` 在 workflow 层,未与 patterns 联动)。

---

## 五、重复与职责重叠(设计不合理)

router 在重叠技能间难以给出高置信度决策,会频繁退化到"展示 top 3 让用户选",削弱自动路由价值。

### 5.1 数据库迁移:三个技能职责重叠

| 技能 | 定位 | 问题 |
|------|------|------|
| `csp-database-migrations`(29 行,骨架) | "best practices" | 内容仅一张 anti-pattern 表 |
| `csp-db-migration`(676 行,完整) | "execute zero-downtime" | 内容最全 |
| `csp-data-migration-reviewer`(agent) | review 角色 | 合理(角色不同) |

`csp-database-migrations` 与 `csp-db-migration` 描述高度重合(都讲 zero-downtime、expand-contract、schema change),前者还是骨架。
**建议**:合并 —— 删除骨架的 `csp-database-migrations`,把其 anti-pattern 表并入 `csp-db-migration`。

### 5.2 性能优化:6 个技能边界模糊

`csp-backend-performance`、`csp-frontend-performance`、`csp-mobile-performance`、`csp-db-performance`、`csp-postgres-optimizer`、`csp-performance-optimizer`(还有 agent `csp-performance-optimizer.md`、`csp-web-performance-auditor`)。

- `csp-db-performance` 与 `csp-postgres-optimizer` 重叠;
- `csp-performance-optimizer`(通用)与四个领域专项 + 同名 agent 边界不清。

**建议**:确立"1 个通用入口(`csp-performance-optimizer`)+ N 个领域专项,通用入口负责分诊路由到专项"的层级关系,并在各自 frontmatter 用 `domain` 字段划清边界,避免 router 平票。

### 5.3 研究/搜索:多入口

`csp-deep-research`(patterns)、`csp-autoresearch`(runtime)、`deep-research`(顶层 skill)、`csp-exa-search`、`csp-search-first`、`csp-market-research`。语义接近,用户难分辨该用哪个。
**建议**:画一张"研究类技能选择决策树"放进 USER-GUIDE,或合并入口。

### 5.4 reviewer 技能 vs reviewer agent 双份

`csp-python-reviewer`(skill)与 `csp-python-reviewer.md`(agent)、`csp-react-reviewer` skill 与 agent 等,存在 skill / agent 两份。
**核验建议**:确认这是有意设计(skill = 方法论,agent = 可派发执行体)还是冗余。若是有意,需在文档明确两者调用时机;若非,合并。

---

## 六、修复优先级清单

| 优先级 | 事项 | 类型 | 影响面 |
|:---:|------|------|------|
| P0 | 统一技能总数(538/568/597),建 CI 计数校验 | 一致性 | 全局信任 |
| P0 | registry 自动生成,修复 ~29 个未注册技能 | 一致性 | 路由有效性 |
| P0 | 统一 patterns 层 `layer` 字段 + frontmatter schema 校验 | 一致性 | 路由权重 |
| P1 | 新增 `csp-typescript-patterns` / `csp-typescript-testing` | 缺口 | 最大语言生态 |
| P1 | 补齐骨架技能(frontend/backend/kotlin),设最低内容基线 | 质量 | 路由命中质量 |
| P1 | 合并 `csp-database-migrations` → `csp-db-migration` | 重复 | 路由置信度 |
| P2 | 统一目录命名(目录=name=csp- 前缀);规范化 `cursor-rules` | 一致性 | 可维护性 |
| P2 | 理清性能/研究类技能层级与边界(domain 字段) | 设计 | 路由置信度 |
| P2 | 移除 "reserved for future expansion" 占位链接 | 质量 | 用户体验/SKPG |
| P3 | 补 `csp-java-testing`;评估 Ruby/C#/PHP patterns | 缺口 | 长尾语言 |
| P3 | 文档化 reviewer skill vs agent 的调用时机 | 设计 | 用户认知 |

---

## 七、值得肯定的设计

- **分层 + 懒加载**:L0→L4 结构清晰,token 预算意识强(router ~800 tokens)。
- **状态感知路由**:基于 `.csp/artifacts/` 推断 SDD 阶段、git 状态调整权重,思路领先于静态触发词匹配。
- **SKPG 知识图谱**:依赖检查/影响分析/路径查找是同类工具罕见的能力。
- **anti_rationalizations 字段**:在 `csp-code-review` 等技能里预置"反合理化"话术对抗 AI 偷懒,设计精巧。
- **多语言 reviewer/build-resolver 矩阵**:12 个 build-resolver + 30+ reviewer,覆盖度业界领先。

> 核心建议:**先止血数据一致性(P0),再补 TS 缺口和骨架质量(P1),最后理顺重复设计(P2)**。广度已足够,当前阶段的最高 ROI 是把"声称的 568/538 个技能"变成"每一个都真实可路由、内容达标"。
