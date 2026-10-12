import Link from "next/link";
import { NavLink } from "@/lib/book-data";

interface ChapterNavProps {
  prev: NavLink | null;
  next: NavLink | null;
}

export function ChapterNav({ prev, next }: ChapterNavProps) {
  return (
    <nav className="mt-16 pt-8 border-t border-[var(--border-color)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
      {prev ? (
        <Link
          href={prev.href}
          className="flex-1 p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--accent-gold)] transition group flex flex-col items-start text-left shadow-xs"
        >
          <span className="text-xs text-[var(--text-muted)] font-mono uppercase tracking-wider mb-1 flex items-center gap-1">
            ← Previous
          </span>
          <span className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-gold)] transition line-clamp-2">
            {prev.title}
          </span>
        </Link>
      ) : (
        <div className="flex-1" />
      )}

      {next ? (
        <Link
          href={next.href}
          className="flex-1 p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--accent-gold)] transition group flex flex-col items-end text-right shadow-xs"
        >
          <span className="text-xs text-[var(--text-muted)] font-mono uppercase tracking-wider mb-1 flex items-center gap-1">
            Next →
          </span>
          <span className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-gold)] transition line-clamp-2">
            {next.title}
          </span>
        </Link>
      ) : (
        <div className="flex-1" />
      )}
    </nav>
  );
}
