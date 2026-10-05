# Nexus Mobile

Aplicación móvil de Nexus para gestionar proyectos, hacer context switches y monitorear tu actividad de desarrollo.

## Tech Stack

- **Framework**: Expo SDK 52+ (React Native)
- **Navigation**: Expo Router v4
- **UI**: Tamagui v1
- **State**: Zustand
- **Auth**: Nexus API (JWT + refresh token in SecureStore, email codes, TOTP 2FA)
- **Storage**: expo-secure-store

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- EAS CLI: `npm install -g eas-cli`

### Installation

```bash
cd mobile
npm install
```

### Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables:
- `EXPO_PUBLIC_API_URL` - Backend API URL (`https://api.nexusproject.pro`)

The local APK build and `eas update` read this `.env`, not the `env` in `eas.json`.

### Running

```bash
# Start Expo dev server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run on Web
npm run web
```

### Building and updating

The app ships with **expo-updates** (EAS Update, channel `preview`, `runtimeVersion` = app `version`).

| Change | Command | Reinstall? |
|---|---|---|
| JS / screens / styles / API calls | `npm run update -- --message "what changed"` | No, the app downloads it on next launch |
| Native (new native package, permissions, icons, `version` bump) | `npm run apk` | Yes, install `mobile/nexus-<version>.apk` |

**Rule:** whenever you change something native, bump `version` in `app.json` before `npm run apk`. Updates only reach APKs with the same runtime version, so an update can never land on an incompatible APK.

`npm run apk` runs `expo prebuild --clean` + `./gradlew assembleRelease` (`android/` is generated, not committed). It needs JDK 17, the Android SDK and the release keystore configured in `~/.gradle/gradle.properties` (see `plugins/withReleaseSigning.js`). The keystore is the one EAS generated for `@nexus-app-epigibson/nexus-mobile`; to set it up on a new machine: `npx eas-cli credentials -p android` → `preview` → Download credentials to credentials.json.

Cloud builds still work: `eas build --profile preview --platform android`.

## Project Structure

```
mobile/
├── app/                    # Expo Router screens
│   ├── (auth)/            # Auth screens (login, register, 2FA)
│   ├── (tabs)/            # Main tab screens
│   └── modals/            # Modal screens
├── src/
│   ├── api/               # API client
│   ├── auth/              # Auth provider & config
│   ├── components/        # Reusable components
│   ├── stores/            # Zustand stores
│   └── theme/             # Tamagui theme config
└── assets/                # Images, fonts, etc.
```

## Features

### Phase 1 (Complete)
- Auth flow (login, register, 2FA)
- Tab navigation
- Theme system

### Phase 2 (Complete)
- Overview dashboard
- Projects list
- Project detail (envs, skills, activity)
- Audit log

### Phase 3 (Complete)
- Create/edit/delete projects
- Create/edit/delete environments
- CLI profile management
- Environment variables

### Phase 4 (Complete)
- Settings (profile, security)
- API keys management
- Billing & plans
- Team management

### Phase 5 (In Progress)
- Animations
- Error handling
- Push notifications
- EAS Build

## API Integration

The app uses the same API as the web dashboard:
- Auth: JWT access token (15 min) renewed with a refresh token (`X-Client: mobile`)
- Projects: CRUD operations
- Audit: Read-only audit log
- Billing: Stripe integration
- Teams: Member management

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT © Nexus Dev
