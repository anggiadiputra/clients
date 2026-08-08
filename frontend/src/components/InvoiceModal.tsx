import { useState, useEffect } from 'react';
import { X, Search, Trash2 } from 'lucide-react';
import { createInvoice, fetchClients, updateInvoice } from '../lib/api';
import type { ServiceItem, Client, Invoice } from '../lib/types';

interface SelectedItem {
  serviceId: number;
  serviceName: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  services: ServiceItem[];
  mode?: 'create' | 'edit';
  editData?: Invoice & { client?: { name: string; displayId: string } };
}

export default function InvoiceModal({ open, onClose, onCreated, services, mode = 'create', editData }: Props) {
  // Client
  const [clientSearch, setClientSearch] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  // Service
  const [serviceSearch, setServiceSearch] = useState('');
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  // Toggles
  const [showTax, setShowTax] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [tax, setTax] = useState('0');
  const [discount, setDiscount] = useState('0');
  // Date
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  // UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && editData) {
        setIssueDate(editData.issueDate.slice(0, 10));
        setDueDate(editData.dueDate.slice(0, 10));
        setSelectedItems(editData.items.map(i => ({ serviceId: 0, serviceName: i.description.split(' — ')[0] || i.description, description: i.description.includes(' — ') ? i.description.split(' — ').slice(1).join(' — ') : '', quantity: i.quantity, unitPrice: i.unitPrice })));
        setShowTax(editData.tax > 0); setTax(String(editData.tax));
        setShowDiscount(editData.discount > 0); setDiscount(String(editData.discount));
        setNotes(editData.notes || '');
        setSelectedClient(editData.client ? { id: editData.clientId, displayId: editData.client.displayId, name: editData.client.name } as Client : null);
        fetchClients({}).then(setClients).catch(() => {});
      } else {
        const d = new Date();
        setIssueDate(d.toISOString().slice(0, 10));
        d.setDate(d.getDate() + 7);
        setDueDate(d.toISOString().slice(0, 10));
        setSelectedItems([]);
        setSelectedClient(null);
        setShowTax(false); setTax('0');
        setShowDiscount(false); setDiscount('0');
        setNotes(''); setError('');
        fetchClients({}).then(setClients).catch(() => {});
      }
      setError('');
    }
  }, [open]);

  // Computed
  const subtotal = selectedItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const discountPct = showDiscount ? (parseFloat(discount) || 0) : 0;
  const discountAmount = subtotal * (discountPct / 100);
  const afterDiscount = subtotal - discountAmount;
  const taxPct = showTax ? (parseFloat(tax) || 0) : 0;
  const taxAmount = afterDiscount * (taxPct / 100);
  const total = afterDiscount + taxAmount;

  function addService(s: ServiceItem) {
    setSelectedItems(prev => [...prev, { serviceId: s.id, serviceName: s.name, description: s.description || '', quantity: 1, unitPrice: s.price }]);
    setServiceSearch('');
    setShowServiceDropdown(false);
  }

  function removeService(idx: number) {
    setSelectedItems(prev => prev.filter((_, i) => i !== idx));
  }

  function updateQty(idx: number, qty: number) {
    setSelectedItems(prev => prev.map((item, i) => i === idx ? { ...item, quantity: qty || 1 } : item));
  }

  function updatePrice(idx: number, price: number) {
    setSelectedItems(prev => prev.map((item, i) => i === idx ? { ...item, unitPrice: price || 0 } : item));
  }

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) &&
    ['KERJAKAN', 'MASA_GARANSI', 'SELESAI'].includes(c.status)
  );

  const filteredServices = services.filter(s =>
    s.name.toLowerCase().includes(serviceSearch.toLowerCase())
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClient) { setError('Pilih client terlebih dahulu'); return; }
    if (selectedItems.length === 0) { setError('Minimal 1 layanan harus dipilih'); return; }
    if (!dueDate) { setError('Jatuh tempo wajib diisi'); return; }
    setError('');
    setLoading(true);
    try {
      const data = {
        issueDate, dueDate,
        discount: discountPct, tax: taxPct,
        notes: notes || undefined,
        items: selectedItems.map(i => ({ description: i.description ? `${i.serviceName} — ${i.description}` : i.serviceName, quantity: i.quantity, unitPrice: i.unitPrice })),
      };
      if (mode === 'edit' && editData) {
        await updateInvoice(editData.id, data);
      } else {
        await createInvoice(selectedClient!.id, data);
      }
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal membuat invoice');
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">{mode === 'edit' ? 'Edit Invoice' : 'Buat Invoice'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-lg text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-800 text-sm">{error}</div>}

          {/* Client Selector */}
          <div className="relative">
            <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Client *</label>
            {selectedClient ? (
              <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-sm font-semibold text-gray-900">{selectedClient.name}</span>
                <button type="button" onClick={() => setSelectedClient(null)} className="text-xs text-red-500 hover:text-red-700">Ganti</button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" value={clientSearch}
                    onFocus={() => setShowClientDropdown(true)}
                    onChange={(e) => { setClientSearch(e.target.value); setShowClientDropdown(true); }}
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black text-gray-800"
                    placeholder="Cari client..." />
                </div>
                {showClientDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowClientDropdown(false)} />
                    <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredClients.length > 0 ? filteredClients.map(c => (
                        <button key={c.id} type="button" onClick={() => { setSelectedClient(c); setShowClientDropdown(false); setClientSearch(''); }}
                          className="w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors">
                          <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                          <p className="text-xs text-gray-400">{c.displayId}</p>
                        </button>
                      )) : (
                        <p className="text-xs text-gray-400 text-center py-4">Tidak ada client</p>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* Service Selector */}
          {services.length > 0 && (
            <div>
              <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Layanan {selectedItems.length > 0 && `(${selectedItems.length})`}</label>
              <div className="relative">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" value={serviceSearch}
                      onFocus={() => setShowServiceDropdown(true)}
                      onChange={(e) => { setServiceSearch(e.target.value); setShowServiceDropdown(true); }}
                      className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black text-gray-800"
                      placeholder="Cari layanan..." />
                  </div>
                </div>
                {showServiceDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowServiceDropdown(false)} />
                    <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredServices.length > 0 ? filteredServices.map(s => (
                        <button key={s.id} type="button" onClick={() => addService(s)}
                          className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 transition-colors">
                          <div className="text-left">
                            <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                            {s.description && <p className="text-xs text-gray-400">{s.description}</p>}
                          </div>
                          <span className="text-xs font-semibold text-gray-600">Rp {s.price.toLocaleString('id-ID')}</span>
                        </button>
                      )) : (
                        <p className="text-xs text-gray-400 text-center py-4">Layanan tidak ditemukan</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Selected Items */}
          {selectedItems.length > 0 && (
            <div className="space-y-2">
              {selectedItems.map((item, idx) =>
                <div key={idx} className="bg-gray-50 rounded-lg px-3 py-2 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900 truncate">{item.serviceName}</span>
                    <span className="text-xs text-gray-400 shrink-0">Rp {(item.quantity * item.unitPrice).toLocaleString('id-ID')}</span>
                    <input type="number" value={item.unitPrice} min="0"
                      onChange={(e) => updatePrice(idx, parseFloat(e.target.value) || 0)}
                      title="Harga satuan"
                      className="w-24 px-2 py-0.5 border border-gray-200 rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-black ml-auto" />
                    <input type="number" value={item.quantity} min="1"
                      onChange={(e) => updateQty(idx, parseInt(e.target.value) || 1)}
                      className="w-14 px-2 py-0.5 border border-gray-200 rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-black" />
                    <button type="button" onClick={() => removeService(idx)}
                      className="p-0.5 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  <textarea value={item.description}
                    onChange={(e) => {
                      setSelectedItems(prev => prev.map((it, i) => i === idx ? { ...it, description: e.target.value } : it));
                    }}
                    rows={1}
                    className="w-full px-2 py-1 border border-gray-200 rounded text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-black resize-none"
                    placeholder="Tambah deskripsi custom..." />
                </div>
              )}
            </div>
          )}

          {/* Tax & Discount Toggles */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={showTax} onChange={(e) => setShowTax(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black" />
                <span className="text-sm text-gray-700">Tax</span>
              </label>
              {showTax && (
                <div className="flex items-center gap-1">
                  <input type="number" value={tax} onChange={(e) => setTax(e.target.value)} min="0"
                    className="w-16 px-2 py-1 border border-gray-200 rounded-lg text-xs text-center focus:outline-none focus:ring-1 focus:ring-black" />
                  <span className="text-xs text-gray-500">%</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={showDiscount} onChange={(e) => setShowDiscount(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black" />
                <span className="text-sm text-gray-700">Diskon</span>
              </label>
              {showDiscount && (
                <div className="flex items-center gap-1">
                  <input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} min="0"
                    className="w-16 px-2 py-1 border border-gray-200 rounded-lg text-xs text-center focus:outline-none focus:ring-1 focus:ring-black" />
                  <span className="text-xs text-gray-500">%</span>
                </div>
              )}
            </div>
          </div>

          {/* Totals */}
          {subtotal > 0 && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="font-semibold">Rp {subtotal.toLocaleString('id-ID')}</span></div>
              {discountPct > 0 && <div className="flex justify-between text-red-600"><span>Diskon ({discountPct}%)</span><span className="font-semibold">-Rp {discountAmount.toLocaleString('id-ID')}</span></div>}
              {taxPct > 0 && <div className="flex justify-between"><span className="text-gray-500">Tax ({taxPct}%)</span><span className="font-semibold">Rp {taxAmount.toLocaleString('id-ID')}</span></div>}
              <div className="flex justify-between border-t border-gray-200 pt-2">
                <span className="font-bold text-gray-900">Total</span>
                <span className="text-lg font-black text-gray-900">Rp {total.toLocaleString('id-ID')}</span>
              </div>
            </div>
          )}

          {/* Dates + Notes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Tgl Invoice</label>
              <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)}
                className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black text-gray-800" />
            </div>
            <div>
              <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Jatuh Tempo *</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black text-gray-800" required />
            </div>
          </div>
          <div>
            <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Catatan</label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black text-gray-800" placeholder="Opsional" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-sm font-semibold rounded-lg text-gray-700">Batal</button>
            <button type="submit" disabled={loading} className="px-5 py-2 bg-black hover:bg-gray-800 disabled:opacity-50 text-sm font-semibold rounded-lg text-white">
              {loading ? 'Menyimpan...' : mode === 'edit' ? 'Simpan Perubahan' : 'Buat Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
