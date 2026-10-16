import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ihya' Ulum Ad-Din | Imam Al-Ghazali",
  description:
    "Interactive reader for the four-volume Revival of the Religious Sciences (Ihya' Ulum Ad-Din) by Imam Abu Hamid al-Ghazali.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=Cinzel:wght@500;700&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased flex flex-col">{children}</body>
    </html>
  );
}
