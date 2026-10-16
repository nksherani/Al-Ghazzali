import type {VolumeSummary} from './types';

/**
 * The mobile app deliberately does not bundle the publisher's edition text.
 * The source files identify the translation as restricted from digital
 * redistribution without prior written permission. Populate this catalog with
 * an authorized content package once distribution rights are confirmed.
 */
export const volumes: VolumeSummary[] = [1, 2, 3, 4].map(number => ({
  number,
  title: `Volume ${number}`,
  books: [],
}));

export function getVolume(number: number): VolumeSummary | undefined {
  return volumes.find(volume => volume.number === number);
}

export function getAllDivisions() {
  return volumes.flatMap(volume =>
    volume.books.flatMap(book =>
      book.divisions.map(division => ({
        volumeNumber: volume.number,
        bookId: book.id,
        bookTitle: book.title,
        ...division,
      })),
    ),
  );
}
