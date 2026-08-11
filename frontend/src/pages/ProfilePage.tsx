import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiUpdateProfile, apiChangePassword } from '../lib/api';
import { useSettings } from '../contexts/SettingsContext';
import { getPrimaryClasses } from '../lib/colors';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { User, Mail, Lock, Eye, EyeOff, CheckCircle2, UserCog, KeyRound } from 'lucide-react';


export default function ProfilePage() {
  useDocumentTitle('Profil');
  const { user, updateUser } = useAuth();
  const { settings } = useSettings();
  const primaryClasses = getPrimaryClasses(settings.primaryColor);

  // Profile form state
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileErr, setProfileErr] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [passLoading, setPassLoading] = useState(false);
  const [passMsg, setPassMsg] = useState<string | null>(null);
  const [passErr, setPassErr] = useState<string | null>(null);
  const [editingPassword, setEditingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  function cancelProfileEdit() {
    setName(user?.name || '');
    setEmail(user?.email || '');
    setProfileErr(null);
    setProfileMsg(null);
    setEditingProfile(false);
  }

  function cancelPasswordEdit() {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPassErr(null);
    setPassMsg(null);
    setEditingPassword(false);
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg(null);
    setProfileErr(null);

    if (!email.trim()) {
      setProfileErr('Email tidak boleh kosong');
      return;
    }

    setProfileLoading(true);
    try {
      const res = await apiUpdateProfile({ name: name.trim(), email: email.trim() });
      // res.user.role comes as string from API; coerce to UserRole from existing auth.
      const updated = { ...res.user, role: (user?.role ?? 'STAFF') };
      updateUser(updated as any, res.token);
      setProfileMsg(res.message || 'Profil berhasil diperbarui');
      setEditingProfile(false);
    } catch (err: any) {
      setProfileErr(err.message || 'Gagal memperbarui profil');
    } finally {
      setProfileLoading(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPassMsg(null);
    setPassErr(null);

    if (newPassword.length < 6) {
      setPassErr('Password baru minimal 6 karakter');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassErr('Konfirmasi password baru tidak cocok');
      return;
    }

    setPassLoading(true);
    try {
      const res = await apiChangePassword(currentPassword, newPassword);
      setPassMsg(res.message || 'Password berhasil diubah');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setEditingPassword(false);
    } catch (err: any) {
      setPassErr(err.message || 'Gagal mengubah password');
    } finally {
      setPassLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Profil Saya</h1>
        <p className="text-xs text-gray-500 mt-1">Kelola data diri, email, dan kata sandi akun Anda.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Informasi Profil */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 md:p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Informasi Akun</h2>
              <p className="text-xs text-gray-500">Perbarui nama dan alamat email</p>
            </div>
          </div>

          {profileMsg && !editingProfile && (
            <div className="p-3 mb-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-xs font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              {profileMsg}
            </div>
          )}

          {!editingProfile ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Nama Lengkap</p>
                <p className="text-sm font-semibold text-gray-900">{user?.name || <span className="text-gray-400 italic font-normal">Belum diatur</span>}</p>
              </div>
              <div>
                <p className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Alamat Email</p>
                <p className="text-sm font-semibold text-gray-900 break-all">{user?.email || '-'}</p>
              </div>
              <button
                onClick={() => setEditingProfile(true)}
                className={`w-full px-4 py-2.5 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 ${primaryClasses.button}`}
              >
                <UserCog className="w-4 h-4" />
                Edit Profil
              </button>
            </div>
          ) : (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              {profileMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-xs font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  {profileMsg}
                </div>
              )}
              {profileErr && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-800 text-xs font-medium">
                  {profileErr}
                </div>
              )}

              <div>
                <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-black"
                    placeholder="Nama Lengkap"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">
                  Alamat Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-black"
                    placeholder="email@example.com"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="submit"
                  disabled={profileLoading || !email.trim()}
                  className={`flex-1 px-4 py-2 text-white text-sm font-semibold rounded-lg disabled:opacity-50 ${primaryClasses.button}`}
                >
                  {profileLoading ? 'Menyimpan...' : 'Simpan Profil'}
                </button>
                <button
                  type="button"
                  onClick={cancelProfileEdit}
                  disabled={profileLoading}
                  className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-sm font-semibold rounded-lg text-gray-700 transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Card 2: Ubah Kata Sandi */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 md:p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Ubah Kata Sandi</h2>
              <p className="text-xs text-gray-500">Perbarui kata sandi untuk keamanan akun</p>
            </div>
          </div>

          {passMsg && !editingPassword && (
            <div className="p-3 mb-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-xs font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              {passMsg}
            </div>
          )}

          {!editingPassword ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Status Kata Sandi</p>
                <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                  Tersimpan (terakhir diperbarui tidak diketahui)
                </p>
              </div>
              <button
                onClick={() => setEditingPassword(true)}
                className={`w-full px-4 py-2.5 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 ${primaryClasses.button}`}
              >
                <KeyRound className="w-4 h-4" />
                Ubah Kata Sandi
              </button>
            </div>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-4">
              {passMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-xs font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  {passMsg}
                </div>
              )}
              {passErr && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-800 text-xs font-medium">
                  {passErr}
                </div>
              )}

              <div>
                <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Password Saat Ini</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-black"
                    placeholder="Masukkan password lama"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showCurrentPass ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Password Baru</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-black"
                    placeholder="Minimal 6 karakter"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showNewPass ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Konfirmasi Password Baru</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-black"
                    placeholder="Ulangi password baru"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showConfirmPass ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="submit"
                  disabled={passLoading || !currentPassword || !newPassword || !confirmPassword}
                  className="flex-1 px-4 py-2 bg-black text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {passLoading ? 'Menyimpan...' : 'Perbarui Password'}
                </button>
                <button
                  type="button"
                  onClick={cancelPasswordEdit}
                  disabled={passLoading}
                  className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-sm font-semibold rounded-lg text-gray-700 transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
