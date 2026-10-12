import volumeData from "@/data/volume_1.json";

export interface Section {
  id: string;
  level: number;
  heading: string;
  page_start?: number;
  page_end?: number;
  text: string;
}

export interface Division {
  id: string;
  number: number;
  heading: string;
  page_start?: number;
  page_end?: number;
  intro_text?: string;
  text?: string;
  sections?: Section[];
}

export interface Book {
  id: string;
  type: "prelude" | "book";
  book_number?: number | null;
  heading: string;
  page_start?: number;
  page_end?: number;
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
  page_start?: number;
  page_end?: number;
  text: string;
}

export interface VolumeData {
  metadata: Metadata;
  front_matter: FrontMatter;
  books: Book[];
}

export const volume = volumeData as unknown as VolumeData;

export function getAllBooks(): Book[] {
  return volume.books;
}

export function getBookById(id: string): Book | undefined {
  return volume.books.find((b) => b.id === id);
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
  bookId: string;
  divisionType: "chapter" | "part";
  divisionNum: string;
}

export function getAllDivisionParams(): RouteParam[] {
  const params: RouteParam[] = [];
  for (const book of volume.books) {
    if (book.type === "prelude") continue;
    const { type, items } = getBookDivisions(book);
    for (const div of items) {
      params.push({
        bookId: book.id,
        divisionType: type,
        divisionNum: String(div.number),
      });
    }
  }
  return params;
}

export interface NavLink {
  title: string;
  href: string;
}

export function getAdjacentLinks(
  bookId: string,
  divisionType: "chapter" | "part",
  divisionNum: number
): { prev: NavLink | null; next: NavLink | null } {
  const allList: { title: string; href: string }[] = [];

  // Prelude first
  allList.push({ title: "Prelude", href: "/prelude" });

  for (const book of volume.books) {
    if (book.type === "prelude") continue;
    const { type, items } = getBookDivisions(book);
    for (const div of items) {
      allList.push({
        title: `${book.heading} - ${div.heading}`,
        href: `/book/${book.id}/${type}/${div.number}`,
      });
    }
  }

  const currentHref = `/book/${bookId}/${divisionType}/${divisionNum}`;
  const currentIndex = allList.findIndex((item) => item.href === currentHref);

  if (currentIndex === -1) {
    return { prev: null, next: null };
  }

  return {
    prev: currentIndex > 0 ? allList[currentIndex - 1] : null,
    next: currentIndex < allList.length - 1 ? allList[currentIndex + 1] : null,
  };
}
