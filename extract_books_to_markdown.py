#!/usr/bin/env python3
"""
Extract text content from Ihya Ulum al-Din volumes and format as Markdown.
Uses the provided TOC files to generate Table of Contents for each volume.

Dependencies:
    pip install pymupdf
or
    uv run --with pymupdf python extract_books_to_markdown.py
"""

import sys
import os
import re
from pathlib import Path

try:
    import pymupdf  # PyMuPDF
except ImportError:
    try:
        import fitz as pymupdf
    except ImportError:
        print("Error: PyMuPDF is not installed. Please install it using:")
        print("    pip install pymupdf")
        print("or run with uv:")
        print("    uv run --with pymupdf python extract_books_to_markdown.py")
        sys.exit(1)


# Base paths
PROJECT_ROOT = Path(__file__).resolve().parent
PDF_DIR = PROJECT_ROOT / "Ihya-ul-uloom" / "Ghazzali"
OUTPUT_DIR = PROJECT_ROOT / "output_markdown"

VOLUME_METADATA = {
    1: {
        "title": "Volume 1: The Quarter of the Acts of Worship (Rub' al-'Ibadat)",
        "book_pdf": "Ihya_Ghazali_Eng_Book_volume_1_Complete.pdf",
        "toc_pdf": "Ihya_Ghazali_Eng_TOC_volume_1.pdf",
        "start_page": 5,      # 1-indexed: First page containing text/prelude
        "toc_start_in_book": 697  # Pages at the end where TOC begins in the complete book
    },
    2: {
        "title": "Volume 2: The Quarter of the Habits of Life / Customs (Rub' al-'Adat)",
        "book_pdf": "Ihya_Ghazali_Eng_Book_volume_2_Complete.pdf",
        "toc_pdf": "Ihya_Ghazali_Eng_TOC_volume_2.pdf",
        "start_page": 5,
        "toc_start_in_book": 637
    },
    3: {
        "title": "Volume 3: The Quarter of the Destructives (Rub' al-Muhlikat)",
        "book_pdf": "Ihya_Ghazali_Eng_Book_volume_3_Complete.pdf",
        "toc_pdf": "Ihya_Ghazali_Eng_TOC_volume_3.pdf",
        "start_page": 4,
        "toc_start_in_book": 668
    },
    4: {
        "title": "Volume 4: The Quarter of the Saviors (Rub' al-Munjiyat)",
        "book_pdf": "Ihya_Ghazali_Eng_Book_volume_4_Complete.pdf",
        "toc_pdf": "Ihya_Ghazali_Eng_TOC_volume_4.pdf",
        "start_page": 4,
        "toc_start_in_book": 767
    }
}


def clean_text(text: str) -> str:
    """Fix common PDF extraction artifacts and hyphenated word breaks."""
    # Rejoin hyphenated line wraps (e.g. "know- \nledge" -> "knowledge")
    text = re.sub(r'(\b[a-zA-Z]+)-\s*\n\s*([a-zA-Z]+\b)', r'\1\2', text)
    # Remove recurring non-printable or OCR noise characters
    text = text.replace('\r\n', '\n').replace('\r', '\n')
    return text


def parse_toc(toc_pdf_path: Path, vol_num: int) -> list:
    """Extract and structure table of contents entries from the TOC PDF."""
    if not toc_pdf_path.exists():
        print(f"Warning: TOC PDF not found at {toc_pdf_path}")
        return []

    doc = pymupdf.open(toc_pdf_path)
    raw_lines = []

    # TOC page entries typically start at page index 3 (Page 4)
    start_p = 3 if len(doc) > 3 else 0
    for pno in range(start_p, len(doc)):
        page = doc[pno]
        blocks = page.get_text("blocks")
        for b in blocks:
            # Main left column contains titles (x0 < 420)
            if b[0] < 420:
                lines = [l.strip() for l in b[4].splitlines() if l.strip()]
                for line in lines:
                    # Filter out headers and running noise
                    if re.match(r'^(CONTENTS|\d+|Si\'|p\s+p|http|Dar Al|All rights)', line, re.I):
                        continue
                    clean_line = re.sub(r'[\.\-\_]{3,}', '', line).strip()
                    if len(clean_line) > 2:
                        raw_lines.append(clean_line)

    # Merge multi-line headings
    merged_entries = []
    for line in raw_lines:
        if not merged_entries:
            merged_entries.append(line)
            continue

        prev = merged_entries[-1]
        is_continuation = (
            prev.endswith(('AND', 'OF', 'THE', 'IN', 'ON', 'FOR', 'WITH', 'TO', 'UPON', 'AT', 'OR', 'BY', '(')) or
            line[0].islower() or
            line.startswith(('TO ', 'AND ', 'OF ', 'FOR ', 'WITH ', 'IN ', 'UPON ', 'AT ', 'AS ')) or
            (re.match(r'^(CHAPTER|BOOK)\b', prev, re.I) and not re.match(r'^(CHAPTER|BOOK)\b', line, re.I) and len(prev.split()) < 7)
        )

        if is_continuation:
            merged_entries[-1] = f"{prev} {line}"
        else:
            merged_entries.append(line)

    return merged_entries


def generate_toc_markdown(entries: list, vol_num: int, vol_title: str) -> str:
    """Generate Markdown representation of the Table of Contents."""
    md_lines = [
        f"# Table of Contents",
        f"## {vol_title}",
        "",
        "> This Table of Contents was extracted from the official TOC volume PDF.",
        "",
        "---",
        ""
    ]

    for item in entries:
        if re.match(r'^(QUARTER|THE\s+(FIRST|SECOND|THIRD|FOURTH)\s+QUARTER)\b', item, re.I):
            md_lines.append(f"\n# {item}\n")
        elif re.match(r'^(BOOK\s+[A-Z\d]+)\b', item, re.I):
            md_lines.append(f"\n## {item}\n")
        elif re.match(r'^(CHAPTER\s+[A-Z\d]+)\b', item, re.I):
            md_lines.append(f"\n### {item}\n")
        else:
            md_lines.append(f"- {item}")

    return "\n".join(md_lines) + "\n"


def block_to_markdown(block_text: str) -> str:
    """Convert an individual text block into clean Markdown."""
    cleaned = clean_text(block_text).strip()
    if not cleaned:
        return ""

    lines = [l.strip() for l in cleaned.splitlines() if l.strip()]
    if not lines:
        return ""

    first_line = lines[0]

    # Major Headings (Book, Chapter, Prelude, Bismillah)
    if re.match(r'^(BOOK\s+[A-Z\d]+|CHAPTER\s+[A-Z\d]+|VOLUME\s+[IVX\d]+|PRELUDE|IN THE NAME OF ALLAH|THE (FIRST|SECOND|THIRD|FOURTH) QUARTER)\b', first_line, re.I):
        return f"\n## {' '.join(lines)}\n"

    # Short uppercase headings
    if len(lines) <= 2 and first_line.isupper() and 4 < len(first_line) < 70 and not first_line.endswith(('.', ',', ';')):
        return f"\n### {' '.join(lines)}\n"

    # Subsection title (Title Cased, short line without trailing period)
    words = first_line.split()
    if (len(lines) == 1 and 
        len(first_line) < 75 and 
        not first_line.endswith(('.', ',', ';', ':')) and 
        len(words) > 1 and 
        sum(1 for w in words if w[0].isupper()) >= len(words) * 0.6):
        return f"\n#### {first_line}\n"

    # Join standard paragraph lines
    paragraph = " ".join(lines)
    # Check if blockquote
    if paragraph.startswith('"') and paragraph.endswith('"') and len(paragraph) > 40:
        return f"> {paragraph}"

    return paragraph


def extract_volume(vol_num: int, output_dir: Path):
    """Extract book content and TOC for a single volume."""
    meta = VOLUME_METADATA[vol_num]
    book_pdf_path = PDF_DIR / meta["book_pdf"]
    toc_pdf_path = PDF_DIR / meta["toc_pdf"]

    print(f"\n=======================================================")
    print(f"Processing Volume {vol_num}: {meta['title']}")
    print(f"=======================================================")

    vol_output_dir = output_dir / f"volume_{vol_num}"
    vol_output_dir.mkdir(parents=True, exist_ok=True)

    # 1. Parse and save TOC
    print(f"Parsing TOC PDF: {meta['toc_pdf']}...")
    toc_entries = parse_toc(toc_pdf_path, vol_num)
    toc_md = generate_toc_markdown(toc_entries, vol_num, meta["title"])
    toc_out_file = vol_output_dir / "TOC.md"
    with open(toc_out_file, "w", encoding="utf-8") as f:
        f.write(toc_md)
    print(f"  -> TOC saved to: {toc_out_file} ({len(toc_entries)} entries)")

    # 2. Extract Book content
    if not book_pdf_path.exists():
        print(f"Error: Book PDF not found: {book_pdf_path}")
        return

    doc = pymupdf.open(book_pdf_path)
    total_pages = len(doc)
    start_p = meta["start_page"] - 1  # 0-indexed
    end_p = meta["toc_start_in_book"] - 1  # Stop before end TOC section

    print(f"Extracting content from {meta['book_pdf']} (Pages {start_p + 1} to {end_p + 1} of {total_pages})...")

    full_content_lines = [
        f"# {meta['title']}",
        f"**Author:** Imam Abu Hamid Al-Ghazali (450-505 H. = 1058-1111 A.D.)  ",
        f"**Translation:** Mohammad Mahdi al-Sharif  ",
        f"**Table of Contents:** See [TOC.md](./TOC.md)  ",
        "",
        "---",
        ""
    ]

    current_book_name = "Introduction"
    current_book_lines = list(full_content_lines)

    for pno in range(start_p, end_p):
        page = doc[pno]
        rect = page.rect
        blocks = page.get_text("blocks")

        page_elements = []
        page_num_display = pno + 1

        for b in blocks:
            # b = (x0, y0, x1, y1, text, block_no, block_type)
            if b[6] == 0:  # text block
                y0, y1 = b[1], b[3]
                # Strip running header and footer margins
                if y0 >= 42 and y1 <= (rect.height - 35):
                    md_block = block_to_markdown(b[4])
                    if md_block:
                        page_elements.append(md_block)

        if page_elements:
            # Check for new Book division
            for el in page_elements:
                book_match = re.search(r'## (BOOK\s+[A-Z\d]+[:\s\w\-\']+)', el, re.I)
                if book_match:
                    # Flush previous book file
                    safe_book_name = re.sub(r'[^\w\-_\. ]', '_', current_book_name).strip()
                    book_file = vol_output_dir / f"{safe_book_name}.md"
                    with open(book_file, "w", encoding="utf-8") as f:
                        f.write("\n\n".join(current_book_lines) + "\n")

                    current_book_name = book_match.group(1).strip()
                    current_book_lines = [
                        f"# {meta['title']}",
                        f"## {current_book_name}",
                        f"[<-- Back to Volume TOC](./TOC.md)",
                        "",
                        "---",
                        ""
                    ]

            page_header = f"\n<!-- Page {page_num_display} -->\n"
            page_content = page_header + "\n\n".join(page_elements)

            full_content_lines.append(page_content)
            current_book_lines.append(page_content)

        if (pno + 1) % 100 == 0 or pno == end_p - 1:
            print(f"  Processed page {pno + 1}/{end_p}...")

    # Write final active book file
    safe_book_name = re.sub(r'[^\w\-_\. ]', '_', current_book_name).strip()
    book_file = vol_output_dir / f"{safe_book_name}.md"
    with open(book_file, "w", encoding="utf-8") as f:
        f.write("\n\n".join(current_book_lines) + "\n")

    # Write complete volume Markdown
    full_vol_file = vol_output_dir / f"volume_{vol_num}_complete.md"
    with open(full_vol_file, "w", encoding="utf-8") as f:
        f.write("\n\n".join(full_content_lines) + "\n")

    print(f"Finished Volume {vol_num}!")
    print(f"  -> Full volume file: {full_vol_file}")
    print(f"  -> Book chapters stored in: {vol_output_dir}/")


def main():
    print("Starting Ihya Ulum al-Din extraction to Markdown...")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Master README
    master_readme = [
        "# Ihya Ulum al-Din (Revival of Religious Sciences)",
        "**Author:** Imam Abu Hamid Al-Ghazali (450–505 A.H. / 1058–1111 C.E.)  ",
        "**Translation:** Mohammad Mahdi al-Sharif  ",
        "",
        "This repository contains structured Markdown extractions of the 4 volumes of *Ihya Ulum al-Din*, including dedicated Tables of Contents for each volume.",
        "",
        "## Volumes Navigation",
        "",
        "1. **[Volume 1: The Quarter of the Acts of Worship (Rub' al-'Ibadat)](./volume_1/TOC.md)**",
        "   - [Volume 1 Full Text](./volume_1/volume_1_complete.md)",
        "2. **[Volume 2: The Quarter of the Habits of Life (Rub' al-'Adat)](./volume_2/TOC.md)**",
        "   - [Volume 2 Full Text](./volume_2/volume_2_complete.md)",
        "3. **[Volume 3: The Quarter of the Destructives (Rub' al-Muhlikat)](./volume_3/TOC.md)**",
        "   - [Volume 3 Full Text](./volume_3/volume_3_complete.md)",
        "4. **[Volume 4: The Quarter of the Saviors (Rub' al-Munjiyat)](./volume_4/TOC.md)**",
        "   - [Volume 4 Full Text](./volume_4/volume_4_complete.md)",
        ""
    ]
    with open(OUTPUT_DIR / "README.md", "w", encoding="utf-8") as f:
        f.write("\n".join(master_readme))

    for vol_num in [1, 2, 3, 4]:
        extract_volume(vol_num, OUTPUT_DIR)

    print("\n=======================================================")
    print(f"All volumes successfully extracted to: {OUTPUT_DIR}")
    print("=======================================================")


if __name__ == "__main__":
    main()
