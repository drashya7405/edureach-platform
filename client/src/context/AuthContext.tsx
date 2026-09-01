import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { getMe, logoutUser } from "../services/auth.service";

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, userData?: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Attempt to verify session via HTTP-only cookie or local token
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

  const login = (token: string, userData?: User) => {
    localStorage.setItem("token", token);
    if (userData) {
      setUser(userData);
    }
    getMe()
      .then((data) => setUser(data.user))
      .catch(() => {
        if (!userData) {
          localStorage.removeItem("token");
          setUser(null);
        }
      });
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    void logoutUser();
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