#!/bin/bash
# skill-gap-analyzer.sh
# Analyzes skill coverage gaps by comparing skill triggers against common user tasks
# Usage: ./skill-gap-analyzer.sh [--registry file.json]

set -euo pipefail

REGISTRY=${REGISTRY:-"csp-router/registry.json"}
PROJECT_ROOT=${PROJECT_ROOT:-"."}

echo "=== Skill Gap Analyzer ==="
echo ""

# 1. List all current skills and their triggers
echo "--- Current Skill Inventory ---"

skill_count=0
for skill_dir in "$PROJECT_ROOT"/csp-meta/skills/*/; do
    if [ -f "${skill_dir}SKILL.md" ]; then
        skill_name=$(grep -m1 "^name:" "${skill_dir}SKILL.md" | sed 's/^name: *//' | tr -d '"' | tr -d "'")
        skill_desc=$(grep -m1 "^description:" "${skill_dir}SKILL.md" | sed 's/^description: *//' | tr -d '"' | tr -d "'")
        echo "  [skill] $skill_name"
        echo "          $skill_desc"
        skill_count=$((skill_count + 1))
    fi
done

for agent_file in "$PROJECT_ROOT"/csp-patterns/agents/csp-*.md; do
    if [ -f "$agent_file" ]; then
        agent_name=$(grep -m1 "^name:" "$agent_file" 2>/dev/null | sed 's/^name: *//' | tr -d '"' | tr -d "'" || basename "$agent_file" .md)
        agent_desc=$(grep -m1 "^description:" "$agent_file" 2>/dev/null | sed 's/^description: *//' | tr -d '"' | tr -d "'" || echo "No description")
        echo "  [agent] $agent_name"
        echo "          $agent_desc"
        skill_count=$((skill_count + 1))
    fi
done

echo ""
echo "Total skills/agents: $skill_count"
echo ""

# 2. Identify potential gaps by analyzing common task patterns
echo "--- Gap Detection ---"

# Check for common task patterns that may lack skill coverage
declare -A task_patterns=(
    ["documentation"]="doc\|文档\|write.*docs\|README"
    ["testing"]="test\|测试\|unit\|e2e\|integration"
    ["debugging"]="debug\|调试\|bug\|fix\|error"
    ["refactoring"]="refactor\|重构\|cleanup\|simplify"
    ["performance"]="performance\|性能\|slow\|optimize\|优化"
    ["security"]="security\|安全\|vulnerability\|auth"
    ["deployment"]="deploy\|发布\|ship\|CI\|CD"
    ["code-review"]="review\|审查\|code.review"
    ["planning"]="plan\|规划\|design\|架构"
    ["onboarding"]="onboard\|接手\|understand\|learn"
)

for category in "${!task_patterns[@]}"; do
    pattern="${task_patterns[$category]}"
    # Check if any skill covers this pattern
    matching_skills=$(grep -rl "$pattern" "$PROJECT_ROOT"/csp-meta/skills/*/SKILL.md "$PROJECT_ROOT"/csp-patterns/agents/csp-*.md 2>/dev/null | wc -l)

    if [ "$matching_skills" -eq 0 ]; then
        echo "  [GAP] $category: No skill covers this task pattern"
    else
        echo "  [OK]  $category: $matching_skills skill(s) cover this"
    fi
done

echo ""

# 3. Detect overlapping skills
echo "--- Overlap Detection ---"

# Extract trigger words from all skill descriptions
declare -A skill_triggers
for skill_dir in "$PROJECT_ROOT"/csp-meta/skills/*/; do
    if [ -f "${skill_dir}SKILL.md" ]; then
        skill_name=$(grep -m1 "^name:" "${skill_dir}SKILL.md" | sed 's/^name: *//' | tr -d '"' | tr -d "'")
        skill_desc=$(grep -m1 "^description:" "${skill_dir}SKILL.md" | sed 's/^description: *//' | tr -d '"' | tr -d "'")
        skill_triggers["$skill_name"]="$skill_desc"
    fi
done

# Simple overlap check: skills with similar descriptions
skills_arr=("${!skill_triggers[@]}")
for ((i=0; i<${#skills_arr[@]}; i++)); do
    for ((j=i+1; j<${#skills_arr[@]}; j++)); do
        name1="${skills_arr[$i]}"
        name2="${skills_arr[$j]}"
        desc1="${skill_triggers[$name1]}"
        desc2="${skill_triggers[$name2]}"

        # Check for shared key terms (simple word overlap)
        shared=$(echo "$desc1 $desc2" | tr ' ' '\n' | sort | uniq -d | wc -l)
        if [ "$shared" -gt 3 ]; then
            echo "  [OVERLAP?] $name1 <-> $name2 (share $shared+ terms)"
        fi
    done
done

echo ""

# 4. Token bloat check
echo "--- Token Bloat Check ---"

large_skills=0
for skill_dir in "$PROJECT_ROOT"/csp-meta/skills/*/; do
    if [ -f "${skill_dir}SKILL.md" ]; then
        skill_name=$(grep -m1 "^name:" "${skill_dir}SKILL.md" | sed 's/^name: *//' | tr -d '"' | tr -d "'")
        word_count=$(wc -w < "${skill_dir}SKILL.md")

        if [ "$word_count" -gt 2000 ]; then
            echo "  [BLOAT] $skill_name: ${word_count} words (consider splitting)"
            large_skills=$((large_skills + 1))
        elif [ "$word_count" -gt 1000 ]; then
            echo "  [WARN]  $skill_name: ${word_count} words (review for compression)"
        fi
    fi
done

if [ "$large_skills" -eq 0 ]; then
    echo "  [OK] No oversized skills found"
fi

echo ""
echo "=== Analysis Complete ==="
