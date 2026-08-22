import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as authApi from "../services/authApi";
import { refreshSession } from "../services/apiClient";
import type { AuthUser, RegisterInput } from "../services/authApi";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (input: RegisterInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // On first load, the access token is gone (memory-only, decision #5) but
  // the httpOnly refresh cookie may still be valid — try to silently
  // restore the session before rendering anything that depends on it.
  useEffect(() => {
    (async () => {
      const restored = await refreshSession();
      if (restored) {
        try {
          const me = await authApi.fetchMe();
          setUser({ id: me.id, email: me.email, role: me.role });
        } catch {
          setUser(null);
        }
      }
      setLoading(false);
    })();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login: async (email, password) => {
        const u = await authApi.login(email, password);
        setUser(u);
        return u;
      },
      register: async (input) => {
        const u = await authApi.register(input);
        setUser(u);
        return u;
      },
      logout: async () => {
        await authApi.logout();
        setUser(null);
      },
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
