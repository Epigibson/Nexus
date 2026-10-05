#!/usr/bin/env bash
# APK de release firmado, compilado localmente. Necesita en ~/.gradle/gradle.properties:
#   NEXUS_RELEASE_STORE_FILE, NEXUS_RELEASE_STORE_PASSWORD, NEXUS_RELEASE_KEY_ALIAS, NEXUS_RELEASE_KEY_PASSWORD
# Solo hace falta cuando cambia algo nativo (paquetes con código nativo, permisos, íconos, versión).
# Para cambios de JS/pantallas usa `npm run update` (EAS Update), sin reinstalar.
set -euo pipefail
cd "$(dirname "$0")/.."
VERSION="$(node -p "require('./app.json').expo.version")"

grep -q '^NEXUS_RELEASE_STORE_FILE=' "$HOME/.gradle/gradle.properties" 2>/dev/null \
  || { echo "❌ Falta NEXUS_RELEASE_STORE_FILE en ~/.gradle/gradle.properties (ver plugins/withReleaseSigning.js)"; exit 1; }
grep -q '^EXPO_PUBLIC_API_URL=https://' .env 2>/dev/null \
  || { echo "❌ .env debe tener EXPO_PUBLIC_API_URL=https://api.nexusproject.pro"; exit 1; }

npx expo prebuild --platform android --clean
# Solo arm64-v8a (todos los teléfonos Android actuales): ~40 MB en vez de ~108 MB con las 4 arquitecturas.
# Para un emulador x86_64: ARCHS=arm64-v8a,x86_64 npm run apk
(cd android && ./gradlew assembleRelease -PreactNativeArchitectures="${ARCHS:-arm64-v8a}")
cp android/app/build/outputs/apk/release/app-release.apk "nexus-$VERSION.apk"
echo "✅ APK: mobile/nexus-$VERSION.apk (runtime $VERSION, canal preview)"
