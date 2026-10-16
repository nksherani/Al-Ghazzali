import {
  getAllDivisionParams,
  getBookById,
  getBookDivisions,
  getAdjacentLinks,
  getNavigationBooks,
  getNavigationVolumes,
  getVolume,
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
  const { volumeNum: rawVolumeNum, bookId, divisionType, divisionNum } = await params;
  const volumeNum = Number(rawVolumeNum);
  const volume = getVolume(volumeNum);
  const book = getBookById(bookId, volumeNum);
  const num = parseInt(divisionNum, 10);

  if (!volume || !book || (divisionType !== "chapter" && divisionType !== "part")) notFound();

  const { type, items } = getBookDivisions(book);
  if (type !== divisionType) notFound();
  const division = items.find((item) => item.number === num);
  if (!division) notFound();

  const { prev, next } = getAdjacentLinks(volumeNum, bookId, divisionType, num);

  return (
    <ReaderLayout
      books={getNavigationBooks(volumeNum)}
      volumes={getNavigationVolumes()}
      volumeNum={volumeNum}
      volumeTitle={volume.metadata.volume_title}
      title={division.heading}
      subtitle={book.heading}
    >
      <article className="space-y-10">
        <header className="border-b border-[var(--border-color)] pb-6 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-[var(--accent-gold)] font-bold">
            <span>VOLUME {volumeNum} &bull; {divisionType.toUpperCase()} {division.number}</span>
            {division.page_start != null && (
              <span className="text-[var(--text-muted)]">
                Pages {division.page_start}–{division.page_end ?? division.page_start}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-[var(--text-primary)] leading-tight">
            {book.heading}
          </h1>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-serif font-semibold text-[var(--text-primary)] leading-tight">
            {division.heading}
          </h2>
        </header>

        {division.intro_text && (
          <div className="text-[var(--text-secondary)] italic border-l-2 border-[var(--accent-gold)] pl-4">
            <FormattedContent content={division.intro_text} />
          </div>
        )}

        {division.text && <FormattedContent content={division.text} />}

        {division.sections && division.sections.length > 0 && (
          <div className="space-y-12">
            {division.sections.map((section) => {
              const Heading = `h${Math.min(6, Math.max(3, section.level))}` as "h3" | "h4" | "h5" | "h6";
              return (
                <section key={section.id} id={section.id} className="space-y-4 pt-4">
                  <div className="flex items-baseline justify-between border-b border-[var(--border-color)] pb-2">
                    <Heading className="text-xl sm:text-2xl font-serif font-bold text-[var(--text-primary)]">
                      {section.heading}
                    </Heading>
                    {section.page_start != null && (
                      <span className="text-xs font-mono text-[var(--text-muted)]">p. {section.page_start}</span>
                    )}
                  </div>
                  <FormattedContent content={section.text} />
                </section>
              );
            })}
          </div>
        )}

        <ChapterNav prev={prev} next={next} />
      </article>
    </ReaderLayout>
  );
}
