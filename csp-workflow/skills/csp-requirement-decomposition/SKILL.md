---
name: csp-requirement-decomposition
description: |
  需求全维度拆解引擎。将模糊需求/PRD/想法彻底分解为原子级 Feature，每个 Feature 附带用户故事、
  验收标准、前后端边界、数据实体、技术维度和依赖关系。
  当用户给出一个产品需求、功能描述、或想要从零构建系统时，第一步使用此 skill 进行结构化拆解。
  关键词：需求拆解、feature 分解、requirement decomposition、break down requirements、
  拆解需求、功能拆分、feature breakdown、需求分析、feature list、功能清单、
  拆解功能、分解需求、analyze requirements、feature extraction、需求结构化。
  即使用户只说"帮我做一个XX系统"，也应先使用此 skill 进行完整拆解再进入后续阶段。
version: "1.0.0"
layer: 2
category: workflow
phase: define
domain: architecture
scope: analysis
tools: [Read, Write, Edit, Glob, Grep, Bash]

dependencies:
  skills: []
  agents: []

related_skills:
  - csp-tech-stack-advisor
  - csp-fullstack-spec-generator
  - csp-lifecycle-orchestrator
  - csp-brainstorming
  - csp-interview-me
  - csp-full

triggers:
  keywords: ["需求拆解", "feature分解", "功能拆分", "需求分析", "feature breakdown",
             "requirement decomposition", "break down", "功能清单", "拆解"]
  intents:
    - "user wants to decompose a product requirement into features"
    - "user describes a system they want to build"
    - "user needs structured feature analysis before implementation"
  context:
    - "session_start_with_requirement"

anti_rationalizations:
  "This requirement is simple enough, no need to decompose": "Even simple requirements have hidden complexity. Decompose first."
  "I'll figure out the features during implementation": "Undiscovered features become tech debt. Map them now."
  "The user already listed the features": "Validate completeness. Users describe what they want, not everything they need."
---

# Requirement Decomposition Engine

将任何粒度的需求（一句话想法 → 完整 PRD）彻底拆解为可执行的原子 Feature 集合。

## 核心理念

需求拆解不是简单列功能清单。它是一次**全维度结构化分析**，目标是：
1. 消除模糊性 — 每个 Feature 都有明确的边界和验收标准
2. 暴露隐藏需求 — 非功能性需求、异常路径、集成点
3. 建立依赖图 — 确定实施顺序和并行可能性
4. 预映射技术维度 — 为后续 tech-stack-advisor 和 fullstack-spec-generator 提供输入

## 执行流程

### Phase 1: 需求输入标准化

接收任意格式的需求输入，标准化为统一结构：

```markdown
# Requirement Input
## 原始需求
[用户原始描述]

## 需求来源
- 类型: [一句话想法 | 功能描述 | PRD | 用户反馈 | 竞品参考]
- 完整度评分: [1-5]
- 模糊点: [列出]

## 上下文
- 项目阶段: [全新 | 已有系统扩展 | 重构]
- 已知约束: [技术栈/时间/预算/团队]
- 目标用户: [描述]
```

**如果完整度 ≤ 2：** 先触发 `csp-interview-me` 或 `csp-brainstorming` 进行需求澄清。
**如果完整度 ≥ 3：** 直接进入 Phase 2。

### Phase 2: 功能域识别（Domain Mapping）

将需求空间划分为功能域（Domain），每个域是一组相关 Feature 的容器：

```
需求
├── 域 A: 用户管理
│   ├── Feature A1: 注册/登录
│   ├── Feature A2: 权限控制
│   └── Feature A3: 用户画像
├── 域 B: 核心业务
│   ├── Feature B1: ...
│   └── Feature B2: ...
├── 域 C: 数据与智能
│   ├── Feature C1: ...
│   └── Feature C2: ...
└── 域 D: 基础设施
    ├── Feature D1: ...
    └── Feature D2: ...
```

**域划分原则：**
- 按业务能力划分，不按技术层划分
- 每个域应有清晰的职责边界
- 域间耦合最小化
- 通常 3-7 个域为宜

### Phase 3: 原子 Feature 拆解

对每个域，拆解为原子 Feature。每个 Feature 必须包含以下维度：

```yaml
feature:
  id: "F-{domain}-{seq}"        # 唯一标识
  name: ""                       # Feature 名称
  domain: ""                     # 所属域
  
  # 用户视角
  user_story: ""                 # As a [role], I want [action], so that [value]
  acceptance_criteria:           # 可验证的验收标准（至少 2 条）
    - "Given [context], when [action], then [result]"
  
  # 边界定义
  scope:
    includes: []                 # 明确包含什么
    excludes: []                 # 明确不包含什么
  
  # 前后端边界
  frontend:
    pages: []                    # 涉及的页面/视图
    components: []               # 关键 UI 组件
    interactions: []             # 用户交互描述
  backend:
    endpoints: []                # API 端点（方法 + 路径）
    business_logic: []           # 核心业务逻辑描述
    integrations: []             # 外部集成
  
  # 数据维度
  data_entities: []              # 涉及的数据实体
  data_operations: []            # CRUD + 特殊操作
  
  # 技术维度预标记（由 tech-stack-advisor 细化）
  tech_dimensions:
    needs_database: true/false
    needs_cache: true/false
    needs_queue: true/false      # 消息队列
    needs_ai: true/false         # AI/ML 能力
    needs_vector_store: true/false
    needs_realtime: true/false   # WebSocket/SSE
    needs_file_storage: true/false
    needs_search: true/false     # 全文搜索
    needs_scheduler: true/false  # 定时任务
    needs_notification: true/false
  
  # 非功能性需求
  nfr:
    performance: ""              # 响应时间/吞吐量要求
    security: ""                 # 安全要求
    scalability: ""              # 扩展性要求
    availability: ""             # 可用性要求
  
  # 依赖与优先级
  priority: P0/P1/P2/P3
  complexity: S/M/L/XL
  depends_on: []                 # 依赖的其他 Feature ID
  blocked_by: []                 # 被阻塞项
  
  # 风险
  risks: []                      # 已识别风险
  assumptions: []                # 假设条件
```

### Phase 4: 非功能性需求补全

在 Feature 拆解后，补充系统级非功能性需求：

```markdown
## 系统级 NFR
### 性能
- 预期并发用户数:
- 核心接口响应时间:
- 数据量预估:

### 安全
- 认证方式:
- 数据加密要求:
- 合规要求 (GDPR/HIPAA/etc):

### 可用性
- SLA 目标:
- 容灾策略:
- 降级方案:

### 可观测性
- 日志策略:
- 监控指标:
- 告警规则:

### 国际化
- 多语言需求:
- 多时区:
- 本地化:
```

### Phase 5: 依赖图与实施路径

构建 Feature 间的依赖 DAG，输出实施路径建议：

```markdown
## 依赖图 (Mermaid)
graph TD
    F-A-1 --> F-B-1
    F-A-2 --> F-B-2
    F-B-1 --> F-C-1
    
## 实施波次 (Waves)
### Wave 1 (基础层，可并行)
- F-A-1: 用户注册/登录
- F-D-1: 基础 API 框架

### Wave 2 (核心业务，依赖 Wave 1)
- F-B-1: 核心业务流程
- F-B-2: 数据管理

### Wave 3 (增强功能)
- F-C-1: AI 智能推荐
- F-C-2: 数据分析面板

## 关键路径
F-A-1 → F-B-1 → F-C-1 (预计 N 天)

## 并行机会
- Wave 1 内所有 Feature 可并行
- F-B-1 和 F-B-2 可并行（无互相依赖）
```

### Phase 6: 输出产物

最终产出 `.csp/decomposition/` 目录下的结构化文件：

```
.csp/decomposition/
├── REQUIREMENT-INPUT.md       # 标准化需求输入
├── FEATURE-MAP.md             # 完整 Feature 清单（表格视图）
├── FEATURE-DETAILS/           # 每个 Feature 的详细 spec
│   ├── F-A-1.yaml
│   ├── F-A-2.yaml
│   └── ...
├── DEPENDENCY-GRAPH.md        # 依赖图 + 实施路径
├── NFR.md                     # 非功能性需求
└── DECOMPOSITION-SUMMARY.md   # 拆解摘要（供下游 skill 消费）
```

**DECOMPOSITION-SUMMARY.md 结构（供 tech-stack-advisor 和 fullstack-spec-generator 消费）：**

```markdown
# Decomposition Summary
## 项目概览
- 总 Feature 数: N
- 域数: M
- 预估复杂度: [S/M/L/XL]

## 技术维度汇总
| 维度 | 需要该能力的 Feature | 推荐优先级 |
|------|---------------------|-----------|
| 数据库 | F-A-1, F-B-1, ... | 必须 |
| 消息队列 | F-C-1, F-C-2 | 推荐 |
| AI/ML | F-C-1 | 可选 |
| 向量库 | F-C-1 | 可选 |
| 实时通信 | F-B-2 | 推荐 |
| 全文搜索 | F-B-1 | 推荐 |

## Feature 优先级矩阵
| Feature | 优先级 | 复杂度 | 依赖 | Wave |
|---------|--------|--------|------|------|

## 下一步
→ 使用 csp-tech-stack-advisor 进行技术选型
→ 使用 csp-fullstack-spec-generator 生成详细 spec
```

## 拆解策略矩阵

| 需求类型 | 拆解策略 | 典型域数 | 典型 Feature 数 |
|---------|---------|---------|----------------|
| 一句话想法 | 先 brainstorm → 再拆解 | 3-5 | 8-15 |
| 功能描述 | 直接拆解 + 补全隐藏需求 | 3-6 | 10-20 |
| 完整 PRD | 验证性拆解 + 技术维度标注 | 4-7 | 15-30 |
| 已有系统扩展 | 增量拆解 + 影响分析 | 1-3 | 3-10 |
| 模块集成 | 接口拆解 + 适配层设计 | 1-2 | 2-6 |

## 隐藏需求检查清单

每个域拆解后，用此清单验证是否遗漏：

- [ ] 认证与授权（几乎每个系统都需要）
- [ ] 错误处理与用户反馈
- [ ] 数据校验（前端 + 后端双重）
- [ ] 分页/搜索/过滤（列表类功能）
- [ ] 导入/导出
- [ ] 操作日志/审计追踪
- [ ] 通知（邮件/推送/站内信）
- [ ] 配置管理（系统设置）
- [ ] 文件上传/存储
- [ ] 限流/防刷
- [ ] 数据备份/恢复
- [ ] 国际化/本地化
- [ ] 无障碍访问
- [ ] 移动端适配
- [ ] SEO（如果是公开页面）
- [ ] 分析/埋点

## 完成信号

```yaml
completion_signal:
  output: .csp/decomposition/DECOMPOSITION-SUMMARY.md
  next_step:
    recommended: csp-tech-stack-advisor
    alternatives: [csp-fullstack-spec-generator, csp-plan-phase]
  status:
    decomposition_path: .csp/decomposition/
    feature_count: "{{count}}"
    phase: define
    ready_for: [tech-selection, spec-generation, planning]
```

## 与其他 Skill 的协作

| 上游 Skill | 提供什么 |
|-----------|---------|
| csp-brainstorming | 创意发散结果，作为拆解输入 |
| csp-interview-me | 需求澄清结果，补全模糊点 |

| 下游 Skill | 消费什么 |
|-----------|---------|
| csp-tech-stack-advisor | DECOMPOSITION-SUMMARY.md 中的技术维度汇总 |
| csp-fullstack-spec-generator | FEATURE-DETAILS/*.yaml 中的每个 Feature 定义 |
| csp-lifecycle-orchestrator | 完整的拆解产物目录 |
| csp-plan-phase | DEPENDENCY-GRAPH.md 中的实施路径 |
