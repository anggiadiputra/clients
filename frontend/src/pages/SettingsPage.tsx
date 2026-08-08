import { useState } from 'react';
import {
  ArrowLeft,
  Upload,
  X,
  CheckCircle2,
  GripVertical,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Settings2,
  Palette,
  Send,
  Landmark,
  FileText,
  ShieldCheck,
  MessageCircle,
  Mail,
  Database,
  Image as ImageIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { useSettings } from '../contexts/SettingsContext';
import { apiTestKirisan } from '../lib/api';
import type { BankAccount } from '../lib/types';

const PRIMARY_COLORS = [
  { label: 'Hitam', value: 'black' },
  { label: 'Biru', value: 'blue' },
  { label: 'Hijau', value: 'emerald' },
  { label: 'Ungu', value: 'purple' },
  { label: 'Merah', value: 'red' },
  { label: 'Orange', value: 'orange' },
];

const PRIMARY_COLOR_LABELS: Record<string, string> = Object.fromEntries(
  PRIMARY_COLORS.map((c) => [c.value, c.label]),
);

const PRIMARY_COLOR_CLASSES: Record<string, string> = {
  black: 'bg-black',
  blue: 'bg-blue-500',
  emerald: 'bg-emerald-500',
  purple: 'bg-purple-500',
  red: 'bg-red-500',
  orange: 'bg-orange-500',
};

function MaskedValue({ value, revealed, onToggle }: { value: string; revealed?: boolean; onToggle?: () => void }) {
  if (!value) return <span className="text-gray-400 italic font-normal">Belum diatur</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <span className="font-mono text-sm">{revealed && onToggle ? value : '••••••••••'}</span>
      {onToggle && (
        <button type="button" onClick={onToggle} className="text-gray-400 hover:text-gray-600" aria-label="Toggle visibility">
          {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      )}
    </span>
  );
}

function CardHeader({
  icon,
  iconBg,
  iconColor,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
      <div className={`w-8 h-8 rounded-lg ${iconBg} ${iconColor} flex items-center justify-center`}>{icon}</div>
      <div>
        <h2 className="text-sm font-bold text-gray-900">{title}</h2>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
    </div>
  );
}

function EditButtons({ onSave, onCancel, saving, saveLabel = 'Simpan' }: { onSave: () => void; onCancel: () => void; saving?: boolean; saveLabel?: string }) {
  return (
    <div className="flex flex-col sm:flex-row gap-2 pt-3">
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="px-5 py-2 bg-black text-white text-sm font-semibold rounded-lg hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {saving ? 'Menyimpan…' : saveLabel}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="px-5 py-2 border border-gray-200 hover:bg-gray-50 text-sm font-semibold rounded-lg text-gray-700 transition-colors disabled:opacity-50"
      >
        Batal
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const { settings, updateSettings, resetSettings, saving, error, lastSavedAt, clearError, loaded } = useSettings();
  const [logoInput, setLogoInput] = useState(settings.logo);
  const [projectName, setProjectName] = useState(settings.projectName);
  const [primaryColor, setPrimaryColor] = useState(settings.primaryColor);
  const [pageBackground, setPageBackground] = useState(settings.pageBackground);
  const [senderName, setSenderName] = useState(settings.senderName);
  const [senderAddress, setSenderAddress] = useState(settings.senderAddress);
  const [senderPhone, setSenderPhone] = useState(settings.senderPhone);
  const [senderEmail, setSenderEmail] = useState(settings.senderEmail);
  const [termsAndConditions, setTermsAndConditions] = useState(settings.termsAndConditions);

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => {
    try {
      return JSON.parse(settings.bankAccounts || '[]');
    } catch {
      return [];
    }
  });
  const [newBank, setNewBank] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [newHolder, setNewHolder] = useState('');

  const [turnstileSiteKey, setTurnstileSiteKey] = useState(settings.turnstileSiteKey);
  const [turnstileSecretKey, setTurnstileSecretKey] = useState(settings.turnstileSecretKey);
  const [showTurnstileSecret, setShowTurnstileSecret] = useState(false);

  const [fonnteToken, setFonnteToken] = useState(settings.fonnteToken);
  const [showFonnteToken, setShowFonnteToken] = useState(false);
  const [fonnteTestPhone, setFonnteTestPhone] = useState('');
  const [fonnteTesting, setFonnteTesting] = useState(false);
  const [fonnteTestResult, setFonnteTestResult] = useState<string | null>(null);

  const [kirisanToken, setKirisanToken] = useState(settings.kirisanToken);
  const [showKirisanToken, setShowKirisanToken] = useState(false);
  const [kirisanChannelKey, setKirisanChannelKey] = useState(settings.kirisanChannelKey);
  const [showKirisanChannelKey, setShowKirisanChannelKey] = useState(false);
  const [kirisanLoginOtpTemplateId, setKirisanLoginOtpTemplateId] = useState(settings.kirisanLoginOtpTemplateId);
  const [kirisanRegisterOtpTemplateId, setKirisanRegisterOtpTemplateId] = useState(settings.kirisanRegisterOtpTemplateId);
  const [kirisanResetPasswordTemplateId, setKirisanResetPasswordTemplateId] = useState(settings.kirisanResetPasswordTemplateId);
  const [kirisanTestEmail, setKirisanTestEmail] = useState('');
  const [kirisanTesting, setKirisanTesting] = useState(false);
  const [kirisanTestResult, setKirisanTestResult] = useState<string | null>(null);

  const [s3Endpoint, setS3Endpoint] = useState(settings.s3Endpoint);
  const [s3Region, setS3Region] = useState(settings.s3Region);
  const [s3Bucket, setS3Bucket] = useState(settings.s3Bucket);
  const [s3AccessKeyId, setS3AccessKeyId] = useState(settings.s3AccessKeyId);
  const [s3SecretAccessKey, setS3SecretAccessKey] = useState(settings.s3SecretAccessKey);
  const [showS3Secret, setShowS3Secret] = useState(false);
  const [s3PublicUrlBase, setS3PublicUrlBase] = useState(settings.s3PublicUrlBase);

  const [editingTampilan, setEditingTampilan] = useState(false);
  const [editingPengirim, setEditingPengirim] = useState(false);
  const [editingRekening, setEditingRekening] = useState(false);
  const [editingSk, setEditingSk] = useState(false);
  const [editingTurnstile, setEditingTurnstile] = useState(false);
  const [editingFonnte, setEditingFonnte] = useState(false);
  const [editingKirisan, setEditingKirisan] = useState(false);
  const [editingS3, setEditingS3] = useState(false);

  function cancelTampilan() {
    setProjectName(settings.projectName);
    setLogoInput(settings.logo);
    setPrimaryColor(settings.primaryColor);
    setPageBackground(settings.pageBackground);
    setEditingTampilan(false);
  }
  function cancelPengirim() {
    setSenderName(settings.senderName);
    setSenderAddress(settings.senderAddress);
    setSenderPhone(settings.senderPhone);
    setSenderEmail(settings.senderEmail);
    setEditingPengirim(false);
  }
  function cancelRekening() {
    try {
      setBankAccounts(JSON.parse(settings.bankAccounts || '[]'));
    } catch {
      setBankAccounts([]);
    }
    setNewBank('');
    setNewNumber('');
    setNewHolder('');
    setEditingRekening(false);
  }
  function cancelSk() {
    setTermsAndConditions(settings.termsAndConditions);
    setEditingSk(false);
  }
  function cancelTurnstile() {
    setTurnstileSiteKey(settings.turnstileSiteKey);
    setTurnstileSecretKey(settings.turnstileSecretKey);
    setShowTurnstileSecret(false);
    setEditingTurnstile(false);
  }
  function cancelFonnte() {
    setFonnteToken(settings.fonnteToken);
    setShowFonnteToken(false);
    setEditingFonnte(false);
  }
  function cancelKirisan() {
    setKirisanToken(settings.kirisanToken);
    setShowKirisanToken(false);
    setKirisanChannelKey(settings.kirisanChannelKey);
    setShowKirisanChannelKey(false);
    setKirisanLoginOtpTemplateId(settings.kirisanLoginOtpTemplateId);
    setKirisanRegisterOtpTemplateId(settings.kirisanRegisterOtpTemplateId);
    setKirisanResetPasswordTemplateId(settings.kirisanResetPasswordTemplateId);
    setEditingKirisan(false);
  }
  function cancelS3() {
    setS3Endpoint(settings.s3Endpoint);
    setS3Region(settings.s3Region);
    setS3Bucket(settings.s3Bucket);
    setS3AccessKeyId(settings.s3AccessKeyId);
    setS3SecretAccessKey(settings.s3SecretAccessKey);
    setShowS3Secret(false);
    setS3PublicUrlBase(settings.s3PublicUrlBase);
    setEditingS3(false);
  }

  function handleDragEndBank(result: DropResult) {
    if (!result.destination) return;
    const items = Array.from(bankAccounts);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setBankAccounts(items);
  }

  function handleAddBank() {
    if (!newBank.trim() || !newNumber.trim()) return;
    const newAccount: BankAccount = {
      id: `bank-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      bankName: newBank.trim(),
      accountNumber: newNumber.trim(),
      accountHolder: newHolder.trim(),
    };
    setBankAccounts((prev) => [...prev, newAccount]);
    setNewBank('');
    setNewNumber('');
    setNewHolder('');
  }

  function handleDeleteBank(id: string) {
    setBankAccounts((prev) => prev.filter((a) => a.id !== id));
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setLogoInput(base64);
    };
    reader.readAsDataURL(file);
  }

  async function handleTestKirisan() {
    if (!kirisanTestEmail) return;
    setKirisanTesting(true);
    setKirisanTestResult(null);
    try {
      const res = await apiTestKirisan({
        recipient_email: kirisanTestEmail,
        kirisan_token: kirisanToken,
        kirisan_channel_key: kirisanChannelKey,
        kirisan_template_id: kirisanLoginOtpTemplateId,
      });
      setKirisanTestResult(`✅ ${res.message}`);
    } catch (err: any) {
      setKirisanTestResult(`❌ ${err.message || 'Gagal koneksi ke Kirisan API'}`);
    } finally {
      setKirisanTesting(false);
    }
  }

  async function handleTestFonnte() {
    if (!fonnteToken || !fonnteTestPhone) return;
    setFonnteTesting(true);
    setFonnteTestResult(null);
    try {
      const data = new FormData();
      data.append('target', fonnteTestPhone);
      data.append('message', 'Test dari Client CRM — konfigurasi Fonnte berhasil! ✅');
      data.append('countryCode', '62');

      const res = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: { Authorization: fonnteToken },
        body: data,
      });
      const json = await res.json();
      setFonnteTestResult(json.status ? '✅ Berhasil terkirim!' : `❌ Gagal: ${json.reason || 'Unknown'}`);
    } catch (err: any) {
      setFonnteTestResult(`❌ Error: ${err.message}`);
    } finally {
      setFonnteTesting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Kembali
      </Link>

      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="font-semibold">Gagal menyimpan pengaturan</div>
            <div>{error}</div>
          </div>
          <button onClick={clearError} className="text-red-500 hover:text-red-700" aria-label="Tutup">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {loaded && !error && (
        <div className="mb-4 flex items-center gap-2 text-xs text-gray-500">
          {saving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Menyimpan ke server…</span>
            </>
          ) : lastSavedAt ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Tersimpan di server</span>
            </>
          ) : null}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ===================== Umum Column ===================== */}

        {/* 1. Tampilan */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 md:p-6">
          <CardHeader
            icon={<Palette className="w-4 h-4" />}
            iconBg="bg-purple-50"
            iconColor="text-purple-600"
            title="Tampilan"
            subtitle="Logo, warna utama, dan background halaman"
          />
          {!editingTampilan ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <p className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Logo</p>
                  {settings.logo ? (
                    <img src={settings.logo} alt="Logo" className="max-h-14 w-auto rounded-xl object-contain border border-gray-200" />
                  ) : (
                    <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center border border-gray-200">
                      <ImageIcon className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="col-span-2">
                  <p className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Nama Proyek</p>
                  <p className="text-sm font-semibold text-gray-900">{settings.projectName || <span className="text-gray-400 italic font-normal">Belum diatur</span>}</p>
                </div>
                <div>
                  <p className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Warna Utama</p>
                  <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <span className={`inline-block w-3 h-3 rounded-full ${PRIMARY_COLOR_CLASSES[settings.primaryColor] || 'bg-gray-400'}`} />
                    {PRIMARY_COLOR_LABELS[settings.primaryColor] || settings.primaryColor || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Background</p>
                  <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-full border border-gray-200" style={{ background: settings.pageBackground || '#f3f4f6' }} />
                    {settings.pageBackground || <span className="text-gray-400 italic font-normal">Belum diatur</span>}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingTampilan(true)}
                className="w-full px-4 py-2.5 bg-black text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
              >
                <Settings2 className="w-4 h-4" /> Ubah Tampilan
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Nama Proyek</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black text-gray-800"
                />
              </div>
              <div>
                <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Logo</label>
                <div className="flex items-center gap-3 mb-2">
                  {logoInput ? (
                    <div className="relative">
                      <img src={logoInput} alt="Logo" className="max-h-12 w-auto rounded-xl object-contain border border-gray-200" />
                      <button onClick={() => setLogoInput('')} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow" aria-label="Hapus logo">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center border border-gray-200">
                      <Upload className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                  <label className="px-3 py-1.5 border border-gray-200 hover:bg-gray-50 text-xs font-semibold rounded-lg text-gray-700 cursor-pointer transition-colors">
                    Upload
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>
                <p className="text-xs text-gray-400">Atau paste URL logo:</p>
                <input
                  type="text"
                  value={logoInput.startsWith('data:') ? '' : logoInput}
                  onChange={(e) => setLogoInput(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-black text-gray-800 mt-1"
                  placeholder="https://example.com/logo.png"
                />
              </div>
              <div>
                <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Warna Utama</label>
                <div className="flex flex-wrap gap-2">
                  {PRIMARY_COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setPrimaryColor(c.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        primaryColor === c.value
                          ? 'bg-black text-white border-black'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Background Halaman</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={pageBackground}
                    onChange={(e) => setPageBackground(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={pageBackground}
                    onChange={(e) => setPageBackground(e.target.value)}
                    className="flex-1 px-3.5 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-black text-gray-800"
                  />
                </div>
              </div>
              <EditButtons
                saving={saving}
                onSave={() => {
                  updateSettings({ projectName, logo: logoInput, primaryColor, pageBackground });
                  setEditingTampilan(false);
                }}
                onCancel={cancelTampilan}
              />
            </div>
          )}
        </div>

        {/* 2. Info Pengirim */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 md:p-6">
          <CardHeader
            icon={<Send className="w-4 h-4" />}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            title="Info Pengirim"
            subtitle="Data pengirim yang tampil di invoice"
          />
          {!editingPengirim ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Nama</p>
                <p className="text-sm font-semibold text-gray-900">{settings.senderName || <span className="text-gray-400 italic font-normal">Belum diatur</span>}</p>
              </div>
              <div>
                <p className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Alamat</p>
                <p className="text-sm text-gray-800 whitespace-pre-line">{settings.senderAddress || <span className="text-gray-400 italic font-normal">Belum diatur</span>}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Telepon</p>
                  <p className="text-sm font-semibold text-gray-900">{settings.senderPhone || '-'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Email</p>
                  <p className="text-sm font-semibold text-gray-900 break-all">{settings.senderEmail || '-'}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingPengirim(true)}
                className="w-full px-4 py-2.5 bg-black text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
              >
                <Settings2 className="w-4 h-4" /> Ubah Info Pengirim
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Nama</label>
                <input type="text" value={senderName} onChange={(e) => setSenderName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black text-gray-800"
                  placeholder="PT. Nama Perusahaan" />
              </div>
              <div>
                <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Alamat</label>
                <textarea value={senderAddress} onChange={(e) => setSenderAddress(e.target.value)} rows={2}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black text-gray-800"
                  placeholder="Jl. Contoh No. 123, Kota" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Telepon</label>
                  <input type="text" value={senderPhone} onChange={(e) => setSenderPhone(e.target.value)}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black text-gray-800"
                    placeholder="08123456789" />
                </div>
                <div>
                  <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Email</label>
                  <input type="email" value={senderEmail} onChange={(e) => setSenderEmail(e.target.value)}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black text-gray-800"
                    placeholder="info@perusahaan.com" />
                </div>
              </div>
              <EditButtons
                saving={saving}
                onSave={() => {
                  updateSettings({ senderName, senderAddress, senderPhone, senderEmail });
                  setEditingPengirim(false);
                }}
                onCancel={cancelPengirim}
              />
            </div>
          )}
        </div>

        {/* 3. Rekening Pembayaran */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 md:p-6">
          <CardHeader
            icon={<Landmark className="w-4 h-4" />}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            title="Rekening Pembayaran"
            subtitle="Daftar rekening yang tampil di invoice (drag untuk ubah urutan)"
          />
          {!editingRekening ? (
            <div className="space-y-3">
              {bankAccounts.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Belum ada rekening</p>
              ) : (
                <div className="space-y-2">
                  {bankAccounts.map((acc) => (
                    <div key={acc.id} className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-gray-400 block font-bold uppercase">Bank</span>
                        <span className="font-semibold text-gray-900 truncate block">{acc.bankName}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block font-bold uppercase">No. Rekening</span>
                        <span className="font-mono font-semibold text-gray-800 truncate block">{acc.accountNumber}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block font-bold uppercase">Atas Nama</span>
                        <span className="text-gray-700 truncate block">{acc.accountHolder || '-'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => setEditingRekening(true)}
                className="w-full px-4 py-2.5 bg-black text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
              >
                <Settings2 className="w-4 h-4" /> Ubah Rekening
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <DragDropContext onDragEnd={handleDragEndBank}>
                <Droppable droppableId="bank-accounts">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2 mb-3">
                      {bankAccounts.map((acc, index) => (
                        <Draggable key={acc.id} draggableId={acc.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`flex items-center gap-2 p-2.5 bg-gray-50 border border-gray-200 rounded-lg group ${snapshot.isDragging ? 'shadow-md bg-white border-black' : ''}`}
                            >
                              <div {...provided.dragHandleProps} className="cursor-grab text-gray-400 hover:text-black p-1">
                                <GripVertical className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-2 text-xs">
                                <div>
                                  <span className="text-[10px] text-gray-400 block font-bold uppercase">Bank</span>
                                  <span className="font-semibold text-gray-900 truncate block">{acc.bankName}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-gray-400 block font-bold uppercase">No. Rekening</span>
                                  <span className="font-mono font-semibold text-gray-800 truncate block">{acc.accountNumber}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-gray-400 block font-bold uppercase">Atas Nama</span>
                                  <span className="text-gray-700 truncate block">{acc.accountHolder || '-'}</span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteBank(acc.id)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors shrink-0"
                                title="Hapus Rekening"
                                aria-label={`Hapus rekening ${acc.bankName}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>

              <div className="bg-gray-50/80 p-3 rounded-lg border border-gray-200 space-y-2">
                <p className="text-xs font-semibold text-gray-700">Tambah Rekening Baru</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={newBank}
                    onChange={(e) => setNewBank(e.target.value)}
                    placeholder="Bank (misal: BCA)"
                    className="px-3 py-1.5 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-black text-gray-800"
                  />
                  <input
                    type="text"
                    value={newNumber}
                    onChange={(e) => setNewNumber(e.target.value)}
                    placeholder="Nomor Rekening"
                    className="px-3 py-1.5 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-black text-gray-800 font-mono"
                  />
                  <input
                    type="text"
                    value={newHolder}
                    onChange={(e) => setNewHolder(e.target.value)}
                    placeholder="Atas Nama"
                    className="px-3 py-1.5 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-black text-gray-800"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddBank}
                  disabled={!newBank.trim() || !newNumber.trim()}
                  className="px-3 py-1.5 bg-black hover:bg-gray-800 text-white text-xs font-semibold rounded-md transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Rekening
                </button>
              </div>
              <EditButtons
                saving={saving}
                onSave={() => {
                  updateSettings({ bankAccounts: JSON.stringify(bankAccounts) });
                  setEditingRekening(false);
                }}
                onCancel={cancelRekening}
              />
            </div>
          )}
        </div>

        {/* 4. Syarat & Ketentuan */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 md:p-6">
          <CardHeader
            icon={<FileText className="w-4 h-4" />}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
            title="Syarat & Ketentuan"
            subtitle="Teks default S&K yang tampil di invoice"
          />
          {!editingSk ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-800 whitespace-pre-line">
                  {settings.termsAndConditions || <span className="text-gray-400 italic">Belum diatur</span>}
                </p>
              </div>
              <button
                onClick={() => setEditingSk(true)}
                className="w-full px-4 py-2.5 bg-black text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
              >
                <Settings2 className="w-4 h-4" /> Ubah S&K
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                value={termsAndConditions}
                onChange={(e) => setTermsAndConditions(e.target.value)}
                rows={5}
                className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black text-gray-800"
                placeholder="1. Pembayaran ditransfer ke rekening di atas..."
              />
              <EditButtons
                saving={saving}
                onSave={() => {
                  updateSettings({ termsAndConditions });
                  setEditingSk(false);
                }}
                onCancel={cancelSk}
              />
            </div>
          )}
        </div>

        {/* ===================== Integrasi Column ===================== */}

        {/* 5. Cloudflare Turnstile */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 md:p-6">
          <CardHeader
            icon={<ShieldCheck className="w-4 h-4" />}
            iconBg="bg-orange-50"
            iconColor="text-orange-600"
            title="Cloudflare Turnstile"
            subtitle="Captcha di halaman login & register"
          />
          {!editingTurnstile ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Site Key</p>
                <p className="text-sm font-mono text-gray-900 break-all">{settings.turnstileSiteKey || <span className="text-gray-400 italic font-normal font-sans">Belum diatur</span>}</p>
              </div>
              <div>
                <p className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Secret Key</p>
                <MaskedValue value={settings.turnstileSecretKey} revealed={showTurnstileSecret} onToggle={() => setShowTurnstileSecret((v) => !v)} />
              </div>
              <button
                onClick={() => setEditingTurnstile(true)}
                className="w-full px-4 py-2.5 bg-black text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
              >
                <Settings2 className="w-4 h-4" /> Ubah Turnstile
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Site Key</label>
                <input
                  type="text"
                  value={turnstileSiteKey}
                  onChange={(e) => setTurnstileSiteKey(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black text-gray-800"
                  placeholder="0x4AAAAAA..."
                />
              </div>
              <div>
                <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Secret Key</label>
                <div className="relative">
                  <input
                    type={showTurnstileSecret ? 'text' : 'password'}
                    value={turnstileSecretKey}
                    onChange={(e) => setTurnstileSecretKey(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black text-gray-800"
                    placeholder="0x4AAAAAA..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowTurnstileSecret(!showTurnstileSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showTurnstileSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <EditButtons
                saving={saving}
                onSave={() => {
                  updateSettings({ turnstileSiteKey, turnstileSecretKey });
                  setEditingTurnstile(false);
                }}
                onCancel={cancelTurnstile}
              />
            </div>
          )}
        </div>

        {/* 6. Fonnte WhatsApp */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 md:p-6">
          <CardHeader
            icon={<MessageCircle className="w-4 h-4" />}
            iconBg="bg-green-50"
            iconColor="text-green-600"
            title="Fonnte (WhatsApp)"
            subtitle="Gateway WhatsApp untuk notifikasi"
          />
          {!editingFonnte ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">API Token</p>
                <MaskedValue value={settings.fonnteToken} revealed={showFonnteToken} onToggle={() => setShowFonnteToken((v) => !v)} />
              </div>
              <div className="pt-3 border-t border-gray-100 space-y-3">
                <p className="text-xs text-gray-500">Kirim pesan test ke nomor WhatsApp</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={fonnteTestPhone}
                    onChange={(e) => setFonnteTestPhone(e.target.value.replace(/\D/g, ''))}
                    className="flex-1 px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black text-gray-800"
                    placeholder="082227097005"
                  />
                  <button
                    onClick={handleTestFonnte}
                    disabled={fonnteTesting || !settings.fonnteToken || !fonnteTestPhone}
                    className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-sm font-semibold rounded-lg text-gray-700 transition-colors disabled:opacity-50"
                  >
                    {fonnteTesting ? 'Mengirim...' : 'Test'}
                  </button>
                </div>
                {fonnteTestResult && (
                  <p className={`text-xs font-medium ${fonnteTestResult.startsWith('✅') ? 'text-emerald-600' : 'text-red-600'}`}>
                    {fonnteTestResult}
                  </p>
                )}
              </div>
              <button
                onClick={() => setEditingFonnte(true)}
                className="w-full px-4 py-2.5 bg-black text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
              >
                <Settings2 className="w-4 h-4" /> Ubah Token
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">API Token</label>
                <div className="relative">
                  <input
                    type={showFonnteToken ? 'text' : 'password'}
                    value={fonnteToken}
                    onChange={(e) => setFonnteToken(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black text-gray-800"
                    placeholder="Token dari dashboard Fonnte"
                  />
                  <button
                    type="button"
                    onClick={() => setShowFonnteToken(!showFonnteToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showFonnteToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <EditButtons
                saving={saving}
                onSave={() => {
                  updateSettings({ fonnteToken });
                  setEditingFonnte(false);
                }}
                onCancel={cancelFonnte}
              />
            </div>
          )}
        </div>

        {/* 7. Kirisan Email & OTP */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 md:p-6">
          <CardHeader
            icon={<Mail className="w-4 h-4" />}
            iconBg="bg-pink-50"
            iconColor="text-pink-600"
            title="Kirisan Email & OTP"
            subtitle="Gateway email untuk OTP login & reset password"
          />
          {!editingKirisan ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Account Token</p>
                <MaskedValue value={settings.kirisanToken} revealed={showKirisanToken} onToggle={() => setShowKirisanToken((v) => !v)} />
              </div>
              <div>
                <p className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Channel Key (Email)</p>
                <MaskedValue value={settings.kirisanChannelKey} revealed={showKirisanChannelKey} onToggle={() => setShowKirisanChannelKey((v) => !v)} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <p className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Login OTP</p>
                  <p className="text-sm font-mono text-gray-900">{settings.kirisanLoginOtpTemplateId || '-'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Reset Password</p>
                  <p className="text-sm font-mono text-gray-900">{settings.kirisanResetPasswordTemplateId || '-'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Register OTP</p>
                  <p className="text-sm font-mono text-gray-900">{settings.kirisanRegisterOtpTemplateId || '-'}</p>
                </div>
              </div>
              <div className="pt-3 border-t border-gray-100 space-y-3">
                <p className="text-xs text-gray-500">Uji coba pengiriman email OTP via Kirisan API</p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={kirisanTestEmail}
                    onChange={(e) => setKirisanTestEmail(e.target.value)}
                    className="flex-1 px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black text-gray-800"
                    placeholder="email.tujuan@example.com"
                  />
                  <button
                    onClick={handleTestKirisan}
                    disabled={kirisanTesting || !kirisanTestEmail || !settings.kirisanToken || !settings.kirisanChannelKey}
                    className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-sm font-semibold rounded-lg text-gray-700 transition-colors disabled:opacity-50"
                  >
                    {kirisanTesting ? 'Mengirim...' : 'Uji Koneksi Kirisan'}
                  </button>
                </div>
                {kirisanTestResult && (
                  <p className={`text-xs font-medium ${kirisanTestResult.startsWith('✅') ? 'text-emerald-600' : 'text-red-600'}`}>
                    {kirisanTestResult}
                  </p>
                )}
              </div>
              <button
                onClick={() => setEditingKirisan(true)}
                className="w-full px-4 py-2.5 bg-black text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
              >
                <Settings2 className="w-4 h-4" /> Ubah Kirisan
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Account Token</label>
                <div className="relative">
                  <input
                    type={showKirisanToken ? 'text' : 'password'}
                    value={kirisanToken}
                    onChange={(e) => setKirisanToken(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black text-gray-800"
                    placeholder="Bearer token Kirisan API"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKirisanToken(!showKirisanToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showKirisanToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Channel Key (Email)</label>
                <div className="relative">
                  <input
                    type={showKirisanChannelKey ? 'text' : 'password'}
                    value={kirisanChannelKey}
                    onChange={(e) => setKirisanChannelKey(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black text-gray-800"
                    placeholder="Channel token Kirisan Email"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKirisanChannelKey(!showKirisanChannelKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showKirisanChannelKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Login OTP Template ID</label>
                <input type="text" value={kirisanLoginOtpTemplateId} onChange={(e) => setKirisanLoginOtpTemplateId(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black text-gray-800"
                  placeholder="Contoh: 123" />
              </div>
              <div>
                <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Reset Password OTP Template ID</label>
                <input type="text" value={kirisanResetPasswordTemplateId} onChange={(e) => setKirisanResetPasswordTemplateId(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black text-gray-800"
                  placeholder="Contoh: 124" />
              </div>
              <div>
                <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Register OTP Template ID</label>
                <input type="text" value={kirisanRegisterOtpTemplateId} onChange={(e) => setKirisanRegisterOtpTemplateId(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black text-gray-800"
                  placeholder="Contoh: 125" />
              </div>
              <EditButtons
                saving={saving}
                onSave={() => {
                  updateSettings({ kirisanToken, kirisanChannelKey, kirisanLoginOtpTemplateId, kirisanRegisterOtpTemplateId, kirisanResetPasswordTemplateId });
                  setEditingKirisan(false);
                }}
                onCancel={cancelKirisan}
              />
            </div>
          )}
        </div>

        {/* 8. Object Storage (S3) */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 md:p-6">
          <CardHeader
            icon={<Database className="w-4 h-4" />}
            iconBg="bg-cyan-50"
            iconColor="text-cyan-600"
            title="Object Storage (S3)"
            subtitle="Untuk upload lampiran di fitur Proyek"
          />
          {!editingS3 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <p className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Endpoint</p>
                  <p className="text-sm font-mono text-gray-900 break-all">{settings.s3Endpoint || <span className="text-gray-400 italic font-normal font-sans">Default AWS</span>}</p>
                </div>
                <div>
                  <p className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Region</p>
                  <p className="text-sm font-mono text-gray-900">{settings.s3Region || '-'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Bucket</p>
                  <p className="text-sm font-mono text-gray-900 break-all">{settings.s3Bucket || '-'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Access Key ID</p>
                  <MaskedValue value={settings.s3AccessKeyId} />
                </div>
                <div>
                  <p className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Secret Access Key</p>
                  <MaskedValue value={settings.s3SecretAccessKey} revealed={showS3Secret} onToggle={() => setShowS3Secret((v) => !v)} />
                </div>
                <div className="col-span-2">
                  <p className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Public URL Base</p>
                  <p className="text-sm font-mono text-gray-900 break-all">{settings.s3PublicUrlBase || <span className="text-gray-400 italic font-normal font-sans">-</span>}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingS3(true)}
                className="w-full px-4 py-2.5 bg-black text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
              >
                <Settings2 className="w-4 h-4" /> Ubah S3
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Endpoint</label>
                <input type="text" value={s3Endpoint} onChange={(e) => setS3Endpoint(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black text-gray-800"
                  placeholder="https://s3.amazonaws.com (kosongkan untuk AWS default)" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Region</label>
                  <input type="text" value={s3Region} onChange={(e) => setS3Region(e.target.value)}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black text-gray-800"
                    placeholder="ap-southeast-1" />
                </div>
                <div>
                  <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Bucket</label>
                  <input type="text" value={s3Bucket} onChange={(e) => setS3Bucket(e.target.value)}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black text-gray-800"
                    placeholder="nama-bucket" />
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Access Key ID</label>
                <input type="text" value={s3AccessKeyId} onChange={(e) => setS3AccessKeyId(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black text-gray-800"
                  placeholder="AKIA..." />
              </div>
              <div>
                <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Secret Access Key</label>
                <div className="relative">
                  <input type={showS3Secret ? 'text' : 'password'} value={s3SecretAccessKey} onChange={(e) => setS3SecretAccessKey(e.target.value)}
                    className="w-full px-3.5 py-2 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black text-gray-800"
                    placeholder="••••••" />
                  <button type="button" onClick={() => setShowS3Secret(!showS3Secret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showS3Secret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Public URL Base (opsional)</label>
                <input type="text" value={s3PublicUrlBase} onChange={(e) => setS3PublicUrlBase(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black text-gray-800"
                  placeholder="https://cdn.example.com (jika pakai CDN di depan bucket)" />
              </div>
              <EditButtons
                saving={saving}
                onSave={() => {
                  updateSettings({ s3Endpoint, s3Region, s3Bucket, s3AccessKeyId, s3SecretAccessKey, s3PublicUrlBase });
                  setEditingS3(false);
                }}
                onCancel={cancelS3}
              />
            </div>
          )}
        </div>
      </div>

      {/* Reset */}
      <div className="mt-5 flex justify-start">
        <button
          onClick={resetSettings}
          className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold rounded-lg transition-colors"
        >
          Reset Default
        </button>
      </div>
    </div>
  );
}
