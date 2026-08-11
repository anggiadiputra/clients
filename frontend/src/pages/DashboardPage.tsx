import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Building2, TrendingUp, Users, Clock, Banknote, Receipt, Wallet } from 'lucide-react';
import { fetchClients, fetchProjects, fetchAllInvoices } from '../lib/api';
import { STATUS_LABELS, STATUS_ORDER } from '../lib/types';
import type { Client, Project, Invoice } from '../lib/types';
import AddClientModal from '../components/AddClientModal';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { getPrimaryClasses } from '../lib/colors';

export default function DashboardPage() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const primaryClasses = getPrimaryClasses(settings.primaryColor);
  const isAdmin = user?.role === 'ADMIN';
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  async function load() {
    try {
      const data = await fetchClients();
      setClients(data);
      // Fetch projects in parallel — backend auto-scopes STAFF to their own.
      try {
        const projData = await fetchProjects();
        setProjects(projData);
      } catch {
        setProjects([]);
      }
      // Admin only: fetch all invoices for financial summary.
      if (isAdmin) {
        try {
          const invData = await fetchAllInvoices();
          setInvoices(invData);
        } catch {
          setInvoices([]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [isAdmin]);

  const counts = STATUS_ORDER.reduce(
    (acc, s) => ({ ...acc, [s]: clients.filter((c) => c.status === s).length }),
    {} as Record<string, number>
  );

  const totalCommission = projects.reduce(
    (sum, p) => sum + (parseFloat(p.commission ?? '0') || 0), 0,
  );

  // Admin financial summary
  const totalCommissionDone = projects
    .filter((p) => p.status === 'SELESAI')
    .reduce((sum, p) => sum + (parseFloat(p.commission ?? '0') || 0), 0);
  const totalInvoicePaid = invoices
    .filter((inv) => inv.status === 'PAID')
    .reduce((sum, inv) => sum + (inv.total || 0), 0);
  const adminRevenue = totalInvoicePaid - totalCommissionDone;

  const recentClients = [...clients].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  const baseCards = [
    { icon: Users, label: 'Total Client', value: clients.length, color: primaryClasses.bg },
    { icon: Clock, label: STATUS_LABELS.FOLLOW_UP, value: counts.FOLLOW_UP || 0, color: 'bg-amber-500' },
    { icon: TrendingUp, label: STATUS_LABELS.KERJAKAN, value: counts.KERJAKAN || 0, color: 'bg-purple-600' },
  ];
  function formatRp(n: number): string {
    return 'Rp ' + n.toLocaleString('id-ID');
  }
  // Admin sees 3 finance cards; staff sees 1 commission card.
  const statCards = isAdmin
    ? [
        ...baseCards,
        {
          icon: Wallet,
          label: 'Komisi Staff',
          value: formatRp(totalCommissionDone),
          color: 'bg-amber-600',
        },
        {
          icon: Receipt,
          label: 'Invoice Terbayar',
          value: formatRp(totalInvoicePaid),
          color: 'bg-emerald-600',
        },
        {
          icon: Banknote,
          label: 'Pendapatan Admin',
          value: formatRp(adminRevenue),
          color: adminRevenue < 0 ? 'bg-red-600' : 'bg-black',
        },
      ]
    : [
        ...baseCards,
        {
          icon: Banknote,
          label: 'Total Komisi Anda',
          value: 'Rp ' + totalCommission.toLocaleString('id-ID'),
          color: 'bg-emerald-600',
        },
      ];

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
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowModal(true)}
            className={`p-2 sm:px-4 sm:py-2 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 ${primaryClasses.button}`}
            aria-label="Tambah client"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Tambah Client</span>
          </button>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center shrink-0`}>
              <Icon className="w-5.5 h-5.5 text-white" />
            </div>
            <div>
              <p className="text-xs uppercase font-bold text-gray-400 tracking-wider">{label}</p>
              <p className="text-2xl font-black text-gray-900 mt-0.5">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Status Breakdown + Recent (admin only) */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Status breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 md:p-6">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Per Status</h2>
          <div className="space-y-3">
            {STATUS_ORDER.map((s) => (
              <div key={s} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{STATUS_LABELS[s]}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${primaryClasses.bg}`}
                      style={{ width: clients.length ? `${((counts[s] || 0) / clients.length) * 100}%` : '0%' }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-900 w-6 text-right">{counts[s] || 0}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent clients */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 md:p-6">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Client Terbaru</h2>
          {recentClients.length > 0 ? (
            <div className="space-y-3">
              {recentClients.map((c) => (
                <Link
                  key={c.id}
                  to={`/clients/${c.displayId}`}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.displayId}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Building2 className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p className="text-sm text-gray-400">Belum ada client</p>
            </div>
          )}
        </div>
        </div>
      )}

      <AddClientModal open={showModal} onClose={() => setShowModal(false)} onCreated={load} defaultStatus="KERJAKAN" />
    </div>
  );
}
