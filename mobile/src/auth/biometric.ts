// Desbloqueo con huella / rostro. La sesión sigue en SecureStore; la biometría es la llave para abrir la app.
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const ENABLED_KEY = 'ag_biometric_enabled';
const OFFERED_KEY = 'ag_biometric_offered';

export type BiometricKind = 'huella' | 'rostro' | 'biometría';

/** ¿El teléfono tiene lector y una huella/rostro registrado? */
export async function biometricAvailable(): Promise<boolean> {
  try {
    return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
  } catch {
    return false;
  }
}

/** Nombre a mostrar según el sensor del teléfono. */
export async function biometricKind(): Promise<BiometricKind> {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return 'huella';
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'rostro';
  } catch {
    // sin sensor
  }
  return 'biometría';
}

export async function biometricEnabled(): Promise<boolean> {
  return (await SecureStore.getItemAsync(ENABLED_KEY)) === '1';
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  if (enabled) await SecureStore.setItemAsync(ENABLED_KEY, '1');
  else await SecureStore.deleteItemAsync(ENABLED_KEY);
}

/** Para ofrecer la huella una sola vez después del primer inicio de sesión. */
export async function wasBiometricOffered(): Promise<boolean> {
  return (await SecureStore.getItemAsync(OFFERED_KEY)) === '1';
}

export async function markBiometricOffered(): Promise<void> {
  await SecureStore.setItemAsync(OFFERED_KEY, '1');
}

/** Muestra el diálogo del sistema. Permite el PIN/patrón del teléfono como respaldo. */
export async function authenticate(promptMessage = 'Desbloquea Nexus'): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      promptSubtitle: 'Usa tu huella o el bloqueo de pantalla',
      cancelLabel: 'Cancelar',
      disableDeviceFallback: false,
    });
    return result.success;
  } catch {
    return false;
  }
}
