# CSP 更新指南

> 安装 CSP 技能包后，如何获取新功能并保持技能包最新。

---

## 快速开始

在已安装 CSP 的项目中运行以下命令即可更新：

```
/csp-update
```

更新工作流会自动完成：版本检测 → 检查最新版 → 显示变更日志 → 备份自定义文件 → 执行干净安装 → 清理缓存。

---

## 方法一：`/csp-update`（推荐）

在任何已安装 CSP 的 AI 编程工具中直接运行：

```
/csp-update
```

### 工作流程

| 步骤 | 说明 |
|------|------|
| 1. 检测已安装版本 | 读取本地 VERSION 文件，识别安装类型（全局/项目级）和运行时 |
| 2. 检查最新版本 | 通过 npm 查询最新发布版本 |
| 3. 版本比较 | 如果已是最新则提示退出；如果是开发版本则警告 |
| 4. 显示变更日志 | 列出已安装版本与最新版本之间的所有改动 |
| 5. 确认并备份 | 获取用户确认后，自动备份自定义文件到 `csp-user-files-backup/` |
| 6. 执行安装 | 使用 `npx` 下载最新版本并覆盖 CSP 管理的目录 |
| 7. 清理缓存 | 清除更新状态缓存，防止状态栏持续显示更新提示 |

### 更新会清理什么

| 路径 | 行为 |
|------|------|
| `skills/csp-*` | 全部替换为新版本 |
| `agents/csp-*` | 全部替换为新版本 |
| 自定义 skills（非 `csp-` 前缀） | 不受影响 |
| CLAUDE.md / AGENTS.md | 不受影响 |
| 自定义 hooks | 不受影响 |

### 手动更新命令

如果 `/csp-update` 不可用，可手动执行：

```bash
# 全局安装
npx -y --package=code-skills-package-cc@latest -- code-skills-package-cc --<runtime> --global

# 项目级安装
npx -y --package=code-skills-package-cc@latest -- code-skills-package-cc --<runtime> --local
```

其中 `<runtime>` 为你的 AI 工具名称，如 `claude`、`cursor`、`gemini`、`codex` 等。

---

## 方法二：重新安装

适用于以下场景：
- 从源码仓库安装（克隆了 CSP 项目）
- 需要更换安装参数（如平台、技术栈等）

```bash
# 进入 CSP 仓库目录
cd /path/to/code-skills-package

# 拉取最新代码
git pull

# 重新安装（覆盖旧版本）
./install.sh --platform cursor
./install.sh --platform cursor --global
```

远程安装同样支持重新安装：

```bash
cd /path/to/your/project
curl -fsSL https://raw.githubusercontent.com/maythyai/code-skills-package/master/install.sh | bash -s -- --platform cursor
```

---

## 更新后的操作

### 重新应用本地修改

如果你之前修改过 CSP 自带的 skill 文件，更新后可以用三方合并恢复修改：

```
/csp-update --reapply
```

合并策略：

| 变更类型 | 处理方式 |
|----------|----------|
| 仅用户修改的部分 | 保留用户修改 |
| 仅上游更新的部分 | 接受新版本 |
| 双方都修改的部分 | 标记冲突，由用户选择 |

### 跨运行时同步

如果你在多个 AI 工具中都安装了 CSP（例如同时用 Cursor 和 Claude Code），更新一个后同步到其他：

```
/csp-sync-skills --from claude --to cursor --dry-run   # 预览
/csp-sync-skills --from claude --to cursor --apply      # 执行
/csp-sync-skills --from claude --to all --apply          # 同步到所有运行时
```

### 诊断安装问题

如果更新后出现异常：

```
/csp-doctor
```

`/csp-doctor` 会检查安装完整性、文件一致性、hooks 配置等常见问题并给出修复建议。

---

## 版本管理

### 查看当前版本

```bash
cat ~/.claude/code-skills-package/VERSION     # 全局安装（Claude）
cat ./.claude/code-skills-package/VERSION     # 项目级安装（Claude）
```

其他运行时的路径类似，将 `.claude` 替换为对应目录（`.gemini`、`.codex`、`.config/opencode` 等）。

### 版本号规则

CSP 采用 `X.Y.Z` 语义化版本号，详见 [VERSIONING.md](./VERSIONING.md)。

---

## 常见问题

### Q: 更新后需要重启 AI 工具吗？

是的。更新完成后需要重启运行时（关闭并重新打开终端/IDE），新的 commands 和 skills 才会生效。

### Q: 我之前修改了 CSP 自带的 skill，更新后会丢失吗？

更新会自动检测并备份你修改过的文件到 `csp-local-patches/`，然后可以通过 `/csp-update --reapply` 三方合并恢复。

### Q: 我有自己创建的 skill（不是 csp- 前缀），更新会影响吗？

不会。更新只替换 `csp-` 前缀的目录，你创建的自定义 skill 完全不受影响。

### Q: 多个 AI 工具都装了 CSP，需要分别更新吗？

建议先用 `/csp-update` 更新主要使用的那个运行时，然后用 `/csp-sync-skills` 同步到其他运行时。

### Q: 如何回退到旧版本？

```bash
# 使用 npm 安装指定版本
npx -y --package=code-skills-package-cc@<version> -- code-skills-package-cc --<runtime> --global
```

### Q: 开发版本（本地修改源码）如何更新？

开发版本高于 npm 最新版时，`/csp-update` 会提示这是开发安装。更新方式：

```bash
cd /path/to/code-skills-package
git pull
node bin/install.js --global --claude   # 或你使用的运行时
```

不要用 `/csp-update` 更新开发版本，那会安装 npm 发布版导致降级。
