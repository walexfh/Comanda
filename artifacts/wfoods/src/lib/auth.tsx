import { createContext, useContext, ReactNode, useEffect } from "react";
import { useGetMe, useLogout } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { CurrentUser } from "@workspace/api-client-react/src/generated/api.schemas";
import { getGetMeQueryKey } from "@workspace/api-client-react";

interface AuthContextType {
  user: CurrentUser | null;
  isLoading: boolean;
  logout: () => void;
  setToken: (token: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: user, isLoading } = useGetMe({
    query: {
      retry: false,
      staleTime: Infinity,
    },
  });

  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const handleLogout = async () => {
    try {
      localStorage.removeItem("wfoods_token");
      queryClient.setQueryData(getGetMeQueryKey(), null);
      setLocation("/");
    } catch (e) {
      // handle error if needed
    }
  };

  const setToken = (token: string) => {
    localStorage.setItem("wfoods_token", token);
    queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
  };

  return (
    <AuthContext.Provider value={{ user: user || null, isLoading, logout: handleLogout, setToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
