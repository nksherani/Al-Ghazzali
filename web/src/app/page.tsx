import { getAllVolumes, getBookDivisions, getNavigationBooks, getNavigationVolumes } from "@/lib/book-data";
import { ReaderLayout } from "@/components/ReaderLayout";
import Link from "next/link";

export default function HomePage() {
  const volumes = getAllVolumes();
  const firstVolume = volumes[0];

  return (
    <ReaderLayout
      volumes={getNavigationVolumes()}
      books={getNavigationBooks(1)}
      volumeNum={1}
      volumeTitle={firstVolume.metadata.volume_title}
      title="The complete work"
      subtitle="Four-volume edition"
    >
      <div className="space-y-10">
        <div className="text-center space-y-4 py-8 border-b border-[var(--border-color)]">
          <div className="text-sm uppercase tracking-widest text-[var(--accent-gold)] font-bold font-mono">
            {firstVolume.metadata.author}
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-[var(--text-primary)] tracking-tight">
            {firstVolume.metadata.work}
          </h1>
          <div className="text-2xl sm:text-3xl font-serif text-[var(--accent-gold)] arabic-text py-1" dir="rtl">
            {firstVolume.metadata.work_ar}
          </div>
          <p className="text-base sm:text-lg text-[var(--text-secondary)] font-serif max-w-2xl mx-auto">
            Browse the complete four-volume edition.
          </p>
        </div>

        <section className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[var(--text-primary)]">
              Select a volume
            </h2>
            <span className="text-xs font-mono uppercase text-[var(--text-muted)]">4 volumes</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {volumes.map((volume) => {
              const books = volume.books.filter((book) => book.type === "book");
              const divisions = books.reduce(
                (count, book) => count + getBookDivisions(book).items.length,
                0
              );
              return (
                <Link
                  key={volume.metadata.volume}
                  href={`/volume/${volume.metadata.volume}`}
                  className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-xs hover:border-[var(--accent-gold)] transition"
                >
                  <div className="text-xs font-mono uppercase tracking-wider text-[var(--accent-gold)] mb-2">
                    Volume {volume.metadata.volume}
                  </div>
                  <h3 className="text-xl font-serif font-bold text-[var(--text-primary)]">
                    {volume.metadata.volume_title}
                  </h3>
                  <p className="mt-3 text-sm text-[var(--text-secondary)]">
                    {books.length} books · {divisions} chapters and parts
                  </p>
                  <span className="mt-5 inline-flex text-sm font-semibold text-[var(--accent-gold)]">
                    Browse volume →
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <div className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs text-[var(--text-secondary)] space-y-2">
          <div className="font-bold text-[var(--text-primary)] uppercase tracking-wider text-[11px] font-mono">
            Publication Details
          </div>
          <p><strong>Translator:</strong> {firstVolume.metadata.translator}</p>
          <p><strong>Publisher:</strong> {firstVolume.metadata.publisher}</p>
        </div>
      </div>
    </ReaderLayout>
  );
}
