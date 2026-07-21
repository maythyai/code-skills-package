# Lifecycle Orchestrator 编排规则

## 阶段间产物流转契约

每个阶段产出标准化 artifact，下游阶段通过固定路径消费。

### 产物路径约定

```
.csp/
├── decomposition/          # S1 产出
│   ├── REQUIREMENT-INPUT.md
│   ├── FEATURE-MAP.md
│   ├── FEATURE-DETAILS/
│   │   └── F-{DOMAIN}-{SEQ}.yaml
│   ├── DEPENDENCY-GRAPH.md
│   ├── NFR.md
│   └── DECOMPOSITION-SUMMARY.md    # ← S2 入口
│
├── tech-decisions/         # S2 产出
│   ├── TECH-STACK-OVERVIEW.md
│   ├── ADR/
│   │   └── ADR-{NNN}-{slug}.md
│   ├── PER-FEATURE-STACK.md
│   └── TECH-DECISIONS-SUMMARY.md   # ← S3 入口
│
├── specs/                  # S3 产出
│   ├── SPEC-F-{DOMAIN}-{SEQ}.md
│   ├── SHARED-SCHEMAS.md
│   ├── API-OVERVIEW.md
│   └── SPEC-INDEX.md               # ← S4 入口
│
├── plan/                   # S4 产出
│   └── IMPLEMENTATION-PLAN.md      # ← S5 入口
│
├── milestones/             # S5-S9 归档
│   └── v{N}/
│       ├── SUMMARY.md
│       ├── test-results/
│       ├── review-findings/
│       └── release-notes.md
│
└── lifecycle-config.yaml   # 编排配置
```

## 门控检查规则

### S1 → S2 门控
```yaml
gate_s1_to_s2:
  required_files:
    - .csp/decomposition/DECOMPOSITION-SUMMARY.md
    - .csp/decomposition/FEATURE-DETAILS/  # 至少 1 个文件
  validations:
    - "每个 Feature YAML 包含 user_story 字段"
    - "每个 Feature YAML 包含至少 1 条 acceptance_criteria"
    - "DEPENDENCY-GRAPH.md 中无循环依赖"
    - "P0 Feature 数量 ≥ 1"
  on_failure:
    action: retry_s1
    max_retries: 2
    fallback: "降低拆解粒度，合并小 Feature"
```

### S2 → S3 门控
```yaml
gate_s2_to_s3:
  required_files:
    - .csp/tech-decisions/TECH-STACK-OVERVIEW.md
    - .csp/tech-decisions/ADR/  # 至少 3 个 ADR
  validations:
    - "TECH-STACK-OVERVIEW 包含 language + framework + database 选择"
    - "每个 needs_queue=true 的 Feature 有对应队列技术选择"
    - "每个 needs_ai=true 的 Feature 有对应 AI 框架选择"
    - "每个 needs_vector_store=true 的 Feature 有对应向量库选择"
    - "技术栈一致性: 后端语言 ≤ 2 种"
  on_failure:
    action: retry_s2
    max_retries: 1
```

### S3 → S4 门控
```yaml
gate_s3_to_s4:
  required_files:
    - .csp/specs/SPEC-INDEX.md
    - .csp/specs/API-OVERVIEW.md
  validations:
    - "所有 P0 Feature 有对应 SPEC 文件"
    - "所有 P1 Feature 有对应 SPEC 文件"
    - "每个 SPEC 包含 Schema + API + UI 三个维度"
    - "API-OVERVIEW 中端点无路径冲突"
    - "SHARED-SCHEMAS 中表名唯一"
  on_failure:
    action: retry_s3_for_missing
    max_retries: 2
```

### S5 → S6 门控 (开发完成 → 质量检查)
```yaml
gate_s5_to_s6:
  validations:
    - "build 命令成功 (exit code 0)"
    - "lint 零 error (warning 可接受)"
    - "typecheck 零 error"
    - "所有 IMPLEMENTATION-PLAN 中的 Task 标记完成"
  on_failure:
    action: fix_and_retry
    max_retries: 3
```

### S6 → S7 门控 (质量 → 审查)
```yaml
gate_s6_to_s7:
  validations:
    - "单元测试全部通过"
    - "集成测试核心路径通过"
    - "覆盖率 ≥ 配置阈值 (默认 70%)"
    - "无 CRITICAL 安全漏洞 (dependency scan)"
  on_failure:
    action: insert_debug_cycle
    max_retries: 5
```

## 动态路由决策树

```
用户输入
  │
  ├── 检测已有产物
  │   ├── .csp/specs/ 存在且完整?
  │   │   └── 是 → 跳到 S4 (planning)
  │   ├── .csp/tech-decisions/ 存在?
  │   │   └── 是 → 跳到 S3 (spec generation)
  │   └── .csp/decomposition/ 存在?
  │       └── 是 → 跳到 S2 (tech selection)
  │
  ├── 评估输入复杂度
  │   ├── 极简 (< 30 字, 无具体功能)
  │   │   └── 先触发 csp-brainstorming → 再 S1
  │   ├── 中等 (有功能列表, 无技术约束)
  │   │   └── S1 完整流程
  │   └── 详细 (功能 + 技术栈 + 约束)
  │       └── S1 精简 → 快速进入 S2
  │
  └── 评估项目规模
      ├── ≤ 5 Features → mode=lightweight
      ├── 6-15 Features → mode=full
      └── > 15 Features → mode=full + parallel_execution
```

## 用户审批交互模板

### 拆解确认 (S1 完成后)
```markdown
## 需求拆解完成，请确认

我将其拆解为 **{N} 个域、{M} 个 Feature**：

| 域 | Feature 数 | P0 | P1 | P2+ |
|----|-----------|----|----|-----|
| {域名} | {n} | {p0} | {p1} | {p2} |

### 关键决策点
1. {决策点1}: {选项A} vs {选项B} — 我选了 {选择}，因为 {理由}
2. ...

### 请确认
- [ ] Feature 清单完整，无遗漏
- [ ] 优先级分配合理
- [ ] 技术维度标记正确
- [ ] 可以进入技术选型阶段

> 回复"确认"继续，或指出需要调整的地方。
```

### 技术栈确认 (S2 完成后)
```markdown
## 技术选型完成，请确认

| 层次 | 选择 | 理由 |
|------|------|------|
| 主语言 | {lang} | {reason} |
| 框架 | {framework} | {reason} |
| 数据库 | {db} | {reason} |
| ... | ... | ... |

### 关键 ADR
- ADR-001: {决策} — {一句话理由}
- ADR-002: ...

### 请确认
- [ ] 技术栈符合团队能力
- [ ] 无过度工程
- [ ] 可以进入 Spec 生成阶段

> 回复"确认"继续，或指定要替换的技术。
```

## 迭代增量处理

当用户在已有系统上追加需求时：

```yaml
incremental_mode:
  detection:
    - ".csp/milestones/ 目录存在"
    - "用户输入包含 '再加'/'新增'/'扩展'/'追加'"
  
  handling:
    new_features:
      - "只对新 Feature 执行 S1-S3"
      - "复用已有技术栈 (除非新需求引入新维度)"
      - "Spec 中标注与已有 Feature 的关联"
    
    modified_features:
      - "生成 delta spec (ADDED/MODIFIED/REMOVED)"
      - "影响分析: 哪些已有 Feature 受影响"
      - "更新 API-OVERVIEW (标注变更)"
    
    removed_features:
      - "deprecation notice"
      - "migration plan (数据迁移)"
      - "向后兼容期设定"
```
