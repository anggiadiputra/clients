import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Building2, Mail, Phone, Globe, MapPin, ChevronLeft, ChevronRight, MessageSquare, Download, BadgeCheck, XCircle } from 'lucide-react';
import { fetchClients, exportClientsXlsx } from '../lib/api';
import type { Status } from '../lib/types';
import type { Client } from '../lib/types';
import AddClientModal from '../components/AddClientModal';
import { useSettings } from '../contexts/SettingsContext';
import { getPrimaryClasses } from '../lib/colors';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const PAGE_SIZE = 10;

// Halaman ini khusus klien yang sudah deal (termasuk DEAL, KERJAKAN, MASA_GARANSI, SELESAI). Calon + Follow Up ada di /kanban.
const DEAL_STATUSES: Status[] = ['DEAL', 'KERJAKAN', 'MASA_GARANSI', 'SELESAI'];

export default function ClientsPage() {
  useDocumentTitle('Pelanggan');
  const { settings } = useSettings();
  const primaryClasses = getPrimaryClasses(settings.primaryColor);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);

  async function load() {
    try {
      const data = await fetchClients({ status: DEAL_STATUSES });
      setClients(data);
      setPage(1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let isCurrent = true;
    const timeout = setTimeout(async () => {
      try {
        const data = await fetchClients({ search, status: DEAL_STATUSES });
        if (isCurrent) {
          setClients(data);
          setPage(1);
          setLoading(false);
        }
      } catch (err) {
        if (isCurrent) console.error(err);
      }
    }, 300);
    return () => {
      isCurrent = false;
      clearTimeout(timeout);
    };
  }, [search]);

  function handleExport() {
    exportClientsXlsx().catch((err) => alert(err.message));
  }


  const totalPages = Math.ceil(clients.length / PAGE_SIZE);
  const paginated = clients.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Pelanggan</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExport}
            className="p-2 sm:px-4 sm:py-2 border border-gray-200 hover:bg-gray-50 text-sm font-semibold rounded-lg text-gray-700 transition-colors flex items-center justify-center gap-2"
            aria-label="Export Excel"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button
            onClick={() => setShowModal(true)}
            className={`p-2 sm:px-4 sm:py-2 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 ${primaryClasses.button}`}
            aria-label="Tambah client"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Tambah</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-5">
        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className={`w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 ${primaryClasses.ring} text-gray-800`}
            placeholder="Cari nama usaha..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <svg className="animate-spin w-6 h-6 text-gray-800" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
      ) : clients.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">Tidak ada client</p>
          <p className="text-xs text-gray-400 mt-1">
            {search ? 'Coba ubah pencarian' : 'Belum ada klien yang deal'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nama Usaha</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">WhatsApp</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Website</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginated.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <Link to={`/clients/${client.displayId}`} className="text-xs font-semibold text-gray-900 hover:text-black">
                        {client.name}
                      </Link>
                      {client.noteCount != null && client.noteCount > 0 && (
                        <span className="ml-2 inline-flex items-center gap-0.5 text-xs text-gray-400">
                          <MessageSquare className="w-3 h-3" />{client.noteCount}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-gray-400">{client.displayId}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{client.email || '-'}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {client.whatsapp ? (
                        <div className="flex items-center gap-1.5">
                          <span>{client.whatsapp}</span>
                          {client.isWhatsappValid === true && (
                            <span title="Nomor WhatsApp Terverifikasi"><BadgeCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" /></span>
                          )}
                          {client.isWhatsappValid === false && (
                            <span title="Nomor Tidak Terdaftar di WhatsApp"><XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" /></span>
                          )}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 truncate max-w-[150px]">
                      {client.website ? (
                        <a href={client.website.startsWith('http') ? client.website : `https://${client.website}`} target="_blank" rel="noopener" className="hover:text-black">
                          {client.website}
                        </a>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="block md:hidden divide-y divide-gray-100">
            {paginated.map((client) => (
              <Link key={client.id} to={`/clients/${client.displayId}`} className="block p-4 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-900">{client.name}</p>
                </div>
                <div className="space-y-1">
                  {client.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-600">{client.email}</span>
                    </div>
                  )}
                  {client.whatsapp && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Phone className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-600">{client.whatsapp}</span>
                      {client.isWhatsappValid === true && (
                        <span title="Nomor WhatsApp Terverifikasi"><BadgeCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" /></span>
                      )}
                      {client.isWhatsappValid === false && (
                        <span title="Nomor Tidak Terdaftar di WhatsApp"><XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" /></span>
                      )}
                    </div>
                  )}
                  {client.website && (
                    <div className="flex items-center gap-1.5">
                      <Globe className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-600 truncate">{client.website}</span>
                    </div>
                  )}
                  {client.address && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-600 truncate">{client.address}</span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-gray-50 px-5 py-3 flex items-center justify-between border-t border-gray-100">
              <span className="text-xs text-gray-500 font-medium">
                {(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, clients.length)} dari {clients.length}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-white transition-colors disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold ${
                      p === page
                        ? `${primaryClasses.bg} text-white`
                        : 'border border-gray-200 text-gray-600 hover:bg-white'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-white transition-colors disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <AddClientModal open={showModal} onClose={() => setShowModal(false)} onCreated={load} defaultStatus="KERJAKAN" />
    </div>
  );
}
