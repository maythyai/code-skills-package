#!/bin/bash
# skill-feedback-collector.sh
# Collects user feedback signals from conversation transcripts, git history, and memory files
# Usage: ./skill-feedback-collector.sh [--days N] [--output file.json]

set -euo pipefail

DAYS=${DAYS:-7}
OUTPUT=${OUTPUT:-.planning/skill-feedback.json}

mkdir -p "$(dirname "$OUTPUT")"

echo "Collecting feedback signals from last ${DAYS} days..."

# Initialize output
cat > "$OUTPUT" << 'HEADER'
{
  "collected_at": "TIMESTAMP",
  "signals": [
HEADER

SIGNALS=()

# 1. Scan conversation logs for user corrections
scan_conversations() {
    local log_dir="$HOME/.claude/logs"
    if [ ! -d "$log_dir" ]; then
        echo "  [skip] No conversation log directory found at $log_dir"
        return
    fi

    echo "  [scan] Conversations ($log_dir)"

    # Pattern: user corrections
    local patterns=(
        "不要"
        "应该"
        "stop doing"
        "不对"
        "不是这样"
        "怎么又"
        "还是没"
        "说了多少"
        "perfect"
        "这样对了"
        "keep doing"
        "don't do"
        "never do"
        "always do"
    )

    local cutoff_date
    cutoff_date=$(date -v-${DAYS}d +%Y-%m-%d 2>/dev/null || date -d "${DAYS} days ago" +%Y-%m-%d 2>/dev/null || echo "2026-01-01")

    for pattern in "${patterns[@]}"; do
        # Search in recent conversation files
        find "$log_dir" -name "*.jsonl" -newer <(date -d "$cutoff_date" +%s 2>/dev/null || echo "2026-01-01") 2>/dev/null | \
            while read -r f; do
                grep -i "$pattern" "$f" 2>/dev/null | head -3 | while read -r line; do
                    echo "    [signal] $(basename "$f"): $pattern → $(echo "$line" | head -c 200)"
                done
            done
    done
}

# 2. Scan git history for skill changes
scan_git() {
    echo "  [scan] Git history (skill changes)"

    git log --since="${DAYS} days ago" --oneline -- 'csp-meta/**' 'csp-patterns/**' 2>/dev/null | \
        while read -r line; do
            echo "    [change] $line"
        done

    # Get diffs
    git diff --stat HEAD~5 -- 'csp-meta/**' 'csp-patterns/**' 2>/dev/null | \
        while read -r line; do
            echo "    [diff] $line"
        done
}

# 3. Scan memory files for feedback
scan_memory() {
    local mem_dir
    mem_dir=$(find "$HOME/.claude/projects" -name "MEMORY.md" -path "*/memory/*" 2>/dev/null | head -1)

    if [ -z "$mem_dir" ]; then
        echo "  [skip] No memory directory found"
        return
    fi

    local mem_base
    mem_base=$(dirname "$mem_dir")

    echo "  [scan] Memory files ($mem_base)"

    # Look for feedback-type memories
    grep -rl "type: feedback" "$mem_base"/*.md 2>/dev/null | \
        while read -r f; do
            echo "    [feedback] $(basename "$f")"
            # Extract the rule
            grep -A2 "Rule:" "$f" 2>/dev/null | head -3 | sed 's/^/      /'
        done

    # Also check individual memory files
    find "$mem_base" -name "feedback*.md" -o -name "*feedback*.md" 2>/dev/null | \
        while read -r f; do
            echo "    [memory] $f"
            head -20 "$f" | sed 's/^/      /'
        done
}

# 4. Check current CLAUDE.md for skill references
check_claude_md() {
    echo "  [scan] CLAUDE.md skill references"

    find . -name "CLAUDE.md" -maxdepth 2 2>/dev/null | \
        while read -r f; do
            grep -i "skill\|csp-" "$f" 2>/dev/null | head -5 | \
                while read -r line; do
                    echo "    [ref] $(basename "$(dirname "$f")")/$f: $line"
                done
        done
}

echo ""
echo "=== Signal Collection Results ==="
echo ""
scan_conversations
echo ""
scan_git
echo ""
scan_memory
echo ""
check_claude_md
echo ""
echo "=== Collection Complete ==="
echo "Results saved to: $OUTPUT"
