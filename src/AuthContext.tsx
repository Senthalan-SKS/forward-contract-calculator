import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getCurrentUser, login, logout, register } from "./auth";

interface AuthContextValue {
  user: string | null;
  login: (u: string, p: string) => { ok: boolean; error?: string };
  register: (u: string, p: string) => { ok: boolean; error?: string };
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<string | null>(() => getCurrentUser());

  // Keep in sync if another tab logs out
  useEffect(() => {
    const handler = () => setUser(getCurrentUser());
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const handleLogin = (u: string, p: string) => {
    const result = login(u, p);
    if (result.ok) setUser(getCurrentUser());
    return result;
  };

  const handleRegister = (u: string, p: string) => {
    const result = register(u, p);
    if (result.ok) setUser(getCurrentUser());
    return result;
  };

  const handleLogout = () => {
    logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login: handleLogin, register: handleRegister, logout: handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

