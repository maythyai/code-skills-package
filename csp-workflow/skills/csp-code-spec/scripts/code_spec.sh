#!/usr/bin/env bash
# code_spec.sh — CMS (Code Module Spec) CLI helper.
# Pure git + grep + find. Zero runtime dependencies. Works on any clone.
#
# Used by csp-code-spec. Platform-neutral: remote via CSP_GIT_REMOTE (default github.com).
# Project root: CSP_PROJECT_ROOT (default: cwd).
#
# Subcommands:
#   baseline            — git baseline (log/ls-files/tag/HEAD) + size overview
#   entrypoints [lang]  — scan external entry points (HTTP/RPC/CLI/scheduled/MQ/event)
#   diff-since <sha>    — files changed since baseline SHA (for auto-align delta)
#   graph <dir>         — emit knowledge-graph nodes/edges skeleton (symbol refs)
#
# Exit codes: 0=ok, 1=error, 2=missing baseline (init scenario)

set -u

ROOT="${CSP_PROJECT_ROOT:-$(pwd)}"
APP="${CSP_APP:-$(basename "$ROOT")}"
OUT_DIR="$ROOT/.csp/code-spec/$APP"

# Exclude patterns shared by all scans.
EXCLUDE_OPTS=(--exclude-dir=node_modules --exclude-dir=.git --exclude-dir=__pycache__ --exclude-dir=dist --exclude-dir=build --exclude-dir=.venv --exclude-dir=venv --exclude-dir=target)

err() { printf 'code_spec: %s\n' "$*" >&2; }
out() { printf '%s\n' "$*"; }

require_git() {
  if ! git -C "$ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    err "not a git repository: $ROOT (set CSP_GIT_REMOTE to clone first)"
    exit 2
  fi
}

cmd_baseline() {
  require_git
  echo "# Git baseline"
  echo "- HEAD:        $(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo n/a)"
  echo "- Branch:      $(git -C "$ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo n/a)"
  echo "- Tags:        $(git -C "$ROOT" tag --sort=-version:refname 2>/dev/null | head -3 | tr '\n' ' ')"
  echo "- Remote:      ${CSP_GIT_REMOTE:-github.com}"
  echo
  echo "# Recent commits"
  git -C "$ROOT" log --oneline -5 2>/dev/null
  echo
  echo "# Size overview"
  printf -- "- py:   %s\n" "$(git -C "$ROOT" ls-files '*.py' 2>/dev/null | wc -l)"
  printf -- "- ts/js:%s\n" "$(git -C "$ROOT" ls-files '*.ts' '*.js' '*.tsx' '*.jsx' 2>/dev/null | wc -l)"
  printf -- "- go:   %s\n" "$(git -C "$ROOT" ls-files '*.go' 2>/dev/null | wc -l)"
  printf -- "- java: %s\n" "$(git -C "$ROOT" ls-files '*.java' 2>/dev/null | wc -l)"
  printf -- "- rs:   %s\n" "$(git -C "$ROOT" ls-files '*.rs' 2>/dev/null | wc -l)"
}

# entrypoints: scan for external entry-point signals. grep only — no fabrication.
cmd_entrypoints() {
  require_git
  local lang="${1:-all}"
  echo "# Entry points (type | id | file:line | scenario)"
  echo "# Scenario is inferred -> [TBD] when uncertain. Only grep hits are listed."

  local files
  files=$(git -C "$ROOT" ls-files 2>/dev/null | grep -E '\.(py|ts|tsx|js|jsx|go|java|rs)$')
  [ -z "$files" ] && { echo "(no source files tracked by git)"; return 0; }

  # HTTP
  echo
  echo "## HTTP"
  echo "$files" | while IFS= read -r f; do
    [ -f "$ROOT/$f" ] || continue
    grep -rnE '@(app|router)\.(route|get|post|put|delete|patch)|@GetMapping|@PostMapping|@RequestMapping|router\.(get|post|put|delete)' "$ROOT/$f" "${EXCLUDE_OPTS[@]}" 2>/dev/null \
      | sed "s|^$ROOT/||" | awk -F: '{print "HTTP|"$0}' || true
  done

  # CLI
  echo
  echo "## CLI"
  echo "$files" | while IFS= read -r f; do
    [ -f "$ROOT/$f" ] || continue
    grep -rnE "argparse|@click\.command|cobra\.Command|flag\.Parse|if __name__ == .__main__.|@app\.command" "$ROOT/$f" "${EXCLUDE_OPTS[@]}" 2>/dev/null \
      | sed "s|^$ROOT/||" | awk -F: '{print "CLI|"$0}' || true
  done

  # Scheduled
  echo
  echo "## Scheduled"
  echo "$files" | while IFS= read -r f; do
    [ -f "$ROOT/$f" ] || continue
    grep -rnE '@Scheduled|@cron|celery.*beat|@SchedulerLock|crontab' "$ROOT/$f" "${EXCLUDE_OPTS[@]}" 2>/dev/null \
      | sed "s|^$ROOT/||" | awk -F: '{print "SCHED|"$0}' || true
  done

  # Message / event
  echo
  echo "## Message/Event"
  echo "$files" | while IFS= read -r f; do
    [ -f "$ROOT/$f" ] || continue
    grep -rnE '@KafkaListener|@RabbitListener|@EventListener|@Subscribe|consumer\.on|@StreamListener' "$ROOT/$f" "${EXCLUDE_OPTS[@]}" 2>/dev/null \
      | sed "s|^$ROOT/||" | awk -F: '{print "MSG|"$0}' || true
  done
}

cmd_diff_since() {
  require_git
  local prev="${1:-}"
  if [ -z "$prev" ]; then
    err "usage: code_spec.sh diff-since <prev_sha>"
    err "  prev_sha read from $OUT_DIR/CODE-MODULE-SPEC.md baseline if omitted"
    prev=$(grep -E '^- Baseline SHA:' "$OUT_DIR/CODE-MODULE-SPEC.md" 2>/dev/null | awk '{print $NF}')
  fi
  if [ -z "$prev" ]; then
    err "no prev SHA; run full distillation first (baseline)"
    exit 2
  fi
  echo "# Files changed since $prev"
  git -C "$ROOT" diff --name-only "$prev"..HEAD 2>/dev/null || true
  echo
  echo "# Diffstat"
  git -C "$ROOT" diff --stat "$prev"..HEAD 2>/dev/null | tail -1 || true
}

# graph: skeleton of symbol references for knowledge-graph.json.
# Agent fills business scenario; this only provides grep-verified edges.
cmd_graph() {
  require_git
  local dir="${1:-src}"
  [ -d "$ROOT/$dir" ] || dir="."
  echo "# knowledge-graph skeleton (grep-verified; edges carry file:line)"
  echo "# Nodes = def lines; Edges = reference lines"
  echo
  echo "## Nodes (definitions)"
  # Python def/class, JS function/const, Go func, Java method
  grep -rnE '^\s*(def |class |func |public .*\(|private .*\(|const .*=.*=>|const .*=.*function)' "$ROOT/$dir" "${EXCLUDE_OPTS[@]}" 2>/dev/null \
    | sed "s|^$ROOT/||" | head -200 || true
  echo
  echo "## Edges (references) — sample"
  echo "# (Agent traverses callers per node; this lists raw references to verify)"
  grep -rnE '\b(import|from|require|use)\b' "$ROOT/$dir" "${EXCLUDE_OPTS[@]}" 2>/dev/null \
    | sed "s|^$ROOT/||" | head -100 || true
}

main() {
  local sub="${1:-}"
  [ $# -gt 0 ] && shift
  case "$sub" in
    baseline)    cmd_baseline "$@" ;;
    entrypoints) cmd_entrypoints "$@" ;;
    diff-since)  cmd_diff_since "$@" ;;
    graph)       cmd_graph "$@" ;;
    ""|-h|--help|help)
      sed -n '2,18p' "$0"
      ;;
    *)
      err "unknown subcommand: $sub"
      sed -n '2,18p' "$0" >&2
      exit 1
      ;;
  esac
}

main "$@"
