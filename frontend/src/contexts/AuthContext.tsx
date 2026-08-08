import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo, type ReactNode } from 'react';
import { apiLogin, apiVerifyOtp, fetchMe } from '../lib/api';

export type UserRole = 'ADMIN' | 'STAFF' | 'VIEWER';

export interface AuthUser {
  id: number;
  email: string;
  name: string | null;
  role: UserRole;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthUser | null;
  loginStep1: (email: string, password: string, turnstileToken?: string) => Promise<void>;
  loginStep2: (email: string, code: string) => Promise<void>;
  updateUser: (updatedUser: AuthUser, newToken?: string) => void;
  refreshUser: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  loginStep1: async () => {},
  loginStep2: async () => {},
  updateUser: () => {},
  refreshUser: async () => {},
  logout: () => {},
});

function getStoredToken(): string | null {
  return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
}

function getStoredUser(): AuthUser | null {
  try {
    const stored = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!getStoredToken());
  const [user, setUser] = useState<AuthUser | null>(getStoredUser);

  const pendingEmailRef = useRef('');

  // Synchronize auth state across multiple browser tabs in real-time
  useEffect(() => {
    function handleStorageChange(e: Event | StorageEvent) {
      const se = e as StorageEvent;
      if (se.key && se.key !== 'auth_token' && se.key !== 'auth_user') return;
      const token = getStoredToken();
      const storedUser = getStoredUser();
      const newAuth = !!token;
      // Only update state when values actually changed to prevent re-render cascades
      setIsAuthenticated((prev) => (prev === newAuth ? prev : newAuth));
      setUser((prev) => {
        if (prev === storedUser) return prev; // both null
        if (!prev || !storedUser) return storedUser;
        if (prev.id === storedUser.id && prev.role === storedUser.role && prev.email === storedUser.email && prev.name === storedUser.name) return prev;
        return storedUser;
      });
    }

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const loginStep1 = useCallback(async (email: string, password: string, turnstileToken?: string) => {
    await apiLogin(email, password, turnstileToken);
    pendingEmailRef.current = email;
  }, []);

  const loginStep2 = useCallback(async (email: string, code: string) => {
    const { token, user } = await apiVerifyOtp(email, code);
    const normalized: AuthUser = { ...user, role: (user.role as UserRole) || 'STAFF' };
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(normalized));
    setUser(normalized);
    setIsAuthenticated(true);

    // Dispatch event for other listeners in current tab if needed
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('auth:login'));
  }, []);

  const updateUser = useCallback((updatedUser: AuthUser, newToken?: string) => {
    if (newToken) {
      localStorage.setItem('auth_token', newToken);
    }
    localStorage.setItem('auth_user', JSON.stringify(updatedUser));
    setUser(updatedUser);
    window.dispatchEvent(new Event('storage'));
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const fresh = await fetchMe();
      const normalized: AuthUser = { ...fresh, role: (fresh.role as UserRole) || 'STAFF' };
      localStorage.setItem('auth_user', JSON.stringify(normalized));
      setUser(normalized);
      window.dispatchEvent(new Event('storage'));
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_user');
    setUser(null);
    setIsAuthenticated(false);
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('auth:logout'));
  }, []);

  const value = useMemo(
    () => ({ isAuthenticated, user, loginStep1, loginStep2, updateUser, refreshUser, logout }),
    [isAuthenticated, user, loginStep1, loginStep2, updateUser, refreshUser, logout],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
