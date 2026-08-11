#!/usr/bin/env bash
# lib/bootstrap.sh — sentinel management + bootstrap content generators for 18 platforms.
# Sourced by install.sh. Depends on SENTINEL_BEGIN/SENTINEL_END constants (defined in install.sh before any bootstrap_* is called).

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

bootstrap_cursor() {
  local n; n=$(scan_skill_entries | wc -l | tr -d ' ')
  local list; list=$(generate_skill_list)
  cat <<EOF
---
alwaysApply: true
---

# CSP (Code Skills Package)

本项目已安装 CSP 技能包（${n} 个 skills）。

## 核心规则

1. **收到任务时，先通过 csp-router 路由** — 识别任务类型并加载对应 skill 组合
2. **设计先于编码**
3. **测试先于实现**
4. **验证先于完成**

## 可用 Skills

${list}

## 如何使用

当任务匹配某个 skill 时，读取 \`.cursor/skills/<layer>/<skill>/SKILL.md\` 并遵循其流程。
EOF
}

bootstrap_codex() {
  local n; n=$(scan_skill_entries | wc -l | tr -d ' ')
  local list; list=$(generate_skill_list)
  cat <<EOF
# CSP (Code Skills Package)

本项目已安装 CSP 技能包（${n} 个 skills）。

## 核心规则

1. **收到任务时，先通过 csp-router 路由** — 识别任务类型并加载对应 skill 组合
2. **设计先于编码**
3. **测试先于实现**
4. **验证先于完成**

## 可用 Skills

${list}

## 如何使用

当任务匹配某个 skill 时，读取 \`.codex/skills/<layer>/<skill>/SKILL.md\` 并遵循其流程。
EOF
}

bootstrap_deerflow() {
  local n; n=$(scan_skill_entries | wc -l | tr -d ' ')
  local list; list=$(generate_skill_list)
  cat <<EOF
# CSP (Code Skills Package)

本项目已安装 CSP 技能包（${n} 个 skills）。

## 核心规则

1. **收到任务时，先通过 csp-router 路由** — 识别任务类型并加载对应 skill 组合
2. **设计先于编码**
3. **测试先于实现**
4. **验证先于完成**

## 可用 Skills

${list}

## 如何使用

当任务匹配某个 skill 时，读取 \`skills/custom/<layer>/<skill>/SKILL.md\` 并遵循其流程。
EOF
}

bootstrap_opencode() {
  local n; n=$(scan_skill_entries | wc -l | tr -d ' ')
  local list; list=$(generate_skill_list)
  cat <<EOF
# CSP (Code Skills Package)

本项目已安装 CSP 技能包（${n} 个 skills）。

## 核心规则

1. **收到任务时，先通过 csp-router 路由** — 识别任务类型并加载对应 skill 组合
2. **设计先于编码**
3. **测试先于实现**
4. **验证先于完成**

## 可用 Skills

${list}

## 如何使用

当任务匹配某个 skill 时，读取 \`.opencode/skills/<layer>/<skill>/SKILL.md\` 并遵循其流程。
EOF
}

bootstrap_qwen() {
  local n; n=$(scan_skill_entries | wc -l | tr -d ' ')
  local list; list=$(generate_skill_list)
  cat <<EOF
# CSP (Code Skills Package)

本项目已安装 CSP 技能包（${n} 个 skills）。

## 核心规则

1. **收到任务时，先通过 csp-router 路由** — 识别任务类型并加载对应 skill 组合
2. **设计先于编码**
3. **测试先于实现**
4. **验证先于完成**

## 可用 Skills

${list}

## 如何使用

当任务匹配某个 skill 时，读取 \`.qwen/skills/<layer>/<skill>/SKILL.md\` 并遵循其流程。
EOF
}

# ─── Shared bootstrap-file writer (used by both install_for_platform and
# install_for_platform_filtered so the two stay in sync). Maps a platform slug
# to its bootstrap file location and writes the generated content. Also fixes a
# pre-existing bug where the filtered installer only wrote bootstraps for 10 of
# the platforms — now all 22 are covered in one place. ────────────────────
write_bootstrap_for_platform() {
  local slug="$1"
  local base_dir="$2"
  local bootstrap_content="$3"

  case "$slug" in
    claude-code|copilot-cli|openclaw|claw-code)
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
    cursor)
      mkdir -p "$base_dir/.cursor/rules"
      echo "$bootstrap_content" > "$base_dir/.cursor/rules/csp.md"
      echo "  ✅ Cursor: bootstrap rule → .cursor/rules/csp.md"
      ;;
    codex)
      append_bootstrap_to_file "$base_dir/AGENTS.md" "$bootstrap_content"
      ;;
    deerflow)
      mkdir -p "$base_dir/.deerflow/rules"
      echo "$bootstrap_content" > "$base_dir/.deerflow/rules/csp.md"
      echo "  ✅ DeerFlow: bootstrap rule → .deerflow/rules/csp.md"
      ;;
    opencode)
      mkdir -p "$base_dir/.opencode/rules"
      echo "$bootstrap_content" > "$base_dir/.opencode/rules/csp.md"
      echo "  ✅ OpenCode: bootstrap rule → .opencode/rules/csp.md"
      ;;
    qwen-code)
      mkdir -p "$base_dir/.qwen/rules"
      echo "$bootstrap_content" > "$base_dir/.qwen/rules/csp.md"
      echo "  ✅ Qwen Code: bootstrap rule → .qwen/rules/csp.md"
      ;;
    junie)
      mkdir -p "$base_dir/.junie"
      echo "$bootstrap_content" > "$base_dir/.junie/guidelines.md"
      echo "  ✅ JetBrains (Junie): bootstrap → .junie/guidelines.md"
      ;;
    cline)
      mkdir -p "$base_dir/.cline/rules"
      echo "$bootstrap_content" > "$base_dir/.cline/rules/csp.md"
      echo "  ✅ Cline: bootstrap rule → .cline/rules/csp.md"
      ;;
    roo-code)
      mkdir -p "$base_dir/.roo/rules"
      echo "$bootstrap_content" > "$base_dir/.roo/rules/csp.md"
      echo "  ✅ Roo Code: bootstrap rule → .roo/rules/csp.md"
      ;;
    neovim)
      mkdir -p "$base_dir/.avante/rules"
      echo "$bootstrap_content" > "$base_dir/.avante/rules/csp.md"
      echo "  ✅ Neovim (avante): bootstrap rule → .avante/rules/csp.md"
      ;;
  esac
}

# ─── New platform adapters (IDE coverage expansion) ─────────────────
# These platforms lack Claude Code's native `Skill` tool, so the bootstrap
# prompt explicitly instructs the AI to honor CSP routing by reading SKILL.md
# files (the Skill-loading compatibility layer — see
# shared/references/skill-loading-protocol.md).

bootstrap_junie() {
  local n; n=$(scan_skill_entries | wc -l | tr -d ' ')
  local list; list=$(generate_skill_list)
  cat <<EOF
# CSP (Code Skills Package)

本项目已安装 CSP 技能包（${n} 个 skills，五层架构）。

## 核心规则

1. **收到任务时，先通过 csp-router 路由** — 识别任务类型并加载对应 skill 组合
2. **设计先于编码** — 功能需求先做 brainstorming 和 plan
3. **测试先于实现** — 写代码前先写测试（TDD）
4. **验证先于完成** — 声称完成前必须运行验证命令

## 可用 Skills

Skills 位于 \`.junie/skills/\` 目录，按五层架构组织（router / meta / workflow / patterns / runtime）。

${list}

## 如何使用

当任务匹配某个 skill 时，读取 \`.junie/skills/<layer>/<skill>/SKILL.md\` 并严格遵循其流程。
如果你认为哪怕只有 1% 的可能性某个 skill 适用，你必须主动读取该 skill 检查。
EOF
}

bootstrap_cline() {
  local n; n=$(scan_skill_entries | wc -l | tr -d ' ')
  local list; list=$(generate_skill_list)
  cat <<EOF
---
alwaysApply: true
---

# CSP (Code Skills Package)

本项目已安装 CSP 技能包（${n} 个 skills）。

## 核心规则

1. **收到任务时，先通过 csp-router 路由** — 识别任务类型并加载对应 skill 组合
2. **设计先于编码**
3. **测试先于实现**
4. **验证先于完成**

## 可用 Skills

${list}

## 如何使用

当任务匹配某个 skill 时，读取 \`.cline/rules/<layer>/<skill>/SKILL.md\` 并遵循其流程。
Cline 支持 custom-instructions 自定义工具调用，请优先用 read_file 工具加载匹配的 SKILL.md。
EOF
}

bootstrap_roo() {
  local n; n=$(scan_skill_entries | wc -l | tr -d ' ')
  local list; list=$(generate_skill_list)
  cat <<EOF
---
alwaysApply: true
---

# CSP (Code Skills Package)

本项目已安装 CSP 技能包（${n} 个 skills）。

## 核心规则

1. **收到任务时，先通过 csp-router 路由** — 识别任务类型并加载对应 skill 组合
2. **设计先于编码**
3. **测试先于实现**
4. **验证先于完成**

## 可用 Skills

${list}

## 如何使用

当任务匹配某个 skill 时，读取 \`.roo/rules/<layer>/<skill>/SKILL.md\` 并遵循其流程。
Roo Code 的 custom-instructions 可调用 read_file 加载匹配的 SKILL.md。
EOF
}

bootstrap_neovim() {
  local n; n=$(scan_skill_entries | wc -l | tr -d ' ')
  local list; list=$(generate_skill_list)
  cat <<EOF
# CSP (Code Skills Package)

本项目已安装 CSP 技能包（${n} 个 skills，五层架构）。

## 核心规则

1. **收到任务时，先通过 csp-router 路由** — 识别任务类型并加载对应 skill 组合
2. **设计先于编码**
3. **测试先于实现**
4. **验证先于完成**

## 可用 Skills

Skills 位于 \`.avante/rules/\` 目录，按五层架构组织。

${list}

## 如何使用

avante.nvim 会自动加载 \`.avante/rules/*.md\` 作为项目规则。
当任务匹配某个 skill 时，用 read_file 加载 \`.avante/rules/<layer>/<skill>/SKILL.md\` 并遵循其流程。
EOF
}
