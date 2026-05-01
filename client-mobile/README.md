# client-mobile

Citizen-facing mobile app for the SRMS infrastructure reporting platform. Built with Expo + React Native, targeting iOS and Android.

## Stack

- **Expo SDK 54** + React Native 0.81
- **expo-router** — file-based routing
- **expo-image-picker** + **expo-location** — photo and GPS capture
- **expo-constants** — version from `app.json`
- **axios** — API client with JWT interceptor
- **expo-secure-store** — token storage

## Screens

| Screen | Route | Description |
|---|---|---|
| Home *(Ana Sayfa)* | `/` | Stats, quick actions |
| Report *(Bildirim)* | `/report` | Submit new report |
| History *(Geçmiş)* | `/history` | User's own reports |
| Map *(Harita)* | `/map` | Reports on map |
| Login | `/login` | Citizen login |
| Register | `/register` | Citizen registration |

## Report Status Flow

| Status | Label *(TR)* | Description |
|---|---|---|
| `pending` | Beklemede | AI analyzing |
| `in_review` | İncelemede | Awaiting admin review |
| `in_progress` | İşleme Alındı | Approved, field team working |
| `resolved` | Çözüldü | Closed |
| `rejected` | Reddedildi | Rejected — reason shown to user |

When a report is rejected, the reason is displayed directly in the history card.

## Dev Setup

```bash
npm install
```

Copy and configure the environment file:

```bash
cp .env.development.example .env.development
# Set API_BASE_URL to your local machine IP, not localhost
# e.g. EXPO_PUBLIC_API_BASE_URL=http://192.168.1.x:3000/api
```

Start Metro:

```bash
npx expo start
```

Scan the QR code with **Expo Go** (iOS/Android) or press `a` for Android emulator.

## Environment

```bash
EXPO_PUBLIC_API_BASE_URL=http://<host>:3000/api
```

Use your machine's local IP — `localhost` won't resolve from a physical device or emulator.

## Version

Displayed in the account modal (avatar → tap). Sourced from `app.json`:

```json
{ "version": "0.6.0" }
```

## Docker

The mobile container runs Metro Bundler — intended for development only. In production, build a standalone app with EAS Build.

```bash
docker-compose up client-mobile
# Metro available at http://<HOST_IP>:8081
```
