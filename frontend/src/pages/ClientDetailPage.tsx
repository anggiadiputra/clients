import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Mail, Phone, Globe, MapPin, Edit2, Trash2, Plus, Clock,
  Building2, ArrowLeft, MessageSquare, FileText, Download, CheckCircle2, BadgeCheck, XCircle, FolderKanban,
} from 'lucide-react';
import { fetchClientByDisplayId, addNote, deleteClient, deleteNote, fetchInvoices, updateInvoiceStatus, deleteInvoice as apiDeleteInvoice, downloadInvoicePdf, fetchServices, validateClientWhatsapp, fetchProjectsByClient } from '../lib/api';
import { INVOICE_STATUS_LABELS, INVOICE_STATUS_COLORS, PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS, PROJECT_PRIORITY_LABELS, PROJECT_PRIORITY_COLORS } from '../lib/types';
import type { Client, Invoice, ServiceItem, Project } from '../lib/types';
import InvoiceModal from '../components/InvoiceModal';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function ClientDetailPage() {
  const { displayId } = useParams<{ displayId: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [validatingWa, setValidatingWa] = useState(false);

  async function handleValidateWa() {
    if (!client) return;
    setValidatingWa(true);
    try {
      const res = await validateClientWhatsapp(client.id);
      setClient((prev) => prev ? { ...prev, isWhatsappValid: res.isWhatsappValid } : null);
    } catch (err: any) {
      alert(err.message || 'Gagal mengecek WhatsApp');
    } finally {
      setValidatingWa(false);
    }
  }

  async function load() {
    if (!displayId) return;
    try {
      const data = await fetchClientByDisplayId(displayId);
      setClient(data);
      if (['KERJAKAN', 'MASA_GARANSI', 'SELESAI'].includes(data.status)) {
        fetchInvoices(data.id).then(setInvoices).catch(() => {});
      }
      fetchServices().then(setServices).catch(() => {});
      fetchProjectsByClient(data.id).then(setProjects).catch(() => {});
    } catch {
      navigate('/clients');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let isCurrent = true;
    if (displayId) {
      fetchClientByDisplayId(displayId).then((data) => {
        if (!isCurrent) return;
        setClient(data);
        if (['KERJAKAN', 'MASA_GARANSI', 'SELESAI'].includes(data.status)) {
          fetchInvoices(data.id).then((invs) => { if (isCurrent) setInvoices(invs); }).catch(() => {});
        }
        fetchServices().then((svcs) => { if (isCurrent) setServices(svcs); }).catch(() => {});
        setLoading(false);
      }).catch(() => {
        if (isCurrent) navigate('/clients');
      });
    }
    return () => { isCurrent = false; };
  }, [displayId]);

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteText.trim() || !client) return;
    setSaving(true);
    try {
      await addNote(client.id, noteText.trim());
      setNoteText('');
      await load();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteNote(noteId: number) {
    if (!confirm('Hapus catatan ini?')) return;
    if (!client) return;
    try {
      await deleteNote(client.id, noteId);
      await load();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDeleteClient() {
    if (!confirm('Hapus client ini? Semua data akan hilang.')) return;
    if (!client) return;
    try {
      await deleteClient(client.id);
      navigate('/clients');
    } catch (err) {
      console.error(err);
    }
  }

  function formatDate(dateStr: string) {
    try {
      return format(new Date(dateStr), 'dd MMM yyyy, HH:mm', { locale: id });
    } catch {
      return dateStr;
    }
  }

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

  if (!client) return null;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back */}
      <Link
        to="/clients"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Kembali
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 md:p-6 mb-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center shrink-0">
              <Building2 className="w-5.5 h-5.5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">{client.name}</h1>
              <p className="text-xs font-bold text-gray-400 mt-0.5">{client.displayId}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Link
              to={`/clients/${client.displayId}/edit`}
              className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
              title="Edit"
              aria-label="Edit client"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </Link>
            <button
              onClick={handleDeleteClient}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Hapus"
              aria-label="Hapus client"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5 pt-5 border-t border-gray-100">
          {client.email && (
            <a
              href={`mailto:${client.email}`}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-black transition-colors"
            >
              <Mail className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="text-sm">{client.email}</span>
            </a>
          )}
          {client.whatsapp && (
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href={`https://wa.me/${client.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener"
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-black transition-colors"
              >
                <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="text-sm">{client.whatsapp}</span>
              </a>

              {client.isWhatsappValid === true && (
                <span title="Nomor WhatsApp Terverifikasi"><BadgeCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" /></span>
              )}
              {client.isWhatsappValid === false && (
                <span title="Nomor Tidak Terdaftar di WhatsApp"><XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" /></span>
              )}

              {client.isWhatsappValid !== true && (
                <button
                  onClick={handleValidateWa}
                  disabled={validatingWa}
                  className="text-[11px] font-semibold text-gray-500 hover:text-black bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded transition-colors disabled:opacity-50"
                  title="Cek Status WhatsApp via Fonnte"
                >
                  {validatingWa ? 'Mengecek...' : 'Cek WA'}
                </button>
              )}
            </div>
          )}
          {client.website && (
            <a
              href={client.website.startsWith('http') ? client.website : `https://${client.website}`}
              target="_blank"
              rel="noopener"
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-black transition-colors"
            >
              <Globe className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="text-sm truncate">{client.website}</span>
            </a>
          )}
          {client.address && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="text-sm">{client.address}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Notes */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 md:p-6">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2 mb-4">
            <MessageSquare className="w-4 h-4 text-gray-700" />
            Catatan
          </h2>

          <form onSubmit={handleAddNote} className="flex gap-2 mb-4">
            <input
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Tambah catatan..."
              className="flex-1 px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black text-gray-800"
            />
            <button
              type="submit"
              disabled={saving || !noteText.trim()}
              className="px-3 py-2 bg-black text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-1"
              aria-label="Tambah catatan"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>

          {client.notes && client.notes.length > 0 ? (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {client.notes.map((note) => (
                <div key={note.id} className="bg-gray-50 rounded-lg p-3 group">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-gray-800 flex-1 whitespace-pre-wrap">{note.content}</p>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all shrink-0"
                      aria-label={`Hapus catatan ${note.id}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">{formatDate(note.createdAt)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center py-8">Belum ada catatan</p>
          )}
        </div>

        {/* Activity Timeline */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 md:p-6">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-gray-700" />
            Aktivitas
          </h2>

          {client.activities && client.activities.length > 0 ? (
            <div className="space-y-0 relative">
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gray-200" />
              {client.activities.map((activity) => (
                <div key={activity.id} className="relative pl-6 pb-4">
                  <div className="absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-gray-300 bg-white" />
                  <p className="text-xs text-gray-800">{activity.action}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(activity.createdAt)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center py-8">Belum ada aktivitas</p>
          )}
        </div>
      </div>

      {/* Invoice Section — only for KERJAKAN+ status */}
      {client && ['KERJAKAN', 'MASA_GARANSI', 'SELESAI'].includes(client.status) && (
        <div className="mt-5 bg-white rounded-xl border border-gray-200 shadow-sm p-5 md:p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-700" />
          Invoice
        </h2>
        <button
          onClick={() => setShowInvoiceModal(true)}
          className="px-3 py-2 bg-black text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> Buat Invoice
        </button>
      </div>

          {invoices.length > 0 ? (
            <div className="space-y-3">
              {invoices.map((inv) => (
                <div key={inv.id} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-gray-900">{inv.invoiceNumber}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${INVOICE_STATUS_COLORS[inv.status]}`}>
                        {INVOICE_STATUS_LABELS[inv.status]}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Jatuh tempo: {formatDate(inv.dueDate)}</span>
                      <span className="font-semibold text-gray-900">Rp {inv.total.toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-4 shrink-0">
                    {inv.status === 'UNPAID' && (
                      <button
                        onClick={async () => { await updateInvoiceStatus(inv.id, 'PAID'); load(); }}
                        className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Tandai Lunas"
                        aria-label="Tandai Lunas"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {inv.status !== 'CANCELLED' && (
                      <button
                        onClick={async () => { if (confirm('Batalkan invoice ini?')) { await updateInvoiceStatus(inv.id, 'CANCELLED'); load(); } }}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Batalkan"
                        aria-label="Batalkan invoice"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => downloadInvoicePdf(inv.id, inv.invoiceNumber).catch((err) => alert(err.message))}
                      className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
                      title="Download PDF"
                      aria-label={`Unduh PDF ${inv.invoiceNumber}`}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={async () => { if (confirm('Hapus invoice ini?')) { await apiDeleteInvoice(inv.id); load(); } }}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Hapus"
                      aria-label="Hapus invoice"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center py-8">Belum ada invoice</p>
          )}
        </div>
      )}

      {/* Proyek */}
      {client && ['KERJAKAN', 'MASA_GARANSI', 'SELESAI'].includes(client.status) && (
        <div className="mt-5 bg-white rounded-xl border border-gray-200 shadow-sm p-5 md:p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <FolderKanban className="w-4 h-4" /> Daftar Proyek
            </h2>
            <Link
              to="/projects"
              className="text-xs text-blue-600 hover:underline font-semibold"
            >
              Kelola di Board →
            </Link>
          </div>
          {projects.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">Belum ada proyek untuk client ini.</p>
          ) : (
            <div className="space-y-2">
              {projects.map((p) => (
                <div key={p.id} className="flex items-center gap-3 border border-gray-100 rounded-lg px-3 py-2.5 hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">{p.title}</div>
                    {p.description && <div className="text-xs text-gray-500 truncate">{p.description}</div>}
                  </div>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${PROJECT_PRIORITY_COLORS[p.priority]}`}>
                    {PROJECT_PRIORITY_LABELS[p.priority]}
                  </span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${PROJECT_STATUS_COLORS[p.status]}`}>
                    {PROJECT_STATUS_LABELS[p.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <InvoiceModal open={showInvoiceModal} services={services} onClose={() => setShowInvoiceModal(false)} onCreated={load} />
    </div>
  );
}
