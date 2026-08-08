import { useState } from 'react';
import { X } from 'lucide-react';
import type { Client, ProjectPriority, ProjectStatus, ManagedUser, ServiceItem } from '../../lib/types';
import { PROJECT_PRIORITY_LABELS, PROJECT_STATUS_LABELS } from '../../lib/types';
import { createProject } from '../../lib/api';

interface Props {
  clients: Pick<Client, 'id' | 'name' | 'displayId'>[];
  users: Pick<ManagedUser, 'id' | 'name' | 'email'>[];
  services: Pick<ServiceItem, 'id' | 'name'>[];
  defaultClientId?: number;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateProjectModal({ clients, users, services, defaultClientId, onClose, onCreated }: Props) {
  const [selectedServiceId, setSelectedServiceId] = useState<number | ''>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState<number | ''>(defaultClientId ?? '');
  const [priority, setPriority] = useState<ProjectPriority>('MEDIUM');
  const [status, setStatus] = useState<ProjectStatus>('MULAI');
  const [dueDate, setDueDate] = useState('');
  const [assigneeId, setAssigneeId] = useState<number | ''>('');
  const [value, setValue] = useState('');
  const [commission, setCommission] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!title.trim()) { setErr('Judul wajib diisi'); return; }
    if (clientId === '') { setErr('Client wajib dipilih'); return; }
    setSaving(true);
    try {
      await createProject({
        title: title.trim(),
        description: description.trim() || undefined,
        clientId: clientId as number,
        priority,
        status,
        dueDate: dueDate || null,
        assigneeId: assigneeId === '' ? null : (assigneeId as number),
        value: value.trim() || null,
        commission: commission.trim() || null,
      });
      onCreated();
    } catch (e: any) {
      setErr(e.message || 'Gagal membuat proyek');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">Buat Proyek Baru</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          {err && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-2">{err}</div>}

          <div>
            <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Layanan</label>
            <select
              value={selectedServiceId}
              onChange={(e) => {
                const id = e.target.value ? parseInt(e.target.value) : '';
                setSelectedServiceId(id);
                const svc = services.find((s) => s.id === id);
                if (svc) setTitle(svc.name);
              }}
              className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black"
            >
              <option value="">— Pilih layanan (opsional) —</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Judul *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
              className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black"
              placeholder="Mis. Migrasi website"
            />
          </div>

          <div>
            <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Client *</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value ? parseInt(e.target.value) : '')}
              required
              className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black"
            >
              <option value="">— Pilih client —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.displayId})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Deskripsi</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black"
              placeholder="Detail singkat…"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Status Awal</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black"
              >
                {(Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[]).map((k) => (
                  <option key={k} value={k}>{PROJECT_STATUS_LABELS[k]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Prioritas</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as ProjectPriority)}
                className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black"
              >
                {(Object.keys(PROJECT_PRIORITY_LABELS) as ProjectPriority[]).map((k) => (
                  <option key={k} value={k}>{PROJECT_PRIORITY_LABELS[k]}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Tenggat</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Nilai Proyek (Rp)</label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                step="1000"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Komisi Staff (Rp)</label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                step="1000"
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
                className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black"
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Penanggung Jawab</label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value ? parseInt(e.target.value) : '')}
              className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black"
            >
              <option value="">— Belum ada —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name || u.email}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-lg">
            Batal
          </button>
          <button type="submit" disabled={saving} className="px-4 py-2 bg-black text-white text-sm font-semibold rounded-lg hover:bg-gray-800 disabled:opacity-50">
            {saving ? 'Membuat…' : 'Buat Proyek'}
          </button>
        </div>
      </form>
    </div>
  );
}
