import { useEffect, useState } from 'react';
import { Shield, Check, Loader2 } from 'lucide-react';
import { useAccess, PAGE_KEYS, PAGE_LABELS, type PageKey } from '../contexts/AccessContext';

const ROLES = ['ADMIN', 'STAFF', 'VIEWER'] as const;
const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  STAFF: 'Staff',
  VIEWER: 'Viewer',
};

export default function AccessPage() {
  const { accesses, loading, setAccess } = useAccess();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [savingCell, setSavingCell] = useState<string | null>(null);

  useEffect(() => {
    if (success || error) {
      const t = setTimeout(() => { setSuccess(null); setError(null); }, 3000);
      return () => clearTimeout(t);
    }
  }, [success, error]);

  function getAllowed(role: string, pageKey: string): boolean {
    // Admin is always allowed (bypass) — checkbox shown checked and disabled.
    if (role === 'ADMIN') return true;
    return accesses.some((a) => a.role === role && a.pageKey === pageKey && a.allowed);
  }

  async function toggle(role: string, pageKey: string) {
    if (role === 'ADMIN') return;
    const cellKey = `${role}:${pageKey}`;
    setSavingCell(cellKey);
    const next = !getAllowed(role, pageKey);
    try {
      await setAccess(role as any, pageKey, next);
      setSuccess(`Akses ${ROLE_LABELS[role]} ke ${PAGE_LABELS[pageKey as PageKey]} ${next ? 'diizinkan' : 'dicabut'}`);
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan');
    } finally {
      setSavingCell(null);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Hak Akses</h1>
      </div>

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-sm font-medium">{success}</div>
      )}
      {error && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-800 text-sm font-medium">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Halaman</th>
                {ROLES.map((r) => (
                  <th key={r} className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">
                    {ROLE_LABELS[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {PAGE_KEYS.map((pageKey) => (
                <tr key={pageKey} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                    <span className="inline-flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-gray-400" />
                      {PAGE_LABELS[pageKey]}
                    </span>
                    <span className="block text-[10px] font-mono text-gray-400 mt-0.5">{pageKey}</span>
                  </td>
                  {ROLES.map((role) => {
                    const allowed = getAllowed(role, pageKey);
                    const cellKey = `${role}:${pageKey}`;
                    const isAdminRow = role === 'ADMIN';
                    const isSaving = savingCell === cellKey;
                    return (
                      <td key={role} className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggle(role, pageKey)}
                          disabled={isAdminRow || isSaving}
                          className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border-2 transition-all ${
                            allowed
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'bg-white border-gray-300 text-gray-300 hover:border-gray-400'
                          } disabled:cursor-not-allowed disabled:opacity-90`}
                          aria-label={`${allowed ? 'Izinkan' : 'Tolak'} ${role} untuk ${PAGE_LABELS[pageKey]}`}
                          title={isAdminRow ? 'Admin selalu punya akses (tidak dapat diubah)' : (allowed ? 'Aktif — klik untuk menonaktifkan' : 'Nonaktif — klik untuk mengizinkan')}
                        >
                          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (allowed ? <Check className="w-4 h-4" /> : <span className="text-xs">×</span>)}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
          <strong>Catatan:</strong> Admin selalu punya akses ke semua halaman (tidak dapat dinonaktifkan).
          Perubahan disimpan per sel dan langsung berlaku.
        </div>
      </div>

      {loading && accesses.length === 0 && (
        <p className="text-center text-xs text-gray-400">Memuat matrix akses…</p>
      )}
    </div>
  );
}
