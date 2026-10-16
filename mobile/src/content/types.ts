export type ReaderTheme = 'light' | 'sepia' | 'dark';

export type ArabicFont = 'indopak' | 'system';

export interface ReadingLocation {
  volumeNumber: number;
  bookId: string;
  divisionId: string;
  title: string;
}

export interface ReaderBookmark extends ReadingLocation {
  id: string;
  createdAt: string;
}

export interface ReaderPreferences {
  theme: ReaderTheme;
  fontSize: number;
  arabicFont: ArabicFont;
}

export interface VolumeSummary {
  number: number;
  title: string;
  books: BookSummary[];
}

export interface BookSummary {
  id: string;
  title: string;
  divisions: DivisionSummary[];
}

export interface DivisionSummary {
  id: string;
  title: string;
  text: string;
}
