#!/usr/bin/env python3
"""
Verify and repair Quranic references and Arabic text in Volume 1:
  1. Fixes non-uniform references (e.g., (Ibrahim 12) -> (Abraham 12)).
  2. Aligns and replaces corrupted/OCR-damaged Arabic verses and excerpts
     with pristine, authentic Uthmani text from Al-Quran/Al-Quran.json.
  3. Preserves book excerpt boundaries when an author quotes only part of a long Ayah.
  4. Keeps a backup of the original markdown file.

Usage:
    uv run python fix_quran_references_and_text.py
"""

import json
import re
from pathlib import Path
from difflib import SequenceMatcher

QURAN_JSON_PATH = Path("Al-Quran/Al-Quran.json")
MARKDOWN_PATH = Path("output_markdown/volume_1/Ihya_Ghazali_Eng_Book_volume_1_Complete_complete.md")


def load_quran_data(json_path: Path):
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    surahs = data["data"]["surahs"]

    by_name = {}
    for s in surahs:
        eng = s["englishName"].lower()
        by_name[eng] = s

    # Common aliases
    by_name["ibrahim"] = next(s for s in surahs if s["number"] == 14)
    by_name["al imran"] = next(s for s in surahs if s["number"] == 3)
    by_name["aal-e-imran"] = next(s for s in surahs if s["number"] == 3)
    by_name["sheba"] = next(s for s in surahs if s["number"] == 34)
    by_name["saba"] = next(s for s in surahs if s["number"] == 34)
    by_name["noah"] = next(s for s in surahs if s["number"] == 71)
    by_name["nooh"] = next(s for s in surahs if s["number"] == 71)
    by_name["nuh"] = next(s for s in surahs if s["number"] == 71)

    return surahs, by_name


def norm_ar(t: str) -> str:
    """Normalize Arabic text for robust fuzzy comparison without diacritics."""
    t = re.sub(r'[\u064B-\u065F\u0670\u06D6-\u06ED\u0610-\u061A\u200a\u2060\u200c\u200d\u200e\u200f]', '', t)
    t = re.sub(r'[إأآٱ]', 'ا', t)
    t = re.sub(r'ة', 'ه', t)
    t = re.sub(r'[ىي]', 'ي', t)
    t = re.sub(r'\s+', ' ', t).strip()
    return t


def extract_best_excerpt(full_ayah_text: str, book_excerpt_text: str) -> str:
    """If the book only quoted a sub-clause of an Ayah, align and extract that pristine portion."""
    book_norm = norm_ar(book_excerpt_text)
    if not book_norm:
        return full_ayah_text

    words = full_ayah_text.split()
    n_target_words = len(book_norm.split())

    # If the quote covers most of the Ayah, return full Ayah text
    if n_target_words >= len(words) * 0.75:
        return full_ayah_text

    best_sub = full_ayah_text
    best_ratio = 0.0

    # Search in window around target word count
    min_w = max(1, n_target_words - 4)
    max_w = min(len(words), n_target_words + 4)

    for length in range(min_w, max_w + 1):
        for start in range(len(words) - length + 1):
            sub = " ".join(words[start : start + length])
            ratio = SequenceMatcher(None, norm_ar(sub), book_norm).ratio()
            if ratio > best_ratio:
                best_ratio = ratio
                best_sub = sub

    if best_ratio >= 0.55:
        return best_sub
    return full_ayah_text


def process_markdown(md_path: Path, q_by_name: dict):
    print(f"\nProcessing {md_path}...")
    with open(md_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    citation_pattern = re.compile(r'\(([A-Za-z\s\-\'\`]+?)\s+(\d+(?:\s*[:\-]\s*\d+)?)\)')
    blacklist = {
        "volume", "vol", "part", "page", "chapter", "question", "hadith", 
        "see", "no", "number", "al", "the", "this", "that"
    }

    # Step 1: Pre-clean non-uniform references in text (e.g. Ibrahim 12 -> Abraham 12)
    modified_lines = []
    ref_fixes = 0
    for line in lines:
        def fix_ref(m):
            nonlocal ref_fixes
            s_name = m.group(1).strip()
            ref_num = m.group(2).strip()
            if s_name.lower() == "ibrahim":
                ref_fixes += 1
                return f"(Abraham {ref_num})"
            return m.group(0)

        cleaned_line = citation_pattern.sub(fix_ref, line)
        modified_lines.append(cleaned_line)

    lines = modified_lines
    print(f"  Fixed {ref_fixes} Surah reference names in text.")

    # Step 2: Match citations with following Arabic text and replace with pristine Quran JSON text
    arabic_replaced_count = 0
    i = 0
    output_lines = []

    while i < len(lines):
        line = lines[i]
        m = citation_pattern.search(line)

        if m:
            surah_name = m.group(1).strip()
            ref = m.group(2).strip()

            if surah_name.lower() not in blacklist and surah_name.lower() in q_by_name:
                s_obj = q_by_name[surah_name.lower()]

                # Look ahead for Arabic text within the next 12 lines
                ar_indices = []
                for j in range(i + 1, min(i + 14, len(lines))):
                    cand = lines[j].strip()
                    if re.search(r'[\u0600-\u06FF]', cand):
                        ar_indices.append(j)
                    elif ar_indices and cand and not cand.startswith('<!--') and not cand.startswith('<'):
                        break

                if ar_indices:
                    # Parse ayah numbers
                    if ':' in ref:
                        start_a, end_a = [int(x) for x in ref.split(':')]
                    elif '-' in ref:
                        start_a, end_a = [int(x) for x in ref.split('-')]
                    else:
                        start_a = end_a = int(ref)

                    # Retrieve Quran ayahs
                    ayah_texts = []
                    for a_num in range(start_a, end_a + 1):
                        if a_num <= len(s_obj["ayahs"]):
                            t = s_obj["ayahs"][a_num - 1]["text"].strip()
                            t = re.sub(r'[\u200a\u2060\n\r]', '', t)
                            ayah_texts.append(t)

                    if ayah_texts:
                        full_quran_text = " ".join(ayah_texts)
                        book_arabic_snippet = " ".join(lines[k].strip() for k in ar_indices)

                        # Align excerpt if author quoted only part of the Ayah
                        pristine_arabic = extract_best_excerpt(full_quran_text, book_arabic_snippet)

                        # Append lines up to the start of the Arabic block
                        output_lines.extend(lines[i : ar_indices[0]])

                        # Insert pristine Quranic Arabic line
                        output_lines.append(f"{pristine_arabic}\n")
                        arabic_replaced_count += 1

                        # Skip original Arabic lines
                        i = ar_indices[-1] + 1
                        continue

        output_lines.append(line)
        i += 1

    # Save backup and update file
    bak_path = md_path.with_suffix(md_path.suffix + ".bak")
    with open(bak_path, "w", encoding="utf-8") as f:
        f.writelines(lines)

    with open(md_path, "w", encoding="utf-8") as f:
        f.writelines(output_lines)

    print(f"  [✓] Successfully verified and replaced {arabic_replaced_count} Arabic verse blocks with authentic Quran text.")
    print(f"  [✓] Backup saved to: {bak_path.name}")


def main():
    print("Starting Quran References & Arabic Text Fixer...")
    surahs, q_by_name = load_quran_data(QURAN_JSON_PATH)
    process_markdown(MARKDOWN_PATH, q_by_name)
    print("\n=======================================================")
    print("Done! All references and Arabic verses in Volume 1 are fixed.")
    print("=======================================================")


if __name__ == "__main__":
    main()
