import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { createClient, fetchClientByDisplayId, updateClient } from '../lib/api';
import type { Client } from '../lib/types';
import { Link } from 'react-router-dom';
import { useSettings } from '../contexts/SettingsContext';
import { getPrimaryClasses } from '../lib/colors';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function ClientFormPage() {
  const { settings } = useSettings();
  const primaryClasses = getPrimaryClasses(settings.primaryColor);
  const { displayId } = useParams<{ displayId: string }>();
  const isEdit = Boolean(displayId);
  useDocumentTitle(isEdit ? 'Edit Pelanggan' : 'Tambah Pelanggan');
  const navigate = useNavigate();
  const [storedClient, setStoredClient] = useState<Client | null>(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    whatsapp: '',
    website: '',
    address: '',
    status: 'KERJAKAN' as string,
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!displayId) return;
    (async () => {
      try {
        const client = await fetchClientByDisplayId(displayId);
        setStoredClient(client);
        setForm({
          name: client.name,
          email: client.email || '',
          whatsapp: client.whatsapp || '',
          website: client.website || '',
          address: client.address || '',
          status: client.status,
        });
      } catch {
        navigate('/clients');
      } finally {
        setFetching(false);
      }
    })();
  }, [displayId]);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Nama usaha wajib diisi');
      return;
    }
    setError('');
    setLoading(true);
    try {
      if (isEdit && displayId && storedClient) {
        await updateClient(storedClient.id, form as any);
      } else {
        await createClient(form as any);
      }
      navigate('/clients');
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan');
    } finally {
      setLoading(false);
    }
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-16">
        <svg className="animate-spin w-6 h-6 text-gray-800" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <Link
        to={isEdit ? `/clients/${displayId}` : '/clients'}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Kembali
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 md:p-6">
        <h1 className="text-lg font-bold text-gray-900 mb-1">
          {isEdit ? 'Edit Client' : 'Tambah Client Baru'}
        </h1>
        <p className="text-sm text-gray-500 mb-5">
          {isEdit ? 'Ubah data client' : 'Isi data client dari Google Maps'}
        </p>

        {error && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-800 text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nama Usaha */}
          <div>
            <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">
              Nama Usaha <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black text-gray-800"
              placeholder="contoh: Klinik Gigi Sehat"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
	              className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black text-gray-800"
	              placeholder="klinik@email.com"
            />
          </div>

          {/* WhatsApp */}
          <div>
            <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">WhatsApp</label>
            <input
              type="text"
              value={form.whatsapp}
              onChange={(e) => update('whatsapp', e.target.value)}
	              className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black text-gray-800"
	              placeholder="08123456789"
            />
          </div>

          {/* Website */}
          <div>
            <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Website</label>
            <input
              type="text"
              value={form.website}
              onChange={(e) => update('website', e.target.value)}
	              className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black text-gray-800"
	              placeholder="klinikgigi.com"
            />
          </div>

          {/* Alamat */}
          <div>
            <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Alamat</label>
            <textarea
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
              rows={2}
              className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black text-gray-800"
              placeholder="Jl. Sehat No. 123, Jakarta"
            />
          </div>



          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <Link
              to={isEdit ? `/clients/${displayId}` : '/clients'}
              className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-sm font-semibold rounded-lg text-gray-700 transition-colors"
            >
              Batal
            </Link>
            <button
              type="submit"
              disabled={loading}
              className={`px-5 py-2 disabled:opacity-50 text-sm font-semibold rounded-lg text-white ${primaryClasses.button}`}
            >
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
