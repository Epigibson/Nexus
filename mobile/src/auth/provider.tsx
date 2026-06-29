import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import {
  signIn,
  signUp,
  signOut as amplifySignOut,
  fetchAuthSession,
  getCurrentUser,
  confirmSignIn,
  confirmSignUp,
  setUpTOTP,
  verifyTOTPSetup,
  updateMFAPreference,
  fetchMFAPreference,
  type SignInOutput,
} from 'aws-amplify/auth';
import { api, type UserResponse } from '@/api/client';

const TOKEN_KEY = 'ag_token';
const USER_KEY = 'ag_user';

interface MfaSetupResult {
  qrCodeUri: string;
  secretKey: string;
}

interface AuthState {
  user: UserResponse | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<SignInOutput>;
  confirmMfa: (challengeResponse: string) => Promise<SignInOutput>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  confirmRegistration: (email: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setupTotp: () => Promise<MfaSetupResult>;
  verifyTotp: (code: string) => Promise<void>;
  getMfaStatus: () => Promise<{ enabled: boolean; preferred: string | null }>;
  disableMfa: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load session on mount
  useEffect(() => {
    const loadSession = async () => {
      try {
        const session = await fetchAuthSession();
        if (session.tokens?.idToken) {
          const jwtToken = session.tokens.idToken.toString();
          setToken(jwtToken);
          await SecureStore.setItemAsync(TOKEN_KEY, jwtToken);

          try {
            const profile = await api.getProfile();
            setUser(profile);
            await SecureStore.setItemAsync(USER_KEY, JSON.stringify(profile));
          } catch (e) {
            console.error('Failed to fetch profile', e);
            setUser(null);
            setToken(null);
            await SecureStore.deleteItemAsync(TOKEN_KEY);
          }
        }
      } catch (e) {
        console.log('No valid session found', e);
        setToken(null);
        setUser(null);
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      } finally {
        setIsLoading(false);
      }
    };
    loadSession();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<SignInOutput> => {
    const result = await signIn({ username: email, password });

    if (result.nextStep?.signInStep === 'DONE') {
      const session = await fetchAuthSession();
      if (session.tokens?.idToken) {
        const jwtToken = session.tokens.idToken.toString();
        setToken(jwtToken);
        await SecureStore.setItemAsync(TOKEN_KEY, jwtToken);

        const profile = await api.getProfile();
        setUser(profile);
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(profile));
      }
    }

    return result;
  }, []);

  const confirmMfa = useCallback(async (challengeResponse: string): Promise<SignInOutput> => {
    const result = await confirmSignIn({ challengeResponse });

    if (result.nextStep?.signInStep === 'DONE') {
      const session = await fetchAuthSession();
      if (session.tokens?.idToken) {
        const jwtToken = session.tokens.idToken.toString();
        setToken(jwtToken);
        await SecureStore.setItemAsync(TOKEN_KEY, jwtToken);

        try {
          const profile = await api.getProfile();
          setUser(profile);
          await SecureStore.setItemAsync(USER_KEY, JSON.stringify(profile));
        } catch (e) {
          console.error('Profile sync error after MFA', e);
        }
      }
    }

    return result;
  }, []);

  const register = useCallback(async (email: string, password: string, displayName?: string) => {
    await signUp({
      username: email,
      password,
      options: {
        userAttributes: {
          email,
          ...(displayName ? { name: displayName } : {}),
        },
      },
    });
  }, []);

  const confirmRegistration = useCallback(async (email: string, code: string) => {
    await confirmSignUp({ username: email, confirmationCode: code });
  }, []);

  const logout = useCallback(async () => {
    try {
      await amplifySignOut();
    } catch (e) {
      console.error('Amplify signout error', e);
    }
    setToken(null);
    setUser(null);
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
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

  const setupTotp = useCallback(async (): Promise<MfaSetupResult> => {
    const totpSetup = await setUpTOTP();
    const secretKey = totpSetup.sharedSecret;
    const user = await getCurrentUser();
    const issuer = 'Nexus';
    const qrCodeUri = `otpauth://totp/${issuer}:${user.username}?secret=${secretKey}&issuer=${issuer}`;
    return { qrCodeUri, secretKey };
  }, []);

  const verifyTotp = useCallback(async (code: string) => {
    await verifyTOTPSetup({ code });
    await updateMFAPreference({ totp: 'PREFERRED' });
  }, []);

  const getMfaStatus = useCallback(async () => {
    const output = await fetchMFAPreference();
    return {
      enabled: output.preferred === 'TOTP' || (output.enabled?.includes('TOTP') ?? false),
      preferred: output.preferred ?? null,
    };
  }, []);

  const disableMfa = useCallback(async () => {
    await updateMFAPreference({ totp: 'DISABLED' });
  }, []);

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
        logout,
        refreshProfile,
        setupTotp,
        verifyTotp,
        getMfaStatus,
        disableMfa,
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
