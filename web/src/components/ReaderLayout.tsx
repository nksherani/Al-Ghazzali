"use client";

import React, { useState } from "react";
import type { NavigationBook, NavigationVolume } from "@/lib/reader-navigation";
import { Sidebar } from "./Sidebar";
import { ReaderControls } from "./ReaderControls";
import Link from "next/link";

interface ReaderLayoutProps {
  books: NavigationBook[];
  volumes: NavigationVolume[];
  volumeNum: number;
  volumeTitle: string;
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function ReaderLayout({ books, volumes, volumeNum, volumeTitle, children, title, subtitle }: ReaderLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [fontSize, setFontSize] = useState(18);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)]">
      {/* Navigation Top Bar */}
      <header className="sticky top-0 z-30 bg-[var(--bg-card)]/90 backdrop-blur-md border-b border-[var(--border-color)] px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--border-color)] transition"
            aria-label="Toggle navigation menu"
          >
            ☰
          </button>
          <Link href="/" className="flex flex-col">
            <span className="text-xs uppercase tracking-wider text-[var(--accent-gold)] font-bold font-mono">
              Volume {volumeNum}
            </span>
            <span className="text-sm font-semibold text-[var(--text-primary)] hidden sm:inline">
              {volumeTitle}
            </span>
          </Link>
        </div>

        {/* Header Title (truncate on small screens) */}
        {title && (
          <div className="hidden md:flex flex-col text-center max-w-md truncate">
            <span className="text-xs font-semibold text-[var(--text-muted)] truncate">{subtitle}</span>
            <span className="text-sm font-bold text-[var(--text-primary)] truncate">{title}</span>
          </div>
        )}

        {/* Reader Customization */}
        <ReaderControls fontSize={fontSize} onFontChange={setFontSize} />
      </header>

      {/* Main Container with Sidebar */}
      <div className="flex-1 flex">
        <Sidebar books={books} volumes={volumes} volumeNum={volumeNum} volumeTitle={volumeTitle} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main Content Area */}
        <main className="flex-1 lg:pl-80 flex flex-col items-center">
          <div className="w-full max-w-4xl px-4 sm:px-8 py-8 sm:py-12">
            {/* Clone children with dynamic fontSize prop if needed */}
            {React.isValidElement(children)
              ? React.cloneElement(children as React.ReactElement<{ fontSize?: number }>, { fontSize })
              : children}
          </div>
        </main>
      </div>
    </div>
  );
}
