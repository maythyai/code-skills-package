#!/usr/bin/env python3
"""
account-research toolkit — account-research skill 辅助工具包
与 account-research orchestrator SKILL.md v1.0 对齐

用途：数据持久化、schema 校验、跨文档一致性检查
定位：辅助工具（推荐执行，非强制），LLM 执行环境不可用时退回手动自检

命令列表：
  init-workspace    创建 .csp/account-research/state 目录树
  validate-brief    校验 brief.json 必填字段
  append-score      追加/更新 L2 评分到 CSV
  tally-layers      从 CSV 按阈值统计 A/B/C 分层
  gate-check        Phase 前置条件门禁校验
  check-consistency 跨文档数字/公司名一致性检查
  check-naming      产品名称合规扫描
  build-panorama    合并 L2/L3/L4 数据为 D6 宽表
  update-progress   更新 progress.json
  dedup-check       检测单文档内部重复段落
  evidence-ratio    统计 [F]/[I]/[A]/[E] 标签配比
  changelog-append  追加标准格式 CHANGELOG 记录
  dual-source-check 检查重要判定是否满足双源验证
  save-batch-snapshot 保存批次评分快照（跨批一致性）
  check-batch-drift   检测批次间评分漂移
  citation-trace    报告/画像中 [F] 标签条目在 search_evidence 中的引用溯源校验
  validate-config   校验 brief.json 必填字段是否齐备
  stats-evidence    统计 [F]/[I]/[A]/[E] 证据标签配比
  check-temporal    按 brief.time_window_months 检查文档内日期标注是否超窗口
  check-dedup       跨多个 .md 文件按段落指纹检测疑似重复
  check-structure   检查MR项目目录结构合规性（目录/文件放置/关键交付物）
  claim-trace       报告中事实性声明在 evidence 中的溯源校验（数字/专有名词匹配）
  temporal-check    按 run-date 检查文档中日期引用是否过期未标注（12 个月阈值）
  fix-csv           修复 CSV 编码：补 BOM，必要时将 GBK 重编为 utf-8-sig（原文件备份为 *.csv.bak）
"""

import argparse
import csv
import hashlib
import json
import os
import re
import statistics
import sys
from collections import Counter
from datetime import date, datetime, timezone
from pathlib import Path

PLACEHOLDER_BLACKLIST = ["未确认", "待补充", "默认", "TBD", "N/A", ""]


# ─── 1. init-workspace ───────────────────────────────────────────────────────

def cmd_init_workspace(args):
    # Deliverables + process archive live under docs/account-research/ (human-facing,
    # versioned, CSP-conventional). Runtime state (brief/progress) lives under
    # .csp/account-research/state/<slug>/ (gitignored, machine-local).
    deliverables_root = Path.cwd() / "docs" / "account-research"
    runtime_root = Path.cwd() / ".csp" / "account-research" / "state" / args.slug
    deliverable_dirs = [
        "battle-handbook/supporting",
        "decision-support/supporting",
        "methodology/supporting",
        "process-archive/validation-batches",
    ]
    created = []
    for d in deliverable_dirs:
        p = deliverables_root / d
        if not p.exists():
            p.mkdir(parents=True, exist_ok=True)
            created.append(str(p))

    runtime_root.mkdir(parents=True, exist_ok=True)
    progress = runtime_root / "progress.json"
    if not progress.exists():
        progress.write_text("{}", encoding="utf-8")
        created.append(str(progress))

    changelog = deliverables_root / "CHANGELOG.md"
    if not changelog.exists():
        changelog.write_text("# CHANGELOG\n", encoding="utf-8")
        created.append(str(changelog))

    if created:
        print("已创建：")
        for c in created:
            print(f"  {c}")
    else:
        print("所有目录和文件已存在，无需创建。")


# ─── 2. validate-brief ───────────────────────────────────────────────────────

def cmd_validate_brief(args):
    path = Path(args.path)
    if not path.exists():
        print(f"[FAIL] 文件不存在: {path}")
        sys.exit(1)
    try:
        data = json.loads(path.read_text(encoding="utf-8-sig"))
    except json.JSONDecodeError as e:
        print(f"[FAIL] JSON 解析失败: {e}")
        sys.exit(1)

    required = ["user_role", "audience", "depth", "industry_name", "products", "execution_path"]
    failures = []
    for field in required:
        val = data.get(field)
        if val is None:
            failures.append(f"{field}: 缺失")
        elif isinstance(val, str) and val.strip() in PLACEHOLDER_BLACKLIST:
            failures.append(f"{field}: 占位词 '{val}'")
        elif field == "products":
            if not isinstance(val, list) or len(val) < 1:
                failures.append(f"products: 必须为非空数组")
            else:
                for i, item in enumerate(val):
                    for k in ("name", "positioning", "source"):
                        v = item.get(k, "")
                        if not v or v.strip() in PLACEHOLDER_BLACKLIST:
                            failures.append(f"products[{i}].{k}: 缺失或占位词")

    if failures:
        print("[FAIL] 以下字段不合规：")
        for f in failures:
            print(f"  - {f}")
        sys.exit(1)
    else:
        print("[PASS] brief.json 校验通过")


# ─── 3. append-score ─────────────────────────────────────────────────────────

def cmd_append_score(args):
    csv_path = Path(args.csv)
    header = ["公司名", "总分", "分层", "批次", "证据摘要", "更新时间"]
    rows = []

    if csv_path.exists():
        with open(csv_path, "r", encoding="utf-8-sig", newline="") as f:
            reader = csv.DictReader(f)
            rows = list(reader)

    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    new_row = {
        "公司名": args.company, "总分": str(args.score), "分层": args.layer,
        "批次": str(args.batch), "证据摘要": args.evidence, "更新时间": now
    }

    updated = False
    for i, r in enumerate(rows):
        if r.get("公司名") == args.company:
            rows[i] = new_row
            updated = True
            break
    if not updated:
        rows.append(new_row)

    csv_path.parent.mkdir(parents=True, exist_ok=True)
    with open(csv_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=header)
        writer.writeheader()
        writer.writerows(rows)

    batch_rows = [r for r in rows if r.get("批次") == str(args.batch)]
    avg = sum(int(r["总分"]) for r in batch_rows) / len(batch_rows) if batch_rows else 0
    print(f"已写入: {args.company} | 当前CSV共 {len(rows)} 行 | 批次 {args.batch} 均分: {avg:.1f}")


# ─── 4. tally-layers ─────────────────────────────────────────────────────────

def cmd_tally_layers(args):
    csv_path = Path(args.csv)
    if not csv_path.exists():
        print(f"[FAIL] CSV 不存在: {csv_path}")
        sys.exit(1)

    with open(csv_path, "r", encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))

    scores = [int(r["总分"]) for r in rows]
    a = sum(1 for s in scores if s >= args.threshold_a)
    b = sum(1 for s in scores if args.threshold_b <= s < args.threshold_a)
    c = sum(1 for s in scores if s < args.threshold_b)
    result = {
        "total": len(scores), "A": a, "B": b, "C": c,
        "avg_score": round(sum(scores) / len(scores), 1) if scores else 0,
        "max": max(scores) if scores else 0, "min": min(scores) if scores else 0
    }
    print(json.dumps(result, ensure_ascii=False))


# ─── 5. gate-check ───────────────────────────────────────────────────────────

def cmd_gate_check(args):
    path = Path(args.progress)
    if not path.exists():
        print(f"[FAIL] 文件不存在: {path}")
        sys.exit(1)

    data = json.loads(path.read_text(encoding="utf-8-sig"))
    gate_map = {
        1: ("phase_0", "confirmed"),
        2: ("phase_1", "name_verified"),
        3: ("phase_2", "confirmed"),
        4: ("phase_3", "confirmed"),
        5: ("phase_4", "confirmed"),
    }
    target = args.target_phase
    if target not in gate_map:
        print(f"[FAIL] 不支持的 Phase 编号: {target}（支持 1-5）")
        sys.exit(1)

    phase_key, field = gate_map[target]
    phase_data = data.get(phase_key, {})
    if phase_data.get(field) is True:
        print(f"[PASS] Phase {target} 门禁通过")
    else:
        print(f"[FAIL] 前置条件未满足: {phase_key}.{field} != true")
        sys.exit(1)


# ─── 6. check-consistency ────────────────────────────────────────────────────

def cmd_check_consistency(args):
    ws = Path(args.workspace)
    if not ws.exists():
        print(f"[FAIL] workspace 不存在: {ws}")
        sys.exit(1)

    md_files = list(ws.rglob("*.md"))
    layer_pattern = re.compile(r"(\d+)\s*家\s*([ABC])层")
    layer_counts = {}  # {"A": {file: num, ...}, ...}

    for md in md_files:
        text = md.read_text(encoding="utf-8", errors="ignore")
        for m in layer_pattern.finditer(text):
            num, layer = int(m.group(1)), m.group(2)
            layer_counts.setdefault(layer, []).append((md.name, num))

    warnings = []
    for layer, entries in layer_counts.items():
        nums = set(n for _, n in entries)
        if len(nums) > 1:
            details = ", ".join(f"{f}={n}" for f, n in entries)
            warnings.append(f"{layer}层数字不一致: {details}")

    # 检查 D6 CSV 行数
    d6_csv = ws / "docs/account-research/battle-handbook" / "supporting" / "公司全景表.csv"
    if d6_csv.exists():
        with open(d6_csv, "r", encoding="utf-8-sig", newline="") as f:
            csv_count = sum(1 for _ in f) - 1
        total_pattern = re.compile(r"总样本[^\d]*(\d+)")
        for md in md_files:
            text = md.read_text(encoding="utf-8", errors="ignore")
            for m in total_pattern.finditer(text):
                doc_total = int(m.group(1))
                if doc_total != csv_count:
                    warnings.append(f"总样本数不一致: {md.name}={doc_total}, D6 CSV={csv_count}")

    if warnings:
        print(f"[WARN] 发现 {len(warnings)} 处不一致：")
        for w in warnings:
            print(f"  - {w}")
    else:
        print("[PASS] 跨文档一致性检查通过")


# ─── 7. check-naming ─────────────────────────────────────────────────────────

def cmd_check_naming(args):
    ws = Path(args.workspace)
    brief_path = Path(args.brief)
    if not brief_path.exists():
        print(f"[FAIL] brief.json 不存在: {brief_path}")
        sys.exit(1)

    data = json.loads(brief_path.read_text(encoding="utf-8-sig"))
    nc = data.get("naming_compliance")
    if not nc or "forbidden_names" not in nc:
        print("[SKIP] brief.json 未配置 naming_compliance，跳过检查")
        return

    forbidden = nc["forbidden_names"]
    if not forbidden:
        print("[PASS] 产品名称合规")
        return

    violations = []
    for ext in ("*.md", "*.csv"):
        for fp in ws.rglob(ext):
            try:
                lines = fp.read_text(encoding="utf-8", errors="ignore").splitlines()
            except Exception:
                continue
            for i, line in enumerate(lines, 1):
                for word in forbidden:
                    if word.lower() in line.lower():
                        violations.append(f"文件: {fp.relative_to(ws)} 行 {i}: \"{word}\"")

    if violations:
        print("[FAIL] 发现违规：")
        for v in violations:
            print(f"  {v}")
        sys.exit(1)
    else:
        print("[PASS] 产品名称合规")


# ─── 8. build-panorama ───────────────────────────────────────────────────────

def cmd_build_panorama(args):
    ws = Path(args.workspace)
    l2_csv = ws / "docs/account-research/process-archive" / "L2_全量信号扫描.csv"
    if not l2_csv.exists():
        print(f"[FAIL] L2 CSV 不存在: {l2_csv}")
        sys.exit(1)

    with open(l2_csv, "r", encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    out_header = ["公司名", "分层", "L2总分", "批次", "备注"]

    with open(output, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=out_header)
        writer.writeheader()
        for r in rows:
            writer.writerow({
                "公司名": r.get("公司名", ""),
                "分层": r.get("分层", ""),
                "L2总分": r.get("总分", ""),
                "批次": r.get("批次", ""),
                "备注": "",
            })

    print(f"D6 全景表已生成: {output} (共 {len(rows)} 行)")


# ─── 9. update-progress ──────────────────────────────────────────────────────

def cmd_update_progress(args):
    path = Path(args.progress)
    path.parent.mkdir(parents=True, exist_ok=True)
    data = {}
    if path.exists():
        data = json.loads(path.read_text(encoding="utf-8-sig"))

    phase_key = f"phase_{args.phase}"
    confirmed = "confirmed" in args.status.lower()
    products = [p.strip() for p in args.products.split(",") if p.strip()] if args.products else []
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    data[phase_key] = {
        "status": args.status,
        "confirmed": confirmed,
        "products": products,
        "updated_at": now,
    }

    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"progress.json 已更新: {phase_key} = {args.status}")


# ─── 新增命令：dedup-check ───────────────────────────────────────────────

def cmd_dedup_check(args):
    """检测单文档内部是否存在重复段落（连续3句以上近似相同）"""
    file_path = Path(args.file)
    if not file_path.exists():
        print(f"[FAIL] 文件不存在: {file_path}")
        sys.exit(1)

    content = file_path.read_text(encoding="utf-8-sig", errors="replace")
    lines = [l.strip() for l in content.splitlines() if l.strip() and not l.strip().startswith("#")]

    # 抽取句子（按句号/换行分割，去掉太短的）
    sentences = []
    for line in lines:
        parts = re.split(r'[\u3002\uff1b\n]', line)
        for p in parts:
            p = p.strip()
            if len(p) >= 15:  # 只检测 15 字以上的句子
                sentences.append(p)

    duplicates = []
    seen = {}
    for i, s in enumerate(sentences):
        # 简化比较：去掉标点和空格后比较
        normalized = re.sub(r'[\s\u3000、\uff0c\uff1a\uff1b\u2014\-\(\)\[\]]', '', s)
        if normalized in seen:
            duplicates.append((seen[normalized], i, s[:50]))
        else:
            seen[normalized] = i

    if not duplicates:
        print(f"[PASS] 文档内部无重复: {file_path.name}")
    else:
        print(f"[WARN] 发现 {len(duplicates)} 处疑似重复:")
        for first_idx, dup_idx, preview in duplicates[:10]:
            print(f"  句 {first_idx+1} ↔ 句 {dup_idx+1}: \"{preview}...\"")
        if len(duplicates) > 10:
            print(f"  ... 及其余 {len(duplicates)-10} 处")


# ─── 新增命令：evidence-ratio ───────────────────────────────────────────

def cmd_evidence_ratio(args):
    """统计文档中 [F]/[I]/[A]/[E] 标签的出现比例"""
    file_path = Path(args.file)
    if not file_path.exists():
        print(f"[FAIL] 文件不存在: {file_path}")
        sys.exit(1)

    content = file_path.read_text(encoding="utf-8-sig", errors="replace")

    # 同时匹配英文标签和中文标签
    f_count = len(re.findall(r'\[F\]|\[确认\]', content))
    i_count = len(re.findall(r'\[I\]|\[强推断\]', content))
    a_count = len(re.findall(r'\[A\]|\[弱推断\]', content))
    e_count = len(re.findall(r'\[E\]|\[信息缺失\]', content))

    total = f_count + i_count + a_count + e_count
    if total == 0:
        print(f"[WARN] 未检测到任何证据标签: {file_path.name}")
        return

    fia = f_count + i_count + a_count
    fia_pct = round(fia / total * 100, 1)
    e_pct = round(e_count / total * 100, 1)

    result = {
        "file": file_path.name,
        "total_labels": total,
        "F": f_count, "I": i_count, "A": a_count, "E": e_count,
        "FIA_percent": fia_pct,
        "E_percent": e_pct,
        "pass": fia_pct >= 80
    }
    print(json.dumps(result, ensure_ascii=False))

    if fia_pct < 80:
        print(f"[FAIL] [F]+[I]+[A] = {fia_pct}% < 80%，不满足配比要求")
        sys.exit(1)
    else:
        print(f"[PASS] [F]+[I]+[A] = {fia_pct}% >= 80%")


# ─── 新增命令：changelog-append ─────────────────────────────────────────

def cmd_changelog_append(args):
    """往 CHANGELOG.md 追加一条标准格式记录"""
    path = Path(args.changelog)
    if not path.exists():
        path.write_text("# CHANGELOG\n", encoding="utf-8")

    now = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    products = args.products if args.products else "无"
    decision = args.decision if args.decision else "无"
    snapshot = args.snapshot if args.snapshot else "无"

    entry = f"""\n## Phase {args.phase} — {args.name} | {now}\n\n- 产物：{products}\n- 关键决策：{decision}\n- 数据快照：{snapshot}\n"""

    existing = path.read_text(encoding="utf-8-sig", errors="replace")
    path.write_text(existing + entry, encoding="utf-8")
    print(f"CHANGELOG.md 已追加: Phase {args.phase} - {args.name}")


# ─── 新增命令：dual-source-check ───────────────────────────────────────

def cmd_dual_source_check(args):
    """检查重要判定（分层变动、竞对深度绑定）是否引用了 >=2 条独立来源"""
    file_path = Path(args.file)
    if not file_path.exists():
        print(f"[FAIL] 文件不存在: {file_path}")
        sys.exit(1)

    content = file_path.read_text(encoding="utf-8-sig", errors="replace")

    # 匹配分层变动标志
    layer_change_patterns = [
        r'[A-C]\s*[→→➜→\-\>]+\s*[A-C]',  # A→B, B→A 等
        r'升[为到至]\s*[A-C][层级]',  # 升为A层
        r'降[为到至]\s*[A-C][层级]',  # 降为C层
        r'深度绑定',  # 竞对深度绑定
        r'竞对.*绑定',
    ]

    # 找到所有包含重要判定的段落
    paragraphs = re.split(r'\n\s*\n', content)
    issues = []

    for i, para in enumerate(paragraphs):
        has_key_judgment = any(re.search(p, para) for p in layer_change_patterns)
        if not has_key_judgment:
            continue

        # 统计该段落中的 [F]/[I] 来源数量
        fi_count = len(re.findall(r'\[F\]|\[I\]|\[确认\]|\[强推断\]', para))
        if fi_count < 2:
            # 提取段落前 50 字作为预览
            preview = para.strip()[:60].replace('\n', ' ')
            issues.append(f"段落 {i+1}: 只有 {fi_count} 条 [F]/[I] 来源 | \"{preview}...\"")

    if not issues:
        print(f"[PASS] 重要判定均满足双源验证: {file_path.name}")
    else:
        print(f"[WARN] 发现 {len(issues)} 处重要判定可能未满足双源验证:")
        for issue in issues:
            print(f"  {issue}")


# ─── 新增命令：citation-trace ──────────────────────────────

def cmd_citation_trace(args):
    """报告/画像中 [F] 标签条目的引用溯源校验。

    逻辑同 CI 侧 citation-trace：提取报告中 [F] 行，取核心关键词（去标签和来源后前 30 字），
    在 evidence-dir 所有 JSON 文件的 results[].snippet 中搜索。输出 PASS 或 WARN + 未匹配清单。
    """
    report_path = Path(args.report)
    evidence_dir = Path(args.evidence_dir)

    if not report_path.exists():
        print(f"[FAIL] 报告文件不存在: {report_path}")
        sys.exit(1)
    if not evidence_dir.is_dir():
        print(f"[FAIL] 证据目录不存在: {evidence_dir}")
        sys.exit(1)

    report_lines = report_path.read_text(encoding="utf-8-sig", errors="replace").split("\n")

    # 加载证据语料库
    evidence_corpus = []
    evidence_files = list(evidence_dir.rglob("*.json"))
    for ev_path in evidence_files:
        try:
            ev_data = json.loads(ev_path.read_text(encoding="utf-8-sig"))
        except (json.JSONDecodeError, OSError):
            continue
        records = ev_data if isinstance(ev_data, list) else [ev_data]
        for rec in records:
            if not isinstance(rec, dict):
                continue
            results = rec.get("results", [])
            if isinstance(results, list):
                for r in results:
                    if isinstance(r, dict):
                        snippet = str(r.get("snippet", "")) + " " + str(r.get("title", ""))
                        evidence_corpus.append((ev_path.name, snippet))

    if not evidence_corpus:
        print(f"[WARN] 证据目录 {evidence_dir} 内无可用 JSON 片段")
        return

    # 提取 [F]（或中文 [确认]）标签行
    f_pattern = re.compile(r"\[F\]|\[确认\]")
    f_lines = []
    for i, line in enumerate(report_lines, 1):
        if f_pattern.search(line):
            f_lines.append((i, line))

    if not f_lines:
        print(f"[WARN] {report_path.name} 中未发现 [F] 标签条目")
        return

    def extract_keyword(line):
        text = line
        text = re.sub(r"\[[FIAE]\]", "", text)
        text = re.sub(r"\[确认\]|\[强推断\]|\[弱推断\]|\[信息缺失\]", "", text)
        text = re.sub(r"\[T[123]\]", "", text)
        text = re.sub(r"\[C[123]\]", "", text)
        text = re.sub(r"来源[:：][^|｜\n]*", "", text)
        text = re.sub(r"时间[:：][^|｜\n]*", "", text)
        text = re.sub(r"^[\s\-\*\+\d\.\)#>|]+", "", text)
        return text.strip()[:30]

    matched = []
    unmatched = []
    for line_no, line in f_lines:
        kw = extract_keyword(line)
        if not kw:
            unmatched.append((line_no, line.strip()[:60], "无可提取关键词"))
            continue
        anchor = kw[:8] if len(kw) >= 8 else kw
        hit = any(anchor in snippet for _, snippet in evidence_corpus)
        if hit:
            matched.append((line_no, kw))
        else:
            unmatched.append((line_no, line.strip()[:60], kw))

    total = len(f_lines)
    n_matched = len(matched)
    n_unmatched = len(unmatched)

    print(f"=== 引用溯源校验 ({report_path.name}) ===")
    print(f"证据目录: {evidence_dir} | 加载 {len(evidence_files)} 个 JSON / {len(evidence_corpus)} 条片段")
    print(f"[F] 条目总数: {total} | 有证据锚点: {n_matched} | 未找到锚点: {n_unmatched}")

    if n_unmatched == 0:
        print(f"PASS: {n_matched}/{total} 条 [F] 信息有证据支撑")
    else:
        print(f"WARN: {n_unmatched}/{total} 条 [F] 信息未找到证据锚点（需人工确认是否引用断链）")
        for line_no, preview, kw in unmatched[:15]:
            print(f"  行{line_no}: 关键词「{kw}」未匹配 | {preview}")
        if n_unmatched > 15:
            print(f"  ... 及其余 {n_unmatched - 15} 条")


# ─── 新增命令：validate-config / stats-evidence / check-temporal / check-dedup ───

def cmd_validate_config(args):
    """校验 brief.json 必填字段是否存在且非空。

    必填字段：project_name, industry, target_products(数组非空),
               competitors(数组非空), l1_pool_source
    """
    config_path = Path(args.config)
    if not config_path.exists():
        print(f"FAIL: 文件不存在: {config_path}")
        sys.exit(1)
    try:
        cfg = json.loads(config_path.read_text(encoding="utf-8-sig"))
    except json.JSONDecodeError as e:
        print(f"FAIL: JSON 解析失败: {e}")
        sys.exit(1)

    array_fields = ("target_products", "competitors")
    string_fields = ("project_name", "industry", "l1_pool_source")
    missing = []

    for field in string_fields:
        val = cfg.get(field)
        if val is None or (isinstance(val, str) and not val.strip()):
            missing.append(field)

    for field in array_fields:
        val = cfg.get(field)
        if not isinstance(val, list) or len(val) == 0:
            missing.append(field)

    if missing:
        print(f"FAIL: 缺失字段: {missing}")
        sys.exit(1)
    else:
        print("PASS: brief.json 5项必填字段校验通过")
        sys.exit(0)


def cmd_stats_evidence(args):
    """统计 [F]/[I]/[A]/[E] 证据标签配比，[E]>20% 输出 WARN。"""
    file_path = Path(args.file)
    if not file_path.exists():
        print(f"FAIL: 文件不存在: {file_path}")
        sys.exit(1)

    content = file_path.read_text(encoding="utf-8-sig", errors="replace")
    f_count = len(re.findall(r"\[F\]|\[确认\]", content))
    i_count = len(re.findall(r"\[I\]|\[强推断\]", content))
    a_count = len(re.findall(r"\[A\]|\[弱推断\]", content))
    e_count = len(re.findall(r"\[E\]|\[信息缺失\]", content))
    total = f_count + i_count + a_count + e_count

    print("证据标签统计:")
    if total == 0:
        print("[F]: 0条 (0%)")
        print("[I]: 0条 (0%)")
        print("[A]: 0条 (0%)")
        print("[E]: 0条 (0%)")
        print("总计: 0条")
        print("WARN: 未检测到任何证据标签")
        sys.exit(0)

    f_pct = round(f_count / total * 100)
    i_pct = round(i_count / total * 100)
    a_pct = round(a_count / total * 100)
    e_pct_int = round(e_count / total * 100)
    print(f"[F]: {f_count}条 ({f_pct}%)")
    print(f"[I]: {i_count}条 ({i_pct}%)")
    print(f"[A]: {a_count}条 ({a_pct}%)")
    print(f"[E]: {e_count}条 ({e_pct_int}%)")
    print(f"总计: {total}条")
    if e_pct_int <= 20:
        print("PASS: [E]配比达标")
    else:
        print(f"WARN: [E]占比{e_pct_int}%，超过20%阈值，需补搜")
    sys.exit(0)


def _shift_months(d, months):
    y = d.year
    m = d.month - months
    while m <= 0:
        m += 12
        y -= 1
    day = min(d.day, 28)
    return date(y, m, day)


def cmd_check_temporal(args):
    """检查文档中所有 yyyy-mm 日期标注是否在时间窗口内。

    基准日期：brief.run_date（如有）否则取脚本运行当日；
    窗口月数：brief.time_window_months（如有）否则默认 6。
    """
    file_path = Path(args.file)
    config_path = Path(args.config)
    if not file_path.exists():
        print(f"FAIL: 文件不存在: {file_path}")
        sys.exit(1)
    if not config_path.exists():
        print(f"FAIL: 配置不存在: {config_path}")
        sys.exit(1)

    try:
        cfg = json.loads(config_path.read_text(encoding="utf-8-sig"))
    except json.JSONDecodeError as e:
        print(f"FAIL: brief.json 解析失败: {e}")
        sys.exit(1)

    months = cfg.get("time_window_months", 6)
    try:
        months = int(months)
    except Exception:
        months = 6

    run_date_str = cfg.get("run_date", "")
    run_date = None
    if isinstance(run_date_str, str) and run_date_str.strip():
        try:
            y, mo, d = run_date_str.split("-")
            run_date = date(int(y), int(mo), int(d))
        except Exception:
            run_date = None
    if run_date is None:
        run_date = date.today()

    window_start = _shift_months(run_date, months)

    lines = file_path.read_text(encoding="utf-8-sig", errors="replace").split("\n")
    date_pattern = re.compile(r"(20\d{2})-(0[1-9]|1[0-2])")
    out_of_window = []
    for i, line in enumerate(lines, 1):
        for m in date_pattern.finditer(line):
            yy, mm = int(m.group(1)), int(m.group(2))
            try:
                tag_date = date(yy, mm, 1)
            except ValueError:
                continue
            if tag_date < date(window_start.year, window_start.month, 1):
                out_of_window.append((i, f"{yy:04d}-{mm:02d}", line.strip()[:60]))

    print(f"=== 时间窗口检查 ({file_path.name}) ===")
    print(f"窗口范围: {window_start.strftime('%Y-%m')} ~ {run_date.strftime('%Y-%m-%d')} (近{months}个月)")

    if not out_of_window:
        print("PASS: 所有日期标注均在时间窗口内")
    else:
        print(f"WARN: 发现{len(out_of_window)}条超窗口信息:")
        for line_no, dt, preview in out_of_window[:20]:
            print(f"  行{line_no}: {dt} | {preview}")
        if len(out_of_window) > 20:
            print(f"  ... 及其余 {len(out_of_window) - 20} 条")
    sys.exit(0)


def cmd_check_dedup(args):
    """按段落（空行分隔）指纹检测目录内多个 .md 文件之间的疑似重复。"""
    dir_path = Path(args.dir)
    min_chars = int(args.min_chars)
    if not dir_path.is_dir():
        print(f"FAIL: 目录不存在: {dir_path}")
        sys.exit(1)

    md_files = list(dir_path.rglob("*.md"))
    if not md_files:
        print(f"WARN: 目录中未找到 .md 文件: {dir_path}")
        sys.exit(0)

    fingerprints = {}
    for fp in md_files:
        try:
            text = fp.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        paragraphs = re.split(r"\n\s*\n", text)
        for para in paragraphs:
            stripped = para.strip()
            normalized = re.sub(r"\s+", "", stripped)
            if len(normalized) < min_chars:
                continue
            fingerprint = normalized[:min_chars]
            preview = stripped.replace("\n", " ")[:30]
            fingerprints.setdefault(fingerprint, []).append((fp.name, preview))

    duplicates = [(k, v) for k, v in fingerprints.items()
                  if len({f for f, _ in v}) >= 2]

    if not duplicates:
        print("PASS: 未检测到跨文件重复段落")
        sys.exit(0)

    print(f"WARN: 发现{len(duplicates)}处疑似重复:")
    for _, files in duplicates[:20]:
        file_list = ", ".join(sorted({f for f, _ in files}))
        preview = files[0][1]
        print(f"  [{file_list}] {preview}...")
    if len(duplicates) > 20:
        print(f"  ... 及其余 {len(duplicates) - 20} 处")
    sys.exit(0)


# ─── 新增命令：check-structure ──────────────────────────────────────────────

def _check_phase_output(workspace, phase):
    """检查指定Phase的产出是否已落盘到docs/account-research/process-archive"""
    archive_dir = os.path.join(workspace, "docs/account-research/process-archive")
    if not os.path.isdir(archive_dir):
        print(f"[WARN] Phase {phase} 落盘检查: docs/account-research/process-archive/ 目录不存在")
        return 1

    # 递归收集docs/account-research/process-archive下所有文件名（含子目录）
    all_files = []
    for root, dirs, files in os.walk(archive_dir):
        for f in files:
            all_files.append(f.lower())

    # 各Phase的关键词（文件名中包含任一关键词即视为该Phase产出存在）
    phase_keywords = {
        1: ["l1", "初始池"],
        2: ["l2", "信号扫描", "分层", "搜索过程"],
        3: ["l3", "轻度调研", "升降层", "搜索过程"],
        4: ["l4", "对比分析", "深度调研", "搜索过程"],
    }

    keywords = phase_keywords.get(phase, [])
    found = any(
        any(kw in fname for kw in keywords)
        for fname in all_files
    )

    if found:
        print(f"[PASS] Phase {phase} 落盘确认: docs/account-research/process-archive/ 中已有对应产出文件")
        return 0
    else:
        print(f"[WARN] Phase {phase} 落盘检查: docs/account-research/process-archive/ 中未找到Phase {phase}相关文件（关键词: {keywords}）")
        print(f"       请确认本Phase产出是否已写入 docs/account-research/process-archive/ 目录")
        return 1


def cmd_check_structure(args):
    """检查 MR 项目目录结构合规性。

    检查项：
      1. 必要目录存在性（01/02/03/99 及对应 supporting/）
      2. 文件放置正确性（L1-L4 不应出现在 01/02；D2-D8 不应出现在 01）
      3. 关键交付物存在性（D1/D2 模糊匹配 + L2 过程文件 + CHANGELOG/README）
      4. docs/account-research/process-archive/ 非空检查

    退出码：0=全PASS / 1=有WARN / 2=有FAIL
    """
    if args.phase is not None and args.phase != 5:
        rc = _check_phase_output(args.workspace, args.phase)
        sys.exit(rc)

    ws = Path(args.workspace)
    print("=== MR Structure Check ===")
    print(f"项目根目录: {ws}")
    print()

    if not ws.exists() or not ws.is_dir():
        print(f"[FAIL] workspace 不存在或不是目录: {ws}")
        print()
        print("总结: 1 FAIL / 0 WARN / 0 PASS")
        sys.exit(2)

    fail_count = 0
    warn_count = 0
    pass_count = 0

    # 1. 必要目录存在性
    required_dirs = [
        "docs/account-research/battle-handbook",
        "docs/account-research/battle-handbook/supporting",
        "docs/account-research/decision-support",
        "docs/account-research/decision-support/supporting",
        "docs/account-research/methodology",
        "docs/account-research/methodology/supporting",
        "docs/account-research/process-archive",
    ]
    missing_dirs = [d for d in required_dirs if not (ws / d).is_dir()]
    if missing_dirs:
        warn_count += 1
        print(f"[WARN] 目录结构: 缺少 {len(missing_dirs)} 个必要目录")
        for d in missing_dirs:
            print(f"  - {d}/ 不存在")
    else:
        pass_count += 1
        print("[PASS] 目录结构: 所有必要目录已创建")

    # 2. 文件放置正确性
    misplaced = []
    process_pattern = re.compile(r"^L[1-4][_\-\s]", re.IGNORECASE)
    d28_pattern = re.compile(r"^D[2-58]\b|^D[2-58][_\-\s]", re.IGNORECASE)

    for target in ("docs/account-research/battle-handbook", "docs/account-research/decision-support"):
        target_dir = ws / target
        if not target_dir.is_dir():
            continue
        for fp in target_dir.rglob("*"):
            if not fp.is_file():
                continue
            if process_pattern.match(fp.name):
                rel = str(fp.relative_to(ws)).replace("\\", "/")
                misplaced.append((rel, "docs/account-research/process-archive/", "过程数据放错目录"))

    s_dir = ws / "docs/account-research/battle-handbook"
    if s_dir.is_dir():
        for fp in s_dir.rglob("*"):
            if not fp.is_file():
                continue
            # D1 允许在 docs/account-research/battle-handbook/，排除掉
            if d28_pattern.match(fp.name) and not re.match(r"^D1\b", fp.name, re.IGNORECASE):
                rel = str(fp.relative_to(ws)).replace("\\", "/")
                misplaced.append((rel, "docs/account-research/decision-support/", "D2-D8属于方向判断"))

    # 去重
    seen_paths = set()
    misplaced_unique = []
    for item in misplaced:
        if item[0] not in seen_paths:
            seen_paths.add(item[0])
            misplaced_unique.append(item)

    if misplaced_unique:
        warn_count += 1
        print(f"[WARN] 文件放置: {len(misplaced_unique)}个文件放错位置")
        for path, target, _ in misplaced_unique:
            print(f"  - {path} → 应移至 {target}")
    else:
        pass_count += 1
        print("[PASS] 文件放置: 所有过程数据/方向判断文件位置正确")

    # 3. 关键交付物存在性
    missing_deliverables = []

    def has_md_with_keywords(dir_path, keywords):
        if not dir_path.is_dir():
            return False
        for fp in dir_path.rglob("*.md"):
            name = fp.name
            if any(kw.lower() in name.lower() for kw in keywords):
                return True
        return False

    if not has_md_with_keywords(ws / "docs/account-research/battle-handbook", ["作战", "手册", "D1"]):
        missing_deliverables.append("docs/account-research/battle-handbook/ 下未找到D1（作战手册）")

    if not has_md_with_keywords(ws / "docs/account-research/decision-support", ["高管", "摘要", "D2"]):
        missing_deliverables.append("docs/account-research/decision-support/ 下未找到D2（高管摘要）")

    proc_dir = ws / "docs/account-research/process-archive"
    has_l2 = False
    if proc_dir.is_dir():
        for fp in proc_dir.rglob("*"):
            if fp.is_file() and fp.suffix.lower() in (".csv", ".md") and "L2" in fp.name:
                has_l2 = True
                break
    if not has_l2:
        missing_deliverables.append("docs/account-research/process-archive/ 下未找到L2相关csv或md文件")

    if not (ws / "CHANGELOG.md").is_file():
        missing_deliverables.append("CHANGELOG.md 不存在")
    if not (ws / "README.md").is_file():
        missing_deliverables.append("README.md 不存在")

    if missing_deliverables:
        warn_count += 1
        print(f"[WARN] 交付物完整度: 缺少{len(missing_deliverables)}项")
        for m in missing_deliverables:
            print(f"  - {m}")
    else:
        pass_count += 1
        print("[PASS] 交付物完整度: 关键交付物齐全")

    # 5. supporting完整性检查
    empty_support_dirs = []
    support_dirs = [
        "docs/account-research/battle-handbook/supporting",
        "docs/account-research/decision-support/supporting",
        "docs/account-research/methodology/supporting",
    ]
    for sd in support_dirs:
        sd_path = ws / sd
        if sd_path.is_dir():
            has_any_file = any(f.is_file() for f in sd_path.iterdir())
            if not has_any_file:
                empty_support_dirs.append(sd)

    if empty_support_dirs:
        warn_count += 1
        print(f"[WARN] supporting: {len(empty_support_dirs)}个目录为空")
        for esd in empty_support_dirs:
            print(f"  - {esd}/ 无任何文件")
        print("  → 从docs/account-research/process-archive复制完整文件，或删除空目录")
    else:
        pass_count += 1
        print("[PASS] supporting: 无空目录")

    # 6. 内部术语泄露检查（D编号 + U编号）
    terminology_leaks = []
    scan_dirs = ["docs/account-research/battle-handbook", "docs/account-research/decision-support", "docs/account-research/methodology"]
    d_pattern = re.compile(r'\bD[1-8]\b')  # D1-D8
    u_pattern = re.compile(r'\bU\d{1,3}\b')  # U01-U999

    for sd in scan_dirs:
        sd_path = ws / sd
        if not sd_path.is_dir():
            continue
        for md_file in sd_path.rglob("*.md"):
            content = md_file.read_text(encoding="utf-8-sig")
            d_hits = d_pattern.findall(content)
            u_hits = u_pattern.findall(content)
            if d_hits or u_hits:
                rel = md_file.relative_to(ws)
                hits = d_hits + u_hits
                terminology_leaks.append(f"{rel}: {', '.join(set(hits))}")

    if terminology_leaks:
        warn_count += 1
        print(f"[WARN] 内部术语: {len(terminology_leaks)}个文件含D编号/U编号")
        for leak in terminology_leaks[:5]:  # 最多显示5条
            print(f"  - {leak}")
        if len(terminology_leaks) > 5:
            print(f"  ... 及另外{len(terminology_leaks)-5}处")
        print("  → D1-D8应替换为中文名（如'作战手册'），U编号应去掉只留客户名")
    else:
        pass_count += 1
        print("[PASS] 内部术语: 无D编号/U编号泄露")

    # 4. docs/account-research/process-archive 非空检查
    if proc_dir.is_dir():
        has_files = False
        for fp in proc_dir.rglob("*"):
            if fp.is_file():
                has_files = True
                break
        if not has_files:
            warn_count += 1
            print("[WARN] 过程档案: docs/account-research/process-archive/ 为空，中间产物未保存，无法溯源")
        else:
            pass_count += 1
            print("[PASS] 过程档案: 已保存中间产物")
    # 若 docs/account-research/process-archive 不存在，已经在第1项 WARN 中报告，这里不重复

    # --- D1 内容结构检查 ---
    # 在docs/account-research/battle-handbook/下找D1文件
    workspace = args.workspace
    sales_dir = os.path.join(workspace, "docs/account-research/battle-handbook")
    d1_file = None
    if os.path.isdir(sales_dir):
        for f in os.listdir(sales_dir):
            if f.endswith(".md") and ("作战" in f or "手册" in f or "d1" in f.lower()):
                d1_file = os.path.join(sales_dir, f)
                break

    if d1_file and os.path.isfile(d1_file):
        with open(d1_file, "r", encoding="utf-8-sig") as fh:
            d1_content = fh.read()

        # 必须章节检查（模糊匹配）
        required_sections = {
            "使用须知/阅读须知": any(kw in d1_content for kw in ["使用须知", "阅读须知", "第〇部分", "第零部分"]),
            "行业速览/市场概况": any(kw in d1_content for kw in ["行业速览", "市场概况", "§1.1", "§ 1.1"]),
            "分层攻坚策略": ("分层" in d1_content and "策略" in d1_content) or "A层策略" in d1_content or "B层策略" in d1_content or "A 层策略" in d1_content,
            "附录": "附录" in d1_content,
        }

        missing_sections = [name for name, found in required_sections.items() if not found]
        if missing_sections:
            warn_count += 1
            print(f"[WARN] D1内容结构: 缺少必须章节: {', '.join(missing_sections)}")
        else:
            pass_count += 1
            print("[PASS] D1内容结构: 必须章节齐全")
    else:
        # D1文件不存在的情况已在前面的交付物存在性检查中处理，这里不重复报
        pass

    print()
    print(f"总结: {fail_count} FAIL / {warn_count} WARN / {pass_count} PASS")

    if fail_count > 0:
        sys.exit(2)
    if warn_count > 0:
        sys.exit(1)
    sys.exit(0)


# ─── 新增命令：claim-trace ──────────────────────────────────────────────────

def _normalize_number(raw):
    """将数字字符串标准化为浮点数值，支持中英文单位。无法解析返回 None。"""
    s = raw.strip()
    s = re.sub(r'[\$¥￥%％]', '', s)
    m = re.match(r'([\d,\.]+)\s*(billion|B|million|M|K|万|亿)?', s, re.IGNORECASE)
    if not m:
        return None
    num_str = m.group(1).replace(',', '')
    try:
        num = float(num_str)
    except ValueError:
        return None
    unit = (m.group(2) or '').lower()
    multipliers = {
        'billion': 1e9, 'b': 1e9,
        'million': 1e6, 'm': 1e6,
        'k': 1e3,
        '万': 1e4,
        '亿': 1e8,
    }
    num *= multipliers.get(unit, 1)
    return num


def _numbers_match(n1, n2):
    """两个标准化数值相差在 2 倍以内算匹配。"""
    if n1 is None or n2 is None:
        return False
    if n1 == 0 and n2 == 0:
        return True
    if n1 == 0 or n2 == 0:
        return False
    ratio = max(n1, n2) / min(n1, n2)
    return ratio <= 2.0


def cmd_claim_trace(args):
    """报告中事实性声明在 evidence 中的溯源校验。

    逻辑：逐行提取报告中的事实性声明（含数字/日期/专有名词），
    然后在 evidence 目录的 .md/.json 文件中搜索对应支撑（数字标准化 + 子串匹配）。
    未匹配的声明输出到"未溯源清单"。
    """
    report_path = Path(args.report)
    evidence_dir = Path(args.evidence_dir)

    if not report_path.exists():
        print(f"FAIL: 报告文件不存在: {report_path}")
        sys.exit(1)
    if not evidence_dir.is_dir():
        print(f"FAIL: 证据目录不存在: {evidence_dir}")
        sys.exit(1)

    report_lines = report_path.read_text(encoding="utf-8-sig", errors="replace").split("\n")

    # --- 提取事实性声明 ---
    claims = []
    in_skip_section = False
    skip_section_pattern = re.compile(r'^#{1,4}\s*.*(启示|建议|展望|总结|思考)', re.IGNORECASE)
    heading_pattern = re.compile(r'^\s*#{1,6}\s')
    table_sep_pattern = re.compile(r'^\s*\|[\s\-:|]+\|\s*$')
    has_number = re.compile(r'\d+')
    has_date = re.compile(r'20\d{2}年?\d{1,2}月?')
    has_proper_noun = re.compile(r'[A-Z][a-zA-Z]+')

    for i, line in enumerate(report_lines, 1):
        stripped = line.strip()
        if not stripped:
            continue
        if heading_pattern.match(stripped):
            in_skip_section = bool(skip_section_pattern.match(stripped))
            continue
        if in_skip_section:
            continue
        if table_sep_pattern.match(stripped):
            continue
        if stripped.startswith('|') and not has_number.search(stripped):
            continue
        is_fact = False
        if has_number.search(stripped):
            is_fact = True
        elif has_date.search(stripped):
            is_fact = True
        elif has_proper_noun.search(stripped) and len(stripped) > 15:
            is_fact = True
        if is_fact:
            claims.append((i, stripped))

    # --- 关键短语提取 ---
    number_pattern = re.compile(
        r'[\$¥￥]?[\d,]+\.?\d*\s*(?:billion|B|million|M|K|万|亿|%|％)?',
        re.IGNORECASE,
    )
    en_proper_pattern = re.compile(r'[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*')
    cn_proper_pattern = re.compile(r'[\u4e00-\u9fff]{2,}(?:公司|平台|集团|研究院|实验室|部门|事业部|团队|大学|学院)')

    def extract_keywords(text):
        nums = number_pattern.findall(text)
        en_nouns = en_proper_pattern.findall(text)
        cn_nouns = cn_proper_pattern.findall(text)
        return nums, en_nouns + cn_nouns

    # --- 加载 evidence 语料 ---
    ev_text_parts = []
    ev_files = list(evidence_dir.rglob("*.md")) + list(evidence_dir.rglob("*.json"))
    for fp in ev_files:
        try:
            ev_text_parts.append(fp.read_text(encoding="utf-8-sig", errors="replace"))
        except OSError:
            continue
    evidence_corpus = "\n".join(ev_text_parts)

    if not evidence_corpus.strip():
        print(f"WARN: 证据目录 {evidence_dir} 内无可读取内容")
        sys.exit(0)

    ev_numbers_raw = number_pattern.findall(evidence_corpus)
    ev_numbers_normalized = [_normalize_number(n) for n in ev_numbers_raw]
    ev_numbers_normalized = [n for n in ev_numbers_normalized if n is not None]

    supported = []
    unsupported = []

    for line_no, text in claims:
        nums_raw, nouns = extract_keywords(text)
        if not nums_raw and not nouns:
            continue

        noun_hit = False
        for noun in nouns:
            if noun in evidence_corpus:
                noun_hit = True
                break

        if not noun_hit and nouns:
            unsupported.append((line_no, text, nouns + nums_raw))
            continue

        if nums_raw:
            num_hit = False
            for nr in nums_raw:
                if nr.strip() and nr.strip() in evidence_corpus:
                    num_hit = True
                    break
                nv = _normalize_number(nr)
                if nv is not None:
                    for ev_nv in ev_numbers_normalized:
                        if _numbers_match(nv, ev_nv):
                            num_hit = True
                            break
                if num_hit:
                    break

            if num_hit:
                supported.append((line_no, text))
            else:
                unsupported.append((line_no, text, nums_raw))
        else:
            if noun_hit:
                supported.append((line_no, text))
            else:
                unsupported.append((line_no, text, nouns))

    total_checked = len(supported) + len(unsupported)
    n_supported = len(supported)
    n_unsupported = len(unsupported)

    print("=== Claim Trace Report ===")
    print(f"报告: {report_path.name}")
    print(f"Evidence: {evidence_dir}")
    print()
    print(f"已检查声明数: {total_checked}")
    print(f"有evidence支撑: {n_supported}")
    print(f"未找到支撑: {n_unsupported}")

    if n_unsupported > 0:
        print()
        print("--- 未溯源声明清单 ---")
        for line_no, text, unmatched_kws in unsupported:
            preview = text[:80] + ("..." if len(text) > 80 else "")
            kw_str = ", ".join(str(k) for k in unmatched_kws[:5])
            print(f'L{line_no}: "{preview}" — 关键词[{kw_str}]在evidence中未找到')
        print()
        print(f"总结: {n_unsupported}条声明缺少evidence支撑，建议逐条核实")
        sys.exit(1)
    else:
        print()
        print("总结: 所有事实性声明均有evidence支撑")
        sys.exit(0)


# ─── 新增命令：temporal-check ───────────────────────────────────────────────

def cmd_temporal_check(args):
    """按基准日期检查文档中日期引用是否过期未标注，以及时间标注覆盖率。

    规则：
    1. 提取所有日期引用（YYYY年M月 / YYYY-MM / YYYY.MM）。
    2. 距 run-date 超过 12 个月的日期，所在行需含「过期/历史/背景/旧/存量」标注词；
       否则计入 "过期未标注" 清单。
    3. 事实性句子（含数字/英文专有名词/中文组织名）中无任何日期引用的占比超过 30%
       → 输出 "时间标注覆盖率不足" WARN。
    """
    file_path = Path(args.file)
    if not file_path.exists():
        print(f"FAIL: 文件不存在: {file_path}")
        sys.exit(1)

    run_date_str = args.run_date
    try:
        y, mo, d = run_date_str.split("-")
        run_date = date(int(y), int(mo), int(d))
    except Exception:
        print(f"FAIL: --run-date 格式非法（应为 YYYY-MM-DD）: {run_date_str}")
        sys.exit(1)

    content = file_path.read_text(encoding="utf-8-sig", errors="replace")
    lines = content.split("\n")

    # 提取日期引用
    cn_pattern = re.compile(r"(20\d{2})年(\d{1,2})月")
    dash_pattern = re.compile(r"(20\d{2})-(0[1-9]|1[0-2])(?:-\d{1,2})?")
    dot_pattern = re.compile(r"(20\d{2})\.(0[1-9]|1[0-2])(?!\d)")

    all_dates = []  # (line_no, year, month, line_text, raw_str)
    for i, line in enumerate(lines, 1):
        for m in cn_pattern.finditer(line):
            all_dates.append((i, int(m.group(1)), int(m.group(2)), line, m.group(0)))
        for m in dash_pattern.finditer(line):
            all_dates.append((i, int(m.group(1)), int(m.group(2)), line, m.group(0)))
        for m in dot_pattern.finditer(line):
            all_dates.append((i, int(m.group(1)), int(m.group(2)), line, m.group(0)))

    annotation_keywords = ["过期", "历史", "背景", "旧", "存量"]
    within_12 = 0
    overdue_tagged = 0
    overdue_unannotated = []  # (line_no, raw_str, months_diff, preview)

    for line_no, year, month, line_text, raw_str in all_dates:
        try:
            tag_date = date(year, month, 1)
        except ValueError:
            continue
        months_diff = (run_date.year - tag_date.year) * 12 + (run_date.month - tag_date.month)
        if months_diff <= 12:
            within_12 += 1
        elif any(kw in line_text for kw in annotation_keywords):
            overdue_tagged += 1
        else:
            overdue_unannotated.append((line_no, raw_str, months_diff, line_text.strip()[:80]))

    # 时间标注覆盖率：事实性句子（含数字/英文专有名词/中文组织名）中是否含日期引用
    sentences = re.split(r'[\u3002\uff01\uff1f\n]', content)
    en_proper_pattern = re.compile(r'[A-Z][a-zA-Z]+')
    cn_proper_pattern = re.compile(r'[\u4e00-\u9fff]{2,}(?:公司|平台|集团|研究院|实验室|大学|学院|部门|事业部|团队)')
    has_number_pat = re.compile(r'\d+')
    has_date_ref = re.compile(r'20\d{2}[年\-\./]')

    fact_sentences = []
    for s in sentences:
        s = s.strip()
        if len(s) < 15:
            continue
        if has_number_pat.search(s) or en_proper_pattern.search(s) or cn_proper_pattern.search(s):
            fact_sentences.append(s)

    if fact_sentences:
        sentences_with_date = sum(1 for s in fact_sentences if has_date_ref.search(s))
        coverage = round(sentences_with_date / len(fact_sentences) * 100)
    else:
        coverage = 100  # 无事实性句子则视为达标

    total_dates = len(all_dates)
    overdue_count = len(overdue_unannotated)

    print("=== Temporal Check Report ===")
    print(f"文件: {file_path}")
    print(f"基准日期: {run_date_str}")
    print()
    print(f"已检查日期引用数: {total_dates}")
    print(f"正常（12个月内）: {within_12}")
    print(f"过期未标注: {overdue_count}")
    if overdue_tagged:
        print(f"过期已标注（豁免）: {overdue_tagged}")

    if overdue_unannotated:
        print()
        print("--- 过期未标注清单 ---")
        for line_no, raw_str, months_diff, preview in overdue_unannotated[:30]:
            print(f'L{line_no}: "{raw_str}…{preview}" — 距基准日期超过{months_diff}个月，未标注[过期/历史/背景]')
        if len(overdue_unannotated) > 30:
            print(f"  ... 及其余 {len(overdue_unannotated) - 30} 条")

    print()
    print(f"时间标注覆盖率: {coverage}%（阈值70%）")

    warns = []
    if overdue_count > 0:
        warns.append(f"{overdue_count}条日期引用过期未标注")
    if coverage < 70 and len(fact_sentences) > 0:
        warns.append(f"事实性句子时间标注覆盖率{coverage}%低于70%阈值（时间标注覆盖率不足）")

    print()
    if warns:
        print("总结: WARN — " + "; ".join(warns))
        sys.exit(1)
    else:
        print("总结: PASS — 所有日期引用均在窗口内或已标注，时间标注覆盖率达标")
        sys.exit(0)


# ─── CLI 入口 ────────────────────────────────────────────────────────────────

# ─── 新增命令：compute-score ─────────────────────────────────────────────────

# ─── 新增命令：save-batch-snapshot ───────────────────────

def cmd_save_batch_snapshot(args):
    """从 L2 评分 CSV 中提取指定批次数据，计算统计量并输出 JSON 快照。"""
    csv_path = Path(args.csv)
    if not csv_path.exists():
        print(f"[FAIL] CSV 不存在: {csv_path}")
        sys.exit(1)

    with open(csv_path, "r", encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))

    batch_rows = [r for r in rows if r.get("批次") == str(args.batch)]
    if not batch_rows:
        print(f"[FAIL] 批次 {args.batch} 在 CSV 中无数据")
        sys.exit(1)

    scores = [int(r["总分"]) for r in batch_rows]
    mean_score = round(sum(scores) / len(scores), 2)
    std_dev = round(statistics.stdev(scores), 2) if len(scores) > 1 else 0.0

    layer_counter = Counter(r.get("分层", "") for r in batch_rows)
    layer_distribution = {layer: layer_counter.get(layer, 0) for layer in ("A", "B", "C")}

    # 选取对标样本：按与本批均分距离升序，取前 2 家
    sorted_for_calib = sorted(
        batch_rows,
        key=lambda r: abs(int(r["总分"]) - mean_score),
    )
    calibration_samples = []
    for r in sorted_for_calib[:2]:
        calibration_samples.append({
            "company": r.get("公司名", ""),
            "score": int(r["总分"]),
            "layer": r.get("分层", ""),
            "evidence": r.get("证据摘要", ""),
        })

    # 评分标准哈希：如提供 brief 则取其 md5 前 8 位，否则 unknown
    criteria_hash = "unknown"
    if args.brief:
        brief_path = Path(args.brief)
        if brief_path.exists():
            content = brief_path.read_bytes()
            criteria_hash = hashlib.md5(content).hexdigest()[:8]

    snapshot = {
        "batch_id": args.batch,
        "completed_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "companies_count": len(batch_rows),
        "stats": {
            "mean_score": mean_score,
            "std_dev": std_dev,
            "layer_distribution": layer_distribution,
        },
        "calibration_samples": calibration_samples,
        "scoring_criteria_hash": criteria_hash,
    }

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"快照已保存: {output_path} | 批次 {args.batch} 均分 {mean_score} | A={layer_distribution['A']} B={layer_distribution['B']} C={layer_distribution['C']}")


# ─── 新增命令：check-batch-drift ────────────────────────

def cmd_check_batch_drift(args):
    """对比上批快照与当前批次均分，输出 PASS/WARN/FAIL。"""
    snap_path = Path(args.prev_snapshot)
    if not snap_path.exists():
        print(f"[FAIL] 上批快照不存在: {snap_path}")
        sys.exit(1)

    csv_path = Path(args.curr_csv)
    if not csv_path.exists():
        print(f"[FAIL] 当前批次 CSV 不存在: {csv_path}")
        sys.exit(1)

    prev_snap = json.loads(snap_path.read_text(encoding="utf-8-sig"))
    prev_mean = float(prev_snap.get("stats", {}).get("mean_score", 0))
    prev_batch_id = prev_snap.get("batch_id")

    with open(csv_path, "r", encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))

    # 当前批次 = CSV 中最大批次号
    batch_ids = sorted({int(r["批次"]) for r in rows if r.get("批次")})
    if not batch_ids:
        print("[FAIL] CSV 中无有效批次数据")
        sys.exit(1)
    curr_batch_id = batch_ids[-1]

    curr_rows = [r for r in rows if r.get("批次") == str(curr_batch_id)]
    if not curr_rows:
        print(f"[FAIL] 当前批次 {curr_batch_id} 无数据")
        sys.exit(1)

    curr_scores = [int(r["总分"]) for r in curr_rows]
    curr_mean = round(sum(curr_scores) / len(curr_scores), 2)

    diff = round(abs(curr_mean - prev_mean), 2)
    tolerance = float(args.tolerance)

    detail = f"上批(batch={prev_batch_id})均分={prev_mean} | 当前(batch={curr_batch_id})均分={curr_mean} | 偏差={diff} | 容忍={tolerance}"

    if diff <= tolerance:
        print(f"PASS: 批次间均分偏差 {diff} 分，标准稳定 | {detail}")
        sys.exit(0)
    elif diff <= tolerance * 2:
        print(f"WARN: 批次间均分偏差 {diff} 分，轻微漂移 | {detail}")
        sys.exit(0)
    else:
        print(f"FAIL: 批次间均分偏差 {diff} 分，标准严重漂移 | {detail}")
        sys.exit(1)


def cmd_compute_score(args):
    """13 维度加权求和 + 分层判定。
    
    用途：signal-scan 每家公司打完 13 维度分后调用，脚本计算总分和分层。
    避免 LLM 在上下文里做手动加法（容易算错且浪费 token）。
    """
    scores_str = args.scores
    try:
        scores = json.loads(scores_str)
    except json.JSONDecodeError as e:
        print(f"[FAIL] --scores JSON 解析失败: {e}")
        sys.exit(1)
    
    if not isinstance(scores, dict):
        print("[FAIL] --scores 必须为 JSON 对象，如 {\"D1\":3,\"D2\":2,...}")
        sys.exit(1)
    
    # 计算总分
    total = sum(int(v) for v in scores.values())
    
    # 分层判定
    threshold_a = args.threshold_a
    threshold_b = args.threshold_b
    if total >= threshold_a:
        layer = "A"
    elif total >= threshold_b:
        layer = "B"
    else:
        layer = "C"
    
    # 找出主要贡献维度（得分最高的 top 3）
    sorted_dims = sorted(scores.items(), key=lambda x: int(x[1]), reverse=True)
    top_contributors = [f"{d}={v}" for d, v in sorted_dims[:3] if int(v) > 0]
    
    # 找出信息缺失维度（得分=0）
    missing_dims = [d for d, v in scores.items() if int(v) == 0]
    
    result = {
        "total": total,
        "layer": layer,
        "top_contributors": top_contributors,
        "missing_dims": missing_dims,
        "threshold": f"A>={threshold_a}, B>={threshold_b}, C<{threshold_b}",
    }
    print(json.dumps(result, ensure_ascii=False))


# ─── fix-csv ─────────────────────────────────────────────────────────────────

def cmd_fix_csv(args):
    """修复 CSV 编码，避免 Excel 打开中文乱码。

    逻辑：
      1. 已以 BOM (EF BB BF) 开头 → 跳过
      2. 可以用 utf-8 解码 → 补 BOM 重写为 utf-8-sig
      3. 可以用 gbk 解码（Excel 另存为中文 CSV造成）→ 转码并补 BOM为 utf-8-sig
      4. 以上都失败 → 报告 fail，不覆写
    备份：任何覆写前原文件复制为 *.csv.bak（已存在则不重复覆盖备份）。
    """
    BOM = b"\xef\xbb\xbf"

    if bool(args.workspace) == bool(args.file):
        print("[FAIL] 必须且只能提供 --workspace 或 --file 其中一个")
        sys.exit(1)

    if args.file:
        target = Path(args.file)
        if not target.exists():
            print(f"[FAIL] 文件不存在: {target}")
            sys.exit(1)
        if target.suffix.lower() != ".csv":
            print(f"[FAIL] 不是 .csv 文件: {target}")
            sys.exit(1)
        files = [target]
    else:
        root = Path(args.workspace)
        if not root.exists():
            print(f"[FAIL] 目录不存在: {root}")
            sys.exit(1)
        files = sorted(p for p in root.rglob("*.csv") if not p.name.endswith(".bak"))

    if not files:
        print("未找到任何 .csv 文件")
        return

    fixed, skipped, failed = 0, 0, []
    for f in files:
        try:
            raw = f.read_bytes()
        except Exception as e:
            failed.append((f, f"读取失败: {e}"))
            continue

        if raw.startswith(BOM):
            skipped += 1
            print(f"[OK]   {f}  (已有 BOM，跳过)")
            continue

        text, decoded_from = None, None
        for enc in ("utf-8", "gbk"):
            try:
                text = raw.decode(enc)
                decoded_from = enc
                break
            except UnicodeDecodeError:
                continue

        if text is None:
            failed.append((f, "无法用 utf-8/gbk 解码"))
            continue

        if args.dry_run:
            print(f"[DRY]  {f}  (会转为 utf-8-sig，原编码={decoded_from})")
            fixed += 1
            continue

        backup = f.with_suffix(f.suffix + ".bak")
        if not backup.exists():
            backup.write_bytes(raw)
        f.write_bytes(BOM + text.encode("utf-8"))
        fixed += 1
        print(f"[FIX]  {f}  ({decoded_from} → utf-8-sig，备份: {backup.name})")

    print(f"\n汇总：扫描 {len(files)} 个 / "
          f"{'待修复' if args.dry_run else '已修复'} {fixed} 个 / "
          f"跳过 {skipped} 个 / 失败 {len(failed)} 个")
    if failed:
        for f, msg in failed:
            print(f"  FAIL: {f} - {msg}")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(prog="account_research_toolkit", description="account-research skill 辅助工具包")
    sub = parser.add_subparsers(dest="command")

    # init-workspace
    p = sub.add_parser("init-workspace", help="创建 .csp/account-research/state 目录树")
    p.add_argument("--slug", required=True, help="行业标识")

    # validate-brief
    p = sub.add_parser("validate-brief", help="校验 brief.json 必填字段")
    p.add_argument("--path", required=True, help="brief.json 路径")

    # append-score
    p = sub.add_parser("append-score", help="追加/更新 L2 评分到 CSV")
    p.add_argument("--csv", required=True, help="CSV 路径")
    p.add_argument("--company", required=True, help="公司名")
    p.add_argument("--score", required=True, type=int, help="总分")
    p.add_argument("--layer", required=True, choices=["A", "B", "C"], help="分层")
    p.add_argument("--batch", required=True, type=int, help="批次号")
    p.add_argument("--evidence", required=True, help="证据摘要")

    # tally-layers
    p = sub.add_parser("tally-layers", help="按阈值统计 A/B/C 分层")
    p.add_argument("--csv", required=True, help="CSV 路径")
    p.add_argument("--threshold-a", type=int, default=20, help="A 层阈值（默认20）")
    p.add_argument("--threshold-b", type=int, default=12, help="B 层阈值（默认12）")

    # gate-check
    p = sub.add_parser("gate-check", help="Phase 前置条件门禁校验")
    p.add_argument("--progress", required=True, help="progress.json 路径")
    p.add_argument("--target-phase", required=True, type=int, help="目标 Phase 编号")

    # check-consistency
    p = sub.add_parser("check-consistency", help="跨文档一致性检查")
    p.add_argument("--workspace", required=True, help="workspace 根目录路径")

    # check-naming
    p = sub.add_parser("check-naming", help="产品名称合规扫描")
    p.add_argument("--workspace", required=True, help="workspace 路径")
    p.add_argument("--brief", required=True, help="brief.json 路径")

    # build-panorama
    p = sub.add_parser("build-panorama", help="合并 L2 数据为 D6 宽表")
    p.add_argument("--workspace", required=True, help="workspace 路径")
    p.add_argument("--output", required=True, help="输出 CSV 路径")

    # update-progress
    p = sub.add_parser("update-progress", help="更新 progress.json")
    p.add_argument("--progress", required=True, help="progress.json 路径")
    p.add_argument("--phase", required=True, type=int, help="Phase 编号")
    p.add_argument("--status", required=True, help="状态字符串")
    p.add_argument("--products", default="", help="逗号分隔的产物文件名列表")

    # dedup-check
    p = sub.add_parser("dedup-check", help="检测单文档内部重复段落")
    p.add_argument("--file", required=True, help="待检测的 .md 文件路径")

    # evidence-ratio
    p = sub.add_parser("evidence-ratio", help="统计 [F]/[I]/[A]/[E] 标签配比")
    p.add_argument("--file", required=True, help="待统计的 .md 文件路径")

    # changelog-append
    p = sub.add_parser("changelog-append", help="追加标准格式 CHANGELOG 记录")
    p.add_argument("--changelog", required=True, help="CHANGELOG.md 路径")
    p.add_argument("--phase", required=True, help="Phase 编号")
    p.add_argument("--name", required=True, help="Phase 名称")
    p.add_argument("--products", default="", help="产物列表")
    p.add_argument("--decision", default="", help="关键决策")
    p.add_argument("--snapshot", default="", help="数据快照")

    # compute-score
    p = sub.add_parser("compute-score", help="13维度加权求和 + 分层判定")
    p.add_argument("--scores", required=True, help='JSON对象，如 {"D1":3,"D2":2,...}')
    p.add_argument("--threshold-a", type=int, default=20, help="A 层阈值（默认20）")
    p.add_argument("--threshold-b", type=int, default=12, help="B 层阈值（默认12）")

    # dual-source-check
    p = sub.add_parser("dual-source-check", help="检查重要判定是否满足双源验证")
    p.add_argument("--file", required=True, help="待检查的 L2/L3 报告 .md 文件路径")

    # save-batch-snapshot
    p = sub.add_parser("save-batch-snapshot", help="保存批次评分快照")
    p.add_argument("--csv", required=True, help="L2 评分 CSV 路径")
    p.add_argument("--batch", required=True, type=int, help="批次号")
    p.add_argument("--output", required=True, help="快照输出 JSON 路径")
    p.add_argument("--brief", default="", help="可选：brief.json 路径，用于计算 scoring_criteria_hash")

    # check-batch-drift
    p = sub.add_parser("check-batch-drift", help="检测批次间评分漂移")
    p.add_argument("--prev-snapshot", required=True, help="上批次快照 JSON 路径")
    p.add_argument("--curr-csv", required=True, help="当前批次 CSV 路径")
    p.add_argument("--tolerance", type=float, default=1.0, help="偏差容忍（默认1.0）")

    # citation-trace
    p = sub.add_parser("citation-trace", help="[F] 标签条目的引用溯源校验")
    p.add_argument("--report", required=True, help="报告或画像 .md 文件路径")
    p.add_argument("--evidence-dir", required=True, help="search_evidence 目录路径")

    # validate-config
    p = sub.add_parser("validate-config", help="校验 brief.json 5项必填字段")
    p.add_argument("--config", required=True, help="brief.json 路径")

    # stats-evidence
    p = sub.add_parser("stats-evidence", help="统计 [F]/[I]/[A]/[E] 标签配比")
    p.add_argument("--file", required=True, help="待统计的 .md 文件路径")

    # check-temporal
    p = sub.add_parser("check-temporal", help="检查文档内日期标注是否超出时间窗口")
    p.add_argument("--file", required=True, help="待检查的 .md 文件路径")
    p.add_argument("--config", required=True, help="brief.json 路径")

    # check-dedup
    p = sub.add_parser("check-dedup", help="跨文件段落重复检测")
    p.add_argument("--dir", required=True, help="待检查目录路径")
    p.add_argument("--min-chars", type=int, default=50, help="指纹长度（默认50字符）")

    # check-structure
    p = sub.add_parser("check-structure", help="检查MR项目目录结构合规性")
    p.add_argument("--workspace", required=True, help="项目根目录路径（含 01/02/03/99 子目录）")
    p.add_argument("--phase", type=int, choices=[1, 2, 3, 4, 5], default=None,
                   help="可选：指定Phase编号（1-4 走轻量单Phase落盘检查；5 或省略走全量结构检查）")

    # claim-trace
    p = sub.add_parser("claim-trace", help="报告中事实性声明在 evidence 中的溯源校验")
    p.add_argument("--report", required=True, help="报告 .md 文件路径")
    p.add_argument("--evidence-dir", required=True, help="证据目录（含 .md/.json 文件）")

    # temporal-check
    p = sub.add_parser("temporal-check", help="按基准日期检查文档时效性（12 个月阈值 + 标注覆盖率）")
    p.add_argument("--file", required=True, help="待检查的交付物 .md 文件路径")
    p.add_argument("--run-date", required=True, help="基准日期，格式 YYYY-MM-DD")

    # fix-csv
    p = sub.add_parser("fix-csv", help="修复 CSV 编码：补 BOM，必要时 GBK→utf-8-sig")
    p.add_argument("--workspace", help="递归扫描的目录路径（与 --file 二选一）")
    p.add_argument("--file", help="单个 CSV 文件路径（与 --workspace 二选一）")
    p.add_argument("--dry-run", action="store_true", help="只报告不修改")

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        sys.exit(0)

    dispatch = {
        "init-workspace": cmd_init_workspace,
        "validate-brief": cmd_validate_brief,
        "append-score": cmd_append_score,
        "tally-layers": cmd_tally_layers,
        "gate-check": cmd_gate_check,
        "check-consistency": cmd_check_consistency,
        "check-naming": cmd_check_naming,
        "build-panorama": cmd_build_panorama,
        "update-progress": cmd_update_progress,
        "dedup-check": cmd_dedup_check,
        "evidence-ratio": cmd_evidence_ratio,
        "changelog-append": cmd_changelog_append,
        "dual-source-check": cmd_dual_source_check,
        "compute-score": cmd_compute_score,
        "save-batch-snapshot": cmd_save_batch_snapshot,
        "check-batch-drift": cmd_check_batch_drift,
        "citation-trace": cmd_citation_trace,
        "validate-config": cmd_validate_config,
        "stats-evidence": cmd_stats_evidence,
        "check-temporal": cmd_check_temporal,
        "check-dedup": cmd_check_dedup,
        "check-structure": cmd_check_structure,
        "claim-trace": cmd_claim_trace,
        "temporal-check": cmd_temporal_check,
        "fix-csv": cmd_fix_csv,
    }
    try:
        dispatch[args.command](args)
    except Exception as e:
        print(f"[ERROR] {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
