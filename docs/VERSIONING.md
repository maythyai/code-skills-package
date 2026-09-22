# CSP 版本管理规范

## 版本数据源

CSP 使用 **双文件** 版本管理：

| 文件 | 用途 | 维护者 |
|------|------|--------|
| `VERSION` | 人类可读的版本号（一行纯文本） | **唯一手动修改点** |
| `package.json.version` | npm 生态兼容（发布、安装） | 脚本自动同步 |

```
VERSION (手动改这一处)
  └──→ scripts/sync-version.js ──→ package.json / CLAUDE.md / install.sh / README
```

> **Note:** `scripts/sync-version.js` 实际以 `package.json.version` 为数据源（脚本会读取 package.json，并同步到 CLAUDE.md / install.sh / README，但不读写 VERSION 文件）。因此 `package.json.version` 是 sync-version.js 的 source of truth；`VERSION` 文件为手动维护的人类可读版本号，需按下方流程与 package.json 保持一致。

**操作**：修改版本号时只改 `VERSION` 文件的第一行，然后运行同步脚本：

```bash
node scripts/sync-version.js          # 同步到所有文件
node scripts/sync-version.js 0.8.0    # 先更新 package.json 再同步
```

## 版本号规则 (X.Y.Z)

CSP 采用语义化版本号，格式 `X.Y.Z`：

> **粒度映射**：CSP 把产品演进细分为「系统重构 / 模块新增 / 功能迭代 / 修复」四级语义，折叠进 SemVer 三段——系统重构 → X，模块新增与功能迭代 → Y（Y 内再分模块级 / 功能级两个子级别，仅描述体量、不改变 bump 动作），修复 → Z。

> **攒批发布原则**：版本号按**发布批次**递增，不逐功能 bump——一个版本可包含多个产品功能/小改动，攒一批发一次、只 bump 一次。一次发布含多个变更时，按整批**最高级别** bump（如一批含新增功能 + 若干修复 → MINOR+1，不再叠加 PATCH）。不要"一个小功能就发一版、bump 一次"。

### X — MAJOR（架构级 / 系统重构）

> **触发门槛**：X 仅在出现**深度破坏性的系统级重构**或**不兼容变更**时递增，不是常规产品迭代。bump 时 Y、Z 归零。这一档在整个项目生命周期中应极少出现。

| 条件 | 说明 |
|------|------|
| 系统级架构翻新 | 整体架构形态的破坏性重构，如 monorepo → 集成系统、微服务 → 集成系统，需大量系统级代码重构 |
| 破坏性 API 变更 | 用户现有 hooks/skills/recipes 无法在新版本工作 |
| 架构层增减 | 新增或删除整个层（L0-L4），需要用户迁移配置 |
| 安装器行为破坏 | `install.sh` 的已有参数语义发生不兼容变更 |
| skill 命名规则变化 | 需要用户批量重命名或修改引用路径 |
| 文件格式不兼容 | SKILL.md v2 → v3 且无法自动向下兼容 |

**示例**：v0.x.x → v1.0.0（首个稳定版发布时）；v1.x.x → v2.0.0（从 monorepo 重构为集成系统架构）

### Y — MINOR（产品演进 / 向后兼容）

> 向后兼容的「新增」一律 bump Y、Z 归零。Y 内分两个子级别，仅用于描述变更体量，**不改变 bump 动作**——两者都 bump Y。

**① 模块级（较重的 MINOR）**——新增完整产品模块 / 功能域：

| 条件 | 说明 |
|------|------|
| 新增完整功能域 | 如新增 AI 工程领域（RAG、LLM 服务）、移动端领域 |
| 新增完整模块 | 类比产品模块级新增：系统配置模块、内容管理模块、用户中心模块等 |
| 架构层内新增子层 | 在已有层内引入新的成体系子能力（需多个 skill 协同） |
| 新增路由器机制 | 如新增 state-detector、confidence-router、SKPG（不改变已有路由） |
| 新增运行时能力 | 如新增持续学习循环、self-improve |
| SKILL.md 规范升级 | 新增 v2 字段（phase/domain/role），旧字段仍然有效 |
| 批量新增 ≥5 个 skill | 一次新增多个技能，向后兼容 |

**② 功能级（较轻的 MINOR）**——现有模块内的功能迭代 / 升级：

| 条件 | 说明 |
|------|------|
| 现有模块加新功能 | 类比：系统配置模块加自定义配置文件能力、用户中心加密码更新功能 |
| 安装器新增选项 | 新增 --stacks、--layers、--dry-run 等选项（不破坏已有行为） |
| 新增方法论 skill | 如新增 brainstorming、TDD、debugging 工作流（1-4 个 skill） |
| 现有 skill 能力增强 | 触发词扩充、新增 phase、补齐 references 等 |

**示例**：v0.6.0 → v0.7.0（状态路由 + SKPG + v2 规范，模块级）

> **攒批原则**：一次发布同时含模块级和功能级变更时，按整批最高级别（即模块级）bump 一次 Y，不叠加、不逐功能 bump。

### Z — PATCH（修复 / 小修改）

| 条件 | 说明 |
|------|------|
| 修复 <5 个 skill 的内容错误 | 描述错误、路径错误、触发词错误 |
| 修复脚本 bug | sync-version.js、build-skpg.mjs 等脚本修复 |
| 文档更新 | README、CLAUDE.md、CHANGELOG 文档修正 |
| 安装器小修复 | 平台检测路径修正、错误提示改进 |
| 清理废弃代码 | 删除未引用的文件、统一命名规范 |
| 更新统计数据 | CHANGELOG 中 skill 数量修正（与实际对齐） |
| 新增 1-4 个 skill | 少量 skill 增量 |

**示例**：v0.7.0 → v0.7.1（修复 3 个 skill 路径错误 + 文档修正）

### 决策树

> 评估对象是**整批变更**（一次发布的全部改动），取最高级别一次 bump，不逐功能累加。

```
变更是否为深度破坏性的系统级重构，或破坏现有用户的配置/skill 引用？
  ├── 是 → X++（MAJOR），Y=0, Z=0
  └── 否 → 是否为向后兼容的「新增」？
            ├── 是 → Y++（MINOR），Z=0
            │        （模块级 / 功能级均 bump Y；一批含多个取最高一次 bump）
            └── 否（仅修复 / 文档 / 清理）→ Z++（PATCH）
```

## 当前阶段：0.x

CSP 仍在预发布阶段，MAJOR 保持为 0。

- **X=0** 表示 API 尚未稳定，可能存在不兼容变更
- 达到 v1.0.0 的条件：五层架构稳定、核心 skill 覆盖主流技术栈、install.sh 通过所有平台测试

## 版本更新流程

### 1. 修改 VERSION

```bash
echo "0.8.0" > VERSION
```

### 2. 同步到所有文件

```bash
node scripts/sync-version.js
```

### 3. 更新 CHANGELOG.md

```markdown
## v0.X.Y — YYYY-MM-DD

### 新增
- `csp-xxx` — 描述

### 修复
- 问题描述

### 统计
| 指标 | 上个版本 | 本版本 |
|------|---------|--------|
| Skills | N | N' |
| V2 Skills | N | N' |
```

**规则**：
- Skill 数量以 `find csp-* -name SKILL.md | wc -l` 实际计数为准
- 不编造未实现的功能
- 删除的功能必须从 CHANGELOG 移除

### 4. 验证一致性

```bash
node scripts/sync-version.js          # 所有文件应显示"已是 vX.Y.Z"
```

### 5. 提交

```bash
git add -A
git commit -m "chore: bump version to v0.X.Y"
git push
```

## 文件职责矩阵

| 文件 | 职责 | 追踪 |
|------|------|------|
| `VERSION` | 版本号（唯一手动修改点） | ✅ git |
| `package.json` | npm 包定义 | ✅ git |
| `CLAUDE.md` | 项目入口（版本号 + 架构摘要） | ✅ git |
| `CHANGELOG.md` | 变更历史 | ✅ git |
| `README.md` | 英文文档 | ✅ git |
| `README_zh.md` | 中文文档 | ✅ git |
| `install.sh` | 安装脚本（版本号） | ✅ git |
| `csp-router/registry.json` | 技能唯一清单 | ✅ git |
| `csp-router/skpg/graph.json` | 技能关系图谱（从 registry 构建） | ⚠️ 发布版本时更新 |
| `csp-router/skill-metadata.yaml` | 技能元数据 | ✅ git |
| `scripts/sync-version.js` | 版本同步脚本 | ✅ git |
| `scripts/build-skpg.mjs` | SKPG 构建脚本 | ✅ git |

## 运行时版本文件

安装后，CSP 会在目标项目写入 VERSION 文件供 `/csp-update` 等命令读取：

```
~/.claude/code-skills-package/VERSION     # 全局安装（Claude Code）
./.claude/code-skills-package/VERSION     # 项目级安装（Claude Code）
~/.cursor/skills/code-skills-package/VERSION   # Cursor
~/.gemini/skills/code-skills-package/VERSION   # Gemini CLI
```

这些是 `install.sh` 从源码 VERSION 文件复制的运行时副本，不由 git 管理。

## registry.json vs skpg/graph.json

| | registry.json | graph.json |
|---|---|---|
| **定位** | 技能唯一清单（权威数据源） | 技能关系图谱（派生产物） |
| **维护** | 手动维护 | `scripts/build-skpg.mjs` 自动生成 |
| **内容** | 名称、描述、路径、层、分类、触发词 | 节点（技能/阶段/分类/触发器）+ 边（依赖/关联/包含） |
| **大小** | ~244KB | ~220KB |
| **更新时机** | 每次增删 skill 时 | 发布版本时重建 |

**规则**：增删 skill 时只改 `registry.json`。发布版本前运行 `node scripts/build-skpg.mjs` 重建 graph.json 并一并提交。

## 历史版本

| 版本 | 日期 | 类型 | 说明 |
|------|------|------|------|
| v0.7.0 | 2026-06-19 | MINOR | 状态感知路由、置信度路由器、SKILL.md v2、SKPG |
| v0.6.0 | 2026-06-18 | MINOR | 持续学习引擎 |
| v0.5.0 | 2026-06-15 | MINOR | awesome-copilot 融入（~40 skills） |
| v0.4.0 | 2026-06-14 | MINOR | 质量巩固、安装器优化、skill 创作工具 |
| v0.3.0 | 2026-06-14 | MINOR | AI 工程、DevOps、移动端、重构领域扩展 |
| v0.2.0 | 2026-06-11 | MINOR | 初始五层架构 |
