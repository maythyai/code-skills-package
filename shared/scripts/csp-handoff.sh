#!/bin/bash
# CSP Handoff — generate context handoff package between phases
# Usage: csp-handoff.sh <from-phase> <to-phase> [--write|--full]
#
# Modes:
#   --write  Generate compressed handoff (default)
#   --full   Generate full handoff (no compression)

set -euo pipefail

STATE_FILE="${CSP_STATE_FILE:-.csp/workflow-state.yaml}"
HANDOFF_DIR=".csp/handoff"

red() { echo -e "\033[31m$1\033[0m" >&2; }
green() { echo -e "\033[32m$1\033[0m" >&2; }

yaml_get() {
  local field="$1"
  local file="$2"
  if [ ! -f "$file" ]; then return 1; fi
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
  if grep -qE "^${field}:" "$file"; then
    sed -i.bak "s|^${field}:.*|${field}: ${value}|" "$file"
    rm -f "${file}.bak"
  else
    echo "${field}: ${value}" >> "$file"
  fi
}

# --- Main ---
if [ $# -lt 3 ]; then
  red "ERROR: Usage: csp-handoff.sh <from-phase> <to-phase> [--write|--full]"
  exit 1
fi

FROM_PHASE="$1"
TO_PHASE="$2"
MODE="${3:---write}"

if [ ! -f "$STATE_FILE" ]; then
  red "ERROR: No active workflow (state file not found)"
  exit 1
fi

# Get compression config
COMPRESSION=$(yaml_get "config.context_compression" "$STATE_FILE" 2>/dev/null || echo "off")
if [ "$MODE" = "--full" ]; then
  COMPRESSION="off"
fi

# Create handoff directory
mkdir -p "$HANDOFF_DIR"

# Generate handoff package
CHANGE_NAME=$(yaml_get "context.change_name" "$STATE_FILE")
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

JSON_FILE="$HANDOFF_DIR/${FROM_PHASE}-to-${TO_PHASE}-context.json"
MD_FILE="$HANDOFF_DIR/${FROM_PHASE}-to-${TO_PHASE}-context.md"

# Collect context
DESIGN_DOC=$(yaml_get "context.design_doc_file" "$STATE_FILE" 2>/dev/null || echo "")
PLAN_FILE=$(yaml_get "context.plan_file" "$STATE_FILE" 2>/dev/null || echo "")
SPEC_FILE=$(yaml_get "context.spec_file" "$STATE_FILE" 2>/dev/null || echo "")

# Generate JSON (machine index)
cat > "$JSON_FILE" <<EOF
{
  "change": "$CHANGE_NAME",
  "from_phase": "$FROM_PHASE",
  "to_phase": "$TO_PHASE",
  "timestamp": "$TIMESTAMP",
  "compression": "$COMPRESSION",
  "files": {
    "design_doc": "$DESIGN_DOC",
    "plan": "$PLAN_FILE",
    "spec": "$SPEC_FILE"
  },
  "source_paths": [
EOF

# Add file hashes
if [ -n "$DESIGN_DOC" ] && [ -f "$DESIGN_DOC" ]; then
  HASH=$(shasum -a 256 "$DESIGN_DOC" 2>/dev/null | cut -d' ' -f1 || sha256sum "$DESIGN_DOC" 2>/dev/null | cut -d' ' -f1 || echo "unknown")
  echo "    {\"path\": \"$DESIGN_DOC\", \"sha256\": \"$HASH\"}," >> "$JSON_FILE"
fi
if [ -n "$PLAN_FILE" ] && [ -f "$PLAN_FILE" ]; then
  HASH=$(shasum -a 256 "$PLAN_FILE" 2>/dev/null | cut -d' ' -f1 || sha256sum "$PLAN_FILE" 2>/dev/null | cut -d' ' -f1 || echo "unknown")
  echo "    {\"path\": \"$PLAN_FILE\", \"sha256\": \"$HASH\"}," >> "$JSON_FILE"
fi
if [ -n "$SPEC_FILE" ] && [ -f "$SPEC_FILE" ]; then
  if [ "$COMPRESSION" = "beta" ]; then
    HASH=$(shasum -a 256 "$SPEC_FILE" 2>/dev/null | cut -d' ' -f1 || sha256sum "$SPEC_FILE" 2>/dev/null | cut -d' ' -f1 || echo "unknown")
    echo "    {\"path\": \"$SPEC_FILE\", \"sha256\": \"$HASH\", \"mode\": \"hash-ref\"}" >> "$JSON_FILE"
  else
    echo "    {\"path\": \"$SPEC_FILE\", \"mode\": \"full\"}" >> "$JSON_FILE"
  fi
fi

echo "  ]" >> "$JSON_FILE"
echo "}" >> "$JSON_FILE"

# Generate MD (human readable)
cat > "$MD_FILE" <<EOF
# Handoff: $FROM_PHASE → $TO_PHASE

**Change**: $CHANGE_NAME
**Generated**: $TIMESTAMP
**Compression**: $COMPRESSION

## Design Document
EOF

if [ -n "$DESIGN_DOC" ] && [ -f "$DESIGN_DOC" ]; then
  echo "" >> "$MD_FILE"
  echo "**Path**: \`$DESIGN_DOC\`" >> "$MD_FILE"
  echo "" >> "$MD_FILE"
  if [ "$COMPRESSION" = "beta" ]; then
    HASH=$(shasum -a 256 "$DESIGN_DOC" 2>/dev/null | cut -d' ' -f1 || sha256sum "$DESIGN_DOC" 2>/dev/null | cut -d' ' -f1 || echo "unknown")
    echo "> Compressed: Read full file for details. SHA256: \`$HASH\`" >> "$MD_FILE"
  else
    head -50 "$DESIGN_DOC" >> "$MD_FILE"
    echo "" >> "$MD_FILE"
    echo "..." >> "$MD_FILE"
  fi
else
  echo "_(not set)_" >> "$MD_FILE"
fi

cat >> "$MD_FILE" <<EOF

## Plan
EOF

if [ -n "$PLAN_FILE" ] && [ -f "$PLAN_FILE" ]; then
  echo "" >> "$MD_FILE"
  echo "**Path**: \`$PLAN_FILE\`" >> "$MD_FILE"
else
  echo "_(not set)_" >> "$MD_FILE"
fi

cat >> "$MD_FILE" <<EOF

## Spec
EOF

if [ -n "$SPEC_FILE" ] && [ -f "$SPEC_FILE" ]; then
  echo "" >> "$MD_FILE"
  echo "**Path**: \`$SPEC_FILE\`" >> "$MD_FILE"
  if [ "$COMPRESSION" = "beta" ]; then
    echo "**Mode**: hash reference (read full file for details)" >> "$MD_FILE"
  else
    echo "**Mode**: full context" >> "$MD_FILE"
  fi
else
  echo "_(not set)_" >> "$MD_FILE"
fi

# Update state
yaml_set "context.handoff_json" "$JSON_FILE" "$STATE_FILE"
yaml_set "context.handoff_md" "$MD_FILE" "$STATE_FILE"

green "✓ Handoff package generated:"
echo "  JSON: $JSON_FILE"
echo "  MD: $MD_FILE"
echo "  Compression: $COMPRESSION"
