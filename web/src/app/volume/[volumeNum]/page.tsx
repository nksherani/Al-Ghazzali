import Link from "next/link";
import { notFound } from "next/navigation";
import { ReaderLayout } from "@/components/ReaderLayout";
import { getBookDivisions, getNavigationBooks, getNavigationVolumes, getVolume } from "@/lib/book-data";

interface PageProps {
  params: Promise<{ volumeNum: string }>;
}

export function generateStaticParams() {
  return [1, 2, 3, 4].map((volumeNum) => ({ volumeNum: String(volumeNum) }));
}

export default async function VolumeIndexPage({ params }: PageProps) {
  const { volumeNum: rawVolumeNum } = await params;
  const volumeNum = Number(rawVolumeNum);
  const volume = getVolume(volumeNum);
  if (!volume) notFound();

  const books = volume.books;
  const prelude = books.find((book) => book.type === "prelude");
  const volumeBooks = books.filter((book) => book.type === "book");

  return (
    <ReaderLayout
      books={getNavigationBooks(volumeNum)}
      volumes={getNavigationVolumes()}
      volumeNum={volumeNum}
      volumeTitle={volume.metadata.volume_title}
      title={`Volume ${volumeNum}`}
      subtitle={volume.metadata.volume_title}
    >
      <div className="space-y-8">
        <header className="border-b border-[var(--border-color)] pb-6 space-y-3">
          <div className="text-sm uppercase tracking-widest text-[var(--accent-gold)] font-bold font-mono">
            Volume {volumeNum}
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[var(--text-primary)]">
            {volume.metadata.volume_title}
          </h1>
          {prelude && (
            <Link href={`/volume/${volumeNum}/prelude`} className="inline-flex text-sm font-semibold text-[var(--accent-gold)] hover:underline">
              Read the author&apos;s prelude →
            </Link>
          )}
        </header>

        <section className="space-y-4">
          <h2 className="text-xl font-serif font-bold text-[var(--text-primary)]">
            Books ({volumeBooks.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {volumeBooks.map((book) => {
              const { type, items } = getBookDivisions(book);
              const firstHref = items.length
                ? `/volume/${volumeNum}/book/${book.id}/${type}/${items[0].number}`
                : `/volume/${volumeNum}`;
              return (
                <div key={book.id} className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs font-mono text-[var(--text-muted)] mb-2">
                      <span>BOOK {book.book_number}</span>
                      <span>{items.length} {type === "part" ? "Parts" : "Chapters"}</span>
                    </div>
                    <h3 className="text-lg font-serif font-bold text-[var(--text-primary)] mb-3">
                      {book.heading}
                    </h3>
                    <ul className="text-xs text-[var(--text-secondary)] space-y-1.5 mb-4 max-h-36 overflow-y-auto">
                      {items.slice(0, 4).map((division) => (
                        <li key={division.id} className="truncate">• {division.heading}</li>
                      ))}
                      {items.length > 4 && (
                        <li className="text-[var(--accent-gold)] font-medium">+ {items.length - 4} more</li>
                      )}
                    </ul>
                  </div>
                  <Link href={firstHref} className="mt-2 text-xs font-semibold text-[var(--accent-gold)] hover:underline">
                    Open Book →
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </ReaderLayout>
  );
}
