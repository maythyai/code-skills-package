#!/bin/bash
# CSP Phase Guard Hook — prevents operations that violate phase constraints
# Usage: Called by Claude Code hooks system
# Environment: CSP_STATE_FILE, TOOL_NAME, TOOL_INPUT

set -euo pipefail

STATE_FILE="${CSP_STATE_FILE:-.csp/workflow-state.yaml}"

# Exit 0 (allow) if no active workflow
if [ ! -f "$STATE_FILE" ]; then
  exit 0
fi

# Extract current phase
PHASE=$(grep -E "^phase:" "$STATE_FILE" 2>/dev/null | head -1 | sed 's/^phase: *//' | tr -d '"' || echo "")

if [ -z "$PHASE" ]; then
  exit 0
fi

# Tool being called
TOOL_NAME="${TOOL_NAME:-}"
TOOL_INPUT="${TOOL_INPUT:-}"

# Phase-operation matrix
case "$PHASE" in
  open|design)
    # Block source code writes
    if [[ "$TOOL_INPUT" =~ \.(ts|tsx|js|jsx|py|go|rs|java|kt|swift|cpp|c|h|cs|rb)$ ]]; then
      echo "BLOCKED: $PHASE phase does not allow source code writes" >&2
      echo "Current phase: $PHASE" >&2
      echo "Blocked file pattern: source code" >&2
      exit 1
    fi
    ;;

  build)
    # Allow code and test writes
    # Block skipping decision points
    if [[ "$TOOL_NAME" == "Bash" ]] && [[ "$TOOL_INPUT" =~ "csp-guard.sh" ]]; then
      # Allow guard commands
      :
    fi
    ;;

  verify)
    # Block source code writes (only verification allowed)
    if [[ "$TOOL_INPUT" =~ \.(ts|tsx|js|jsx|py|go|rs|java|kt|swift|cpp|c|h|cs|rb)$ ]]; then
      # Allow test files
      if [[ "$TOOL_INPUT" =~ \.(test|spec)\.(ts|tsx|js|jsx|py|go|rs|java)$ ]]; then
        :
      else
        echo "BLOCKED: verify phase does not allow source code writes (except tests)" >&2
        echo "Current phase: $PHASE" >&2
        exit 1
      fi
    fi
    ;;

  archive)
    # Block all code writes
    if [[ "$TOOL_INPUT" =~ \.(ts|tsx|js|jsx|py|go|rs|java|kt|swift|cpp|c|h|cs|rb)$ ]]; then
      echo "BLOCKED: archive phase does not allow code writes" >&2
      echo "Current phase: $PHASE" >&2
      exit 1
    fi
    ;;

  done)
    # Workflow complete, no restrictions
    ;;
esac

# Allow operation
exit 0
