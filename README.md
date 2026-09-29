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

All data is stored on-device with AsyncStorage under the `gymsync:` key prefix,
mirroring the web app's localStorage keys.

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

## iOS (stub)

`eas.json` still carries iOS build profiles (`preview` targets the simulator,
`production` is a release build), but no workflow builds them automatically.
Apple requires a paid **Apple Developer Program** membership ($99/year) to
install on a physical iPhone or distribute via TestFlight. If you ever want
that: add your Apple credentials with `eas credentials`, fill in the real
values in the `submit.production.ios` section of `eas.json`, and add a macOS
workflow job.

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
  android-build.yml  EAS Android APK build on ubuntu-latest, on push to main
```

## Notes

- The EAS workflow is correct-by-construction but has not been run end to end
  here: this machine has no Expo token, so add `EXPO_TOKEN` before the first
  push-triggered build.
- Android package: `com.p3xz.gymsync`. iOS bundle identifier: `com.p3xz.gymsync`.
  Change them in `app.json` if you want your own before the first production
  build.
