---
name: csp-prd-parser
description: |
  多格式 PRD 文档解析器。统一解析多种格式的 PRD 文档（语雀、Markdown、纯文本），
  提取结构化信息，输出标准化的 PRD-IR（PRD 中间表示），供下游 skill 消费。
  支持自动格式检测、章节识别、功能点提取、用户故事提取、约束条件识别。
  当用户提供 PRD 文档链接或内容需要解析、或需要"解析 PRD"、"提取需求"、"PRD格式化"时使用。
  关键词：解析 PRD、PRD 解析、提取需求、需求提取、PRD 格式化、
  文档解析、结构化需求、parse PRD、extract requirements、PRD 结构化、
  文档转需求、需求文档解析、PRD 链接解析、prd parser。
version: "1.0.0"
layer: 2
category: workflow
phase: define
domain: architecture
scope: analysis
tools: [Read, Write, Edit, Glob, Grep, Bash]

dependencies:
  skills: []

related_skills:
  - csp-requirement-decomposition
  - csp-prd-generation
  - csp-prd-traceability
  - csp-product-discovery-orchestrator
  - csp-interview-me

triggers:
  keywords: ["解析 PRD", "PRD 解析", "提取需求", "需求提取", "PRD 格式化",
             "文档解析", "结构化需求", "parse PRD", "extract requirements",
             "PRD 结构化", "文档转需求", "prd parser"]
  intents:
    - "user provides a PRD document that needs to be parsed"
    - "user wants to extract structured requirements from a document"
    - "user has a PRD in a non-standard format"
  context:
    - "user_has_prd_document"
    - "external_document"

anti_rationalizations:
  "PRD 直接看就行，不用解析": "不同格式的 PRD 结构不同，直接看容易遗漏。标准化解析保证完整性。"
  "手动提取功能点就行": "手动提取容易遗漏约束条件、非功能性需求等隐含信息。结构化解析不会遗漏。"
---

# PRD Parser

多格式 PRD 文档解析器 — 把各种格式的 PRD 统一解析为标准化中间表示 (PRD-IR)。

## 核心理念

PRD 可能来自多种来源：语雀文档、Markdown 文件、钉钉文档、纯文本邮件。格式各异，结构不同，但需要提取的核心信息是相同的。PRD Parser 的作用就是把这些异构输入统一为下游 skill 可消费的结构化数据。

## 支持格式

| 格式 | 来源 | 检测方式 | 解析方式 |
|------|------|---------|---------|
| 语雀文档 | 语雀链接 | URL 包含 yuque 域名 | 语雀 API 获取 Markdown 后解析 |
| Markdown | 本地文件/粘贴 | 文件扩展名 `.md` 或 Markdown 语法 | 直接解析 Markdown 结构 |
| 纯文本 | 聊天/邮件 | 无特殊格式 | 基于语义分段解析 |

## 解析流程

```
1. 格式检测 → 识别输入类型
2. 内容获取 → 根据格式获取完整文档内容
3. 章节识别 → 识别 PRD 的标准章节结构
4. 信息提取 → 从各章节提取结构化信息
5. 实体识别 → 提取功能点、用户故事、约束条件
6. 输出 PRD-IR → 标准化 JSON 中间表示
```

## PRD-IR 结构

标准化的 PRD 中间表示，供下游 skill 消费：

```yaml
prd_ir:
  # 元信息
  meta:
    title: ""                    # PRD 标题
    source: ""                   # 来源（链接或文件路径）
    format: "yuque|markdown|text"  # 原始格式
    author: ""                   # 作者（如有）
    version: ""                  # 版本号（如有）
    created_at: ""               # 创建时间
    updated_at: ""               # 更新时间

  # 背景与目标
  background:
    problem: ""                  # 解决的问题
    context: ""                  # 业务背景
    goals: []                    # 目标列表
    success_metrics: []          # 成功指标

  # 用户与场景
  users:
    - role: ""                   # 用户角色
      description: ""            # 角色描述
      pain_points: []            # 痛点
      scenarios: []              # 使用场景

  # 功能需求
  features:
    - id: ""                     # 功能编号
      title: ""                  # 功能名称
      description: ""            # 功能描述
      priority: "P0/P1/P2/P3"    # 优先级
      user_story: ""             # 用户故事
      acceptance_criteria: []    # 验收标准
      dependencies: []           # 依赖
      notes: ""                  # 备注

  # 非功能性需求
  nfr:
    performance: ""              # 性能要求
    security: ""                 # 安全要求
    scalability: ""              # 扩展性要求
    availability: ""             # 可用性要求
    compliance: []               # 合规要求
    accessibility: ""            # 无障碍要求
    i18n: ""                     # 国际化要求

  # 约束条件
  constraints:
    technical: []                # 技术约束
    business: []                 # 业务约束
    timeline: ""                 # 时间约束
    budget: ""                   # 预算约束
    team: ""                     # 团队约束
    compliance: []               # 合规约束

  # 范围
  scope:
    in_scope: []                 # 范围内
    out_of_scope: []             # 范围外
    assumptions: []              # 假设条件
    risks: []                    # 已识别风险

  # 验收标准
  acceptance:
    overall: []                  # 整体验收标准
    per_feature: {}              # 按功能验收标准

  # 原始内容引用
  raw:
    sections: []                 # 原始章节列表
    toc: []                      # 原始目录
    unresolved: []               # 无法解析的内容
```

## 章节识别规则

自动识别 PRD 文档中的标准章节：

```yaml
chapter_patterns:
  background:
    patterns: ["背景", "Background", "问题描述", "Problem", "项目背景"]
  goals:
    patterns: ["目标", "Goals", "Objective", "目的", "愿景"]
  users:
    patterns: ["用户", "Users", "用户角色", "User Roles", "Persona", "目标用户"]
  features:
    patterns: ["功能需求", "Features", "Functional Requirements", "功能列表", "需求列表"]
  nfr:
    patterns: ["非功能性需求", "NFR", "Non-Functional", "性能要求", "安全要求"]
  constraints:
    patterns: ["约束", "Constraints", "限制", "Limitations", "前置条件"]
  scope:
    patterns: ["范围", "Scope", "In/Out of Scope", "边界"]
  acceptance:
    patterns: ["验收标准", "Acceptance Criteria", "验收", "Checklist"]
```

## 功能点提取

从 PRD 文档中提取功能点的策略：

```markdown
### 提取策略

1. **列表项识别**: 在"功能需求"章节下的列表项，每个视为一个功能点
2. **表格解析**: 功能列表表格，每行视为一个功能点
3. **标题识别**: 独立的功能标题，视为一个功能点
4. **用户故事模式**: 匹配 `As a [role], I want [action], so that [value]` 模式
5. **验收条件模式**: 匹配 `Given [context], When [action], Then [result]` 模式

### 优先级推断

| 关键词 | 推断优先级 |
|--------|-----------|
| 必须/核心/基础/MVP | P0 |
| 重要/需要/主要 | P1 |
| 可选/增强/优化 | P2 |
| 未来/后续/下个版本 | P3 |
```

## 约束条件识别

自动识别 PRD 中的约束条件：

```yaml
constraint_patterns:
  technical:
    - "技术栈: {tech_stack}"
    - "必须使用 {technology}"
    - "兼容 {system}"
    - "部署在 {platform}"
  business:
    - "必须在 {date} 前上线"
    - "预算: {budget}"
    - "团队: {team_size} 人"
  timeline:
    - "里程碑: {date}"
    - "截止日期: {date}"
    - "{duration} 内完成"
```

## 输出产物

```
.csp/prd-ir/
├── PRD-IR.json              # 标准化 JSON 中间表示
├── PRD-IR.md                # 可读的 Markdown 版本
└── PARSE-LOG.md             # 解析日志（含警告和未解析内容）
```

## 语雀文档解析

对于语雀链接，使用语雀 API 获取文档内容：

```yaml
yuque_parse:
  # 输入: 语雀文档链接
  # 例如: https://{domain}/group/book/doc
  
  steps:
    1. 从 URL 提取 group_login, book_slug, doc_slug
    2. 调用语雀 API 获取文档 body
    3. 将 body 转换为 Markdown
    4. 按标准流程解析 Markdown
  
  auth:
    # 需要语雀 API Token
    env: YUQUE_TOKEN
```

## 门控检查

- [ ] 格式检测正确
- [ ] 所有标准章节已识别或标记为缺失
- [ ] 功能点提取完整（至少 1 个功能点）
- [ ] 约束条件已识别（如有）
- [ ] 未解析内容已记录在 PARSE-LOG.md 中
- [ ] PRD-IR 结构完整

## 完成信号

```yaml
completion_signal:
  output: .csp/prd-ir/PRD-IR.json
  next_step:
    recommended: csp-requirement-decomposition
    alternatives: [csp-prd-generation]
  status:
    prd_ir_path: .csp/prd-ir/
    feature_count: "{{count}}"
    format: "yuque|markdown|text"
    phase: define
    ready_for: [requirement-decomposition, prd-generation]
```

## 与其他 Skill 的协作

| 上游 Skill | 提供什么 |
|-----------|---------|
| 无（直接接受用户输入） | 原始 PRD 文档 |

| 下游 Skill | 消费什么 |
|-----------|---------|
| csp-requirement-decomposition | PRD-IR 中的功能点和约束条件 |
| csp-prd-generation | PRD-IR 作为 PRD 模板的输入 |
| csp-prd-traceability | PRD-IR 中的功能点列表（建立追溯起点） |

## 快速开始示例

```
用户: "解析这个 PRD: https://{yuque_domain}/team/prd/user-system"

执行:
  1. 格式检测: 语雀链接
  2. 获取文档: 通过语雀 API 获取完整文档
  3. 章节识别:
     - 背景与目标 ✅
     - 用户角色 ✅
     - 功能需求 ✅ (8 个功能点)
     - 非功能性需求 ✅
     - 约束条件 ✅ (技术栈: Python+PostgreSQL, 2 周内交付)
     - 验收标准 ✅
  4. 功能点提取: 8 个功能点，优先级 P0=3, P1=3, P2=2
  5. 约束识别: 技术约束 (Python+PostgreSQL), 时间约束 (2 周)
  6. 输出: .csp/prd-ir/PRD-IR.json + PRD-IR.md
  7. 建议下一步: csp-requirement-decomposition
```