import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { getMe, logoutUser } from "../services/auth.service";

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (userData?: User, token?: string) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    // Verify active session via JWT Bearer token
    getMe()
      .then((data) => {
        setUser(data.user);
      })
      .catch(() => {
        localStorage.removeItem("token");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = (userData?: User, token?: string) => {
    if (token) {
      localStorage.setItem("token", token);
    }
    if (userData) {
      setUser(userData);
    }
    // Verify fresh user record from /auth/me
    getMe()
      .then((data) => setUser(data.user))
      .catch(() => {
        if (!userData) {
          localStorage.removeItem("token");
          setUser(null);
        }
      });
  };

  const logout = async () => {
    try {
      await logoutUser();
    } finally {
      localStorage.removeItem("token");
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}