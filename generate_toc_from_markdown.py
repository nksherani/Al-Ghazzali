#!/usr/bin/env python3
"""
Generate a Table of Contents (TOC) from Markdown file headings.
Supports:
  - Single markdown file or entire directory scan.
  - Generating a standalone TOC.md or injecting the TOC directly into the top of the file.
  - Automatic filtering of noise, metadata headers, and Arabic script lines.
  - Clickable markdown anchor links with line numbers or Github-style anchors.
  - Hierarchical nesting based on heading depth (#, ##, ###, etc.).

Usage examples:
    # 1. Generate standalone TOC for a single markdown file:
    uv run python generate_toc_from_markdown.py output_markdown/volume_1/Ihya_Ghazali_Eng_Book_volume_1_Complete_complete.md

    # 2. Inject TOC directly into the document (between <!-- TOC_START --> and <!-- TOC_END -->):
    uv run python generate_toc_from_markdown.py output_markdown/volume_1/Ihya_Ghazali_Eng_Book_volume_1_Complete_complete.md --inject

    # 3. Specify custom maximum heading depth (e.g. only H1 and H2):
    uv run python generate_toc_from_markdown.py myfile.md --max-depth 2

    # 4. Scan an entire folder and generate TOCs for all markdown files:
    uv run python generate_toc_from_markdown.py output_markdown/ --all
"""

import os
import sys
import re
import argparse
from pathlib import Path


def slugify(text: str) -> str:
    """Generate a GitHub-compatible markdown heading anchor."""
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_]+', '-', text)
    return text.strip('-')


def is_noise_heading(text: str) -> bool:
    """Filter out OCR artifacts, metadata banners, and Arabic verses from the TOC."""
    clean = text.strip()

    # Skip document intelligence banner
    if "Document Intelligence Analysis" in clean:
        return True

    # Skip Quranic / Arabic script verses
    if re.search(r'[\u0600-\u06FF]', clean):
        return True

    # Skip recurring page header running noise (e.g., 'Book One: Knowledge' without a chapter)
    if re.fullmatch(r'Book\s+(One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|\d+):?\s*[\w\s]*', clean, re.I) and len(clean.split()) <= 4:
        return False  # Keep book markers

    # Skip solitary punctuation or short noise
    if len(clean) < 3 or re.fullmatch(r'[\W\d_]+', clean):
        return True

    return False


def extract_headings(md_path: Path, max_depth: int = 3, min_depth: int = 1) -> list:
    """Parse markdown file and extract structured headings with line numbers."""
    headings = []
    with open(md_path, "r", encoding="utf-8") as f:
        for line_num, line in enumerate(f, 1):
            line_str = line.strip()
            match = re.match(r'^(#{1,6})\s+(.*)', line_str)
            if match:
                depth = len(match.group(1))
                title = match.group(2).strip()

                if min_depth <= depth <= max_depth and not is_noise_heading(title):
                    headings.append({
                        "line": line_num,
                        "depth": depth,
                        "title": title,
                        "anchor": slugify(title)
                    })
    return headings


def format_toc(headings: list, md_file: Path, standalone: bool = True) -> str:
    """Format extracted headings into a nested Markdown list with clickable links."""
    if not headings:
        return "*(No headings found)*\n"

    # Normalize depth so the lowest level starts at 0 indentation
    min_found_depth = min(h["depth"] for h in headings)

    lines = []
    if standalone:
        lines.append(f"# Table of Contents\n")
        lines.append(f"**Source Document:** [{md_file.name}]({md_file.name})  ")
        lines.append(f"**Total Sections:** {len(headings)}\n")
        lines.append("---\n")

    for h in headings:
        indent = "  " * (h["depth"] - min_found_depth)
        link = f"#{h['anchor']}" if not standalone else f"{md_file.name}#L{h['line']}"
        lines.append(f"{indent}- [{h['title']}]({link})")

    return "\n".join(lines) + "\n"


def process_file(
    md_file: Path,
    output_path: Path = None,
    inject: bool = False,
    max_depth: int = 3,
    min_depth: int = 1
):
    print(f"\nScanning: {md_file}")
    headings = extract_headings(md_file, max_depth=max_depth, min_depth=min_depth)
    print(f"  Found {len(headings)} section headings (Depth H{min_depth}–H{max_depth}).")

    if not headings:
        print("  Skipping: No headings matching criteria found.")
        return

    if inject:
        # Inject TOC into the target file
        with open(md_file, "r", encoding="utf-8") as f:
            content = f.read()

        toc_block = (
            "\n<!-- TOC_START -->\n\n"
            "## Table of Contents\n\n"
            + format_toc(headings, md_file, standalone=False)
            + "\n<!-- TOC_END -->\n"
        )

        pattern = re.compile(r'<!-- TOC_START -->.*?<!-- TOC_END -->', re.DOTALL)
        if pattern.search(content):
            new_content = pattern.sub(toc_block.strip(), content)
            print("  Updated existing <!-- TOC_START --> block in file.")
        else:
            # Insert after the first major heading or metadata block
            first_h = re.search(r'(#\s+.*?\n)', content)
            if first_h:
                insert_pos = first_h.end()
                new_content = content[:insert_pos] + "\n" + toc_block + "\n" + content[insert_pos:]
            else:
                new_content = toc_block + "\n" + content
            print("  Injected TOC at top of document.")

        with open(md_file, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"  [✓] Updated: {md_file}")

    else:
        # Write standalone TOC file
        target_out = output_path or (md_file.parent / f"{md_file.stem}_TOC.md")
        toc_md = format_toc(headings, md_file, standalone=True)
        with open(target_out, "w", encoding="utf-8") as f:
            f.write(toc_md)
        print(f"  [✓] Saved standalone TOC to: {target_out}")


def main():
    parser = argparse.ArgumentParser(
        description="Generate Table of Contents from Markdown file headings."
    )
    parser.add_argument(
        "target",
        help="Path to markdown file or directory to scan."
    )
    parser.add_argument(
        "-o", "--output",
        default=None,
        help="Path for standalone output TOC markdown file."
    )
    parser.add_argument(
        "--inject",
        action="store_true",
        help="Inject the TOC directly into the document instead of creating a separate file."
    )
    parser.add_argument(
        "--max-depth",
        type=int,
        default=3,
        help="Maximum heading level to include (1 for #, 2 for ##, 3 for ###, etc.) [default: 3]."
    )
    parser.add_argument(
        "--min-depth",
        type=int,
        default=1,
        help="Minimum heading level to include [default: 1]."
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Recursively process all markdown files if target is a directory."
    )

    args = parser.parse_args()
    target_path = Path(args.target)

    if not target_path.exists():
        print(f"Error: Target path '{target_path}' does not exist.", file=sys.stderr)
        sys.exit(1)

    if target_path.is_file():
        out_p = Path(args.output) if args.output else None
        process_file(
            target_path,
            output_path=out_p,
            inject=args.inject,
            max_depth=args.max_depth,
            min_depth=args.min_depth
        )
    elif target_path.is_dir():
        glob_pattern = "**/*.md" if args.all else "*.md"
        md_files = [f for f in target_path.glob(glob_pattern) if not f.name.endswith(("_TOC.md", "TOC.md", "README.md"))]
        print(f"Found {len(md_files)} candidate markdown files in {target_path}...")
        for f in md_files:
            process_file(
                f,
                inject=args.inject,
                max_depth=args.max_depth,
                min_depth=args.min_depth
            )


if __name__ == "__main__":
    main()
