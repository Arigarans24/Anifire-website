"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import * as auth from "@/lib/auth-client";
import type { AuthUser, SocialProvider } from "@/lib/auth-client";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  socialLogin: (provider: SocialProvider) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Bootstrap the session on first load (silently refreshes via the cookie).
  useEffect(() => {
    let cancelled = false;
    auth.getMe().then((u) => {
      if (!cancelled) {
        setUser(u);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const u = await auth.login({ email, password });
    setUser(u);
    return u;
  }, []);

  const socialLogin = useCallback(async (provider: SocialProvider) => {
    const u = await auth.socialLogin(provider);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    await auth.logout();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    setUser(await auth.getMe());
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, socialLogin, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
