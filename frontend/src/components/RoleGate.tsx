import { useAccess, PAGE_KEYS, type PageKey } from '../contexts/AccessContext';
import { useAuth } from '../contexts/AuthContext';
import { ShieldOff } from 'lucide-react';
import type { ReactNode } from 'react';

interface Props {
  pageKey: PageKey;
  children: ReactNode;
}

/** Gate a route by PageAccess. Admin always passes. Otherwise checks matrix. */
export default function RoleGate({ pageKey, children }: Props) {
  const { canAccess, loading } = useAccess();
  const { user } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <svg className="animate-spin w-6 h-6 text-gray-800" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    );
  }

  if (!canAccess(pageKey)) {
    // Find the first page this user can actually open
    const fallback = PAGE_KEYS.find((k) => canAccess(k));
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 text-center max-w-md mx-auto mt-12">
        <ShieldOff className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="text-sm font-semibold text-gray-900 mb-1">Akses Ditolak</p>
        <p className="text-xs text-gray-500 mb-4">
          Anda ({user?.role}) tidak memiliki akses ke halaman ini.
        </p>
        {fallback ? (
          <a
            href={fallback === 'dashboard' ? '/' : `/${fallback}`}
            className="inline-block px-4 py-2 bg-black text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition-colors"
          >
            Buka Halaman yang Diizinkan
          </a>
        ) : null}
      </div>
    );
  }

  return <>{children}</>;
}
