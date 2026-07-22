# Food Delivery — Mobile

Expo Router (React Native) app for the Food Delivery platform, with customer, restaurant-owner,
and driver experiences. See the [root README](../../README.md) for the full project overview.

## Stack

Expo SDK 56 · Expo Router · React Query · Zustand · NativeWind · react-native-maps ·
expo-location · Socket.IO client · Paystack (via web checkout) · PostHog (optional).

## Setup

```bash
cp .env.example .env      # fill in values (see the file for notes)
```

The app uses native modules, so **Expo Go won't work** — build a development client:

```bash
npx expo run:ios          # or: npx expo run:android
```

Then start Metro (already started by `run:*`; otherwise `npx expo start`). Use
`npx expo start -c` after changing `EXPO_PUBLIC_*` env vars so the new values are bundled.

## Environment

See [`.env.example`](.env.example):

- `EXPO_PUBLIC_API_URL` — the API base URL. On a **physical device**, use your machine's LAN IP
  (e.g. `http://192.168.1.20:6000/api`), not `localhost`.
- `GOOGLE_MAPS_API_KEY` (build-time, Android map) + `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` (runtime,
  address autocomplete) — same key; enable Maps SDK (Android/iOS), Places, and Geocoding.
- `POSTHOG_PROJECT_TOKEN` / `POSTHOG_HOST` — optional analytics.

## Structure

```
src/
  app/          Expo Router routes: (auth), customer/, restaurant/, driver/
  components/   Shared UI (ui/ primitives, forms, maps, sheets)
  hooks/        React Query data hooks + Socket.IO hooks
  store/        Zustand stores (cart, driver online state)
  lib/          axios client, auth token, formatters, Google Places, uploads
```

## Native config

`app.config.js` is the source of truth (it shadows `app.json`). Config plugins add the
Google Maps key, location permissions, etc. After changing native config, regenerate with
`npx expo prebuild --clean`. `ios/` and `android/` are git-ignored.

## Build a development APK/IPA

```bash
# EAS (development profile) — outputs an installable artifact
eas build --profile development --platform android --local

# or Gradle debug build (uses the existing android/ dir)
cd android && ./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```
