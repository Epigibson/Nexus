# Nexus Mobile

Aplicación móvil de Nexus para gestionar proyectos, hacer context switches y monitorear tu actividad de desarrollo.

## Tech Stack

- **Framework**: Expo SDK 52+ (React Native)
- **Navigation**: Expo Router v4
- **UI**: Tamagui v1
- **State**: Zustand
- **Auth**: AWS Amplify (Cognito)
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
- `EXPO_PUBLIC_API_URL` - Backend API URL
- `EXPO_PUBLIC_COGNITO_USER_POOL_ID` - AWS Cognito User Pool ID
- `EXPO_PUBLIC_COGNITO_CLIENT_ID` - AWS Cognito Client ID

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

### Building

```bash
# Build for development
eas build --profile development

# Build for preview
eas build --profile preview

# Build for production
eas build --profile production
```

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
- Auth: JWT tokens via AWS Cognito
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
