# CSP Installation Guide

> Complete installation instructions supporting 18+ AI programming platforms.

## Prerequisites

- Clone CSP repository locally: `git clone https://github.com/maythyai/code-skills-package.git`
- Or install remotely via one-liner command (no clone required)
- Or install globally via npm

---

## Method 1: Project-level Installation

First enter the CSP repository directory, then:

```bash
# Auto-detect current directory AI tool and install
./install.sh

# Or specify platform
./install.sh --platform cursor
./install.sh --platform claude-code
./install.sh --platform trae
```

---

## Method 2: Remote Installation (No CSP Clone Required)

When user hasn't cloned CSP project, install directly via one-liner command (install.sh automatically downloads full repository):

```bash
# Auto-detect platform and install to current directory
cd /path/to/your/project
curl -fsSL https://raw.githubusercontent.com/maythyai/code-skills-package/master/install.sh | bash -s --

# Specify platform
curl -fsSL https://raw.githubusercontent.com/maythyai/code-skills-package/master/install.sh | bash -s -- --platform cursor

# Specify platform + target directory
curl -fsSL https://raw.githubusercontent.com/maythyai/code-skills-package/master/install.sh | bash -s -- --platform cursor --target /path/to/your/project

# Filter by tech stack
curl -fsSL https://raw.githubusercontent.com/maythyai/code-skills-package/master/install.sh | bash -s -- --platform cursor --stacks python,typescript

# Global installation
curl -fsSL https://raw.githubusercontent.com/maythyai/code-skills-package/master/install.sh | bash -s -- --platform cursor --global
```

All `install.sh` supported parameters can be passed to remote installation script via `bash -s --`.

---

## Method 3: npm Global Installation

```bash
npm install -g code-skills-package

# Then use in any project
cd /path/to/your/project
csp-install --platform cursor
csp-install --platform claude-code --stacks python
```

npm installation provides `csp-install` command, with functionality identical to `install.sh`.

### Install without sudo (recommended)

If `npm install -g` fails with a permission error (`EACCES`), point npm's global prefix at your home directory instead of the system path — no `sudo` required:

```bash
# One-time setup
npm config set prefix ~/.npm-global
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc   # use ~/.zshrc for zsh
source ~/.bashrc

# Now global installs land in ~/.npm-global (no sudo)
npm install -g code-skills-package
csp-install --version
```

### If the package is "not found"

If your default registry is a mirror (e.g. `registry.npmmirror.com`), newly published versions may not be synced yet. Install straight from the official registry:

```bash
npm install -g code-skills-package --registry=https://registry.npmjs.org/
```

---

## Method 4: `--target` Parameter

When CSP project is cloned, use `--target` to specify arbitrary target directory:

```bash
./install.sh --platform cursor --target /path/to/your/project
./install.sh --platform claude-code --target ~/my-other-project
```

---

## Method 5: Global Installation

Install to user home directory (`~/.xxx/skills/`), available to all projects:

```bash
./install.sh --platform cursor --global
./install.sh --platform claude-code --global
```

---

## Complete Command Reference

| Command | Description |
|---------|-------------|
| `./install.sh` | Auto-detect and install (current directory) |
| `./install.sh --platform <name>` | Install for specific platform |
| `./install.sh --target <dir>` | Install to specified directory |
| `./install.sh --global` | Global installation to `~/.xxx/skills/` |
| `./install.sh --uninstall` | Uninstall CSP from current project |
| `./install.sh --list` | List detected platforms |
| `./install.sh --stacks python,typescript` | Filter installation by tech stack |
| `./install.sh --layers router,meta` | Selective installation by layer |
| `./install.sh --minimal` | Install only router + meta layers |
| `./install.sh --dry-run` | Preview installation content |
| `./install.sh --version` | Show version number |

## Supported Platforms (18)

`claude-code`, `cursor`, `copilot-cli`, `hermes-agent`, `windsurf`, `kiro`, `gemini-cli`, `codex`, `aider`, `trae`, `vscode`, `deerflow`, `opencode`, `openclaw`, `qwen-code`, `antigravity`, `claw-code`, `qoder`

## Skill Count

- Total: 174 skills
- csp-router: 1
- csp-meta: 22  
- csp-workflow: 9
- csp-patterns: 105
- csp-runtime: 37

## Available Tech Stacks

`python`, `typescript/javascript`, `rust`, `go/golang`, `java`, `kotlin`, `swift`, `cpp/c++`, `react`, `django`, `spring`, `fastapi`, `postgres`, `docker`, `kubernetes/k8s`, `ai/ml`, `mobile`, `devops`, `security`, `testing`, `frontend`