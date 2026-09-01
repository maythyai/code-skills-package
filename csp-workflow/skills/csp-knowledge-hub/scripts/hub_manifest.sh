#!/usr/bin/env bash
# hub_manifest.sh — Knowledge Hub manifest helper (csp-knowledge-hub).
# Pure git + grep + find. Zero runtime dependencies. Local-first.
#
# Subcommands:
#   status                  — hub health: item count / built / pending / failed / orphan pages
#   list [--type <t>]       — list manifest items (optionally filtered by source_type)
#   locate <query>          — keyword-locate across spec/wiki/memory → output_path + frontmatter
#   diff                    — added/changed/removed since last manifest content_hash snapshot
#   doctor                  — validate AGENTS.md 6 sections + frontmatter presence + no sidecar
#
# Project root: CSP_PROJECT_ROOT (default: cwd). Hub root: <root>/.csp
# Exit codes: 0=ok, 1=error, 2=hub not initialized (no manifest)
set -u

ROOT="${CSP_PROJECT_ROOT:-$(pwd)}"
HUB="$ROOT/.csp"
MANIFEST="$HUB/manifest.json"
AGENTS="$HUB/AGENTS.md"

err() { printf 'hub: %s\n' "$*" >&2; }

require_hub() {
  if [ ! -f "$MANIFEST" ]; then
    err "no manifest at $MANIFEST — run hub init first (csp-knowledge-hub)"
    exit 2
  fi
}

# git blob hash of a file (content-based, ignores mtime). Falls back to a portable hash.
blob_hash() {
  if git -C "$ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    git -C "$ROOT" hash-object -- "$1" 2>/dev/null && return
  fi
  # fallback: shasum of content (still content-based, not mtime)
  if command -v shasum >/dev/null 2>&1; then shasum -- "$1" | awk '{print $1}'; return; fi
  if command -v sha1sum >/dev/null 2>&1; then sha1sum -- "$1" | awk '{print $1}'; return; fi
  cksum -- "$1" | awk '{print $3}'
}

cmd_status() {
  require_hub
  local total built pending failed ready degraded blocked
  total=$(grep -o '"source_id"' "$MANIFEST" 2>/dev/null | wc -l | tr -d ' ')
  built=$(grep -o '"build_status": *"[^"]*built"' "$MANIFEST" 2>/dev/null | wc -l | tr -d ' ')
  pending=$(grep -o '"build_status": *"pending"' "$MANIFEST" 2>/dev/null | wc -l | tr -d ' ')
  failed=$(grep -o '"build_status": *"failed"' "$MANIFEST" 2>/dev/null | wc -l | tr -d ' ')
  ready=$(grep -o '"status": *"ready"' "$MANIFEST" 2>/dev/null | wc -l | tr -d ' ')
  degraded=$(grep -o '"status": *"degraded"' "$MANIFEST" 2>/dev/null | wc -l | tr -d ' ')
  blocked=$(grep -o '"status": *"blocked"' "$MANIFEST" 2>/dev/null | wc -l | tr -d ' ')
  printf '# Knowledge Hub status\n'
  printf -- '- manifest items: %s\n' "$total"
  printf -- '- built:    %s\n' "$built"
  printf -- '- pending:  %s\n' "$pending"
  printf -- '- failed:   %s\n' "$failed"
  printf -- '- ready:    %s  degraded: %s  blocked: %s\n' "$ready" "$degraded" "$blocked"
  if [ -f "$AGENTS" ]; then
    local secs; secs=$(grep -cE '^## ' "$AGENTS" 2>/dev/null)
    printf -- '- AGENTS.md sections: %s (expect 6)\n' "$secs"
  else
    printf -- '- AGENTS.md: MISSING\n'
  fi
}

cmd_list() {
  require_hub
  local filt="${1:-}"
  # crude line-based extraction: per item, print source_id | source_type | title | output_path | build_status
  awk '
    /"items"[[:space:]]*:/ { in_items=1 }
    in_items && /"source_id"[[:space:]]*:[[:space:]]*"/ {
      id=$0; sub(/.*"source_id"[[:space:]]*:[[:space:]]*"/,"",id); sub(/".*/,"",id)
    }
    in_items && /"source_type"[[:space:]]*:[[:space:]]*"/ {
      t=$0; sub(/.*"source_type"[[:space:]]*:[[:space:]]*"/,"",t); sub(/".*/,"",t); type=t
    }
    in_items && /"title"[[:space:]]*:[[:space:]]*"/ {
      ti=$0; sub(/.*"title"[[:space:]]*:[[:space:]]*"/,"",ti); sub(/".*/,"",ti); title=ti
    }
    in_items && /"output_path"[[:space:]]*:[[:space:]]*"/ {
      o=$0; sub(/.*"output_path"[[:space:]]*:[[:space:]]*"/,"",o); sub(/".*/,"",o); out=o
    }
    in_items && /"build_status"[[:space:]]*:[[:space:]]*"/ {
      b=$0; sub(/.*"build_status"[[:space:]]*:[[:space:]]*"/,"",b); sub(/".*/,"",b);
      if (type=="'"$filt"'" || "'"$filt"'"=="") printf "%s\t%s\t%s\t%s\n", id, type, b, out;
      id="";type="";title="";out=""
    }
  ' "$MANIFEST"
}

cmd_locate() {
  require_hub
  local q="${1:-}"
  [ -z "$q" ] && { err "usage: hub_manifest.sh locate <query>"; exit 1; }
  printf '# locate "%s" across spec/wiki/memory\n' "$q"
  # 1) manifest title/source_id match → output_path
  awk -v q="$q" '
    /"items"[[:space:]]*:/ { in_items=1 }
    in_items && /"title"[[:space:]]*:[[:space:]]*"/ {
      ti=$0; sub(/.*"title"[[:space:]]*:[[:space:]]*"/,"",ti); sub(/".*/,"",ti); title=tolower(ti)
    }
    in_items && /"source_id"[[:space:]]*:[[:space:]]*"/ {
      id=$0; sub(/.*"source_id"[[:space:]]*:[[:space:]]*"/,"",id); sub(/".*/,"",id); sid=tolower(id)
    }
    in_items && /"output_path"[[:space:]]*:[[:space:]]*"/ {
      o=$0; sub(/.*"output_path"[[:space:]]*:[[:space:]]*"/,"",o); sub(/".*/,"",o); out=o;
      ql=tolower(q);
      if (index(title,ql) || index(sid,ql)) printf "manifest| %s  →  %s\n", id, out;
      id="";title="";out=""
    }
  ' "$MANIFEST"
  # 2) full-text grep across the hub pages (output_path content + frontmatter)
  printf '\n# full-text in .csp/ pages:\n'
  grep -rilE "$q" "$HUB/product-spec" "$HUB/code-spec" "$HUB/test-spec" "$HUB/wiki" "$HUB/code-wiki" "$HUB/intel" 2>/dev/null \
    | sed "s|$ROOT/||" | head -20 || true
}

cmd_diff() {
  require_hub
  require_git() { git -C "$ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1 || { err "not a git repo: $ROOT"; exit 2; }; }
  require_git
  printf '# content-hash diff (manifest vs working tree)\n'
  # For each output_path in manifest, recompute hash and compare.
  awk '
    /"items"[[:space:]]*:/ { in_items=1 }
    in_items && /"output_path"[[:space:]]*:[[:space:]]*"/ {
      o=$0; sub(/.*"output_path"[[:space:]]*:[[:space:]]*"/,"",o); sub(/".*/,"",o); print o
    }
  ' "$MANIFEST" | while IFS= read -r p; do
    [ -z "$p" ] && continue
    fpath="$ROOT/$p"
    if [ ! -f "$fpath" ]; then printf 'removed  %s\n' "$p"; continue; fi
    cur=$(blob_hash "$fpath")
    # look up recorded hash in manifest
    rec=$(grep -A20 "\"output_path\"[[:space:]]*:[[:space:]]*\"$p\"" "$MANIFEST" 2>/dev/null \
      | grep -m1 '"content_hash"' | sed -E 's/.*"content_hash"[[:space:]]*:[[:space:]]*"([^"]*)".*/\1/')
    if [ -z "$rec" ]; then printf 'new      %s\n' "$p";
    elif [ "$cur" = "$rec" ]; then : ;
    else printf 'changed  %s\n' "$p"; fi
  done
}

cmd_doctor() {
  require_hub
  local ok=1
  printf '# hub doctor\n'
  if [ ! -f "$AGENTS" ]; then printf 'MISSING  AGENTS.md\n'; ok=0
  else
    local secs; secs=$(grep -cE '^## ' "$AGENTS" 2>/dev/null)
    [ "$secs" -ge 6 ] || { printf 'BAD      AGENTS.md has %s H2 sections (expect >=6)\n' "$secs"; ok=0; }
  fi
  # sidecar .meta.json must not exist
  local sidecars; sidecars=$(find "$HUB" -name "*.md.meta.json" 2>/dev/null | wc -l | tr -d ' ')
  [ "$sidecars" -gt 0 ] && { printf 'BAD      %s sidecar .meta.json (use inline frontmatter)\n' "$sidecars"; ok=0; } || printf 'OK       no sidecar .meta.json\n'
  # substantive pages must have frontmatter
  local nofm; nofm=$(find "$HUB/product-spec/modules" "$HUB/wiki" "$HUB/code-wiki" -name "*.md" 2>/dev/null \
    | while IFS= read -r f; do head -1 "$f" 2>/dev/null | grep -qv '^---$' && echo "$f"; done | wc -l | tr -d ' ')
  [ "$nofm" -gt 0 ] && { printf 'BAD      %s substantive pages lack frontmatter\n' "$nofm"; ok=0; } || printf 'OK       substantive pages have frontmatter\n'
  [ "$ok" = 1 ] && printf 'RESULT: PASS\n' || { printf 'RESULT: FAIL\n'; exit 1; }
}

main() {
  local sub="${1:-}"; [ $# -gt 0 ] && shift
  case "$sub" in
    status) cmd_status "$@" ;;
    list)   cmd_list "$@" ;;
    locate) cmd_locate "$@" ;;
    diff)   cmd_diff "$@" ;;
    doctor) cmd_doctor "$@" ;;
    ""|-h|--help|help) sed -n '2,12p' "$0" ;;
    *) err "unknown subcommand: $sub"; sed -n '2,12p' "$0" >&2; exit 1 ;;
  esac
}

main "$@"
