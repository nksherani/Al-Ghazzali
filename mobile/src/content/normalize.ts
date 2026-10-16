import type {BookSummary, DivisionSummary, VolumeSummary} from './types';

interface SourceDivision {
  id?: string;
  number?: number;
  heading?: string;
  intro_text?: string;
  text?: string;
  sections?: SourceSection[];
}

interface SourceSection {
  id?: string;
  heading?: string;
  text?: string;
  level?: number;
}

interface SourceBook {
  id?: string;
  type?: string;
  heading?: string;
  intro_text?: string;
  text?: string;
  chapters?: SourceDivision[];
  parts?: SourceDivision[];
}

export interface SourceVolume {
  metadata: {
    volume: number;
    volume_title: string;
  };
  books: SourceBook[];
}

/** Adapts an authorized volume JSON file to the reader's mobile catalog shape. */
export function normalizeVolume(source: SourceVolume): VolumeSummary {
  return {
    number: source.metadata.volume,
    title: source.metadata.volume_title,
    books: source.books.map((book, bookIndex): BookSummary => {
      const rawDivisions = book.parts?.length ? book.parts : book.chapters ?? [];
      const divisions: DivisionSummary[] = [];

      if (book.type === 'prelude' || book.intro_text || (!rawDivisions.length && book.text)) {
        divisions.push({
          id: 'introduction',
          title: book.type === 'prelude' ? book.heading ?? 'Prelude' : 'Introduction',
          text: [book.intro_text, book.text].filter(Boolean).join('\n\n'),
        });
      }

      rawDivisions.forEach((division, divisionIndex) => {
        const sectionText = (division.sections ?? [])
          .map(section => [section.heading, section.text].filter(Boolean).join('\n\n'))
          .filter(Boolean)
          .join('\n\n');
        divisions.push({
          id: division.id ?? `${division.number ?? divisionIndex + 1}`,
          title: division.heading ?? `Section ${division.number ?? divisionIndex + 1}`,
          text: [division.intro_text, division.text, sectionText]
            .filter(Boolean)
            .join('\n\n'),
        });
      });

      return {
        id: book.id ?? `book-${bookIndex + 1}`,
        title: book.heading ?? `Book ${bookIndex + 1}`,
        divisions,
      };
    }),
  };
}
