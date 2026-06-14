#!/usr/bin/env bash
# csp-prune-source-layer.sh — 批量移除已吸收来源项目层并更新引用
#
# 用法:
#   ./shared/scripts/csp-prune-source-layer.sh --dry-run   # 仅报告
#   ./shared/scripts/csp-prune-source-layer.sh --apply     # 执行（需确认）
#
# 当前支持: 检测 openspec/csp-spec 残留引用

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

DRY=true
[[ "${1:-}" == "--apply" ]] && DRY=false

PATTERNS='OpenSpec|openspec|opsx:|csp-spec/'

echo "=== CSP Source Layer Prune Scan ==="
echo "Root: $ROOT"
echo "Mode: $( $DRY && echo dry-run || echo apply )"
echo

hits=$(rg -l "$PATTERNS" --glob '!shared/scripts/csp-prune-source-layer.sh' . 2>/dev/null || true)
if [[ -z "$hits" ]]; then
  echo "✓ No residual source-layer references found."
  exit 0
fi

echo "Files with residual references:"
echo "$hits" | while read -r f; do
  count=$(rg -c "$PATTERNS" "$f" 2>/dev/null || echo 0)
  echo "  $f ($count matches)"
done

if $DRY; then
  echo
  echo "Run with --apply to see remediation hints (manual review required for LICENSE/MIGRATION history)."
  exit 1
fi

echo "Apply mode: review files above and patch manually — automated sed disabled for safety."
exit 1
