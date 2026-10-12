#!/usr/bin/env python3
"""
Unify Surah names across:
  1. Al-Quran/Al-Quran.json (updates englishName in all 114 surahs to the most frequent transliteration)
  2. output_markdown/volume_1/Ihya_Ghazali_Eng_Book_volume_1_Complete_complete.md (unifies all citations and mentions)

Uses the most frequent transliteration of each Surah found in Volume 1,
and repairs split/broken citations across newlines and page breaks.
"""

import json
import re
from pathlib import Path
from difflib import SequenceMatcher

QURAN_JSON_PATH = Path("Al-Quran/Al-Quran.json")
MARKDOWN_PATH = Path("output_markdown/volume_1/Ihya_Ghazali_Eng_Book_volume_1_Complete_complete.md")

# Canonical names determined as the most frequent form in Volume 1 (or canonical JSON name if uncited)
CANONICAL_SURAHS = {
    1: "Al-Fatihah",
    2: "Al-Baqarah",
    3: "Aal-e-Imran",
    4: "An-Nisa",
    5: "Al-Ma'idah",
    6: "Al-An'am",
    7: "Al-A'raf",
    8: "Al-Anfal",
    9: "At-Tawbah",
    10: "Yunus",
    11: "Hud",
    12: "Yusuf",
    13: "Ar-Ra'd",
    14: "Abraham",
    15: "Al-Hijr",
    16: "An-Nahl",
    17: "Al-Isra'",
    18: "Al-Kahf",
    19: "Maryam",
    20: "Taa-Haa",
    21: "Al-Anbiya",
    22: "Al-Hajj",
    23: "Al-Mu'minun",
    24: "An-Nur",
    25: "Al-Furqan",
    26: "Ash-Shu'ara'",
    27: "An-Naml",
    28: "Al-Qasas",
    29: "Al-Ankabut",
    30: "Ar-Rum",
    31: "Luqman",
    32: "As-Sajdah",
    33: "Al-Ahzab",
    34: "Sheba",
    35: "Fatir",
    36: "Ya Sin",
    37: "As-Saffat",
    38: "Sad",
    39: "Az-Zumar",
    40: "Ghafir",
    41: "Fussilat",
    42: "Ash-Shura",
    43: "Az-Zukhruf",
    44: "Ad-Dukhan",
    45: "Al-Jathiyah",
    46: "Al-Ahqaf",
    47: "Muhammad",
    48: "Al-Fath",
    49: "Al-Hujurat",
    50: "Qaf",
    51: "Adh-Dhariyat",
    52: "At-Tur",
    53: "An-Najm",
    54: "Al-Qamar",
    55: "Ar-Rahman",
    56: "Al-Waqi'ah",
    57: "Al-Hadid",
    58: "Al-Mujadilah",
    59: "Al-Hashr",
    60: "Al-Mumtahanah",
    61: "As-Saff",
    62: "Al-Jumu'ah",
    63: "Al-Munaafiqoon",
    64: "At-Taghaabun",
    65: "At-Talaq",
    66: "At-Tahrim",
    67: "Al-Mulk",
    68: "Al-Qalam",
    69: "Al-Haqqah",
    70: "Al-Ma'aarij",
    71: "Nuh",
    72: "Al-Jinn",
    73: "Al-Muzzammil",
    74: "Al-Muddaththir",
    75: "Al-Qiyamah",
    76: "Al-Insan",
    77: "Al-Mursalat",
    78: "An-Naba",
    79: "An-Nazi'at",
    80: "Abasa",
    81: "At-Takwir",
    82: "Al-Infitaar",
    83: "Al-Mutaffifin",
    84: "Al-Inshiqaq",
    85: "Al-Buruj",
    86: "At-Taariq",
    87: "Al-A'laa",
    88: "Al-Ghaashiya",
    89: "Al-Fajr",
    90: "Al-Balad",
    91: "Ash-Shams",
    92: "Al-Lail",
    93: "Ad-Duha",
    94: "Ash-Sharh",
    95: "At-Tin",
    96: "Al-Alaq",
    97: "Al-Qadr",
    98: "Al-Bayyina",
    99: "Az-Zalzalah",
    100: "Al-Adiyat",
    101: "Al-Qaari'a",
    102: "At-Takaathur",
    103: "Al-Asr",
    104: "Al-Humaza",
    105: "Al-Fil",
    106: "Quraish",
    107: "Al-Maa'un",
    108: "Al-Kawthar",
    109: "Al-Kafirun",
    110: "An-Nasr",
    111: "Al-Masad",
    112: "Al-Ikhlas",
    113: "Al-Falaq",
    114: "An-Naas"
}


def normalize(name: str) -> str:
    n = name.lower().strip()
    n = re.sub(r"^(?:surah|surat|chapter\s+of)\s+", "", n)
    n = re.sub(r"^(?:the\s+)", "", n)
    n = re.sub(r"^(?:al|an|at|as|ar|az|ad|adh|ash|aj|ak|am|ab|ah)[\-\s]?", "", n)
    n = re.sub(r"[\s\-\'\`\’]", "", n)
    return n


def build_variant_lookup() -> dict:
    """Build a lookup map from all known variant spellings to canonical name."""
    lookup = {}
    special = {
        "the poets": 26, "ash-shu'araa": 26, "ash-shu'ara'": 26, "ash-shu'ara": 26,
        "sheba": 34, "saba": 34,
        "noah": 71, "nooh": 71, "nuh": 71,
        "al imran": 3, "al-imran": 3, "aal-e-imran": 3,
        "at-tawba": 9, "at-tawbah": 9,
        "al-layl": 92, "al-lail": 92,
        "ad-duha": 93, "ad-dhuhaa": 93,
        "ya sin": 36, "yasin": 36, "yaseen": 36,
        "aj-hajj": 22, "al-fat-h": 48
    }
    for var, s_num in special.items():
        lookup[var.lower()] = CANONICAL_SURAHS[s_num]
        lookup[normalize(var)] = CANONICAL_SURAHS[s_num]

    # Map each canonical name and normalized version
    for num, c_name in CANONICAL_SURAHS.items():
        lookup[c_name.lower()] = c_name
        lookup[normalize(c_name)] = c_name

    return lookup


def find_canonical(raw_name: str, lookup: dict) -> str:
    clean = raw_name.strip()
    # Check direct lower match
    if clean.lower() in lookup:
        return lookup[clean.lower()]
    # Check normalized
    norm = normalize(clean)
    if norm in lookup:
        return lookup[norm]

    # Fuzzy match as fallback
    best_name = None
    best_score = 0
    for num, c_name in CANONICAL_SURAHS.items():
        score = SequenceMatcher(None, norm, normalize(c_name)).ratio()
        if score > best_score:
            best_score = score
            best_name = c_name

    if best_score >= 0.75:
        return best_name
    return raw_name


def update_quran_json(json_path: Path):
    print(f"\n1. Updating {json_path}...")
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    changed = 0
    for s in data["data"]["surahs"]:
        num = s["number"]
        canonical_name = CANONICAL_SURAHS[num]
        if s["englishName"] != canonical_name:
            print(f"   Surah {num:3d}: {s['englishName']} -> {canonical_name}")
            s["englishName"] = canonical_name
            changed += 1

    # Save with backup
    bak = json_path.with_suffix(".json.bak")
    with open(bak, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"  [✓] Updated {changed} Surah names in Quran JSON (backup saved to {bak.name}).")


def update_markdown_file(md_path: Path, lookup: dict):
    print(f"\n2. Updating {md_path}...")
    with open(md_path, "r", encoding="utf-8") as f:
        text = f.read()

    original_text = text

    # Step A: Fix split citation across pagebreak for line 10181:
    # "doers." (Al-Baqarah \n\n <!-- PageBreak --> ... \n verse_text \n 258)
    split_arabic_pattern = re.compile(
        r'\(([A-Za-z\s\-\'\`]+?)\s*\n\n'
        r'(<!--\s*PageBreak\s*-->\s*\n\n'
        r'<!--\s*PageNumber=.*?\s*-->\s*\n\n+'
        r'[\u0600-\u06FF\s\d\(\)]*?\n)'
        r'(\d+(?:\s*[:\-]\s*\d+)?)\)',
        re.MULTILINE
    )
    def repl_split_arabic(m):
        raw_surah = m.group(1).strip()
        middle = m.group(2)
        verse = m.group(3).strip()
        c_surah = find_canonical(raw_surah, lookup)
        # Move citation right after the verse number
        return f"({c_surah} {verse})\n\n{middle.strip()}"

    text = split_arabic_pattern.sub(repl_split_arabic, text)

    # Step B: Fix newline-split prefix inside parenthetical citation: e.g. (Al-\nBaqarah 255) -> (Al-Baqarah 255)
    text = re.sub(
        r'\(([A-Za-z]+)\-\s*\n\s*([A-Za-z\s\-\'\`]+?\s+\d+(?:\s*[:\-]\s*\d+)?)\)',
        r'(\1-\2)',
        text
    )

    # Step C: Fix split citations where surah is on one line and verse on next: (SurahName \n 123)
    text = re.sub(
        r'\(([A-Za-z\s\-\'\`]+?)\s*\n\s*(\d+(?:\s*[:\-]\s*\d+)?)\)',
        r'(\1 \2)',
        text
    )

    # Step D: Unify parenthetical citations: (Surah_Name Verse)
    citation_pattern = re.compile(r'\(([A-Za-z\s\-\'\`]+?)\s+(\d+(?:\s*[:\-]\s*\d+)?)\)')
    blacklist = {
        "volume", "vol", "part", "page", "chapter", "question", "hadith", 
        "see", "no", "number", "al", "the", "this", "that"
    }

    sub_count = [0]
    def repl_citation(m):
        raw_name = m.group(1).strip()
        verse = m.group(2).strip()
        if raw_name.lower() in blacklist:
            return m.group(0)

        c_name = find_canonical(raw_name, lookup)
        if c_name != raw_name:
            sub_count[0] += 1
            return f"({c_name} {verse})"
        return f"({raw_name} {verse})"

    text = citation_pattern.sub(repl_citation, text)

    # Step E: Unify explicit mentions: Surah <Name> or Surat <Name>
    surah_mention_pattern = re.compile(r'\b(Surah|Surat)\s+([A-Za-z\-\'\`]+(?:\s+[A-Za-z\-\'\`]+)?)', re.I)
    def repl_mention(m):
        prefix = m.group(1)
        raw_name = m.group(2).strip()
        if raw_name.lower() in blacklist or len(raw_name) <= 2:
            return m.group(0)
        c_name = find_canonical(raw_name, lookup)
        if c_name != raw_name:
            sub_count[0] += 1
            return f"{prefix} {c_name}"
        return m.group(0)

    text = surah_mention_pattern.sub(repl_mention, text)

    # Step F: Fix OCR space inside hyphens for Surah names: e.g. "Al- Baqarah" -> "Al-Baqarah"
    for c_name in CANONICAL_SURAHS.values():
        if "-" in c_name:
            pfx, rest = c_name.split("-", 1)
            text = re.sub(rf'\b{pfx}\-\s+{rest}\b', c_name, text)

    # Save backup and write updated markdown
    bak = md_path.with_suffix(md_path.suffix + ".bak")
    with open(bak, "w", encoding="utf-8") as f:
        f.write(original_text)

    with open(md_path, "w", encoding="utf-8") as f:
        f.write(text)

    print(f"  [✓] Unified {sub_count[0]} citations and mentions in markdown (backup saved to {bak.name}).")


def main():
    print("Starting Surah Name Uniformity Pipeline...")
    lookup = build_variant_lookup()

    # 1. Update Quran JSON
    update_quran_json(QURAN_JSON_PATH)

    # 2. Update Volume 1 Markdown
    update_markdown_file(MARKDOWN_PATH, lookup)

    print("\n=======================================================")
    print("Surah names successfully made uniform across both files!")
    print("=======================================================")


if __name__ == "__main__":
    main()
