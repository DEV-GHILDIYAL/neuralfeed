# NeuralFeed — Mobile app (React Native + Expo)

The NeuralFeed news app for Android & iOS. Same Supabase database and features as the website:

- **Home** — today's briefing, Top Stories / For You, category filters, pull to refresh
- **Shorts** — swipe-up news cards (summary + key points), listen, share
- **Ask AI** — chat with the news (uses the website's `/api/ask`), with sources
- **Saved** — bookmarks stored on the phone
- **More** — English/हिंदी, light/dark theme, your topics, archive calendar, AI Model Tracker, search, Telegram channel
- **Article** — full brief, key points, listen (device TTS), "also covered by", related stories

## Run it on your phone (2 minutes)

```bash
cd mobile
npm install
cp .env.example .env      # fill in the same public Supabase URL + anon key the website uses
npx expo start
```

Install **Expo Go** from the Play Store / App Store and scan the QR code shown in the terminal.
(Phone and computer must be on the same Wi-Fi; otherwise run `npx expo start --tunnel`.)

## Build an APK / store build (EAS)

```bash
npm install -g eas-cli
eas login                 # free Expo account
eas build:configure       # once — links the project to your Expo account
eas build -p android --profile preview      # installable .apk
eas build -p android --profile production   # .aab for Google Play
```

Before building, add the env vars to EAS (they are not read from `.env` on the build servers):

```bash
eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value https://YOUR-PROJECT.supabase.co --environment preview --environment production --visibility plaintext
eas env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value YOUR-ANON-KEY --environment preview --environment production --visibility plaintext
```

## Checks

```bash
npm run typecheck      # TypeScript
npm run bundle:check   # builds the Android JS bundle (catches import/runtime config errors)
npx expo start --web   # quick look in the browser
```

## Notes
- Expo SDK 58 / React Native 0.88 / expo-router (file-based routes in `src/app`).
- Categories and UI strings mirror the website (`../src/lib/categories.js`, `../src/lib/i18n.jsx`) — keep them in sync.
- Only public values live in the app (Supabase anon key is read-only by RLS). AI keys stay on the server.
