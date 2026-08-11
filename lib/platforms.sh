#!/usr/bin/env bash
# lib/platforms.sh — platform metadata (case-based, bash 3.2 compatible).
# Sourced by install.sh. Extracted from the install.sh God-file for maintainability.

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
    junie)          echo "JetBrains (Junie)" ;;
    cline)          echo "Cline" ;;
    roo-code)       echo "Roo Code" ;;
    neovim)         echo "Neovim (avante)" ;;
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
    junie)          echo ".junie/skills" ;;
    cline)          echo ".cline/rules" ;;
    roo-code)       echo ".roo/rules" ;;
    neovim)         echo ".avante/rules" ;;
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
    junie)          echo ".junie" ;;
    cline)          echo ".cline .clinerules" ;;
    roo-code)       echo ".roo" ;;
    neovim)         echo ".avante" ;;
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
    junie|jetbrains|intellij|pycharm|webstorm|rustrover) echo "junie" ;;
    cline)                                  echo "cline" ;;
    roo|roo-code|roocode)                   echo "roo-code" ;;
    neovim|nvim|avante)                     echo "neovim" ;;
    *) echo "" ;;
  esac
}

