#!/usr/bin/env bash
# heuristic-eval-scan.sh — 启发式评估自动化预扫描
# 扫描前端代码中常见的可用性反模式，输出 Markdown 格式报告
#
# 用法: bash heuristic-eval-scan.sh <project-dir> [--output <file>]
#
# 扫描项目:
#   - 缺失的错误/加载/空状态处理
#   - 无校验表单
#   - console.error 无用户反馈
#   - 硬编码字符串（可能的 i18n 遗漏）
#   - 缺失 aria 属性
#   - 缺失键盘事件处理

set -euo pipefail

# ── 颜色 ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# ── 参数解析 ──
PROJECT_DIR=""
OUTPUT_FILE=""

usage() {
  echo "用法: $0 <project-dir> [--output <file>]"
  echo ""
  echo "扫描前端代码中常见的可用性反模式。"
  echo ""
  echo "参数:"
  echo "  <project-dir>    项目根目录"
  echo "  --output <file>  输出报告文件路径（默认输出到 stdout）"
  echo "  --help           显示帮助信息"
  echo ""
  echo "扫描类别:"
  echo "  1. 缺失状态处理（error/loading/empty）"
  echo "  2. 表单校验缺失"
  echo "  3. console.error 无用户反馈"
  echo "  4. 硬编码字符串"
  echo "  5. 缺失 aria 属性"
  echo "  6. 缺失键盘事件处理"
  exit 0
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --help|-h) usage ;;
    --output|-o) OUTPUT_FILE="$2"; shift 2 ;;
    -*) echo "未知选项: $1"; exit 1 ;;
    *) PROJECT_DIR="$1"; shift ;;
  esac
done

if [[ -z "$PROJECT_DIR" ]]; then
  echo -e "${RED}错误: 请指定项目目录${NC}"
  echo "用法: $0 <project-dir>"
  exit 1
fi

if [[ ! -d "$PROJECT_DIR" ]]; then
  echo -e "${RED}错误: 目录不存在: $PROJECT_DIR${NC}"
  exit 1
fi

# ── 工具函数 ──
count_matches() {
  local pattern="$1"
  local include="$2"
  local exclude="${3:-}"
  local cmd="grep -rl --include='$include' '$pattern' '$PROJECT_DIR' 2>/dev/null"
  if [[ -n "$exclude" ]]; then
    cmd="$cmd | grep -v '$exclude'"
  fi
  eval "$cmd" | grep -v node_modules | grep -v '.git/' | grep -v dist | grep -v build | grep -v '.next' | wc -l | tr -d ' '
}

list_matches() {
  local pattern="$1"
  local include="$2"
  local exclude="${3:-}"
  local cmd="grep -rn --include='$include' '$pattern' '$PROJECT_DIR' 2>/dev/null"
  if [[ -n "$exclude" ]]; then
    cmd="$cmd | grep -v '$exclude'"
  fi
  eval "$cmd" | grep -v node_modules | grep -v '.git/' | grep -v dist | grep -v build | grep -v '.next' | head -20
}

# ── 扫描开始 ──
SCAN_DATE=$(date '+%Y-%m-%d %H:%M:%S')
TOTAL_FINDINGS=0

generate_report() {
  echo "# 启发式评估预扫描报告"
  echo ""
  echo "- **项目**: $PROJECT_DIR"
  echo "- **扫描时间**: $SCAN_DATE"
  echo "- **扫描工具**: heuristic-eval-scan.sh v1.0"
  echo ""
  echo "---"
  echo ""

  # ── 1. 缺失状态处理 ──
  echo "## 1. 缺失状态处理 (违反原则 1: 系统状态可见性)"
  echo ""

  # 检测 React 组件中有 fetch/axios 但无 loading/error 状态
  local fetch_no_loading
  fetch_no_loading=$(grep -rl --include="*.tsx" --include="*.ts" --include="*.jsx" --include="*.js" \
    -e "fetch(" -e "axios\." -e "useQuery" -e "useMutation" \
    "$PROJECT_DIR" 2>/dev/null | grep -v node_modules | grep -v '.git/' | grep -v dist | grep -v build | grep -v '.next' | wc -l | tr -d ' ')

  local with_loading
  with_loading=$(grep -rl --include="*.tsx" --include="*.ts" --include="*.jsx" --include="*.js" \
    -e "loading" -e "isLoading" -e "setLoading" -e "skeleton" -e "Skeleton" \
    "$PROJECT_DIR" 2>/dev/null | grep -v node_modules | grep -v '.git/' | grep -v dist | grep -v build | grep -v '.next' | wc -l | tr -d ' ')

  local with_error_state
  with_error_state=$(grep -rl --include="*.tsx" --include="*.ts" --include="*.jsx" --include="*.js" \
    -e "error" -e "setError" -e "hasError" -e "ErrorBoundary" \
    "$PROJECT_DIR" 2>/dev/null | grep -v node_modules | grep -v '.git/' | grep -v dist | grep -v build | grep -v '.next' | wc -l | tr -d ' ')

  echo "| 指标 | 数量 |"
  echo "| --- | --- |"
  echo "| 含数据请求的文件 | $fetch_no_loading |"
  echo "| 含 loading 状态的文件 | $with_loading |"
  echo "| 含 error 状态的文件 | $with_error_state |"
  echo ""

  if [[ "$fetch_no_loading" -gt 0 && "$with_loading" -eq 0 ]]; then
    echo -e "${YELLOW}⚠️  有数据请求但无 loading 状态处理${NC}"
    TOTAL_FINDINGS=$((TOTAL_FINDINGS + 1))
  fi
  echo ""

  # ── 2. 表单校验缺失 ──
  echo "## 2. 表单校验缺失 (违反原则 5: 错误预防)"
  echo ""

  local form_files
  form_files=$(grep -rl --include="*.tsx" --include="*.jsx" \
    -e "<form" -e "<Form" -e "useForm" -e "Formik" \
    "$PROJECT_DIR" 2>/dev/null | grep -v node_modules | grep -v '.git/' | grep -v dist | grep -v build | grep -v '.next' | wc -l | tr -d ' ')

  local with_validation
  with_validation=$(grep -rl --include="*.tsx" --include="*.jsx" \
    -e "required" -e "validate" -e "validation" -e "z.object" -e "yup" -e "zod" -e "pattern=" \
    "$PROJECT_DIR" 2>/dev/null | grep -v node_modules | grep -v '.git/' | grep -v dist | grep -v build | grep -v '.next' | wc -l | tr -d ' ')

  echo "| 指标 | 数量 |"
  echo "| --- | --- |"
  echo "| 含表单的文件 | $form_files |"
  echo "| 含校验逻辑的文件 | $with_validation |"
  echo ""

  if [[ "$form_files" -gt "$with_validation" ]]; then
    local gap=$((form_files - with_validation))
    echo -e "${YELLOW}⚠️  约 $gap 个表单文件可能缺少前端校验${NC}"
    TOTAL_FINDINGS=$((TOTAL_FINDINGS + gap))
  fi
  echo ""

  # ── 3. console.error 无用户反馈 ──
  echo "## 3. console.error 无用户反馈 (违反原则 9: 错误恢复)"
  echo ""

  local console_err_count
  console_err_count=$(grep -rn --include="*.tsx" --include="*.ts" --include="*.jsx" --include="*.js" \
    "console\.error\|console\.warn" \
    "$PROJECT_DIR" 2>/dev/null | grep -v node_modules | grep -v '.git/' | grep -v dist | grep -v build | grep -v '.next' | wc -l | tr -d ' ')

  echo "发现 $console_err_count 处 console.error/console.warn 调用。"
  echo ""

  if [[ "$console_err_count" -gt 0 ]]; then
    echo "前 10 处（需人工确认是否有对应的用户反馈）："
    echo ""
    echo '```'
    grep -rn --include="*.tsx" --include="*.ts" --include="*.jsx" --include="*.js" \
      "console\.error\|console\.warn" \
      "$PROJECT_DIR" 2>/dev/null | grep -v node_modules | grep -v '.git/' | grep -v dist | grep -v build | grep -v '.next' | head -10
    echo '```'
    TOTAL_FINDINGS=$((TOTAL_FINDINGS + console_err_count))
  fi
  echo ""

  # ── 4. 缺失 aria 属性 ──
  echo "## 4. 缺失无障碍属性 (违反原则 6: 识别而非回忆)"
  echo ""

  local interactive_no_aria
  interactive_no_aria=$(grep -rl --include="*.tsx" --include="*.jsx" \
    -e "<button" -e "<a " -e "<input" -e "<select" \
    "$PROJECT_DIR" 2>/dev/null | grep -v node_modules | grep -v '.git/' | grep -v dist | grep -v build | grep -v '.next' | wc -l | tr -d ' ')

  local with_aria
  with_aria=$(grep -rl --include="*.tsx" --include="*.jsx" \
    -e "aria-" -e "role=" -e "sr-only" \
    "$PROJECT_DIR" 2>/dev/null | grep -v node_modules | grep -v '.git/' | grep -v dist | grep -v build | grep -v '.next' | wc -l | tr -d ' ')

  echo "| 指标 | 数量 |"
  echo "| --- | --- |"
  echo "| 含交互元素的文件 | $interactive_no_aria |"
  echo "| 含 aria/role 的文件 | $with_aria |"
  echo ""

  # ── 5. 缺失键盘事件处理 ──
  echo "## 5. 缺失键盘事件处理 (违反原则 7: 灵活性与效率)"
  echo ""

  local modal_count
  modal_count=$(grep -rl --include="*.tsx" --include="*.jsx" \
    -e "Modal" -e "Dialog" -e "modal" -e "dialog" -e "Drawer" -e "drawer" \
    "$PROJECT_DIR" 2>/dev/null | grep -v node_modules | grep -v '.git/' | grep -v dist | grep -v build | grep -v '.next' | wc -l | tr -d ' ')

  local with_keydown
  with_keydown=$(grep -rl --include="*.tsx" --include="*.jsx" \
    -e "onKeyDown" -e "onKeyUp" -e "addEventListener.*key" -e "useHotkey" -e "useKeyboard" \
    "$PROJECT_DIR" 2>/dev/null | grep -v node_modules | grep -v '.git/' | grep -v dist | grep -v build | grep -v '.next' | wc -l | tr -d ' ')

  echo "| 指标 | 数量 |"
  echo "| --- | --- |"
  echo "| 含 Modal/Dialog 的文件 | $modal_count |"
  echo "| 含键盘事件处理的文件 | $with_keydown |"
  echo ""

  # ── 汇总 ──
  echo "---"
  echo ""
  echo "## 汇总"
  echo ""
  echo "| 类别 | 启发式原则 | 发现数 |"
  echo "| --- | --- | --- |"
  echo "| 缺失状态处理 | 原则 1 | $fetch_no_loading 个请求文件 |"
  echo "| 表单校验缺失 | 原则 5 | $form_files 个表单文件 |"
  echo "| console.error 无反馈 | 原则 9 | $console_err_count 处 |"
  echo "| 缺失无障碍属性 | 原则 6 | $interactive_no_aria 个交互文件 |"
  echo "| 缺失键盘处理 | 原则 7 | $modal_count 个弹窗文件 |"
  echo ""
  echo "> **注意**：此报告为自动化预扫描结果，需人工深入审查确认。"
  echo "> 详细检查请参考 \`references/usability-heuristics-checklist.md\`。"
}

# ── 输出 ──
if [[ -n "$OUTPUT_FILE" ]]; then
  generate_report > "$OUTPUT_FILE"
  echo -e "${GREEN}报告已生成: $OUTPUT_FILE${NC}"
else
  generate_report
fi
