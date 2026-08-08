import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { fetchPageAccesses, fetchMyAccesses, updatePageAccess, type PageAccessRow } from '../lib/api';
import { useAuth } from './AuthContext';

export const PAGE_KEYS = [
  'dashboard',
  'clients',
  'kanban',
  'projects',
  'invoices',
  'services',
  'profile',
  'users',
  'access',
  'settings',
  'export',
] as const;

export type PageKey = typeof PAGE_KEYS[number];

export const PAGE_LABELS: Record<PageKey, string> = {
  dashboard: 'Dashboard',
  clients: 'Semua Client',
  kanban: 'Kanban Board',
  projects: 'Proyek',
  invoices: 'Invoice',
  services: 'Layanan',
  profile: 'Profil Saya',
  users: 'Manajemen User',
  access: 'Hak Akses',
  settings: 'Settings',
  export: 'Export Excel',
};

interface AccessContextType {
  accesses: PageAccessRow[];
  loading: boolean;
  canAccess: (pageKey: string) => boolean;
  refresh: () => Promise<void>;
  setAccess: (role: 'ADMIN' | 'STAFF' | 'VIEWER', pageKey: string, allowed: boolean) => Promise<void>;
}

const AccessContext = createContext<AccessContextType>({
  accesses: [],
  loading: false,
  canAccess: () => false,
  refresh: async () => {},
  setAccess: async () => {},
});

export function AccessProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [accesses, setAccesses] = useState<PageAccessRow[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setAccesses([]);
      return;
    }
    setLoading(true);
    try {
      // Everyone (including staff/viewer) needs their own effective matrix
      // so route gates + sidebar work. Admin also needs full matrix for AccessPage UI.
      const minePromise = fetchMyAccesses();
      const matrixPromise = user.role === 'ADMIN' ? fetchPageAccesses() : Promise.resolve(null);
      const [mine, matrix] = await Promise.all([minePromise, matrixPromise]);
      // Merge: prefer admin's full matrix view; for staff/viewer use mine rows only.
      setAccesses(matrix ?? mine);
    } catch (err) {
      console.error('Failed to load page accesses:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const canAccess = useCallback(
    (pageKey: string): boolean => {
      if (!user) return false;
      if (user.role === 'ADMIN') return true; // Admin bypasses the matrix
      const row = accesses.find((a) => a.role === user.role && a.pageKey === pageKey);
      return !!row?.allowed;
    },
    [user, accesses],
  );

  const setAccess = useCallback(
    async (role: 'ADMIN' | 'STAFF' | 'VIEWER', pageKey: string, allowed: boolean) => {
      const updated = await updatePageAccess(role, pageKey, allowed);
      setAccesses((prev) => {
        const idx = prev.findIndex((a) => a.role === role && a.pageKey === pageKey);
        if (idx === -1) return [...prev, updated];
        const next = [...prev];
        next[idx] = updated;
        return next;
      });
    },
    [],
  );

  return (
    <AccessContext.Provider value={{ accesses, loading, canAccess, refresh, setAccess }}>
      {children}
    </AccessContext.Provider>
  );
}

export function useAccess() {
  return useContext(AccessContext);
}
