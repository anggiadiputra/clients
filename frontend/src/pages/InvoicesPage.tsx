import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Download, Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchAllInvoices, downloadInvoicePdf, fetchServices } from '../lib/api';
import { INVOICE_STATUS_LABELS, INVOICE_STATUS_COLORS } from '../lib/types';
import type { Invoice, ServiceItem, InvoiceStatus } from '../lib/types';
import InvoiceModal from '../components/InvoiceModal';
import { useSettings } from '../contexts/SettingsContext';
import { getPrimaryClasses } from '../lib/colors';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

const PAGE_SIZE = 10;

export default function InvoicesPage() {
  useDocumentTitle('Invoice');
  const { settings } = useSettings();
  const primaryClasses = getPrimaryClasses(settings.primaryColor);
  const [invoices, setInvoices] = useState<(Invoice & { client?: { name: string; displayId: string } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | ''>('');
  const [page, setPage] = useState(1);

  async function load() {
    try {
      const data = await fetchAllInvoices();
      setInvoices(data as any);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function handleCreate() {
    fetchServices().then(setServices).catch(() => {});
    setShowModal(true);
  }

  function formatDate(dateStr: string) {
    try { return format(new Date(dateStr), 'EEEE, dd MMMM yyyy', { locale: id }); }
    catch { return dateStr; }
  }

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchSearch =
        !search.trim() ||
        inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
        ((inv as any).client?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        ((inv as any).client?.displayId || '').toLowerCase().includes(search.toLowerCase());
      const matchStatus = !statusFilter || inv.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [invoices, search, statusFilter]);

  const totalPages = Math.ceil(filteredInvoices.length / PAGE_SIZE) || 1;
  const paginatedInvoices = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredInvoices.slice(start, start + PAGE_SIZE);
  }, [filteredInvoices, page]);

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

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Invoice</h1>
        </div>
        <button onClick={handleCreate}
          className={`p-2 sm:px-4 sm:py-2 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 ${primaryClasses.button}`}
          aria-label="Buat invoice baru">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Buat Invoice</span>
        </button>
      </div>

      {/* Filter & Live Search */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Cari nomor invoice atau nama pelanggan..."
            className={`w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 ${primaryClasses.ring} text-gray-800`}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as any); setPage(1); }}
          className={`px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 ${primaryClasses.ring} text-gray-800`}
        >
          <option value="">Semua Status</option>
          <option value="UNPAID">Belum Dibayar</option>
          <option value="PAID">Lunas</option>
          <option value="CANCELLED">Dibatalkan</option>
        </select>
      </div>

      {filteredInvoices.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">
            {search || statusFilter ? 'Invoice tidak ditemukan' : 'Belum ada invoice'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {search || statusFilter ? 'Coba ubah kata kunci atau reset filter status' : 'Buat invoice dari halaman detail client dengan status Deal'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoice</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Jatuh Tempo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginatedInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-xs font-semibold text-gray-900">
                      <Link to={`/invoices/${inv.invoiceNumber}`} className="hover:text-black">{inv.invoiceNumber}</Link>
                    </td>
                    <td className="px-4 py-3">
                      {(inv as any).client ? (
                        <Link to={`/clients/${(inv as any).client.displayId}`} className="text-xs text-gray-600 hover:text-black">
                          {(inv as any).client.name}
                        </Link>
                      ) : <span className="text-xs text-gray-400">-</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{formatDate(inv.dueDate)}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-gray-900">Rp {inv.total.toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${INVOICE_STATUS_COLORS[inv.status]}`}>
                        {INVOICE_STATUS_LABELS[inv.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => downloadInvoicePdf(inv.id, inv.invoiceNumber).catch((err) => alert(err.message))}
                        className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
                        aria-label={`Unduh PDF ${inv.invoiceNumber}`}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="block md:hidden divide-y divide-gray-100">
            {paginatedInvoices.map((inv) => (
              <div key={inv.id} className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <Link to={`/invoices/${inv.invoiceNumber}`} className="text-sm font-semibold text-gray-900 hover:text-black">{inv.invoiceNumber}</Link>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${INVOICE_STATUS_COLORS[inv.status]}`}>
                    {INVOICE_STATUS_LABELS[inv.status]}
                  </span>
                </div>
                {(inv as any).client && <p className="text-xs text-gray-500">{(inv as any).client.name}</p>}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-400">{formatDate(inv.dueDate)}</span>
                  <span className="text-sm font-semibold text-gray-900">Rp {inv.total.toLocaleString('id-ID')}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500 font-medium">
                Menampilkan {((page - 1) * PAGE_SIZE) + 1} - {Math.min(page * PAGE_SIZE, filteredInvoices.length)} dari {filteredInvoices.length} data
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

      <InvoiceModal open={showModal} services={services}
        onClose={() => setShowModal(false)}
        onCreated={() => { setShowModal(false); load(); }} />
    </div>
  );
}
