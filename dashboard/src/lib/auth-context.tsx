"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { api, API_BASE, refreshAccessToken, type UserResponse, type TokenResponse, type LoginResponse } from "@/lib/api";

interface MfaSetupResult {
  qrCodeUri: string;
  secretKey: string;
}

/** "ok" = sesión iniciada · "mfa" = falta el código TOTP · "verify-email" = falta verificar el correo (se envió código) */
export type LoginResult = "ok" | "mfa" | "verify-email";

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
}

class AuthError extends Error {
  constructor(message: string, public status: number, public code: string | null) {
    super(message);
  }
}

/** POST a un endpoint de /auth con la cookie de refresh incluida. */
async function authPost<T>(path: string, body?: unknown, token?: string | null): Promise<T> {
  const res = await fetch(`${API_BASE}/auth${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const detail = Array.isArray(data.detail)
      ? data.detail.map((e: { msg?: string }) => e.msg?.replace(/^Value error, /, "")).join(". ")
      : data.detail;
    throw new AuthError(detail || `Error ${res.status}`, res.status, res.headers.get("X-Auth-Error"));
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mfaToken = useRef<string | null>(null);
  const router = useRouter();

  const clearSession = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("ag_token");
  }, []);

  const startSession = useCallback(async (session: Pick<TokenResponse, "access_token">) => {
    localStorage.setItem("ag_token", session.access_token);
    setToken(session.access_token);
    const profile = await api.getProfile();
    setUser(profile);
    router.push("/dashboard");
  }, [router]);

  // Restaurar la sesión con la cookie de refresh
  useEffect(() => {
    const loadSession = async () => {
      try {
        const accessToken = await refreshAccessToken();
        if (!accessToken) {
          clearSession();
          return;
        }
        setToken(accessToken);
        setUser(await api.getProfile());
      } catch (e) {
        console.log("No valid session found", e);
        clearSession();
      } finally {
        setIsLoading(false);
      }
    };
    loadSession();
  }, [clearSession]);

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    try {
      const result = await authPost<LoginResponse>("/login", { email, password });
      if (result.mfa_required) {
        mfaToken.current = result.mfa_token;
        return "mfa";
      }
      await startSession(result as TokenResponse);
      return "ok";
    } catch (err) {
      if (err instanceof AuthError && err.code === "email_not_verified") return "verify-email";
      throw err;
    }
  }, [startSession]);

  const confirmMfa = useCallback(async (code: string) => {
    if (!mfaToken.current) throw new Error("La verificación expiró, inicia sesión de nuevo");
    const session = await authPost<TokenResponse>("/mfa/challenge", { mfa_token: mfaToken.current, code });
    mfaToken.current = null;
    await startSession(session);
  }, [startSession]);

  const register = useCallback(async (email: string, password: string, displayName?: string) => {
    await authPost("/register", { email, password, display_name: displayName || undefined });
  }, []);

  const confirmRegistration = useCallback(async (email: string, code: string) => {
    const session = await authPost<TokenResponse>("/verify-email", { email, code });
    await startSession(session);
  }, [startSession]);

  const resendVerification = useCallback(async (email: string) => {
    await authPost("/resend-verification", { email });
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    await authPost("/password/forgot", { email });
  }, []);

  const resetPassword = useCallback(async (email: string, code: string, newPassword: string) => {
    await authPost("/password/reset", { email, code, new_password: newPassword });
  }, []);

  const logout = useCallback(async () => {
    try {
      await authPost("/logout");
    } catch (error) {
      console.error("Error signing out: ", error);
    }
    clearSession();
    router.push("/login");
  }, [router, clearSession]);

  const refreshProfile = useCallback(async () => {
    try {
      const profile = await api.getProfile();
      setUser(profile);
    } catch (error) {
      console.error("Error refreshing profile", error);
    }
  }, []);

  // Endpoints de 2FA autenticados: pasan por authPost con el token actual (renovándolo si expiró)
  const authedPost = useCallback(async <T,>(path: string, body?: unknown): Promise<T> => {
    try {
      return await authPost<T>(path, body, localStorage.getItem("ag_token"));
    } catch (err) {
      if (!(err instanceof AuthError) || err.status !== 401) throw err;
      const fresh = await refreshAccessToken();
      if (!fresh) throw err;
      setToken(fresh);
      return authPost<T>(path, body, fresh);
    }
  }, []);

  const setupTotp = useCallback(async (): Promise<MfaSetupResult> => {
    const setup = await authedPost<{ secret: string; otpauth_uri: string }>("/mfa/setup");
    return { qrCodeUri: setup.otpauth_uri, secretKey: setup.secret };
  }, [authedPost]);

  const verifyTotp = useCallback(async (code: string) => {
    await authedPost("/mfa/enable", { code });
  }, [authedPost]);

  const getMfaStatus = useCallback(async () => {
    try {
      let res = await fetch(`${API_BASE}/auth/mfa`, { headers: { Authorization: `Bearer ${localStorage.getItem("ag_token")}` } });
      if (res.status === 401) {
        const fresh = await refreshAccessToken();
        if (fresh) res = await fetch(`${API_BASE}/auth/mfa`, { headers: { Authorization: `Bearer ${fresh}` } });
      }
      if (!res.ok) return { enabled: false, preferred: null };
      const { enabled } = await res.json();
      return { enabled, preferred: enabled ? "TOTP" : null };
    } catch {
      return { enabled: false, preferred: null };
    }
  }, []);

  const disableMfa = useCallback(async () => {
    await authedPost("/mfa/disable");
  }, [authedPost]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token,
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
