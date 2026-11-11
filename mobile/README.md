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

## Releasing a new APK (GitHub Releases + in-app update)

APKs are built by GitHub Actions (`.github/workflows/android-release.yml`) and attached to a GitHub Release.
Installed apps check `releases/latest` on launch (at most every 6 h, or via **More → App updates**) and show
**"New update available → Download now"**; the APK downloads inside the app and Android's installer opens.

```bash
# bump nothing by hand — the tag IS the version (1.2.3 → versionCode 10203)
git tag -a v1.0.1 -m "What's new:
- Shorts are faster
- Bug fixes"
git push origin v1.0.1
```

The tag message becomes the release notes shown in the app's update popup.

One-time setup (repo → Settings → Secrets and variables → Actions):

| Type | Name | Value |
|---|---|---|
| Secret | `ANDROID_KEYSTORE_BASE64` | release keystore, base64 (kept outside the repo) |
| Secret | `ANDROID_KEYSTORE_PASSWORD` | keystore password |
| Secret | `SUPABASE_URL` | already set for the news pipeline |
| Variable | `SUPABASE_ANON_KEY` | public anon / publishable key |

⚠️ Every release must be signed with the **same keystore**, or Android refuses to install it over the old app.
Back it up — if it is lost, users must uninstall and reinstall.

## Build with EAS instead (optional, needs an Expo account)

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
