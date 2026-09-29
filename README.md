# GymSync for iOS

A native iOS port of [GymSync](https://github.com/p3xz/gymsyncs), the vanilla
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

## Run locally

Prerequisites: Node.js 20+, the Expo Go app on your iPhone (same Wi-Fi as your
computer).

```bash
npm install
npx expo start
```

Scan the QR code in the terminal with your iPhone camera and open it in Expo Go.
The app loads over your local network.

## iOS builds via GitHub Actions

`.github/workflows/ios-build.yml` builds the iOS app with EAS on a macOS
runner on every push to `main`. It uses the `preview` profile in `eas.json`,
which targets the **iOS simulator**, so it needs no Apple account at all.

### Secrets you must add

In the GitHub repo: Settings > Secrets and variables > Actions > New repository secret.

| Secret | Where to get it |
|---|---|
| `EXPO_TOKEN` | expo.dev > your account > Access Tokens > Create token |

That is the only secret the simulator build needs.

### Installing on a real iPhone

Apple requires a paid **Apple Developer Program** membership ($99/year) to
install apps on a physical iPhone or distribute via TestFlight. Without it,
simulator builds are the limit. Once you have the membership:

1. Run `eas credentials` locally and let EAS set up your distribution
   certificate and provisioning profile, or add `APPLE_ID`,
   `APPLE_ID_PASSWORD` (app-specific password), and `APPLE_TEAM_ID` as
   repository secrets.
2. Fill in the real values in the `submit.production.ios` section of
   `eas.json` (`appleId`, `appleTeamId`, `ascAppId`).
3. Change the workflow's build profile from `preview` to `production` and run
   `eas submit --platform ios` to push to TestFlight.

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
  ios-build.yml      EAS iOS build on macOS runner, on push to main
```

## Notes

- The EAS workflow is correct-by-construction but has not been run end to end
  here: this machine has no Apple Developer account and no Expo token.
- Bundle identifier: `com.p3xz.gymsync`. Change it in `app.json` if you want
  your own before the first production build.
