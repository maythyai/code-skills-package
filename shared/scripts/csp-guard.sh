#!/bin/bash
# CSP Phase Guard — validates exit conditions before phase transitions
# Usage: csp-guard.sh <phase> [--check|--apply]
# Phases: open, design, build, verify, archive
# Exit 0 = all checks pass, exit 1 = blocked (reasons printed to stderr)

set -euo pipefail

COMET_BASH="${COMET_BASH:-${BASH:-bash}}"
STATE_FILE="${CSP_STATE_FILE:-.csp/workflow-state.yaml}"

red() { echo -e "\033[31m$1\033[0m" >&2; }
green() { echo -e "\033[32m$1\033[0m" >&2; }
warn() { echo -e "\033[33m$1\033[0m" >&2; }

# --- YAML helper ---
yaml_get() {
  local field="$1"
  local file="$2"

  if [ ! -f "$file" ]; then
    return 1
  fi

  local IFS='.'
  read -ra PARTS <<< "$field"
  unset IFS

  if [ ${#PARTS[@]} -eq 1 ]; then
    grep -E "^${field}:" "$file" 2>/dev/null | head -1 | sed 's/^[^:]*: *//'
  else
    local parent="${PARTS[0]}"
    local child="${PARTS[1]}"
    awk "/^${parent}:/{flag=1; next} flag && /^  ${child}:/{print \$2; exit} flag && /^[^ ]/{exit}" "$file"
  fi
}

yaml_set() {
  local field="$1"
  local value="$2"
  local file="$3"

  if [ ! -f "$file" ]; then
    red "ERROR: State file not found: $file"
    exit 1
  fi

  cp "$file" "${file}.bak"

  local IFS='.'
  read -ra PARTS <<< "$field"
  unset IFS

  if [ ${#PARTS[@]} -eq 1 ]; then
    if grep -qE "^${field}:" "$file"; then
      sed -i.bak2 "s|^${field}:.*|${field}: ${value}|" "$file"
      rm -f "${file}.bak2"
    else
      echo "${field}: ${value}" >> "$file"
    fi
  else
    local parent="${PARTS[0]}"
    local child="${PARTS[1]}"

    if ! grep -qE "^${parent}:" "$file"; then
      echo "${parent}:" >> "$file"
    fi

    if awk "/^${parent}:/{flag=1; next} flag && /^[^ ]/{flag=0} flag && /^  ${child}:/{found=1} END{exit !found}" "$file"; then
      awk -v child="$child" -v value="$value" "
        /^${parent}:/{print; in_parent=1; next}
        in_parent && /^  ${child}:/{print \"  \" child \": \" value; in_parent=0; next}
        in_parent && /^[^ ]/{in_parent=0}
        {print}
      " "$file" > "${file}.tmp"
      mv "${file}.tmp" "$file"
    else
      awk -v child="$child" -v value="$value" "
        /^${parent}:/{print; print \"  \" child \": \" value; next}
        {print}
      " "$file" > "${file}.tmp"
      mv "${file}.tmp" "$file"
    fi
  fi

  local timestamp
  timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  if grep -qE "^updated_at:" "$file"; then
    sed -i.bak2 "s|^updated_at:.*|updated_at: \"${timestamp}\"|" "$file"
    rm -f "${file}.bak2"
  else
    echo "updated_at: \"${timestamp}\"" >> "$file"
  fi
}

# --- Phase exit checks ---
check_open_exit() {
  local errors=()

  # Check proposal/design/tasks artifacts exist
  local proposal=$(yaml_get "context.proposal_file" "$STATE_FILE" 2>/dev/null || echo "")
  local design=$(yaml_get "context.design_doc_file" "$STATE_FILE" 2>/dev/null || echo "")
  local tasks_total=$(yaml_get "tasks.total" "$STATE_FILE" 2>/dev/null || echo "0")

  if [ -z "$proposal" ]; then
    errors+=("Proposal file not set (context.proposal_file)")
  elif [ ! -f "$proposal" ]; then
    errors+=("Proposal file not found: $proposal")
  fi

  if [ "$tasks_total" -eq 0 ]; then
    errors+=("No tasks defined (tasks.total = 0)")
  fi

  if [ ${#errors[@]} -gt 0 ]; then
    red "BLOCKED: Cannot exit open phase"
    for err in "${errors[@]}"; do
      red "  - $err"
    done
    return 1
  fi

  green "✓ Open phase exit checks passed"
  return 0
}

check_design_exit() {
  local errors=()

  # Check design doc exists
  local design_doc=$(yaml_get "context.design_doc_file" "$STATE_FILE" 2>/dev/null || echo "")

  if [ -z "$design_doc" ]; then
    errors+=("Design doc not set (context.design_doc_file)")
  elif [ ! -f "$design_doc" ]; then
    errors+=("Design doc not found: $design_doc")
  fi

  if [ ${#errors[@]} -gt 0 ]; then
    red "BLOCKED: Cannot exit design phase"
    for err in "${errors[@]}"; do
      red "  - $err"
    done
    return 1
  fi

  green "✓ Design phase exit checks passed"
  return 0
}

check_build_exit() {
  local errors=()

  # Check all tasks completed
  local tasks_total=$(yaml_get "tasks.total" "$STATE_FILE" 2>/dev/null || echo "0")
  local tasks_completed=$(yaml_get "tasks.completed" "$STATE_FILE" 2>/dev/null || echo "0")

  if [ "$tasks_completed" -lt "$tasks_total" ]; then
    errors+=("Tasks incomplete: $tasks_completed/$tasks_total")
  fi

  # Check plan exists
  local plan=$(yaml_get "context.plan_file" "$STATE_FILE" 2>/dev/null || echo "")
  if [ -z "$plan" ]; then
    errors+=("Plan file not set (context.plan_file)")
  elif [ ! -f "$plan" ]; then
    errors+=("Plan file not found: $plan")
  fi

  if [ ${#errors[@]} -gt 0 ]; then
    red "BLOCKED: Cannot exit build phase"
    for err in "${errors[@]}"; do
      red "  - $err"
    done
    return 1
  fi

  green "✓ Build phase exit checks passed"
  return 0
}

check_verify_exit() {
  local errors=()

  # Check verification result
  local result=$(yaml_get "verification.result" "$STATE_FILE" 2>/dev/null || echo "")

  if [ -z "$result" ] || [ "$result" = "pending" ]; then
    errors+=("Verification result not set (still pending)")
  elif [ "$result" != "pass" ] && [ "$result" != "fail" ]; then
    errors+=("Invalid verification result: $result (expected pass|fail)")
  fi

  if [ ${#errors[@]} -gt 0 ]; then
    red "BLOCKED: Cannot exit verify phase"
    for err in "${errors[@]}"; do
      red "  - $err"
    done
    return 1
  fi

  green "✓ Verify phase exit checks passed"
  return 0
}

check_archive_exit() {
  local errors=()

  # Check verify passed
  local result=$(yaml_get "verification.result" "$STATE_FILE" 2>/dev/null || echo "")

  if [ "$result" != "pass" ]; then
    errors+=("Cannot archive: verification result is '$result' (expected 'pass')")
  fi

  if [ ${#errors[@]} -gt 0 ]; then
    red "BLOCKED: Cannot exit archive phase"
    for err in "${errors[@]}"; do
      red "  - $err"
    done
    return 1
  fi

  green "✓ Archive phase exit checks passed"
  return 0
}

# --- Main ---
if [ $# -lt 2 ]; then
  red "ERROR: Usage: csp-guard.sh <phase> [--check|--apply]"
  exit 1
fi

PHASE="$1"
MODE="$2"

if [ "$MODE" != "--check" ] && [ "$MODE" != "--apply" ]; then
  red "ERROR: Invalid mode: $MODE (expected --check or --apply)"
  exit 1
fi

if [ ! -f "$STATE_FILE" ]; then
  red "ERROR: No active workflow (state file not found: $STATE_FILE)"
  exit 1
fi

CURRENT_PHASE=$(yaml_get "phase" "$STATE_FILE")

if [ "$CURRENT_PHASE" != "$PHASE" ]; then
  red "ERROR: Current phase is $CURRENT_PHASE, not $PHASE"
  exit 1
fi

# Run exit checks for current phase
BLOCK=0
case "$PHASE" in
  open)
    check_open_exit || BLOCK=1
    ;;
  design)
    check_design_exit || BLOCK=1
    ;;
  build)
    check_build_exit || BLOCK=1
    ;;
  verify)
    check_verify_exit || BLOCK=1
    ;;
  archive)
    check_archive_exit || BLOCK=1
    ;;
  *)
    red "ERROR: Unknown phase: $PHASE"
    exit 1
    ;;
esac

if [ "$BLOCK" -eq 1 ]; then
  red "ALL CHECKS FAILED"
  exit 1
fi

# If --apply, advance phase
if [ "$MODE" = "--apply" ]; then
  case "$PHASE" in
    open)
      yaml_set "phase" "design" "$STATE_FILE"
      green "✓ Phase advanced: open → design"
      ;;
    design)
      yaml_set "phase" "build" "$STATE_FILE"
      green "✓ Phase advanced: design → build"
      ;;
    build)
      yaml_set "phase" "verify" "$STATE_FILE"
      green "✓ Phase advanced: build → verify"
      ;;
    verify)
      local result=$(yaml_get "verification.result" "$STATE_FILE")
      if [ "$result" = "pass" ]; then
        yaml_set "phase" "archive" "$STATE_FILE"
        green "✓ Phase advanced: verify → archive"
      else
        yaml_set "phase" "build" "$STATE_FILE"
        warn "⚠ Phase rolled back: verify → build (verification failed)"
      fi
      ;;
    archive)
      yaml_set "phase" "done" "$STATE_FILE"
      green "✓ Workflow complete"
      ;;
  esac
fi

echo "ALL CHECKS PASSED"
exit 0
