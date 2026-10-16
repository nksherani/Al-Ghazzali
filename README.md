# Ihya Ulum al-Din Extraction Pipeline

Python tools for extracting text, chapters, tables of contents, and layouts from *Ihya Ulum al-Din* (Revival of Religious Sciences) by Imam Abu Hamid Al-Ghazali into structured Markdown files.

---

## Prerequisites & Installation

This project is configured with [uv](https://docs.astral.sh/uv/) and a Python 3.13+ virtual environment.

### 1. Install Dependencies
Sync dependencies and set up the local `.venv`:
```bash
uv sync
```

Or activate the virtual environment manually:
```bash
source .venv/bin/activate
```

### 2. Configure Azure Document Intelligence (.env)
Create your `.env` file by copying the template:
```bash
cp .env.example .env
```
Fill in your credentials inside `.env`:
```env
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT="https://<your-resource-name>.cognitiveservices.azure.com/"
AZURE_DOCUMENT_INTELLIGENCE_KEY="your-api-key"
```

---

## Usage Commands

### 1. Azure AI Document Intelligence Extraction (`azure-di-script.py`)

Extracts high-fidelity layouts, tables, and text formatted as native Markdown for specified pages.

#### Interactive Mode
Run the script interactively to pick from available PDFs in the workspace and input start/end page numbers:
```bash
uv run python azure-di-script.py
```

#### CLI Command Mode

##### A. Process Whole File (All Pages)
Process all pages in the book. The script automatically divides the book into batches, runs them with retries, and merges the result into a single `_complete.md` file:
```bash
# Standard tier (S0): 50 pages per batch
uv run python azure-di-script.py \
  --file Ihya-ul-uloom/Ihya_Ghazali_Eng_Book_volume_1_Complete.pdf \
  --all \
  --batch-size 50 \
  --output-dir output_markdown/volume_1/

# Free tier (F0): 2 pages per batch (Azure F0 limit is 2 pages per call)
uv run python azure-di-script.py \
  --file Ihya-ul-uloom/Ihya_Ghazali_Eng_Book_volume_1_Complete.pdf \
  --all \
  --batch-size 2 \
  --output-dir output_markdown/volume_1/
```

> **Automatic Resumption:** If network drops or Azure rate-limits interrupt execution midway, simply re-run the exact same command. The script detects previously completed batch checkpoints in `.checkpoints_<doc>/`, skips them, and resumes from the exact batch that failed.
>
> To force re-extraction from scratch and overwrite prior checkpoints, add `--fresh`.


##### B. Process Custom Page Range
```bash
# Extract pages 1 to 20 of Volume 1
uv run python azure-di-script.py \
  --file Ihya-ul-uloom/Ihya_Ghazali_Eng_Book_volume_1_Complete.pdf \
  --start-page 1 \
  --end-page 20

# Single-page extraction
uv run python azure-di-script.py \
  -f Ihya-ul-uloom/Ihya_Ghazali_Eng_Book_volume_1_Complete.pdf \
  -s 11 \
  -e 11
```

#### Output File Naming
Output files are saved to `output_markdown/` (or `-o <dir>`) with distinguishing original file names and page ranges:
- Multi-page: `<filename>_p<start>-p<end>.md`  
  *(e.g., `Ihya_Ghazali_Eng_Book_volume_1_Complete_p5-p10.md`)*
- Single-page: `<filename>_p<page>.md`  
  *(e.g., `Ihya_Ghazali_Eng_Book_volume_1_Complete_p11.md`)*

---

### 2. Local Batch Extraction (`extract_books_to_markdown.py`)

Extracts text content and structures dedicated Tables of Contents across all 4 complete volumes using PyMuPDF:
```bash
uv run python extract_books_to_markdown.py
```

Generated folder structure under `output_markdown/`:
```text
output_markdown/
├── README.md                  # Master index linking all volumes
├── volume_1/
│   ├── TOC.md                 # Structured TOC from volume 1 TOC PDF
│   └── volume_1_complete.md   # Full volume text in Markdown
├── volume_2/
│   ├── TOC.md
│   └── volume_2_complete.md
├── volume_3/
│   ├── TOC.md
│   └── volume_3_complete.md
└── volume_4/
    ├── TOC.md
    └── volume_4_complete.md
```

---

### 3. Post-Analysis: Generate Table of Contents from Markdown (`generate_toc_from_markdown.py`)

Parses Markdown files, filters out Arabic text and OCR artifacts, and generates a structured, clickable Table of Contents.

```bash
# 1. Generate standalone TOC for a single Markdown file:
uv run python generate_toc_from_markdown.py output_markdown/volume_1/Ihya_Ghazali_Eng_Book_volume_1_Complete_complete.md

# 2. Inject TOC directly into the Markdown document:
uv run python generate_toc_from_markdown.py output_markdown/volume_1/Ihya_Ghazali_Eng_Book_volume_1_Complete_complete.md --inject

# 3. Limit depth (e.g. only H1 and H2):
uv run python generate_toc_from_markdown.py file.md --max-depth 2

# 4. Process all Markdown files in a folder recursively:
uv run python generate_toc_from_markdown.py output_markdown/ --all
```

---

### 4. Arabic Text Cleansing (`clean_arabic_markdown.py`)

Cleanses Arabic verses and text from decorative brackets, OCR registration symbols, verse stops, and stray artifacts:
- Strips Quranic ayah brackets: `﴿`, `﴾`, `«`, `»`
- Strips OCR registration & publisher symbols: `®`, `©`, `™`, `◌`, `•`, `■`
- Strips parenthesized verse numbers / OCR footnote fragments: `(12)`, `(٤)`, `(®)`, `(يَ)`
- Strips erroneous markdown header formatting (`#`, `##`) on pure Arabic verses

```bash
# 1. Preview changes (Dry run):
uv run python clean_arabic_markdown.py output_markdown/volume_1/Ihya_Ghazali_Eng_Book_volume_1_Complete_complete.md --dry-run

# 2. Clean in-place (automatically creates a .bak backup):
uv run python clean_arabic_markdown.py output_markdown/volume_1/Ihya_Ghazali_Eng_Book_volume_1_Complete_complete.md

# 3. Clean without creating .bak:
uv run python clean_arabic_markdown.py output_markdown/volume_1/Ihya_Ghazali_Eng_Book_volume_1_Complete_complete.md --no-backup

# 4. Clean all Markdown files across the output directory:
uv run python clean_arabic_markdown.py output_markdown/ --all
```

---

### 5. Surah Name Unification & Normalization (`unify_surah_names.py`)

Unifies Surah names across both `Al-Quran/Al-Quran.json` and Markdown book volumes:
- Identifies the most frequent transliteration used in the book for all Surahs.
- Updates `Al-Quran.json` `englishName` fields to match.
- Replaces inconsistent variants, OCR space breaks (e.g. `Al- Baqarah` $\rightarrow$ `Al-Baqarah`), and repairs page-split citations (e.g. `(Al-Baqarah ... 258)`).

```bash
# Unify Surah names across Quran JSON and Volume 1 Markdown:
uv run python unify_surah_names.py

# Verify / view comparison report:
uv run python compare_surah_names.py
```

---

### 6. Quran Reference & Arabic Text Verification (`fix_quran_references_and_text.py`)

Cross-references every Quranic verse citation in the Markdown file with `Al-Quran/Al-Quran.json`:
- Verifies all 546 references and repairs any non-uniform Surah names.
- Replaces OCR-damaged/corrupted Arabic text with authentic, fully-vocalized Uthmani Arabic script directly from `Al-Quran.json`.
- Accurately aligns excerpt quotes when the author cites only a sub-clause of a long Ayah.

```bash
# Verify references and replace Arabic verses with authentic Quran JSON text:
uv run python fix_quran_references_and_text.py
```

---

## Helpful Commands

- **Check CLI options for Azure DI script:**
  ```bash
  uv run python azure-di-script.py --help
  ```
- **Check CLI options for TOC Generator:**
  ```bash
  uv run python generate_toc_from_markdown.py --help
  ```
- **Add a new package:**
  ```bash
  uv add <package-name>
  ```
- **Re-lock dependencies:**
  ```bash
  uv lock
  ```



## Next.js Static Web Reader (`web/`)

A static web reader (SSG) built with **Next.js (App Router)** and **Tailwind CSS** to render the structured Volume 1 JSON as an interactive web book.

### Key Features
- **100% Static HTML Export**: Builds to `web/out/` with zero backend server dependencies; deployable to GitHub Pages, Cloudflare Pages, Vercel, or AWS S3.
- **Hierarchical Reading Experience**: Pre-rendered routes for Prelude, Books 1 to 10, Chapters, Parts, and sub-sections with instant page transitions.
- **Classical Islamic Typography**: Automatic RTL detection and distinct callout styling for authentic Arabic Quranic verses (Uthmani script) and Hadith citations.
- **Reader Controls**: Independent font scaling (`A-` / `A+`) and 3 reading themes (Light Paper, Warm Sepia, OLED Dark) saved in `localStorage`.
- **Responsive Navigation**: Collapsible Table of Contents sidebar and next/previous chapter footers.

### Running Locally
```bash
cd web
npm install
npm run dev        # Development server on http://localhost:3000
npm run build      # Pre-renders all 47 pages and outputs static HTML to web/out/
```

## React Native Mobile Reader (`mobile/`)

A bare React Native app for iOS and Android is under development. See [mobile/README.md](mobile/README.md) for setup instructions, current features, and the content distribution rights gate.
