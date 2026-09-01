---
name: csp-code-wiki
description: >
  Source-grounded Code Wiki — generate/maintain a Git-native Q&A knowledge wiki from one
  logical code system (one or more repos), with optional knowledge-doc dependencies. Every
  material claim cites a frozen commit (`/blob/<sha>/<path>#Lx`); pages are organized by
  owned systems/concepts/workflows, not by mirroring the source tree. Uses bounded subagents
  for survey + write + independent black-box semantic verification. Use when the user says
  "generate codewiki", "refresh codewiki", "代码知识 wiki", "source-grounded wiki",
  "build codebase wiki", "维护代码 wiki", "source-grounded codebase wiki", or wants a queryable
  Q&A wiki generated FROM code (not hand-authored docs).
version: "1.0.0"
layer: 2
category: workflow
phase: build
domain: architecture
scope: implementation
role: architect
tools: [Read, Write, Edit, Glob, Grep, Bash, Agent]

dependencies:
  skills: []

related_skills:
  - csp-wiki
  - csp-code-spec
  - csp-code-understanding
  - csp-graph-build
  - csp-graph-architecture
  - csp-codebase-audit
  - csp-doc-lifecycle-manager
  - csp-tech-task-breakdown
  - csp-multi-review

triggers:
  keywords: ["code wiki", "codewiki", "代码知识 wiki", "source-grounded wiki", "build codebase wiki",
             "维护代码 wiki", "生成 codewiki", "refresh codewiki", "代码问答 wiki", "source-grounded codebase wiki"]
  intents:
    - "user wants a queryable Q&A wiki generated from the codebase"
    - "user wants to refresh an existing code wiki from source changes"
    - "user wants source-grounded (cited-to-commit) code documentation, not hand-authored prose"
  context:
    - "brownfield_codebase"
    - "after_code_spec"
    - "knowledge_wiki_needed"

anti_rationalizations:
  "按源码目录一个文件一页就行": "按拥有的系统/概念/工作流组织，不镜像源码树。跨仓库的运行时域不得压成一个仓库一页。"
  "引用写 path:line 就行": "不够。每条源文件引用必须是锚定到冻结 commit 的 markdown 链接 `/blob/<sha>/<path>#Lx`；裸 path:line 读者无法直接跳转。"
  "同一域研究两次省事": "禁止。一个域一次证据遍历写完；reviewers 永不编辑计划/Markdown/Git。"
  "图错了无所谓": "stale/无效的 Mermaid 图是内容缺陷，必须修或删，不是装饰。"
  "源码和知识文档冲突我选一个": "保留作用域冲突，不静默选边；窄证据边界要明说，不把推断当事实。"
---

# Code Wiki (Source-Grounded)

> **定位:** 从代码库（一个逻辑系统，可跨多仓库）生成 Git-native、source-grounded 的 Q&A 知识 wiki。
> 每个 material 声明都锚定到**冻结的 commit**；页面按拥有的系统/概念/工作流组织，**不镜像源码树**。
> 用有界 subagent 做 survey + write + **独立黑盒语义验证**。
>
> **与 `csp-wiki` 的区别:** `csp-wiki` 是通用项目知识 wiki（引用原始**文档**）；本 skill 从**代码**生成 wiki，引用锚定 commit 的源文件 —— 证据是代码本身。
> **与 `csp-code-spec` (CMS) 的区别:** CMS 蒸馏结构化 spec（入口点/调用链/约定）；本 skill 生成可问答的知识 wiki（Q&A 综述页），证据引 `/blob/<commit>/path#Lx`。CMS 可作为本 skill 的输入之一。

## When to Use

- 要从代码库生成可问答的知识 wiki（非手写散文）
- 源码或知识文档变更后刷新既有 code wiki
- 要 source-grounded（引到 commit）的代码文档，便于审计与追溯
- 跨多仓库的一个逻辑系统需要统一知识视图

## When NOT to Use

- 通用项目知识 wiki（用 `csp-wiki`，引文档）
- 结构化代码 spec/说明书（用 `csp-code-spec` CMS）
- 多维代码体检 + 升级方案（用 `csp-codebase-audit`）
- 单次代码理解问答（直接读代码或 `csp-code-understanding`）

## Inputs

| 参数 | 默认 |
|------|------|
| `code_repos` | 提供则用之，否则当前 git 仓库 |
| `knowledge_repos` | 可选：知识/文档仓库依赖（术语/业务规则/设计意图） |
| `output_repo` | 显式指定；否则源 Git Wiki remote（仅当无歧义） |
| `code_refs` / `knowledge_refs` | 各输入 remote 默认分支 |
| `output_ref` | 输出 remote 默认分支（`main`/`master`） |
| `output_path` | `.` |
| `mode` | `auto`（generate/refresh 选择） |
| `depth` | `standard` |
| `language` | `zh-CN` |
| `delivery` | `direct`（默认直推 main/master，除非用户显式要分支+MR） |

**输入归一化:** 接受 repo 字符串或对象（`repo`/`ref`/`path`/`role`/`relation`）；按 canonical repo identity + path 去重；拒绝含 `..` 的路径；确定性解析每个 repo 根 + ref；记录每个输入的冻结 commit 前再分析。至少 1 个代码仓库；**永不猜测**可写输出仓库。

## Lifecycle（main agent 主控）

1. **准备**干净的输入/输出工作副本，保留输出 `AGENTS.md`/`knowledge.yaml`/兼容扩展/用户原创内容。
2. **冻结**每个 code/knowledge 输入，建 `.csp/code-wiki/.codewiki-run/<run-id>/`（**在 output_path 之外**）。持久化 source-lock、manifest、inventory、plan、coverage matrix、task ownership、worker results、validator JSON、audit；**永不提交**它。
3. **选 mode**（generate / refresh），见 `references/workflow.md`。
4. main agent 对 run manifest、最终分类、coverage 决策、共享导航、repo 契约、Git 状态、修复**负责到底**。
5. **冻结最终页路径**后再事实写作；每次写作调用给**一个连贯域 + 一个不相交 allowlist**；该域研究+写**一次**。
6. 组装 `home.md`、canonical `index.md`、恰好一条 newest-first `log.md` 条目。
7. 跑仓库 validator + coverage matrix。
8. 解决每个 blocking 的结构/grounding/语义-QA/安全 finding；修复后重跑 validator。
9. delivery 前重解析每个输入 ref；任何输入偏离冻结 commit 则 **refresh 而非 publish**。
10. 按 `delivery` 提交。完成 = 已验证文件 + 已请求 Git delivery（除非鉴权/权限/输出歧义阻塞）。

## Non-Negotiable Rules

1. **源码 + focused tests 是当前实现的权威。** 知识依赖只指导术语/业务规则/设计意图/范围；标注其声明，并对 material 运行时声明尽可能对照代码验证。冲突时**保留作用域冲突**，不静默选边。
2. **按拥有的系统/概念/工作流/操作组织**，不镜像源码树；禁通用 catch-all 目录与"一页一目录"。
3. 每个 `standard`/`exhaustive` run 达到 **零未解 coverage 行**。
4. 每个 material 页记录每个直接使用的冻结输入 + 已验证证据。
5. **跨仓库 survey 独立，但按逻辑系统/域组织写作**；绝不把跨仓库 wiki 压成"一仓库一页"。
6. 每个声明源文件在页体内以**锚定冻结 commit 的 markdown URL** 引用：`/blob/<full-frozen-commit>/<repo-relative-path>#Lx`。裸 `path:line` 文本**不是**合法引用。
7. **同一域不研究两次**。Reviewers **永不**编辑 plan/coverage/evidence/Markdown/Git。

## 输出产物

```
.csp/code-wiki/{system}/          # 或 output_repo
├── home.md                        # 入口
├── index.md                       # canonical 索引
├── log.md                         # newest-first 编译日志
├── *.md                           # 主题页（按系统/概念/工作流）
└── .codewiki-run/<run-id>/        # 运行工作区（不提交）
    ├── source-lock.json
    ├── run-manifest.json
    ├── coverage-matrix.json
    └── validator-results.json
```

## 门控

- [ ] 每页 material 声明引 `/blob/<commit>/<path>#Lx`
- [ ] 零未解 coverage 行（standard/exhaustive）
- [ ] 黑盒语义 QA 通过（question-finder 不能读 wiki；answer-verifier 不能读源）
- [ ] 所有输入 ref 未偏离冻结 commit（偏离则 refresh 不 publish）
- [ ] reviewers 未编辑 plan/Markdown/Git
- [ ] stale/无效 Mermaid 图已修或删

## 完成信号

```yaml
completion_signal:
  output: .csp/code-wiki/{system}/index.md
  next_step:
    recommended: csp-wiki   # 接入通用项目 wiki 的 seeAlso
    alternatives: [csp-codebase-audit, csp-graph-build, csp-doc-lifecycle-manager]
  status:
    system: "{{system}}"
    pages: "{{count}}"
    coverage_resolved: 0
    phase: build
    ready_for: [query, refresh, audit]
```

## References

| 文件 | 内容 |
|------|------|
| `references/methodology.md` | 证据与引用、信息架构、一域一证据遍历、页设计、独立语义验证、Mermaid 图纪律 |
| `../references/code-to-spec-extraction.md` | 6 类代码萃取信号、sanitizer 黑名单、前后端融合、enrich 深度档 |
| `../references/destructive-operation-safety.md` | 破坏性/可逆操作分类（page-writer 不入破坏性流） |
| `references/workflow.md` | mode 选择（generate/refresh/auto）、逻辑阶段映射、durable run 工作区、source-lock schema |
| `references/subagents.md` | 有界 subagent 角色：question-finder/planner/surveyor/answer-verifier/auditor/page-writer/plan-critic |
| `references/coverage.md` | coverage matrix 契约、零未解行、刷新对账 |
| `../references/module-spec-operational-protocol.md` | 运行时纪律（断点续跑、文件边界、双重门禁）共享 |
