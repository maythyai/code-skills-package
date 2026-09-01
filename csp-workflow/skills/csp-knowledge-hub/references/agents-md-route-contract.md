# AGENTS.md Route Contract

> The hub's lightweight entry. `AGENTS.md` at `.csp/AGENTS.md` routes, it does not
> carry compile/query/skill-lifecycle detail. Generalized to git + CSP skills
> (no `a1`/plugin-install coupling).

## 1. Fixed H2 sections (in order, each with real content)

1. `## 项目概览` — business scenario, audience, the `raw → spec/wiki → derived` direction.
2. `## 项目配置` — repo URL, source roots, env note (git + `CSP_GIT_REMOTE` default github.com).
3. `## 文件职责与权威来源` — `raw/`(read-only), `schema.md`, `manifest.json`(sole index), `wiki/`, `spec/` dirs, `intel/`, `milestones/`.
4. `## 启动与读取顺序` — read `AGENTS.md` first; before write read `schema.md`+`manifest.json`; before query read `wiki/index.md`.
5. `## 操作路由` — the route table (below).
6. `## 安全与写入边界` — no credentials/tokens in workspace; raw read-only; query read-only; git publish needs user confirmation.

## 2. Must declare

- repo URL + source roots + the one-way `raw → wiki/spec → derived` dependency.
- each dir's role; **manifest.json is the sole source index**.
- read order on workspace entry.
- the route table mapping intent → skill → rule.
- query is read-only, answers carry page citations, gaps are stated explicitly.
- credentials/tokens never written to the workspace.

## 3. Route table (generalized — no plugin-install coupling)

| Intent | Skill | Rule |
|--------|-------|------|
| build / update / sync hub | `csp-knowledge-hub` | per workspace state: `manifest diff` → reconcile added/changed/removed → write manifest |
| generate/maintain PMS | `csp-product-spec` | within PMS module boundaries; delta back to manifest |
| distill/align CMS | `csp-code-spec` | per-app; auto-align after ship; `knowledge-graph.json` back to manifest |
| generate TMS cases | `csp-test-spec` | stock + incremental; entry×state matrix; delta back to manifest |
| general wiki | `csp-wiki` | two-layer; no wiki-cites-wiki; append-only log |
| code Q&A wiki | `csp-code-wiki` | source-grounded `/blob/<commit>/path#Lx`; black-box QA |
| remember/store facts | `csp-remember` | conflict-check before add |
| query / explain / summarize | (read path) | read-only via `wiki/index.md` + `manifest.json` locate |

If a routed skill is unavailable, **stop** — do not hand-substitute or fall back to a remembered schema.

## 4. Template

```md
# <project> Knowledge Hub

## 项目概览
<scenario, audience, raw → spec/wiki → derived direction>

## 项目配置
- Code 仓库: <repo_url>  (CSP_GIT_REMOTE, default github.com)
- 资料源根: <source roots>
- 环境: git 可用即可，无平台鉴权依赖。

## 文件职责与权威来源
- raw/docs/：只读资料快照。
- schema.md：已确认的编译规则。
- manifest.json：唯一 source index 与同步基线。
- product-spec/ code-spec/ test-spec/ wiki/ code-wiki/ intel/：查询与生成的唯一依据。
- milestones/：里程碑归档。

## 启动与读取顺序
先读 AGENTS.md；写入前读 schema.md 与 manifest.json；查询前读 wiki/index.md。

## 操作路由
| 意图 | 编排 Skill | 规则 |
| --- | --- | --- |
| 构建/更新/同步 | csp-knowledge-hub | manifest diff → reconcile |
| PMS | csp-product-spec | 模块边界内；delta 回写 |
| CMS | csp-code-spec | per-app；ship 后 auto-align |
| TMS | csp-test-spec | 存量+增量；delta 回写 |
| wiki | csp-wiki | 两层；禁 wiki 引 wiki |
| code wiki | csp-code-wiki | 引 /blob/<commit>/path#Lx |
| 记忆 | csp-remember | add 前查冲突 |
| 查询 | (只读) | 读 index.md + manifest locate |

## 安全与写入边界
不写凭证/token；raw 只读；查询只读；Git 发布必须用户确认。
```

## 5. Forbidden in AGENTS.md

- Copying compile/query/skill-lifecycle detail from any skill's references.
- Hardcoding skill behavior that drifts (route to the skill, don't inline it).
- Credentials, tokens, or platform-specific auth.
