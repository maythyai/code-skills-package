---
name: csp-wiki
description: >
  LLM Wiki — persistent, self-maintained markdown knowledge base that compounds across
  sessions (Karpathy model). Two-layer: raw source docs (read-only truth) vs an AI-maintained
  _wiki layer (index.md + append-only log.md + topic pages). Ingest compiles sources into
  structured pages; lint checks health; query synthesizes answers with citations. Use when
  the user says "wiki", "compile wiki", "build knowledge base", "整理知识库", "wiki lint",
  "wiki query", "建立主题目录", "维护 index/log".
version: "2.0.0"
layer: 4
category: runtime
domain: architecture
phase: build
scope: implementation
tools: [Read, Write, Edit, Glob, Grep, Bash]

related_skills:
  - csp-code-wiki
  - csp-remember
  - csp-writer-memory
  - csp-session-knowledge-extractor
  - csp-doc-lifecycle-manager
  - csp-project-doc-architect

triggers:
  keywords: ["wiki", "compile wiki", "build knowledge base", "整理知识库", "wiki lint",
             "wiki query", "建立主题目录", "维护 index", "wiki ingest", "wiki add",
             "知识库", "LLM wiki"]
  intents:
    - "user wants to compile/maintain a persistent knowledge wiki"
    - "user wants to organize raw docs into a structured wiki + index + log"
    - "user wants to query the wiki for an answer with citations"
  context:
    - "session_end"
    - "knowledge_compaction"

anti_rationalizations:
  "wiki 直接引用别的 wiki 页就行": "Wiki 禁引 Wiki（递归失稳）。sources 只能引原始文档；唯有 archive 类型可快照 wiki 内容。"
  "有矛盾我自己裁决哪个对": "不裁决。标注矛盾并列出各源说法；矛盾未决 → confidence=low。"
  "log 写错了改一下": "log.md 只追加不修改，是编译历史的唯一事实源。"
  "源文档信息太少也凑合用": "低信息源（空/仅占位/信息不足）不得作主 sources，必须切同主题备选。"
  "ingest 建好骨架就结束": "首次编译至少 3 篇实质内容页，禁止仅建骨架。"
---

# LLM Wiki

持久、自维护的 markdown 知识库 —— Karpathy LLM Wiki 模型："LLM 负责编写和维护 Wiki；人类负责阅读和提问。Wiki 是一个持久的、不断积累的知识产物。"

## 核心理念（两层模型）

| 层 | 角色 | 可改性 |
|----|------|--------|
| **原始文档（源）** | 用户管理的源文档，**唯一真理来源** | 只读（只通过 git 读取，永不修改） |
| **Wiki 层** | AI 生成维护的 markdown，存 `.csp/wiki/` | AI 增量维护 |

Wiki 层结构：
- `index.md` — 全局索引，按主题分组，每篇一行摘要
- `log.md` — 编译日志，**append-only**，记录每次操作
- 主题页面 — 跨源整合的知识综述（concept/faq/howto/reference 等，类型见 `references/metadata-spec.md`）

## 强约束（必须遵守）

1. `index.md` / `log.md` 必须在 `.csp/wiki/` 下。
2. 除 `index.md`/`log.md` 外，所有 wiki 页面必须带 YAML frontmatter 元数据（`type`/`confidence`/`sources`，见 `references/metadata-spec.md`）。
3. `sources` **只能引用原始文档**（git 可见文件 / commit），**禁止 wiki 引 wiki**；不得引用 `index.md`/`log.md`/导航页/综述页。**例外**：`type: archive` 页面可引用 wiki 文章（archive 是 wiki 内容的时间点快照）。
4. 低信息源（空内容、仅占位 `###`、明显信息不足）不得作主 sources，必须切同主题备选。
5. 删除仅限 wiki 页面且经校验；**禁止删除原始文档**。
6. 默认不向量化（`vectorize=false`），query 走关键词 + 标签匹配。
7. **永不修改原始文档**，只读取。
8. 发现矛盾时**不自行裁决**，标注矛盾并列出不同来源说法（confidence=low）。
9. `log.md` 只追加不修改。
10. `sources[].title` 必须是原始文档的可读标题（文件名/路径），**禁止**用占位 ID 或把 title 填成与标识相同的值。

## Operations

### Ingest（编译）
把原始文档编译成 wiki 页面。一次 ingest 可触多篇页面。两阶段：先汇报摘要，用户确认后大规模写入（自动模式跳过确认）。验收见 `references/ingest-checklist.md`。

### Query（问答）
跨 wiki 页面按关键词/标签检索，返回匹配页 + 片段；**LLM 用引用综合答案**。详见 `references/query.md`。

### Lint（健康检查）
检测孤儿页、过时内容、断链、超大页、结构矛盾。分**自动修复项**（索引一致性/内部链接/sources 引用/see-also）与**报告项**（事实矛盾/过时/孤立/缺失跨主题引用）。详见 `references/lint.md`。

### Quick Add / List / Read / Delete
```
wiki_add    # 单页快速新增（简于 ingest）
wiki_list   # 列出所有页（读 index.md）
wiki_read   # 读指定页
wiki_delete # 删除 wiki 页（经校验，禁删原始文档）
```

## Storage

- Pages: `.csp/wiki/*.md`（markdown + YAML frontmatter）
- Index: `.csp/wiki/index.md`（自维护目录）
- Log: `.csp/wiki/log.md`（append-only 操作编年）
- 默认 git-ignore（`.csp/wiki/` 项目本地）；如需团队共享，提交到 git。

## Cross-References
用 `[[page-name]]` wiki-link 语法创建页间交叉引用。`seeAlso` frontmatter 字段补充关联。

## Auto-Capture
会话结束时，重要发现自动捕获为 session-log 页。配置 `.csp-config.json` 的 `wiki.autoCapture`（默认 enabled）。

## Hard Constraints
- 无向量嵌入 —— query 仅关键词 + 标签匹配。
- Wiki 默认 git-ignore（项目本地）；可显式提交共享。

## Page Template & Metadata
页面模板见 `references/page-template.md`；元数据规范（type/confidence/sources）见 `references/metadata-spec.md`。

## 与其他 Skill 的关系

| Skill | 关系 |
|-------|------|
| `csp-code-wiki` | code-wiki 是从**代码库**生成的 source-grounded Q&A wiki（证据引 `/blob/<commit>/path#Lx`）；本 wiki 是通用项目知识 wiki（引原始文档）。 |
| `csp-remember` / `csp-writer-memory` | 个人/项目记忆（事实级）；本 wiki 是主题综述级。 |
| `csp-session-knowledge-extractor` | 会话知识提炼可喂入 wiki 的 session-log。 |
| `csp-doc-lifecycle-manager` / `csp-project-doc-architect` | 文档治理；本 wiki 是其产物之一。 |

## References

| 文件 | 内容 |
|------|------|
| `references/metadata-spec.md` | 页面元数据规范：type 枚举、confidence 赋值标准、sources 格式 |
| `references/ingest-checklist.md` | Ingest 验收清单：首次编译门槛、sources 质量、低信息源兜底、深化自检 |
| `references/lint.md` | Lint 流程：自动修复项 vs 报告项、执行步骤、log 格式 |
| `references/page-template.md` | wiki 页面模板（含矛盾标注格式） |
