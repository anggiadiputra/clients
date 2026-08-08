import { useState } from 'react';
import { X } from 'lucide-react';
import { createClient } from '../lib/api';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function AddClientModal({ open, onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    whatsapp: '',
    website: '',
    address: '',
    status: 'CALON_CLIENT',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      await createClient(form as any);
      onCreated();
      setForm({ name: '', email: '', whatsapp: '', website: '', address: '', status: 'CALON_CLIENT' });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan');
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xl max-w-md w-full overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Tambah Client Baru</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-800 text-sm">{error}</div>
          )}

          <div>
            <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Nama Usaha *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black text-gray-800"
              placeholder="contoh: Klinik Gigi Sehat"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
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
          </div>

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

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-sm font-semibold rounded-lg text-gray-700 transition-colors">
              Batal
            </button>
            <button type="submit" disabled={loading} className="px-5 py-2 bg-black hover:bg-gray-800 disabled:opacity-50 text-sm font-semibold rounded-lg text-white transition-colors">
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
