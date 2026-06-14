#!/bin/bash
# CSP E2E 测试脚本
# 测试: 给定任务 → router → skill 匹配 → 文件存在性验证
# 用法: ./shared/scripts/e2e-test.sh

set -e

CSP_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PASS=0
FAIL=0
WARN=0
TOTAL=0

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}=== CSP 端到端测试 ===${NC}"
echo -e "${CYAN}项目根目录: ${CSP_ROOT}${NC}"
echo ""

assert_file_exists() {
    local file="$1"
    local label="$2"
    TOTAL=$((TOTAL + 1))
    if [ -f "${CSP_ROOT}/${file}" ]; then
        echo -e "  ${GREEN}[PASS]${NC} ${label}: ${file}"
        PASS=$((PASS + 1))
    else
        echo -e "  ${RED}[FAIL]${NC} ${label}: ${file} (文件不存在)"
        FAIL=$((FAIL + 1))
    fi
}

assert_dir_exists() {
    local dir="$1"
    local label="$2"
    TOTAL=$((TOTAL + 1))
    if [ -d "${CSP_ROOT}/${dir}" ]; then
        echo -e "  ${GREEN}[PASS]${NC} ${label}: ${dir}/"
        PASS=$((PASS + 1))
    else
        echo -e "  ${RED}[FAIL]${NC} ${label}: ${dir}/ (目录不存在)"
        FAIL=$((FAIL + 1))
    fi
}

# ═══════════════════════════════════════════════
# Test 1: 项目骨架完整性
# ═══════════════════════════════════════════════
echo -e "${CYAN}[Test 1] 项目骨架完整性${NC}"
assert_file_exists "CLAUDE.md" "主入口"
assert_file_exists "ARCHITECTURE.md" "架构文档"
assert_file_exists "SKILL-INDEX.md" "Skill 索引"
assert_file_exists "MIGRATION.md" "迁移映射表"
assert_file_exists "README.md" "README"
assert_dir_exists "csp-router" "路由器目录"
assert_dir_exists "csp-meta" "元技能目录"
assert_dir_exists "csp-workflow" "工作流目录"
assert_file_exists "csp-meta/skills/spec-driven-development/SKILL.md" "Spec-driven meta skill"
assert_dir_exists "csp-patterns" "技术库目录"
assert_dir_exists "csp-runtime" "运行时目录"
assert_dir_exists "shared" "共享资源目录"
echo ""

# ═══════════════════════════════════════════════
# Test 2: Router 组件
# ═══════════════════════════════════════════════
echo -e "${CYAN}[Test 2] Router 组件${NC}"
assert_file_exists "csp-router/SKILL.md" "路由器 SKILL"
assert_file_exists "csp-router/registry.json" "Skill 注册表"
assert_file_exists "csp-router/triggers.yaml" "触发词规则"
echo ""

# ═══════════════════════════════════════════════
# Test 3: Layer 1 元技能
# ═══════════════════════════════════════════════
echo -e "${CYAN}[Test 3] Layer 1: 元技能 (14 skills)${NC}"
for skill in brainstorming dispatching-parallel-agents executing-plans \
    finishing-a-development-branch receiving-code-review requesting-code-review \
    subagent-driven-development systematic-debugging test-driven-development \
    using-git-worktrees verification-before-completion \
    writing-plans writing-skills; do
    assert_file_exists "csp-meta/skills/${skill}/SKILL.md" "元技能: ${skill}"
done
echo ""

# ═══════════════════════════════════════════════
# Test 4: Layer 2 工作流 Commands (核心抽样)
# ═══════════════════════════════════════════════
echo -e "${CYAN}[Test 4] Layer 2: 工作流 Commands (核心抽样)${NC}"
for cmd in csp-plan-phase csp-execute-phase csp-debug csp-ship \
    csp-new-project csp-code-review csp-verify-work csp-add-tests \
    csp-explore csp-fast csp-help; do
    assert_file_exists "csp-workflow/commands/${cmd}.md" "Command: ${cmd}"
done
echo ""

# ═══════════════════════════════════════════════
# Test 5: Layer 2 工作流 Agents (核心抽样)
# ═══════════════════════════════════════════════
echo -e "${CYAN}[Test 5] Layer 2: 工作流 Agents (核心抽样)${NC}"
for agent in csp-planner csp-executor csp-verifier csp-debugger \
    csp-codebase-mapper csp-code-reviewer csp-code-fixer; do
    assert_file_exists "csp-workflow/agents/${agent}.md" "Agent: ${agent}"
done
echo ""

# ═══════════════════════════════════════════════
# Test 6: Spec-driven meta skills + templates
# ═══════════════════════════════════════════════
echo -e "${CYAN}[Test 6] Spec-driven (meta + templates)${NC}"
for skill in spec-driven-development spec-contract; do
    assert_file_exists "csp-meta/skills/${skill}/SKILL.md" "Meta: ${skill}"
done
for tpl in proposal spec design tasks; do
    assert_file_exists "csp-workflow/templates/change-artifacts/${tpl}.md" "Template: ${tpl}"
done
for cmd in csp-spec-phase csp-planning-phase csp-verify-phase; do
    assert_file_exists "csp-workflow/commands/${cmd}.md" "Command: ${cmd}" 2>/dev/null ||     assert_file_exists "csp-workflow/workflows/${cmd}.md" "Workflow: ${cmd}" 2>/dev/null || true
done
echo ""

# ═══════════════════════════════════════════════
# Test 7: Layer 3 Reviewers (核心抽样)
# ═══════════════════════════════════════════════
echo -e "${CYAN}[Test 7] Layer 3: Reviewers (核心抽样)${NC}"
for reviewer in csp-code-reviewer csp-python-reviewer csp-react-reviewer \
    csp-rust-reviewer csp-go-reviewer csp-typescript-reviewer \
    csp-java-reviewer csp-security-reviewer csp-django-reviewer; do
    assert_file_exists "csp-patterns/agents/${reviewer}.md" "Reviewer: ${reviewer}"
done
echo ""

# ═══════════════════════════════════════════════
# Test 8: Layer 4 Build Resolvers
# ═══════════════════════════════════════════════
echo -e "${CYAN}[Test 8] Layer 4: Build Resolvers${NC}"
for resolver in csp-build-error-resolver csp-rust-build-resolver \
    csp-go-build-resolver csp-react-build-resolver csp-java-build-resolver \
    csp-kotlin-build-resolver csp-swift-build-resolver csp-django-build-resolver; do
    assert_file_exists "csp-patterns/agents/${resolver}.md" "Build Resolver: ${resolver}"
done
echo ""

# ═══════════════════════════════════════════════
# Test 9: Layer 4 Skills (核心抽样)
# ═══════════════════════════════════════════════
echo -e "${CYAN}[Test 9] Layer 4: Skills (核心抽样)${NC}"
for skill in code-review security-review frontend-patterns backend-patterns \
    golang-patterns python-patterns rust-patterns react-patterns \
    testing e2e-testing docker-patterns api-design tdd-workflow; do
    assert_dir_exists "csp-patterns/skills/${skill}" "Skill: ${skill}"
done
echo ""

# ═══════════════════════════════════════════════
# Test 10: Layer 5 运行时 (核心抽样)
# ═══════════════════════════════════════════════
echo -e "${CYAN}[Test 10] Layer 5: 运行时 (核心抽样)${NC}"
for skill in csp-autopilot csp-ralph csp-ultrawork csp-remember \
    csp-wiki csp-deep-interview csp-self-improve csp-ai-slop-cleaner; do
    assert_dir_exists "csp-runtime/skills/${skill}" "Runtime Skill: ${skill}"
done
echo ""

# ═══════════════════════════════════════════════
# Test 11: 共享资源
# ═══════════════════════════════════════════════
echo -e "${CYAN}[Test 11] 共享资源${NC}"
assert_file_exists "shared/hooks/hooks.json" "Hooks 配置"
assert_dir_exists "shared/templates/csp" "CSP 项目模板"
assert_file_exists "shared/templates/csp/CLAUDE.md" "模板: CLAUDE.md"
echo ""

# ═══════════════════════════════════════════════
# Test 12: 场景测试 — 任务→Skill 路由覆盖
# ═══════════════════════════════════════════════
echo -e "${CYAN}[Test 12] 场景测试: 任务→Skill 路由覆盖${NC}"

test_scenario() {
    local scenario="$1"
    local trigger_word="$2"
    local expected_file="$3"
    TOTAL=$((TOTAL + 1))
    if grep -q "${trigger_word}" "${CSP_ROOT}/csp-router/triggers.yaml" && \
       [ -f "${CSP_ROOT}/${expected_file}" ]; then
        echo -e "  ${GREEN}[PASS]${NC} ${scenario}: ${trigger_word} -> ${expected_file}"
        PASS=$((PASS + 1))
    else
        echo -e "  ${RED}[FAIL]${NC} ${scenario}: ${trigger_word} -> ${expected_file} (缺失)"
        FAIL=$((FAIL + 1))
    fi
}

test_scenario "Code Review" "review" "csp-workflow/commands/csp-code-review.md"
test_scenario "Bug 修复" "debug" "csp-workflow/commands/csp-debug.md"
test_scenario "功能规划" "plan" "csp-workflow/commands/csp-plan-phase.md"
test_scenario "发布到生产" "ship" "csp-workflow/commands/csp-ship.md"
test_scenario "安全审计" "security" "csp-patterns/agents/csp-security-reviewer.md"
test_scenario "测试编写" "test" "csp-workflow/commands/csp-add-tests.md"

echo ""

# ═══════════════════════════════════════════════
# Test 13: Registry 一致性 — skill path → 文件
# ═══════════════════════════════════════════════
echo -e "${CYAN}[Test 13] Registry 一致性检查${NC}"
TOTAL=$((TOTAL + 1))
MISSING=$(python3 -c "
import json, os, sys
root = '${CSP_ROOT}'
with open(f'{root}/csp-router/registry.json') as f:
    data = json.load(f)
missing = []
for skill in data.get('skills', []):
    path = skill.get('path', '')
    if path and not os.path.exists(os.path.join(root, path)):
        missing.append(path)
if missing:
    for m in missing[:20]:
        print(m)
    sys.exit(1)
sys.exit(0)
" 2>&1) && {
    echo -e "  ${GREEN}[PASS]${NC} Registry 中所有 skill 路径对应的文件都存在"
    PASS=$((PASS + 1))
} || {
    echo -e "  ${RED}[FAIL]${NC} Registry 中存在文件不匹配的 skill:"
    echo "${MISSING}" | while read -r p; do
        [ -n "$p" ] && echo -e "    ${RED}- ${p}${NC}"
    done
    FAIL=$((FAIL + 1))
}
echo ""

# ═══════════════════════════════════════════════
# Test 14: Registry 数量统计
# ═══════════════════════════════════════════════
echo -e "${CYAN}[Test 14] Registry 统计${NC}"
TOTAL=$((TOTAL + 1))
REG_COUNT=$(python3 -c "import json; d=json.load(open('${CSP_ROOT}/csp-router/registry.json')); print(len(d.get('skills',[])))")
if [ "$REG_COUNT" -gt 100 ]; then
    echo -e "  ${GREEN}[PASS]${NC} 注册表包含 ${REG_COUNT} 个 skills (预期 >100)"
    PASS=$((PASS + 1))
else
    echo -e "  ${YELLOW}[WARN]${NC} 注册表仅 ${REG_COUNT} 个 skills (预期 >100)"
    WARN=$((WARN + 1))
fi
echo ""

# ═══════════════════════════════════════════════
# Test 15: Triggers 覆盖检查
# ═══════════════════════════════════════════════
echo -e "${CYAN}[Test 15] Triggers 覆盖检查${NC}"
TOTAL=$((TOTAL + 1))
TRIGGER_COUNT=$(grep -c '^  "' "${CSP_ROOT}/csp-router/triggers.yaml" 2>/dev/null || echo "0")
if [ "$TRIGGER_COUNT" -gt 10 ]; then
    echo -e "  ${GREEN}[PASS]${NC} 触发词覆盖 ${TRIGGER_COUNT} 个关键词 (预期 >10)"
    PASS=$((PASS + 1))
else
    echo -e "  ${YELLOW}[WARN]${NC} 触发词仅 ${TRIGGER_COUNT} 个 (预期 >10)"
    WARN=$((WARN + 1))
fi
echo ""

# ═══════════════════════════════════════════════
# 总结
# ═══════════════════════════════════════════════
echo -e "${CYAN}==============================${NC}"
echo -e "${CYAN}测试结果汇总${NC}"
echo -e "${CYAN}==============================${NC}"
echo -e "  总计: ${TOTAL}"
echo -e "  ${GREEN}通过: ${PASS}${NC}"
echo -e "  ${RED}失败: ${FAIL}${NC}"
echo -e "  ${YELLOW}警告: ${WARN}${NC}"
echo ""

if [ "$FAIL" -gt 0 ]; then
    echo -e "${RED}[E2E FAILED]${NC} 存在 ${FAIL} 个失败项"
    exit 1
else
    echo -e "${GREEN}[E2E PASSED]${NC} 全部 ${TOTAL} 项检查通过"
    exit 0
fi
