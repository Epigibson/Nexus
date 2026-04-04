"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, type UserResponse, type TokenResponse } from "@/lib/api";

interface AuthState {
  user: UserResponse | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Restore session on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("ag_token");
    const savedUser = localStorage.getItem("ag_user");

    if (savedToken && savedUser) {
      setToken(savedToken);
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem("ag_user");
      }
      // Validate token is still valid
      api.getProfile().then((fresh) => {
        setUser(fresh);
        localStorage.setItem("ag_user", JSON.stringify(fresh));
      }).catch(() => {
        // Token expired
        localStorage.removeItem("ag_token");
        localStorage.removeItem("ag_user");
        setToken(null);
        setUser(null);
      });
    }
    setIsLoading(false);
  }, []);

  const handleAuth = useCallback((data: TokenResponse) => {
    const userObj: UserResponse = {
      id: data.user_id,
      email: data.email,
      display_name: data.display_name,
      avatar_url: null,
      plan: "free",
      created_at: new Date().toISOString(),
    };
    setToken(data.access_token);
    setUser(userObj);
    localStorage.setItem("ag_token", data.access_token);
    localStorage.setItem("ag_user", JSON.stringify(userObj));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.login(email, password);
    handleAuth(data);
    // Fetch full profile
    const profile = await api.getProfile();
    setUser(profile);
    localStorage.setItem("ag_user", JSON.stringify(profile));
    router.push("/dashboard");
  }, [handleAuth, router]);

  const register = useCallback(async (email: string, password: string, displayName?: string) => {
    const data = await api.register(email, password, displayName);
    handleAuth(data);
    router.push("/dashboard");
  }, [handleAuth, router]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("ag_token");
    localStorage.removeItem("ag_user");
    router.push("/login");
  }, [router]);

  const refreshProfile = useCallback(async () => {
    const profile = await api.getProfile();
    setUser(profile);
    localStorage.setItem("ag_user", JSON.stringify(profile));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token,
        login,
        register,
        logout,
        refreshProfile,
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
