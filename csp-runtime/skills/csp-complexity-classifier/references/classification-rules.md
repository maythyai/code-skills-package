# Classification Rules Reference

Complete reference for the CSP Complexity Classifier heuristic engine.

## Signal Tables

### File Count Signal (weight: 0.3)

| File Count | Normalized Score | Rationale |
|-----------|-----------------|-----------|
| 0 (no files) | 0.5 | Ambiguous — could be config or conversation; default to medium |
| 1 | 0.0 | Single-file operations are almost always simple |
| 2-3 | 0.4 | Small set of related files (e.g., component + test) |
| 4-5 | 0.6 | Multi-file coordination required |
| 6-10 | 0.8 | Large-scale change spanning many files |
| >10 | 1.0 | System-wide refactoring or migration |

**Detection heuristics:**
- Parse user input for file paths, glob patterns, directory names
- If PR/Issue link provided, count changed files from metadata
- If "all files in X" or similar phrasing, estimate based on directory listing
- When uncertain, prefer overestimation (safer to use stronger model)

### Keyword Signal (weight: 0.25)

#### Simple Keywords (score: 0.0-0.2)

**English:**
fix typo, add comment, remove comment, rename variable, rename function,
update config, change text, bump version, update readme, fix formatting,
adjust spacing, change color, update label, fix lint, add newline,
remove whitespace, update import path, change log level, add TODO,
update .env, tweak margin, fix indentation, update copyright year

**Chinese:**
修复拼写, 加注释, 删注释, 改变量名, 改函数名, 改配置, 换文案,
升版本, 更新文档, 修格式, 调间距, 改颜色, 换标签, 修lint,
加空行, 去空格, 改导入路径, 改日志级别, 加TODO, 改环境变量,
调边距, 修缩进, 更新版权年份

#### Medium Keywords (score: 0.3-0.6)

**English:**
implement, build, add feature, fix bug, write test, create endpoint,
integrate, add validation, handle error, add middleware, create component,
add route, implement handler, write unit test, add logging, create model,
add pagination, implement auth, add filter, create service, add hook,
implement cache, add retry logic, create factory, add serialization,
implement callback, add event listener, create utility, add type definition

**Chinese:**
实现, 开发, 新增功能, 修bug, 写测试, 创建接口, 集成, 加校验,
处理错误, 加中间件, 创建组件, 加路由, 实现处理器, 写单元测试,
加日志, 创建模型, 加分页, 实现认证, 加过滤器, 创建服务, 加hook,
实现缓存, 加重试逻辑, 创建工厂, 加序列化, 实现回调, 加事件监听,
创建工具函数, 加类型定义

#### Complex Keywords (score: 0.7-1.0)

**English:**
redesign, migrate, refactor, restructure, optimize performance, overhaul,
deprecate, architect, rewrite, decouple, introduce pattern, upgrade framework,
breaking change, scale, parallelize, distribute, shard, replicate,
design system, monorepo migration, api versioning, database migration,
security audit, compliance, internationalization, accessibility overhaul,
microservice extraction, event sourcing, cqrs, domain driven design

**Chinese:**
重新设计, 迁移, 重构, 改造, 性能优化, 大改, 废弃, 架构设计,
重写, 解耦, 引入模式, 升级框架, 破坏性变更, 扩展, 并行化,
分布式, 分片, 复制, 设计系统, monorepo迁移, API版本管理,
数据库迁移, 安全审计, 合规, 国际化, 无障碍改造, 微服务拆分,
事件溯源, CQRS, 领域驱动设计

**Keyword matching rules:**
1. Case-insensitive matching
2. Match longest keyword first (e.g., "optimize performance" before "optimize")
3. If keywords from multiple levels match, take the highest level score
4. Partial word matches are NOT allowed (e.g., "refix" does not match "fix")
5. Negation detection: "don't refactor" or "不需要重构" negates the keyword

### Context Depth Signal (weight: 0.25)

| Depth | Score | Indicators |
|-------|-------|-----------|
| none | 0.0 | Mechanical operation; no code comprehension needed; pure text/config change |
| partial | 0.5 | Need to understand a function, class, or module; local data flow; single dependency chain |
| full | 1.0 | Need to understand system architecture; cross-module data flow; multiple dependency chains; state management patterns; concurrency model |

**Depth inference heuristics:**
- "in file X" / "在X文件中" → none or partial
- "in module X" / "在X模块中" → partial
- "across the system" / "整个系统" → full
- References to specific functions/classes → partial
- References to architecture concepts (MVC, event loop, DI container) → full
- Mentions of multiple services/modules → full

### Impact Range Signal (weight: 0.2)

| Range | Score | Indicators |
|-------|-------|-----------|
| local | 0.0 | Internal to a single function/class; no public API change; no schema change |
| module | 0.5 | Changes public interface of a module; affects module consumers; adds/removes exports |
| system | 1.0 | Database schema change; external API contract change; shared library modification; infrastructure change; authentication/authorization change |

**Impact inference heuristics:**
- Private function/method change → local
- Exported function signature change → module
- Database column/table change → system
- API request/response schema change → system
- Environment variable addition → module
- Infrastructure config (Dockerfile, CI/CD) → system
- Auth/permission logic → system

## Edge Cases and Overrides

### Ambiguous Inputs

| Scenario | Resolution |
|----------|-----------|
| Very short input (<10 chars) | Default to medium; too little signal for reliable classification |
| No recognizable keywords | Rely on file_signal and context_signal only; if both absent, default medium |
| Contradictory signals (e.g., "simple refactor") | Keyword takes precedence over adjective; classify as complex |
| Multiple tasks in one message | Classify by the highest-complexity sub-task |
| Question format ("how do I...?") | If followed by implementation request, classify the implementation; otherwise skip classifier |

### Link-Augmented Classification

When user input contains PR/Issue URLs:

1. Fetch metadata (changed files count, labels, description)
2. Extract signals from fetched content
3. Combine with user text signals using max() per dimension
4. This prevents under-classification when user says "fix this" but links a 20-file PR

### User Override Syntax

```
/csp-complexity set simple      # Force simple classification
/csp-complexity set medium      # Force medium classification
/csp-complexity set complex     # Force complex classification
/csp-complexity                 # Display current classification result
/csp-complexity reset           # Clear override, return to auto-classification
```

Override behavior:
- Override persists for the current task only (not session-wide)
- Output JSON includes `"overridden": true` and `"override_reason": "user_command"`
- Override is logged to `.csp/intel/skill-feedback.md` for skill-optimizer consumption
- Repeated overrides of the same direction may trigger a suggestion to adjust default thresholds

### Confidence Thresholds

If the computed score is near a boundary (within 0.05), flag as borderline:

```json
{
  "complexity": "medium",
  "score": 0.64,
  "borderline": true,
  "borderline_direction": "complex",
  "recommendations": {
    "model": "sonnet",
    "note": "Score near complex boundary; consider upgrading if task proves harder than expected"
  }
}
```

Borderline handling:
- Round DOWN for model selection (conservative cost)
- Round UP for skill enablement (conservative quality)
- Display borderline note to user when manually querying `/csp-complexity`

## Workflow Engine Integration

### Stages Per Complexity Level

| Stage | simple | medium | complex |
|-------|--------|--------|---------|
| Brainstorming | SKIP | SKIP (unless requested) | ENABLE |
| Planning | SKIP | OPTIONAL | ENABLE |
| TDD | SKIP | ENABLE | ENABLE |
| Implementation | ENABLE | ENABLE | ENABLE |
| Code Review | SKIP | ENABLE | ENABLE |
| Verification (basic) | ENABLE | ENABLE | ENABLE |
| Verification (full) | SKIP | SKIP | ENABLE |
| Security Scan | SKIP | SKIP | ENABLE |
| Documentation | SKIP | OPTIONAL | ENABLE |
| Shipping Prep | SKIP | OPTIONAL | ENABLE |

### Model Selection Matrix

Combined decision table (complexity x budget tier):

| | Budget OK | Budget WARNING | Budget SOFT_LIMIT | Budget HARD_LIMIT |
|---|-----------|---------------|-------------------|-------------------|
| **simple** | haiku | haiku | haiku | (essential only) |
| **medium** | sonnet | sonnet | haiku* | (essential only) |
| **complex** | opus | sonnet* | sonnet* | (essential only) |

\* = degraded from preferred model; log warning to budget checkpoint

### Skill Loading Strategy

**simple:**
```yaml
load: []  # Minimal — direct execution
skip: [csp-brainstorming, csp-plan, writing-plans, deep-research, csp-tdd]
verify: basic  # syntax + lint only
```

**medium:**
```yaml
load: [csp-tdd, verification]
skip: [csp-brainstorming, writing-plans, deep-research]
verify: standard  # tests + lint + type check
```

**complex:**
```yaml
load: [csp-brainstorming, csp-plan, csp-tdd, verification, requesting-code-review, security-review]
skip: []
verify: full  # tests + lint + type check + integration + security
```

## Scoring Examples

### Example 1: Typo Fix
```
User: "Fix typo in README.md"

file_signal:    0.0  (1 file)
keyword_signal: 0.1  ("fix typo" → simple)
context_signal: 0.0  (no code comprehension)
impact_signal:  0.0  (local, documentation only)

score = 0.0*0.3 + 0.1*0.25 + 0.0*0.25 + 0.0*0.2 = 0.025
→ simple ✓
```

### Example 2: Add API Endpoint
```
User: "Implement user profile endpoint with validation and tests"

file_signal:    0.4  (3 files: route, controller, test)
keyword_signal: 0.5  ("implement", "endpoint", "tests" → medium)
context_signal: 0.5  (need to understand existing API patterns)
impact_signal:  0.5  (new public API endpoint → module impact)

score = 0.4*0.3 + 0.5*0.25 + 0.5*0.25 + 0.5*0.2 = 0.345
→ medium ✓
```

### Example 3: Database Migration
```
User: "Migrate user table from MySQL to PostgreSQL and update all queries"

file_signal:    0.8  (8+ files: models, queries, configs, tests)
keyword_signal: 0.9  ("migrate", "database migration" → complex)
context_signal: 1.0  (need full understanding of data layer)
impact_signal:  1.0  (database schema change → system impact)

score = 0.8*0.3 + 0.9*0.25 + 1.0*0.25 + 1.0*0.2 = 0.915
→ complex ✓
```
