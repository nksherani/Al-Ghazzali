import React, {useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Pressable,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import {getAllDivisions, getVolume, volumes} from './src/content/library';
import type {
  ArabicFont,
  ReaderBookmark,
  ReaderPreferences,
  ReaderTheme,
  ReadingLocation,
} from './src/content/types';
import {DEFAULT_PREFERENCES, readerStore} from './src/storage/reader-store';

type Tab = 'library' | 'search' | 'bookmarks' | 'settings';
type Screen = Tab | 'volume' | 'reader';

type Palette = {
  background: string;
  card: string;
  secondary: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  accentSoft: string;
};

const PALETTES: Record<ReaderTheme, Palette> = {
  light: {
    background: '#f8f6f1',
    card: '#fffefa',
    secondary: '#eee9df',
    border: '#e2dbcf',
    text: '#25231f',
    muted: '#777168',
    accent: '#8b6b32',
    accentSoft: '#efe7d7',
  },
  sepia: {
    background: '#f2e9d8',
    card: '#faf3e7',
    secondary: '#e9dcc4',
    border: '#d8c7a8',
    text: '#352a1d',
    muted: '#75644d',
    accent: '#805a20',
    accentSoft: '#e9d9bb',
  },
  dark: {
    background: '#111316',
    card: '#1b1e23',
    secondary: '#252930',
    border: '#343943',
    text: '#f0eee9',
    muted: '#a5a6a8',
    accent: '#d5ae68',
    accentSoft: '#342d21',
  },
};

function App() {
  const [screen, setScreen] = useState<Screen>('library');
  const [returnTab, setReturnTab] = useState<Tab>('library');
  const [selectedVolume, setSelectedVolume] = useState(1);
  const [location, setLocation] = useState<ReadingLocation | null>(null);
  const [bookmarks, setBookmarks] = useState<ReaderBookmark[]>([]);
  const [preferences, setPreferences] = useState<ReaderPreferences>(DEFAULT_PREFERENCES);
  const [query, setQuery] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      readerStore.getBookmarks(),
      readerStore.getLastPosition(),
      readerStore.getPreferences(),
    ]).then(([savedBookmarks, savedLocation, savedPreferences]) => {
      if (!mounted) {
        return;
      }
      setBookmarks(savedBookmarks);
      setLocation(savedLocation);
      setPreferences({...DEFAULT_PREFERENCES, ...savedPreferences});
      setReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const palette = PALETTES[preferences.theme];
  const styles = useMemo(() => makeStyles(palette), [palette]);

  const openVolume = (volumeNumber: number) => {
    setSelectedVolume(volumeNumber);
    setScreen('volume');
  };

  const openDivision = (nextLocation: ReadingLocation) => {
    setLocation(nextLocation);
    setSelectedVolume(nextLocation.volumeNumber);
    if (screen === 'library' || screen === 'search' || screen === 'bookmarks' || screen === 'settings') {
      setReturnTab(screen);
    }
    setScreen('reader');
    void readerStore.saveLastPosition(nextLocation);
  };

  const openBookmark = (bookmark: ReaderBookmark) => {
    openDivision(bookmark);
  };

  const updatePreferences = (next: ReaderPreferences) => {
    setPreferences(next);
    void readerStore.savePreferences(next);
  };

  const switchTab = (tab: Tab) => {
    setScreen(tab);
    setReturnTab(tab);
  };

  const toggleBookmark = (item: ReadingLocation) => {
    const existing = bookmarks.find(bookmark =>
      bookmark.volumeNumber === item.volumeNumber &&
      bookmark.bookId === item.bookId &&
      bookmark.divisionId === item.divisionId,
    );
    const next = existing
      ? bookmarks.filter(bookmark => bookmark.id !== existing.id)
      : [
          {
            ...item,
            id: `${item.volumeNumber}-${item.bookId}-${item.divisionId}`,
            createdAt: new Date().toISOString(),
          },
          ...bookmarks,
        ];
    setBookmarks(next);
    void readerStore.saveBookmarks(next);
  };

  if (!ready) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={[styles.root, styles.center]}>
          <ActivityIndicator color={palette.accent} />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root}>
        <StatusBar
          barStyle={preferences.theme === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor={palette.background}
        />
        {screen === 'library' && (
          <LibraryScreen
            styles={styles}
            palette={palette}
            lastPosition={location}
            onOpenVolume={openVolume}
            onContinue={() => location && openDivision(location)}
          />
        )}
        {screen === 'volume' && (
          <VolumeScreen
            volumeNumber={selectedVolume}
            styles={styles}
            onBack={() => setScreen('library')}
            onOpenDivision={openDivision}
          />
        )}
        {screen === 'reader' && location && (
          <ReaderScreen
            location={location}
            styles={styles}
            fontSize={preferences.fontSize}
            arabicFont={preferences.arabicFont}
            bookmarked={bookmarks.some(bookmark => bookmark.id === `${location.volumeNumber}-${location.bookId}-${location.divisionId}`)}
            onBookmark={() => toggleBookmark(location)}
            onBack={() => setScreen(returnTab)}
            onNavigate={openDivision}
          />
        )}
        {screen === 'search' && (
          <SearchScreen
            query={query}
            onQueryChange={setQuery}
            styles={styles}
            palette={palette}
            onOpenDivision={openDivision}
          />
        )}
        {screen === 'bookmarks' && (
          <BookmarksScreen
            bookmarks={bookmarks}
            styles={styles}
            onOpenBookmark={openBookmark}
            onRemove={bookmark => toggleBookmark(bookmark)}
          />
        )}
        {screen === 'settings' && (
          <SettingsScreen
            preferences={preferences}
            onChange={updatePreferences}
            styles={styles}
            palette={palette}
          />
        )}
        {screen !== 'reader' && (
          <BottomTabs activeTab={screen as Tab} onChange={switchTab} styles={styles} palette={palette} />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function LibraryScreen({
  styles,
  palette,
  lastPosition,
  onOpenVolume,
  onContinue,
}: {
  styles: ReturnType<typeof makeStyles>;
  palette: Palette;
  lastPosition: ReadingLocation | null;
  onOpenVolume: (volumeNumber: number) => void;
  onContinue: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.brandRow}>
        <View>
          <Text style={styles.eyebrow}>A CLASSIC ISLAMIC WORK</Text>
          <Text style={styles.brand}>Ihya’</Text>
        </View>
        <Text style={styles.brandArabic} accessibilityLabel="Ihya Ulum al-Din">
          إِحْيَاءُ عُلُومِ الدِّين
        </Text>
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.heroKicker}>THE REVIVAL OF THE RELIGIOUS SCIENCES</Text>
        <Text style={styles.heroTitle}>A thoughtful place to read and study.</Text>
        <Text style={styles.bodyMuted}>
          Explore the four quarters of Imam al-Ghazali’s celebrated work at your own pace.
        </Text>
        {lastPosition ? (
          <ActionButton
            label={`Continue · ${lastPosition.title}`}
            onPress={onContinue}
            styles={styles}
            palette={palette}
          />
        ) : (
          <Text style={styles.bodyMuted}>Choose a volume to begin.</Text>
        )}
      </View>

      <SectionHeading title="Your library" subtitle="Four volumes" styles={styles} />
      <View style={styles.volumeList}>
        {volumes.map(volume => (
          <Pressable
            key={volume.number}
            accessibilityRole="button"
            onPress={() => onOpenVolume(volume.number)}
            style={({pressed}) => [styles.volumeCard, pressed && styles.pressed]}>
            <View style={styles.volumeNumber}>
              <Text style={styles.volumeNumberText}>{String(volume.number).padStart(2, '0')}</Text>
            </View>
            <View style={styles.grow}>
              <Text style={styles.cardTitle}>{volume.title}</Text>
              <Text style={styles.cardDescription}>Explore books and chapters</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.noticeCard}>
        <Text style={styles.noticeTitle}>Reading package not installed</Text>
        <Text style={styles.bodyMuted}>
          The edition in the source repository restricts digital redistribution. Authorized book text can be added here once publisher permission is confirmed.
        </Text>
      </View>
      <View style={styles.footerSpace} />
    </ScrollView>
  );
}

function VolumeScreen({
  volumeNumber,
  styles,
  onBack,
  onOpenDivision,
}: {
  volumeNumber: number;
  styles: ReturnType<typeof makeStyles>;
  onBack: () => void;
  onOpenDivision: (location: ReadingLocation) => void;
}) {
  const volume = getVolume(volumeNumber);
  const divisions = volume?.books.flatMap(book =>
    book.divisions.map(division => ({book, division})),
  ) ?? [];

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <BackButton label="Library" onPress={onBack} styles={styles} />
      <Text style={styles.eyebrow}>VOLUME {volumeNumber}</Text>
      <Text style={styles.pageTitle}>{volume?.title ?? `Volume ${volumeNumber}`}</Text>
      {divisions.length ? (
        <View style={styles.volumeList}>
          {divisions.map(({book, division}) => (
            <Pressable
              key={`${book.id}-${division.id}`}
              onPress={() => onOpenDivision({
                volumeNumber,
                bookId: book.id,
                divisionId: division.id,
                title: division.title,
              })}
              style={({pressed}) => [styles.resultCard, pressed && styles.pressed]}>
              <Text style={styles.cardDescription}>{book.title}</Text>
              <Text style={styles.cardTitle}>{division.title}</Text>
              <Text style={styles.bodyMuted} numberOfLines={2}>{division.text}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>This volume is ready for its content package</Text>
          <Text style={styles.bodyMuted}>
            The app structure supports books, chapters, and offline reading. The published translation is not bundled until digital distribution rights are confirmed.
          </Text>
          <Text style={styles.smallNote}>
            Once authorized, add the structured volume data to the library provider and this screen will populate automatically.
          </Text>
          <TextButton
            label="Preview reader controls"
            onPress={() => onOpenDivision({
              volumeNumber,
              bookId: 'preview',
              divisionId: 'preview',
              title: 'Reader preview',
            })}
            styles={styles}
          />
        </View>
      )}
    </ScrollView>
  );
}

function ReaderScreen({
  location,
  styles,
  fontSize,
  arabicFont,
  bookmarked,
  onBookmark,
  onBack,
  onNavigate,
}: {
  location: ReadingLocation;
  styles: ReturnType<typeof makeStyles>;
  fontSize: number;
  arabicFont: ArabicFont;
  bookmarked: boolean;
  onBookmark: () => void;
  onBack: () => void;
  onNavigate: (location: ReadingLocation) => void;
}) {
  const division = getAllDivisions().find(item =>
    item.volumeNumber === location.volumeNumber &&
    item.bookId === location.bookId &&
    item.id === location.divisionId,
  );
  const divisions = getAllDivisions();
  const index = divisions.findIndex(item =>
    item.volumeNumber === location.volumeNumber &&
    item.bookId === location.bookId &&
    item.id === location.divisionId,
  );
  const changeBy = (offset: number) => {
    const target = divisions[index + offset];
    if (target) {
      onNavigate({
        volumeNumber: target.volumeNumber,
        bookId: target.bookId,
        divisionId: target.id,
        title: target.title,
      });
    }
  };

  return (
    <>
      <View style={styles.readerHeader}>
        <BackButton label="Back" onPress={onBack} styles={styles} />
        <Pressable onPress={onBookmark} accessibilityRole="button" accessibilityLabel={bookmarked ? 'Remove bookmark' : 'Save bookmark'} style={styles.iconButton}>
          <Text style={styles.iconText}>{bookmarked ? '★' : '☆'}</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.readerPage}>
        <Text style={styles.eyebrow}>VOLUME {location.volumeNumber}</Text>
        <Text style={styles.pageTitle}>{division?.title ?? location.title}</Text>
        {division ? (
          division.text.split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => (
            <Text
              key={index}
              style={/[؀-ۿ]/.test(paragraph)
                ? [styles.arabicParagraph, {fontSize: fontSize + 3, writingDirection: 'rtl', fontFamily: arabicFont === 'indopak' ? Platform.select({ios: 'DigitalKhatt IndoPak', android: 'Indopak'}) : undefined}]
                : [styles.paragraph, {fontSize}]}
              >
              {paragraph.trim()}
            </Text>
          ))
        ) : (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>Authorized text will appear here</Text>
            <Text style={styles.bodyMuted}>
              Reading position and bookmarks are stored on this device. Add licensed volume data to enable the full reader.
            </Text>
          </View>
        )}
        <View style={styles.chapterControls}>
          <TextButton label="Previous" disabled={index <= 0} onPress={() => changeBy(-1)} styles={styles} />
          <TextButton label="Next" disabled={index < 0 || index >= divisions.length - 1} onPress={() => changeBy(1)} styles={styles} />
        </View>
      </ScrollView>
    </>
  );
}

function SearchScreen({
  query,
  onQueryChange,
  styles,
  palette,
  onOpenDivision,
}: {
  query: string;
  onQueryChange: (query: string) => void;
  styles: ReturnType<typeof makeStyles>;
  palette: Palette;
  onOpenDivision: (location: ReadingLocation) => void;
}) {
  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) {
      return [];
    }
    return getAllDivisions().filter(item =>
      `${item.bookTitle} ${item.title} ${item.text}`.toLocaleLowerCase().includes(normalized),
    ).slice(0, 30);
  }, [query]);

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>EXPLORE THE TEXT</Text>
      <Text style={styles.pageTitle}>Search</Text>
      <TextInput
        value={query}
        onChangeText={onQueryChange}
        placeholder="Search words or topics"
        placeholderTextColor={palette.muted}
        accessibilityLabel="Search the book"
        returnKeyType="search"
        style={styles.searchInput}
      />
      {results.length ? results.map(result => (
        <Pressable
          key={`${result.volumeNumber}-${result.bookId}-${result.id}`}
          onPress={() => onOpenDivision({
            volumeNumber: result.volumeNumber,
            bookId: result.bookId,
            divisionId: result.id,
            title: result.title,
          })}
          style={({pressed}) => [styles.resultCard, pressed && styles.pressed]}>
          <Text style={styles.cardDescription}>Volume {result.volumeNumber} · {result.bookTitle}</Text>
          <Text style={styles.cardTitle}>{result.title}</Text>
          <Text style={styles.bodyMuted} numberOfLines={3}>{result.text}</Text>
        </Pressable>
      )) : (
        <EmptyState
          title={query ? 'No matching passages' : 'Search all four volumes'}
          body="Search becomes available when an authorized book content package is added."
          styles={styles}
        />
      )}
    </ScrollView>
  );
}

function BookmarksScreen({
  bookmarks,
  styles,
  onOpenBookmark,
  onRemove,
}: {
  bookmarks: ReaderBookmark[];
  styles: ReturnType<typeof makeStyles>;
  onOpenBookmark: (bookmark: ReaderBookmark) => void;
  onRemove: (bookmark: ReaderBookmark) => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.eyebrow}>YOUR READING</Text>
      <Text style={styles.pageTitle}>Bookmarks</Text>
      {bookmarks.length ? bookmarks.map(bookmark => (
        <View key={bookmark.id} style={styles.resultCard}>
          <Pressable onPress={() => onOpenBookmark(bookmark)} accessibilityRole="button">
            <Text style={styles.cardDescription}>Volume {bookmark.volumeNumber}</Text>
            <Text style={styles.cardTitle}>{bookmark.title}</Text>
          </Pressable>
          <Pressable onPress={() => onRemove(bookmark)} style={styles.removeButton} accessibilityRole="button">
            <Text style={[styles.smallNote, {color: palette.accent}]}>Remove bookmark</Text>
          </Pressable>
        </View>
      )) : (
        <EmptyState
          title="No bookmarks yet"
          body="Save a chapter while reading and it will be kept on this device."
          styles={styles}
        />
      )}
    </ScrollView>
  );
}

function SettingsScreen({
  preferences,
  onChange,
  styles,
  palette,
}: {
  preferences: ReaderPreferences;
  onChange: (preferences: ReaderPreferences) => void;
  styles: ReturnType<typeof makeStyles>;
  palette: Palette;
}) {
  const setTheme = (theme: ReaderTheme) => onChange({...preferences, theme});
  const setArabicFont = (arabicFont: ArabicFont) => onChange({...preferences, arabicFont});

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.eyebrow}>MAKE IT YOURS</Text>
      <Text style={styles.pageTitle}>Reading settings</Text>

      <Text style={styles.sectionLabel}>APPEARANCE</Text>
      <View style={styles.optionRow}>
        {(['light', 'sepia', 'dark'] as ReaderTheme[]).map(theme => (
          <Pressable
            key={theme}
            accessibilityRole="button"
            accessibilityState={{selected: preferences.theme === theme}}
            onPress={() => setTheme(theme)}
            style={[styles.optionChip, preferences.theme === theme && styles.optionSelected]}>
            <Text style={[styles.optionText, preferences.theme === theme && styles.optionTextSelected]}>
              {theme[0].toUpperCase() + theme.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.settingCard}>
        <View style={styles.settingTop}>
          <View>
            <Text style={styles.cardTitle}>English text size</Text>
            <Text style={styles.cardDescription}>Adjust for comfortable reading</Text>
          </View>
          <Text style={styles.settingValue}>{preferences.fontSize}</Text>
        </View>
        <View style={styles.optionRow}>
          <TextButton label="A−" onPress={() => onChange({...preferences, fontSize: Math.max(14, preferences.fontSize - 2)})} styles={styles} />
          <TextButton label="A+" onPress={() => onChange({...preferences, fontSize: Math.min(30, preferences.fontSize + 2)})} styles={styles} />
        </View>
      </View>

      <Text style={styles.sectionLabel}>ARABIC FONT</Text>
      <View style={styles.optionRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{selected: preferences.arabicFont === 'indopak'}}
          onPress={() => setArabicFont('indopak')}
          style={[styles.optionChip, preferences.arabicFont === 'indopak' && styles.optionSelected]}>
          <Text style={[styles.optionText, preferences.arabicFont === 'indopak' && styles.optionTextSelected]}>IndoPak Naskh</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{selected: preferences.arabicFont === 'system'}}
          onPress={() => setArabicFont('system')}
          style={[styles.optionChip, preferences.arabicFont === 'system' && styles.optionSelected]}>
          <Text style={[styles.optionText, preferences.arabicFont === 'system' && styles.optionTextSelected]}>System</Text>
        </Pressable>
      </View>
      <Text style={styles.smallNote}>
        IndoPak Naskh is bundled with the native app and remains available offline.
      </Text>
      <Text style={styles.sectionLabel}>YOUR DATA</Text>
      <View style={styles.settingCard}>
        <Text style={styles.cardTitle}>Saved on this device</Text>
        <Text style={styles.bodyMuted}>Reading position, bookmarks, and preferences stay local and work offline.</Text>
      </View>
      <Text style={styles.versionText}>Ihya’ Reader · Mobile preview</Text>
    </ScrollView>
  );
}

function BottomTabs({
  activeTab,
  onChange,
  styles,
  palette,
}: {
  activeTab: Tab;
  onChange: (tab: Tab) => void;
  styles: ReturnType<typeof makeStyles>;
  palette: Palette;
}) {
  const tabs: {id: Tab; title: string; icon: string}[] = [
    {id: 'library', title: 'Library', icon: '▤'},
    {id: 'search', title: 'Search', icon: '⌕'},
    {id: 'bookmarks', title: 'Saved', icon: '☆'},
    {id: 'settings', title: 'Settings', icon: '⚙'},
  ];
  return (
    <View style={styles.tabBar}>
      {tabs.map(tab => (
        <Pressable
          key={tab.id}
          accessibilityRole="tab"
          accessibilityState={{selected: activeTab === tab.id}}
          onPress={() => onChange(tab.id)}
          style={styles.tab}>
          <Text style={[styles.tabIcon, activeTab === tab.id && {color: palette.accent}]}>{tab.icon}</Text>
          <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>{tab.title}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function SectionHeading({title, subtitle, styles}: {title: string; subtitle: string; styles: ReturnType<typeof makeStyles>}) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.cardDescription}>{subtitle}</Text>
    </View>
  );
}

function ActionButton({label, onPress, styles, palette}: {label: string; onPress: () => void; styles: ReturnType<typeof makeStyles>; palette: Palette}) {
  return (
    <Pressable onPress={onPress} style={({pressed}) => [styles.primaryButton, {backgroundColor: palette.accent}, pressed && styles.pressed]}>
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function BackButton({label, onPress, styles}: {label: string; onPress: () => void; styles: ReturnType<typeof makeStyles>}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={styles.backButton}>
      <Text style={styles.backLabel}>‹  {label}</Text>
    </Pressable>
  );
}

function TextButton({label, onPress, disabled, styles}: {label: string; onPress: () => void; disabled?: boolean; styles: ReturnType<typeof makeStyles>}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.secondaryButton, disabled && styles.disabled]}>
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function EmptyState({title, body, styles}: {title: string; body: string; styles: ReturnType<typeof makeStyles>}) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyMark}>✧</Text>
      <Text style={styles.noticeTitle}>{title}</Text>
      <Text style={styles.bodyMuted}>{body}</Text>
    </View>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    root: {flex: 1, backgroundColor: palette.background},
    center: {alignItems: 'center', justifyContent: 'center'},
    page: {paddingHorizontal: 22, paddingTop: 18, paddingBottom: 34, gap: 18},
    readerPage: {paddingHorizontal: 24, paddingTop: 18, paddingBottom: 40, gap: 18},
    brandRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2},
    eyebrow: {color: palette.accent, fontSize: 10, fontWeight: '700', letterSpacing: 1.5},
    brand: {color: palette.text, fontSize: 30, fontWeight: '700', letterSpacing: -0.7, marginTop: 4},
    brandArabic: {fontSize: 18, color: palette.text, writingDirection: 'rtl'},
    heroCard: {backgroundColor: palette.secondary, borderRadius: 22, padding: 22, gap: 12},
    heroKicker: {fontSize: 9, color: palette.accent, letterSpacing: 1.3, fontWeight: '700'},
    heroTitle: {fontSize: 25, lineHeight: 31, color: palette.text, fontWeight: '600', maxWidth: 300},
    bodyMuted: {fontSize: 14, lineHeight: 21, color: palette.muted},
    volumeList: {gap: 10},
    volumeCard: {flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 17, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border},
    volumeNumber: {height: 46, width: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: palette.accentSoft},
    volumeNumberText: {fontSize: 16, color: palette.accent, fontWeight: '700'},
    grow: {flex: 1},
    cardTitle: {fontSize: 16, fontWeight: '600', color: palette.text},
    cardDescription: {fontSize: 12, lineHeight: 18, color: palette.muted, marginTop: 3},
    chevron: {fontSize: 28, color: palette.muted, marginRight: 4},
    noticeCard: {borderRadius: 17, padding: 18, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border, gap: 7},
    noticeTitle: {fontSize: 16, fontWeight: '600', color: palette.text},
    smallNote: {fontSize: 11, lineHeight: 17, color: palette.muted, marginTop: 5},
    footerSpace: {height: 10},
    tabBar: {flexDirection: 'row', borderTopWidth: 1, borderTopColor: palette.border, backgroundColor: palette.card, paddingTop: 8, paddingBottom: 5},
    tab: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 48},
    tabIcon: {fontSize: 19, color: palette.muted},
    tabLabel: {fontSize: 10, color: palette.muted},
    tabLabelActive: {color: palette.accent, fontWeight: '700'},
    primaryButton: {alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, marginTop: 3},
    primaryButtonText: {fontSize: 13, color: '#fff', fontWeight: '700'},
    pageTitle: {fontSize: 28, lineHeight: 34, color: palette.text, fontWeight: '700', marginTop: -8},
    sectionHeading: {flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4},
    sectionTitle: {fontSize: 18, color: palette.text, fontWeight: '700'},
    backButton: {alignSelf: 'flex-start', paddingVertical: 4, marginBottom: 8},
    backLabel: {fontSize: 14, color: palette.accent, fontWeight: '600'},
    resultCard: {backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border, borderRadius: 16, padding: 16, gap: 5},
    readerHeader: {minHeight: 48, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
    iconButton: {width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: palette.card},
    iconText: {fontSize: 24, color: palette.accent},
    paragraph: {fontSize: 18, lineHeight: 30, color: palette.text},
    arabicParagraph: {fontSize: 21, lineHeight: 42, color: palette.text, textAlign: 'right'},
    chapterControls: {flexDirection: 'row', justifyContent: 'space-between', marginTop: 22},
    searchInput: {height: 52, borderRadius: 15, paddingHorizontal: 16, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border, color: palette.text, fontSize: 15},
    emptyState: {alignItems: 'center', backgroundColor: palette.card, borderRadius: 18, borderWidth: 1, borderColor: palette.border, padding: 24, gap: 9, marginTop: 6},
    emptyMark: {fontSize: 24, color: palette.accent},
    removeButton: {alignSelf: 'flex-start', paddingTop: 8},
    sectionLabel: {fontSize: 10, fontWeight: '700', letterSpacing: 1.3, color: palette.muted, marginTop: 10},
    optionRow: {flexDirection: 'row', gap: 9},
    optionChip: {paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.card},
    optionSelected: {borderColor: palette.accent, backgroundColor: palette.accentSoft},
    optionText: {fontSize: 13, color: palette.muted, fontWeight: '500'},
    optionTextSelected: {color: palette.accent, fontWeight: '700'},
    settingCard: {borderRadius: 16, padding: 16, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border, gap: 14},
    settingTop: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
    settingValue: {fontSize: 18, color: palette.accent, fontWeight: '700'},
    secondaryButton: {paddingHorizontal: 15, paddingVertical: 10, backgroundColor: palette.secondary, borderRadius: 11},
    secondaryButtonText: {fontSize: 13, color: palette.text, fontWeight: '600'},
    disabled: {opacity: 0.35},
    versionText: {textAlign: 'center', color: palette.muted, fontSize: 11, marginVertical: 8},
    pressed: {opacity: 0.72, transform: [{scale: 0.99}]},
  });
}

export default App;
