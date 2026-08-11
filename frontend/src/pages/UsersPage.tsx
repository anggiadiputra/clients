import { useState, useEffect } from 'react';
import { Plus, X, ShieldCheck, KeyRound, Trash2, CheckCircle2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  fetchUsers, createUser, updateUserRole, deleteUser, adminResetPassword,
  type ManagedUser,
} from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import { useSettings } from '../contexts/SettingsContext';
import { getPrimaryClasses } from '../lib/colors';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const ROLES = ['ADMIN', 'STAFF', 'VIEWER'] as const;
const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  STAFF: 'Staff',
  VIEWER: 'Viewer',
};
const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-black text-white border-black',
  STAFF: 'bg-blue-50 text-blue-700 border-blue-100',
  VIEWER: 'bg-gray-50 text-gray-600 border-gray-200',
};

export default function UsersPage() {
  useDocumentTitle('Manajemen User');
  const { settings } = useSettings();
  const primaryClasses = getPrimaryClasses(settings.primaryColor);
  const { user: me, refreshUser } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [resetTarget, setResetTarget] = useState<ManagedUser | null>(null);
  const [globalMsg, setGlobalMsg] = useState<string | null>(null);
  const [globalErr, setGlobalErr] = useState<string | null>(null);
  const [selfRoleChanged, setSelfRoleChanged] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [deletingUser, setDeletingUser] = useState(false);

  async function load() {
    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch (err: any) {
      setGlobalErr(err.message || 'Gagal memuat user');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // Auto-dismiss messages
  useEffect(() => {
    if (globalMsg || globalErr) {
      const t = setTimeout(() => { setGlobalMsg(null); setGlobalErr(null); }, 4000);
      return () => clearTimeout(t);
    }
  }, [globalMsg, globalErr]);

  async function changeRole(target: ManagedUser, newRole: ManagedUser['role']) {
    try {
      await updateUserRole(target.id, newRole);
      setGlobalMsg(`Role ${target.email} → ${ROLE_LABELS[newRole]}`);
      if (me?.id === target.id) {
        setSelfRoleChanged(true);
      } else {
        load();
      }
    } catch (err: any) {
      setGlobalErr(err.message || 'Gagal mengubah role');
    }
  }

  async function applySelfRefresh() {
    await refreshUser();
    setSelfRoleChanged(false);
    load();
  }

  async function handleConfirmDeleteUser() {
    if (!deleteTarget) return;
    setDeletingUser(true);
    try {
      await deleteUser(deleteTarget.id);
      setGlobalMsg(`User ${deleteTarget.email} berhasil dihapus`);
      setDeleteTarget(null);
      await load();
    } catch (err: any) {
      setGlobalErr(err.message || 'Gagal menghapus user');
    } finally {
      setDeletingUser(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Manajemen User</h1>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className={`p-2 sm:px-4 sm:py-2 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 ${primaryClasses.button}`}
          aria-label="Tambah user"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Tambah User</span>
        </button>
      </div>

      {globalMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-sm font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {globalMsg}
        </div>
      )}
      {globalErr && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-800 text-sm font-medium">
          {globalErr}
        </div>
      )}

      {selfRoleChanged && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-amber-800 text-sm">
          <p className="font-medium">
            Role akun Anda baru saja diubah. Sidebar akan terupdate setelah klik tombol di samping, atau logout-login.
          </p>
          <button
            onClick={applySelfRefresh}
            className={`self-start sm:self-auto px-3 py-1.5 text-white text-xs font-semibold rounded-lg ${primaryClasses.button}`}
          >
            Refresh Sesi Saya
          </button>
        </div>
      )}

      {/* Filter & Live Search */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Cari nama atau email user..."
            className={`w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 ${primaryClasses.ring} text-gray-800`}
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className={`px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 ${primaryClasses.ring} text-gray-800`}
        >
          <option value="">Semua Role</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>
      </div>

      {(() => {
        const filteredUsers = users.filter((u) => {
          const matchSearch =
            !search.trim() ||
            (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase());
          const matchRole = !roleFilter || u.role === roleFilter;
          return matchSearch && matchRole;
        });

        const totalPages = Math.ceil(filteredUsers.length / 10) || 1;
        const paginatedUsers = filteredUsers.slice((page - 1) * 10, page * 10);

        return (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nama</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400">Memuat...</td></tr>
                  ) : paginatedUsers.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400">{search || roleFilter ? 'User tidak ditemukan' : 'Belum ada user'}</td></tr>
                  ) : paginatedUsers.map((u) => {
                    const isMe = me?.id === u.id;
                    return (
                      <tr key={u.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                            {u.name || <span className="text-gray-400 italic font-normal">Tanpa nama</span>}
                            {isMe && <span className="text-[10px] font-bold uppercase text-gray-400">(Anda)</span>}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 font-mono break-all">{u.email}</td>
                        <td className="px-4 py-3">
                          <select
                            value={u.role}
                            onChange={(e) => changeRole(u, e.target.value as ManagedUser['role'])}
                            className={`px-2 py-1 rounded-full text-xs font-bold border ${ROLE_COLORS[u.role]} focus:outline-none`}
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => setResetTarget(u)}
                              className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
                              aria-label={`Reset password ${u.email}`}
                              title="Reset password"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(u)}
                              disabled={isMe}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              aria-label={`Hapus user ${u.email}`}
                              title={isMe ? 'Tidak dapat menghapus akun sendiri' : 'Hapus user'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="block md:hidden divide-y divide-gray-100">
              {paginatedUsers.map((u) => {
                const isMe = me?.id === u.id;
                return (
                  <div key={u.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{u.name || 'Tanpa nama'}</p>
                        <p className="text-xs text-gray-500 font-mono truncate">{u.email}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${ROLE_COLORS[u.role]}`}>
                        {ROLE_LABELS[u.role]}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <select
                        value={u.role}
                        onChange={(e) => changeRole(u, e.target.value as ManagedUser['role'])}
                        className={`px-2 py-1 rounded-full text-xs font-bold border ${ROLE_COLORS[u.role]} focus:outline-none`}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                        ))}
                      </select>
                      <div className="ml-auto flex gap-1">
                        <button
                          onClick={() => setResetTarget(u)}
                          className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
                          title="Reset password"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(u)}
                          disabled={isMe}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title={isMe ? 'Tidak dapat menghapus akun sendiri' : 'Hapus user'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium">
                  Menampilkan {((page - 1) * 10) + 1} - {Math.min(page * 10, filteredUsers.length)} dari {filteredUsers.length} data
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page === 1}
                    className="p-1.5 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                  </button>
                  <span className="px-3 text-xs font-semibold text-gray-700">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                    disabled={page === totalPages}
                    className="p-1.5 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {showAddModal && (
        <AddUserModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => { setShowAddModal(false); setGlobalMsg('User baru berhasil dibuat'); load(); }}
          onError={(msg) => setGlobalErr(msg)}
        />
      )}

      {resetTarget && (
        <ResetPasswordModal
          target={resetTarget}
          onClose={() => setResetTarget(null)}
          onDone={() => { setResetTarget(null); setGlobalMsg(`Password ${resetTarget.email} direset`); }}
          onError={(msg) => setGlobalErr(msg)}
        />
      )}

      <ConfirmModal
        open={deleteTarget !== null}
        title="Hapus Pengguna Ini?"
        description={deleteTarget ? `Apakah Anda yakin ingin menghapus akun pengguna "${deleteTarget.email}"? Tindakan ini tidak dapat dibatalkan.` : ''}
        confirmText="Hapus Pengguna"
        loading={deletingUser}
        onConfirm={handleConfirmDeleteUser}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function AddUserModal({ onClose, onCreated, onError }: {
  onClose: () => void; onCreated: () => void;
  onError: (msg: string) => void;
}) {
  const { settings } = useSettings();
  const primaryClasses = getPrimaryClasses(settings.primaryColor);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'STAFF' | 'VIEWER'>('STAFF');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      onError('Password minimal 6 karakter');
      return;
    }
    setLoading(true);
    try {
      await createUser({ name: name || undefined, email, password, role });
      onCreated();
    } catch (err: any) {
      onError(err.message || 'Gagal membuat user');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xl max-w-md w-full overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-gray-700" />
            Tambah User Baru
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Nama</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-black"
              placeholder="Opsional" />
          </div>
          <div>
            <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Email *</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-black" />
          </div>
          <div>
            <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Password *</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
              className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-black"
              placeholder="Minimal 6 karakter" />
          </div>
          <div>
            <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value as any)}
              className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-black">
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
            <p className="text-[11px] text-gray-400 mt-1">Hak akses halaman diatur di menu Hak Akses.</p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-sm font-semibold rounded-lg text-gray-700">Batal</button>
            <button type="submit" disabled={loading}
              className={`px-5 py-2 disabled:opacity-50 text-sm font-semibold rounded-lg text-white ${primaryClasses.button}`}>
              {loading ? 'Membuat...' : 'Buat User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ResetPasswordModal({ target, onClose, onDone, onError }: {
  target: ManagedUser;
  onClose: () => void; onDone: () => void;
  onError: (msg: string) => void;
}) {
  const { settings } = useSettings();
  const primaryClasses = getPrimaryClasses(settings.primaryColor);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      onError('Password minimal 6 karakter');
      return;
    }
    setLoading(true);
    try {
      await adminResetPassword(target.id, password);
      onDone();
    } catch (err: any) {
      onError(err.message || 'Gagal reset password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xl max-w-md w-full overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-gray-700" />
            Reset Password
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            Password baru untuk <span className="font-mono font-semibold">{target.email}</span>.
          </p>
          <div>
            <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Password Baru</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
              className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-black"
              placeholder="Minimal 6 karakter" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-sm font-semibold rounded-lg text-gray-700">Batal</button>
            <button type="submit" disabled={loading}
              className={`px-5 py-2 disabled:opacity-50 text-sm font-semibold rounded-lg text-white ${primaryClasses.button}`}>
              {loading ? 'Menyimpan...' : 'Reset Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
