"""
Extract document layout and content to Markdown using Azure AI Document Intelligence.
Supports:
  - Processing single pages, custom ranges, or the entire document (--all).
  - Checkpoint-based resumption: automatically skips batches already processed.
  - Automatic batch slicing and retry on rate-limits/transient errors.
  - Merged Markdown export and incremental progress tracking.

Usage examples:
    # 1. Process entire book in 50-page batches (resumes automatically if re-run):
    uv run python azure-di-script.py -f Ihya-ul-uloom/Ihya_Ghazali_Eng_Book_volume_1_Complete.pdf --all

    # 2. Process with custom batch size:
    uv run python azure-di-script.py -f Ihya-ul-uloom/Ihya_Ghazali_Eng_Book_volume_1_Complete.pdf --all --batch-size 25

    # 3. Force re-processing from scratch (ignore checkpoints):
    uv run python azure-di-script.py -f Ihya-ul-uloom/Ihya_Ghazali_Eng_Book_volume_1_Complete.pdf --all --fresh

    # 4. Interactive mode:
    uv run python azure-di-script.py
"""

import os
import sys
import time
import json
import argparse
from pathlib import Path

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    env_file = Path(__file__).resolve().parent / ".env"
    if env_file.exists():
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

import pymupdf
from azure.core.credentials import AzureKeyCredential
from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.ai.documentintelligence.models import (
    AnalyzeDocumentRequest,
    DocumentContentFormat
)


def get_credentials():
    endpoint = os.getenv("AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT") or os.getenv("AZURE_FORM_RECOGNIZER_ENDPOINT")
    key = os.getenv("AZURE_DOCUMENT_INTELLIGENCE_KEY") or os.getenv("AZURE_FORM_RECOGNIZER_KEY")

    if not endpoint or not key:
        print("\nError: Missing Azure Document Intelligence credentials.", file=sys.stderr)
        print("Please set AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT and AZURE_DOCUMENT_INTELLIGENCE_KEY in your .env file.", file=sys.stderr)
        sys.exit(1)

    return endpoint.strip(), key.strip()


def prompt_for_inputs():
    """Prompt user interactively for file path and processing mode."""
    pdf_candidates = list(Path(".").glob("**/*.pdf"))

    print("\n--- Azure AI Document Intelligence Extraction ---")
    if pdf_candidates:
        print("Available PDF files found in workspace:")
        for idx, p in enumerate(pdf_candidates[:10], 1):
            print(f"  [{idx}] {p}")

    while True:
        file_input = input("\nEnter file path (or index number above): ").strip()
        if file_input.isdigit() and 1 <= int(file_input) <= len(pdf_candidates):
            selected_path = str(pdf_candidates[int(file_input) - 1])
            break
        elif Path(file_input).exists():
            selected_path = file_input
            break
        elif file_input.startswith("http://") or file_input.startswith("https://"):
            selected_path = file_input
            break
        else:
            print(f"File '{file_input}' not found. Please try again.")

    total_pages = None
    if not (selected_path.startswith("http://") or selected_path.startswith("https://")):
        try:
            doc = pymupdf.open(selected_path)
            total_pages = len(doc)
            doc.close()
            print(f"Detected document has {total_pages} total pages.")
        except Exception:
            pass

    mode = input("\nProcess [A]ll pages or a [C]ustom range? [default: A]: ").strip().upper()
    if mode == "C":
        while True:
            start_str = input("Enter start page number [default: 1]: ").strip()
            if not start_str:
                start_page = 1
                break
            if start_str.isdigit() and int(start_str) > 0:
                start_page = int(start_str)
                break
            print("Please enter a valid positive number.")

        default_end = total_pages if total_pages else start_page
        while True:
            end_str = input(f"Enter end page number [default: {default_end}]: ").strip()
            if not end_str:
                end_page = default_end
                break
            if end_str.isdigit() and int(end_str) >= start_page:
                end_page = int(end_str)
                break
            print(f"Please enter a valid page number >= {start_page}.")
        process_all = False
    else:
        process_all = True
        start_page = 1
        end_page = total_pages or 1

    batch_size = 50
    if process_all or (end_page - start_page + 1 > 50):
        bs_input = input(f"Batch size for slicing (e.g. 50 for S0 tier, 2 for Free F0 tier) [default: 50]: ").strip()
        if bs_input.isdigit() and int(bs_input) > 0:
            batch_size = int(bs_input)

    return selected_path, process_all, start_page, end_page, batch_size


def analyze_slice(client, file_path: str, start_page: int, end_page: int, model_id: str = "prebuilt-read", max_retries: int = 3) -> str:
    """Slice pages using PyMuPDF and analyze with Azure Document Intelligence."""
    pages_param = f"{start_page}-{end_page}" if start_page != end_page else f"{start_page}"
    is_remote = file_path.startswith("http://") or file_path.startswith("https://")

    if is_remote:
        poller = client.begin_analyze_document(
            model_id=model_id,
            body=AnalyzeDocumentRequest(url_source=file_path),
            pages=pages_param,
            output_content_format=DocumentContentFormat.MARKDOWN
        )
        result = poller.result()
        return result.content or ""

    # Local file slicing
    src_doc = pymupdf.open(file_path)
    total_doc_pages = len(src_doc)
    actual_start = max(1, start_page)
    actual_end = min(total_doc_pages, end_page)

    slice_doc = pymupdf.open()
    slice_doc.insert_pdf(src_doc, from_page=actual_start - 1, to_page=actual_end - 1)
    pdf_bytes = slice_doc.tobytes()
    src_doc.close()
    slice_doc.close()

    print(f"  -> Sliced pages {actual_start} to {actual_end} ({len(pdf_bytes) / (1024*1024):.2f} MB)...")

    for attempt in range(1, max_retries + 1):
        try:
            poller = client.begin_analyze_document(
                model_id=model_id,
                body=pdf_bytes,
                output_content_format=DocumentContentFormat.MARKDOWN
            )
            result = poller.result()
            
            markdown_content = result.content if hasattr(result, "content") and result.content else ""
            if not markdown_content and hasattr(result, "pages") and result.pages:
                chunks = []
                for p in result.pages:
                    chunks.append(f"\n<!-- Page {p.page_number} -->\n")
                    if hasattr(p, "lines") and p.lines:
                        for l in p.lines:
                            chunks.append(l.content)
                markdown_content = "\n\n".join(chunks)

            return markdown_content

        except Exception as e:
            print(f"     [Attempt {attempt}/{max_retries} failed]: {e}")
            if attempt < max_retries:
                wait_time = attempt * 5
                print(f"     Waiting {wait_time}s before retrying...")
                time.sleep(wait_time)
            else:
                raise


def load_checkpoints(checkpoint_dir: Path) -> dict:
    """Load cached batch outputs from checkpoint directory."""
    checkpoints = {}
    if not checkpoint_dir.exists():
        return checkpoints

    for f in checkpoint_dir.glob("batch_*_*.md"):
        # Expecting batch_<start>_<end>.md
        parts = f.stem.split("_")
        if len(parts) == 3 and parts[1].isdigit() and parts[2].isdigit():
            key = (int(parts[1]), int(parts[2]))
            with open(f, "r", encoding="utf-8") as fp:
                checkpoints[key] = fp.read()
    return checkpoints


def save_checkpoint(checkpoint_dir: Path, b_start: int, b_end: int, content: str):
    """Save an individual batch result into the checkpoint directory."""
    checkpoint_dir.mkdir(parents=True, exist_ok=True)
    batch_file = checkpoint_dir / f"batch_{b_start}_{b_end}.md"
    with open(batch_file, "w", encoding="utf-8") as f:
        f.write(content)


def assemble_merged_file(out_file: Path, base_name: str, file_path: str, start_page: int, end_page: int, batches: list, checkpoints: dict, model_id: str = "prebuilt-read"):
    """Assemble all completed checkpoint batches into the final markdown file."""
    all_completed = all((b_start, b_end) in checkpoints for b_start, b_end in batches)
    completed_count = sum(1 for b in batches if b in checkpoints)

    header = [
        f"# Document Intelligence Analysis - {base_name}",
        f"- **Source File:** `{Path(file_path).name}`",
        f"- **Target Range:** Pages {start_page} to {end_page}",
        f"- **Status:** {'Complete' if all_completed else f'In progress ({completed_count}/{len(batches)} batches)'}",
        f"- **Model:** `{model_id}` (Markdown)",
        "",
        "---",
        ""
    ]

    body_chunks = []
    for b_start, b_end in batches:
        if (b_start, b_end) in checkpoints:
            body_chunks.append(
                f"\n\n<!-- Sliced Batch: Pages {b_start} to {b_end} -->\n\n"
                + checkpoints[(b_start, b_end)].strip()
            )

    with open(out_file, "w", encoding="utf-8") as f:
        f.write("\n".join(header) + "".join(body_chunks))


def process_document(
    file_path: str,
    process_all: bool,
    start_page: int,
    end_page: int,
    batch_size: int = 50,
    model_id: str = "prebuilt-read",
    fresh: bool = False,
    output_dir: Path = Path("output_markdown")
):
    endpoint, key = get_credentials()
    client = DocumentIntelligenceClient(endpoint=endpoint, credential=AzureKeyCredential(key))

    # Determine total pages
    is_remote = file_path.startswith("http://") or file_path.startswith("https://")
    base_name = Path(file_path.split("?")[0]).stem if is_remote else Path(file_path).stem

    if not is_remote:
        doc = pymupdf.open(file_path)
        total_pages = len(doc)
        doc.close()
    else:
        total_pages = end_page

    if process_all:
        start_page = 1
        end_page = total_pages

    output_dir.mkdir(parents=True, exist_ok=True)

    # Determine output file and checkpoint directory
    if process_all:
        out_file = output_dir / f"{base_name}_complete.md"
        checkpoint_dir = output_dir / f".checkpoints_{base_name}_complete"
    elif start_page == end_page:
        out_file = output_dir / f"{base_name}_p{start_page}.md"
        checkpoint_dir = output_dir / f".checkpoints_{base_name}_p{start_page}"
    else:
        out_file = output_dir / f"{base_name}_p{start_page}-p{end_page}.md"
        checkpoint_dir = output_dir / f".checkpoints_{base_name}_p{start_page}-p{end_page}"

    # If --fresh requested, clear existing checkpoints
    if fresh and checkpoint_dir.exists():
        print("(--fresh flag provided: ignoring prior checkpoints and re-processing from scratch)")
        for cf in checkpoint_dir.glob("*.md"):
            cf.unlink()

    checkpoints = load_checkpoints(checkpoint_dir)

    total_to_process = end_page - start_page + 1
    print(f"\n=======================================================")
    print(f"Azure Document Intelligence Extraction with Resumption")
    print(f"  Source: {file_path}")
    print(f"  Model: {model_id}")
    print(f"  Pages: {start_page} to {end_page} ({total_to_process} pages)")
    print(f"  Batch size: {batch_size} pages per chunk")
    print(f"  Checkpoint cache: {checkpoint_dir}")
    print(f"  Output target: {out_file}")
    print(f"=======================================================")

    # Generate batches
    batches = []
    curr = start_page
    while curr <= end_page:
        b_end = min(curr + batch_size - 1, end_page)
        batches.append((curr, b_end))
        curr = b_end + 1

    already_done = sum(1 for b in batches if b in checkpoints)
    print(f"Total batches: {len(batches)} (Completed so far: {already_done}, Remaining: {len(batches) - already_done})\n")

    start_time = time.time()

    for idx, (b_start, b_end) in enumerate(batches, 1):
        if (b_start, b_end) in checkpoints:
            print(f"[{idx}/{len(batches)}] Pages {b_start}–{b_end} already processed (skipping from checkpoint)")
            continue

        print(f"[{idx}/{len(batches)}] Processing pages {b_start}–{b_end} via Azure ({model_id})...")
        batch_md = analyze_slice(client, file_path, b_start, b_end, model_id=model_id)

        # 1. Save checkpoint for this batch
        save_checkpoint(checkpoint_dir, b_start, b_end, batch_md)
        checkpoints[(b_start, b_end)] = batch_md

        # 2. Update merged output file immediately
        assemble_merged_file(out_file, base_name, file_path, start_page, end_page, batches, checkpoints, model_id=model_id)

        print(f"  [✓] Batch {idx} completed, checkpointed, and appended to {out_file.name}")

        # Rate-limiting throttle pause
        if idx < len(batches):
            time.sleep(1)

    # Final assembly to make sure status is set to Complete
    assemble_merged_file(out_file, base_name, file_path, start_page, end_page, batches, checkpoints, model_id=model_id)

    elapsed = time.time() - start_time
    print(f"\n=======================================================")
    print(f"All {len(batches)} batch(es) finished in {elapsed:.1f}s!")
    print(f"Final merged Markdown:")
    print(f"  -> {out_file} ({out_file.stat().st_size / 1024:.1f} KB)")
    print(f"=======================================================")
    return out_file


def main():
    parser = argparse.ArgumentParser(
        description="Extract PDF pages to Markdown using Azure AI Document Intelligence with automatic batching & resumption."
    )
    parser.add_argument(
        "-f", "--file",
        help="Path to the PDF file or public document URL."
    )
    parser.add_argument(
        "-a", "--all",
        action="store_true",
        help="Process all pages in the document automatically."
    )
    parser.add_argument(
        "-s", "--start-page",
        type=int,
        default=None,
        help="Start page number (1-based)."
    )
    parser.add_argument(
        "-e", "--end-page",
        type=int,
        default=None,
        help="End page number (1-based, inclusive)."
    )
    parser.add_argument(
        "-b", "--batch-size",
        type=int,
        default=50,
        help="Number of pages to slice and send per batch [default: 50, use 2 for Free F0 tier]."
    )
    parser.add_argument(
        "-m", "--model",
        default="prebuilt-read",
        help="Azure Document Intelligence model ID to use [default: prebuilt-read]."
    )
    parser.add_argument(
        "--fresh",
        action="store_true",
        help="Ignore existing checkpoints and re-extract all batches from scratch."
    )
    parser.add_argument(
        "-o", "--output-dir",
        default="output_markdown",
        help="Directory to save the markdown file [default: output_markdown]."
    )

    args = parser.parse_args()

    if not args.file:
        file_path, process_all, start_page, end_page, batch_size = prompt_for_inputs()
        fresh = False
        model_id = args.model
    else:
        file_path = args.file
        process_all = args.all or (args.start_page is None and args.end_page is None)
        start_page = args.start_page or 1
        end_page = args.end_page or 1
        batch_size = args.batch_size
        fresh = args.fresh
        model_id = args.model

    output_dir = Path(args.output_dir)
    process_document(
        file_path=file_path,
        process_all=process_all,
        start_page=start_page,
        end_page=end_page,
        batch_size=batch_size,
        model_id=model_id,
        fresh=fresh,
        output_dir=output_dir
    )


if __name__ == "__main__":
    main()
