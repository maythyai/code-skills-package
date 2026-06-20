# CSP 版本管理规范

## 单一数据源

版本号 **唯一数据源** 是 `package.json` 的 `version` 字段。

```
package.json ──→ scripts/sync-version.js ──→ 所有文件
```

禁止手动修改其他文件中的版本号。所有版本更新必须通过：

```bash
node scripts/sync-version.js 0.8.0    # 更新到新版本
node scripts/sync-version.js           # 检查当前版本一致性
```

## 同步文件清单

| 文件 | 同步方式 |
|------|---------|
| `package.json` | **数据源**（脚本自动修改） |
| `CLAUDE.md` | 同步 |
| `install.sh` | 同步 |
| `README.md` | 同步 |
| `README_zh.md` | 同步 |
| `CHANGELOG.md` | **手动维护**（脚本不修改） |

## 版本号规则 (SemVer)

CSP 采用语义化版本号 `X.Y.Z`：

| 变更类型 | 升级位置 | 条件 | 示例 |
|----------|---------|------|------|
| **MAJOR (X)** | 破坏性 API 变更、架构重写 | 需要用户迁移配置 | v0.7.0 → v1.0.0 |
| **MINOR (Y)** | 新增 skill（≥5 个）、安装器行为改变、新功能 | 向后兼容 | v0.7.0 → v0.8.0 |
| **PATCH (Z)** | 修复 bug、少量 skill（<5 个）、文档更新 | 向后兼容 | v0.7.0 → v0.7.1 |

### 当前阶段 (0.x)

CSP 仍在 0.x 开发阶段，MAJOR 保持为 0。当项目成熟到可以发布 1.0 时，由维护者决定。

## 版本更新流程

每次版本更新必须执行以下步骤：

### 1. 更新版本号并同步

```bash
node scripts/sync-version.js 0.X.Y
```

### 2. 更新 CHANGELOG.md

在 CHANGELOG.md 顶部添加新版本区块：

```markdown
## v0.X.Y — YYYY-MM-DD

### 新增
- `csp-xxx` — 描述

### 修复
- 问题描述

### 统计
| 指标 | 上个版本 | 本版本 |
|------|---------|--------|
| Skills | N | N+1 |
| V2 Skills | N | N |
```

**规则**：
- Skill 数量必须以 `find -name SKILL.md` 实际计数为准
- 不要编造不存在的功能
- 删除的条目必须从 CHANGELOG 移除

### 3. 验证一致性

```bash
node scripts/sync-version.js          # 确认所有文件版本一致
grep -o 'v\?[0-9]\+\.[0-9]\+\.[0-9]\+' CLAUDE.md install.sh README.md README_zh.md package.json
```

### 4. 提交

```bash
git add -A
git commit -m "chore: bump version to v0.X.Y"
git push
```

## 运行时目录

### `.csp/` — 不提交

`.csp/` 是项目运行时目录，包含：
- `state.json` — 状态检测缓存
- `intel/` — 学习循环数据
- `skpg/` — SKPG 构建索引（已迁移到 `csp-router/skpg/`）

整个 `.csp/` 被 `.gitignore` 忽略，**不应提交到 git**。

### `csp-router/skpg/` — 必须提交

SKPG 图谱数据 `csp-router/skpg/graph.json` 是产品产物，必须被 git 追踪。

更新 SKPG 后重新构建：

```bash
node scripts/build-skpg.mjs
```

## 历史版本

| 版本 | 日期 | 说明 |
|------|------|------|
| v0.7.0 | 2026-06-19 | 状态感知路由、置信度路由器、SKILL.md v2、SKPG |
| v0.6.0 | 2026-06-18 | 持续学习引擎 |
| v0.5.0 | 2026-06-15 | awesome-copilot 融入 |
| v0.4.0 | 2026-06-14 | 质量巩固、安装器优化、skill 创作工具 |
| v0.3.0 | 2026-06-14 | AI 工程、DevOps、移动端、重构领域扩展 |
| v0.2.0 | 2026-06-11 | 初始五层架构 |
