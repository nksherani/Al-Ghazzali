import { notFound } from "next/navigation";
import { ReaderLayout } from "@/components/ReaderLayout";
import { FormattedContent } from "@/components/FormattedContent";
import { ChapterNav } from "@/components/ChapterNav";
import { getAllBooks, getBookDivisions, getNavigationBooks, getNavigationVolumes, getVolume } from "@/lib/book-data";

interface PageProps {
  params: Promise<{ volumeNum: string }>;
}

export function generateStaticParams() {
  return [{ volumeNum: "1" }];
}

export default async function PreludePage({ params }: PageProps) {
  const { volumeNum: rawVolumeNum } = await params;
  const volumeNum = Number(rawVolumeNum);
  const volume = getVolume(volumeNum);
  const books = getAllBooks(volumeNum);
  const prelude = books.find((book) => book.type === "prelude");

  if (!volume || !prelude?.text) notFound();

  const firstBook = books.find((book) => book.type === "book");
  const firstDivision = firstBook ? getBookDivisions(firstBook).items[0] : undefined;
  const nextLink = firstBook && firstDivision
    ? {
        title: `${firstBook.heading} - ${firstDivision.heading}`,
        href: `/volume/${volumeNum}/book/${firstBook.id}/${getBookDivisions(firstBook).type}/${firstDivision.number}`,
      }
    : null;

  return (
    <ReaderLayout
      books={getNavigationBooks(volumeNum)}
      volumes={getNavigationVolumes()}
      volumeNum={volumeNum}
      volumeTitle={volume.metadata.volume_title}
      title="Prelude"
      subtitle="Author's Introduction"
    >
      <article className="space-y-8">
        <header className="border-b border-[var(--border-color)] pb-6 space-y-2">
          <div className="text-xs uppercase tracking-widest text-[var(--accent-gold)] font-mono font-bold">
            Imam Al-Ghazali&apos;s Introduction
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[var(--text-primary)]">
            {prelude.heading}
          </h1>
          {prelude.page_start != null && (
            <div className="text-xs text-[var(--text-muted)] font-mono">
              Pages {prelude.page_start} to {prelude.page_end ?? prelude.page_start}
            </div>
          )}
        </header>

        <FormattedContent content={prelude.text} />
        <ChapterNav prev={null} next={nextLink} />
      </article>
    </ReaderLayout>
  );
}
