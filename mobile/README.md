# Ihya’ Reader Mobile

Bare React Native app for iOS and Android. This app uses React Native Community CLI and does not use Expo.

## Run locally

```sh
cd mobile
npm install
npm start
```

In a second terminal, use `npm run ios` or `npm run android` to launch the native app. iOS builds require Xcode and CocoaPods; Android builds require Android Studio and an Android SDK.

## Current implementation

- Four-volume library shell and hierarchical book/chapter content provider.
- Local search, reader navigation, and bookmark screens, ready to populate from the content provider.
- On-device persistence for reading position, bookmarks, theme, font size, and Arabic font preference.
- Light, sepia, and dark reading themes, with IndoPak Arabic font bundled in the native targets.
- Accessible labels and a compact tab navigation layout.

## Content rights gate

The source edition includes a notice reserving electronic storage and distribution rights to its publisher. The app therefore contains no copy of the publisher's translation. Keep `src/content/library.ts` empty until digital distribution permission is confirmed; then populate `VolumeSummary` objects using the types in `src/content/types.ts`.

The IndoPak font asset is DigitalKhatt IndoPak, downloaded from [fonts.quran.ws](https://fonts.quran.ws/fonts/indopak/), which describes it as free for Islamic use. Recheck the source's terms before distribution beyond that use.
