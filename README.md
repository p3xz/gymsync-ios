# GymSync iOS

> A native iOS port of the GymSync web fitness tracker: a full gym workout companion with live sessions, rest timers, personal records, weekly volume tracking, and a Live Activity in the Dynamic Island and on the Lock Screen, all on-device with no backend and no account.

![Status](https://img.shields.io/badge/status-active-brightgreen) ![License](https://img.shields.io/badge/license-MIT-blue)

## What

GymSync iOS is a native iOS port of [GymSync](https://github.com/p3xz/gymsyncs),
the vanilla HTML/CSS/JS fitness tracker. It is a full gym workout companion:
plan your weekly split, run live workout sessions with a timer and rest
countdowns, log weights and notes per exercise, track personal records and
weekly training volume, and keep all of it on your device with no backend and
no account. Dark theme throughout, with a Live Activity that shows your
workout timer and exercise progress in the Dynamic Island and on the Lock
Screen while you train.

## Why

Built as a personal project, so a gym tracker that started as a web app could
live natively on an iPhone: one tap to open, the screen staying awake mid-set,
and the workout timer visible without unlocking the phone.

## When

Built in September 2026.

## Tech Stack

![TypeScript](https://skillicons.dev/icons?i=ts) ![React](https://skillicons.dev/icons?i=react) ![Expo](https://skillicons.dev/icons?i=expo)

- **Languages:** TypeScript (strict), JSX/TSX
- **Frameworks:** React Native 0.86, React 19, Expo SDK 57 (managed workflow)
- **Navigation:** expo-router (file-based routing under `app/`)
- **Storage:** AsyncStorage, all data on-device under the `gymsync:` key prefix
- **UI/UX:** react-native-reanimated for entrance animations, react-native-safe-area-context for notched iPhones and the Dynamic Island, @expo/vector-icons for icons
- **Native modules:** expo-notifications (weekly goal nudges, overspend alerts), expo-haptics (toast feedback), expo-document-picker and expo-file-system (JSON backup export), expo-keep-awake (workout screen)
- **AI:** Google Gemini API for the AI Coach routine generator
- **Builds:** EAS Build on GitHub Actions for the Android APK (preview profile, `buildType: "apk"`), plain `xcodebuild` on a macOS runner for the unsigned iOS IPA (code signing disabled)

## Why this stack

- **Expo (managed workflow):** build, test, and ship an iOS app from any machine with no local Xcode; the unsigned IPA is produced on a macOS GitHub runner instead.
- **React Native + TypeScript (strict):** near-native iOS UI from a single codebase, with type safety across screens and the storage layer.
- **expo-router:** file-based routing, every screen is a file under `app/`.
- **AsyncStorage:** the whole app's data lives on-device under the `gymsync:` key prefix, no backend and no accounts, mirroring the web app's localStorage keys.
- **Expo modules:** notifications for weekly-goal nudges, haptics for toast feedback, document-picker and file-system for JSON backup export, keep-awake for the workout screen.
- **Gemini API:** plain-language routine generation and editing on the free tier, with the key stored only on the device.
- **GitHub Actions (EAS for Android, xcodebuild for iOS):** every push to main produces a signed APK and an unsigned IPA artifact, with no secrets needed for the iOS job.

## How it works

- **Navigation:** the root layout in `app/_layout.tsx` gates first-launch onboarding, then hands off to bottom tabs (Home, Workout, Routines, History, Profile) through expo-router.
- **Weekly schedule:** in Routines you create custom routines and assign each weekday either a built-in split (Push / Pull / Legs / Rest) or one of your routines. Home and the workout screen read that schedule automatically.
- **Live session:** checking off exercises marks progress; per-exercise weight (kg) and notes are logged inline; the rest timer runs between sets and superset groups; the screen stays awake; finishing opens a summary sheet (duration, exercises, estimated calories at 6.5/min).
- **Persistence:** `lib/storage.ts` wraps AsyncStorage with the `gymsync:` prefix; records, streaks, charts, and weekly-goal math are derived in `lib/` from that stored history. JSON export/import in Profile guards against sideload reinstall wipes.
- **Live Activity:** starting a workout raises a Live Activity showing the timer and exercise progress in the Dynamic Island and on the Lock Screen, updating as you check exercises off and ending when you finish (iOS 16.2 or later; the Dynamic Island needs iPhone 14 Pro or later).
- **Weekly goal:** a target sessions-per-week goal is tracked from history; fall behind by Sunday and a local notification nudges you.

## Features

- **Onboarding:** first-launch name capture, skipped on later launches.
- **Home:** greeting, live clock, today's workout card, day streak and this-week stats, last workout, motivational quote, Start Workout button.
- **Workout:** today's exercises with check-off, per-exercise weight (kg) and notes inputs, live timer, progress bar, and a finish flow with a summary sheet (duration, exercises, estimated calories at 6.5/min).
- **Routines:** create your own routines (name plus exercises with sets and reps), edit or delete them, and assign each weekday either a built-in split (Push / Pull / Legs / Rest) or one of your custom routines. Home and Workout follow this schedule automatically.
- **History:** total workouts, streak, and an expandable per-workout log.
- **Profile:** edit your name, lifetime stats, and reset-all-data.
- **AI Coach (Gemini):** describe the routine you want in plain words and get a full routine back, or edit any existing routine with an instruction like "make it harder, dumbbells only". Needs a free Gemini API key (see AI Coach setup below).
- **Polish:** safe-area support for notched iPhones and the Dynamic Island, pull to refresh, toast feedback, haptics, loading and error states, and subtle entrance animations throughout.
- **Dynamic Island (iOS):** starting a workout shows a Live Activity in the Dynamic Island and on the Lock Screen: live timer plus exercise progress (e.g. PUSH, 12:34, 3/6). Updates as you check off exercises, ends when you finish. Needs an iPhone with iOS 16.2 or later (Dynamic Island needs iPhone 14 Pro or later; older iPhones show the Lock Screen activity).
- **Rest timer:** countdown overlay on the workout screen with 30/60/90/120s presets, vibration and toast on finish, skip button, and an auto-start toggle with a configurable default in Profile.
- **Backup and restore:** export ALL app data to a JSON file and share it, or import it back (Profile). Protects against sideload reinstall wipes.
- **Personal records:** best weight per exercise derived from workout history, mid-workout PR toasts, and a records list in Profile.
- **Progress charts:** weekly training volume bars plus per-exercise best weight trends on History, drawn with plain Views (no native chart deps).
- **Plate calculator:** enter bar and target weight, get the plates per side using standard 25/20/15/10/5/2.5/1.25 kg plates.
- **Repeat last workout:** one-tap button on Home that starts a workout prefilled with the last session's exercises, weights, and sets.
- **Supersets:** link exercises in the routine editor; the workout runs grouped exercises back-to-back with the rest timer between groups.
- **Exercise library:** bundled data for common lifts (primary muscle, instructions, form cues), searchable from the routine editor.
- **Weekly goal:** set a target sessions-per-week goal; fall behind by Sunday and a local notification nudges you.
- **GymSync Pro:** upgrade screen plus a manual preview toggle in Profile. Gates the AI Coach, progress charts, and backup. No real payments yet: Razorpay/UPI hooks are marked in `lib/pro.ts` for later.
- **Programs:** purchasable program catalog (Push Pull Legs, 5x5, beginner fat-loss) with full previews; the buy button is an honest "coming soon", no charges.
- **Gear:** gear recommendation cards with clearly-marked TODO slots for future affiliate URLs. No links yet.
- **Form check:** pick a lift video and submit it; coaching review backend is stubbed with an honest "coming soon" message.

Not built: Apple Health sync and AdMob were deliberately skipped (both need native config / dev builds / accounts that would break the unsigned-IPA flow).

All data is stored on-device with AsyncStorage under the `gymsync:` key prefix, mirroring the web app's localStorage keys.

## Quick Start

### Prerequisites

- Node.js 20 or later
- Expo SDK 57 (managed workflow)
- React Native 0.86, React 19, TypeScript (strict)
- The Expo Go app on your phone (same Wi-Fi as your computer) for instant testing

### Installation

1. Clone the repo:

```bash
git clone https://github.com/p3xz/gymsync-ios.git
cd gymsync-ios
```

2. Install dependencies:

```bash
npm install
```

3. Start the dev server:

```bash
npx expo start
```

4. Scan the QR code in the terminal with the Expo Go app. The app loads over your local network.

## Usage

Run the dev server and test instantly in Expo Go:

```bash
npx expo start
```

## Get the APK

Every push to `main` builds a signed APK automatically via GitHub Actions (see Android builds via GitHub Actions below). To install it:

1. Open the repo on GitHub and go to the **Actions** tab.
2. Click the latest successful **Android APK build** run.
3. Under **Artifacts**, download `gymsync-apk` and unzip it to get `gymsync.apk`.
4. Send the APK to your phone (USB, Google Drive, WhatsApp to yourself, etc.).
5. Open the file on the phone. Android will ask you to allow **Install unknown apps** for whichever app opens it (your file manager or browser); allow it once, then install.

No developer account or payment is needed for any of this. Android lets you sideload APKs freely, unlike iOS.

## Android builds via GitHub Actions

`.github/workflows/mobile-build.yml` builds the Android APK with EAS on an `ubuntu-latest` runner on every push to `main`. It uses the `preview` profile in `eas.json`, which sets `buildType: "apk"`. The finished APK is uploaded as the `gymsync-apk` workflow artifact.

### Secrets you must add

In the GitHub repo: Settings > Secrets and variables > Actions > New repository secret.

| Secret | Where to get it |
|---|---|
| `EXPO_TOKEN` | expo.dev > your account > Access Tokens > Create token |

That is the only secret the APK build needs. No Apple or Google Play credentials are involved.

## iOS: unsigned IPA (no paid Apple account needed)

Every push also builds an **unsigned IPA** on a macOS runner with plain `xcodebuild` (code signing disabled), uploaded as the `gymsync-unsigned-ipa` artifact. This job needs no secrets at all: no `EXPO_TOKEN`, no Apple ID, no certificates.

An unsigned IPA cannot be installed directly. To get it on your iPhone, sideload it from your own computer with a **free** Apple ID:

1. Download `gymsync-unsigned-ipa` from the Actions run artifacts.
2. Install [Sideloadly](https://sideloadly.io) (Windows/macOS) or AltStore.
3. Plug in your iPhone, drag the IPA into Sideloadly, enter your free Apple ID.
4. On the iPhone: Settings > General > VPN & Device Management > trust your Apple ID, then open GymSync.

Free Apple IDs get 7-day provisioning profiles, so re-sideload weekly. The paid Apple Developer Program ($99/year) is only needed for TestFlight/App Store distribution; `eas.json` keeps a release profile stub for that future.

## AI Coach setup

1. Get a free API key at Google AI Studio (aistudio.google.com).
2. Open the app's **Profile** tab, paste the key under **AI Coach**, and save.
3. In the **Routines** tab, tap the **AI** button to generate a routine from a description, or tap the sparkles icon on any routine to edit it with an instruction. The AI result always loads into the routine editor first, so you review it before saving.

The key is stored only on this device (AsyncStorage) and is never sent anywhere except Google's Gemini API.

## Project layout

```
app/
  _layout.tsx        Root: onboarding gate + shared app state
  onboarding.tsx     First-launch name capture
  plate-calculator.tsx Plate calculator screen
  upgrade.tsx        GymSync Pro upgrade screen
  programs.tsx       Paid program catalog
  gear.tsx           Gym gear recommendations
  form-check.tsx     Lift video form-check submission
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
  backup.ts          Export/import of all gymsync:* keys
  records.ts         Personal records derived from history
  charts.ts          Weekly volume + per-exercise best-weight trends
  plates.ts          Plate breakdown math
  exercises.ts       Bundled exercise library data
  weeklyGoal.ts      Weekly session goal + Sunday local notification
  pro.ts             Pro gating (manual toggle until payments land)
  programs.ts        Paid program catalog data
components/
  RestTimer.tsx      Rest countdown overlay
  BarChart.tsx       Plain-View bar chart
eas.json             EAS build profiles (development / preview / production)
.github/workflows/
  mobile-build.yml   Android APK (EAS, ubuntu) + unsigned iOS IPA (xcodebuild, macOS), on push to main
```

## Notes

- The EAS workflow is correct-by-construction but has not been run end to end here: this machine has no Expo token, so add `EXPO_TOKEN` before the first push-triggered build.
- Android package: `com.p3xz.gymsync`. iOS bundle identifier: `com.p3xz.gymsync`. Change them in `app.json` if you want your own before the first production build.

## Contributing

Issues and pull requests are welcome. Open an issue first to discuss any significant change before writing code.

## License

MIT License, Copyright (c) 2026 Namish Yadav. See the [LICENSE](LICENSE) file for details.

## Credits

Built by Namish Yadav ([p3xz](https://github.com/p3xz)) as the iOS companion to the web app GymSync. The Gemini AI Coach feature uses Google's Gemini API (free API key from Google AI Studio, stored only on-device).
