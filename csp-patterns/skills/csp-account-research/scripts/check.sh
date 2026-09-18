#!/usr/bin/env bash
# check.sh — csp-account-research 的确定性校验（doctor + gate 二合一）
#
# 用法（在用户当前工作目录下运行）：
#   check.sh doctor                              # 子技能文件是否在位
#   check.sh gate <phase0|phase1|l2|l3|l4|deliverable> <run_id>   # 阶段完成校验
#
# doctor 校验技能目录内 references/*/SKILL.md 存在；
# gate 校验"该阶段的无判断产物是否齐全"。本脚本只验证存在性与
# 非空——内容质量与是否外发留给用户在 GATE 拍板（verify-don't-constrain）。
# 产物目录固定为调用方工作目录下的 .csp/account-research/runs/<run_id>/。

set -u
SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUTPUT_ROOT="$PWD/.csp/account-research/runs"
ok=true

good() { echo "  ✓ $1"; }
err()  { echo "  ✗ $1"; ok=false; }

cmd="${1:-}"

case "$cmd" in
  doctor)
    echo "[sub-skills]"
    for s in signal-scan depth-research deliverable; do
      f="$SKILL_DIR/references/$s/SKILL.md"
      [ -f "$f" ] && good "$s SKILL.md present" || err "$s SKILL.md MISSING ($f)"
    done
    echo "[shared assets]"
    for a in account_research_toolkit.py phase-0-task-definition.md phase-0.5-validation.md phase-1-pool-construction.md phase-2-5-execution.md anti-patterns.md quality-checklist.md cross-skill-fallback.md; do
      f="$SKILL_DIR/references/shared/$a"
      [ -f "$f" ] && good "shared/$a present" || err "shared/$a MISSING ($f)"
    done
    ;;

  gate)
    stage="${2:-}"; run="${3:-}"
    if [ -z "$stage" ] || [ -z "$run" ]; then
      echo "usage: check.sh gate <phase0|phase1|l2|l3|l4|deliverable> <run_id>" >&2; exit 2
    fi
    case "$stage" in
      phase0|phase1|l2|l3|l4|deliverable) ;;
      *) echo "unknown stage: $stage (expect phase0|phase1|l2|l3|l4|deliverable)" >&2; exit 2 ;;
    esac
    rdir="$OUTPUT_ROOT/$run"
    echo "[gate: $stage / runs: ]"
    [ -s "$rdir/request.md" ] && good "request.md present" \
      || err "request.md missing/empty — Step 0 被跳过了"
    if [ -d "$rdir/$stage" ] && [ -n "$(find "$rdir/$stage" -type f 2>/dev/null | head -1)" ]; then
      good "$stage/ has artifacts"
    else
      err "$stage/ missing or empty — 子技能未产出文件"
    fi
    [ -f "$rdir/$stage.ready" ] && good "$stage.ready present" \
      || err "$stage.ready missing — 子技能未确认完成"
    ;;

  *)
    echo "usage: check.sh <doctor | gate <phase0|phase1|l2|l3|l4|deliverable> <run_id>>" >&2
    exit 2
    ;;
esac

echo
if $ok; then
  echo "All checks passed."
  exit 0
else
  echo "Some checks FAILED. 修复 ✗ 项后再进入 GATE。"
  exit 1
fi
