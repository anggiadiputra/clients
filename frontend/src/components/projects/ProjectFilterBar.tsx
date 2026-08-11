import { Search, X } from 'lucide-react';
import type { ProjectPriority, ProjectStatus } from '../../lib/types';
import { PROJECT_PRIORITY_LABELS, PROJECT_STATUS_LABELS } from '../../lib/types';
import { useSettings } from '../../contexts/SettingsContext';
import { getPrimaryClasses } from '../../lib/colors';

export interface ClientLite { id: number; name: string; displayId: string }
export interface UserLite { id: number; name: string | null; email: string }

interface Props {
  q: string;
  setQ: (v: string) => void;
  clientId: number | '';
  setClientId: (v: number | '') => void;
  assigneeId: number | '';
  setAssigneeId: (v: number | '') => void;
  priority: ProjectPriority | '';
  setPriority: (v: ProjectPriority | '') => void;
  status: ProjectStatus | '';
  setStatus: (v: ProjectStatus | '') => void;
  clients: ClientLite[];
  users: UserLite[];
  onReset: () => void;
  hideAssignee?: boolean;
}

export default function ProjectFilterBar({
  q, setQ, clientId, setClientId, assigneeId, setAssigneeId, priority, setPriority, status, setStatus,
  clients, users, onReset, hideAssignee,
}: Props) {
  const { settings } = useSettings();
  const primaryClasses = getPrimaryClasses(settings.primaryColor);
  const hasFilter = !!q || clientId !== '' || assigneeId !== '' || priority !== '' || status !== '';

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 mb-4 flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari judul / deskripsi..."
          className={`w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 ${primaryClasses.ring}`}
        />
      </div>
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value as ProjectStatus | '')}
        className={`px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 ${primaryClasses.ring}`}
      >
        <option value="">Semua Status</option>
        {(Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[]).map((k) => (
          <option key={k} value={k}>{PROJECT_STATUS_LABELS[k]}</option>
        ))}
      </select>
      <select
        value={priority}
        onChange={(e) => setPriority(e.target.value as ProjectPriority | '')}
        className={`px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 ${primaryClasses.ring}`}
      >
        <option value="">Semua Prioritas</option>
        {(Object.keys(PROJECT_PRIORITY_LABELS) as ProjectPriority[]).map((k) => (
          <option key={k} value={k}>{PROJECT_PRIORITY_LABELS[k]}</option>
        ))}
      </select>
      <select
        value={clientId}
        onChange={(e) => setClientId(e.target.value ? parseInt(e.target.value) : '')}
        className={`px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 ${primaryClasses.ring} max-w-[180px]`}
      >
        <option value="">Semua Pelanggan</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      {!hideAssignee && (
        <select
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value ? parseInt(e.target.value) : '')}
          className={`px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 ${primaryClasses.ring}`}
        >
          <option value="">Semua PIC</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name || u.email}</option>
          ))}
        </select>
      )}
      {hasFilter && (
        <button
          onClick={onReset}
          className="px-3 py-2 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg flex items-center gap-1"
        >
          <X className="w-3 h-3" /> Reset
        </button>
      )}
    </div>
  );
}
