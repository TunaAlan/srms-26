import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import { getApiClient, LoginResponse, RegisterRequest } from "@/services/apiClient";

export type UserRole = "user" | "admin" | "department";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, role?: UserRole) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const apiClient = getApiClient();

  // Try to restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const token = await apiClient.getAuthToken();
        if (token) {
          setIsLoading(true);
          const profile = await apiClient.getCurrentUser();
          setUser(profile);
        }
      } catch (err) {
        await apiClient.clearAuthToken();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      const response: LoginResponse = await apiClient.login({ email, password });
      setUser(response.user);
      return true;
    } catch (err: any) {
      const errorMessage = err.message || "Login failed";
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    role: UserRole = "user"
  ): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      const response: LoginResponse = await apiClient.register({
        name,
        email,
        password,
        role,
      });
      setUser(response.user);
      return true;
    } catch (err: any) {
      const errorMessage = err.message || "Registration failed";
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await apiClient.clearAuthToken();
      setUser(null);
      setError(null);
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        isLoading,
        error,
        login,
        register,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
