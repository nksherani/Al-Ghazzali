"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Book, getBookDivisions } from "@/lib/book-data";

interface SidebarProps {
  books: Book[];
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ books, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [expandedBooks, setExpandedBooks] = useState<Record<string, boolean>>(() => {
    // Auto-expand the currently viewed book
    const initial: Record<string, boolean> = {};
    for (const b of books) {
      if (pathname.includes(`/book/${b.id}`)) {
        initial[b.id] = true;
      }
    }
    return initial;
  });

  const toggleBook = (bookId: string) => {
    setExpandedBooks((prev) => ({
      ...prev,
      [bookId]: !prev[bookId],
    }));
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-80 bg-[var(--sidebar-bg)] border-r border-[var(--border-color)] flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
          <Link href="/" className="group" onClick={onClose}>
            <div className="text-xs uppercase tracking-widest text-[var(--accent-gold)] font-semibold font-mono">
              Imam Al-Ghazali
            </div>
            <div className="font-bold text-base text-[var(--text-primary)] group-hover:text-[var(--accent-gold)] transition">
              Ihya&apos; Ulum Ad-Din
            </div>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-card)] transition"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Book List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1 text-sm">
          {/* Home Link */}
          <Link
            href="/"
            onClick={onClose}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${
              pathname === "/"
                ? "bg-[var(--accent-gold-bg)] text-[var(--accent-gold)] font-semibold"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
            }`}
          >
            🏛️ <span>Overview & Index</span>
          </Link>

          {/* Prelude Link */}
          <Link
            href="/prelude"
            onClick={onClose}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${
              pathname === "/prelude"
                ? "bg-[var(--accent-gold-bg)] text-[var(--accent-gold)] font-semibold"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
            }`}
          >
            📜 <span>Prelude (Author&apos;s Intro)</span>
          </Link>

          <div className="pt-3 pb-1 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Volume 1: The 10 Books
          </div>

          {books
            .filter((b) => b.type === "book")
            .map((b) => {
              const { type: divType, items } = getBookDivisions(b);
              const isExpanded = expandedBooks[b.id] ?? false;
              const isCurrentBook = pathname.includes(`/book/${b.id}`);

              return (
                <div key={b.id} className="rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleBook(b.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-left rounded-lg transition text-xs font-semibold ${
                      isCurrentBook
                        ? "text-[var(--accent-gold)] bg-[var(--accent-gold-bg)]"
                        : "text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                    }`}
                  >
                    <span className="truncate pr-2">
                      {b.heading}
                    </span>
                    <span className="text-xs opacity-60">
                      {isExpanded ? "▾" : "▸"}
                    </span>
                  </button>

                  {/* Sub-divisions (Chapters / Parts) */}
                  {isExpanded && items.length > 0 && (
                    <div className="pl-4 pr-1 py-1 space-y-0.5 border-l-2 border-[var(--border-color)] ml-3 my-1">
                      {items.map((div) => {
                        const href = `/book/${b.id}/${divType}/${div.number}`;
                        const isActive = pathname === href;

                        return (
                          <Link
                            key={div.id}
                            href={href}
                            onClick={onClose}
                            className={`block px-2.5 py-1.5 text-xs rounded transition truncate ${
                              isActive
                                ? "bg-[var(--accent-gold-bg)] text-[var(--accent-gold)] font-medium"
                                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                            }`}
                            title={div.heading}
                          >
                            {div.heading}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-[var(--border-color)] text-[11px] text-[var(--text-muted)] text-center">
          Classical English Translation by M. Mahdi al-Sharif
        </div>
      </aside>
    </>
  );
}
