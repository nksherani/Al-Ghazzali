import { getAllBooks, getBookById } from "@/lib/book-data";
import { ReaderLayout } from "@/components/ReaderLayout";
import { FormattedContent } from "@/components/FormattedContent";
import { ChapterNav } from "@/components/ChapterNav";
import { notFound } from "next/navigation";

export default function PreludePage() {
  const books = getAllBooks();
  const prelude = getBookById("prelude");

  if (!prelude || !prelude.text) {
    notFound();
  }

  const nextLink = {
    title: "Book One: Knowledge - Chapter 1",
    href: "/book/book_1/chapter/1",
  };

  return (
    <ReaderLayout books={books} title="Prelude" subtitle="Author's Introduction">
      <article className="space-y-8">
        <header className="border-b border-[var(--border-color)] pb-6 space-y-2">
          <div className="text-xs uppercase tracking-widest text-[var(--accent-gold)] font-mono font-bold">
            Imam Al-Ghazali&apos;s Introduction
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[var(--text-primary)]">
            {prelude.heading}
          </h1>
          <div className="text-xs text-[var(--text-muted)] font-mono">
            Pages {prelude.page_start} to {prelude.page_end}
          </div>
        </header>

        <FormattedContent content={prelude.text} />

        <ChapterNav prev={null} next={nextLink} />
      </article>
    </ReaderLayout>
  );
}
