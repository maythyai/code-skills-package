---
name: csp-prd-parser
description: |
  多格式 PRD 文档解析器。统一解析多种格式的 PRD 文档（钉钉文档、语雀、Markdown、纯文本），
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
  - csp-spec-contract
  - csp-requirement-decomposition
  - csp-product-discovery-orchestrator
  - csp-prd-generation

triggers:
  keywords: ["解析 PRD", "PRD 解析", "提取需求", "需求提取", "PRD 格式化",
             "文档解析", "结构化需求", "parse PRD", "extract requirements",
             "PRD 结构化", "文档转需求", "需求文档解析", "PRD 链接解析",
             "prd parser", "PRD 处理"]
  intents:
    - "user provides a PRD document link and wants it parsed"
    - "user has a PRD in a specific format and needs structured extraction"
    - "user wants to standardize PRD format for downstream consumption"
    - "user needs to extract features from an existing PRD document"
  context:
    - "user_provides_prd_link"
    - "user_provides_prd_content"
    - "before_requirement_decomposition"

anti_rationalizations:
  "I can just read the PRD and jump to decomposition": "Manual reading skips structured extraction. The parser catches what humans miss."
  "One format is enough, we don't need multi-format support": "PRDs come from different sources. A single parser unifies them all."
  "Parsing is too simple to need a dedicated skill": "Structured parsing with section detection, feature extraction, and constraint identification is a multi-step process."
---

# PRD Parser

多格式 PRD 文档解析器，将任意格式的 PRD 输入标准化为结构化的 PRD-IR（中间表示）。

## 核心理念

PRD 可能来自：
- 钉钉文档（通过 `devix-dingtalk-skill` 读取）
- 语雀文档（通过 `yuque` MCP 读取）
- Markdown 文件
- 纯文本描述
- 其他格式（Word、Notion 等，通过用户提供的文本）

无论来源是什么，输出统一的 PRD-IR，确保下游 skill 能一致消费。

## 支持的输入格式

| 格式 | 来源 | 读取方式 |
|------|------|---------|
| 钉钉文档 | alidocs.dingtalk.com 链接 | `devix-dingtalk-skill` |
| 语雀文档 | 语雀知识库链接 | 语雀 API/MCP |
| Markdown 文件 | 本地文件路径 | `Read` 工具 |
| 纯文本 | 用户直接输入 | 直接解析 |
| 混合格式 | 多个来源 | 组合解析 |

## 输入检测

收到用户输入后，按以下优先级检测格式：

1. **URL 检测** — 如果输入包含 URL：
   - `alidocs.dingtalk.com` → 使用钉钉文档 skill
   - 语雀链接（yuque.com 及企业语雀域名） → 使用语雀 API/MCP
   - 其他 URL → 尝试 WebFetch 获取内容

2. **文件路径检测** — 如果输入是文件路径：
   - `.md` → 直接读取 Markdown
   - `.txt` → 直接读取纯文本
   - 其他 → 尝试读取为文本

3. **纯文本检测** — 如果输入是纯文本：
   - 直接进入解析流程

## 执行流程

### Phase 1: 文档获取

根据输入类型获取文档内容：

```yaml
input_routing:
  dingtalk_url:
    action: "使用 Skill('devix-dingtalk-skill') 读取文档内容"
    fallback: "提示用户手动粘贴文档内容"
  yuque_url:
    action: "使用 mcp__yuque__yuque_get_doc_detail 获取文档"
    fallback: "提示用户手动粘贴文档内容"
  file_path:
    action: "使用 Read 工具读取文件"
    fallback: "提示文件不存在或无法读取"
  plain_text:
    action: "直接使用用户输入内容"
  mixed:
    action: "逐个获取，合并为统一文档"
```

### Phase 2: 章节识别

解析文档结构，识别章节标题和内容：

```markdown
## 章节识别规则

### 标准 PRD 章节 (匹配)
- 背景/Background
- 目标/Objectives/Goals
- 用户/Users/Personas
- 功能需求/Functional Requirements/Features
- 非功能需求/Non-Functional Requirements/NFR
- 验收标准/Acceptance Criteria
- 约束/Constraints
- 风险/Risks
- 时间线/Timeline
- 附录/Appendix

### 识别方式
- 标题层级: # → ## → ### → ####
- 关键词匹配: 中英文关键词
- 模糊匹配: 相近含义的标题
```

### Phase 3: 功能点提取

从"功能需求"章节提取每条功能点：

```yaml
extraction_rules:
  feature:
    # 识别特征
    - 以 "- " 或 "* " 开头的列表项
    - 以数字编号的列表项 (1. 2. 3.)
    - 包含 "用户" "系统" "应" "必须" "需要" 的段落
    - 包含 "user" "system" "shall" "must" "should" 的段落
    
    # 提取内容
    - 功能名称: 第一句或标题
    - 功能描述: 整段内容
    - 优先级: 从 P0/P1/P2 标记提取
    - 用户角色: 从 "作为 [角色]" 模式提取
    
  user_story:
    # 识别特征
    - "作为 [角色]，我想要 [动作]，以便 [价值]"
    - "As a [role], I want [action], so that [value]"
    
  acceptance_criteria:
    # 识别特征
    - "Given [context], When [action], Then [result]"
    - "验收标准:" 后的列表
    - "AC:" 后的列表
```

### Phase 4: 约束条件提取

识别非功能性需求和约束条件：

```yaml
extraction_rules:
  performance:
    - "响应时间" / "RT" / "latency" / "p99"
    - "并发" / "QPS" / "TPS" / "concurrent"
    - "加载时间" / "load time"
  
  security:
    - "认证" / "授权" / "auth" / "JWT" / "OAuth"
    - "加密" / "encrypt" / "TLS" / "SSL"
    - "权限" / "permission" / "RBAC"
  
  compliance:
    - "GDPR" / "HIPAA" / "合规" / "compliance"
    - "数据保护" / "data protection"
  
  technical:
    - "技术栈" / "tech stack" / "语言" / "框架"
    - "数据库" / "database" / "DB"
    - "部署" / "deploy" / "云" / "cloud"
```

### Phase 5: 生成 PRD-IR

输出标准化的 PRD 中间表示：

```yaml
# PRD-IR (PRD Intermediate Representation)
prd_ir:
  metadata:
    source: "钉钉文档 / 语雀 / Markdown / 纯文本"
    source_url: "原始链接"
    parsed_at: "2026-08-13"
    parser_version: "1.0.0"
  
  overview:
    title: "Feature Management System"
    summary: "一个支持 Feature 创建、列表、查询、删除的管理系统"
    product_type: "B2B"  # B2C / B2B / internal-tool / platform
  
  features:
    - id: "PRD-F-001"
      name: "Feature 创建"
      description: "用户可创建 Feature 并填写标题、描述、优先级"
      user_story: "作为产品经理，我想要创建 Feature，以便管理产品需求"
      priority: "P0"
      acceptance_criteria:
        - "Given 登录用户，When 填写标题和描述并提交，Then Feature 创建成功并显示在列表中"
        - "Given 登录用户，When 提交空标题，Then 显示验证错误"
      source_section: "3.1 Feature 创建"
      source_text: "原始文本..."
    
    - id: "PRD-F-002"
      name: "Feature 列表查询"
      description: "用户可查看 Feature 列表，支持分页、筛选、排序"
      user_story: "作为产品经理，我想要查看 Feature 列表，以便了解所有需求"
      priority: "P0"
      acceptance_criteria:
        - "Given 登录用户，When 访问 Feature 列表页，Then 显示分页列表"
        - "Given 登录用户，When 按状态筛选，Then 只显示匹配的 Feature"
      source_section: "3.2 Feature 列表"
      source_text: "原始文本..."
  
  constraints:
    performance:
      - requirement: "列表加载 < 2s"
        target: "p95 < 2000ms"
      - requirement: "支持 1000 并发"
        target: "1000 concurrent users"
    security:
      - requirement: "JWT 认证"
        target: "JWT-based authentication"
      - requirement: "仅管理员可删除"
        target: "RBAC with admin role"
  
  open_questions:
    - "是否需要支持批量导入/导出 Feature？"
    - "Feature 是否需要关联到 Epic？"
  
  unresolved:
    - section: "导出功能"
      reason: "PRD 中提到但未详细说明"
      suggestion: "与产品确认导出格式和范围"
```

### Phase 6: 输出产物

```
.csp/prd-ir/
├── PRD-IR.yaml                # 结构化中间表示
├── FEATURES-EXTRACTED.md      # 提取的功能点清单
├── CONSTRAINTS-EXTRACTED.md   # 提取的约束条件
├── GAPS-AND-QUESTIONS.md      # 发现的问题和缺失
└── PARSE-REPORT.md            # 解析报告
```

## 解析质量自检

解析完成后，检查以下项目：

- [ ] 元数据完整（来源、解析时间）
- [ ] 每个功能点有唯一 ID
- [ ] 每个功能点有描述和优先级
- [ ] 识别了用户故事（如有）
- [ ] 提取了验收标准（如有）
- [ ] 提取了约束条件（如有）
- [ ] 标记了未解析的模糊内容
- [ ] 标记了开放问题

## 完成信号

```yaml
completion_signal:
  output: .csp/prd-ir/PARSE-REPORT.md
  next_step:
    has_features: csp-requirement-decomposition
    needs_clarification: csp-interview-me
    ready_for_spec: csp-spec-contract
  status:
    prd_ir_path: .csp/prd-ir/PRD-IR.yaml
    features_extracted: "{{count}}"
    constraints_extracted: "{{count}}"
    open_questions: "{{count}}"
    phase: define
    ready_for: [requirement-decomposition, spec-contract, interview-me]
```

## 与其他 Skill 的集成

- **上游** — 钉钉文档 skill、语雀 MCP、用户直接输入
- **下游** — `csp-spec-contract` (直接消费 PRD-IR)、`csp-requirement-decomposition` (消费 FEATURES-EXTRACTED)、`csp-interview-me` (如果有开放问题)
- **并行** — `csp-prd-generation` 是 PRD 的"写"端，本 skill 是"读"端

## 关键原则

1. **不丢失信息** — 原始文本保留在 `source_text` 字段中
2. **不编造数据** — 没有的信息标记为 `[NOT_FOUND]`，不猜测填充
3. **格式无关** — 无论输入是 Markdown/钉钉/语雀/纯文本，输出格式一致
4. **可追溯** — 每个提取项有 `source_section` 和 `source_text` 溯源
5. **主动标记问题** — 模糊、矛盾、缺失的内容主动标记，而非静默忽略