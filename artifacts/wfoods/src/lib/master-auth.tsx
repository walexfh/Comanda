import { createContext, useContext, ReactNode, useState, useEffect } from "react";

interface MasterUser {
  id: number;
  name: string;
  email: string;
  role: "master";
}

interface MasterAuthContextType {
  user: MasterUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  apiFetch: <T = unknown>(path: string, options?: RequestInit) => Promise<T>;
}

const MasterAuthContext = createContext<MasterAuthContextType | null>(null);

const MASTER_TOKEN_KEY = "wfoods_master_token";

export function MasterAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MasterUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const apiFetch = async <T = unknown>(path: string, options: RequestInit = {}): Promise<T> => {
    const token = localStorage.getItem(MASTER_TOKEN_KEY);
    const res = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? `HTTP ${res.status}`);
    }
    return res.json() as T;
  };

  useEffect(() => {
    const token = localStorage.getItem(MASTER_TOKEN_KEY);
    if (!token) { setIsLoading(false); return; }

    apiFetch<MasterUser>("/api/master/auth/me")
      .then(setUser)
      .catch(() => localStorage.removeItem(MASTER_TOKEN_KEY))
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const data = await apiFetch<{ token: string; user: MasterUser }>("/api/master/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem(MASTER_TOKEN_KEY, data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem(MASTER_TOKEN_KEY);
    setUser(null);
  };

  return (
    <MasterAuthContext.Provider value={{ user, isLoading, login, logout, apiFetch }}>
      {children}
    </MasterAuthContext.Provider>
  );
}

export function useMasterAuth() {
  const ctx = useContext(MasterAuthContext);
  if (!ctx) throw new Error("useMasterAuth must be used within MasterAuthProvider");
  return ctx;
}
