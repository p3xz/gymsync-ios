# GymSync for Android

A native Android port of [GymSync](https://github.com/p3xz/gymsyncs), the vanilla
HTML/CSS/JS fitness tracker. Built with Expo (managed workflow), React Native,
TypeScript, and expo-router. Dark theme, on-device storage, no backend.

## Features

- **Onboarding** - first-launch name capture, skipped on later launches
- **Home** - greeting, live clock, today's workout card, day streak / this-week
  stats, last workout, motivational quote, Start Workout button
- **Workout** - today's exercises with check-off, per-exercise weight (kg) and
  notes inputs, live timer, progress bar, finish flow with a summary sheet
  (duration, exercises, estimated calories at 6.5/min)
- **Routines** - create your own routines (name + exercises with sets and reps),
  edit or delete them, and assign each weekday either a built-in split
  (Push / Pull / Legs / Rest) or one of your custom routines. Home and Workout
  follow this schedule automatically.
- **History** - total workouts, streak, and an expandable per-workout log
- **Profile** - edit your name, lifetime stats, and reset-all-data
- **AI Coach (Gemini)** - describe the routine you want in plain words and get
  a full routine back, or edit any existing routine with an instruction like
  "make it harder, dumbbells only". Needs a free Gemini API key (see below).
- **Polish** - safe-area support for notched iPhones and the Dynamic Island,
  pull to refresh, toast feedback, haptics, loading and error states, and
  subtle entrance animations throughout.

All data is stored on-device with AsyncStorage under the `gymsync:` key prefix,
mirroring the web app's localStorage keys.

## AI Coach setup

1. Get a free API key at Google AI Studio (aistudio.google.com).
2. Open the app's **Profile** tab, paste the key under **AI Coach**, and save.
3. In the **Routines** tab, tap the **AI** button to generate a routine from a
   description, or tap the sparkles icon on any routine to edit it with an
   instruction. The AI result always loads into the routine editor first, so
   you review it before saving.

The key is stored only on this device (AsyncStorage) and is never sent
anywhere except Google's Gemini API.

## Get the APK

Every push to `main` builds a signed APK automatically via GitHub Actions
(see "Android builds via GitHub Actions" below). To install it:

1. Open the repo on GitHub and go to the **Actions** tab.
2. Click the latest successful **Android APK build** run.
3. Under **Artifacts**, download `gymsync-apk` and unzip it to get `gymsync.apk`.
4. Send the APK to your phone (USB, Google Drive, WhatsApp to yourself, etc.).
5. Open the file on the phone. Android will ask you to allow **Install unknown
   apps** for whichever app opens it (your file manager or browser) - allow it
   once, then install.

No developer account or payment is needed for any of this. Android lets you
sideload APKs freely, unlike iOS.

## Instant testing with Expo Go

For quick iteration without waiting for a build:

Prerequisites: Node.js 20+, the Expo Go app on your Android phone (same Wi-Fi
as your computer).

```bash
npm install
npx expo start
```

Scan the QR code in the terminal with the Expo Go app. The app loads over your
local network.

## Android builds via GitHub Actions

`.github/workflows/android-build.yml` builds the Android APK with EAS on an
`ubuntu-latest` runner on every push to `main`. It uses the `preview` profile
in `eas.json`, which sets `buildType: "apk"`. The finished APK is uploaded as
the `gymsync-apk` workflow artifact.

### Secrets you must add

In the GitHub repo: Settings > Secrets and variables > Actions > New repository secret.

| Secret | Where to get it |
|---|---|
| `EXPO_TOKEN` | expo.dev > your account > Access Tokens > Create token |

That is the only secret the APK build needs. No Apple or Google Play
credentials are involved.

## iOS: unsigned IPA (no paid Apple account needed)

Every push also builds an **unsigned IPA** on a macOS runner with plain
`xcodebuild` (code signing disabled), uploaded as the `gymsync-unsigned-ipa`
artifact. This job needs no secrets at all: no `EXPO_TOKEN`, no Apple ID, no
certificates.

An unsigned IPA cannot be installed directly. To get it on your iPhone,
sideload it from your own computer with a **free** Apple ID:

1. Download `gymsync-unsigned-ipa` from the Actions run artifacts.
2. Install [Sideloadly](https://sideloadly.io) (Windows/macOS) or AltStore.
3. Plug in your iPhone, drag the IPA into Sideloadly, enter your free Apple ID.
4. On the iPhone: Settings > General > VPN & Device Management > trust your
   Apple ID, then open GymSync.

Free Apple IDs get 7-day provisioning profiles, so re-sideload weekly. The
paid Apple Developer Program ($99/year) is only needed for TestFlight/App
Store distribution; `eas.json` keeps a release profile stub for that future.

## Project layout

```
app/
  _layout.tsx        Root: onboarding gate + shared app state
  onboarding.tsx     First-launch name capture
  (tabs)/
    _layout.tsx      Bottom tab bar (Home, Workout, Routines, History, Profile)
    index.tsx        Home dashboard
    workout.tsx      Live workout session
    routines.tsx     Custom routines + weekly schedule
    history.tsx      Past workouts
    profile.tsx      Name, stats, reset
lib/
  theme.ts           Colors, spacing, radii (ported from the web app)
  storage.ts         AsyncStorage wrapper with the `gymsync:` prefix
  workout.ts         Splits, exercises, quotes, schedule logic, streak math
eas.json             EAS build profiles (development / preview / production)
.github/workflows/
  mobile-build.yml   Android APK (EAS, ubuntu) + unsigned iOS IPA (xcodebuild, macOS), on push to main
```

## Notes

- The EAS workflow is correct-by-construction but has not been run end to end
  here: this machine has no Expo token, so add `EXPO_TOKEN` before the first
  push-triggered build.
- Android package: `com.p3xz.gymsync`. iOS bundle identifier: `com.p3xz.gymsync`.
  Change them in `app.json` if you want your own before the first production
  build.
