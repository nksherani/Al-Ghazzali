import { getAllBooks, volume, getBookDivisions } from "@/lib/book-data";
import { ReaderLayout } from "@/components/ReaderLayout";
import Link from "next/link";

export default function HomePage() {
  const books = getAllBooks();
  const meta = volume.metadata;

  return (
    <ReaderLayout books={books} title="Volume 1 Index" subtitle="Ihya' Ulum Ad-Din">
      <div className="space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-4 py-8 border-b border-[var(--border-color)]">
          <div className="text-sm uppercase tracking-widest text-[var(--accent-gold)] font-bold font-mono">
            {meta.author}
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-[var(--text-primary)] tracking-tight">
            {meta.work}
          </h1>
          <div className="text-2xl sm:text-3xl font-serif text-[var(--accent-gold)] arabic-text py-1" dir="rtl">
            {meta.work_ar}
          </div>
          <p className="text-base sm:text-lg text-[var(--text-secondary)] font-serif max-w-2xl mx-auto">
            Volume 1: {meta.volume_title}
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <Link
              href="/prelude"
              className="px-5 py-2.5 rounded-xl bg-[var(--accent-gold)] text-white text-sm font-semibold shadow-sm hover:opacity-95 transition"
            >
              Begin Reading: Prelude →
            </Link>
            <Link
              href="/book/book_1/chapter/1"
              className="px-5 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm font-semibold hover:border-[var(--accent-gold)] transition"
            >
              Jump to Book One (Knowledge)
            </Link>
          </div>
        </div>

        {/* The 10 Books Grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[var(--text-primary)]">
              Table of Contents (10 Books)
            </h2>
            <span className="text-xs font-mono uppercase text-[var(--text-muted)]">
              42 Chapters &bull; 130+ Sections
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {books
              .filter((b) => b.type === "book")
              .map((b) => {
                const { type: divType, items } = getBookDivisions(b);
                const firstHref = items.length > 0 ? `/book/${b.id}/${divType}/${items[0].number}` : "#";

                return (
                  <div
                    key={b.id}
                    className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-xs flex flex-col justify-between hover:border-[var(--accent-gold)] transition"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs font-mono text-[var(--text-muted)] mb-2">
                        <span>BOOK {b.book_number}</span>
                        <span>{items.length} {divType === "part" ? "Parts" : "Chapters"}</span>
                      </div>
                      <h3 className="text-lg font-serif font-bold text-[var(--text-primary)] mb-3">
                        {b.heading}
                      </h3>
                      <ul className="text-xs text-[var(--text-secondary)] space-y-1.5 mb-4 max-h-36 overflow-y-auto">
                        {items.slice(0, 4).map((div) => (
                          <li key={div.id} className="truncate">
                            &bull; {div.heading}
                          </li>
                        ))}
                        {items.length > 4 && (
                          <li className="text-[var(--accent-gold)] font-medium">
                            + {items.length - 4} more {divType}s...
                          </li>
                        )}
                      </ul>
                    </div>

                    <Link
                      href={firstHref}
                      className="mt-2 text-xs font-semibold text-[var(--accent-gold)] hover:underline inline-flex items-center gap-1"
                    >
                      Open Book &rarr;
                    </Link>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Publication info */}
        <div className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs text-[var(--text-secondary)] space-y-2">
          <div className="font-bold text-[var(--text-primary)] uppercase tracking-wider text-[11px] font-mono">
            Publication Details
          </div>
          <p><strong>Translator:</strong> {meta.translator}</p>
          <p><strong>Publisher:</strong> {meta.publisher}</p>
          <p><strong>Authentic Quran Text:</strong> Cross-referenced and verified against Uthmani scripture.</p>
        </div>
      </div>
    </ReaderLayout>
  );
}
