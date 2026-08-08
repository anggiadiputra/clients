import { useState, useEffect } from 'react';
import { Plus, Settings2, Trash2, Tag } from 'lucide-react';
import { fetchServices, createService, updateService, deleteService } from '../lib/api';
import type { ServiceItem } from '../lib/types';

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editService, setEditService] = useState<ServiceItem | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    try { setServices(await fetchServices()); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function openAdd() {
    setEditService(null); setName(''); setDescription(''); setPrice(''); setShowModal(true);
  }

  function openEdit(s: ServiceItem) {
    setEditService(s); setName(s.name); setDescription(s.description || ''); setPrice(String(s.price)); setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !price) return;
    setSaving(true);
    try {
      if (editService) {
        await updateService(editService.id, { name, description: description || undefined, price: parseFloat(price) });
      } else {
        await createService({ name, description: description || undefined, price: parseFloat(price) });
      }
      setShowModal(false); await load();
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm('Hapus layanan ini?')) return;
    try { await deleteService(id); await load(); }
    catch (err: any) { alert(err.message); }
  }

  if (loading) return <div className="flex items-center justify-center py-16"><svg className="animate-spin w-6 h-6 text-gray-800" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Layanan</h1>
        </div>
        <button onClick={openAdd} className="p-2 sm:px-4 sm:py-2 bg-black text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2" aria-label="Tambah layanan">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Tambah</span>
        </button>
      </div>

      {services.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <Tag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">Belum ada layanan</p>
          <p className="text-xs text-gray-400 mt-1">Tambah layanan untuk digunakan di invoice</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nama</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Deskripsi</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Harga</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {services.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{s.name}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{s.description || '-'}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">Rp {s.price.toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => openEdit(s)} className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-colors" aria-label={`Edit ${s.name}`}><Settings2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(s.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" aria-label={`Hapus ${s.name}`}><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="block md:hidden divide-y divide-gray-100">
            {services.map((s) => (
              <div key={s.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                  <p className="text-xs text-gray-400">Rp {s.price.toLocaleString('id-ID')}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(s)} className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg" aria-label={`Edit ${s.name}`}><Settings2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(s.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" aria-label={`Hapus ${s.name}`}><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">{editService ? 'Edit' : 'Tambah'} Layanan</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-200 rounded-lg text-gray-400 hover:text-gray-600"><Plus className="w-4 h-4 rotate-45" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Nama *</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black text-gray-800" required />
              </div>
              <div>
                <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Deskripsi</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black text-gray-800" />
              </div>
              <div>
                <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Harga *</label>
                <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black text-gray-800" min="0" required />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-sm font-semibold rounded-lg text-gray-700">Batal</button>
                <button type="submit" disabled={saving} className="px-5 py-2 bg-black hover:bg-gray-800 disabled:opacity-50 text-sm font-semibold rounded-lg text-white">{saving ? 'Menyimpan...' : 'Simpan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
