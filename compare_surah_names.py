#!/usr/bin/env python3
"""
Compare Surah names between Quran JSON and extracted Markdown files.
Uses fuzzy logic to match variations in transliteration, prefixes (Al-/An-), and English names.

Usage:
    uv run python compare_surah_names.py
"""

import json
import re
from pathlib import Path
from difflib import SequenceMatcher

QURAN_JSON = Path("Al-Quran/Al-Quran.json")
MARKDOWN_FILE = Path("output_markdown/volume_1/Ihya_Ghazali_Eng_Book_volume_1_Complete_complete.md")
OUTPUT_MD = Path("output_markdown/surah_names_comparison.md")


def load_quran_surahs(json_path: Path) -> list:
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data["data"]["surahs"]


def normalize_surah_name(name: str) -> str:
    """Normalize transliterations for robust fuzzy comparison."""
    n = name.lower().strip()
    n = re.sub(r"^(?:surah|surat|chapter\s+of)\s+", "", n)
    n = re.sub(r"^(?:the\s+)", "", n)
    # Remove sun/moon letter prefixes: al-, an-, at-, as-, ar-, az-, ad-, adh-, ash-, etc.
    n = re.sub(r"^(?:al|an|at|as|ar|az|ad|adh|ash|aj|ak|am|ab|ah)[\-\s]?", "", n)
    # Strip apostrophes, hyphens, and whitespace
    n = re.sub(r"[\s\-\'\`\’]", "", n)
    return n


def extract_surah_references(md_path: Path) -> dict:
    with open(md_path, "r", encoding="utf-8") as f:
        text = f.read()

    # Repair line breaks inside citations like (Al-\nBaqarah 255)
    text = re.sub(r"\(([A-Za-z\s\-\'\`]+?)\n([A-Za-z\s\-\'\`]+?\s+\d+)\)", r"(\1 \2)", text)

    # 1. Matches citations like (Al-Baqarah 255), (An-Nur 35), (Al Imran 18)
    citation_pattern = re.compile(r"\(([A-Za-z\s\-\'\`]+?)\s+(\d+(?:\s*[:\-]\s*\d+)?)\)")
    citations = citation_pattern.findall(text)

    # 2. Matches explicit textual mentions like 'Surah Al-Fatihah', 'Surat Al-Baqarah'
    mention_pattern = re.compile(r"\b(?:Surah|Surat)\s+([A-Za-z\-\'\`]+(?:\s+[A-Za-z\-\'\`]+)?)", re.I)
    mentions = mention_pattern.findall(text)

    # 3. Matches direct named mentions of prominent surahs like Al-Fatihah, Ya Sin, etc.
    direct_named = [
        "Al-Fatihah", "Al-Baqarah", "Aal-e-Imran", "An-Nisa", "Al-Ma'idah", "Al-An'am",
        "Al-A'raf", "Al-Anfal", "At-Tawba", "At-Tawbah", "Al-Kahf", "Maryam", "Taa-Haa",
        "Ya Sin", "Yaseen", "Al-Mulk", "Al-Ikhlas", "Al-Falaq", "An-Nas"
    ]
    direct_counts = {}
    for dn in direct_named:
        cnt = len(re.findall(r"\b" + re.escape(dn) + r"\b", text, re.I))
        if cnt > 0:
            direct_counts[dn] = cnt

    blacklist = {
        "volume", "vol", "part", "page", "chapter", "question", "hadith", 
        "see", "no", "number", "al", "the", "this", "that", "every", "each"
    }

    candidates = {}
    for name, verse in citations:
        clean = re.sub(r"\s+", " ", name.strip())
        if clean.lower() not in blacklist and len(clean) > 2:
            candidates[clean] = candidates.get(clean, 0) + 1

    for name in mentions:
        clean = re.sub(r"\s+", " ", name.strip())
        if clean.lower() not in blacklist and len(clean) > 2:
            candidates[clean] = candidates.get(clean, 0) + 1

    for name, cnt in direct_counts.items():
        candidates[name] = max(candidates.get(name, 0), cnt)

    return candidates


def match_surahs(quran_surahs: list, candidates: dict) -> tuple:
    surah_matches = {s["number"]: {"surah": s, "variants": {}} for s in quran_surahs}
    special_cases = {
        "the poets": 26,
        "sheba": 34,
        "nuh": 71,
        "al imran": 3,
        "al-imran": 3,
    }

    for cand, count in candidates.items():
        cand_lower = cand.lower()
        cand_norm = normalize_surah_name(cand)
        if not cand_norm or len(cand_norm) < 2:
            continue

        if cand_lower in special_cases:
            target_num = special_cases[cand_lower]
            surah_matches[target_num]["variants"][cand] = count
            continue

        best_surah = None
        best_score = 0

        for s in quran_surahs:
            s_name = s["englishName"]
            s_norm = normalize_surah_name(s_name)
            s_trans = s["englishNameTranslation"]

            if cand_lower == s_name.lower() or cand_norm == s_norm:
                score = 1.0
            else:
                s1 = SequenceMatcher(None, cand_norm, s_norm).ratio()
                s2 = SequenceMatcher(None, cand_lower, s_name.lower()).ratio()
                s3 = SequenceMatcher(None, cand_lower, s_trans.lower()).ratio()
                score = max(s1, s2, s3)

            if score > best_score:
                best_score = score
                best_surah = s

        if best_score >= 0.70 and best_surah:
            surah_matches[best_surah["number"]]["variants"][cand] = count

    return surah_matches


def generate_report(surah_matches: dict, total_candidates: int) -> str:
    lines = [
        "# Surah Names Comparison: Quran JSON vs. Ihya Ulum al-Din (Volume 1)",
        "",
        "This report compares the standard English transliterations of all 114 Surahs from `Al-Quran/Al-Quran.json` ",
        "against the unique transliterations and names extracted from `output_markdown/volume_1/Ihya_Ghazali_Eng_Book_volume_1_Complete_complete.md`.",
        "",
        "## Summary Statistics",
        "",
    ]

    total_surahs = len(surah_matches)
    cited_surahs = sum(1 for item in surah_matches.values() if item["variants"])
    uncited_surahs = total_surahs - cited_surahs

    diff_surahs = 0
    exact_only_surahs = 0
    for item in surah_matches.values():
        if item["variants"]:
            s_name = item["surah"]["englishName"]
            has_diff = any(v != s_name for v in item["variants"])
            if has_diff:
                diff_surahs += 1
            else:
                exact_only_surahs += 1

    lines.append(f"- **Total Surahs in Quran:** {total_surahs}")
    lines.append(f"- **Surahs Cited in Volume 1:** {cited_surahs} ({cited_surahs/total_surahs*100:.1f}%)")
    lines.append(f"- **Surahs with Differences in Transliteration/Naming:** {diff_surahs}")
    lines.append(f"- **Surahs with Exact Matching Transliteration Only:** {exact_only_surahs}")
    lines.append(f"- **Surahs Not Cited in Volume 1:** {uncited_surahs}")
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## Detailed Comparison Table")
    lines.append("")
    lines.append("| # | Quran JSON English Name | Arabic Name | English Translation | Name(s) in Book (Markdown) | Status / Differences |")
    lines.append("|---|---|---|---|---|---|")

    for num in sorted(surah_matches.keys()):
        item = surah_matches[num]
        s = item["surah"]
        variants = item["variants"]

        json_name = s["englishName"]
        arabic_name = s["name"]
        translation = s["englishNameTranslation"]

        if not variants:
            status = "*Not cited in Vol 1*"
            book_names = "-"
        else:
            book_names = ", ".join(f"`{v}` ({count}x)" for v, count in sorted(variants.items(), key=lambda x: -x[1]))
            # Determine differences
            diffs = []
            for v in variants:
                if v == json_name:
                    continue
                # Classify difference
                if v.lower() == json_name.lower():
                    diffs.append("Hyphen/Case format")
                elif normalize_surah_name(v) == normalize_surah_name(json_name):
                    diffs.append("Article prefix variant (Al-/An-)")
                elif v.lower() in [translation.lower(), "sheba", "the poets", "nuh"]:
                    diffs.append("English translation/variant name used")
                else:
                    diffs.append("Transliteration spelling variant")

            if not diffs:
                status = "**Exact match**"
            else:
                status = f"**Different:** {', '.join(sorted(set(diffs)))}"

        lines.append(f"| {num} | **{json_name}** | {arabic_name} | {translation} | {book_names} | {status} |")

    return "\n".join(lines) + "\n"


def main():
    print("Loading Quran JSON...")
    surahs = load_quran_surahs(QURAN_JSON)

    print("Extracting Surah references from Volume 1 markdown...")
    candidates = extract_surah_references(MARKDOWN_FILE)
    print(f"  Found {len(candidates)} distinct candidate names/references.")

    print("Matching and comparing names using fuzzy logic...")
    matches = match_surahs(surahs, candidates)

    report_md = generate_report(matches, len(candidates))
    OUTPUT_MD.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_MD, "w", encoding="utf-8") as f:
        f.write(report_md)

    print(f"\n[✓] Comparison report written to: {OUTPUT_MD}")


if __name__ == "__main__":
    main()
