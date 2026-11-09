#!/bin/bash
# sync-reference-projects.sh — Pull/clone all open-source reference projects
#
# Usage:
#   ./sync-reference-projects.sh              # pull existing, clone missing
#   ./sync-reference-projects.sh --status     # show status without pulling
#   ./sync-reference-projects.sh --clone-only # clone missing only, skip pulls
#
# Designed to be run from the code-skills-package root.
# Reference projects live in 开源项目参考/.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
REFS_DIR="${PROJECT_ROOT}/开源项目参考"
MODE="${1:-pull}"

# ── Project registry ──────────────────────────────────────────────────
# Format: "dirname|git_url"
# Add new projects here; the script handles clone vs pull automatically.
PROJECTS=(
  "agency-agents|https://github.com/msitarzewski/agency-agents.git"
  "agent-skills|https://github.com/addyosmani/agent-skills.git"
  "awesome-copilot|https://github.com/github/awesome-copilot.git"
  "BMAD-METHOD|https://github.com/bmad-code-org/BMAD-METHOD.git"
  "claude-skills|https://github.com/alirezarezvani/claude-skills.git"
  "claude-standard-dev-team|https://github.com/xuanbingbingo/claude-standard-dev-team.git"
  "coding-skill-orchestrator|git@github.com:chensaics/coding-skill-orchestrator.git"
  "comet|https://github.com/rpamis/comet.git"
  "compound-engineering-plugin|https://github.com/EveryInc/compound-engineering-plugin.git"
  "ECC|https://github.com/affaan-m/ECC.git"
  "get-shit-done|https://github.com/gsd-build/get-shit-done.git"
  "impeccable|https://github.com/pbakaus/impeccable.git"
  "oh-my-claudecode|https://github.com/Yeachan-Heo/oh-my-claudecode.git"
  "spec-kit|https://github.com/github/spec-kit.git"
  "superpowers|https://github.com/obra/superpowers.git"
)

# ── Colors ─────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ── Counters ───────────────────────────────────────────────────────────
CLONED=0
PULLED=0
UP_TO_DATE=0
FAILED=0
SKIPPED=0

echo -e "${CYAN}═══ Reference Projects Sync ═══${NC}"
echo "Target: ${REFS_DIR}"
echo "Mode:   ${MODE}"
echo ""

mkdir -p "${REFS_DIR}"

for entry in "${PROJECTS[@]}"; do
  dir_name="${entry%%|*}"
  repo_url="${entry##*|}"
  target="${REFS_DIR}/${dir_name}"

  if [ -d "${target}/.git" ]; then
    # ── Existing repo: pull ──────────────────────────────────────────
    if [ "${MODE}" = "--clone-only" ]; then
      echo -e "  ${YELLOW}SKIP${NC}  ${dir_name} (exists, clone-only mode)"
      ((SKIPPED++)) || true
      continue
    fi

    if [ "${MODE}" = "--status" ]; then
      behind=$(cd "$target" && git rev-list --count HEAD..@{u} 2>/dev/null || echo "?")
      ahead=$(cd "$target" && git rev-list --count @{u}..HEAD 2>/dev/null || echo "0")
      if [ "$behind" = "?" ]; then
        echo -e "  ${RED}?   ${dir_name} (no upstream tracking)${NC}"
      elif [ "$behind" -gt 0 ] 2>/dev/null; then
        echo -e "  ${YELLOW}↓${behind}  ${dir_name} (behind by ${behind} commits)${NC}"
      else
        echo -e "  ${GREEN}✓   ${dir_name} (up-to-date)${NC}"
      fi
      continue
    fi

    before=$(cd "$target" && git rev-parse HEAD)
    pull_out=$(cd "$target" && git pull --ff-only 2>&1) || {
      echo -e "  ${RED}FAIL${NC} ${dir_name} — pull failed: $(echo "$pull_out" | tail -1)"
      ((FAILED++)) || true
      continue
    }
    after=$(cd "$target" && git rev-parse HEAD)

    if [ "$before" != "$after" ]; then
      new_count=$(cd "$target" && git rev-list --count "${before}..${after}")
      echo -e "  ${GREEN}PULL${NC} ${dir_name} ← +${new_count} commits"
      # Show new commit summary (last 5)
      cd "$target" && git log --oneline -5 "${before}..${after}" | while read -r line; do
        echo "         ${line}"
      done
      ((PULLED++)) || true
    else
      echo -e "  ${GREEN}OK  ${dir_name} (already up-to-date)${NC}"
      ((UP_TO_DATE++)) || true
    fi

  else
    # ── Missing repo: clone ──────────────────────────────────────────
    if [ "${MODE}" = "--status" ]; then
      echo -e "  ${RED}✗   ${dir_name} (not cloned)${NC}"
      ((SKIPPED++)) || true
      continue
    fi

    echo -n "  CLONE ${dir_name} ... "
    clone_out=$(git clone --depth 1 "$repo_url" "$target" 2>&1) || {
      echo -e "${RED}FAIL${NC}"
      echo "         $(echo "$clone_out" | tail -1)"
      ((FAILED++)) || true
      continue
    }
    echo -e "${GREEN}OK${NC}"
    ((CLONED++)) || true
  fi
done

# ── Summary ────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}─── Summary ───${NC}"
echo -e "  ${GREEN}Cloned:  ${CLONED}${NC}"
echo -e "  ${GREEN}Pulled:  ${PULLED}${NC}"
echo -e "  ${GREEN}Up-to-date: ${UP_TO_DATE}${NC}"
echo -e "  ${YELLOW}Skipped: ${SKIPPED}${NC}"
[ "$FAILED" -gt 0 ] && echo -e "  ${RED}Failed:  ${FAILED}${NC}"

# ── Non-git directories ────────────────────────────────────────────────
echo ""
echo -e "${CYAN}Non-git directories (skipped):${NC}"
for d in "${REFS_DIR}"/*/; do
  name=$(basename "$d")
  if [ ! -d "${d}.git" ]; then
    # Check if it's in our registry
    known=false
    for entry in "${PROJECTS[@]}"; do
      [ "${entry%%|*}" = "$name" ] && known=true && break
    done
    if [ "$known" = false ]; then
      echo "  - ${name}"
    fi
  fi
done

echo ""
echo "Done. $(date +%Y-%m-%d\ %H:%M:%S)"