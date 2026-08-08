import { Link } from 'react-router-dom';
import { Calendar, MessageSquare, Paperclip, User as UserIcon, Banknote } from 'lucide-react';
import type { Project } from '../../lib/types';
import { PROJECT_PRIORITY_COLORS, PROJECT_PRIORITY_LABELS } from '../../lib/types';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  project: Project;
  isDragging?: boolean;
  dragHandleProps?: any;
  onClick?: () => void;
}

function initials(name: string | null | undefined): string {
  if (!name) return '?';
  return name.split(' ').slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
}

function formatDate(s: string | null): string {
  if (!s) return '';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: '2-digit' });
}

function formatRupiah(v: string | number | null | undefined): string {
  if (v == null || v === '') return '';
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (!Number.isFinite(n)) return '';
  return 'Rp ' + n.toLocaleString('id-ID');
}

export default function ProjectCard({ project, isDragging, dragHandleProps, onClick }: Props) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const overdue = project.dueDate && new Date(project.dueDate) < new Date() && project.status !== 'SELESAI';

  return (
    <div
      {...dragHandleProps}
      onClick={onClick}
      className={`bg-white rounded-lg border border-gray-200 shadow-sm p-3 cursor-grab active:cursor-grabbing transition-shadow ${
        isDragging ? 'shadow-lg ring-2 ring-blue-300 rotate-1' : 'hover:shadow-md'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h4 className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2 flex-1">{project.title}</h4>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${PROJECT_PRIORITY_COLORS[project.priority]} flex-shrink-0`}>
          {PROJECT_PRIORITY_LABELS[project.priority]}
        </span>
      </div>

      {project.description && (
        <p className="text-xs text-gray-500 line-clamp-2 mb-2">{project.description}</p>
      )}

      <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
        <Link
          to={`/clients/${project.client.displayId}`}
          onClick={(e) => e.stopPropagation()}
          className="text-blue-600 hover:underline font-medium truncate max-w-[140px]"
        >
          {project.client.name}
        </Link>
        <span className="text-gray-300">·</span>
        <span className="font-mono text-[10px] text-gray-400">{project.client.displayId}</span>
      </div>

      <div className="flex items-center justify-between text-[11px] text-gray-500">
        <div className="flex items-center gap-2">
          {project.dueDate && (
            <span className={`inline-flex items-center gap-1 ${overdue ? 'text-red-600 font-semibold' : ''}`}>
              <Calendar className="w-3 h-3" />
              {formatDate(project.dueDate)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {project._count && project._count.comments > 0 && (
            <span className="inline-flex items-center gap-0.5">
              <MessageSquare className="w-3 h-3" />
              {project._count.comments}
            </span>
          )}
          {project._count && project._count.attachments > 0 && (
            <span className="inline-flex items-center gap-0.5">
              <Paperclip className="w-3 h-3" />
              {project._count.attachments}
            </span>
          )}
        </div>
      </div>

      {(project.value || project.commission) && (isAdmin || project.commission) && (
        <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-3 text-[11px]">
          {project.value && isAdmin && (
            <span className="inline-flex items-center gap-1 text-gray-600">
              <Banknote className="w-3 h-3" />
              <span className="font-semibold">{formatRupiah(project.value)}</span>
            </span>
          )}
          {project.commission && (
            <span className="inline-flex items-center gap-1 text-emerald-600">
              <span className="text-[10px] font-bold uppercase tracking-wider">Komisi</span>
              <span className="font-semibold">{formatRupiah(project.commission)}</span>
            </span>
          )}
        </div>
      )}

      {project.assignee && (
        <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-gray-200 text-gray-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
            {initials(project.assignee.name || project.assignee.email)}
          </div>
          <span className="text-[11px] text-gray-600 truncate flex items-center gap-1">
            <UserIcon className="w-3 h-3" />
            {project.assignee.name || project.assignee.email}
          </span>
        </div>
      )}
    </div>
  );
}
