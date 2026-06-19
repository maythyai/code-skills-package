#!/usr/bin/env bash
set -eo pipefail

# CSP (Code Skills Package) — Multi-platform installer
# Supports 18 AI coding tools with auto-detection, bootstrap generation, and uninstall.
# Compatible with bash 3.2+ (macOS default).
#
# Usage:
#   ./install.sh                            Auto-detect and install (project-level)
#   ./install.sh --platform <name>          Install for specific platform
#   ./install.sh --target <dir>             Install into specified directory
#   ./install.sh --global                   Install globally (~/.xxx/skills/)
#   ./install.sh --uninstall                Remove CSP from current project
#   ./install.sh --list                     List detected platforms
#   ./install.sh --help                     Show help

readonly VERSION="0.7.0"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_DIR="$(pwd)"

# CSP 五层架构源目录
readonly CSP_LAYERS="csp-router csp-meta csp-workflow csp-patterns csp-runtime"

# ─── Remote Bootstrap ──────────────────────────────────────────────
# Auto-detect: if layer dirs are missing, download full repo and re-exec.
# Supports standalone file, pipe (curl|bash), and npm-installed scenarios.
_has_layers=true
for _l in $CSP_LAYERS; do
  if [ ! -d "$SCRIPT_DIR/$_l" ]; then _has_layers=false; break; fi
done
if [ "$_has_layers" = "false" ]; then
  _csp_tmp="$(mktemp -d)"
  trap 'rm -rf "$_csp_tmp"' EXIT
  _csp_branch="${CSP_BRANCH:-master}"
  echo "  CSP: downloading full repo..." >&2
  curl -fsSL "https://github.com/chensaics/code-skills-package/archive/refs/heads/${_csp_branch}.tar.gz" \
    | tar xz -C "$_csp_tmp"
  exec bash "$_csp_tmp/code-skills-package-${_csp_branch}/install.sh" "$@"
fi

# Sentinel markers
readonly SENTINEL_BEGIN="<!-- csp-begin (do not edit between these markers) -->"
readonly SENTINEL_END="<!-- csp-end -->"

# Platform list (slug identifiers)
readonly ALL_PLATFORMS="claude-code cursor copilot-cli hermes-agent windsurf kiro gemini-cli codex aider trae vscode deerflow opencode openclaw qwen-code antigravity claw-code qoder"

# ─── Platform Metadata (case-based lookups, bash 3.2 compatible) ──

platform_name() {
  case "$1" in
    claude-code)    echo "Claude Code" ;;
    cursor)         echo "Cursor" ;;
    copilot-cli)    echo "Copilot CLI" ;;
    hermes-agent)   echo "Hermes Agent" ;;
    windsurf)       echo "Windsurf" ;;
    kiro)           echo "Kiro" ;;
    gemini-cli)     echo "Gemini CLI" ;;
    codex)          echo "Codex" ;;
    aider)          echo "Aider" ;;
    trae)           echo "Trae" ;;
    vscode)         echo "VS Code (Copilot)" ;;
    deerflow)       echo "DeerFlow" ;;
    opencode)       echo "OpenCode" ;;
    openclaw)       echo "OpenClaw" ;;
    qwen-code)      echo "Qwen Code" ;;
    antigravity)    echo "Antigravity" ;;
    claw-code)      echo "Claw Code" ;;
    qoder)          echo "Qoder" ;;
  esac
}

platform_dir() {
  case "$1" in
    claude-code)    echo ".claude/skills" ;;
    cursor)         echo ".cursor/skills" ;;
    copilot-cli)    echo ".claude/skills" ;;
    hermes-agent)   echo ".hermes/skills" ;;
    windsurf)       echo ".windsurf/skills" ;;
    kiro)           echo ".kiro/steering" ;;
    gemini-cli)     echo ".gemini/skills" ;;
    codex)          echo ".codex/skills" ;;
    aider)          echo ".aider/skills" ;;
    trae)           echo ".trae/skills" ;;
    vscode)         echo ".github/skills" ;;
    deerflow)       echo "skills/custom" ;;
    opencode)       echo ".opencode/skills" ;;
    openclaw)       echo "skills" ;;
    qwen-code)      echo ".qwen/skills" ;;
    antigravity)    echo ".antigravity/skills" ;;
    claw-code)      echo ".claw/skills" ;;
    qoder)          echo ".qoder/skills" ;;
  esac
}

# Detection paths (space-separated, check if any exists)
platform_detect() {
  case "$1" in
    claude-code)    echo ".claude" ;;
    cursor)         echo ".cursor .cursorrules" ;;
    copilot-cli)    echo ".claude" ;;
    hermes-agent)   echo ".hermes HERMES.md .hermes.md" ;;
    windsurf)       echo ".windsurf .windsurfrules" ;;
    kiro)           echo ".kiro" ;;
    gemini-cli)     echo "GEMINI.md .gemini" ;;
    codex)          echo ".codex" ;;
    aider)          echo ".aider .aider.conf.yml CONVENTIONS.md" ;;
    trae)           echo ".trae" ;;
    vscode)         echo ".github/copilot-instructions.md .github/.instructions" ;;
    deerflow)       echo "deer_flow" ;;
    opencode)       echo ".opencode" ;;
    openclaw)       echo ".openclaw" ;;
    qwen-code)      echo ".qwen" ;;
    antigravity)    echo ".antigravity" ;;
    claw-code)      echo ".claw CLAW.md" ;;
    qoder)          echo ".qoder" ;;
  esac
}

# Resolve user-facing alias to slug
resolve_alias() {
  case "$(echo "$1" | tr '[:upper:]' '[:lower:]')" in
    claude|claude-code|claudecode)          echo "claude-code" ;;
    copilot|copilot-cli)                    echo "copilot-cli" ;;
    cursor)                                 echo "cursor" ;;
    hermes|hermes-agent)                    echo "hermes-agent" ;;
    windsurf)                               echo "windsurf" ;;
    kiro)                                   echo "kiro" ;;
    gemini|gemini-cli)                      echo "gemini-cli" ;;
    codex)                                  echo "codex" ;;
    aider)                                  echo "aider" ;;
    trae)                                   echo "trae" ;;
    vscode|vs-code)                         echo "vscode" ;;
    deerflow)                               echo "deerflow" ;;
    opencode)                               echo "opencode" ;;
    openclaw)                               echo "openclaw" ;;
    qwen|qwen-code)                         echo "qwen-code" ;;
    antigravity)                            echo "antigravity" ;;
    claw|claw-code|clawcode)                echo "claw-code" ;;
    qoder)                                  echo "qoder" ;;
    *) echo "" ;;
  esac
}

# ─── Stack-to-Skill Mapping ──────────────────────────────────────────
# Maps user-friendly stack names to actual skill directories.
# Uses case-based lookup for bash 3.2 compatibility (no associative arrays).

resolve_stack_skills() {
  local input="$1"
  local result=""
  local known_stacks=""
  IFS=',' read -ra stacks <<< "$input"
  for stack in "${stacks[@]}"; do
    stack=$(echo "$stack" | tr -d ' ')
    local lower
    lower=$(echo "$stack" | tr '[:upper:]' '[:lower:]')
    local skills=""
    case "$lower" in
      python|py)
        skills="python-patterns python-testing django-patterns django-security fastapi-patterns pytorch-patterns mle-workflow"
        ;;
      typescript|ts|tsx|javascript|js)
        skills="react-patterns react-testing nextjs-turbopack frontend-patterns bun-runtime dmux-workflows nestjs-patterns"
        ;;
      rust)
        skills="rust-patterns rust-testing"
        ;;
      go|golang)
        skills="golang-patterns golang-testing"
        ;;
      java)
        skills="java-coding-standards springboot-patterns springboot-security jpa-patterns"
        ;;
      kotlin)
        skills="kotlin-patterns kotlin-testing"
        ;;
      swift)
        skills="swift-actor-persistence swift-protocol-di-testing"
        ;;
      cpp|c++)
        skills="cpp-coding-standards cpp-testing"
        ;;
      react)
        skills="react-patterns react-testing frontend-patterns"
        ;;
      django)
        skills="django-patterns django-security"
        ;;
      spring)
        skills="springboot-patterns springboot-security jpa-patterns"
        ;;
      fastapi)
        skills="fastapi-patterns"
        ;;
      postgres)
        skills="postgres-patterns database-migrations"
        ;;
      docker)
        skills="docker-patterns"
        ;;
      kubernetes|k8s|ks)
        skills="csp-kubernetes-patterns"
        ;;
      ai|ml)
        skills="csp-rag-architecture csp-llm-app-development csp-prompt-engineering csp-vllm-serving agent-introspection-debugging agentic-engineering eval-harness mcp-server-patterns"
        ;;
      mobile)
        skills="csp-react-native-patterns csp-mobile-performance csp-cross-platform-strategy"
        ;;
      devops)
        skills="csp-cicd-pipelines csp-cloud-platform-patterns csp-infrastructure-as-code csp-kubernetes-patterns csp-deployment docker-patterns"
        ;;
      security)
        skills="security-review security"
        ;;
      testing)
        skills="testing e2e-testing react-testing python-testing rust-testing cpp-testing golang-testing kotlin-testing"
        ;;
      frontend)
        skills="frontend-patterns frontend-slides react-patterns react-testing nextjs-turbopack bun-runtime"
        ;;
      *)
        echo "  ⚠️  未知技术栈: $stack" >&2
        echo "  可用: python typescript rust go java kotlin swift cpp react django spring fastapi postgres docker kubernetes ai mobile devops security testing frontend" >&2
        ;;
    esac
    if [ -n "$skills" ]; then
      result="$result $skills"
    fi
  done
  # Deduplicate
  echo "$result" | tr ' ' '\n' | sed '/^$/d' | sort -u | tr '\n' ' '
}

# ─── Utility Functions ─────────────────────────────────────────────

count_skill_dirs() {
  local dir="$1"
  [ -d "$dir" ] || { echo 0; return; }
  find "$dir" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' '
}

count_all_csp_skills() {
  local total=0
  for layer in $CSP_LAYERS; do
    local src="$SCRIPT_DIR/$layer"
    [ -d "$src" ] || continue
    local n
    n=$(find "$src" -name "SKILL.md" -type f 2>/dev/null | wc -l | tr -d ' ')
    total=$((total + n))
  done
  echo "$total"
}

copy_dir() {
  local src="$1" dest="$2"
  [ -d "$src" ] || return 0
  mkdir -p "$dest"
  # Use cp -R and clean up .DS_Store
  cp -R "$src/"* "$dest/" 2>/dev/null || true
  find "$dest" -name '.DS_Store' -delete 2>/dev/null || true
}

is_home_dir() {
  local dir="$1"
  local home="${HOME:-}"
  [ -z "$home" ] && return 1
  local real_dir real_home
  real_dir=$(cd "$dir" 2>/dev/null && pwd -P) || real_dir="$dir"
  real_home=$(cd "$home" 2>/dev/null && pwd -P) || real_home="$home"
  [ "$real_dir" = "$real_home" ]
}

# Scan SKILL.md entries recursively: output "name|description" per line
scan_skill_entries() {
  for layer in $CSP_LAYERS; do
    local src="$SCRIPT_DIR/$layer"
    [ -d "$src" ] || continue
    find "$src" -name "SKILL.md" -type f 2>/dev/null | while read -r skill_file; do
      local name desc
      name=$(grep -m1 '^name:' "$skill_file" 2>/dev/null | sed 's/^name: *//' | sed "s/^[\"']//;s/[\"']$//" || true)
      desc=$(grep -m1 '^description:' "$skill_file" 2>/dev/null | sed 's/^description: *//' | sed "s/^[\"']//;s/[\"']$//" | cut -c1-80 || true)
      [ -n "$name" ] && echo "${name}|${desc}"
    done
  done
}

# ─── Sentinel Management ──────────────────────────────────────────

wrap_with_sentinel() {
  printf '%s\n%s\n%s\n' "$SENTINEL_BEGIN" "$1" "$SENTINEL_END"
}

clean_bootstrap_section() {
  local file="$1"
  [ -f "$file" ] || return 1

  local content
  content=$(<"$file")

  # Strategy 1: sentinel markers (v0.3.0+)
  if echo "$content" | grep -qF "$SENTINEL_BEGIN" && echo "$content" | grep -qF "$SENTINEL_END"; then
    local before after combined
    before=$(echo "$content" | sed "/$(echo "$SENTINEL_BEGIN" | sed 's/[[\.*^$()+?{|]/\\&/g')/,\$d")
    after=$(echo "$content" | sed "1,/$(echo "$SENTINEL_END" | sed 's/[[\.*^$()+?{|]/\\&/g')/d")
    combined=$(printf '%s\n\n%s' "$before" "$after")
    # Trim empty lines
    combined=$(echo "$combined" | sed '/./,$!d' | sed -e :a -e '/^\n*$/{$d;N;ba' -e '}')
    if [ -z "$(echo "$combined" | tr -d '[:space:]')" ]; then
      rm -f "$file"
    else
      printf '%s\n' "$combined" > "$file"
    fi
    return 0
  fi

  # Strategy 2: heading marker
  if echo "$content" | grep -qF "# CSP (Code Skills Package)"; then
    local before
    before=$(echo "$content" | sed '/# CSP (Code Skills Package)/,$d' | sed -e :a -e '/^\n*$/{$d;N;ba' -e '}')
    if [ -z "$(echo "$before" | tr -d '[:space:]')" ]; then
      rm -f "$file"
    else
      printf '%s\n' "$before" > "$file"
    fi
    return 0
  fi

  return 1
}

append_bootstrap_to_file() {
  local file="$1"
  local content="$2"

  if [ -f "$file" ]; then
    if grep -qF "csp-begin" "$file" 2>/dev/null; then
      clean_bootstrap_section "$file" 2>/dev/null || true
    fi
    if [ -f "$file" ]; then
      if grep -qF "CSP (Code Skills Package)" "$file" 2>/dev/null; then
        echo "  ✅ $(basename "$file"): 已包含 CSP 引用，跳过"
        return
      fi
      printf '%s\n\n%s\n' "$(<"$file")" "$(wrap_with_sentinel "$content")" > "$file"
      echo "  ✅ $(basename "$file"): 追加 CSP 引用"
    else
      wrap_with_sentinel "$content" > "$file"
      echo "  ✅ $(basename "$file"): 创建 bootstrap"
    fi
  else
    wrap_with_sentinel "$content" > "$file"
    echo "  ✅ $(basename "$file"): 创建 bootstrap"
  fi
}

# ─── Bootstrap Content Generators ─────────────────────────────────

generate_skill_list() {
  scan_skill_entries | while IFS='|' read -r name desc; do
    echo "- **${name}**: ${desc}"
  done
}

generate_skill_table() {
  scan_skill_entries | while IFS='|' read -r name desc; do
    echo "| ${name} | ${desc} |"
  done
}

bootstrap_claude() {
  local n; n=$(scan_skill_entries | wc -l | tr -d ' ')
  local list; list=$(generate_skill_list)
  cat <<EOF
# CSP (Code Skills Package)

本项目已安装 CSP 技能包（${n} 个 skills，五层架构）。

## 使用方式

在 CLAUDE.md 中添加路由指令即可自动使用：

\`\`\`
使用 CSP (Code Skills Package) 技能包。当用户给出任务时,先通过 csp-router 路由到合适的 skill 组合。
\`\`\`

## 核心规则

1. **收到任务时，先通过 csp-router 路由** — 识别任务类型并加载对应 skill 组合
2. **设计先于编码** — 功能需求先做 brainstorming 和 plan
3. **测试先于实现** — 写代码前先写测试（TDD）
4. **验证先于完成** — 声称完成前必须运行验证命令

## 可用 Skills

Skills 位于 \`.claude/skills/\` 目录，按五层架构组织。

${list}

## 如何使用

使用 \`Skill\` 工具加载对应 skill 并严格遵循其流程。如果你认为哪怕只有 1% 的可能性某个 skill 适用，你必须调用该 skill 检查。
EOF
}

bootstrap_gemini() {
  local n; n=$(scan_skill_entries | wc -l | tr -d ' ')
  local list; list=$(generate_skill_list)
  cat <<EOF
# CSP (Code Skills Package)

本项目已安装 CSP 技能包（${n} 个 skills）。

## 核心规则

1. **收到任务时，先检查是否有匹配的 skill**
2. **设计先于编码**
3. **测试先于实现**
4. **验证先于完成**

## 可用 Skills

${list}

## 如何使用

当任务匹配某个 skill 时，读取 \`.gemini/skills/<layer>/<skill>/SKILL.md\` 并遵循其流程。
EOF
}

bootstrap_hermes() {
  local n; n=$(scan_skill_entries | wc -l | tr -d ' ')
  local list; list=$(generate_skill_list)
  cat <<EOF
# CSP (Code Skills Package)

本项目已安装 CSP 技能包（${n} 个 skills）。

## 工具映射

- \`Read\` → \`read_file\` | \`Write\` → \`write_file\` | \`Edit\` → \`patch\`
- \`Bash\` → \`terminal\` | \`Grep\`/\`Glob\` → \`search_files\`
- \`Skill\` → \`skill_view\` | \`Task\` → \`delegate_task\`
- \`WebSearch\` → \`web_search\` | \`WebFetch\` → \`web_extract\`
- \`TodoWrite\` → \`todo\`

## 核心规则

1. **收到任务时，先检查是否有匹配的 skill**
2. **设计先于编码**
3. **测试先于实现**
4. **验证先于完成**

## 可用 Skills

${list}

## 如何使用

使用 \`skill_view\` 加载对应 skill 并遵循其流程。
EOF
}

bootstrap_aider() {
  local n; n=$(scan_skill_entries | wc -l | tr -d ' ')
  local list; list=$(generate_skill_list)
  cat <<EOF
# CSP (Code Skills Package) 工作方法论

本项目使用 CSP 技能包（${n} 个 skills）。

## 核心规则

1. **收到任务时，先检查是否有匹配的 skill**
2. **设计先于编码**
3. **测试先于实现**
4. **验证先于完成**

## 可用 Skills

${list}

## 如何使用

当任务匹配某个 skill 时，读取 \`.aider/skills/<layer>/<skill>/SKILL.md\` 并遵循其流程。
EOF
}

bootstrap_trae() {
  local n; n=$(scan_skill_entries | wc -l | tr -d ' ')
  local table; table=$(generate_skill_table)
  cat <<EOF
---
alwaysApply: true
---

# CSP (Code Skills Package)

你已加载 CSP 技能框架（${n} 个 skills）。

## 核心规则

1. **收到任务时，先检查是否有匹配的 skill**
2. **设计先于编码** — 功能需求先用 brainstorming 做需求分析
3. **测试先于实现** — 写代码前先写测试
4. **验证先于完成** — 声称完成前必须运行验证命令

## 可用 Skills

| Skill | 触发条件 |
|-------|---------|
${table}

## 如何使用

当任务匹配某个 skill 时，读取 \`.trae/skills/<layer>/<skill>/SKILL.md\` 并遵循其流程。
EOF
}

bootstrap_qoder() {
  local n; n=$(scan_skill_entries | wc -l | tr -d ' ')
  local table; table=$(generate_skill_table)
  cat <<EOF
---
trigger: always_on
alwaysApply: true
---

# CSP (Code Skills Package)

你已加载 CSP 技能框架（${n} 个 skills）。

## 核心规则

1. **收到任务时，先检查是否有匹配的 skill**
2. **设计先于编码**
3. **测试先于实现**
4. **验证先于完成**

## 可用 Skills

| Skill | 触发条件 |
|-------|---------|
${table}

## 如何使用

读取 \`.qoder/skills/<layer>/<skill>/SKILL.md\` 并遵循其流程。也可输入 \`/<skill>\` 显式调用。
EOF
}

bootstrap_antigravity() {
  local n; n=$(scan_skill_entries | wc -l | tr -d ' ')
  local list; list=$(generate_skill_list)
  cat <<EOF
# CSP (Code Skills Package)

本项目已安装 CSP 技能包（${n} 个 skills）。

## 核心规则

1. **收到任务时，先检查是否有匹配的 skill**
2. **设计先于编码**
3. **测试先于实现**
4. **验证先于完成**

## 可用 Skills

${list}

## 如何使用

读取 \`.antigravity/skills/<layer>/<skill>/SKILL.md\` 并遵循其流程。
EOF
}

bootstrap_windsurf() {
  local n; n=$(scan_skill_entries | wc -l | tr -d ' ')
  local list; list=$(generate_skill_list)
  cat <<EOF
# CSP (Code Skills Package)

本项目已安装 CSP 技能包（${n} 个 skills）。

## 核心规则

1. **收到任务时，先检查是否有匹配的 skill**
2. **设计先于编码**
3. **测试先于实现**
4. **验证先于完成**

## 可用 Skills

${list}

## 如何使用

读取 \`.windsurf/skills/<layer>/<skill>/SKILL.md\` 并遵循其流程。
EOF
}

bootstrap_kiro() {
  local n; n=$(scan_skill_entries | wc -l | tr -d ' ')
  local list; list=$(generate_skill_list)
  cat <<EOF
---
alwaysApply: true
---

# CSP (Code Skills Package)

本项目已安装 CSP 技能包（${n} 个 skills）。

## 核心规则

1. **收到任务时，先检查是否有匹配的 skill**
2. **设计先于编码**
3. **测试先于实现**
4. **验证先于完成**

## 可用 Skills

${list}

## 如何使用

读取 \`.kiro/steering/<layer>/<skill>/SKILL.md\` 并遵循其流程。
EOF
}

bootstrap_vscode() {
  local n; n=$(scan_skill_entries | wc -l | tr -d ' ')
  local list; list=$(generate_skill_list)
  cat <<EOF
# CSP (Code Skills Package)

本项目已安装 CSP 技能包（${n} 个 skills）。

注意：GitHub Copilot 不支持 Skill 工具或子 Agent 派遣，以下内容作为方法论指导。

## 核心规则

1. **设计先于编码** — 功能需求先做需求分析和规划
2. **测试先于实现** — 写代码前先写测试
3. **验证先于完成** — 声称完成前必须验证

## 可用 Skills 参考

${list}
EOF
}

# ─── Platform Installation ────────────────────────────────────────

install_skills_to() {
  local target_dir="$1"
  local stack_skills="$2"   # space-separated list of allowed skill dirs (empty = all)
  local dry_run="$3"        # "true" or ""
  local total=0
  mkdir -p "$target_dir"
  for layer in $CSP_LAYERS; do
    local src="$SCRIPT_DIR/$layer"
    [ -d "$src" ] || continue

    if [ -z "$stack_skills" ]; then
      # No stack filter: copy entire layer
      [ "$dry_run" = "true" ] || copy_dir "$src" "$target_dir/$layer"
      local n
      n=$(find "$src" -name "SKILL.md" -type f 2>/dev/null | wc -l | tr -d ' ')
      total=$((total + n))
    else
      # Stack filter: only copy matching skill dirs
      local layer_total=0
      for skill_dir in "$src"/*/; do
        [ -d "$skill_dir" ] || continue
        local dir_name
        dir_name=$(basename "$skill_dir")
        # Check if this skill is in the allowed list
        if echo " $stack_skills " | grep -q " $dir_name "; then
          [ "$dry_run" = "true" ] || cp -R "$skill_dir" "$target_dir/$layer/"
          local n
          n=$(find "$skill_dir" -name "SKILL.md" -type f 2>/dev/null | wc -l | tr -d ' ')
          layer_total=$((layer_total + n))
          total=$((total + n))
        fi
      done
      # Also copy non-skill subdirectories (commands, agents, etc.)
      [ "$dry_run" = "true" ] || {
        for subdir in "$src"/*/; do
          [ -d "$subdir" ] || continue
          local dir_name
          dir_name=$(basename "$subdir")
          if ! echo " $stack_skills " | grep -q " $dir_name "; then
            # Check if it has a SKILL.md — if not, it's a sub-file (commands/agents/etc), copy it
            if [ ! -f "$subdir/SKILL.md" ]; then
              cp -R "$subdir" "$target_dir/$layer/" 2>/dev/null || true
            fi
          fi
        done
      }
    fi
  done
  # Clean up .DS_Store
  find "$target_dir" -name '.DS_Store' -delete 2>/dev/null || true

  # Count only CSP layer SKILL.md files for accurate reporting
  local count=0
  for layer in $CSP_LAYERS; do
    if [ -d "$target_dir/$layer" ]; then
      local layer_count
      layer_count=$(find "$target_dir/$layer" -name "SKILL.md" -type f 2>/dev/null | wc -l | tr -d ' ')
      count=$((count + layer_count))
    fi
  done
  echo "$count"
}

generate_bootstrap_for() {
  local slug="$1"
  case "$slug" in
    claude-code|copilot-cli) bootstrap_claude ;;
    gemini-cli)              bootstrap_gemini ;;
    hermes-agent)            bootstrap_hermes ;;
    aider)                   bootstrap_aider ;;
    trae)                    bootstrap_trae ;;
    qoder)                   bootstrap_qoder ;;
    antigravity)             bootstrap_antigravity ;;
    windsurf)                bootstrap_windsurf ;;
    kiro)                    bootstrap_kiro ;;
    vscode)                  bootstrap_vscode ;;
    *)                       echo "" ;;
  esac
}

install_for_platform() {
  local slug="$1"
  local base_dir="$2"
  local name; name=$(platform_name "$slug")
  local dir; dir=$(platform_dir "$slug")
  local target_dir="$base_dir/$dir"

  local skill_count
  skill_count=$(install_skills_to "$target_dir")
  echo "  ✅ $name: ${skill_count} skills → $target_dir"

  # Generate platform-specific bootstrap
  local bootstrap_content
  bootstrap_content=$(generate_bootstrap_for "$slug")
  [ -z "$bootstrap_content" ] && return

  case "$slug" in
    claude-code|copilot-cli)
      append_bootstrap_to_file "$base_dir/CLAUDE.md" "$bootstrap_content"
      ;;
    gemini-cli)
      append_bootstrap_to_file "$base_dir/GEMINI.md" "$bootstrap_content"
      ;;
    hermes-agent)
      append_bootstrap_to_file "$base_dir/HERMES.md" "$bootstrap_content"
      ;;
    aider)
      append_bootstrap_to_file "$base_dir/CONVENTIONS.md" "$bootstrap_content"
      ;;
    windsurf)
      append_bootstrap_to_file "$base_dir/.windsurfrules" "$bootstrap_content"
      ;;
    trae)
      mkdir -p "$base_dir/.trae/rules"
      echo "$bootstrap_content" > "$base_dir/.trae/rules/csp.md"
      echo "  ✅ Trae: bootstrap rule → .trae/rules/csp.md"
      ;;
    qoder)
      mkdir -p "$base_dir/.qoder/rules"
      echo "$bootstrap_content" > "$base_dir/.qoder/rules/csp.md"
      echo "  ✅ Qoder: bootstrap rule → .qoder/rules/csp.md"
      ;;
    antigravity)
      mkdir -p "$base_dir/.antigravity"
      echo "$bootstrap_content" > "$base_dir/.antigravity/rules.md"
      echo "  ✅ Antigravity: bootstrap rule → .antigravity/rules.md"
      ;;
    kiro)
      mkdir -p "$base_dir/.kiro/steering"
      echo "$bootstrap_content" > "$base_dir/.kiro/steering/csp.md"
      echo "  ✅ Kiro: bootstrap steering → .kiro/steering/csp.md"
      ;;
    vscode)
      mkdir -p "$base_dir/.github"
      append_bootstrap_to_file "$base_dir/.github/copilot-instructions.md" "$bootstrap_content"
      ;;
  esac
}

# ─── Auto-detection ───────────────────────────────────────────────

detect_platforms() {
  local base_dir="$1"
  for slug in $ALL_PLATFORMS; do
    local detect_paths
    detect_paths=$(platform_detect "$slug")
    for path in $detect_paths; do
      if [ -e "$base_dir/$path" ]; then
        echo "$slug"
        break
      fi
    done
  done
}

# ─── Uninstall ────────────────────────────────────────────────────

uninstall_for_platform() {
  local slug="$1"
  local base_dir="$2"
  local dir; dir=$(platform_dir "$slug")
  local target_dir="$base_dir/$dir"
  local removed=0

  if [ -d "$target_dir" ]; then
    for layer in $CSP_LAYERS; do
      if [ -d "$target_dir/$layer" ]; then
        local n
        n=$(find "$target_dir/$layer" -name "SKILL.md" -type f 2>/dev/null | wc -l | tr -d ' ')
        rm -rf "$target_dir/$layer"
        removed=$((removed + n))
      fi
    done
    # Remove empty dir
    if [ -d "$target_dir" ] && [ -z "$(ls -A "$target_dir" 2>/dev/null | grep -v '.DS_Store')" ]; then
      rm -rf "$target_dir"
    fi
  fi
  echo "$removed"
}

do_uninstall() {
  local base_dir="$1"
  echo ""
  echo "  CSP v${VERSION} — 卸载"
  echo ""
  echo "  目标目录: $base_dir"
  echo ""

  local total_skills=0
  local total_bootstraps=0

  for slug in $ALL_PLATFORMS; do
    local removed
    removed=$(uninstall_for_platform "$slug" "$base_dir")
    if [ "$removed" -gt 0 ]; then
      local name; name=$(platform_name "$slug")
      echo "  ✅ $name: 移除 ${removed} skills"
      total_skills=$((total_skills + removed))
    fi
  done

  # Clean bootstrap files (sentinel-based)
  for file in CLAUDE.md GEMINI.md HERMES.md CONVENTIONS.md .windsurfrules; do
    if clean_bootstrap_section "$base_dir/$file" 2>/dev/null; then
      echo "  ✅ 清理 bootstrap: $file"
      total_bootstraps=$((total_bootstraps + 1))
    fi
  done

  # Delete standalone bootstrap files
  for file in .trae/rules/csp.md .qoder/rules/csp.md .antigravity/rules.md .kiro/steering/csp.md; do
    if [ -f "$base_dir/$file" ]; then
      rm -f "$base_dir/$file"
      echo "  ✅ 删除 bootstrap: $file"
      total_bootstraps=$((total_bootstraps + 1))
    fi
  done

  if [ "$total_skills" -eq 0 ] && [ "$total_bootstraps" -eq 0 ]; then
    echo "  ⚠️  未找到 CSP 安装痕迹。"
  else
    echo ""
    echo "  卸载完成。共移除 ${total_skills} 个 skill 目录、${total_bootstraps} 个 bootstrap 文件。"
  fi
  echo ""
}

# ─── Help ──────────────────────────────────────────────────────────

show_help() {
  cat <<'HELP'

  CSP v0.6.0 — Code Skills Package 多平台安装器

  用法：
    ./install.sh                        自动检测并安装（项目级）
    ./install.sh --platform <name>      指定平台安装
    ./install.sh --target <dir>         安装到指定目录（无需克隆本项目）
    ./install.sh --global               安装到全局（~/.xxx/skills/）
    ./install.sh --uninstall            卸载当前目录的 CSP
    ./install.sh --list                 列出检测到的平台
    ./install.sh --help                 显示帮助
    ./install.sh --version              显示版本

  选择安装：
    ./install.sh --stacks <list>        按技术栈过滤安装（如 python,typescript）
    ./install.sh --layers <list>        按层级选择性安装（如 router,meta）
    ./install.sh --minimal              仅安装 router + meta 层（最小可用集）
    ./install.sh --dry-run              预览安装内容而不实际执行

  一行远程安装（无需克隆本项目）：
    curl -fsSL https://raw.githubusercontent.com/chensaics/code-skills-package/master/install.sh | bash -s -- --platform cursor

  npm 全局安装：
    npm install -g code-skills-package
    cd /your/project && csp-install --platform cursor

  支持的平台（18 个）：
    claude-code, cursor, copilot-cli, hermes-agent, windsurf, kiro,
    gemini-cli, codex, aider, trae, vscode, deerflow, opencode,
    openclaw, qwen-code, antigravity, claw-code, qoder

  可用技术栈：
    python, typescript/javascript, rust, go/golang, java, kotlin,
    swift, cpp/c++, react, django, spring, fastapi, postgres,
    docker, kubernetes/k8s, ai/ml, mobile, devops, security,
    testing, frontend

  示例：
    ./install.sh                        # 自动检测当前项目的 AI 工具
    ./install.sh --stacks python        # 仅安装 Python 相关 skills
    ./install.sh --layers router,meta   # 仅安装路由和元技能层
    ./install.sh --minimal              # 最小安装（router + meta）
    ./install.sh --dry-run --stacks ai  # 预览 AI 相关 skills
    ./install.sh --platform trae        # 为 Trae 安装
    ./install.sh --platform cursor --global  # 全局安装到 Cursor
    ./install.sh --uninstall            # 卸载

  CSP 五层架构：
    Layer 0: csp-router     路由器（任务分类 + skill 选择）
    Layer 1: csp-meta       元技能（brainstorming, TDD, debugging...）
    Layer 2: csp-workflow   工作流（plan → execute → verify → ship）
    Layer 4: csp-patterns   技术库（语言/框架 patterns, reviewers）
    Layer 5: csp-runtime    运行时（autopilot, ralph, wiki, remember）

HELP
}

# ─── Main ─────────────────────────────────────────────────────────

main() {
  local mode="auto"
  local platform=""
  local use_global=false
  local force=false
  local stacks=""
  local layers=""
  local minimal=false
  local dry_run=false
  local target_dir=""

  while [ $# -gt 0 ]; do
    case "$1" in
      --platform|--tool|-t)
        mode="platform"
        platform="${2:-}"
        [ -z "$platform" ] && { echo "❌ $1 需要参数"; exit 1; }
        shift 2
        ;;
      --target|--dir|-d)
        target_dir="${2:-}"
        [ -z "$target_dir" ] && { echo "❌ $1 需要参数"; exit 1; }
        shift 2
        ;;
      --global|-g)
        use_global=true
        shift
        ;;
      --uninstall|-u)
        mode="uninstall"
        shift
        ;;
      --list|-l)
        mode="list"
        shift
        ;;
      --force|-f)
        force=true
        shift
        ;;
      --stacks|-s)
        stacks="${2:-}"
        [ -z "$stacks" ] && { echo "❌ $1 需要参数（如 --stacks python,typescript）"; exit 1; }
        shift 2
        ;;
      --layers)
        layers="${2:-}"
        [ -z "$layers" ] && { echo "❌ $1 需要参数（如 --layers router,meta）"; exit 1; }
        shift 2
        ;;
      --minimal|-m)
        minimal=true
        shift
        ;;
      --dry-run|-n)
        dry_run=true
        shift
        ;;
      --help|-h)
        show_help; exit 0
        ;;
      --version|-v)
        echo "$VERSION"; exit 0
        ;;
      *)
        echo "❌ 未知参数: $1"
        show_help; exit 1
        ;;
    esac
  done

  # Resolve target directory
  local base_dir
  if [ -n "$target_dir" ]; then
    # Resolve relative path to absolute
    mkdir -p "$target_dir" 2>/dev/null || true
    base_dir="$(cd "$target_dir" 2>/dev/null && pwd)" || { echo "❌ 无法访问目录: $target_dir"; exit 1; }
  else
    base_dir="$PROJECT_DIR"
  fi
  $use_global && base_dir="$HOME"

  # Uninstall
  if [ "$mode" = "uninstall" ]; then
    do_uninstall "$base_dir"
    exit 0
  fi

  # List
  if [ "$mode" = "list" ]; then
    echo ""
    echo "  CSP v${VERSION} — 平台检测"
    echo ""
    echo "  扫描目录: $base_dir"
    echo ""
    local detected
    detected=$(detect_platforms "$base_dir")
    if [ -z "$detected" ]; then
      echo "  ⚠️  未检测到任何已知 AI 编程工具。"
    else
      echo "  检测到的平台："
      echo "$detected" | while read -r slug; do
        local name; name=$(platform_name "$slug")
        local dir; dir=$(platform_dir "$slug")
        echo "    ✅ $name → $dir"
      done
    fi
    echo ""
    exit 0
  fi

  # Safety: refuse home dir without --force or --global
  if [ "$base_dir" = "$HOME" ] && ! $use_global && ! $force; then
    echo ""
    echo "  ⚠️  当前目录是用户主目录: $base_dir"
    echo ""
    echo "  CSP 应安装到具体项目目录。在主目录安装会污染所有项目。"
    echo ""
    echo "  请先 cd 到项目目录，或使用 --global 明确全局安装："
    echo "    cd /path/to/your/project && ./install.sh"
    echo "    ./install.sh --global"
    echo ""
    exit 1
  fi

  # Resolve layer filter
  local layer_filter=""
  if [ "$minimal" = "true" ]; then
    layer_filter="csp-router csp-meta"
  elif [ -n "$layers" ]; then
    layer_filter=""
    IFS=',' read -ra layer_arr <<< "$layers"
    for l in "${layer_arr[@]}"; do
      l=$(echo "$l" | tr -d ' ')
      case "$l" in
        router|0)     layer_filter="$layer_filter csp-router" ;;
        meta|1)       layer_filter="$layer_filter csp-meta" ;;
        workflow|2)   layer_filter="$layer_filter csp-workflow" ;;
        patterns|3|4) layer_filter="$layer_filter csp-patterns" ;;
        runtime|4|5)  layer_filter="$layer_filter csp-runtime" ;;
        *)            echo "  ⚠️  未知层级: $l (可用: router, meta, workflow, patterns, runtime)" >&2 ;;
      esac
    done
    layer_filter=$(echo "$layer_filter" | sed 's/^ *//')
  fi

  # Resolve stack filter to skill directory names
  local stack_filter=""
  if [ -n "$stacks" ]; then
    stack_filter=$(resolve_stack_skills "$stacks")
  fi

  # Show header
  echo ""
  echo "  CSP v${VERSION} — Code Skills Package 安装器"
  echo ""

  local total_all
  total_all=$(count_all_csp_skills)

  if [ "$dry_run" = "true" ]; then
    echo "  模式: 预览 (dry-run)"
  fi
  if [ -n "$layer_filter" ]; then
    echo "  层级: $layer_filter"
  fi
  if [ -n "$stack_filter" ]; then
    echo "  技术栈: $stacks"
    echo "  匹配 skills: $(echo $stack_filter | wc -w | tr -d ' ') 个"
  fi
  echo "  源: $total_all skills（五层架构）"
  echo "  目标: $base_dir"
  echo ""

  # Dry-run: show what would be installed
  if [ "$dry_run" = "true" ]; then
    echo "  ─── 安装预览 ───────────────────────────────────"
    echo ""
    for layer in $CSP_LAYERS; do
      # Skip layers not in filter
      if [ -n "$layer_filter" ]; then
        echo "$layer_filter" | grep -qw "$layer" || continue
      fi
      local src="$SCRIPT_DIR/$layer"
      [ -d "$src" ] || continue

      # Determine skill dirs: $src/skills/ if exists, else $src/
      local skill_root="$src"
      [ -d "$src/skills" ] && skill_root="$src/skills"

      local n
      n=$(find "$src" -name "SKILL.md" -type f 2>/dev/null | wc -l | tr -d ' ')
      local status="✅"

      if [ -n "$stack_filter" ]; then
        local matched=0
        for skill_dir in "$skill_root"/*/; do
          [ -d "$skill_dir" ] || continue
          local dir_name
          dir_name=$(basename "$skill_dir")
          [ -f "$skill_dir/SKILL.md" ] || continue
          if echo " $stack_filter " | grep -q " $dir_name "; then
            matched=$((matched + 1))
          fi
        done
        if [ "$matched" -lt "$n" ] && [ "$matched" -gt 0 ]; then
          n=$matched
        elif [ "$matched" -eq 0 ] && [ "$layer" = "csp-patterns" ]; then
          n=0
          status="⚠️ "
        fi
      fi
      echo "  $status $layer: $n skills"
    done
    echo ""
    echo "  以上为安装预览。实际运行请去掉 --dry-run。"
    echo ""
    exit 0
  fi

  # Install with filters
  install_for_platform_filtered() {
    local slug="$1"
    local base_dir="$2"
    local layer_filter="$3"
    local stack_filter="$4"
    local name; name=$(platform_name "$slug")
    local dir; dir=$(platform_dir "$slug")
    local target_dir="$base_dir/$dir"

    local skill_count
    skill_count=$(install_skills_to_filtered "$target_dir" "$layer_filter" "$stack_filter")
    echo "  ✅ $name: ${skill_count} skills → $target_dir"

    # Generate platform-specific bootstrap
    local bootstrap_content
    bootstrap_content=$(generate_bootstrap_for "$slug")
    [ -z "$bootstrap_content" ] && return

    case "$slug" in
      claude-code|copilot-cli)
        append_bootstrap_to_file "$base_dir/CLAUDE.md" "$bootstrap_content"
        ;;
      gemini-cli)
        append_bootstrap_to_file "$base_dir/GEMINI.md" "$bootstrap_content"
        ;;
      hermes-agent)
        append_bootstrap_to_file "$base_dir/HERMES.md" "$bootstrap_content"
        ;;
      aider)
        append_bootstrap_to_file "$base_dir/CONVENTIONS.md" "$bootstrap_content"
        ;;
      windsurf)
        append_bootstrap_to_file "$base_dir/.windsurfrules" "$bootstrap_content"
        ;;
      trae)
        mkdir -p "$base_dir/.trae/rules"
        echo "$bootstrap_content" > "$base_dir/.trae/rules/csp.md"
        echo "  ✅ Trae: bootstrap rule → .trae/rules/csp.md"
        ;;
      qoder)
        mkdir -p "$base_dir/.qoder/rules"
        echo "$bootstrap_content" > "$base_dir/.qoder/rules/csp.md"
        echo "  ✅ Qoder: bootstrap rule → .qoder/rules/csp.md"
        ;;
      antigravity)
        mkdir -p "$base_dir/.antigravity"
        echo "$bootstrap_content" > "$base_dir/.antigravity/rules.md"
        echo "  ✅ Antigravity: bootstrap rule → .antigravity/rules.md"
        ;;
      kiro)
        mkdir -p "$base_dir/.kiro/steering"
        echo "$bootstrap_content" > "$base_dir/.kiro/steering/csp.md"
        echo "  ✅ Kiro: bootstrap steering → .kiro/steering/csp.md"
        ;;
      vscode)
        mkdir -p "$base_dir/.github"
        append_bootstrap_to_file "$base_dir/.github/copilot-instructions.md" "$bootstrap_content"
        ;;
    esac
  }

  # Layer-aware + stack-aware install
  install_skills_to_filtered() {
    local target_dir="$1"
    local layer_filter="$2"
    local stack_filter="$3"
    mkdir -p "$target_dir"
    for layer in $CSP_LAYERS; do
      # Skip layers not in filter
      if [ -n "$layer_filter" ]; then
        echo "$layer_filter" | grep -qw "$layer" || continue
      fi
      local src="$SCRIPT_DIR/$layer"
      [ -d "$src" ] || continue

      if [ -z "$stack_filter" ] || [ "$layer" != "csp-patterns" ]; then
        # No stack filter, or non-patterns layer: copy entire layer
        copy_dir "$src" "$target_dir/$layer"
      else
        # Stack filter on csp-patterns:
        # 1. Copy non-skill subdirectories (agents, commands, references, etc.)
        # 2. Find and copy only matching skill dirs (containing SKILL.md)
        mkdir -p "$target_dir/$layer"
        for subdir in "$src"/*/; do
          [ -d "$subdir" ] || continue
          local subdir_name
          subdir_name=$(basename "$subdir")
          # Skip the skills/ container dir — we copy individual skills below
          [ "$subdir_name" = "skills" ] && continue
          [ -f "$subdir/SKILL.md" ] && continue
          cp -R "$subdir" "$target_dir/$layer/" 2>/dev/null || true
        done
        # Find all skill dirs and filter by stack
        find "$src" -name "SKILL.md" -type f 2>/dev/null | while read -r skill_file; do
          local skill_dir
          skill_dir=$(dirname "$skill_file")
          local dir_name
          dir_name=$(basename "$skill_dir")
          if echo " $stack_filter " | grep -q " $dir_name "; then
            local rel_path
            rel_path=$(echo "$skill_dir" | sed "s|^$src/||")
            local dest_dir="$target_dir/$layer/$rel_path"
            mkdir -p "$dest_dir"
            cp -R "$skill_dir"/* "$dest_dir/" 2>/dev/null || true
          fi
        done
      fi
    done
    find "$target_dir" -name '.DS_Store' -delete 2>/dev/null || true

    # Count only CSP layer SKILL.md files, not pre-existing ones
    local count=0
    for layer in $CSP_LAYERS; do
      if [ -d "$target_dir/$layer" ]; then
        local layer_count
        layer_count=$(find "$target_dir/$layer" -name "SKILL.md" -type f 2>/dev/null | wc -l | tr -d ' ')
        count=$((count + layer_count))
      fi
    done
    echo "$count"
  }

  # Explicit platform
  if [ "$mode" = "platform" ]; then
    local slug
    slug=$(resolve_alias "$platform")
    if [ -z "$slug" ]; then
      echo "  ❌ 未知平台: $platform"
      echo "  支持: claude-code cursor copilot-cli hermes-agent windsurf kiro"
      echo "        gemini-cli codex aider trae vscode deerflow opencode"
      echo "        openclaw qwen-code antigravity claw-code qoder"
      exit 1
    fi
    install_for_platform_filtered "$slug" "$base_dir" "$layer_filter" "$stack_filter"
    echo ""
    echo "  安装完成！重启 AI 编程工具即可生效。"
    echo ""
    exit 0
  fi

  # Auto-detect
  local detected
  detected=$(detect_platforms "$base_dir")
  local installed=0

  if [ -n "$detected" ]; then
    echo "$detected" | while read -r slug; do
      install_for_platform_filtered "$slug" "$base_dir" "$layer_filter" "$stack_filter"
    done
    installed=$(echo "$detected" | wc -l | tr -d ' ')
  fi

  if [ "$installed" -eq 0 ]; then
    echo "  ⚠️  未检测到任何已知 AI 编程工具。"
    echo ""
    echo "  用 --platform 指定你的工具："
    echo "    ./install.sh --platform cursor"
    echo "    ./install.sh --platform trae"
    echo ""
    echo "  默认安装到 Claude Code (.claude/skills/)..."
    echo ""
    install_for_platform_filtered "claude-code" "$base_dir" "$layer_filter" "$stack_filter"
  fi

  echo ""
  echo "  安装完成！重启 AI 编程工具即可生效。"
  echo ""
}

main "$@"
