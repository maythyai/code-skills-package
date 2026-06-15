# CSP 安装指南

> 完整的安装方法说明，支持 18 个 AI 编程平台。

## 前置条件

- 克隆 CSP 仓库到本地：`git clone https://github.com/CS-cs/code-skills-package.git`
- 或通过一行命令远程安装（无需克隆）

---

## 方式一：项目级安装

先进入 CSP 仓库目录，然后：

```bash
# 自动检测当前目录的 AI 工具并安装
./install.sh

# 或指定平台
./install.sh --platform cursor
./install.sh --platform claude-code
./install.sh --platform trae
```

---

## 方式二：远程安装（无需克隆 CSP）

用户没有克隆 CSP 项目时，可直接安装到任意项目目录：

```bash
# 安装到指定目标目录
curl -fsSL https://github.com/CS-cs/code-skills-package/archive/refs/heads/master.tar.gz | tar xz -C /tmp && bash /tmp/code-skills-package-master/install.sh --platform cursor --target /path/to/your/project && rm -rf /tmp/code-skills-package-master
```

---

## 方式三：`--target` 参数

已克隆 CSP 项目时，可通过 `--target` 指定任意目标目录：

```bash
./install.sh --platform cursor --target /path/to/your/project
./install.sh --platform claude-code --target ~/my-other-project
```

---

## 方式四：全局安装

安装到用户主目录（`~/.xxx/skills/`），所有项目可用：

```bash
./install.sh --platform cursor --global
./install.sh --platform claude-code --global
```

---

## 完整命令参考

| 命令 | 说明 |
|------|------|
| `./install.sh` | 自动检测并安装（当前目录） |
| `./install.sh --platform <name>` | 指定平台安装 |
| `./install.sh --target <dir>` | 安装到指定目录 |
| `./install.sh --global` | 全局安装到 `~/.xxx/skills/` |
| `./install.sh --uninstall` | 卸载当前项目的 CSP |
| `./install.sh --list` | 列出检测到的平台 |
| `./install.sh --stacks python,typescript` | 按技术栈过滤安装 |
| `./install.sh --layers router,meta` | 按层级选择性安装 |
| `./install.sh --minimal` | 仅安装 router + meta 层 |
| `./install.sh --dry-run` | 预览安装内容 |
| `./install.sh --version` | 显示版本号 |

## 支持的平台（18 个）

`claude-code`, `cursor`, `copilot-cli`, `hermes-agent`, `windsurf`, `kiro`, `gemini-cli`, `codex`, `aider`, `trae`, `vscode`, `deerflow`, `opencode`, `openclaw`, `qwen-code`, `antigravity`, `claw-code`, `qoder`

## 技能数量

- 总计: 174 个 skills
- csp-router: 1 个
- csp-meta: 22 个  
- csp-workflow: 9 个
- csp-patterns: 105 个
- csp-runtime: 37 个

## 可用技术栈

`python`, `typescript/javascript`, `rust`, `go/golang`, `java`, `kotlin`, `swift`, `cpp/c++`, `react`, `django`, `spring`, `fastapi`, `postgres`, `docker`, `kubernetes/k8s`, `ai/ml`, `mobile`, `devops`, `security`, `testing`, `frontend`
