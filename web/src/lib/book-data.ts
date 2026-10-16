import volume1Data from "@/data/volume_1.json";
import volume2Data from "@/data/volume_2.json";
import volume3Data from "@/data/volume_3.json";
import volume4Data from "@/data/volume_4.json";
import type { NavLink, NavigationBook, NavigationVolume } from "@/lib/reader-navigation";

export interface Section {
  id: string;
  level: number;
  heading: string;
  page_start?: number | null;
  page_end?: number | null;
  text: string;
}

export interface Division {
  id: string;
  number: number;
  heading: string;
  page_start?: number | null;
  page_end?: number | null;
  intro_text?: string;
  text?: string;
  sections?: Section[];
}

export interface Book {
  id: string;
  type: "prelude" | "book";
  book_number?: number | null;
  heading: string;
  page_start?: number | null;
  page_end?: number | null;
  intro_text?: string;
  text?: string;
  chapters?: Division[];
  parts?: Division[];
}

export interface Metadata {
  work: string;
  work_ar: string;
  author: string;
  translator: string;
  publisher: string;
  volume: number;
  volume_title: string;
  total_books: number;
  has_prelude: boolean;
  structure: string;
}

export interface FrontMatter {
  heading: string;
  page_start?: number | null;
  page_end?: number | null;
  text: string;
}

export interface VolumeData {
  metadata: Metadata;
  front_matter: FrontMatter;
  books: Book[];
}

export type VolumeNumber = 1 | 2 | 3 | 4;

const volumes: Record<VolumeNumber, VolumeData> = {
  1: volume1Data as unknown as VolumeData,
  2: volume2Data as unknown as VolumeData,
  3: volume3Data as unknown as VolumeData,
  4: volume4Data as unknown as VolumeData,
};

export function getAllVolumes(): VolumeData[] {
  return Object.values(volumes);
}

export function getNavigationVolumes(): NavigationVolume[] {
  return getAllVolumes().map((volumeData) => ({
    volumeNum: volumeData.metadata.volume,
    volumeTitle: volumeData.metadata.volume_title,
  }));
}

export function getNavigationBooks(volumeNum: number): NavigationBook[] {
  const volumeData = getVolume(volumeNum);
  if (!volumeData) return [];

  return volumeData.books.map((book) => {
    const { type, items } = getBookDivisions(book);
    return {
      id: book.id,
      type: book.type,
      book_number: book.book_number,
      heading: book.heading,
      divisions: items.map((division) => ({
        id: division.id,
        number: division.number,
        heading: division.heading,
        type,
      })),
    };
  });
}

export function getVolume(volumeNum: number): VolumeData | undefined {
  return volumes[volumeNum as VolumeNumber];
}

// Kept as the default for older pages and existing imports.
export const volume = volumes[1];

export function getAllBooks(volumeNum = 1): Book[] {
  return getVolume(volumeNum)?.books ?? [];
}

export function getBookById(id: string, volumeNum = 1): Book | undefined {
  return getVolume(volumeNum)?.books.find((book) => book.id === id);
}

export function getBookDivisions(book: Book): { type: "part" | "chapter"; items: Division[] } {
  if (book.parts && book.parts.length > 0) {
    return { type: "part", items: book.parts };
  }
  if (book.chapters && book.chapters.length > 0) {
    return { type: "chapter", items: book.chapters };
  }
  return { type: "chapter", items: [] };
}

export interface RouteParam {
  volumeNum: string;
  bookId: string;
  divisionType: "chapter" | "part";
  divisionNum: string;
}

export function getAllDivisionParams(): RouteParam[] {
  const params: RouteParam[] = [];
  for (const volumeData of getAllVolumes()) {
    for (const book of volumeData.books) {
      if (book.type === "prelude") continue;
      const { type, items } = getBookDivisions(book);
      for (const division of items) {
        params.push({
          volumeNum: String(volumeData.metadata.volume),
          bookId: book.id,
          divisionType: type,
          divisionNum: String(division.number),
        });
      }
    }
  }
  return params;
}

export function getAdjacentLinks(
  volumeNum: number,
  bookId: string,
  divisionType: "chapter" | "part",
  divisionNum: number
): { prev: NavLink | null; next: NavLink | null } {
  const volumeData = getVolume(volumeNum);
  if (!volumeData) return { prev: null, next: null };

  const allList: NavLink[] = [];
  if (volumeData.metadata.has_prelude) {
    allList.push({ title: "Prelude", href: `/volume/${volumeNum}/prelude` });
  }

  for (const book of volumeData.books) {
    if (book.type === "prelude") continue;
    const { type, items } = getBookDivisions(book);
    for (const division of items) {
      allList.push({
        title: `${book.heading} - ${division.heading}`,
        href: `/volume/${volumeNum}/book/${book.id}/${type}/${division.number}`,
      });
    }
  }

  const currentHref = `/volume/${volumeNum}/book/${bookId}/${divisionType}/${divisionNum}`;
  const currentIndex = allList.findIndex((item) => item.href === currentHref);

  return {
    prev: currentIndex > 0 ? allList[currentIndex - 1] : null,
    next: currentIndex >= 0 && currentIndex < allList.length - 1 ? allList[currentIndex + 1] : null,
  };
}
