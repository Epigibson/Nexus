// Firma de release para builds locales (`npm run apk`).
// Lee el keystore desde propiedades de Gradle definidas FUERA del repo, en ~/.gradle/gradle.properties:
//   NEXUS_RELEASE_STORE_FILE=/ruta/absoluta/nexus-release.jks
//   NEXUS_RELEASE_STORE_PASSWORD=...
//   NEXUS_RELEASE_KEY_ALIAS=...
//   NEXUS_RELEASE_KEY_PASSWORD=...
// Como android/ se regenera con `expo prebuild --clean`, la firma se inyecta aquí y no a mano.
const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = '// nexus-release-signing';

const RELEASE_SIGNING_CONFIG = `
        release { ${MARKER}
            if (findProperty('NEXUS_RELEASE_STORE_FILE')) {
                storeFile file(findProperty('NEXUS_RELEASE_STORE_FILE'))
                storePassword findProperty('NEXUS_RELEASE_STORE_PASSWORD')
                keyAlias findProperty('NEXUS_RELEASE_KEY_ALIAS')
                keyPassword findProperty('NEXUS_RELEASE_KEY_PASSWORD')
            }
        }`;

const RELEASE_BUILD_TYPE_SIGNING = `if (findProperty('NEXUS_RELEASE_STORE_FILE')) {
                signingConfig signingConfigs.release
            } else {
                logger.warn('NEXUS_RELEASE_STORE_FILE no está definido: el APK de release se firma con la llave de debug')
                signingConfig signingConfigs.debug
            }`;

function addReleaseSigning(gradle) {
  if (gradle.includes(MARKER)) return gradle;

  // 1) buildTypes.release: usar la firma de release (antes de tocar signingConfigs, que también tiene "release {")
  const buildTypeRelease = /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/;
  if (!buildTypeRelease.test(gradle)) {
    throw new Error('withReleaseSigning: no encontré buildTypes.release en android/app/build.gradle');
  }
  gradle = gradle.replace(buildTypeRelease, `$1${RELEASE_BUILD_TYPE_SIGNING}`);

  // 2) signingConfigs: agregar el bloque release después de debug
  const debugSigningConfig = /(signingConfigs\s*\{\s*debug\s*\{[^}]*\})/;
  if (!debugSigningConfig.test(gradle)) {
    throw new Error('withReleaseSigning: no encontré signingConfigs.debug en android/app/build.gradle');
  }
  return gradle.replace(debugSigningConfig, `$1${RELEASE_SIGNING_CONFIG}`);
}

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    cfg.modResults.contents = addReleaseSigning(cfg.modResults.contents);
    return cfg;
  });
};
