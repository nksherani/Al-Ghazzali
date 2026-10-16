# Mobile App Plan for *Ihya’ Ulum al-Din*

## Product direction

Build a read-first, offline-first mobile app for iOS and Android, alongside the existing web reader. The app should make the four-volume work easier to read, search, study, and return to over time.

The project already has a useful foundation: four structured volume JSON files, hierarchical book and chapter navigation, Arabic passages, and a web reader with adjustable text size and light, sepia, and dark themes. The volume data totals about 8.7 MB before packaging, so the app can offer volumes as separate downloads.

## Recommended technical approach

Use **React Native with TypeScript**, without Expo. Maintain native iOS and Android projects and share appropriate TypeScript data models and content-processing logic with the web reader. Keep reading state on-device so reading, bookmarks, and notes work offline; SQLite is a suitable local persistence option. Add account-based sync only after the core experience is validated.

Bundle the IndoPak Naskh font so Arabic remains available offline. The font source describes its Unicode font as IndoPak Naskh style and lists it as free for Islamic use: [font details](https://fonts.quran.ws/fonts/indopak/).

## Roadmap

| Phase | Scope |
| --- | --- |
| **1. Prepare the content** | Confirm app distribution rights for the published English translation and other third-party material. Review Arabic text and headings. Define volume downloads and content updates. |
| **2. Core reader** | Browse volumes, books, and chapters; search the text; resume reading; save bookmarks; adjust font size, theme, and Arabic font; read downloaded content offline. |
| **3. Study tools** | Add highlights, private notes, reading goals, and links between related passages across the four volumes. |
| **4. Signature features** | Add guided reading paths and a source-linked “Ask the book” study companion. Improve these features based on reader feedback. |

## Features that could distinguish the app

- **Guided journeys through the book:** Curated paths such as “beginner’s introduction,” “purifying the heart,” or “daily worship,” with selected chapters and clear progress.
- **Ask the book:** Let readers ask a question and surface relevant passages from *Ihya’*, cited by volume, book, and chapter, with links to the source text. Treat it as a study aid grounded in the book, not as a source of religious rulings.
- **Personal study space:** Keep private notes and highlights attached to passages. Offer optional summaries or review questions based on selected sections.
- **Meaningful cross-links:** Connect related discussions across the book’s four quarters to help readers explore themes across volumes.
- **Flexible reading sessions:** Offer optional 5-, 10-, or 20-minute sessions, gentle progress tracking, and a prompt to continue where the reader left off.
- **Accessible listening:** Add text-to-speech for the English translation, with playback controls and synchronized highlighting. Clear rights separately for any recorded recitation.

Bookmarks, audio, search, dark mode, and progress tracking are established patterns in Quran reading apps. A promising opportunity is to apply them to the structure and study of *Ihya’*. See [Quran.com’s app catalog](https://quran.com/apps) for examples of current Quran app features and study tools.

## Decisions to settle before development

1. **Content rights:** Confirm permission to distribute the current English translation in mobile apps, along with rights for any other third-party material.
2. **Sync:** Start with private on-device bookmarks and notes. Add optional account-based sync after validating the reader experience.
3. **AI boundaries:** Keep generated answers tied to cited passages, label generated content clearly, and disclose any third-party AI processing. Apple’s [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/uk/) call for disclosure and explicit permission when personal data is shared with third-party AI.
4. **Launch scope:** Release the core reader first, then use reader feedback to prioritize study features.

## Suggested first release

Offline reading, chapter search, saved reading position, bookmarks, Arabic font selection, themes, and accessibility support. Add guided journeys and the cited study companion as follow-on features.
