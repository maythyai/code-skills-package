#!/bin/bash
# CSP State — unified interface for workflow state management
# Usage: csp-state.sh <subcommand> [args...]
#
# Subcommands:
#   init <workflow> [--name <change-name>] — Initialize .csp/workflow-state.yaml
#   get <field>                            — Read a field value
#   set <field> <val>                      — Update a field value
#   transition <event>                     — Apply a validated state transition
#   check <phase>                          — Verify entry requirements for a phase
#   scale                                  — Assess and set verification mode
#   task-checkoff <task-text>              — Mark one task as completed
#   next                                   — Output next action (auto|manual|done)
#
# Workflows: full, ralph, autopilot, hotfix, tweak
# Phases: open, design, build, verify, archive, done

set -euo pipefail

# --- Color output helpers ---
red() { echo -e "\033[31m$1\033[0m" >&2; }
green() { echo -e "\033[32m$1\033[0m" >&2; }
yellow() { echo -e "\033[33m$1\033[0m" >&2; }

# --- State file ---
STATE_FILE="${CSP_STATE_FILE:-.csp/workflow-state.yaml}"

# --- Input validation ---
validate_workflow() {
  local value="$1"
  local valid_workflows=("full" "ralph" "autopilot" "hotfix" "tweak")

  for valid in "${valid_workflows[@]}"; do
    if [ "$value" = "$valid" ]; then
      return 0
    fi
  done

  red "ERROR: Invalid workflow: '$value'"
  red "Valid workflows: ${valid_workflows[*]}"
  exit 1
}

validate_phase() {
  local value="$1"
  local valid_phases=("open" "design" "build" "verify" "archive" "done")

  for valid in "${valid_phases[@]}"; do
    if [ "$value" = "$valid" ]; then
      return 0
    fi
  done

  red "ERROR: Invalid phase: '$value'"
  red "Valid phases: ${valid_phases[*]}"
  exit 1
}

validate_enum() {
  local value="$1"
  shift
  local valid_values=("$@")

  for valid in "${valid_values[@]}"; do
    if [ "$value" = "$valid" ]; then
      return 0
    fi
  done

  red "ERROR: Invalid value: '$value'"
  red "Valid values: ${valid_values[*]}"
  exit 1
}

# --- YAML helpers (simple field extraction/update) ---
yaml_get() {
  local field="$1"
  local file="$2"

  if [ ! -f "$file" ]; then
    return 1
  fi

  # Handle nested fields with dot notation (e.g., "context.plan_file")
  local current_file="$file"
  local IFS='.'
  read -ra PARTS <<< "$field"
  unset IFS

  for part in "${PARTS[@]}"; do
    local value
    value=$(grep -E "^${part}:" "$current_file" 2>/dev/null | head -1 | sed 's/^[^:]*: *//')

    if [ -z "$value" ]; then
      # Try nested (e.g., under "context:")
      value=$(awk "/^${part}:/{flag=1; next} flag && /^  [^ ]/{flag=0} flag" "$current_file" | head -1 | sed 's/^ *//')
    fi

    echo "$value"
    return 0
  done
}

yaml_set() {
  local field="$1"
  local value="$2"
  local file="$3"

  if [ ! -f "$file" ]; then
    red "ERROR: State file not found: $file"
    exit 1
  fi

  # Create backup
  cp "$file" "${file}.bak"

  # Handle nested fields
  local IFS='.'
  read -ra PARTS <<< "$field"
  unset IFS

  if [ ${#PARTS[@]} -eq 1 ]; then
    # Top-level field
    if grep -qE "^${field}:" "$file"; then
      # Update existing
      sed -i.bak2 "s|^${field}:.*|${field}: ${value}|" "$file"
      rm -f "${file}.bak2"
    else
      # Append
      echo "${field}: ${value}" >> "$file"
    fi
  else
    # Nested field (e.g., context.plan_file)
    local parent="${PARTS[0]}"
    local child="${PARTS[1]}"

    # Check if parent exists
    if ! grep -qE "^${parent}:" "$file"; then
      # Create parent section
      echo "${parent}:" >> "$file"
    fi

    # Check if child exists under parent
    if awk "/^${parent}:/{flag=1; next} flag && /^[^ ]/{flag=0} flag && /^  ${child}:/{found=1} END{exit !found}" "$file"; then
      # Update existing child
      awk -v child="$child" -v value="$value" "
        /^${parent}:/{print; in_parent=1; next}
        in_parent && /^  ${child}:/{print \"  \" child \": \" value; in_parent=0; next}
        in_parent && /^[^ ]/{in_parent=0}
        {print}
      " "$file" > "${file}.tmp"
      mv "${file}.tmp" "$file"
    else
      # Append child under parent
      awk -v child="$child" -v value="$value" "
        /^${parent}:/{print; print \"  \" child \": \" value; next}
        {print}
      " "$file" > "${file}.tmp"
      mv "${file}.tmp" "$file"
    fi
  fi

  # Update updated_at timestamp
  local timestamp
  timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  if grep -qE "^updated_at:" "$file"; then
    sed -i.bak2 "s|^updated_at:.*|updated_at: \"${timestamp}\"|" "$file"
    rm -f "${file}.bak2"
  else
    echo "updated_at: \"${timestamp}\"" >> "$file"
  fi

  green "✓ Updated ${field} = ${value}"
}

# --- State transitions ---
apply_transition() {
  local event="$1"
  local current_phase
  current_phase=$(yaml_get "phase" "$STATE_FILE")

  case "$event" in
    open-done)
      if [ "$current_phase" != "open" ]; then
        red "ERROR: Cannot transition from $current_phase via open-done"
        exit 1
      fi
      yaml_set "phase" "design" "$STATE_FILE"
      ;;
    design-done)
      if [ "$current_phase" != "design" ]; then
        red "ERROR: Cannot transition from $current_phase via design-done"
        exit 1
      fi
      yaml_set "phase" "build" "$STATE_FILE"
      ;;
    build-done)
      if [ "$current_phase" != "build" ]; then
        red "ERROR: Cannot transition from $current_phase via build-done"
        exit 1
      fi
      yaml_set "phase" "verify" "$STATE_FILE"
      ;;
    verify-pass)
      if [ "$current_phase" != "verify" ]; then
        red "ERROR: Cannot transition from $current_phase via verify-pass"
        exit 1
      fi
      yaml_set "phase" "archive" "$STATE_FILE"
      yaml_set "verification.result" "pass" "$STATE_FILE"
      ;;
    verify-fail)
      if [ "$current_phase" != "verify" ]; then
        red "ERROR: Cannot transition from $current_phase via verify-fail"
        exit 1
      fi
      yaml_set "phase" "build" "$STATE_FILE"
      yaml_set "verification.result" "fail" "$STATE_FILE"
      ;;
    archive-done)
      if [ "$current_phase" != "archive" ]; then
        red "ERROR: Cannot transition from $current_phase via archive-done"
        exit 1
      fi
      yaml_set "phase" "done" "$STATE_FILE"
      ;;
    *)
      red "ERROR: Unknown transition event: $event"
      red "Valid events: open-done, design-done, build-done, verify-pass, verify-fail, archive-done"
      exit 1
      ;;
  esac

  green "✓ Transition applied: $event"
}

# --- Phase entry checks ---
check_phase_entry() {
  local target_phase="$1"
  local errors=()

  if [ ! -f "$STATE_FILE" ]; then
    red "ERROR: No active workflow (state file not found)"
    exit 1
  fi

  local current_phase
  current_phase=$(yaml_get "phase" "$STATE_FILE")

  case "$target_phase" in
    open)
      if [ "$current_phase" != "open" ]; then
        errors+=("Current phase is $current_phase, not open")
      fi
      ;;
    design)
      if [ "$current_phase" != "open" ] && [ "$current_phase" != "design" ]; then
        errors+=("Cannot enter design phase from $current_phase")
      fi
      # Check open phase artifacts
      local proposal=$(yaml_get "context.proposal_file" "$STATE_FILE" 2>/dev/null || echo "")
      if [ -n "$proposal" ] && [ ! -f "$proposal" ]; then
        errors+=("Proposal file not found: $proposal")
      fi
      ;;
    build)
      if [ "$current_phase" != "design" ] && [ "$current_phase" != "build" ]; then
        errors+=("Cannot enter build phase from $current_phase")
      fi
      # Check design artifacts
      local design_doc=$(yaml_get "context.design_doc_file" "$STATE_FILE" 2>/dev/null || echo "")
      if [ -n "$design_doc" ] && [ ! -f "$design_doc" ]; then
        errors+=("Design doc not found: $design_doc")
      fi
      ;;
    verify)
      if [ "$current_phase" != "build" ] && [ "$current_phase" != "verify" ]; then
        errors+=("Cannot enter verify phase from $current_phase")
      fi
      # Check all tasks completed
      local tasks_total=$(yaml_get "tasks.total" "$STATE_FILE" 2>/dev/null || echo "0")
      local tasks_completed=$(yaml_get "tasks.completed" "$STATE_FILE" 2>/dev/null || echo "0")
      if [ "$tasks_completed" -lt "$tasks_total" ]; then
        errors+=("Tasks incomplete: $tasks_completed/$tasks_total")
      fi
      ;;
    archive)
      if [ "$current_phase" != "verify" ] && [ "$current_phase" != "archive" ]; then
        errors+=("Cannot enter archive phase from $current_phase")
      fi
      local verify_result=$(yaml_get "verification.result" "$STATE_FILE" 2>/dev/null || echo "")
      if [ "$verify_result" != "pass" ]; then
        errors+=("Verification result is not 'pass': $verify_result")
      fi
      ;;
    *)
      red "ERROR: Unknown phase: $target_phase"
      exit 1
      ;;
  esac

  if [ ${#errors[@]} -gt 0 ]; then
    red "BLOCKED: Cannot enter $target_phase phase"
    for err in "${errors[@]}"; do
      red "  - $err"
    done
    exit 1
  fi

  green "✓ All checks passed for $target_phase phase"
}

# --- Scale assessment ---
assess_scale() {
  if [ ! -f "$STATE_FILE" ]; then
    red "ERROR: No active workflow"
    exit 1
  fi

  local tasks_total=$(yaml_get "tasks.total" "$STATE_FILE" 2>/dev/null || echo "0")
  local changed_files=$(yaml_get "verification.scale.changed_files" "$STATE_FILE" 2>/dev/null || echo "0")
  local delta_specs=$(yaml_get "verification.scale.delta_specs" "$STATE_FILE" 2>/dev/null || echo "0")

  # Decision rule: any condition triggers full
  local mode="light"
  if [ "$tasks_total" -gt 3 ] || [ "$delta_specs" -gt 1 ] || [ "$changed_files" -gt 4 ]; then
    mode="full"
  fi

  yaml_set "verification.mode" "$mode" "$STATE_FILE"
  yaml_set "verification.scale.tasks_count" "$tasks_total" "$STATE_FILE"
  yaml_set "verification.scale.changed_files" "$changed_files" "$STATE_FILE"
  yaml_set "verification.scale.delta_specs" "$delta_specs" "$STATE_FILE"

  echo "Scale assessment: $mode"
  echo "  - Tasks: $tasks_total"
  echo "  - Changed files: $changed_files"
  echo "  - Delta specs: $delta_specs"
}

# --- Task checkoff ---
mark_task_completed() {
  local task_text="$1"

  if [ ! -f "$STATE_FILE" ]; then
    red "ERROR: No active workflow"
    exit 1
  fi

  local tasks_total=$(yaml_get "tasks.total" "$STATE_FILE" 2>/dev/null || echo "0")
  local tasks_completed=$(yaml_get "tasks.completed" "$STATE_FILE" 2>/dev/null || echo "0")

  tasks_completed=$((tasks_completed + 1))

  yaml_set "tasks.completed" "$tasks_completed" "$STATE_FILE"
  yaml_set "tasks.current" "$task_text" "$STATE_FILE"

  green "✓ Task completed: $task_text ($tasks_completed/$tasks_total)"
}

# --- Next action ---
output_next() {
  if [ ! -f "$STATE_FILE" ]; then
    echo "NEXT: done"
    return 0
  fi

  local phase=$(yaml_get "phase" "$STATE_FILE")
  local workflow=$(yaml_get "workflow" "$STATE_FILE")
  local auto_transition=$(yaml_get "config.auto_transition" "$STATE_FILE" 2>/dev/null || echo "true")

  if [ "$phase" = "done" ]; then
    echo "NEXT: done"
    return 0
  fi

  # Determine next skill
  local next_skill=""
  case "$phase" in
    open) next_skill="csp-open" ;;
    design) next_skill="csp-design" ;;
    build)
      case "$workflow" in
        hotfix) next_skill="csp-hotfix" ;;
        tweak) next_skill="csp-tweak" ;;
        *) next_skill="csp-build" ;;
      esac
      ;;
    verify) next_skill="csp-verify" ;;
    archive) next_skill="csp-archive" ;;
  esac

  if [ "$auto_transition" = "true" ]; then
    echo "NEXT: auto"
    echo "SKILL: $next_skill"
  else
    echo "NEXT: manual"
    echo "SKILL: $next_skill"
    echo "HINT: Run /$next_skill to continue"
  fi
}

# --- Main command dispatcher ---
if [ $# -eq 0 ]; then
  red "ERROR: No subcommand provided"
  echo "Usage: csp-state.sh <init|get|set|transition|check|scale|task-checkoff|next> [args...]"
  exit 1
fi

CMD="$1"
shift

case "$CMD" in
  init)
    if [ $# -lt 1 ]; then
      red "ERROR: init requires <workflow>"
      exit 1
    fi
    WORKFLOW="$1"
    shift
    validate_workflow "$WORKFLOW"

    NAME=""
    while [ $# -gt 0 ]; do
      case "$1" in
        --name)
          NAME="$2"
          shift 2
          ;;
        *)
          red "ERROR: Unknown option: $1"
          exit 1
          ;;
      esac
    done

    if [ -z "$NAME" ]; then
      NAME=$(basename "$PWD")-$(date +%s)
    fi

    # Create .csp directory if needed
    mkdir -p "$(dirname "$STATE_FILE")"

    # Initialize state file
    TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    cat > "$STATE_FILE" <<EOF
version: "1.0"
workflow: ${WORKFLOW}
phase: open
started_at: "${TIMESTAMP}"
updated_at: "${TIMESTAMP}"
context:
  change_name: "${NAME}"
  description: ""
  plan_file: ""
  base_ref: ""
  spec_file: ""
  proposal_file: ""
  design_doc_file: ""
tasks:
  total: 0
  completed: 0
  current: ""
verification:
  result: pending
  mode: light
  scale:
    tasks_count: 0
    changed_files: 0
    delta_specs: 0
config:
  auto_transition: true
  tdd_mode: false
  isolation: none
  build_mode: direct
  context_compression: off
EOF

    green "✓ Initialized workflow state: $WORKFLOW ($NAME)"
    echo "State file: $STATE_FILE"
    ;;

  get)
    if [ $# -lt 1 ]; then
      red "ERROR: get requires <field>"
      exit 1
    fi
    FIELD="$1"
    yaml_get "$FIELD" "$STATE_FILE"
    ;;

  set)
    if [ $# -lt 2 ]; then
      red "ERROR: set requires <field> <value>"
      exit 1
    fi
    FIELD="$1"
    VALUE="$2"
    yaml_set "$FIELD" "$VALUE" "$STATE_FILE"
    ;;

  transition)
    if [ $# -lt 1 ]; then
      red "ERROR: transition requires <event>"
      exit 1
    fi
    EVENT="$1"
    apply_transition "$EVENT"
    ;;

  check)
    if [ $# -lt 1 ]; then
      red "ERROR: check requires <phase>"
      exit 1
    fi
    PHASE="$1"
    validate_phase "$PHASE"
    check_phase_entry "$PHASE"
    ;;

  scale)
    assess_scale
    ;;

  task-checkoff)
    if [ $# -lt 1 ]; then
      red "ERROR: task-checkoff requires <task-text>"
      exit 1
    fi
    TASK_TEXT="$*"
    mark_task_completed "$TASK_TEXT"
    ;;

  next)
    output_next
    ;;

  *)
    red "ERROR: Unknown subcommand: $CMD"
    echo "Valid subcommands: init, get, set, transition, check, scale, task-checkoff, next"
    exit 1
    ;;
esac
