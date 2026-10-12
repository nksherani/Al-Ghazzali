#!/usr/bin/env python3
"""
Cleanse Arabic text and Quranic verses in Markdown files of OCR artifacts and symbols:
  - Strips ayah brackets: ﴿ ﴾ « »
  - Strips OCR registration & noise symbols: ® © ™ ◌ • ■ ▲ ▼
  - Strips parenthesized verse numbers / OCR footnote fragments: (12), (٤), (®), (يَ), (َ)
  - Removes mistaken Markdown header markers (#, ##) on pure Arabic verse lines
  - Cleans up trailing dangling letters and symbols
  - Supports dry-run inspection, in-place editing, and backup creation.

Usage examples:
    # 1. Preview changes (Dry Run):
    uv run python clean_arabic_markdown.py output_markdown/volume_1/Ihya_Ghazali_Eng_Book_volume_1_Complete_complete.md --dry-run

    # 2. Clean in-place with automatic .bak backup:
    uv run python clean_arabic_markdown.py output_markdown/volume_1/Ihya_Ghazali_Eng_Book_volume_1_Complete_complete.md

    # 3. Clean without creating backup:
    uv run python clean_arabic_markdown.py output_markdown/volume_1/Ihya_Ghazali_Eng_Book_volume_1_Complete_complete.md --no-backup

    # 4. Clean all Markdown files across output_markdown:
    uv run python clean_arabic_markdown.py output_markdown/ --all
"""

import sys
import re
import argparse
from pathlib import Path


def is_arabic_text(text: str) -> bool:
    """Return True if the text contains Arabic script."""
    return bool(re.search(r'[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]', text))


def clean_arabic_line(line: str) -> str:
    """Cleanse Arabic line of surrounding decorative brackets and OCR noise symbols."""
    if not is_arabic_text(line):
        return line

    original_indent = re.match(r'^\s*', line).group(0)
    trimmed = line.strip()

    # 1. Strip markdown heading hashes (#, ##, etc.) if line is predominantly Arabic
    # (Avoids verses mistakenly formatted as H1/H2)
    trimmed = re.sub(r'^(#{1,6})\s+([﴿«\u0600-\u06FF])', r'\2', trimmed)

    # 2. Remove ornate Quranic verse brackets & guillemets
    trimmed = re.sub(r'[﴿﴾«»]', '', trimmed)

    # 3. Remove common OCR stray symbols
    trimmed = re.sub(r'[®©™◌•■▲▼~*]', '', trimmed)

    # 4. Remove OCR verse number artifacts like (12), (٤), (®), (يَ), (َ), (2)
    trimmed = re.sub(r'\s*\([0-9\u0660-\u0669\u0600-\u06FFa-zA-Z\s\.\,\-®©\?]*\)?', '', trimmed)

    # 5. Remove dangling unclosed brackets
    trimmed = re.sub(r'[\)\]\}]\s*$', '', trimmed)

    # 6. Remove dangling single OCR artifact letters/ayah-stops at the very end of verse
    trimmed = re.sub(r'\s+[يّتَوةن]+\s*$', '', trimmed)

    # 7. Normalize multi-spaces
    trimmed = re.sub(r'[ \t]{2,}', ' ', trimmed).strip()

    return original_indent + trimmed if trimmed else ""


def process_file(file_path: Path, dry_run: bool = False, backup: bool = True):
    print(f"\nProcessing: {file_path}")
    with open(file_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    modified_lines = []
    changes_count = 0
    sample_diffs = []

    for idx, line in enumerate(lines, 1):
        cleaned = clean_arabic_line(line.rstrip('\r\n'))
        # Re-attach newline
        ending = '\n'
        cleaned_with_nl = cleaned + ending if cleaned else ending

        if cleaned_with_nl != line:
            changes_count += 1
            if len(sample_diffs) < 5:
                sample_diffs.append((idx, line.strip(), cleaned.strip()))
        modified_lines.append(cleaned_with_nl)

    print(f"  Total lines modified: {changes_count}")

    if sample_diffs:
        print("  Sample changes:")
        for l_num, before, after in sample_diffs:
            print(f"    Line {l_num}:")
            print(f"      - {before}")
            print(f"      + {after}")

    if not dry_run and changes_count > 0:
        if backup:
            bak_path = file_path.with_suffix(file_path.suffix + ".bak")
            with open(bak_path, "w", encoding="utf-8") as f:
                f.writelines(lines)
            print(f"  Backup saved to: {bak_path.name}")

        with open(file_path, "w", encoding="utf-8") as f:
            f.writelines(modified_lines)
        print(f"  [✓] Updated file: {file_path}")
    elif dry_run:
        print("  [Dry Run] No files modified.")


def main():
    parser = argparse.ArgumentParser(
        description="Cleanse Arabic text and Quranic verses in Markdown files of surrounding symbols."
    )
    parser.add_argument(
        "target",
        help="Path to a markdown file or directory."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview changes without modifying files."
    )
    parser.add_argument(
        "--no-backup",
        action="store_true",
        help="Do not create .bak backup file before overwriting."
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Process all markdown files recursively if target is a directory."
    )

    args = parser.parse_args()
    target_path = Path(args.target)

    if not target_path.exists():
        print(f"Error: Target path '{target_path}' does not exist.", file=sys.stderr)
        sys.exit(1)

    if target_path.is_file():
        process_file(target_path, dry_run=args.dry_run, backup=not args.no_backup)
    elif target_path.is_dir():
        glob_pat = "**/*.md" if args.all else "*.md"
        md_files = [f for f in target_path.glob(glob_pat) if not f.name.endswith(".bak")]
        print(f"Found {len(md_files)} markdown files in {target_path}...")
        for f in md_files:
            process_file(f, dry_run=args.dry_run, backup=not args.no_backup)


if __name__ == "__main__":
    main()
