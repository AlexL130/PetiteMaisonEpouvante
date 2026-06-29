import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { api, AuthUser } from "../api";

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => void;
  getToken: () => string | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = sessionStorage.getItem("accessToken");
    const storedRefresh = sessionStorage.getItem("refreshToken");
    if (storedToken) {
      setAccessToken(storedToken);
      api.getMe(storedToken)
        .then(setUser)
        .catch(async () => {
          // Try refresh
          if (storedRefresh) {
            try {
              const data = await api.refresh(storedRefresh);
              sessionStorage.setItem("accessToken", data.accessToken);
              sessionStorage.setItem("refreshToken", data.refreshToken);
              setAccessToken(data.accessToken);
              const me = await api.getMe(data.accessToken);
              setUser(me);
              return;
            } catch { /* fall through */ }
          }
          clearSession();
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  function saveSession(access: string, refresh: string) {
    setAccessToken(access);
    sessionStorage.setItem("accessToken", access);
    sessionStorage.setItem("refreshToken", refresh);
  }

  function clearSession() {
    setUser(null);
    setAccessToken(null);
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("refreshToken");
  }

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.login(email, password);
    saveSession(response.accessToken, response.refreshToken);
    setUser(response.user);
  }, []);

  const register = useCallback(async (email: string, password: string, displayName?: string) => {
    const response = await api.register(email, password, displayName);
    saveSession(response.accessToken, response.refreshToken);
    setUser(response.user);
  }, []);

  const logout = useCallback(() => {
    clearSession();
  }, []);

  const getToken = useCallback(() => accessToken, [accessToken]);

  return (
    <AuthContext.Provider value={{
      user,
      token: accessToken,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      getToken,
      isLoading,
    }}>
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
