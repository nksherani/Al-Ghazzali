"use client";

import React from "react";

interface FormattedContentProps {
  content: string;
  fontSize?: number;
}

export function FormattedContent({ content, fontSize = 18 }: FormattedContentProps) {
  if (!content) return null;

  // Split into paragraphs by double newlines
  const paragraphs = content.split(/\n\s*\n/);

  const isArabic = (text: string) => {
    return /[\u0600-\u06FF]/.test(text);
  };

  return (
    <div className="space-y-6 leading-relaxed" style={{ fontSize: `${fontSize}px` }}>
      {paragraphs.map((p, idx) => {
        const trimmed = p.trim();
        if (!trimmed) return null;

        // Strip stray page break tags if present
        if (trimmed.startsWith("<!-- PageBreak") || trimmed.startsWith("<!-- Sliced Batch")) {
          return null;
        }

        // Display page numbers as discrete subtle stamps
        const pageMatch = trimmed.match(/^<!-- PageNumber="(\d+)" -->$/);
        if (pageMatch) {
          return (
            <div
              key={idx}
              className="flex items-center gap-3 my-8 text-xs text-[var(--text-muted)] font-mono uppercase tracking-wider"
            >
              <div className="h-px bg-[var(--border-color)] flex-1" />
              <span>Page {pageMatch[1]}</span>
              <div className="h-px bg-[var(--border-color)] flex-1" />
            </div>
          );
        }

        // Check if paragraph is primarily an Arabic text block (Quranic ayah or Hadith)
        if (isArabic(trimmed)) {
          return (
            <div
              key={idx}
              className="my-6 p-5 sm:p-6 rounded-xl bg-[var(--arabic-bg)] border border-[var(--arabic-border)] text-right shadow-xs"
            >
              <p
                className="arabic-text text-xl sm:text-2xl text-[var(--text-primary)] font-normal select-text"
                dir="rtl"
                lang="ar"
              >
                {trimmed}
              </p>
            </div>
          );
        }

        // Regular prose paragraph
        return (
          <p
            key={idx}
            className="text-[var(--text-primary)] font-serif text-justify leading-relaxed tracking-normal"
          >
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}
