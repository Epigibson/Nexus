import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { AppState } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {
  api,
  API_BASE,
  TOKEN_KEY,
  USER_KEY,
  saveSession,
  clearSession,
  refreshAccessToken,
  type UserResponse,
  type TokenResponse,
  type LoginResponse,
} from '@/api/client';
import {
  authenticate, biometricAvailable, biometricEnabled, biometricKind, setBiometricEnabled,
  type BiometricKind,
} from '@/auth/biometric';

/** Tras este tiempo en segundo plano, la app pide la huella otra vez. */
const RELOCK_AFTER_MS = 60_000;

interface MfaSetupResult {
  qrCodeUri: string;
  secretKey: string;
}

/** "ok" = sesión iniciada · "mfa" = falta el código TOTP · "verify-email" = falta verificar el correo (se envió código) */
export type LoginResult = 'ok' | 'mfa' | 'verify-email';

interface AuthState {
  user: UserResponse | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  confirmMfa: (code: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  confirmRegistration: (email: string, code: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setupTotp: () => Promise<MfaSetupResult>;
  verifyTotp: (code: string) => Promise<void>;
  getMfaStatus: () => Promise<{ enabled: boolean; preferred: string | null }>;
  disableMfa: () => Promise<void>;
  /** La sesión existe pero la app espera la huella para mostrarse. */
  locked: boolean;
  unlock: () => Promise<boolean>;
  biometric: { available: boolean; enabled: boolean; kind: BiometricKind };
  /** Activa (pidiendo la huella para confirmar) o desactiva el desbloqueo biométrico. */
  setBiometric: (enabled: boolean) => Promise<boolean>;
}

class AuthError extends Error {
  constructor(message: string, public status: number, public code: string | null) {
    super(message);
  }
}

/** POST a /auth/*. X-Client: mobile hace que la API devuelva el refresh token en el body (no hay cookies). */
async function authPost<T>(path: string, body?: unknown, token?: string | null): Promise<T> {
  const res = await fetch(`${API_BASE}/auth${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Client': 'mobile',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const detail = Array.isArray(data.detail)
      ? data.detail.map((e: { msg?: string }) => e.msg?.replace(/^Value error, /, '')).join('. ')
      : data.detail;
    throw new AuthError(detail || `Error ${res.status}`, res.status, res.headers.get('X-Auth-Error'));
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mfaToken = useRef<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [biometric, setBiometricState] = useState<{ available: boolean; enabled: boolean; kind: BiometricKind }>({
    available: false, enabled: false, kind: 'huella',
  });
  const backgroundAt = useRef<number | null>(null);

  const startSession = useCallback(async (session: TokenResponse) => {
    await saveSession(session);
    const profile = await api.getProfile();
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(profile));
    setUser(profile);
    setToken(session.access_token);
  }, []);

  // Restaurar la sesión con el refresh token guardado
  useEffect(() => {
    const loadSession = async () => {
      try {
        const accessToken = await refreshAccessToken();
        if (!accessToken) {
          await clearSession();
          return;
        }
        const profile = await api.getProfile();
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(profile));
        // Con la huella activada, la sesión se restaura pero la app arranca bloqueada
        if ((await biometricEnabled()) && (await biometricAvailable())) setLocked(true);
        setUser(profile);
        setToken(accessToken);
      } catch (e) {
        console.log('No valid session found', e);
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    loadSession();
  }, []);

  // Estado de la biometría del teléfono (sensor, huella registrada, preferencia del usuario)
  useEffect(() => {
    (async () => {
      const [available, enabled, kind] = await Promise.all([biometricAvailable(), biometricEnabled(), biometricKind()]);
      setBiometricState({ available, enabled: enabled && available, kind });
    })();
  }, []);

  // Volver a bloquear si la app pasó más de RELOCK_AFTER_MS en segundo plano.
  // Solo cuenta "background": el diálogo de huella del sistema no manda la app a segundo plano.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        backgroundAt.current = Date.now();
      } else if (state === 'active' && backgroundAt.current) {
        const away = Date.now() - backgroundAt.current;
        backgroundAt.current = null;
        if (away > RELOCK_AFTER_MS && token && biometric.enabled) setLocked(true);
      }
    });
    return () => sub.remove();
  }, [token, biometric.enabled]);

  const unlock = useCallback(async () => {
    const ok = await authenticate('Desbloquea Nexus');
    if (ok) setLocked(false);
    return ok;
  }, []);

  const setBiometric = useCallback(async (enabled: boolean) => {
    if (enabled) {
      if (!(await biometricAvailable())) return false;
      if (!(await authenticate('Confirma tu huella para activarla'))) return false;
    }
    await setBiometricEnabled(enabled);
    setBiometricState((b) => ({ ...b, enabled }));
    return true;
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    try {
      const result = await authPost<LoginResponse>('/login', { email, password });
      if (result.mfa_required) {
        mfaToken.current = result.mfa_token;
        return 'mfa';
      }
      await startSession(result as TokenResponse);
      return 'ok';
    } catch (err) {
      if (err instanceof AuthError && err.code === 'email_not_verified') return 'verify-email';
      throw err;
    }
  }, [startSession]);

  const confirmMfa = useCallback(async (code: string) => {
    if (!mfaToken.current) throw new Error('La verificación expiró, inicia sesión de nuevo');
    const session = await authPost<TokenResponse>('/mfa/challenge', { mfa_token: mfaToken.current, code });
    mfaToken.current = null;
    await startSession(session);
  }, [startSession]);

  const register = useCallback(async (email: string, password: string, displayName?: string) => {
    await authPost('/register', { email, password, display_name: displayName || undefined });
  }, []);

  const confirmRegistration = useCallback(async (email: string, code: string) => {
    const session = await authPost<TokenResponse>('/verify-email', { email, code });
    await startSession(session);
  }, [startSession]);

  const resendVerification = useCallback(async (email: string) => {
    await authPost('/resend-verification', { email });
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    await authPost('/password/forgot', { email });
  }, []);

  const resetPassword = useCallback(async (email: string, code: string, newPassword: string) => {
    await authPost('/password/reset', { email, code, new_password: newPassword });
  }, []);

  const logout = useCallback(async () => {
    setLocked(false);
    await clearSession();
    setToken(null);
    setUser(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const profile = await api.getProfile();
      setUser(profile);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(profile));
    } catch (e) {
      console.error('Failed to refresh profile', e);
    }
  }, []);

  // Endpoints de 2FA autenticados (renuevan el token si expiró)
  const authedPost = useCallback(async <T,>(path: string, body?: unknown): Promise<T> => {
    try {
      return await authPost<T>(path, body, await SecureStore.getItemAsync(TOKEN_KEY));
    } catch (err) {
      if (!(err instanceof AuthError) || err.status !== 401) throw err;
      const fresh = await refreshAccessToken();
      if (!fresh) throw err;
      setToken(fresh);
      return authPost<T>(path, body, fresh);
    }
  }, []);

  const setupTotp = useCallback(async (): Promise<MfaSetupResult> => {
    const setup = await authedPost<{ secret: string; otpauth_uri: string }>('/mfa/setup');
    return { qrCodeUri: setup.otpauth_uri, secretKey: setup.secret };
  }, [authedPost]);

  const verifyTotp = useCallback(async (code: string) => {
    await authedPost('/mfa/enable', { code });
  }, [authedPost]);

  const getMfaStatus = useCallback(async () => {
    try {
      const status = await api.getMfaStatus();
      return { enabled: status.enabled, preferred: status.enabled ? 'TOTP' : null };
    } catch {
      return { enabled: false, preferred: null };
    }
  }, []);

  const disableMfa = useCallback(async () => {
    await authedPost('/mfa/disable');
  }, [authedPost]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        login,
        confirmMfa,
        register,
        confirmRegistration,
        resendVerification,
        forgotPassword,
        resetPassword,
        logout,
        refreshProfile,
        setupTotp,
        verifyTotp,
        getMfaStatus,
        disableMfa,
        locked,
        unlock,
        biometric,
        setBiometric,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
