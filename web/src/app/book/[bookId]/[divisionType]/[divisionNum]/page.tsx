import {
  getAllBooks,
  getBookById,
  getAllDivisionParams,
  getBookDivisions,
  getAdjacentLinks,
  RouteParam,
} from "@/lib/book-data";
import { ReaderLayout } from "@/components/ReaderLayout";
import { FormattedContent } from "@/components/FormattedContent";
import { ChapterNav } from "@/components/ChapterNav";
import { notFound } from "next/navigation";

export async function generateStaticParams(): Promise<RouteParam[]> {
  return getAllDivisionParams();
}

interface PageProps {
  params: Promise<RouteParam>;
}

export default async function ChapterPage({ params }: PageProps) {
  const { bookId, divisionType, divisionNum } = await params;
  const num = parseInt(divisionNum, 10);

  const books = getAllBooks();
  const book = getBookById(bookId);

  if (!book) {
    notFound();
  }

  const { items } = getBookDivisions(book);
  const division = items.find((d) => d.number === num);

  if (!division) {
    notFound();
  }

  const { prev, next } = getAdjacentLinks(bookId, divisionType, num);

  return (
    <ReaderLayout
      books={books}
      title={division.heading}
      subtitle={book.heading}
    >
      <article className="space-y-10">
        {/* Chapter / Part Header */}
        <header className="border-b border-[var(--border-color)] pb-6 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-[var(--accent-gold)] font-bold">
            <span>
              {book.heading} &bull; {divisionType.toUpperCase()} {division.number}
            </span>
            {division.page_start && (
              <span className="text-[var(--text-muted)]">
                Pages {division.page_start}–{division.page_end}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-[var(--text-primary)] leading-tight">
            {division.heading}
          </h1>
        </header>

        {/* Chapter Intro text (if present) */}
        {division.intro_text && (
          <div className="text-[var(--text-secondary)] italic border-l-2 border-[var(--accent-gold)] pl-4">
            <FormattedContent content={division.intro_text} />
          </div>
        )}

        {/* Standalone text for chapters without subsections */}
        {division.text && <FormattedContent content={division.text} />}

        {/* Render Nested Sections */}
        {division.sections && division.sections.length > 0 && (
          <div className="space-y-12">
            {division.sections.map((sec) => (
              <section key={sec.id} id={sec.id} className="space-y-4 pt-4">
                <div className="flex items-baseline justify-between border-b border-[var(--border-color)] pb-2">
                  <h2 className="text-xl sm:text-2xl font-serif font-bold text-[var(--text-primary)]">
                    {sec.heading}
                  </h2>
                  {sec.page_start && (
                    <span className="text-xs font-mono text-[var(--text-muted)]">
                      p. {sec.page_start}
                    </span>
                  )}
                </div>
                <FormattedContent content={sec.text} />
              </section>
            ))}
          </div>
        )}

        {/* Navigation to Prev/Next Chapter */}
        <ChapterNav prev={prev} next={next} />
      </article>
    </ReaderLayout>
  );
}
