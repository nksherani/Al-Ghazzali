import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  ReaderBookmark,
  ReaderPreferences,
  ReadingLocation,
} from '../content/types';

const KEYS = {
  bookmarks: '@ihya/bookmarks',
  lastPosition: '@ihya/last-position',
  preferences: '@ihya/preferences',
} as const;

export const DEFAULT_PREFERENCES: ReaderPreferences = {
  theme: 'light',
  fontSize: 18,
  arabicFont: 'indopak',
};

async function readValue<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function writeValue<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export const readerStore = {
  getBookmarks: () => readValue<ReaderBookmark[]>(KEYS.bookmarks, []),
  saveBookmarks: (bookmarks: ReaderBookmark[]) =>
    writeValue(KEYS.bookmarks, bookmarks),
  getLastPosition: () =>
    readValue<ReadingLocation | null>(KEYS.lastPosition, null),
  saveLastPosition: (position: ReadingLocation) =>
    writeValue(KEYS.lastPosition, position),
  getPreferences: () =>
    readValue<ReaderPreferences>(KEYS.preferences, DEFAULT_PREFERENCES),
  savePreferences: (preferences: ReaderPreferences) =>
    writeValue(KEYS.preferences, preferences),
};
