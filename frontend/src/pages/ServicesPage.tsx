import { useState, useEffect, useMemo } from 'react';
import { Plus, Settings2, Trash2, Tag, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchServices, createService, updateService, deleteService } from '../lib/api';
import type { ServiceItem } from '../lib/types';
import ConfirmModal from '../components/ConfirmModal';
import { useSettings } from '../contexts/SettingsContext';
import { getPrimaryClasses } from '../lib/colors';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const PAGE_SIZE = 10;

export default function ServicesPage() {
  useDocumentTitle('Layanan');
  const { settings } = useSettings();
  const primaryClasses = getPrimaryClasses(settings.primaryColor);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editService, setEditService] = useState<ServiceItem | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

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

  async function handleConfirmDelete() {
    if (!confirmDeleteId) return;
    setDeleting(true);
    try {
      await deleteService(confirmDeleteId);
      setConfirmDeleteId(null);
      await load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeleting(false);
    }
  }

  function handleDelete(id: number) {
    setConfirmDeleteId(id);
  }

  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q)
      );
    });
  }, [services, search]);

  const totalPages = Math.ceil(filteredServices.length / PAGE_SIZE) || 1;
  const paginatedServices = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredServices.slice(start, start + PAGE_SIZE);
  }, [filteredServices, page]);

  if (loading) return <div className="flex items-center justify-center py-16"><svg className="animate-spin w-6 h-6 text-gray-800" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Layanan</h1>
        </div>
        <button onClick={openAdd} className={`p-2 sm:px-4 sm:py-2 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 ${primaryClasses.button}`} aria-label="Tambah layanan">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Tambah</span>
        </button>
      </div>

      {/* Filter & Live Search */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 mb-4 flex items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Cari nama atau deskripsi layanan..."
            className={`w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 ${primaryClasses.ring} text-gray-800`}
          />
        </div>
      </div>

      {filteredServices.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <Tag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">
            {search ? 'Layanan tidak ditemukan' : 'Belum ada layanan'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {search ? 'Coba ubah kata kunci pencarian Anda' : 'Tambah layanan untuk digunakan di invoice'}
          </p>
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
                {paginatedServices.map((s) => (
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
            {paginatedServices.map((s) => (
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500 font-medium">
                Menampilkan {((page - 1) * PAGE_SIZE) + 1} - {Math.min(page * PAGE_SIZE, filteredServices.length)} dari {filteredServices.length} data
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
      )}

      {/* Modal Add/Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">{editService ? 'Edit Layanan' : 'Tambah Layanan Baru'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Nama Layanan *</label>
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
                <button type="submit" disabled={saving} className={`px-5 py-2 disabled:opacity-50 text-sm font-semibold rounded-lg text-white ${primaryClasses.button}`}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmDeleteId !== null}
        title="Hapus Layanan Ini?"
        description="Layanan ini akan dihapus secara permanen dari sistem."
        confirmText="Hapus Layanan"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
