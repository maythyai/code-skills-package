#!/usr/bin/env python3
"""
PDF 论文关键图片提取脚本

用法: python extract_figures.py <pdf_path> <output_dir> [--min-size 10240]

功能:
- 从 PDF 中提取嵌入图片
- 过滤低质量碎片图（默认 <10KB）
- 按页码和序号命名输出文件
- 输出 JSON 清单供后续流程使用

依赖: pip install PyMuPDF
"""

import argparse
import json
import os
import sys
from pathlib import Path


def extract_figures(pdf_path: str, output_dir: str, min_size: int = 10240) -> list[dict]:
    """
    从 PDF 中提取图片并保存到 output_dir。

    Args:
        pdf_path: PDF 文件路径
        output_dir: 图片输出目录
        min_size: 最小文件大小（字节），低于此值的图片被跳过

    Returns:
        提取结果列表，每项包含 page_num, filename, size_bytes, caption_hint
    """
    try:
        import fitz  # PyMuPDF
    except ImportError:
        print("ERROR: PyMuPDF not installed. Run: pip install PyMuPDF", file=sys.stderr)
        sys.exit(1)

    os.makedirs(output_dir, exist_ok=True)
    doc = fitz.open(pdf_path)
    results = []
    img_counter = 0

    for page_num in range(len(doc)):
        page = doc[page_num]
        image_list = page.get_images(full=True)

        for img_idx, img_info in enumerate(image_list):
            xref = img_info[0]
            try:
                base_image = doc.extract_image(xref)
                if base_image is None:
                    continue

                image_bytes = base_image["image"]
                ext = base_image.get("ext", "png")

                # 过滤小图
                if len(image_bytes) < min_size:
                    continue

                img_counter += 1
                filename = f"fig_p{page_num + 1}_{img_idx + 1}.{ext}"
                filepath = os.path.join(output_dir, filename)

                with open(filepath, "wb") as f:
                    f.write(image_bytes)

                results.append({
                    "page_num": page_num + 1,
                    "filename": filename,
                    "filepath": filepath,
                    "size_bytes": len(image_bytes),
                    "width": base_image.get("width", 0),
                    "height": base_image.get("height", 0),
                    "format": ext,
                })

            except Exception as e:
                print(f"WARNING: Failed to extract image xref={xref} on page {page_num + 1}: {e}",
                      file=sys.stderr)
                continue

    doc.close()

    # 写入清单文件
    manifest_path = os.path.join(output_dir, "figures_manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"Extracted {len(results)} figures from {pdf_path}")
    print(f"Manifest saved to {manifest_path}")
    return results


def main():
    parser = argparse.ArgumentParser(description="Extract key figures from a PDF paper")
    parser.add_argument("pdf_path", help="Path to the PDF file")
    parser.add_argument("output_dir", help="Directory to save extracted figures")
    parser.add_argument("--min-size", type=int, default=10240,
                        help="Minimum image size in bytes (default: 10240)")
    args = parser.parse_args()

    if not os.path.isfile(args.pdf_path):
        print(f"ERROR: File not found: {args.pdf_path}", file=sys.stderr)
        sys.exit(1)

    extract_figures(args.pdf_path, args.output_dir, args.min_size)


if __name__ == "__main__":
    main()
