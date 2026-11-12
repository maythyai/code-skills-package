#!/usr/bin/env bash
# Read-only Markdown size audit. Warnings are advisory unless --fail-kb is set.
# Usage: bash scripts/check-large-files.sh [project-root] [--warn-kb N] [--fail-kb N]
set -euo pipefail

root='.'
warn_kb=50
fail_kb=''

usage_error() {
  echo "ERROR: $1" >&2
  echo 'Usage: check-large-files.sh [project-root] [--warn-kb N] [--fail-kb N]' >&2
  exit 2
}

if [[ $# -gt 0 && $1 != --* ]]; then
  root=$1
  shift
fi
while [[ $# -gt 0 ]]; do
  case "$1" in
    --warn-kb|--fail-kb)
      [[ $# -ge 2 && $2 =~ ^[1-9][0-9]*$ ]] || usage_error "$1 needs a positive integer (KiB)"
      if [[ $1 == --warn-kb ]]; then warn_kb=$2; else fail_kb=$2; fi
      shift 2 ;;
    *) usage_error "unknown option: $1" ;;
  esac
done
[[ -d $root ]] || usage_error "project root does not exist: $root"
root=$(cd "$root" && pwd -P)

printf '=== CSP Markdown size audit ===\nProject: %s\n' "$root"
printf 'Scope: root CLAUDE.md / AGENTS.md, .csp/AGENTS.md, docs/**/*.md, prompts/**/*.md\n'
printf 'Thresholds: warning at %s KiB; %s\n' "$warn_kb" "$(if [[ -n $fail_kb ]]; then printf 'opt-in failure at %s KiB' "$fail_kb"; else printf 'no failure threshold'; fi)"

warnings=0
failures=0
scanned=0
check_file() {
  local file=$1 size kb
  size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file")
  kb=$((size / 1024))
  scanned=$((scanned + 1))
  if [[ -n $fail_kb ]] && (( size >= fail_kb * 1024 )); then
    printf 'FAIL    %5d KiB  %s\n' "$kb" "$file"
    failures=$((failures + 1))
  elif (( size >= warn_kb * 1024 )); then
    printf 'WARNING %5d KiB  %s\n' "$kb" "$file"
    warnings=$((warnings + 1))
  fi
}

for entry in CLAUDE.md AGENTS.md .csp/AGENTS.md; do
  if [[ -f $root/$entry ]]; then check_file "$root/$entry"; fi
done
for zone in docs prompts; do
  if [[ ! -d $root/$zone ]]; then
    printf 'SKIP    %s/ not present\n' "$zone"
    continue
  fi
  while IFS= read -r -d '' file; do
    check_file "$file"
  done < <(find "$root/$zone" -type f -name '*.md' -print0)
done
printf 'Summary: scanned=%s warnings=%s failures=%s\n' "$scanned" "$warnings" "$failures"
if (( failures > 0 )); then exit 1; fi
