import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Download, ArrowLeft, Settings2, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import { downloadInvoicePdf, updateInvoiceStatus, deleteInvoice as apiDeleteInvoice, fetchServices, BASE } from '../lib/api';
import { INVOICE_STATUS_LABELS, INVOICE_STATUS_COLORS } from '../lib/types';
import { useSettings } from '../contexts/SettingsContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import type { Invoice, ServiceItem } from '../lib/types';
import InvoiceModal from '../components/InvoiceModal';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function InvoiceDetailPage() {
  const { invoiceNumber } = useParams<{ invoiceNumber: string }>();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [invoice, setInvoice] = useState<(Invoice & { client?: { name: string; displayId: string; email?: string; whatsapp?: string; address?: string } }) | null>(null);
  useDocumentTitle(invoice ? invoice.invoiceNumber : 'Detail Invoice');
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [services, setServices] = useState<ServiceItem[]>([]);

  async function load() {
    if (!invoiceNumber) return;
    try {
      // SEC-4 fix: use credentials:'include' so the HttpOnly auth cookie is sent
      // automatically — no need to read the JWT from localStorage.
      const res = await fetch(`${BASE}/invoices/number/${invoiceNumber}`, { credentials: 'include' });

      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      setInvoice(data);
      fetchServices().then(setServices).catch(() => {});
    } catch { navigate('/invoices'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [invoiceNumber]);

  function formatDate(dateStr: string) {
    try { return format(new Date(dateStr), 'EEEE, dd MMMM yyyy', { locale: id }); }
    catch { return dateStr; }
  }

  async function handleStatus(status: string) {
    if (!invoice) return;
    try { await updateInvoiceStatus(invoice.id, status); await load(); }
    catch (err: any) { alert(err.message); }
  }

  async function handleDelete() {
    if (!invoice || !confirm('Hapus invoice ini?')) return;
    try { await apiDeleteInvoice(invoice.id); navigate('/invoices'); }
    catch (err: any) { alert(err.message); }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <svg className="animate-spin w-6 h-6 text-gray-800" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
    </div>
  );

  if (!invoice) return null;

  const client = (invoice as any).client || {};
  const sender = settings.senderName || settings.projectName || 'Client CRM';

  return (
    <div className="max-w-3xl mx-auto">
      <Link to="/invoices" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Kembali
      </Link>

      {/* Invoice Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 md:p-8 mb-5">
        {/* Header: INVOICE box right */}
        <div className="flex justify-between items-start mb-8">
          <div>
            {settings.logo && <img src={settings.logo} alt="Logo" className="max-h-12 w-auto mb-2 object-contain" />}
            {!settings.logo && <h2 className="text-sm font-bold text-gray-900 uppercase">{sender}</h2>}
          </div>
          <div className="bg-white border border-gray-200 text-gray-900 rounded-xl px-5 py-3.5 text-right shadow-xs min-w-[200px]">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Invoice</p>
            <p className="text-sm font-mono font-bold text-gray-900 mt-0.5">{invoice.invoiceNumber}</p>
            <p className="text-sm text-gray-600 mt-1.5">{formatDate(invoice.issueDate)}</p>
            <p className="text-sm text-gray-600">Jatuh tempo: {formatDate(invoice.dueDate)}</p>
            <div className="mt-2.5">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${INVOICE_STATUS_COLORS[invoice.status]}`}>
                {INVOICE_STATUS_LABELS[invoice.status]}
              </span>
            </div>
          </div>
        </div>

        {/* Dari / Kepada */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Dari</p>
            <p className="text-sm font-semibold text-gray-900">{sender}</p>
            {settings.senderAddress && <p className="text-sm text-gray-600 mt-0.5 whitespace-pre-wrap">{settings.senderAddress}</p>}
            {settings.senderPhone && <p className="text-sm text-gray-600 mt-0.5">{settings.senderPhone}</p>}
            {settings.senderEmail && <p className="text-sm text-gray-600 mt-0.5">{settings.senderEmail}</p>}
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Kepada</p>
            <p className="text-sm font-semibold text-gray-900">{client.name}</p>
            {client.address && <p className="text-sm text-gray-600 mt-0.5 whitespace-pre-wrap">{client.address}</p>}
            {client.email && <p className="text-sm text-gray-600 mt-0.5">{client.email}</p>}
            {client.whatsapp && <p className="text-sm text-gray-600 mt-0.5">{client.whatsapp}</p>}
          </div>
        </div>

        {/* Items Table */}
        <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Deskripsi</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">Qty</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Harga</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Jumlah</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoice.items.map((item, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                  <td className="px-4 py-2.5 text-sm text-gray-800">{item.description}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-600 text-right">{item.quantity}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-600 text-right font-mono">Rp {item.unitPrice.toLocaleString('id-ID')}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-900 text-right font-semibold">Rp {item.amount.toLocaleString('id-ID')}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="border-t-2 border-gray-200 bg-gray-50/30 px-4 py-3 space-y-1.5">
            <div className="flex justify-end gap-8 text-sm">
              <span className="text-gray-500 w-16 text-right">Subtotal</span>
              <span className="font-semibold w-32 text-right">Rp {invoice.subtotal.toLocaleString('id-ID')}</span>
            </div>
            {invoice.discount > 0 && (
              <div className="flex justify-end gap-8 text-sm text-red-600">
                <span className="w-16 text-right">Diskon ({invoice.discount}%)</span>
                <span className="font-semibold w-32 text-right">-Rp {invoice.discountAmount.toLocaleString('id-ID')}</span>
              </div>
            )}
            {invoice.tax > 0 && (
              <div className="flex justify-end gap-8 text-sm">
                <span className="text-gray-500 w-16 text-right">Tax ({invoice.tax}%)</span>
                <span className="font-semibold w-32 text-right">Rp {invoice.taxAmount.toLocaleString('id-ID')}</span>
              </div>
            )}
            <div className="flex justify-end gap-8 pt-2 border-t border-gray-200">
              <span className="text-sm font-bold text-gray-900 w-16 text-right">TOTAL</span>
              <span className="text-base font-black text-gray-900 w-32 text-right">Rp {invoice.total.toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>

        {/* Payment Bank Accounts */}
        {(() => {
          try {
            const accounts: Array<{ bankName: string; accountNumber: string; accountHolder: string }> = JSON.parse(settings.bankAccounts || '[]');
            if (!accounts || accounts.length === 0) return null;
            return (
              <div className="mb-6 p-4 bg-gray-50/70 border border-gray-200 rounded-lg">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Pembayaran Transfer Bank</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {accounts.map((acc, index) => (
                    <div key={index} className="bg-white p-2.5 rounded-md border border-gray-200 text-xs">
                      <p className="font-bold text-gray-900">{acc.bankName}</p>
                      <p className="font-mono text-gray-800 font-semibold my-0.5">{acc.accountNumber}</p>
                      {acc.accountHolder && <p className="text-gray-500 text-[11px]">a.n. {acc.accountHolder}</p>}
                    </div>
                  ))}
                </div>
              </div>
            );
          } catch {
            return null;
          }
        })()}

        {/* Notes */}
        {invoice.notes && (
          <div className="mb-6">
            <p className="text-xs text-gray-400 mb-1">Catatan</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}

        {/* Syarat & Ketentuan */}
        {settings.termsAndConditions && (
          <div className="mb-6">
            <p className="text-xs text-gray-400 mb-1">Syarat & Ketentuan</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{settings.termsAndConditions}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {invoice.status === 'UNPAID' && (
            <button onClick={() => handleStatus('PAID')} className="px-4 py-2 border border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Tandai Lunas
            </button>
          )}
          {invoice.status !== 'CANCELLED' && (
            <button onClick={() => handleStatus('CANCELLED')} className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5">
              <XCircle className="w-4 h-4" /> Batalkan
            </button>
          )}
          <button onClick={() => downloadInvoicePdf(invoice.id, invoice.invoiceNumber).catch((err) => alert(err.message))} className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-xs font-semibold rounded-lg text-gray-700 transition-colors flex items-center gap-1.5">
            <Download className="w-4 h-4" /> Unduh PDF
          </button>
          <button onClick={() => setShowEditModal(true)} className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-xs font-semibold rounded-lg text-gray-700 transition-colors flex items-center gap-1.5">
            <Settings2 className="w-4 h-4" /> Edit
          </button>
          <button onClick={handleDelete} className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5">
            <Trash2 className="w-4 h-4" /> Hapus
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">Terima kasih atas kepercayaan Anda.</p>
      </div>

      <InvoiceModal open={showEditModal} services={services} mode="edit" editData={invoice}
        onClose={() => setShowEditModal(false)}
        onCreated={() => { setShowEditModal(false); load(); }} />
    </div>
  );
}
