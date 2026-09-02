import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo, type ReactNode } from 'react';
import { apiLogin, apiVerifyOtp, apiLogout, fetchMe, setApiToken, clearApiToken } from '../lib/api';

export type UserRole = 'ADMIN' | 'STAFF' | 'VIEWER';

export interface AuthUser {
  id: number;
  email: string;
  name: string | null;
  role: UserRole;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  loginStep1: (email: string, password: string, turnstileToken?: string) => Promise<void>;
  loginStep2: (email: string, code: string) => Promise<void>;
  updateUser: (updatedUser: AuthUser, newToken?: string) => void;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  loginStep1: async () => {},
  loginStep2: async () => {},
  updateUser: () => {},
  refreshUser: async () => {},
  logout: async () => {},
});

// ─── SEC-4: sessionStorage helpers ───────────────────────────────────────────
// We store only non-sensitive user display info (id, name, email, role) in
// sessionStorage — NOT the JWT.  The JWT lives as an HttpOnly cookie (set by
// the server) and in module-level memory (_token in api.ts).

function getStoredUser(): AuthUser | null {
  try {
    const stored = sessionStorage.getItem('auth_user');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function storeUser(user: AuthUser): void {
  sessionStorage.setItem('auth_user', JSON.stringify(user));
}

function clearStoredUser(): void {
  sessionStorage.removeItem('auth_user');
  // Also clear any legacy localStorage entries from older sessions
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  // isLoading=true while we check the server-side cookie on first mount
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  const pendingEmailRef = useRef('');

  // ── On mount: restore session from HttpOnly cookie via GET /api/auth/me ──
  // The browser sends the cookie automatically (credentials:'include' in $fetch).
  // This is the only safe way to check auth state after a page refresh without
  // storing the JWT in localStorage.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const fresh = await fetchMe();
        if (cancelled) return;
        const normalized: AuthUser = { ...fresh, role: (fresh.role as UserRole) || 'STAFF' };
        storeUser(normalized);
        setUser(normalized);
        setIsAuthenticated(true);
      } catch {
        // Cookie missing/expired — ensure clean state
        if (!cancelled) {
          clearStoredUser();
          clearApiToken();
          setUser(null);
          setIsAuthenticated(false);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Cross-tab sync (for logout / profile changes in another tab) ──────────
  useEffect(() => {
    function handleStorageChange(e: Event | StorageEvent) {
      const se = e as StorageEvent;
      if (se.key && se.key !== 'auth_user') return;
      const storedUser = getStoredUser();
      if (!storedUser) {
        setUser(null);
        setIsAuthenticated(false);
        clearApiToken();
      } else {
        setUser((prev) => {
          if (!prev) return storedUser;
          if (
            prev.id === storedUser.id &&
            prev.role === storedUser.role &&
            prev.email === storedUser.email &&
            prev.name === storedUser.name
          ) return prev;
          return storedUser;
        });
      }
    }
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // ── Login step 1: validate email+password, trigger OTP send ──────────────
  const loginStep1 = useCallback(async (email: string, password: string, turnstileToken?: string) => {
    await apiLogin(email, password, turnstileToken);
    pendingEmailRef.current = email;
  }, []);

  // ── Login step 2: verify OTP, receive token + set session ────────────────
  const loginStep2 = useCallback(async (email: string, code: string) => {
    const { token, user } = await apiVerifyOtp(email, code);
    const normalized: AuthUser = { ...user, role: (user.role as UserRole) || 'STAFF' };

    // SEC-4: keep JWT in memory only (NOT localStorage); the server also sets
    // it as an HttpOnly cookie so it persists across page refreshes.
    setApiToken(token);
    storeUser(normalized);

    setUser(normalized);
    setIsAuthenticated(true);

    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('auth:login'));
  }, []);

  // ── Update user (profile changes) ─────────────────────────────────────────
  const updateUser = useCallback((updatedUser: AuthUser, newToken?: string) => {
    if (newToken) setApiToken(newToken);
    storeUser(updatedUser);
    setUser(updatedUser);
    window.dispatchEvent(new Event('storage'));
  }, []);

  // ── Refresh user from server ───────────────────────────────────────────────
  const refreshUser = useCallback(async () => {
    try {
      const fresh = await fetchMe();
      const normalized: AuthUser = { ...fresh, role: (fresh.role as UserRole) || 'STAFF' };
      storeUser(normalized);
      setUser(normalized);
      window.dispatchEvent(new Event('storage'));
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  }, []);

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    // Update UI immediately so the user is redirected to /login right away
    clearApiToken();
    clearStoredUser();
    setUser(null);
    setIsAuthenticated(false);
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('auth:logout'));
    // SEC-4: clear the HttpOnly cookie server-side (best-effort, non-blocking)
    apiLogout().catch(() => {});
  }, []);

  const value = useMemo(
    () => ({ isAuthenticated, isLoading, user, loginStep1, loginStep2, updateUser, refreshUser, logout }),
    [isAuthenticated, isLoading, user, loginStep1, loginStep2, updateUser, refreshUser, logout],
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
