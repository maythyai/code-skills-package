---
name: csp-create-skill
description: 标准技能创建向导 — 交互式引导用户创建高质量 CSP 新技能，自动完成脚手架、注册与校验。当用户想创建/新增/编写/迁移 skill（create skill / new skill / 写一个技能）时使用。
version: 1.0.0
layer: 4
category: runtime
phase: build
domain: architecture
role: wizard
scope: implementation
tools: [Read, Write, Edit, Bash, Glob, Grep]
related_skills: [csp-writing-skills, csp-skill-optimizer, csp-using-skills]
triggers:
  keywords: ["create skill", "new skill", "创建技能", "新建技能", "写一个skill", "skill 创建"]
  intents: ["user wants to create a new CSP skill"]
---

# Create Skill — 标准技能创建向导

将"我想做一个 XX 技能"变成**可被路由、通过校验、质量达标**的正式 CSP skill 的标准自动化流程。

**三条铁律：**

1. **磁盘是唯一真相源** — `registry.json` / `triggers.yaml` / `skill-metadata.yaml` 全部由脚本从磁盘生成，**严禁手改衍生文件**。
2. **先查重，后创建** — 与现有 skill 重叠时，增强或合并旧 skill，而不是新增重复技能（重复会拖垮路由置信度）。
3. **质量门禁先于注册** — 骨架、占位、无真实示例的 skill 不得进入 registry；进不了路由的 skill 等于不存在。

## When to Use

- 用户想创建 / 新增 / 编写一个新的 CSP skill（"帮我写一个 skill 来做 XX"）
- 把外部项目或其他 AI 工具的方法论文档**迁移**为 CSP skill
- 批量补全某领域技能缺口（先逐个走本流程，禁止无校验批量堆砌）

## When NOT to Use

- 修改 / 优化已有 skill → 直接编辑，或用 `csp-skill-optimizer`
- 只是想了解编写规范 → 读 `docs/SKILL-AUTHORING.md` 与 `docs/SKILL-SPEC.md`
- 项目特定约定 → 写入该项目的 `CLAUDE.md`，不要做成 skill
- 一次性方案、可用正则/校验自动化的机械规则 → 不创建 skill（判断标准见 `csp-writing-skills`）

## Process

### Phase 1 — 需求访谈（缺什么问什么，一次问全）

向用户收集以下信息（可用 AskUserQuestion 结构化提问）：

1. **用途**：这个 skill 解决什么任务？一句话说清。
2. **名称**：kebab-case，`csp-` 前缀（如 `csp-go-concurrency`）；目录名必须与 `name` 字段完全一致。
3. **层级**：用下表判定。
4. **触发场景**：用户说什么话、出现什么文件/上下文时应命中它（供 triggers 关键词用）。
5. **是否迁移而来**：若是，记录 origin，迁移时剥离原项目 internal 路径与工具名。

**层级决策表：**

| 如果你的 skill 是… | Layer | 目录 |
|---|:---:|---|
| 方法论 / 工作方式（TDD、调试、头脑风暴） | 1 | `csp-meta/skills/` |
| 项目生命周期流程（plan、execute、verify、ship） | 2 | `csp-workflow/skills/` |
| 语言 / 框架 / 领域模式（Python、React、数据库迁移） | 3 | `csp-patterns/skills/` |
| 运行时能力（路由、记忆、向导、autopilot） | 4 | `csp-runtime/skills/` |

> 注意：**没有 layer 5**。旧文档/旧 skill 中 `patterns=4, runtime=5` 的写法已废弃。

### Phase 2 — 查重（必做，不可跳过）

```bash
# 按名称、关键词检索现有技能与描述
ls csp-meta/skills csp-workflow/skills csp-patterns/skills csp-runtime/skills | grep -i "<关键词>"
grep -i "<关键词>" csp-router/registry.json | head -20
```

- **命中同名** → 终止创建，改为编辑现有 skill。
- **命中近似职责**（如已有 `csp-db-migration` 又要建 `csp-database-migrations`）→ 建议把新内容合并进旧 skill，或按"通用入口 + 领域专项"划分边界（用 `domain` 字段区分），避免 router 平票。
- **确无重叠** → 进入 Phase 3。

### Phase 3 — 脚手架（自动生成过校验的骨架）

```bash
node bin/csp-sdk.mjs init-skill <name> --layer <1|2|3|4> \
  [--category <c>] [--phase <p>] [--domain <d>] [--scope <s>]
```

- 自动在正确的 `csp-*/skills/csp-<name>/` 目录生成含 v2 frontmatter 的 `SKILL.md` 骨架。
- `--layer` 省略时默认 3；`category` 按层级自动推导（meta/workflow/patterns/runtime）。

### Phase 4 — 填充内容（按 docs/SKILL-AUTHORING.md 规范）

按推荐结构填充正文，替换所有 TODO 占位：

```markdown
# Human-Readable Name
概述：什么场景用，做什么。
## When to Use        ← 触发条件，写成症状/场景，便于检索（CSO）
## When NOT to Use    ← 反触发条件
## Process            ← 祈使句步骤，每步是具体动作
## Key Principles
## Common Mistakes    ← 可选
## Related Skills     ← 相关技能及各自使用时机
```

**写作要求：**

- `description` 只写"何时用"，不写"流程是什么"；动词开头，一句话（≤120 字），含中英文触发关键词。
- 步骤用祈使句；聚焦方法论，不绑定特定工具版本。
- 篇幅 800–2000 字为宜；>3000 字、When to Use >5 条、含两个独立子流程 → 拆分。
- **最低内容基线**：语言/框架 patterns 类 ≥150 行、≥3 个真实可运行示例；一个完整的好例子胜过五个填空模板。
- 禁止 `reserved for future expansion` 之类的占位链接；引用的文件必须真实存在。
- 纪律型 skill（强制 TDD、强制 review 等）应加 `anti_rationalizations` 表堵住 agent 的偷懒借口。

### Phase 5 — 质量门禁 Checklist（逐项核对后才能注册）

- [ ] `name`、目录名一致，`csp-` 前缀，仅小写字母/数字/连字符
- [ ] frontmatter 含 `name` `description` `layer` `category`，枚举字段取值合法
- [ ] `layer` 与所在目录一致（1=meta, 2=workflow, 3=patterns, 4=runtime）
- [ ] 无 TODO / 占位链接 / 空章节
- [ ] 与 Phase 2 查重结果无职责重叠
- [ ] 无 internal 路径、无硬编码用户路径（迁移项）
- [ ] When to Use / When NOT to Use 均非空

### Phase 6 — 注册与校验（标准自动化流水线）

```bash
# 1. frontmatter 校验（必须 0 fail）
node scripts/validate-skill-v2.mjs <layer-dir>/skills/csp-<name>/SKILL.md

# 2. 重新生成全部衍生文件（registry → metadata → triggers → SKPG → page）
npm run build:all

# 3. 全量校验（skills + triggers + registry，必须全绿）
npm run validate:all

# 4. 一致性审计：无 MISSING 路径、新 skill 不是 ORPHAN
node shared/scripts/audit-registry.js

# 5. 可选：安装预览
./install.sh --dry-run --platform claude-code
```

> 任一步失败：回到 Phase 4 修复后重跑，**不要**手改 registry.json / triggers.yaml 绕过。
> 只做了最小改动时可用 `npm run build:registry && npm run build:metadata && npm run gen:triggers` 代替 `build:all`。

### Phase 7 — 提交

```bash
git add <layer-dir>/skills/csp-<name> \
  csp-router/registry.json csp-router/triggers.yaml \
  csp-router/skill-metadata.yaml csp-router/skpg
git commit -m "feat(skills): add csp-<name> — <一句话描述>"
```

## Frontmatter 速查

| 字段 | 必填 | 说明 |
|---|:---:|---|
| `name` / `description` | ✅ | 唯一标识；"何时用"一句话 |
| `layer` / `category` | ✅ | 1–4；meta/workflow/patterns/runtime |
| `version` | 建议 | semver，新建为 `0.1.0` 或 `1.0.0` |
| `phase` | v2 | `define` `plan` `build` `verify` `review` `ship` |
| `domain` | v2 | `language` `quality` `security` `architecture` `devops` `database` `testing` `api` `patterns` `other` |
| `role` | v2 | `specialist` `expert` `architect` `reviewer` `guardian` `wizard` |
| `scope` | v2 | `implementation` `review` `analysis` `design` `testing` |
| `tools` | v2 | 权限分层：只读 `Read,Grep,Glob`；研究 +`WebFetch,WebSearch`；开发 +`Write,Edit,Bash` |
| `dependencies` / `related_skills` | v2 | 前置技能 / 互补技能（进 SKPG 依赖图） |
| `anti_rationalizations` | v2 | 纪律型 skill 的反偷懒话术表 |

## Common Mistakes

| 错误 | 后果 | 正确做法 |
|---|---|---|
| 手改 `registry.json` 加条目 | 下次 `build:registry` 被覆盖，白干 | 只写磁盘 SKILL.md，跑 `npm run build:registry` |
| 写 `layer: 5` 或 patterns 标 4 | frontmatter 数据污染 | 用层级决策表：patterns=3，runtime=4 |
| 目录名与 `name` 不一致 | 按名反查/按目录扫描双双出错 | 目录名 = name = `csp-` 前缀 |
| description 写成功清单 | agent 读描述就走捷径，跳过正文 | 只写触发条件（Use when…） |
| 骨架 skill 直接注册 | 路由命中但内容无法指导工作 | 低于内容基线 → 不注册，标记草稿继续补写 |
| 与现有 skill 职责重叠 | router 平票，退化成让用户选 | Phase 2 查重，合并或划清 domain 边界 |
| 批量创建不逐个校验 | 一致性崩坏（历史上 538/568/597 数字打架的根因） | 每个 skill 独立走完 Phase 5–6 |

## 从其他项目迁移

1. 保留原文档的方法论内容，剥离 internal 路径引用
2. 替换为 CSP 标准路径与工具名
3. 按 Phase 3 脚手架生成标准 frontmatter，再把内容填入
4. 在正文注明 origin（可选），走 Phase 5–6 门禁

## Related Skills

- [[csp-writing-skills]] — 纪律型技能的 TDD 测试方法论（RED-GREEN-REFACTOR、压力场景测试）
- [[csp-skill-optimizer]] — 优化 / 扩写已有 skill
- [[csp-using-skills]] — skill 的使用与发现机制
- `csp-skill-creator` — 旧版向导，已由本 skill 取代（层级映射与注册方式均已过时）
