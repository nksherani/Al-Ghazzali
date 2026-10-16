#!/usr/bin/env python3
"""Convert the four Ihya markdown volumes to nested JSON."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
VOLUME_FILES = {
    1: ROOT / "output_markdown/volume_1/Ihya_Ghazali_Eng_Book_volume_1_Complete_complete.md",
    2: ROOT / "output_markdown/Ihya_Ghazali_Eng_Book_volume_2_Complete_complete.md",
    3: ROOT / "output_markdown/Ihya_Ghazali_Eng_Book_volume_3_Complete_complete.md",
    4: ROOT / "output_markdown/Ihya_Ghazali_Eng_Book_volume_4_Complete_complete.md",
}
VOLUME_TITLES = {
    1: "The Quarter of the Acts of Worship",
    2: "The Quarter of the Habits of Life",
    3: "The Quarter of the Destructives",
    4: "The Quarter of the Saviors",
}
BASE_METADATA = {
    "work": "Ihya' Ulum Ad-Din (Revival of Religion's Sciences)",
    "work_ar": "إِحْيَاء عُلُوم الدِّين",
    "author": "Imam Abu Hamid al-Ghazali (450–505 AH / 1058–1111 CE)",
    "translator": "Mohammad Mahdi al-Sharif",
    "publisher": "Dar Al-Kotob Al-Ilmiyah (Beirut, Lebanon)",
}


def parse_heading(line: str) -> tuple[int, str] | None:
    match = re.match(r"^(#{1,6})\s+(.+?)\s*$", line)
    return (len(match.group(1)), match.group(2).strip()) if match else None


def is_book(title: str) -> bool:
    return bool(re.match(r"^Book\s+(?:One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|\d+)\b", title, re.I))


def is_chapter(title: str) -> bool:
    return bool(re.match(r"^Chapter\b", title, re.I))


def is_part(title: str) -> bool:
    return bool(re.match(r"^Part\b", title, re.I))


def clean_content(text: str) -> str:
    """Remove page/OCR comments while preserving paragraph breaks."""
    text = re.sub(r"<!--.*?-->", "\n", text, flags=re.S)
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"\n[ \t]+\n", "\n\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


class MarkdownVolume:
    def __init__(self, volume: int, path: Path):
        self.volume = volume
        self.path = path
        self.lines = path.read_text(encoding="utf-8").splitlines()
        self.headings = []
        self.page_marks = []
        for i, line in enumerate(self.lines):
            parsed = parse_heading(line)
            if parsed:
                self.headings.append({"line": i, "depth": parsed[0], "title": parsed[1]})
            page_match = re.search(r'PageNumber=["\']?(\d+)', line)
            if page_match:
                self.page_marks.append((i, int(page_match.group(1))))
        self.body_end = self._find_contents_boundary()
        self.headings = [h for h in self.headings if h["line"] < self.body_end]

    def _find_contents_boundary(self) -> int:
        books = [h for h in self.headings if h["depth"] == 1 and is_book(h["title"])]
        last_book_line = books[-1]["line"] if books else -1
        for i, line in enumerate(self.lines):
            if i <= last_book_line:
                continue
            stripped = line.strip()
            heading = parse_heading(stripped)
            if heading and heading[0] == 1 and heading[1].casefold() == "contents":
                return i
            if re.fullmatch(r"CONTENTS(?:\s+\d+)?", stripped, re.I):
                return i
        return len(self.lines)

    def page_at(self, line_index: int | None) -> int | None:
        if line_index is None:
            return None
        page = None
        for mark_line, number in self.page_marks:
            if mark_line > line_index:
                break
            page = number
        return page

    def content(self, start: int, end: int) -> str:
        return clean_content("\n".join(self.lines[start:end]))

    def front_matter(self, first_content_line: int) -> dict:
        start = 0
        for i, line in enumerate(self.lines[:first_content_line]):
            if "<!-- Sliced Batch:" in line:
                start = i + 1
                break
        return {
            "heading": "Front Matter & Publication Details",
            "page_start": None,
            "page_end": self.page_at(first_content_line),
            "text": self.content(start, first_content_line),
        }

    def build_nodes(
        self,
        headings: list[dict],
        parent_line_end: int,
        parent_page_end: int | None,
        prefix: str,
        kind: str,
    ) -> list[dict]:
        nodes = []
        for index, heading in enumerate(headings):
            next_heading = headings[index + 1] if index + 1 < len(headings) else None
            start = heading["line"]
            end = next_heading["line"] if next_heading else parent_line_end
            lower = [
                h for h in self.headings
                if start < h["line"] < end and h["depth"] > heading["depth"]
            ]
            intro_end = lower[0]["line"] if lower else end
            intro = self.content(start + 1, intro_end)
            sections = []
            for j, section_heading in enumerate(lower):
                section_end = lower[j + 1]["line"] if j + 1 < len(lower) else end
                sections.append({
                    "id": f"{prefix}_{kind}_{index + 1}_sec_{j + 1}",
                    "level": section_heading["depth"],
                    "heading": section_heading["title"],
                    "page_start": self.page_at(section_heading["line"]),
                    "page_end": None,
                    "text": self.content(section_heading["line"] + 1, section_end),
                })
            node = {
                "id": f"{prefix}_{kind}_{index + 1}",
                "number": index + 1,
                "heading": heading["title"],
                "page_start": self.page_at(start),
                "page_end": self.page_at(next_heading["line"]) if next_heading else parent_page_end,
            }
            if sections:
                if intro:
                    node["intro_text"] = intro
                node["sections"] = sections
            else:
                node["text"] = intro
            for j, section in enumerate(sections):
                next_page = sections[j + 1]["page_start"] if j + 1 < len(sections) else None
                section["page_end"] = next_page if next_page is not None else node["page_end"]
            nodes.append(node)
        return nodes


def parse_volume(volume: int, path: Path) -> dict:
    source = MarkdownVolume(volume, path)
    top_headings = [
        h for h in source.headings
        if h["depth"] == 1 and (h["title"].casefold() == "prelude" or is_book(h["title"]))
    ]
    first_content_line = top_headings[0]["line"] if top_headings else source.body_end
    front = source.front_matter(first_content_line)
    prelude = next((h for h in top_headings if h["title"].casefold() == "prelude"), None)
    book_headings = [h for h in top_headings if is_book(h["title"])]
    books = []

    if prelude:
        next_top = book_headings[0]["line"] if book_headings else source.body_end
        books.append({
            "id": "prelude",
            "type": "prelude",
            "book_number": None,
            "heading": prelude["title"],
            "page_start": source.page_at(prelude["line"]),
            "page_end": source.page_at(next_top),
            "text": source.content(prelude["line"] + 1, next_top),
        })

    for book_index, heading in enumerate(book_headings):
        book_number = book_index + 1
        next_book_line = book_headings[book_index + 1]["line"] if book_index + 1 < len(book_headings) else source.body_end
        children = [
            h for h in source.headings
            if heading["line"] < h["line"] < next_book_line
            and h["depth"] == 2
        ]
        use_parts = bool(children and all(is_part(h["title"]) for h in children))
        kind = "part" if use_parts else "chapter"
        key = "parts" if use_parts else "chapters"
        intro_end = children[0]["line"] if children else next_book_line
        intro = source.content(heading["line"] + 1, intro_end)
        page_end = source.page_at(next_book_line) if book_index + 1 < len(book_headings) else source.page_at(source.body_end)
        book = {
            "id": f"book_{book_number}",
            "type": "book",
            "book_number": book_number,
            "heading": heading["title"],
            "page_start": source.page_at(heading["line"]),
            "page_end": page_end,
        }
        if children:
            if intro:
                book["intro_text"] = intro
            book[key] = source.build_nodes(children, next_book_line, page_end, f"book_{book_number}", kind)
        else:
            book["text"] = source.content(heading["line"] + 1, next_book_line)
        books.append(book)

    has_parts = any("parts" in book for book in books)
    metadata = {
        **BASE_METADATA,
        "volume": volume,
        "volume_title": VOLUME_TITLES[volume],
        "total_books": len(book_headings),
        "has_prelude": prelude is not None,
        "structure": (
            "Hierarchical nested JSON objects containing headings and full text. "
            + ("Book Three is divided into 'parts', and Books 1, 2, 4-10 are divided into 'chapters'."
               if has_parts
               else "Books are divided into chapters, with full text and nested section headings.")
        ),
    }
    return {"metadata": metadata, "front_matter": front, "books": books}


def main() -> None:
    parser = argparse.ArgumentParser(description="Convert Ihya markdown volumes to nested JSON.")
    parser.add_argument("--volumes", nargs="+", type=int, choices=range(1, 5), default=[1, 2, 3, 4])
    parser.add_argument("--no-web-copy", action="store_true", help="Do not also write web/src/data/volume_N.json.")
    args = parser.parse_args()
    web_dir = ROOT / "web/src/data"
    for volume in args.volumes:
        source_path = VOLUME_FILES[volume]
        if not source_path.exists():
            parser.error(f"Markdown source not found: {source_path}")
        data = parse_volume(volume, source_path)
        payload = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
        output_path = source_path.with_suffix(".json")
        output_path.write_text(payload, encoding="utf-8")
        print(f"Volume {volume}: {data['metadata']['total_books']} books → {output_path}")
        if not args.no_web_copy:
            web_dir.mkdir(parents=True, exist_ok=True)
            web_path = web_dir / f"volume_{volume}.json"
            web_path.write_text(payload, encoding="utf-8")
            print(f"  Web data → {web_path}")


if __name__ == "__main__":
    main()
