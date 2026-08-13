#!/usr/bin/env python3
"""cr_review.py — CR Review 辅助脚本
子命令:
  parse-url <CR_URL>                      解析URL→project_path/cr_id/app_name
  fetch-meta <token> <project_id> <cr_id> API获取元数据JSON
  parse-diff <page_text_file>             解析get_page_text输出→结构化diff JSON
  lookup-distillation <app> <关键词...>   蒸馏目录查询→入口点/调用链/业务上下文
  gen-report <data.json> -o <out.md>      填充模板→MD报告文件
"""
import sys
import os
import re
import json
import urllib.request
import urllib.error
from pathlib import Path

# Windows 控制台中文兼容
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

DISTILLATION_BASE = Path(os.environ.get("DISTILLATION_BASE", "./distillation"))


# ─── parse-url ───────────────────────────────────────────────────────────────

def cmd_parse_url(args):
    """解析 CR URL，输出 project_path / cr_id / app_name"""
    if not args:
        print("用法: cr_review.py parse-url <CR_URL>", file=sys.stderr)
        sys.exit(1)
    url = args[0]
    # 格式: https://{code-platform}/{group}/{project}/codereview/{cr_id}
    m = re.search(r"https?://[^/]+/([^/]+/[^/]+)/codereview/(\d+)", url)
    if not m:
        # 尝试 merge_request 格式
        m = re.search(r"https?://[^/]+/([^/]+/[^/]+)/merge_request/(\d+)", url)
    if not m:
        print(json.dumps({"error": "无法解析URL", "url": url}, ensure_ascii=False))
        sys.exit(1)
    project_path = m.group(1)
    cr_id = m.group(2)
    app_name = project_path.split("/")[-1]
    result = {
        "project_path": project_path,
        "cr_id": cr_id,
        "app_name": app_name,
        "project_path_encoded": project_path.replace("/", "%2F"),
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))


# ─── fetch-meta ──────────────────────────────────────────────────────────────

def cmd_fetch_meta(args):
    """调用 API 获取 CR 元数据"""
    if len(args) < 3:
        print("用法: cr_review.py fetch-meta <token> <project_id> <cr_id>", file=sys.stderr)
        sys.exit(1)
    token, project_id, cr_id = args[0], args[1], args[2]
    base = os.environ.get("CR_API_BASE", "").rstrip("/")
    if not base:
        print(json.dumps({"error": "请先设置环境变量 CR_API_BASE（代码平台根地址，如 https://code.example.com）"}, ensure_ascii=False))
        sys.exit(1)
    url = f"{base}/api/v4/projects/{project_id}/merge_request/{cr_id}"
    req = urllib.request.Request(url, headers={"Private-Token": token})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError) as e:
        print(json.dumps({"error": str(e)}, ensure_ascii=False))
        sys.exit(1)

    meta = {
        "title": data.get("title", ""),
        "author": data.get("author", {}).get("name", ""),
        "author_username": data.get("author", {}).get("username", ""),
        "source_branch": data.get("source_branch", ""),
        "target_branch": data.get("target_branch", ""),
        "state": data.get("state", ""),
        "description": data.get("description", ""),
        "project_path": data.get("project_path", ""),
        "created_at": data.get("created_at", ""),
        "merge_status": data.get("mergeStatus", ""),
        "assignees": [a.get("name", "") for a in data.get("assignees", [])],
    }
    print(json.dumps(meta, ensure_ascii=False, indent=2))


# ─── parse-diff ──────────────────────────────────────────────────────────────

def cmd_parse_diff(args):
    """解析 get_page_text 输出，提取结构化 diff"""
    if not args:
        print("用法: cr_review.py parse-diff <page_text_file>", file=sys.stderr)
        sys.exit(1)
    filepath = Path(args[0])
    if not filepath.exists():
        print(json.dumps({"error": f"文件不存在: {filepath}"}, ensure_ascii=False))
        sys.exit(1)
    text = filepath.read_text(encoding="utf-8", errors="replace")

    # 提取 CR 标题（页面 Title 行）
    title_m = re.search(r"^Title:\s*(.+)$", text, re.MULTILINE)
    title = title_m.group(1).strip() if title_m else ""

    # 提取文件改动区块: "文件改动 (N)" 后的内容
    # 格式: +N-N 文件路径 +N-N 文件名 ... @@ hunk
    files = []
    # 匹配模式: 路径行（含 / 和 .xml/.java 等扩展名）
    file_pattern = re.compile(
        r"\+(\d+)-(\d+)"  # +added-removed
        r"([\w/\-\.]+(?:\.\w+))"  # 文件路径
    )
    for m in file_pattern.finditer(text):
        added = int(m.group(1))
        removed = int(m.group(2))
        path = m.group(3)
        # 提取该文件后的 hunk 内容（到下一个文件或文本结尾）
        start = m.end()
        next_file = file_pattern.search(text, start)
        end = next_file.start() if next_file else len(text)
        hunk_text = text[start:end].strip()
        # 清理 hunk：提取 @@ 开头的行和变更行
        hunk_lines = []
        for line in hunk_text.split("\n"):
            line = line.strip()
            if line.startswith("@@") or line.startswith("+") or line.startswith("-"):
                hunk_lines.append(line)
            elif re.match(r"^\d{3}\s", line):
                # 行号前缀格式 (如 "136 WHEN ...")
                hunk_lines.append(line)
        files.append({
            "path": path,
            "filename": path.split("/")[-1],
            "added": added,
            "removed": removed,
            "hunk_preview": "\n".join(hunk_lines[:30]),  # 限制预览行数
        })

    # 去重（同一路径可能出现两次：完整路径+短名）
    seen = set()
    unique_files = []
    for f in files:
        if f["path"] not in seen:
            seen.add(f["path"])
            unique_files.append(f)

    total_added = sum(f["added"] for f in unique_files)
    total_removed = sum(f["removed"] for f in unique_files)

    result = {
        "title": title,
        "file_count": len(unique_files),
        "total_added": total_added,
        "total_removed": total_removed,
        "is_large_cr": len(unique_files) > 10 or (total_added + total_removed) > 500,
        "files": unique_files,
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))


# ─── lookup-distillation ─────────────────────────────────────────────────────

def cmd_lookup_distillation(args):
    """在蒸馏目录中查询关键词，返回入口点/调用链/业务上下文"""
    if len(args) < 2:
        print("用法: cr_review.py lookup-distillation <app> <关键词1> [关键词2...]", file=sys.stderr)
        sys.exit(1)
    app = args[0]
    keywords = args[1:]
    base = DISTILLATION_BASE / app

    if not base.exists():
        print(json.dumps({"app": app, "exists": False, "results": []}, ensure_ascii=False))
        return

    results = []
    # 搜索文件列表
    search_files = []
    for pattern in ["entry-points.jsonl", "edges.jsonl", "glossary.md"]:
        f = base / pattern
        if f.exists():
            search_files.append(f)
    # business-modules 目录下所有 .md
    bm_dir = base / "business-modules"
    if bm_dir.exists():
        search_files.extend(bm_dir.glob("*.md"))

    for kw in keywords:
        kw_lower = kw.lower()
        matches = []
        for sf in search_files:
            try:
                content = sf.read_text(encoding="utf-8", errors="replace")
            except Exception:
                continue
            for i, line in enumerate(content.split("\n"), 1):
                if kw_lower in line.lower():
                    matches.append({
                        "file": str(sf.relative_to(base)),
                        "line": i,
                        "content": line.strip()[:200],
                    })
        if matches:
            results.append({"keyword": kw, "match_count": len(matches), "matches": matches[:15]})
        else:
            results.append({"keyword": kw, "match_count": 0, "matches": []})

    output = {"app": app, "exists": True, "results": results}
    print(json.dumps(output, ensure_ascii=False, indent=2))


# ─── gen-report ──────────────────────────────────────────────────────────────

def cmd_gen_report(args):
    """从 JSON 数据文件生成 MD 报告"""
    if not args:
        print("用法: cr_review.py gen-report <data.json> -o <output.md>", file=sys.stderr)
        sys.exit(1)
    data_file = Path(args[0])
    output_file = None
    if "-o" in args:
        idx = args.index("-o")
        if idx + 1 < len(args):
            output_file = Path(args[idx + 1])

    if not data_file.exists():
        print(f"错误: 数据文件不存在 {data_file}", file=sys.stderr)
        sys.exit(1)

    data = json.loads(data_file.read_text(encoding="utf-8"))

    # 构建 MD 报告
    lines = []
    # CR 概览
    overview = data.get("overview", {})
    lines.append("# CR 评审报告")
    lines.append("")
    lines.append("## CR 概览")
    lines.append("")
    lines.append("| 项目 | 内容 |")
    lines.append("|------|------|")
    lines.append(f"| 标题 | {overview.get('title', '')} |")
    lines.append(f"| 仓库 | {overview.get('repo', '')} |")
    lines.append(f"| 分支 | {overview.get('source_branch', '')} → {overview.get('target_branch', '')} |")
    lines.append(f"| 状态 | {overview.get('state', '')} |")
    lines.append(f"| 变更 | {overview.get('file_count', 0)} 个文件，+{overview.get('added', 0)} -{overview.get('removed', 0)} |")
    lines.append(f"| 发起人 | {overview.get('author', '')} |")
    lines.append(f"| 意图 | {overview.get('intent', '')} |")
    lines.append("")

    # 功能入口清单
    entries = data.get("entry_points", [])
    lines.append("## 功能入口清单（面向业务测试）")
    lines.append("")
    lines.append("| # | 入口类型 | 入口标识 | 业务场景 | 备注 |")
    lines.append("|---|---------|---------|---------|------|")
    for i, e in enumerate(entries, 1):
        lines.append(f"| {i} | {e.get('type', '')} | {e.get('id', '')} | {e.get('scenario', '')} | {e.get('note', '')} |")
    lines.append("")

    # 逻辑变更点与测试用例
    changes = data.get("changes", [])
    lines.append("## 逻辑变更点与测试用例")
    lines.append("")
    for ci, c in enumerate(changes, 1):
        lines.append(f"### 变更点 {ci}：{c.get('location', '')} — {c.get('change_type', '')}")
        lines.append("")
        cases = c.get("test_cases", [])
        if cases:
            lines.append("| # | 用例名称 | 前置条件 | 操作步骤 | 预期结果 |")
            lines.append("|---|---------|---------|---------|---------|")
            for tc in cases:
                lines.append(f"| {tc.get('id', '')} | {tc.get('name', '')} | {tc.get('precondition', '')} | {tc.get('steps', '')} | {tc.get('expected', '')} |")
            lines.append("")

    # 评审总览
    dimensions = data.get("dimensions", [])
    lines.append("## 评审总览")
    lines.append("")
    lines.append("| 维度 | 结论 | 问题数 |")
    lines.append("|------|------|--------|")
    for d in dimensions:
        status = "✅ 通过" if d.get("pass", True) else "⚠️ 有问题"
        lines.append(f"| {d.get('name', '')} | {status} | {d.get('issue_count', 0)} |")
    lines.append("")

    # 问题明细
    issues = data.get("issues", [])
    if issues:
        lines.append("## 问题明细")
        lines.append("")
        lines.append("| # | 严重度 | 维度 | 问题 | 描述与建议 |")
        lines.append("|---|--------|------|------|-----------|")
        for i, iss in enumerate(issues, 1):
            lines.append(f"| {i} | {iss.get('severity', '')} | {iss.get('dimension', '')} | {iss.get('title', '')} | {iss.get('description', '')} |")
        lines.append("")

    # 总结
    summary = data.get("summary", "")
    if summary:
        lines.append(f"> **总结：** {summary}")
        lines.append("")

    md_content = "\n".join(lines)

    if output_file:
        output_file.parent.mkdir(parents=True, exist_ok=True)
        output_file.write_text(md_content, encoding="utf-8")
        print(f"报告已生成: {output_file}")
    else:
        print(md_content)


# ─── main ────────────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    cmd = sys.argv[1]
    rest = sys.argv[2:]

    commands = {
        "parse-url": cmd_parse_url,
        "fetch-meta": cmd_fetch_meta,
        "parse-diff": cmd_parse_diff,
        "lookup-distillation": cmd_lookup_distillation,
        "gen-report": cmd_gen_report,
    }

    if cmd not in commands:
        print(f"未知子命令: {cmd}\n可用: {', '.join(commands.keys())}", file=sys.stderr)
        sys.exit(1)

    commands[cmd](rest)


if __name__ == "__main__":
    main()
