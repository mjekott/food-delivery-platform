import {
  ApiResponse,
  AuthResponse,
  AuthUser,
  UserRole,
} from "@food-delivery/types";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { deleteToken, getToken, saveToken } from "../lib/auth";
import { api } from "../lib/axios";
import { posthog } from "../lib/posthog";

interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role?: UserRole;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await api.post<ApiResponse<AuthResponse>>("/auth/login", {
      email,
      password,
    });
    await saveToken(data.data.accessToken);
    setUser(data.data.user);
    posthog.identify(data.data.user.id, {
      $set: {
        role: data.data.user.role,
      },
      $set_once: {
        first_login_date: new Date().toISOString(),
      },
    });
    posthog.capture("user_logged_in", {
      role: data.data.user.role,
    });
  };

  const register = async (payload: RegisterData) => {
    const { data } = await api.post<ApiResponse<AuthResponse>>(
      "/auth/register",
      payload,
    );
    await saveToken(data.data.accessToken);
    setUser(data.data.user);
    posthog.identify(data.data.user.id, {
      $set: {
        role: data.data.user.role,
      },
      $set_once: {
        signup_date: new Date().toISOString(),
      },
    });
    posthog.capture("user_registered", {
      role: data.data.user.role,
    });
  };

  const checkAuth = async () => {
    setIsLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        setUser(null);
        return;
      }

      const { data } = await api.get<ApiResponse<AuthUser>>("/auth/me");
      setUser(data.data);
      posthog.identify(data.data.id, {
        $set: {
          role: data.data.role,
        },
      });
    } catch {
      // Token missing/expired/invalid — clear it and treat as logged out.
      await deleteToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    posthog.capture("user_logged_out");
    posthog.reset();
    await deleteToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
