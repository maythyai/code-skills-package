# 自动化验证层（Automation Validation）——提示词 ↔ 脚本契约

> 本文档定义**机器可执行的治理门禁**与提示词流程的绑定关系。每个门禁对应一个脚本命令、一个退出码语义、一个 JSON 输出 schema、以及消费它的提示词 Phase。
>
> **核心原则**：提示词负责"判断与裁决"（需要 product sense 的部分），脚本负责"确定性检测"（可机器判定的部分）。两者通过 `GATE-REPORT-{date}.json` 交接——脚本产出结构化证据，提示词消费证据做裁决。
>
> **参考实现**：`scripts/validate_gates.py`（auto_content 项目已落地，可作为模板移植到任何 CSP 项目）。

## 一、为什么需要自动化验证层

纯提示词审查的三个固有缺陷：

| 缺陷 | 后果 | 自动化层如何解决 |
|------|------|----------------|
| **判断不可复现** | 同一项目两次审查结论不同 | 脚本对同一输入永远产出同一结果 |
| **证据靠人工搜集** | agent 用 grep 凑数，遗漏系统性问题 | 脚本全量扫描，输出精确计数 |
| **门禁无强制力** | "建议收敛导航"被忽略 | 脚本 exit 1 → CI/流水线硬阻断 |

**分工边界**：
- **脚本做**：计数、存在性、关键词匹配、阈值比较、调用既有 lint/audit 工具
- **提示词做**：定位对齐裁决、支柱归属判断、功能取舍、IA 方向、product sense rationale

## 二、门禁清单（9 个，映射五类根因 Pattern）

| 门禁 | 检测内容 | 根因 Pattern | 脚本/命令 | 阻断级别 | 消费方 |
|------|---------|------------|----------|---------|--------|
| **G-POS** | 定位漂移（to-B 关键词 vs AGENTS.md single-operator） | A | `validate_gates.py --gate G-POS` | 🔴 阻断 | convergence D5 |
| **G-NAV** | 导航预算（顶级 section 数 vs budget=7） | B | `validate_gates.py --gate G-NAV` | 🔴 阻断 | convergence D3 |
| **G-DOC** | DOC-STATUS 新鲜度（last_audit vs today） | E | `validate_gates.py --gate G-DOC` | 🔴 阻断(>60d) | convergence D6.3 |
| **G-FLAG** | Feature Flag 卫生（default-off 死代码 + 定位冲突） | D/A | `validate_gates.py --gate G-FLAG` | 🔴 阻断 | convergence D6.2 |
| **G-PLACEHOLDER** | 占位增长（代码计数 vs registry baseline，只降不增） | C/D | `validate_gates.py --gate G-PLACEHOLDER` | 🔴 阻断 | convergence D6 / 06 release |
| **G-DUAL-NAV** | 多导航源（单一事实源违反） | B | `validate_gates.py --gate G-DUAL-NAV` | 🟡 警告 | convergence D3 |
| **G-CONTRACT** | OpenAPI 契约 + 前端孤儿调用 | C | `scan_contract.py --strict` | 🔴 阻断 | audit Step1 / e2e L4 |
| **G-BUTTON** | 按钮 a11y/onClick 缺失 | C | `button_audit.py` | 🟡 警告 | ui-review 镜头7 / e2e L3 |
| **G-LAYER** | 分层违规（Router/Service 绕过 Repository） | D | `lint_layer.py --strict` | 🔴 阻断 | audit Step1 |

## 三、统一编排命令

```bash
# 全量门禁（收敛闸门 / 审计 pipeline Step 0 调用）
python scripts/validate_gates.py

# 仅 JSON（供提示词程序化消费）
python scripts/validate_gates.py --json

# 单门禁（调试 / 增量）
python scripts/validate_gates.py --gate G-NAV

# 严格模式（任一 ERROR 即 exit 1，用于 CI）
python scripts/validate_gates.py --strict

# 占位 baseline 覆盖（registry 未更新时）
python scripts/validate_gates.py --baseline 42
```

**退出码语义**：
- `0` = 全部 PASS 或仅 WARNING（可继续，但 WARNING 须登记）
- `1` = 至少一个**阻断门禁** ERROR（收敛闸门不通过 / CI 失败）
- `2` = 验证器自身失败（文件缺失/解析错误——不是被审项目的问题）

**报告落点**：`.csp/convergence/GATE-REPORT-{date}.json`

## 四、JSON 输出 Schema（提示词消费契约）

```json
{
  "validator": "validate_gates.py",
  "date": "2026-10-15",
  "summary": {"PASS": 0, "WARNING": 3, "ERROR": 6, "SKIPPED": 0},
  "blocking_errors": ["G-POS", "G-NAV", "G-FLAG", "G-PLACEHOLDER", "G-CONTRACT", "G-LAYER"],
  "verdict": "BLOCKED",
  "gates": [
    {
      "gate": "G-POS",
      "status": "ERROR",
      "pattern": "A",
      "findings": [
        {
          "gate": "G-POS",
          "severity": "ERROR",
          "pattern": "A",
          "message": "Positioning drift: nav exposes to-B features [...] but AGENTS.md declares single-operator",
          "evidence": "sidebar-config.ts keywords: [...]",
          "rule": "AGENTS.md trust model is hard constraint"
        }
      ],
      "metrics": {
        "single_operator_declared": true,
        "drift_hits": {"sidebar": [...], "roadmap": [...], "flags": [...]},
        "total_drift_keywords": 21
      }
    }
  ],
  "report_path": ".csp/convergence/GATE-REPORT-2026-10-15.json"
}
```

**提示词消费规则**：
- `verdict == "BLOCKED"` → 收敛闸门**不通过**，回 roadmap 重排（不是逐个砍功能）
- 每个 `gates[].findings[]` → 转成一条 convergence finding，附 `evidence` + `rule`
- `metrics` → 写入裁决记录的量化依据（如"导航 11 > 预算 7"）
- `blocking_errors` 非空 → 这些门禁对应的功能**禁止进入 01 PRD**

## 五、提示词 ↔ 门禁绑定矩阵

| 提示词 Phase | 调用的门禁 | 用途 |
|-------------|-----------|------|
| **convergence Phase 0**（定位基线） | G-POS | 定位漂移预警，drift>30% → roadmap 回炉 |
| **convergence D3**（IA+导航准入） | G-NAV, G-DUAL-NAV | 导航预算检查，超预算冻结新增顶级导航 |
| **convergence D5**（定位对齐与前提挑战） | G-POS, G-FLAG | 前提挑战的机器证据（冲突 flag/关键词） |
| **convergence D6.2**（Flag 卫生） | G-FLAG | default-off 死代码 + 定位冲突 flag |
| **convergence D6.3**（文档权威） | G-DOC | DOC-STATUS 过期 → 禁止新增功能 |
| **convergence Phase 3**（五类 Pattern） | 全部 | A→G-POS, B→G-NAV/G-DUAL-NAV, C→G-PLACEHOLDER/G-CONTRACT/G-BUTTON, D→G-FLAG/G-LAYER, E→G-DOC |
| **audit-pipeline Step 0.5**（环境自检后） | 全部 | 既有 findings 基线 + 门禁快照 |
| **audit Step 1** | G-CONTRACT, G-LAYER | 工程结构体检的机器证据 |
| **e2e L3/L4** | G-BUTTON, G-CONTRACT | 按钮审计 + 孤儿路由 |
| **ui-review 镜头 7** | G-BUTTON | a11y 机器证据 |
| **06 release** | G-PLACEHOLDER, G-DOC | 发布前占位/文档新鲜度门禁 |

## 六、移植到新项目（模板化）

`validate_gates.py` 是**项目特定**的（路径/关键词/阈值硬编码到 auto_content 结构）。移植到新模式：

1. **复制脚本**到目标项目 `scripts/validate_gates.py`
2. **调整路径常量**（`SIDEBAR_CONFIG` / `FEATURE_FLAGS` / `DOC_STATUS` 等指向目标项目实际文件）
3. **调整关键词**（`TO_B_KEYWORDS` 按目标项目定位修改；如目标是 to-B 产品则反转检测 to-C 关键词）
4. **调整阈值**（`NAV_BUDGET` / `DOC_STALE_*_DAYS` / `PLACEHOLDER_BASELINE_DEFAULT`）
5. **委托门禁**（G-CONTRACT/G-BUTTON/G-LAYER）指向目标项目既有脚本，无则标 SKIPPED

> 提示词层（convergence/audit-pipeline/prevention-norms）**保持项目无关**——它们引用门禁 ID（G-POS 等）和 JSON schema，不引用具体脚本路径。脚本层项目特定，提示词层通用。

## 七、CI 集成（可选，强化强制力）

```yaml
# .github/workflows/gates.yml（示例）
name: governance-gates
on: [pull_request, push]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: python scripts/validate_gates.py --strict --json > gate-report.json
      - name: Block on ERROR
        if: failure()
        run: |
          echo "::error::Governance gates BLOCKED — see gate-report.json"
          cat gate-report.json
      - uses: actions/upload-artifact@v4
        with: {name: gate-report, path: gate-report.json}
```

**分层执行**（对齐 prevention-norms.md G1-G5）：
- PR 级（快，≤30s）：G-NAV, G-DOC, G-FLAG, G-PLACEHOLDER, G-DUAL-NAV（纯文本解析）
- Push 级（中，≤2min）：+ G-POS, G-CONTRACT, G-LAYER（需 import 后端）
- Release 级（全量）：+ G-BUTTON + 既有 G1-G5

## 八、与既有脚本的关系（不重复造轮子）

auto_content 已有脚本，validate_gates.py **委托**而非重写：

| 既有脚本 | 被委托为 | 说明 |
|---------|---------|------|
| `scan_contract.py --strict` | G-CONTRACT | OpenAPI 契约 + 前端孤儿 |
| `button_audit.py` | G-BUTTON | 按钮 a11y/onClick |
| `lint_layer.py --strict` | G-LAYER | 分层违规 |
| `orphan_ast_classify.py` | （未委托，e2e L4 直接用） | AST 孤儿分类 |
| `check_skeleton_registry.sh` | （未委托） | 骨架屏注册 |

**新增门禁**（既有脚本未覆盖）：G-POS, G-NAV, G-DOC, G-FLAG, G-PLACEHOLDER, G-DUAL-NAV —— 这些是治理级门禁，填补了"功能准入"的自动化空白。

## 九、约束与边界

- **脚本不裁决，只检测**：G-POS 报"nav 有变现关键词"是事实；"该不该砍变现功能"是 convergence D5 的 product sense 裁决。脚本输出是证据，不是结论。
- **阈值可调但有默认**：NAV_BUDGET=7、DOC_STALE 30/60d、PLACEHOLDER baseline 从 registry 读。改阈值须在 convergence 报告声明理由。
- **SKIPPED ≠ PASS**：文件缺失/脚本不存在 → SKIPPED，须登记解除条件，不当作通过。
- **委托脚本失败不静默**：G-CONTRACT/G-LAYER 的 exit≠0 → ERROR，不因为"是委托的"就降级。
- **报告幂等**：同日重跑覆盖 `GATE-REPORT-{date}.json`；跨日保留历史。