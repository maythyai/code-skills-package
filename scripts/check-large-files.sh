#!/bin/bash
# Check project files against CSP size thresholds (G6.5)
# Usage: ./scripts/check-large-files.sh [project-root]

set -euo pipefail
PROJECT_ROOT="${1:-.}"
WARN_KB=50
HARD_KB=200

echo "=== CSP Artifact Size Check ==="
echo "Project: $(cd "$PROJECT_ROOT" && pwd)"
echo ""

warn_count=0
hard_count=0

while IFS= read -r -d '' file; do
  size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
  kb=$((size / 1024))
  if [ "$kb" -ge "$HARD_KB" ]; then
    printf "  🔴 %4d KB  %s  (MUST split or archive)\n" "$kb" "$file"
    hard_count=$((hard_count + 1))
  elif [ "$kb" -ge "$WARN_KB" ]; then
    printf "  🟡 %4d KB  %s  (consider splitting)\n" "$kb" "$file"
    warn_count=$((warn_count + 1))
  fi
done < <(find "$PROJECT_ROOT/docs" "$PROJECT_ROOT/prompts" -type f \( -name '*.md' -o -name '*.json' \) \
  -not -path '*/archive/*' \
  -not -path '*/research/*' \
  -not -path '*/.csp/*' \
  -print0 2>/dev/null)

echo ""
echo "=== Summary ==="
echo "  🟡 Warnings (>${WARN_KB}KB): $warn_count"
echo "  🔴 Hard fails (>${HARD_KB}KB): $hard_count"

if [ "$hard_count" -gt 0 ]; then
  echo ""
  echo "Action required: split or archive files above hard limit."
  exit 1
fi
